/**
 * Advanced Memory Management Service
 * Provides intelligent memory management with garbage collection hints,
 * texture pooling, and memory pressure monitoring for medical imaging applications
 */

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  textureMemoryUsage: number;
  cacheMemoryUsage: number;
  totalMemoryUsage: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface TexturePoolStats {
  totalTextures: number;
  activeTextures: number;
  availableTextures: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
}

export interface MemoryConfiguration {
  maxTexturePoolSize: number; // Maximum number of textures in pool
  maxTextureMemory: number; // Maximum texture memory in bytes
  gcThreshold: number; // Memory threshold to trigger GC hints (0-1)
  criticalThreshold: number; // Critical memory threshold (0-1)
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableTexturePool: boolean;
  enableMemoryPressureMonitoring: boolean;
  enableGCHints: boolean;
}

/**
 * Texture Pool for efficient WebGL texture management
 */
class TexturePool {
  private pool: Map<string, WebGLTexture[]> = new Map();
  private activeTextures: Set<WebGLTexture> = new Set();
  private textureMetadata: Map<WebGLTexture, {
    size: number;
    format: string;
    lastUsed: number;
    width: number;
    height: number;
  }> = new Map();
  private gl: WebGL2RenderingContext;
  private maxPoolSize: number;
  private maxMemory: number;
  private currentMemory: number = 0;
  private hits: number = 0;
  private misses: number = 0;

  constructor(gl: WebGL2RenderingContext, maxPoolSize: number, maxMemory: number) {
    this.gl = gl;
    this.maxPoolSize = maxPoolSize;
    this.maxMemory = maxMemory;
  }

  /**
   * Get a texture from the pool or create a new one
   */
  getTexture(width: number, height: number, format: number = WebGL2RenderingContext.RGBA): WebGLTexture {
    const key = `${width}x${height}_${format}`;
    const pool = this.pool.get(key) || [];
    
    if (pool.length > 0) {
      const texture = pool.pop()!;
      this.activeTextures.add(texture);
      const metadata = this.textureMetadata.get(texture);
      if (metadata) {
        metadata.lastUsed = Date.now();
      }
      this.hits++;
      console.log(`🎯 [TexturePool] Cache hit for ${key} (${pool.length} remaining)`);
      return texture;
    }

    // Create new texture
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create WebGL texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, format, width, height, 0,
      format, this.gl.UNSIGNED_BYTE, null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    const size = width * height * 4; // Assuming RGBA format
    this.textureMetadata.set(texture, {
      size,
      format: key,
      lastUsed: Date.now(),
      width,
      height
    });

    this.activeTextures.add(texture);
    this.currentMemory += size;
    this.misses++;
    
    console.log(`🆕 [TexturePool] Created new texture ${key} (${Math.round(size / 1024)}KB)`);
    return texture;
  }

  /**
   * Return a texture to the pool
   */
  returnTexture(texture: WebGLTexture): void {
    if (!this.activeTextures.has(texture)) {
      console.warn('⚠️ [TexturePool] Attempting to return texture not from pool');
      return;
    }

    this.activeTextures.delete(texture);
    const metadata = this.textureMetadata.get(texture);
    if (!metadata) {
      console.warn('⚠️ [TexturePool] No metadata found for texture');
      return;
    }

    const key = metadata.format;
    if (!this.pool.has(key)) {
      this.pool.set(key, []);
    }

    const pool = this.pool.get(key)!;
    
    // Check if we should keep this texture in the pool
    if (pool.length < this.maxPoolSize && this.currentMemory < this.maxMemory) {
      pool.push(texture);
      metadata.lastUsed = Date.now();
      console.log(`♻️ [TexturePool] Returned texture to pool ${key} (${pool.length} total)`);
    } else {
      // Pool is full or memory limit reached, delete the texture
      this.deleteTexture(texture);
    }
  }

  /**
   * Delete a texture and clean up metadata
   */
  private deleteTexture(texture: WebGLTexture): void {
    const metadata = this.textureMetadata.get(texture);
    if (metadata) {
      this.currentMemory -= metadata.size;
      this.textureMetadata.delete(texture);
    }
    this.gl.deleteTexture(texture);
    console.log(`🗑️ [TexturePool] Deleted texture (${Math.round((metadata?.size || 0) / 1024)}KB freed)`);
  }

