const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const Folder = require('../models/Folder');
const File = require('../models/File');

// Base directory for file uploads (centralized storage)
const BASE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Initialize base directory
const initializeBaseDir = async () => {
  try {
    await fs.mkdir(BASE_UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating base directory:', error);
  }
};

// Configure multer for file uploads with centralized storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // Store all files in a centralized uploads directory
      await fs.mkdir(BASE_UPLOAD_DIR, { recursive: true });
      cb(null, BASE_UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

// Configure multer with support for all file types
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow all file types
    cb(null, true);
  }
});

// Helper functions are no longer needed as we use database-only virtual folders
// These functions were used for physical folder operations

// GET /nested-folders - Get complete folder structure from database
router.get('/', async (req, res) => {
  try {
    await initializeBaseDir();
    
    // Get folder structure from database
    const folders = await Folder.find({ status: 'active' })
      .populate('parent', 'name fullPath')
      .sort({ depth: 1, name: 1 })
      .lean();

    // Build hierarchical structure
    const buildHierarchy = (folders, parentPath = '') => {
      return folders
        .filter(folder => folder.parentPath === parentPath)
        .map(folder => ({
          id: folder._id,
          name: folder.name,
          path: folder.fullPath,
          type: 'folder',
          created: folder.createdAt,
          modified: folder.updatedAt,
          fileCount: folder.fileCount,
          subfolderCount: folder.subfolderCount,
          totalSize: folder.totalSize,
          depth: folder.depth,
          subFolders: buildHierarchy(folders, folder.fullPath)
        }));
    };

    const structure = buildHierarchy(folders);
    
    res.json({
      success: true,
      structure: structure,
      totalFolders: folders.length,
      message: 'Folder structure retrieved successfully from database'
    });
  } catch (error) {
    console.error('Error getting folder structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder structure',
      error: error.message
    });
  }
});

// GET /nested-folders/folder/:folderPath - Get specific folder contents from database
router.get('/folder/*', async (req, res) => {
  try {
    const folderPath = req.params[0] || '';
    
    // Find folder in database
    const folder = await Folder.findOne({ 
      fullPath: folderPath, 
      status: 'active' 
    }).populate('parent', 'name fullPath');
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found in database'
      });
    }

    // Get subfolders from database
    const subfolders = await Folder.find({ 
      parentPath: folderPath, 
      status: 'active' 
    }).sort({ name: 1 });

    // Get files from File model (database)
    const dbFiles = await File.find({ 
      folderId: folder._id, 
      status: 'active' 
    }).sort({ originalName: 1 });

    const files = dbFiles.map(file => ({
      id: file._id,
      filename: file.originalName,
      path: file.virtualPath,
      size: file.size,
      type: file.fileType,
      extension: file.extension,
      mimeType: file.mimeType,
      created: file.createdAt,
      modified: file.updatedAt,
      downloadUrl: `/api/nested-folders/download/${encodeURIComponent(file.virtualPath)}`,
      storagePath: file.storagePath,
      uploadedBy: file.uploadedBy,
      downloadCount: file.downloadCount
    }));

    // Format subfolders
    const folders = subfolders.map(subfolder => ({
      id: subfolder._id,
      name: subfolder.name,
      path: subfolder.fullPath,
      type: 'folder',
      created: subfolder.createdAt,
      modified: subfolder.updatedAt,
      fileCount: subfolder.fileCount,
      subfolderCount: subfolder.subfolderCount,
      totalSize: subfolder.totalSize,
      depth: subfolder.depth
    }));

    res.json({
      success: true,
      folder: {
        id: folder._id,
        name: folder.name,
        path: folder.fullPath,
        parentPath: folder.parentPath,
        depth: folder.depth,
        created: folder.createdAt,
        modified: folder.updatedAt
      },
      folders: folders,
      files: files,
      totalItems: folders.length + files.length,
      message: 'Folder contents retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting folder contents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder contents',
      error: error.message
    });
  }
});

// POST /nested-folders/create - Create new folder
router.post('/create', async (req, res) => {
  try {
    const { folderName, parentPath = '' } = req.body;
    
    console.log('🚀 Virtual Folder Creation Debug:', {
      'folderName': folderName,
      'parentPath': parentPath,
      'req.body': req.body
    });
    
    if (!folderName || !folderName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    const sanitizedName = folderName.trim().replace(/[<>:"/\\|?*]/g, '_');
    const fullPath = parentPath ? `${parentPath}/${sanitizedName}` : sanitizedName;
    
    console.log('📁 Virtual Path Construction Debug:', {
      'sanitizedName': sanitizedName,
      'parentPath': parentPath,
      'fullPath': fullPath
    });

    // Check if folder already exists in database
    const existingFolder = await Folder.findByPath(fullPath);
    if (existingFolder) {
      return res.status(409).json({
        success: false,
        message: 'Folder already exists'
      });
    }

    // Find parent folder if parentPath is provided
    let parentFolder = null;
    let depth = 0;
    
    if (parentPath) {
      parentFolder = await Folder.findByPath(parentPath);
      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found'
        });
      }
      depth = parentFolder.depth + 1;
    }

    // Create virtual folder record in database (no physical folder creation)
    const folderData = {
      name: folderName.trim(),
      sanitizedName: sanitizedName,
      fullPath: fullPath,
      parentId: parentFolder ? parentFolder._id : null,
      parentPath: parentPath,
      depth: depth,
      isVirtual: true,
      physicalPath: null,
      fileCount: 0,
      subfolderCount: 0,
      totalSize: 0,
      status: 'active'
    };

    const newFolder = new Folder(folderData);
    await newFolder.save();

    // Update parent folder's subfolder count
    if (parentFolder) {
      parentFolder.subfolderCount += 1;
      parentFolder.lastAccessed = new Date();
      await parentFolder.save();
    }

    console.log('✅ Virtual folder created successfully:', {
      'folderId': newFolder._id,
      'fullPath': newFolder.fullPath,
      'isVirtual': newFolder.isVirtual
    });

    res.json({
      success: true,
      folder: {
        id: newFolder._id,
        name: newFolder.name,
        folderName: sanitizedName,
        folderPath: fullPath,
        parentId: newFolder.parentId,
        parentPath: newFolder.parentPath,
        depth: newFolder.depth,
        isVirtual: newFolder.isVirtual,
        created: newFolder.createdAt
      },
      message: 'Virtual folder created successfully'
    });
  } catch (error) {
    console.error('Error creating virtual folder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create virtual folder',
      error: error.message
    });
  }
});

