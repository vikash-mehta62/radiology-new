/**
 * Tests for Performance Monitor
 */

import { performanceMonitor } from '../performanceMonitor';

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    }
  },
  writable: true
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    connection: {
      downlink: 10,
      rtt: 50,
      effectiveType: '4g'
    }
  },
  writable: true
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('Monitoring Control', () => {
    test('should start and stop monitoring', () => {
      expect(performanceMonitor).toBeDefined();
      
      performanceMonitor.startMonitoring();
      // Should not throw
      
      performanceMonitor.stopMonitoring();
      // Should not throw
    });
  });

  describe('Metrics Collection', () => {
    test('should collect current metrics', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics).toHaveProperty('renderingTime');
      expect(metrics).toHaveProperty('frameRate');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('networkLatency');
      expect(metrics).toHaveProperty('timestamp');
      expect(typeof metrics.timestamp).toBe('number');
    });

    test('should record image load time', () => {
      const loadTime = 1500; // 1.5 seconds
      
      performanceMonitor.recordImageLoadTime(loadTime);
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.imageLoadTime).toBe(loadTime);
    });

    test('should record study load time', () => {
      const loadTime = 5000; // 5 seconds
      
      performanceMonitor.recordStudyLoadTime(loadTime);
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.studyLoadTime).toBe(loadTime);
    });

    test('should update cache hit rate', () => {
      const hitRate = 0.85; // 85%
      
      performanceMonitor.updateCacheHitRate(hitRate);
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.cacheHitRate).toBe(hitRate);
    });
  });

  describe('Rendering Performance', () => {
    test('should track rendering performance', () => {
      const renderingMetrics = performanceMonitor.trackRenderingPerformance();
      
      expect(renderingMetrics).toHaveProperty('frameTime');
      expect(renderingMetrics).toHaveProperty('drawCalls');
      expect(renderingMetrics).toHaveProperty('renderingErrors');
    });

    test('should record rendering metrics', () => {
      const metrics = {
        frameTime: 16.67, // 60 FPS
        drawCalls: 1,
        textureMemory: 0,
        shaderCompileTime: 0,
        canvasResizes: 0,
        renderingErrors: []
      };
      
      performanceMonitor.recordRenderingMetrics(metrics);
      
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      expect(currentMetrics.renderingTime).toBe(metrics.frameTime);
      expect(currentMetrics.frameRate).toBeCloseTo(60, 1);
    });
  });

  describe('Memory Monitoring', () => {
    test('should monitor memory usage', () => {
      const memoryMetrics = performanceMonitor.monitorMemoryUsage();
      
      expect(memoryMetrics).toHaveProperty('heapUsed');
      expect(memoryMetrics).toHaveProperty('heapTotal');
      expect(memoryMetrics).toHaveProperty('domNodes');
      expect(typeof memoryMetrics.heapUsed).toBe('number');
    });
  });

  describe('Network Performance', () => {
    test('should measure network performance', () => {
      const networkMetrics = performanceMonitor.measureNetworkPerformance();
      
      expect(networkMetrics).toHaveProperty('downloadSpeed');
      expect(networkMetrics).toHaveProperty('latency');
      expect(networkMetrics).toHaveProperty('connectionType');
      expect(networkMetrics.downloadSpeed).toBe(10);
      expect(networkMetrics.latency).toBe(50);
    });
  });

  describe('System Health', () => {
    test('should evaluate system health', () => {
      // Set up good performance metrics
      performanceMonitor.recordRenderingMetrics({
        frameTime: 16.67, // 60 FPS
        drawCalls: 1,
        textureMemory: 0,
        shaderCompileTime: 0,
        canvasResizes: 0,
        renderingErrors: []
      });
      
      const health = performanceMonitor.getSystemHealth();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('rendering');
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('network');
      expect(health).toHaveProperty('userExperience');
      expect(health).toHaveProperty('recommendations');
      
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(health.overall);
    });

    test('should provide recommendations for poor performance', () => {
      // Set up poor performance metrics
      performanceMonitor.recordRenderingMetrics({
        frameTime: 50, // 20 FPS
        drawCalls: 1,
        textureMemory: 0,
        shaderCompileTime: 0,
        canvasResizes: 0,
        renderingErrors: []
      });
      
      const health = performanceMonitor.getSystemHealth();
      
      expect(health.recommendations.length).toBeGreaterThan(0);
      expect(health.rendering).toBe('poor');
    });
  });

  describe('Performance Reports', () => {
    test('should generate performance report', () => {
      // Add some metrics
      performanceMonitor.recordImageLoadTime(1000);
      performanceMonitor.recordStudyLoadTime(3000);
      performanceMonitor.updateCacheHitRate(0.8);
      
      const report = performanceMonitor.generatePerformanceReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('detailed');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('generatedAt');
      
      expect(typeof report.generatedAt).toBe('number');
    });
  });

  describe('Observers and Callbacks', () => {
    test('should add and remove metrics observers', () => {
      const callback = jest.fn();
      
      performanceMonitor.onMetricsUpdate(callback);
      performanceMonitor.removeMetricsObserver(callback);
      
      // Should not throw
      expect(true).toBe(true);
    });

    test('should add alert callbacks', () => {
      const callback = jest.fn();
      
      performanceMonitor.onAlert(callback);
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Performance Thresholds', () => {
    test('should create alerts for slow rendering', () => {
      const alertCallback = jest.fn();
      performanceMonitor.onAlert(alertCallback);
      
      // Record slow rendering
      performanceMonitor.recordRenderingMetrics({
        frameTime: 100, // Very slow
        drawCalls: 1,
        textureMemory: 0,
        shaderCompileTime: 0,
        canvasResizes: 0,
        renderingErrors: []
      });
      
      // Should have triggered an alert
      expect(alertCallback).toHaveBeenCalled();
    });

    test('should create alerts for high memory usage', () => {
      const alertCallback = jest.fn();
      performanceMonitor.onAlert(alertCallback);
      
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 200 * 1024 * 1024, // 200MB - high usage
          totalJSHeapSize: 300 * 1024 * 1024
        },
        configurable: true
      });
      
      performanceMonitor.monitorMemoryUsage();
      
      // Should have triggered an alert
      expect(alertCallback).toHaveBeenCalled();
    });
  });
});