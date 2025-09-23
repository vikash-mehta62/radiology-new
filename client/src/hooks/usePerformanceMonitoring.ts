/**
 * Performance Monitoring Hook for Radiology Applications
 * Tracks DICOM loading, rendering, and user interaction metrics
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../components/Accessibility/AccessibilityProvider';

// Performance Metric Types
interface DicomLoadingMetrics {
  studyId: string;
  seriesId?: string;
  instanceId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  fileSize?: number;
  loadingSpeed?: number; // MB/s
  status: 'loading' | 'completed' | 'failed' | 'cached';
  errorMessage?: string;
  cacheHit: boolean;
  networkLatency?: number;
  decompressionTime?: number;
}

interface RenderingMetrics {
  frameId: string;
  renderStartTime: number;
  renderEndTime?: number;
  renderDuration?: number;
  canvasSize: { width: number; height: number };
  imageSize: { width: number; height: number };
  zoomLevel: number;
  windowingApplied: boolean;
  filtersApplied: string[];
  fps?: number;
  memoryUsage?: number;
  gpuMemoryUsage?: number;
  webglEnabled: boolean;
}

interface UserInteractionMetrics {
  interactionId: string;
  type: 'zoom' | 'pan' | 'rotate' | 'windowing' | 'measurement' | 'annotation' | 'navigation';
  startTime: number;
  endTime?: number;
  duration?: number;
  inputMethod: 'mouse' | 'touch' | 'stylus' | 'keyboard';
  gestureType?: 'pinch' | 'swipe' | 'tap' | 'drag';
  pressure?: number; // For stylus
  accuracy?: number; // For measurements
  cancelled: boolean;
}

interface SystemMetrics {
  timestamp: number;
  cpuUsage?: number;
  memoryUsage: number;
  availableMemory: number;
  networkSpeed?: number;
  batteryLevel?: number;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  browserInfo: {
    name: string;
    version: string;
    webglSupported: boolean;
    touchSupported: boolean;
    stylusSupported: boolean;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  category: 'loading' | 'rendering' | 'interaction' | 'system';
  message: string;
  timestamp: number;
  metrics?: any;
  resolved: boolean;
}

interface PerformanceThresholds {
  dicomLoadingTime: number; // ms
  renderingTime: number; // ms
  interactionResponseTime: number; // ms
  memoryUsage: number; // MB
  minFPS: number;
  maxNetworkLatency: number; // ms
}

interface PerformanceState {
  dicomMetrics: DicomLoadingMetrics[];
  renderingMetrics: RenderingMetrics[];
  interactionMetrics: UserInteractionMetrics[];
  systemMetrics: SystemMetrics[];
  alerts: PerformanceAlert[];
  isMonitoring: boolean;
  thresholds: PerformanceThresholds;
  summary: {
    averageLoadTime: number;
    averageRenderTime: number;
    averageInteractionTime: number;
    currentFPS: number;
    memoryUsage: number;
    cacheHitRate: number;
    errorRate: number;
  };
}

// Default thresholds based on radiology workflow requirements
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  dicomLoadingTime: 3000, // 3 seconds for DICOM loading
  renderingTime: 16, // 60 FPS target
  interactionResponseTime: 100, // 100ms for responsive interactions
  memoryUsage: 1024, // 1GB memory usage warning
  minFPS: 30, // Minimum acceptable FPS
  maxNetworkLatency: 500, // 500ms network latency warning
};

export const usePerformanceMonitoring = () => {
  const { announceToScreenReader } = useAccessibility();
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  const metricsBufferRef = useRef<Map<string, any>>(new Map());
  const alertTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const [state, setState] = useState<PerformanceState>({
    dicomMetrics: [],
    renderingMetrics: [],
    interactionMetrics: [],
    systemMetrics: [],
    alerts: [],
    isMonitoring: false,
    thresholds: DEFAULT_THRESHOLDS,
    summary: {
      averageLoadTime: 0,
      averageRenderTime: 0,
      averageInteractionTime: 0,
      currentFPS: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorRate: 0,
    },
  });

  // Initialize performance monitoring
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          handlePerformanceEntry(entry);
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource', 'paint'] });
      performanceObserverRef.current = observer;

      // Start system metrics collection
      startSystemMetricsCollection();

      setState(prev => ({ ...prev, isMonitoring: true }));

      return () => {
        observer.disconnect();
        stopSystemMetricsCollection();
      };
    }
  }, []);

  // Handle DICOM loading metrics
  const handleDicomLoadingMetric = useCallback((entry: PerformanceEntry) => {
    // Process DICOM loading performance entry
    console.log('DICOM Loading Metric:', entry);
  }, []);

  // Handle rendering metrics
  const handleRenderingMetric = useCallback((entry: PerformanceEntry) => {
    // Process rendering performance entry
    console.log('Rendering Metric:', entry);
  }, []);

  // Handle interaction metrics
  const handleInteractionMetric = useCallback((entry: PerformanceEntry) => {
    // Process interaction performance entry
    console.log('Interaction Metric:', entry);
  }, []);

  // Handle DICOM resource metrics
  const handleDicomResourceMetric = useCallback((entry: PerformanceResourceTiming) => {
    // Process DICOM resource performance entry
    console.log('DICOM Resource Metric:', entry);
  }, []);

  // Handle performance entries
  const handlePerformanceEntry = useCallback((entry: PerformanceEntry) => {
    switch (entry.entryType) {
      case 'measure':
        if (entry.name.startsWith('dicom-load')) {
          handleDicomLoadingMetric(entry);
        } else if (entry.name.startsWith('render-frame')) {
          handleRenderingMetric(entry);
        } else if (entry.name.startsWith('interaction')) {
          handleInteractionMetric(entry);
        }
        break;
      case 'resource':
        if (entry.name.includes('.dcm') || entry.name.includes('dicom')) {
          handleDicomResourceMetric(entry as PerformanceResourceTiming);
        }
        break;
    }
  }, []);

  // DICOM Loading Metrics
  const startDicomLoading = useCallback((studyId: string, seriesId?: string, instanceId?: string) => {
    const loadingId = `${studyId}-${seriesId || 'series'}-${instanceId || 'instance'}`;
    const startTime = performance.now();
    
    performance.mark(`dicom-load-start-${loadingId}`);
    
    const metric: DicomLoadingMetrics = {
      studyId,
      seriesId,
      instanceId,
      startTime,
      status: 'loading',
      cacheHit: false,
    };

    metricsBufferRef.current.set(`dicom-${loadingId}`, metric);
    
    setState(prev => ({
      ...prev,
      dicomMetrics: [...prev.dicomMetrics, metric],
    }));

    return loadingId;
  }, []);

  const completeDicomLoading = useCallback((
    loadingId: string, 
    success: boolean, 
    fileSize?: number, 
    cacheHit: boolean = false,
    errorMessage?: string
  ) => {
    const endTime = performance.now();
    performance.mark(`dicom-load-end-${loadingId}`);
    performance.measure(`dicom-load-${loadingId}`, `dicom-load-start-${loadingId}`, `dicom-load-end-${loadingId}`);

    const bufferedMetric = metricsBufferRef.current.get(`dicom-${loadingId}`);
    if (bufferedMetric) {
      const duration = endTime - bufferedMetric.startTime;
      const loadingSpeed = fileSize ? (fileSize / 1024 / 1024) / (duration / 1000) : undefined;

      const updatedMetric: DicomLoadingMetrics = {
        ...bufferedMetric,
        endTime,
        duration,
        fileSize,
        loadingSpeed,
        status: success ? (cacheHit ? 'cached' : 'completed') : 'failed',
        cacheHit,
        errorMessage,
      };

      setState(prev => ({
        ...prev,
        dicomMetrics: prev.dicomMetrics.map(m => 
          m.studyId === bufferedMetric.studyId && 
          m.seriesId === bufferedMetric.seriesId && 
          m.instanceId === bufferedMetric.instanceId 
            ? updatedMetric 
            : m
        ),
      }));

      // Check thresholds and create alerts
      if (duration > state.thresholds.dicomLoadingTime) {
        createAlert('warning', 'loading', `DICOM loading took ${Math.round(duration)}ms (threshold: ${state.thresholds.dicomLoadingTime}ms)`, updatedMetric);
      }

      metricsBufferRef.current.delete(`dicom-${loadingId}`);
    }
  }, [state.thresholds.dicomLoadingTime]);

  // Rendering Metrics
  const startFrameRender = useCallback((frameId: string, canvasSize: { width: number; height: number }, imageSize: { width: number; height: number }, zoomLevel: number) => {
    const startTime = performance.now();
    performance.mark(`render-frame-start-${frameId}`);

    const metric: RenderingMetrics = {
      frameId,
      renderStartTime: startTime,
      canvasSize,
      imageSize,
      zoomLevel,
      windowingApplied: false,
      filtersApplied: [],
      webglEnabled: isWebGLEnabled(),
    };

    metricsBufferRef.current.set(`render-${frameId}`, metric);
    return frameId;
  }, []);

  const completeFrameRender = useCallback((frameId: string, windowingApplied: boolean = false, filtersApplied: string[] = []) => {
    const endTime = performance.now();
    performance.mark(`render-frame-end-${frameId}`);
    performance.measure(`render-frame-${frameId}`, `render-frame-start-${frameId}`, `render-frame-end-${frameId}`);

    const bufferedMetric = metricsBufferRef.current.get(`render-${frameId}`);
    if (bufferedMetric) {
      const duration = endTime - bufferedMetric.renderStartTime;
      const fps = 1000 / duration;

      const updatedMetric: RenderingMetrics = {
        ...bufferedMetric,
        renderEndTime: endTime,
        renderDuration: duration,
        windowingApplied,
        filtersApplied,
        fps,
        memoryUsage: getMemoryUsage(),
      };

      setState(prev => ({
        ...prev,
        renderingMetrics: [...prev.renderingMetrics.slice(-99), updatedMetric], // Keep last 100 frames
        summary: {
          ...prev.summary,
          currentFPS: fps,
        },
      }));

      // Check rendering performance
      if (duration > state.thresholds.renderingTime) {
        createAlert('warning', 'rendering', `Frame render took ${Math.round(duration)}ms (target: ${state.thresholds.renderingTime}ms)`, updatedMetric);
      }

      if (fps < state.thresholds.minFPS) {
        createAlert('warning', 'rendering', `Low FPS detected: ${Math.round(fps)} (minimum: ${state.thresholds.minFPS})`, updatedMetric);
      }

      metricsBufferRef.current.delete(`render-${frameId}`);
    }
  }, [state.thresholds.renderingTime, state.thresholds.minFPS]);

  // User Interaction Metrics
  const startInteraction = useCallback((
    type: UserInteractionMetrics['type'], 
    inputMethod: UserInteractionMetrics['inputMethod'],
    gestureType?: UserInteractionMetrics['gestureType'],
    pressure?: number
  ) => {
    const interactionId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    performance.mark(`interaction-start-${interactionId}`);

    const metric: UserInteractionMetrics = {
      interactionId,
      type,
      startTime,
      inputMethod,
      gestureType,
      pressure,
      cancelled: false,
    };

    metricsBufferRef.current.set(`interaction-${interactionId}`, metric);
    return interactionId;
  }, []);

  const completeInteraction = useCallback((interactionId: string, cancelled: boolean = false, accuracy?: number) => {
    const endTime = performance.now();
    performance.mark(`interaction-end-${interactionId}`);
    performance.measure(`interaction-${interactionId}`, `interaction-start-${interactionId}`, `interaction-end-${interactionId}`);

    const bufferedMetric = metricsBufferRef.current.get(`interaction-${interactionId}`);
    if (bufferedMetric) {
      const duration = endTime - bufferedMetric.startTime;

      const updatedMetric: UserInteractionMetrics = {
        ...bufferedMetric,
        endTime,
        duration,
        cancelled,
        accuracy,
      };

      setState(prev => ({
        ...prev,
        interactionMetrics: [...prev.interactionMetrics.slice(-199), updatedMetric], // Keep last 200 interactions
      }));

      // Check interaction responsiveness
      if (!cancelled && duration > state.thresholds.interactionResponseTime) {
        createAlert('warning', 'interaction', `Slow interaction response: ${Math.round(duration)}ms (threshold: ${state.thresholds.interactionResponseTime}ms)`, updatedMetric);
      }

      metricsBufferRef.current.delete(`interaction-${interactionId}`);
    }
  }, [state.thresholds.interactionResponseTime]);

  // System Metrics Collection
  const collectSystemMetrics = useCallback(() => {
    const memoryInfo = (performance as any).memory;
    const connection = (navigator as any).connection;
    const battery = (navigator as any).battery;

    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      memoryUsage: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0,
      availableMemory: memoryInfo ? Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) : 0,
      networkSpeed: connection ? connection.downlink : undefined,
      batteryLevel: battery ? battery.level * 100 : undefined,
      deviceType: getDeviceType(),
      browserInfo: {
        name: getBrowserName(),
        version: getBrowserVersion(),
        webglSupported: isWebGLEnabled(),
        touchSupported: 'ontouchstart' in window,
        stylusSupported: 'PointerEvent' in window,
      },
    };

    setState(prev => ({
      ...prev,
      systemMetrics: [...prev.systemMetrics.slice(-59), metrics], // Keep last hour (1 per minute)
      summary: {
        ...prev.summary,
        memoryUsage: metrics.memoryUsage,
      },
    }));

    // Check system thresholds
    if (metrics.memoryUsage > state.thresholds.memoryUsage) {
      createAlert('warning', 'system', `High memory usage: ${metrics.memoryUsage}MB (threshold: ${state.thresholds.memoryUsage}MB)`, metrics);
    }
  }, [state.thresholds.memoryUsage]);

  // Alert Management
  const createAlert = useCallback((
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    message: string,
    metrics?: any
  ) => {
    const alertId = `${category}-${Date.now()}`;
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      category,
      message,
      timestamp: Date.now(),
      metrics,
      resolved: false,
    };

    setState(prev => ({
      ...prev,
      alerts: [...prev.alerts.slice(-49), alert], // Keep last 50 alerts
    }));

    // Announce critical alerts to screen readers
    if (type === 'error') {
      announceToScreenReader(`Performance alert: ${message}`);
    }

    // Auto-resolve alerts after 5 minutes
    const timeout = setTimeout(() => {
      resolveAlert(alertId);
    }, 5 * 60 * 1000);

    alertTimeoutRef.current.set(alertId, timeout);
  }, [announceToScreenReader]);

  const resolveAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ),
    }));

    const timeout = alertTimeoutRef.current.get(alertId);
    if (timeout) {
      clearTimeout(timeout);
      alertTimeoutRef.current.delete(alertId);
    }
  }, []);

  // Utility Functions
  const isWebGLEnabled = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }, []);

  const getMemoryUsage = useCallback(() => {
    const memoryInfo = (performance as any).memory;
    return memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0;
  }, []);

  const getDeviceType = useCallback((): SystemMetrics['deviceType'] => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) return 'mobile';
    return 'desktop';
  }, []);

  const getBrowserName = useCallback(() => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }, []);

  const getBrowserVersion = useCallback(() => {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(chrome|firefox|safari|edge)\/(\d+)/i);
    return match ? match[2] : 'Unknown';
  }, []);

  // System metrics collection interval
  const startSystemMetricsCollection = useCallback(() => {
    const interval = setInterval(collectSystemMetrics, 60000); // Every minute
    return () => clearInterval(interval);
  }, [collectSystemMetrics]);

  const stopSystemMetricsCollection = useCallback(() => {
    // Cleanup handled by useEffect return
  }, []);

  // Calculate summary statistics
  useEffect(() => {
    const completedDicomLoads = state.dicomMetrics.filter(m => m.duration);
    const completedRenders = state.renderingMetrics.filter(m => m.renderDuration);
    const completedInteractions = state.interactionMetrics.filter(m => m.duration && !m.cancelled);

    const averageLoadTime = completedDicomLoads.length > 0 
      ? completedDicomLoads.reduce((sum, m) => sum + (m.duration || 0), 0) / completedDicomLoads.length 
      : 0;

    const averageRenderTime = completedRenders.length > 0
      ? completedRenders.reduce((sum, m) => sum + (m.renderDuration || 0), 0) / completedRenders.length
      : 0;

    const averageInteractionTime = completedInteractions.length > 0
      ? completedInteractions.reduce((sum, m) => sum + (m.duration || 0), 0) / completedInteractions.length
      : 0;

    const cacheHitRate = completedDicomLoads.length > 0
      ? (completedDicomLoads.filter(m => m.cacheHit).length / completedDicomLoads.length) * 100
      : 0;

    const errorRate = state.dicomMetrics.length > 0
      ? (state.dicomMetrics.filter(m => m.status === 'failed').length / state.dicomMetrics.length) * 100
      : 0;

    setState(prev => ({
      ...prev,
      summary: {
        ...prev.summary,
        averageLoadTime,
        averageRenderTime,
        averageInteractionTime,
        cacheHitRate,
        errorRate,
      },
    }));
  }, [state.dicomMetrics, state.renderingMetrics, state.interactionMetrics]);

  // Export metrics
  const exportMetrics = useCallback((format: 'json' | 'csv' = 'json') => {
    const data = {
      timestamp: new Date().toISOString(),
      summary: state.summary,
      dicomMetrics: state.dicomMetrics,
      renderingMetrics: state.renderingMetrics,
      interactionMetrics: state.interactionMetrics,
      systemMetrics: state.systemMetrics,
      alerts: state.alerts,
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Convert to CSV format
      return convertToCSV(data);
    }
  }, [state]);

  const convertToCSV = useCallback((data: any) => {
    // Simple CSV conversion - can be enhanced
    const csvRows = [];
    csvRows.push('Type,Timestamp,Duration,Status,Details');
    
    data.dicomMetrics.forEach((metric: DicomLoadingMetrics) => {
      csvRows.push(`DICOM Load,${metric.startTime},${metric.duration || 0},${metric.status},"${metric.studyId}"`);
    });

    return csvRows.join('\n');
  }, []);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    setState(prev => ({
      ...prev,
      dicomMetrics: [],
      renderingMetrics: [],
      interactionMetrics: [],
      systemMetrics: [],
      alerts: [],
    }));
  }, []);

  // Update thresholds
  const updateThresholds = useCallback((newThresholds: Partial<PerformanceThresholds>) => {
    setState(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, ...newThresholds },
    }));
  }, []);

  return {
    // State
    ...state,
    
    // DICOM Loading
    startDicomLoading,
    completeDicomLoading,
    
    // Rendering
    startFrameRender,
    completeFrameRender,
    
    // Interactions
    startInteraction,
    completeInteraction,
    
    // System
    collectSystemMetrics,
    
    // Alerts
    createAlert,
    resolveAlert,
    
    // Utilities
    exportMetrics,
    clearMetrics,
    updateThresholds,
  };
};