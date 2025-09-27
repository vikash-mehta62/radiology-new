/**
 * Service Integration Tester
 * Comprehensive testing utility to verify all service integrations with environment configurations
 */

import { environmentService } from '../config/environment';
import { apiService } from '../services/api';
import { dicomService } from '../services/dicomService';
import { realTimeCollaborationService } from '../services/realTimeCollaborationService';
import { studyService } from '../services/studyService';
import { collaborationService } from '../services/collaborationService';

export interface TestResult {
  service: string;
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ServiceTestSuite {
  serviceName: string;
  tests: TestResult[];
  overallSuccess: boolean;
  duration: number;
}

export class ServiceIntegrationTester {
  private results: ServiceTestSuite[] = [];

  /**
   * Run all service integration tests
   */
  async runAllTests(): Promise<ServiceTestSuite[]> {
    console.log('🚀 Starting comprehensive service integration tests...');
    
    this.results = [];
    
    // Test services in dependency order
    await this.testEnvironmentService();
    await this.testApiService();
    await this.testDicomService();
    await this.testStudyService();
    await this.testCollaborationService();
    await this.testRealTimeCollaborationService();
    
    this.printSummary();
    return this.results;
  }

  /**
   * Test Environment Service Integration
   */
  async testEnvironmentService(): Promise<ServiceTestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const serviceName = 'Environment Service';

    console.log(`\n🌍 Testing ${serviceName}...`);

