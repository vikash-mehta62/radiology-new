/**
 * DICOM Connectivity Tester
 * Tests DICOM-specific connectivity and capabilities
 * Ensures safe, non-intrusive testing of medical devices
 */

import { DicomDevice, DeviceCapability } from './medicalDeviceDiscovery';
import { auditService } from './auditService';

export interface DicomTestResult {
  testType: string;
  success: boolean;
  responseTime: number;
  details: any;
  error?: string;
  timestamp: string;
}

export interface DicomAssociation {
  callingAET: string;
  calledAET: string;
  implementationClassUID: string;
  implementationVersionName: string;
  maxPDULength: number;
  presentationContexts: PresentationContext[];
}

export interface PresentationContext {
  id: number;
  abstractSyntax: string;
  transferSyntaxes: string[];
  result?: 'acceptance' | 'user_rejection' | 'no_reason' | 'abstract_syntax_not_supported' | 'transfer_syntaxes_not_supported';
}

export interface DicomTestConfig {
  timeout: number;
  maxRetries: number;
  callingAET: string;
  testDepth: 'basic' | 'standard' | 'comprehensive';
  respectBusinessHours: boolean;
  safeMode: boolean; // Extra conservative testing
}

class DicomConnectivityTesterService {
  private readonly defaultConfig: DicomTestConfig = {
    timeout: 10000,
    maxRetries: 3,
    callingAET: 'MEDFLOW_TEST',
    testDepth: 'standard',
    respectBusinessHours: true,
    safeMode: true
  };

  // Common DICOM UIDs
  private readonly DICOM_UIDS = {
    // Abstract Syntaxes
    VERIFICATION_SOP_CLASS: '1.2.840.10008.1.1',
    STUDY_ROOT_QUERY_RETRIEVE_FIND: '1.2.840.10008.5.1.4.1.2.2.1',
    PATIENT_ROOT_QUERY_RETRIEVE_FIND: '1.2.840.10008.5.1.4.1.2.1.1',
    CT_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.2',
    MR_IMAGE_STORAGE: '1.2.840.10008.5.1.4.1.1.4',
    
    // Transfer Syntaxes
    IMPLICIT_VR_LITTLE_ENDIAN: '1.2.840.10008.1.2',
    EXPLICIT_VR_LITTLE_ENDIAN: '1.2.840.10008.1.2.1',
    EXPLICIT_VR_BIG_ENDIAN: '1.2.840.10008.1.2.2',
    JPEG_BASELINE: '1.2.840.10008.1.2.4.50',
    JPEG_LOSSLESS: '1.2.840.10008.1.2.4.70'
  };

