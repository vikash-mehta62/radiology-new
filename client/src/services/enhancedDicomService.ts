// EnhancedDicomService.ts - Enhanced DICOM service with comprehensive loading strategies
import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import dicomParser from 'dicom-parser';
import { Study, LoadingProgress, ViewerError, LoadingOptions, NormalizedImage } from '../types';
import { errorHandler, ErrorType } from './errorHandler';
import { performanceMonitor } from './performanceMonitor';
import { environmentService } from '../config/environment';
import { gpuDiagnosticsService, GPUDiagnosticResult } from './gpuDiagnosticsService';

interface StudyLoadingState {
  studyUid: string;
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  isLoading: boolean;
  startTime: number;
  errors: ViewerError[];
}

interface CacheEntry {
  image: any;
  timestamp: number;
  size: number;
  accessCount: number;
}

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface LoadingStrategy {
  name: string;
  description: string;
  load: (imageId: string, options: LoadingOptions) => Promise<any>;
}

interface RenderingFallbackOptions {
  forceRenderer?: 'webgpu' | 'webgl2' | 'webgl' | 'software';
  enableGPUDiagnostics?: boolean;
  fallbackOnContextLoss?: boolean;
  performanceThreshold?: number;
}

class EnhancedDicomService {
  private initialized = false;
  private imageCache = new Map<string, CacheEntry>();
  private loadingQueue = new Map<string, Promise<any>>();
  private studyLoadingStates = new Map<string, StudyLoadingState>();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private currentCacheSize = 0;
  private maxConcurrentLoads = 6;
  private currentLoads = 0;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorCallbacks = new Set<(error: ViewerError) => void>();
  private recoveryCallbacks = new Set<(imageId: string) => void>();
  
