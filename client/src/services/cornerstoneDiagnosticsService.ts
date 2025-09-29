/**
 * Cornerstone3D Diagnostics Service
 * Comprehensive logging, viewport diagnostics, and troubleshooting tools
 * for Cornerstone3D medical imaging applications
 */

import cornerstone from 'cornerstone-core';

export interface ViewportDiagnostics {
  viewportId: string;
  element: HTMLElement | null;
  enabled: boolean;
  imageId: string | null;
  imageData: {
    width: number;
    height: number;
    pixelSpacing: [number, number];
    windowCenter: number;
    windowWidth: number;
    slope: number;
    intercept: number;
    minPixelValue: number;
    maxPixelValue: number;
    colormap: string;
  } | null;
  viewport: {
    scale: number;
    translation: { x: number; y: number };
    rotation: number;
    hflip: boolean;
    vflip: boolean;
    invert: boolean;
  } | null;
  renderingStats: {
    lastRenderTime: number;
    renderCount: number;
    averageRenderTime: number;
    memoryUsage: number;
  };
  errors: string[];
  warnings: string[];
}

export interface CornerstoneSystemDiagnostics {
  version: string;
  webglSupported: boolean;
  webgl2Supported: boolean;
  maxTextureSize: number;
  maxViewportDims: [number, number];
  enabledElements: number;
  imageCache: {
    size: number;
    maxSize: number;
    usage: number;
  };
  webWorkers: {
    available: number;
    active: number;
    maxWorkers: number;
  };
  codecs: {
    jpeg2000: boolean;
    jpegLossless: boolean;
    rle: boolean;
    jpegBaseline: boolean;
  };
  performance: {
    averageImageLoadTime: number;
    averageRenderTime: number;
    totalImagesLoaded: number;
    failedImageLoads: number;
  };
}

export interface DiagnosticEvent {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'viewport' | 'image' | 'rendering' | 'webgl' | 'system';
  message: string;
  data?: any;
  viewportId?: string;
  imageId?: string;
}

class CornerstoneDiagnosticsService {
  private diagnosticEvents: DiagnosticEvent[] = [];
  private maxEventHistory = 1000;
  private viewportDiagnostics = new Map<string, ViewportDiagnostics>();
  private performanceMetrics = {
    imageLoadTimes: [] as number[],
    renderTimes: [] as number[],
    totalImagesLoaded: 0,
    failedImageLoads: 0
  };
  private isLoggingEnabled = true;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor() {
    this.initializeDiagnostics();
  }

  /**
   * Initialize comprehensive Cornerstone diagnostics
   */
  private initializeDiagnostics(): void {
    console.log('🔍 [CornerstoneDiagnostics] Initializing diagnostics system...');
    
    this.setupCornerstoneEventListeners();
    this.setupWebGLDiagnostics();
    this.setupPerformanceMonitoring();
    this.setupErrorHandling();
    
    console.log('✅ [CornerstoneDiagnostics] Diagnostics system initialized');
  }

