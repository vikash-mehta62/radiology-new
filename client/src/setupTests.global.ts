/**
 * Global Test Setup
 * Runs once before all tests
 */

export default async function globalSetup() {
  console.log('🚀 Starting DICOM Viewer Test Suite');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_API_URL = 'http://localhost:8000';
  
  // Enable garbage collection for memory leak detection
  if (global.gc) {
    console.log('✅ Garbage collection enabled for memory leak detection');
  } else {
    console.log('⚠️  Garbage collection not available. Run with --expose-gc for memory leak detection');
  }
  
  // Set up performance monitoring
  if (typeof performance !== 'undefined') {
    console.log('✅ Performance monitoring available');
  }
  
  // Log system information
  console.log('📊 Test Environment Info:');
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);
  
  return Promise.resolve();
}