import { patientService } from './patientService';
import { networkDiagnosticsService } from './networkDiagnosticsService';
import { uploadProgressManager } from './uploadProgressManager';
import { errorHandlingService } from './errorHandlingService';
import { queueManagementService } from './queueManagementService';

// Types for enhanced upload service
export interface UploadOptions {
  patientId: string;
  description?: string;
  maxRetries?: number;
  timeout?: number;
  chunkSize?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

export interface UploadResult {
  success: boolean;
  uploadId: string;
  fileName: string;
  message: string;
  fileSize: number;
  uploadTime: number;
  attempts: number;
  error?: UploadError;
  metadata?: any;
}

export interface UploadError {
  type: 'network' | 'timeout' | 'server' | 'validation' | 'unknown';
  message: string;
  statusCode?: number;
  retryable: boolean;
  originalError?: any;
  userFriendlyError?: any; // Will be imported from errorHandlingService
}

export interface QueuedUpload {
  id: string;
  file: File;
  options: UploadOptions;
  attempts: number;
  maxRetries: number;
  status: 'queued' | 'uploading' | 'failed' | 'completed' | 'cancelled';
  lastError?: UploadError;
  createdAt: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  progress: number;
  onProgress?: (progress: number) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: UploadError) => void;
}

export interface UploadQueueStatus {
  totalItems: number;
  queuedItems: number;
  uploadingItems: number;
  completedItems: number;
  failedItems: number;
  isProcessing: boolean;
}

class EnhancedUploadService {
  private uploadQueue: Map<string, QueuedUpload> = new Map();
  private activeUploads: Set<string> = new Set();
  private maxConcurrentUploads = 3;
  private queueProcessor: NodeJS.Timeout | null = null;
  private isProcessingQueue = false;

  // Default upload options
  private defaultOptions: Partial<UploadOptions> = {
    maxRetries: 3,
    timeout: 60000,
    retryDelay: 1000,
    exponentialBackoff: true,
  };

  constructor() {
    this.startQueueProcessor();
    this.loadQueueFromStorage();
  }

  /**
   * Upload a file with retry logic and queue management
   */
  async uploadWithRetry(file: File, options: UploadOptions): Promise<UploadResult> {
    const uploadId = this.generateUploadId();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    console.log(`🚀 Starting enhanced upload for ${file.name} (ID: ${uploadId})`);

    // Pre-upload validation
    const preCheckResult = await networkDiagnosticsService.performUploadPrecheck(file.size);
    if (!preCheckResult.canUpload) {
      const error: UploadError = {
        type: 'validation',
        message: preCheckResult.errors.join('; '),
        retryable: false
      };
      
      return {
        success: false,
        uploadId,
        fileName: file.name,
        message: error.message,
        fileSize: file.size,
        uploadTime: 0,
        attempts: 0,
        error
      };
    }

    // Add warnings to console
    if (preCheckResult.warnings.length > 0) {
      console.warn(`⚠️ Upload warnings for ${file.name}:`, preCheckResult.warnings);
    }

    // Attempt direct upload first
    try {
      const result = await this.attemptUpload(file, mergedOptions, uploadId, 1);
      console.log(`✅ Direct upload successful for ${file.name}`);
      return result;
    } catch (error: any) {
      console.log(`❌ Direct upload failed for ${file.name}, adding to queue`);
      
      // Add to queue for retry processing
      const queuedUploadId = await this.queueUpload(file, mergedOptions);
      
      // Return a result indicating the upload was queued
      return {
        success: false,
        uploadId: queuedUploadId,
        fileName: file.name,
        message: 'Upload queued for retry',
        fileSize: file.size,
        uploadTime: 0,
        attempts: 0,
        error: {
          type: 'network',
          message: 'Initial upload failed, queued for retry',
          retryable: true,
          originalError: error
        }
      };
    }
  }

  /**
   * Queue an upload for retry processing
   */
  async queueUpload(file: File, options: UploadOptions): Promise<string> {
    const uploadId = this.generateUploadId();
    const mergedOptions = { ...this.defaultOptions, ...options };

    const queuedUpload: QueuedUpload = {
      id: uploadId,
      file,
      options: mergedOptions,
      attempts: 0,
      maxRetries: mergedOptions.maxRetries || 3,
      status: 'queued',
      createdAt: new Date(),
      progress: 0
    };

    this.uploadQueue.set(uploadId, queuedUpload);
    this.saveQueueToStorage();

    // Also add to the queue management service for persistence
    queueManagementService.addToQueue(
      uploadId,
      file.name,
      file.size,
      options.patientId,
      {
        description: options.description,
        maxRetries: mergedOptions.maxRetries,
        timeout: mergedOptions.timeout,
        retryDelay: mergedOptions.retryDelay,
        exponentialBackoff: mergedOptions.exponentialBackoff
      }
    );

    console.log(`📋 Queued upload ${file.name} (ID: ${uploadId})`);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return uploadId;
  }

