const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configure multer for file uploads with dynamic folder support
// Note: Static multer configuration removed - using dynamic configuration in upload routes

// GET /folders - List all folders
router.get('/', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    try {
      await fs.access(uploadsDir);
    } catch (error) {
      return res.json({
        success: true,
        folders: [],
        message: 'No folders exist yet'
      });
    }

    const items = await fs.readdir(uploadsDir, { withFileTypes: true });
    const folders = [];

    for (const item of items) {
      if (item.isDirectory()) {
        const folderPath = path.join(uploadsDir, item.name);
        const stats = await fs.stat(folderPath);
        
        // Count files in folder
        let fileCount = 0;
        try {
          const files = await fs.readdir(folderPath);
          fileCount = files.length;
        } catch (error) {
          console.error(`Error reading folder ${item.name}:`, error);
        }

        folders.push({
          name: item.name,
          path: item.name,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          fileCount: fileCount
        });
      }
    }

    res.json({
      success: true,
      folders: folders.sort((a, b) => new Date(b.created) - new Date(a.created))
    });

  } catch (error) {
    console.error('Error listing folders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list folders',
      error: error.message
    });
  }
});

// POST /folders - Create new folder
router.post('/', async (req, res) => {
  try {
    const { folderName } = req.body;
    
    if (!folderName || folderName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    // Sanitize folder name
    const sanitizedName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderPath = path.join(__dirname, '..', 'uploads', sanitizedName);

    // Check if folder already exists
    try {
      await fs.access(folderPath);
      return res.status(409).json({
        success: false,
        message: 'Folder already exists'
      });
    } catch (error) {
      // Folder doesn't exist, which is what we want
    }

    // Create the folder
    await fs.mkdir(folderPath, { recursive: true });

    res.json({
      success: true,
      message: 'Folder created successfully',
      folder: {
        name: sanitizedName,
        path: sanitizedName,
        created: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create folder',
      error: error.message
    });
  }
});

// GET /folders/:folderPath/files - List files in a specific folder
router.get('/:folderPath/files', async (req, res) => {
  try {
    const { folderPath } = req.params;
    const fullPath = path.join(__dirname, '..', 'uploads', folderPath);

    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    const files = await fs.readdir(fullPath);
    const fileDetails = [];

    for (const filename of files) {
      const filePath = path.join(fullPath, filename);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const ext = path.extname(filename).toLowerCase();
        
        fileDetails.push({
          filename,
          originalName: filename,
          size: stats.size,
          extension: ext,
          type: getFileType(ext),
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          url: `/uploads/${folderPath}/${filename}`,
          downloadUrl: `/folders/${folderPath}/download/${filename}`
        });
      }
    }

    res.json({
      success: true,
      folderPath,
      totalFiles: fileDetails.length,
      files: fileDetails.sort((a, b) => new Date(b.created) - new Date(a.created))
    });

  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files',
      error: error.message
    });
  }
});

// POST /folders/:folderPath/upload - Upload files to specific folder
router.post('/:folderPath/upload', (req, res) => {
  console.log('🚀 Upload request received for folder:', req.params.folderPath);
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Request method:', req.method);
  
  // Create dynamic upload middleware for this specific folder
  const dynamicUpload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        try {
          const folderPath = req.params.folderPath || 'default';

          console.log(req.params,"req.params")
          const uploadDir = path.join(__dirname, '..', 'uploads', folderPath);
          
          console.log('🔍 DETAILED Upload Debug:', {
            'req.params': req.params,
            'req.params.folderPath': req.params.folderPath,
            'folderPath (final)': folderPath,
            'uploadDir': uploadDir,
            '__dirname': __dirname,
            'file.originalname': file.originalname
          });
          
          // Create directory if it doesn't exist (synchronously)
          const fs = require('fs');
          if (!fs.existsSync(uploadDir)) {
            console.log('📁 Creating directory:', uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });
          } else {
            console.log('📁 Directory already exists:', uploadDir);
          }
          
          console.log('✅ Using upload directory:', uploadDir);
          cb(null, uploadDir);
        } catch (error) {
          console.error('❌ Destination error:', error);
          cb(error);
        }
      },
      filename: function (req, file, cb) {
        // Keep original filename with timestamp to avoid conflicts
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${timestamp}${ext}`);
      }
    }),
    limits: {
      fileSize: 500 * 1024 * 1024 // 500MB limit
    }
  });

  // Use the dynamic upload middleware
  dynamicUpload.array('files')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({
        success: false,
        message: 'Upload failed',
        error: err.message
      });
    }

    try {
      const { folderPath } = req.params;
      
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

      console.log(`📤 Files uploaded to folder ${folderPath}:`, uploadedFiles.map(f => f.filename));

      res.json({
        success: true,
        message: `Successfully uploaded ${req.files.length} file(s) to ${folderPath}`,
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
});

// GET /folders/:folderPath/download/:filename - Download specific file
router.get('/:folderPath/download/:filename', async (req, res) => {
  try {
    const { folderPath, filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', folderPath, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Set appropriate headers
    res.set({
      'Content-Type': getMimeType(ext),
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*'
    });

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
});

// DELETE /folders/:folderPath - Delete folder and all its contents
router.delete('/:folderPath', async (req, res) => {
  try {
    const { folderPath } = req.params;
    const fullPath = path.join(__dirname, '..', 'uploads', folderPath);

    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Remove folder and all contents
    await fs.rm(fullPath, { recursive: true, force: true });

    res.json({
      success: true,
      message: `Folder ${folderPath} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
      error: error.message
    });
  }
});

// DELETE /folders/:folderPath/files/:filename - Delete specific file
router.delete('/:folderPath/files/:filename', async (req, res) => {
  try {
    const { folderPath, filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', folderPath, filename);

    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: `File ${filename} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
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

// Helper function to get MIME type
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.dcm': 'application/dicom',
    '.dicom': 'application/dicom'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

module.exports = router;