/**
 * Comprehensive Performance Test Suite
 * Integration test that runs all performance testing capabilities
 */

import { runComprehensivePerformanceTests } from './runPerformanceTests';
import { AdvancedLoadTester, AdvancedLoadTestConfigurations } from '../utils/advancedLoadTestingUtils';
import { performanceTestRunner } from './performance.config';

// Mock dependencies
jest.mock('../services/unifiedStateManager');
jest.mock('../services/enhancedViewerManager');
jest.mock('../services/intelligentCacheManager');

describe('Comprehensive Performance Testing Suite', () => {
  let advancedTester: AdvancedLoadTester;

  beforeAll(() => {
    advancedTester = new AdvancedLoadTester();
    
    // Set longer timeout for comprehensive tests
    jest.setTimeout(300000); // 5 minutes
  });

  afterAll(() => {
    // Cleanup
    if (global.gc) {
      global.gc();
    }
  });

  describe('Task 10.3: Performance and Load Testing Implementation', () => {
    test('should validate large dataset testing (1000+ slices)', async () => {
      console.log('🧪 Testing Large Dataset Performance (Task 10.3 - Requirement 9.1, 9.2, 9.3, 9.4, 9.5)');
      
      // Test 1000 slice dataset
      const config1K = AdvancedLoadTestConfigurations.createLargeDatasetTest(1000);
      const result1K = await advancedTester.executeAdvancedLoadTest(config1K);
      
      expect(result1K).toBeDefined();
      expect(result1K.totalOperations).toBeGreaterThan(0);
      expect(result1K.datasetMetrics.slicesProcessed).toBeGreaterThan(0);
      
      // Validate performance thresholds
      expect(result1K.duration).toBeLessThan(60000); // Should complete within 1 minute
      expect(result1K.errorRate).toBeLessThan(0.1); // Less than 10% error rate
      
      console.log(`✅ 1000 slice dataset: ${result1K.duration}ms, ${result1K.operationsPerSecond.toFixed(2)} ops/sec`);
      
      // Test 5000 slice dataset for stress testing
      const config5K = AdvancedLoadTestConfigurations.createLargeDatasetTest(5000);
      const result5K = await advancedTester.executeAdvancedLoadTest(config5K);
      
      expect(result5K).toBeDefined();
      expect(result5K.datasetMetrics.slicesProcessed).toBeGreaterThan(0);
      
      console.log(`✅ 5000 slice dataset: ${result5K.duration}ms, ${result5K.operationsPerSecond.toFixed(2)} ops/sec`);
    });

    test('should validate memory usage and leak detection', async () => {
      console.log('🧪 Testing Memory Usage and Leak Detection (Task 10.3 - Requirement 9.2, 9.3)');
      
      // Memory stress test
      const memoryConfig = AdvancedLoadTestConfigurations.createMemoryStressTest();
      const memoryResult = await advancedTester.executeAdvancedLoadTest(memoryConfig);
      
      expect(memoryResult).toBeDefined();
      expect(memoryResult.memoryMetrics).toBeDefined();
      
      // Validate memory metrics
      expect(memoryResult.memoryMetrics.leaksDetected).toBeLessThan(3); // Should have minimal leaks
      expect(memoryResult.memoryMetrics.peakUsage).toBeGreaterThan(0);
      expect(memoryResult.memoryMetrics.fragmentationScore).toBeLessThan(0.8); // Good fragmentation score
      
      console.log(`✅ Memory Test: Peak ${(memoryResult.memoryMetrics.peakUsage / 1024 / 1024).toFixed(2)}MB, ${memoryResult.memoryMetrics.leaksDetected} leaks detected`);
      
      // Additional memory pattern test
      const memoryPatternResult = await performanceTestRunner.runTest(
        'memory-pattern-validation',
        () => {
          const arrays: Uint8Array[] = [];
          
          // Simulate typical DICOM viewer memory usage pattern
          for (let i = 0; i < 100; i++) {
            // Allocate image data
            const imageData = new Uint8Array(512 * 512 * 2); // 16-bit image
            imageData.fill(Math.random() * 4095);
            arrays.push(imageData);
            
            // Cleanup old data (simulate cache eviction)
            if (arrays.length > 20) {
              arrays.shift();
            }
          }
          
          return arrays.length;
        },
        { measureMemory: true, iterations: 3 }
      );
      
      expect(memoryPatternResult).toBeDefined();
      console.log('✅ Memory pattern test completed successfully');
    });

    test('should validate network latency simulation and testing', async () => {
      console.log('🧪 Testing Network Latency Simulation (Task 10.3 - Requirement 9.4)');
      
      const networkProfiles = [
        { name: 'Fast', delay: 50, bandwidth: 10000000 },
        { name: 'Medium', delay: 200, bandwidth: 1000000 },
        { name: 'Slow', delay: 1000, bandwidth: 100000 }
      ];
      
      for (const profile of networkProfiles) {
        const originalFetch = global.fetch;
        
        // Mock network with specific profile
        global.fetch = jest.fn().mockImplementation(() => {
          const transferDelay = (1024 * 1024) / profile.bandwidth * 1000; // 1MB transfer
          const totalDelay = profile.delay + transferDelay;
          
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ 
                  profile: profile.name,
                  delay: totalDelay
                }),
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024 * 1024))
              } as any);
            }, totalDelay);
          });
        });
        
        try {
          const networkResult = await performanceTestRunner.runTest(
            `network-${profile.name.toLowerCase()}`,
            async () => {
              // Simulate loading multiple DICOM slices
              const requests = Array.from({ length: 5 }, () => 
                fetch('/api/dicom/slice').then(r => r.json())
              );
              
              const results = await Promise.all(requests);
              return results.length;
            },
            { iterations: 2 }
          );
          
          expect(networkResult).toBeDefined();
          console.log(`✅ ${profile.name} network test completed`);
          
        } finally {
          global.fetch = originalFetch;
        }
      }
      
      // Test network jitter and packet loss
      const jitterResult = await testNetworkJitter();
      expect(jitterResult).toBeDefined();
      console.log('✅ Network jitter test completed');
      
      const reliabilityResult = await testNetworkReliability();
      expect(reliabilityResult).toBeDefined();
      console.log('✅ Network reliability test completed');
    });

    test('should validate GPU acceleration capabilities', async () => {
      console.log('🧪 Testing GPU Acceleration Validation (Task 10.3 - Requirement 11.3, 11.4, 11.5)');
      
      // GPU capability detection
      const gpuCapabilityResult = await performanceTestRunner.runTest(
        'gpu-capability-validation',
        () => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          const gl2 = canvas.getContext('webgl2');
          
          if (!gl) {
            throw new Error('WebGL not supported');
          }
          
          const capabilities = {
            webgl: !!gl,
            webgl2: !!gl2,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            extensions: {
              floatTextures: !!gl.getExtension('OES_texture_float'),
              halfFloatTextures: !!gl.getExtension('OES_texture_half_float'),
              depthTextures: !!gl.getExtension('WEBGL_depth_texture'),
              loseContext: !!gl.getExtension('WEBGL_lose_context'),
              anisotropicFiltering: !!gl.getExtension('EXT_texture_filter_anisotropic')
            }
          };
          
          return capabilities;
        }
      );
      
      expect(gpuCapabilityResult).toBeDefined();
      console.log('✅ GPU capability detection completed');
      
      // GPU memory management test
      const gpuMemoryResult = await performanceTestRunner.runTest(
        'gpu-memory-validation',
        () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1024;
          canvas.height = 1024;
          
          const gl = canvas.getContext('webgl');
          if (!gl) throw new Error('WebGL not supported');
          
          const textures: WebGLTexture[] = [];
          const buffers: WebGLBuffer[] = [];
          
          try {
            // Test texture allocation
            for (let i = 0; i < 20; i++) {
              const texture = gl.createTexture();
              if (texture) {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                
                const data = new Uint8Array(512 * 512 * 4);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
                
                textures.push(texture);
              }
              
              // Test buffer allocation
              const buffer = gl.createBuffer();
              if (buffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                
                const bufferData = new Float32Array(1024 * 256);
                gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
                
                buffers.push(buffer);
              }
            }
            
            return {
              texturesCreated: textures.length,
              buffersCreated: buffers.length
            };
            
          } finally {
            // Cleanup
            textures.forEach(texture => gl.deleteTexture(texture));
            buffers.forEach(buffer => gl.deleteBuffer(buffer));
          }
        }
      );
      
      expect(gpuMemoryResult).toBeDefined();
      console.log('✅ GPU memory management test completed');
      
      // GPU performance test
      const gpuPerformanceResult = await performanceTestRunner.runTest(
        'gpu-performance-validation',
        async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          
          const gl = canvas.getContext('webgl');
          if (!gl) throw new Error('WebGL not supported');
          
          let frames = 0;
          const startTime = performance.now();
          const testDuration = 1000; // 1 second
          
          while (performance.now() - startTime < testDuration) {
            // Render frame
            gl.viewport(0, 0, 512, 512);
            gl.clearColor(
              Math.sin(frames * 0.1) * 0.5 + 0.5,
              Math.cos(frames * 0.1) * 0.5 + 0.5,
              Math.sin(frames * 0.05) * 0.5 + 0.5,
              1.0
            );
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            frames++;
            
            // Yield control
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          const endTime = performance.now();
          const fps = (frames / (endTime - startTime)) * 1000;
          
          return { frames, fps };
        }
      );
      
      expect(gpuPerformanceResult).toBeDefined();
      expect(gpuPerformanceResult.fps).toBeGreaterThan(10); // Should maintain reasonable FPS
      console.log(`✅ GPU performance test: ${gpuPerformanceResult.fps.toFixed(2)} FPS`);
    });

    test('should run comprehensive performance test suite', async () => {
      console.log('🧪 Running Comprehensive Performance Test Suite (Task 10.3 - All Requirements)');
      
      // This test validates that all performance testing components work together
      await expect(runComprehensivePerformanceTests()).resolves.not.toThrow();
      
      console.log('✅ Comprehensive performance test suite completed successfully');
    });
  });
});

