// Types for upload progress tracking
export interface ProgressUpdate {
  bytesUploaded: number;
  totalBytes: number;
  stage: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
  timestamp: Date;
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  stageProgress?: number; // 0-100 for current stage
}

export interface UploadStatus {
  uploadId: string;
  fileName: string;
  fileSize: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  overallProgress: number; // 0-100
  currentStage: ProgressUpdate['stage'];
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  averageSpeed?: number; // bytes per second
  progressHistory: ProgressUpdate[];
  error?: string;
  metadata?: {
    patientId: string;
    description?: string;
    fileType: string;
    attempts: number;
  };
}

export interface PerformanceMetrics {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalDuration: number;
  averageSpeed: number;
  peakSpeed: number;
  stageTimings: {
    preparing: number;
    uploading: number;
    processing: number;
  };
  networkLatency: number;
  throughput: number;
  efficiency: number; // 0-1 ratio of actual vs theoretical speed
}

export type ProgressCallback = (update: ProgressUpdate) => void;
export type StatusCallback = (status: UploadStatus) => void;
export type MetricsCallback = (metrics: PerformanceMetrics) => void;

class UploadProgressManager {
  private activeUploads: Map<string, UploadStatus> = new Map();
  private progressCallbacks: Map<string, Set<ProgressCallback>> = new Map();
  private statusCallbacks: Map<string, Set<StatusCallback>> = new Map();
  private metricsCallbacks: Map<string, Set<MetricsCallback>> = new Map();
  private globalCallbacks: Set<(uploads: UploadStatus[]) => void> = new Set();
  
  // Performance tracking
  private performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Start tracking an upload
   */
  async trackUpload(uploadId: string, fileName: string, fileSize: number, metadata?: any): Promise<void> {
    console.log(`📊 Starting progress tracking for ${fileName} (ID: ${uploadId})`);

    const uploadStatus: UploadStatus = {
      uploadId,
      fileName,
      fileSize,
      status: 'active',
      overallProgress: 0,
      currentStage: 'preparing',
      startTime: new Date(),
      progressHistory: [],
      metadata: {
        patientId: metadata?.patientId || 'unknown',
        description: metadata?.description,
        fileType: this.getFileType(fileName),
        attempts: metadata?.attempts || 1,
        ...metadata
      }
    };

    this.activeUploads.set(uploadId, uploadStatus);

    // Initial progress update
    await this.updateProgress(uploadId, {
      bytesUploaded: 0,
      totalBytes: fileSize,
      stage: 'preparing',
      message: 'Preparing upload...',
      timestamp: new Date(),
      stageProgress: 0
    });
  }

  /**
   * Update upload progress
   */
  async updateProgress(uploadId: string, update: ProgressUpdate): Promise<void> {
    const uploadStatus = this.activeUploads.get(uploadId);
    if (!uploadStatus) {
      console.warn(`⚠️ Upload ${uploadId} not found for progress update`);
      return;
    }

    // Calculate additional metrics
    const enhancedUpdate = this.enhanceProgressUpdate(uploadStatus, update);
    
    // Update upload status
    uploadStatus.progressHistory.push(enhancedUpdate);
    uploadStatus.currentStage = enhancedUpdate.stage;
    uploadStatus.overallProgress = this.calculateOverallProgress(enhancedUpdate);

    // Calculate performance metrics
    if (enhancedUpdate.speed) {
      uploadStatus.averageSpeed = this.calculateAverageSpeed(uploadStatus);
    }

    // Notify progress callbacks
    const progressCallbacks = this.progressCallbacks.get(uploadId);
    if (progressCallbacks) {
      progressCallbacks.forEach(callback => {
        try {
          callback(enhancedUpdate);
        } catch (error) {
          console.error('Progress callback error:', error);
        }
      });
    }

    // Notify status callbacks
    const statusCallbacks = this.statusCallbacks.get(uploadId);
    if (statusCallbacks) {
      statusCallbacks.forEach(callback => {
        try {
          callback({ ...uploadStatus });
        } catch (error) {
          console.error('Status callback error:', error);
        }
      });
    }

    // Notify global callbacks
    this.notifyGlobalCallbacks();

    // Handle completion
    if (enhancedUpdate.stage === 'complete' || enhancedUpdate.stage === 'error') {
      await this.completeUpload(uploadId, enhancedUpdate.stage === 'complete');
    }
  }

