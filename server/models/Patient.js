const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patient_id: {
    type: String,
    required: true,
    unique: true,
    maxlength: 64,
    index: true
  },
  
  // Personal Information
  first_name: {
    type: String,
    required: true,
    maxlength: 100
  },
  last_name: {
    type: String,
    required: false,
    maxlength: 100
  },
  middle_name: {
    type: String,
    maxlength: 100
  },
  date_of_birth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['M', 'F', 'O']
  },
  
  // Contact Information
  phone: {
    type: String,
    maxlength: 20
  },
  email: {
    type: String,
    maxlength: 255,
    validate: {
      validator: function(v) {
        return !v || v.includes('@');
      },
      message: 'Invalid email format'
    }
  },
  address: String,
  city: {
    type: String,
    maxlength: 100
  },
  state: {
    type: String,
    maxlength: 50
  },
  zip_code: {
    type: String,
    maxlength: 20
  },
  country: {
    type: String,
    maxlength: 100
  },
  
  // Medical Information
  medical_record_number: {
    type: String,
    maxlength: 50
  },
  insurance_info: mongoose.Schema.Types.Mixed,
  emergency_contact: mongoose.Schema.Types.Mixed,
  allergies: String,
  medical_history: String,
  
  // System fields
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // This creates createdAt and updatedAt automatically
});

// Index for search functionality
patientSchema.index({
  first_name: 'text',
  last_name: 'text',
  patient_id: 'text',
  medical_record_number: 'text'
});

module.exports = mongoose.model('Patient', patientSchema);