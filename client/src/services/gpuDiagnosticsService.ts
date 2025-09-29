/**
 * GPU Diagnostics Service
 * Comprehensive GPU capability detection, failure diagnosis, and fallback management
 * for medical imaging applications requiring high-performance rendering
 */

export interface GPUCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  webgl: boolean;
  vendor: 'nvidia' | 'amd' | 'intel' | 'apple' | 'unknown';
  model: string;
  memory: number;
  driverVersion?: string;
  supportedFeatures: string[];
  maxTextureSize: number;
  maxViewportDims: [number, number];
  contextLossRisk: 'low' | 'medium' | 'high';
}

export interface GPUDiagnosticResult {
  success: boolean;
  capabilities: GPUCapabilities;
  recommendedRenderer: 'webgpu' | 'webgl2' | 'webgl' | 'software';
  warnings: string[];
  errors: string[];
  performanceScore: number; // 0-100
  timestamp: number;
}

export interface RenderingFallbackChain {
  primary: string;
  fallbacks: string[];
  currentRenderer: string;
  failureCount: number;
  lastFailure?: string;
}

class GPUDiagnosticsService {
  private diagnosticResults: GPUDiagnosticResult | null = null;
  private fallbackChain: RenderingFallbackChain;
  private contextLossListeners: Set<() => void> = new Set();
  private performanceMonitor: {
    frameCount: number;
    lastFrameTime: number;
    averageFPS: number;
    memoryUsage: number;
  } = {
    frameCount: 0,
    lastFrameTime: 0,
    averageFPS: 0,
    memoryUsage: 0
  };

  constructor() {
    this.fallbackChain = {
      primary: 'webgpu',
      fallbacks: ['webgl2', 'webgl', 'software'],
      currentRenderer: 'webgpu',
      failureCount: 0
    };
    
    this.initializeContextLossDetection();
  }

  /**
   * Comprehensive GPU diagnostics with detailed capability detection
   */
  async runDiagnostics(): Promise<GPUDiagnosticResult> {
    console.log('🔍 [GPUDiagnostics] Starting comprehensive GPU diagnostics...');
    
    const startTime = performance.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Test WebGPU capabilities
      const webgpuResult = await this.testWebGPU();
      
      // Test WebGL2 capabilities
      const webgl2Result = await this.testWebGL2();
      
      // Test WebGL capabilities
      const webglResult = await this.testWebGL();
      
      // Detect GPU vendor and model
      const gpuInfo = await this.detectGPUInfo();
      
      // Performance benchmarking
      const performanceScore = await this.runPerformanceBenchmark();
      
      // Context loss risk assessment
      const contextLossRisk = this.assessContextLossRisk(gpuInfo);
      
      const capabilities: GPUCapabilities = {
        webgpu: webgpuResult.supported,
        webgl2: webgl2Result.supported,
        webgl: webglResult.supported,
        vendor: gpuInfo.vendor,
        model: gpuInfo.model,
        memory: gpuInfo.memory,
        driverVersion: gpuInfo.driverVersion,
        supportedFeatures: [
          ...(webgpuResult.supported ? ['webgpu'] : []),
          ...(webgl2Result.supported ? ['webgl2'] : []),
          ...(webglResult.supported ? ['webgl'] : []),
          ...gpuInfo.features
        ],
        maxTextureSize: Math.max(
          webgl2Result.maxTextureSize || 0,
          webglResult.maxTextureSize || 0
        ),
        maxViewportDims: [
          Math.max(webgl2Result.maxViewportDims?.[0] || 0, webglResult.maxViewportDims?.[0] || 0),
          Math.max(webgl2Result.maxViewportDims?.[1] || 0, webglResult.maxViewportDims?.[1] || 0)
        ],
        contextLossRisk
      };

      // Collect warnings and errors
      if (webgpuResult.error) errors.push(`WebGPU: ${webgpuResult.error}`);
      if (webgl2Result.error) errors.push(`WebGL2: ${webgl2Result.error}`);
      if (webglResult.error) errors.push(`WebGL: ${webglResult.error}`);
      
      if (!capabilities.webgpu && !capabilities.webgl2 && !capabilities.webgl) {
        errors.push('No GPU acceleration available - falling back to software rendering');
      }
      
      if (contextLossRisk === 'high') {
        warnings.push('High risk of WebGL context loss detected - consider software fallback');
      }
      
      if (performanceScore < 30) {
        warnings.push('Low GPU performance detected - consider reducing quality settings');
      }

      // Determine recommended renderer
      const recommendedRenderer = this.determineRecommendedRenderer(capabilities, performanceScore);
      
      const result: GPUDiagnosticResult = {
        success: capabilities.webgpu || capabilities.webgl2 || capabilities.webgl,
        capabilities,
        recommendedRenderer,
        warnings,
        errors,
        performanceScore,
        timestamp: Date.now()
      };

      this.diagnosticResults = result;
      
      console.log('✅ [GPUDiagnostics] Diagnostics completed:', {
        duration: `${(performance.now() - startTime).toFixed(2)}ms`,
        recommendedRenderer,
        performanceScore,
        warningCount: warnings.length,
        errorCount: errors.length
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ [GPUDiagnostics] Diagnostics failed:', error);
      
      const fallbackResult: GPUDiagnosticResult = {
        success: false,
        capabilities: {
          webgpu: false,
          webgl2: false,
          webgl: false,
          vendor: 'unknown',
          model: 'unknown',
          memory: 0,
          supportedFeatures: [],
          maxTextureSize: 0,
          maxViewportDims: [0, 0],
          contextLossRisk: 'high'
        },
        recommendedRenderer: 'software',
        warnings: [],
        errors: [`Diagnostics failed: ${error}`],
        performanceScore: 0,
        timestamp: Date.now()
      };
      
      this.diagnosticResults = fallbackResult;
      return fallbackResult;
    }
  }

  /**
   * Test WebGPU capabilities
   */
  private async testWebGPU(): Promise<{
    supported: boolean;
    error?: string;
    features?: string[];
  }> {
    try {
      if (!navigator.gpu) {
        return { supported: false, error: 'WebGPU not available in browser' };
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, error: 'No WebGPU adapter available' };
      }

      const device = await adapter.requestDevice();
      if (!device) {
        return { supported: false, error: 'Failed to create WebGPU device' };
      }

      // Test basic functionality
      const buffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      });