  /**
   * Complete an upload and generate performance metrics
   */
  async completeUpload(uploadId: string, success: boolean): Promise<void> {
    const uploadStatus = this.activeUploads.get(uploadId);
    if (!uploadStatus) return;

    uploadStatus.status = success ? 'completed' : 'failed';
    uploadStatus.endTime = new Date();
    uploadStatus.duration = uploadStatus.endTime.getTime() - uploadStatus.startTime.getTime();

    console.log(`📈 Upload ${success ? 'completed' : 'failed'}: ${uploadStatus.fileName} in ${uploadStatus.duration}ms`);

    // Generate performance metrics
    const metrics = this.generatePerformanceMetrics(uploadStatus);
    this.performanceHistory.push(metrics);

    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }

    // Notify metrics callbacks
    const metricsCallbacks = this.metricsCallbacks.get(uploadId);
    if (metricsCallbacks) {
      metricsCallbacks.forEach(callback => {
        try {
          callback(metrics);
        } catch (error) {
          console.error('Metrics callback error:', error);
        }
      });
    }

    // Final status update
    const statusCallbacks = this.statusCallbacks.get(uploadId);
    if (statusCallbacks) {
      statusCallbacks.forEach(callback => {
        try {
          callback({ ...uploadStatus });
        } catch (error) {
          console.error('Status callback error:', error);
        }
      });
    }

    this.notifyGlobalCallbacks();
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const uploadStatus = this.activeUploads.get(uploadId);
    if (!uploadStatus) return;

    uploadStatus.status = 'cancelled';
    uploadStatus.endTime = new Date();
    uploadStatus.duration = uploadStatus.endTime.getTime() - uploadStatus.startTime.getTime();

    await this.updateProgress(uploadId, {
      bytesUploaded: uploadStatus.progressHistory[uploadStatus.progressHistory.length - 1]?.bytesUploaded || 0,
      totalBytes: uploadStatus.fileSize,
      stage: 'error',
      message: 'Upload cancelled by user',
      timestamp: new Date()
    });

