const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  study_uid: { type: String, required: true, unique: true },
  patient_id: { type: String, required: true },
  study_description: String,
  study_date: { type: Date, default: Date.now },
  modality: String,
  original_filename: String,
  file_path: String,
  file_size: Number,
  processing_status: { type: String, default: 'pending' },
  file_url: String,
  image_urls: [String],
  image_urls_count: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const Study = mongoose.model('Study', studySchema);

async function updateStudy() {
  try {
    await mongoose.connect('mongodb://localhost:27017/kiro_radiology', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    const result = await Study.updateOne(
      { study_uid: '63f79b62-ee15-45ef-bdde-507bd8f946fb' },
      {
        $set: {
          original_filename: '0002.DCM',
          file_path: 'D:\\radiology-new\\server\\uploads\\PAT_PALAK_57F5AE30\\0002.DCM',
          file_url: '/uploads/PAT_PALAK_57F5AE30/0002.DCM',
          image_urls: ['http://localhost:8000/uploads/PAT_PALAK_57F5AE30/0002.DCM'],
          study_description: 'DICOM Study - 0002.DCM',
          processing_status: 'completed'
        }
      }
    );
    
    console.log('Update result:', result);
    
    const updatedStudy = await Study.findOne({ study_uid: '63f79b62-ee15-45ef-bdde-507bd8f946fb' });
    console.log('Updated study image_urls:', updatedStudy.image_urls);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
    await mongoose.disconnect();
  }
}

updateStudy();