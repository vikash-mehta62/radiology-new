/**
 * Update Existing Studies Script
 * Adds image_urls field to existing studies in the database
 */

const mongoose = require('mongoose');
const Study = require('../models/Study');

async function updateExistingStudies() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kiro_radiology', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all studies without image_urls
    console.log('🔍 Finding studies without image_urls...');
    const studies = await Study.find({
      $or: [
        { image_urls: { $exists: false } },
        { image_urls: { $size: 0 } },
        { image_urls_count: { $exists: false } }
      ]
    });

    console.log(`📋 Found ${studies.length} studies to update`);

    if (studies.length === 0) {
      console.log('✅ All studies already have image_urls');
      return;
    }

    // Update each study
    for (const study of studies) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
      const imageUrls = [`${baseUrl}/uploads/${study.patient_id}/${study.original_filename}`];
      
      await Study.findByIdAndUpdate(study._id, {
        image_urls: imageUrls,
        image_urls_count: imageUrls.length
      });

      console.log(`✅ Updated study: ${study.study_uid} (${study.patient_id})`);
    }

    console.log('🎉 All studies updated successfully!');
    
    // Verify the updates
    console.log('🔍 Verifying updates...');
    const updatedStudies = await Study.find({});
    updatedStudies.forEach(study => {
      console.log(`  - ${study.patient_id}: ${study.image_urls?.length || 0} image URLs`);
    });

  } catch (error) {
    console.error('❌ Error updating studies:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateExistingStudies()
    .then(() => {
      console.log('✅ Update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateExistingStudies };