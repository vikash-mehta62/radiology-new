const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  report_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Study reference
  study_uid: {
    type: String,
    required: true,
    ref: 'Study',
    index: true
  },
  
  // Patient reference
  patient_id: {
    type: String,
    required: true,
    ref: 'Patient',
    index: true
  },
  
  // Report status
  status: {
    type: String,
    enum: ['draft', 'final', 'billed'],
    default: 'draft',
    index: true
  },
  
  // Report content
  findings: {
    type: String,
    default: ''
  },
  impressions: {
    type: String,
    default: ''
  },
  recommendations: {
    type: String,
    default: ''
  },
  
  // AI generation info
  ai_generated: {
    type: Boolean,
    default: false
  },
  ai_confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Exam type
  exam_type: String,
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  finalized_at: Date,
  
  // System fields
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Update the updated_at field before saving
reportSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes for efficient queries
reportSchema.index({ study_uid: 1, status: 1 });
reportSchema.index({ patient_id: 1, created_at: -1 });
reportSchema.index({ ai_generated: 1 });
reportSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('Report', reportSchema);