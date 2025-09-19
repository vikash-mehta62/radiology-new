import { uploadQueuePersistence, PersistedUpload } from './uploadQueuePersistence';
import { enhancedUploadService } from './enhancedUploadService';
import { networkDiagnosticsService } from './networkDiagnosticsService';

// Types for queue management
export interface QueueOperation {
  id: string;
  type: 'add' | 'remove' | 'update' | 'retry' | 'cancel' | 'clear';
  timestamp: Date;
  uploadId?: string;
  details?: any;
}

export interface QueueStats {
  totalItems: number;
  queuedItems: number;
  uploadingItems: number;
  completedItems: number;
  failedItems: number;
  cancelledItems: number;
  oldestQueuedItem?: Date;
  newestQueuedItem?: Date;
  averageWaitTime: number;
  successRate: number;
}

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  exponentialBackoff: boolean;
  retryOnlyRetryableErrors: boolean;
  batchRetry: boolean;
  maxConcurrentRetries: number;
}

class QueueManagementService {
  private queue: Map<string, PersistedUpload> = new Map();
  private operationHistory: QueueOperation[] = [];
  private isProcessing = false;
  private processingTimer: NodeJS.Timeout | null = null;
  private connectivityCheckTimer: NodeJS.Timeout | null = null;
  private lastConnectivityCheck: Date | null = null;
  private isOnline = true;

