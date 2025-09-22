/**
 * Level-of-Detail (LOD) Rendering Service
 * Implements adaptive quality rendering based on dataset size, zoom level, and performance metrics
 * Provides smooth performance scaling for large medical imaging datasets
 */

export interface LODLevel {
  level: number;
  scale: number; // Scale factor (0.1 to 1.0)
  quality: 'ultra-low' | 'low' | 'medium' | 'high' | 'ultra-high';
  maxTextureSize: number;
  compressionRatio: number;
  description: string;
}

export interface LODMetrics {
  currentLevel: number;
  targetLevel: number;
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  adaptationReason: string;
}

export interface LODConfiguration {
  enableAdaptiveLOD: boolean;
  targetFrameRate: number; // Target FPS
  maxMemoryUsage: number; // Maximum memory usage in bytes
  qualityThresholds: {
    excellent: number; // > 90% target performance
    good: number; // > 70% target performance
    acceptable: number; // > 50% target performance
    poor: number; // < 50% target performance
  };
  zoomThresholds: {
    overview: number; // < 0.5x zoom
    normal: number; // 0.5x - 2x zoom
    detail: number; // 2x - 5x zoom
    microscopic: number; // > 5x zoom
  };
}

/**
 * Performance Monitor for LOD System
 */
class LODPerformanceMonitor {
  private frameRates: number[] = [];
  private renderTimes: number[] = [];
  private memoryUsages: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  recordFrame(renderTime: number, memoryUsage: number): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      const fps = 1000 / frameTime;
      
      this.frameRates.push(fps);
      this.renderTimes.push(renderTime);
      this.memoryUsages.push(memoryUsage);
      
      // Keep only recent samples (last 60 frames)
      if (this.frameRates.length > 60) {
        this.frameRates.shift();
        this.renderTimes.shift();
        this.memoryUsages.shift();
      }
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
  }

  getAverageFrameRate(): number {
    if (this.frameRates.length === 0) return 60; // Default assumption
    return this.frameRates.reduce((sum, fps) => sum + fps, 0) / this.frameRates.length;
  }

  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 16; // Default 16ms
    return this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
  }

  getAverageMemoryUsage(): number {
    if (this.memoryUsages.length === 0) return 0;
    return this.memoryUsages.reduce((sum, mem) => sum + mem, 0) / this.memoryUsages.length;
  }

  getPerformanceScore(): number {
    const avgFps = this.getAverageFrameRate();
    const targetFps = 60;
    return Math.min(1.0, avgFps / targetFps);
  }
}

/**
 * LOD Rendering Service
 */
export class LODRenderingService {
  private config: LODConfiguration;
  private performanceMonitor: LODPerformanceMonitor;
  private currentLOD: number = 4; // Start with high quality
  private targetLOD: number = 4;
  private lodLevels: LODLevel[];
  private adaptationTimer: number | null = null;
  private isAdapting: boolean = false;

  constructor(config: Partial<LODConfiguration> = {}) {
    this.config = {
      enableAdaptiveLOD: true,
      targetFrameRate: 60,
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      qualityThresholds: {
        excellent: 0.9,
        good: 0.7,
        acceptable: 0.5,
        poor: 0.3
      },
      zoomThresholds: {
        overview: 0.5,
        normal: 2.0,
        detail: 5.0,
        microscopic: 10.0
      },
      ...config
    };

    this.performanceMonitor = new LODPerformanceMonitor();
    this.initializeLODLevels();
    this.startAdaptationLoop();
  }

