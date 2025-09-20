/**
 * Memory Management System
 * Intelligent memory allocation, deallocation, and garbage collection optimization
 */

export interface MemoryPool {
  id: string;
  name: string;
  type: 'image' | 'texture' | 'buffer' | 'cache' | 'temporary';
  maxSize: number; // bytes
  currentSize: number; // bytes
  allocations: Map<string, MemoryAllocation>;
  strategy: 'lru' | 'lfu' | 'fifo' | 'priority' | 'adaptive';
  compressionEnabled: boolean;
  autoCleanup: boolean;
}

export interface MemoryAllocation {
  id: string;
  poolId: string;
  size: number; // bytes
  data: ArrayBuffer | ImageData | any;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  priority: number; // 0-10, higher = more important
  compressed: boolean;
  metadata: {
    type: string;
    description?: string;
    tags: string[];
    dependencies: string[];
  };
}

export interface MemoryStatistics {
  totalAllocated: number; // bytes
  totalAvailable: number; // bytes
  heapUsed: number; // bytes
  heapTotal: number; // bytes
  heapLimit: number; // bytes
  gcCount: number;
  gcTime: number; // ms
  fragmentationRatio: number;
  poolUtilization: { [poolId: string]: number };
  allocationsByType: { [type: string]: number };
  compressionRatio: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  poolId?: string;
  allocationId?: string;
  suggestedAction?: string;
  autoResolved: boolean;
}

export interface GarbageCollectionConfig {
  enabled: boolean;
  interval: number; // ms
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  memoryThreshold: number; // 0-1 (percentage of heap limit)
  forceGCThreshold: number; // 0-1 (percentage of heap limit)
  maxGCTime: number; // ms
}

class MemoryManagementSystem {
  private memoryPools: Map<string, MemoryPool> = new Map();
  private statistics: MemoryStatistics;
  private alerts: MemoryAlert[] = [];
  private gcConfig: GarbageCollectionConfig;
  private monitoringInterval: number | null = null;
  private gcInterval: number | null = null;
  private isMonitoring: boolean = false;

  // Compression utilities
  private compressionWorker: Worker | null = null;
  private compressionQueue: Map<string, Promise<ArrayBuffer>> = new Map();

  constructor(gcConfig: Partial<GarbageCollectionConfig> = {}) {
    this.gcConfig = {
      enabled: true,
      interval: 30000, // 30 seconds
      aggressiveness: 'moderate',
      memoryThreshold: 0.8,
      forceGCThreshold: 0.95,
      maxGCTime: 100,
      ...gcConfig
    };

    this.statistics = {
      totalAllocated: 0,
      totalAvailable: 0,
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      gcCount: 0,
      gcTime: 0,
      fragmentationRatio: 0,
      poolUtilization: {},
      allocationsByType: {},
      compressionRatio: 1,
      memoryPressure: 'low'
    };

    this.initialize();
  }

  /**
   * Initialize memory management system
   */
  private async initialize(): Promise<void> {
    console.log('🧠 [MemoryManagementSystem] Initializing...');

    try {
      // Create default memory pools
      this.createDefaultPools();

      // Initialize compression worker
      await this.initializeCompressionWorker();

      // Start monitoring
      this.startMonitoring();

      // Start garbage collection if enabled
      if (this.gcConfig.enabled) {
        this.startGarbageCollection();
      }

      console.log('🧠 [MemoryManagementSystem] Initialized successfully');
    } catch (error) {
      console.error('🧠 [MemoryManagementSystem] Initialization failed:', error);
    }
  } 
 /**
   * Create default memory pools
   */
  private createDefaultPools(): void {
    const defaultPools = [
      {
        id: 'image-cache',
        name: 'Image Cache',
        type: 'image' as const,
        maxSize: 512 * 1024 * 1024, // 512 MB
        strategy: 'lru' as const,
        compressionEnabled: true,
        autoCleanup: true
      },
      {
        id: 'texture-cache',
        name: 'Texture Cache',
        type: 'texture' as const,
        maxSize: 256 * 1024 * 1024, // 256 MB
        strategy: 'lfu' as const,
        compressionEnabled: false,
        autoCleanup: true
      },
      {
        id: 'buffer-pool',
        name: 'Buffer Pool',
        type: 'buffer' as const,
        maxSize: 128 * 1024 * 1024, // 128 MB
        strategy: 'fifo' as const,
        compressionEnabled: false,
        autoCleanup: true
      },
      {
        id: 'temp-storage',
        name: 'Temporary Storage',
        type: 'temporary' as const,
        maxSize: 64 * 1024 * 1024, // 64 MB
        strategy: 'priority' as const,
        compressionEnabled: true,
        autoCleanup: true
      }
    ];

    defaultPools.forEach(poolConfig => {
      const pool: MemoryPool = {
        ...poolConfig,
        currentSize: 0,
        allocations: new Map()
      };
      this.memoryPools.set(pool.id, pool);
    });

    console.log('🧠 [MemoryManagementSystem] Created', defaultPools.length, 'default memory pools');
  }

