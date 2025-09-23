const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configure multer for enhanced file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderPath = req.body.folderPath || req.params.patient_id || 'default';
    const uploadDir = path.join(__dirname, '..', 'uploads', folderPath);
    
    // Create directory if it doesn't exist
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

// Enhanced multer configuration for all file types
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow all file types - no restrictions
    cb(null, true);
  }
});

// POST /uploads/multi - Upload multiple files to any folder
router.post('/multi', upload.array('files'), async (req, res) => {
  try {
    const { folderPath = 'default' } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: `/uploads/${folderPath}/${file.filename}`,
      type: getFileType(path.extname(file.originalname).toLowerCase())
    }));

    console.log(`📤 Files uploaded to ${folderPath}:`, uploadedFiles.map(f => f.filename));

    res.json({
      success: true,
      message: `Successfully uploaded ${req.files.length} file(s)`,
      folderPath,
      uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files',
      error: error.message
    });
  }
});

// Helper function to determine file type
function getFileType(extension) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.svg'];
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
  const documentExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
  const medicalExts = ['.dcm', '.dicom'];

  if (imageExts.includes(extension)) return 'image';
  if (videoExts.includes(extension)) return 'video';
  if (audioExts.includes(extension)) return 'audio';
  if (documentExts.includes(extension)) return 'document';
  if (archiveExts.includes(extension)) return 'archive';
  if (medicalExts.includes(extension)) return 'medical';
  
  return 'other';
}

// GET /uploads/:patient_id/:filename - Serve uploaded files with proper CORS headers
router.get('/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', patient_id, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ 
        error: 'File not found',
        detail: `File ${filename} not found for patient ${patient_id}`
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Determine media type based on file extension
    let mediaType = 'application/octet-stream';
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.dcm':
      case '.dicom':
        mediaType = 'application/dicom';
        break;
      case '.jpg':
      case '.jpeg':
        mediaType = 'image/jpeg';
        break;
      case '.png':
        mediaType = 'image/png';
        break;
      case '.gif':
        mediaType = 'image/gif';
        break;
      case '.bmp':
        mediaType = 'image/bmp';
        break;
      case '.tiff':
      case '.tif':
        mediaType = 'image/tiff';
        break;
      case '.pdf':
        mediaType = 'application/pdf';
        break;
      case '.json':
        mediaType = 'application/json';
        break;
      case '.xml':
        mediaType = 'application/xml';
        break;
      default:
        mediaType = 'application/octet-stream';
    }

    // Set headers for proper CORS and caching
    res.set({
      'Content-Type': mediaType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache',
      'Content-Disposition': `inline; filename="${filename}"`
    });

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /uploads/:patient_id - List files for a patient
router.get('/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const patientDir = path.join(__dirname, '..', 'uploads', patient_id);

    try {
      await fs.access(patientDir);
    } catch (error) {
      return res.status(404).json({ 
        error: 'Patient directory not found',
        detail: `No uploads found for patient ${patient_id}`
      });
    }

    const files = await fs.readdir(patientDir);
    const fileDetails = [];

    for (const filename of files) {
      const filePath = path.join(patientDir, filename);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        fileDetails.push({
          filename,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          url: `/uploads/${patient_id}/${filename}`
        });
      }
    }

    res.json({
      patient_id,
      total_files: fileDetails.length,
      files: fileDetails.sort((a, b) => new Date(b.created) - new Date(a.created))
    });

  } catch (error) {
    console.error('Error listing patient files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /uploads - List all uploaded files (admin endpoint)
router.get('/', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const { limit = 50, skip = 0 } = req.query;

    try {
      await fs.access(uploadsDir);
    } catch (error) {
      return res.json({
        total_files: 0,
        files: [],
        message: 'Uploads directory does not exist'
      });
    }

    const allFiles = [];
    const patientDirs = await fs.readdir(uploadsDir);

    for (const patientDir of patientDirs) {
      const patientPath = path.join(uploadsDir, patientDir);
      const stat = await fs.stat(patientPath);
      
      if (stat.isDirectory()) {
        try {
          const files = await fs.readdir(patientPath);
          
          for (const filename of files) {
            const filePath = path.join(patientPath, filename);
            const fileStat = await fs.stat(filePath);
            
            if (fileStat.isFile()) {
              allFiles.push({
                patient_id: patientDir,
                filename,
                size: fileStat.size,
                created: fileStat.birthtime.toISOString(),
                modified: fileStat.mtime.toISOString(),
                url: `/uploads/${patientDir}/${filename}`
              });
            }
          }
        } catch (error) {
          console.error(`Error reading patient directory ${patientDir}:`, error);
        }
      }
    }

    // Sort by creation date (newest first)
    allFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

    // Apply pagination
    const startIndex = parseInt(skip);
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = allFiles.slice(startIndex, endIndex);

    res.json({
      total_files: allFiles.length,
      returned_files: paginatedFiles.length,
      limit: parseInt(limit),
      skip: parseInt(skip),
      files: paginatedFiles
    });

  } catch (error) {
    console.error('Error listing all files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;