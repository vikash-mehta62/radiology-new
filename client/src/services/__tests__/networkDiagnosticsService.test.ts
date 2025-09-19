import { networkDiagnosticsService } from '../networkDiagnosticsService';
import { apiService } from '../api';

// Mock the API service
jest.mock('../api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('NetworkDiagnosticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    networkDiagnosticsService.clearDiagnosticData();
  });

  describe('checkBackendConnectivity', () => {
    it('should return connected status when backend is healthy', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0',
        services: { database: 'connected' }
      });

      const result = await networkDiagnosticsService.checkBackendConnectivity();

      expect(result.isConnected).toBe(true);
      expect(result.serverVersion).toBe('1.0.0');
      expect(result.corsEnabled).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should return disconnected status when backend is unreachable', async () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      mockedApiService.healthCheck.mockRejectedValue(error);

      const result = await networkDiagnosticsService.checkBackendConnectivity();

      expect(result.isConnected).toBe(false);
      expect(result.errors).toContain('Backend server is not running or not accessible');
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Timeout');
      (error as any).code = 'ECONNABORTED';
      mockedApiService.healthCheck.mockRejectedValue(error);

      const result = await networkDiagnosticsService.checkBackendConnectivity();

      expect(result.isConnected).toBe(false);
      expect(result.errors).toContain('Connection timed out');
    });

    it('should handle DNS resolution errors', async () => {
      const error = new Error('Not found');
      (error as any).code = 'ENOTFOUND';
      mockedApiService.healthCheck.mockRejectedValue(error);

      const result = await networkDiagnosticsService.checkBackendConnectivity();

      expect(result.isConnected).toBe(false);
      expect(result.errors).toContain('Backend server hostname cannot be resolved');
    });
  });

  describe('performUploadPrecheck', () => {
    it('should allow upload when all checks pass', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0'
      });

      mockedApiService.uploadHealthCheck.mockResolvedValue({
        upload_config: {
          max_file_size: '100MB',
          supported_formats: ['dcm', 'dicom', 'pdf'],
          timeout: '60s'
        }
      });

      const fileSize = 10 * 1024 * 1024; // 10MB
      const result = await networkDiagnosticsService.performUploadPrecheck(fileSize);

      expect(result.canUpload).toBe(true);
      expect(result.maxFileSize).toBe(100 * 1024 * 1024);
      expect(result.supportedFormats).toContain('dcm');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject upload when file is too large', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0'
      });

      mockedApiService.uploadHealthCheck.mockResolvedValue({
        upload_config: {
          max_file_size: '50MB',
          supported_formats: ['dcm', 'dicom'],
          timeout: '60s'
        }
      });

      const fileSize = 100 * 1024 * 1024; // 100MB
      const result = await networkDiagnosticsService.performUploadPrecheck(fileSize);

      expect(result.canUpload).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum allowed size'));
    });

    it('should warn about large files near the limit', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0'
      });

      mockedApiService.uploadHealthCheck.mockResolvedValue({
        upload_config: {
          max_file_size: '100MB',
          supported_formats: ['dcm'],
          timeout: '60s'
        }
      });

      const fileSize = 90 * 1024 * 1024; // 90MB (90% of limit)
      const result = await networkDiagnosticsService.performUploadPrecheck(fileSize);

      expect(result.canUpload).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('close to the maximum limit'));
    });

    it('should handle backend connectivity failure', async () => {
      mockedApiService.healthCheck.mockRejectedValue(new Error('Connection failed'));

      const fileSize = 10 * 1024 * 1024;
      const result = await networkDiagnosticsService.performUploadPrecheck(fileSize);

      expect(result.canUpload).toBe(false);
      expect(result.errors).toContain('Backend is not accessible');
    });

    it('should use fallback config when upload health endpoint fails', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0'
      });

      mockedApiService.uploadHealthCheck.mockRejectedValue(new Error('Endpoint not found'));

      const fileSize = 10 * 1024 * 1024;
      const result = await networkDiagnosticsService.performUploadPrecheck(fileSize);

      expect(result.canUpload).toBe(true);
      expect(result.warnings).toContain('Upload health endpoint not available, using default configuration');
      expect(result.maxFileSize).toBe(100 * 1024 * 1024); // Default 100MB
    });
  });

  describe('monitorUploadHealth', () => {
    it('should return health metrics', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0'
      });

      const result = await networkDiagnosticsService.monitorUploadHealth('test-upload-id');

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(1);
      expect(result.errorCount).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle monitoring errors', async () => {
      mockedApiService.healthCheck.mockRejectedValue(new Error('Monitoring failed'));

      const result = await networkDiagnosticsService.monitorUploadHealth('test-upload-id');

      expect(result.successRate).toBe(0);
      expect(result.lastError).toBe('Monitoring failed');
    });
  });

  describe('getDiagnosticReport', () => {
    it('should generate comprehensive diagnostic report', async () => {
      mockedApiService.healthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0',
        services: { database: 'connected' }
      });

      mockedApiService.uploadHealthCheck.mockResolvedValue({
        status: 'healthy'
      });

      const report = await networkDiagnosticsService.getDiagnosticReport();

      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.connectivity).toBeDefined();
      expect(report.systemHealth).toBeDefined();
      expect(report.systemHealth.backend).toBe(true);
      expect(report.systemHealth.database).toBe(true);
      expect(report.systemHealth.uploadService).toBe(true);
      expect(report.recentErrors).toBeInstanceOf(Array);
      expect(report.performanceMetrics).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should include recommendations when issues are detected', async () => {
      mockedApiService.healthCheck.mockRejectedValue(new Error('Connection failed'));

      const report = await networkDiagnosticsService.getDiagnosticReport();

      expect(report.connectivity.isConnected).toBe(false);
      expect(report.systemHealth.backend).toBe(false);
      expect(report.recommendations).toContain('Check if the backend server is running and accessible');
    });
  });

  describe('validateUploadEndpoints', () => {
    it('should validate available endpoints', async () => {
      mockedApiService.healthCheck.mockResolvedValue({ status: 'healthy' });
      mockedApiService.uploadHealthCheck.mockResolvedValue({ status: 'healthy' });

      const result = await networkDiagnosticsService.validateUploadEndpoints();

      expect(result['/health']).toBe(true);
      expect(result['/upload/health']).toBe(true);
      expect(result).toHaveProperty('/patients/PAT001/upload/dicom');
      expect(result).toHaveProperty('/patients/PAT001/upload');
    });

    it('should mark endpoints as failed when they are not accessible', async () => {
      mockedApiService.healthCheck.mockRejectedValue(new Error('Not found'));
      mockedApiService.uploadHealthCheck.mockRejectedValue(new Error('Not found'));

      const result = await networkDiagnosticsService.validateUploadEndpoints();

      expect(result['/health']).toBe(false);
      expect(result['/upload/health']).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should clear diagnostic data', () => {
      // Add some data first
      networkDiagnosticsService.clearDiagnosticData();
      
      const errorLog = networkDiagnosticsService.getErrorLog();
      const performanceData = networkDiagnosticsService.getPerformanceData();

      expect(errorLog).toHaveLength(0);
      expect(performanceData).toHaveLength(0);
    });

    it('should track error logs', async () => {
      mockedApiService.healthCheck.mockRejectedValue(new Error('Test error'));

      await networkDiagnosticsService.checkBackendConnectivity();

      const errorLog = networkDiagnosticsService.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[0].message).toBe('Test error');
      expect(errorLog[0].type).toBe('connectivity');
    });

    it('should track performance data', async () => {
      mockedApiService.healthCheck.mockResolvedValue({ status: 'healthy' });

      await networkDiagnosticsService.checkBackendConnectivity();

      const performanceData = networkDiagnosticsService.getPerformanceData();
      expect(performanceData.length).toBeGreaterThan(0);
      expect(performanceData[0].success).toBe(true);
      expect(performanceData[0].responseTime).toBeGreaterThan(0);
    });
  });
});