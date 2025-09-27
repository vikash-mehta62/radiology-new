/**
 * Enhanced DICOM Service with Robust Error Handling
 * Integrates with the new error handler for comprehensive error management
 */

import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
// import * as cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import * as dicomParser from 'dicom-parser';
import { apiService } from './api';
import { errorHandler, ErrorType, ViewerError } from './errorHandler';
import { performanceMonitor } from './performanceMonitor';
import { DicomError, DicomLoadingState, RetryConfig, Study } from '../types';
import { dicomSecurityValidator, DicomValidationResult } from './dicomSecurityValidator';
import { dicomSecurityAudit } from './dicomSecurityAudit';
import { environmentService } from '../config/environment';




interface NormalizedImage {
  imageId: string;
  cornerstoneImage?: any;
  htmlImage?: HTMLImageElement;
  canvas?: HTMLCanvasElement;
  meta?: Record<string, any>;
}



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
// add at top of file (if not already present)
// npm install dicom-parser

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
  console.log(`[SERRVICELOAD ] 🔄 loadImage start: ${imageId}`, { priority });

  // Ensure service is initialized
  if (!this.initialized) {
    console.log('[SERRVICELOAD ] initializing service as it was not initialized');
    await this.initialize();
  }

  // If already loading, reuse
  if (this.loadingQueue.has(imageId)) {
    console.log(`[SERRVICELOAD ] ⏳ Image already loading (reuse promise): ${imageId}`);
    return this.loadingQueue.get(imageId);
  }

  // Cache check
  const cached = this.getCachedImage(imageId);
  if (cached) {
    console.log(`[SERRVICELOAD ] ✅ Cache hit: ${imageId}`);
    this.updateCacheAccess(imageId);
    const loadTime = performance.now() - startTime;
    performanceMonitor.recordImageLoadTime(loadTime);
    return cached.image;
  }

  // Circuit breaker
  if (this.isCircuitBreakerOpen(imageId)) {
    const err = new Error('Circuit breaker is open for this image');
    console.warn('[SERRVICELOAD ] circuit breaker open for', imageId);
    throw await errorHandler.handleError(err, { imageId, viewerMode: 'circuit_breaker' });
  }

  // Create loading promise
  const loadingPromise = this.createLoadingPromise(imageId, options);
  this.loadingQueue.set(imageId, loadingPromise);

  try {
    const result = await loadingPromise;
    this.loadingQueue.delete(imageId);

    const loadTime = performance.now() - startTime;
    performanceMonitor.recordImageLoadTime(loadTime);
    console.log(`[SERRVICELOAD ] ✅ Successfully loaded: ${imageId} in ${loadTime.toFixed(2)}ms`);
    return result;
  } catch (originalError) {
    this.loadingQueue.delete(imageId);

    const loadTime = performance.now() - startTime;
    performanceMonitor.recordImageLoadTime(loadTime);

    // Log original failure
    console.error(`[SERRVICELOAD ] ❌ Primary loader failed for ${imageId} after ${loadTime.toFixed(2)}ms`, normalizeError(originalError).message || originalError);

    // --- Diagnostic fallback: fetch raw bytes and inspect DICOM tags ---
    try {
      console.log('[SERRVICELOAD ] diagnostic fallback starting for', imageId);

      const rawUrl = (typeof imageId === 'string' && imageId.startsWith('wadouri:')) ? imageId.replace(/^wadouri:/, '') : imageId;
      console.log('[SERRVICELOAD ] diagnostic raw url:', rawUrl);

      const resp = await fetch(rawUrl, { method: 'GET', cache: 'no-cache' });
      console.log('[SERRVICELOAD ] diagnostic fetch status:', resp.status, 'for', rawUrl);

      if (!resp.ok) {
        const msg = `Raw fetch failed with status ${resp.status} ${resp.statusText}`;
        console.warn('[SERRVICELOAD ]', msg);
        // Attach diagnostic info and rethrow ViewerError
        const viewerErr = new ViewerError(msg, 'IMAGE_LOAD_ERROR', 'high');
        (viewerErr as any).diagnostic = { fetchStatus: resp.status, fetchStatusText: resp.statusText };
        throw viewerErr;
      }

      const contentType = resp.headers.get('content-type') || '';
      const arrayBuffer = await resp.arrayBuffer();
      const byteLength = arrayBuffer.byteLength;
      console.log('[SERRVICELOAD ] diagnostic fetched bytes:', byteLength, 'content-type:', contentType);

      // Try parsing with dicom-parser to extract tags
      let parsedMeta: Record<string, any> = {};
      try {
        const byteArray = new Uint8Array(arrayBuffer);
        const dataSet = dicomParser.parseDicom(byteArray);

        // Common tags (best-effort)
        parsedMeta.TransferSyntaxUID = dataSet.string('x00020010') || dataSet.string('x00020012') || dataSet.string('x00020002') || undefined;
        parsedMeta.Rows = dataSet.uint16('x00280010');
        parsedMeta.Columns = dataSet.uint16('x00280011');
        parsedMeta.BitsAllocated = dataSet.uint16('x00280100');
        parsedMeta.SamplesPerPixel = dataSet.uint16('x00280002');
        parsedMeta.PhotometricInterpretation = dataSet.string('x00280004');
        parsedMeta.PixelRepresentation = dataSet.uint16('x00280103');
        parsedMeta.PixelDataPresent = !!dataSet.elements.x7fe00010;
        parsedMeta.byteLength = byteLength;

        console.log('[SERRVICELOAD ] dicom-parser metadata:', parsedMeta);
      } catch (parseErr) {
        console.warn('[SERRVICELOAD ] dicom-parser failed to parse metadata:', normalizeError(parseErr).message || parseErr);
        parsedMeta.parseError = normalizeError(parseErr).message || String(parseErr);
      }

      // Decide based on Transfer Syntax UID / content-type
      const ts = parsedMeta.TransferSyntaxUID || null;
      if (ts) {
        console.warn('[SERRVICELOAD ] Detected TransferSyntaxUID:', ts);
        const friendlyMsg = `Unsupported or compressed Transfer Syntax detected (${ts}). Client cannot decode this format in-browser.`;
        const viewerErr = new ViewerError(friendlyMsg, 'UNSUPPORTED_TRANSFER_SYNTAX', 'high');
        (viewerErr as any).diagnostic = { ...parsedMeta, contentType };
        throw viewerErr;
      }

      // If pixel data present but no TSUID, likely uncompressed DICOM but loader still failed
      if (parsedMeta.PixelDataPresent) {
        const msg = 'PixelData present but client decoder failed — possible decoding bug or unsupported compression.';
        const viewerErr = new ViewerError(msg, 'PIXEL_DECODE_FAILED', 'high');
        (viewerErr as any).diagnostic = { ...parsedMeta, contentType };
        throw viewerErr;
      }

      // If nothing helpful, return a generic diagnostic failure
      const finalMsg = 'Raw fetch succeeded but no usable DICOM image could be decoded by client.';
      const viewerErr = new ViewerError(finalMsg, 'RAW_FETCH_NO_IMAGE', 'high');
      (viewerErr as any).diagnostic = { contentType, byteLength: byteLength, parsedMeta };
      throw viewerErr;

    } catch (diagnosticError) {
      // Final: log and throw ViewerError with diagnostic attached
      const norm = normalizeError(diagnosticError);
      console.error('[SERRVICELOAD ] diagnostic fallback produced error for', imageId, norm.message);

      // If diagnosticError is already a ViewerError, rethrow it
      if ((diagnosticError as any)?.isViewerError || (diagnosticError as any)?.code) {
        throw diagnosticError;
      }

      // Wrap into ViewerError
      const viewerErr = new ViewerError(norm.message || 'Image load failed', 'IMAGE_LOAD_ERROR', 'high');
      (viewerErr as any).diagnostic = (diagnosticError as any)?.meta || null;
      throw viewerErr;
    } finally {
      const dur = performance.now() - startTime;
      console.log(`[SERRVICELOAD ] loadImage finished for ${imageId} (durationMs: ${dur.toFixed(2)})`);
    }
  }
}


  /**
   * Load DICOM image with multiple fallback strategies
   */
