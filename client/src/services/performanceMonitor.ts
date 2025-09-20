/**
 * Performance Monitor for DICOM Viewer
 * Tracks rendering performance, loading metrics, memory usage, and user interactions
 */

export interface PerformanceMetrics {
  // Rendering metrics
  renderingTime: number;
  frameRate: number;
  averageRenderTime: number;
  renderingErrors: number;
  
  // Loading metrics
  imageLoadTime: number;
  studyLoadTime: number;
  cacheHitRate: number;
  networkLatency: number;
  
  // Memory metrics
  memoryUsage: number;
  cacheSize: number;
  memoryLeaks: number;
  
  // User interaction metrics
  userInteractions: number;
  responseTime: number;
  errorRate: number;
  
  // System health
  cpuUsage: number;
  gpuUsage: number;
  networkSpeed: number;
  
  timestamp: number;
}

export interface RenderingMetrics {
  frameTime: number;
  drawCalls: number;
  textureMemory: number;
  shaderCompileTime: number;
  canvasResizes: number;
  renderingErrors: string[];
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  imageCache: number;
  domNodes: number;
}

export interface NetworkMetrics {
  downloadSpeed: number;
  uploadSpeed: number;
  latency: number;
  packetLoss: number;
  connectionType: string;
  bandwidth: number;
}

export interface InteractionMetrics {
  clickCount: number;
  scrollCount: number;
  keyboardEvents: number;
  touchEvents: number;
  averageResponseTime: number;
  slowInteractions: number;
}

export interface SystemHealthStatus {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  rendering: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  memory: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  network: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  userExperience: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
}

export interface PerformanceReport {
  summary: PerformanceMetrics;
  detailed: {
    rendering: RenderingMetrics;
    memory: MemoryMetrics;
    network: NetworkMetrics;
    interactions: InteractionMetrics;
  };
  trends: {
    renderingTrend: number[];
    memoryTrend: number[];
    loadTimeTrend: number[];
  };
  issues: PerformanceIssue[];
  recommendations: PerformanceRecommendation[];
  generatedAt: number;
}

export interface PerformanceIssue {
  type: 'memory_leak' | 'slow_rendering' | 'network_slow' | 'high_cpu' | 'cache_miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  solution: string;
  detectedAt: number;
}

export interface PerformanceRecommendation {
  category: 'rendering' | 'memory' | 'network' | 'caching' | 'user_experience';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold_exceeded' | 'anomaly_detected' | 'system_degradation';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  timestamp: number;
  acknowledged: boolean;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private currentMetrics: Partial<PerformanceMetrics> = {};
  private renderingMetrics: RenderingMetrics[] = [];
  private memoryMetrics: MemoryMetrics[] = [];
  private networkMetrics: NetworkMetrics[] = [];
  private interactionMetrics: InteractionMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private issues: PerformanceIssue[] = [];
  
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  
  // Thresholds for alerts
  private thresholds = {
    renderTime: 16.67, // 60 FPS = 16.67ms per frame
    memoryUsage: 100 * 1024 * 1024, // 100MB
    loadTime: 3000, // 3 seconds
    errorRate: 0.05, // 5%
    responseTime: 100 // 100ms
  };

  private constructor() {
    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.setupInteractionMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    console.log('🔄 [PerformanceMonitor] Starting performance monitoring');
    this.isMonitoring = true;

    // Collect metrics every second
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000);

