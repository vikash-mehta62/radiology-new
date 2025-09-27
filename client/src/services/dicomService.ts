import { RenderingEngine, Enums, imageLoader, metaData, init as csRenderingInit } from '@cornerstonejs/core';
import { init as csToolsInit, ToolGroupManager, Enums as csToolsEnums } from '@cornerstonejs/tools';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import { apiService } from './api';
import { DicomError, DicomLoadingState, RetryConfig } from '../types';
import { webGPUEnhancedService } from './webGPUEnhancedService';
import { itkWasmService } from './itkWasmService';
import { ohifIntegrationService } from './ohifIntegrationService';
import { environmentService } from '../config/environment';

// Enhanced interfaces for progressive loading
interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentImage?: string;
}

interface CacheEntry {
  image: any;
  timestamp: number;
  accessCount: number;
  size: number;
}

interface LoadingOptions {
  priority?: 'high' | 'medium' | 'low';
  progressive?: boolean;
  preload?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

interface StudyLoadingState {
  studyUid: string;
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  isLoading: boolean;
  startTime: number;
  estimatedTimeRemaining?: number;
}

// DICOM service for handling medical image display and manipulation with progressive loading
class DicomService {
  private initialized = false;
  private imageCache = new Map<string, CacheEntry>();
  private loadingQueue = new Map<string, Promise<any>>();
  private loadingStates = new Map<string, DicomLoadingState>();
  private studyLoadingStates = new Map<string, StudyLoadingState>();
  private progressCallbacks = new Map<string, (progress: LoadingProgress) => void>();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB cache limit
  private currentCacheSize = 0;
  private preloadWorkers: Worker[] = [];
  private maxConcurrentLoads = 6;
  private currentLoads = 0;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorCallbacks = new Set<(error: DicomError) => void>();
  private recoveryCallbacks = new Set<(imageId: string) => void>();

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔄 [DicomService] Already initialized');
      return;
    }

