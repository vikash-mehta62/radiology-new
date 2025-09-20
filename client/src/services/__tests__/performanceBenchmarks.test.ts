/**
 * Performance Benchmarks
 * Comprehensive performance testing for DICOM viewer components
 */

import { PerformanceTestUtils, MockDicomDataGenerator, CanvasTestUtils } from './testUtils';
import { UnifiedStateManager } from '../unifiedStateManager';
import { EnhancedViewerManager } from '../enhancedViewerManager';
import { IntelligentCacheManager } from '../intelligentCacheManager';
import { AdaptivePerformanceSystem } from '../adaptivePerformanceSystem';

// Mock dependencies
jest.mock('../errorHandler');
jest.mock('../performanceMonitor');
jest.mock('../adaptivePerformanceSystem');
jest.mock('../progressiveLoadingSystem');
jest.mock('../memoryManagementSystem');
jest.mock('../measurementTools');
jest.mock('../annotationSystem');
jest.mock('../aiEnhancementModule');
jest.mock('../collaborationModule');

describe('Performance Benchmarks', () => {
  let memoryDetector: ReturnType<typeof PerformanceTestUtils.createMemoryLeakDetector>;

  beforeEach(() => {
    memoryDetector = PerformanceTestUtils.createMemoryLeakDetector(20);
  });

  afterEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('State Management Performance', () => {
    let stateManager: UnifiedStateManager;

    beforeEach(async () => {
      stateManager = new UnifiedStateManager();
      await stateManager.initialize();
    });

    afterEach(() => {
      stateManager.cleanup();
    });

    test('should handle rapid state updates efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Rapid State Updates', 50);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 1000; i++) {
          stateManager.updateState(`test.item${i}`, {
            value: i,
            timestamp: Date.now(),
            data: new Array(100).fill(i)
          }, 'benchmark');
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Rapid State Updates: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should handle large state objects efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Large State Objects', 100);
      
      const largeObject = {
        images: Array.from({ length: 1000 }, (_, i) => ({
          id: `image-${i}`,
          url: `http://example.com/image-${i}.dcm`,
          metadata: {
            width: 512,
            height: 512,
            slices: 100,
            pixelData: new Array(1000).fill(i)
          }
        }))
      };
      
      const result = await benchmark.run(() => {
        stateManager.updateState('largeDataset', largeObject, 'benchmark');
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Large State Objects: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should create snapshots efficiently', async () => {
      // Populate state with data
      for (let i = 0; i < 100; i++) {
        stateManager.updateState(`dataset.item${i}`, {
          id: i,
          data: new Array(100).fill(i)
        }, 'setup');
      }
      
      const benchmark = PerformanceTestUtils.createBenchmark('Snapshot Creation', 200);
      
      const result = await benchmark.run(() => {
        stateManager.createSnapshot('Performance test snapshot');
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Snapshot Creation: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should restore snapshots efficiently', async () => {
      // Create a snapshot with substantial data
      for (let i = 0; i < 100; i++) {
        stateManager.updateState(`dataset.item${i}`, { id: i, data: new Array(100).fill(i) }, 'setup');
      }
      const snapshot = stateManager.createSnapshot('Test snapshot');
      
      const benchmark = PerformanceTestUtils.createBenchmark('Snapshot Restoration', 150);
      
      const result = await benchmark.run(() => {
        stateManager.restoreSnapshot(snapshot.id);
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Snapshot Restoration: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should not leak memory during intensive operations', () => {
      memoryDetector.reset();
      
      // Perform memory-intensive operations
      for (let i = 0; i < 100; i++) {
        stateManager.updateState(`temp.${i}`, new Array(1000).fill(i), 'memory-test');
        stateManager.createSnapshot(`Memory test ${i}`);
        
        if (i % 10 === 0) {
          stateManager.clearSnapshots();
        }
      }
      
      const leakCheck = memoryDetector.check();
      expect(leakCheck.hasLeak).toBe(false);
      console.log(`✅ Memory Usage: ${leakCheck.memoryIncrease.toFixed(2)}% increase (threshold: 20%)`);
    });
  });

  describe('Viewer Manager Performance', () => {
    let viewerManager: EnhancedViewerManager;
    let mockServices: any;

    beforeEach(() => {
      // Create minimal mock services
      mockServices = {
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
            browser: { features: { canvas: true, webgl: true, webgl2: true } },
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

      viewerManager = new EnhancedViewerManager({}, mockServices);
    });

    afterEach(() => {
      viewerManager.cleanup();
    });

    test('should switch modes efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Mode Switching', 100);
      
      const result = await benchmark.run(async () => {
        await viewerManager.switchMode('simple');
        await viewerManager.switchMode('multi-frame');
        await viewerManager.switchMode('comprehensive');
        await viewerManager.switchMode('simple');
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Mode Switching: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should handle rapid capability toggles', async () => {
      await viewerManager.switchMode('comprehensive');
      
      const benchmark = PerformanceTestUtils.createBenchmark('Capability Toggles', 50);
      
      const result = await benchmark.run(() => {
        const capabilities = ['ai-enhancement', 'collaboration', 'advanced-measurements'];
        
        for (let i = 0; i < 100; i++) {
          const capability = capabilities[i % capabilities.length];
          if (i % 2 === 0) {
            viewerManager.enableCapability(capability);
          } else {
            viewerManager.disableCapability(capability);
          }
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Capability Toggles: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should handle configuration updates efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Configuration Updates', 75);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 100; i++) {
          viewerManager.updateModeConfiguration('simple', {
            rendering: { quality: i % 2 === 0 ? 'high' : 'low' },
            performance: { maxCacheSize: 128 + i }
          } as any);
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Configuration Updates: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });
  });

  describe('DICOM Data Processing Performance', () => {
    test('should generate mock DICOM data efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('DICOM Data Generation', 200);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 100; i++) {
          MockDicomDataGenerator.generateMockStudy({
            sliceCount: 50,
            hasMultiFrame: true
          });
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ DICOM Data Generation: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should generate pixel data efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Pixel Data Generation', 500);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 10; i++) {
          MockDicomDataGenerator.generateMockPixelData(512, 512);
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Pixel Data Generation: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should handle large dataset generation', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Large Dataset Generation', 1000);
      
      const result = await benchmark.run(() => {
        MockDicomDataGenerator.generateMockStudy({
          sliceCount: 1000,
          hasMultiFrame: true
        });
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Large Dataset Generation: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });
  });

  describe('Canvas Rendering Performance', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: Partial<CanvasRenderingContext2D>;

    beforeEach(() => {
      mockCanvas = CanvasTestUtils.createMockCanvas();
      mockContext = CanvasTestUtils.createMockCanvasContext();
    });

    test('should handle rapid drawing operations', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Canvas Drawing Operations', 100);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 1000; i++) {
          mockContext.fillRect!(i % 512, (i * 2) % 512, 10, 10);
          mockContext.strokeRect!(i % 512, (i * 3) % 512, 5, 5);
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Canvas Drawing Operations: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should handle image data operations efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Image Data Operations', 200);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 100; i++) {
          const imageData = mockContext.createImageData!(512, 512);
          mockContext.putImageData!(imageData, 0, 0);
          mockContext.getImageData!(0, 0, 512, 512);
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Image Data Operations: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });

    test('should handle transformation operations', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Canvas Transformations', 50);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 1000; i++) {
          mockContext.save!();
          mockContext.translate!(i % 100, (i * 2) % 100);
          mockContext.rotate!(i * 0.01);
          mockContext.scale!(1 + i * 0.001, 1 + i * 0.001);
          mockContext.restore!();
        }
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Canvas Transformations: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('should track memory usage during operations', () => {
      const initialMemory = PerformanceTestUtils.getMemoryUsage();
      
      // Perform memory-intensive operations
      const largeArrays: number[][] = [];
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(10000).fill(i));
      }
      
      const finalMemory = PerformanceTestUtils.getMemoryUsage();
      const memoryIncrease = finalMemory.used - initialMemory.used;
      
      expect(memoryIncrease).toBeGreaterThan(0);
      console.log(`📊 Memory Usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
      
      // Cleanup
      largeArrays.length = 0;
    });

    test('should detect memory leaks in repeated operations', () => {
      const detector = PerformanceTestUtils.createMemoryLeakDetector(15);
      
      // Simulate operations that might leak
      for (let i = 0; i < 50; i++) {
        const stateManager = new UnifiedStateManager();
        stateManager.updateState('test', new Array(1000).fill(i), 'test');
        stateManager.createSnapshot('test');
        stateManager.cleanup();
      }
      
      const leakCheck = detector.check();
      expect(leakCheck.hasLeak).toBe(false);
      console.log(`🔍 Memory Leak Check: ${leakCheck.memoryIncrease.toFixed(2)}% increase`);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent state operations', async () => {
      const stateManager = new UnifiedStateManager();
      await stateManager.initialize();
      
      const benchmark = PerformanceTestUtils.createBenchmark('Concurrent State Operations', 200);
      
      const result = await benchmark.run(async () => {
        const promises = Array.from({ length: 50 }, (_, i) =>
          Promise.resolve().then(() => {
            stateManager.updateState(`concurrent.${i}`, {
              value: i,
              data: new Array(100).fill(i)
            }, 'concurrent-test');
          })
        );
        
        await Promise.all(promises);
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Concurrent State Operations: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
      
      stateManager.cleanup();
    });

    test('should handle concurrent viewer operations', async () => {
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
      
      const benchmark = PerformanceTestUtils.createBenchmark('Concurrent Viewer Operations', 300);
      
      const result = await benchmark.run(async () => {
        const promises = [
          viewerManager.switchMode('simple'),
          viewerManager.switchMode('multi-frame'),
          viewerManager.switchMode('comprehensive')
        ];
        
        await Promise.allSettled(promises);
      });
      
      expect(result.passed).toBe(true);
      console.log(`✅ Concurrent Viewer Operations: ${result.actualTime.toFixed(2)}ms (target: ${result.targetTime}ms)`);
      
      viewerManager.cleanup();
    });
  });

  describe('Overall Performance Summary', () => {
    test('should provide performance summary', () => {
      const memoryUsage = PerformanceTestUtils.getMemoryUsage();
      
      console.log('\n📊 Performance Summary:');
      console.log(`Memory Usage: ${(memoryUsage.used / 1024 / 1024).toFixed(2)}MB / ${(memoryUsage.total / 1024 / 1024).toFixed(2)}MB (${memoryUsage.percentage.toFixed(1)}%)`);
      
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`JS Heap: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB used`);
        console.log(`JS Heap Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
      }
      
      expect(memoryUsage.percentage).toBeLessThan(90); // Should not use more than 90% of available memory
    });
  });
});