// Helper functions for network testing
async function testNetworkJitter(): Promise<any> {
  const originalFetch = global.fetch;
  const jitterValues: number[] = [];
  
  global.fetch = jest.fn().mockImplementation(() => {
    const baseDelay = 100;
    const jitter = (Math.random() - 0.5) * 100; // ±50ms jitter
    const delay = Math.max(10, baseDelay + jitter);
    
    jitterValues.push(Math.abs(jitter));
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: () => Promise.resolve({ jitter })
        } as any);
      }, delay);
    });
  });
  
  try {
    return await performanceTestRunner.runTest(
      'network-jitter-validation',
      async () => {
        const requests = Array.from({ length: 10 }, () => 
          fetch('/api/test').then(r => r.json())
        );
        
        await Promise.all(requests);
        
        const avgJitter = jitterValues.reduce((sum, j) => sum + j, 0) / jitterValues.length;
        return { averageJitter: avgJitter };
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
}

async function testNetworkReliability(): Promise<any> {
  const originalFetch = global.fetch;
  let requestCount = 0;
  
  global.fetch = jest.fn().mockImplementation(() => {
    requestCount++;
    
    // 5% failure rate
    if (requestCount % 20 === 0) {
      return Promise.reject(new Error('Network failure'));
    }
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as any);
  });
  
  try {
    return await performanceTestRunner.runTest(
      'network-reliability-validation',
      async () => {
        let successful = 0;
        let failed = 0;
        
        for (let i = 0; i < 30; i++) {
          try {
            await fetch('/api/test');
            successful++;
          } catch {
            failed++;
          }
        }
        
        return { 
          successful, 
          failed, 
          reliability: successful / (successful + failed) 
        };
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
}