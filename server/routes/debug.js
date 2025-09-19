const express = require('express');
const router = express.Router();
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const path = require('path');
const fs = require('fs').promises;

// GET /debug/studies - Debug endpoint to see all available studies
router.get('/studies', async (req, res) => {
  try {
    const studies = await Study.find({ active: true })
      .populate('patient_id', 'first_name last_name patient_id')
      .sort({ upload_time: -1 });

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const uploadsExists = await fs.access(uploadsDir).then(() => true).catch(() => false);

    res.json({
      total_studies: studies.length,
      studies: studies.map(study => ({
        study_uid: study.study_uid,
        patient_id: study.patient_id?.patient_id || study.patient_id,
        filename: study.original_filename,
        study_description: study.study_description,
        created_at: study.createdAt,
        upload_time: study.upload_time,
        file_size: study.file_size,
        processing_status: study.processing_status,
        modality: study.modality
      })),
      uploads_dir_exists: uploadsExists,
      uploads_dir_path: uploadsDir
    });

  } catch (error) {
    console.error('Error in debug studies:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /debug/files - Debug endpoint to see all uploaded files
router.get('/files', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = [];

    try {
      const patientDirs = await fs.readdir(uploadsDir);
      
      for (const patientDir of patientDirs) {
        const patientPath = path.join(uploadsDir, patientDir);
        const stat = await fs.stat(patientPath);
        
        if (stat.isDirectory()) {
          try {
            const patientFiles = await fs.readdir(patientPath);
            
            for (const fileName of patientFiles) {
              const filePath = path.join(patientPath, fileName);
              const fileStat = await fs.stat(filePath);
              
              if (fileStat.isFile()) {
                files.push({
                  patient_id: patientDir,
                  filename: fileName,
                  file_size: fileStat.size,
                  created: fileStat.birthtime.toISOString(),
                  modified: fileStat.mtime.toISOString(),
                  file_path: filePath
                });
              }
            }
          } catch (error) {
            console.error(`Error reading patient directory ${patientDir}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error reading uploads directory:', error);
    }

    res.json({
      total_files: files.length,
      files: files.sort((a, b) => new Date(b.created) - new Date(a.created)),
      uploads_directory: uploadsDir
    });

  } catch (error) {
    console.error('Error in debug files:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /debug/patients - Debug endpoint for patient information
router.get('/patients', async (req, res) => {
  try {
    const [activePatients, totalPatients, recentPatients] = await Promise.all([
      Patient.countDocuments({ active: true }),
      Patient.countDocuments({}),
      Patient.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('patient_id first_name last_name createdAt')
    ]);

    res.json({
      active_patients: activePatients,
      total_patients: totalPatients,
      inactive_patients: totalPatients - activePatients,
      recent_patients: recentPatients,
      database_status: 'connected'
    });

  } catch (error) {
    console.error('Error in debug patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /debug/system - System information
router.get('/system', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const uploadsExists = await fs.access(uploadsDir).then(() => true).catch(() => false);

    // Get database stats
    const [patientCount, studyCount] = await Promise.all([
      Patient.countDocuments({ active: true }),
      Study.countDocuments({ active: true })
    ]);

    // Get disk usage for uploads directory
    let totalSize = 0;
    let fileCount = 0;

    if (uploadsExists) {
      try {
        const calculateDirSize = async (dirPath) => {
          const items = await fs.readdir(dirPath);
          
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
              await calculateDirSize(itemPath);
            } else {
              totalSize += stat.size;
              fileCount++;
            }
          }
        };

        await calculateDirSize(uploadsDir);
      } catch (error) {
        console.error('Error calculating directory size:', error);
      }
    }

    res.json({
      system_status: 'running',
      database: {
        status: 'connected',
        patients: patientCount,
        studies: studyCount
      },
      storage: {
        uploads_directory: uploadsDir,
        uploads_exists: uploadsExists,
        total_files: fileCount,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
      },
      server: {
        node_version: process.version,
        platform: process.platform,
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debug system:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;