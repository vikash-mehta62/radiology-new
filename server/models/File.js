const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  // Basic file information
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  
  filename: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // File storage information
  storagePath: {
    type: String,
    required: true,
    trim: true
  },
  
  // Virtual folder reference
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // null means root level
  },
  
  virtualPath: {
    type: String,
    required: true,
    trim: true,
    default: ''
  },
  
  // File metadata
  size: {
    type: Number,
    required: true,
    min: 0
  },
  
  mimeType: {
    type: String,
    required: true,
    trim: true
  },
  
  extension: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // File type categorization
  fileType: {
    type: String,
    enum: ['image', 'dicom', 'document', 'video', 'audio', 'other'],
    default: 'other'
  },
  
  // DICOM specific fields
  isDicom: {
    type: Boolean,
    default: false
  },
  
  dicomMetadata: {
    patientId: String,
    studyId: String,
    seriesId: String,
    instanceNumber: Number,
    modality: String,
    studyDate: Date,
    patientName: String
  },
  
  // File processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  processingError: {
    type: String,
    default: null
  },
  
  // Thumbnails and previews
  thumbnailPath: {
    type: String,
    default: null
  },
  
  previewPath: {
    type: String,
    default: null
  },
  
  // Access and permissions
  isPublic: {
    type: Boolean,
    default: false
  },
  
  accessLevel: {
    type: String,
    enum: ['private', 'shared', 'public'],
    default: 'private'
  },
  
  // Upload information
  uploadedBy: {
    type: String,
    default: 'system'
  },
  
  uploadSession: {
    type: String,
    default: null
  },
  
  // File status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Checksums for integrity
  md5Hash: {
    type: String,
    default: null
  },
  
  sha256Hash: {
    type: String,
    default: null
  },
  
  // Tags and metadata
  tags: [{
    type: String,
    trim: true
  }],
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Download statistics
  downloadCount: {
    type: Number,
    default: 0
  },
  
  lastDownloaded: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
fileSchema.index({ folderId: 1, status: 1 });
fileSchema.index({ virtualPath: 1, status: 1 });
fileSchema.index({ filename: 1 }, { unique: true });
fileSchema.index({ originalName: 1 });
fileSchema.index({ fileType: 1, status: 1 });
fileSchema.index({ isDicom: 1, status: 1 });
fileSchema.index({ 'dicomMetadata.patientId': 1 });
fileSchema.index({ 'dicomMetadata.studyId': 1 });
fileSchema.index({ createdAt: -1 });

// Virtual for folder reference
fileSchema.virtual('folder', {
  ref: 'Folder',
  localField: 'folderId',
  foreignField: '_id',
  justOne: true
});

// Virtual for download URL
fileSchema.virtual('downloadUrl').get(function() {
  return `/api/files/download/${this.filename}`;
});

// Virtual for preview URL
fileSchema.virtual('previewUrl').get(function() {
  if (this.previewPath) {
    return `/api/files/preview/${this.filename}`;
  }
  return null;
});

// Virtual for thumbnail URL
fileSchema.virtual('thumbnailUrl').get(function() {
  if (this.thumbnailPath) {
    return `/api/files/thumbnail/${this.filename}`;
  }
  return null;
});

// Virtual for full virtual path
fileSchema.virtual('fullVirtualPath').get(function() {
  if (this.virtualPath) {
    return `${this.virtualPath}/${this.originalName}`;
  }
  return this.originalName;
});

// Pre-save middleware
fileSchema.pre('save', function(next) {
  // Extract extension from original name
  if (this.originalName && !this.extension) {
    const ext = this.originalName.split('.').pop();
    if (ext && ext !== this.originalName) {
      this.extension = ext.toLowerCase();
    }
  }
  
  // Determine file type based on extension and mime type
  if (!this.fileType || this.fileType === 'other') {
    this.fileType = this.determineFileType();
  }
  
  // Check if it's a DICOM file
  if (this.extension === 'dcm' || this.mimeType === 'application/dicom') {
    this.isDicom = true;
    this.fileType = 'dicom';
  }
  
  next();
});

// Instance methods
fileSchema.methods.determineFileType = function() {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  
  if (this.extension === 'dcm' || this.mimeType === 'application/dicom') {
    return 'dicom';
  } else if (imageExts.includes(this.extension)) {
    return 'image';
  } else if (videoExts.includes(this.extension)) {
    return 'video';
  } else if (audioExts.includes(this.extension)) {
    return 'audio';
  } else if (docExts.includes(this.extension)) {
    return 'document';
  }
  
  return 'other';
};

fileSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

fileSchema.methods.updateProcessingStatus = function(status, error = null) {
  this.processingStatus = status;
  if (error) {
    this.processingError = error;
  }
  return this.save();
};

// Static methods
fileSchema.statics.findByFolder = function(folderId, options = {}) {
  const query = { 
    folderId: folderId || null, 
    status: options.status || 'active' 
  };
  
  return this.find(query)
    .populate('folder', 'name fullPath')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 0);
};

fileSchema.statics.findByVirtualPath = function(virtualPath, options = {}) {
  const query = { 
    virtualPath: virtualPath || '', 
    status: options.status || 'active' 
  };
  
  return this.find(query)
    .populate('folder', 'name fullPath')
    .sort(options.sort || { originalName: 1 })
    .limit(options.limit || 0);
};

fileSchema.statics.findDicomFiles = function(patientId = null, studyId = null) {
  const query = { 
    isDicom: true, 
    status: 'active' 
  };
  
  if (patientId) {
    query['dicomMetadata.patientId'] = patientId;
  }
  
  if (studyId) {
    query['dicomMetadata.studyId'] = studyId;
  }
  
  return this.find(query)
    .populate('folder', 'name fullPath')
    .sort({ 'dicomMetadata.instanceNumber': 1 });
};

fileSchema.statics.getStorageStats = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' }
      }
    }
  ]);
};

fileSchema.statics.getFileTypeStats = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$fileType',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('File', fileSchema);