import { uploadProgressManager, ProgressUpdate } from '../uploadProgressManager';

describe('UploadProgressManager', () => {
  beforeEach(() => {
    uploadProgressManager.clearAllUploads();
  });

  describe('trackUpload', () => {
    it('should start tracking an upload', async () => {
      const uploadId = 'test-upload-1';
      const fileName = 'test.dcm';
      const fileSize = 1024 * 1024; // 1MB

      await uploadProgressManager.trackUpload(uploadId, fileName, fileSize);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status).toBeTruthy();
      expect(status?.fileName).toBe(fileName);
      expect(status?.fileSize).toBe(fileSize);
      expect(status?.status).toBe('active');
      expect(status?.currentStage).toBe('preparing');
      expect(status?.overallProgress).toBeGreaterThanOrEqual(0);
    });

    it('should include metadata when provided', async () => {
      const uploadId = 'test-upload-2';
      const fileName = 'test.dcm';
      const fileSize = 1024;
      const metadata = {
        patientId: 'PAT001',
        description: 'Test upload',
        attempts: 2
      };

      await uploadProgressManager.trackUpload(uploadId, fileName, fileSize, metadata);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.metadata?.patientId).toBe('PAT001');
      expect(status?.metadata?.description).toBe('Test upload');
      expect(status?.metadata?.attempts).toBe(2);
    });
  });

  describe('updateProgress', () => {
    it('should update upload progress', async () => {
      const uploadId = 'test-upload-3';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      const progressUpdate: ProgressUpdate = {
        bytesUploaded: 512,
        totalBytes: 1024,
        stage: 'uploading',
        message: 'Uploading...',
        timestamp: new Date()
      };

      await uploadProgressManager.updateProgress(uploadId, progressUpdate);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.currentStage).toBe('uploading');
      expect(status?.overallProgress).toBeGreaterThan(5); // Should be more than preparing stage
      expect(status?.progressHistory).toHaveLength(2); // Initial + update
    });

    it('should calculate upload speed', async () => {
      const uploadId = 'test-upload-4';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 10));

      const progressUpdate: ProgressUpdate = {
        bytesUploaded: 512,
        totalBytes: 1024,
        stage: 'uploading',
        message: 'Uploading...',
        timestamp: new Date()
      };

      await uploadProgressManager.updateProgress(uploadId, progressUpdate);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      const lastUpdate = status?.progressHistory[status.progressHistory.length - 1];
      expect(lastUpdate?.speed).toBeGreaterThan(0);
    });

    it('should calculate estimated time remaining', async () => {
      const uploadId = 'test-upload-5';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      await new Promise(resolve => setTimeout(resolve, 10));

      const progressUpdate: ProgressUpdate = {
        bytesUploaded: 256,
        totalBytes: 1024,
        stage: 'uploading',
        message: 'Uploading...',
        timestamp: new Date()
      };

      await uploadProgressManager.updateProgress(uploadId, progressUpdate);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      const lastUpdate = status?.progressHistory[status.progressHistory.length - 1];
      expect(lastUpdate?.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('completeUpload', () => {
    it('should complete upload successfully', async () => {
      const uploadId = 'test-upload-6';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      await uploadProgressManager.completeUpload(uploadId, true);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.status).toBe('completed');
      expect(status?.endTime).toBeTruthy();
      expect(status?.duration).toBeGreaterThan(0);
    });

    it('should handle failed upload', async () => {
      const uploadId = 'test-upload-7';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      await uploadProgressManager.completeUpload(uploadId, false);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.status).toBe('failed');
    });

    it('should generate performance metrics', async () => {
      const uploadId = 'test-upload-8';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      // Add some progress updates
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: 512,
        totalBytes: 1024,
        stage: 'uploading',
        message: 'Uploading...',
        timestamp: new Date()
      });

      await uploadProgressManager.completeUpload(uploadId, true);

      const metrics = uploadProgressManager.getUploadMetrics(uploadId);
      expect(metrics).toBeTruthy();
      expect(metrics?.uploadId).toBe(uploadId);
      expect(metrics?.fileName).toBe('test.dcm');
      expect(metrics?.fileSize).toBe(1024);
      expect(metrics?.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('cancelUpload', () => {
    it('should cancel an upload', async () => {
      const uploadId = 'test-upload-9';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);

      await uploadProgressManager.cancelUpload(uploadId);

      const status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.status).toBe('cancelled');
      expect(status?.currentStage).toBe('error');
    });
  });

  describe('getActiveUploads', () => {
    it('should return all active uploads', async () => {
      await uploadProgressManager.trackUpload('upload-1', 'file1.dcm', 1024);
      await uploadProgressManager.trackUpload('upload-2', 'file2.dcm', 2048);

      const activeUploads = uploadProgressManager.getActiveUploads();
      expect(activeUploads).toHaveLength(2);
      expect(activeUploads.map(u => u.uploadId)).toContain('upload-1');
      expect(activeUploads.map(u => u.uploadId)).toContain('upload-2');
    });
  });

  describe('getAggregateMetrics', () => {
    it('should calculate aggregate metrics', async () => {
      // Create and complete some uploads
      await uploadProgressManager.trackUpload('upload-1', 'file1.dcm', 1024);
      await uploadProgressManager.completeUpload('upload-1', true);

      await uploadProgressManager.trackUpload('upload-2', 'file2.dcm', 2048);
      await uploadProgressManager.completeUpload('upload-2', false);

      const metrics = uploadProgressManager.getAggregateMetrics();
      expect(metrics.totalUploads).toBe(2);
      expect(metrics.successfulUploads).toBe(1);
      expect(metrics.failedUploads).toBe(1);
      expect(metrics.totalDataTransferred).toBe(1024); // Only successful upload
    });
  });

  describe('subscription callbacks', () => {
    it('should call progress callbacks', async () => {
      const uploadId = 'test-upload-10';
      const progressCallback = jest.fn();

      const unsubscribe = uploadProgressManager.subscribeToProgress(uploadId, progressCallback);

      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);
      
      expect(progressCallback).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should call status callbacks', async () => {
      const uploadId = 'test-upload-11';
      const statusCallback = jest.fn();

      const unsubscribe = uploadProgressManager.subscribeToStatus(uploadId, statusCallback);

      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);
      
      expect(statusCallback).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should call metrics callbacks on completion', async () => {
      const uploadId = 'test-upload-12';
      const metricsCallback = jest.fn();

      const unsubscribe = uploadProgressManager.subscribeToMetrics(uploadId, metricsCallback);

      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);
      await uploadProgressManager.completeUpload(uploadId, true);
      
      expect(metricsCallback).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should call global status callbacks', async () => {
      const globalCallback = jest.fn();

      const unsubscribe = uploadProgressManager.subscribeToGlobalStatus(globalCallback);

      await uploadProgressManager.trackUpload('upload-1', 'test.dcm', 1024);
      
      expect(globalCallback).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should unsubscribe callbacks properly', async () => {
      const uploadId = 'test-upload-13';
      const progressCallback = jest.fn();

      const unsubscribe = uploadProgressManager.subscribeToProgress(uploadId, progressCallback);
      unsubscribe();

      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1024);
      
      // Callback should not be called after unsubscribe
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('clearCompletedUploads', () => {
    it('should clear completed uploads', async () => {
      await uploadProgressManager.trackUpload('upload-1', 'file1.dcm', 1024);
      await uploadProgressManager.completeUpload('upload-1', true);

      await uploadProgressManager.trackUpload('upload-2', 'file2.dcm', 1024);
      // Leave upload-2 active

      uploadProgressManager.clearCompletedUploads();

      const activeUploads = uploadProgressManager.getActiveUploads();
      expect(activeUploads).toHaveLength(1);
      expect(activeUploads[0].uploadId).toBe('upload-2');
    });
  });

  describe('clearAllUploads', () => {
    it('should clear all uploads', async () => {
      await uploadProgressManager.trackUpload('upload-1', 'file1.dcm', 1024);
      await uploadProgressManager.trackUpload('upload-2', 'file2.dcm', 1024);

      uploadProgressManager.clearAllUploads();

      const activeUploads = uploadProgressManager.getActiveUploads();
      expect(activeUploads).toHaveLength(0);
    });
  });

  describe('progress calculations', () => {
    it('should calculate overall progress correctly for different stages', async () => {
      const uploadId = 'test-upload-14';
      await uploadProgressManager.trackUpload(uploadId, 'test.dcm', 1000);

      // Test preparing stage
      let status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.overallProgress).toBeLessThanOrEqual(5);

      // Test uploading stage
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: 500,
        totalBytes: 1000,
        stage: 'uploading',
        message: 'Uploading...',
        timestamp: new Date()
      });

      status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.overallProgress).toBeGreaterThan(5);
      expect(status?.overallProgress).toBeLessThan(90);

      // Test processing stage
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: 1000,
        totalBytes: 1000,
        stage: 'processing',
        message: 'Processing...',
        timestamp: new Date()
      });

      status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.overallProgress).toBeGreaterThanOrEqual(90);
      expect(status?.overallProgress).toBeLessThan(100);

      // Test complete stage
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: 1000,
        totalBytes: 1000,
        stage: 'complete',
        message: 'Complete!',
        timestamp: new Date()
      });

      status = uploadProgressManager.getUploadStatus(uploadId);
      expect(status?.overallProgress).toBe(100);
    });

    it('should detect file types correctly', async () => {
      const testCases = [
        { fileName: 'test.dcm', expectedType: 'DICOM' },
        { fileName: 'test.dicom', expectedType: 'DICOM' },
        { fileName: 'report.pdf', expectedType: 'PDF' },
        { fileName: 'image.jpg', expectedType: 'JPEG' },
        { fileName: 'image.png', expectedType: 'PNG' },
        { fileName: 'notes.txt', expectedType: 'Text' },
        { fileName: 'unknown.xyz', expectedType: 'Unknown' }
      ];

      for (const testCase of testCases) {
        await uploadProgressManager.trackUpload(
          `upload-${testCase.fileName}`,
          testCase.fileName,
          1024
        );

        const status = uploadProgressManager.getUploadStatus(`upload-${testCase.fileName}`);
        expect(status?.metadata?.fileType).toBe(testCase.expectedType);
      }
    });
  });
});