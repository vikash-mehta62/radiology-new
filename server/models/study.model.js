const mongoose = require('mongoose');

// Study Schema for MongoDB
const studySchema = new mongoose.Schema({
    originalFileName: {
        type: String,
        required: true,
        trim: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    sliceCount: {
        type: Number,
        default: 0
    },
    slices: [{
        type: String // Array of slice file paths
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Flexible object for DICOM metadata
        default: {}
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    processedDate: {
        type: Date
    },
    errorMessage: {
        type: String
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
studySchema.index({ uploadDate: -1 });
studySchema.index({ status: 1 });
studySchema.index({ originalFileName: 1 });

// Instance methods
studySchema.methods.markAsCompleted = function(sliceCount, slices) {
    this.status = 'completed';
    this.sliceCount = sliceCount;
    this.slices = slices;
    this.processedDate = new Date();
    return this.save();
};

studySchema.methods.markAsFailed = function(errorMessage) {
    this.status = 'failed';
    this.errorMessage = errorMessage;
    this.processedDate = new Date();
    return this.save();
};

// Static methods
studySchema.statics.findByStatus = function(status) {
    return this.find({ status: status }).sort({ uploadDate: -1 });
};

studySchema.statics.findRecent = function(limit = 10) {
    return this.find().sort({ uploadDate: -1 }).limit(limit);
};

studySchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};

// Virtual for formatted file size
studySchema.virtual('formattedFileSize').get(function() {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Ensure virtual fields are serialized
studySchema.set('toJSON', { virtuals: true });
studySchema.set('toObject', { virtuals: true });

// Pre-save middleware
studySchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed') {
        this.processedDate = new Date();
    }
    next();
});

// Create and export the model
const Study = mongoose.model('Study', studySchema);

module.exports = Study;