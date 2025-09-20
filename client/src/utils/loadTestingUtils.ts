/**
 * Load Testing Utilities
 * Specialized utilities for performance and load testing
 */

export interface LoadTestConfig {
  name: string;
  duration: number; // ms
  concurrency: number;
  rampUpTime: number; // ms
  operations: LoadTestOperation[];
  thresholds: {
    maxResponseTime: number;
    maxErrorRate: number;
    maxMemoryIncrease: number;
  };
}

export interface LoadTestOperation {
  name: string;
  weight: number; // 0-1, probability of execution
  execute: () => Promise<any> | any;
  timeout: number;
}

export interface LoadTestResult {
  config: LoadTestConfig;
  startTime: string;
  endTime: string;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  operationsPerSecond: number;
  errorRate: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    increase: number;
  };
  operationStats: {
    [operationName: string]: {
      count: number;
      totalTime: number;
      averageTime: number;
      errors: number;
    };
  };
  errors: Array<{
    operation: string;
    error: string;
    timestamp: string;
  }>;
}

export class LoadTester {
  private isRunning = false;
  private results: LoadTestResult | null = null;

  /**
   * Execute load test
   */
  public async executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    if (this.isRunning) {
      throw new Error('Load test already running');
    }

    this.isRunning = true;
    console.log(`🚀 Starting load test: ${config.name}`);

    const startTime = Date.now();
    const initialMemory = this.getMemoryUsage();
    
    const result: LoadTestResult = {
      config,
      startTime: new Date(startTime).toISOString(),
      endTime: '',
      duration: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      operationsPerSecond: 0,
      errorRate: 0,
      memoryUsage: {
        initial: initialMemory,
        peak: initialMemory,
        final: 0,
        increase: 0
      },
      operationStats: {},
      errors: []
    };

