#!/usr/bin/env node

/**
 * Advanced Test Runner for DICOM Viewer
 * Provides comprehensive testing with performance monitoring and reporting
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test types
  unit: {
    pattern: '**/*.test.(ts|tsx)',
    timeout: 30000,
    coverage: true
  },
  integration: {
    pattern: '**/*.integration.test.(ts|tsx)',
    timeout: 60000,
    coverage: true
  },
  performance: {
    pattern: '**/*benchmark*.test.(ts|tsx)',
    timeout: 120000,
    coverage: false
  },
  e2e: {
    pattern: '**/*.e2e.test.(ts|tsx)',
    timeout: 300000,
    coverage: false
  }
};

// Command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'unit';
const watchMode = args.includes('--watch');
const coverageMode = args.includes('--coverage');
const verboseMode = args.includes('--verbose');
const ciMode = args.includes('--ci');

/**
 * Run tests with specified configuration
 */
async function runTests(type, options = {}) {
  const config = TEST_CONFIG[type];
  if (!config) {
    console.error(`❌ Unknown test type: ${type}`);
    console.log('Available types:', Object.keys(TEST_CONFIG).join(', '));
    process.exit(1);
  }

  console.log(`🚀 Running ${type} tests...`);
  
  // Build Jest command
  const jestArgs = [
    '--config', 'jest.config.js',
    '--testPathPattern', config.pattern,
    '--testTimeout', config.timeout.toString()
  ];

  // Add coverage if enabled
  if ((config.coverage && !options.noCoverage) || coverageMode) {
    jestArgs.push('--coverage');
  }

  // Add watch mode
  if (watchMode && !ciMode) {
    jestArgs.push('--watch');
  }

  // Add verbose mode
  if (verboseMode) {
    jestArgs.push('--verbose');
  }

  // CI specific options
  if (ciMode) {
    jestArgs.push(
      '--ci',
      '--watchAll=false',
      '--passWithNoTests',
      '--silent'
    );
  }

  // Performance specific options
  if (type === 'performance') {
    jestArgs.push(
      '--runInBand', // Run tests serially for accurate performance measurement
      '--forceExit'
    );
    
    // Enable garbage collection for memory leak detection
    process.env.NODE_OPTIONS = '--expose-gc';
  }

  // Run Jest
  return new Promise((resolve, reject) => {
    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '1'
      }
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${type} tests completed successfully`);
        resolve(code);
      } else {
        console.log(`❌ ${type} tests failed with code ${code}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });

    jest.on('error', (error) => {
      console.error(`❌ Failed to start ${type} tests:`, error);
      reject(error);
    });
  });
}

/**
 * Run all test types in sequence
 */
async function runAllTests() {
  console.log('🎯 Running comprehensive test suite...\n');
  
  const results = {};
  
  for (const [type, config] of Object.entries(TEST_CONFIG)) {
    try {
      console.log(`\n📋 Starting ${type} tests...`);
      const startTime = Date.now();
      
      await runTests(type, { noCoverage: type === 'performance' });
      
      const duration = Date.now() - startTime;
      results[type] = { success: true, duration };
      
      console.log(`✅ ${type} tests completed in ${duration}ms\n`);
    } catch (error) {
      results[type] = { success: false, error: error.message };
      console.log(`❌ ${type} tests failed: ${error.message}\n`);
      
      if (ciMode) {
        // In CI mode, fail fast
        process.exit(1);
      }
    }
  }
  
  // Print summary
  console.log('\n📊 Test Suite Summary:');
  console.log('========================');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [type, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${status} ${type}${duration}`);
    
    if (result.success) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }
  
  console.log('========================');
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
  
  if (totalFailed > 0) {
    process.exit(1);
  }
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('📄 Generating test report...');
  
  const reportDir = path.join(__dirname, '../test-results');
  const coverageDir = path.join(__dirname, '../coverage');
  
  // Check if reports exist
  const hasJunitReport = fs.existsSync(path.join(reportDir, 'junit.xml'));
  const hasHtmlReport = fs.existsSync(path.join(reportDir, 'test-report.html'));
  const hasCoverageReport = fs.existsSync(path.join(coverageDir, 'index.html'));
  
  console.log('\n📋 Available Reports:');
  
  if (hasJunitReport) {
    console.log(`✅ JUnit XML: ${path.join(reportDir, 'junit.xml')}`);
  }
  
  if (hasHtmlReport) {
    console.log(`✅ HTML Report: ${path.join(reportDir, 'test-report.html')}`);
  }
  
  if (hasCoverageReport) {
    console.log(`✅ Coverage Report: ${path.join(coverageDir, 'index.html')}`);
  }
  
  if (!hasJunitReport && !hasHtmlReport && !hasCoverageReport) {
    console.log('⚠️  No reports found. Run tests with --coverage to generate reports.');
  }
}

/**
 * Clean test artifacts
 */
function cleanTestArtifacts() {
  console.log('🧹 Cleaning test artifacts...');
  
  const dirsToClean = [
    path.join(__dirname, '../test-results'),
    path.join(__dirname, '../coverage'),
    path.join(__dirname, '../.nyc_output')
  ];
  
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Cleaned ${dir}`);
    }
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Handle special commands
    if (args.includes('--help')) {
      console.log(`
DICOM Viewer Test Runner

Usage: node test-runner.js [type] [options]

Test Types:
  unit         Run unit tests (default)
  integration  Run integration tests
  performance  Run performance benchmarks
  e2e          Run end-to-end tests
  all          Run all test types

Options:
  --watch      Run in watch mode
  --coverage   Generate coverage report
  --verbose    Verbose output
  --ci         CI mode (no watch, exit on failure)
  --clean      Clean test artifacts
  --report     Show available reports
  --help       Show this help

Examples:
  node test-runner.js unit --watch
  node test-runner.js performance --verbose
  node test-runner.js all --coverage --ci
      `);
      return;
    }
    
    if (args.includes('--clean')) {
      cleanTestArtifacts();
      return;
    }
    
    if (args.includes('--report')) {
      generateTestReport();
      return;
    }
    
    // Run tests
    if (testType === 'all') {
      await runAllTests();
    } else {
      await runTests(testType);
    }
    
    // Generate report if coverage was enabled
    if (coverageMode || ciMode) {
      generateTestReport();
    }
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Test runner interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test runner terminated');
  process.exit(143);
});

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});