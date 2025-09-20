/**
 * Performance Test Setup
 * Special setup for performance and benchmark tests
 */

import { PerformanceTestUtils } from './services/__tests__/testUtils';

// Extend Jest matchers for performance testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toCompleteWithin(milliseconds: number): R;
      toNotLeakMemory(thresholdPercent?: number): R;
      toHavePerformanceMetrics(): R;
    }
  }
}

// Custom Jest matchers for performance testing
expect.extend({
  toCompleteWithin(received: () => Promise<any> | any, milliseconds: number) {
    const start = performance.now();
    
    try {
      const result = typeof received === 'function' ? received() : received;
      
      if (result && typeof result.then === 'function') {
        // Handle async operations
        return result.then(() => {
          const duration = performance.now() - start;
          const pass = duration <= milliseconds;
          
          return {
            message: () => 
              `Expected operation to complete within ${milliseconds}ms, but took ${duration.toFixed(2)}ms`,
            pass
          };
        });
      } else {
        // Handle sync operations
        const duration = performance.now() - start;
        const pass = duration <= milliseconds;
        
        return {
          message: () => 
            `Expected operation to complete within ${milliseconds}ms, but took ${duration.toFixed(2)}ms`,
          pass
        };
      }
    } catch (error) {
      return {
        message: () => `Operation failed: ${error}`,
        pass: false
      };
    }
  },

  toNotLeakMemory(received: () => void, thresholdPercent = 20) {
    const detector = PerformanceTestUtils.createMemoryLeakDetector(thresholdPercent);
    
    // Execute the operation
    received();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const leakCheck = detector.check();
    
    return {
      message: () => 
        `Expected memory increase to be less than ${thresholdPercent}%, but was ${leakCheck.memoryIncrease.toFixed(2)}%`,
      pass: !leakCheck.hasLeak
    };
  },

  toHavePerformanceMetrics(received: any) {
    const hasMetrics = received && 
      typeof received === 'object' &&
      ('averageTime' in received || 'times' in received || 'memoryUsage' in received);
    
    return {
      message: () => 
        hasMetrics 
          ? 'Expected object to not have performance metrics'
          : 'Expected object to have performance metrics (averageTime, times, or memoryUsage)',
      pass: hasMetrics
    };
  }
});

// Performance test configuration
const PERFORMANCE_CONFIG = {
  // Benchmark thresholds (in milliseconds)
  FAST_OPERATION: 10,
  MEDIUM_OPERATION: 100,
  SLOW_OPERATION: 1000,
  
  // Memory thresholds (in percentage)
  MEMORY_LEAK_THRESHOLD: 15,
  MEMORY_WARNING_THRESHOLD: 10,
  
  // Iteration counts for benchmarks
  LIGHT_ITERATIONS: 10,
  MEDIUM_ITERATIONS: 100,
  HEAVY_ITERATIONS: 1000
};

// Global performance utilities for tests
global.performanceUtils = {
  config: PERFORMANCE_CONFIG,
  
  // Quick benchmark function
  benchmark: async (name: string, operation: () => any, targetTime?: number) => {
    const target = targetTime || PERFORMANCE_CONFIG.MEDIUM_OPERATION;
    const benchmark = PerformanceTestUtils.createBenchmark(name, target);
    return benchmark.run(operation);
  },
  
  // Memory usage snapshot
  memorySnapshot: () => PerformanceTestUtils.getMemoryUsage(),
  
  // Wait for stable memory (useful after operations)
  waitForStableMemory: async (timeout = 5000) => {
    const start = Date.now();
    let lastMemory = PerformanceTestUtils.getMemoryUsage().used;
    
    while (Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (global.gc) {
        global.gc();
      }
      
      const currentMemory = PerformanceTestUtils.getMemoryUsage().used;
      const memoryChange = Math.abs(currentMemory - lastMemory) / lastMemory;
      
      if (memoryChange < 0.01) { // Less than 1% change
        return true;
      }
      
      lastMemory = currentMemory;
    }
    
    return false;
  }
};

// Set longer timeout for performance tests
jest.setTimeout(120000);

// Increase test timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(300000); // 5 minutes for CI
}

// Log performance test setup
console.log('⚡ Performance test setup complete');
console.log(`  Fast operation threshold: ${PERFORMANCE_CONFIG.FAST_OPERATION}ms`);
console.log(`  Medium operation threshold: ${PERFORMANCE_CONFIG.MEDIUM_OPERATION}ms`);
console.log(`  Slow operation threshold: ${PERFORMANCE_CONFIG.SLOW_OPERATION}ms`);
console.log(`  Memory leak threshold: ${PERFORMANCE_CONFIG.MEMORY_LEAK_THRESHOLD}%`);

// Performance test hooks
beforeEach(() => {
  // Reset performance monitoring
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    performance.clearMarks();
    performance.clearMeasures();
  }
});

afterEach(() => {
  // Force garbage collection after each performance test
  if (global.gc) {
    global.gc();
  }
});

export {};