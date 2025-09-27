const { MongoClient } = require('mongodb');

async function fixStudyData() {
  const client = new MongoClient('mongodb+srv://mahitechnocrats:qNfbRMgnCthyu59@cluster1.xqa5iyj.mongodb.net/radiology_db');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('radiology_db');
    const collection = db.collection('studies');
    
    const studyUid = '63f79b62-ee15-45ef-bdde-507bd8f946fb';
    
    // First, let's see the current data
    console.log('Current study data:');
    const currentStudy = await collection.findOne({ study_uid: studyUid });
    console.log(JSON.stringify(currentStudy, null, 2));
    
    // Update the study data
    const updateResult = await collection.updateOne(
      { study_uid: studyUid },
      {
        $set: {
          original_filename: '0002.DCM',
          file_path: 'uploads/PAT_PALAK_57F5AE30/0002.DCM',
          file_url: 'http://localhost:8000/uploads/PAT_PALAK_57F5AE30/0002.DCM',
          image_urls: ['http://localhost:8000/uploads/PAT_PALAK_57F5AE30/0002.DCM'],
          study_description: '0002.DCM'
        }
      }
    );
    
    console.log('Update result:', updateResult);
    
    // Verify the update
    console.log('\nUpdated study data:');
    const updatedStudy = await collection.findOne({ study_uid: studyUid });
    console.log(JSON.stringify(updatedStudy, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

fixStudyData();