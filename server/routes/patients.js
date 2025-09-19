const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Study = require('../models/Study');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const patientId = req.params.patient_id || req.params.patientId;
    const uploadDir = path.join(__dirname, '..', 'uploads', patientId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename for DICOM files
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept all files for now, can add validation later
    cb(null, true);
  }
});

// Validation helper
const validatePatientData = (data) => {
  const errors = [];
  
  if (!data.patient_id || data.patient_id.trim().length === 0) {
    errors.push('Patient ID is required');
  }
  if (!data.first_name || data.first_name.trim().length === 0) {
    errors.push('First name is required');
  }
  if (!data.last_name || data.last_name.trim().length === 0) {
    errors.push('Last name is required');
  }
  if (!data.date_of_birth) {
    errors.push('Date of birth is required');
  }
  if (!data.gender || !['M', 'F', 'O'].includes(data.gender)) {
    errors.push('Gender must be M, F, or O');
  }
  if (data.email && !data.email.includes('@')) {
    errors.push('Invalid email format');
  }
  
  return errors;
};

// GET /patients - Get all patients with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      search,
      page = 1,
      per_page,
      limit,
      skip = 0
    } = req.query;

    // Handle pagination parameters (support both per_page and limit)
    const itemsPerPage = per_page || limit || 20;
    const pageNum = parseInt(page);
    const skipItems = skip ? parseInt(skip) : (pageNum - 1) * itemsPerPage;

    // Build query
    let query = { active: true };
    
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { patient_id: { $regex: search, $options: 'i' } },
        { medical_record_number: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const [patients, total] = await Promise.all([
      Patient.find(query)
        .skip(skipItems)
        .limit(parseInt(itemsPerPage))
        .sort({ createdAt: -1 }),
      Patient.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / itemsPerPage);

    res.json({
      patients,
      total,
      page: pageNum,
      per_page: parseInt(itemsPerPage),
      total_pages: totalPages
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /patients/:patient_id - Get specific patient
router.get('/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    const patient = await Patient.findOne({ 
      patient_id: patient_id,
      active: true 
    });

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        detail: `Patient with ID ${patient_id} not found or inactive`
      });
    }

    res.json(patient);

  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /patients - Create new patient
router.post('/', async (req, res) => {
  try {
    const patientData = req.body;
    
    // Validate required fields
    const validationErrors = validatePatientData(patientData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Check if patient_id already exists
    const existingPatient = await Patient.findOne({ 
      patient_id: patientData.patient_id 
    });
    
    if (existingPatient) {
      return res.status(400).json({
        error: 'Patient ID already exists',
        detail: `Patient with ID ${patientData.patient_id} already exists`
      });
    }

    // Create new patient
    const patient = new Patient({
      ...patientData,
      _id: uuidv4() // Generate UUID for MongoDB _id
    });

    await patient.save();

    res.status(201).json(patient);

  } catch (error) {
    console.error('Error creating patient:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate key error',
        detail: 'Patient ID already exists'
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /patients/:patient_id - Update patient
router.put('/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const updateData = req.body;

    // Find existing patient
    const existingPatient = await Patient.findOne({ 
      patient_id: patient_id,
      active: true 
    });

    if (!existingPatient) {
      return res.status(404).json({
        error: 'Patient not found',
        detail: `Patient with ID ${patient_id} not found or inactive`
      });
    }

    // Validate update data if provided
    if (updateData.email && !updateData.email.includes('@')) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Invalid email format']
      });
    }

    if (updateData.gender && !['M', 'F', 'O'].includes(updateData.gender)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Gender must be M, F, or O']
      });
    }

    // Update patient
    const updatedPatient = await Patient.findOneAndUpdate(
      { patient_id: patient_id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json(updatedPatient);

  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /patients/:patient_id - Soft delete patient
router.delete('/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const patient = await Patient.findOne({ 
      patient_id: patient_id,
      active: true 
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        detail: `Patient with ID ${patient_id} not found or already inactive`
      });
    }

    // Soft delete by setting active to false
    await Patient.findOneAndUpdate(
      { patient_id: patient_id },
      { $set: { active: false } }
    );

    res.status(204).send();

  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /patients/count - Debug endpoint for patient count
router.get('/debug/count', async (req, res) => {
  try {
    const [activeCount, totalCount] = await Promise.all([
      Patient.countDocuments({ active: true }),
      Patient.countDocuments({})
    ]);

    res.json({
      active_patients: activeCount,
      total_patients: totalCount,
      inactive_patients: totalCount - activeCount
    });

  } catch (error) {
    console.error('Error getting patient count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /patients/:patient_id/upload/dicom - Upload DICOM files
router.post('/:patient_id/upload/dicom', upload.array('files'), async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    // Check if patient exists
    const patient = await Patient.findOne({ patient_id, active: true });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process uploaded files and create study records
    const uploadedFiles = [];
    const studyRecords = [];

    for (const file of req.files) {
      const uploadedFile = {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        path: file.path,
        mimetype: file.mimetype
      };
      uploadedFiles.push(uploadedFile);

      // Create study record in database
      const studyData = {
        study_uid: uuidv4(),
        patient_id: patient_id,
        original_filename: file.originalname,
        file_path: file.path,
        file_size: file.size,
        study_date: new Date(),
        study_description: `DICOM Study - ${file.originalname}`,
        modality: 'Unknown', // Will be updated when DICOM is processed
        processing_status: 'pending',
        file_url: `/uploads/${patient_id}/${file.filename}`
      };

      try {
        const study = new Study(studyData);
        const savedStudy = await study.save();
        studyRecords.push(savedStudy);
        console.log(`💾 Study record created for ${file.originalname}:`, savedStudy.study_uid);
      } catch (studyError) {
        console.error(`❌ Error creating study record for ${file.originalname}:`, studyError);
        // Continue with other files even if one fails
      }
    }

    console.log(`📤 DICOM files uploaded for patient ${patient_id}:`, uploadedFiles.map(f => f.filename));

    res.json({
      success: true,
      message: `Successfully uploaded ${req.files.length} DICOM file(s)`,
      patient_id,
      uploaded_files: uploadedFiles,
      studies_created: studyRecords.length,
      study: studyRecords.length > 0 ? {
        id: studyRecords[0].study_uid,
        patient_id,
        study_date: new Date().toISOString(),
        dicom_files: uploadedFiles.map(f => f.filename),
        total_studies: studyRecords.length
      } : null
    });

  } catch (error) {
    console.error('❌ Error uploading DICOM files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload DICOM files',
      error: error.message
    });
  }
});

// POST /patients/:patient_id/upload - Upload general files
router.post('/:patient_id/upload', upload.array('files'), async (req, res) => {
  try {
    const { patient_id } = req.params;
    
    // Check if patient exists
    const patient = await Patient.findOne({ patient_id, active: true });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      path: file.path,
      mimetype: file.mimetype
    }));

    console.log(`📤 Files uploaded for patient ${patient_id}:`, uploadedFiles.map(f => f.filename));

    res.json({
      success: true,
      message: `Successfully uploaded ${req.files.length} file(s)`,
      patient_id,
      uploaded_files: uploadedFiles
    });

  } catch (error) {
    console.error('❌ Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files',
      error: error.message
    });
  }
});

module.exports = router;