  /**
   * Clean up old unused textures
   */
  cleanup(maxAge: number = 30000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, pool] of this.pool.entries()) {
      const filtered = pool.filter(texture => {
        const metadata = this.textureMetadata.get(texture);
        if (!metadata || now - metadata.lastUsed > maxAge) {
          this.deleteTexture(texture);
          cleaned++;
          return false;
        }
        return true;
      });
      this.pool.set(key, filtered);
    }

    if (cleaned > 0) {
      console.log(`🧹 [TexturePool] Cleaned up ${cleaned} old textures`);
    }
  }

  /**
   * Force cleanup when memory pressure is high
   */
  forceCleanup(): void {
    let cleaned = 0;
    
    // Sort textures by last used time and clean oldest first
    const allTextures: Array<{ texture: WebGLTexture; lastUsed: number; key: string }> = [];
    
    for (const [key, pool] of this.pool.entries()) {
      for (const texture of pool) {
        const metadata = this.textureMetadata.get(texture);
        if (metadata) {
          allTextures.push({ texture, lastUsed: metadata.lastUsed, key });
        }
      }
    }

    allTextures.sort((a, b) => a.lastUsed - b.lastUsed);
    
    // Clean up oldest 50% of textures
    const toClean = Math.ceil(allTextures.length * 0.5);
    for (let i = 0; i < toClean; i++) {
      const { texture, key } = allTextures[i];
      const pool = this.pool.get(key);
      if (pool) {
        const index = pool.indexOf(texture);
        if (index !== -1) {
          pool.splice(index, 1);
          this.deleteTexture(texture);
          cleaned++;
        }
      }
    }

    console.log(`🚨 [TexturePool] Force cleanup removed ${cleaned} textures`);
  }

  /**
   * Get pool statistics
   */
  getStats(): TexturePoolStats {
    let totalTextures = 0;
    for (const pool of this.pool.values()) {
      totalTextures += pool.length;
    }

    const totalRequests = this.hits + this.misses;
    
    return {
      totalTextures,
      activeTextures: this.activeTextures.size,
      availableTextures: totalTextures,
      memoryUsage: this.currentMemory,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0
    };
  }

  /**
   * Dispose of all textures
   */
  dispose(): void {
    for (const pool of this.pool.values()) {
      for (const texture of pool) {
        this.deleteTexture(texture);
      }
    }
    for (const texture of this.activeTextures) {
      this.deleteTexture(texture);
    }
    this.pool.clear();
    this.activeTextures.clear();
    this.textureMetadata.clear();
    this.currentMemory = 0;
  }
}

/**
 * Memory Manager Service
 */
export class MemoryManager {
  private config: MemoryConfiguration;
  private texturePool: TexturePool | null = null;
  private memoryStats: MemoryStats;
  private cleanupInterval: number | null = null;
  private memoryPressureCallbacks: Array<(pressure: 'low' | 'medium' | 'high' | 'critical') => void> = [];
  private lastGCHint: number = 0;
  private gcHintCooldown: number = 5000; // 5 seconds between GC hints

  constructor(config: Partial<MemoryConfiguration> = {}) {
    this.config = {
      maxTexturePoolSize: 50,
      maxTextureMemory: 256 * 1024 * 1024, // 256MB
      gcThreshold: 0.8,
      criticalThreshold: 0.95,
      cleanupInterval: 30000, // 30 seconds
      enableTexturePool: true,
      enableMemoryPressureMonitoring: true,
      enableGCHints: true,
      ...config
    };

    this.memoryStats = this.getInitialMemoryStats();
    this.startMonitoring();
  }

  /**
   * Initialize texture pool with WebGL context
   */
  initializeTexturePool(gl: WebGL2RenderingContext): void {
    if (this.config.enableTexturePool && !this.texturePool) {
      this.texturePool = new TexturePool(
        gl,
        this.config.maxTexturePoolSize,
        this.config.maxTextureMemory
      );
      console.log('🎯 [MemoryManager] Texture pool initialized');
    }
  }

  /**
   * Get a texture from the pool
   */
  getTexture(width: number, height: number, format?: number): WebGLTexture | null {
    if (!this.texturePool) {
      console.warn('⚠️ [MemoryManager] Texture pool not initialized');
      return null;
    }
    return this.texturePool.getTexture(width, height, format);
  }

