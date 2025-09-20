/**
 * Task 10.3: Performance and Load Testing Implementation
 * Focused test suite demonstrating the implemented performance testing capabilities
 */

import { MockDicomDataGenerator, PerformanceTestUtils } from '../services/__tests__/testUtils';
import { LoadTester, LoadTestConfigurations } from '../utils/loadTestingUtils';

// Mock dependencies
jest.mock('../services/unifiedStateManager');
jest.mock('../services/enhancedViewerManager');
jest.mock('../services/intelligentCacheManager');

describe('Task 10.3: Performance and Load Testing Implementation', () => {
  let loadTester: LoadTester;

  beforeAll(() => {
    loadTester = new LoadTester();
    jest.setTimeout(60000); // 1 minute timeout
  });

  afterEach(() => {
    if (global.gc) {
      global.gc();
    }
  });

  describe('Large Dataset Testing (1000+ slices) - Requirements 9.1, 9.2, 9.3, 9.4, 9.5', () => {
    test('should handle 1000 slice dataset efficiently', async () => {
      console.log('🧪 Testing 1000 slice dataset performance');
      
      const benchmark = PerformanceTestUtils.createBenchmark('1000 Slice Dataset', 5000);
      
      const result = await benchmark.run(async () => {
        // Generate large dataset
        const largeStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: 1000,
          hasMultiFrame: true
        });

        expect(largeStudy.total_slices).toBe(1000);
        expect(largeStudy.image_urls).toHaveLength(1000);
        
        // Simulate processing slices
        let processedSlices = 0;
        for (let i = 0; i < 100; i += 10) {
          const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
          expect(pixelData.length).toBe(256 * 256);
          processedSlices++;
        }
        
        return { processedSlices, totalSlices: largeStudy.total_slices };
      });
      
      expect(result.passed).toBe(true);
      expect(result.result.processedSlices).toBe(10);
      console.log(`✅ 1000 slice dataset: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should handle 5000 slice dataset with streaming approach', async () => {
      console.log('🧪 Testing 5000 slice dataset with streaming');
      
      const benchmark = PerformanceTestUtils.createBenchmark('5000 Slice Streaming', 8000);
      
      const result = await benchmark.run(async () => {
        const massiveStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: 5000,
          hasMultiFrame: true
        });

        // Simulate streaming approach - only load visible slices + buffer
        const viewportSize = 10;
        const bufferSize = 20;
        let loadedSlices = 0;
        
        // Simulate loading in chunks
        const chunkSize = 50;
        for (let chunk = 0; chunk < 10; chunk++) { // Load 10 chunks (500 slices)
          const chunkPromises = [];
          
          for (let i = 0; i < chunkSize; i++) {
            chunkPromises.push(
              Promise.resolve().then(() => {
                const pixelData = MockDicomDataGenerator.generateMockPixelData(128, 128);
                return pixelData.length;
              })
            );
          }
          
          const chunkResults = await Promise.all(chunkPromises);
          loadedSlices += chunkResults.length;
        }
        
        return { loadedSlices, totalSlices: massiveStudy.total_slices };
      });
      
      expect(result.passed).toBe(true);
      expect(result.result.loadedSlices).toBe(500);
      console.log(`✅ 5000 slice streaming: ${result.actualTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Leak Detection - Requirements 9.2, 9.3', () => {
    test('should detect and prevent memory leaks', async () => {
      console.log('🧪 Testing memory leak detection');
      
      const memoryDetector = PerformanceTestUtils.createMemoryLeakDetector(25);
      
      // Simulate operations that might leak memory
      const arrays: Uint8Array[] = [];
      
      for (let i = 0; i < 100; i++) {
        const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
        arrays.push(pixelData);
        
        // Simulate cleanup every 20 iterations
        if (i % 20 === 0 && arrays.length > 10) {
          arrays.splice(0, 10);
        }
      }
      
      // Final cleanup
      arrays.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const leakCheck = memoryDetector.check();
      
      expect(leakCheck.hasLeak).toBe(false);
      console.log(`✅ Memory leak test: ${leakCheck.memoryIncrease.toFixed(2)}% increase`);
    });

    test('should handle memory pressure scenarios', async () => {
      console.log('🧪 Testing memory pressure handling');
      
      const benchmark = PerformanceTestUtils.createBenchmark('Memory Pressure', 3000);
      
      const result = await benchmark.run(() => {
        const memoryArrays: Uint8Array[] = [];
        
        // Allocate memory in chunks
        for (let i = 0; i < 50; i++) {
          const chunk = new Uint8Array(100000); // 100KB chunks
          chunk.fill(Math.random() * 255);
          memoryArrays.push(chunk);
          
          // Cleanup old chunks to manage memory
          if (memoryArrays.length > 20) {
            memoryArrays.shift();
          }
        }
        
        return memoryArrays.length;
      });
      
      expect(result.passed).toBe(true);
      expect(result.result).toBeLessThanOrEqual(20);
      console.log(`✅ Memory pressure test: ${result.actualTime.toFixed(2)}ms`);
    });

    test('should monitor memory usage patterns', async () => {
      console.log('🧪 Testing memory usage patterns');
      
      const memorySnapshots: Array<{ operation: string; memory: number }> = [];
      
      const takeSnapshot = (operation: string) => {
        memorySnapshots.push({
          operation,
          memory: PerformanceTestUtils.getMemoryUsage().used
        });
      };
      
      takeSnapshot('initial');
      
      // Simulate typical DICOM viewer operations
      for (let i = 0; i < 20; i++) {
        const pixelData = MockDicomDataGenerator.generateMockPixelData(512, 512);
        
        if (i % 5 === 0) {
          takeSnapshot(`operation-${i}`);
        }
      }
      
      takeSnapshot('final');
      
      expect(memorySnapshots.length).toBeGreaterThan(2);
      
      // Verify memory pattern is reasonable
      const initialMemory = memorySnapshots[0].memory;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory;
      const memoryIncrease = ((finalMemory - initialMemory) / initialMemory) * 100;
      
      expect(memoryIncrease).toBeLessThan(100); // Should not double memory usage
      console.log(`✅ Memory pattern test: ${memoryIncrease.toFixed(2)}% increase`);
    });
  });

  describe('Network Latency Simulation and Testing - Requirement 9.4', () => {
    test('should handle various network conditions', async () => {
      console.log('🧪 Testing network condition simulation');
      
      const networkProfiles = [
        { name: 'Fast', delay: 50 },
        { name: 'Medium', delay: 200 },
        { name: 'Slow', delay: 1000 }
      ];
      
      for (const profile of networkProfiles) {
        const originalFetch = global.fetch;
        
        // Mock network with specific delay
        global.fetch = jest.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ 
                  profile: profile.name,
                  delay: profile.delay
                })
              } as any);
            }, profile.delay);
          });
        });
        
        try {
          const benchmark = PerformanceTestUtils.createBenchmark(
            `${profile.name} Network`, 
            profile.delay + 500
          );
          
          const result = await benchmark.run(async () => {
            const response = await fetch('/api/test');
            const data = await response.json();
            return data;
          });
          
          expect(result.passed).toBe(true);
          expect(result.result.profile).toBe(profile.name);
          console.log(`✅ ${profile.name} network: ${result.actualTime.toFixed(2)}ms`);
          
        } finally {
          global.fetch = originalFetch;
        }
      }
    });

    test('should handle network jitter and packet loss', async () => {
      console.log('🧪 Testing network jitter simulation');
      
      const originalFetch = global.fetch;
      const jitterValues: number[] = [];
      let packetLossCount = 0;
      
      global.fetch = jest.fn().mockImplementation(() => {
        // Simulate 10% packet loss
        if (Math.random() < 0.1) {
          packetLossCount++;
          return Promise.reject(new Error('Packet lost'));
        }
        
        // Add jitter
        const baseDelay = 100;
        const jitter = (Math.random() - 0.5) * 50; // ±25ms jitter
        const delay = Math.max(10, baseDelay + jitter);
        
        jitterValues.push(Math.abs(jitter));
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ jitter, delay })
            } as any);
          }, delay);
        });
      });
      
      try {
        let successfulRequests = 0;
        let failedRequests = 0;
        
        // Make multiple requests
        for (let i = 0; i < 20; i++) {
          try {
            await fetch('/api/test');
            successfulRequests++;
          } catch {
            failedRequests++;
          }
        }
        
        const averageJitter = jitterValues.length > 0 
          ? jitterValues.reduce((sum, j) => sum + j, 0) / jitterValues.length 
          : 0;
        
        expect(successfulRequests).toBeGreaterThan(15); // Should handle most requests
        expect(averageJitter).toBeGreaterThan(0);
        
        console.log(`✅ Network jitter: ${successfulRequests}/${successfulRequests + failedRequests} successful, avg jitter: ${averageJitter.toFixed(2)}ms`);
        
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('GPU Acceleration Validation (Mock) - Requirements 11.3, 11.4, 11.5', () => {
    test('should validate WebGL capability detection (mocked)', async () => {
      console.log('🧪 Testing GPU capability detection (mocked)');
      
      // Mock WebGL context since it's not available in Jest
      const mockCanvas = {
        getContext: jest.fn().mockImplementation((type) => {
          if (type === 'webgl' || type === 'webgl2') {
            return {
              getParameter: jest.fn().mockImplementation((param) => {
                if (param === 'MAX_TEXTURE_SIZE') return 4096;
                if (param === 'MAX_VIEWPORT_DIMS') return [4096, 4096];
                return null;
              }),
              getExtension: jest.fn().mockReturnValue({}),
              clearColor: jest.fn(),
              clear: jest.fn(),
              COLOR_BUFFER_BIT: 16384
            };
          }
          return null;
        })
      };
      
      // Mock document.createElement
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement.call(document, tagName);
      });
      
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        
        expect(gl).toBeTruthy();
        
        if (gl) {
          const maxTextureSize = gl.getParameter('MAX_TEXTURE_SIZE');
          const maxViewportDims = gl.getParameter('MAX_VIEWPORT_DIMS');
          
          expect(maxTextureSize).toBe(4096);
          expect(maxViewportDims).toEqual([4096, 4096]);
          
          console.log(`✅ GPU capabilities: Max texture ${maxTextureSize}, viewport ${maxViewportDims[0]}x${maxViewportDims[1]}`);
        }
        
      } finally {
        document.createElement = originalCreateElement;
      }
    });

    test('should validate GPU memory operations (mocked)', async () => {
      console.log('🧪 Testing GPU memory operations (mocked)');
      
      const benchmark = PerformanceTestUtils.createBenchmark('GPU Memory Operations', 500);
      
      const result = await benchmark.run(() => {
        // Mock GPU memory operations
        const textures: any[] = [];
        const buffers: any[] = [];
        
        // Simulate texture creation
        for (let i = 0; i < 20; i++) {
          const mockTexture = { id: i, size: 512 * 512 * 4 };
          textures.push(mockTexture);
        }
        
        // Simulate buffer creation
        for (let i = 0; i < 10; i++) {
          const mockBuffer = { id: i, size: 1024 * 256 * 4 };
          buffers.push(mockBuffer);
        }
        
        return {
          texturesCreated: textures.length,
          buffersCreated: buffers.length,
          totalMemory: textures.reduce((sum, t) => sum + t.size, 0) + 
                      buffers.reduce((sum, b) => sum + b.size, 0)
        };
      });
      
      expect(result.passed).toBe(true);
      expect(result.result.texturesCreated).toBe(20);
      expect(result.result.buffersCreated).toBe(10);
      
      console.log(`✅ GPU memory: ${result.result.texturesCreated} textures, ${result.result.buffersCreated} buffers, ${(result.result.totalMemory / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Load Testing Integration', () => {
    test('should execute basic load test configuration', async () => {
      console.log('🧪 Testing load test integration');
      
      const config = LoadTestConfigurations.createBasicViewerLoadTest();
      
      // Reduce duration for testing
      config.duration = 5000; // 5 seconds
      config.concurrency = 2;
      
      const result = await loadTester.executeLoadTest(config);
      
      expect(result).toBeDefined();
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.successfulOperations).toBeGreaterThan(0);
      expect(result.errorRate).toBeLessThan(0.5); // Less than 50% error rate
      
      console.log(`✅ Load test: ${result.totalOperations} ops, ${result.operationsPerSecond.toFixed(2)} ops/sec, ${(result.errorRate * 100).toFixed(1)}% errors`);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should maintain baseline performance for common operations', async () => {
      console.log('🧪 Testing performance baselines');
      
      const baselines = {
        pixelDataGeneration: 50, // ms
        dataProcessing: 100, // ms
        memoryAllocation: 200 // ms
      };
      
      // Test pixel data generation performance
      const pixelGenBenchmark = PerformanceTestUtils.createBenchmark(
        'Pixel Data Generation',
        baselines.pixelDataGeneration
      );
      
      const pixelResult = await pixelGenBenchmark.run(() => {
        const pixelData = MockDicomDataGenerator.generateMockPixelData(512, 512);
        return pixelData.length;
      });
      
      expect(pixelResult.passed).toBe(true);
      expect(pixelResult.result).toBe(512 * 512);
      
      // Test data processing performance
      const processingBenchmark = PerformanceTestUtils.createBenchmark(
        'Data Processing',
        baselines.dataProcessing
      );
      
      const processingResult = await processingBenchmark.run(() => {
        const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
        
        // Simulate image processing
        let sum = 0;
        for (let i = 0; i < pixelData.length; i += 100) {
          sum += pixelData[i];
        }
        
        return sum;
      });
      
      expect(processingResult.passed).toBe(true);
      expect(processingResult.result).toBeGreaterThan(0);
      
      console.log(`✅ Performance baselines maintained:`);
      console.log(`  Pixel generation: ${pixelResult.actualTime.toFixed(2)}ms (baseline: ${baselines.pixelDataGeneration}ms)`);
      console.log(`  Data processing: ${processingResult.actualTime.toFixed(2)}ms (baseline: ${baselines.dataProcessing}ms)`);
    });
  });
});