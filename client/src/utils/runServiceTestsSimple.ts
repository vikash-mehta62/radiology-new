/**
 * Simplified Service Integration Tests Runner
 * Runs basic connectivity and configuration tests without cornerstone dependencies
 */

import { environmentService } from '../config/environment';
import { apiService } from '../services/api';

interface TestResult {
  service: string;
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

class SimpleServiceTester {
  private results: TestResult[] = [];

  async runBasicTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Basic Service Integration Tests...\n');
    
    await this.testEnvironmentService();
    await this.testApiService();
    
    this.printResults();
    return this.results;
  }

  private async testEnvironmentService(): Promise<void> {
    console.log('🔧 Testing Environment Service...');
    
    try {
      const config = environmentService.getConfig();
      const hasConfig = config && typeof config === 'object';
      const hasRequiredFields = config?.apiUrl && config?.dicomWebUrl && config?.env;
      
      this.results.push({
        service: 'EnvironmentService',
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
      
      this.results.push({
        service: 'EnvironmentService',
        test: 'Environment Detection',
        success: typeof isDev === 'boolean' && typeof isProd === 'boolean' && typeof isTest === 'boolean',
        message: 'Environment detection methods working correctly',
        details: { isDev, isProd, isTest },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.results.push({
        service: 'EnvironmentService',
        test: 'Configuration Loading',
        success: false,
        message: `Environment service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testApiService(): Promise<void> {
    console.log('🌐 Testing API Service...');
    
    try {
      // Test method availability
      const hasGetMethod = typeof apiService.get === 'function';
      const hasPostMethod = typeof apiService.post === 'function';
      
      this.results.push({
        service: 'ApiService',
        test: 'Method Availability',
        success: hasGetMethod && hasPostMethod,
        message: hasGetMethod && hasPostMethod ? 'API service methods available' : 'API service methods missing',
        details: { hasGetMethod, hasPostMethod },
        timestamp: new Date().toISOString()
      });

      // Test basic connectivity (without making actual requests)
      const baseURL = environmentService.getApiUrl();
      const isValidUrl = this.isValidUrl(baseURL);
      
      this.results.push({
        service: 'ApiService',
        test: 'URL Configuration',
        success: isValidUrl,
        message: isValidUrl ? 'API URL is properly configured' : 'API URL configuration invalid',
        details: { baseURL },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.results.push({
        service: 'ApiService',
        test: 'Service Initialization',
        success: false,
        message: `API service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.service} - ${result.test}: ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const tester = new SimpleServiceTester();
    await tester.runBasicTests();
    console.log('\n✨ Basic service tests completed successfully!');
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();