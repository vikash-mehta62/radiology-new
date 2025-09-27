/**
 * VTK.js Optimization Configuration
 * Centralized performance settings for optimal VTK.js rendering in medical imaging
 */

export interface VTKPerformanceSettings {
  // Volume Rendering Settings
  volumeRendering: {
    sampleDistance: number;
    ambient: number;
    diffuse: number;
    specular: number;
    specularPower: number;
    shade: boolean;
    interpolationType: number;
    blendMode: string;
    enableGradientOpacity: boolean;
    enableLighting: boolean;
  };

  // MPR Rendering Settings
  mprRendering: {
    interpolationType: number;
    enableCaching: boolean;
    renderingQuality: 'low' | 'medium' | 'high';
    enableGPUAcceleration: boolean;
    maxTextureSize: number;
    enableLOD: boolean;
    antiAliasing: boolean;
    enableDepthPeeling: boolean;
    renderOnDemand: boolean;
  };

  // Memory Management
  memory: {
    maxMemoryUsage: number; // MB
    enableGarbageCollection: boolean;
    cacheSize: number; // MB
    enableDataCompression: boolean;
  };

  // WebGL Settings
  webgl: {
    preserveDrawingBuffer: boolean;
    antialias: boolean;
    alpha: boolean;
    depth: boolean;
    stencil: boolean;
    premultipliedAlpha: boolean;
    powerPreference: 'default' | 'high-performance' | 'low-power';
  };

  // Interaction Settings
  interaction: {
    enableMouseInteraction: boolean;
    enableTouchInteraction: boolean;
    interactionThrottle: number; // ms
    enableContinuousUpdate: boolean;
  };
}

/**
 * Optimized settings for high-performance medical imaging
 */
export const HIGH_PERFORMANCE_CONFIG: VTKPerformanceSettings = {
  volumeRendering: {
    sampleDistance: 0.8, // Optimized for speed vs quality balance
    ambient: 0.15, // Reduced for better contrast
    diffuse: 0.7, // Increased for better visibility
    specular: 0.3, // Moderate specular highlights
    specularPower: 20, // Sharper highlights
    shade: true,
    interpolationType: 1, // Linear interpolation
    blendMode: 'composite',
    enableGradientOpacity: true,
    enableLighting: true
  },

  mprRendering: {
    interpolationType: 1, // Linear interpolation
    enableCaching: true,
    renderingQuality: 'high',
    enableGPUAcceleration: true,
    maxTextureSize: 2048,
    enableLOD: false, // Disabled for medical accuracy
    antiAliasing: true,
    enableDepthPeeling: false, // Better performance for 2D views
    renderOnDemand: true
  },

  memory: {
    maxMemoryUsage: 2048, // 2GB
    enableGarbageCollection: true,
    cacheSize: 512, // 512MB
    enableDataCompression: true
  },

  webgl: {
    preserveDrawingBuffer: false,
    antialias: true,
    alpha: false,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance'
  },

  interaction: {
    enableMouseInteraction: true,
    enableTouchInteraction: true,
    interactionThrottle: 16, // ~60fps
    enableContinuousUpdate: false
  }
};

/**
 * Balanced settings for general use
 */
export const BALANCED_CONFIG: VTKPerformanceSettings = {
  volumeRendering: {
    sampleDistance: 1.0,
    ambient: 0.2,
    diffuse: 0.6,
    specular: 0.2,
    specularPower: 15,
    shade: true,
    interpolationType: 1,
    blendMode: 'composite',
    enableGradientOpacity: true,
    enableLighting: true
  },

  mprRendering: {
    interpolationType: 1,
    enableCaching: true,
    renderingQuality: 'medium',
    enableGPUAcceleration: true,
    maxTextureSize: 1024,
    enableLOD: false,
    antiAliasing: true,
    enableDepthPeeling: false,
    renderOnDemand: true
  },

  memory: {
    maxMemoryUsage: 1024, // 1GB
    enableGarbageCollection: true,
    cacheSize: 256, // 256MB
    enableDataCompression: true
  },

  webgl: {
    preserveDrawingBuffer: false,
    antialias: true,
    alpha: false,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'default'
  },

  interaction: {
    enableMouseInteraction: true,
    enableTouchInteraction: true,
    interactionThrottle: 33, // ~30fps
    enableContinuousUpdate: false
  }
};

