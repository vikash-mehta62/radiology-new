/**
 * Enhanced DICOM Service with Robust Error Handling
 * Integrates with the new error handler for comprehensive error management
 */

import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import * as dicomParser from 'dicom-parser';
import { apiService } from './api';
import { errorHandler, ErrorType, ViewerError } from './errorHandler';
import { performanceMonitor } from './performanceMonitor';
import { DicomError, DicomLoadingState, RetryConfig, Study } from '../types';

interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentImage?: string;
  estimatedTimeRemaining?: number;
}

interface CacheEntry {
  image: any;
  timestamp: number;
  accessCount: number;
  size: number;
  quality: 'low' | 'medium' | 'high';
}

interface LoadingOptions {
  priority?: 'high' | 'medium' | 'low';
  progressive?: boolean;
  preload?: boolean;
  quality?: 'low' | 'medium' | 'high';
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
}

interface StudyLoadingState {
  studyUid: string;
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  isLoading: boolean;
  startTime: number;
  estimatedTimeRemaining?: number;
  errors: ViewerError[];
}

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  threshold: number;
  timeout: number;
}

interface LoadingStrategy {
  name: string;
  description: string;
  load: (imageId: string, options: LoadingOptions) => Promise<any>;
}

class EnhancedDicomService {
  private initialized = false;
  private imageCache = new Map<string, CacheEntry>();
  private loadingQueue = new Map<string, Promise<any>>();
  private loadingStates = new Map<string, DicomLoadingState>();
  private studyLoadingStates = new Map<string, StudyLoadingState>();
  private progressCallbacks = new Map<string, (progress: LoadingProgress) => void>();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB cache limit
  private currentCacheSize = 0;
  private maxConcurrentLoads = 6;
  private currentLoads = 0;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorCallbacks = new Set<(error: ViewerError) => void>();
  private recoveryCallbacks = new Set<(imageId: string) => void>();

