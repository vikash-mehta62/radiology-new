/**
 * Extended Service Integration Tests Runner
 * Tests DICOM and collaboration services without cornerstone dependencies
 */

import { environmentService } from '../config/environment';
import { apiService } from '../services/api';
import { studyService } from '../services/studyService';
import { collaborationService } from '../services/collaborationService';
import { realTimeCollaborationService } from '../services/realTimeCollaborationService';

interface TestResult {
  service: string;
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

interface ServiceTestSuite {
  serviceName: string;
  tests: TestResult[];
  overallSuccess: boolean;
  duration: number;
}

class ExtendedServiceTester {
  private results: ServiceTestSuite[] = [];

  async runExtendedTests(): Promise<ServiceTestSuite[]> {
    console.log('🚀 Starting Extended Service Integration Tests...\n');
    
    await this.testEnvironmentService();
    await this.testApiService();
    await this.testStudyService();
    await this.testCollaborationService();
    await this.testRealTimeCollaborationService();
    
    this.printSummary();
    return this.results;
  }

  private async testEnvironmentService(): Promise<void> {
    const startTime = Date.now();
    const serviceName = 'EnvironmentService';
    const tests: TestResult[] = [];
    
    console.log('🔧 Testing Environment Service...');
    
    try {
      // Test configuration loading
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

      // Test environment detection
      const isDev = environmentService.isDevelopment();
      const isProd = environmentService.isProduction();
      const isTest = environmentService.isTest();
      
      tests.push({
        service: serviceName,
        test: 'Environment Detection',
        success: typeof isDev === 'boolean' && typeof isProd === 'boolean' && typeof isTest === 'boolean',
        message: 'Environment detection methods working correctly',
        details: { isDev, isProd, isTest },
        timestamp: new Date().toISOString()
      });

      // Test URL generation
      const apiUrl = environmentService.getApiUrl();
      const dicomUrl = environmentService.getDicomUrl();
      
      tests.push({
        service: serviceName,
        test: 'URL Generation',
        success: this.isValidUrl(apiUrl) && this.isValidUrl(dicomUrl),
        message: 'URL generation working correctly',
        details: { apiUrl, dicomUrl },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: false,
        message: `Environment service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;
    const overallSuccess = tests.every(test => test.success);
    
    this.results.push({
      serviceName,
      tests,
      overallSuccess,
      duration
    });
  }

  private async testApiService(): Promise<void> {
    const startTime = Date.now();
    const serviceName = 'ApiService';
    const tests: TestResult[] = [];
    
    console.log('🌐 Testing API Service...');
    
    try {
      // Test method availability
      const hasGetMethod = typeof apiService.get === 'function';
      const hasPostMethod = typeof apiService.post === 'function';
      
      tests.push({
        service: serviceName,
        test: 'Method Availability',
        success: hasGetMethod && hasPostMethod,
        message: hasGetMethod && hasPostMethod ? 'API service methods available' : 'API service methods missing',
        details: { hasGetMethod, hasPostMethod },
        timestamp: new Date().toISOString()
      });

      // Test URL configuration
      const baseURL = environmentService.getApiUrl();
      const isValidUrl = this.isValidUrl(baseURL);
      
      tests.push({
        service: serviceName,
        test: 'URL Configuration',
        success: isValidUrl,
        message: isValidUrl ? 'API URL is properly configured' : 'API URL configuration invalid',
        details: { baseURL },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: false,
        message: `API service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;
    const overallSuccess = tests.every(test => test.success);
    
    this.results.push({
      serviceName,
      tests,
      overallSuccess,
      duration
    });
  }

  private async testStudyService(): Promise<void> {
    const startTime = Date.now();
    const serviceName = 'StudyService';
    const tests: TestResult[] = [];
    
    console.log('📊 Testing Study Service...');
    
    try {
      // Test method availability
      const hasGetStudies = typeof studyService.getStudies === 'function';
      const hasGetStudy = typeof studyService.getStudy === 'function';
      
      tests.push({
        service: serviceName,
        test: 'Method Availability',
        success: hasGetStudies && hasGetStudy,
        message: hasGetStudies && hasGetStudy ? 'Study service methods available' : 'Study service methods missing',
        details: { hasGetStudies, hasGetStudy },
        timestamp: new Date().toISOString()
      });

      // Test basic functionality (with mock data)
      try {
        const studiesResult = await studyService.getStudies();
        const hasStudies = studiesResult && typeof studiesResult === 'object' && Array.isArray(studiesResult.studies);
        
        tests.push({
          service: serviceName,
          test: 'Data Retrieval',
          success: hasStudies,
          message: hasStudies ? `Successfully retrieved ${studiesResult.studies.length} studies` : 'Failed to retrieve studies',
          details: { studyCount: studiesResult?.studies?.length || 0, total: studiesResult?.total || 0 },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        tests.push({
          service: serviceName,
          test: 'Data Retrieval',
          success: false,
          message: `Study retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: false,
        message: `Study service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;
    const overallSuccess = tests.every(test => test.success);
    
    this.results.push({
      serviceName,
      tests,
      overallSuccess,
      duration
    });
  }

  private async testCollaborationService(): Promise<void> {
    const startTime = Date.now();
    const serviceName = 'CollaborationService';
    const tests: TestResult[] = [];
    
    console.log('🤝 Testing Collaboration Service...');
    
    try {
      // Test method availability
      const hasStartSession = typeof collaborationService.startCollaborationSession === 'function';
      const hasJoinSession = typeof collaborationService.joinCollaborationSession === 'function';
      const hasAddComment = typeof collaborationService.addComment === 'function';
      
      tests.push({
        service: serviceName,
        test: 'Method Availability',
        success: hasStartSession && hasJoinSession && hasAddComment,
        message: hasStartSession && hasJoinSession && hasAddComment ? 'Collaboration service methods available' : 'Collaboration service methods missing',
        details: { hasStartSession, hasJoinSession, hasAddComment },
        timestamp: new Date().toISOString()
      });

      // Test session management
      const currentSession = collaborationService.getCurrentSession();
      
      tests.push({
        service: serviceName,
        test: 'Session Management',
        success: currentSession === null || typeof currentSession === 'object',
        message: currentSession ? 'Active collaboration session found' : 'No active collaboration session',
        details: { hasActiveSession: currentSession !== null },
        timestamp: new Date().toISOString()
      });

      // Test configuration
      const collaborationEnabled = environmentService.get('collaborationEnabled');
      const collaborationUrl = environmentService.getCollaborationUrl();
      
      tests.push({
        service: serviceName,
        test: 'Configuration',
        success: typeof collaborationEnabled === 'boolean',
        message: `Collaboration ${collaborationEnabled ? 'enabled' : 'disabled'}`,
        details: { collaborationEnabled, collaborationUrl },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: false,
        message: `Collaboration service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;
    const overallSuccess = tests.every(test => test.success);
    
    this.results.push({
      serviceName,
      tests,
      overallSuccess,
      duration
    });
  }

  private async testRealTimeCollaborationService(): Promise<void> {
    const startTime = Date.now();
    const serviceName = 'RealTimeCollaborationService';
    const tests: TestResult[] = [];
    
    console.log('⚡ Testing Real-Time Collaboration Service...');
    
    try {
      // Test method availability
      const hasJoinSession = typeof realTimeCollaborationService.joinSession === 'function';
      const hasLeaveSession = typeof realTimeCollaborationService.leaveSession === 'function';
      const hasUpdateField = typeof realTimeCollaborationService.updateField === 'function';
      const hasAddComment = typeof realTimeCollaborationService.addComment === 'function';
      
      tests.push({
        service: serviceName,
        test: 'Method Availability',
        success: hasJoinSession && hasLeaveSession && hasUpdateField && hasAddComment,
        message: hasJoinSession && hasLeaveSession && hasUpdateField && hasAddComment ? 'Real-time collaboration service methods available' : 'Real-time collaboration service methods missing',
        details: { hasJoinSession, hasLeaveSession, hasUpdateField, hasAddComment },
        timestamp: new Date().toISOString()
      });

      // Test connection status
      const isConnected = realTimeCollaborationService.isConnected();
      
      tests.push({
        service: serviceName,
        test: 'Connection Status',
        success: typeof isConnected === 'boolean',
        message: `Connection status: ${isConnected ? 'connected' : 'disconnected'}`,
        details: { isConnected },
        timestamp: new Date().toISOString()
      });

      // Test session management
      const currentSession = realTimeCollaborationService.getCurrentSession();
      const activeUsers = realTimeCollaborationService.getActiveUsers();
      
      tests.push({
        service: serviceName,
        test: 'Session Management',
        success: (currentSession === null || typeof currentSession === 'object') && Array.isArray(activeUsers),
        message: `Session management working - ${activeUsers.length} active users`,
        details: { hasActiveSession: currentSession !== null, activeUserCount: activeUsers.length },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      tests.push({
        service: serviceName,
        test: 'Service Initialization',
        success: false,
        message: `Real-time collaboration service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;
    const overallSuccess = tests.every(test => test.success);
    
    this.results.push({
      serviceName,
      tests,
      overallSuccess,
      duration
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private printSummary(): void {
    console.log('\n📊 Extended Test Results Summary:');
    console.log('==================================');
    
    const totalServices = this.results.length;
    const successfulServices = this.results.filter(r => r.overallSuccess).length;
    const failedServices = totalServices - successfulServices;
    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = this.results.reduce((sum, suite) => sum + suite.tests.filter(t => t.success).length, 0);
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.duration, 0);
    
    console.log(`Total Services: ${totalServices}`);
    console.log(`Successful Services: ${successfulServices}`);
    console.log(`Failed Services: ${failedServices}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed Tests: ${passedTests}`);
    console.log(`Failed Tests: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms\n`);
    
    this.results.forEach(suite => {
      const status = suite.overallSuccess ? '✅' : '❌';
      console.log(`${status} ${suite.serviceName} (${suite.duration}ms)`);
      
      suite.tests.forEach(test => {
        const testStatus = test.success ? '  ✅' : '  ❌';
        console.log(`${testStatus} ${test.test}: ${test.message}`);
        if (test.details && Object.keys(test.details).length > 0) {
          console.log(`     Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      });
      console.log('');
    });
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const tester = new ExtendedServiceTester();
    await tester.runExtendedTests();
    console.log('✨ Extended service tests completed successfully!');
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();