    // Test 1: Configuration Loading
    try {
      const config = environmentService.getConfig();
      const hasConfig = config && typeof config === 'object';
      const hasRequiredFields = config?.apiUrl && config?.dicomWebUrl && config?.env;
      
      tests.push({
        service: serviceName,
        test: 'Configuration Loading',
        success: !!(hasConfig && hasRequiredFields),
        message: hasConfig && hasRequiredFields ? 'Environment configuration loaded successfully' : 'Environment configuration missing or incomplete',
        details: { 
          env: config?.env,
          apiUrl: config?.apiUrl,
          dicomWebUrl: config?.dicomWebUrl,
          collaborationEnabled: config?.collaborationEnabled
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Configuration Loading',
        success: false,
        message: `Environment configuration loading failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Environment Detection
    try {
      const isDev = environmentService.isDevelopment();
      const isProd = environmentService.isProduction();
      const isTest = environmentService.isTest();
      const currentEnv = environmentService.get('env');
      
      const envDetectionValid = (isDev && currentEnv === 'development') || 
                               (isProd && currentEnv === 'production') || 
                               (isTest && currentEnv === 'test');
      
      tests.push({
        service: serviceName,
        test: 'Environment Detection',
        success: envDetectionValid,
        message: envDetectionValid ? `Environment correctly detected as ${currentEnv}` : 'Environment detection mismatch',
        details: { currentEnv, isDev, isProd, isTest },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Environment Detection',
        success: false,
        message: `Environment detection failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: URL Generation
    try {
      const apiUrl = environmentService.getApiUrl('/health');
      const dicomWadoUrl = environmentService.getDicomUrl('wado', '/studies');
      const dicomQidoUrl = environmentService.getDicomUrl('qido', '/studies');
      const collaborationUrl = environmentService.getCollaborationUrl('/sessions');
      
      const urlsGenerated = apiUrl && dicomWadoUrl && dicomQidoUrl && collaborationUrl;
      const urlsValid = this.isValidUrl(apiUrl) && this.isValidUrl(dicomWadoUrl) && 
                       this.isValidUrl(dicomQidoUrl) && this.isValidUrl(collaborationUrl);
      
      tests.push({
        service: serviceName,
        test: 'URL Generation',
        success: urlsGenerated && urlsValid,
        message: urlsGenerated && urlsValid ? 'Service URLs generated successfully' : 'URL generation failed or invalid URLs',
        details: { apiUrl, dicomWadoUrl, dicomQidoUrl, collaborationUrl },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'URL Generation',
        success: false,
        message: `URL generation failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 4: Configuration Validation
    try {
      const validation = environmentService.validateConfiguration();
      const isValid = validation.isValid;
      const warningCount = validation.warnings.length;
      
      tests.push({
        service: serviceName,
        test: 'Configuration Validation',
        success: isValid,
        message: isValid ? 'Configuration validation passed' : `Configuration validation failed with ${warningCount} warnings`,
        details: { isValid, warnings: validation.warnings },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Configuration Validation',
        success: false,
        message: `Configuration validation failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    const suite: ServiceTestSuite = {
      serviceName,
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };

    this.results.push(suite);
    this.printTestResults(suite);
    return suite;
  }

  /**
   * Test API Service Integration
   */
  async testApiService(): Promise<ServiceTestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const serviceName = 'API Service';

    console.log(`\n🌐 Testing ${serviceName}...`);

    // Test 1: Service Methods Availability
    try {
      const hasGet = typeof apiService.get === 'function';
      const hasPost = typeof apiService.post === 'function';
      const hasPut = typeof apiService.put === 'function';
      const hasDelete = typeof apiService.delete === 'function';
      const hasHealthCheck = typeof apiService.healthCheck === 'function';
      
      const methodsAvailable = hasGet && hasPost && hasPut && hasDelete && hasHealthCheck;
      
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: methodsAvailable,
        message: methodsAvailable ? 'API service methods available' : 'API service methods missing',
        details: { hasGet, hasPost, hasPut, hasDelete, hasHealthCheck },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: false,
        message: `API service method check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Connectivity Test
    try {
      const connectivityResult = await apiService.testConnectivity();
      const isConnected = connectivityResult.connected;
      
      tests.push({
        service: serviceName,
        test: 'Connectivity Test',
        success: isConnected,
        message: isConnected ? `Connected (${connectivityResult.latency}ms)` : `Connection failed: ${connectivityResult.error}`,
        details: connectivityResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Connectivity Test',
        success: false,
        message: `API connectivity test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Health Check
    try {
      const healthResult = await apiService.healthCheck();
      const isHealthy = !!healthResult;
      
      tests.push({
        service: serviceName,
        test: 'Health Check',
        success: isHealthy,
        message: isHealthy ? 'API service is healthy' : 'API service health check failed',
        details: healthResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Health Check',
        success: false,
        message: `API health check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    const suite: ServiceTestSuite = {
      serviceName,
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };

    this.results.push(suite);
    this.printTestResults(suite);
    return suite;
  }

  /**
   * Test DICOM Service Integration
   */
  async testDicomService(): Promise<ServiceTestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const serviceName = 'DICOM Service';

    console.log(`\n🏥 Testing ${serviceName}...`);

    // Test 1: Service Initialization
    try {
      await dicomService.initialize();
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: true,
        message: 'DICOM service initialized successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: false,
        message: `DICOM service initialization failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Cache Statistics
    try {
      const cacheStats = dicomService.getCacheStats();
      const hasCacheStats = cacheStats && typeof cacheStats === 'object';
      tests.push({
        service: serviceName,
        test: 'Cache Statistics',
        success: hasCacheStats,
        message: hasCacheStats ? 'DICOM cache statistics available' : 'DICOM cache statistics unavailable',
        details: cacheStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Cache Statistics',
        success: false,
        message: `DICOM cache statistics test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Sample Image Generation
    try {
      const sampleImageId = dicomService.generateSampleImageId('test-study-uid');
      const isValidImageId = typeof sampleImageId === 'string' && sampleImageId.length > 0;
      tests.push({
        service: serviceName,
        test: 'Sample Image Generation',
        success: isValidImageId,
        message: isValidImageId ? `Sample image ID generated: ${sampleImageId}` : 'Sample image ID generation failed',
        details: { sampleImageId },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Sample Image Generation',
        success: false,
        message: `Sample image generation test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    const suite: ServiceTestSuite = {
      serviceName,
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };

    this.results.push(suite);
    this.printTestResults(suite);
    return suite;
  }

  /**
   * Test Study Service Integration
   */
  async testStudyService(): Promise<ServiceTestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const serviceName = 'Study Service';

    console.log(`\n📚 Testing ${serviceName}...`);

    // Test 1: Service Methods Availability
    try {
      const hasGetStudies = typeof studyService.getStudies === 'function';
      const hasGetStudy = typeof studyService.getStudy === 'function';
      const hasGetPatientStudies = typeof studyService.getPatientStudies === 'function';
      const hasSearchStudies = typeof studyService.searchStudies === 'function';
      
      const methodsAvailable = hasGetStudies && hasGetStudy && hasGetPatientStudies && hasSearchStudies;
      
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: methodsAvailable,
        message: methodsAvailable ? 'Study service methods available' : 'Study service methods missing',
        details: { hasGetStudies, hasGetStudy, hasGetPatientStudies, hasSearchStudies },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: false,
        message: `Study service method check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Studies Fetch Test (with fallback to mock data)
    try {
      const studiesResult = await studyService.getStudies({ limit: 1 });
      const hasStudies = studiesResult && Array.isArray(studiesResult.studies);
      
      tests.push({
        service: serviceName,
        test: 'Studies Fetch Test',
        success: hasStudies,
        message: hasStudies ? `Fetched ${studiesResult.studies.length} studies (total: ${studiesResult.total})` : 'Studies fetch failed',
        details: { studyCount: studiesResult?.studies?.length || 0, total: studiesResult?.total || 0 },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Studies Fetch Test',
        success: false,
        message: `Studies fetch test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    const suite: ServiceTestSuite = {
      serviceName,
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };

    this.results.push(suite);
    this.printTestResults(suite);
    return suite;
  }

  /**
   * Test Collaboration Service Integration
   */
  async testCollaborationService(): Promise<ServiceTestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const serviceName = 'Collaboration Service';

    console.log(`\n👥 Testing ${serviceName}...`);

    // Test 1: Service Methods Availability
    try {
      const hasStartSession = typeof collaborationService.startCollaborationSession === 'function';
      const hasJoinSession = typeof collaborationService.joinCollaborationSession === 'function';
      const hasLeaveSession = typeof collaborationService.leaveCollaborationSession === 'function';
      const hasAddComment = typeof collaborationService.addComment === 'function';
      const hasGetCurrentSession = typeof collaborationService.getCurrentSession === 'function';
      
      const methodsAvailable = hasStartSession && hasJoinSession && hasLeaveSession && hasAddComment && hasGetCurrentSession;
      
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: methodsAvailable,
        message: methodsAvailable ? 'Collaboration service methods available' : 'Collaboration service methods missing',
        details: { hasStartSession, hasJoinSession, hasLeaveSession, hasAddComment, hasGetCurrentSession },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: false,
        message: `Collaboration service method check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Session Management Methods
    try {
      const hasGetVersionHistory = typeof collaborationService.getVersionHistory === 'function';
      const hasCreateVersion = typeof collaborationService.createVersion === 'function';
      const hasGetComments = typeof collaborationService.getComments === 'function';
      const hasGetConflicts = typeof collaborationService.getConflicts === 'function';
      
      const sessionMethodsAvailable = hasGetVersionHistory && hasCreateVersion && hasGetComments && hasGetConflicts;
      
      tests.push({
        service: serviceName,
        test: 'Session Management Methods',
        success: sessionMethodsAvailable,
        message: sessionMethodsAvailable ? 'Session management methods available' : 'Session management methods missing',
        details: { hasGetVersionHistory, hasCreateVersion, hasGetComments, hasGetConflicts },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Session Management Methods',
        success: false,
        message: `Session management methods check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Current Session Status
    try {
      const currentSession = collaborationService.getCurrentSession();
      tests.push({
        service: serviceName,
        test: 'Current Session Status',
        success: true, // This test always passes as it's checking the method works
        message: currentSession ? `Active session: ${currentSession.id}` : 'No active session',
        details: { hasActiveSession: !!currentSession, sessionId: currentSession?.id },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Current Session Status',
        success: false,
        message: `Current session status check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    const suite: ServiceTestSuite = {
      serviceName,
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };

    this.results.push(suite);
    this.printTestResults(suite);
    return suite;
  }

  /**
   * Test Real-Time Collaboration Service Integration
   */
  async testRealTimeCollaborationService(): Promise<ServiceTestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const serviceName = 'Real-Time Collaboration Service';

    console.log(`\n🤝 Testing ${serviceName}...`);

    // Test 1: Service Methods Availability
    try {
      const hasJoinSession = typeof realTimeCollaborationService.joinSession === 'function';
      const hasLeaveSession = typeof realTimeCollaborationService.leaveSession === 'function';
      const hasUpdateField = typeof realTimeCollaborationService.updateField === 'function';
      const hasAddComment = typeof realTimeCollaborationService.addComment === 'function';
      const hasIsConnected = typeof realTimeCollaborationService.isConnected === 'function';
      
      const methodsAvailable = hasJoinSession && hasLeaveSession && hasUpdateField && hasAddComment && hasIsConnected;
      
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: methodsAvailable,
        message: methodsAvailable ? 'Collaboration service methods available' : 'Collaboration service methods missing',
        details: { hasJoinSession, hasLeaveSession, hasUpdateField, hasAddComment, hasIsConnected },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Methods Availability',
        success: false,
        message: `Collaboration service method check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Connection Status Check
    try {
      const isConnected = realTimeCollaborationService.isConnected();
      tests.push({
        service: serviceName,
        test: 'Connection Status Check',
        success: true, // This test always passes as it's checking the method works
        message: `Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`,
        details: { isConnected },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Connection Status Check',
        success: false,
        message: `Connection status check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Session Management Methods
    try {
      const hasGetCurrentSession = typeof realTimeCollaborationService.getCurrentSession === 'function';
      const hasGetActiveUsers = typeof realTimeCollaborationService.getActiveUsers === 'function';
      const hasGetUserPermissions = typeof realTimeCollaborationService.getUserPermissions === 'function';
      
      const sessionMethodsAvailable = hasGetCurrentSession && hasGetActiveUsers && hasGetUserPermissions;
      
      tests.push({
        service: serviceName,
        test: 'Session Management Methods',
        success: sessionMethodsAvailable,
        message: sessionMethodsAvailable ? 'Session management methods available' : 'Session management methods missing',
        details: { hasGetCurrentSession, hasGetActiveUsers, hasGetUserPermissions },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Session Management Methods',
        success: false,
        message: `Session management methods check failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    const suite: ServiceTestSuite = {
      serviceName,
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };

    this.results.push(suite);
    this.printTestResults(suite);
    return suite;
  }

  /**
   * Run quick connectivity tests
   */
  async runQuickConnectivityTests(): Promise<TestResult[]> {
    console.log('⚡ Running quick connectivity tests...');
    
    const quickTests: TestResult[] = [];

    // Quick API test
    try {
      const apiUrl = environmentService.getApiUrl();
      quickTests.push({
        service: 'Quick Test',
        test: 'API URL',
        success: this.isValidUrl(apiUrl),
        message: `API URL: ${apiUrl}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      quickTests.push({
        service: 'Quick Test',
        test: 'API URL',
        success: false,
        message: `API URL test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Quick DICOM test
    try {
      const dicomUrl = environmentService.getDicomUrl();
      quickTests.push({
        service: 'Quick Test',
        test: 'DICOM URL',
        success: this.isValidUrl(dicomUrl),
        message: `DICOM URL: ${dicomUrl}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      quickTests.push({
        service: 'Quick Test',
        test: 'DICOM URL',
        success: false,
        message: `DICOM URL test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Quick Collaboration test
    try {
      const collaborationUrl = environmentService.getCollaborationUrl();
      quickTests.push({
        service: 'Quick Test',
        test: 'Collaboration URL',
        success: this.isValidUrl(collaborationUrl),
        message: `Collaboration URL: ${collaborationUrl}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      quickTests.push({
        service: 'Quick Test',
        test: 'Collaboration URL',
        success: false,
        message: `Collaboration URL test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    }

    quickTests.forEach(test => {
      console.log(`${test.success ? '✅' : '❌'} ${test.test}: ${test.message}`);
    });

    return quickTests;
  }

  /**
   * Get test summary
   */
  getSummary(): {
    totalServices: number;
    successfulServices: number;
    failedServices: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    totalDuration: number;
  } {
    const totalServices = this.results.length;
    const successfulServices = this.results.filter(r => r.overallSuccess).length;
    const failedServices = totalServices - successfulServices;
    
    const totalTests = this.results.reduce((sum, r) => sum + r.tests.length, 0);
    const passedTests = this.results.reduce((sum, r) => sum + r.tests.filter(t => t.success).length, 0);
    const failedTests = totalTests - passedTests;
    
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalServices,
      successfulServices,
      failedServices,
      totalTests,
      passedTests,
      failedTests,
      successRate,
      totalDuration
    };
  }

  /**
   * Utility method to validate URLs
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Print test results for a service suite
   */
  private printTestResults(suite: ServiceTestSuite): void {
    console.log(`\n📊 ${suite.serviceName} Results:`);
    console.log(`Overall: ${suite.overallSuccess ? '✅ PASS' : '❌ FAIL'} (${suite.duration}ms)`);
    
    suite.tests.forEach(test => {
      console.log(`  ${test.success ? '✅' : '❌'} ${test.test}: ${test.message}`);
    });
  }

  /**
   * Print comprehensive test summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 SERVICE INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = this.results.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.success).length, 0);
    const failedTests = totalTests - passedTests;
    const overallSuccess = this.results.every(suite => suite.overallSuccess);
    
    console.log(`Total Services Tested: ${this.results.length}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Overall Result: ${overallSuccess ? '✅ ALL SERVICES PASS' : '❌ SOME SERVICES FAILED'}`);
    
    console.log('\nService Breakdown:');
    this.results.forEach(suite => {
      const passedCount = suite.tests.filter(t => t.success).length;
      const totalCount = suite.tests.length;
      console.log(`  ${suite.overallSuccess ? '✅' : '❌'} ${suite.serviceName}: ${passedCount}/${totalCount} tests passed`);
    });
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.forEach(suite => {
        suite.tests.filter(t => !t.success).forEach(test => {
          console.log(`  - ${suite.serviceName} > ${test.test}: ${test.message}`);
        });
      });
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Get test results
   */
  getResults(): ServiceTestSuite[] {
    return this.results;
  }

  /**
   * Export results to JSON
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalServices: this.results.length,
        totalTests: this.results.reduce((sum, suite) => sum + suite.tests.length, 0),
        passedTests: this.results.reduce((sum, suite) => 
          sum + suite.tests.filter(t => t.success).length, 0),
        overallSuccess: this.results.every(suite => suite.overallSuccess)
      },
      results: this.results
    }, null, 2);
  }
}

// Export singleton instance
export const serviceIntegrationTester = new ServiceIntegrationTester();