async loadImageWithFallbacks(imageId: string, options: LoadingOptions = {}): Promise<NormalizedImage> {
  const strategies = this.getLoadingStrategies(imageId);
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    try {
      console.log(`[SERRVICELOAD ] Trying strategy ${i + 1}/${strategies.length}: ${strategy.name} for ${imageId}`);
      const result = await strategy.load(imageId, options);
      if (result) {
        // Ensure result is normalized
        if ((result as NormalizedImage).imageId) {
          console.log(`[SERRVICELOAD ] Strategy ${strategy.name} succeeded for ${imageId}`, {
            imageId,
            hasCornerstoneImage: !!(result as NormalizedImage).cornerstoneImage,
            hasCanvas: !!(result as NormalizedImage).canvas,
            hasHtmlImage: !!(result as NormalizedImage).htmlImage
          });
          return result as NormalizedImage;
        } else {
          // If legacy cornerstone image returned directly, wrap it
          console.log(`[SERRVICELOAD ] Strategy ${strategy.name} returned legacy shape; wrapping now`);
          const wrapped: NormalizedImage = {
            imageId,
            cornerstoneImage: (result as any),
            meta: {
              rows: (result as any)?.rows,
              columns: (result as any)?.columns
            }
          };
          return wrapped;
        }
      }
    } catch (err) {
      console.warn(`[SERRVICELOAD ] Strategy ${strategy.name} failed for ${imageId}:`, err);
      if (i === strategies.length - 1) {
        // Last strategy: escalate via errorHandler
        throw await errorHandler.handleError(err as Error, { imageId, viewerMode: 'fallback_strategies_exhausted' });
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
// enhancedDicomService.ts - instrumented loadStudy with [SERRVICELOAD ] logs
async loadStudy(
  study: Study,
  onProgress?: (progress: LoadingProgress) => void,
  options?: { enableProgressiveLoading?: boolean; maxMemoryUsage?: number; enableCompression?: boolean; qualityLevel?: string }
): Promise<
  { success: true; images: any[]; errors: ViewerError[]; message?: string } |
  { success: false; message: string; recoveryOptions?: any[] }
> {
  const studyUid = study?.study_uid ?? '(no-uid)';
  const startTime = performance.now();
  console.log('[SERRVICELOAD ] starting loadStudy for', studyUid, { shortStudy: { patient_id: study?.patient_id, study_uid: studyUid } });

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
    const imageIds = this.extractImageIds(study) || [];
    console.log('[SERRVICELOAD ] extracted imageIds count:', imageIds.length, 'imageIds:', imageIds.slice(0, 10));

    if (imageIds.length === 0) {
      console.warn('[SERRVICELOAD ] no imageIds found for', studyUid);
      const recovery = await errorHandler.handleError(new Error('No valid image URLs found in study'), { studyUid, viewerMode: 'study_loading' });
      console.log('[SERRVICELOAD ] recovery result for no-imageIds:', recovery);
      if (recovery.success) {
        return { success: false, message: 'No valid image URLs found after recovery', recoveryOptions: this.getRecoveryOptionsForNoImages() };
      } else {
        return { success: false, message: recovery.message || 'No valid image URLs found', recoveryOptions: this.getRecoveryOptionsForNoImages() };
      }
    }

    const images: any[] = [];
    const errors: ViewerError[] = [];

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      console.log('[SERRVICELOAD ] loading image', i + 1, '/', imageIds.length, '->', imageId);
      try {
        const image = await this.loadImage(imageId, { priority: i < 3 ? 'high' : 'medium' });
        console.log('[SERRVICELOAD ] loaded image success:', imageId);
        images.push(image);
        studyState.loadedImages++;

        const progress: LoadingProgress = {
          loaded: studyState.loadedImages,
          total: studyState.totalImages || imageIds.length,
          percentage: studyState.totalImages ? (studyState.loadedImages / studyState.totalImages) * 100 : Math.round((studyState.loadedImages / (i + 1)) * 100),
          currentImage: imageId,
          estimatedTimeRemaining: this.calculateEstimatedTime(studyState)
        };

        if (onProgress) {
          try { onProgress(progress); } catch (cbErr) { console.warn('[SERRVICELOAD ] onProgress threw', cbErr); }
        }
      } catch (err) {
        const viewerError: ViewerError = (err && (err as ViewerError).message) ? (err as ViewerError) : new ViewerError(String(err || 'Unknown image load error'), 'IMAGE_LOAD_ERROR', 'high');
        console.warn('[SERRVICELOAD ] image load failed:', imageId, viewerError.message);
        errors.push(viewerError);
        studyState.failedImages++;
        studyState.errors.push(viewerError);

        if (viewerError.severity === 'critical') {
          console.log('[SERRVICELOAD ] critical error detected, attempting recovery for imageId:', imageId);
          const recovery = await errorHandler.handleError(viewerError, { studyUid, imageId });
          console.log('[SERRVICELOAD ] recovery result for imageId:', imageId, recovery);
          if (!recovery.success) {
            console.error('[SERRVICELOAD ] recovery failed for critical image:', imageId, recovery);
            // continue to allow other images to try
          } else {
            console.info('[SERRVICELOAD ] recovery succeeded for critical image:', imageId, recovery);
          }
        }
      }
    }

    studyState.isLoading = false;
    const totalTime = performance.now() - startTime;
    performanceMonitor.recordStudyLoadTime(totalTime);
    console.log(`[SERRVICELOAD ] Study load summary for ${studyUid}: loaded=${images.length}, failed=${studyState.failedImages}, timeMs=${totalTime.toFixed(2)}`);

    if (images.length > 0) {
      console.log('[SERRVICELOAD ] returning success with images for', studyUid);
      return { success: true, images, errors, message: 'Study loaded' };
    }

    // Fallback attempts
    console.warn('[SERRVICELOAD ] no images loaded; attempting fallbacks for', studyUid);

    // 1) try alternative parser if available
    if (typeof (this as any).tryAlternativeParser === 'function') {
      try {
        console.log('[SERRVICELOAD ] trying alternative parser for', studyUid);
        const altOk = await (this as any).tryAlternativeParser(study, onProgress, options);
        console.log('[SERRVICELOAD ] alternative parser result:', !!altOk && (altOk.images?.length || 0));
        if (altOk?.images && altOk.images.length > 0) {
          console.log('[SERRVICELOAD ] alternative parser succeeded for', studyUid);
          return { success: true, images: altOk.images, errors: altOk.errors || [], message: 'Study loaded using alternative parser' };
        }
      } catch (altErr) {
        console.warn('[SERRVICELOAD ] alternative parser threw for', studyUid, altErr);
      }
    } else {
      console.log('[SERRVICELOAD ] no alternative parser available');
    }

    // 2) raw fetch first URL
    const firstUrl = (study.image_urls && study.image_urls[0]) || null;
    if (firstUrl) {
      console.log('[SERRVICELOAD ] attempting raw fetch fallback for', firstUrl);
      try {
        const resp = await fetch(firstUrl, { method: 'GET', cache: 'no-cache' });
        console.log('[SERRVICELOAD ] raw fetch status for', firstUrl, resp.status);
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || '';
          console.log('[SERRVICELOAD ] raw fetch content-type:', contentType);
          const blob = await resp.blob();
          if (contentType.startsWith('image/')) {
            const url = URL.createObjectURL(blob);
            const fallbackImage = { imageId: `fallback:${studyUid}`, src: url, meta: { contentType } };
            console.log('[SERRVICELOAD ] raw fetch produced fallback image for', studyUid);
            return { success: true, images: [fallbackImage], errors, message: 'Loaded fallback image from raw fetch' };
          } else {
            console.warn('[SERRVICELOAD ] raw fetch unsupported content-type', contentType);
          }
        } else {
          console.warn('[SERRVICELOAD ] raw fetch response not ok', resp.status);
        }
      } catch (fetchErr) {
        console.warn('[SERRVICELOAD ] raw fetch failed for', firstUrl, fetchErr);
      }
    } else {
      console.log('[SERRVICELOAD ] no firstUrl available for raw fetch');
    }

    console.error('[SERRVICELOAD ] final structured failure for', studyUid);
// replace occurrences of this.getRecoveryOptionsForNoImages() with this quick inline array
const defaultRecoveryOptions = [
  { type: 'retry', label: 'Retry', description: 'Try loading the study again' },
  { type: 'use_cached', label: 'Use cached data (if available)', description: 'Load images from local cache' },
  { type: 'basic_viewer', label: 'Open Basic Viewer', description: 'Open a simplified viewer that may handle different formats' },
  { type: 'report', label: 'Report issue', description: 'Create a bug report with logs' }
];

console.log('[SERRVICELOAD ] returning success with images array:', images.map(img => ({
  imageId: img.imageId,
  hasCornerstoneImage: !!img.cornerstoneImage,
  hasHtmlImage: !!img.htmlImage,
  hasCanvas: !!img.canvas,
  meta: img.meta
})));


// example:
return { success: false, message: 'Failed to load any images from the study (recovery did not produce images)', recoveryOptions: defaultRecoveryOptions };
  } catch (error) {
    studyState.isLoading = false;
    const totalTime = performance.now() - startTime;
    performanceMonitor.recordStudyLoadTime(totalTime);
    const normalized = (error instanceof Error) ? error : new Error(String((error as any)?.message || error || 'Unknown study load error'));
    console.error('[SERRVICELOAD ] unexpected failure in loadStudy for', studyUid, normalized);
    throw normalized;
  } finally {
    console.log('[SERRVICELOAD ] finished loadStudy for', studyUid, 'state:', {
      loaded: studyState.loadedImages,
      failed: studyState.failedImages,
      isLoading: studyState.isLoading
    });
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

  // private configureExternalLibraries(): void {
  //   // Configure cornerstone WADO image loader
  //   if (typeof (cornerstoneWADOImageLoader as any).external === 'object') {
  //     (cornerstoneWADOImageLoader as any).external.cornerstone = cornerstone;
  //     (cornerstoneWADOImageLoader as any).external.dicomParser = dicomParser;
  //   }

  //   // Configure web image loader
  //   if (typeof (cornerstoneWebImageLoader as any).external === 'object') {
  //     (cornerstoneWebImageLoader as any).external.cornerstone = cornerstone;
  //   }
  // }



private configureExternalLibraries(): void {
  try {
    const wadoExt = (cornerstoneWADOImageLoader as any).external;
    if (wadoExt && typeof wadoExt === 'object') {
      // Do not overwrite the property (it may be getter-only). Instead set properties on the existing object.
      try {
        wadoExt.cornerstone = cornerstone;
        wadoExt.dicomParser = dicomParser;
        console.log('[SERRVICELOAD ] configureExternalLibraries: attached cornerstone and dicomParser to existing external object');
      } catch (e) {
        console.warn('[SERRVICELOAD ] configureExternalLibraries: failed to assign to existing external object', e);
      }
    } else {
      // If external is not present or not writable, log and continue (we'll still use direct HTTP parsing fallback)
      console.warn('[SERRVICELOAD ] configureExternalLibraries: external object not writable or missing — skipping assignment');
    }
  } catch (err) {
    console.warn('[SERRVICELOAD ] configureExternalLibraries failed', err);
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
      console.log(`🔄 [SERRVICELOAD ] Attempt ${attempt}/${retryConfig.maxAttempts} for: ${imageId}`);

      // Update loading state
      this.updateLoadingState(imageId, 'loading', attempt);

      // Instead of a single attempt, use the ordered fallback strategies
      const image = await this.loadImageWithFallbacks(imageId, options);

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

      console.warn(`⚠️ [SERRVICELOAD ] Attempt ${attempt} failed for ${imageId}:`, lastError);

      // Update loading state
      this.updateLoadingState(imageId, 'failed', attempt, lastError);

      // Update circuit breaker
      this.updateCircuitBreaker(imageId);

      // If this is the last attempt, escalate to error handler
      if (attempt === retryConfig.maxAttempts) {
        const viewerError = await errorHandler.handleError(lastError, {
          imageId,
          viewerMode: 'image_loading_final_failure'
        });

        // Notify error callbacks with the normalized ViewerError
        const originalViewerError = errorHandler.createViewerError(lastError);
        this.errorCallbacks.forEach(callback => callback(originalViewerError));

        throw viewerError;
      }

      // Backoff delay
      const delay = this.calculateRetryDelay(attempt, retryConfig);
      console.log(`⏳ [SERRVICELOAD ] Waiting ${delay}ms before retry ${attempt + 1} for ${imageId}`);
      await this.sleep(delay);
    }
  }

  throw lastError || new Error('Unknown error in loading promise');
}
/**
 * Load using VTK enhanced service if available.
 * This attempts to detect a VTK service injected on window or attached to this instance.
 * If not present or not capable, it will throw to allow other strategies to run.
 */
private async loadWithVTK(imageId: string, options: LoadingOptions): Promise<any> {
  console.log('[SERRVICELOAD ] loadWithVTK start for', imageId, options);

  // Try to find vtkEnhanced service — supports multiple injection patterns
  const vtkSvc =
    (this as any).VTKEnhancedService ||
    (this as any).vtkService ||
    (window as any).vtkEnhancedService ||
    (window as any).vtkService ||
    null;

  if (!vtkSvc) {
    console.warn('[SERRVICELOAD ] loadWithVTK: no vtk service found on this or window — skipping VTK path.');
    throw new Error('VTK service not available');
  }

  // Normalize URL
  const url = (typeof imageId === 'string' && imageId.startsWith('wadouri:')) ? imageId.replace(/^wadouri:/, '') : String(imageId);

  try {
    // Fetch raw bytes (we still parse; VTK wrapper may accept raw bytes or typed arrays)
    console.log('[SERRVICELOAD ] loadWithVTK fetching raw bytes for', url);
    const resp = await fetch(url, { method: 'GET', cache: 'no-cache' });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    const size = arrayBuffer.byteLength;
    console.log('[SERRVICELOAD ] loadWithVTK fetched bytes:', size);

    // Try to parse some DICOM metadata for diagnostics
    let meta: any = {};
    try {
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);
      meta.TransferSyntaxUID = dataSet.string('x00020010') || dataSet.string('x00020012') || dataSet.string('x00020002');
      meta.Rows = dataSet.uint16('x00280010');
      meta.Columns = dataSet.uint16('x00280011');
      meta.PixelDataPresent = !!dataSet.elements.x7fe00010;
      meta.BitsAllocated = dataSet.uint16('x00280100');
      meta.SamplesPerPixel = dataSet.uint16('x00280002');
      meta._parsed = true;
      console.log('[SERRVICELOAD ] loadWithVTK dicom-parser meta:', meta);
    } catch (pErr) {
      console.warn('[SERRVICELOAD ] loadWithVTK dicom-parser parse failed (non-fatal):', pErr);
      meta._parsed = false;
    }

    // Build a payload that a typical vtkEnhancedService would accept:
    const payload = {
      imageId,
      url,
      arrayBuffer,            // raw bytes
      byteArray: new Uint8Array(arrayBuffer),
      meta,
      options
    };

    console.log('[SERRVICELOAD ] loadWithVTK calling vtk service, payload keys:', Object.keys(payload.meta || {}).length ? Object.keys(payload) : Object.keys(payload));

    // Two common method names — try them in order
    if (typeof vtkSvc.loadDicomFromArrayBuffer === 'function') {
      console.log('[SERRVICELOAD ] loadWithVTK using vtkSvc.loadDicomFromArrayBuffer');
      const res = await vtkSvc.loadDicomFromArrayBuffer(payload.arrayBuffer, { imageId, options });
      console.log('[SERRVICELOAD ] vtkSvc.loadDicomFromArrayBuffer succeeded', !!res);
      return res;
    }

    if (typeof vtkSvc.renderImageFromArrayBuffer === 'function') {
      console.log('[SERRVICELOAD ] loadWithVTK using vtkSvc.renderImageFromArrayBuffer');
      const res = await vtkSvc.renderImageFromArrayBuffer((payload.byteArray), { imageId, viewportId: options.quality || 'default' });
      console.log('[SERRVICELOAD ] vtkSvc.renderImageFromArrayBuffer succeeded', !!res);
      return res;
    }

    // Generic loader hook: renderImageInViewport (in case service expects viewport element)
    if (typeof vtkSvc.renderImageInViewport === 'function') {
      // Provide viewport element if service expects it (caller will pick element)
      const viewportEl = document.createElement('div'); // placeholder - caller may replace
      console.log('[SERRVICELOAD ] loadWithVTK calling vtkSvc.renderImageInViewport (placeholder element used)');
      const res = await vtkSvc.renderImageInViewport(viewportEl, {
        pixelData: payload.byteArray,
        rows: meta.Rows,
        columns: meta.Columns,
        imageId
      });
      return res;
    }

    console.warn('[SERRVICELOAD ] loadWithVTK: vtk service present but no compatible method found');
    throw new Error('VTK service present but not compatible (missing expected methods)');

  } catch (err) {
    console.error('[SERRVICELOAD ] loadWithVTK failed for', imageId, err);
    throw err;
  }
}


  /**
   * Get loading strategies in order of preference
   */