  private initializeLODLevels(): void {
    this.lodLevels = [
      {
        level: 0,
        scale: 0.1,
        quality: 'ultra-low',
        maxTextureSize: 256,
        compressionRatio: 0.1,
        description: 'Ultra-low quality for overview navigation'
      },
      {
        level: 1,
        scale: 0.25,
        quality: 'low',
        maxTextureSize: 512,
        compressionRatio: 0.25,
        description: 'Low quality for fast navigation'
      },
      {
        level: 2,
        scale: 0.5,
        quality: 'medium',
        maxTextureSize: 1024,
        compressionRatio: 0.5,
        description: 'Medium quality for general viewing'
      },
      {
        level: 3,
        scale: 0.75,
        quality: 'high',
        maxTextureSize: 2048,
        compressionRatio: 0.75,
        description: 'High quality for detailed examination'
      },
      {
        level: 4,
        scale: 1.0,
        quality: 'ultra-high',
        maxTextureSize: 4096,
        compressionRatio: 1.0,
        description: 'Ultra-high quality for diagnostic purposes'
      }
    ];
  }

  /**
   * Record performance metrics and adapt LOD if necessary
   */
  recordPerformance(renderTime: number, memoryUsage: number): void {
    this.performanceMonitor.recordFrame(renderTime, memoryUsage);
    
    if (this.config.enableAdaptiveLOD && !this.isAdapting) {
      this.scheduleAdaptation();
    }
  }

  /**
   * Get optimal LOD level based on zoom and performance
   */
  getOptimalLOD(zoomLevel: number, datasetSize: number): number {
    if (!this.config.enableAdaptiveLOD) {
      return this.currentLOD;
    }

    // Base LOD on zoom level
    let baseLOD = this.getLODForZoom(zoomLevel);
    
    // Adjust based on dataset size
    const sizeAdjustment = this.getSizeAdjustment(datasetSize);
    baseLOD = Math.max(0, baseLOD + sizeAdjustment);
    
    // Adjust based on performance
    const performanceScore = this.performanceMonitor.getPerformanceScore();
    const performanceAdjustment = this.getPerformanceAdjustment(performanceScore);
    baseLOD = Math.max(0, baseLOD + performanceAdjustment);
    
    return Math.min(this.lodLevels.length - 1, baseLOD);
  }

  private getLODForZoom(zoomLevel: number): number {
    if (zoomLevel < this.config.zoomThresholds.overview) {
      return 1; // Low quality for overview
    } else if (zoomLevel < this.config.zoomThresholds.normal) {
      return 2; // Medium quality for normal viewing
    } else if (zoomLevel < this.config.zoomThresholds.detail) {
      return 3; // High quality for detailed viewing
    } else {
      return 4; // Ultra-high quality for microscopic viewing
    }
  }

  private getSizeAdjustment(datasetSize: number): number {
    // Reduce LOD for very large datasets
    if (datasetSize > 1000) return -2; // Very large dataset
    if (datasetSize > 500) return -1;  // Large dataset
    if (datasetSize > 100) return 0;   // Medium dataset
    return 1; // Small dataset can afford higher quality
  }

  private getPerformanceAdjustment(performanceScore: number): number {
    if (performanceScore >= this.config.qualityThresholds.excellent) {
      return 1; // Can afford higher quality
    } else if (performanceScore >= this.config.qualityThresholds.good) {
      return 0; // Maintain current quality
    } else if (performanceScore >= this.config.qualityThresholds.acceptable) {
      return -1; // Reduce quality slightly
    } else {
      return -2; // Significantly reduce quality
    }
  }

  /**
   * Apply LOD to image data
   */
  applyLOD(imageData: ImageData, lodLevel: number): ImageData {
    const lod = this.lodLevels[lodLevel];
    if (!lod || lod.scale === 1.0) {
      return imageData; // No scaling needed
    }

    const scaledWidth = Math.floor(imageData.width * lod.scale);
    const scaledHeight = Math.floor(imageData.height * lod.scale);
    
    // Create canvas for scaling
    const canvas = document.createElement('canvas');
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return imageData; // Fallback to original
    }

