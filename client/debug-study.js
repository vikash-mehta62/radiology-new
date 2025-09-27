const axios = require('axios');

async function debugStudyLoading() {
  console.log('=== Debug Study Loading for PAT_PALAK_57F5AE30 ===');
  
  try {
    // Test API endpoint
    console.log('1. Testing API endpoint...');
    const response = await axios.get('http://localhost:8000/api/studies/PAT_PALAK_57F5AE30');
    console.log('API Response:', response.data);
  } catch (error) {
    console.log('API Error:', error.response?.status, error.response?.data?.message || error.message);
    
    // Since API fails, check what the frontend would do
    console.log('\n2. API failed, checking mock data fallback...');
    
    // Simulate the mock data from studyService.ts
    const mockStudies = [
      {
        id: 'ECHO001',
        study_uid: '1.2.826.0.1.3680043.8.498.11111111111111111111111111111111',
        patient_id: 'ECHO001',
        patient_name: 'Echo Patient',
        modality: 'US',
        study_date: '2024-01-15',
        study_description: 'Echocardiogram',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.11111111111111111111111111111111&seriesUID=1.2.826.0.1.3680043.8.498.22222222222222222222222222222222&objectUID=1.2.826.0.1.3680043.8.498.33333333333333333333333333333333'
        ]
      },
      {
        id: 'CAROTID001',
        study_uid: '1.2.826.0.1.3680043.8.498.44444444444444444444444444444444',
        patient_id: 'CAROTID001',
        patient_name: 'Carotid Patient',
        modality: 'US',
        study_date: '2024-01-16',
        study_description: 'Carotid Ultrasound',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.44444444444444444444444444444444&seriesUID=1.2.826.0.1.3680043.8.498.55555555555555555555555555555555&objectUID=1.2.826.0.1.3680043.8.498.66666666666666666666666666666666'
        ]
      }
    ];
    
    const foundStudy = mockStudies.find(s => s.study_uid === 'PAT_PALAK_57F5AE30');
    console.log('Found in mock data:', foundStudy ? 'YES' : 'NO');
    
    if (!foundStudy) {
      console.log('\n3. PAT_PALAK_57F5AE30 not found in mock data either!');
      console.log('This means the frontend should throw an error: "Study not found"');
      console.log('\nBut if the viewer is still loading, the study data must be coming from somewhere else...');
      
      // Check if there's a different study being loaded
      console.log('\n4. Checking if a different study is being loaded by mistake...');
      console.log('Available mock studies:');
      mockStudies.forEach(study => {
        console.log('- Study ID:', study.id, 'Patient ID:', study.patient_id, 'Study UID:', study.study_uid);
      });
    }
  }
}

debugStudyLoading().catch(console.error);