  /**
   * Return a texture to the pool
   */
  returnTexture(texture: WebGLTexture): void {
    if (this.texturePool) {
      this.texturePool.returnTexture(texture);
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    this.updateMemoryStats();
    return { ...this.memoryStats };
  }

  /**
   * Get texture pool statistics
   */
  getTexturePoolStats(): TexturePoolStats | null {
    return this.texturePool?.getStats() || null;
  }

  /**
   * Register callback for memory pressure changes
   */
  onMemoryPressure(callback: (pressure: 'low' | 'medium' | 'high' | 'critical') => void): void {
    this.memoryPressureCallbacks.push(callback);
  }

  /**
   * Force garbage collection hint
   */
  forceGarbageCollection(): void {
    if (!this.config.enableGCHints) return;

    const now = Date.now();
    if (now - this.lastGCHint < this.gcHintCooldown) {
      return; // Too soon since last GC hint
    }

    this.lastGCHint = now;

    // Force cleanup of texture pool
    if (this.texturePool) {
      this.texturePool.forceCleanup();
    }

    // Trigger garbage collection hints
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('🗑️ [MemoryManager] Forced garbage collection');
    } else {
      // Alternative GC hints for browsers without explicit GC
      this.triggerGCHints();
    }
  }

  /**
   * Trigger garbage collection hints through memory pressure
   */
  private triggerGCHints(): void {
    // Create temporary large objects to trigger GC
    const tempArrays: ArrayBuffer[] = [];
    try {
      for (let i = 0; i < 10; i++) {
        tempArrays.push(new ArrayBuffer(1024 * 1024)); // 1MB each
      }
    } catch (e) {
      // Memory allocation failed, which is expected
    } finally {
      // Clear references to trigger GC
      tempArrays.length = 0;
    }
    
    console.log('💨 [MemoryManager] Triggered GC hints through memory pressure');
  }

  /**
   * Clean up memory caches
   */
  cleanup(): void {
    if (this.texturePool) {
      this.texturePool.cleanup();
    }
    
    // Force GC if memory pressure is high
    if (this.memoryStats.memoryPressure === 'high' || this.memoryStats.memoryPressure === 'critical') {
      this.forceGarbageCollection();
    }
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (!this.config.enableMemoryPressureMonitoring) return;

    this.cleanupInterval = window.setInterval(() => {
      this.updateMemoryStats();
      this.cleanup();
    }, this.config.cleanupInterval);

    // Monitor memory pressure more frequently
    setInterval(() => {
      this.updateMemoryStats();
      this.checkMemoryPressure();
    }, 1000);
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    const performance = (window.performance as any);
    const memory = performance.memory;
    
    let jsHeapSize = 0;
    let totalHeapSize = 0;
    let heapSizeLimit = 0;
    
    if (memory) {
      jsHeapSize = memory.usedJSHeapSize || 0;
      totalHeapSize = memory.totalJSHeapSize || 0;
      heapSizeLimit = memory.jsHeapSizeLimit || 0;
    }

    const textureMemory = this.texturePool?.getStats().memoryUsage || 0;
    const cacheMemory = 0; // TODO: Get from cache manager
    const totalMemory = jsHeapSize + textureMemory + cacheMemory;
    
    // Calculate memory pressure
    let memoryPressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (heapSizeLimit > 0) {
      const ratio = totalMemory / heapSizeLimit;
      if (ratio >= this.config.criticalThreshold) {
        memoryPressure = 'critical';
      } else if (ratio >= this.config.gcThreshold) {
        memoryPressure = 'high';
      } else if (ratio >= 0.6) {
        memoryPressure = 'medium';
      }
    }

    this.memoryStats = {
      usedJSHeapSize: jsHeapSize,
      totalJSHeapSize: totalHeapSize,
      jsHeapSizeLimit: heapSizeLimit,
      textureMemoryUsage: textureMemory,
      cacheMemoryUsage: cacheMemory,
      totalMemoryUsage: totalMemory,
      memoryPressure
    };
  }

  /**
   * Check and handle memory pressure
   */
  private checkMemoryPressure(): void {
    const currentPressure = this.memoryStats.memoryPressure;
    
    // Notify callbacks of memory pressure changes
    this.memoryPressureCallbacks.forEach(callback => {
      try {
        callback(currentPressure);
      } catch (error) {
        console.error('Error in memory pressure callback:', error);
      }
    });

    // Handle critical memory pressure
    if (currentPressure === 'critical') {
      console.warn('🚨 [MemoryManager] Critical memory pressure detected');
      this.forceGarbageCollection();
    } else if (currentPressure === 'high') {
      console.warn('⚠️ [MemoryManager] High memory pressure detected');
      this.cleanup();
    }
  }

  /**
   * Get initial memory statistics
   */
  private getInitialMemoryStats(): MemoryStats {
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      textureMemoryUsage: 0,
      cacheMemoryUsage: 0,
      totalMemoryUsage: 0,
      memoryPressure: 'low'
    };
  }

  /**
   * Dispose of the memory manager
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.texturePool) {
      this.texturePool.dispose();
      this.texturePool = null;
    }

    this.memoryPressureCallbacks.length = 0;
    console.log('🧹 [MemoryManager] Disposed');
  }
}