      device.destroy();

      return {
        supported: true,
        features: Array.from(adapter.features)
      };
    } catch (error) {
      return {
        supported: false,
        error: `WebGPU test failed: ${error}`
      };
    }
  }

  /**
   * Test WebGL2 capabilities
   */
  private async testWebGL2(): Promise<{
    supported: boolean;
    error?: string;
    maxTextureSize?: number;
    maxViewportDims?: [number, number];
  }> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', {
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false
      });

      if (!gl) {
        return { supported: false, error: 'WebGL2 context creation failed' };
      }

      // Test basic functionality
      const shader = gl.createShader(gl.VERTEX_SHADER);
      if (!shader) {
        return { supported: false, error: 'Failed to create WebGL2 shader' };
      }

      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

      // Test texture creation
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        return { supported: false, error: `WebGL2 texture test failed: ${error}` };
      }

      return {
        supported: true,
        maxTextureSize,
        maxViewportDims
      };
    } catch (error) {
      return {
        supported: false,
        error: `WebGL2 test failed: ${error}`
      };
    }
  }

  /**
   * Test WebGL capabilities
   */
  private async testWebGL(): Promise<{
    supported: boolean;
    error?: string;
    maxTextureSize?: number;
    maxViewportDims?: [number, number];
  }> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl', {
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false
      });

      if (!gl) {
        return { supported: false, error: 'WebGL context creation failed' };
      }

      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

      // Test basic rendering
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        return { supported: false, error: `WebGL test failed: ${error}` };
      }

      return {
        supported: true,
        maxTextureSize,
        maxViewportDims
      };
    } catch (error) {
      return {
        supported: false,
        error: `WebGL test failed: ${error}`
      };
    }
  }

  /**
   * Detect GPU vendor, model, and capabilities
   */
  private async detectGPUInfo(): Promise<{
    vendor: GPUCapabilities['vendor'];
    model: string;
    memory: number;
    driverVersion?: string;
    features: string[];
  }> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      
      if (!gl) {
        return {
          vendor: 'unknown',
          model: 'unknown',
          memory: 0,
          features: []
        };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

      // Parse vendor
      let parsedVendor: GPUCapabilities['vendor'] = 'unknown';
      if (vendor.toLowerCase().includes('nvidia')) parsedVendor = 'nvidia';
      else if (vendor.toLowerCase().includes('amd') || vendor.toLowerCase().includes('ati')) parsedVendor = 'amd';
      else if (vendor.toLowerCase().includes('intel')) parsedVendor = 'intel';
      else if (vendor.toLowerCase().includes('apple')) parsedVendor = 'apple';

      // Estimate memory (rough approximation)
      const memoryInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      let estimatedMemory = 0;
      if (renderer.includes('RTX 40')) estimatedMemory = 16384; // 16GB typical for RTX 40 series
      else if (renderer.includes('RTX 30')) estimatedMemory = 8192; // 8GB typical
      else if (renderer.includes('GTX')) estimatedMemory = 4096; // 4GB typical
      else estimatedMemory = 2048; // 2GB fallback

      // Detect supported features
      const features: string[] = [];
      if (gl.getExtension('OES_texture_float')) features.push('float_textures');
      if (gl.getExtension('WEBGL_depth_texture')) features.push('depth_textures');
      if (gl.getExtension('OES_element_index_uint')) features.push('uint_indices');
      if (gl.getExtension('WEBGL_draw_buffers')) features.push('multiple_render_targets');

      return {
        vendor: parsedVendor,
        model: renderer,
        memory: estimatedMemory,
        features
      };
    } catch (error) {
      console.warn('Failed to detect GPU info:', error);
      return {
        vendor: 'unknown',
        model: 'unknown',
        memory: 0,
        features: []
      };
    }
  }

  /**
   * Run performance benchmark
   */
  private async runPerformanceBenchmark(): Promise<number> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 0;

      const startTime = performance.now();
      const iterations = 100;

      // Simple rendering benchmark
      for (let i = 0; i < iterations; i++) {
        gl.clearColor(Math.random(), Math.random(), Math.random(), 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.flush();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Score based on performance (lower duration = higher score)
      const baseScore = Math.max(0, 100 - (duration / 10));
      return Math.min(100, baseScore);
    } catch (error) {
      console.warn('Performance benchmark failed:', error);
      return 0;
    }
  }

  /**
   * Assess context loss risk
   */
  private assessContextLossRisk(gpuInfo: any): 'low' | 'medium' | 'high' {
    // High risk factors
    if (gpuInfo.vendor === 'unknown') return 'high';
    if (gpuInfo.model.toLowerCase().includes('software')) return 'high';
    if (gpuInfo.memory < 1024) return 'high';

    // Medium risk factors
    if (gpuInfo.vendor === 'intel' && !gpuInfo.model.includes('Arc')) return 'medium';
    if (gpuInfo.memory < 2048) return 'medium';

    return 'low';
  }

  /**
   * Determine recommended renderer based on capabilities and performance
   */
  private determineRecommendedRenderer(
    capabilities: GPUCapabilities,
    performanceScore: number
  ): 'webgpu' | 'webgl2' | 'webgl' | 'software' {
    if (capabilities.webgpu && performanceScore > 70) return 'webgpu';
    if (capabilities.webgl2 && performanceScore > 50) return 'webgl2';
    if (capabilities.webgl && performanceScore > 30) return 'webgl';
    return 'software';
  }

  /**
   * Initialize context loss detection
   */
  private initializeContextLossDetection(): void {
    // Listen for WebGL context loss events
    document.addEventListener('webglcontextlost', (event) => {
      console.warn('🚨 [GPUDiagnostics] WebGL context lost:', event);
      this.handleContextLoss();
    });

    document.addEventListener('webglcontextrestored', (event) => {
      console.log('✅ [GPUDiagnostics] WebGL context restored:', event);
      this.handleContextRestore();
    });
  }

  /**
   * Handle WebGL context loss
   */
  private handleContextLoss(): void {
    this.fallbackChain.failureCount++;
    this.fallbackChain.lastFailure = 'context_loss';
    
    // Move to next fallback renderer
    const currentIndex = this.fallbackChain.fallbacks.indexOf(this.fallbackChain.currentRenderer);
    if (currentIndex < this.fallbackChain.fallbacks.length - 1) {
      this.fallbackChain.currentRenderer = this.fallbackChain.fallbacks[currentIndex + 1];
      console.log(`🔄 [GPUDiagnostics] Switching to fallback renderer: ${this.fallbackChain.currentRenderer}`);
    }

    // Notify listeners
    this.contextLossListeners.forEach(listener => listener());
  }

  /**
   * Handle WebGL context restore
   */
  private handleContextRestore(): void {
    console.log('🔄 [GPUDiagnostics] Attempting to restore primary renderer');
    // Optionally restore to primary renderer after successful context restore
  }

  /**
   * Get current diagnostic results
   */
  getDiagnosticResults(): GPUDiagnosticResult | null {
    return this.diagnosticResults;
  }

  /**
   * Get current fallback chain status
   */
  getFallbackChain(): RenderingFallbackChain {
    return { ...this.fallbackChain };
  }

  /**
   * Force fallback to next renderer
   */
  forceFallback(reason: string): string {
    this.fallbackChain.failureCount++;
    this.fallbackChain.lastFailure = reason;
    
    const currentIndex = this.fallbackChain.fallbacks.indexOf(this.fallbackChain.currentRenderer);
    if (currentIndex < this.fallbackChain.fallbacks.length - 1) {
      this.fallbackChain.currentRenderer = this.fallbackChain.fallbacks[currentIndex + 1];
    }
    
    console.log(`🔄 [GPUDiagnostics] Forced fallback to: ${this.fallbackChain.currentRenderer} (reason: ${reason})`);
    return this.fallbackChain.currentRenderer;
  }

  /**
   * Add context loss listener
   */
  addContextLossListener(listener: () => void): void {
    this.contextLossListeners.add(listener);
  }

  /**
   * Remove context loss listener
   */
  removeContextLossListener(listener: () => void): void {
    this.contextLossListeners.delete(listener);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(frameTime: number, memoryUsage: number): void {
    this.performanceMonitor.frameCount++;
    this.performanceMonitor.lastFrameTime = frameTime;
    
    // Calculate rolling average FPS
    const fps = 1000 / frameTime;
    this.performanceMonitor.averageFPS = 
      (this.performanceMonitor.averageFPS * 0.9) + (fps * 0.1);
    
    this.performanceMonitor.memoryUsage = memoryUsage;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMonitor };
  }
}

export const gpuDiagnosticsService = new GPUDiagnosticsService();
export default gpuDiagnosticsService;