// POST /nested-folders/upload - Upload files to specific folder
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { folderPath = '', folderId } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Find the target folder (either by ID or path)
    let targetFolder = null;
    if (folderId) {
      targetFolder = await Folder.findById(folderId);
    } else if (folderPath) {
      targetFolder = await Folder.findByPath(folderPath);
    }

    if (!targetFolder && (folderId || folderPath)) {
      return res.status(404).json({
        success: false,
        message: 'Target folder not found'
      });
    }

    const uploadedFiles = [];
    
    for (const file of req.files) {
      // Create file record in database
      const fileData = {
        originalName: file.originalname,
        filename: file.filename,
        storagePath: file.path,
        folderId: targetFolder ? targetFolder._id : null,
        virtualPath: targetFolder ? `${targetFolder.fullPath}/${file.filename}` : file.filename,
        size: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).toLowerCase().slice(1),
        fileType: getFileType(path.extname(file.originalname).toLowerCase().slice(1)),
        uploadedBy: 'system', // You can get this from authentication
        status: 'active'
      };

      const newFile = new File(fileData);
      await newFile.save();

      // Update folder file count and total size
      if (targetFolder) {
        await targetFolder.updateFileCount(1);
        await targetFolder.updateTotalSize(file.size);
      }

      uploadedFiles.push({
        id: newFile._id,
        originalName: newFile.originalName,
        filename: newFile.filename,
        size: newFile.size,
        type: newFile.fileType,
        virtualPath: newFile.virtualPath,
        folderId: newFile.folderId,
        uploadedAt: newFile.createdAt
      });
    }
    
    res.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s) to ${targetFolder ? targetFolder.name : 'root'}`
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

// GET /nested-folders/download/* - Download file by virtual path
router.get('/download/*', async (req, res) => {
  try {
    const virtualPath = req.params[0];
    
    // Find file in database by virtual path
    const file = await File.findOne({ 
      virtualPath: virtualPath, 
      status: 'active' 
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Check if physical file exists
    try {
      await fs.access(file.storagePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Physical file not found'
      });
    }
    
    // Update download count
    await file.incrementDownloadCount();
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    
    const fileStream = require('fs').createReadStream(file.storagePath);
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

// DELETE /nested-folders/folder/* - Delete virtual folder
router.delete('/folder/*', async (req, res) => {
  try {
    const folderPath = req.params[0];
    
    // Find folder in database
    const folder = await Folder.findOne({ 
      fullPath: folderPath, 
      status: 'active' 
    });
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    // Mark folder as deleted (soft delete)
    folder.status = 'deleted';
    await folder.save();
    
    // Also mark all files in this folder as deleted
    await File.updateMany(
      { folderId: folder._id, status: 'active' },
      { status: 'deleted' }
    );
    
    res.json({
      success: true,
      message: 'Virtual folder deleted successfully'
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

// DELETE /nested-folders/file/* - Delete virtual file
router.delete('/file/*', async (req, res) => {
  try {
    const virtualPath = req.params[0];
    
    // Find file in database
    const file = await File.findOne({ 
      virtualPath: virtualPath, 
      status: 'active' 
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Mark file as deleted (soft delete)
    file.status = 'deleted';
    await file.save();
    
    // Update folder file count
    const folder = await Folder.findById(file.folderId);
    if (folder) {
      folder.fileCount = Math.max(0, folder.fileCount - 1);
      folder.totalSize = Math.max(0, folder.totalSize - file.size);
      await folder.save();
    }
    
    res.json({
      success: true,
      message: 'Virtual file deleted successfully'
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

// Helper function to determine file type based on extension
function getFileType(extension) {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];
  const medicalTypes = ['dcm', 'dicom'];
  
  if (imageTypes.includes(extension)) return 'image';
  if (videoTypes.includes(extension)) return 'video';
  if (audioTypes.includes(extension)) return 'audio';
  if (documentTypes.includes(extension)) return 'document';
  if (archiveTypes.includes(extension)) return 'archive';
  if (medicalTypes.includes(extension)) return 'medical';
  
  return 'other';
}

// Helper function to get MIME type
function getMimeType(extension) {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'zip': 'application/zip',
    'dcm': 'application/dicom',
    'dicom': 'application/dicom'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// Initialize base directory on module load
initializeBaseDir();

module.exports = router;