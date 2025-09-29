import { useState, useCallback, useRef, useEffect } from 'react';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  gpuUtilization: number;
  renderTime: number;
  loadTime: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  fps: { excellent: number; good: number; acceptable: number; poor: number };
  memoryUsage: { excellent: number; good: number; acceptable: number; poor: number };
  renderTime: { excellent: number; good: number; acceptable: number; poor: number };
  loadTime: { excellent: number; good: number; acceptable: number; poor: number };
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  metric: keyof PerformanceMetrics;
  level: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  suggestion?: string;
}

export interface PerformanceDiagnosticState {
  isMonitoring: boolean;
  currentMetrics: PerformanceMetrics;
  historicalMetrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  thresholds: PerformanceThresholds;
  autoOptimize: boolean;
  lastOptimization: Date | null;
}

export interface PerformanceDiagnosticActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  setThresholds: (thresholds: Partial<PerformanceThresholds>) => void;
  clearAlerts: () => void;
  optimizePerformance: () => Promise<void>;
  generateReport: () => string;
  exportMetrics: () => Promise<Blob>;
  setAutoOptimize: (enabled: boolean) => void;
}

export interface UsePerformanceDiagnosticsOptions {
  monitoringInterval?: number; // in milliseconds
  maxHistorySize?: number;
  autoOptimizeThreshold?: number; // performance score threshold for auto-optimization
  onAlert?: (alert: PerformanceAlert) => void;
  onOptimization?: (results: any) => void;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fps: { excellent: 60, good: 45, acceptable: 30, poor: 15 },
  memoryUsage: { excellent: 25, good: 50, acceptable: 75, poor: 90 }, // percentage
  renderTime: { excellent: 16, good: 33, acceptable: 50, poor: 100 }, // milliseconds
  loadTime: { excellent: 500, good: 1000, acceptable: 2000, poor: 5000 } // milliseconds
};

