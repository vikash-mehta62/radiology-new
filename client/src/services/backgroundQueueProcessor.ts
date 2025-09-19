import { queueManagementService } from './queueManagementService';
import { networkDiagnosticsService } from './networkDiagnosticsService';
import { enhancedUploadService } from './enhancedUploadService';

/**
 * Background service for processing upload queue when connectivity is restored
 */
class BackgroundQueueProcessor {
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private connectivityCheckInterval: NodeJS.Timeout | null = null;
  private lastConnectivityStatus = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the background processor
   */
  private initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start monitoring
    this.start();
    
    console.log('🔄 Background queue processor initialized');
  }

  /**
   * Start background processing
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Check connectivity every 30 seconds
    this.connectivityCheckInterval = setInterval(
      this.checkConnectivityAndProcess.bind(this), 
      30000
    );
    
    // Process queue every 10 seconds
    this.processingInterval = setInterval(
      this.processQueueIfOnline.bind(this), 
      10000
    );
    
    console.log('▶️ Background queue processor started');
  }

  /**
   * Stop background processing
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.connectivityCheckInterval) {
      clearInterval(this.connectivityCheckInterval);
      this.connectivityCheckInterval = null;
    }
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    console.log('⏸️ Background queue processor stopped');
  }

  /**
   * Check connectivity and process queue if restored
   */
  private async checkConnectivityAndProcess(): Promise<void> {
    try {
      const connectivity = await networkDiagnosticsService.checkBackendConnectivity();
      const isOnline = connectivity.isConnected;
      
      // If connectivity was restored
      if (!this.lastConnectivityStatus && isOnline) {
        console.log('🌐 Connectivity restored - processing queued uploads');
        await this.processRestoredConnectivity();
      }
      
      this.lastConnectivityStatus = isOnline;
      
    } catch (error) {
      console.error('❌ Background connectivity check failed:', error);
      this.lastConnectivityStatus = false;
    }
  }

  /**
   * Process queue if online
   */
  private async processQueueIfOnline(): Promise<void> {
    if (!this.lastConnectivityStatus) return;
    
    try {
      const queueStats = queueManagementService.getQueueStats();
      
      // If there are failed uploads that can be retried
      if (queueStats.failedItems > 0) {
        console.log(`🔄 Processing ${queueStats.failedItems} failed uploads in background`);
        await queueManagementService.retryFailedUploads({
          batchRetry: true,
          maxConcurrentRetries: 2
        });
      }
      
    } catch (error) {
      console.error('❌ Background queue processing failed:', error);
    }
  }

  /**
   * Handle connectivity restoration
   */
  private async processRestoredConnectivity(): Promise<void> {
    try {
      // Force connectivity check in queue management service
      await queueManagementService.forceConnectivityCheck();
      
      // Resume any paused uploads
      await enhancedUploadService.resumeQueuedUploads();
      
      console.log('✅ Connectivity restoration processing completed');
      
    } catch (error) {
      console.error('❌ Failed to process connectivity restoration:', error);
    }
  }

  /**
   * Handle browser online event
   */
  private handleOnline(): void {
    console.log('🌐 Browser online event detected');
    this.checkConnectivityAndProcess();
  }

  /**
   * Handle browser offline event
   */
  private handleOffline(): void {
    console.log('📴 Browser offline event detected');
    this.lastConnectivityStatus = false;
  }

  /**
   * Get processor status
   */
  getStatus(): {
    isRunning: boolean;
    lastConnectivityStatus: boolean;
  } {
    return {
      isRunning: this.isRunning,
      lastConnectivityStatus: this.lastConnectivityStatus
    };
  }

  /**
   * Destroy the processor
   */
  destroy(): void {
    this.stop();
    
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    console.log('🔄 Background queue processor destroyed');
  }
}

export const backgroundQueueProcessor = new BackgroundQueueProcessor();