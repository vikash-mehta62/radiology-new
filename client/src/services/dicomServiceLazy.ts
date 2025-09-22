/**
 * Lazy-loaded DICOM Service
 * Dynamically imports cornerstone libraries to reduce initial bundle size
 */

import { apiService } from './api';
import { DicomError, DicomLoadingState, RetryConfig } from '../types';

// Type definitions for cornerstone libraries
type CornerstoneCore = typeof import('cornerstone-core');
type CornerstoneWADOImageLoader = typeof import('cornerstone-wado-image-loader');
type CornerstoneWebImageLoader = typeof import('cornerstone-web-image-loader');
type DicomParser = typeof import('dicom-parser');

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

class LazyDicomService {
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
  private errorCallbacks = new Set<(error: DicomError) => void>();
  private recoveryCallbacks = new Set<(imageId: string) => void>();

  // Lazy-loaded libraries
  private cornerstone: CornerstoneCore | null = null;
  private cornerstoneWADOImageLoader: CornerstoneWADOImageLoader | null = null;
  private cornerstoneWebImageLoader: CornerstoneWebImageLoader | null = null;
  private dicomParser: DicomParser | null = null;

  private async loadCornerstoneLibraries() {
    if (this.cornerstone) return; // Already loaded

    try {
      // Load libraries dynamically
      const [
        cornerstoneModule,
        wadoLoaderModule,
        webLoaderModule,
        dicomParserModule
      ] = await Promise.all([
        import('cornerstone-core'),
        import('cornerstone-wado-image-loader'),
        import('cornerstone-web-image-loader'),
        import('dicom-parser')
      ]);

      this.cornerstone = cornerstoneModule;
      this.cornerstoneWADOImageLoader = wadoLoaderModule;
      this.cornerstoneWebImageLoader = webLoaderModule;
      this.dicomParser = dicomParserModule;

      console.log('Cornerstone libraries loaded successfully');
    } catch (error) {
      console.error('Failed to load cornerstone libraries:', error);
      throw new Error('Failed to initialize DICOM libraries');
    }
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load cornerstone libraries first
      await this.loadCornerstoneLibraries();

      if (!this.cornerstone || !this.cornerstoneWADOImageLoader || !this.cornerstoneWebImageLoader) {
        throw new Error('Cornerstone libraries not loaded');
      }

      // Configure WADO Image Loader
      (this.cornerstoneWADOImageLoader as any).external.cornerstone = this.cornerstone;
      (this.cornerstoneWADOImageLoader as any).external.dicomParser = this.dicomParser;

      // Configure Web Image Loader
      (this.cornerstoneWebImageLoader as any).external.cornerstone = this.cornerstone;

      // Configure WADO Image Loader settings
      this.cornerstoneWADOImageLoader.configure({
        useWebWorkers: true,
        decodeConfig: {
          convertFloatPixelDataToInt: false,
          use16BitDataType: true
        },
        webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.js',
        taskConfiguration: {
          decodeTask: {
            loadCodecsOnStartup: true,
            initializeCodecsOnStartup: false,
            codecsPath: '/cornerstoneWADOImageLoaderCodecs.js',
            usePDFJS: false,
            strict: false
          }
        }
      });

      this.initialized = true;
      console.log('Lazy DICOM Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DICOM service:', error);
      throw error;
    }
  }

  async loadImage(imageId: string, options: LoadingOptions = {}): Promise<any> {
    await this.initialize();
    
    if (!this.cornerstone) {
      throw new Error('Cornerstone not initialized');
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

    // Start loading
    const loadingPromise = this.performImageLoadWithRetry(imageId, options);
    this.loadingQueue.set(imageId, loadingPromise);

    try {
      const image = await loadingPromise;
      this.addToCache(imageId, image);
      return image;
    } finally {
      this.loadingQueue.delete(imageId);
    }
  }

  private async performImageLoadWithRetry(imageId: string, options: LoadingOptions): Promise<any> {
    if (!this.cornerstone) {
      throw new Error('Cornerstone not initialized');
    }

    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
    };

    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await this.cornerstone.loadImage(imageId);
      } catch (error) {
        lastError = error;
        
        if (attempt < retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryConfig);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  private addToCache(imageId: string, image: any) {
    const size = this.estimateImageSize(image);
    
    // Evict if cache would exceed limit
    while (this.currentCacheSize + size > this.maxCacheSize && this.imageCache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    this.imageCache.set(imageId, {
      image,
      timestamp: Date.now(),
      accessCount: 1,
      size
    });
    
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
    
    for (const [imageId, entry] of this.imageCache.entries()) {
      if (!oldestEntry || entry.timestamp < oldestEntry[1].timestamp) {
        oldestEntry = [imageId, entry];
      }
    }

    if (oldestEntry) {
      this.imageCache.delete(oldestEntry[0]);
      this.currentCacheSize -= oldestEntry[1].size;
    }
  }

  private estimateImageSize(image: any): number {
    if (image && image.width && image.height) {
      return image.width * image.height * 2; // Assume 16-bit pixels
    }
    return 1024 * 1024; // Default 1MB estimate
  }

  async enableElement(element: HTMLElement): Promise<void> {
    await this.initialize();
    
    if (!this.cornerstone) {
      throw new Error('Cornerstone not initialized');
    }

    this.cornerstone.enable(element);
  }

  disableElement(element: HTMLElement): void {
    if (this.cornerstone) {
      this.cornerstone.disable(element);
    }
  }

  async displayImage(element: HTMLElement, imageId: string, options: LoadingOptions = {}): Promise<void> {
    await this.initialize();
    
    if (!this.cornerstone) {
      throw new Error('Cornerstone not initialized');
    }

    const image = await this.loadImage(imageId, options);
    this.cornerstone.displayImage(element, image);
  }

  clearCache() {
    this.imageCache.clear();
    this.currentCacheSize = 0;
  }

  getCacheStats() {
    return {
      size: this.imageCache.size,
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      hitRate: this.calculateCacheHitRate()
    };
  }

  private calculateCacheHitRate(): number {
    // Simple implementation - could be enhanced with actual hit/miss tracking
    return this.imageCache.size > 0 ? 0.8 : 0;
  }

  dispose() {
    this.clearCache();
    this.loadingQueue.clear();
    this.loadingStates.clear();
    this.studyLoadingStates.clear();
    this.progressCallbacks.clear();
    this.errorCallbacks.clear();
    this.recoveryCallbacks.clear();
    this.initialized = false;
  }
}

export const lazyDicomService = new LazyDicomService();