  /**
   * Resume all queued uploads
   */
  async resumeQueuedUploads(): Promise<UploadResult[]> {
    console.log('🔄 Resuming queued uploads...');
    
    const results: UploadResult[] = [];
    const queuedUploads = Array.from(this.uploadQueue.values())
      .filter(upload => upload.status === 'queued' || upload.status === 'failed');

    for (const upload of queuedUploads) {
      upload.status = 'queued';
      upload.nextRetryAt = undefined;
    }

    this.saveQueueToStorage();
    
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return results;
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const upload = this.uploadQueue.get(uploadId);
    if (!upload) {
      throw new Error(`Upload ${uploadId} not found`);
    }

    upload.status = 'cancelled';
    this.activeUploads.delete(uploadId);
    
    console.log(`🚫 Cancelled upload ${upload.file.name} (ID: ${uploadId})`);
    
    this.saveQueueToStorage();
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId: string): QueuedUpload | null {
    return this.uploadQueue.get(uploadId) || null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): UploadQueueStatus {
    const uploads = Array.from(this.uploadQueue.values());
    
    return {
      totalItems: uploads.length,
      queuedItems: uploads.filter(u => u.status === 'queued').length,
      uploadingItems: uploads.filter(u => u.status === 'uploading').length,
      completedItems: uploads.filter(u => u.status === 'completed').length,
      failedItems: uploads.filter(u => u.status === 'failed').length,
      isProcessing: this.isProcessingQueue
    };
  }

  /**
   * Clear completed uploads from queue
   */
  clearCompletedUploads(): void {
    const completedIds: string[] = [];
    
    for (const [id, upload] of this.uploadQueue.entries()) {
      if (upload.status === 'completed') {
        completedIds.push(id);
      }
    }

    completedIds.forEach(id => this.uploadQueue.delete(id));
    this.saveQueueToStorage();
    
    console.log(`🧹 Cleared ${completedIds.length} completed uploads`);
  }

  /**
   * Clear all uploads from queue
   */
  clearAllUploads(): void {
    this.uploadQueue.clear();
    this.activeUploads.clear();
    this.saveQueueToStorage();
    console.log('🧹 Cleared all uploads from queue');
  }

  /**
   * Set progress callback for an upload
   */
  setProgressCallback(uploadId: string, callback: (progress: number) => void): void {
    const upload = this.uploadQueue.get(uploadId);
    if (upload) {
      upload.onProgress = callback;
    }
  }

  /**
   * Set completion callback for an upload
   */
  setCompletionCallback(uploadId: string, callback: (result: UploadResult) => void): void {
    const upload = this.uploadQueue.get(uploadId);
    if (upload) {
      upload.onComplete = callback;
    }
  }

  /**
   * Set error callback for an upload
   */
  setErrorCallback(uploadId: string, callback: (error: UploadError) => void): void {
    const upload = this.uploadQueue.get(uploadId);
    if (upload) {
      upload.onError = callback;
    }
  }

  // Private methods

  private async attemptUpload(
    file: File, 
    options: UploadOptions, 
    uploadId: string, 
    attemptNumber: number
  ): Promise<UploadResult> {
    const startTime = Date.now();
    
    try {
      console.log(`📤 Upload attempt ${attemptNumber} for ${file.name}`);
      
      // Start progress tracking
      await uploadProgressManager.trackUpload(uploadId, file.name, file.size, {
        patientId: options.patientId,
        description: options.description,
        attempts: attemptNumber
      });

      // Update to uploading stage
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: 0,
        totalBytes: file.size,
        stage: 'uploading',
        message: `Starting upload attempt ${attemptNumber}...`,
        timestamp: new Date()
      });
      
      // Monitor upload health
      const healthPromise = networkDiagnosticsService.monitorUploadHealth(uploadId);
      
      // Simulate progress updates during upload
      const progressInterval = setInterval(async () => {
        const currentProgress = uploadProgressManager.getUploadStatus(uploadId);
        if (currentProgress && currentProgress.currentStage === 'uploading') {
          const lastUpdate = currentProgress.progressHistory[currentProgress.progressHistory.length - 1];
          const newBytesUploaded = Math.min(lastUpdate.bytesUploaded + (file.size * 0.1), file.size * 0.9);
          
          await uploadProgressManager.updateProgress(uploadId, {
            bytesUploaded: newBytesUploaded,
            totalBytes: file.size,
            stage: 'uploading',
            message: 'Uploading...',
            timestamp: new Date()
          });
        }
      }, 500);
      
