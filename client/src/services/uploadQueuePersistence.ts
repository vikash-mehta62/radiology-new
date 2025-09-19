// Types for upload queue persistence
export interface PersistedUpload {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  patientId: string;
  description?: string;
  status: 'queued' | 'uploading' | 'failed' | 'completed' | 'cancelled';
  attempts: number;
  maxRetries: number;
  createdAt: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  errorMessage?: string;
  errorType?: string;
  progress: number;
  uploadOptions: {
    maxRetries: number;
    timeout: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  metadata?: {
    originalFile?: {
      name: string;
      size: number;
      type: string;
      lastModified: number;
    };
    uploadStartTime?: string;
    uploadEndTime?: string;
    totalDuration?: number;
    averageSpeed?: number;
  };
}

export interface QueueSnapshot {
  timestamp: string;
  version: string;
  uploads: PersistedUpload[];
  statistics: {
    totalUploads: number;
    completedUploads: number;
    failedUploads: number;
    queuedUploads: number;
  };
}

export interface QueueBackup {
  id: string;
  timestamp: string;
  snapshot: QueueSnapshot;
  reason: 'manual' | 'automatic' | 'error' | 'shutdown';
}

class UploadQueuePersistence {
  private readonly STORAGE_KEY = 'kiro_upload_queue';
  private readonly BACKUP_KEY = 'kiro_upload_queue_backups';
  private readonly VERSION = '1.0.0';
  private readonly MAX_BACKUPS = 10;
  private readonly AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private autoBackupTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the persistence service
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Start automatic backup timer
    this.startAutoBackup();

    // Handle browser close/refresh
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    this.isInitialized = true;
    console.log('📦 Upload queue persistence initialized');
  }

