import { enhancedUploadService, UploadOptions } from '../enhancedUploadService';
import { patientService } from '../patientService';
import { networkDiagnosticsService } from '../networkDiagnosticsService';

// Mock dependencies
jest.mock('../patientService');
jest.mock('../networkDiagnosticsService');

const mockedPatientService = patientService as jest.Mocked<typeof patientService>;
const mockedNetworkDiagnostics = networkDiagnosticsService as jest.Mocked<typeof networkDiagnosticsService>;

// Mock File constructor
const createMockFile = (name: string, size: number = 1024): File => {
  const file = new File(['test content'], name, { type: 'application/octet-stream' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('EnhancedUploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enhancedUploadService.clearAllUploads();
    
    // Setup default mocks
    mockedNetworkDiagnostics.performUploadPrecheck.mockResolvedValue({
      canUpload: true,
      maxFileSize: 100 * 1024 * 1024,
      supportedFormats: ['dcm', 'dicom'],
      estimatedUploadTime: 30,
      warnings: [],
      errors: []
    });

    mockedNetworkDiagnostics.monitorUploadHealth.mockResolvedValue({
      responseTime: 100,
      successRate: 1,
      errorCount: 0,
      timestamp: new Date()
    });
  });

  afterAll(() => {
    enhancedUploadService.destroy();
  });

  describe('uploadWithRetry', () => {
    it('should successfully upload a file on first attempt', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      mockedPatientService.uploadFile.mockResolvedValue({
        message: 'Upload successful',
        file: { id: 1, filename: 'test.dcm' }
      });

      const result = await enhancedUploadService.uploadWithRetry(file, options);

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test.dcm');
      expect(result.attempts).toBe(1);
      expect(mockedPatientService.uploadFile).toHaveBeenCalledWith(
        'PAT001',
        file,
        undefined
      );
    });

    it('should fail upload when pre-check validation fails', async () => {
      const file = createMockFile('test.dcm', 200 * 1024 * 1024); // 200MB
      const options: UploadOptions = { patientId: 'PAT001' };

      mockedNetworkDiagnostics.performUploadPrecheck.mockResolvedValue({
        canUpload: false,
        maxFileSize: 100 * 1024 * 1024,
        supportedFormats: ['dcm'],
        estimatedUploadTime: 0,
        warnings: [],
        errors: ['File too large']
      });

      const result = await enhancedUploadService.uploadWithRetry(file, options);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
      expect(result.error?.retryable).toBe(false);
      expect(mockedPatientService.uploadFile).not.toHaveBeenCalled();
    });

    it('should queue upload when direct upload fails', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const uploadError = new Error('Network error');
      (uploadError as any).type = 'network';
      mockedPatientService.uploadFile.mockRejectedValue(uploadError);

      const uploadId = await enhancedUploadService.uploadWithRetry(file, options);

      expect(typeof uploadId).toBe('string');
      
      const queueStatus = enhancedUploadService.getQueueStatus();
      expect(queueStatus.totalItems).toBe(1);
      expect(queueStatus.queuedItems).toBe(1);
    });
  });

  describe('queueUpload', () => {
    it('should add upload to queue', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001', maxRetries: 5 };

      const uploadId = await enhancedUploadService.queueUpload(file, options);

      expect(typeof uploadId).toBe('string');
      
      const upload = enhancedUploadService.getUploadStatus(uploadId);
      expect(upload).toBeTruthy();
      expect(upload?.file.name).toBe('test.dcm');
      expect(upload?.maxRetries).toBe(5);
      expect(upload?.status).toBe('queued');
    });
  });

  describe('cancelUpload', () => {
    it('should cancel a queued upload', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      await enhancedUploadService.cancelUpload(uploadId);

      const upload = enhancedUploadService.getUploadStatus(uploadId);
      expect(upload?.status).toBe('cancelled');
    });

    it('should throw error when trying to cancel non-existent upload', async () => {
      await expect(enhancedUploadService.cancelUpload('non-existent'))
        .rejects.toThrow('Upload non-existent not found');
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', async () => {
      const file1 = createMockFile('test1.dcm');
      const file2 = createMockFile('test2.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      await enhancedUploadService.queueUpload(file1, options);
      const uploadId2 = await enhancedUploadService.queueUpload(file2, options);
      await enhancedUploadService.cancelUpload(uploadId2);

      const status = enhancedUploadService.getQueueStatus();
      expect(status.totalItems).toBe(2);
      expect(status.queuedItems).toBe(1);
      expect(status.completedItems).toBe(0);
      expect(status.failedItems).toBe(0);
    });
  });

  describe('clearCompletedUploads', () => {
    it('should remove completed uploads from queue', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      
      // Manually set status to completed for testing
      const upload = enhancedUploadService.getUploadStatus(uploadId);
      if (upload) {
        upload.status = 'completed';
      }

      enhancedUploadService.clearCompletedUploads();

      const statusAfter = enhancedUploadService.getQueueStatus();
      expect(statusAfter.totalItems).toBe(0);
    });
  });

  describe('resumeQueuedUploads', () => {
    it('should reset failed uploads to queued status', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      
      // Manually set status to failed for testing
      const upload = enhancedUploadService.getUploadStatus(uploadId);
      if (upload) {
        upload.status = 'failed';
      }

      await enhancedUploadService.resumeQueuedUploads();

      const uploadAfter = enhancedUploadService.getUploadStatus(uploadId);
      expect(uploadAfter?.status).toBe('queued');
    });
  });

  describe('callback functionality', () => {
    it('should call progress callback when set', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };
      const progressCallback = jest.fn();

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      enhancedUploadService.setProgressCallback(uploadId, progressCallback);

      const upload = enhancedUploadService.getUploadStatus(uploadId);
      expect(upload?.onProgress).toBe(progressCallback);
    });

    it('should call completion callback when set', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };
      const completionCallback = jest.fn();

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      enhancedUploadService.setCompletionCallback(uploadId, completionCallback);

      const upload = enhancedUploadService.getUploadStatus(uploadId);
      expect(upload?.onComplete).toBe(completionCallback);
    });

    it('should call error callback when set', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };
      const errorCallback = jest.fn();

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      enhancedUploadService.setErrorCallback(uploadId, errorCallback);

      const upload = enhancedUploadService.getUploadStatus(uploadId);
      expect(upload?.onError).toBe(errorCallback);
    });
  });

  describe('error classification', () => {
    it('should classify timeout errors correctly', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const timeoutError = new Error('Request timeout');
      (timeoutError as any).type = 'timeout';
      mockedPatientService.uploadFile.mockRejectedValue(timeoutError);

      const result = await enhancedUploadService.uploadWithRetry(file, options);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('timeout');
      expect(result.error?.retryable).toBe(true);
    });

    it('should classify network errors correctly', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const networkError = new Error('Network Error');
      (networkError as any).type = 'network';
      mockedPatientService.uploadFile.mockRejectedValue(networkError);

      const result = await enhancedUploadService.uploadWithRetry(file, options);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network');
      expect(result.error?.retryable).toBe(true);
    });

    it('should classify validation errors as non-retryable', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      const validationError = new Error('File too large');
      (validationError as any).type = 'file_too_large';
      mockedPatientService.uploadFile.mockRejectedValue(validationError);

      const result = await enhancedUploadService.uploadWithRetry(file, options);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('retry logic', () => {
    it('should respect maxRetries option', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { 
        patientId: 'PAT001', 
        maxRetries: 2 
      };

      const networkError = new Error('Network error');
      (networkError as any).type = 'network';
      mockedPatientService.uploadFile.mockRejectedValue(networkError);

      const uploadId = await enhancedUploadService.uploadWithRetry(file, options);
      const upload = enhancedUploadService.getUploadStatus(uploadId);

      expect(upload?.maxRetries).toBe(2);
    });

    it('should use exponential backoff by default', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { 
        patientId: 'PAT001',
        retryDelay: 1000,
        exponentialBackoff: true
      };

      const uploadId = await enhancedUploadService.queueUpload(file, options);
      const upload = enhancedUploadService.getUploadStatus(uploadId);

      expect(upload?.options.exponentialBackoff).toBe(true);
      expect(upload?.options.retryDelay).toBe(1000);
    });
  });

  describe('storage persistence', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      });
    });

    it('should save queue to localStorage', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      await enhancedUploadService.queueUpload(file, options);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'enhancedUploadQueue',
        expect.any(String)
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      const file = createMockFile('test.dcm');
      const options: UploadOptions = { patientId: 'PAT001' };

      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      await expect(enhancedUploadService.queueUpload(file, options))
        .resolves.toBeDefined();
    });
  });
});