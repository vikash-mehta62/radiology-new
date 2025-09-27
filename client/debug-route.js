const axios = require('axios');

async function debugRouteAndStudy() {
  console.log('=== Debug Route and Study Loading ===');
  
  console.log('1. The issue found:');
  console.log('   - Route in App.tsx: /studies/:studyUid');
  console.log('   - URL being accessed: /study/PAT_PALAK_57F5AE30');
  console.log('   - This is a route mismatch!');
  
  console.log('\n2. Testing correct route with existing studies...');
  
  try {
    // First, let's get all studies to see what's available
    console.log('Getting all studies from backend...');
    const studiesResponse = await axios.get('http://localhost:8000/studies');
    console.log('Available studies:', studiesResponse.data.studies?.length || 0);
    
    if (studiesResponse.data.studies && studiesResponse.data.studies.length > 0) {
      const firstStudy = studiesResponse.data.studies[0];
      console.log('\nFirst available study:');
      console.log('- Study UID:', firstStudy.study_uid);
      console.log('- Patient ID:', firstStudy.patient_id);
      console.log('- Original filename:', firstStudy.original_filename);
      console.log('- File URL:', firstStudy.file_url);
      
      console.log('\n3. Testing API endpoint for this study...');
      try {
        const studyResponse = await axios.get(`http://localhost:8000/studies/${firstStudy.study_uid}`);
        console.log('✅ Study API works for:', firstStudy.study_uid);
        console.log('Study data:', {
          patient_id: studyResponse.data.patient_id,
          original_filename: studyResponse.data.original_filename,
          dicom_url: studyResponse.data.dicom_url,
          image_urls: studyResponse.data.image_urls
        });
        
        console.log('\n4. Correct frontend URL should be:');
        console.log(`   http://localhost:3000/studies/${firstStudy.study_uid}`);
        console.log('   (Note: "studies" not "study")');
        
      } catch (error) {
        console.log('❌ Study API failed:', error.response?.status, error.response?.data?.message);
      }
    } else {
      console.log('No studies found in database');
    }
    
  } catch (error) {
    console.log('❌ Failed to get studies:', error.response?.status, error.response?.data?.message || error.message);
  }
}

debugRouteAndStudy().catch(console.error);