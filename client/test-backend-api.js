#!/usr/bin/env node

/**
 * Terminal Backend API Test Script
 * Run: node test-backend-api.js
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:8000';
const TEST_PATIENT_ID = 'PAT_PALAK_57F5AE30';
const TEST_FILENAME = '0002.DCM';

async function testBackendApis() {
  console.log('🚀 Testing Backend DICOM APIs...');
  console.log('=' .repeat(60));
  
  // Test 1: Check if backend is running
  console.log('🔍 Step 1: Checking if backend is running...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (healthResponse.ok) {
      console.log('✅ Backend is running');
    } else {
      console.log('⚠️ Backend health check failed');
    }
  } catch (error) {
    console.log('❌ Backend is not running or not accessible');
    console.log('💡 Make sure to start the backend server first');
    return;
  }
  
  console.log('\n' + '=' .repeat(60));
  
  // Test 2: Slice Detection
  console.log('🔍 Step 2: Testing Slice Detection...');
  const detectionUrl = `${BASE_URL}/dicom/process/${TEST_PATIENT_ID}/${TEST_FILENAME}?output_format=PNG&auto_detect=true&t=${Date.now()}`;
  console.log('📡 URL:', detectionUrl);
  
  try {
    const detectionResponse = await fetch(detectionUrl);
    console.log('📊 Status:', detectionResponse.status, detectionResponse.statusText);
    
    if (detectionResponse.ok) {
      const detectionResult = await detectionResponse.json();
      console.log('✅ Slice Detection Success:');
      console.log('   - Total Slices:', detectionResult.total_slices || 'Unknown');
      console.log('   - Detection Method:', detectionResult.detection_method || 'Unknown');
      console.log('   - Full Result:', JSON.stringify(detectionResult, null, 2));
    } else {
      const errorText = await detectionResponse.text();
      console.log('❌ Slice Detection Failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Slice Detection Error:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  
  // Test 3: Frame Conversion (test multiple frames)
  console.log('🔍 Step 3: Testing Frame Conversion...');
  const framesToTest = [0, 1, 2, 10];
  
  for (const frameIndex of framesToTest) {
    console.log(`\n🎯 Testing Frame ${frameIndex}:`);
    const convertUrl = `${BASE_URL}/dicom/convert/${TEST_PATIENT_ID}/${TEST_FILENAME}?slice=${frameIndex}&t=${Date.now()}`;
    console.log('📡 URL:', convertUrl);
    
    try {
      const convertResponse = await fetch(convertUrl);
      console.log('📊 Status:', convertResponse.status, convertResponse.statusText);
      
      if (convertResponse.ok) {
        const convertResult = await convertResponse.json();
        console.log('📄 Result:', {
          success: convertResult.success,
          hasImageUrl: !!convertResult.png_url,
          imageUrl: convertResult.png_url,
          error: convertResult.error
        });
        
        // Test image access if URL is provided
        if (convertResult.success && convertResult.png_url) {
          const imageUrl = `${BASE_URL}${convertResult.png_url}`;
          console.log('🖼️ Testing image access:', imageUrl);
          
          try {
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              const buffer = await imageResponse.buffer();
              console.log('✅ Image accessible:', buffer.length, 'bytes');
            } else {
              console.log('❌ Image not accessible:', imageResponse.status);
            }
          } catch (imageError) {
            console.log('❌ Image access error:', imageError.message);
          }
        }
      } else {
        const errorText = await convertResponse.text();
        console.log('❌ Frame Conversion Failed:', errorText);
      }
    } catch (error) {
      console.log('❌ Frame Conversion Error:', error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Backend API Test Complete');
  console.log('\n💡 Next Steps:');
  console.log('1. If backend is not running: Start the backend server');
  console.log('2. If slice detection fails: Check DICOM file exists');
  console.log('3. If frame conversion fails: Check DICOM processing logic');
  console.log('4. If image access fails: Check file permissions and paths');
}

// Run the test
testBackendApis().catch(console.error);