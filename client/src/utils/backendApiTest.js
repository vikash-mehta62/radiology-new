/**
 * Backend API Test Script
 * Test DICOM conversion endpoints
 */

// Test configuration
const BASE_URL = 'http://localhost:8000';
const TEST_PATIENT_ID = 'PAT_PALAK_57F5AE30';
const TEST_FILENAME = '0002.DCM';

// Test functions
async function testSliceDetection() {
  console.log('🧪 Testing Slice Detection API...');
  
  const detectionUrl = `${BASE_URL}/dicom/process/${TEST_PATIENT_ID}/${TEST_FILENAME}?output_format=PNG&auto_detect=true&t=${Date.now()}`;
  console.log('📡 Detection URL:', detectionUrl);
  
  try {
    const response = await fetch(detectionUrl);
    console.log('📊 Detection Response Status:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Detection Result:', result);
      return result;
    } else {
      const errorText = await response.text();
      console.error('❌ Detection Error:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Detection Network Error:', error);
    return null;
  }
}

async function testFrameConversion(frameIndex = 0) {
  console.log(`🧪 Testing Frame Conversion API for frame ${frameIndex}...`);
  
  const convertUrl = `${BASE_URL}/dicom/process/${TEST_PATIENT_ID}/${TEST_FILENAME}?output_format=PNG&frame=${frameIndex}&t=${Date.now()}`;
  console.log('📡 Convert URL:', convertUrl);
  
  try {
    const response = await fetch(convertUrl);
    console.log(`📊 Frame ${frameIndex} Response Status:`, response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Frame ${frameIndex} Result:`, {
        success: result.success,
        hasImageUrl: !!result.png_url,
        imageUrl: result.png_url,
        error: result.error,
        metadata: result.metadata
      });
      return result;
    } else {
      const errorText = await response.text();
      console.error(`❌ Frame ${frameIndex} Error:`, errorText);
      return null;
    }
  } catch (error) {
    console.error(`❌ Frame ${frameIndex} Network Error:`, error);
    return null;
  }
}

async function testImageAccess(imageUrl) {
  if (!imageUrl) return false;
  
  console.log('🧪 Testing Image Access...');
  const fullImageUrl = `${BASE_URL}${imageUrl}`;
  console.log('📡 Image URL:', fullImageUrl);
  
  try {
    const response = await fetch(fullImageUrl);
    console.log('📊 Image Response Status:', response.status, response.statusText);
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('✅ Image Access Success:', {
        size: blob.size,
        type: blob.type
      });
      return true;
    } else {
      console.error('❌ Image Access Failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Image Access Network Error:', error);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Starting Backend API Test...');
  console.log('=' .repeat(50));
  
  // Test 1: Slice Detection
  const detectionResult = await testSliceDetection();
  console.log('\n' + '=' .repeat(50));
  
  // Test 2: Frame Conversion (multiple frames)
  const framesToTest = [0, 1, 2, 50, 95]; // Test various frames
  const conversionResults = [];
  
  for (const frameIndex of framesToTest) {
    const result = await testFrameConversion(frameIndex);
    conversionResults.push({ frameIndex, result });
    console.log('\n' + '-' .repeat(30));
  }
  
  console.log('\n' + '=' .repeat(50));
  
  // Test 3: Image Access
  const successfulConversions = conversionResults.filter(r => r.result?.success && r.result?.png_url);
  if (successfulConversions.length > 0) {
    const testImageUrl = successfulConversions[0].result.png_url;
    await testImageAccess(testImageUrl);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📋 Test Summary:');
  console.log('- Slice Detection:', detectionResult ? '✅ Success' : '❌ Failed');
  console.log('- Frame Conversions:');
  conversionResults.forEach(({ frameIndex, result }) => {
    console.log(`  Frame ${frameIndex}:`, result?.success ? '✅ Success' : '❌ Failed');
  });
  
  return {
    detectionResult,
    conversionResults,
    successCount: conversionResults.filter(r => r.result?.success).length,
    totalTests: conversionResults.length
  };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.backendApiTest = {
    testSliceDetection,
    testFrameConversion,
    testImageAccess,
    runFullTest
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testSliceDetection,
    testFrameConversion,
    testImageAccess,
    runFullTest
  };
}

console.log('🧪 Backend API Test Script Loaded');
console.log('💡 Usage: Run window.backendApiTest.runFullTest() in browser console');