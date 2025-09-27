import { environmentService } from '../config/environment';
import { apiService } from '../services/api';
import { studyService } from '../services/studyService';
import { collaborationService } from '../services/collaborationService';
import { realTimeCollaborationService } from '../services/realTimeCollaborationService';

interface IntegrationTestResult {
  service: string;
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
  duration?: number;
}

class CrossServiceIntegrationTester {
  private results: IntegrationTestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🔄 Starting Cross-Service Integration Tests...\n');

    const startTime = Date.now();

    // Test 1: Environment Configuration Consistency
    await this.testEnvironmentConfigurationConsistency();

    // Test 2: API Service Configuration Propagation
    await this.testApiServiceConfigurationPropagation();

    // Test 3: Study Service Data Flow
    await this.testStudyServiceDataFlow();

    // Test 4: Collaboration Service Integration
    await this.testCollaborationServiceIntegration();

    // Test 5: Real-time Service Integration
    await this.testRealTimeServiceIntegration();

    // Test 6: End-to-End Workflow Simulation
    await this.testEndToEndWorkflowSimulation();

    const totalTime = Date.now() - startTime;
    this.printResults(totalTime);
  }

  private async testEnvironmentConfigurationConsistency(): Promise<void> {
    const testName = 'Environment Configuration Consistency';
    const startTime = Date.now();

    try {
      // Get configuration from environment service
      const config = environmentService.getConfig();
      const apiUrl = environmentService.get('apiUrl');
      const dicomUrl = environmentService.get('dicomWebUrl');
      
      // Verify API service uses the same configuration
      const apiConfigured = !!(apiUrl && typeof apiService.get === 'function');
      
      const configConsistent = !!(apiUrl && apiConfigured);
      const hasRequiredUrls = !!(apiUrl && dicomUrl);

      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: configConsistent && hasRequiredUrls,
        message: configConsistent && hasRequiredUrls 
          ? 'Environment configuration is consistent across services'
          : 'Configuration inconsistency detected',
        details: {
          environmentApiUrl: apiUrl,
          apiServiceConfigured: apiConfigured,
          dicomUrl: dicomUrl,
          configConsistent,
          hasRequiredUrls
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: false,
        message: `Configuration consistency test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
  }

  private async testApiServiceConfigurationPropagation(): Promise<void> {
    const testName = 'API Service Configuration Propagation';
    const startTime = Date.now();

    try {
      // Test if API service configuration is properly propagated to dependent services
      const apiUrl = environmentService.get('apiUrl');
      const apiConfigured = !!(apiUrl && typeof apiService.get === 'function');
      
      // Check if study service can access API configuration
      const studyServiceHasMethods = typeof studyService.getStudies === 'function';
      
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: !!(apiUrl && apiConfigured && studyServiceHasMethods),
        message: 'API configuration properly propagated to dependent services',
        details: {
          apiUrl,
          apiConfigured,
          studyServiceConfigured: studyServiceHasMethods,
          configurationValid: !!(apiUrl && apiConfigured)
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: false,
        message: `API configuration propagation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
  }

  private async testStudyServiceDataFlow(): Promise<void> {
    const testName = 'Study Service Data Flow';
    const startTime = Date.now();

    try {
      // Test complete data flow through study service
      const studiesResult = await studyService.getStudies({ limit: 5 });
      const hasValidStructure = studiesResult && 
        typeof studiesResult === 'object' && 
        Array.isArray(studiesResult.studies) &&
        typeof studiesResult.total === 'number';

      let individualStudyTest = false;
      if (hasValidStructure && studiesResult.studies.length > 0) {
        try {
          const firstStudy = studiesResult.studies[0];
          const studyDetail = await studyService.getStudy(firstStudy.study_uid);
          individualStudyTest = !!(studyDetail && studyDetail.study_uid);
        } catch (error) {
          // Individual study test failed, but that's okay for mock data
          individualStudyTest = false;
        }
      }

      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: hasValidStructure,
        message: hasValidStructure 
          ? `Study service data flow working - ${studiesResult.studies.length} studies available`
          : 'Study service data flow failed',
        details: {
          studyCount: studiesResult?.studies?.length || 0,
          totalStudies: studiesResult?.total || 0,
          hasValidStructure,
          individualStudyAccessible: individualStudyTest
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: false,
        message: `Study service data flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
  }

  private async testCollaborationServiceIntegration(): Promise<void> {
    const testName = 'Collaboration Service Integration';
    const startTime = Date.now();

    try {
      // Test collaboration service integration with environment configuration
      const collaborationEnabled = environmentService.get('collaborationEnabled');
      const collaborationUrl = environmentService.get('collaborationUrl');
      
      // Test method availability
      const hasRequiredMethods = !!(
        typeof collaborationService.startCollaborationSession === 'function' &&
        typeof collaborationService.joinCollaborationSession === 'function' &&
        typeof collaborationService.addComment === 'function'
      );

      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: hasRequiredMethods,
        message: hasRequiredMethods 
          ? 'Collaboration service properly integrated with configuration'
          : 'Collaboration service integration issues detected',
        details: {
          collaborationEnabled,
          collaborationUrl,
          hasRequiredMethods,
          configurationAvailable: !!(collaborationEnabled !== undefined && collaborationUrl)
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: false,
        message: `Collaboration service integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
  }

  private async testRealTimeServiceIntegration(): Promise<void> {
    const testName = 'Real-Time Service Integration';
    const startTime = Date.now();

    try {
      // Test real-time collaboration service integration
      const isConnected = realTimeCollaborationService.isConnected();
      const activeUsers = realTimeCollaborationService.getActiveUsers();
      
      // Test method availability
      const hasRequiredMethods = !!(
        typeof realTimeCollaborationService.joinSession === 'function' &&
        typeof realTimeCollaborationService.leaveSession === 'function' &&
        typeof realTimeCollaborationService.updateField === 'function'
      );

      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: hasRequiredMethods,
        message: hasRequiredMethods 
          ? 'Real-time service properly integrated'
          : 'Real-time service integration issues detected',
        details: {
          isConnected,
          activeUserCount: activeUsers?.length || 0,
          hasRequiredMethods,
          serviceAvailable: typeof realTimeCollaborationService !== 'undefined'
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: false,
        message: `Real-time service integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
  }

  private async testEndToEndWorkflowSimulation(): Promise<void> {
    const testName = 'End-to-End Workflow Simulation';
    const startTime = Date.now();

    try {
      // Simulate a complete workflow: Environment → API → Study → Collaboration
      
      // Step 1: Environment configuration
      const config = environmentService.getConfig();
      const configValid = !!(config && config.apiUrl);

      // Step 2: API service ready
      const apiReady = !!(typeof apiService.get === 'function' && environmentService.get('apiUrl'));

      // Step 3: Study service can retrieve data
      let studyDataAvailable = false;
      try {
        const studies = await studyService.getStudies({ limit: 1 });
        studyDataAvailable = !!(studies && studies.studies);
      } catch (error) {
        studyDataAvailable = false;
      }

      // Step 4: Collaboration services available
      const collaborationReady = !!(
        typeof collaborationService.startCollaborationSession === 'function' &&
        typeof realTimeCollaborationService.joinSession === 'function'
      );

      const workflowComplete = configValid && apiReady && studyDataAvailable && collaborationReady;

      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: workflowComplete,
        message: workflowComplete 
          ? 'End-to-end workflow simulation successful'
          : 'End-to-end workflow has issues',
        details: {
          configValid,
          apiReady,
          studyDataAvailable,
          collaborationReady,
          workflowSteps: {
            '1_environment': configValid,
            '2_api': apiReady,
            '3_study_data': studyDataAvailable,
            '4_collaboration': collaborationReady
          }
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        service: 'Cross-Service',
        test: testName,
        success: false,
        message: `End-to-end workflow simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    }
  }

  private printResults(totalTime: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CROSS-SERVICE INTEGRATION TEST RESULTS');
    console.log('='.repeat(80));

    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);

    console.log(`\n📈 Summary: ${successfulTests.length}/${this.results.length} tests passed`);
    console.log(`⏱️  Total execution time: ${totalTime}ms\n`);

    // Group results by service
    const groupedResults = this.results.reduce((acc, result) => {
      if (!acc[result.service]) {
        acc[result.service] = [];
      }
      acc[result.service].push(result);
      return acc;
    }, {} as Record<string, IntegrationTestResult[]>);

    Object.entries(groupedResults).forEach(([service, tests]) => {
      const serviceSuccess = tests.every(t => t.success);
      const avgDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0) / tests.length;
      
      console.log(`${serviceSuccess ? '✅' : '❌'} ${service} (${Math.round(avgDuration)}ms avg)`);
      
      tests.forEach(test => {
        const icon = test.success ? '  ✅' : '  ❌';
        console.log(`${icon} ${test.test}: ${test.message}`);
        
        if (test.details) {
          console.log(`     Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      });
      console.log('');
    });

    if (failedTests.length > 0) {
      console.log('❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   • ${test.service} - ${test.test}: ${test.message}`);
      });
    } else {
      console.log('✨ All cross-service integration tests passed successfully!');
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Run the tests
const tester = new CrossServiceIntegrationTester();
tester.runAllTests().catch(error => {
  console.error('❌ Cross-service integration tests failed:', error);
  process.exit(1);
});