  /**
   * Setup Cornerstone event listeners for comprehensive monitoring
   */
  private setupCornerstoneEventListeners(): void {
    // Image loading events
    cornerstone.events.addEventListener('cornerstoneimageloaded', (event: any) => {
      this.logEvent('info', 'image', 'Image loaded successfully', {
        imageId: event.detail.image.imageId,
        loadTime: event.detail.image.loadTimeInMS,
        dimensions: `${event.detail.image.width}x${event.detail.image.height}`
      });
      
      this.performanceMetrics.totalImagesLoaded++;
      if (event.detail.image.loadTimeInMS) {
        this.performanceMetrics.imageLoadTimes.push(event.detail.image.loadTimeInMS);
      }
    });

    cornerstone.events.addEventListener('cornerstoneimageloadfailed', (event: any) => {
      this.logEvent('error', 'image', 'Image load failed', {
        imageId: event.detail.imageId,
        error: event.detail.error
      });
      
      this.performanceMetrics.failedImageLoads++;
    });

    // Viewport events
    cornerstone.events.addEventListener('cornerstoneelementenabled', (event: any) => {
      const element = event.detail.element;
      const viewportId = this.getViewportId(element);
      
      this.logEvent('info', 'viewport', 'Viewport enabled', { viewportId });
      this.initializeViewportDiagnostics(viewportId, element);
    });

    cornerstone.events.addEventListener('cornerstoneelementdisabled', (event: any) => {
      const element = event.detail.element;
      const viewportId = this.getViewportId(element);
      
      this.logEvent('info', 'viewport', 'Viewport disabled', { viewportId });
      this.viewportDiagnostics.delete(viewportId);
    });

    // Rendering events
    cornerstone.events.addEventListener('cornerstoneimagerendered', (event: any) => {
      const element = event.detail.element;
      const viewportId = this.getViewportId(element);
      const renderTime = event.detail.renderTimeInMs;
      
      this.logEvent('debug', 'rendering', 'Image rendered', {
        viewportId,
        renderTime,
        imageId: event.detail.image?.imageId
      });
      
      this.updateViewportRenderingStats(viewportId, renderTime);
      
      if (renderTime) {
        this.performanceMetrics.renderTimes.push(renderTime);
      }
    });

    // Error events
    cornerstone.events.addEventListener('cornerstoneerror', (event: any) => {
      this.logEvent('error', 'system', 'Cornerstone error', {
        error: event.detail.error,
        target: event.detail.target
      });
    });

    // WebGL context events
    cornerstone.events.addEventListener('cornerstonewebglcontextlost', (event: any) => {
      this.logEvent('error', 'webgl', 'WebGL context lost', {
        element: event.detail.element
      });
    });

    cornerstone.events.addEventListener('cornerstonewebglcontextrestored', (event: any) => {
      this.logEvent('info', 'webgl', 'WebGL context restored', {
        element: event.detail.element
      });
    });
  }

