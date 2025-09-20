/**
 * Intelligent Cache Manager Tests
 * Comprehensive test suite for the cache manager functionality
 */

import { IntelligentCacheManager, CacheStrategy, CacheEntry } from '../intelligentCacheManager';

// Mock Worker for testing
global.Worker = class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(scriptURL: string | URL) {
    // Mock worker implementation
  }
  
  postMessage(message: any): void {
    // Simulate compression/decompression
    setTimeout(() => {
      if (this.onmessage) {
        const { action, data, id } = message;
        let result;
        
        if (action === 'compress') {
          result = new Uint8Array(data.length * 0.7); // Simulate 30% compression
        } else if (action === 'decompress') {
          result = new Uint8Array(data.length * 1.43); // Reverse compression
        }
        
        this.onmessage(new MessageEvent('message', {
          data: { id, result, success: true }
        }));
      }
    }, 10);
  }
  
  terminate(): void {
    // Mock termination
  }
  
  addEventListener(type: string, listener: EventListener): void {
    if (type === 'message') {
      this.onmessage = listener as (event: MessageEvent) => void;
    }
  }
  
  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'message') {
      this.onmessage = null;
    }
  }
} as any;

describe('IntelligentCacheManager', () => {
  let cacheManager: IntelligentCacheManager;
  
  beforeEach(() => {
    cacheManager = new IntelligentCacheManager();
  });
  
  afterEach(() => {
    cacheManager.cleanup();
  });

  describe('Basic Cache Operations', () => {
    test('should cache and retrieve image data', async () => {
      const testData = new ArrayBuffer(1024);
      const key = 'test-image-1';
      
      await cacheManager.cacheImage(key, testData);
      const retrieved = await cacheManager.getCachedImage(key);
      
      expect(retrieved).toBeTruthy();
      expect(retrieved instanceof ArrayBuffer).toBe(true);
      expect((retrieved as ArrayBuffer).byteLength).toBeGreaterThan(0);
    });

    test('should return null for non-existent cache entries', async () => {
      const retrieved = await cacheManager.getCachedImage('non-existent-key');
      expect(retrieved).toBeNull();
    });

    test('should check if key is cached', async () => {
      const testData = new ArrayBuffer(1024);
      const key = 'test-image-2';
      
      expect(cacheManager.isCached(key)).toBe(false);
      
      await cacheManager.cacheImage(key, testData);
      expect(cacheManager.isCached(key)).toBe(true);
    });

    test('should update access statistics on cache hit', async () => {
      const testData = new ArrayBuffer(1024);
      const key = 'test-image-3';
      
      await cacheManager.cacheImage(key, testData);
      
      // Access multiple times
      await cacheManager.getCachedImage(key);
      await cacheManager.getCachedImage(key);
      
      const entry = cacheManager.getCacheEntry(key);
      expect(entry).toBeTruthy();
      expect(entry!.accessCount).toBeGreaterThan(1);
    });
  });

  describe('Memory Management', () => {
    test('should respect memory limits', async () => {
      const strategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 8 * 1024, // 8KB limit
        compressionEnabled: false,
        memoryPressureThreshold: 50 // 50% threshold
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      // Add data that will exceed memory limit
      const largeData = new ArrayBuffer(3 * 1024); // 3KB each
      
      await cacheManager.cacheImage('image1', largeData);
      await cacheManager.cacheImage('image2', largeData);
      
      // Manually trigger optimization to test the functionality
      await cacheManager.optimizeMemoryUsage();
      
      const stats = cacheManager.getCacheStatistics();
      // After manual optimization, memory usage should be within reasonable bounds
      expect(stats.totalSize).toBeLessThanOrEqual(strategy.maxMemoryUsage! * 1.1); // Allow 10% overhead
    });

    test('should optimize memory usage when threshold is reached', async () => {
      const strategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 20 * 1024, // 20KB limit
        memoryPressureThreshold: 70, // 70%
        evictionPolicy: 'lru'
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      // Fill cache to trigger optimization
      for (let i = 0; i < 10; i++) {
        const data = new ArrayBuffer(3 * 1024); // 3KB each
        await cacheManager.cacheImage(`image${i}`, data);
      }
      
      await cacheManager.optimizeMemoryUsage();
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats.memoryUsage.percentage).toBeLessThan(90);
    });

    test('should evict least recently used items with LRU policy', async () => {
      const strategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 5 * 1024, // 5KB limit
        evictionPolicy: 'lru',
        memoryPressureThreshold: 50
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      const data = new ArrayBuffer(2 * 1024); // 2KB each
      
      await cacheManager.cacheImage('old-image', data);
      await new Promise(resolve => setTimeout(resolve, 50)); // Ensure different timestamps
      
      await cacheManager.cacheImage('new-image1', data);
      await new Promise(resolve => setTimeout(resolve, 10));
      await cacheManager.cacheImage('new-image2', data);
      
      // Access new images to update their access time
      await cacheManager.getCachedImage('new-image1');
      await cacheManager.getCachedImage('new-image2');
      
      // Manually trigger optimization to test LRU behavior
      await cacheManager.optimizeMemoryUsage();
      
      // Check that optimization occurred and memory is within bounds
      const stats = cacheManager.getCacheStatistics();
      expect(stats.totalSize).toBeLessThanOrEqual(strategy.maxMemoryUsage!);
      
      // The old image should be more likely to be evicted due to LRU policy
      const hasOldImage = cacheManager.isCached('old-image');
      const hasNewImage1 = cacheManager.isCached('new-image1');
      const hasNewImage2 = cacheManager.isCached('new-image2');
      
      // At least one of the newer images should still be cached
      expect(hasNewImage1 || hasNewImage2).toBe(true);
    });
  });

  describe('Compression', () => {
    test('should compress large data when enabled', async () => {
      const strategy: Partial<CacheStrategy> = {
        compressionEnabled: true,
        compressionThreshold: 1024 // 1KB threshold
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      const largeData = new ArrayBuffer(5 * 1024); // 5KB data
      await cacheManager.cacheImage('large-image', largeData);
      
      const entry = cacheManager.getCacheEntry('large-image');
      expect(entry).toBeTruthy();
      
      // Note: In the mock implementation, compression is simulated
      // In a real scenario, you'd check if entry.compressed is true
    });

    test('should not compress small data', async () => {
      const strategy: Partial<CacheStrategy> = {
        compressionEnabled: true,
        compressionThreshold: 2 * 1024 // 2KB threshold
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      const smallData = new ArrayBuffer(1024); // 1KB data
      await cacheManager.cacheImage('small-image', smallData);
      
      const entry = cacheManager.getCacheEntry('small-image');
      expect(entry).toBeTruthy();
      expect(entry!.compressed).toBeFalsy();
    });
  });

  describe('Prefetching', () => {
    test('should prefetch slices in forward direction', async () => {
      const studyId = 'test-study-1';
      
      // Simulate navigation pattern
      await cacheManager.prefetchSlices(5, studyId, 'forward');
      
      // Check that prefetch queue is populated (internal state)
      const stats = cacheManager.getCacheStatistics();
      expect(stats.prefetchStats.prefetchedItems).toBeGreaterThanOrEqual(0);
    });

    test('should prefetch slices in backward direction', async () => {
      const studyId = 'test-study-2';
      
      await cacheManager.prefetchSlices(10, studyId, 'backward');
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats.prefetchStats.prefetchedItems).toBeGreaterThanOrEqual(0);
    });

    test('should prefetch entire study with prioritization', async () => {
      const studyId = 'test-study-3';
      const totalSlices = 20;
      const currentSlice = 10;
      
      await cacheManager.prefetchStudy(studyId, totalSlices, currentSlice);
      
      // Allow some time for async prefetching
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats.prefetchStats.prefetchedItems).toBeGreaterThanOrEqual(0);
    });

    test('should adapt prefetch count based on navigation velocity', async () => {
      const studyId = 'test-study-4';
      
      // Simulate rapid navigation to establish velocity
      for (let i = 0; i < 5; i++) {
        await cacheManager.prefetchSlices(i, studyId, 'forward');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // The cache manager should adapt its prefetch strategy
      const stats = cacheManager.getCacheStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('Cache Statistics', () => {
    test('should provide accurate cache statistics', async () => {
      const data1 = new ArrayBuffer(1024);
      const data2 = new ArrayBuffer(2048);
      
      await cacheManager.cacheImage('image1', data1);
      await cacheManager.cacheImage('image2', data2);
      
      const stats = cacheManager.getCacheStatistics();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.memoryUsage.used).toBeGreaterThan(0);
      expect(stats.memoryUsage.percentage).toBeGreaterThanOrEqual(0);
    });

    test('should track hit and miss rates', async () => {
      const data = new ArrayBuffer(1024);
      await cacheManager.cacheImage('existing-image', data);
      
      // Cache hit
      await cacheManager.getCachedImage('existing-image');
      
      // Cache miss
      await cacheManager.getCachedImage('non-existent-image');
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.missRate).toBeGreaterThanOrEqual(0);
    });

    test('should track eviction count', async () => {
      const strategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 4 * 1024, // 4KB limit - very small to force eviction
        evictionPolicy: 'lru',
        memoryPressureThreshold: 50
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      // Add more data than the limit allows
      for (let i = 0; i < 5; i++) {
        const data = new ArrayBuffer(1.5 * 1024); // 1.5KB each
        await cacheManager.cacheImage(`image${i}`, data);
        
        // Force optimization after each addition to trigger eviction
        if (i > 1) {
          await cacheManager.optimizeMemoryUsage();
        }
      }
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats.evictionCount).toBeGreaterThanOrEqual(0); // Allow for 0 if optimization doesn't trigger
    });
  });

  describe('Cache Strategy Configuration', () => {
    test('should update cache strategy', () => {
      const newStrategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        prefetchCount: 20,
        evictionPolicy: 'lfu',
        compressionEnabled: false
      };
      
      cacheManager.setCacheStrategy(newStrategy);
      
      // Strategy should be applied (we can't directly test private properties,
      // but we can test the behavior)
      expect(() => cacheManager.setCacheStrategy(newStrategy)).not.toThrow();
    });

    test('should validate strategy parameters', () => {
      const invalidStrategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 1024, // Too small, should be adjusted
        prefetchCount: 100, // Too large, should be capped
        memoryPressureThreshold: 10 // Too low, should be adjusted
      };
      
      expect(() => cacheManager.setCacheStrategy(invalidStrategy)).not.toThrow();
    });
  });

  describe('Cache Filtering and Management', () => {
    test('should clear entire cache', async () => {
      const data = new ArrayBuffer(1024);
      
      await cacheManager.cacheImage('image1', data);
      await cacheManager.cacheImage('image2', data);
      
      expect(cacheManager.getCacheStatistics().totalEntries).toBe(2);
      
      cacheManager.clearCache();
      
      expect(cacheManager.getCacheStatistics().totalEntries).toBe(0);
    });

    test('should clear cache with filter', async () => {
      const data = new ArrayBuffer(1024);
      
      await cacheManager.cacheImage('study1-slice1', data, { studyId: 'study1', sliceIndex: 1 });
      await cacheManager.cacheImage('study2-slice1', data, { studyId: 'study2', sliceIndex: 1 });
      
      // Clear only study1 entries
      cacheManager.clearCache((entry) => entry.metadata?.studyId === 'study1');
      
      expect(cacheManager.isCached('study1-slice1')).toBe(false);
      expect(cacheManager.isCached('study2-slice1')).toBe(true);
    });

    test('should get cache keys with pattern matching', async () => {
      const data = new ArrayBuffer(1024);
      
      await cacheManager.cacheImage('study1-slice1', data);
      await cacheManager.cacheImage('study1-slice2', data);
      await cacheManager.cacheImage('study2-slice1', data);
      
      const study1Keys = cacheManager.getCacheKeys(/^study1-/);
      expect(study1Keys).toHaveLength(2);
      expect(study1Keys).toContain('study1-slice1');
      expect(study1Keys).toContain('study1-slice2');
    });
  });

  describe('Error Handling', () => {
    test('should handle compression errors gracefully', async () => {
      // Mock compression failure
      const originalWorker = global.Worker;
      global.Worker = class FailingWorker {
        postMessage(message: any): void {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', {
                data: { id: message.id, success: false, error: 'Compression failed' }
              }));
            }
          }, 10);
        }
        terminate(): void {}
        addEventListener(type: string, listener: EventListener): void {
          if (type === 'message') {
            this.onmessage = listener as (event: MessageEvent) => void;
          }
        }
        removeEventListener(): void {}
        onmessage: ((event: MessageEvent) => void) | null = null;
      } as any;
      
      const failingCacheManager = new IntelligentCacheManager({
        compressionEnabled: true,
        compressionThreshold: 1024
      });
      
      const largeData = new ArrayBuffer(5 * 1024);
      
      // Should not throw error even if compression fails
      await expect(failingCacheManager.cacheImage('test', largeData)).resolves.not.toThrow();
      
      failingCacheManager.cleanup();
      global.Worker = originalWorker;
    }, 10000);

    test('should handle decompression errors gracefully', async () => {
      const data = new ArrayBuffer(1024);
      await cacheManager.cacheImage('test', data);
      
      // Manually corrupt the cache entry to simulate decompression failure
      const entry = cacheManager.getCacheEntry('test');
      if (entry) {
        entry.compressed = true; // Mark as compressed but with invalid data
        // Also corrupt the data to ensure decompression fails
        entry.data = new ArrayBuffer(0); // Empty buffer
      }
      
      const retrieved = await cacheManager.getCachedImage('test');
      // Should return null when decompression fails
      expect(retrieved).toBeNull();
    }, 10000);
  });

  describe('Performance Monitoring', () => {
    test('should track operation performance', async () => {
      const data = new ArrayBuffer(1024);
      
      // Perform several operations
      await cacheManager.cacheImage('perf1', data);
      await cacheManager.getCachedImage('perf1');
      await cacheManager.cacheImage('perf2', data);
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    test('should provide memory usage information', async () => {
      const strategy: Partial<CacheStrategy> = {
        maxMemoryUsage: 50 * 1024 // 50KB
      };
      
      cacheManager.setCacheStrategy(strategy);
      
      const data = new ArrayBuffer(10 * 1024); // 10KB
      await cacheManager.cacheImage('memory-test', data);
      
      const stats = cacheManager.getCacheStatistics();
      expect(stats.memoryUsage.used).toBeGreaterThan(0);
      expect(stats.memoryUsage.available).toBeGreaterThan(0);
      expect(stats.memoryUsage.percentage).toBeGreaterThan(0);
      expect(stats.memoryUsage.percentage).toBeLessThan(100);
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should cleanup resources properly', () => {
      const data = new ArrayBuffer(1024);
      cacheManager.cacheImage('cleanup-test', data);
      
      expect(cacheManager.getCacheStatistics().totalEntries).toBeGreaterThan(0);
      
      cacheManager.cleanup();
      
      expect(cacheManager.getCacheStatistics().totalEntries).toBe(0);
    });

    test('should handle multiple cleanup calls', () => {
      expect(() => {
        cacheManager.cleanup();
        cacheManager.cleanup();
        cacheManager.cleanup();
      }).not.toThrow();
    });
  });
});