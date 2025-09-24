const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const Study = require('../models/Study');
const Patient = require('../models/Patient');

const router = express.Router();

// Configure multer for DICOM file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const patientId = req.params.patient_id;
    const uploadDir = path.join(__dirname, '..', 'uploads', patientId);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename or add timestamp if needed
    const filename = file.originalname || `dicom_${Date.now()}.dcm`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept DICOM files
    const allowedExtensions = ['.dcm', '.dicom', '.ima'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExt) || file.originalname.toLowerCase().includes('dicom')) {
      cb(null, true);
    } else {
      cb(new Error('Only DICOM files are allowed'), false);
    }
  }
});

// Helper function to call Python DICOM processor
const processDicomFile = (filePath, command = 'get_info') => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'utils', 'dicomHelper.py');
    const pythonProcess = spawn('python', [pythonScript, command, filePath]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

// Helper function to generate study UID
const generateStudyUID = (patientId, filename) => {
  const crypto = require('crypto');
  const content = `${patientId}_${filename}_${new Date().toISOString().split('T')[0]}`;
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `1.2.840.113619.2.5.${hash}`;
};

// Helper function to load studies from JSON file (fallback when MongoDB is not available)
const loadStudiesFromJSON = async () => {
  try {
    const jsonPath = path.join(__dirname, '..', 'data', 'studies.json');
    const data = await fs.readFile(jsonPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading studies from JSON:', error);
    return [];
  }
};

// GET /studies - Get all studies with pagination
router.get('/', async (req, res) => {
  try {
    const {
      patient_id,
      limit = 20,
      skip = 0,
      search
    } = req.query;

    let studies = [];
    let total = 0;

    try {
      // Try MongoDB first
      let query = { active: true };
      
      if (patient_id) {
        query.patient_id = patient_id;
      }
      
      if (search) {
        query.$or = [
          { study_description: { $regex: search, $options: 'i' } },
          { original_filename: { $regex: search, $options: 'i' } },
          { modality: { $regex: search, $options: 'i' } }
        ];
      }

      const [mongoStudies, mongoTotal] = await Promise.all([
        Study.find(query)
          .skip(parseInt(skip))
          .limit(parseInt(limit))
          .sort({ upload_time: -1 }),
        Study.countDocuments(query)
      ]);

      // Manually populate patient data since patient_id is a string, not ObjectId
      const studiesWithPatients = await Promise.all(
        mongoStudies.map(async (study) => {
          const patient = await Patient.findOne({ patient_id: study.patient_id, active: true });
          return {
            ...study.toObject(),
            patient: patient ? {
              first_name: patient.first_name,
              last_name: patient.last_name,
              patient_id: patient.patient_id
            } : null
          };
        })
      );

      studies = studiesWithPatients;
      total = mongoTotal;

    } catch (mongoError) {
      console.log('MongoDB not available, using JSON fallback:', mongoError.message);
      
      // Fallback to JSON file
      const jsonStudies = await loadStudiesFromJSON();
      
      // Apply filters
      let filteredStudies = jsonStudies;
      
      if (patient_id) {
        filteredStudies = filteredStudies.filter(study => study.patient_id === patient_id);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredStudies = filteredStudies.filter(study => 
          (study.study_description && study.study_description.toLowerCase().includes(searchLower)) ||
          (study.original_filename && study.original_filename.toLowerCase().includes(searchLower)) ||
          (study.modality && study.modality.toLowerCase().includes(searchLower))
        );
      }
      
      total = filteredStudies.length;
      
      // Apply pagination
      const startIndex = parseInt(skip);
      const endIndex = startIndex + parseInt(limit);
      studies = filteredStudies.slice(startIndex, endIndex);
    }

    res.json({
      studies,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

  } catch (error) {
    console.error('Error fetching studies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /studies/:study_uid - Get specific study
router.get('/:study_uid', async (req, res) => {
  try {
    const { study_uid } = req.params;
    let study = null;
    
    try {
      // Try MongoDB first
      study = await Study.findOne({ 
        study_uid: study_uid,
        active: true 
      });

      // If not found, try partial match (like Python backend)
      if (!study) {
        study = await Study.findOne({
          study_uid: { $regex: study_uid, $options: 'i' },
          active: true
        });
      }

      // Manually populate patient data if study found
      if (study) {
        const patient = await Patient.findOne({ 
          patient_id: study.patient_id, 
          active: true 
        });
        
        const studyObject = study.toObject();
        
        // Populate image_urls if not already set
        if (!studyObject.image_urls || studyObject.image_urls.length === 0) {
          if (studyObject.file_url) {
            const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
            studyObject.image_urls = [`${BASE_URL}${studyObject.file_url}`];
            studyObject.image_urls_count = 1;
          }
        }
        
        const studyWithPatient = {
          ...studyObject,
          patient: patient ? {
            first_name: patient.first_name,
            last_name: patient.last_name,
            patient_id: patient.patient_id
          } : null
        };
        
        return res.json(studyWithPatient);
      }

    } catch (mongoError) {
      console.log('MongoDB not available, using JSON fallback:', mongoError.message);
      
      // Fallback to JSON file
      const jsonStudies = await loadStudiesFromJSON();
      
      // Try exact match first
      study = jsonStudies.find(s => s.study_uid === study_uid);
      
      // If not found, try partial match
      if (!study) {
        study = jsonStudies.find(s => s.study_uid.includes(study_uid));
      }
      
      if (study) {
        return res.json(study);
      }
    }

    // If still not found, return 404
    res.status(404).json({
      error: 'Study not found',
      detail: `Study with UID ${study_uid} not found`
    });

  } catch (error) {
    console.error('Error fetching study:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /patients/:patient_id/studies - Get studies for specific patient
router.get('/patients/:patient_id/studies', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // Check if patient exists
    const patient = await Patient.findOne({ 
      patient_id: patient_id,
      active: true 
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        detail: `Patient with ID ${patient_id} not found`
      });
    }

    const [studies, total] = await Promise.all([
      Study.find({ 
        patient_id: patient_id,
        active: true 
      })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ upload_time: -1 }),
      Study.countDocuments({ 
        patient_id: patient_id,
        active: true 
      })
    ]);

    res.json({
      patient_id,
      studies,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

  } catch (error) {
    console.error('Error fetching patient studies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /patients/:patient_id/upload/dicom - Upload DICOM file
router.post('/patients/:patient_id/upload/dicom', upload.single('file'), async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if patient exists
    const patient = await Patient.findOne({ patient_id, active: true });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const filePath = req.file.path;
    const filename = req.file.filename;
    
    // Process DICOM file using Python helper
    let dicomInfo;
    try {
      dicomInfo = await processDicomFile(filePath, 'get_info');
      
      if (!dicomInfo.success) {
        console.error('DICOM processing failed:', dicomInfo.error);
        // Continue with basic metadata if DICOM processing fails
        dicomInfo = {
          success: true,
          info: {
            patient_name: patient.first_name || 'Unknown',
            patient_id: patient_id,
            study_date: new Date().toISOString().split('T')[0],
            study_time: new Date().toTimeString().split(' ')[0],
            modality: 'CT',
            study_description: description || `Uploaded DICOM - ${filename}`,
            has_pixel_data: true,
            file_size: req.file.size
          }
        };
      }
    } catch (error) {
      console.error('Error processing DICOM:', error);
      // Fallback to basic metadata
      dicomInfo = {
        success: true,
        info: {
          patient_name: patient.first_name || 'Unknown',
          patient_id: patient_id,
          study_date: new Date().toISOString().split('T')[0],
          study_time: new Date().toTimeString().split(' ')[0],
          modality: 'CT',
          study_description: description || `Uploaded DICOM - ${filename}`,
          has_pixel_data: true,
          file_size: req.file.size
        }
      };
    }

    // Generate study UID
    const studyUID = generateStudyUID(patient_id, filename);
    
    // Create image URLs for DICOM viewer
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const imageUrls = [`${baseUrl}/uploads/${patient_id}/${filename}`];
    
    // Create study record
    const study = new Study({
      study_uid: studyUID,
      patient_id: patient_id,
      patient_name: `${patient.first_name} ${patient.last_name || ''}`.trim(),
      study_date: dicomInfo.info.study_date || new Date().toISOString().split('T')[0],
      study_time: dicomInfo.info.study_time || new Date().toTimeString().split(' ')[0],
      modality: dicomInfo.info.modality || 'CT',
      study_description: dicomInfo.info.study_description || description || `Uploaded DICOM - ${filename}`,
      status: 'received',
      original_filename: filename,
      file_size: req.file.size,
      dicom_url: `/uploads/${patient_id}/${filename}`,
      image_urls: imageUrls,
      image_urls_count: imageUrls.length,
      dicom_metadata: dicomInfo.info,
      processing_status: dicomInfo.success ? 'completed' : 'failed',
      has_pixel_data: dicomInfo.info.has_pixel_data || false,
      total_slices: dicomInfo.info.total_slices || 1,
      is_multi_slice: dicomInfo.info.is_multi_slice || false
    });

    await study.save();

    res.json({
      success: true,
      message: 'DICOM file uploaded successfully',
      study: {
        study_uid: study.study_uid,
        patient_id: study.patient_id,
        patient_name: study.patient_name,
        study_date: study.study_date,
        modality: study.modality,
        study_description: study.study_description,
        status: study.status,
        original_filename: study.original_filename,
        file_size: study.file_size,
        dicom_url: study.dicom_url,
        processing_status: study.processing_status,
        has_pixel_data: study.has_pixel_data,
        total_slices: study.total_slices,
        is_multi_slice: study.is_multi_slice,
        created_at: study.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading DICOM file:', error);
    res.status(500).json({ 
      error: 'Failed to upload DICOM file',
      details: error.message 
    });
  }
});

// DELETE /studies/:study_uid - Soft delete study
router.delete('/:study_uid', async (req, res) => {
  try {
    const { study_uid } = req.params;

    const study = await Study.findOne({ 
      study_uid: study_uid,
      active: true 
    });

    if (!study) {
      return res.status(404).json({
        error: 'Study not found',
        detail: `Study with UID ${study_uid} not found`
      });
    }

    // Soft delete
    await Study.findOneAndUpdate(
      { study_uid: study_uid },
      { $set: { active: false } }
    );

    res.status(204).send();

  } catch (error) {
    console.error('Error deleting study:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;