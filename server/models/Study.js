const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  study_uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Patient reference
  patient_id: {
    type: String,
    required: true,
    ref: 'Patient',
    index: true
  },
  
  // Study Information
  study_description: String,
  study_date: Date,
  study_time: String,
  modality: String,
  institution_name: String,
  referring_physician: String,
  
  // File Information
  original_filename: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  file_size: Number,
  file_hash: String,
  
  // DICOM Metadata
  dicom_metadata: {
    patient_name: String,
    patient_birth_date: String,
    patient_sex: String,
    study_instance_uid: String,
    series_instance_uid: String,
    sop_instance_uid: String,
    image_type: String,
    photometric_interpretation: String,
    rows: Number,
    columns: Number,
    bits_allocated: Number,
    bits_stored: Number,
    high_bit: Number,
    pixel_representation: Number,
    window_center: String,
    window_width: String,
    rescale_intercept: String,
    rescale_slope: String,
    manufacturer: String,
    manufacturer_model_name: String,
    software_versions: String,
    acquisition_date: String,
    acquisition_time: String,
    content_date: String,
    content_time: String
  },
  
  // Processing Information
  processing_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processing_result: mongoose.Schema.Types.Mixed,
  processing_error: String,
  
  // Upload Information
  upload_time: {
    type: Date,
    default: Date.now
  },
  file_url: String,
  
  // System fields
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
studySchema.index({ patient_id: 1, study_date: -1 });
studySchema.index({ study_description: 'text' });
studySchema.index({ modality: 1 });
studySchema.index({ upload_time: -1 });

module.exports = mongoose.model('Study', studySchema);