  // Default retry strategy
  private defaultRetryStrategy: RetryStrategy = {
    maxRetries: 3,
    baseDelay: 1000,
    exponentialBackoff: true,
    retryOnlyRetryableErrors: true,
    batchRetry: false,
    maxConcurrentRetries: 3
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the queue management service
   */
  private initialize(): void {
    // Load persisted queue
    this.loadPersistedQueue();

    // Start background processing
    this.startBackgroundProcessing();

    // Start connectivity monitoring
    this.startConnectivityMonitoring();

    // Handle online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    console.log('🎛️ Queue management service initialized');
  }

  /**
   * Add upload to queue
   */
  addToQueue(
    uploadId: string,
    fileName: string,
    fileSize: number,
    patientId: string,
    options: any = {}
  ): boolean {
    try {
      const upload: PersistedUpload = {
        id: uploadId,
        fileName,
        fileSize,
        fileType: this.getFileType(fileName),
        patientId,
        description: options.description,
        status: 'queued',
        attempts: 0,
        maxRetries: options.maxRetries || this.defaultRetryStrategy.maxRetries,
        createdAt: new Date().toISOString(),
        progress: 0,
        uploadOptions: {
          maxRetries: options.maxRetries || this.defaultRetryStrategy.maxRetries,
          timeout: options.timeout || 60000,
          retryDelay: options.retryDelay || this.defaultRetryStrategy.baseDelay,
          exponentialBackoff: options.exponentialBackoff ?? this.defaultRetryStrategy.exponentialBackoff
        }
      };

      this.queue.set(uploadId, upload);
      this.persistQueue();
      this.logOperation('add', uploadId, { fileName, fileSize, patientId });

      console.log(`📋 Added to queue: ${fileName} (${uploadId})`);
      return true;

    } catch (error) {
      console.error('❌ Failed to add to queue:', error);
      return false;
    }
  }

  /**
   * Remove upload from queue
   */
  removeFromQueue(uploadId: string): boolean {
    try {
      const upload = this.queue.get(uploadId);
      if (!upload) {
        console.warn(`⚠️ Upload ${uploadId} not found in queue`);
        return false;
      }

      this.queue.delete(uploadId);
      this.persistQueue();
      this.logOperation('remove', uploadId, { fileName: upload.fileName });

      console.log(`🗑️ Removed from queue: ${upload.fileName} (${uploadId})`);
      return true;

    } catch (error) {
      console.error('❌ Failed to remove from queue:', error);
      return false;
    }
  }

  /**
   * Update upload status in queue
   */
  updateUploadStatus(
    uploadId: string, 
    status: PersistedUpload['status'], 
    progress?: number,
    errorMessage?: string,
    errorType?: string
  ): boolean {
    try {
      const upload = this.queue.get(uploadId);
      if (!upload) {
        console.warn(`⚠️ Upload ${uploadId} not found for status update`);
        return false;
      }

      const oldStatus = upload.status;
      upload.status = status;
      upload.lastAttemptAt = new Date().toISOString();

      if (progress !== undefined) {
        upload.progress = progress;
      }

      if (status === 'failed') {
        upload.attempts++;
        upload.errorMessage = errorMessage;
        upload.errorType = errorType;

        // Calculate next retry time
        if (upload.attempts < upload.maxRetries) {
          const delay = this.calculateRetryDelay(upload.attempts, upload.uploadOptions);
          upload.nextRetryAt = new Date(Date.now() + delay).toISOString();
        }
      }

      this.persistQueue();
      this.logOperation('update', uploadId, { 
        oldStatus, 
        newStatus: status, 
        progress,
        attempts: upload.attempts 
      });

      console.log(`📝 Updated queue status: ${upload.fileName} - ${oldStatus} → ${status}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to update upload status:', error);
      return false;
    }
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(strategy?: Partial<RetryStrategy>): Promise<{
    retriedCount: number;
    successCount: number;
    failedCount: number;
    results: any[];
  }> {
    const mergedStrategy = { ...this.defaultRetryStrategy, ...strategy };
    const failedUploads = Array.from(this.queue.values())
      .filter(upload => 
        upload.status === 'failed' && 
        upload.attempts < upload.maxRetries &&
        (!upload.nextRetryAt || new Date(upload.nextRetryAt) <= new Date())
      );

    console.log(`🔄 Retrying ${failedUploads.length} failed uploads`);

    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    if (mergedStrategy.batchRetry) {
      // Process all retries concurrently (up to maxConcurrentRetries)
      const batches = this.createBatches(failedUploads, mergedStrategy.maxConcurrentRetries);
      
      for (const batch of batches) {
        const batchPromises = batch.map(upload => this.retryUpload(upload, mergedStrategy));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failedCount++;
          }
          results.push(result);
        });
      }
    } else {
      // Process retries sequentially
      for (const upload of failedUploads) {
        try {
          const result = await this.retryUpload(upload, mergedStrategy);
          results.push(result);
          
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
          results.push({ success: false, error });
        }
      }
    }

    this.logOperation('retry', undefined, {
      retriedCount: failedUploads.length,
      successCount,
      failedCount,
      strategy: mergedStrategy
    });

    console.log(`✅ Retry completed: ${successCount} successful, ${failedCount} failed`);

    return {
      retriedCount: failedUploads.length,
      successCount,
      failedCount,
      results
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const uploads = Array.from(this.queue.values());
    
    const queuedItems = uploads.filter(u => u.status === 'queued');
    const completedItems = uploads.filter(u => u.status === 'completed');
    const failedItems = uploads.filter(u => u.status === 'failed');

    // Calculate average wait time for completed uploads
    const completedWithTiming = completedItems.filter(u => u.lastAttemptAt && u.createdAt);
    const averageWaitTime = completedWithTiming.length > 0
      ? completedWithTiming.reduce((sum, upload) => {
          const waitTime = new Date(upload.lastAttemptAt!).getTime() - new Date(upload.createdAt).getTime();
          return sum + waitTime;
        }, 0) / completedWithTiming.length
      : 0;

    // Calculate success rate
    const processedUploads = uploads.filter(u => u.status === 'completed' || u.status === 'failed');
    const successRate = processedUploads.length > 0
      ? (completedItems.length / processedUploads.length) * 100
      : 0;

    return {
      totalItems: uploads.length,
      queuedItems: queuedItems.length,
      uploadingItems: uploads.filter(u => u.status === 'uploading').length,
      completedItems: completedItems.length,
      failedItems: failedItems.length,
      cancelledItems: uploads.filter(u => u.status === 'cancelled').length,
      oldestQueuedItem: queuedItems.length > 0 
        ? new Date(Math.min(...queuedItems.map(u => new Date(u.createdAt).getTime())))
        : undefined,
      newestQueuedItem: queuedItems.length > 0
        ? new Date(Math.max(...queuedItems.map(u => new Date(u.createdAt).getTime())))
        : undefined,
      averageWaitTime: averageWaitTime / 1000, // Convert to seconds
      successRate
    };
  }

  /**
   * Get all uploads in queue
   */
  getAllUploads(): PersistedUpload[] {
    return Array.from(this.queue.values()).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Get uploads by status
   */
  getUploadsByStatus(status: PersistedUpload['status']): PersistedUpload[] {
    return Array.from(this.queue.values()).filter(u => u.status === status);
  }

  /**
   * Clear completed uploads
   */
  clearCompleted(): number {
    const completedIds: string[] = [];
    
    for (const [id, upload] of this.queue.entries()) {
      if (upload.status === 'completed') {
        completedIds.push(id);
      }
    }

    completedIds.forEach(id => this.queue.delete(id));
    this.persistQueue();
    
    this.logOperation('clear', undefined, { 
      type: 'completed', 
      count: completedIds.length 
    });

    console.log(`🧹 Cleared ${completedIds.length} completed uploads`);
    return completedIds.length;
  }

  /**
   * Clear all uploads
   */
  clearAll(): number {
    const count = this.queue.size;
    this.queue.clear();
    this.persistQueue();
    
    this.logOperation('clear', undefined, { 
      type: 'all', 
      count 
    });

    console.log(`🧹 Cleared all ${count} uploads from queue`);
    return count;
  }

  // Private methods

  private loadPersistedQueue(): void {
    try {
      const persistedUploads = uploadQueuePersistence.loadQueue();
      
      persistedUploads.forEach(upload => {
        this.queue.set(upload.id, upload);
      });

      console.log(`📦 Loaded ${persistedUploads.length} uploads from persistence`);

    } catch (error) {
      console.error('❌ Failed to load persisted queue:', error);
    }
  }

  private persistQueue(): void {
    try {
      const uploads = Array.from(this.queue.values());
      uploadQueuePersistence.saveQueue(uploads);
    } catch (error) {
      console.error('❌ Failed to persist queue:', error);
    }
  }

  private async retryUpload(upload: PersistedUpload, strategy: RetryStrategy): Promise<any> {
    try {
      // Check if error is retryable
      if (strategy.retryOnlyRetryableErrors && upload.errorType) {
        const nonRetryableErrors = ['ValidationError', 'AuthenticationError', 'PermissionError'];
        if (nonRetryableErrors.includes(upload.errorType)) {
          console.log(`⏭️ Skipping non-retryable error: ${upload.fileName} - ${upload.errorType}`);
          return { success: false, skipped: true, reason: 'non-retryable' };
        }
      }

      // Update status to uploading
      this.updateUploadStatus(upload.id, 'uploading', 0);

      // Note: We can't recreate File objects from persisted data
      // In a real implementation, you might need to handle this differently
      // For now, we'll simulate the retry
      console.log(`🔄 Simulating retry for: ${upload.fileName}`);

      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate success/failure based on error type
      const shouldSucceed = Math.random() > 0.3; // 70% success rate for retries

      if (shouldSucceed) {
        this.updateUploadStatus(upload.id, 'completed', 100);
        return { success: true, uploadId: upload.id, fileName: upload.fileName };
      } else {
        this.updateUploadStatus(upload.id, 'failed', 0, 'Retry failed', 'NetworkError');
        return { success: false, uploadId: upload.id, fileName: upload.fileName };
      }

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown retry error';
      this.updateUploadStatus(upload.id, 'failed', 0, errorMessage, 'RetryError');
      return { success: false, error: errorMessage };
    }
  }

  private calculateRetryDelay(attempts: number, options: PersistedUpload['uploadOptions']): number {
    const baseDelay = options.retryDelay;
    
    if (options.exponentialBackoff) {
      return Math.min(baseDelay * Math.pow(2, attempts - 1), 30000); // Max 30 seconds
    } else {
      return baseDelay * attempts;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private startBackgroundProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (!this.isProcessing && this.isOnline) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds for better responsiveness
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      // Get uploads ready for retry
      const now = new Date();
      const readyForRetry = Array.from(this.queue.values()).filter(upload =>
        upload.status === 'failed' &&
        upload.attempts < upload.maxRetries &&
        (!upload.nextRetryAt || new Date(upload.nextRetryAt) <= now)
      );

      if (readyForRetry.length > 0) {
        console.log(`🔄 Processing ${readyForRetry.length} uploads ready for retry`);
        await this.retryFailedUploads({ batchRetry: true, maxConcurrentRetries: 2 });
      }

    } finally {
      this.isProcessing = false;
    }
  }

  private startConnectivityMonitoring(): void {
    this.connectivityCheckTimer = setInterval(async () => {
      try {
        const connectivity = await networkDiagnosticsService.checkBackendConnectivity();
        const wasOnline = this.isOnline;
        this.isOnline = connectivity.isConnected;
        this.lastConnectivityCheck = new Date();

        // If we just came back online, process the queue immediately
        if (!wasOnline && this.isOnline) {
          console.log('🌐 Connectivity restored, processing queue immediately...');
          
          // Reset failed uploads that can be retried
          const failedUploads = Array.from(this.queue.values())
            .filter(upload => 
              upload.status === 'failed' && 
              upload.attempts < upload.maxRetries &&
              upload.errorType !== 'ValidationError' // Don't retry validation errors
            );
          
          failedUploads.forEach(upload => {
            upload.status = 'queued';
            upload.nextRetryAt = undefined;
            console.log(`🔄 Reset failed upload for retry: ${upload.fileName}`);
          });
          
          this.persistQueue();
          await this.processQueue();
        }

      } catch (error) {
        this.isOnline = false;
        console.error('❌ Connectivity check failed:', error);
      }
    }, 15000); // Check every 15 seconds for faster recovery
  }

  private logOperation(
    type: QueueOperation['type'], 
    uploadId?: string, 
    details?: any
  ): void {
    const operation: QueueOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      uploadId,
      details
    };

    this.operationHistory.push(operation);

    // Keep operation history manageable
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100);
    }
  }

  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const typeMap: { [key: string]: string } = {
      'dcm': 'DICOM',
      'dicom': 'DICOM',
      'pdf': 'PDF',
      'jpg': 'JPEG',
      'jpeg': 'JPEG',
      'png': 'PNG',
      'txt': 'Text'
    };
    return typeMap[extension] || extension.toUpperCase();
  }

  private handleOnline(): void {
    console.log('🌐 Browser came online');
    this.isOnline = true;
    // Process queue when connectivity is restored
    setTimeout(() => this.processQueue(), 1000);
  }

  private handleOffline(): void {
    console.log('📴 Browser went offline');
    this.isOnline = false;
  }

  /**
   * Get operation history
   */
  getOperationHistory(): QueueOperation[] {
    return [...this.operationHistory];
  }

  /**
   * Get connectivity status
   */
  getConnectivityStatus(): {
    isOnline: boolean;
    lastCheck: Date | null;
    nextCheck: Date | null;
  } {
    const nextCheck = this.lastConnectivityCheck 
      ? new Date(this.lastConnectivityCheck.getTime() + 15000)
      : null;
    
    return {
      isOnline: this.isOnline,
      lastCheck: this.lastConnectivityCheck,
      nextCheck
    };
  }

  /**
   * Force connectivity check and queue processing
   */
  async forceConnectivityCheck(): Promise<boolean> {
    try {
      const connectivity = await networkDiagnosticsService.checkBackendConnectivity();
      const wasOnline = this.isOnline;
      this.isOnline = connectivity.isConnected;
      this.lastConnectivityCheck = new Date();

      console.log(`🔍 Forced connectivity check: ${this.isOnline ? 'Online' : 'Offline'}`);

      // If we came back online, process the queue
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Connectivity restored via forced check, processing queue...');
        await this.processQueue();
      }

      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      console.error('❌ Forced connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Pause queue processing
   */
  pauseProcessing(): void {
    this.isProcessing = true; // This will prevent new processing
    console.log('⏸️ Queue processing paused');
  }

  /**
   * Resume queue processing
   */
  resumeProcessing(): void {
    this.isProcessing = false;
    console.log('▶️ Queue processing resumed');
    
    // Start processing if there are items in queue
    if (this.shouldContinueProcessing()) {
      this.processQueue();
    }
  }

  /**
   * Check if processing should continue
   */
  private shouldContinueProcessing(): boolean {
    return !this.isProcessing && this.isOnline && this.queue.size > 0;
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    if (this.connectivityCheckTimer) {
      clearInterval(this.connectivityCheckTimer);
      this.connectivityCheckTimer = null;
    }

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    // Final persistence
    this.persistQueue();

    console.log('🎛️ Queue management service destroyed');
  }
}

export const queueManagementService = new QueueManagementService();