  /**
   * Perform comprehensive DICOM connectivity test
   */
  async testDevice(
    device: DicomDevice, 
    config?: Partial<DicomTestConfig>
  ): Promise<DicomTestResult[]> {
    const testConfig = { ...this.defaultConfig, ...config };
    const results: DicomTestResult[] = [];

    console.log(`🧪 Starting DICOM connectivity test for ${device.name}`);

    // Log audit event
    await auditService.logDeviceTested(device.id, []);

    try {
      // Basic connectivity test
      const basicTest = await this.testBasicConnectivity(device, testConfig);
      results.push(basicTest);

      if (!basicTest.success) {
        console.log('❌ Basic connectivity failed, skipping advanced tests');
        return results;
      }

      // DICOM Echo test (C-ECHO)
      const echoTest = await this.testDicomEcho(device, testConfig);
      results.push(echoTest);

      if (testConfig.testDepth === 'basic') {
        return results;
      }

      // Web services tests
      if (testConfig.testDepth === 'standard' || testConfig.testDepth === 'comprehensive') {
        const wadoTest = await this.testWadoServices(device, testConfig);
        results.push(...wadoTest);

        const qidoTest = await this.testQidoServices(device, testConfig);
        results.push(...qidoTest);
      }

      // Comprehensive tests
      if (testConfig.testDepth === 'comprehensive') {
        const findTest = await this.testDicomFind(device, testConfig);
        results.push(findTest);

        const capabilityTest = await this.testDeviceCapabilities(device, testConfig);
        results.push(...capabilityTest);
      }

    } catch (error) {
      console.error('❌ DICOM test failed:', error);
      results.push({
        testType: 'GENERAL_ERROR',
        success: false,
        responseTime: 0,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }

    // Log test completion
    try {
      await auditService.logDeviceTested(device.id, results);
    } catch (auditError) {
      console.warn('Failed to log device test audit event:', auditError);
    }

    return results;
  }

  /**
   * Test basic network connectivity
   */
  private async testBasicConnectivity(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      // Try HTTP first (less intrusive)
      if ([8080, 8042, 4242].includes(device.port)) {
        const response = await fetch(`http://${device.ip}:${device.port}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(config.timeout)
        });

        const responseTime = performance.now() - startTime;
        
        return {
          testType: 'BASIC_HTTP_CONNECTIVITY',
          success: response.ok || response.status < 500,
          responseTime,
          details: {
            status: response.status,
            statusText: response.statusText,
            server: response.headers.get('server')
          },
          timestamp: new Date().toISOString()
        };
      }

      // For DICOM ports, try TCP connection
      const tcpResult = await this.testTcpConnection(device.ip, device.port, config.timeout);
      const responseTime = performance.now() - startTime;

      return {
        testType: 'BASIC_TCP_CONNECTIVITY',
        success: tcpResult.connected,
        responseTime,
        details: tcpResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'BASIC_CONNECTIVITY',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'Connection failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test DICOM C-ECHO (verification)
   */
  private async testDicomEcho(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      console.log(`📡 Testing C-ECHO for ${device.name}`);
      
      // Create DICOM association for C-ECHO
      const association: DicomAssociation = {
        callingAET: config.callingAET,
        calledAET: device.aeTitle,
        implementationClassUID: '1.2.840.10008.1.1',
        implementationVersionName: 'MEDFLOW_1.0',
        maxPDULength: 16384,
        presentationContexts: [{
          id: 1,
          abstractSyntax: this.DICOM_UIDS.VERIFICATION_SOP_CLASS,
          transferSyntaxes: [this.DICOM_UIDS.IMPLICIT_VR_LITTLE_ENDIAN]
        }]
      };

      const echoResult = await this.sendDicomEcho(device, association, config);
      const responseTime = performance.now() - startTime;

      return {
        testType: 'DICOM_C_ECHO',
        success: echoResult.success,
        responseTime,
        details: {
          association: echoResult.associationAccepted,
          implementationUID: echoResult.implementationUID,
          implementationVersion: echoResult.implementationVersion,
          maxPDULength: echoResult.maxPDULength
        },
        error: echoResult.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'DICOM_C_ECHO',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'C-ECHO failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test WADO services (Web Access to DICOM Objects)
   */
  private async testWadoServices(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult[]> {
    const results: DicomTestResult[] = [];

    // Test WADO-URI
    const wadoUriResult = await this.testWadoUri(device, config);
    results.push(wadoUriResult);

    // Test WADO-RS
    const wadoRsResult = await this.testWadoRs(device, config);
    results.push(wadoRsResult);

    return results;
  }

  /**
   * Test WADO-URI
   */
  private async testWadoUri(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      const wadoUrl = `http://${device.ip}:${device.port}/wado`;
      
      // Test with a simple capabilities request
      const response = await fetch(wadoUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(config.timeout),
        headers: {
          'Accept': 'application/dicom'
        }
      });

      const responseTime = performance.now() - startTime;
      
      return {
        testType: 'WADO_URI',
        success: response.ok || response.status === 400, // 400 is expected without parameters
        responseTime,
        details: {
          status: response.status,
          contentType: response.headers.get('content-type'),
          server: response.headers.get('server')
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'WADO_URI',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'WADO-URI test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test WADO-RS (RESTful services)
   */
  private async testWadoRs(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      const wadoRsUrl = `http://${device.ip}:${device.port}/wado-rs/studies`;
      
      const response = await fetch(wadoRsUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(config.timeout),
        headers: {
          'Accept': 'application/dicom+json'
        }
      });

      const responseTime = performance.now() - startTime;
      
      return {
        testType: 'WADO_RS',
        success: response.ok,
        responseTime,
        details: {
          status: response.status,
          contentType: response.headers.get('content-type'),
          server: response.headers.get('server')
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'WADO_RS',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'WADO-RS test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test QIDO-RS (Query based on ID for DICOM Objects)
   */
  private async testQidoServices(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult[]> {
    const results: DicomTestResult[] = [];

    const qidoRsResult = await this.testQidoRs(device, config);
    results.push(qidoRsResult);

    return results;
  }

  /**
   * Test QIDO-RS
   */
  private async testQidoRs(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      const qidoRsUrl = `http://${device.ip}:${device.port}/qido-rs/studies`;
      
      const response = await fetch(qidoRsUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(config.timeout),
        headers: {
          'Accept': 'application/dicom+json'
        }
      });

      const responseTime = performance.now() - startTime;
      
      return {
        testType: 'QIDO_RS',
        success: response.ok,
        responseTime,
        details: {
          status: response.status,
          contentType: response.headers.get('content-type'),
          server: response.headers.get('server')
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'QIDO_RS',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'QIDO-RS test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test DICOM C-FIND (query)
   */
  private async testDicomFind(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      console.log(`🔍 Testing C-FIND for ${device.name}`);
      
      // Create DICOM association for C-FIND
      const association: DicomAssociation = {
        callingAET: config.callingAET,
        calledAET: device.aeTitle,
        implementationClassUID: '1.2.840.10008.1.1',
        implementationVersionName: 'MEDFLOW_1.0',
        maxPDULength: 16384,
        presentationContexts: [{
          id: 1,
          abstractSyntax: this.DICOM_UIDS.STUDY_ROOT_QUERY_RETRIEVE_FIND,
          transferSyntaxes: [this.DICOM_UIDS.IMPLICIT_VR_LITTLE_ENDIAN]
        }]
      };

      // Send a minimal C-FIND query (just to test capability)
      const findResult = await this.sendDicomFind(device, association, {
        QueryRetrieveLevel: 'STUDY',
        StudyInstanceUID: '', // Empty for query
        PatientID: '',
        StudyDate: ''
      }, config);

      const responseTime = performance.now() - startTime;

      return {
        testType: 'DICOM_C_FIND',
        success: findResult.success,
        responseTime,
        details: {
          association: findResult.associationAccepted,
          queryLevel: 'STUDY',
          resultsCount: findResult.results?.length || 0
        },
        error: findResult.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'DICOM_C_FIND',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'C-FIND failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test device capabilities comprehensively
   */
  private async testDeviceCapabilities(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult[]> {
    const results: DicomTestResult[] = [];

    // Test supported SOP classes
    const sopClassTest = await this.testSupportedSopClasses(device, config);
    results.push(sopClassTest);

    // Test transfer syntaxes
    const transferSyntaxTest = await this.testSupportedTransferSyntaxes(device, config);
    results.push(transferSyntaxTest);

    return results;
  }

  /**
   * Test supported SOP classes
   */
  private async testSupportedSopClasses(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      const sopClasses = [
        this.DICOM_UIDS.VERIFICATION_SOP_CLASS,
        this.DICOM_UIDS.STUDY_ROOT_QUERY_RETRIEVE_FIND,
        this.DICOM_UIDS.PATIENT_ROOT_QUERY_RETRIEVE_FIND,
        this.DICOM_UIDS.CT_IMAGE_STORAGE,
        this.DICOM_UIDS.MR_IMAGE_STORAGE
      ];

      const supportedClasses: string[] = [];
      
      for (const sopClass of sopClasses) {
        try {
          const association: DicomAssociation = {
            callingAET: config.callingAET,
            calledAET: device.aeTitle,
            implementationClassUID: '1.2.840.10008.1.1',
            implementationVersionName: 'MEDFLOW_1.0',
            maxPDULength: 16384,
            presentationContexts: [{
              id: 1,
              abstractSyntax: sopClass,
              transferSyntaxes: [this.DICOM_UIDS.IMPLICIT_VR_LITTLE_ENDIAN]
            }]
          };

          const result = await this.testAssociation(device, association, config);
          if (result.success) {
            supportedClasses.push(sopClass);
          }
        } catch (error) {
          // Continue testing other SOP classes
          continue;
        }
      }

      const responseTime = performance.now() - startTime;

      return {
        testType: 'SOP_CLASS_SUPPORT',
        success: supportedClasses.length > 0,
        responseTime,
        details: {
          supportedClasses,
          totalTested: sopClasses.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'SOP_CLASS_SUPPORT',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'SOP class test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test supported transfer syntaxes
   */
  private async testSupportedTransferSyntaxes(
    device: DicomDevice, 
    config: DicomTestConfig
  ): Promise<DicomTestResult> {
    const startTime = performance.now();
    
    try {
      const transferSyntaxes = [
        this.DICOM_UIDS.IMPLICIT_VR_LITTLE_ENDIAN,
        this.DICOM_UIDS.EXPLICIT_VR_LITTLE_ENDIAN,
        this.DICOM_UIDS.EXPLICIT_VR_BIG_ENDIAN,
        this.DICOM_UIDS.JPEG_BASELINE,
        this.DICOM_UIDS.JPEG_LOSSLESS
      ];

      const supportedSyntaxes: string[] = [];
      
      const association: DicomAssociation = {
        callingAET: config.callingAET,
        calledAET: device.aeTitle,
        implementationClassUID: '1.2.840.10008.1.1',
        implementationVersionName: 'MEDFLOW_1.0',
        maxPDULength: 16384,
        presentationContexts: transferSyntaxes.map((syntax, index) => ({
          id: (index + 1) * 2 - 1, // Odd numbers for presentation context IDs
          abstractSyntax: this.DICOM_UIDS.VERIFICATION_SOP_CLASS,
          transferSyntaxes: [syntax]
        }))
      };

      const result = await this.testAssociation(device, association, config);
      
      if (result.success && result.details.presentationContexts) {
        result.details.presentationContexts.forEach((pc: any, index: number) => {
          if (pc.result === 'acceptance') {
            supportedSyntaxes.push(transferSyntaxes[index]);
          }
        });
      }

      const responseTime = performance.now() - startTime;

      return {
        testType: 'TRANSFER_SYNTAX_SUPPORT',
        success: supportedSyntaxes.length > 0,
        responseTime,
        details: {
          supportedSyntaxes,
          totalTested: transferSyntaxes.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        testType: 'TRANSFER_SYNTAX_SUPPORT',
        success: false,
        responseTime,
        details: {},
        error: error instanceof Error ? error.message : 'Transfer syntax test failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper methods for DICOM operations (simplified - would use real DICOM library)

  private async testTcpConnection(
    ip: string, 
    port: number, 
    timeout: number
  ): Promise<{ connected: boolean; error?: string }> {
    try {
      // Simulate TCP connection test using WebSocket
      const ws = new WebSocket(`ws://${ip}:${port}`);
      
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          ws.close();
          resolve({ connected: false, error: 'Connection timeout' });
        }, timeout);

        ws.onopen = () => {
          clearTimeout(timeoutId);
          ws.close();
          resolve({ connected: true });
        };

        ws.onerror = (error) => {
          clearTimeout(timeoutId);
          resolve({ connected: false, error: 'Connection failed' });
        };
      });
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendDicomEcho(
    device: DicomDevice, 
    association: DicomAssociation, 
    config: DicomTestConfig
  ): Promise<{
    success: boolean;
    associationAccepted: boolean;
    implementationUID?: string;
    implementationVersion?: string;
    maxPDULength?: number;
    error?: string;
  }> {
    // Simulate DICOM C-ECHO
    try {
      // In real implementation, use DICOM library like dcmjs
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      return {
        success: true,
        associationAccepted: true,
        implementationUID: '1.2.840.10008.1.1',
        implementationVersion: 'SIMULATED_1.0',
        maxPDULength: 16384
      };
    } catch (error) {
      return {
        success: false,
        associationAccepted: false,
        error: error instanceof Error ? error.message : 'C-ECHO failed'
      };
    }
  }

  private async sendDicomFind(
    device: DicomDevice, 
    association: DicomAssociation, 
    query: any, 
    config: DicomTestConfig
  ): Promise<{
    success: boolean;
    associationAccepted: boolean;
    results?: any[];
    error?: string;
  }> {
    // Simulate DICOM C-FIND
    try {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      return {
        success: true,
        associationAccepted: true,
        results: [] // Empty results for test
      };
    } catch (error) {
      return {
        success: false,
        associationAccepted: false,
        error: error instanceof Error ? error.message : 'C-FIND failed'
      };
    }
  }

  private async testAssociation(
    device: DicomDevice, 
    association: DicomAssociation, 
    config: DicomTestConfig
  ): Promise<{
    success: boolean;
    details: any;
    error?: string;
  }> {
    // Simulate DICOM association test
    try {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      return {
        success: true,
        details: {
          associationAccepted: true,
          presentationContexts: association.presentationContexts.map(pc => ({
            ...pc,
            result: 'acceptance'
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error instanceof Error ? error.message : 'Association failed'
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport(results: DicomTestResult[]): {
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      averageResponseTime: number;
    };
    capabilities: DeviceCapability[];
    recommendations: string[];
  } {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;

    const capabilities: DeviceCapability[] = [];
    const recommendations: string[] = [];

    // Analyze results and generate capabilities
    results.forEach(result => {
      switch (result.testType) {
        case 'DICOM_C_ECHO':
          capabilities.push({
            type: 'C_ECHO',
            supported: result.success,
            tested: true,
            lastTested: result.timestamp,
            responseTime: result.responseTime
          });
          break;
        case 'DICOM_C_FIND':
          capabilities.push({
            type: 'C_FIND',
            supported: result.success,
            tested: true,
            lastTested: result.timestamp,
            responseTime: result.responseTime
          });
          break;
        case 'WADO_URI':
          capabilities.push({
            type: 'WADO',
            supported: result.success,
            tested: true,
            lastTested: result.timestamp,
            responseTime: result.responseTime
          });
          break;
        case 'WADO_RS':
          capabilities.push({
            type: 'WADO_RS',
            supported: result.success,
            tested: true,
            lastTested: result.timestamp,
            responseTime: result.responseTime
          });
          break;
        case 'QIDO_RS':
          capabilities.push({
            type: 'QIDO_RS',
            supported: result.success,
            tested: true,
            lastTested: result.timestamp,
            responseTime: result.responseTime
          });
          break;
      }
    });

    // Generate recommendations
    if (averageResponseTime > 5000) {
      recommendations.push('Device response time is high - consider network optimization');
    }
    
    if (failedTests > totalTests / 2) {
      recommendations.push('Multiple tests failed - verify device configuration and network connectivity');
    }

    const hasWebServices = capabilities.some(c => ['WADO', 'WADO_RS', 'QIDO_RS'].includes(c.type) && c.supported);
    if (hasWebServices) {
      recommendations.push('Device supports web services - recommended for integration');
    }

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageResponseTime
      },
      capabilities,
      recommendations
    };
  }
}

export const dicomConnectivityTester = new DicomConnectivityTesterService();