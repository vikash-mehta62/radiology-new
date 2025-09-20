/**
 * Jest Configuration for DICOM Viewer Testing
 * Comprehensive testing setup with performance monitoring
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],
  
  // Module name mapping for imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // File extensions to consider
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-css',
    '^.+\\.(png|jpg|jpeg|gif|svg)$': 'jest-transform-file'
  },
  
  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(cornerstone-core|cornerstone-wado-image-loader|dicom-parser)/)'
  ],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],
  
  // Coverage configuration
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
    '!src/**/testUtils.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Specific thresholds for critical components
    './src/services/unifiedStateManager.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/enhancedViewerManager.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/services/stateSynchronizationService.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/setupTests.global.ts',
  globalTeardown: '<rootDir>/src/teardownTests.global.ts',
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Mock modules
  moduleNameMapping: {
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    
    // Mock DICOM libraries
    '^cornerstone-core$': '<rootDir>/src/__mocks__/cornerstone-core.js',
    '^cornerstone-wado-image-loader$': '<rootDir>/src/__mocks__/cornerstone-wado-image-loader.js',
    '^dicom-parser$': '<rootDir>/src/__mocks__/dicom-parser.js'
  },
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        suiteName: 'DICOM Viewer Tests'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'DICOM Viewer Test Report'
      }
    ]
  ],
  
  // Performance monitoring
  maxWorkers: '50%',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Custom test environments for specific tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.(ts|tsx)'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.integration.test.(ts|tsx)'],
      testEnvironment: 'jsdom',
      testTimeout: 60000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/src/**/*benchmark*.test.(ts|tsx)'],
      testEnvironment: 'jsdom',
      testTimeout: 120000,
      setupFilesAfterEnv: ['<rootDir>/src/setupPerformanceTests.ts']
    }
  ]
};