    // Initialize operation stats
    config.operations.forEach(op => {
      result.operationStats[op.name] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0
      };
    });

    try {
      // Create worker pool
      const workers = Array.from({ length: config.concurrency }, (_, i) => 
        this.createWorker(i, config, result)
      );

      // Start workers with ramp-up
      const rampUpDelay = config.rampUpTime / config.concurrency;
      for (let i = 0; i < workers.length; i++) {
        setTimeout(() => {
          workers[i].start();
        }, i * rampUpDelay);
      }

      // Monitor memory usage during test
      const memoryMonitor = setInterval(() => {
        const currentMemory = this.getMemoryUsage();
        if (currentMemory > result.memoryUsage.peak) {
          result.memoryUsage.peak = currentMemory;
        }
      }, 1000);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, config.duration));

      // Stop all workers
      workers.forEach(worker => worker.stop());
      clearInterval(memoryMonitor);

      // Wait for workers to finish
      await Promise.all(workers.map(worker => worker.waitForCompletion()));

      const endTime = Date.now();
      result.endTime = new Date(endTime).toISOString();
      result.duration = endTime - startTime;
      result.memoryUsage.final = this.getMemoryUsage();
      result.memoryUsage.increase = result.memoryUsage.final - result.memoryUsage.initial;

      // Calculate final statistics
      this.calculateFinalStats(result);

      console.log(`✅ Load test completed: ${config.name}`);
      this.logResults(result);

      this.results = result;
      return result;

    } catch (error) {
      console.error(`❌ Load test failed: ${config.name}`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create worker for load testing
   */
  private createWorker(workerId: number, config: LoadTestConfig, result: LoadTestResult) {
    let isRunning = false;
    let operationCount = 0;

    return {
      start: () => {
        isRunning = true;
        this.runWorkerLoop(workerId, config, result, () => isRunning, () => operationCount++);
      },
      
      stop: () => {
        isRunning = false;
      },
      
      waitForCompletion: () => {
        return new Promise<void>(resolve => {
          const checkCompletion = () => {
            if (!isRunning) {
              resolve();
            } else {
              setTimeout(checkCompletion, 10);
            }
          };
          checkCompletion();
        });
      },
      
      getOperationCount: () => operationCount
    };
  }

  /**
   * Run worker loop
   */
  private async runWorkerLoop(
    workerId: number,
    config: LoadTestConfig,
    result: LoadTestResult,
    isRunning: () => boolean,
    incrementCounter: () => void
  ): Promise<void> {
    while (isRunning()) {
      try {
        // Select operation based on weight
        const operation = this.selectOperation(config.operations);
        const operationStartTime = performance.now();

        // Execute operation with timeout
        await Promise.race([
          Promise.resolve(operation.execute()),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), operation.timeout)
          )
        ]);

        const operationEndTime = performance.now();
        const operationTime = operationEndTime - operationStartTime;

        // Update statistics
        result.totalOperations++;
        result.successfulOperations++;
        incrementCounter();

        // Update operation stats
        const stats = result.operationStats[operation.name];
        stats.count++;
        stats.totalTime += operationTime;
        stats.averageTime = stats.totalTime / stats.count;

        // Update global stats
        if (operationTime > result.maxResponseTime) {
          result.maxResponseTime = operationTime;
        }
        if (operationTime < result.minResponseTime) {
          result.minResponseTime = operationTime;
        }

      } catch (error) {
        result.totalOperations++;
        result.failedOperations++;
        incrementCounter();

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          operation: 'unknown',
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        // Update operation error stats
        const operation = this.selectOperation(config.operations);
        result.operationStats[operation.name].errors++;
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  /**
   * Select operation based on weight
   */
  private selectOperation(operations: LoadTestOperation[]): LoadTestOperation {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const operation of operations) {
      cumulativeWeight += operation.weight;
      if (random <= cumulativeWeight) {
        return operation;
      }
    }

    return operations[operations.length - 1];
  }

  /**
   * Calculate final statistics
   */
  private calculateFinalStats(result: LoadTestResult): void {
    if (result.totalOperations > 0) {
      result.errorRate = result.failedOperations / result.totalOperations;
      result.operationsPerSecond = result.totalOperations / (result.duration / 1000);
      
      const totalResponseTime = Object.values(result.operationStats)
        .reduce((sum, stats) => sum + stats.totalTime, 0);
      result.averageResponseTime = totalResponseTime / result.totalOperations;
    }

    if (result.minResponseTime === Infinity) {
      result.minResponseTime = 0;
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Log test results
   */
  private logResults(result: LoadTestResult): void {
    console.log(`\n📊 Load Test Results: ${result.config.name}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`Total Operations: ${result.totalOperations}`);
    console.log(`Success Rate: ${((result.successfulOperations / result.totalOperations) * 100).toFixed(2)}%`);
    console.log(`Operations/sec: ${result.operationsPerSecond.toFixed(2)}`);
    console.log(`Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${result.maxResponseTime.toFixed(2)}ms`);
    console.log(`Memory Increase: ${(result.memoryUsage.increase / 1024 / 1024).toFixed(2)}MB`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.slice(0, 5).forEach(error => {
        console.log(`  ${error.operation}: ${error.error}`);
      });
    }

    console.log(`\n📈 Operation Breakdown:`);
    Object.entries(result.operationStats).forEach(([name, stats]) => {
      console.log(`  ${name}: ${stats.count} ops, ${stats.averageTime.toFixed(2)}ms avg, ${stats.errors} errors`);
    });
  }

  /**
   * Get last test results
   */
  public getLastResults(): LoadTestResult | null {
    return this.results;
  }

  /**
   * Export results to JSON
   */
  public exportResults(): string {
    if (!this.results) {
      throw new Error('No test results available');
    }
    return JSON.stringify(this.results, null, 2);
  }
}

/**
 * Create predefined load test configurations
 */
export class LoadTestConfigurations {
  /**
   * Basic viewer operations load test
   */
  static createBasicViewerLoadTest(): LoadTestConfig {
    return {
      name: 'Basic Viewer Operations',
      duration: 30000, // 30 seconds
      concurrency: 5,
      rampUpTime: 5000, // 5 seconds
      operations: [
        {
          name: 'state-update',
          weight: 0.4,
          execute: () => {
            const manager = new UnifiedStateManager();
            manager.updateState('test', { value: Math.random() }, 'load-test');
            manager.cleanup();
          },
          timeout: 1000
        },
        {
          name: 'snapshot-creation',
          weight: 0.2,
          execute: () => {
            const manager = new UnifiedStateManager();
            manager.createSnapshot('Load test snapshot');
            manager.cleanup();
          },
          timeout: 2000
        },
        {
          name: 'mode-switch',
          weight: 0.3,
          execute: async () => {
            const mockServices = this.createMockServices();
            const viewerManager = new EnhancedViewerManager({}, mockServices);
            await viewerManager.switchMode('simple');
            viewerManager.cleanup();
          },
          timeout: 3000
        },
        {
          name: 'data-processing',
          weight: 0.1,
          execute: () => {
            const pixelData = new Uint16Array(512 * 512);
            for (let i = 0; i < pixelData.length; i++) {
              pixelData[i] = Math.floor(Math.random() * 4096);
            }
            return pixelData.reduce((sum, val) => sum + val, 0);
          },
          timeout: 1500
        }
      ],
      thresholds: {
        maxResponseTime: 1000,
        maxErrorRate: 0.05,
        maxMemoryIncrease: 100 * 1024 * 1024 // 100MB
      }
    };
  }

  /**
   * High-concurrency collaboration test
   */
  static createCollaborationLoadTest(): LoadTestConfig {
    return {
      name: 'Collaboration Load Test',
      duration: 60000, // 1 minute
      concurrency: 10,
      rampUpTime: 10000, // 10 seconds
      operations: [
        {
          name: 'viewport-sync',
          weight: 0.5,
          execute: () => {
            // Simulate viewport synchronization
            return Promise.resolve({
              viewport: {
                zoom: Math.random() * 5,
                pan: { x: Math.random() * 100, y: Math.random() * 100 }
              }
            });
          },
          timeout: 500
        },
        {
          name: 'cursor-sync',
          weight: 0.3,
          execute: () => {
            // Simulate cursor synchronization
            return Promise.resolve({
              x: Math.random() * 512,
              y: Math.random() * 512
            });
          },
          timeout: 200
        },
        {
          name: 'annotation-sync',
          weight: 0.15,
          execute: () => {
            // Simulate annotation synchronization
            return Promise.resolve({
              id: `annotation-${Date.now()}`,
              type: 'text',
              content: 'Load test annotation'
            });
          },
          timeout: 1000
        },
        {
          name: 'measurement-sync',
          weight: 0.05,
          execute: () => {
            // Simulate measurement synchronization
            return Promise.resolve({
              id: `measurement-${Date.now()}`,
              type: 'distance',
              value: Math.random() * 100
            });
          },
          timeout: 1000
        }
      ],
      thresholds: {
        maxResponseTime: 500,
        maxErrorRate: 0.02,
        maxMemoryIncrease: 50 * 1024 * 1024 // 50MB
      }
    };
  }

  /**
   * Memory stress test
   */
  static createMemoryStressTest(): LoadTestConfig {
    return {
      name: 'Memory Stress Test',
      duration: 45000, // 45 seconds
      concurrency: 3,
      rampUpTime: 5000,
      operations: [
        {
          name: 'large-array-creation',
          weight: 0.4,
          execute: () => {
            const largeArray = new Array(100000).fill(Math.random());
            const sum = largeArray.reduce((acc, val) => acc + val, 0);
            return sum;
          },
          timeout: 2000
        },
        {
          name: 'pixel-data-processing',
          weight: 0.4,
          execute: () => {
            const pixelData = new Uint16Array(1024 * 1024);
            for (let i = 0; i < pixelData.length; i++) {
              pixelData[i] = Math.floor(Math.random() * 4096);
            }
            
            // Simulate image processing
            let processed = 0;
            for (let i = 0; i < pixelData.length; i += 1024) {
              processed += pixelData.slice(i, i + 1024).reduce((sum, val) => sum + val, 0);
            }
            
            return processed;
          },
          timeout: 3000
        },
        {
          name: 'state-snapshot',
          weight: 0.2,
          execute: () => {
            const manager = new UnifiedStateManager();
            
            // Create large state
            for (let i = 0; i < 100; i++) {
              manager.updateState(`memory.${i}`, {
                data: new Array(1000).fill(Math.random())
              }, 'memory-stress');
            }
            
            const snapshot = manager.createSnapshot('Memory stress snapshot');
            manager.cleanup();
            
            return snapshot;
          },
          timeout: 5000
        }
      ],
      thresholds: {
        maxResponseTime: 3000,
        maxErrorRate: 0.1,
        maxMemoryIncrease: 200 * 1024 * 1024 // 200MB
      }
    };
  }

  /**
   * Create mock services for testing
   */
  private static createMockServices() {
    return {
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
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

/**
 * Network condition simulator
 */
export class NetworkSimulator {
  /**
   * Simulate network delay
   */
  static simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate network error
   */
  static simulateNetworkError(errorRate: number): void {
    if (Math.random() < errorRate) {
      throw new Error('Simulated network error');
    }
  }

  /**
   * Simulate bandwidth limitation
   */
  static simulateBandwidthLimit(dataSize: number, bandwidthMbps: number): Promise<void> {
    const transferTime = (dataSize * 8) / (bandwidthMbps * 1024 * 1024) * 1000; // ms
    return this.simulateDelay(transferTime);
  }

  /**
   * Create network condition presets
   */
  static getNetworkPresets() {
    return {
      fast: { delay: 10, errorRate: 0.001, bandwidth: 100 },
      medium: { delay: 100, errorRate: 0.01, bandwidth: 10 },
      slow: { delay: 500, errorRate: 0.05, bandwidth: 1 },
      unreliable: { delay: 200, errorRate: 0.1, bandwidth: 5 }
    };
  }
}

export { LoadTester };