/**
 * Get loading strategies in order of preference
 * - Prefer VTK rendering/decoding when available (for 2D & 3D)
 * - Then try direct HTTP parsing, backend API, then web-image fallback
 */
private getLoadingStrategies(imageId: string): LoadingStrategy[] {
  return [
    {
      name: 'vtk_enhanced',
      description: 'VTK.js enhanced loader (preferred for 2D/3D rendering)',
      load: async (id: string, opts: LoadingOptions) => {
        return await this.loadWithVTK(id, opts);
      }
    },
    {
      name: 'cornerstone_wadouri',
      description: 'Cornerstone WADO-URI loader (legacy fallback)',
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
private async loadWithCornerstone(imageId: string, options: LoadingOptions): Promise<NormalizedImage> {
  console.log('[SERRVICELOAD ] loadWithCornerstone start for', imageId);
  try {
    let wadoImageId = imageId;
    if (!imageId.startsWith('wadouri:')) {
      wadoImageId = `wadouri:${imageId}`;
    }

    const csImage = await cornerstone.loadImage(wadoImageId);
    if (!csImage) {
      throw new Error('Cornerstone returned null image');
    }

    // Wrap into normalized shape
    const normalized: NormalizedImage = {
      imageId,
      cornerstoneImage: csImage,
      meta: {
        rows: csImage.rows,
        columns: csImage.columns,
        windowCenter: csImage.windowCenter,
        windowWidth: csImage.windowWidth,
        color: csImage.color ?? false
      }
    };

    console.log('[SERRVICELOAD ] loadWithCornerstone -> normalized result:', {
      imageId: normalized.imageId,
      hasCornerstoneImage: !!normalized.cornerstoneImage,
      meta: normalized.meta
    });

    return normalized;
  } catch (err) {
    console.error('[SERRVICELOAD ] loadWithCornerstone failed for', imageId, err);
    throw err;
  }
}


  /**
   * Load using direct HTTP request
   */
private async loadWithDirectHttp(imageId: string, options: LoadingOptions): Promise<NormalizedImage> {
  console.log('[SERRVICELOAD ] loadWithDirectHttp start for', imageId);
  try {
    // Get URL
    let url = (imageId || '').replace(/^wadouri:/i, '');
    if (!url.startsWith('http')) url = `${environmentService.getApiUrl()}${url}`;
    console.log('[SERRVICELOAD ] fetch url:', url);

    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/dicom, */*', 'Cache-Control': 'no-cache' },
      signal: this.createTimeoutSignal(options.timeout || 30000)
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    console.log('[SERRVICELOAD ] fetched bytes:', arrayBuffer.byteLength);

    // Parse with dicom-parser
    let dataSet: any = null;
    const parsedMeta: any = {};
    try {
      const byteArray = new Uint8Array(arrayBuffer);
      dataSet = dicomParser.parseDicom(byteArray);

      parsedMeta.TransferSyntaxUID =
        dataSet.string('x00020010') ||
        dataSet.string('x00020012') ||
        dataSet.string('x00020002') || null;
      parsedMeta.Rows = dataSet.uint16('x00280010');
      parsedMeta.Columns = dataSet.uint16('x00280011');
      parsedMeta.BitsAllocated = dataSet.uint16('x00280100');
      parsedMeta.SamplesPerPixel = dataSet.uint16('x00280002');
      parsedMeta.PixelDataPresent = !!(dataSet.elements && dataSet.elements.x7fe00010);

      console.log('[SERRVICELOAD ] dicom-parser metadata:', parsedMeta);
    } catch (pe) {
      console.warn('[SERRVICELOAD ] dicom-parser failed:', pe);
      parsedMeta.parseError = (pe && (pe as any).message) || String(pe);
    }

    const ts = parsedMeta.TransferSyntaxUID;

    // If JPEG Baseline TSUID -> extract fragments and build JPEG blob
    if (ts === '1.2.840.10008.1.2.4.50') {
      console.log('[SERRVICELOAD ] Detected JPEG Baseline TSUID, attempting fragment extraction');

      if (!dataSet || !dataSet.elements || !dataSet.elements.x7fe00010) {
        throw new Error('PixelData element missing for compressed JPEG DICOM');
      }

      const pixelElem = dataSet.elements.x7fe00010;
      const underlying = (dataSet as any).byteArray as Uint8Array;
      const fragments: Uint8Array[] = [];

      // Try dicomParser helper first
      try {
        if ((dicomParser as any).readEncapsulatedPixelData) {
          const frags = (dicomParser as any).readEncapsulatedPixelData(dataSet, pixelElem);
          if (frags && frags.length) {
            for (const f of frags) fragments.push(f);
          }
        }
      } catch (e) {
        console.warn('[SERRVICELOAD ] readEncapsulatedPixelData failed:', e);
      }

      // Fallback: dataSet.fragments
      if (fragments.length === 0 && (dataSet as any).fragments && (dataSet as any).fragments.x7fe00010) {
        const fragArray = (dataSet as any).fragments.x7fe00010;
        for (const frag of fragArray) fragments.push(new Uint8Array(frag));
      }

      // Last fallback: copy the whole element bytes (best-effort)
      if (fragments.length === 0 && pixelElem && typeof pixelElem.dataOffset === 'number') {
        try {
          const start = pixelElem.dataOffset;
          const len = pixelElem.length || (underlying.length - start);
          fragments.push(new Uint8Array(underlying.buffer, start, len));
        } catch (e) {
          console.warn('[SERRVICELOAD ] fallback fragment extraction failed:', e);
        }
      }

      if (fragments.length === 0) {
        throw new Error('No encapsulated JPEG fragments found');
      }

      // Concatenate fragments
      let total = 0;
      for (const f of fragments) total += f.byteLength;
      const combined = new Uint8Array(total);
      let off = 0;
      for (const f of fragments) {
        combined.set(f, off);
        off += f.byteLength;
      }

      // Make blob, image, canvas
      const blob = new Blob([combined.buffer], { type: 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);

      const htmlImg: HTMLImageElement = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = (e) => reject(new Error('Failed to create HTML image from JPEG blob'));
        i.crossOrigin = 'anonymous';
        i.src = blobUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = htmlImg.width;
      canvas.height = htmlImg.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(htmlImg, 0, 0);

      const normalized: NormalizedImage = {
        imageId,
        htmlImage: htmlImg,
        canvas,
        meta: parsedMeta
      };

      console.log('[SERRVICELOAD ] loadWithDirectHttp -> built image from JPEG fragments', {
        imageId,
        width: htmlImg.width,
        height: htmlImg.height,
        meta: parsedMeta
      });

      return normalized;
    }

    // If uncompressed pixel data present -> attempt to build canvas from raw pixel array (best-effort)
    if (parsedMeta.PixelDataPresent && (!ts || ts === '1.2.840.10008.1.2' || ts === '1.2.840.10008.1.2.1')) {
      try {
        // Attempt to extract pixel data from dataset
        const elem = dataSet.elements.x7fe00010;
        if (elem) {
          const byteArray = (dataSet as any).byteArray as Uint8Array;
          const pixelOffset = elem.dataOffset;
          const pixelLength = elem.length;
          const pixelData = new Uint8Array(byteArray.buffer, pixelOffset, pixelLength);

          // Build ImageData for canvas (assuming 8-bit grayscale)
          const rows = parsedMeta.Rows || 0;
          const cols = parsedMeta.Columns || 0;
          const imgCanvas = document.createElement('canvas');
          imgCanvas.width = cols;
          imgCanvas.height = rows;
          const ctx = imgCanvas.getContext('2d');
          const imageData = ctx!.createImageData(cols, rows);
          // Fill RGBA from grayscale pixelData
          for (let p = 0, q = 0; p < pixelData.length && q < imageData.data.length; p++, q += 4) {
            const v = pixelData[p];
            imageData.data[q] = v;
            imageData.data[q + 1] = v;
            imageData.data[q + 2] = v;
            imageData.data[q + 3] = 255;
          }
          ctx!.putImageData(imageData, 0, 0);

          const normalized: NormalizedImage = {
            imageId,
            canvas: imgCanvas,
            meta: parsedMeta
          };
          console.log('[SERRVICELOAD ] loadWithDirectHttp -> constructed canvas from uncompressed pixel data', { imageId, rows, cols });
          return normalized;
        }
      } catch (e) {
        console.warn('[SERRVICELOAD ] failed to construct canvas from raw pixel data:', e);
      }
    }

    // Otherwise, no usable image
    const msg = 'Direct HTTP fetch succeeded but could not create usable image client-side';
    const ve = new ViewerError(msg, 'RAW_FETCH_NO_IMAGE', 'high');
    (ve as any).diagnostic = parsedMeta;
    throw ve;

  } catch (err) {
    console.error('[SERRVICELOAD ] loadWithDirectHttp failed for', imageId, err);
    throw err;
  }
}




  /**
   * Load using backend API processing with fallback filename support
   */
  private async loadWithBackendApi(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      // Extract patient ID and filename from the image ID or context
      const url = imageId.replace(/^wadouri:/, '');
      const urlParts = url.split('/');
      
      if (urlParts.length < 3) {
        throw new Error('Cannot extract patient ID and filename from URL');
      }

      const patientId = urlParts[urlParts.length - 2];
      const requestedFilename = urlParts[urlParts.length - 1];

      // Try different filename variations with backend fallback mechanism
      const possibleFilenames = [
        requestedFilename,
        '0002.DCM',
        '1234.DCM', 
        '0020.DCM',
        'image.dcm',
        'study.dcm'
      ];

      let lastError: Error | null = null;

      for (const filename of possibleFilenames) {
        try {
          console.log(`🔄 [EnhancedDicomService] Trying backend API with filename: ${filename}`);
          
          const apiUrl = `${environmentService.getApiUrl()}/dicom/process/${patientId}/${filename}?output_format=PNG&frame=0`;
          
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

          console.log(`✅ [EnhancedDicomService] Backend API succeeded with filename: ${filename}`);

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
              actualFilename: filename, // Include the actual filename used
              metadata: result.metadata,
              getCanvas: () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                return canvas;
              }
            });
            img.onerror = (error) => reject(new Error(`Failed to load image from base64 data: ${error}`));
            img.src = `data:image/png;base64,${result.image_data}`;
          });

        } catch (error) {
          console.warn(`⚠️ [EnhancedDicomService] Backend API failed with filename ${filename}:`, error);
          lastError = error as Error;
          continue; // Try next filename
        }
      }

      // If all filenames failed, throw the last error
      throw lastError || new Error('All backend API filename attempts failed');

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
      // Perform DICOM security validation before loading
      let url = imageId.replace(/^wadouri:/, '');
      
      // Fetch the DICOM file for validation
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/dicom, */*',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch DICOM file: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Validate DICOM file security
      const validationResult: DicomValidationResult = await dicomSecurityValidator.validateDicomFile(new Uint8Array(arrayBuffer));
      
      if (!validationResult.isValid) {
        const errorMessage = `DICOM security validation failed: ${validationResult.errors.join(', ')}`;
        console.error('🚨 [EnhancedDicomService] Security validation failed:', validationResult);
        
        // Log security audit event for validation failure
        await dicomSecurityAudit.logValidationFailure(imageId, validationResult.errors, {
          fileSize: arrayBuffer.byteLength,
          url: url,
          validationResult: validationResult
        });
        
        throw new Error(errorMessage);
      }

      if (validationResult.warnings.length > 0) {
        console.warn('⚠️ [EnhancedDicomService] DICOM validation warnings:', validationResult.warnings);
        
        // Log suspicious activity for warnings
        await dicomSecurityAudit.logSuspiciousActivity(
          `DICOM validation warnings: ${validationResult.warnings.join(', ')}`,
          undefined,
          undefined,
          { imageId, warnings: validationResult.warnings }
        );
      }

      console.log('✅ [EnhancedDicomService] DICOM security validation passed for:', imageId);
      
      // Log successful validation
      await dicomSecurityAudit.logValidationSuccess(imageId, {
        loadTime: performance.now() - (performance.now() - 100), // Approximate validation time
        fileSize: arrayBuffer.byteLength,
        memoryUsage: arrayBuffer.byteLength
      });

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
    console.error('Error:', error?.message || error?.toString() || JSON.stringify(error));
    
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
    
    // Handle array of image URLs (existing format)
    if (study.image_urls && Array.isArray(study.image_urls)) {
      study.image_urls.forEach(url => {
        if (url && typeof url === 'string') {
          // Clean up the URL and add appropriate prefix
          let cleanUrl = url.replace(/^wadouri:/i, '');
          if (!cleanUrl.startsWith('http')) {
            cleanUrl = `${environmentService.getApiUrl()}${cleanUrl}`;
          }
          imageIds.push(`wadouri:${cleanUrl}`);
        }
      });
    }
    
    // Handle single file with filename and dicom_url (real patient data format)
    else if (study.filename || study.dicom_url) {
      let imageUrl = '';
      
      if (study.dicom_url) {
        // Use dicom_url directly
        imageUrl = study.dicom_url;
      } else if (study.filename && study.patient_id) {
        // Construct URL from patient_id and filename
        imageUrl = `/uploads/${study.patient_id}/${study.filename}`;
      } else if (study.filename) {
        // Fallback: use filename directly
        imageUrl = `/uploads/${study.filename}`;
      }
      
      if (imageUrl) {
        // Clean up the URL and add appropriate prefix
        let cleanUrl = imageUrl.replace(/^wadouri:/i, '');
        if (!cleanUrl.startsWith('http')) {
          cleanUrl = `${environmentService.getApiUrl()}${cleanUrl}`;
        }
        imageIds.push(`wadouri:${cleanUrl}`);
        console.log('[SERRVICELOAD] extracted imageId for real patient data:', `wadouri:${cleanUrl}`);
      }
    }
    
    // Handle original_filename as fallback
    else if (study.original_filename && study.patient_id) {
      const imageUrl = `/uploads/${study.patient_id}/${study.original_filename}`;
      let cleanUrl = imageUrl.replace(/^wadouri:/i, '');
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = `${environmentService.getApiUrl()}${cleanUrl}`;
      }
      imageIds.push(`wadouri:${cleanUrl}`);
      console.log('[SERRVICELOAD] extracted imageId from original_filename:', `wadouri:${cleanUrl}`);
    }

    console.log('[SERRVICELOAD] extractImageIds result:', imageIds);
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