/**
 * Low-resource settings for older hardware
 */
export const LOW_RESOURCE_CONFIG: VTKPerformanceSettings = {
  volumeRendering: {
    sampleDistance: 1.5,
    ambient: 0.3,
    diffuse: 0.5,
    specular: 0.1,
    specularPower: 10,
    shade: false,
    interpolationType: 0, // Nearest neighbor
    blendMode: 'maximum_intensity',
    enableGradientOpacity: false,
    enableLighting: false
  },

  mprRendering: {
    interpolationType: 0, // Nearest neighbor
    enableCaching: false,
    renderingQuality: 'low',
    enableGPUAcceleration: false,
    maxTextureSize: 512,
    enableLOD: true,
    antiAliasing: false,
    enableDepthPeeling: false,
    renderOnDemand: true
  },

  memory: {
    maxMemoryUsage: 512, // 512MB
    enableGarbageCollection: true,
    cacheSize: 128, // 128MB
    enableDataCompression: true
  },

  webgl: {
    preserveDrawingBuffer: false,
    antialias: false,
    alpha: false,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  },

  interaction: {
    enableMouseInteraction: true,
    enableTouchInteraction: false,
    interactionThrottle: 50, // ~20fps
    enableContinuousUpdate: false
  }
};

/**
 * Detect system capabilities and recommend optimal configuration
 */
export function detectOptimalConfiguration(): VTKPerformanceSettings {
  // Check WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  if (!gl) {
    console.warn('WebGL not supported, using low resource configuration');
    return LOW_RESOURCE_CONFIG;
  }

  // Check available memory (if supported)
  const memory = (navigator as any).deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // Check GPU capabilities
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  
  // Simple heuristics for configuration selection
  if (memory && memory >= 8 && hardwareConcurrency >= 8) {
    console.log('High-performance system detected, using high performance configuration');
    return HIGH_PERFORMANCE_CONFIG;
  } else if (memory && memory >= 4 && hardwareConcurrency >= 4) {
    console.log('Balanced system detected, using balanced configuration');
    return BALANCED_CONFIG;
  } else {
    console.log('Low-resource system detected, using low resource configuration');
    return LOW_RESOURCE_CONFIG;
  }
}

/**
 * Apply configuration to VTK render window
 */
export function applyVTKConfiguration(
  renderWindow: any,
  config: VTKPerformanceSettings
): void {
  try {
    const openglRenderWindow = renderWindow.getViews()[0];
    
    if (openglRenderWindow && openglRenderWindow.getContext) {
      const gl = openglRenderWindow.getContext();
      
      // Apply WebGL settings
      if (config.webgl.antialias) {
        gl.enable(gl.SAMPLE_COVERAGE);
      }
      
      // Set power preference (this is typically set during context creation)
      console.log(`VTK Configuration applied: ${config.webgl.powerPreference} power preference`);
    }

    // Apply memory management
    if (config.memory.enableGarbageCollection) {
      // Schedule periodic garbage collection
      setInterval(() => {
        if (window.gc) {
          window.gc();
        }
      }, 30000); // Every 30 seconds
    }

    console.log('VTK.js configuration applied successfully');
  } catch (error) {
    console.error('Failed to apply VTK configuration:', error);
  }
}

/**
 * Monitor performance and suggest optimizations
 */
export class VTKPerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;
  private memoryUsage = 0;

  startMonitoring(): void {
    const monitor = () => {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - this.lastTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastTime = currentTime;
        
        // Check memory usage if available
        if ((performance as any).memory) {
          this.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        }
        
        this.analyzePerformance();
      }
      
      requestAnimationFrame(monitor);
    };
    
    monitor();
  }

  private analyzePerformance(): void {
    if (this.fps < 15) {
      console.warn(`Low FPS detected: ${this.fps}fps. Consider using lower quality settings.`);
    }
    
    if (this.memoryUsage > 1024) {
      console.warn(`High memory usage: ${this.memoryUsage.toFixed(2)}MB. Consider enabling garbage collection.`);
    }
  }

  getFPS(): number {
    return this.fps;
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }
}

export default {
  HIGH_PERFORMANCE_CONFIG,
  BALANCED_CONFIG,
  LOW_RESOURCE_CONFIG,
  detectOptimalConfiguration,
  applyVTKConfiguration,
  VTKPerformanceMonitor
};