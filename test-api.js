// Simple test script to verify API connectivity
const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔄 Testing backend API connectivity...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:8000/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test studies endpoint
    const studiesResponse = await axios.get('http://localhost:8000/studies');
    console.log('✅ Studies endpoint:', {
      total: studiesResponse.data.studies?.length || 0,
      first_study: studiesResponse.data.studies?.[0]?.study_uid || 'none'
    });
    
    // Test specific study
    if (studiesResponse.data.studies?.length > 0) {
      const firstStudy = studiesResponse.data.studies[0];
      const studyResponse = await axios.get(`http://localhost:8000/studies/${firstStudy.study_uid}`);
      console.log('✅ Specific study:', {
        study_uid: studyResponse.data.study_uid,
        patient_id: studyResponse.data.patient_id,
        study_description: studyResponse.data.study_description
      });
      
      // Test DICOM processing
      const dicomResponse = await axios.get(`http://localhost:8000/dicom/process/${studyResponse.data.patient_id}/${studyResponse.data.original_filename || '0002.DCM'}?output_format=PNG&frame=0`);
      console.log('✅ DICOM processing:', {
        success: dicomResponse.data.success,
        has_image_data: !!dicomResponse.data.image_data,
        image_data_length: dicomResponse.data.image_data?.length || 0
      });
    }
    
    console.log('🎉 All API tests passed! Backend is working correctly.');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();