    // Create temporary canvas with original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      return imageData;
    }

    tempCtx.putImageData(imageData, 0, 0);
    
    // Scale down the image
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = lod.quality === 'ultra-low' ? 'low' : 'high';
    ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);
    
    return ctx.getImageData(0, 0, scaledWidth, scaledHeight);
  }

  /**
   * Get texture parameters for WebGL based on LOD
   */
  getTextureParameters(lodLevel: number): {
    maxSize: number;
    minFilter: number;
    magFilter: number;
    compression: boolean;
  } {
    const lod = this.lodLevels[lodLevel];
    const gl = WebGL2RenderingContext;
    
    return {
      maxSize: lod.maxTextureSize,
      minFilter: lod.quality === 'ultra-low' ? gl.NEAREST : gl.LINEAR,
      magFilter: lod.quality === 'ultra-low' ? gl.NEAREST : gl.LINEAR,
      compression: lod.compressionRatio < 1.0
    };
  }

  /**
   * Schedule LOD adaptation
   */
  private scheduleAdaptation(): void {
    if (this.adaptationTimer) {
      clearTimeout(this.adaptationTimer);
    }

    this.adaptationTimer = window.setTimeout(() => {
      this.adaptLOD();
    }, 1000); // Adapt every second
  }

  /**
   * Adapt LOD based on current performance
   */
  private adaptLOD(): void {
    this.isAdapting = true;
    
    const performanceScore = this.performanceMonitor.getPerformanceScore();
    const avgMemory = this.performanceMonitor.getAverageMemoryUsage();
    
    let newLOD = this.currentLOD;
    let reason = 'No change needed';
    
    // Check memory usage
    if (avgMemory > this.config.maxMemoryUsage * 0.9) {
      newLOD = Math.max(0, this.currentLOD - 1);
      reason = 'High memory usage';
    }
    // Check performance
    else if (performanceScore < this.config.qualityThresholds.acceptable) {
      newLOD = Math.max(0, this.currentLOD - 1);
      reason = 'Poor performance';
    }
    else if (performanceScore > this.config.qualityThresholds.excellent) {
      newLOD = Math.min(this.lodLevels.length - 1, this.currentLOD + 1);
      reason = 'Excellent performance';
    }
    
    if (newLOD !== this.currentLOD) {
      console.log(`🎚️ [LOD] Adapting from level ${this.currentLOD} to ${newLOD} (${reason})`);
      this.currentLOD = newLOD;
      this.targetLOD = newLOD;
    }
    
    this.isAdapting = false;
  }

  /**
   * Start the adaptation loop
   */
  private startAdaptationLoop(): void {
    setInterval(() => {
      if (this.config.enableAdaptiveLOD) {
        this.adaptLOD();
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Get current LOD metrics
   */
  getMetrics(): LODMetrics {
    return {
      currentLevel: this.currentLOD,
      targetLevel: this.targetLOD,
      renderTime: this.performanceMonitor.getAverageRenderTime(),
      memoryUsage: this.performanceMonitor.getAverageMemoryUsage(),
      frameRate: this.performanceMonitor.getAverageFrameRate(),
      adaptationReason: this.isAdapting ? 'Adapting...' : 'Stable'
    };
  }

  /**
   * Get LOD level information
   */
  getLODInfo(level: number): LODLevel | null {
    return this.lodLevels[level] || null;
  }

  /**
   * Get all available LOD levels
   */
  getAllLODLevels(): LODLevel[] {
    return [...this.lodLevels];
  }

  /**
   * Manually set LOD level
   */
  setLOD(level: number): void {
    if (level >= 0 && level < this.lodLevels.length) {
      this.currentLOD = level;
      this.targetLOD = level;
      console.log(`🎚️ [LOD] Manually set to level ${level} (${this.lodLevels[level].quality})`);
    }
  }

  /**
   * Enable or disable adaptive LOD
   */
  setAdaptiveLOD(enabled: boolean): void {
    this.config.enableAdaptiveLOD = enabled;
    console.log(`🎚️ [LOD] Adaptive LOD ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current LOD level
   */
  getCurrentLOD(): number {
    return this.currentLOD;
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.adaptationTimer) {
      clearTimeout(this.adaptationTimer);
      this.adaptationTimer = null;
    }
  }
}