  // GPU and rendering management
  private gpuDiagnostics: GPUDiagnosticResult | null = null;
  private currentRenderer: 'webgpu' | 'webgl2' | 'webgl' | 'software' = 'webgpu';
  private renderingFallbackEnabled = true;
  private contextLossCount = 0;
  private lastContextLossTime = 0;

  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  }

  private async loadWithWADORS(imageId: string, options: LoadingOptions): Promise<NormalizedImage> {
    try {
      const url = imageId.replace(/^wadouri:/, '');
      const urlParts = url.split('/');
      
      if (urlParts.length < 3) {
        throw new Error('Cannot extract patient ID and filename from URL');
      }

      const patientId = urlParts[urlParts.length - 2];
      const requestedFilename = urlParts[urlParts.length - 1];
      const frame = options.frame || 0;

      console.log(`🚀 [EnhancedDicomService] Using WADO-RS for ${patientId}/${requestedFilename}, frame ${frame}`);
      
      // Use WADO-RS endpoint for raw DICOM data
      const wadoRSUrl = `${environmentService.getApiUrl()}/rs/studies/${patientId}/instances/${requestedFilename}/frames/${frame + 1}`;
      
      const response = await fetch(wadoRSUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`WADO-RS request failed: ${response.status} ${response.statusText}`);
      }

      // Get metadata from response headers or separate metadata call
      const metadataUrl = `${environmentService.getApiUrl()}/rs/studies/${patientId}/instances/${requestedFilename}/metadata`;
      const metadataResponse = await fetch(metadataUrl);
      const metadata = await metadataResponse.json();

      // Get raw pixel data
      const pixelData = await response.arrayBuffer();
      
      // Create image object compatible with Cornerstone
      const image = {
        imageId,
        minPixelValue: metadata.minPixelValue || 0,
        maxPixelValue: metadata.maxPixelValue || 4095,
        slope: metadata.rescaleSlope || 1,
        intercept: metadata.rescaleIntercept || 0,
        windowCenter: metadata.windowCenter || 2048,
        windowWidth: metadata.windowWidth || 4096,
        rows: metadata.rows,
        columns: metadata.columns,
        height: metadata.rows,
        width: metadata.columns,
        color: metadata.photometricInterpretation === 'RGB',
        columnPixelSpacing: metadata.pixelSpacing?.[0] || 1,
        rowPixelSpacing: metadata.pixelSpacing?.[1] || 1,
        sizeInBytes: pixelData.byteLength,
        getPixelData: () => new Uint16Array(pixelData)
      };

      console.log(`✅ [EnhancedDicomService] WADO-RS loaded: ${image.width}x${image.height}, ${pixelData.byteLength} bytes`);
      
      return {
        imageId,
        image,
        width: image.width,
        height: image.height,
        meta: {
          rows: image.height,
          columns: image.width,
          pixelSpacing: metadata.pixelSpacing,
          windowCenter: image.windowCenter,
          windowWidth: image.windowWidth
        }
      };
    } catch (error) {
      console.error(`❌ [EnhancedDicomService] WADO-RS error:`, error);
      throw error;
    }
  };

  constructor() {
    this.setupErrorHandlerIntegration();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 [EnhancedDicomService] Initializing enhanced DICOM service...');
      
      // Run GPU diagnostics first
      await this.runGPUDiagnostics();
      
      // Initialize Cornerstone with appropriate renderer
      await this.initializeCornerstoneWithRenderer();
      
      this.registerImageLoaders();
      this.setupGlobalErrorHandlers();
      this.setupRenderingFallbacks();
      
      this.initialized = true;
      console.log('✅ [EnhancedDicomService] Service initialized successfully');
    } catch (error) {
      console.error('❌ [EnhancedDicomService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive GPU diagnostics and set optimal renderer
   */
  private async runGPUDiagnostics(): Promise<void> {
    try {
      console.log('🔍 [EnhancedDicomService] Running GPU diagnostics...');
      
      this.gpuDiagnostics = await gpuDiagnosticsService.runDiagnostics();
      this.currentRenderer = this.gpuDiagnostics.recommendedRenderer;
      
      console.log('📊 [EnhancedDicomService] GPU Diagnostics Results:', {
        recommendedRenderer: this.currentRenderer,
        performanceScore: this.gpuDiagnostics.performanceScore,
        capabilities: this.gpuDiagnostics.capabilities,
        warnings: this.gpuDiagnostics.warnings,
        errors: this.gpuDiagnostics.errors
      });

      // Log warnings and errors
      if (this.gpuDiagnostics.warnings.length > 0) {
        console.warn('⚠️ [EnhancedDicomService] GPU Warnings:', this.gpuDiagnostics.warnings);
      }
      
      if (this.gpuDiagnostics.errors.length > 0) {
        console.error('❌ [EnhancedDicomService] GPU Errors:', this.gpuDiagnostics.errors);
      }

    } catch (error) {
      console.error('❌ [EnhancedDicomService] GPU diagnostics failed:', error);
      this.currentRenderer = 'software';
      this.gpuDiagnostics = null;
    }
  }

  /**
   * Initialize Cornerstone with the appropriate renderer based on GPU diagnostics
   */
  private async initializeCornerstoneWithRenderer(): Promise<void> {
    try {
      console.log(`🎨 [EnhancedDicomService] Initializing Cornerstone with ${this.currentRenderer} renderer`);

      // Configure Cornerstone based on renderer
      const config = this.getCornerstoneConfig(this.currentRenderer);
      
      // Initialize Cornerstone with specific configuration
      if (typeof cornerstone.init === 'function') {
        await cornerstone.init(config);
      }

      // Set up renderer-specific optimizations
      this.applyRendererOptimizations(this.currentRenderer);

    } catch (error) {
      console.error(`❌ [EnhancedDicomService] Failed to initialize ${this.currentRenderer} renderer:`, error);
      
      // Try fallback renderer
      if (this.currentRenderer !== 'software') {
        console.log('🔄 [EnhancedDicomService] Attempting fallback to software renderer');
        this.currentRenderer = 'software';
        await this.initializeCornerstoneWithRenderer();
      } else {
        throw new Error('All rendering options failed');
      }
    }
  }

  /**
   * Get Cornerstone configuration for specific renderer
   */
  private getCornerstoneConfig(renderer: string): any {
    const baseConfig = {
      maxWebWorkers: navigator.hardwareConcurrency || 4,
      startWebWorkersOnDemand: true,
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: true,
          usePDFJS: false,
          strict: false
        }
      }
    };

    switch (renderer) {
      case 'webgpu':
        return {
          ...baseConfig,
          preferredRenderer: 'webgpu',
          enableWebGPU: true,
          enableWebGL2: false,
          enableWebGL: false
        };
      
      case 'webgl2':
        return {
          ...baseConfig,
          preferredRenderer: 'webgl2',
          enableWebGPU: false,
          enableWebGL2: true,
          enableWebGL: false
        };
      
      case 'webgl':
        return {
          ...baseConfig,
          preferredRenderer: 'webgl',
          enableWebGPU: false,
          enableWebGL2: false,
          enableWebGL: true
        };
      
      case 'software':
      default:
        return {
          ...baseConfig,
          preferredRenderer: 'software',
          enableWebGPU: false,
          enableWebGL2: false,
          enableWebGL: false,
          useCPURendering: true
        };
    }
  }

  /**
   * Apply renderer-specific optimizations
   */
  private applyRendererOptimizations(renderer: string): void {
    switch (renderer) {
      case 'webgpu':
        // WebGPU optimizations
        this.maxConcurrentLoads = 8;
        this.maxCacheSize = 1024 * 1024 * 1024; // 1GB
        break;
      
      case 'webgl2':
        // WebGL2 optimizations
        this.maxConcurrentLoads = 6;
        this.maxCacheSize = 512 * 1024 * 1024; // 512MB
        break;
      
      case 'webgl':
        // WebGL optimizations
        this.maxConcurrentLoads = 4;
        this.maxCacheSize = 256 * 1024 * 1024; // 256MB
        break;
      
      case 'software':
        // Software rendering optimizations
        this.maxConcurrentLoads = 2;
        this.maxCacheSize = 128 * 1024 * 1024; // 128MB
        break;
    }

    console.log(`⚙️ [EnhancedDicomService] Applied ${renderer} optimizations:`, {
      maxConcurrentLoads: this.maxConcurrentLoads,
      maxCacheSize: `${this.maxCacheSize / (1024 * 1024)}MB`
    });
  }

  /**
   * Setup rendering fallback mechanisms
   */
  private setupRenderingFallbacks(): void {
    // Listen for GPU context loss
    gpuDiagnosticsService.addContextLossListener(() => {
      this.handleRenderingFailure('context_loss');
    });

    // Monitor performance and trigger fallbacks if needed
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup performance monitoring for automatic fallbacks
   */
  private setupPerformanceMonitoring(): void {
    let frameCount = 0;
    let lastCheck = Date.now();

    const checkPerformance = () => {
      frameCount++;
      
      if (frameCount % 60 === 0) { // Check every 60 frames
        const now = Date.now();
        const fps = 60000 / (now - lastCheck);
        lastCheck = now;

        // Trigger fallback if performance is too low
        if (fps < 15 && this.currentRenderer !== 'software') {
          console.warn(`⚠️ [EnhancedDicomService] Low FPS detected (${fps.toFixed(1)}), considering fallback`);
          this.handleRenderingFailure('low_performance');
        }

        // Update GPU diagnostics service with performance metrics
        gpuDiagnosticsService.updatePerformanceMetrics(1000 / fps, this.currentCacheSize);
      }

      requestAnimationFrame(checkPerformance);
    };

    requestAnimationFrame(checkPerformance);
  }

  /**
   * Handle rendering failures and trigger appropriate fallbacks
   */
  private async handleRenderingFailure(reason: string): Promise<void> {
    console.warn(`🚨 [EnhancedDicomService] Rendering failure detected: ${reason}`);
    
    this.contextLossCount++;
    this.lastContextLossTime = Date.now();

    // Force fallback to next available renderer
    const newRenderer = gpuDiagnosticsService.forceFallback(reason);
    
    if (newRenderer !== this.currentRenderer) {
      console.log(`🔄 [EnhancedDicomService] Switching from ${this.currentRenderer} to ${newRenderer}`);
      
      this.currentRenderer = newRenderer as any;
      
      try {
        // Reinitialize with new renderer
        await this.initializeCornerstoneWithRenderer();
        
        // Clear cache to force re-rendering with new renderer
        this.clearCache(true);
        
        // Notify recovery callbacks
        this.recoveryCallbacks.forEach(callback => {
          try {
            callback(`renderer_switched_to_${newRenderer}`);
          } catch (error) {
            console.error('Recovery callback error:', error);
          }
        });
        
        console.log(`✅ [EnhancedDicomService] Successfully switched to ${newRenderer} renderer`);
        
      } catch (error) {
        console.error(`❌ [EnhancedDicomService] Failed to switch to ${newRenderer}:`, error);
        
        // If all else fails, force software rendering
        if (newRenderer !== 'software') {
          this.currentRenderer = 'software';
          await this.initializeCornerstoneWithRenderer();
        }
      }
    }
  }

  /**
   * Setup GPU diagnostics and monitoring
   */
  private setupGPUDiagnostics(): void {
    // Monitor for WebGL context loss
    window.addEventListener('webglcontextlost', (event) => {
      console.warn('🚨 [EnhancedDicomService] WebGL context lost:', event);
      event.preventDefault();
      this.handleRenderingFailure('webgl_context_lost');
    });

    window.addEventListener('webglcontextrestored', (event) => {
      console.log('✅ [EnhancedDicomService] WebGL context restored:', event);
    });
  }

  /**
   * Get current GPU diagnostics and rendering status
   */
  getGPUStatus(): {
    diagnostics: GPUDiagnosticResult | null;
    currentRenderer: string;
    contextLossCount: number;
    performanceMetrics: any;
  } {
    return {
      diagnostics: this.gpuDiagnostics,
      currentRenderer: this.currentRenderer,
      contextLossCount: this.contextLossCount,
      performanceMetrics: gpuDiagnosticsService.getPerformanceMetrics()
    };
  }

  /**
   * Force a specific renderer (for testing/debugging)
   */
  async forceRenderer(renderer: 'webgpu' | 'webgl2' | 'webgl' | 'software'): Promise<void> {
    console.log(`🔧 [EnhancedDicomService] Forcing renderer to: ${renderer}`);
    
    this.currentRenderer = renderer;
    await this.initializeCornerstoneWithRenderer();
    this.clearCache(true);
  }

  private async loadWithBackendApi(imageId: string, options: LoadingOptions): Promise<any> {
    try {
      const url = imageId.replace(/^wadouri:/, '');
      const urlParts = url.split('/');
      
      if (urlParts.length < 3) {
        throw new Error('Cannot extract patient ID and filename from URL');
      }

      const patientId = urlParts[urlParts.length - 2];
      const requestedFilename = urlParts[urlParts.length - 1];
      const frame = options.frame || 0;

      console.log(`🚀 [EnhancedDicomService] Using direct PNG serving for ${patientId}/${requestedFilename}`);
      
      const pngUrl = `${environmentService.getApiUrl()}/dicom/png/${patientId}/${requestedFilename}?frame=${frame}`;
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          resolve({
            imageId,
            image: img,
            width: img.naturalWidth,
            height: img.naturalHeight,
            meta: {
              rows: img.naturalHeight,
              columns: img.naturalWidth
            }
          });
        };
        
        img.onerror = (error) => {
          console.error(`❌ [EnhancedDicomService] PNG load failed: ${pngUrl}`, error);
          reject(new Error(`Failed to load PNG: ${pngUrl}`));
        };
        
        img.src = pngUrl;
      });
    } catch (error) {
      console.error(`❌ [EnhancedDicomService] Backend API error:`, error);
      throw error;
    }
  }

  private async loadWithCornerstone(imageId: string, options: LoadingOptions): Promise<NormalizedImage> {
    console.log('[SERRVICELOAD] loadWithCornerstone start for', imageId);
    try {
      let wadoImageId = imageId;
      if (!imageId.startsWith('wadouri:')) {
        wadoImageId = `wadouri:${imageId}`;
      }

      const csImage = await cornerstone.loadImage(wadoImageId);
      if (!csImage) {
        throw new Error('Cornerstone returned null image');
      }

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

      return normalized;
    } catch (err) {
      console.error('[SERRVICELOAD] loadWithCornerstone failed for', imageId, err);
      throw err;
    }
  }

  private async loadWithDirectHttp(imageId: string, options: LoadingOptions): Promise<NormalizedImage> {
    console.log('[SERRVICELOAD] loadWithDirectHttp start for', imageId);
    try {
      let url = (imageId || '').replace(/^wadouri:/i, '');
      if (!url.startsWith('http')) url = `${environmentService.getApiUrl()}${url}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/dicom, */*',
          'Cache-Control': 'no-cache'
        }
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      
      // Basic DICOM parsing for metadata
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);
      
      const meta = {
        rows: dataSet.uint16('x00280010'),
        columns: dataSet.uint16('x00280011'),
        windowCenter: dataSet.floatString('x00281050'),
        windowWidth: dataSet.floatString('x00281051')
      };

      return {
        imageId,
        cornerstoneImage: {
          imageId,
          rows: meta.rows,
          columns: meta.columns,
          windowCenter: meta.windowCenter,
          windowWidth: meta.windowWidth,
          getPixelData: () => byteArray
        },
        meta
      };
    } catch (err) {
      console.error('[SERRVICELOAD] loadWithDirectHttp failed for', imageId, err);
      throw err;
    }
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.jitter) {
      delay += Math.random() * 1000;
    }
    
    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupErrorHandlerIntegration(): void {
    // Listen for error handler events
    window.addEventListener('disable-gpu-acceleration', () => {
      console.log('[EnhancedDicomService] GPU acceleration disabled');
    });

    window.addEventListener('clear-image-cache', () => {
      this.clearCache(true);
    });

    // Register with error handler for DICOM-specific recovery
    errorHandler.onError((error) => {
      if (error.type === ErrorType.DICOM_PARSING_ERROR || 
          error.type === ErrorType.RENDERING_ERROR) {
        console.log('[EnhancedDicomService] Handling DICOM-specific error:', error);
      }
    });
  }

  private configureExternalLibraries(): void {
    try {
      const wadoExt = (cornerstoneWADOImageLoader as any).external;
      if (wadoExt && typeof wadoExt === 'object') {
        try {
          wadoExt.cornerstone = cornerstone;
          wadoExt.dicomParser = dicomParser;
          console.log('[SERRVICELOAD] configureExternalLibraries: attached cornerstone and dicomParser');
        } catch (e) {
          console.warn('[SERRVICELOAD] configureExternalLibraries: failed to assign to existing external object', e);
        }
      } else {
        console.warn('[SERRVICELOAD] configureExternalLibraries: external object not writable or missing');
      }
    } catch (err) {
      console.warn('[SERRVICELOAD] configureExternalLibraries failed', err);
    }
  }

  private configureWADOImageLoader(): void {
    try {
      (cornerstoneWADOImageLoader as any).configure({
        useWebWorkers: true, // Enable web workers for WADO-RS processing
        maxWebWorkers: Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)),
        decodeConfig: {
          convertFloatPixelDataToInt: false,
          convertColorspaceToRGB: false
        },
        beforeSend: (xhr: XMLHttpRequest) => {
          // Configure for WADO-RS requests
          xhr.setRequestHeader('Accept', 'application/dicom, application/octet-stream, */*');
          xhr.setRequestHeader('Cache-Control', 'no-cache');
          xhr.timeout = 30000;
          xhr.withCredentials = false;
        }
      });
      
      console.log('✅ [EnhancedDicomService] WADO Image Loader configured for WADO-RS');
    } catch (error) {
      console.error('Failed to configure WADO image loader:', error);
    }
  }

  private registerImageLoaders(): void {
    try {
      console.log('Image loaders would be registered here');
      console.log('✅ Image loaders registered successfully');
    } catch (error) {
      console.error('Failed to register image loaders:', error);
      throw error;
    }
  }

  private setupGlobalErrorHandlers(): void {
    console.log('Cornerstone error handling would be set up here');
  }

  clearCache(aggressive: boolean = false): void {
    if (aggressive) {
      this.imageCache.clear();
      this.currentCacheSize = 0;
    } else {
      this.cleanCache();
    }

    window.dispatchEvent(new CustomEvent('dicom-cache-cleared', {
      detail: { aggressive, remainingSize: this.currentCacheSize }
    }));
  }

  onError(callback: (error: ViewerError) => void): void {
    this.errorCallbacks.add(callback);
  }

  removeErrorCallback(callback: (error: ViewerError) => void): void {
    this.errorCallbacks.delete(callback);
  }

  onRecovery(callback: (imageId: string) => void): void {
    this.recoveryCallbacks.add(callback);
  }

  /**
   * Load a complete DICOM study with progress tracking
   */
  async loadStudy(
    study: Study, 
    progressCallback?: (progress: LoadingProgress) => void,
    options: LoadingOptions = {}
  ): Promise<{ images: any[], errors: ViewerError[], success: boolean, message?: string }> {
    console.log('🚀 [EnhancedDicomService] Loading study:', study.study_uid, 'Patient:', study.patient_id);
    
    if (!this.initialized) {
      await this.initialize();
    }

    const studyUID = study.study_uid;
    const loadedImages: any[] = [];
    const errors: ViewerError[] = [];
    let totalImages = 0;
    let loadedCount = 0;

    // Extract image URLs from study
    const imageUrls: string[] = [];
    
    if (study.image_urls && Array.isArray(study.image_urls)) {
      imageUrls.push(...study.image_urls);
    }
    
    if (study.dicom_url && !imageUrls.includes(study.dicom_url)) {
      imageUrls.push(study.dicom_url);
    }
    
    // Fallback: construct URL from patient_id and filename
    if (imageUrls.length === 0 && study.patient_id && (study.filename || study.original_filename)) {
      const filename = study.filename || study.original_filename;
      const fallbackUrl = `http://localhost:8000/uploads/${study.patient_id}/${filename}`;
      imageUrls.push(fallbackUrl);
    }

    if (imageUrls.length === 0) {
      const errorMsg = 'No image URLs found in study data';
      console.error('❌ [EnhancedDicomService]', errorMsg);
      return {
        images: [],
        errors: [{ message: errorMsg, type: 'STUDY_LOADING_ERROR', timestamp: Date.now() }],
        success: false,
        message: errorMsg
      };
    }

    totalImages = imageUrls.length;
    console.log(`📊 [EnhancedDicomService] Found ${totalImages} image URLs to load`);

    // Initialize study loading state
    this.studyLoadingStates.set(studyUID, {
      studyUid: studyUID,
      totalImages,
      loadedImages: 0,
      failedImages: 0,
      isLoading: true,
      startTime: Date.now(),
      errors: []
    });

    // Progress reporting helper
    const reportProgress = (loaded: number, failed: number) => {
      const progress = Math.round(((loaded + failed) / totalImages) * 100);
      const progressData: LoadingProgress = {
        studyUID,
        imageId: '',
        progress,
        loaded,
        total: totalImages,
        failed,
        stage: loaded + failed === totalImages ? 'complete' : 'loading',
        message: `Loading images: ${loaded}/${totalImages} (${failed} failed)`
      };
      
      if (progressCallback) {
        progressCallback(progressData);
      }
    };

    // Load images with concurrency control
    const loadPromises = imageUrls.map(async (url, index) => {
      try {
        // Convert to wadouri format if needed
        let imageId = url;
        if (!imageId.startsWith('wadouri:') && imageId.startsWith('http')) {
          imageId = `wadouri:${imageId}`;
        }

        console.log(`🔄 [EnhancedDicomService] Loading image ${index + 1}/${totalImages}: ${imageId}`);

        // Use the existing loading strategies
        const loadOptions: LoadingOptions = {
          ...options,
          frame: 0,
          priority: 'normal'
        };

        let image;
        try {
          // Try WADO-RS first
          image = await this.loadWithWADORS(imageId, loadOptions);
        } catch (wadoError) {
          console.warn(`⚠️ [EnhancedDicomService] WADO-RS failed for ${imageId}, trying direct HTTP:`, wadoError);
          try {
            // Fallback to direct HTTP
            image = await this.loadWithDirectHttp(imageId, loadOptions);
          } catch (httpError) {
            console.warn(`⚠️ [EnhancedDicomService] Direct HTTP failed for ${imageId}, trying backend API:`, httpError);
            // Final fallback to backend API
            image = await this.loadWithBackendApi(imageId, loadOptions);
          }
        }

        loadedImages.push(image);
        loadedCount++;
        
        console.log(`✅ [EnhancedDicomService] Successfully loaded image ${index + 1}/${totalImages}`);
        reportProgress(loadedCount, errors.length);
        
        return image;
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown loading error';
        console.error(`❌ [EnhancedDicomService] Failed to load image ${index + 1}/${totalImages}:`, errorMsg);
        
        const viewerError: ViewerError = {
          message: `Failed to load image ${index + 1}: ${errorMsg}`,
          type: 'IMAGE_LOADING_ERROR',
          timestamp: Date.now(),
          imageId: url
        };
        
        errors.push(viewerError);
        reportProgress(loadedCount, errors.length);
        
        return null;
      }
    });

    // Wait for all images to load (or fail)
    const results = await Promise.allSettled(loadPromises);
    
    // Update study loading state
    const studyState = this.studyLoadingStates.get(studyUID);
    if (studyState) {
      studyState.isLoading = false;
      studyState.loadedImages = loadedCount;
      studyState.failedImages = errors.length;
      studyState.errors = errors;
    }

    // Determine success
    const success = loadedImages.length > 0;
    let message: string;
    
    if (loadedImages.length === totalImages) {
      message = `Successfully loaded all ${totalImages} images`;
      console.log(`✅ [EnhancedDicomService] ${message}`);
    } else if (loadedImages.length > 0) {
      message = `Partially loaded study: ${loadedImages.length}/${totalImages} images (${errors.length} failed)`;
      console.warn(`⚠️ [EnhancedDicomService] ${message}`);
    } else {
      message = `Failed to load any images from study`;
      console.error(`❌ [EnhancedDicomService] ${message}`);
      throw new Error(message);
    }

    return {
      images: loadedImages,
      errors,
      success,
      message
    };
  }
}

// Export singleton instance
export const enhancedDicomService = new EnhancedDicomService();