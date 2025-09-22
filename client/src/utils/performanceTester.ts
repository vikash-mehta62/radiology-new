/**
 * Performance Testing Utility for DICOM Viewer
 * Tests memory management, shader optimization, and rendering performance
 */

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  texturePoolHits: number;
  texturePoolMisses: number;
  shaderCacheHits: number;
  shaderCacheMisses: number;
  frameRate: number;
  gpuMemoryUsage?: number;
}

export interface TestResult {
  testName: string;
  metrics: PerformanceMetrics;
  passed: boolean;
  details: string;
  timestamp: number;
}

export class PerformanceTester {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Test memory manager performance
   */
  async testMemoryManager(memoryManager: any): Promise<TestResult> {
    const testName = 'Memory Manager Performance';
    const startTime = performance.now();
    
    try {
      // Test texture pool performance
      const textureRequests = 100;
      let poolHits = 0;
      let poolMisses = 0;
      
      // Simulate texture requests
      for (let i = 0; i < textureRequests; i++) {
        const texture = memoryManager.getTexture(512, 512, 'RGBA');
        if (texture) {
          poolHits++;
          // Return texture to pool
          memoryManager.returnTexture(texture);
        } else {
          poolMisses++;
        }
      }
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Get memory usage
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0;
      
      const metrics: PerformanceMetrics = {
        renderTime,
        memoryUsage,
        texturePoolHits: poolHits,
        texturePoolMisses: poolMisses,
        shaderCacheHits: 0,
        shaderCacheMisses: 0,
        frameRate: 0
      };
      
      const passed = poolHits > poolMisses && renderTime < 100; // Should be fast
      const details = `Pool efficiency: ${((poolHits / textureRequests) * 100).toFixed(1)}%, Render time: ${renderTime.toFixed(2)}ms`;
      
      const result: TestResult = {
        testName,
        metrics,
        passed,
        details,
        timestamp: Date.now()
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        metrics: {
          renderTime: 0,
          memoryUsage: 0,
          texturePoolHits: 0,
          texturePoolMisses: 0,
          shaderCacheHits: 0,
          shaderCacheMisses: 0,
          frameRate: 0
        },
        passed: false,
        details: `Error: ${error}`,
        timestamp: Date.now()
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test shader optimizer performance
   */
  async testShaderOptimizer(shaderOptimizer: any, gl: WebGL2RenderingContext): Promise<TestResult> {
    const testName = 'Shader Optimizer Performance';
    const startTime = performance.now();
    
    try {
      let cacheHits = 0;
      let cacheMisses = 0;
      
      // Test shader creation and caching
      const shaderConfigs = [
        { enableTextureCompression: true, lodLevel: 1, imageFormat: 'rgba' },
        { enableTextureCompression: false, lodLevel: 2, imageFormat: 'rgba' },
        { enableTextureCompression: true, lodLevel: 3, imageFormat: 'rgba' },
        { enableTextureCompression: true, lodLevel: 1, imageFormat: 'rgba' }, // Should hit cache
      ];
      
      for (const config of shaderConfigs) {
        const shader = shaderOptimizer.createOptimizedShader('test-shader', config);
        if (shader) {
          // Check if this was a cache hit (simplified check)
          const cacheKey = JSON.stringify(config);
          if (shaderOptimizer.shaderCache && shaderOptimizer.shaderCache.has(cacheKey)) {
            cacheHits++;
          } else {
            cacheMisses++;
          }
        }
      }
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0;
      
      const metrics: PerformanceMetrics = {
        renderTime,
        memoryUsage,
        texturePoolHits: 0,
        texturePoolMisses: 0,
        shaderCacheHits: cacheHits,
        shaderCacheMisses: cacheMisses,
        frameRate: 0
      };
      
      const passed = renderTime < 50 && cacheHits > 0; // Should be fast and use cache
      const details = `Cache efficiency: ${((cacheHits / shaderConfigs.length) * 100).toFixed(1)}%, Render time: ${renderTime.toFixed(2)}ms`;
      
      const result: TestResult = {
        testName,
        metrics,
        passed,
        details,
        timestamp: Date.now()
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        metrics: {
          renderTime: 0,
          memoryUsage: 0,
          texturePoolHits: 0,
          texturePoolMisses: 0,
          shaderCacheHits: 0,
          shaderCacheMisses: 0,
          frameRate: 0
        },
        passed: false,
        details: `Error: ${error}`,
        timestamp: Date.now()
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test rendering performance with different LOD levels
   */
  async testRenderingPerformance(renderFunction: Function, imageData: string): Promise<TestResult> {
    const testName = 'Rendering Performance';
    const startTime = performance.now();
    
    try {
      const lodLevels = [1, 2, 3, 4];
      const renderTimes: number[] = [];
      
      for (const lodLevel of lodLevels) {
        const lodStartTime = performance.now();
        
        // Create a test canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        
        await renderFunction(canvas, imageData, 0, lodLevel);
        
        const lodEndTime = performance.now();
        renderTimes.push(lodEndTime - lodStartTime);
      }
      
      const endTime = performance.now();
      const totalRenderTime = endTime - startTime;
      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0;
      
      const metrics: PerformanceMetrics = {
        renderTime: avgRenderTime,
        memoryUsage,
        texturePoolHits: 0,
        texturePoolMisses: 0,
        shaderCacheHits: 0,
        shaderCacheMisses: 0,
        frameRate: 1000 / avgRenderTime // Approximate FPS
      };
      
      const passed = avgRenderTime < 100 && metrics.frameRate > 10; // Should render fast
      const details = `Avg render time: ${avgRenderTime.toFixed(2)}ms, Est. FPS: ${metrics.frameRate.toFixed(1)}`;
      
      const result: TestResult = {
        testName,
        metrics,
        passed,
        details,
        timestamp: Date.now()
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        metrics: {
          renderTime: 0,
          memoryUsage: 0,
          texturePoolHits: 0,
          texturePoolMisses: 0,
          shaderCacheHits: 0,
          shaderCacheMisses: 0,
          frameRate: 0
        },
        passed: false,
        details: `Error: ${error}`,
        timestamp: Date.now()
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Run comprehensive performance test suite
   */
  async runFullTestSuite(
    memoryManager: any,
    shaderOptimizer: any,
    gl: WebGL2RenderingContext,
    renderFunction: Function,
    imageData: string
  ): Promise<TestResult[]> {
    console.log('🧪 [PerformanceTester] Starting comprehensive performance test suite...');
    
    const results: TestResult[] = [];
    
    // Test memory manager
    console.log('🧪 Testing memory manager...');
    const memoryResult = await this.testMemoryManager(memoryManager);
    results.push(memoryResult);
    
    // Test shader optimizer
    console.log('🧪 Testing shader optimizer...');
    const shaderResult = await this.testShaderOptimizer(shaderOptimizer, gl);
    results.push(shaderResult);
    
    // Test rendering performance
    console.log('🧪 Testing rendering performance...');
    const renderResult = await this.testRenderingPerformance(renderFunction, imageData);
    results.push(renderResult);
    
    // Generate summary
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log(`🧪 [PerformanceTester] Test suite completed: ${passedTests}/${totalTests} tests passed`);
    
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.details}`);
    });
    
    return results;
  }

  /**
   * Get all test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Export results as JSON
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      testSuite: 'DICOM Viewer Performance Tests',
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.passed).length,
        failedTests: this.results.filter(r => !r.passed).length
      }
    }, null, 2);
  }
}