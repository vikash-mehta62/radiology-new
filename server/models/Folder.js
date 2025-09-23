const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  
  // Sanitized name for file system operations
  sanitizedName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Full path from root (e.g., "parent1/parent2/current")
  fullPath: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Reference to parent folder (null for root folders)
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  
  // Parent path for easier querying
  parentPath: {
    type: String,
    default: '',
    index: true
  },
  
  // Depth level (0 for root, 1 for first level, etc.)
  depth: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  
  // Virtual folder - no physical path needed
  isVirtual: {
    type: Boolean,
    default: true
  },
  
  // Optional physical path (for backward compatibility)
  physicalPath: {
    type: String,
    default: null
  },
  
  // Folder metadata
  description: {
    type: String,
    maxlength: 1000
  },
  
  // File count (updated when files are added/removed)
  fileCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Subfolder count (updated when subfolders are added/removed)
  subfolderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Total size of all files in this folder (in bytes)
  totalSize: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Folder status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Access permissions
  permissions: {
    read: {
      type: Boolean,
      default: true
    },
    write: {
      type: Boolean,
      default: true
    },
    delete: {
      type: Boolean,
      default: true
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Last accessed timestamp
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  
  // Created by user (for future user management)
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'folders'
});

// Indexes for better performance
folderSchema.index({ parentId: 1, name: 1 });
folderSchema.index({ fullPath: 1 });
folderSchema.index({ parentPath: 1, depth: 1 });
folderSchema.index({ status: 1, createdAt: -1 });

// Virtual for getting children folders
folderSchema.virtual('children', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual for getting parent folder
folderSchema.virtual('parent', {
  ref: 'Folder',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON output
folderSchema.set('toJSON', { virtuals: true });
folderSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update timestamps and paths
folderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Sanitize name for file system (even for virtual folders for consistency)
  if (this.isModified('name')) {
    this.sanitizedName = this.name.trim().replace(/[<>:"/\\|?*]/g, '_');
  }
  
  // For virtual folders, physicalPath is not required
  if (this.isVirtual && !this.physicalPath) {
    this.physicalPath = null;
  }
  
  next();
});

// Static method to find folder by full path
folderSchema.statics.findByPath = function(path) {
  return this.findOne({ fullPath: path, status: 'active' });
};

// Static method to get folder hierarchy
folderSchema.statics.getHierarchy = function(parentPath = '', maxDepth = 10) {
  return this.aggregate([
    {
      $match: {
        parentPath: parentPath,
        status: 'active'
      }
    },
    {
      $lookup: {
        from: 'folders',
        localField: '_id',
        foreignField: 'parentId',
        as: 'subfolders'
      }
    },
    {
      $addFields: {
        subfolderCount: { $size: '$subfolders' }
      }
    },
    {
      $sort: { name: 1 }
    }
  ]);
};

// Static method to get all descendants of a folder
folderSchema.statics.getDescendants = function(folderId) {
  return this.aggregate([
    {
      $match: { _id: folderId }
    },
    {
      $graphLookup: {
        from: 'folders',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentId',
        as: 'descendants',
        maxDepth: 10
      }
    }
  ]);
};

// Instance method to get full hierarchy path
folderSchema.methods.getHierarchyPath = async function() {
  const pathParts = [];
  let current = this;
  
  while (current) {
    pathParts.unshift(current.name);
    if (current.parentId) {
      current = await this.constructor.findById(current.parentId);
    } else {
      break;
    }
  }
  
  return pathParts.join(' > ');
};

// Instance method to update file count
folderSchema.methods.updateFileCount = async function(increment = 0) {
  this.fileCount = Math.max(0, this.fileCount + increment);
  this.lastAccessed = new Date();
  return this.save();
};

// Instance method to update total size
folderSchema.methods.updateTotalSize = async function(sizeChange = 0) {
  this.totalSize = Math.max(0, this.totalSize + sizeChange);
  this.lastAccessed = new Date();
  return this.save();
};

// Instance method to soft delete
folderSchema.methods.softDelete = async function() {
  this.status = 'deleted';
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Folder', folderSchema);