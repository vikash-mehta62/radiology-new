/**
 * Global Test Teardown
 * Runs once after all tests
 */

export default async function globalTeardown() {
  console.log('🏁 DICOM Viewer Test Suite Complete');
  
  // Log final memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    console.log('📊 Final Memory Usage:');
    console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`  External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('🧹 Final garbage collection performed');
  }
  
  return Promise.resolve();
}