  /**
   * Initialize compression worker
   */
  private async initializeCompressionWorker(): Promise<void> {
    try {
      this.compressionWorker = new Worker('/workers/compression-worker.js');
      this.compressionWorker.onmessage = (event) => {
        this.handleCompressionResult(event.data);
      };
      this.compressionWorker.onerror = (error) => {
        console.error('🧠 [MemoryManagementSystem] Compression worker error:', error);
      };
      console.log('🧠 [MemoryManagementSystem] Compression worker initialized');
    } catch (error) {
      console.warn('🧠 [MemoryManagementSystem] Failed to initialize compression worker:', error);
    }
  }

  /**
   * Handle compression result
   */
  private handleCompressionResult(data: any): void {
    const { id, compressedData, originalSize, compressedSize } = data;
    const promise = this.compressionQueue.get(id);
    
    if (promise) {
      this.compressionQueue.delete(id);
      // Update compression ratio statistics
      const ratio = compressedSize / originalSize;
      this.statistics.compressionRatio = (this.statistics.compressionRatio + ratio) / 2;
    }
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.updateMemoryStatistics();
      this.checkMemoryPressure();
    }, 1000); // Update every second

    console.log('🧠 [MemoryManagementSystem] Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  private stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🧠 [MemoryManagementSystem] Memory monitoring stopped');
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStatistics(): void {
    const memory = (performance as any).memory;
    
    if (memory) {
      this.statistics.heapUsed = memory.usedJSHeapSize;
      this.statistics.heapTotal = memory.totalJSHeapSize;
      this.statistics.heapLimit = memory.jsHeapSizeLimit;
    }

    // Calculate total allocated across all pools
    this.statistics.totalAllocated = 0;
    this.statistics.poolUtilization = {};
    this.statistics.allocationsByType = {};

    for (const [poolId, pool] of this.memoryPools) {
      this.statistics.totalAllocated += pool.currentSize;
      this.statistics.poolUtilization[poolId] = pool.currentSize / pool.maxSize;

      // Count allocations by type
      for (const allocation of pool.allocations.values()) {
        const type = allocation.metadata.type;
        this.statistics.allocationsByType[type] = (this.statistics.allocationsByType[type] || 0) + 1;
      }
    }

    this.statistics.totalAvailable = this.statistics.heapLimit - this.statistics.heapUsed;
    this.statistics.fragmentationRatio = this.calculateFragmentationRatio();
  }

  /**
   * Calculate fragmentation ratio
   */
  private calculateFragmentationRatio(): number {
    // Simplified fragmentation calculation
    const usedRatio = this.statistics.heapUsed / this.statistics.heapLimit;
    const allocatedRatio = this.statistics.totalAllocated / this.statistics.heapLimit;
    return Math.abs(usedRatio - allocatedRatio);
  }

  /**
   * Check memory pressure and trigger alerts
   */
  private checkMemoryPressure(): void {
    const usageRatio = this.statistics.heapUsed / this.statistics.heapLimit;
    let newPressure: MemoryStatistics['memoryPressure'] = 'low';

    if (usageRatio >= 0.9) {
      newPressure = 'critical';
    } else if (usageRatio >= 0.8) {
      newPressure = 'high';
    } else if (usageRatio >= 0.6) {
      newPressure = 'medium';
    }

    if (newPressure !== this.statistics.memoryPressure) {
      this.statistics.memoryPressure = newPressure;
      this.handleMemoryPressureChange(newPressure);
    }
  }

  /**
   * Handle memory pressure changes
   */
  private handleMemoryPressureChange(pressure: MemoryStatistics['memoryPressure']): void {
    const alert: MemoryAlert = {
      id: `pressure-${Date.now()}`,
      type: pressure === 'critical' ? 'critical' : pressure === 'high' ? 'warning' : 'info',
      message: `Memory pressure changed to: ${pressure}`,
      timestamp: Date.now(),
      suggestedAction: this.getSuggestedActionForPressure(pressure),
      autoResolved: false
    };

    this.alerts.push(alert);

    // Auto-trigger cleanup for high pressure
    if (pressure === 'high' || pressure === 'critical') {
      this.triggerEmergencyCleanup();
    }

    console.log('🧠 [MemoryManagementSystem] Memory pressure changed to:', pressure);
  }

  /**
   * Get suggested action for memory pressure
   */
  private getSuggestedActionForPressure(pressure: MemoryStatistics['memoryPressure']): string {
    switch (pressure) {
      case 'critical':
        return 'Immediate cleanup required - consider reducing image quality or clearing caches';
      case 'high':
        return 'Cleanup recommended - free unused resources';
      case 'medium':
        return 'Monitor usage - consider preemptive cleanup';
      case 'low':
        return 'Normal operation - no action needed';
      default:
        return 'Monitor memory usage';
    }
  }

  /**
   * Trigger emergency cleanup
   */
  private triggerEmergencyCleanup(): void {
    console.log('🧠 [MemoryManagementSystem] Triggering emergency cleanup');

    // Clean up temporary storage first
    const tempPool = this.memoryPools.get('temp-storage');
    if (tempPool) {
      this.clearPool('temp-storage');
    }

    // Aggressive cleanup of least recently used items
    for (const [poolId, pool] of this.memoryPools) {
      if (pool.autoCleanup) {
        this.cleanupPool(poolId, 0.5); // Free 50% of pool
      }
    }

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * Start garbage collection
   */
  private startGarbageCollection(): void {
    if (this.gcInterval) return;

    this.gcInterval = window.setInterval(() => {
      this.performGarbageCollection();
    }, this.gcConfig.interval);

    console.log('🧠 [MemoryManagementSystem] Garbage collection started');
  }

  /**
   * Stop garbage collection
   */
  private stopGarbageCollection(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }

    console.log('🧠 [MemoryManagementSystem] Garbage collection stopped');
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    const startTime = performance.now();
    const usageRatio = this.statistics.heapUsed / this.statistics.heapLimit;

    // Skip GC if memory usage is low and aggressiveness is conservative
    if (usageRatio < this.gcConfig.memoryThreshold && this.gcConfig.aggressiveness === 'conservative') {
      return;
    }

    let itemsCollected = 0;
    let bytesFreed = 0;

    // Collect from each pool based on strategy
    for (const [poolId, pool] of this.memoryPools) {
      if (!pool.autoCleanup) continue;

      const { items, bytes } = this.collectFromPool(pool);
      itemsCollected += items;
      bytesFreed += bytes;
    }

    const gcTime = performance.now() - startTime;
    this.statistics.gcCount++;
    this.statistics.gcTime += gcTime;

    if (itemsCollected > 0) {
      console.log('🧠 [MemoryManagementSystem] GC collected', itemsCollected, 'items,', 
                  Math.round(bytesFreed / 1024), 'KB freed in', gcTime.toFixed(2), 'ms');
    }

    // Force GC if memory usage is critical
    if (usageRatio >= this.gcConfig.forceGCThreshold && (window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * Collect garbage from specific pool
   */
  private collectFromPool(pool: MemoryPool): { items: number; bytes: number } {
    const now = Date.now();
    const allocationsToRemove: string[] = [];
    let bytesFreed = 0;

    // Determine collection criteria based on aggressiveness
    let maxAge: number;
    let maxUnused: number;

    switch (this.gcConfig.aggressiveness) {
      case 'conservative':
        maxAge = 300000; // 5 minutes
        maxUnused = 60000; // 1 minute
        break;
      case 'moderate':
        maxAge = 180000; // 3 minutes
        maxUnused = 30000; // 30 seconds
        break;
      case 'aggressive':
        maxAge = 60000; // 1 minute
        maxUnused = 10000; // 10 seconds
        break;
    }

    // Collect based on pool strategy
    const sortedAllocations = Array.from(pool.allocations.entries()).sort((a, b) => {
      switch (pool.strategy) {
        case 'lru':
          return a[1].lastAccessed - b[1].lastAccessed;
        case 'lfu':
          return a[1].accessCount - b[1].accessCount;
        case 'fifo':
          return a[1].timestamp - b[1].timestamp;
        case 'priority':
          return a[1].priority - b[1].priority;
        default:
          return a[1].lastAccessed - b[1].lastAccessed;
      }
    });

    for (const [id, allocation] of sortedAllocations) {
      const age = now - allocation.timestamp;
      const unused = now - allocation.lastAccessed;

      // Check if allocation should be collected
      if (age > maxAge || unused > maxUnused || allocation.priority === 0) {
        allocationsToRemove.push(id);
        bytesFreed += allocation.size;

        // Stop if we've freed enough or hit time limit
        if (performance.now() - now > this.gcConfig.maxGCTime) {
          break;
        }
      }
    }

    // Remove collected allocations
    allocationsToRemove.forEach(id => {
      pool.allocations.delete(id);
    });

    pool.currentSize -= bytesFreed;

    return { items: allocationsToRemove.length, bytes: bytesFreed };
  } 
 /**
   * Allocate memory in specified pool
   */
  public allocate(
    poolId: string,
    data: ArrayBuffer | ImageData | any,
    metadata: {
      type: string;
      description?: string;
      tags?: string[];
      dependencies?: string[];
    },
    priority: number = 5
  ): string | null {
    const pool = this.memoryPools.get(poolId);
    if (!pool) {
      console.error('🧠 [MemoryManagementSystem] Pool not found:', poolId);
      return null;
    }

    const size = this.calculateDataSize(data);
    
    // Check if allocation would exceed pool limit
    if (pool.currentSize + size > pool.maxSize) {
      // Try to free space
      const spaceNeeded = (pool.currentSize + size) - pool.maxSize;
      const freed = this.freeSpace(poolId, spaceNeeded);
      
      if (freed < spaceNeeded) {
        console.warn('🧠 [MemoryManagementSystem] Insufficient space in pool:', poolId);
        return null;
      }
    }

    const allocationId = `${poolId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const allocation: MemoryAllocation = {
      id: allocationId,
      poolId,
      size,
      data,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      priority,
      compressed: false,
      metadata: {
        type: metadata.type,
        description: metadata.description,
        tags: metadata.tags || [],
        dependencies: metadata.dependencies || []
      }
    };

    pool.allocations.set(allocationId, allocation);
    pool.currentSize += size;

    // Compress if enabled and data is suitable
    if (pool.compressionEnabled && this.shouldCompress(data, size)) {
      this.compressAllocation(allocationId);
    }

    console.log('🧠 [MemoryManagementSystem] Allocated', Math.round(size / 1024), 'KB in pool:', poolId);
    return allocationId;
  }

  /**
   * Deallocate memory
   */
  public deallocate(allocationId: string): boolean {
    for (const [poolId, pool] of this.memoryPools) {
      const allocation = pool.allocations.get(allocationId);
      if (allocation) {
        pool.allocations.delete(allocationId);
        pool.currentSize -= allocation.size;
        
        console.log('🧠 [MemoryManagementSystem] Deallocated', Math.round(allocation.size / 1024), 'KB from pool:', poolId);
        return true;
      }
    }
    
    console.warn('🧠 [MemoryManagementSystem] Allocation not found:', allocationId);
    return false;
  }

  /**
   * Access allocation (updates access statistics)
   */
  public access(allocationId: string): any | null {
    for (const pool of this.memoryPools.values()) {
      const allocation = pool.allocations.get(allocationId);
      if (allocation) {
        allocation.lastAccessed = Date.now();
        allocation.accessCount++;
        return allocation.data;
      }
    }
    
    return null;
  }

  /**
   * Calculate data size
   */
  private calculateDataSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof ImageData) {
      return data.data.byteLength;
    } else if (typeof data === 'string') {
      return data.length * 2; // Approximate UTF-16 size
    } else if (data && typeof data === 'object') {
      return JSON.stringify(data).length * 2; // Approximate
    }
    
    return 1024; // Default 1KB for unknown types
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(data: any, size: number): boolean {
    // Only compress if size is above threshold and data type is suitable
    const minSizeForCompression = 10 * 1024; // 10KB
    
    if (size < minSizeForCompression) return false;
    
    // Compress ArrayBuffers and large objects
    return data instanceof ArrayBuffer || 
           (data && typeof data === 'object' && !(data instanceof ImageData));
  }

  /**
   * Compress allocation
   */
  private async compressAllocation(allocationId: string): Promise<void> {
    if (!this.compressionWorker) return;

    const allocation = this.findAllocation(allocationId);
    if (!allocation || allocation.compressed) return;

    try {
      const compressionId = `compress-${Date.now()}`;
      
      const compressionPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Compression timeout'));
        }, 10000);

        this.compressionQueue.set(compressionId, compressionPromise);
        
        this.compressionWorker!.postMessage({
          id: compressionId,
          data: allocation.data,
          type: 'compress'
        });
      });

      const compressedData = await compressionPromise;
      
      // Update allocation with compressed data
      const originalSize = allocation.size;
      allocation.data = compressedData;
      allocation.size = compressedData.byteLength;
      allocation.compressed = true;

      // Update pool size
      const pool = this.memoryPools.get(allocation.poolId);
      if (pool) {
        pool.currentSize = pool.currentSize - originalSize + allocation.size;
      }

      console.log('🧠 [MemoryManagementSystem] Compressed allocation:', allocationId, 
                  'saved', Math.round((originalSize - allocation.size) / 1024), 'KB');
    } catch (error) {
      console.warn('🧠 [MemoryManagementSystem] Compression failed for allocation:', allocationId, error);
    }
  }

  /**
   * Find allocation across all pools
   */
  private findAllocation(allocationId: string): MemoryAllocation | null {
    for (const pool of this.memoryPools.values()) {
      const allocation = pool.allocations.get(allocationId);
      if (allocation) return allocation;
    }
    return null;
  }

  /**
   * Free space in pool
   */
  private freeSpace(poolId: string, bytesNeeded: number): number {
    const pool = this.memoryPools.get(poolId);
    if (!pool) return 0;

    let bytesFreed = 0;
    const allocationsToRemove: string[] = [];

    // Sort allocations by strategy
    const sortedAllocations = Array.from(pool.allocations.entries()).sort((a, b) => {
      switch (pool.strategy) {
        case 'lru':
          return a[1].lastAccessed - b[1].lastAccessed;
        case 'lfu':
          return a[1].accessCount - b[1].accessCount;
        case 'fifo':
          return a[1].timestamp - b[1].timestamp;
        case 'priority':
          return a[1].priority - b[1].priority;
        default:
          return a[1].lastAccessed - b[1].lastAccessed;
      }
    });

    // Remove allocations until we have enough space
    for (const [id, allocation] of sortedAllocations) {
      allocationsToRemove.push(id);
      bytesFreed += allocation.size;
      
      if (bytesFreed >= bytesNeeded) break;
    }

    // Remove the allocations
    allocationsToRemove.forEach(id => {
      pool.allocations.delete(id);
    });

    pool.currentSize -= bytesFreed;

    console.log('🧠 [MemoryManagementSystem] Freed', Math.round(bytesFreed / 1024), 'KB from pool:', poolId);
    return bytesFreed;
  }

  /**
   * Cleanup pool
   */
  public cleanupPool(poolId: string, ratio: number = 0.2): number {
    const pool = this.memoryPools.get(poolId);
    if (!pool) return 0;

    const targetSize = pool.maxSize * (1 - ratio);
    const bytesToFree = Math.max(0, pool.currentSize - targetSize);
    
    return this.freeSpace(poolId, bytesToFree);
  }

  /**
   * Clear entire pool
   */
  public clearPool(poolId: string): boolean {
    const pool = this.memoryPools.get(poolId);
    if (!pool) return false;

    const allocationsCleared = pool.allocations.size;
    const bytesFreed = pool.currentSize;

    pool.allocations.clear();
    pool.currentSize = 0;

    console.log('🧠 [MemoryManagementSystem] Cleared pool:', poolId, 
                'freed', allocationsCleared, 'allocations,', Math.round(bytesFreed / 1024), 'KB');
    return true;
  }

  /**
   * Create custom memory pool
   */
  public createPool(config: Omit<MemoryPool, 'currentSize' | 'allocations'>): boolean {
    if (this.memoryPools.has(config.id)) {
      console.warn('🧠 [MemoryManagementSystem] Pool already exists:', config.id);
      return false;
    }

    const pool: MemoryPool = {
      ...config,
      currentSize: 0,
      allocations: new Map()
    };

    this.memoryPools.set(config.id, pool);
    console.log('🧠 [MemoryManagementSystem] Created pool:', config.id);
    return true;
  }

  /**
   * Remove memory pool
   */
  public removePool(poolId: string): boolean {
    const pool = this.memoryPools.get(poolId);
    if (!pool) return false;

    // Clear pool first
    this.clearPool(poolId);
    
    // Remove pool
    this.memoryPools.delete(poolId);
    console.log('🧠 [MemoryManagementSystem] Removed pool:', poolId);
    return true;
  }

  /**
   * Get memory statistics
   */
  public getStatistics(): MemoryStatistics {
    return { ...this.statistics };
  }

  /**
   * Get pool information
   */
  public getPoolInfo(poolId: string): MemoryPool | null {
    const pool = this.memoryPools.get(poolId);
    return pool ? { ...pool } : null;
  }

  /**
   * Get all pools
   */
  public getAllPools(): MemoryPool[] {
    return Array.from(this.memoryPools.values()).map(pool => ({ ...pool }));
  }

  /**
   * Get memory alerts
   */
  public getAlerts(): MemoryAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Update garbage collection configuration
   */
  public updateGCConfig(newConfig: Partial<GarbageCollectionConfig>): void {
    this.gcConfig = { ...this.gcConfig, ...newConfig };
    
    // Restart GC with new config
    if (this.gcConfig.enabled) {
      this.stopGarbageCollection();
      this.startGarbageCollection();
    } else {
      this.stopGarbageCollection();
    }

    console.log('🧠 [MemoryManagementSystem] GC configuration updated');
  }

  /**
   * Force garbage collection
   */
  public forceGarbageCollection(): void {
    console.log('🧠 [MemoryManagementSystem] Forcing garbage collection');
    this.performGarbageCollection();
  }

  /**
   * Get memory usage summary
   */
  public getMemoryUsageSummary(): {
    total: string;
    used: string;
    available: string;
    pressure: string;
    pools: { [poolId: string]: string };
  } {
    const formatBytes = (bytes: number) => {
      const mb = bytes / (1024 * 1024);
      return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
    };

    const pools: { [poolId: string]: string } = {};
    for (const [poolId, pool] of this.memoryPools) {
      pools[poolId] = `${formatBytes(pool.currentSize)} / ${formatBytes(pool.maxSize)}`;
    }

    return {
      total: formatBytes(this.statistics.heapLimit),
      used: formatBytes(this.statistics.heapUsed),
      available: formatBytes(this.statistics.totalAvailable),
      pressure: this.statistics.memoryPressure,
      pools
    };
  }

  /**
   * Dispose memory management system
   */
  public dispose(): void {
    // Stop monitoring and GC
    this.stopMonitoring();
    this.stopGarbageCollection();

    // Clear all pools
    for (const poolId of this.memoryPools.keys()) {
      this.clearPool(poolId);
    }
    this.memoryPools.clear();

    // Terminate compression worker
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    // Clear compression queue
    this.compressionQueue.clear();

    console.log('🧠 [MemoryManagementSystem] Disposed');
  }
}

export { MemoryManagementSystem };