/**
 * Performance Testing Configuration
 * Configuration and utilities for comprehensive performance testing
 */

export interface PerformanceTestConfig {
  // Large dataset testing thresholds
  largeDataset: {
    sliceCount1K: number;
    sliceCount2K: number;
    sliceCount5K: number;
    sliceCount10K: number;
    maxLoadTime: number;
    maxNavigationTime: number;
  };
  
  // Memory testing thresholds
  memory: {
    leakThreshold: number; // Percentage
    pressureTestSize: number; // Bytes
    fragmentationCycles: number;
    maxMemoryIncrease: number; // Percentage
  };
  
  // Network testing parameters
  network: {
    slowConnectionDelay: number; // ms
    timeoutDelay: number; // ms
    jitterRange: number; // ms
    packetLossRate: number; // 0-1
    bandwidthProfiles: Array<{
      name: string;
      bytesPerSecond: number;
      latency: number;
    }>;
  };
  
  // GPU testing parameters
  gpu: {
    maxTextureSize: number;
    minFrameRate: number; // FPS
    maxShaderCompileTime: number; // ms
    loadTestFrames: number;
    memoryTestTextures: number;
  };
  
  // General performance thresholds
  general: {
    fastOperation: number; // ms
    mediumOperation: number; // ms
    slowOperation: number; // ms
    concurrentOperations: number;
  };
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceTestConfig = {
  largeDataset: {
    sliceCount1K: 1000,
    sliceCount2K: 2000,
    sliceCount5K: 5000,
    sliceCount10K: 10000,
    maxLoadTime: 30000, // 30 seconds
    maxNavigationTime: 100 // 100ms per slice navigation
  },
  
  memory: {
    leakThreshold: 25, // 25% memory increase threshold
    pressureTestSize: 100 * 1024 * 1024, // 100MB
    fragmentationCycles: 10,
    maxMemoryIncrease: 50 // 50% max increase during operations
  },
  
  network: {
    slowConnectionDelay: 2000, // 2 seconds
    timeoutDelay: 5000, // 5 seconds
    jitterRange: 200, // ±200ms
    packetLossRate: 0.05, // 5%
    bandwidthProfiles: [
      { name: '56k Modem', bytesPerSecond: 7000, latency: 500 },
      { name: '3G Mobile', bytesPerSecond: 384000, latency: 200 },
      { name: 'DSL', bytesPerSecond: 1500000, latency: 50 },
      { name: 'Broadband', bytesPerSecond: 10000000, latency: 10 },
      { name: 'Fiber', bytesPerSecond: 100000000, latency: 5 }
    ]
  },
  
  gpu: {
    maxTextureSize: 4096,
    minFrameRate: 30, // 30 FPS minimum
    maxShaderCompileTime: 100, // 100ms
    loadTestFrames: 100,
    memoryTestTextures: 50
  },
  
  general: {
    fastOperation: 10, // 10ms
    mediumOperation: 100, // 100ms
    slowOperation: 1000, // 1 second
    concurrentOperations: 20
  }
};

/**
 * Performance test result analyzer
 */
export class PerformanceAnalyzer {
  private results: Map<string, PerformanceResult[]> = new Map();
  
  /**
   * Record a performance test result
   */
  recordResult(testName: string, result: PerformanceResult): void {
    if (!this.results.has(testName)) {
      this.results.set(testName, []);
    }
    this.results.get(testName)!.push(result);
  }
  
  /**
   * Analyze performance trends
   */
  analyzePerformance(testName: string): PerformanceAnalysis {
    const results = this.results.get(testName) || [];
    
    if (results.length === 0) {
      throw new Error(`No results found for test: ${testName}`);
    }
    
    const times = results.map(r => r.executionTime);
    const memoryUsages = results.map(r => r.memoryUsage || 0);
    
    return {
      testName,
      totalRuns: results.length,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      standardDeviation: this.calculateStandardDeviation(times),
      averageMemoryUsage: memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length,
      successRate: results.filter(r => r.success).length / results.length,
      performanceGrade: this.calculatePerformanceGrade(results),
      recommendations: this.generateRecommendations(results)
    };
  }
  
  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const analyses = Array.from(this.results.keys()).map(testName => 
      this.analyzePerformance(testName)
    );
    
