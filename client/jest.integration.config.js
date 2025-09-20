/**
 * Jest Configuration for Integration Tests
 * Specialized configuration for integration and end-to-end testing
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment optimized for integration tests
  testEnvironment: 'jsdom',
  
  // Longer timeout for integration tests
  testTimeout: 60000,
  
  // Setup files specific to integration tests
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/src/setupIntegrationTests.ts'
  ],
  
  // Test match patterns for integration tests
  testMatch: [
    '<rootDir>/src/**/*.integration.test.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/__tests__/**/*.integration.(ts|tsx|js|jsx)'
  ],
  
  // Coverage configuration for integration tests
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/setupProxy.js',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/testUtils.ts',
    '!src/**/__mocks__/**'
  ],
  
  // Lower coverage thresholds for integration tests (focus on workflow coverage)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json-summary'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage-integration',
  
  // Module name mapping for integration tests
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(cornerstone-core|cornerstone-wado-image-loader|dicom-parser|@testing-library)/)'
  ],
  
  // Global setup for integration tests
  globalSetup: '<rootDir>/src/setupIntegrationTests.global.ts',
  globalTeardown: '<rootDir>/src/teardownIntegrationTests.global.ts',
  
  // Reporters for integration tests
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results-integration',
        outputName: 'integration-junit.xml',
        suiteName: 'DICOM Viewer Integration Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results-integration',
        filename: 'integration-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'DICOM Viewer Integration Test Report',
        logoImgPath: undefined,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],
  
  // Verbose output for integration tests
  verbose: true,
  
  // Run tests serially for integration tests to avoid conflicts
  maxWorkers: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: false, // More lenient for integration tests
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],
  
  // Extensions to resolve
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],
  
  // Snapshot serializers
  snapshotSerializers: [
    '@emotion/jest/serializer'
  ],
  
  // Test result processor
  testResultsProcessor: '<rootDir>/src/testResultsProcessor.js'
};