/**
 * Memory Monitoring Utility for DICOM Viewer
 * Provides real-time memory usage tracking and analysis
 */

export interface MemorySnapshot {
  timestamp: number;
  jsHeapUsed: number;
  jsHeapTotal: number;
  jsHeapLimit: number;
  texturePoolSize?: number;
  texturePoolUsage?: number;
  shaderCacheSize?: number;
  renderingMemory?: number;
}

export interface MemoryAnalysis {
  averageUsage: number;
  peakUsage: number;
  memoryLeaks: boolean;
  growthRate: number; // MB per minute
  efficiency: number; // 0-1 scale
  recommendations: string[];
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryManager: any = null;
  private shaderOptimizer: any = null;

  constructor(memoryManager?: any, shaderOptimizer?: any) {
    this.memoryManager = memoryManager;
    this.shaderOptimizer = shaderOptimizer;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      console.warn('🧠 [MemoryMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log('🧠 [MemoryMonitor] Starting memory monitoring...');

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    // Take initial snapshot
    this.takeSnapshot();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🧠 [MemoryMonitor] Stopped memory monitoring');
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    const memoryInfo = (performance as any).memory;
    
    if (!memoryInfo) {
      console.warn('🧠 [MemoryMonitor] Memory API not available');
      return;
    }

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      jsHeapUsed: memoryInfo.usedJSHeapSize,
      jsHeapTotal: memoryInfo.totalJSHeapSize,
      jsHeapLimit: memoryInfo.jsHeapSizeLimit
    };

    // Add texture pool information if available
    if (this.memoryManager) {
      try {
        const poolStats = this.memoryManager.getPoolStats?.();
        if (poolStats) {
          snapshot.texturePoolSize = poolStats.totalTextures;
          snapshot.texturePoolUsage = poolStats.usedTextures;
        }
      } catch (error) {
        // Ignore errors accessing pool stats
      }
    }

    // Add shader cache information if available
    if (this.shaderOptimizer) {
      try {
        const cacheStats = this.shaderOptimizer.getCacheStats?.();
        if (cacheStats) {
          snapshot.shaderCacheSize = cacheStats.cacheSize;
        }
      } catch (error) {
        // Ignore errors accessing cache stats
      }
    }

    this.snapshots.push(snapshot);

    // Keep only last 1000 snapshots to prevent memory bloat
    if (this.snapshots.length > 1000) {
      this.snapshots = this.snapshots.slice(-1000);
    }
  }

  /**
   * Analyze memory usage patterns
   */
  analyzeMemoryUsage(): MemoryAnalysis {
    if (this.snapshots.length < 2) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        memoryLeaks: false,
        growthRate: 0,
        efficiency: 1,
        recommendations: ['Need more data points for analysis']
      };
    }

    const usages = this.snapshots.map(s => s.jsHeapUsed);
    const averageUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
    const peakUsage = Math.max(...usages);

    // Calculate growth rate (MB per minute)
    const firstSnapshot = this.snapshots[0];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const timeDiffMinutes = (lastSnapshot.timestamp - firstSnapshot.timestamp) / (1000 * 60);
    const memoryDiffMB = (lastSnapshot.jsHeapUsed - firstSnapshot.jsHeapUsed) / (1024 * 1024);
    const growthRate = timeDiffMinutes > 0 ? memoryDiffMB / timeDiffMinutes : 0;

    // Detect potential memory leaks
    const recentSnapshots = this.snapshots.slice(-10);
    const isGrowingConsistently = recentSnapshots.every((snapshot, index) => {
      if (index === 0) return true;
      return snapshot.jsHeapUsed >= recentSnapshots[index - 1].jsHeapUsed * 0.95;
    });
    const memoryLeaks = growthRate > 5 && isGrowingConsistently; // Growing > 5MB/min consistently

    // Calculate efficiency (how well memory is being managed)
    const heapUtilization = averageUsage / lastSnapshot.jsHeapTotal;
    const efficiency = Math.max(0, Math.min(1, 1 - (heapUtilization - 0.5) * 2)); // Optimal around 50% heap usage

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (memoryLeaks) {
      recommendations.push('Potential memory leak detected - check for unreleased resources');
    }
    
    if (peakUsage > lastSnapshot.jsHeapLimit * 0.9) {
      recommendations.push('Memory usage approaching heap limit - consider reducing texture pool size');
    }
    
    if (efficiency < 0.7) {
      recommendations.push('Memory efficiency could be improved - optimize texture and shader caching');
    }
    
    if (growthRate > 10) {
      recommendations.push('High memory growth rate - review memory cleanup procedures');
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears optimal');
    }

    return {
      averageUsage: averageUsage / (1024 * 1024), // Convert to MB
      peakUsage: peakUsage / (1024 * 1024), // Convert to MB
      memoryLeaks,
      growthRate,
      efficiency,
      recommendations
    };
  }

  /**
   * Get current memory status
   */
  getCurrentMemoryStatus(): MemorySnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(minutes: number = 5): MemorySnapshot[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  /**
   * Export memory data for analysis
   */
  exportMemoryData(): string {
    const analysis = this.analyzeMemoryUsage();
    
    return JSON.stringify({
      timestamp: Date.now(),
      monitoringDuration: this.snapshots.length > 0 
        ? (this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp) / 1000
        : 0,
      totalSnapshots: this.snapshots.length,
      analysis,
      snapshots: this.snapshots
    }, null, 2);
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
    console.log('🧠 [MemoryMonitor] Cleared all snapshots');
  }

  /**
   * Get memory pressure level
   */
  getMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const current = this.getCurrentMemoryStatus();
    if (!current) return 'low';

    const usageRatio = current.jsHeapUsed / current.jsHeapLimit;
    
    if (usageRatio > 0.95) return 'critical';
    if (usageRatio > 0.85) return 'high';
    if (usageRatio > 0.70) return 'medium';
    return 'low';
  }

  /**
   * Log memory summary to console
   */
  logMemorySummary(): void {
    const analysis = this.analyzeMemoryUsage();
    const current = this.getCurrentMemoryStatus();
    const pressure = this.getMemoryPressure();

    console.group('🧠 [MemoryMonitor] Memory Analysis Summary');
    console.log(`📊 Average Usage: ${analysis.averageUsage.toFixed(2)} MB`);
    console.log(`📈 Peak Usage: ${analysis.peakUsage.toFixed(2)} MB`);
    console.log(`📉 Growth Rate: ${analysis.growthRate.toFixed(2)} MB/min`);
    console.log(`⚡ Efficiency: ${(analysis.efficiency * 100).toFixed(1)}%`);
    console.log(`🚨 Memory Pressure: ${pressure.toUpperCase()}`);
    console.log(`🔍 Memory Leaks: ${analysis.memoryLeaks ? 'DETECTED' : 'None detected'}`);
    
    if (current) {
      console.log(`💾 Current Heap: ${(current.jsHeapUsed / (1024 * 1024)).toFixed(2)} MB / ${(current.jsHeapTotal / (1024 * 1024)).toFixed(2)} MB`);
      if (current.texturePoolSize !== undefined) {
        console.log(`🎨 Texture Pool: ${current.texturePoolUsage}/${current.texturePoolSize} textures`);
      }
    }
    
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`   • ${rec}`));
    console.groupEnd();
  }
}