  /**
   * Save upload queue to localStorage
   */
  saveQueue(uploads: PersistedUpload[]): boolean {
    try {
      const snapshot: QueueSnapshot = {
        timestamp: new Date().toISOString(),
        version: this.VERSION,
        uploads: uploads.map(upload => ({
          ...upload,
          // Remove any non-serializable data
          metadata: {
            ...upload.metadata,
            // File objects can't be serialized, so we store metadata only
            originalFile: upload.metadata?.originalFile ? {
              name: upload.metadata.originalFile.name,
              size: upload.metadata.originalFile.size,
              type: upload.metadata.originalFile.type,
              lastModified: upload.metadata.originalFile.lastModified
            } : undefined
          }
        })),
        statistics: this.calculateStatistics(uploads)
      };

      const serialized = JSON.stringify(snapshot);
      
      // Check storage quota
      if (this.checkStorageQuota(serialized.length)) {
        localStorage.setItem(this.STORAGE_KEY, serialized);
        console.log(`💾 Saved ${uploads.length} uploads to queue persistence`);
        return true;
      } else {
        console.warn('⚠️ Storage quota exceeded, cannot save queue');
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to save upload queue:', error);
      return false;
    }
  }

  /**
   * Load upload queue from localStorage
   */
  loadQueue(): PersistedUpload[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('📦 No persisted upload queue found');
        return [];
      }

      const snapshot: QueueSnapshot = JSON.parse(stored);
      
      // Version compatibility check
      if (snapshot.version !== this.VERSION) {
        console.warn(`⚠️ Queue version mismatch: ${snapshot.version} vs ${this.VERSION}`);
        // Could implement migration logic here
      }

      // Filter out completed uploads older than 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const filteredUploads = snapshot.uploads.filter(upload => {
        if (upload.status === 'completed' || upload.status === 'cancelled') {
          const uploadTime = new Date(upload.lastAttemptAt || upload.createdAt);
          return uploadTime > oneDayAgo;
        }
        return true; // Keep all non-completed uploads
      });

      console.log(`📦 Loaded ${filteredUploads.length} uploads from queue persistence`);
      return filteredUploads;

    } catch (error) {
      console.error('❌ Failed to load upload queue:', error);
      return [];
    }
  }

  /**
   * Create a backup of the current queue
   */
  createBackup(uploads: PersistedUpload[], reason: QueueBackup['reason'] = 'manual'): boolean {
    try {
      const backup: QueueBackup = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        reason,
        snapshot: {
          timestamp: new Date().toISOString(),
          version: this.VERSION,
          uploads,
          statistics: this.calculateStatistics(uploads)
        }
      };

      // Get existing backups
      const existingBackups = this.getBackups();
      
      // Add new backup
      existingBackups.push(backup);
      
      // Keep only the most recent backups
      const trimmedBackups = existingBackups
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.MAX_BACKUPS);

      // Save backups
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(trimmedBackups));
      
      console.log(`💾 Created queue backup: ${backup.id} (${reason})`);
      return true;

    } catch (error) {
      console.error('❌ Failed to create queue backup:', error);
      return false;
    }
  }

  /**
   * Get all available backups
   */
  getBackups(): QueueBackup[] {
    try {
      const stored = localStorage.getItem(this.BACKUP_KEY);
      if (!stored) return [];

      const backups: QueueBackup[] = JSON.parse(stored);
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } catch (error) {
      console.error('❌ Failed to load queue backups:', error);
      return [];
    }
  }

  /**
   * Restore queue from a backup
   */
  restoreFromBackup(backupId: string): PersistedUpload[] | null {
    try {
      const backups = this.getBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        console.error(`❌ Backup ${backupId} not found`);
        return null;
      }

      // Save current queue as backup before restoring
      const currentQueue = this.loadQueue();
      this.createBackup(currentQueue, 'automatic');

      // Restore from backup
      this.saveQueue(backup.snapshot.uploads);
      
      console.log(`🔄 Restored queue from backup: ${backupId}`);
      return backup.snapshot.uploads;

    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return null;
    }
  }

  /**
   * Clear all persisted data
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      console.log('🧹 Cleared all persisted upload queue data');
    } catch (error) {
      console.error('❌ Failed to clear persisted data:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    queueSize: number;
    backupsSize: number;
    totalSize: number;
    availableSpace: number;
    usagePercentage: number;
  } {
    try {
      const queueData = localStorage.getItem(this.STORAGE_KEY) || '';
      const backupsData = localStorage.getItem(this.BACKUP_KEY) || '';
      
      const queueSize = new Blob([queueData]).size;
      const backupsSize = new Blob([backupsData]).size;
      const totalSize = queueSize + backupsSize;

      // Estimate available localStorage space (usually 5-10MB)
      const estimatedQuota = 5 * 1024 * 1024; // 5MB
      const usagePercentage = (totalSize / estimatedQuota) * 100;

      return {
        queueSize,
        backupsSize,
        totalSize,
        availableSpace: estimatedQuota - totalSize,
        usagePercentage
      };

    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        queueSize: 0,
        backupsSize: 0,
        totalSize: 0,
        availableSpace: 0,
        usagePercentage: 0
      };
    }
  }

  /**
   * Export queue data for external backup
   */
  exportQueue(): string {
    try {
      const queue = this.loadQueue();
      const backups = this.getBackups();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: this.VERSION,
        queue,
        backups,
        metadata: {
          exportedBy: 'Kiro Upload Queue Manager',
          totalUploads: queue.length,
          totalBackups: backups.length
        }
      };

      return JSON.stringify(exportData, null, 2);

    } catch (error) {
      console.error('❌ Failed to export queue:', error);
      throw error;
    }
  }

  /**
   * Import queue data from external backup
   */
  importQueue(importData: string): boolean {
    try {
      const data = JSON.parse(importData);
      
      // Validate import data structure
      if (!data.queue || !Array.isArray(data.queue)) {
        throw new Error('Invalid import data structure');
      }

      // Create backup of current data before importing
      const currentQueue = this.loadQueue();
      this.createBackup(currentQueue, 'automatic');

      // Import queue
      this.saveQueue(data.queue);

      // Import backups if available
      if (data.backups && Array.isArray(data.backups)) {
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(data.backups));
      }

      console.log(`📥 Imported ${data.queue.length} uploads from external backup`);
      return true;

    } catch (error) {
      console.error('❌ Failed to import queue:', error);
      return false;
    }
  }

  /**
   * Cleanup old and invalid entries
   */
  cleanup(): void {
    try {
      const queue = this.loadQueue();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Remove old completed/cancelled uploads
      const cleanedQueue = queue.filter(upload => {
        if (upload.status === 'completed' || upload.status === 'cancelled') {
          const uploadTime = new Date(upload.lastAttemptAt || upload.createdAt);
          return uploadTime > sevenDaysAgo;
        }
        return true;
      });

      // Remove failed uploads that have exceeded max retries and are old
      const finalQueue = cleanedQueue.filter(upload => {
        if (upload.status === 'failed' && upload.attempts >= upload.maxRetries) {
          const uploadTime = new Date(upload.lastAttemptAt || upload.createdAt);
          return uploadTime > sevenDaysAgo;
        }
        return true;
      });

      if (finalQueue.length !== queue.length) {
        this.saveQueue(finalQueue);
        console.log(`🧹 Cleaned up ${queue.length - finalQueue.length} old uploads`);
      }

      // Cleanup old backups
      const backups = this.getBackups();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const cleanedBackups = backups.filter(backup => 
        new Date(backup.timestamp) > thirtyDaysAgo
      );

      if (cleanedBackups.length !== backups.length) {
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(cleanedBackups));
        console.log(`🧹 Cleaned up ${backups.length - cleanedBackups.length} old backups`);
      }

    } catch (error) {
      console.error('❌ Failed to cleanup queue:', error);
    }
  }

  // Private helper methods

  private calculateStatistics(uploads: PersistedUpload[]) {
    return {
      totalUploads: uploads.length,
      completedUploads: uploads.filter(u => u.status === 'completed').length,
      failedUploads: uploads.filter(u => u.status === 'failed').length,
      queuedUploads: uploads.filter(u => u.status === 'queued').length
    };
  }

  private checkStorageQuota(dataSize: number): boolean {
    try {
      // Try to estimate available space
      const testKey = 'storage_test';
      const testData = 'x'.repeat(1024); // 1KB test
      
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      
      // If we can store 1KB, we probably have enough space for queue data
      return dataSize < 1024 * 1024; // Limit to 1MB
      
    } catch (error) {
      return false;
    }
  }

  private startAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }

    this.autoBackupTimer = setInterval(() => {
      const queue = this.loadQueue();
      if (queue.length > 0) {
        this.createBackup(queue, 'automatic');
      }
    }, this.AUTO_BACKUP_INTERVAL);
  }

  private handleBeforeUnload(): void {
    // Create backup before page unload
    const queue = this.loadQueue();
    if (queue.length > 0) {
      this.createBackup(queue, 'shutdown');
    }
  }

  private handlePageHide(): void {
    // Create backup when page becomes hidden
    const queue = this.loadQueue();
    if (queue.length > 0) {
      this.createBackup(queue, 'automatic');
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      // Page is hidden, create backup
      const queue = this.loadQueue();
      if (queue.length > 0) {
        this.createBackup(queue, 'automatic');
      }
    }
  }

  /**
   * Destroy the persistence service
   */
  destroy(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }

    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.removeEventListener('pagehide', this.handlePageHide.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    this.isInitialized = false;
    console.log('📦 Upload queue persistence destroyed');
  }
}

export const uploadQueuePersistence = new UploadQueuePersistence();