export const usePerformanceDiagnostics = (
  options: UsePerformanceDiagnosticsOptions = {}
): [PerformanceDiagnosticState, PerformanceDiagnosticActions] => {
  const {
    monitoringInterval = 1000,
    maxHistorySize = 300, // 5 minutes at 1-second intervals
    autoOptimizeThreshold = 40,
    onAlert,
    onOptimization
  } = options;

  const [state, setState] = useState<PerformanceDiagnosticState>({
    isMonitoring: false,
    currentMetrics: {
      fps: 0,
      memoryUsage: 0,
      gpuUtilization: 0,
      renderTime: 0,
      loadTime: 0,
      networkLatency: 0,
      cacheHitRate: 0,
      errorRate: 0
    },
    historicalMetrics: [],
    alerts: [],
    thresholds: DEFAULT_THRESHOLDS,
    autoOptimize: false,
    lastOptimization: null
  });

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertIdCounter = useRef(0);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  const generateAlertId = useCallback(() => {
    return `alert_${Date.now()}_${++alertIdCounter.current}`;
  }, []);

  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    const { thresholds } = state;
    
    // Calculate individual scores (0-100)
    const fpsScore = Math.min(100, (metrics.fps / thresholds.fps.excellent) * 100);
    const memoryScore = Math.max(0, 100 - metrics.memoryUsage);
    const renderScore = Math.max(0, 100 - (metrics.renderTime / thresholds.renderTime.excellent) * 100);
    const loadScore = Math.max(0, 100 - (metrics.loadTime / thresholds.loadTime.excellent) * 100);
    
    // Weighted average
    return (fpsScore * 0.3 + memoryScore * 0.25 + renderScore * 0.25 + loadScore * 0.2);
  }, [state.thresholds]);

  const checkThresholds = useCallback((metrics: PerformanceMetrics) => {
    const { thresholds } = state;
    const newAlerts: PerformanceAlert[] = [];

    // Check FPS
    if (metrics.fps < thresholds.fps.poor) {
      newAlerts.push({
        id: generateAlertId(),
        timestamp: new Date(),
        metric: 'fps',
        level: 'critical',
        message: `Critical FPS drop detected: ${metrics.fps.toFixed(1)} FPS`,
        value: metrics.fps,
        threshold: thresholds.fps.poor,
        suggestion: 'Consider reducing quality settings or enabling performance optimizations'
      });
    } else if (metrics.fps < thresholds.fps.acceptable) {
      newAlerts.push({
        id: generateAlertId(),
        timestamp: new Date(),
        metric: 'fps',
        level: 'warning',
        message: `Low FPS detected: ${metrics.fps.toFixed(1)} FPS`,
        value: metrics.fps,
        threshold: thresholds.fps.acceptable,
        suggestion: 'Monitor performance and consider optimization if persistent'
      });
    }

    // Check Memory Usage
    if (metrics.memoryUsage > thresholds.memoryUsage.poor) {
      newAlerts.push({
        id: generateAlertId(),
        timestamp: new Date(),
        metric: 'memoryUsage',
        level: 'critical',
        message: `Critical memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage.poor,
        suggestion: 'Clear cache, reduce image quality, or restart the application'
      });
    } else if (metrics.memoryUsage > thresholds.memoryUsage.acceptable) {
      newAlerts.push({
        id: generateAlertId(),
        timestamp: new Date(),
        metric: 'memoryUsage',
        level: 'warning',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage.acceptable,
        suggestion: 'Consider clearing cache or reducing loaded images'
      });
    }

    // Check Render Time
    if (metrics.renderTime > thresholds.renderTime.poor) {
      newAlerts.push({
        id: generateAlertId(),
        timestamp: new Date(),
        metric: 'renderTime',
        level: 'critical',
        message: `Critical render time: ${metrics.renderTime.toFixed(1)}ms`,
        value: metrics.renderTime,
        threshold: thresholds.renderTime.poor,
        suggestion: 'Switch to lower quality rendering mode or check GPU performance'
      });
    }

    if (newAlerts.length > 0) {
      setState(prev => ({
        ...prev,
        alerts: [...prev.alerts, ...newAlerts]
      }));

      // Trigger external alert handlers
      newAlerts.forEach(alert => {
        if (onAlert) {
          onAlert(alert);
        }
      });
    }
  }, [state.thresholds, generateAlertId, onAlert]);

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setState(prev => {
      const updatedMetrics = { ...prev.currentMetrics, ...newMetrics };
      
      // Add to historical data
      const newHistoricalMetrics = [...prev.historicalMetrics, updatedMetrics];
      if (newHistoricalMetrics.length > maxHistorySize) {
        newHistoricalMetrics.shift();
      }

      // Check thresholds for alerts
      checkThresholds(updatedMetrics);

      // Auto-optimize if enabled and performance is poor
      if (prev.autoOptimize) {
        const score = calculatePerformanceScore(updatedMetrics);
        if (score < autoOptimizeThreshold) {
          // Trigger optimization (async)
          setTimeout(() => optimizePerformance(), 100);
        }
      }

      return {
        ...prev,
        currentMetrics: updatedMetrics,
        historicalMetrics: newHistoricalMetrics
      };
    });
  }, [maxHistorySize, checkThresholds, calculatePerformanceScore, autoOptimizeThreshold]);

  const collectSystemMetrics = useCallback(async (): Promise<Partial<PerformanceMetrics>> => {
    const metrics: Partial<PerformanceMetrics> = {};

    try {
      // Memory usage
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        if (memInfo) {
          const usedMemory = memInfo.usedJSHeapSize;
          const totalMemory = memInfo.totalJSHeapSize;
          metrics.memoryUsage = (usedMemory / totalMemory) * 100;
        }
      }

      // Network latency (approximate)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection && connection.rtt) {
          metrics.networkLatency = connection.rtt;
        }
      }

      // Performance entries
      if (performanceObserverRef.current) {
        const entries = performance.getEntriesByType('measure');
        if (entries.length > 0) {
          const renderEntries = entries.filter(entry => entry.name.includes('render'));
          if (renderEntries.length > 0) {
            metrics.renderTime = renderEntries[renderEntries.length - 1].duration;
          }
        }
      }

      // FPS calculation (simplified)
      const now = performance.now();
      const lastFrameTime = (window as any).lastFrameTime || now;
      const deltaTime = now - lastFrameTime;
      if (deltaTime > 0) {
        metrics.fps = 1000 / deltaTime;
      }
      (window as any).lastFrameTime = now;

    } catch (error) {
      console.warn('[Performance Diagnostics] Error collecting metrics:', error);
    }

    return metrics;
  }, []);

  const startMonitoring = useCallback(() => {
    if (state.isMonitoring) return;

    setState(prev => ({ ...prev, isMonitoring: true }));

    // Set up performance observer
    if ('PerformanceObserver' in window) {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Process performance entries as needed
      });
      
      try {
        performanceObserverRef.current.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        });
      } catch (error) {
        console.warn('[Performance Diagnostics] PerformanceObserver not fully supported:', error);
      }
    }

    // Start monitoring interval
    monitoringIntervalRef.current = setInterval(async () => {
      const metrics = await collectSystemMetrics();
      updateMetrics(metrics);
    }, monitoringInterval);
  }, [state.isMonitoring, collectSystemMetrics, updateMetrics, monitoringInterval]);

  const stopMonitoring = useCallback(() => {
    setState(prev => ({ ...prev, isMonitoring: false }));

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    if (performanceObserverRef.current) {
      performanceObserverRef.current.disconnect();
      performanceObserverRef.current = null;
    }
  }, []);

  const optimizePerformance = useCallback(async () => {
    try {
      const optimizationResults = {
        timestamp: new Date(),
        actions: [] as string[],
        beforeScore: calculatePerformanceScore(state.currentMetrics),
        afterScore: 0
      };

      // Memory cleanup
      if (state.currentMetrics.memoryUsage > 70) {
        // Trigger garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
          optimizationResults.actions.push('Triggered garbage collection');
        }
        
        // Clear caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            if (cacheName.includes('temp') || cacheName.includes('preview')) {
              await caches.delete(cacheName);
              optimizationResults.actions.push(`Cleared cache: ${cacheName}`);
            }
          }
        }
      }

      // Reduce quality if performance is poor
      if (state.currentMetrics.fps < 30 || state.currentMetrics.renderTime > 50) {
        // This would need to be connected to the actual viewer settings
        optimizationResults.actions.push('Recommended quality reduction');
      }

      // Update optimization timestamp
      setState(prev => ({ ...prev, lastOptimization: new Date() }));

      // Calculate new score (would need actual metrics after optimization)
      optimizationResults.afterScore = calculatePerformanceScore(state.currentMetrics);

      if (onOptimization) {
        onOptimization(optimizationResults);
      }

      console.log('[Performance Diagnostics] Optimization completed:', optimizationResults);
    } catch (error) {
      console.error('[Performance Diagnostics] Optimization failed:', error);
    }
  }, [state.currentMetrics, calculatePerformanceScore, onOptimization]);

  const setThresholds = useCallback((newThresholds: Partial<PerformanceThresholds>) => {
    setState(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, ...newThresholds }
    }));
  }, []);

  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, alerts: [] }));
  }, []);

  const setAutoOptimize = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, autoOptimize: enabled }));
  }, []);

  const generateReport = useCallback((): string => {
    const { currentMetrics, historicalMetrics, alerts, thresholds } = state;
    const performanceScore = calculatePerformanceScore(currentMetrics);
    
    const report = {
      timestamp: new Date().toISOString(),
      performanceScore: performanceScore.toFixed(1),
      currentMetrics,
      thresholds,
      alerts: alerts.slice(-10), // Last 10 alerts
      summary: {
        averageFPS: historicalMetrics.length > 0 
          ? (historicalMetrics.reduce((sum, m) => sum + m.fps, 0) / historicalMetrics.length).toFixed(1)
          : '0',
        peakMemoryUsage: historicalMetrics.length > 0
          ? Math.max(...historicalMetrics.map(m => m.memoryUsage)).toFixed(1)
          : '0',
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.level === 'critical').length
      }
    };

    return JSON.stringify(report, null, 2);
  }, [state, calculatePerformanceScore]);

  const exportMetrics = useCallback(async (): Promise<Blob> => {
    const csvHeader = 'Timestamp,FPS,Memory Usage (%),GPU Utilization (%),Render Time (ms),Load Time (ms),Network Latency (ms),Cache Hit Rate (%),Error Rate (%)\\n';
    
    const csvData = state.historicalMetrics.map((metrics, index) => {
      const timestamp = new Date(Date.now() - (state.historicalMetrics.length - index - 1) * monitoringInterval).toISOString();
      return `${timestamp},${metrics.fps},${metrics.memoryUsage},${metrics.gpuUtilization},${metrics.renderTime},${metrics.loadTime},${metrics.networkLatency},${metrics.cacheHitRate},${metrics.errorRate}`;
    }).join('\\n');

    return new Blob([csvHeader + csvData], { type: 'text/csv' });
  }, [state.historicalMetrics, monitoringInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  const actions: PerformanceDiagnosticActions = {
    startMonitoring,
    stopMonitoring,
    updateMetrics,
    setThresholds,
    clearAlerts,
    optimizePerformance,
    generateReport,
    exportMetrics,
    setAutoOptimize
  };

  return [state, actions];
};

export default usePerformanceDiagnostics;