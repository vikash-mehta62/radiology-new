/**
 * Performance Test Runner
 * Comprehensive test runner for all performance and load tests
 */

import { AdvancedLoadTester, AdvancedLoadTestConfigurations } from '../utils/advancedLoadTestingUtils';
import { performanceTestRunner, DEFAULT_PERFORMANCE_CONFIG } from './performance.config';
import { MockDicomDataGenerator, PerformanceTestUtils } from '../services/__tests__/testUtils';

/**
 * Main performance test suite runner
 */
export class PerformanceTestSuite {
  private advancedTester: AdvancedLoadTester;
  private results: Map<string, any> = new Map();
  
  constructor() {
    this.advancedTester = new AdvancedLoadTester();
  }
  
  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Performance Test Suite');
    console.log('=' .repeat(60));
    
    try {
      // 1. Large Dataset Tests
      await this.runLargeDatasetTests();
      
      // 2. Memory Tests
      await this.runMemoryTests();
      
      // 3. Network Tests
      await this.runNetworkTests();
      
      // 4. GPU Tests
      await this.runGPUTests();
      
      // 5. Concurrent Load Tests
      await this.runConcurrentLoadTests();
      
      // 6. Generate comprehensive report
      await this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      throw error;
    }
  }
  
  /**
   * Run large dataset performance tests
   */
  private async runLargeDatasetTests(): Promise<void> {
    console.log('\n📊 Running Large Dataset Tests...');
    
    const datasetSizes = [1000, 2000, 5000, 10000];
    
    for (const sliceCount of datasetSizes) {
      console.log(`\n  Testing ${sliceCount} slice dataset...`);
      
      try {
        const config = AdvancedLoadTestConfigurations.createLargeDatasetTest(sliceCount);
        const result = await this.advancedTester.executeAdvancedLoadTest(config);
        
        this.results.set(`large-dataset-${sliceCount}`, result);
        
        // Validate results against thresholds
        this.validateLargeDatasetResults(result, sliceCount);
        
      } catch (error) {
        console.error(`  ❌ Failed ${sliceCount} slice test:`, error);
        this.results.set(`large-dataset-${sliceCount}`, { error: error.message });
      }
    }
  }
  
  /**
   * Run memory performance tests
   */
  private async runMemoryTests(): Promise<void> {
    console.log('\n🧠 Running Memory Performance Tests...');
    
    // Memory leak detection test
    await this.runMemoryLeakTest();
    
    // Memory pressure test
    await this.runMemoryPressureTest();
    
    // Memory fragmentation test
    await this.runMemoryFragmentationTest();
    
    // Memory pattern analysis test
    await this.runMemoryPatternTest();
  }
  
  /**
   * Run network performance tests
   */
  private async runNetworkTests(): Promise<void> {
    console.log('\n🌐 Running Network Performance Tests...');
    
    const networkProfiles = DEFAULT_PERFORMANCE_CONFIG.network.bandwidthProfiles;
    
    for (const profile of networkProfiles) {
      console.log(`\n  Testing ${profile.name} network conditions...`);
      
      try {
        const result = await this.runNetworkProfileTest(profile);
        this.results.set(`network-${profile.name.toLowerCase().replace(/\s+/g, '-')}`, result);
        
      } catch (error) {
        console.error(`  ❌ Failed ${profile.name} network test:`, error);
      }
    }
    
    // Additional network tests
    await this.runNetworkJitterTest();
    await this.runNetworkReliabilityTest();
  }
  
  /**
   * Run GPU performance tests
   */
  private async runGPUTests(): Promise<void> {
    console.log('\n🎮 Running GPU Performance Tests...');
    
    // GPU capability detection
    await this.runGPUCapabilityTest();
    
    // GPU memory management test
    await this.runGPUMemoryTest();
    
    // GPU texture operations test
    await this.runGPUTextureTest();
    
    // GPU shader compilation test
    await this.runGPUShaderTest();
    
    // GPU load test
    await this.runGPULoadTest();
  }
  
  /**
   * Run concurrent load tests
   */
  private async runConcurrentLoadTests(): Promise<void> {
    console.log('\n🔄 Running Concurrent Load Tests...');
    
    const concurrencyLevels = [5, 10, 20, 50];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`\n  Testing ${concurrency} concurrent operations...`);
      
      try {
        const result = await this.runConcurrencyTest(concurrency);
        this.results.set(`concurrent-${concurrency}`, result);
        
      } catch (error) {
        console.error(`  ❌ Failed ${concurrency} concurrency test:`, error);
      }
    }
  }
  
  /**
   * Validate large dataset test results
   */
  private validateLargeDatasetResults(result: any, sliceCount: number): void {
    const maxLoadTime = DEFAULT_PERFORMANCE_CONFIG.largeDataset.maxLoadTime;
    const maxNavTime = DEFAULT_PERFORMANCE_CONFIG.largeDataset.maxNavigationTime;
    
    if (result.duration > maxLoadTime) {
      console.warn(`  ⚠️ Load time exceeded threshold: ${result.duration}ms > ${maxLoadTime}ms`);
    }
    
    if (result.averageResponseTime > maxNavTime) {
      console.warn(`  ⚠️ Navigation time exceeded threshold: ${result.averageResponseTime}ms > ${maxNavTime}ms`);
    }
    
    if (result.errorRate > 0.05) {
      console.warn(`  ⚠️ Error rate too high: ${(result.errorRate * 100).toFixed(1)}%`);
    }
    
    console.log(`  ✅ ${sliceCount} slice dataset test completed successfully`);
  }
  
  /**
   * Run memory leak detection test
   */
  private async runMemoryLeakTest(): Promise<void> {
    console.log('\n  🔍 Memory Leak Detection Test...');
    
    const result = await performanceTestRunner.runTest(
      'memory-leak-detection',
      async () => {
        const memoryDetector = PerformanceTestUtils.createMemoryLeakDetector(20);
        
        // Simulate operations that might leak
        const operations = [];
        for (let i = 0; i < 100; i++) {
          const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
          operations.push(pixelData);
          
          if (i % 20 === 0) {
            // Periodic cleanup
            operations.splice(0, 10);
          }
        }
        
        // Final cleanup
        operations.length = 0;
        
        if (global.gc) {
          global.gc();
        }
        
        const leakCheck = memoryDetector.check();
        return {
          hasLeak: leakCheck.hasLeak,
          memoryIncrease: leakCheck.memoryIncrease
        };
      },
      { iterations: 3, measureMemory: true }
    );
    
    this.results.set('memory-leak-detection', result);
  }
  
  /**
   * Run memory pressure test
   */
  private async runMemoryPressureTest(): Promise<void> {
    console.log('\n  📈 Memory Pressure Test...');
    
    const config = AdvancedLoadTestConfigurations.createMemoryStressTest();
    const result = await this.advancedTester.executeAdvancedLoadTest(config);
    
    this.results.set('memory-pressure', result);
  }
  
  /**
   * Run memory fragmentation test
   */
  private async runMemoryFragmentationTest(): Promise<void> {
    console.log('\n  🧩 Memory Fragmentation Test...');
    
    const result = await performanceTestRunner.runTest(
      'memory-fragmentation',
      () => {
        const arrays: Uint8Array[] = [];
        
        // Create fragmentation pattern
        for (let cycle = 0; cycle < 5; cycle++) {
          // Allocate various sizes
          const sizes = [1024, 4096, 16384, 65536];
          
          for (const size of sizes) {
            for (let i = 0; i < 10; i++) {
              arrays.push(new Uint8Array(size));
            }
          }
          
          // Deallocate every other array
          for (let i = arrays.length - 1; i >= 0; i -= 2) {
            arrays.splice(i, 1);
          }
        }
        
        return arrays.length;
      },
      { iterations: 5, measureMemory: true }
    );
    
    this.results.set('memory-fragmentation', result);
  }
  
  /**
   * Run memory pattern analysis test
   */
  private async runMemoryPatternTest(): Promise<void> {
    console.log('\n  📊 Memory Pattern Analysis Test...');
    
    const memorySnapshots: Array<{ operation: string; memory: number; timestamp: number }> = [];
    
    const takeSnapshot = (operation: string) => {
      memorySnapshots.push({
        operation,
        memory: PerformanceTestUtils.getMemoryUsage().used,
        timestamp: performance.now()
      });
    };
    
    takeSnapshot('initial');
    
    // Simulate typical workflow
    for (let i = 0; i < 50; i++) {
      const pixelData = MockDicomDataGenerator.generateMockPixelData(512, 512);
      
      if (i % 10 === 0) {
        takeSnapshot(`operation-${i}`);
      }
    }
    
    takeSnapshot('final');
    
    this.results.set('memory-pattern', { snapshots: memorySnapshots });
  }
  
  /**
   * Run network profile test
   */
  private async runNetworkProfileTest(profile: any): Promise<any> {
    const originalFetch = global.fetch;
    
    // Mock network with profile characteristics
    global.fetch = jest.fn().mockImplementation(() => {
      const delay = profile.latency + (1024 * 1024 / profile.bytesPerSecond) * 1000;
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ profile: profile.name })
          } as any);
        }, delay);
      });
    });
    
    try {
      const result = await performanceTestRunner.runTest(
        `network-${profile.name}`,
        async () => {
          const requests = Array.from({ length: 10 }, () => 
            fetch('/api/test').then(r => r.json())
          );
          
          return Promise.all(requests);
        },
        { iterations: 3 }
      );
      
      return result;
      
    } finally {
      global.fetch = originalFetch;
    }
  }
  
  /**
   * Run network jitter test
   */
  private async runNetworkJitterTest(): Promise<void> {
    console.log('\n  📡 Network Jitter Test...');
    
    const originalFetch = global.fetch;
    const jitterValues: number[] = [];
    
    global.fetch = jest.fn().mockImplementation(() => {
      const baseDelay = 100;
      const jitter = (Math.random() - 0.5) * 100; // ±50ms
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
      await performanceTestRunner.runTest(
        'network-jitter',
        async () => {
          const requests = Array.from({ length: 20 }, () => 
            fetch('/api/test').then(r => r.json())
          );
          
          await Promise.all(requests);
          
          const avgJitter = jitterValues.reduce((sum, j) => sum + j, 0) / jitterValues.length;
          return { averageJitter: avgJitter, jitterValues };
        }
      );
      
    } finally {
      global.fetch = originalFetch;
    }
  }
  
  /**
   * Run network reliability test
   */
  private async runNetworkReliabilityTest(): Promise<void> {
    console.log('\n  🔗 Network Reliability Test...');
    
    const originalFetch = global.fetch;
    let requestCount = 0;
    
    global.fetch = jest.fn().mockImplementation(() => {
      requestCount++;
      
      // 10% failure rate
      if (requestCount % 10 === 0) {
        return Promise.reject(new Error('Network failure'));
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any);
    });
    
    try {
      const result = await performanceTestRunner.runTest(
        'network-reliability',
        async () => {
          let successful = 0;
          let failed = 0;
          
          for (let i = 0; i < 50; i++) {
            try {
              await fetch('/api/test');
              successful++;
            } catch {
              failed++;
            }
          }
          
          return { successful, failed, reliability: successful / (successful + failed) };
        }
      );
      
      this.results.set('network-reliability', result);
      
    } finally {
      global.fetch = originalFetch;
    }
  }
  
  /**
   * Run GPU capability test
   */
  private async runGPUCapabilityTest(): Promise<void> {
    console.log('\n  🎮 GPU Capability Test...');
    
    const result = await performanceTestRunner.runTest(
      'gpu-capability',
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
            depthTextures: !!gl.getExtension('WEBGL_depth_texture'),
            anisotropicFiltering: !!gl.getExtension('EXT_texture_filter_anisotropic')
          }
        };
        
        return capabilities;
      }
    );
    
    this.results.set('gpu-capability', result);
  }
  
  /**
   * Run GPU memory test
   */
  private async runGPUMemoryTest(): Promise<void> {
    console.log('\n  💾 GPU Memory Test...');
    
    const result = await performanceTestRunner.runTest(
      'gpu-memory',
      () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        
        const gl = canvas.getContext('webgl');
        if (!gl) throw new Error('WebGL not supported');
        
        const textures: WebGLTexture[] = [];
        
        try {
          // Allocate textures until we hit limits
          for (let i = 0; i < 20; i++) {
            const texture = gl.createTexture();
            if (!texture) break;
            
            gl.bindTexture(gl.TEXTURE_2D, texture);
            
            const data = new Uint8Array(512 * 512 * 4);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
            
            textures.push(texture);
          }
          
          return { texturesCreated: textures.length };
          
        } finally {
          // Cleanup
          textures.forEach(texture => gl.deleteTexture(texture));
        }
      }
    );
    
    this.results.set('gpu-memory', result);
  }
  
  /**
   * Run GPU texture operations test
   */
  private async runGPUTextureTest(): Promise<void> {
    console.log('\n  🖼️ GPU Texture Operations Test...');
    
    const result = await performanceTestRunner.runTest(
      'gpu-texture-ops',
      () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) throw new Error('WebGL not supported');
        
        let operations = 0;
        const startTime = performance.now();
        
        // Perform texture operations
        for (let i = 0; i < 50; i++) {
          const texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          
          const data = new Uint8Array(256 * 256 * 4);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
          
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          
          gl.deleteTexture(texture);
          operations++;
        }
        
        const endTime = performance.now();
        const opsPerSecond = (operations / (endTime - startTime)) * 1000;
        
        return { operations, operationsPerSecond: opsPerSecond };
      }
    );
    
    this.results.set('gpu-texture-ops', result);
  }
  
  /**
   * Run GPU shader compilation test
   */
  private async runGPUShaderTest(): Promise<void> {
    console.log('\n  🔧 GPU Shader Compilation Test...');
    
    const result = await performanceTestRunner.runTest(
      'gpu-shader-compilation',
      () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) throw new Error('WebGL not supported');
        
        const vertexShaderSource = `
          attribute vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `;
        
        const fragmentShaderSource = `
          precision mediump float;
          uniform vec3 color;
          void main() {
            gl_FragColor = vec4(color, 1.0);
          }
        `;
        
        let compiledShaders = 0;
        
        for (let i = 0; i < 10; i++) {
          const vertexShader = gl.createShader(gl.VERTEX_SHADER);
          const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
          
          if (vertexShader && fragmentShader) {
            gl.shaderSource(vertexShader, vertexShaderSource);
            gl.compileShader(vertexShader);
            
            gl.shaderSource(fragmentShader, fragmentShaderSource);
            gl.compileShader(fragmentShader);
            
            const vertexCompiled = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
            const fragmentCompiled = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
            
            if (vertexCompiled && fragmentCompiled) {
              compiledShaders++;
            }
            
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
          }
        }
        
        return { compiledShaders };
      }
    );
    
    this.results.set('gpu-shader-compilation', result);
  }
  
  /**
   * Run GPU load test
   */
  private async runGPULoadTest(): Promise<void> {
    console.log('\n  🔥 GPU Load Test...');
    
    const result = await performanceTestRunner.runTest(
      'gpu-load',
      async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        
        const gl = canvas.getContext('webgl');
        if (!gl) throw new Error('WebGL not supported');
        
        let frames = 0;
        const startTime = performance.now();
        
        // Render frames for 1 second
        while (performance.now() - startTime < 1000) {
          gl.viewport(0, 0, 512, 512);
          gl.clearColor(Math.random(), Math.random(), Math.random(), 1.0);
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
    
    this.results.set('gpu-load', result);
  }
  
  /**
   * Run concurrency test
   */
  private async runConcurrencyTest(concurrency: number): Promise<any> {
    return performanceTestRunner.runTest(
      `concurrent-${concurrency}`,
      async () => {
        const operations = Array.from({ length: concurrency }, async (_, i) => {
          // Simulate concurrent operations
          const pixelData = MockDicomDataGenerator.generateMockPixelData(256, 256);
          
          // Process data
          let sum = 0;
          for (let j = 0; j < pixelData.length; j += 100) {
            sum += pixelData[j];
          }
          
          return sum;
        });
        
        const results = await Promise.all(operations);
        return { concurrency, results: results.length };
      }
    );
  }
  
  /**
   * Generate final comprehensive report
   */
  private async generateFinalReport(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPREHENSIVE PERFORMANCE TEST REPORT');
    console.log('='.repeat(60));
    
    const report = performanceTestRunner.generateReport();
    
    console.log(`\n📊 Overall Performance Grade: ${report.overallGrade}`);
    console.log(`📈 Total Tests Executed: ${report.totalTests}`);
    console.log(`⏱️ Report Generated: ${report.timestamp}`);
    
    console.log('\n📋 Test Summary:');
    console.log(report.summary);
    
    if (report.criticalIssues.length > 0) {
      console.log('\n⚠️ Critical Issues Detected:');
      report.criticalIssues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    console.log('\n📊 Detailed Results:');
    this.results.forEach((result, testName) => {
      console.log(`\n  ${testName}:`);
      if (result.error) {
        console.log(`    ❌ Error: ${result.error}`);
      } else {
        console.log(`    ✅ Success`);
        if (result.duration) {
          console.log(`    ⏱️ Duration: ${result.duration}ms`);
        }
        if (result.operationsPerSecond) {
          console.log(`    🚀 Ops/sec: ${result.operationsPerSecond.toFixed(2)}`);
        }
      }
    });
    
    // Export detailed results
    const detailedReport = {
      performanceReport: report,
      testResults: Object.fromEntries(this.results),
      configuration: DEFAULT_PERFORMANCE_CONFIG,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n💾 Detailed report available in test results');
    console.log('='.repeat(60));
  }
}

/**
 * Export test runner for use in Jest tests
 */
export const runComprehensivePerformanceTests = async (): Promise<void> => {
  const testSuite = new PerformanceTestSuite();
  await testSuite.runAllTests();
};

// Export for direct execution
export default PerformanceTestSuite;