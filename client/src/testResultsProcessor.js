/**
 * Test Results Processor
 * Processes and enhances test results for integration tests
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  // Process test results
  const processedResults = {
    ...results,
    processedAt: new Date().toISOString(),
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      totalTime: results.testResults.reduce((sum, result) => sum + (result.perfStats?.end - result.perfStats?.start || 0), 0),
      coverage: results.coverageMap ? {
        statements: results.coverageMap.getCoverageSummary().statements.pct,
        branches: results.coverageMap.getCoverageSummary().branches.pct,
        functions: results.coverageMap.getCoverageSummary().functions.pct,
        lines: results.coverageMap.getCoverageSummary().lines.pct
      } : null
    },
    performance: {
      slowestTests: results.testResults
        .map(result => ({
          testPath: result.testFilePath,
          duration: result.perfStats?.end - result.perfStats?.start || 0
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      averageTestTime: results.testResults.length > 0 ? 
        results.testResults.reduce((sum, result) => sum + (result.perfStats?.end - result.perfStats?.start || 0), 0) / results.testResults.length : 0
    },
    errors: results.testResults
      .filter(result => result.numFailingTests > 0)
      .map(result => ({
        testPath: result.testFilePath,
        errors: result.testResults
          .filter(test => test.status === 'failed')
          .map(test => ({
            title: test.title,
            fullName: test.fullName,
            failureMessages: test.failureMessages,
            duration: test.duration
          }))
      }))
  };

  // Write enhanced results to file
  const outputDir = path.join(process.cwd(), 'test-results-integration');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'processed-results.json');
  fs.writeFileSync(outputFile, JSON.stringify(processedResults, null, 2));

  // Generate summary report
  const summaryReport = `
# Integration Test Summary Report

Generated: ${processedResults.processedAt}

## Test Results
- **Total Tests:** ${processedResults.summary.totalTests}
- **Passed:** ${processedResults.summary.passedTests}
- **Failed:** ${processedResults.summary.failedTests}
- **Pending:** ${processedResults.summary.pendingTests}
- **Success Rate:** ${((processedResults.summary.passedTests / processedResults.summary.totalTests) * 100).toFixed(2)}%

## Performance
- **Total Time:** ${(processedResults.summary.totalTime / 1000).toFixed(2)}s
- **Average Test Time:** ${processedResults.performance.averageTestTime.toFixed(2)}ms

${processedResults.summary.coverage ? `
## Coverage
- **Statements:** ${processedResults.summary.coverage.statements.toFixed(2)}%
- **Branches:** ${processedResults.summary.coverage.branches.toFixed(2)}%
- **Functions:** ${processedResults.summary.coverage.functions.toFixed(2)}%
- **Lines:** ${processedResults.summary.coverage.lines.toFixed(2)}%
` : ''}

## Slowest Tests
${processedResults.performance.slowestTests.map((test, index) => 
  `${index + 1}. ${path.basename(test.testPath)} - ${test.duration.toFixed(2)}ms`
).join('\n')}

${processedResults.errors.length > 0 ? `
## Failed Tests
${processedResults.errors.map(error => 
  `### ${path.basename(error.testPath)}\n${error.errors.map(test => 
    `- **${test.title}**: ${test.failureMessages[0]?.split('\n')[0] || 'Unknown error'}`
  ).join('\n')}`
).join('\n\n')}
` : '## ✅ All tests passed!'}
`;

  const summaryFile = path.join(outputDir, 'summary.md');
  fs.writeFileSync(summaryFile, summaryReport);

  console.log(`\n📊 Integration test results processed:`);
  console.log(`   Processed results: ${outputFile}`);
  console.log(`   Summary report: ${summaryFile}`);

  return results;
};