      // Perform the actual upload
      const response = await patientService.uploadFile(
        options.patientId,
        file,
        options.description
      );

      clearInterval(progressInterval);

      // Update to processing stage
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: file.size,
        totalBytes: file.size,
        stage: 'processing',
        message: 'Processing uploaded file...',
        timestamp: new Date()
      });

      // Complete the upload
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: file.size,
        totalBytes: file.size,
        stage: 'complete',
        message: 'Upload completed successfully!',
        timestamp: new Date()
      });

      const uploadTime = Date.now() - startTime;
      const healthMetrics = await healthPromise;

      const result: UploadResult = {
        success: true,
        uploadId,
        fileName: file.name,
        message: response.message || 'Upload successful',
        fileSize: file.size,
        uploadTime,
        attempts: attemptNumber,
        metadata: {
          healthMetrics,
          response
        }
      };

      console.log(`✅ Upload successful for ${file.name} in ${uploadTime}ms`);
      return result;

    } catch (error: any) {
      const uploadTime = Date.now() - startTime;
      const uploadError = this.classifyError(error);
      
      console.error(`❌ Upload attempt ${attemptNumber} failed for ${file.name}:`, uploadError);

      // Update progress to error state
      await uploadProgressManager.updateProgress(uploadId, {
        bytesUploaded: 0,
        totalBytes: file.size,
        stage: 'error',
        message: `Upload failed: ${uploadError.message}`,
        timestamp: new Date()
      });

      const result: UploadResult = {
        success: false,
        uploadId,
        fileName: file.name,
        message: uploadError.message,
        fileSize: file.size,
        uploadTime,
        attempts: attemptNumber,
        error: uploadError
      };

      throw result;
    }
  }

  private classifyError(error: any): UploadError {
    // Use the error handling service for comprehensive error processing
    const userFriendlyError = errorHandlingService.processError(error, {
      fileName: 'upload file', // This would be set by the calling context
      uploadId: 'unknown'
    });

    // Map to UploadError format
    const type = userFriendlyError.classification.type as UploadError['type'];
    const retryable = userFriendlyError.classification.retryable;
    const message = userFriendlyError.message;

    return {
      type,
      message,
      statusCode: error.response?.status,
      retryable,
      originalError: error,
      userFriendlyError // Add the full user-friendly error for UI display
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    console.log('🔄 Starting queue processing...');

    try {
      while (this.shouldContinueProcessing()) {
        const availableSlots = this.maxConcurrentUploads - this.activeUploads.size;
        if (availableSlots <= 0) {
          await this.sleep(1000); // Wait for active uploads to complete
          continue;
        }

        const nextUploads = this.getNextUploadsToProcess(availableSlots);
        if (nextUploads.length === 0) {
          await this.sleep(5000); // Wait before checking again
          continue;
        }

        // Process uploads concurrently
        const uploadPromises = nextUploads.map(upload => this.processUpload(upload));
        await Promise.allSettled(uploadPromises);
      }
    } finally {
      this.isProcessingQueue = false;
      console.log('⏸️ Queue processing stopped');
    }
  }

  private shouldContinueProcessing(): boolean {
    const uploads = Array.from(this.uploadQueue.values());
    const hasQueuedUploads = uploads.some(u => u.status === 'queued');
    const hasRetryableUploads = uploads.some(u => 
      u.status === 'failed' && 
      u.attempts < u.maxRetries &&
      (!u.nextRetryAt || u.nextRetryAt <= new Date())
    );
    
    return hasQueuedUploads || hasRetryableUploads || this.activeUploads.size > 0;
  }

  private getNextUploadsToProcess(maxCount: number): QueuedUpload[] {
    const uploads = Array.from(this.uploadQueue.values());
    const now = new Date();
    
    return uploads
      .filter(upload => {
        if (upload.status === 'queued') return true;
        if (upload.status === 'failed' && 
            upload.attempts < upload.maxRetries &&
            (!upload.nextRetryAt || upload.nextRetryAt <= now)) {
          return true;
        }
        return false;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, maxCount);
  }

  private async processUpload(upload: QueuedUpload): Promise<void> {
    this.activeUploads.add(upload.id);
    upload.status = 'uploading';
    upload.lastAttemptAt = new Date();
    upload.attempts++;

    // Sync status with queue management service
    queueManagementService.updateUploadStatus(upload.id, 'uploading', 0);

    try {
      // Calculate retry delay with exponential backoff
      if (upload.attempts > 1) {
        const delay = this.calculateRetryDelay(upload.attempts, upload.options);
        console.log(`⏳ Waiting ${delay}ms before retry attempt ${upload.attempts} for ${upload.file.name}`);
        await this.sleep(delay);
      }

      const result = await this.attemptUpload(
        upload.file,
        upload.options,
        upload.id,
        upload.attempts
      );

      // Success
      upload.status = 'completed';
      upload.progress = 100;
      
      // Sync success status with queue management service
      queueManagementService.updateUploadStatus(upload.id, 'completed', 100);
      
      if (upload.onComplete) {
        upload.onComplete(result);
      }

      console.log(`✅ Queue upload completed: ${upload.file.name}`);

    } catch (error: any) {
      const uploadError = error.error || this.classifyError(error);
      upload.lastError = uploadError;

      if (upload.attempts >= upload.maxRetries || !uploadError.retryable) {
        // Max retries reached or non-retryable error
        upload.status = 'failed';
        
        // Sync failure status with queue management service
        queueManagementService.updateUploadStatus(
          upload.id, 
          'failed', 
          0, 
          uploadError.message,
          uploadError.type
        );
        
        if (upload.onError) {
          upload.onError(uploadError);
        }
        
        console.error(`❌ Upload permanently failed: ${upload.file.name} after ${upload.attempts} attempts`);
      } else {
        // Schedule retry
        upload.status = 'failed'; // Temporarily failed, will retry
        upload.nextRetryAt = new Date(Date.now() + this.calculateRetryDelay(upload.attempts + 1, upload.options));
        
        // Sync temporary failure status with queue management service
        queueManagementService.updateUploadStatus(
          upload.id, 
          'failed', 
          0, 
          uploadError.message,
          uploadError.type
        );
        
        console.warn(`⚠️ Upload attempt ${upload.attempts} failed for ${upload.file.name}, will retry`);
      }
    } finally {
      this.activeUploads.delete(upload.id);
      this.saveQueueToStorage();
    }
  }

  private calculateRetryDelay(attemptNumber: number, options: UploadOptions): number {
    const baseDelay = options.retryDelay || 1000;
    
    if (options.exponentialBackoff) {
      // Exponential backoff: delay = baseDelay * (2 ^ (attempt - 1))
      return Math.min(baseDelay * Math.pow(2, attemptNumber - 1), 30000); // Max 30 seconds
    } else {
      // Linear backoff
      return baseDelay * attemptNumber;
    }
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startQueueProcessor(): void {
    // Start periodic queue processing
    this.queueProcessor = setInterval(() => {
      if (!this.isProcessingQueue && this.shouldContinueProcessing()) {
        this.processQueue();
      }
    }, 10000); // Check every 10 seconds
  }

  private stopQueueProcessor(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
  }

  private saveQueueToStorage(): void {
    try {
      const queueData = Array.from(this.uploadQueue.entries()).map(([id, upload]) => ({
        id,
        fileName: upload.file.name,
        fileSize: upload.file.size,
        fileType: upload.file.type,
        options: upload.options,
        attempts: upload.attempts,
        maxRetries: upload.maxRetries,
        status: upload.status,
        lastError: upload.lastError,
        createdAt: upload.createdAt.toISOString(),
        lastAttemptAt: upload.lastAttemptAt?.toISOString(),
        nextRetryAt: upload.nextRetryAt?.toISOString(),
        progress: upload.progress
      }));

      localStorage.setItem('enhancedUploadQueue', JSON.stringify(queueData));
    } catch (error) {
      console.warn('Failed to save upload queue to storage:', error);
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const queueData = localStorage.getItem('enhancedUploadQueue');
      if (!queueData) return;

      const parsedData = JSON.parse(queueData);
      
      // Note: We can't restore File objects from storage, so we'll only restore metadata
      // In a real implementation, you might want to handle this differently
      console.log(`📋 Found ${parsedData.length} uploads in storage (files cannot be restored)`);
      
      // Clear storage since we can't restore files
      localStorage.removeItem('enhancedUploadQueue');
      
    } catch (error) {
      console.warn('Failed to load upload queue from storage:', error);
      localStorage.removeItem('enhancedUploadQueue');
    }
  }

  // Cleanup method
  destroy(): void {
    this.stopQueueProcessor();
    this.clearAllUploads();
  }
}

export const enhancedUploadService = new EnhancedUploadService();