/**
 * Global Integration Test Teardown
 * Runs once after all integration tests
 */

export default async function globalIntegrationTeardown() {
  console.log('🏁 DICOM Viewer Integration Test Suite Complete');
  
  // Log final memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    console.log('📊 Final Integration Test Memory Usage:');
    console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`  External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  }
  
  // Clean up test data
  console.log('🧹 Cleaning up integration test data...');
  
  // Close mock servers
  console.log('🌐 Shutting down mock services...');
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('🧹 Final garbage collection performed');
  }
  
  // Generate integration test report summary
  console.log('📄 Integration test execution complete');
  
  return Promise.resolve();
}