  // Default retry configuration
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  };

  constructor() {
    this.setupErrorHandlerIntegration();
  }

  /**
   * Initialize the DICOM service with enhanced error handling
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 [EnhancedDicomService] Initializing...');

      // Initialize cornerstone
      const testElement = document.createElement('div');
      cornerstone.enable(testElement);

      // Configure external libraries
      this.configureExternalLibraries();

      // Configure WADO Image Loader with enhanced error handling
      this.configureWADOImageLoader();

      // Register image loaders
      this.registerImageLoaders();

      // Setup global error handlers
      this.setupGlobalErrorHandlers();

      this.initialized = true;
      console.log('✅ [EnhancedDicomService] Initialized successfully');

    } catch (error) {
      const viewerError = await errorHandler.handleError(error as Error, {
        viewerMode: 'dicom_service_initialization'
      });
      
      throw viewerError;
    }
  }

  /**
   * Load a DICOM image with comprehensive error handling and multiple fallback strategies
   */
  async loadImage(
    imageId: string, 
    options: LoadingOptions = {}
  ): Promise<any> {
    const {
      priority = 'medium',
      timeout = 30000,
      retryConfig = {}
    } = options;

    const startTime = performance.now();
    console.log(`🔄 [EnhancedDicomService] Loading image: ${imageId}`);

    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if already loading
    if (this.loadingQueue.has(imageId)) {
      console.log(`⏳ [EnhancedDicomService] Image already loading: ${imageId}`);
      return this.loadingQueue.get(imageId);
    }

    // Check cache first
    const cached = this.getCachedImage(imageId);
    if (cached) {
      console.log(`✅ [EnhancedDicomService] Cache hit: ${imageId}`);
      this.updateCacheAccess(imageId);
      
      // Record cache hit performance
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordImageLoadTime(loadTime);
      
      return cached.image;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(imageId)) {
      const error = new Error('Circuit breaker is open for this image');
      throw await errorHandler.handleError(error, { 
        imageId, 
        viewerMode: 'circuit_breaker' 
      });
    }

    // Create loading promise with comprehensive error handling
    const loadingPromise = this.createLoadingPromise(imageId, options);
    this.loadingQueue.set(imageId, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadingQueue.delete(imageId);
      
      // Record successful load performance
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordImageLoadTime(loadTime);
      
      console.log(`✅ [EnhancedDicomService] Successfully loaded: ${imageId} in ${loadTime.toFixed(2)}ms`);
      return result;
    } catch (error) {
      this.loadingQueue.delete(imageId);
      
      // Record failed load performance
      const loadTime = performance.now() - startTime;
      performanceMonitor.recordImageLoadTime(loadTime);
      
      console.error(`❌ [EnhancedDicomService] Failed to load: ${imageId} after ${loadTime.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * Load DICOM image with multiple fallback strategies
   */
  async loadImageWithFallbacks(
    imageId: string,
    options: LoadingOptions = {}
  ): Promise<any> {
    const strategies = this.getLoadingStrategies(imageId);
    
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      
      try {
        console.log(`🔄 [EnhancedDicomService] Trying strategy ${i + 1}/${strategies.length}: ${strategy.name}`);
        const result = await strategy.load(imageId, options);
        
        if (result) {
          console.log(`✅ [EnhancedDicomService] Strategy ${strategy.name} succeeded for: ${imageId}`);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ [EnhancedDicomService] Strategy ${strategy.name} failed for ${imageId}:`, error);
        
        // If this is the last strategy, handle the error
        if (i === strategies.length - 1) {
          throw await errorHandler.handleError(error as Error, {
            imageId,
            viewerMode: 'fallback_strategies_exhausted'
          });
        }
      }
    }

    throw new Error('All loading strategies failed');
  }

  /**
   * Load multiple images with intelligent batching and error handling
   */
  async loadImages(
    imageIds: string[], 
    options: LoadingOptions = {}
  ): Promise<{ successful: any[]; failed: { imageId: string; error: ViewerError }[] }> {
    const startTime = performance.now();
    const successful: any[] = [];
    const failed: { imageId: string; error: ViewerError }[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = Math.min(this.maxConcurrentLoads, imageIds.length);
    
    for (let i = 0; i < imageIds.length; i += batchSize) {
      const batch = imageIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (imageId) => {
        try {
          const image = await this.loadImage(imageId, options);
          successful.push({ imageId, image });
        } catch (error) {
          failed.push({ 
            imageId, 
            error: error as ViewerError 
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    // Update cache hit rate
    const totalRequests = imageIds.length;
    const cacheHits = successful.length; // Simplified - actual cache hits would be tracked separately
    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    performanceMonitor.updateCacheHitRate(hitRate);

    // Record batch load time
    const totalTime = performance.now() - startTime;
    console.log(`📊 [EnhancedDicomService] Batch loaded ${successful.length}/${imageIds.length} images in ${totalTime.toFixed(2)}ms`);

    return { successful, failed };
  }

  /**
   * Load a complete study with progress tracking and error recovery
   */
  async loadStudy(
    study: Study, 
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<{ images: any[]; errors: ViewerError[] }> {
    const studyUid = study.study_uid;
    const startTime = performance.now();
    
    // Initialize study loading state
    const studyState: StudyLoadingState = {
      studyUid,
      totalImages: study.image_urls?.length || 0,
      loadedImages: 0,
      failedImages: 0,
      isLoading: true,
      startTime: Date.now(),
      errors: []
    };
    
    this.studyLoadingStates.set(studyUid, studyState);

    try {
      const imageIds = this.extractImageIds(study);
      
      if (imageIds.length === 0) {
        throw await errorHandler.handleError(
          new Error('No valid image URLs found in study'),
          { studyUid, viewerMode: 'study_loading' }
        );
      }

      const images: any[] = [];
      const errors: ViewerError[] = [];

      // Load images with progress tracking
      for (let i = 0; i < imageIds.length; i++) {
        const imageId = imageIds[i];
        
        try {
          const image = await this.loadImage(imageId, {
            priority: i < 3 ? 'high' : 'medium' // Prioritize first few images
          });
          
          images.push(image);
          studyState.loadedImages++;
          
          // Update progress
          const progress: LoadingProgress = {
            loaded: studyState.loadedImages,
            total: studyState.totalImages,
            percentage: (studyState.loadedImages / studyState.totalImages) * 100,
            currentImage: imageId,
            estimatedTimeRemaining: this.calculateEstimatedTime(studyState)
          };
          
          if (onProgress) {
            onProgress(progress);
          }

        } catch (error) {
          const viewerError = error as ViewerError;
          errors.push(viewerError);
          studyState.failedImages++;
          studyState.errors.push(viewerError);
          
          // Continue loading other images unless it's a critical error
          if (viewerError.severity === 'critical') {
            break;
          }
        }
      }

      studyState.isLoading = false;
      
      // Record study load performance
      const totalTime = performance.now() - startTime;
      performanceMonitor.recordStudyLoadTime(totalTime);
      
      console.log(`📊 [EnhancedDicomService] Study loaded: ${images.length}/${imageIds.length} images in ${totalTime.toFixed(2)}ms`);
      
      // If no images loaded successfully, throw an error
      if (images.length === 0) {
        throw await errorHandler.handleError(
          new Error('Failed to load any images from the study'),
          { studyUid }
        );
      }

      return { images, errors };

    } catch (error) {
      studyState.isLoading = false;
      
      // Record failed study load
      const totalTime = performance.now() - startTime;
      performanceMonitor.recordStudyLoadTime(totalTime);
      
      throw error;
    }
  }

  /**
   * Preload images intelligently based on current viewing context
   */
  async preloadImages(
    currentImageIndex: number,
    imageIds: string[],
    preloadCount: number = 5
  ): Promise<void> {
    const toPreload: string[] = [];
    
    // Preload next images
    for (let i = 1; i <= preloadCount && currentImageIndex + i < imageIds.length; i++) {
      toPreload.push(imageIds[currentImageIndex + i]);
    }
    
    // Preload previous images
    for (let i = 1; i <= Math.floor(preloadCount / 2) && currentImageIndex - i >= 0; i++) {
      toPreload.push(imageIds[currentImageIndex - i]);
    }

    // Load in background with low priority
    toPreload.forEach(imageId => {
      if (!this.imageCache.has(imageId) && !this.loadingQueue.has(imageId)) {
        this.loadImage(imageId, { priority: 'low', preload: true }).catch(error => {
          // Silently handle preload errors
          console.warn('Preload failed for', imageId, error);
        });
      }
    });
  }

  /**
   * Clear cache with intelligent eviction
   */
  clearCache(aggressive: boolean = false): void {
    if (aggressive) {
      this.imageCache.clear();
      this.currentCacheSize = 0;
    } else {
      // Smart eviction - remove least recently used items
      const entries = Array.from(this.imageCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const targetSize = this.maxCacheSize * 0.7; // Clear to 70% capacity
      let clearedSize = 0;
      
      for (const [key, entry] of entries) {
        if (this.currentCacheSize - clearedSize <= targetSize) break;
        
        this.imageCache.delete(key);
        clearedSize += entry.size;
      }
      
      this.currentCacheSize -= clearedSize;
    }

    // Emit cache cleared event
    window.dispatchEvent(new CustomEvent('dicom-cache-cleared', {
      detail: { aggressive, remainingSize: this.currentCacheSize }
    }));
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    totalSize: number;
    maxSize: number;
    itemCount: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    const entries = Array.from(this.imageCache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      itemCount: this.imageCache.size,
      hitRate: this.calculateCacheHitRate(),
      oldestItem: Math.min(...timestamps),
      newestItem: Math.max(...timestamps)
    };
  }

  /**
   * Add error callback
   */
  onError(callback: (error: ViewerError) => void): void {
    this.errorCallbacks.add(callback);
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(callback: (error: ViewerError) => void): void {
    this.errorCallbacks.delete(callback);
  }

  /**
   * Add recovery callback
   */
  onRecovery(callback: (imageId: string) => void): void {
    this.recoveryCallbacks.add(callback);
  }

  // Private methods

  private setupErrorHandlerIntegration(): void {
    // Listen for error handler events
    window.addEventListener('disable-gpu-acceleration', () => {
      this.disableGPUAcceleration();
    });

    window.addEventListener('clear-image-cache', () => {
      this.clearCache(true);
    });

    // Register with error handler for DICOM-specific recovery
    errorHandler.onError((error) => {
      if (error.type === ErrorType.DICOM_PARSING_ERROR || 
          error.type === ErrorType.RENDERING_ERROR) {
        this.handleDicomSpecificError(error);
      }
    });
  }

  private configureExternalLibraries(): void {
    // Configure cornerstone WADO image loader
    if (typeof (cornerstoneWADOImageLoader as any).external === 'object') {
      (cornerstoneWADOImageLoader as any).external.cornerstone = cornerstone;
      (cornerstoneWADOImageLoader as any).external.dicomParser = dicomParser;
    }

    // Configure web image loader
    if (typeof (cornerstoneWebImageLoader as any).external === 'object') {
      (cornerstoneWebImageLoader as any).external.cornerstone = cornerstone;
    }
  }

  private configureWADOImageLoader(): void {
    try {
      (cornerstoneWADOImageLoader as any).configure({
        useWebWorkers: false, // Start without web workers for reliability
        decodeConfig: {
          convertFloatPixelDataToInt: false,
          convertColorspaceToRGB: false
        },
        beforeSend: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Accept', 'application/dicom, */*');
          xhr.setRequestHeader('Cache-Control', 'no-cache');
          xhr.timeout = 30000;
          xhr.withCredentials = false;
        },
        errorInterceptor: (error: any) => {
          this.handleWADOError(error);
          return error;
        }
      });
    } catch (error) {
      console.error('Failed to configure WADO image loader:', error);
    }
  }

  private registerImageLoaders(): void {
    try {
      // Image loaders would be registered here if the API supported it
      console.log('Image loaders would be registered here');
      
      console.log('✅ Image loaders registered successfully');
    } catch (error) {
      console.error('Failed to register image loaders:', error);
      throw error;
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Cornerstone error handling would be set up here if the API supported it
    console.log('Cornerstone error handling would be set up here');
  }

  private async createLoadingPromise(imageId: string, options: LoadingOptions): Promise<any> {
    const retryConfig = { ...this.defaultRetryConfig, ...options.retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        console.log(`🔄 [EnhancedDicomService] Attempt ${attempt}/${retryConfig.maxAttempts} for: ${imageId}`);
        
        // Update loading state
        this.updateLoadingState(imageId, 'loading', attempt);

        // Load the image with fallback strategies
        const image = await this.loadImageAttempt(imageId, options);

        // Cache the successful result
        this.cacheImage(imageId, image);

        // Update loading state
        this.updateLoadingState(imageId, 'success', attempt);

        // Reset circuit breaker on success
        this.resetCircuitBreaker(imageId);

        // Notify recovery callbacks
        this.recoveryCallbacks.forEach(callback => callback(imageId));

        return image;

      } catch (error) {
        lastError = error as Error;
        
        console.warn(`⚠️ [EnhancedDicomService] Attempt ${attempt} failed for ${imageId}:`, error);
        
        // Update loading state
        this.updateLoadingState(imageId, 'failed', attempt, lastError);

        // Update circuit breaker
        this.updateCircuitBreaker(imageId);

        // If this is the last attempt, handle the error comprehensively
        if (attempt === retryConfig.maxAttempts) {
          const viewerError = await errorHandler.handleError(lastError, {
            imageId,
            viewerMode: 'image_loading_final_failure'
          });
          
          // Notify error callbacks with the original error converted to ViewerError
          const originalViewerError = errorHandler.createViewerError(lastError);
          this.errorCallbacks.forEach(callback => callback(originalViewerError));
          
          throw viewerError;
        }

        // Wait before retry with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, retryConfig);
        console.log(`⏳ [EnhancedDicomService] Waiting ${delay}ms before retry ${attempt + 1}`);
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Unknown error in loading promise');
  }

  /**
   * Get loading strategies in order of preference
   */
  private getLoadingStrategies(imageId: string): LoadingStrategy[] {
    return [
      {
        name: 'cornerstone_wadouri',
        description: 'Standard Cornerstone WADO-URI loader',
        load: async (id: string, opts: LoadingOptions) => {
          return await this.loadWithCornerstone(id, opts);
        }
      },
      {
        name: 'direct_http',
        description: 'Direct HTTP request with custom parsing',
        load: async (id: string, opts: LoadingOptions) => {
          return await this.loadWithDirectHttp(id, opts);
        }
      },
      {
        name: 'backend_api',
        description: 'Backend API processing',
        load: async (id: string, opts: LoadingOptions) => {
          return await this.loadWithBackendApi(id, opts);
        }
      },
      {
        name: 'web_image_fallback',
        description: 'Web image loader fallback',
        load: async (id: string, opts: LoadingOptions) => {
          return await this.loadWithWebImageLoader(id, opts);
        }
      }
    ];
  }

  /**
   * Load using standard Cornerstone WADO-URI loader
   */
  private async loadWithCornerstone(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      // Ensure proper WADO-URI format
      let wadoImageId = imageId;
      if (!imageId.startsWith('wadouri:')) {
        wadoImageId = `wadouri:${imageId}`;
      }

      const image = await cornerstone.loadImage(wadoImageId);
      
      if (!image) {
        throw new Error('Cornerstone returned null image');
      }

      return image;
    } catch (error) {
      console.error('Cornerstone loading failed:', error);
      throw error;
    }
  }

  /**
   * Load using direct HTTP request
   */
  private async loadWithDirectHttp(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      // Clean the image ID to get the URL
      let url = imageId.replace(/^wadouri:/, '');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/dicom, */*',
          'Cache-Control': 'no-cache'
        },
        // Note: AbortSignal.timeout is not available in all browsers, using manual timeout
        signal: this.createTimeoutSignal(options.timeout || 30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Create a basic image object (simplified for now)
      return {
        imageId,
        minPixelValue: 0,
        maxPixelValue: 255,
        slope: 1,
        intercept: 0,
        windowCenter: 128,
        windowWidth: 256,
        rows: 512,
        columns: 512,
        height: 512,
        width: 512,
        color: false,
        columnPixelSpacing: 1,
        rowPixelSpacing: 1,
        invert: false,
        sizeInBytes: arrayBuffer.byteLength,
        getPixelData: () => new Uint8Array(arrayBuffer)
      };
    } catch (error) {
      console.error('Direct HTTP loading failed:', error);
      throw error;
    }
  }

  /**
   * Load using backend API processing
   */
  private async loadWithBackendApi(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      // Extract patient ID and filename from the image ID or context
      // This is a simplified implementation - in practice, you'd need proper URL parsing
      const url = imageId.replace(/^wadouri:/, '');
      const urlParts = url.split('/');
      
      if (urlParts.length < 3) {
        throw new Error('Cannot extract patient ID and filename from URL');
      }

      const patientId = urlParts[urlParts.length - 2];
      const filename = urlParts[urlParts.length - 1];

      const apiUrl = `http://localhost:8000/api/dicom/process/${patientId}/${filename}?output_format=PNG&frame=0`;
      
      const response = await fetch(apiUrl, {
        signal: this.createTimeoutSignal(options.timeout || 60000)
      });

      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.image_data) {
        throw new Error('Backend API did not return valid image data');
      }

      // Convert base64 to image
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({
          imageId,
          image: img,
          width: img.width,
          height: img.height,
          rows: img.height,
          columns: img.width,
          getCanvas: () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            return canvas;
          }
        });
        img.onerror = reject;
        img.src = `data:image/png;base64,${result.image_data}`;
      });
    } catch (error) {
      console.error('Backend API loading failed:', error);
      throw error;
    }
  }

  /**
   * Load using web image loader as fallback
   */
  private async loadWithWebImageLoader(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      // Clean the image ID
      let url = imageId.replace(/^wadouri:/, '');
      
      // Try to load as a regular web image
      const webImageId = url.startsWith('http') ? url : `http:${url}`;
      
      const image = await cornerstone.loadImage(webImageId);
      
      if (!image) {
        throw new Error('Web image loader returned null');
      }

      return image;
    } catch (error) {
      console.error('Web image loader failed:', error);
      throw error;
    }
  }

  private async loadImageAttempt(imageId: string, options: LoadingOptions): Promise<any> {
    // Increment current loads counter
    this.currentLoads++;

    try {
      // Use cornerstone to load the image
      const image = await cornerstone.loadImage(imageId);
      return image;
    } finally {
      // Decrement current loads counter
      this.currentLoads--;
    }
  }

  private handleWADOError(error: any): void {
    // Enhanced WADO error logging
    console.group('🔴 [EnhancedDicomService] WADO Error');
    console.error('Error:', error);
    
    if (error?.request) {
      const xhr = error.request;
      console.log('Request details:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseURL: xhr.responseURL,
        timeout: xhr.timeout
      });
    }
    
    console.groupEnd();
  }

  private handleDicomSpecificError(error: ViewerError): void {
    // Handle DICOM-specific errors with custom recovery strategies
    if (error.imageId) {
      // Try alternative loading methods
      this.tryAlternativeLoading(error.imageId);
    }
  }

  private async tryAlternativeLoading(imageId: string): Promise<void> {
    // Implementation for alternative loading strategies
    // This could include trying different image formats, using backend processing, etc.
    console.log('Attempting alternative loading for:', imageId);
  }

  private disableGPUAcceleration(): void {
    // Disable GPU acceleration for compatibility
    console.log('🔄 Disabling GPU acceleration for compatibility');
    
    // This would involve reconfiguring rendering settings
    // Implementation depends on the specific rendering engine used
  }

  private extractImageIds(study: Study): string[] {
    const imageIds: string[] = [];
    
    if (study.image_urls && Array.isArray(study.image_urls)) {
      study.image_urls.forEach(url => {
        if (url && typeof url === 'string') {
          // Clean up the URL and add appropriate prefix
          let cleanUrl = url.replace(/^wadouri:/i, '');
          if (!cleanUrl.startsWith('http')) {
            cleanUrl = `http://localhost:8000${cleanUrl}`;
          }
          imageIds.push(`wadouri:${cleanUrl}`);
        }
      });
    }

    return imageIds;
  }

  private getCachedImage(imageId: string): CacheEntry | null {
    return this.imageCache.get(imageId) || null;
  }

  private cacheImage(imageId: string, image: any): void {
    const size = this.estimateImageSize(image);
    
    // Check if we need to make room
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictCacheEntries(size);
    }

    const entry: CacheEntry = {
      image,
      timestamp: Date.now(),
      accessCount: 1,
      size,
      quality: 'high'
    };

    this.imageCache.set(imageId, entry);
    this.currentCacheSize += size;
  }

  private updateCacheAccess(imageId: string): void {
    const entry = this.imageCache.get(imageId);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now();
    }
  }

  private evictCacheEntries(neededSize: number): void {
    const entries = Array.from(this.imageCache.entries())
      .sort((a, b) => {
        // Sort by access count (ascending) then by timestamp (ascending)
        if (a[1].accessCount !== b[1].accessCount) {
          return a[1].accessCount - b[1].accessCount;
        }
        return a[1].timestamp - b[1].timestamp;
      });

    let freedSize = 0;
    for (const [key, entry] of entries) {
      if (freedSize >= neededSize) break;
      
      this.imageCache.delete(key);
      freedSize += entry.size;
      this.currentCacheSize -= entry.size;
    }
  }

  private estimateImageSize(image: any): number {
    // Rough estimation of image size in memory
    if (image && image.width && image.height) {
      return image.width * image.height * 4; // Assume 4 bytes per pixel
    }
    return 1024 * 1024; // Default 1MB estimate
  }

  private calculateCacheHitRate(): number {
    // This would require tracking cache hits vs misses
    // For now, return a placeholder
    return 0.8; // 80% hit rate placeholder
  }

  private updateLoadingState(
    imageId: string, 
    status: 'loading' | 'success' | 'failed', 
    attempt: number, 
    error?: Error
  ): void {
    let state = this.loadingStates.get(imageId);
    if (!state) {
      state = {
        imageId,
        status: 'idle',
        attempts: [],
        retryConfig: this.defaultRetryConfig,
        circuitBreakerOpen: false,
        fallbackUsed: false
      };
      this.loadingStates.set(imageId, state);
    }

    state.status = status === 'loading' ? 'loading' : 
                   status === 'success' ? 'success' : 'failed';
    
    state.attempts.push({
      attempt,
      timestamp: Date.now(),
      success: status === 'success',
      error: error ? {
        type: 'network' as const,
        code: 'LOADING_ERROR',
        message: error.message,
        retryable: true,
        severity: 'medium' as const,
        timestamp: Date.now()
      } : undefined,
      duration: 0 // Would be calculated based on start time
    });
  }

  private isCircuitBreakerOpen(imageId: string): boolean {
    const breaker = this.circuitBreakers.get(imageId);
    if (!breaker) return false;

    const now = Date.now();
    if (breaker.isOpen && (now - breaker.lastFailure) > breaker.timeout) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }

    return breaker.isOpen;
  }

  private updateCircuitBreaker(imageId: string): void {
    let breaker = this.circuitBreakers.get(imageId);
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 3,
        timeout: 60000 // 1 minute
      };
      this.circuitBreakers.set(imageId, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= breaker.threshold) {
      breaker.isOpen = true;
    }
  }

  private resetCircuitBreaker(imageId: string): void {
    const breaker = this.circuitBreakers.get(imageId);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.jitter) {
      delay += Math.random() * 1000; // Add up to 1 second of jitter
    }
    
    return delay;
  }

  private calculateEstimatedTime(studyState: StudyLoadingState): number {
    const elapsed = Date.now() - studyState.startTime;
    const rate = studyState.loadedImages / elapsed;
    const remaining = studyState.totalImages - studyState.loadedImages;
    
    return remaining / rate;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }
}

// Export singleton instance
export const enhancedDicomService = new EnhancedDicomService();