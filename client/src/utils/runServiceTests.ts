/**
 * Service Integration Test Runner
 * Executes comprehensive tests for all service integrations
 */

import { ServiceIntegrationTester } from './serviceIntegrationTester';

/**
 * Main test runner function
 */
async function runServiceIntegrationTests(): Promise<void> {
  console.log('🚀 Starting Service Integration Tests...\n');
  console.log('=' .repeat(60));
  
  const tester = new ServiceIntegrationTester();
  
  try {
    // Run all service integration tests
    await tester.runAllTests();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Service Integration Tests Completed');
    
    // Get test summary
    const summary = tester.getSummary();
    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Services Tested: ${summary.totalServices}`);
    console.log(`   Successful Services: ${summary.successfulServices}`);
    console.log(`   Failed Services: ${summary.failedServices}`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Passed Tests: ${summary.passedTests}`);
    console.log(`   Failed Tests: ${summary.failedTests}`);
    console.log(`   Overall Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`   Total Duration: ${summary.totalDuration}ms`);
    
    if (summary.failedServices > 0) {
      console.log('\n⚠️  Some services failed integration tests. Please review the detailed output above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All service integrations are working correctly!');
    }
    
  } catch (error) {
    console.error('\n❌ Service Integration Tests Failed:', error);
    process.exit(1);
  }
}

/**
 * Run quick connectivity tests only
 */
async function runQuickConnectivityTests(): Promise<void> {
  console.log('⚡ Running Quick Connectivity Tests...\n');
  
  const tester = new ServiceIntegrationTester();
  
  try {
    await tester.runQuickConnectivityTests();
    console.log('\n✅ Quick Connectivity Tests Completed');
  } catch (error) {
    console.error('\n❌ Quick Connectivity Tests Failed:', error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const isQuickTest = args.includes('--quick') || args.includes('-q');

// Run appropriate test suite
if (isQuickTest) {
  runQuickConnectivityTests();
} else {
  runServiceIntegrationTests();
}

export { runServiceIntegrationTests, runQuickConnectivityTests };