  /**
   * Setup WebGL-specific diagnostics
   */
  private setupWebGLDiagnostics(): void {
    // Monitor WebGL context loss globally
    window.addEventListener('webglcontextlost', (event) => {
      this.logEvent('error', 'webgl', 'Global WebGL context lost', {
        target: event.target,
        reason: 'unknown'
      });
    });

    window.addEventListener('webglcontextrestored', (event) => {
      this.logEvent('info', 'webgl', 'Global WebGL context restored', {
        target: event.target
      });
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.logEvent('warn', 'system', 'High memory usage detected', {
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(1)
          });
        }
      }, 10000); // Check every 10 seconds
    }

    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitorFrameRate = () => {
      frameCount++;
      
      if (frameCount % 60 === 0) {
        const now = performance.now();
        const fps = 60000 / (now - lastTime);
        lastTime = now;
        
        if (fps < 30) {
          this.logEvent('warn', 'rendering', 'Low frame rate detected', {
            fps: fps.toFixed(1)
          });
        }
      }
      
      requestAnimationFrame(monitorFrameRate);
    };
    
    requestAnimationFrame(monitorFrameRate);
  }

  /**
   * Setup comprehensive error handling
   */
  private setupErrorHandling(): void {
    // Catch unhandled errors that might affect Cornerstone
    window.addEventListener('error', (event) => {
      if (event.message.toLowerCase().includes('cornerstone') || 
          event.message.toLowerCase().includes('webgl') ||
          event.message.toLowerCase().includes('dicom')) {
        this.logEvent('error', 'system', 'Unhandled error affecting imaging', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.toString() || 'Unknown';
      if (reason.toLowerCase().includes('cornerstone') || 
          reason.toLowerCase().includes('webgl') ||
          reason.toLowerCase().includes('dicom')) {
        this.logEvent('error', 'system', 'Unhandled promise rejection affecting imaging', {
          reason: reason
        });
      }
    });
  }

  /**
   * Initialize viewport diagnostics
   */
  private initializeViewportDiagnostics(viewportId: string, element: HTMLElement): void {
    const diagnostics: ViewportDiagnostics = {
      viewportId,
      element,
      enabled: true,
      imageId: null,
      imageData: null,
      viewport: null,
      renderingStats: {
        lastRenderTime: 0,
        renderCount: 0,
        averageRenderTime: 0,
        memoryUsage: 0
      },
      errors: [],
      warnings: []
    };

    this.viewportDiagnostics.set(viewportId, diagnostics);
  }

  /**
   * Update viewport rendering statistics
   */
  private updateViewportRenderingStats(viewportId: string, renderTime: number): void {
    const diagnostics = this.viewportDiagnostics.get(viewportId);
    if (!diagnostics) return;

    diagnostics.renderingStats.lastRenderTime = renderTime;
    diagnostics.renderingStats.renderCount++;
    
    // Calculate rolling average
    const alpha = 0.1;
    diagnostics.renderingStats.averageRenderTime = 
      diagnostics.renderingStats.averageRenderTime * (1 - alpha) + renderTime * alpha;
  }

  /**
   * Get viewport ID from element
   */
  private getViewportId(element: HTMLElement): string {
    return element.id || `viewport-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log diagnostic event
   */
  private logEvent(
    level: DiagnosticEvent['level'],
    category: DiagnosticEvent['category'],
    message: string,
    data?: any,
    viewportId?: string,
    imageId?: string
  ): void {
    if (!this.isLoggingEnabled) return;

    const event: DiagnosticEvent = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      viewportId,
      imageId
    };

    this.diagnosticEvents.push(event);

    // Maintain event history limit
    if (this.diagnosticEvents.length > this.maxEventHistory) {
      this.diagnosticEvents.shift();
    }

    // Console logging based on level
    const logPrefix = `[CornerstoneDiagnostics:${category}]`;
    switch (level) {
      case 'debug':
        if (this.logLevel === 'debug') {
          console.debug(logPrefix, message, data);
        }
        break;
      case 'info':
        if (['debug', 'info'].includes(this.logLevel)) {
          console.log(logPrefix, message, data);
        }
        break;
      case 'warn':
        if (['debug', 'info', 'warn'].includes(this.logLevel)) {
          console.warn(logPrefix, message, data);
        }
        break;
      case 'error':
        console.error(logPrefix, message, data);
        break;
    }
  }

  /**
   * Get comprehensive system diagnostics
   */
  async getSystemDiagnostics(): Promise<CornerstoneSystemDiagnostics> {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    const diagnostics: CornerstoneSystemDiagnostics = {
      version: cornerstone.version || 'unknown',
      webglSupported: !!canvas.getContext('webgl'),
      webgl2Supported: !!canvas.getContext('webgl2'),
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
      maxViewportDims: gl ? gl.getParameter(gl.MAX_VIEWPORT_DIMS) : [0, 0],
      enabledElements: this.viewportDiagnostics.size,
      imageCache: {
        size: 0, // Would need to access Cornerstone's internal cache
        maxSize: 0,
        usage: 0
      },
      webWorkers: {
        available: navigator.hardwareConcurrency || 4,
        active: 0, // Would need to track active workers
        maxWorkers: navigator.hardwareConcurrency || 4
      },
      codecs: {
        jpeg2000: this.isCodecAvailable('jpeg2000'),
        jpegLossless: this.isCodecAvailable('jpegLossless'),
        rle: this.isCodecAvailable('rle'),
        jpegBaseline: this.isCodecAvailable('jpegBaseline')
      },
      performance: {
        averageImageLoadTime: this.calculateAverage(this.performanceMetrics.imageLoadTimes),
        averageRenderTime: this.calculateAverage(this.performanceMetrics.renderTimes),
        totalImagesLoaded: this.performanceMetrics.totalImagesLoaded,
        failedImageLoads: this.performanceMetrics.failedImageLoads
      }
    };

    return diagnostics;
  }

  /**
   * Get viewport-specific diagnostics
   */
  getViewportDiagnostics(viewportId?: string): ViewportDiagnostics[] {
    if (viewportId) {
      const diagnostics = this.viewportDiagnostics.get(viewportId);
      return diagnostics ? [diagnostics] : [];
    }
    
    return Array.from(this.viewportDiagnostics.values());
  }

  /**
   * Get diagnostic events with filtering
   */
  getDiagnosticEvents(filter?: {
    level?: DiagnosticEvent['level'];
    category?: DiagnosticEvent['category'];
    since?: number;
    viewportId?: string;
  }): DiagnosticEvent[] {
    let events = [...this.diagnosticEvents];

    if (filter) {
      if (filter.level) {
        events = events.filter(e => e.level === filter.level);
      }
      if (filter.category) {
        events = events.filter(e => e.category === filter.category);
      }
      if (filter.since) {
        events = events.filter(e => e.timestamp >= filter.since);
      }
      if (filter.viewportId) {
        events = events.filter(e => e.viewportId === filter.viewportId);
      }
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Run comprehensive viewport diagnostics
   */
  async runViewportDiagnostics(element: HTMLElement): Promise<{
    success: boolean;
    issues: string[];
    recommendations: string[];
    diagnostics: ViewportDiagnostics;
  }> {
    const viewportId = this.getViewportId(element);
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if element is enabled
      const enabled = cornerstone.getEnabledElement(element);
      if (!enabled) {
        issues.push('Element is not enabled for Cornerstone');
        recommendations.push('Call cornerstone.enable(element) to enable the viewport');
      }

      // Check canvas and WebGL context
      const canvas = element.querySelector('canvas');
      if (!canvas) {
        issues.push('No canvas element found in viewport');
        recommendations.push('Ensure Cornerstone has properly initialized the viewport');
      } else {
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (!gl) {
          issues.push('No WebGL context available');
          recommendations.push('Check GPU drivers and WebGL support');
        } else if (gl.isContextLost()) {
          issues.push('WebGL context is lost');
          recommendations.push('Try refreshing the page or switching to software rendering');
        }
      }

      // Check image data
      try {
        const image = cornerstone.getImage(element);
        if (!image) {
          issues.push('No image loaded in viewport');
          recommendations.push('Load an image using cornerstone.displayImage()');
        } else {
          // Check image properties
          if (!image.width || !image.height) {
            issues.push('Image has invalid dimensions');
          }
          if (!image.getPixelData) {
            issues.push('Image pixel data is not accessible');
          }
        }
      } catch (error) {
        issues.push(`Error accessing image data: ${error}`);
      }

      // Check viewport settings
      try {
        const viewport = cornerstone.getViewport(element);
        if (!viewport) {
          issues.push('No viewport settings found');
        } else {
          if (viewport.scale <= 0) {
            issues.push('Invalid viewport scale');
          }
          if (isNaN(viewport.translation.x) || isNaN(viewport.translation.y)) {
            issues.push('Invalid viewport translation');
          }
        }
      } catch (error) {
        issues.push(`Error accessing viewport settings: ${error}`);
      }

      const diagnostics = this.viewportDiagnostics.get(viewportId) || {
        viewportId,
        element,
        enabled: !!enabled,
        imageId: null,
        imageData: null,
        viewport: null,
        renderingStats: {
          lastRenderTime: 0,
          renderCount: 0,
          averageRenderTime: 0,
          memoryUsage: 0
        },
        errors: issues,
        warnings: []
      };

      return {
        success: issues.length === 0,
        issues,
        recommendations,
        diagnostics
      };

    } catch (error) {
      issues.push(`Diagnostic check failed: ${error}`);
      
      return {
        success: false,
        issues,
        recommendations: ['Check browser console for detailed error information'],
        diagnostics: {
          viewportId,
          element,
          enabled: false,
          imageId: null,
          imageData: null,
          viewport: null,
          renderingStats: {
            lastRenderTime: 0,
            renderCount: 0,
            averageRenderTime: 0,
            memoryUsage: 0
          },
          errors: issues,
          warnings: []
        }
      };
    }
  }

  /**
   * Check if a codec is available
   */
  private isCodecAvailable(codec: string): boolean {
    // This would need to be implemented based on Cornerstone's codec detection
    // For now, return a basic check
    try {
      return typeof (cornerstone as any).imageLoaders !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Set logging level
   */
  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
    this.logEvent('info', 'system', `Log level changed to: ${level}`);
  }

  /**
   * Enable/disable logging
   */
  setLoggingEnabled(enabled: boolean): void {
    this.isLoggingEnabled = enabled;
    console.log(`[CornerstoneDiagnostics] Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear diagnostic history
   */
  clearDiagnosticHistory(): void {
    this.diagnosticEvents = [];
    this.performanceMetrics = {
      imageLoadTimes: [],
      renderTimes: [],
      totalImagesLoaded: 0,
      failedImageLoads: 0
    };
    console.log('[CornerstoneDiagnostics] Diagnostic history cleared');
  }

  /**
   * Export diagnostics data
   */
  exportDiagnostics(): {
    timestamp: number;
    systemDiagnostics: Promise<CornerstoneSystemDiagnostics>;
    viewportDiagnostics: ViewportDiagnostics[];
    events: DiagnosticEvent[];
    performanceMetrics: typeof this.performanceMetrics;
  } {
    return {
      timestamp: Date.now(),
      systemDiagnostics: this.getSystemDiagnostics(),
      viewportDiagnostics: this.getViewportDiagnostics(),
      events: this.getDiagnosticEvents(),
      performanceMetrics: { ...this.performanceMetrics }
    };
  }
}

export const cornerstoneDiagnosticsService = new CornerstoneDiagnosticsService();
export default cornerstoneDiagnosticsService;