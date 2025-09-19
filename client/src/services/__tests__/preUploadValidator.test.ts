import { preUploadValidator } from '../preUploadValidator';
import { networkDiagnosticsService } from '../networkDiagnosticsService';
import { apiService } from '../api';

// Mock dependencies
jest.mock('../networkDiagnosticsService');
jest.mock('../api');

const mockedNetworkDiagnostics = networkDiagnosticsService as jest.Mocked<typeof networkDiagnosticsService>;
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock File constructor
const createMockFile = (name: string, size: number = 1024, type: string = 'application/octet-stream'): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock browser APIs
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest.fn().mockResolvedValue({
      usage: 50 * 1024 * 1024, // 50MB used
      quota: 1024 * 1024 * 1024 // 1GB total
    })
  },
  writable: true
});

Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB
  },
  writable: true
});

describe('PreUploadValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockedNetworkDiagnostics.checkBackendConnectivity.mockResolvedValue({
      isConnected: true,
      latency: 100,
      serverVersion: '1.0.0',
      corsEnabled: true,
      errors: []
    });

    mockedApiService.uploadHealthCheck.mockResolvedValue({
      status: 'healthy'
    });

    mockedApiService.testConnectivity.mockResolvedValue({
      connected: true,
      latency: 100
    });
  });

  describe('validateUploadReadiness', () => {
    it('should validate successful upload readiness', async () => {
      const files = [
        createMockFile('test1.dcm', 1024 * 1024), // 1MB DICOM
        createMockFile('test2.pdf', 512 * 1024)   // 512KB PDF
      ];

      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.readinessScore).toBeGreaterThan(60);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.estimatedUploadTime).toBeGreaterThan(0);
    });

    it('should detect connectivity issues', async () => {
      mockedNetworkDiagnostics.checkBackendConnectivity.mockResolvedValue({
        isConnected: false,
        latency: 0,
        corsEnabled: false,
        errors: ['Backend server is not accessible']
      });

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.blocking)).toBe(true);
      expect(result.checks.some(c => c.category === 'connectivity' && c.status === 'failed')).toBe(true);
    });

    it('should detect file validation issues', async () => {
      const files = [
        createMockFile('oversized.dcm', 200 * 1024 * 1024), // 200MB - too large
        createMockFile('invalid.xyz', 1024) // Unsupported format
      ];

      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.id === 'oversized-files')).toBe(true);
      expect(result.errors.some(e => e.id === 'unsupported-files')).toBe(true);
    });

    it('should validate patient ID format', async () => {
      const files = [createMockFile('test.dcm', 1024)];
      
      // Invalid patient ID
      const result = await preUploadValidator.validateUploadReadiness(files, 'invalid-id');

      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.id === 'invalid-patient-id')).toBe(true);
    });

    it('should calculate readiness score correctly', async () => {
      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore).toBeLessThanOrEqual(100);
      
      // Should be high score with no issues
      expect(result.readinessScore).toBeGreaterThan(80);
    });

    it('should handle total file size limits', async () => {
      const files = [
        createMockFile('large1.dcm', 300 * 1024 * 1024), // 300MB
        createMockFile('large2.dcm', 300 * 1024 * 1024)  // 300MB - total 600MB > 500MB limit
      ];

      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.id === 'total-size-exceeded')).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      mockedNetworkDiagnostics.checkBackendConnectivity.mockResolvedValue({
        isConnected: false,
        latency: 0,
        corsEnabled: true,
        errors: ['Connection failed']
      });

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('internet connection'))).toBe(true);
    });
  });

  describe('quickConnectivityCheck', () => {
    it('should perform quick connectivity check', async () => {
      const result = await preUploadValidator.quickConnectivityCheck();

      expect(result.isConnected).toBe(true);
      expect(result.latency).toBe(100);
      expect(result.message).toContain('Connected');
    });

    it('should handle connectivity failures', async () => {
      mockedApiService.testConnectivity.mockResolvedValue({
        connected: false,
        latency: 0,
        error: 'Connection refused'
      });

      const result = await preUploadValidator.quickConnectivityCheck();

      expect(result.isConnected).toBe(false);
      expect(result.message).toContain('Connection refused');
    });
  });

  describe('validateSingleFile', () => {
    it('should validate DICOM files correctly', async () => {
      const file = createMockFile('test.dcm', 1024 * 1024);
      const result = await preUploadValidator.validateSingleFile(file);

      expect(result.isValid).toBe(true);
      expect(result.fileInfo.isDicom).toBe(true);
      expect(result.fileInfo.type).toBe('DCM');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect oversized files', async () => {
      const file = createMockFile('large.dcm', 200 * 1024 * 1024); // 200MB
      const result = await preUploadValidator.validateSingleFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('should detect unsupported file types', async () => {
      const file = createMockFile('test.xyz', 1024);
      const result = await preUploadValidator.validateSingleFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not supported'))).toBe(true);
    });

    it('should warn about files near size limit', async () => {
      const file = createMockFile('large.dcm', 85 * 1024 * 1024); // 85MB (85% of 100MB limit)
      const result = await preUploadValidator.validateSingleFile(file);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('close to the maximum'))).toBe(true);
    });

    it('should detect empty files', async () => {
      const file = createMockFile('empty.dcm', 0);
      const result = await preUploadValidator.validateSingleFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should validate file names', async () => {
      const longNameFile = createMockFile('a'.repeat(300) + '.dcm', 1024);
      const result1 = await preUploadValidator.validateSingleFile(longNameFile);

      expect(result1.isValid).toBe(false);
      expect(result1.errors.some(e => e.includes('too long'))).toBe(true);

      const specialCharsFile = createMockFile('test@#$.dcm', 1024);
      const result2 = await preUploadValidator.validateSingleFile(specialCharsFile);

      expect(result2.warnings.some(w => w.includes('special characters'))).toBe(true);
    });
  });

  describe('system validation', () => {
    it('should check browser support', async () => {
      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      const browserCheck = result.checks.find(c => c.id === 'browser-support');
      expect(browserCheck).toBeTruthy();
      expect(browserCheck?.status).toBe('passed');
    });

    it('should check storage quota', async () => {
      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      const storageCheck = result.checks.find(c => c.id === 'storage-quota');
      expect(storageCheck).toBeTruthy();
      expect(storageCheck?.message).toContain('available');
    });

    it('should warn about low storage', async () => {
      // Mock low storage
      (navigator.storage.estimate as jest.Mock).mockResolvedValue({
        usage: 980 * 1024 * 1024, // 980MB used
        quota: 1024 * 1024 * 1024  // 1GB total (96% used)
      });

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.warnings.some(w => w.id === 'low-storage')).toBe(true);
    });

    it('should check memory usage', async () => {
      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      const memoryCheck = result.checks.find(c => c.id === 'memory-usage');
      expect(memoryCheck).toBeTruthy();
    });
  });

  describe('configuration validation', () => {
    it('should validate API configuration', async () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'http://localhost:8000';

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      const apiCheck = result.checks.find(c => c.id === 'api-configuration');
      expect(apiCheck?.status).toBe('passed');

      // Restore original env
      process.env.REACT_APP_API_URL = originalEnv;
    });

    it('should detect missing API configuration', async () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      delete process.env.REACT_APP_API_URL;

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.errors.some(e => e.id === 'missing-api-url')).toBe(true);

      // Restore original env
      process.env.REACT_APP_API_URL = originalEnv;
    });
  });

  describe('upload time estimation', () => {
    it('should estimate upload time based on file size and latency', async () => {
      const files = [createMockFile('test.dcm', 10 * 1024 * 1024)]; // 10MB
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.estimatedUploadTime).toBeGreaterThan(0);
      expect(typeof result.estimatedUploadTime).toBe('number');
    });

    it('should adjust estimation based on connection quality', async () => {
      // High latency connection
      mockedNetworkDiagnostics.checkBackendConnectivity.mockResolvedValue({
        isConnected: true,
        latency: 500, // High latency
        corsEnabled: true,
        errors: []
      });

      const files = [createMockFile('test.dcm', 10 * 1024 * 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.estimatedUploadTime).toBeGreaterThan(5); // Should be slower
    });
  });

  describe('error handling', () => {
    it('should handle network diagnostics failures gracefully', async () => {
      mockedNetworkDiagnostics.checkBackendConnectivity.mockRejectedValue(
        new Error('Network diagnostics failed')
      );

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      expect(result.errors.some(e => e.id === 'connectivity-test-failed')).toBe(true);
      expect(result.canProceed).toBe(false);
    });

    it('should handle upload health check failures gracefully', async () => {
      mockedApiService.uploadHealthCheck.mockRejectedValue(
        new Error('Health check failed')
      );

      const files = [createMockFile('test.dcm', 1024)];
      const result = await preUploadValidator.validateUploadReadiness(files, 'PAT001');

      const uploadServiceCheck = result.checks.find(c => c.id === 'upload-service');
      expect(uploadServiceCheck?.status).toBe('warning');
      expect(result.warnings.some(w => w.id === 'upload-service-health')).toBe(true);
    });
  });
});