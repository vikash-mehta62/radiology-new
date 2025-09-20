/**
 * Performance and Load Testing Suite
 * Tests for large datasets, memory usage, and GPU acceleration
 */

import { 
  PerformanceTestUtils, 
  MockDicomDataGenerator, 
  AsyncTestUtils 
} from '../services/__tests__/testUtils';
import { UnifiedStateManager } from '../services/unifiedStateManager';
import { EnhancedViewerManager } from '../services/enhancedViewerManager';
import { IntelligentCacheManager } from '../services/intelligentCacheManager';
import { AdaptivePerformanceSystem } from '../services/adaptivePerformanceSystem';

// Mock dependencies for performance testing
jest.mock('../services/errorHandler');
jest.mock('../services/performanceMonitor');
jest.mock('../services/progressiveLoadingSystem');
jest.mock('../services/memoryManagementSystem');
jest.mock('../services/measurementTools');
jest.mock('../services/annotationSystem');
jest.mock('../services/aiEnhancementModule');
jest.mock('../services/collaborationModule');

describe('Performance and Load Testing Suite', () => {
  let memoryDetector: ReturnType<typeof PerformanceTestUtils.createMemoryLeakDetector>;

  beforeEach(() => {
    memoryDetector = PerformanceTestUtils.createMemoryLeakDetector(25);
    
    // Force garbage collection before each test
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Force garbage collection after each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('Large Dataset Testing (1000+ slices)', () => {
    test('should handle 1000 slice dataset efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('1000 Slice Dataset', 5000);
      
      const result = await benchmark.run(async () => {
        const largeStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: 1000,
          hasMultiFrame: true
        });

        // Simulate loading and processing
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        stateManager.switchMode('multi-frame');
        stateManager.updateState('currentStudy', largeStudy, 'performance-test');
        
        // Simulate slice navigation through dataset
        for (let i = 0; i < 100; i += 10) {
          stateManager.updateViewerState('multi-frame', 'currentSliceIndex', i, 'navigation');
          await AsyncTestUtils.delay(1);
        }
        
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ 1000 Slice Dataset: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should handle 2000 slice dataset with memory management', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('2000 Slice Dataset', 8000);
      
      const result = await benchmark.run(async () => {
        const massiveStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: 2000,
          hasMultiFrame: true
        });

        const cacheManager = new IntelligentCacheManager();
        
        // Simulate progressive loading
        for (let i = 0; i < 2000; i += 50) {
          const sliceData = MockDicomDataGenerator.generateMockPixelData(512, 512);
          await cacheManager.cacheImage(`slice-${i}`, sliceData as any);
          
          if (i % 200 === 0) {
            // Simulate memory pressure cleanup
            cacheManager.optimizeMemoryUsage();
          }
        }
        
        cacheManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ 2000 Slice Dataset: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should handle 5000 slice dataset with progressive loading', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('5000 Slice Dataset', 15000);
      
      const result = await benchmark.run(async () => {
        const massiveStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: 5000,
          hasMultiFrame: true
        });

        const cacheManager = new IntelligentCacheManager();
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        // Simulate progressive loading with cache management
        let loadedSlices = 0;
        const batchSize = 100;
        
        for (let batch = 0; batch < 50; batch++) {
          const batchPromises = [];
          
          for (let i = 0; i < batchSize; i++) {
            const sliceIndex = batch * batchSize + i;
            if (sliceIndex >= 5000) break;
            
            batchPromises.push(
              (async () => {
                const sliceData = MockDicomDataGenerator.generateMockPixelData(1024, 1024);
                await cacheManager.cacheImage(`slice-${sliceIndex}`, sliceData as any);
                loadedSlices++;
              })()
            );
          }
          
          await Promise.all(batchPromises);
          
          // Simulate memory management every 10 batches
          if (batch % 10 === 0) {
            cacheManager.optimizeMemoryUsage();
            
            // Update state to reflect progress
            stateManager.updateViewerState('multi-frame', 'currentSliceIndex', loadedSlices - 1, 'loading');
          }
        }
        
        expect(loadedSlices).toBe(5000);
        
        // Test navigation through large dataset
        const navigationTests = [0, 1000, 2500, 4000, 4999];
        for (const sliceIndex of navigationTests) {
          stateManager.updateViewerState('multi-frame', 'currentSliceIndex', sliceIndex, 'navigation');
          await AsyncTestUtils.delay(1);
        }
        
        cacheManager.cleanup();
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ 5000 Slice Dataset: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should handle ultra-large dataset (10000+ slices) with streaming', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('10000 Slice Dataset', 30000);
      
      const result = await benchmark.run(async () => {
        const ultraLargeStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: 10000,
          hasMultiFrame: true
        });

        const cacheManager = new IntelligentCacheManager();
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        // Simulate streaming approach - only load visible slices + buffer
        const viewportSize = 10; // Visible slices
        const bufferSize = 20; // Preload buffer
        let currentPosition = 0;
        
        const loadSliceRange = async (start: number, end: number) => {
          const promises = [];
          for (let i = start; i < Math.min(end, 10000); i++) {
            promises.push(
              (async () => {
                // Simulate smaller resolution for streaming
                const sliceData = MockDicomDataGenerator.generateMockPixelData(256, 256);
                await cacheManager.cacheImage(`stream-slice-${i}`, sliceData as any);
              })()
            );
          }
          await Promise.all(promises);
        };
        
        // Initial load
        await loadSliceRange(0, viewportSize + bufferSize);
        
        // Simulate navigation through dataset with streaming
        const navigationPoints = [0, 1000, 3000, 5000, 7500, 9999];
        
        for (const targetSlice of navigationPoints) {
          // Calculate range to load
          const rangeStart = Math.max(0, targetSlice - bufferSize);
          const rangeEnd = Math.min(10000, targetSlice + viewportSize + bufferSize);
          
          // Load required range
          await loadSliceRange(rangeStart, rangeEnd);
          
          // Update viewer position
          stateManager.updateViewerState('multi-frame', 'currentSliceIndex', targetSlice, 'streaming-navigation');
          
          // Cleanup old cache entries to manage memory
          if (targetSlice > bufferSize * 2) {
            cacheManager.optimizeMemoryUsage();
          }
          
          currentPosition = targetSlice;
        }
        
        cacheManager.cleanup();
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ 10000 Slice Dataset (Streaming): ${result.actualTime.toFixed(2)}ms`);
    });

    test('should maintain performance with concurrent large dataset operations', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Concurrent Large Dataset Operations', 20000);
      
      const result = await benchmark.run(async () => {
        // Create multiple large studies
        const studies = Array.from({ length: 3 }, (_, i) => 
          MockDicomDataGenerator.generateMockStudy({
            studyId: `concurrent-study-${i}`,
            sliceCount: 1500,
            hasMultiFrame: true
          })
        );

        const operations = studies.map(async (study, index) => {
          const cacheManager = new IntelligentCacheManager();
          const stateManager = new UnifiedStateManager();
          await stateManager.initialize();
          
          // Load study in chunks
          const chunkSize = 50;
          const totalChunks = Math.ceil(study.total_slices / chunkSize);
          
          for (let chunk = 0; chunk < totalChunks; chunk++) {
            const chunkPromises = [];
            const startSlice = chunk * chunkSize;
            const endSlice = Math.min(startSlice + chunkSize, study.total_slices);
            
            for (let i = startSlice; i < endSlice; i++) {
              chunkPromises.push(
                (async () => {
                  const sliceData = MockDicomDataGenerator.generateMockPixelData(512, 512);
                  await cacheManager.cacheImage(`study-${index}-slice-${i}`, sliceData as any);
                })()
              );
            }
            
            await Promise.all(chunkPromises);
            
            // Periodic cleanup
            if (chunk % 5 === 0) {
              cacheManager.optimizeMemoryUsage();
            }
          }
          
          // Test navigation
          const navigationSlices = [0, 500, 1000, 1499];
          for (const sliceIndex of navigationSlices) {
            stateManager.updateViewerState('multi-frame', 'currentSliceIndex', sliceIndex, `concurrent-nav-${index}`);
            await AsyncTestUtils.delay(1);
          }
          
          cacheManager.cleanup();
          stateManager.cleanup();
        });
        
        await Promise.all(operations);
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Concurrent Large Dataset Operations: ${result.actualTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Leak Detection', () => {
    test('should not leak memory during intensive operations', () => {
      memoryDetector.reset();
      
      // Perform memory-intensive operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        const stateManager = new UnifiedStateManager();
        operations.push(stateManager);
        
        // Create large state objects
        const largeState = {
          images: Array.from({ length: 100 }, (_, j) => ({
            id: `image-${i}-${j}`,
            data: new Array(1000).fill(Math.random())
          }))
        };
        
        stateManager.updateState('largeDataset', largeState, 'memory-test');
        stateManager.createSnapshot(`Memory test ${i}`);
      }
      
      // Cleanup operations
      operations.forEach(op => op.cleanup());
      operations.length = 0;
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const leakCheck = memoryDetector.check();
      expect(leakCheck.hasLeak).toBe(false);
      console.log(`🔍 Memory Usage: ${leakCheck.memoryIncrease.toFixed(2)}% increase`);
    });

    test('should handle rapid allocation and deallocation', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Rapid Memory Operations', 2000);
      
      const result = await benchmark.run(() => {
        const arrays: Uint8Array[] = [];
        
        // Rapid allocation
        for (let i = 0; i < 1000; i++) {
          arrays.push(new Uint8Array(10000));
        }
        
        // Rapid deallocation
        arrays.length = 0;
        
        // Force cleanup
        if (global.gc) {
          global.gc();
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Rapid Memory Operations: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should manage memory efficiently with large pixel data', async () => {
      const initialMemory = PerformanceTestUtils.getMemoryUsage();
      
      // Create large pixel data arrays
      const pixelDataArrays = [];
      for (let i = 0; i < 50; i++) {
        const pixelData = MockDicomDataGenerator.generateMockPixelData(1024, 1024);
        pixelDataArrays.push(pixelData);
      }
      
      // Process the data
      let totalSum = 0;
      for (const pixelData of pixelDataArrays) {
        totalSum += pixelData.reduce((sum, val) => sum + val, 0);
      }
      
      expect(totalSum).toBeGreaterThan(0);
      
      // Cleanup
      pixelDataArrays.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = PerformanceTestUtils.getMemoryUsage();
      const memoryIncrease = ((finalMemory.used - initialMemory.used) / initialMemory.used) * 100;
      
      // Should not increase memory by more than 50%
      expect(memoryIncrease).toBeLessThan(50);
      console.log(`📊 Pixel Data Memory: ${memoryIncrease.toFixed(2)}% increase`);
    });

    test('should detect memory leaks in cache operations', async () => {
      memoryDetector.reset();
      
      const cacheManager = new IntelligentCacheManager();
      const leakDetectionArrays: any[] = [];
      
      try {
        // Simulate cache operations that might leak
        for (let i = 0; i < 200; i++) {
          const pixelData = MockDicomDataGenerator.generateMockPixelData(512, 512);
          await cacheManager.cacheImage(`leak-test-${i}`, pixelData as any);
          
          // Intentionally keep references to test leak detection
          if (i % 10 === 0) {
            leakDetectionArrays.push(pixelData);
          }
          
          // Periodic cleanup attempts
          if (i % 50 === 0) {
            cacheManager.optimizeMemoryUsage();
          }
        }
        
        // Clear intentional references
        leakDetectionArrays.length = 0;
        
        // Force cleanup
        cacheManager.cleanup();
        
        if (global.gc) {
          global.gc();
        }
        
        const leakCheck = memoryDetector.check();
        console.log(`🔍 Cache Memory Leak Test: ${leakCheck.memoryIncrease.toFixed(2)}% increase`);
        
        // Should not have significant memory increase after cleanup
        expect(leakCheck.memoryIncrease).toBeLessThan(30);
        
      } finally {
        cacheManager.cleanup();
      }
    });

    test('should handle memory pressure scenarios', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Memory Pressure Handling', 10000);
      
      const result = await benchmark.run(async () => {
        const memoryArrays: Uint8Array[] = [];
        const cacheManager = new IntelligentCacheManager();
        
        try {
          // Simulate memory pressure by allocating large amounts
          let totalAllocated = 0;
          const targetMemory = 100 * 1024 * 1024; // 100MB
          
          while (totalAllocated < targetMemory) {
            const chunkSize = 1024 * 1024; // 1MB chunks
            const chunk = new Uint8Array(chunkSize);
            
            // Fill with data to ensure allocation
            for (let i = 0; i < chunkSize; i += 1024) {
              chunk[i] = Math.random() * 255;
            }
            
            memoryArrays.push(chunk);
            totalAllocated += chunkSize;
            
            // Test cache operations under memory pressure
            if (memoryArrays.length % 10 === 0) {
              const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
              await cacheManager.cacheImage(`pressure-${memoryArrays.length}`, pixelData as any);
              
              // Trigger memory optimization
              cacheManager.optimizeMemoryUsage();
            }
          }
          
          console.log(`📈 Allocated ${(totalAllocated / 1024 / 1024).toFixed(2)}MB for pressure test`);
          
          // Cleanup in chunks to test gradual memory release
          while (memoryArrays.length > 0) {
            memoryArrays.splice(0, 10); // Remove 10 chunks at a time
            
            if (global.gc && memoryArrays.length % 20 === 0) {
              global.gc();
            }
          }
          
        } finally {
          cacheManager.cleanup();
          memoryArrays.length = 0;
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Memory Pressure Handling: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should monitor memory usage patterns during viewer operations', async () => {
      const memorySnapshots: Array<{ operation: string; memory: ReturnType<typeof PerformanceTestUtils.getMemoryUsage>; timestamp: number }> = [];
      
      const takeSnapshot = (operation: string) => {
        memorySnapshots.push({
          operation,
          memory: PerformanceTestUtils.getMemoryUsage(),
          timestamp: performance.now()
        });
      };
      
      takeSnapshot('initial');
      
      // Simulate typical viewer workflow
      const stateManager = new UnifiedStateManager();
      await stateManager.initialize();
      takeSnapshot('state-manager-init');
      
      // Load study
      const study = MockDicomDataGenerator.generateMockStudy({ sliceCount: 100 });
      stateManager.updateState('currentStudy', study, 'memory-pattern-test');
      takeSnapshot('study-loaded');
      
      // Switch modes
      stateManager.switchMode('multi-frame');
      takeSnapshot('mode-switch');
      
      // Navigate through slices
      for (let i = 0; i < 50; i += 5) {
        stateManager.updateViewerState('multi-frame', 'currentSliceIndex', i, 'navigation');
        if (i % 20 === 0) {
          takeSnapshot(`navigation-slice-${i}`);
        }
      }
      
      // Create snapshots
      for (let i = 0; i < 5; i++) {
        stateManager.createSnapshot(`Pattern test snapshot ${i}`);
        takeSnapshot(`snapshot-${i}`);
      }
      
      // Cleanup
      stateManager.cleanup();
      takeSnapshot('cleanup');
      
      if (global.gc) {
        global.gc();
      }
      takeSnapshot('post-gc');
      
      // Analyze memory patterns
      console.log('\n📊 Memory Usage Pattern Analysis:');
      memorySnapshots.forEach((snapshot, index) => {
        const memoryMB = (snapshot.memory.used / 1024 / 1024).toFixed(2);
        const percentage = snapshot.memory.percentage.toFixed(1);
        
        if (index > 0) {
          const prevSnapshot = memorySnapshots[index - 1];
          const deltaMemory = ((snapshot.memory.used - prevSnapshot.memory.used) / 1024 / 1024).toFixed(2);
          const deltaTime = (snapshot.timestamp - prevSnapshot.timestamp).toFixed(2);
          
          console.log(`  ${snapshot.operation}: ${memoryMB}MB (${percentage}%) [Δ${deltaMemory}MB in ${deltaTime}ms]`);
        } else {
          console.log(`  ${snapshot.operation}: ${memoryMB}MB (${percentage}%)`);
        }
      });
      
      // Verify memory was released after cleanup
      const initialMemory = memorySnapshots[0].memory.used;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory.used;
      const memoryIncrease = ((finalMemory - initialMemory) / initialMemory) * 100;
      
      expect(memoryIncrease).toBeLessThan(25); // Should not increase by more than 25%
      console.log(`\n🎯 Final memory increase: ${memoryIncrease.toFixed(2)}%`);
    });

    test('should handle memory fragmentation scenarios', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Memory Fragmentation Test', 8000);
      
      const result = await benchmark.run(async () => {
        const fragmentationArrays: Uint8Array[] = [];
        
        // Create fragmentation by allocating and deallocating in patterns
        for (let cycle = 0; cycle < 10; cycle++) {
          // Allocate various sized chunks
          const sizes = [1024, 4096, 16384, 65536, 262144]; // Different sizes to create fragmentation
          
          for (const size of sizes) {
            for (let i = 0; i < 20; i++) {
              const chunk = new Uint8Array(size);
              chunk.fill(Math.random() * 255); // Ensure allocation
              fragmentationArrays.push(chunk);
            }
          }
          
          // Deallocate every other chunk to create fragmentation
          for (let i = fragmentationArrays.length - 1; i >= 0; i -= 2) {
            fragmentationArrays.splice(i, 1);
          }
          
          // Force garbage collection periodically
          if (cycle % 3 === 0 && global.gc) {
            global.gc();
          }
        }
        
        // Test cache operations with fragmented memory
        const cacheManager = new IntelligentCacheManager();
        
        for (let i = 0; i < 50; i++) {
          const pixelData = MockDicomDataGenerator.generateMockPixelData(512, 512);
          await cacheManager.cacheImage(`fragmentation-test-${i}`, pixelData as any);
          
          if (i % 10 === 0) {
            cacheManager.optimizeMemoryUsage();
          }
        }
        
        cacheManager.cleanup();
        fragmentationArrays.length = 0;
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Memory Fragmentation Test: ${result.actualTime.toFixed(2)}ms`);
    });
  });

  describe('Network Latency Simulation and Testing', () => {
    test('should handle slow network conditions', async () => {
      // Mock slow network
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: 'mock' })
            } as any);
          }, 2000); // 2 second delay
        })
      );

      const benchmark = PerformanceTestUtils.createBenchmark('Slow Network Handling', 5000);
      
      const result = await benchmark.run(async () => {
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        // Simulate multiple network requests
        const promises = Array.from({ length: 5 }, () => 
          fetch('/api/test').then(r => r.json())
        );
        
        await Promise.all(promises);
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Slow Network: ${result.actualTime.toFixed(2)}ms`);
      
      // Restore original fetch
      global.fetch = originalFetch;
    });

    test('should handle network timeouts gracefully', async () => {
      // Mock timeout scenario
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Network timeout'));
          }, 1000);
        })
      );

      const benchmark = PerformanceTestUtils.createBenchmark('Network Timeout Handling', 3000);
      
      const result = await benchmark.run(async () => {
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        // Attempt network requests with timeout handling
        const promises = Array.from({ length: 3 }, async () => {
          try {
            await fetch('/api/test');
          } catch (error) {
            // Expected timeout error
            expect(error.message).toContain('timeout');
          }
        });
        
        await Promise.all(promises);
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Network Timeout: ${result.actualTime.toFixed(2)}ms`);
      
      // Restore original fetch
      global.fetch = originalFetch;
    });

    test('should adapt to varying network conditions', async () => {
      const networkConditions = [
        { delay: 50, name: 'Fast' },
        { delay: 500, name: 'Medium' },
        { delay: 2000, name: 'Slow' }
      ];

      for (const condition of networkConditions) {
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockImplementation(() => 
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ 
                  success: true, 
                  networkCondition: condition.name 
                })
              } as any);
            }, condition.delay);
          })
        );

        const benchmark = PerformanceTestUtils.createBenchmark(
          `${condition.name} Network`, 
          condition.delay + 1000
        );
        
        const result = await benchmark.run(async () => {
          const response = await fetch('/api/test');
          const data = await response.json();
          expect(data.networkCondition).toBe(condition.name);
        });
        
        expect(result.passed).toBe(true);
        console.log(`✅ ${condition.name} Network: ${result.actualTime.toFixed(2)}ms`);
        
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });

    test('should handle bandwidth-limited scenarios', async () => {
      const bandwidthTests = [
        { name: '56k Modem', bytesPerSecond: 7000, delay: 500 },
        { name: '3G Mobile', bytesPerSecond: 384000, delay: 200 },
        { name: 'DSL', bytesPerSecond: 1500000, delay: 50 },
        { name: 'Broadband', bytesPerSecond: 10000000, delay: 10 }
      ];

      for (const bandwidth of bandwidthTests) {
        const originalFetch = global.fetch;
        
        global.fetch = jest.fn().mockImplementation((url) => {
          const dataSize = 1024 * 1024; // 1MB simulated response
          const transferTime = (dataSize / bandwidth.bytesPerSecond) * 1000; // Convert to ms
          const totalDelay = bandwidth.delay + transferTime;
          
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ 
                  bandwidth: bandwidth.name,
                  transferTime: transferTime,
                  dataSize: dataSize
                }),
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(dataSize))
              } as any);
            }, totalDelay);
          });
        });

        const benchmark = PerformanceTestUtils.createBenchmark(
          `${bandwidth.name} Bandwidth Test`,
          Math.max(5000, bandwidth.delay + 3000)
        );
        
        const result = await benchmark.run(async () => {
          // Simulate DICOM image loading under bandwidth constraints
          const response = await fetch('/api/dicom/image');
          const data = await response.json();
          expect(data.bandwidth).toBe(bandwidth.name);
          
          // Simulate progressive loading
          const imageResponse = await fetch('/api/dicom/pixels');
          const imageData = await imageResponse.arrayBuffer();
          expect(imageData.byteLength).toBe(1024 * 1024);
        });
        
        console.log(`📡 ${bandwidth.name}: ${result.actualTime.toFixed(2)}ms (${result.passed ? 'PASS' : 'FAIL'})`);
        
        global.fetch = originalFetch;
      }
    });

    test('should handle intermittent connectivity', async () => {
      const originalFetch = global.fetch;
      let requestCount = 0;
      
      // Simulate intermittent connectivity (every 3rd request fails)
      global.fetch = jest.fn().mockImplementation(() => {
        requestCount++;
        
        if (requestCount % 3 === 0) {
          return Promise.reject(new Error('Network unavailable'));
        }
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ 
                success: true, 
                requestNumber: requestCount 
              })
            } as any);
          }, 100 + Math.random() * 200); // Variable delay
        });
      });

      const benchmark = PerformanceTestUtils.createBenchmark('Intermittent Connectivity', 8000);
      
      const result = await benchmark.run(async () => {
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        let successfulRequests = 0;
        let failedRequests = 0;
        
        // Attempt multiple requests with retry logic
        for (let i = 0; i < 10; i++) {
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              const response = await fetch('/api/test');
              const data = await response.json();
              successfulRequests++;
              break;
            } catch (error) {
              retryCount++;
              failedRequests++;
              
              if (retryCount < maxRetries) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
              }
            }
          }
        }
        
        console.log(`📊 Network Reliability: ${successfulRequests} successful, ${failedRequests} failed`);
        expect(successfulRequests).toBeGreaterThan(5); // Should succeed more than half the time
        
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Intermittent Connectivity: ${result.actualTime.toFixed(2)}ms`);
      
      global.fetch = originalFetch;
    });

    test('should handle concurrent network requests efficiently', async () => {
      const originalFetch = global.fetch;
      let activeRequests = 0;
      let maxConcurrentRequests = 0;
      
      global.fetch = jest.fn().mockImplementation((url) => {
        activeRequests++;
        maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
        
        return new Promise(resolve => {
          const delay = 200 + Math.random() * 300; // 200-500ms delay
          
          setTimeout(() => {
            activeRequests--;
            resolve({
              ok: true,
              json: () => Promise.resolve({ 
                url: url,
                timestamp: Date.now(),
                concurrentRequests: maxConcurrentRequests
              })
            } as any);
          }, delay);
        });
      });

      const benchmark = PerformanceTestUtils.createBenchmark('Concurrent Network Requests', 3000);
      
      const result = await benchmark.run(async () => {
        // Simulate loading multiple DICOM slices concurrently
        const concurrentRequests = Array.from({ length: 20 }, (_, i) => 
          fetch(`/api/dicom/slice/${i}`)
            .then(response => response.json())
        );
        
        const results = await Promise.all(concurrentRequests);
        
        expect(results).toHaveLength(20);
        expect(maxConcurrentRequests).toBeGreaterThan(1);
        
        console.log(`🔄 Max concurrent requests: ${maxConcurrentRequests}`);
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Concurrent Network Requests: ${result.actualTime.toFixed(2)}ms`);
      
      global.fetch = originalFetch;
    });

    test('should simulate real-world network jitter', async () => {
      const originalFetch = global.fetch;
      const jitterProfile = {
        baseDelay: 100,
        jitterRange: 200, // ±200ms
        packetLoss: 0.05 // 5% packet loss
      };
      
      global.fetch = jest.fn().mockImplementation(() => {
        // Simulate packet loss
        if (Math.random() < jitterProfile.packetLoss) {
          return Promise.reject(new Error('Packet lost'));
        }
        
        // Calculate jittery delay
        const jitter = (Math.random() - 0.5) * jitterProfile.jitterRange;
        const delay = Math.max(10, jitterProfile.baseDelay + jitter);
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ 
                delay: delay,
                jitter: jitter,
                timestamp: Date.now()
              })
            } as any);
          }, delay);
        });
      });

      const benchmark = PerformanceTestUtils.createBenchmark('Network Jitter Simulation', 5000);
      
      const result = await benchmark.run(async () => {
        const cacheManager = new IntelligentCacheManager();
        let successfulLoads = 0;
        let totalJitter = 0;
        
        // Simulate loading slices with jittery network
        for (let i = 0; i < 30; i++) {
          try {
            const response = await fetch(`/api/dicom/slice/${i}`);
            const data = await response.json();
            
            totalJitter += Math.abs(data.jitter);
            successfulLoads++;
            
            // Simulate caching the loaded slice
            const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
            await cacheManager.cacheImage(`jitter-slice-${i}`, pixelData as any);
            
          } catch (error) {
            // Handle packet loss gracefully
            console.log(`📦 Packet lost for slice ${i}`);
          }
        }
        
        const averageJitter = totalJitter / successfulLoads;
        console.log(`📊 Network Jitter Stats: ${successfulLoads}/30 successful, avg jitter: ${averageJitter.toFixed(2)}ms`);
        
        expect(successfulLoads).toBeGreaterThan(25); // Should handle most requests despite jitter
        
        cacheManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Network Jitter Simulation: ${result.actualTime.toFixed(2)}ms`);
      
      global.fetch = originalFetch;
    });
  });

  describe('GPU Acceleration Validation Tests', () => {
    test('should detect WebGL capabilities', () => {
      const canvas = document.createElement('canvas');
      const webglContext = canvas.getContext('webgl');
      const webgl2Context = canvas.getContext('webgl2');
      
      // Test WebGL availability
      expect(webglContext).toBeTruthy();
      
      if (webglContext) {
        // Test basic WebGL operations
        webglContext.clearColor(0.0, 0.0, 0.0, 1.0);
        webglContext.clear(webglContext.COLOR_BUFFER_BIT);
        
        // Check WebGL parameters
        const maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE);
        const maxViewportDims = webglContext.getParameter(webglContext.MAX_VIEWPORT_DIMS);
        
        expect(maxTextureSize).toBeGreaterThan(0);
        expect(maxViewportDims).toBeTruthy();
        
        console.log(`🎮 WebGL Max Texture Size: ${maxTextureSize}`);
        console.log(`🎮 WebGL Max Viewport: ${maxViewportDims[0]}x${maxViewportDims[1]}`);
      }
      
      if (webgl2Context) {
        console.log('🎮 WebGL2 support detected');
      }
    });

    test('should handle WebGL context loss gracefully', () => {
      const canvas = document.createElement('canvas');
      const webglContext = canvas.getContext('webgl');
      
      if (webglContext) {
        let contextLostHandled = false;
        let contextRestoredHandled = false;
        
        canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          contextLostHandled = true;
        });
        
        canvas.addEventListener('webglcontextrestored', () => {
          contextRestoredHandled = true;
        });
        
        // Simulate context loss
        const loseContext = webglContext.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
          expect(contextLostHandled).toBe(true);
          
          // Restore context
          loseContext.restoreContext();
          
          // Give time for restoration
          setTimeout(() => {
            expect(contextRestoredHandled).toBe(true);
          }, 100);
        }
      }
    });

    test('should perform GPU-accelerated operations efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('GPU Operations', 500);
      
      const result = await benchmark.run(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        
        const webglContext = canvas.getContext('webgl');
        
        if (webglContext) {
          // Create and use texture
          const texture = webglContext.createTexture();
          webglContext.bindTexture(webglContext.TEXTURE_2D, texture);
          
          // Upload texture data
          const textureData = new Uint8Array(1024 * 1024 * 4);
          webglContext.texImage2D(
            webglContext.TEXTURE_2D, 0, webglContext.RGBA,
            1024, 1024, 0, webglContext.RGBA, webglContext.UNSIGNED_BYTE,
            textureData
          );
          
          // Set texture parameters
          webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_MIN_FILTER, webglContext.LINEAR);
          webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_MAG_FILTER, webglContext.LINEAR);
          
          // Cleanup
          webglContext.deleteTexture(texture);
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ GPU Operations: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should validate GPU memory management', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('GPU Memory Management', 2000);
      
      const result = await benchmark.run(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        
        const webglContext = canvas.getContext('webgl');
        
        if (webglContext) {
          const textures: WebGLTexture[] = [];
          const buffers: WebGLBuffer[] = [];
          
          try {
            // Test GPU memory allocation limits
            for (let i = 0; i < 50; i++) {
              // Create texture
              const texture = webglContext.createTexture();
              if (texture) {
                webglContext.bindTexture(webglContext.TEXTURE_2D, texture);
                
                // Allocate texture memory (4MB per texture)
                const textureData = new Uint8Array(1024 * 1024 * 4);
                textureData.fill(i % 255); // Fill with test pattern
                
                webglContext.texImage2D(
                  webglContext.TEXTURE_2D, 0, webglContext.RGBA,
                  1024, 1024, 0, webglContext.RGBA, webglContext.UNSIGNED_BYTE,
                  textureData
                );
                
                textures.push(texture);
              }
              
              // Create buffer
              const buffer = webglContext.createBuffer();
              if (buffer) {
                webglContext.bindBuffer(webglContext.ARRAY_BUFFER, buffer);
                
                // Allocate buffer memory (1MB per buffer)
                const bufferData = new Float32Array(256 * 1024);
                for (let j = 0; j < bufferData.length; j++) {
                  bufferData[j] = Math.sin(j * 0.01) * i;
                }
                
                webglContext.bufferData(webglContext.ARRAY_BUFFER, bufferData, webglContext.STATIC_DRAW);
                buffers.push(buffer);
              }
            }
            
            console.log(`🎮 GPU Memory Test: Created ${textures.length} textures, ${buffers.length} buffers`);
            
            // Test GPU memory usage
            const memoryInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
            if (memoryInfo) {
              const renderer = webglContext.getParameter(memoryInfo.UNMASKED_RENDERER_WEBGL);
              console.log(`🎮 GPU Renderer: ${renderer}`);
            }
            
          } finally {
            // Cleanup GPU resources
            textures.forEach(texture => webglContext.deleteTexture(texture));
            buffers.forEach(buffer => webglContext.deleteBuffer(buffer));
          }
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ GPU Memory Management: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should benchmark GPU texture operations', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('GPU Texture Benchmark', 1500);
      
      const result = await benchmark.run(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        
        const webglContext = canvas.getContext('webgl');
        
        if (webglContext) {
          const startTime = performance.now();
          let operationsCompleted = 0;
          
          // Benchmark texture upload/download operations
          for (let i = 0; i < 20; i++) {
            const texture = webglContext.createTexture();
            webglContext.bindTexture(webglContext.TEXTURE_2D, texture);
            
            // Upload texture data (simulating DICOM slice)
            const pixelData = MockDicomDataGenerator.generateMockPixelData(512, 512);
            const rgbaData = new Uint8Array(512 * 512 * 4);
            
            // Convert grayscale to RGBA
            for (let j = 0; j < pixelData.length; j++) {
              const intensity = Math.floor((pixelData[j] / 4095) * 255);
              const offset = j * 4;
              rgbaData[offset] = intensity;     // R
              rgbaData[offset + 1] = intensity; // G
              rgbaData[offset + 2] = intensity; // B
              rgbaData[offset + 3] = 255;       // A
            }
            
            webglContext.texImage2D(
              webglContext.TEXTURE_2D, 0, webglContext.RGBA,
              512, 512, 0, webglContext.RGBA, webglContext.UNSIGNED_BYTE,
              rgbaData
            );
            
            // Set texture parameters for medical imaging
            webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_MIN_FILTER, webglContext.LINEAR);
            webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_MAG_FILTER, webglContext.LINEAR);
            webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_WRAP_S, webglContext.CLAMP_TO_EDGE);
            webglContext.texParameteri(webglContext.TEXTURE_2D, webglContext.TEXTURE_WRAP_T, webglContext.CLAMP_TO_EDGE);
            
            operationsCompleted++;
            webglContext.deleteTexture(texture);
          }
          
          const endTime = performance.now();
          const operationsPerSecond = (operationsCompleted / (endTime - startTime)) * 1000;
          
          console.log(`🎮 GPU Texture Performance: ${operationsPerSecond.toFixed(2)} ops/sec`);
          expect(operationsCompleted).toBe(20);
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ GPU Texture Benchmark: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should validate GPU shader compilation and execution', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('GPU Shader Operations', 1000);
      
      const result = await benchmark.run(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        
        const webglContext = canvas.getContext('webgl');
        
        if (webglContext) {
          // Vertex shader for medical image processing
          const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
              gl_Position = vec4(a_position, 0.0, 1.0);
              v_texCoord = a_texCoord;
            }
          `;
          
          // Fragment shader for window/level adjustment (common in medical imaging)
          const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_windowCenter;
            uniform float u_windowWidth;
            varying vec2 v_texCoord;
            
            void main() {
              vec4 color = texture2D(u_texture, v_texCoord);
              float intensity = color.r;
              
              // Apply window/level transformation
              float minValue = u_windowCenter - u_windowWidth / 2.0;
              float maxValue = u_windowCenter + u_windowWidth / 2.0;
              
              intensity = (intensity - minValue) / (maxValue - minValue);
              intensity = clamp(intensity, 0.0, 1.0);
              
              gl_FragColor = vec4(intensity, intensity, intensity, 1.0);
            }
          `;
          
          // Compile shaders
          const vertexShader = webglContext.createShader(webglContext.VERTEX_SHADER);
          const fragmentShader = webglContext.createShader(webglContext.FRAGMENT_SHADER);
          
          if (vertexShader && fragmentShader) {
            webglContext.shaderSource(vertexShader, vertexShaderSource);
            webglContext.compileShader(vertexShader);
            
            webglContext.shaderSource(fragmentShader, fragmentShaderSource);
            webglContext.compileShader(fragmentShader);
            
            // Check compilation status
            const vertexCompiled = webglContext.getShaderParameter(vertexShader, webglContext.COMPILE_STATUS);
            const fragmentCompiled = webglContext.getShaderParameter(fragmentShader, webglContext.COMPILE_STATUS);
            
            expect(vertexCompiled).toBe(true);
            expect(fragmentCompiled).toBe(true);
            
            if (vertexCompiled && fragmentCompiled) {
              // Create and link program
              const program = webglContext.createProgram();
              if (program) {
                webglContext.attachShader(program, vertexShader);
                webglContext.attachShader(program, fragmentShader);
                webglContext.linkProgram(program);
                
                const linked = webglContext.getProgramParameter(program, webglContext.LINK_STATUS);
                expect(linked).toBe(true);
                
                if (linked) {
                  webglContext.useProgram(program);
                  
                  // Test uniform locations
                  const windowCenterLocation = webglContext.getUniformLocation(program, 'u_windowCenter');
                  const windowWidthLocation = webglContext.getUniformLocation(program, 'u_windowWidth');
                  
                  expect(windowCenterLocation).not.toBeNull();
                  expect(windowWidthLocation).not.toBeNull();
                  
                  // Set medical imaging parameters
                  webglContext.uniform1f(windowCenterLocation, 0.5); // 50% center
                  webglContext.uniform1f(windowWidthLocation, 1.0);   // Full width
                  
                  console.log('🎮 GPU Shader: Medical imaging shader compiled and linked successfully');
                }
                
                webglContext.deleteProgram(program);
              }
            }
            
            webglContext.deleteShader(vertexShader);
            webglContext.deleteShader(fragmentShader);
          }
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ GPU Shader Operations: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should test GPU performance under load', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('GPU Load Test', 3000);
      
      const result = await benchmark.run(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        
        const webglContext = canvas.getContext('webgl');
        
        if (webglContext) {
          const framebuffer = webglContext.createFramebuffer();
          const renderTexture = webglContext.createTexture();
          
          // Setup render target
          webglContext.bindFramebuffer(webglContext.FRAMEBUFFER, framebuffer);
          webglContext.bindTexture(webglContext.TEXTURE_2D, renderTexture);
          
          webglContext.texImage2D(
            webglContext.TEXTURE_2D, 0, webglContext.RGBA,
            1024, 1024, 0, webglContext.RGBA, webglContext.UNSIGNED_BYTE, null
          );
          
          webglContext.framebufferTexture2D(
            webglContext.FRAMEBUFFER, webglContext.COLOR_ATTACHMENT0,
            webglContext.TEXTURE_2D, renderTexture, 0
          );
          
          // Perform intensive GPU operations
          let renderOperations = 0;
          const startTime = performance.now();
          
          for (let frame = 0; frame < 100; frame++) {
            // Clear and render
            webglContext.viewport(0, 0, 1024, 1024);
            webglContext.clearColor(
              Math.sin(frame * 0.1) * 0.5 + 0.5,
              Math.cos(frame * 0.1) * 0.5 + 0.5,
              Math.sin(frame * 0.05) * 0.5 + 0.5,
              1.0
            );
            webglContext.clear(webglContext.COLOR_BUFFER_BIT);
            
            // Simulate complex rendering operations
            for (let i = 0; i < 10; i++) {
              const texture = webglContext.createTexture();
              webglContext.bindTexture(webglContext.TEXTURE_2D, texture);
              
              const size = 256;
              const data = new Uint8Array(size * size * 4);
              for (let j = 0; j < data.length; j += 4) {
                data[j] = (frame + i) % 255;     // R
                data[j + 1] = (frame * 2) % 255; // G
                data[j + 2] = (i * 3) % 255;     // B
                data[j + 3] = 255;               // A
              }
              
              webglContext.texImage2D(
                webglContext.TEXTURE_2D, 0, webglContext.RGBA,
                size, size, 0, webglContext.RGBA, webglContext.UNSIGNED_BYTE, data
              );
              
              webglContext.deleteTexture(texture);
            }
            
            renderOperations++;
            
            // Yield control periodically
            if (frame % 20 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          
          const endTime = performance.now();
          const fps = (renderOperations / (endTime - startTime)) * 1000;
          
          console.log(`🎮 GPU Load Test: ${renderOperations} operations, ${fps.toFixed(2)} FPS`);
          
          // Cleanup
          webglContext.deleteFramebuffer(framebuffer);
          webglContext.deleteTexture(renderTexture);
          
          expect(renderOperations).toBe(100);
          expect(fps).toBeGreaterThan(10); // Should maintain reasonable performance
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ GPU Load Test: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should validate GPU extension support', () => {
      const canvas = document.createElement('canvas');
      const webglContext = canvas.getContext('webgl');
      
      if (webglContext) {
        const extensions = {
          'OES_texture_float': webglContext.getExtension('OES_texture_float'),
          'OES_texture_half_float': webglContext.getExtension('OES_texture_half_float'),
          'WEBGL_depth_texture': webglContext.getExtension('WEBGL_depth_texture'),
          'WEBGL_lose_context': webglContext.getExtension('WEBGL_lose_context'),
          'WEBGL_debug_renderer_info': webglContext.getExtension('WEBGL_debug_renderer_info'),
          'EXT_texture_filter_anisotropic': webglContext.getExtension('EXT_texture_filter_anisotropic'),
          'WEBGL_compressed_texture_s3tc': webglContext.getExtension('WEBGL_compressed_texture_s3tc')
        };
        
        console.log('\n🎮 GPU Extension Support:');
        Object.entries(extensions).forEach(([name, extension]) => {
          const supported = extension !== null;
          console.log(`  ${name}: ${supported ? '✅' : '❌'}`);
        });
        
        // Test critical extensions for medical imaging
        expect(extensions['OES_texture_float']).toBeTruthy(); // Important for high-precision medical data
        
        // Test performance-related extensions
        if (extensions['EXT_texture_filter_anisotropic']) {
          const maxAnisotropy = webglContext.getParameter(extensions['EXT_texture_filter_anisotropic'].MAX_TEXTURE_MAX_ANISOTROPY_EXT);
          console.log(`  Max Anisotropy: ${maxAnisotropy}`);
          expect(maxAnisotropy).toBeGreaterThan(1);
        }
      }
    });
  });

  describe('Concurrent Load Testing', () => {
    test('should handle multiple simultaneous operations', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Concurrent Operations', 3000);
      
      const result = await benchmark.run(async () => {
        const operations = Array.from({ length: 20 }, async (_, i) => {
          const stateManager = new UnifiedStateManager();
          await stateManager.initialize();
          
          // Simulate concurrent state operations
          for (let j = 0; j < 50; j++) {
            stateManager.updateState(`concurrent.${i}.${j}`, {
              value: Math.random(),
              timestamp: Date.now()
            }, 'concurrent-test');
          }
          
          stateManager.cleanup();
        });
        
        await Promise.all(operations);
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Concurrent Operations: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should handle high-frequency updates', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('High Frequency Updates', 2000);
      
      const result = await benchmark.run(async () => {
        const stateManager = new UnifiedStateManager();
        await stateManager.initialize();
        
        // Rapid fire updates
        const updatePromises = Array.from({ length: 1000 }, (_, i) => 
          Promise.resolve().then(() => {
            stateManager.updateState(`rapid.${i}`, {
              counter: i,
              data: new Array(100).fill(i)
            }, 'rapid-test');
          })
        );
        
        await Promise.all(updatePromises);
        stateManager.cleanup();
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ High Frequency Updates: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should handle stress test with mixed operations', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Stress Test', 5000);
      
      const result = await benchmark.run(async () => {
        const managers: UnifiedStateManager[] = [];
        
        // Create multiple managers
        for (let i = 0; i < 10; i++) {
          const manager = new UnifiedStateManager();
          await manager.initialize();
          managers.push(manager);
        }
        
        // Perform mixed operations
        const operations = managers.flatMap((manager, i) => [
          // State updates
          ...Array.from({ length: 20 }, (_, j) => 
            Promise.resolve().then(() => {
              manager.updateState(`stress.${i}.${j}`, {
                data: new Array(50).fill(Math.random())
              }, 'stress-test');
            })
          ),
          
          // Snapshots
          ...Array.from({ length: 5 }, () => 
            Promise.resolve().then(() => {
              manager.createSnapshot(`Stress test snapshot ${i}`);
            })
          ),
          
          // Mode switches
          Promise.resolve().then(() => {
            manager.switchMode('simple');
            manager.switchMode('multi-frame');
          })
        ]);
        
        await Promise.all(operations);
        
        // Cleanup
        managers.forEach(manager => manager.cleanup());
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Stress Test: ${result.actualTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Testing', () => {
    test('should maintain baseline performance for common operations', async () => {
      const baselines = {
        stateUpdate: 10, // ms
        modeSwitch: 100, // ms
        snapshotCreation: 200, // ms
        largeDataProcessing: 1000 // ms
      };

      // Test state update performance
      const stateUpdateBenchmark = PerformanceTestUtils.createBenchmark(
        'State Update Baseline', 
        baselines.stateUpdate
      );
      
      const stateUpdateResult = await stateUpdateBenchmark.run(() => {
        const manager = new UnifiedStateManager();
        manager.updateState('test', { value: 123 }, 'baseline-test');
        manager.cleanup();
      });
      
      expect(stateUpdateResult.passed).toBe(true);
      
      // Test mode switch performance
      const modeSwitchBenchmark = PerformanceTestUtils.createBenchmark(
        'Mode Switch Baseline',
        baselines.modeSwitch
      );
      
      const modeSwitchResult = await modeSwitchBenchmark.run(async () => {
        const mockServices = {
          errorHandler: { addErrorHandler: jest.fn() },
          performanceMonitor: { 
            addMetric: jest.fn(),
            recordMetric: jest.fn(),
            getMetrics: jest.fn(() => ({}))
          },
          adaptivePerformance: { 
            getDeviceCapabilities: jest.fn(() => ({
              cpu: { cores: 4 },
              memory: { heapLimit: 4 * 1024 * 1024 * 1024 },
              gpu: { webglVersion: 2 },
              browser: { features: { canvas: true, webgl: true } },
              network: { downlink: 10 }
            }))
          },
          progressiveLoading: {},
          memoryManager: { getMemoryUsage: jest.fn(() => ({ used: 0, total: 0 })) },
          measurementTools: {},
          annotationSystem: {},
          aiModule: {},
          collaborationModule: {}
        };

        const viewerManager = new EnhancedViewerManager({}, mockServices);
        await viewerManager.switchMode('simple');
        viewerManager.cleanup();
      });
      
      expect(modeSwitchResult.passed).toBe(true);
      
      console.log(`📊 Performance Baselines:`);
      console.log(`  State Update: ${stateUpdateResult.actualTime.toFixed(2)}ms (baseline: ${baselines.stateUpdate}ms)`);
      console.log(`  Mode Switch: ${modeSwitchResult.actualTime.toFixed(2)}ms (baseline: ${baselines.modeSwitch}ms)`);
    });

    test('should detect performance regressions', async () => {
      // Simulate a performance regression by adding artificial delay
      const originalSetTimeout = global.setTimeout;
      
      // Mock a slow operation
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        return originalSetTimeout(callback, delay + 50); // Add 50ms delay
      });

      const benchmark = PerformanceTestUtils.createBenchmark('Regression Detection', 100);
      
      const result = await benchmark.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      // Should detect the regression (actual time > expected due to added delay)
      expect(result.actualTime).toBeGreaterThan(50);
      console.log(`🔍 Regression Test: ${result.actualTime.toFixed(2)}ms (expected regression detected)`);
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Resource Usage Monitoring', () => {
    test('should monitor CPU usage patterns', async () => {
      const startTime = performance.now();
      
      // CPU intensive operation
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i) * Math.sin(i);
      }
      
      const endTime = performance.now();
      const cpuTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(cpuTime).toBeGreaterThan(0);
      
      console.log(`💻 CPU Intensive Operation: ${cpuTime.toFixed(2)}ms`);
    });

    test('should monitor memory allocation patterns', () => {
      const initialMemory = PerformanceTestUtils.getMemoryUsage();
      
      // Memory intensive operation
      const largeArrays = Array.from({ length: 100 }, () => 
        new Array(10000).fill(Math.random())
      );
      
      const peakMemory = PerformanceTestUtils.getMemoryUsage();
      
      // Cleanup
      largeArrays.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = PerformanceTestUtils.getMemoryUsage();
      
      const peakIncrease = ((peakMemory.used - initialMemory.used) / initialMemory.used) * 100;
      const finalIncrease = ((finalMemory.used - initialMemory.used) / initialMemory.used) * 100;
      
      console.log(`📈 Memory Allocation Pattern:`);
      console.log(`  Peak increase: ${peakIncrease.toFixed(2)}%`);
      console.log(`  Final increase: ${finalIncrease.toFixed(2)}%`);
      console.log(`  Cleanup efficiency: ${((peakIncrease - finalIncrease) / peakIncrease * 100).toFixed(2)}%`);
      
      expect(peakIncrease).toBeGreaterThan(finalIncrease);
    });
  });
});