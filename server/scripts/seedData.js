/**
 * Data Seeding Script for DICOM Studies
 * Creates realistic study data that matches the actual DICOM files in uploads/
 */

const mongoose = require('mongoose');
const Study = require('../models/Study');
const path = require('path');
const fs = require('fs');

// Sample study data that matches our actual DICOM files
const studyData = [
  {
    study_uid: "1.2.826.0.1.3680043.8.498.12345678901234567890123456789012",
    patient_id: "PAT001",
    patient_name: "John Doe",
    patient_info: {
      name: "John Doe",
      date_of_birth: "1980-05-15",
      gender: "M",
      age: 43
    },
    study_date: "2024-01-15",
    study_time: "14:30:00",
    modality: "CT",
    study_description: "CT Chest with Contrast",
    series_description: "Axial CT Chest",
    exam_type: "CT Chest",
    status: "completed",
    original_filename: "0002.DCM",
    filename: "0002.DCM",
    dicom_url: `/uploads/PAT001/0002.DCM`,
    image_urls: [
      `http://localhost:8000/uploads/PAT001/0002.DCM`
    ],
    has_pixel_data: true,
    total_slices: 1,
    is_multi_slice: false,
    processing_status: "completed",
    dicom_metadata: {
      PatientName: "John Doe",
      PatientID: "PAT001",
      PatientBirthDate: "19800515",
      PatientSex: "M",
      StudyDate: "20240115",
      StudyTime: "143000",
      Modality: "CT",
      StudyDescription: "CT Chest with Contrast",
      SeriesDescription: "Axial CT Chest",
      Rows: 512,
      Columns: 512,
      BitsAllocated: 16,
      BitsStored: 12,
      HighBit: 11,
      PixelRepresentation: 0,
      WindowCenter: 40,
      WindowWidth: 400,
      RescaleIntercept: -1024,
      RescaleSlope: 1,
      SliceThickness: "5.0",
      PixelSpacing: ["0.976562", "0.976562"],
      ImageOrientationPatient: ["1", "0", "0", "0", "1", "0"],
      ImagePositionPatient: ["-250", "-250", "0"],
      FrameOfReferenceUID: "1.2.826.0.1.3680043.8.498.12345678901234567890123456789013"
    },
    reports: [],
    created_at: new Date("2024-01-15T14:30:00Z"),
    updated_at: new Date("2024-01-15T14:35:00Z")
  },
  {
    study_uid: "1.2.826.0.1.3680043.8.498.22345678901234567890123456789012",
    patient_id: "PAT_PALAK_57F5AE30",
    patient_name: "Palak Sharma",
    patient_info: {
      name: "Palak Sharma",
      date_of_birth: "1990-08-22",
      gender: "F",
      age: 33
    },
    study_date: "2024-01-20",
    study_time: "10:15:00",
    modality: "MR",
    study_description: "MRI Brain without Contrast",
    series_description: "T1 Axial Brain",
    exam_type: "MRI Brain",
    status: "completed",
    original_filename: "0002.DCM",
    filename: "0002.DCM",
    dicom_url: `/uploads/PAT_PALAK_57F5AE30/0002.DCM`,
    image_urls: [
      `http://localhost:8000/uploads/PAT_PALAK_57F5AE30/0002.DCM`,
      `http://localhost:8000/uploads/PAT_PALAK_57F5AE30/1234.DCM`
    ],
    has_pixel_data: true,
    total_slices: 2,
    is_multi_slice: true,
    processing_status: "completed",
    dicom_metadata: {
      PatientName: "Palak Sharma",
      PatientID: "PAT_PALAK_57F5AE30",
      PatientBirthDate: "19900822",
      PatientSex: "F",
      StudyDate: "20240120",
      StudyTime: "101500",
      Modality: "MR",
      StudyDescription: "MRI Brain without Contrast",
      SeriesDescription: "T1 Axial Brain",
      Rows: 256,
      Columns: 256,
      BitsAllocated: 16,
      BitsStored: 12,
      HighBit: 11,
      PixelRepresentation: 0,
      WindowCenter: 128,
      WindowWidth: 256,
      SliceThickness: "3.0",
      PixelSpacing: ["0.859375", "0.859375"],
      ImageOrientationPatient: ["1", "0", "0", "0", "1", "0"],
      ImagePositionPatient: ["-110", "-110", "0"],
      FrameOfReferenceUID: "1.2.826.0.1.3680043.8.498.22345678901234567890123456789013"
    },
    reports: [],
    created_at: new Date("2024-01-20T10:15:00Z"),
    updated_at: new Date("2024-01-20T10:20:00Z")
  },
  {
    study_uid: "1.2.826.0.1.3680043.8.498.32345678901234567890123456789012",
    patient_id: "PAT_VIKASH_7F64CCAA",
    patient_name: "Vikash Kumar",
    patient_info: {
      name: "Vikash Kumar",
      date_of_birth: "1975-12-10",
      gender: "M",
      age: 48
    },
    study_date: "2024-01-25",
    study_time: "16:45:00",
    modality: "CT",
    study_description: "CT Abdomen and Pelvis with Contrast",
    series_description: "Axial CT Abdomen",
    exam_type: "CT Abdomen",
    status: "completed",
    original_filename: "0002.DCM",
    filename: "0002.DCM",
    dicom_url: `/uploads/PAT_VIKASH_7F64CCAA/0002.DCM`,
    image_urls: [
      `http://localhost:8000/uploads/PAT_VIKASH_7F64CCAA/0002.DCM`
    ],
    has_pixel_data: true,
    total_slices: 1,
    is_multi_slice: false,
    processing_status: "completed",
    dicom_metadata: {
      PatientName: "Vikash Kumar",
      PatientID: "PAT_VIKASH_7F64CCAA",
      PatientBirthDate: "19751210",
      PatientSex: "M",
      StudyDate: "20240125",
      StudyTime: "164500",
      Modality: "CT",
      StudyDescription: "CT Abdomen and Pelvis with Contrast",
      SeriesDescription: "Axial CT Abdomen",
      Rows: 512,
      Columns: 512,
      BitsAllocated: 16,
      BitsStored: 12,
      HighBit: 11,
      PixelRepresentation: 0,
      WindowCenter: 50,
      WindowWidth: 350,
      RescaleIntercept: -1024,
      RescaleSlope: 1,
      SliceThickness: "5.0",
      PixelSpacing: ["0.976562", "0.976562"],
      ImageOrientationPatient: ["1", "0", "0", "0", "1", "0"],
      ImagePositionPatient: ["-250", "-250", "0"],
      FrameOfReferenceUID: "1.2.826.0.1.3680043.8.498.32345678901234567890123456789013"
    },
    reports: [],
    created_at: new Date("2024-01-25T16:45:00Z"),
    updated_at: new Date("2024-01-25T16:50:00Z")
  }
];

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kiro_radiology', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing studies
    console.log('🗑️ Clearing existing studies...');
    await Study.deleteMany({});
    console.log('✅ Cleared existing studies');

    // Insert new study data
    console.log('📊 Inserting study data...');
    const insertedStudies = await Study.insertMany(studyData);
    console.log(`✅ Inserted ${insertedStudies.length} studies`);

    // Verify the data
    console.log('🔍 Verifying inserted data...');
    const allStudies = await Study.find({});
    console.log(`📋 Total studies in database: ${allStudies.length}`);
    
    allStudies.forEach(study => {
      console.log(`  - ${study.patient_name} (${study.patient_id}): ${study.study_description}`);
      console.log(`    Study UID: ${study.study_uid}`);
      console.log(`    DICOM URL: ${study.dicom_url}`);
      console.log(`    Image URLs: ${study.image_urls?.length || 0} images`);
      console.log('');
    });

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase, studyData };