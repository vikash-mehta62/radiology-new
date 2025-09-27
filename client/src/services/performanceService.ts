/**
 * Performance Service for DICOM Viewer
 * Monitors and optimizes viewer performance with real-time metrics
 */

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  gpuMemoryUsage?: number;
  cpuUsage: number;
  networkLatency?: number;
  cacheHitRate: number;
  errorCount: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxLoadTime: number;
  minFrameRate: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

class PerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];
  private alertObservers: ((alert: PerformanceAlert) => void)[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private frameCount = 0;
  private lastFrameTime = 0;
  private loadStartTime = 0;
  private renderStartTime = 0;

  private readonly defaultThresholds: PerformanceThresholds = {
    maxLoadTime: 5000, // 5 seconds
    minFrameRate: 30,  // 30 FPS
    maxMemoryUsage: 512, // 512 MB
    maxCpuUsage: 80    // 80%
  };

  private thresholds: PerformanceThresholds = { ...this.defaultThresholds };

  /**
   * Start performance monitoring
   */
  startMonitoring(interval: number = 1000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Mark the start of image loading
   */
  markLoadStart(): void {
    this.loadStartTime = performance.now();
  }

  /**
   * Mark the end of image loading
   */
  markLoadEnd(): number {
    const loadTime = performance.now() - this.loadStartTime;
    this.checkThreshold('loadTime', loadTime, this.thresholds.maxLoadTime);
    return loadTime;
  }

  /**
   * Mark the start of rendering
   */
  markRenderStart(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * Mark the end of rendering
   */
  markRenderEnd(): number {
    const renderTime = performance.now() - this.renderStartTime;
    return renderTime;
  }

  /**
   * Update frame count for FPS calculation
   */
  updateFrameCount(): void {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
    }
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const currentTime = performance.now();
    const timeDelta = currentTime - this.lastFrameTime;
    const frameRate = timeDelta > 0 ? (this.frameCount * 1000) / timeDelta : 0;

    // Reset frame counting
    this.frameCount = 0;
    this.lastFrameTime = currentTime;

    const metrics: PerformanceMetrics = {
      loadTime: 0, // Will be updated by markLoadEnd
      renderTime: 0, // Will be updated by markRenderEnd
      memoryUsage: this.getMemoryUsage(),
      frameRate,
      gpuMemoryUsage: this.getGPUMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      networkLatency: this.getNetworkLatency(),
      cacheHitRate: this.getCacheHitRate(),
      errorCount: this.getErrorCount(),
      timestamp: currentTime
    };

    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Check thresholds
    this.checkAllThresholds(metrics);

    // Notify observers
    this.notifyObservers(metrics);
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Get GPU memory usage (if available)
   */
  private getGPUMemoryUsage(): number | undefined {
    // This would require WebGL context and extensions
    // For now, return undefined as it's not easily accessible
    return undefined;
  }

  /**
   * Estimate CPU usage (simplified)
   */
  private getCPUUsage(): number {
    // This is a simplified estimation
    // In a real implementation, you might use Web Workers or other techniques
    const start = performance.now();
    let iterations = 0;
    const maxTime = 1; // 1ms test

    while (performance.now() - start < maxTime) {
      iterations++;
    }

    // Normalize to a percentage (this is very approximate)
    const baselineIterations = 100000; // Calibrate based on typical performance
    return Math.min(100, (baselineIterations / iterations) * 100);
  }

  /**
   * Get network latency (if applicable)
   */
  private getNetworkLatency(): number | undefined {
    // This would be measured during DICOM file loading
    // For now, return undefined
    return undefined;
  }

  /**
   * Get cache hit rate
   */
  private getCacheHitRate(): number {
    // This would track cache hits vs misses
    // For now, return a default value
    return 85; // 85% hit rate
  }

  /**
   * Get error count
   */
  private getErrorCount(): number {
    // This would track errors in the application
    // For now, return 0
    return 0;
  }

  /**
   * Check all performance thresholds
   */
  private checkAllThresholds(metrics: PerformanceMetrics): void {
    this.checkThreshold('frameRate', metrics.frameRate, this.thresholds.minFrameRate, 'min');
    this.checkThreshold('memoryUsage', metrics.memoryUsage, this.thresholds.maxMemoryUsage);
    this.checkThreshold('cpuUsage', metrics.cpuUsage, this.thresholds.maxCpuUsage);
  }

  /**
   * Check individual threshold
   */
  private checkThreshold(
    metric: keyof PerformanceMetrics,
    value: number,
    threshold: number,
    type: 'max' | 'min' = 'max'
  ): void {
    const isViolation = type === 'max' ? value > threshold : value < threshold;
    
    if (isViolation) {
      const alert: PerformanceAlert = {
        type: 'warning',
        metric,
        value,
        threshold,
        message: `${metric} ${type === 'max' ? 'exceeded' : 'below'} threshold: ${value.toFixed(2)} ${type === 'max' ? '>' : '<'} ${threshold}`,
        timestamp: performance.now()
      };

      this.alerts.push(alert);
      
      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }

      this.notifyAlertObservers(alert);
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageLoadTime: number;
    averageRenderTime: number;
    averageFrameRate: number;
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    totalAlerts: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageLoadTime: 0,
        averageRenderTime: 0,
        averageFrameRate: 0,
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        totalAlerts: 0
      };
    }

    const validMetrics = this.metrics.filter(m => m.loadTime > 0 || m.renderTime > 0);
    
    return {
      averageLoadTime: validMetrics.reduce((sum, m) => sum + m.loadTime, 0) / validMetrics.length,
      averageRenderTime: validMetrics.reduce((sum, m) => sum + m.renderTime, 0) / validMetrics.length,
      averageFrameRate: this.metrics.reduce((sum, m) => sum + m.frameRate, 0) / this.metrics.length,
      averageMemoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length,
      peakMemoryUsage: Math.max(...this.metrics.map(m => m.memoryUsage)),
      totalAlerts: this.alerts.length
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Reset thresholds to defaults
   */
  resetThresholds(): void {
    this.thresholds = { ...this.defaultThresholds };
  }

  /**
   * Clear all metrics and alerts
   */
  clearData(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Subscribe to performance metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(callback);
    
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to performance alerts
   */
  subscribeToAlerts(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertObservers.push(callback);
    
    return () => {
      const index = this.alertObservers.indexOf(callback);
      if (index > -1) {
        this.alertObservers.splice(index, 1);
      }
    };
  }

  /**
   * Notify metrics observers
   */
  private notifyObservers(metrics: PerformanceMetrics): void {
    this.observers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in performance metrics observer:', error);
      }
    });
  }

  /**
   * Notify alert observers
   */
  private notifyAlertObservers(alert: PerformanceAlert): void {
    this.alertObservers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert observer:', error);
      }
    });
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      alerts: this.alerts,
      summary: this.getPerformanceSummary(),
      thresholds: this.thresholds,
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getPerformanceSummary();

    if (summary.averageLoadTime > this.thresholds.maxLoadTime) {
      recommendations.push('Consider enabling image caching or preloading');
      recommendations.push('Optimize DICOM file compression');
    }

    if (summary.averageFrameRate < this.thresholds.minFrameRate) {
      recommendations.push('Enable GPU acceleration if available');
      recommendations.push('Reduce image quality for real-time interactions');
    }

    if (summary.peakMemoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push('Implement memory pooling for large images');
      recommendations.push('Use progressive loading for large datasets');
    }

    if (this.alerts.filter(a => a.type === 'error').length > 5) {
      recommendations.push('Review error handling and fallback mechanisms');
    }

    return recommendations;
  }
}

// Create singleton instance
export const performanceService = new PerformanceService();

// Export types and service
export default performanceService;