    // Start performance observer
    if (this.performanceObserver) {
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('⏹️ [PerformanceMonitor] Stopping performance monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Track rendering performance
   */
  public trackRenderingPerformance(): RenderingMetrics {
    const startTime = performance.now();
    
    return {
      frameTime: 0, // Will be updated by the caller
      drawCalls: 0,
      textureMemory: 0,
      shaderCompileTime: 0,
      canvasResizes: 0,
      renderingErrors: []
    };
  }

  /**
   * Record rendering metrics
   */
  public recordRenderingMetrics(metrics: RenderingMetrics): void {
    this.renderingMetrics.push({
      ...metrics,
      frameTime: performance.now()
    });

    // Keep only last 100 entries
    if (this.renderingMetrics.length > 100) {
      this.renderingMetrics.shift();
    }

    // Check for performance issues
    if (metrics.frameTime > this.thresholds.renderTime) {
      this.createAlert('threshold_exceeded', 'warning', 
        `Slow rendering detected: ${metrics.frameTime.toFixed(2)}ms per frame`);
    }

    // Update current metrics
    this.currentMetrics.renderingTime = metrics.frameTime;
    this.currentMetrics.frameRate = 1000 / metrics.frameTime;
  }

  /**
   * Monitor memory usage
   */
  public monitorMemoryUsage(): MemoryMetrics {
    const memoryInfo = (performance as any).memory || {};
    
    const metrics: MemoryMetrics = {
      heapUsed: memoryInfo.usedJSHeapSize || 0,
      heapTotal: memoryInfo.totalJSHeapSize || 0,
      external: 0,
      arrayBuffers: 0,
      imageCache: 0,
      domNodes: document.querySelectorAll('*').length
    };

    this.memoryMetrics.push(metrics);

    // Keep only last 100 entries
    if (this.memoryMetrics.length > 100) {
      this.memoryMetrics.shift();
    }

    // Check for memory issues
    if (metrics.heapUsed > this.thresholds.memoryUsage) {
      this.createAlert('threshold_exceeded', 'warning',
        `High memory usage: ${(metrics.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    // Detect memory leaks
    if (this.memoryMetrics.length > 10) {
      const recent = this.memoryMetrics.slice(-10);
      const trend = this.calculateTrend(recent.map(m => m.heapUsed));
      
      if (trend > 0.1) { // 10% increase trend
        this.createIssue('memory_leak', 'medium',
          'Potential memory leak detected',
          'Memory usage is consistently increasing',
          'Check for unreleased references and clear unused caches');
      }
    }

    this.currentMetrics.memoryUsage = metrics.heapUsed;
    return metrics;
  }

  /**
   * Measure network performance
   */
  public measureNetworkPerformance(): NetworkMetrics {
    const connection = (navigator as any).connection || {};
    
    const metrics: NetworkMetrics = {
      downloadSpeed: connection.downlink || 0,
      uploadSpeed: 0,
      latency: connection.rtt || 0,
      packetLoss: 0,
      connectionType: connection.effectiveType || 'unknown',
      bandwidth: connection.downlink || 0
    };

    this.networkMetrics.push(metrics);

    // Keep only last 50 entries
    if (this.networkMetrics.length > 50) {
      this.networkMetrics.shift();
    }

    this.currentMetrics.networkLatency = metrics.latency;
    return metrics;
  }

  /**
   * Track user interactions
   */
  public trackUserInteractions(): InteractionMetrics {
    // This will be updated by event listeners
    const latest = this.interactionMetrics[this.interactionMetrics.length - 1];
    return latest || {
      clickCount: 0,
      scrollCount: 0,
      keyboardEvents: 0,
      touchEvents: 0,
      averageResponseTime: 0,
      slowInteractions: 0
    };
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): SystemHealthStatus {
    const latest = this.getCurrentMetrics();
    
    const renderingHealth = this.evaluateRenderingHealth(latest);
    const memoryHealth = this.evaluateMemoryHealth(latest);
    const networkHealth = this.evaluateNetworkHealth(latest);
    const uxHealth = this.evaluateUserExperienceHealth(latest);
    
    const overall = this.calculateOverallHealth([
      renderingHealth, memoryHealth, networkHealth, uxHealth
    ]);

    const recommendations = this.generateRecommendations(latest);

    return {
      overall,
      rendering: renderingHealth,
      memory: memoryHealth,
      network: networkHealth,
      userExperience: uxHealth,
      recommendations
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): PerformanceReport {
    const summary = this.getCurrentMetrics();
    const detailed = {
      rendering: this.getLatestRenderingMetrics(),
      memory: this.getLatestMemoryMetrics(),
      network: this.getLatestNetworkMetrics(),
      interactions: this.getLatestInteractionMetrics()
    };

    const trends = {
      renderingTrend: this.calculateRenderingTrend(),
      memoryTrend: this.calculateMemoryTrend(),
      loadTimeTrend: this.calculateLoadTimeTrend()
    };

    const recommendations = this.generatePerformanceRecommendations();

    return {
      summary,
      detailed,
      trends,
      issues: [...this.issues],
      recommendations,
      generatedAt: Date.now()
    };
  }

  /**
   * Add performance observer
   */
  public onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.observers.push(callback);
  }

  /**
   * Remove performance observer
   */
  public removeMetricsObserver(callback: (metrics: PerformanceMetrics) => void): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Add alert callback
   */
  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    return {
      renderingTime: this.currentMetrics.renderingTime || 0,
      frameRate: this.currentMetrics.frameRate || 0,
      averageRenderTime: this.calculateAverageRenderTime(),
      renderingErrors: 0,
      imageLoadTime: this.currentMetrics.imageLoadTime || 0,
      studyLoadTime: this.currentMetrics.studyLoadTime || 0,
      cacheHitRate: this.currentMetrics.cacheHitRate || 0,
      networkLatency: this.currentMetrics.networkLatency || 0,
      memoryUsage: this.currentMetrics.memoryUsage || 0,
      cacheSize: this.currentMetrics.cacheSize || 0,
      memoryLeaks: 0,
      userInteractions: this.currentMetrics.userInteractions || 0,
      responseTime: this.currentMetrics.responseTime || 0,
      errorRate: this.currentMetrics.errorRate || 0,
      cpuUsage: 0,
      gpuUsage: 0,
      networkSpeed: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Record image load time
   */
  public recordImageLoadTime(loadTime: number): void {
    this.currentMetrics.imageLoadTime = loadTime;
    
    if (loadTime > this.thresholds.loadTime) {
      this.createAlert('threshold_exceeded', 'warning',
        `Slow image loading: ${loadTime}ms`);
    }
  }

  /**
   * Record study load time
   */
  public recordStudyLoadTime(loadTime: number): void {
    this.currentMetrics.studyLoadTime = loadTime;
  }

  /**
   * Update cache hit rate
   */
  public updateCacheHitRate(hitRate: number): void {
    this.currentMetrics.cacheHitRate = hitRate;
  }

  // Private methods

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            // Handle custom measurements
            this.handleCustomMeasurement(entry);
          } else if (entry.entryType === 'resource') {
            // Handle resource loading
            this.handleResourceLoad(entry as PerformanceResourceTiming);
          }
        });
      });
    }
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory every 5 seconds
    setInterval(() => {
      if (this.isMonitoring) {
        this.monitorMemoryUsage();
      }
    }, 5000);
  }

  private setupNetworkMonitoring(): void {
    // Monitor network every 10 seconds
    setInterval(() => {
      if (this.isMonitoring) {
        this.measureNetworkPerformance();
      }
    }, 10000);
  }

  private setupInteractionMonitoring(): void {
    let interactionCount = 0;
    let totalResponseTime = 0;
    let slowInteractions = 0;

    const trackInteraction = (type: string) => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        interactionCount++;
        totalResponseTime += responseTime;
        
        if (responseTime > this.thresholds.responseTime) {
          slowInteractions++;
        }

        // Update metrics every 10 interactions
        if (interactionCount % 10 === 0) {
          const metrics: InteractionMetrics = {
            clickCount: type === 'click' ? interactionCount : 0,
            scrollCount: type === 'scroll' ? interactionCount : 0,
            keyboardEvents: type === 'keyboard' ? interactionCount : 0,
            touchEvents: type === 'touch' ? interactionCount : 0,
            averageResponseTime: totalResponseTime / interactionCount,
            slowInteractions
          };
          
          this.interactionMetrics.push(metrics);
          this.currentMetrics.responseTime = metrics.averageResponseTime;
        }
      });
    };

    // Add event listeners
    document.addEventListener('click', () => trackInteraction('click'));
    document.addEventListener('scroll', () => trackInteraction('scroll'));
    document.addEventListener('keydown', () => trackInteraction('keyboard'));
    document.addEventListener('touchstart', () => trackInteraction('touch'));
  }

  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    this.metrics.push(metrics);

    // Keep only last 1000 entries (about 16 minutes at 1 second intervals)
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // Notify observers
    this.observers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in performance metrics callback:', error);
      }
    });
  }

  private handleCustomMeasurement(entry: PerformanceEntry): void {
    // Handle custom performance measurements
    console.log(`📊 [PerformanceMonitor] Custom measurement: ${entry.name} = ${entry.duration}ms`);
  }

  private handleResourceLoad(entry: PerformanceResourceTiming): void {
    // Track resource loading performance
    const loadTime = entry.responseEnd - entry.requestStart;
    
    if (entry.name.includes('.dcm') || entry.name.includes('dicom')) {
      this.recordImageLoadTime(loadTime);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      metrics: this.getCurrentMetrics(),
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Notify alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });

    console.warn(`⚠️ [PerformanceMonitor] ${severity.toUpperCase()}: ${message}`);
  }

  private createIssue(
    type: PerformanceIssue['type'],
    severity: PerformanceIssue['severity'],
    description: string,
    impact: string,
    solution: string
  ): void {
    const issue: PerformanceIssue = {
      type,
      severity,
      description,
      impact,
      solution,
      detectedAt: Date.now()
    };

    this.issues.push(issue);

    // Keep only last 20 issues
    if (this.issues.length > 20) {
      this.issues.shift();
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return (last - first) / first;
  }

  private calculateAverageRenderTime(): number {
    if (this.renderingMetrics.length === 0) return 0;
    
    const sum = this.renderingMetrics.reduce((acc, m) => acc + m.frameTime, 0);
    return sum / this.renderingMetrics.length;
  }

  private evaluateRenderingHealth(metrics: PerformanceMetrics): SystemHealthStatus['rendering'] {
    if (metrics.frameRate >= 55) return 'excellent';
    if (metrics.frameRate >= 45) return 'good';
    if (metrics.frameRate >= 30) return 'fair';
    if (metrics.frameRate >= 20) return 'poor';
    return 'critical';
  }

  private evaluateMemoryHealth(metrics: PerformanceMetrics): SystemHealthStatus['memory'] {
    const memoryMB = metrics.memoryUsage / 1024 / 1024;
    
    if (memoryMB < 50) return 'excellent';
    if (memoryMB < 100) return 'good';
    if (memoryMB < 200) return 'fair';
    if (memoryMB < 400) return 'poor';
    return 'critical';
  }

  private evaluateNetworkHealth(metrics: PerformanceMetrics): SystemHealthStatus['network'] {
    if (metrics.networkLatency < 50) return 'excellent';
    if (metrics.networkLatency < 100) return 'good';
    if (metrics.networkLatency < 200) return 'fair';
    if (metrics.networkLatency < 500) return 'poor';
    return 'critical';
  }

  private evaluateUserExperienceHealth(metrics: PerformanceMetrics): SystemHealthStatus['userExperience'] {
    if (metrics.responseTime < 50 && metrics.errorRate < 0.01) return 'excellent';
    if (metrics.responseTime < 100 && metrics.errorRate < 0.02) return 'good';
    if (metrics.responseTime < 200 && metrics.errorRate < 0.05) return 'fair';
    if (metrics.responseTime < 500 && metrics.errorRate < 0.1) return 'poor';
    return 'critical';
  }

  private calculateOverallHealth(healths: SystemHealthStatus['rendering'][]): SystemHealthStatus['overall'] {
    const scores = healths.map(h => {
      switch (h) {
        case 'excellent': return 5;
        case 'good': return 4;
        case 'fair': return 3;
        case 'poor': return 2;
        case 'critical': return 1;
        default: return 1;
      }
    });

    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (average >= 4.5) return 'excellent';
    if (average >= 3.5) return 'good';
    if (average >= 2.5) return 'fair';
    if (average >= 1.5) return 'poor';
    return 'critical';
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.frameRate < 30) {
      recommendations.push('Consider reducing image quality or enabling GPU acceleration');
    }

    if (metrics.memoryUsage > 200 * 1024 * 1024) {
      recommendations.push('Clear image cache or reduce cache size to free memory');
    }

    if (metrics.networkLatency > 200) {
      recommendations.push('Enable image compression or use a CDN for better performance');
    }

    if (metrics.responseTime > 100) {
      recommendations.push('Optimize UI interactions and reduce JavaScript execution time');
    }

    return recommendations;
  }

  private getLatestRenderingMetrics(): RenderingMetrics {
    return this.renderingMetrics[this.renderingMetrics.length - 1] || {
      frameTime: 0,
      drawCalls: 0,
      textureMemory: 0,
      shaderCompileTime: 0,
      canvasResizes: 0,
      renderingErrors: []
    };
  }

  private getLatestMemoryMetrics(): MemoryMetrics {
    return this.memoryMetrics[this.memoryMetrics.length - 1] || {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      imageCache: 0,
      domNodes: 0
    };
  }

  private getLatestNetworkMetrics(): NetworkMetrics {
    return this.networkMetrics[this.networkMetrics.length - 1] || {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      packetLoss: 0,
      connectionType: 'unknown',
      bandwidth: 0
    };
  }

  private getLatestInteractionMetrics(): InteractionMetrics {
    return this.interactionMetrics[this.interactionMetrics.length - 1] || {
      clickCount: 0,
      scrollCount: 0,
      keyboardEvents: 0,
      touchEvents: 0,
      averageResponseTime: 0,
      slowInteractions: 0
    };
  }

  private calculateRenderingTrend(): number[] {
    return this.renderingMetrics.slice(-20).map(m => m.frameTime);
  }

  private calculateMemoryTrend(): number[] {
    return this.memoryMetrics.slice(-20).map(m => m.heapUsed);
  }

  private calculateLoadTimeTrend(): number[] {
    return this.metrics.slice(-20).map(m => m.imageLoadTime);
  }

  private generatePerformanceRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const metrics = this.getCurrentMetrics();

    if (metrics.frameRate < 45) {
      recommendations.push({
        category: 'rendering',
        priority: 'high',
        title: 'Improve Rendering Performance',
        description: 'Frame rate is below optimal levels',
        implementation: 'Enable GPU acceleration, reduce image quality, or optimize rendering pipeline',
        expectedImprovement: 'Increase frame rate by 20-40%'
      });
    }

    if (metrics.memoryUsage > 150 * 1024 * 1024) {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: 'Memory usage is higher than recommended',
        implementation: 'Implement aggressive cache eviction and reduce image cache size',
        expectedImprovement: 'Reduce memory usage by 30-50%'
      });
    }

    if (metrics.cacheHitRate < 0.8) {
      recommendations.push({
        category: 'caching',
        priority: 'medium',
        title: 'Improve Cache Efficiency',
        description: 'Cache hit rate is below optimal levels',
        implementation: 'Implement predictive caching and improve cache algorithms',
        expectedImprovement: 'Increase cache hit rate to 85-95%'
      });
    }

    return recommendations;
  }
}

// Export class and singleton instance
export { PerformanceMonitor };
export const performanceMonitor = PerformanceMonitor.getInstance();