    return {
      timestamp: new Date().toISOString(),
      totalTests: analyses.length,
      overallGrade: this.calculateOverallGrade(analyses),
      analyses,
      summary: this.generateSummary(analyses),
      criticalIssues: this.identifyCriticalIssues(analyses)
    };
  }
  
  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }
  
  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(results: PerformanceResult[]): PerformanceGrade {
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    const successRate = results.filter(r => r.success).length / results.length;
    
    if (successRate < 0.8) return 'F';
    if (avgTime > 5000) return 'D';
    if (avgTime > 2000) return 'C';
    if (avgTime > 1000) return 'B';
    return 'A';
  }
  
  /**
   * Calculate overall grade
   */
  private calculateOverallGrade(analyses: PerformanceAnalysis[]): PerformanceGrade {
    const gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
    const avgGrade = analyses.reduce((sum, analysis) => 
      sum + gradeValues[analysis.performanceGrade], 0
    ) / analyses.length;
    
    if (avgGrade >= 3.5) return 'A';
    if (avgGrade >= 2.5) return 'B';
    if (avgGrade >= 1.5) return 'C';
    if (avgGrade >= 0.5) return 'D';
    return 'F';
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(results: PerformanceResult[]): string[] {
    const recommendations: string[] = [];
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    const avgMemory = results.reduce((sum, r) => sum + (r.memoryUsage || 0), 0) / results.length;
    const successRate = results.filter(r => r.success).length / results.length;
    
    if (successRate < 0.9) {
      recommendations.push('Improve error handling and reliability');
    }
    
    if (avgTime > 2000) {
      recommendations.push('Optimize execution time - consider caching or lazy loading');
    }
    
    if (avgMemory > 100 * 1024 * 1024) { // 100MB
      recommendations.push('Optimize memory usage - implement better cleanup');
    }
    
    const timeVariance = this.calculateStandardDeviation(results.map(r => r.executionTime));
    if (timeVariance > avgTime * 0.5) {
      recommendations.push('Reduce performance variance - inconsistent execution times detected');
    }
    
    return recommendations;
  }
  
  /**
   * Generate summary
   */
  private generateSummary(analyses: PerformanceAnalysis[]): string {
    const totalTests = analyses.length;
    const avgSuccessRate = analyses.reduce((sum, a) => sum + a.successRate, 0) / totalTests;
    const avgTime = analyses.reduce((sum, a) => sum + a.averageTime, 0) / totalTests;
    
    return `Performance Summary: ${totalTests} tests completed with ${(avgSuccessRate * 100).toFixed(1)}% success rate and ${avgTime.toFixed(2)}ms average execution time.`;
  }
  
  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(analyses: PerformanceAnalysis[]): string[] {
    const issues: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis.successRate < 0.8) {
        issues.push(`${analysis.testName}: Low success rate (${(analysis.successRate * 100).toFixed(1)}%)`);
      }
      
      if (analysis.performanceGrade === 'F') {
        issues.push(`${analysis.testName}: Critical performance failure`);
      }
      
      if (analysis.maxTime > 10000) {
        issues.push(`${analysis.testName}: Excessive maximum execution time (${analysis.maxTime.toFixed(2)}ms)`);
      }
    });
    
    return issues;
  }
}

/**
 * Performance test interfaces
 */
export interface PerformanceResult {
  testName: string;
  executionTime: number;
  memoryUsage?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceAnalysis {
  testName: string;
  totalRuns: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  averageMemoryUsage: number;
  successRate: number;
  performanceGrade: PerformanceGrade;
  recommendations: string[];
}

export interface PerformanceReport {
  timestamp: string;
  totalTests: number;
  overallGrade: PerformanceGrade;
  analyses: PerformanceAnalysis[];
  summary: string;
  criticalIssues: string[];
}

export type PerformanceGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Performance test utilities
 */
export class PerformanceTestRunner {
  private analyzer = new PerformanceAnalyzer();
  private config: PerformanceTestConfig;
  
  constructor(config: PerformanceTestConfig = DEFAULT_PERFORMANCE_CONFIG) {
    this.config = config;
  }
  
  /**
   * Run performance test with automatic result recording
   */
  async runTest<T>(
    testName: string,
    testFunction: () => Promise<T> | T,
    options: {
      iterations?: number;
      timeout?: number;
      measureMemory?: boolean;
    } = {}
  ): Promise<T> {
    const { iterations = 1, timeout = 30000, measureMemory = true } = options;
    
    let lastResult: T;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = measureMemory ? this.getMemoryUsage() : 0;
      
      try {
        // Run test with timeout
        lastResult = await Promise.race([
          Promise.resolve(testFunction()),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), timeout)
          )
        ]);
        
        const endTime = performance.now();
        const endMemory = measureMemory ? this.getMemoryUsage() : 0;
        
        this.analyzer.recordResult(testName, {
          testName,
          executionTime: endTime - startTime,
          memoryUsage: measureMemory ? endMemory - startMemory : undefined,
          success: true
        });
        
      } catch (error) {
        const endTime = performance.now();
        
        this.analyzer.recordResult(testName, {
          testName,
          executionTime: endTime - startTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    }
    
    return lastResult!;
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
   * Get performance analysis
   */
  getAnalysis(testName: string): PerformanceAnalysis {
    return this.analyzer.analyzePerformance(testName);
  }
  
  /**
   * Generate full performance report
   */
  generateReport(): PerformanceReport {
    return this.analyzer.generateReport();
  }
  
  /**
   * Export results to JSON
   */
  exportResults(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }
}

/**
 * Global performance test runner instance
 */
export const performanceTestRunner = new PerformanceTestRunner();