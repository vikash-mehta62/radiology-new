import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

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
  timeout?: number;
}

interface StudyLoadingState {
  studyUid: string;
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  isComplete: boolean;
  retryConfig: {
    maxRetries: number;
    currentRetry: number;
    backoffMultiplier: number;
  };
}

class DicomServiceBlackImageFix {
  private initialized = false;
  private imageCache = new Map<string, CacheEntry>();
  private loadingQueue = new Map<string, Promise<any>>();
  private studyLoadingStates = new Map<string, StudyLoadingState>();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private currentCacheSize = 0;
  private preloadWorker: Worker | null = null;
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔄 [DicomServiceFix] Already initialized');
      return;
    }

    try {
      console.log('🚀 [DicomServiceFix] Starting initialization...');
      
      // Initialize cornerstone
      console.log('⚡ [DicomServiceFix] Initializing cornerstone...');
      
      // Configure WADO Image Loader with enhanced settings
      const config = {
        maxWebWorkers: navigator.hardwareConcurrency || 4,
        startWebWorkersOnDemand: true,
        taskConfiguration: {
          decodeTask: {
            initializeCodecsOnStartup: false,
            usePDFJS: false,
            strict: false
          }
        },
        // Enhanced DICOM parsing options
        beforeSend: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Accept', 'application/dicom, image/jpeg, image/png, */*');
          xhr.setRequestHeader('Cache-Control', 'no-cache');
          xhr.timeout = 30000; // 30 second timeout
          // Enable credentials for CORS if needed
          xhr.withCredentials = false;
        },
        // Add error handling for XMLHttpRequest
        errorInterceptor: function (error: any) {
          console.error('DICOM loading error intercepted:', error);
          return error;
        }
      };
      
      // Initialize WADO Image Loader with correct API
      if (typeof (cornerstoneWADOImageLoader as any).external === 'function') {
        (cornerstoneWADOImageLoader as any).external({
          cornerstone: cornerstone,
          dicomParser: dicomParser
        });
      } else {
        // Fallback to old API
        (cornerstoneWADOImageLoader as any).external.cornerstone = cornerstone;
        (cornerstoneWADOImageLoader as any).external.dicomParser = dicomParser;
      }
      cornerstoneWADOImageLoader.configure(config);
      
      console.log('✅ [DicomServiceFix] WADO Image Loader configured');
      
      // Initialize web workers with error handling
      if ((cornerstoneWADOImageLoader as any).webWorkerManager) {
        // Disable web workers initially for faster startup
        (cornerstoneWADOImageLoader as any).webWorkerManager.initialize({
          maxWebWorkers: 0,
          startWebWorkersOnDemand: false
        });
        
        // Enable web workers after a delay for better performance
        setTimeout(() => {
          console.log('🔧 [DicomServiceFix] Enabling web workers for better performance...');
          if ((cornerstoneWADOImageLoader as any).webWorkerManager) {
            (cornerstoneWADOImageLoader as any).webWorkerManager.initialize({
              maxWebWorkers: Math.min(navigator.hardwareConcurrency || 2, 4),
              startWebWorkersOnDemand: true
            });
          }
        }, 2000);
      } else {
        console.warn('⚠️ [DicomServiceFix] webWorkerManager not available, continuing without web workers');
      }
      
      // Set up cache cleanup interval
      setInterval(() => {
        this.cleanupCache();
      }, 60000); // Clean up every minute
      
      // Initialize preload worker
      this.initializePreloadWorker();
      
      this.initialized = true;
      console.log('✅ [DicomServiceFix] Initialization complete');
      
    } catch (error) {
      console.error('❌ [DicomServiceFix] Initialization failed:', error);
      throw new Error(`DICOM service initialization failed: ${error}`);
    }
  }

  private initializePreloadWorker(): void {
    try {
      // Simple preload worker for background image loading
      const workerCode = `
        self.onmessage = function(e) {
          const { imageIds, priority } = e.data;
          // Simulate preloading logic
          setTimeout(() => {
            self.postMessage({ status: 'completed', imageIds });
          }, 100);
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.preloadWorker = new Worker(URL.createObjectURL(blob));
      
      this.preloadWorker.onmessage = (e) => {
        console.log('📦 [DicomServiceFix] Preload completed:', e.data);
      };
      
    } catch (error) {
      console.warn('⚠️ [DicomServiceFix] Failed to initialize preload worker:', error);
    }
  }

  async loadImage(imageId: string, options: LoadingOptions = {}): Promise<any> {
    console.log('🖼️ [DicomServiceFix] Loading image:', imageId);
    
    // Check cache first
    const cached = this.imageCache.get(imageId);
    if (cached) {
      console.log('💾 [DicomServiceFix] Image found in cache');
      cached.accessCount++;
      cached.timestamp = Date.now();
      return cached.image;
    }

    // Check if already loading
    const existingLoad = this.loadingQueue.get(imageId);
    if (existingLoad) {
      console.log('⏳ [DicomServiceFix] Image already loading, waiting...');
      return existingLoad;
    }

    // Check circuit breaker
    const breakerState = this.circuitBreaker.get(imageId);
    if (breakerState?.isOpen && Date.now() - breakerState.lastFailure < 60000) {
      throw new Error(`Circuit breaker open for ${imageId}`);
    }

    // Start loading
    const loadPromise = this.performImageLoadWithRetry(imageId, options);
    this.loadingQueue.set(imageId, loadPromise);

    try {
      const image = await loadPromise;
      
      // Cache the loaded image
      const imageSize = this.estimateImageSize(image);
      this.imageCache.set(imageId, {
        image,
        timestamp: Date.now(),
        accessCount: 1,
        size: imageSize
      });
      this.currentCacheSize += imageSize;
      
      // Reset circuit breaker on success
      this.circuitBreaker.delete(imageId);
      
      console.log('✅ [DicomServiceFix] Image loaded successfully');
      return image;
      
    } catch (error) {
      // Update circuit breaker on failure
      const current = this.circuitBreaker.get(imageId) || { failures: 0, lastFailure: 0, isOpen: false };
      current.failures++;
      current.lastFailure = Date.now();
      current.isOpen = current.failures >= 3;
      this.circuitBreaker.set(imageId, current);
      
      console.error('❌ [DicomServiceFix] Image loading failed:', error);
      throw error;
    } finally {
      this.loadingQueue.delete(imageId);
    }
  }

  private async performImageLoadWithRetry(imageId: string, options: LoadingOptions): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [DicomServiceFix] Load attempt ${attempt}/${maxRetries} for ${imageId}`);
        
        // Initialize loading state if needed
        this.initializeLoadingState(imageId);
        
        const image = await this.performSingleImageLoad(imageId, options);
        
        console.log('✅ [DicomServiceFix] Image loaded on attempt', attempt);
        return image;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ [DicomServiceFix] Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`⏱️ [DicomServiceFix] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw this.normalizeToDicomError(lastError || new Error('Unknown error'));
  }

  private async performSingleImageLoad(imageId: string, options: LoadingOptions): Promise<any> {
    // Handle sample images
    if (imageId.startsWith('sample:')) {
      console.log('🧪 [DicomServiceFix] Creating sample image');
      return this.createSampleImage();
    }

    // Set timeout
    const timeout = options.timeout || 30000;
    
    try {
      console.log('📡 [DicomServiceFix] Loading via cornerstone:', imageId);
      
      const image = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Image load timeout after ${timeout}ms`));
        }, timeout);
        
        cornerstone.loadImage(imageId)
          .then((loadedImage) => {
            clearTimeout(timeoutId);
            resolve(loadedImage);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
      
      console.log('📊 [DicomServiceFix] Image loaded with properties:', {
        imageId: (image as any).imageId,
        width: (image as any).width,
        height: (image as any).height,
        minPixelValue: (image as any).minPixelValue,
        maxPixelValue: (image as any).maxPixelValue,
        windowCenter: (image as any).windowCenter,
        windowWidth: (image as any).windowWidth,
        slope: (image as any).slope,
        intercept: (image as any).intercept
      });
      
      return image;
      
    } catch (error) {
      console.error('❌ [DicomServiceFix] Cornerstone load failed:', error);
      throw this.enhanceError(error, imageId);
    }
  }

  // FIXED: Enhanced displayImage method with proper viewport initialization
  async displayImage(element: HTMLElement, imageId: string, options: LoadingOptions = {}): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('🎨 [DicomServiceFix] Displaying image:', imageId);
      
      // Ensure the element is enabled for cornerstone
      let enabledElement;
      try {
        enabledElement = cornerstone.getEnabledElement(element);
      } catch (e) {
        console.log('⚡ [DicomServiceFix] Enabling element...');
        cornerstone.enable(element);
        await new Promise(resolve => setTimeout(resolve, 100));
        enabledElement = cornerstone.getEnabledElement(element);
      }

      if (!enabledElement) {
        throw new Error('Failed to enable cornerstone element');
      }

      // Show loading placeholder if progressive loading is enabled
      if (options.progressive) {
        console.log('📋 [DicomServiceFix] Showing loading placeholder...');
        const placeholder = this.createLoadingPlaceholder();
        cornerstone.displayImage(element, placeholder);
      }

      // Load the image
      console.log('📡 [DicomServiceFix] Loading image data...');
      const image = await this.loadImage(imageId, options);
      
      // Display the image
      console.log('🖼️ [DicomServiceFix] Displaying loaded image...');
      cornerstone.displayImage(element, image);
      
      // CRITICAL FIX: Set proper viewport after displaying the image
      console.log('🎛️ [DicomServiceFix] Setting optimal viewport...');
      await this.setOptimalViewport(element, image);

      // Preload adjacent images for smooth navigation
      if (options.preload !== false) {
        this.preloadAdjacentImages(imageId);
      }
      
      console.log('✅ [DicomServiceFix] Image displayed successfully');
      
    } catch (error) {
      console.error('❌ [DicomServiceFix] Failed to display DICOM image:', error);
      throw error;
    }
  }

  // NEW: Method to set optimal viewport settings
  private async setOptimalViewport(element: HTMLElement, image: any): Promise<void> {
    try {
      // Get current viewport
      const currentViewport = cornerstone.getViewport(element);
      
      // Calculate optimal window/level settings
      let windowWidth = image.windowWidth;
      let windowCenter = image.windowCenter;
      
      // If image doesn't have proper window/level, calculate from pixel data
      if (!windowWidth || !windowCenter || windowWidth < 10) {
        const pixelRange = image.maxPixelValue - image.minPixelValue;
        
        if (pixelRange > 0) {
          // Use full pixel range with some padding
          windowWidth = Math.max(pixelRange * 1.2, 400);
          windowCenter = (image.maxPixelValue + image.minPixelValue) / 2;
        } else {
          // Fallback for problematic images
          windowWidth = 2000;
          windowCenter = 1000;
        }
      }
      
      // Ensure minimum window width for visibility
      if (windowWidth < 100) {
        windowWidth = Math.max(windowWidth * 4, 400);
      }
      
      console.log('🎛️ [DicomServiceFix] Calculated optimal viewport:', {
        windowWidth,
        windowCenter,
        imageRange: `${image.minPixelValue} - ${image.maxPixelValue}`,
        originalWL: `${image.windowWidth}/${image.windowCenter}`
      });
      
      // Create enhanced viewport
      const optimalViewport = {
        ...currentViewport,
        voi: {
          windowWidth: windowWidth,
          windowCenter: windowCenter
        },
        invert: false,
        interpolation: 'linear'
      };
      
      // Apply the viewport
      cornerstone.setViewport(element, optimalViewport);
      
      // Wait a moment and verify
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const verifiedViewport = cornerstone.getViewport(element);
      console.log('✅ [DicomServiceFix] Viewport set and verified:', {
        windowWidth: verifiedViewport.voi?.windowWidth,
        windowCenter: verifiedViewport.voi?.windowCenter,
        scale: verifiedViewport.scale
      });
      
    } catch (error) {
      console.error('❌ [DicomServiceFix] Failed to set optimal viewport:', error);
      // Don't throw here, as the image is already displayed
    }
  }

  // Enhanced element management
  async enableElement(element: HTMLElement): Promise<void> {
    try {
      if (!this.initialized) {
        console.log('🔄 [DicomServiceFix] Initializing before enabling element...');
        await this.initialize();
      }

      if (!element || !(element instanceof HTMLElement)) {
        throw new Error('Invalid element provided');
      }

      if (!document.contains(element)) {
        throw new Error('Element is not attached to the DOM');
      }

      console.log('🔍 [DicomServiceFix] Checking element state...', {
        tagName: element.tagName,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight
      });

      // Check if already enabled
      try {
        const existingEnabledElement = cornerstone.getEnabledElement(element);
        if (existingEnabledElement) {
          console.log('ℹ️ [DicomServiceFix] Element already enabled');
          return;
        }
      } catch (getError) {
        // Element is not enabled, which is expected
      }

      // Enable the element
      console.log('⚡ [DicomServiceFix] Enabling cornerstone element...');
      cornerstone.enable(element);
      
      // Wait for enablement to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify enablement
      const enabledElement = cornerstone.getEnabledElement(element);
      if (!enabledElement) {
        throw new Error('Failed to enable cornerstone element');
      }
      
      console.log('✅ [DicomServiceFix] Element enabled successfully');
      
    } catch (error) {
      console.error('❌ [DicomServiceFix] Failed to enable element:', error);
      throw new Error(`Element enablement failed: ${error}`);
    }
  }

  disableElement(element: HTMLElement): void {
    try {
      cornerstone.disable(element);
    } catch (error) {
      console.warn('Element was not enabled:', error);
    }
  }

  setViewport(element: HTMLElement, viewport: any): void {
    try {
      cornerstone.setViewport(element, viewport);
    } catch (error) {
      console.error('Failed to set viewport:', error);
      throw error;
    }
  }

  getViewport(element: HTMLElement): any {
    try {
      return cornerstone.getViewport(element);
    } catch (error) {
      console.error('Failed to get viewport:', error);
      return null;
    }
  }

  getEnabledElement(element: HTMLElement): any {
    try {
      return cornerstone.getEnabledElement(element);
    } catch (error) {
      return null;
    }
  }

  isElementEnabled(element: HTMLElement): boolean {
    try {
      const enabledElement = cornerstone.getEnabledElement(element);
      return !!enabledElement;
    } catch (error) {
      return false;
    }
  }

  generatePatientImageId(patientId: string, studyUid: string): string {
    // Use the correct DICOM file serving endpoint that returns raw DICOM content
    return `wadouri:http://localhost:8000/uploads/${patientId}/MRBRAIN.DCM`;
  }

  generateSampleImageId(studyUid: string): string {
    return `sample:${studyUid}`;
  }

  // Enhanced utility methods
  private createSampleImage(width: number = 512, height: number = 512): any {
    console.log('🧪 [DicomServiceFix] Creating sample image:', { width, height });
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    // Create a more visible test pattern
    const imageData = context.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Create a sinusoidal pattern with good contrast
        const intensity = Math.floor(
          128 + 100 * Math.sin((x / 50) * Math.PI) * Math.cos((y / 50) * Math.PI)
        );
        
        data[index] = intensity;     // R
        data[index + 1] = intensity; // G
        data[index + 2] = intensity; // B
        data[index + 3] = 255;       // A
      }
    }
    
    context.putImageData(imageData, 0, 0);
    
    // Convert to grayscale pixel data
    const pixelData = new Uint8Array(width * height);
    for (let i = 0; i < pixelData.length; i++) {
      pixelData[i] = data[i * 4]; // Use red channel
    }
    
    const sampleImage = {
      imageId: 'sample:test-image',
      minPixelValue: 28,
      maxPixelValue: 228,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 200,
      render: undefined,
      getPixelData: () => pixelData,
      rows: height,
      columns: width,
      height: height,
      width: width,
      color: false,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      sizeInBytes: width * height,
    };
    
    console.log('✅ [DicomServiceFix] Sample image created:', {
      dimensions: `${width}x${height}`,
      pixelRange: `${sampleImage.minPixelValue}-${sampleImage.maxPixelValue}`,
      windowLevel: `${sampleImage.windowWidth}/${sampleImage.windowCenter}`
    });
    
    return sampleImage;
  }

  private estimateImageSize(image: any): number {
    const pixelCount = (image.width || 512) * (image.height || 512);
    const bytesPerPixel = image.color ? 3 : 1;
    return pixelCount * bytesPerPixel;
  }

  private initializeLoadingState(imageId: string): void {
    // Implementation for loading state tracking
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000;
    const jitter = Math.random() * 500;
    return baseDelay * Math.pow(2, attempt - 1) + jitter;
  }

  private normalizeToDicomError(error: Error): Error {
    return new Error(`DICOM loading failed: ${error.message}`);
  }

  private enhanceError(error: any, imageId: string): Error {
    return new Error(`Failed to load ${imageId}: ${error.message || error}`);
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

  private preloadAdjacentImages(currentImageId: string): void {
    // Implementation for preloading adjacent images
  }

  private cleanupCache(): void {
    if (this.currentCacheSize > this.maxCacheSize) {
      const entries = Array.from(this.imageCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (this.currentCacheSize > this.maxCacheSize * 0.8 && entries.length > 0) {
        const [imageId, entry] = entries.shift()!;
        this.imageCache.delete(imageId);
        this.currentCacheSize -= entry.size;
      }
    }
  }

  getImageIds(studyUid: string): string[] {
    // Return actual DICOM file URLs with wadouri prefix for cornerstone
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const imageIds = [
      `wadouri:${backendUrl}/uploads/P001/0002.DCM`,
      `wadouri:${backendUrl}/uploads/P001/MRBRAIN.DCM`,
      `wadouri:${backendUrl}/uploads/P002/0002.DCM`,
      `wadouri:${backendUrl}/uploads/P002/MRBRAIN.DCM`,
      `wadouri:${backendUrl}/uploads/P003/16TEST.DCM`
    ];
    
    console.log('🔧 [DicomServiceBlackImageFix] Generated image IDs with wadouri prefix:', imageIds);
    return imageIds;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.imageCache.clear();
    this.loadingQueue.clear();
    this.studyLoadingStates.clear();
    
    if (this.preloadWorker) {
      this.preloadWorker.terminate();
      this.preloadWorker = null;
    }
    
    this.initialized = false;
  }
}

// Export singleton instance
export const dicomServiceBlackImageFix = new DicomServiceBlackImageFix();
export default dicomServiceBlackImageFix;