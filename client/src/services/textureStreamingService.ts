/**
 * Texture Streaming Service
 * Efficiently manages texture loading and streaming for large multi-frame DICOM studies
 * Reduces memory usage and improves performance through intelligent caching and preloading
 */

import { performanceMonitor } from './performanceMonitor';

export interface TextureStreamConfig {
  maxCachedTextures: number;
  preloadRadius: number; // Number of frames to preload around current frame
  compressionLevel: number; // 0-1, higher = more compression
  enableLOD: boolean; // Level of Detail support
  memoryThreshold: number; // Memory threshold in bytes
}

export interface StreamedTexture {
  id: string;
  frameIndex: number;
  texture: WebGLTexture | null;
  data: ArrayBuffer | null;
  compressed: boolean;
  lastAccessed: number;
  loadPriority: number;
  isLoading: boolean;
  size: number;
}

export interface TextureLoadRequest {
  frameIndex: number;
  priority: 'immediate' | 'high' | 'normal' | 'low';
  callback?: (texture: StreamedTexture) => void;
}

export class TextureStreamingService {
  private static instance: TextureStreamingService;
  private config: TextureStreamConfig;
  private textureCache: Map<string, StreamedTexture> = new Map();
  private loadQueue: TextureLoadRequest[] = [];
  private isProcessingQueue: boolean = false;
  private currentFrame: number = 0;
  private totalFrames: number = 0;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  
  // Performance tracking
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    texturesLoaded: 0,
    memoryUsed: 0,
    averageLoadTime: 0
  };

  private constructor(config: Partial<TextureStreamConfig> = {}) {
    this.config = {
      maxCachedTextures: config.maxCachedTextures ?? 20,
      preloadRadius: config.preloadRadius ?? 3,
      compressionLevel: config.compressionLevel ?? 0.8,
      enableLOD: config.enableLOD ?? true,
      memoryThreshold: config.memoryThreshold ?? 200 * 1024 * 1024 // 200MB
    };
  }

  public static getInstance(config?: Partial<TextureStreamConfig>): TextureStreamingService {
    if (!TextureStreamingService.instance) {
      TextureStreamingService.instance = new TextureStreamingService(config);
    }
    return TextureStreamingService.instance;
  }

  /**
   * Initialize the streaming service with WebGL context
   */
  public initialize(gl: WebGLRenderingContext | WebGL2RenderingContext, totalFrames: number): void {
    this.gl = gl;
    this.totalFrames = totalFrames;
    
    console.log(`🎬 [TextureStreaming] Initialized for ${totalFrames} frames`);
    
    // Start background processing
    this.startBackgroundProcessing();
  }

  /**
   * Request a texture for a specific frame
   */
  public async requestTexture(frameIndex: number, priority: 'immediate' | 'high' | 'normal' | 'low' = 'normal'): Promise<StreamedTexture | null> {
    const textureId = `frame_${frameIndex}`;
    
    // Check cache first
    const cachedTexture = this.textureCache.get(textureId);
    if (cachedTexture && cachedTexture.texture) {
      this.stats.cacheHits++;
      cachedTexture.lastAccessed = Date.now();
      return cachedTexture;
    }

    this.stats.cacheMisses++;

    // Add to load queue if not already loading
    if (!cachedTexture?.isLoading) {
      this.addToLoadQueue({
        frameIndex,
        priority,
        callback: undefined
      });
    }

    // For immediate priority, load synchronously
    if (priority === 'immediate') {
      return await this.loadTextureImmediate(frameIndex);
    }

    return cachedTexture || null;
  }

  /**
   * Set current frame and trigger preloading
   */
  public setCurrentFrame(frameIndex: number): void {
    this.currentFrame = frameIndex;
    this.schedulePreloading();
  }

  /**
   * Load texture immediately (blocking)
   */
  private async loadTextureImmediate(frameIndex: number): Promise<StreamedTexture | null> {
    const startTime = performance.now();
    const textureId = `frame_${frameIndex}`;

    try {
      // Create placeholder texture entry
      const streamedTexture: StreamedTexture = {
        id: textureId,
        frameIndex,
        texture: null,
        data: null,
        compressed: false,
        lastAccessed: Date.now(),
        loadPriority: 1,
        isLoading: true,
        size: 0
      };

      this.textureCache.set(textureId, streamedTexture);

      // Load image data (this would integrate with your existing DICOM loading)
      const imageData = await this.loadImageData(frameIndex);
      if (!imageData) {
        streamedTexture.isLoading = false;
        return null;
      }

      // Create WebGL texture
      const texture = await this.createWebGLTexture(imageData);
      if (!texture) {
        streamedTexture.isLoading = false;
        return null;
      }

      // Update texture entry
      streamedTexture.texture = texture;
      streamedTexture.data = imageData;
      streamedTexture.size = imageData.byteLength;
      streamedTexture.isLoading = false;
      
      this.stats.texturesLoaded++;
      this.stats.memoryUsed += streamedTexture.size;
      
      const loadTime = performance.now() - startTime;
      this.stats.averageLoadTime = (this.stats.averageLoadTime + loadTime) / 2;

      // Check memory usage and cleanup if needed
      this.checkMemoryUsage();

      console.log(`🎬 [TextureStreaming] Loaded frame ${frameIndex} in ${loadTime.toFixed(2)}ms`);
      
      return streamedTexture;

    } catch (error) {
      console.error(`🎬 [TextureStreaming] Failed to load frame ${frameIndex}:`, error);
      return null;
    }
  }

  /**
   * Add request to load queue
   */
  private addToLoadQueue(request: TextureLoadRequest): void {
    // Remove existing request for same frame
    this.loadQueue = this.loadQueue.filter(req => req.frameIndex !== request.frameIndex);
    
    // Add new request
    this.loadQueue.push(request);
    
    // Sort by priority
    this.loadQueue.sort((a, b) => {
      const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processLoadQueue();
    }
  }

  /**
   * Process the load queue in background
   */
  private async processLoadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.loadQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.loadQueue.length > 0) {
      const request = this.loadQueue.shift()!;
      
      try {
        const texture = await this.loadTextureImmediate(request.frameIndex);
        if (texture && request.callback) {
          request.callback(texture);
        }
      } catch (error) {
        console.error(`🎬 [TextureStreaming] Queue processing error:`, error);
      }

      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Schedule preloading of nearby frames
   */
  private schedulePreloading(): void {
    const startFrame = Math.max(0, this.currentFrame - this.config.preloadRadius);
    const endFrame = Math.min(this.totalFrames - 1, this.currentFrame + this.config.preloadRadius);

    for (let i = startFrame; i <= endFrame; i++) {
      if (i === this.currentFrame) continue; // Current frame should already be loaded
      
      const textureId = `frame_${i}`;
      if (!this.textureCache.has(textureId)) {
        const distance = Math.abs(i - this.currentFrame);
        const priority = distance <= 1 ? 'high' : 'normal';
        
        this.addToLoadQueue({
          frameIndex: i,
          priority: priority as 'high' | 'normal'
        });
      }
    }
  }

  /**
   * Load image data (integrate with existing DICOM service)
   */
  private async loadImageData(frameIndex: number): Promise<ArrayBuffer | null> {
    // This would integrate with your existing DICOM loading service
    // For now, return a placeholder
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate loading time
        const mockData = new ArrayBuffer(512 * 512 * 4); // Mock 512x512 RGBA image
        resolve(mockData);
      }, Math.random() * 100 + 50); // 50-150ms load time
    });
  }

  /**
   * Create WebGL texture from image data
   */
  private async createWebGLTexture(imageData: ArrayBuffer): Promise<WebGLTexture | null> {
    if (!this.gl) return null;

    const texture = this.gl.createTexture();
    if (!texture) return null;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // For now, create a simple texture
    // In real implementation, this would process the DICOM data
    const width = 512;
    const height = 512;
    const data = new Uint8Array(imageData);
    
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      data
    );

    // Set texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    return texture;
  }

  /**
   * Check memory usage and cleanup if needed
   */
  private checkMemoryUsage(): void {
    if (this.stats.memoryUsed > this.config.memoryThreshold) {
      this.cleanupOldTextures();
    }
  }

  /**
   * Cleanup old textures based on LRU policy
   */
  private cleanupOldTextures(): void {
    const textures = Array.from(this.textureCache.values())
      .filter(t => t.texture !== null)
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    const targetCount = Math.floor(this.config.maxCachedTextures * 0.8);
    const toRemove = textures.slice(0, textures.length - targetCount);

    for (const texture of toRemove) {
      if (this.gl && texture.texture) {
        this.gl.deleteTexture(texture.texture);
      }
      this.stats.memoryUsed -= texture.size;
      this.textureCache.delete(texture.id);
    }

    console.log(`🎬 [TextureStreaming] Cleaned up ${toRemove.length} textures, memory: ${this.formatBytes(this.stats.memoryUsed)}`);
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    setInterval(() => {
      // Update performance monitor
      performanceMonitor.updateCacheHitRate(
        this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
      );

      // Cleanup if memory threshold exceeded
      this.checkMemoryUsage();
    }, 5000); // Every 5 seconds
  }

  /**
   * Get streaming statistics
   */
  public getStats() {
    return {
      ...this.stats,
      cacheSize: this.textureCache.size,
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
      memoryUsedFormatted: this.formatBytes(this.stats.memoryUsed)
    };
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Cleanup all resources
   */
  public destroy(): void {
    // Clear load queue
    this.loadQueue = [];
    this.isProcessingQueue = false;

    // Delete all textures
    if (this.gl) {
      for (const texture of this.textureCache.values()) {
        if (texture.texture) {
          this.gl.deleteTexture(texture.texture);
        }
      }
    }

    this.textureCache.clear();
    this.stats.memoryUsed = 0;

    console.log('🎬 [TextureStreaming] Service destroyed');
  }
}

export const textureStreamingService = TextureStreamingService.getInstance();