    console.log(`🚫 Upload cancelled: ${uploadStatus.fileName}`);
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId: string): UploadStatus | null {
    const status = this.activeUploads.get(uploadId);
    return status ? { ...status } : null;
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): UploadStatus[] {
    return Array.from(this.activeUploads.values()).map(status => ({ ...status }));
  }

  /**
   * Get performance metrics for an upload
   */
  getUploadMetrics(uploadId: string): PerformanceMetrics | null {
    return this.performanceHistory.find(m => m.uploadId === uploadId) || null;
  }

  /**
   * Get aggregate performance statistics
   */
  getAggregateMetrics(): {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    averageSpeed: number;
    averageDuration: number;
    totalDataTransferred: number;
    peakSpeed: number;
    averageEfficiency: number;
  } {
    const completedUploads = Array.from(this.activeUploads.values())
      .filter(u => u.status === 'completed' || u.status === 'failed');

    const successfulUploads = completedUploads.filter(u => u.status === 'completed');
    const failedUploads = completedUploads.filter(u => u.status === 'failed');

    const totalDataTransferred = successfulUploads.reduce((sum, u) => sum + u.fileSize, 0);
    const averageSpeed = successfulUploads.length > 0 
      ? successfulUploads.reduce((sum, u) => sum + (u.averageSpeed || 0), 0) / successfulUploads.length
      : 0;

    const averageDuration = completedUploads.length > 0
      ? completedUploads.reduce((sum, u) => sum + (u.duration || 0), 0) / completedUploads.length
      : 0;

    const peakSpeed = Math.max(...this.performanceHistory.map(m => m.peakSpeed), 0);
    const averageEfficiency = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, m) => sum + m.efficiency, 0) / this.performanceHistory.length
      : 0;

    return {
      totalUploads: completedUploads.length,
      successfulUploads: successfulUploads.length,
      failedUploads: failedUploads.length,
      averageSpeed,
      averageDuration,
      totalDataTransferred,
      peakSpeed,
      averageEfficiency
    };
  }

  /**
   * Subscribe to progress updates for a specific upload
   */
  subscribeToProgress(uploadId: string, callback: ProgressCallback): () => void {
    if (!this.progressCallbacks.has(uploadId)) {
      this.progressCallbacks.set(uploadId, new Set());
    }
    
    this.progressCallbacks.get(uploadId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.progressCallbacks.get(uploadId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.progressCallbacks.delete(uploadId);
        }
      }
    };
  }

  /**
   * Subscribe to status updates for a specific upload
   */
  subscribeToStatus(uploadId: string, callback: StatusCallback): () => void {
    if (!this.statusCallbacks.has(uploadId)) {
      this.statusCallbacks.set(uploadId, new Set());
    }
    
    this.statusCallbacks.get(uploadId)!.add(callback);

    return () => {
      const callbacks = this.statusCallbacks.get(uploadId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.statusCallbacks.delete(uploadId);
        }
      }
    };
  }

  /**
   * Subscribe to metrics updates for a specific upload
   */
  subscribeToMetrics(uploadId: string, callback: MetricsCallback): () => void {
    if (!this.metricsCallbacks.has(uploadId)) {
      this.metricsCallbacks.set(uploadId, new Set());
    }
    
    this.metricsCallbacks.get(uploadId)!.add(callback);

    return () => {
      const callbacks = this.metricsCallbacks.get(uploadId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.metricsCallbacks.delete(uploadId);
        }
      }
    };
  }

  /**
   * Subscribe to global upload status changes
   */
  subscribeToGlobalStatus(callback: (uploads: UploadStatus[]) => void): () => void {
    this.globalCallbacks.add(callback);

    return () => {
      this.globalCallbacks.delete(callback);
    };
  }

  /**
   * Clear completed uploads from tracking
   */
  clearCompletedUploads(): void {
    const completedIds: string[] = [];
    
    for (const [id, status] of this.activeUploads.entries()) {
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        completedIds.push(id);
      }
    }

    completedIds.forEach(id => {
      this.activeUploads.delete(id);
      this.progressCallbacks.delete(id);
      this.statusCallbacks.delete(id);
      this.metricsCallbacks.delete(id);
    });

    this.notifyGlobalCallbacks();
    console.log(`🧹 Cleared ${completedIds.length} completed uploads from tracking`);
  }

  /**
   * Clear all upload tracking data
   */
  clearAllUploads(): void {
    this.activeUploads.clear();
    this.progressCallbacks.clear();
    this.statusCallbacks.clear();
    this.metricsCallbacks.clear();
    this.performanceHistory.length = 0;
    
    this.notifyGlobalCallbacks();
    console.log('🧹 Cleared all upload tracking data');
  }

  // Private helper methods

  private enhanceProgressUpdate(uploadStatus: UploadStatus, update: ProgressUpdate): ProgressUpdate {
    const now = new Date();
    const timeSinceStart = now.getTime() - uploadStatus.startTime.getTime();
    
    // Calculate upload speed
    let speed: number | undefined;
    if (update.bytesUploaded > 0 && timeSinceStart > 0) {
      speed = (update.bytesUploaded / timeSinceStart) * 1000; // bytes per second
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (speed && speed > 0 && update.totalBytes > update.bytesUploaded) {
      const remainingBytes = update.totalBytes - update.bytesUploaded;
      estimatedTimeRemaining = remainingBytes / speed;
    }

    // Calculate stage progress if not provided
    let stageProgress = update.stageProgress;
    if (stageProgress === undefined) {
      stageProgress = this.calculateStageProgress(update);
    }

    return {
      ...update,
      timestamp: now,
      speed,
      estimatedTimeRemaining,
      stageProgress
    };
  }

  private calculateOverallProgress(update: ProgressUpdate): number {
    // Weight different stages
    const stageWeights = {
      preparing: 0.05,  // 5%
      uploading: 0.85,  // 85%
      processing: 0.10, // 10%
      complete: 1.0,    // 100%
      error: 0          // 0%
    };

    const stageWeight = stageWeights[update.stage];
    const bytesProgress = update.totalBytes > 0 ? update.bytesUploaded / update.totalBytes : 0;
    
    switch (update.stage) {
      case 'preparing':
        return Math.min(stageWeight * 100, 5);
      case 'uploading':
        return 5 + (bytesProgress * 85);
      case 'processing':
        return 90 + ((update.stageProgress || 0) / 100 * 10);
      case 'complete':
        return 100;
      case 'error':
        return Math.max(5, bytesProgress * 85); // Show progress made before error
      default:
        return 0;
    }
  }

  private calculateStageProgress(update: ProgressUpdate): number {
    switch (update.stage) {
      case 'preparing':
        return 50; // Assume halfway through preparation
      case 'uploading':
        return update.totalBytes > 0 ? (update.bytesUploaded / update.totalBytes) * 100 : 0;
      case 'processing':
        return 50; // Assume halfway through processing
      case 'complete':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  }

  private calculateAverageSpeed(uploadStatus: UploadStatus): number {
    const recentUpdates = uploadStatus.progressHistory.slice(-10); // Last 10 updates
    const validSpeeds = recentUpdates
      .map(u => u.speed)
      .filter((speed): speed is number => speed !== undefined && speed > 0);

    return validSpeeds.length > 0
      ? validSpeeds.reduce((sum, speed) => sum + speed, 0) / validSpeeds.length
      : 0;
  }

  private generatePerformanceMetrics(uploadStatus: UploadStatus): PerformanceMetrics {
    const totalDuration = uploadStatus.duration || 0;
    const averageSpeed = uploadStatus.averageSpeed || 0;
    
    // Calculate peak speed
    const peakSpeed = Math.max(
      ...uploadStatus.progressHistory
        .map(u => u.speed || 0)
        .filter(speed => speed > 0),
      0
    );

    // Calculate stage timings
    const stageTimings = this.calculateStageTimings(uploadStatus);

    // Calculate network latency (rough estimate from first response)
    const networkLatency = uploadStatus.progressHistory.length > 1
      ? uploadStatus.progressHistory[1].timestamp.getTime() - uploadStatus.startTime.getTime()
      : 0;

    // Calculate throughput (successful data transfer rate)
    const throughput = totalDuration > 0 ? (uploadStatus.fileSize / totalDuration) * 1000 : 0;

    // Calculate efficiency (actual vs theoretical speed)
    const theoreticalSpeed = 10 * 1024 * 1024; // Assume 10 Mbps theoretical max
    const efficiency = Math.min(averageSpeed / theoreticalSpeed, 1);

    return {
      uploadId: uploadStatus.uploadId,
      fileName: uploadStatus.fileName,
      fileSize: uploadStatus.fileSize,
      totalDuration,
      averageSpeed,
      peakSpeed,
      stageTimings,
      networkLatency,
      throughput,
      efficiency
    };
  }

  private calculateStageTimings(uploadStatus: UploadStatus): { preparing: number; uploading: number; processing: number; complete: number; error: number } {
    const timings = { preparing: 0, uploading: 0, processing: 0, complete: 0, error: 0 };
    
    let currentStage: ProgressUpdate['stage'] | null = null;
    let stageStartTime = uploadStatus.startTime.getTime();

    for (const update of uploadStatus.progressHistory) {
      if (update.stage !== currentStage) {
        // Stage changed
        if (currentStage) {
          const stageDuration = update.timestamp.getTime() - stageStartTime;
          if (currentStage in timings) {
            (timings as any)[currentStage] += stageDuration;
          }
        }
        currentStage = update.stage;
        stageStartTime = update.timestamp.getTime();
      }
    }

    // Handle final stage
    if (currentStage && uploadStatus.endTime) {
      const stageDuration = uploadStatus.endTime.getTime() - stageStartTime;
      if (currentStage in timings) {
        (timings as any)[currentStage] += stageDuration;
      }
    }

    return timings;
  }

  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'dcm':
      case 'dicom':
        return 'DICOM';
      case 'pdf':
        return 'PDF';
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'png':
        return 'PNG';
      case 'txt':
        return 'Text';
      default:
        return 'Unknown';
    }
  }

  private notifyGlobalCallbacks(): void {
    const allUploads = this.getActiveUploads();
    this.globalCallbacks.forEach(callback => {
      try {
        callback(allUploads);
      } catch (error) {
        console.error('Global callback error:', error);
      }
    });
  }
}

export const uploadProgressManager = new UploadProgressManager();