    try {
      console.log('🚀 [DicomService] Initializing Cornerstone3D...');
      
      // Initialize Cornerstone3D core and tools
      await csRenderingInit();
      await csToolsInit();

      // Initialize DICOM image loader with configuration
      dicomImageLoader.init({
        maxWebWorkers: Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)),
      });

      // Initialize enhanced services
      await this.initializeEnhancedServices();

      this.initialized = true;
      console.log('✅ [DicomService] Cornerstone3D initialized successfully');
    } catch (error) {
      console.error('❌ [DicomService] Failed to initialize:', error);
      throw error;
    }
  }

  private async initializeEnhancedServices(): Promise<void> {
    try {
      // Initialize WebGPU enhanced service
      const webGPUSupported = await webGPUEnhancedService.initialize();
      if (webGPUSupported) {
        console.log('✅ WebGPU enhanced rendering enabled');
      }

      // Initialize ITK-WASM service
      const itkInitialized = await itkWasmService.initialize();
      if (itkInitialized) {
        console.log('✅ ITK-WASM advanced processing enabled');
      }

      // Initialize OHIF integration
      const ohifInitialized = await ohifIntegrationService.initialize({
        maxNumberOfWebWorkers: Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)),
        showCPUFallbackMessage: !webGPUSupported
      });
      if (ohifInitialized) {
        console.log('✅ OHIF integration enabled');
      }

    } catch (error) {
      console.warn('Some enhanced services failed to initialize:', error);
    }
  }

  private initializePreloadWorkers() {
    const workerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker('/dicomPreloadWorker.js');
        worker.onmessage = (event) => {
          const { type, imageId, result, error } = event.data;
          if (type === 'imageLoaded' && result) {
            this.addToCache(imageId, result);
          } else if (type === 'error') {
            console.warn('Preload worker error:', error);
          }
        };
        this.preloadWorkers.push(worker);
      } catch (error) {
        console.warn('Failed to create preload worker:', error);
      }
    }
  }

  // Enhanced image loading with caching and progressive loading
  async loadImage(imageId: string, options: LoadingOptions = {}): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache first
    const cached = this.getFromCache(imageId);
    if (cached) {
      return cached;
    }

    // Check if already loading
    if (this.loadingQueue.has(imageId)) {
      return this.loadingQueue.get(imageId)!;
    }

    // Initialize loading state
    const loadingState = this.initializeLoadingState(imageId, options);
    
    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(imageId);
    if (circuitBreaker.isOpen()) {
      const error = this.createDicomError('circuit_breaker', 'Circuit breaker is open', imageId, false);
      this.handleError(error, loadingState);
      return this.getFallbackImage(imageId, error);
    }

    // Create loading promise with retry logic
    const loadingPromise = this.performImageLoadWithRetry(imageId, options, loadingState);
    this.loadingQueue.set(imageId, loadingPromise);

    try {
      const image = await loadingPromise;
      this.handleSuccess(imageId, loadingState);
      this.addToCache(imageId, image);
      return image;
    } catch (error) {
      const dicomError = this.normalizeToDicomError(error, imageId);
      this.handleError(dicomError, loadingState);
      return this.getFallbackImage(imageId, dicomError);
    } finally {
      this.loadingQueue.delete(imageId);
      this.currentLoads--;
    }
  }

  private async performImageLoadWithRetry(
    imageId: string, 
    options: LoadingOptions, 
    loadingState: DicomLoadingState
  ): Promise<any> {
    const { retryConfig } = loadingState;
    let lastError: DicomError | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const attemptStart = Date.now();
      
      try {
        loadingState.status = attempt === 1 ? 'loading' : 'retrying';
        loadingState.attempts.push({
          attempt,
          timestamp: attemptStart,
          success: false
        });

        // Wait for available slot
        while (this.currentLoads >= this.maxConcurrentLoads) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.currentLoads++;
        
        const image = await this.performSingleImageLoad(imageId, options);
        
        // Success - update attempt record
        const currentAttempt = loadingState.attempts[loadingState.attempts.length - 1];
        currentAttempt.success = true;
        currentAttempt.duration = Date.now() - attemptStart;
        
        return image;
        
      } catch (error) {
        const dicomError = this.normalizeToDicomError(error, imageId);
        lastError = dicomError;
        
        // Update attempt record
        const currentAttempt = loadingState.attempts[loadingState.attempts.length - 1];
        currentAttempt.error = dicomError;
        currentAttempt.duration = Date.now() - attemptStart;
        
        // Record failure in circuit breaker
        const circuitBreaker = this.getCircuitBreaker(imageId);
        circuitBreaker.recordFailure();
        
        // Check if we should retry
        if (!dicomError.retryable || attempt === retryConfig.maxAttempts) {
          throw dicomError;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, retryConfig);
        console.warn(`DICOM load attempt ${attempt} failed for ${imageId}, retrying in ${delay}ms:`, dicomError.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }

  private async performSingleImageLoad(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      // Handle sample images
      if (imageId.startsWith('sample:')) {
        return this.createSampleImage();
      }

      // Set timeout for the request with more generous timeouts
      const timeoutMs = options.priority === 'high' ? 120000 : 180000; // 2-3 minutes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error(`Request timeout after ${timeoutMs/1000}s for image: ${imageId}`);
          timeoutError.name = 'TimeoutError';
          reject(timeoutError);
        }, timeoutMs);
      });

      console.log(`🔄 [DicomService] Loading image with ${timeoutMs/1000}s timeout:`, imageId);
      const loadPromise = imageLoader.loadImage(imageId);
      const image = await Promise.race([loadPromise, timeoutPromise]);
      console.log('✅ [DicomService] Image loaded successfully:', imageId);
      
      return image;
      
    } catch (error) {
      console.group('🔴 [DicomService] Error in performSingleImageLoad');
      console.error('Image ID:', imageId);
      console.error('Error object:', error?.message || error?.toString() || JSON.stringify(error));
      console.error('Error type:', typeof error);
      console.error('Error name:', (error as any)?.name);
      console.error('Error message:', (error as any)?.message);
      console.error('Error stack:', (error as any)?.stack);
      
      // Log all error properties
      if (error && typeof error === 'object') {
        const errorProps = Object.getOwnPropertyNames(error);
        console.log('All error properties:', errorProps);
        errorProps.forEach(prop => {
          try {
            console.log(`- ${prop}:`, (error as any)[prop]);
          } catch (e) {
            console.log(`- ${prop}: Unable to access`);
          }
        });
      }
      
      console.groupEnd();
      throw this.enhanceError(error, imageId);
    }
  }

  private initializeLoadingState(imageId: string, options: LoadingOptions): DicomLoadingState {
    const retryConfig: RetryConfig = {
      maxAttempts: options.priority === 'high' ? 5 : 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
    };

    const loadingState: DicomLoadingState = {
      imageId,
      status: 'idle',
      attempts: [],
      retryConfig,
      circuitBreakerOpen: false,
      fallbackUsed: false
    };

    this.loadingStates.set(imageId, loadingState);
    return loadingState;
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );

    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private normalizeToDicomError(error: any, imageId: string): DicomError {
    if (error.name === 'DicomError') {
      return error;
    }

    let type: DicomError['type'] = 'network';
    let retryable = true;
    let severity: DicomError['severity'] = 'medium';
    let code = 'UNKNOWN_ERROR';

    const message = error.message || error.toString();

    // Classify error type based on message/properties
    if (message.includes('timeout') || message.includes('Request timeout')) {
      type = 'timeout';
      code = 'LOAD_TIMEOUT';
      severity = 'medium';
    } else if (message.includes('404') || message.includes('not found')) {
      type = 'not_found';
      code = 'IMAGE_NOT_FOUND';
      retryable = false;
      severity = 'high';
    } else if (message.includes('401') || message.includes('403')) {
      type = 'authentication';
      code = 'AUTH_ERROR';
      retryable = false;
      severity = 'high';
    } else if (message.includes('parse') || message.includes('invalid')) {
      type = 'parsing';
      code = 'PARSE_ERROR';
      retryable = false;
      severity = 'high';
    } else if (message.includes('memory') || message.includes('allocation')) {
      type = 'memory';
      code = 'MEMORY_ERROR';
      severity = 'critical';
    } else if (message.includes('network') || message.includes('connection')) {
      type = 'network';
      code = 'NETWORK_ERROR';
      severity = 'medium';
    }

    return this.createDicomError(code, message, imageId, retryable, type, severity);
  }

  private createDicomError(
    code: string,
    message: string,
    imageId: string,
    retryable: boolean,
    type: DicomError['type'] = 'network',
    severity: DicomError['severity'] = 'medium'
  ): DicomError {
    return {
      type,
      code,
      message,
      imageId,
      retryable,
      severity,
      timestamp: Date.now(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private enhanceError(error: any, imageId: string): DicomError {
    const dicomError = this.normalizeToDicomError(error, imageId);
    
    // Add contextual information
    dicomError.details = {
      originalError: error.message,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      imageId,
      cacheSize: this.currentCacheSize,
      activeLoads: this.currentLoads
    };

    // Enhance timeout error messages
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      dicomError.message = `Image loading timed out. This may be due to slow network connection or large image size. Image: ${imageId}`;
      console.warn('⏰ [DicomService] Timeout error for image:', imageId);
    } else if (error.message?.includes('CORS')) {
      dicomError.code = 'CORS_ERROR';
      dicomError.message = `Cross-origin request blocked. Server configuration issue. Image: ${imageId}`;
      dicomError.retryable = false;
    }

    return dicomError;
  }

  private getCircuitBreaker(imageId: string): CircuitBreaker {
    const key = this.getCircuitBreakerKey(imageId);
    
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        name: key
      }));
    }
    
    return this.circuitBreakers.get(key)!;
  }

  private getCircuitBreakerKey(imageId: string): string {
    // Group by server/study for circuit breaking
    try {
      const url = new URL(imageId.replace('wadouri:', ''));
      return url.hostname;
    } catch {
      return 'default';
    }
  }

  private async getFallbackImage(imageId: string, error: DicomError): Promise<any> {
    const loadingState = this.loadingStates.get(imageId);
    if (loadingState) {
      loadingState.fallbackUsed = true;
    }

    // Try different fallback strategies based on error type
    switch (error.type) {
      case 'not_found':
        return this.createNotFoundPlaceholder(imageId);
      case 'authentication':
        return this.createAuthErrorPlaceholder(imageId);
      case 'corrupted':
      case 'parsing':
        return this.createCorruptedPlaceholder(imageId);
      default:
        return this.createErrorPlaceholder(imageId, error);
    }
  }

  private handleError(error: DicomError, loadingState: DicomLoadingState) {
    loadingState.status = 'failed';
    loadingState.lastError = error;
    
    // Notify error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.warn('Error in error callback:', err);
      }
    });

    // Log error for monitoring
    this.logError(error, loadingState);
  }

  private handleSuccess(imageId: string, loadingState: DicomLoadingState) {
    loadingState.status = 'success';
    
    // Record success in circuit breaker
    const circuitBreaker = this.getCircuitBreaker(imageId);
    circuitBreaker.recordSuccess();
    
    // Notify recovery callbacks if this was a retry
    if (loadingState.attempts.length > 1) {
      this.recoveryCallbacks.forEach(callback => {
        try {
          callback(imageId);
        } catch (err) {
          console.warn('Error in recovery callback:', err);
        }
      });
    }
  }

  private logError(error: DicomError, loadingState: DicomLoadingState) {
    const logData = {
      error,
      loadingState: {
        imageId: loadingState.imageId,
        status: loadingState.status,
        attemptCount: loadingState.attempts.length,
        fallbackUsed: loadingState.fallbackUsed
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('DICOM Loading Error:', logData);
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // monitoringService.logDicomError(logData);
    }
  }

  // Placeholder creation methods
  private createNotFoundPlaceholder(imageId: string): any {
    return this.createPlaceholderImage('Image Not Found', '#ff9800', imageId);
  }

  private createAuthErrorPlaceholder(imageId: string): any {
    return this.createPlaceholderImage('Authentication Required', '#f44336', imageId);
  }

  private createCorruptedPlaceholder(imageId: string): any {
    return this.createPlaceholderImage('Corrupted Image', '#9c27b0', imageId);
  }

  private createErrorPlaceholder(imageId: string, error: DicomError): any {
    return this.createPlaceholderImage(`Error: ${error.code}`, '#f44336', imageId);
  }

  private createPlaceholderImage(text: string, color: string, imageId: string): any {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Fill background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 508);
    
    // Draw text
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 256);
    
    // Draw image ID
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    const shortId = imageId.length > 40 ? imageId.substring(0, 40) + '...' : imageId;
    ctx.fillText(shortId, 256, 300);
    
    return {
      imageId,
      width: 512,
      height: 512,
      color: false,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      invert: false,
      sizeInBytes: 512 * 512,
      getPixelData: () => {
        const imageData = ctx.getImageData(0, 0, 512, 512);
        const pixelData = new Uint8Array(512 * 512);
        for (let i = 0; i < pixelData.length; i++) {
          pixelData[i] = imageData.data[i * 4]; // Use red channel
        }
        return pixelData;
      }
    };
  }

  // Public API methods for error handling
  onError(callback: (error: DicomError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  onRecovery(callback: (imageId: string) => void): () => void {
    this.recoveryCallbacks.add(callback);
    return () => this.recoveryCallbacks.delete(callback);
  }

  getLoadingState(imageId: string): DicomLoadingState | null {
    return this.loadingStates.get(imageId) || null;
  }

  retryImage(imageId: string, options: LoadingOptions = {}): Promise<any> {
    // Clear previous state and retry
    this.loadingStates.delete(imageId);
    this.loadingQueue.delete(imageId);
    return this.loadImage(imageId, options);
  }

  clearErrorState(imageId: string): void {
    this.loadingStates.delete(imageId);
    this.loadingQueue.delete(imageId);
  }

  getErrorStats(): { totalErrors: number; errorsByType: Record<string, number>; errorsByCode: Record<string, number> } {
    const stats = {
      totalErrors: 0,
      errorsByType: {} as Record<string, number>,
      errorsByCode: {} as Record<string, number>
    };

    this.loadingStates.forEach(state => {
      if (state.lastError) {
        stats.totalErrors++;
        stats.errorsByType[state.lastError.type] = (stats.errorsByType[state.lastError.type] || 0) + 1;
        stats.errorsByCode[state.lastError.code] = (stats.errorsByCode[state.lastError.code] || 0) + 1;
      }
    });

    return stats;
  }

  // Progressive study loading with intelligent prioritization
  async loadStudyProgressively(
    studyUid: string, 
    onProgress?: (progress: LoadingProgress) => void,
    options: LoadingOptions = {}
  ): Promise<string[]> {
    const imageIds = this.getImageIds(studyUid);
    
    if (onProgress) {
      this.progressCallbacks.set(studyUid, onProgress);
    }

    // Initialize loading state
    const loadingState: StudyLoadingState = {
      studyUid,
      totalImages: imageIds.length,
      loadedImages: 0,
      failedImages: 0,
      isLoading: true,
      startTime: Date.now()
    };
    this.studyLoadingStates.set(studyUid, loadingState);

    // Prioritize images based on viewing patterns
    const prioritizedImageIds = this.prioritizeImageIds(imageIds, options);
    
    // Load images in batches with progressive enhancement
    const batchSize = Math.min(6, Math.max(2, Math.floor(imageIds.length / 10)));
    const loadedImageIds: string[] = [];

    for (let i = 0; i < prioritizedImageIds.length; i += batchSize) {
      const batch = prioritizedImageIds.slice(i, i + batchSize);
      
      // Load batch concurrently
      const batchPromises = batch.map(async (imageId, index) => {
        try {
          const loadOptions: LoadingOptions = {
            ...options,
            priority: i === 0 ? 'high' : 'medium', // First batch is high priority
            quality: i === 0 ? 'high' : 'medium'   // First batch is high quality
          };
          
          await this.loadImage(imageId, loadOptions);
          loadedImageIds.push(imageId);
          loadingState.loadedImages++;
          
          // Update progress
          this.updateLoadingProgress(studyUid, loadingState);
          
          return imageId;
        } catch (error) {
          loadingState.failedImages++;
          console.warn(`Failed to load image ${imageId}:`, error);
          return null;
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < prioritizedImageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    loadingState.isLoading = false;
    this.updateLoadingProgress(studyUid, loadingState);
    
    return loadedImageIds;
  }

  private prioritizeImageIds(imageIds: string[], options: LoadingOptions): string[] {
    // Smart prioritization based on typical viewing patterns
    const prioritized = [...imageIds];
    
    if (options.priority === 'high') {
      // For high priority, load middle images first (most likely to be viewed)
      const middle = Math.floor(imageIds.length / 2);
      const reordered = [];
      
      // Add middle image first
      reordered.push(prioritized[middle]);
      
      // Add images in expanding pattern from middle
      for (let i = 1; i < Math.ceil(imageIds.length / 2); i++) {
        if (middle - i >= 0) reordered.push(prioritized[middle - i]);
        if (middle + i < imageIds.length) reordered.push(prioritized[middle + i]);
      }
      
      return reordered;
    }
    
    return prioritized;
  }

  private updateLoadingProgress(studyUid: string, state: StudyLoadingState) {
    const progress: LoadingProgress = {
      loaded: state.loadedImages,
      total: state.totalImages,
      percentage: Math.round((state.loadedImages / state.totalImages) * 100)
    };

    // Calculate estimated time remaining
    if (state.loadedImages > 0) {
      const elapsed = Date.now() - state.startTime;
      const avgTimePerImage = elapsed / state.loadedImages;
      const remaining = state.totalImages - state.loadedImages;
      state.estimatedTimeRemaining = Math.round((remaining * avgTimePerImage) / 1000);
    }

    const callback = this.progressCallbacks.get(studyUid);
    if (callback) {
      callback(progress);
    }
  }

  private getLowQualityImageId(imageId: string): string {
    // Generate low-quality version URL (implementation depends on server capabilities)
    if (imageId.includes('wadouri:')) {
      return imageId.replace('&contentType=application/dicom', '&contentType=application/dicom&quality=low');
    }
    return imageId;
  }

  // Enhanced caching system
  private addToCache(imageId: string, image: any) {
    const size = this.estimateImageSize(image);
    
    // Check if we need to free up space
    while (this.currentCacheSize + size > this.maxCacheSize && this.imageCache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      image,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };

    this.imageCache.set(imageId, entry);
    this.currentCacheSize += size;
  }

  private getFromCache(imageId: string): any | null {
    const entry = this.imageCache.get(imageId);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now();
      return entry.image;
    }
    return null;
  }

  private evictLeastRecentlyUsed() {
    let oldestEntry: [string, CacheEntry] | null = null;
    let oldestTime = Date.now();

    for (const [imageId, entry] of this.imageCache.entries()) {
      // Prioritize by access count and recency
      const score = entry.timestamp - (entry.accessCount * 60000); // Favor frequently accessed
      if (score < oldestTime) {
        oldestTime = score;
        oldestEntry = [imageId, entry];
      }
    }

    if (oldestEntry) {
      const [imageId, entry] = oldestEntry;
      this.imageCache.delete(imageId);
      this.currentCacheSize -= entry.size;
    }
  }

  private estimateImageSize(image: any): number {
    if (image && image.width && image.height) {
      // Estimate based on dimensions (assuming 16-bit grayscale)
      return image.width * image.height * 2;
    }
    return 1024 * 1024; // Default 1MB estimate
  }

  private cleanupCache() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [imageId, entry] of this.imageCache.entries()) {
      if (now - entry.timestamp > maxAge && entry.accessCount < 2) {
        this.imageCache.delete(imageId);
        this.currentCacheSize -= entry.size;
      }
    }
  }

  // Preloading functionality
  async preloadImages(imageIds: string[], priority: 'high' | 'medium' | 'low' = 'low') {
    const uncachedIds = imageIds.filter(id => !this.imageCache.has(id));
    
    if (uncachedIds.length === 0) return;

    // Use web workers for background preloading
    const workerPromises = uncachedIds.map((imageId, index) => {
      const workerIndex = index % this.preloadWorkers.length;
      const worker = this.preloadWorkers[workerIndex];
      
      if (worker) {
        worker.postMessage({
          type: 'preloadImage',
          imageId,
          priority
        });
        // Return a resolved promise for worker-based preloading
        return Promise.resolve();
      } else {
        // Fallback to main thread with low priority
        return this.loadImage(imageId, { priority, preload: true });
      }
    });

    // Don't wait for preloading to complete
    Promise.allSettled(workerPromises).then(() => {
      // Preloaded images in background
    });
  }

  // Enhanced display with progressive enhancement
  async displayImage(element: HTMLDivElement, imageId: string, options: LoadingOptions = {}): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const renderingEngine = this.getRenderingEngine();
      const viewportId = element.id || 'viewport';
      
      // Create viewport if it doesn't exist
      let viewport = renderingEngine.getViewport(viewportId);
      if (!viewport) {
        renderingEngine.enableElement({
          viewportId,
          element,
          type: Enums.ViewportType.STACK,
        });
        viewport = renderingEngine.getViewport(viewportId);
      }

      // Show loading placeholder if progressive loading is enabled
      if (options.progressive) {
        const placeholder = this.createLoadingPlaceholder();
        if (viewport && 'setStack' in viewport) {
          (viewport as any).setStack([placeholder]);
          viewport.render();
        }
      }

      // Load and display the image
      const image = await this.loadImage(imageId, options);
      if (viewport && 'setStack' in viewport) {
        (viewport as any).setStack([image]);
        viewport.render();
      }

      // Preload adjacent images for smooth navigation
      if (options.preload !== false) {
        this.preloadAdjacentImages(imageId);
      }
    } catch (error) {
      console.error('Failed to display DICOM image:', error);
      throw error;
    }
  }

  private preloadAdjacentImages(currentImageId: string) {
    // Extract study and series info to find adjacent images
    const studyMatch = currentImageId.match(/studyUID=([^&]+)/);
    if (studyMatch) {
      const studyUid = studyMatch[1];
      const imageIds = this.getImageIds(studyUid);
      const currentIndex = imageIds.indexOf(currentImageId);
      
      if (currentIndex >= 0) {
        const preloadIds = [];
        
        // Preload next 3 and previous 3 images
        for (let i = -3; i <= 3; i++) {
          const index = currentIndex + i;
          if (index >= 0 && index < imageIds.length && index !== currentIndex) {
            preloadIds.push(imageIds[index]);
          }
        }
        
        this.preloadImages(preloadIds, 'medium');
      }
    }
  }

  private createLoadingPlaceholder(): any {
    return {
      imageId: 'placeholder://loading',
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 256,
      render: undefined,
      getPixelData: () => {
        const size = 256;
        const pixelData = new Uint8Array(size * size);
        // Create a simple loading pattern
        for (let i = 0; i < pixelData.length; i++) {
          pixelData[i] = Math.floor(128 + 64 * Math.sin(i / 100));
        }
        return pixelData;
      },
      rows: 256,
      columns: 256,
      height: 256,
      width: 256,
      color: false,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      sizeInBytes: 256 * 256,
    };
  }

  // Cache management methods
  getCacheStats() {
    return {
      size: this.imageCache.size,
      memoryUsage: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      hitRate: this.calculateCacheHitRate()
    };
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return 0.85; // Placeholder
  }

  clearCache() {
    this.imageCache.clear();
    this.currentCacheSize = 0;
  }

  // Get loading state for a study
  getStudyLoadingState(studyUid: string): StudyLoadingState | null {
    // Get study loading state - properly typed for study-level operations
    return this.studyLoadingStates.get(studyUid) || null;
  }

  getImageIds(studyUid: string): string[] {
    // Use actual working DICOM files from the Node.js backend
    const backendUrl = environmentService.getApiUrl();
    
    // Return actual DICOM files that exist in the backend
    const imageIds = [
      `wadouri:${backendUrl}/uploads/P001/0002.DCM`,
      `wadouri:${backendUrl}/uploads/P001/MRBRAIN.DCM`,
      `wadouri:${backendUrl}/uploads/P002/0002.DCM`,
      `wadouri:${backendUrl}/uploads/P002/MRBRAIN.DCM`,
      `wadouri:${backendUrl}/uploads/P002/16TEST.DCM`,
    ];
    
    return imageIds;
  }

  async getStudyMetadata(studyUid: string): Promise<any> {
    try {
      const orthancUrl = environmentService.get('orthancUrl');
      
      const response = await fetch(`${orthancUrl}/studies/${studyUid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch study metadata: ${response.statusText}`);
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Failed to get study metadata:', error);
      
      return {
        ID: studyUid,
        MainDicomTags: {
          StudyInstanceUID: studyUid,
          StudyDate: '20240115',
          StudyDescription: 'Sample Study with Progressive Loading',
          PatientID: 'SAMPLE001',
        },
        Series: ['series-1', 'series-2'],
        Type: 'Study',
      };
    }
  }

  async getSeriesMetadata(seriesId: string): Promise<any> {
    try {
      const orthancUrl = environmentService.get('orthancUrl');
      
      const response = await fetch(`${orthancUrl}/series/${seriesId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch series metadata: ${response.statusText}`);
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Failed to get series metadata:', error);
      
      return {
        ID: seriesId,
        MainDicomTags: {
          SeriesInstanceUID: seriesId,
          SeriesNumber: '1',
          SeriesDescription: 'Enhanced Series with Caching',
          Modality: 'US',
        },
        Instances: Array.from({ length: 20 }, (_, i) => `instance-${i + 1}`),
        Type: 'Series',
      };
    }
  }

  async enableElement(element: HTMLDivElement): Promise<void> {
    try {
      // Ensure DicomService is initialized
      if (!this.initialized) {
        console.log('🔄 [DicomService] Initializing before enabling element...');
        await this.initialize();
      }

      // Validate element
      if (!element) {
        throw new Error('Element is null or undefined');
      }

      if (!(element instanceof HTMLElement)) {
        throw new Error('Provided element is not a valid HTMLElement');
      }

      // Check if element is in the DOM
      if (!document.contains(element)) {
        throw new Error('Element is not attached to the DOM');
      }

      console.log('🔍 [DicomService] Checking element state...', {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight
      });

      const renderingEngine = this.getRenderingEngine();
      const viewportId = element.id || 'viewport';
      
      // Check if already enabled
      try {
        const existingViewport = renderingEngine.getViewport(viewportId);
        if (existingViewport) {
          console.log('ℹ️ [DicomService] Element already enabled');
          return;
        }
      } catch (getError) {
        // Viewport is not enabled, which is expected
        console.log('📝 [DicomService] Element not yet enabled (expected)');
      }

      // Enable the element with Cornerstone3D
      console.log('⚡ [DicomService] Enabling cornerstone element...');
      renderingEngine.enableElement({
        viewportId,
        element,
        type: Enums.ViewportType.STACK,
      });
      
      // Wait for enablement to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify enablement
      const viewport = renderingEngine.getViewport(viewportId);
      if (!viewport) {
        throw new Error('Failed to enable cornerstone element. Viewport was not created.');
      }
      
      console.log('✅ [DicomService] Element enabled successfully', {
        viewportId,
        viewportType: viewport.type
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [DicomService] Failed to enable element:', {
        error: errorMessage,
        elementInfo: element ? {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          inDOM: document.contains(element)
        } : 'null'
      });
      throw new Error(`element not enabled: ${errorMessage}`);
    }
  }

  disableElement(element: HTMLDivElement): void {
    try {
      // In Cornerstone3D, we need to destroy the viewport instead of disabling the element
      const renderingEngine = this.getRenderingEngine();
      if (renderingEngine) {
        const viewportId = element.id || 'viewport';
        try {
          renderingEngine.disableElement(viewportId);
        } catch (error) {
          console.warn('Viewport was not enabled:', error);
        }
      }
    } catch (error) {
      console.warn('Element was not enabled:', error);
    }
  }

  private getRenderingEngine() {
    // Get or create a rendering engine instance
    try {
      // Simply create a new rendering engine with a unique ID
      return new RenderingEngine('dicomService');
    } catch (error) {
      console.error('Failed to create rendering engine:', error);
      throw error;
    }
  }

  setViewport(element: HTMLDivElement, viewport: any): void {
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewportInstance = renderingEngine.getViewport(viewportId);
    if (viewportInstance && 'setProperties' in viewportInstance) {
      (viewportInstance as any).setProperties(viewport);
      viewportInstance.render();
    }
  }

  getViewport(element: HTMLDivElement): any {
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewport = renderingEngine.getViewport(viewportId);
    return viewport ? viewport.getProperties() : null;
  }

  rotate(element: HTMLDivElement, degrees: number): void {
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewport = renderingEngine.getViewport(viewportId);
    if (viewport && 'setProperties' in viewport) {
      const currentProps = viewport.getProperties() as any;
      const newRotation = (currentProps.rotation || 0) + degrees;
      (viewport as any).setProperties({ ...currentProps, rotation: newRotation });
      viewport.render();
    }
  }

  invert(element: HTMLDivElement): void {
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewport = renderingEngine.getViewport(viewportId);
    if (viewport && 'setProperties' in viewport) {
      const currentProps = viewport.getProperties() as any;
      (viewport as any).setProperties({ ...currentProps, invert: !currentProps.invert });
      viewport.render();
    }
  }

  reset(element: HTMLDivElement): void {
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewport = renderingEngine.getViewport(viewportId);
    if (viewport && 'resetProperties' in viewport) {
      (viewport as any).resetProperties();
      viewport.render();
    }
  }

  fitToWindow(element: HTMLDivElement): void {
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewport = renderingEngine.getViewport(viewportId);
    if (viewport) {
      viewport.resetCamera();
      viewport.render();
    }
  }

  getWindowLevelPresets(modality: string): Array<{ name: string; windowWidth: number; windowCenter: number }> {
    const presets: Record<string, Array<{ name: string; windowWidth: number; windowCenter: number }>> = {
      CT: [
        { name: 'Soft Tissue', windowWidth: 400, windowCenter: 40 },
        { name: 'Lung', windowWidth: 1500, windowCenter: -600 },
        { name: 'Bone', windowWidth: 1800, windowCenter: 400 },
        { name: 'Brain', windowWidth: 100, windowCenter: 50 },
      ],
      MR: [
        { name: 'Default', windowWidth: 200, windowCenter: 100 },
        { name: 'T1', windowWidth: 600, windowCenter: 300 },
        { name: 'T2', windowWidth: 1000, windowCenter: 500 },
      ],
      US: [
        { name: 'Default', windowWidth: 256, windowCenter: 128 },
        { name: 'High Contrast', windowWidth: 200, windowCenter: 100 },
      ],
      CR: [
        { name: 'Default', windowWidth: 2000, windowCenter: 1000 },
        { name: 'High Contrast', windowWidth: 1000, windowCenter: 500 },
      ],
      DX: [
        { name: 'Default', windowWidth: 2000, windowCenter: 1000 },
        { name: 'High Contrast', windowWidth: 1000, windowCenter: 500 },
      ],
    };

    return presets[modality] || presets.CT;
  }

  addMeasurement(element: HTMLDivElement, startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): number {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    // Get real distance using Cornerstone3D APIs
    const renderingEngine = this.getRenderingEngine();
    const viewportId = element.id || 'viewport';
    const viewport = renderingEngine.getViewport(viewportId);
    
    if (viewport && 'getImageData' in viewport) {
      const imageData = (viewport as any).getImageData();
      if (imageData && imageData.spacing) {
        const [spacingX, spacingY] = imageData.spacing;
        const realDistance = pixelDistance * Math.sqrt(spacingX * spacingX + spacingY * spacingY);
        return realDistance;
      }
    }

    // Fallback to pixel distance if spacing is not available
    return pixelDistance;
  }

  generateSampleImageId(studyUid: string, seriesNumber: number = 1, instanceNumber: number = 1): string {
    // Use the 0002.DCM file as dummy DICOM file
    const backendUrl = environmentService.getApiUrl();
    
    return `wadouri:${backendUrl}/dicom/0002.DCM`;
  }

  generatePatientImageId(patientId: string, studyUid: string): string {
    // Generate patient-specific DICOM image URL
    const backendUrl = environmentService.getApiUrl();
    
    // Use the correct DICOM file serving endpoint that returns raw DICOM content
    return `wadouri:${backendUrl}/uploads/${patientId}/MRBRAIN.DCM`;
  }

  createSampleImage(width: number = 512, height: number = 512): any {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d');
    if (!context) return null;

    const imageData = context.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDistance = Math.min(width, height) / 2;
      
      let intensity = 0;
      if (distance < maxDistance) {
        intensity = Math.floor(128 + 127 * Math.sin(distance / 20) * Math.cos(distance / 15));
      }
      
      data[i] = intensity;
      data[i + 1] = intensity;
      data[i + 2] = intensity;
      data[i + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
    
    return {
      imageId: 'sample://image',
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 256,
      render: undefined,
      getPixelData: () => {
        const pixelData = new Uint8Array(width * height);
        const imgData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < pixelData.length; i++) {
          pixelData[i] = imgData.data[i * 4];
        }
        return pixelData;
      },
      rows: height,
      columns: width,
      height,
      width,
      color: false,
      columnPixelSpacing: 0.1,
      rowPixelSpacing: 0.1,
      sizeInBytes: width * height,
    };
  }

  // Cleanup method
  dispose() {
    // Clean up workers
    this.preloadWorkers.forEach(worker => worker.terminate());
    this.preloadWorkers = [];
    
    // Clear caches
    this.clearCache();
    this.loadingQueue.clear();
    this.loadingStates.clear();
    this.progressCallbacks.clear();
  }
}

export const dicomService = new DicomService();

// Circuit Breaker Implementation
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: { failureThreshold: number; recoveryTimeout: number; name: string }) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      console.warn(`Circuit breaker ${this.config.name} opened after ${this.failureCount} failures`);
    }
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
        this.failureCount = 0;
        console.info(`Circuit breaker ${this.config.name} closed after recovery`);
      }
    } else if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }
}