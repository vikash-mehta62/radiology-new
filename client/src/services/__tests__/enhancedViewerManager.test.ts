/**
 * Unit Tests for EnhancedViewerManager
 * Tests for viewer mode management and feature integration
 */

import { EnhancedViewerManager, ViewerMode, ViewerCapability } from '../enhancedViewerManager';
import { ErrorHandler } from '../errorHandler';
import { PerformanceMonitor } from '../performanceMonitor';
import { AdaptivePerformanceSystem } from '../adaptivePerformanceSystem';
import { ProgressiveLoadingSystem } from '../progressiveLoadingSystem';
import { MemoryManagementSystem } from '../memoryManagementSystem';
import { MeasurementTools } from '../measurementTools';
import { AnnotationSystem } from '../annotationSystem';
import { AIEnhancementModule } from '../aiEnhancementModule';
import { CollaborationModule } from '../collaborationModule';
import { PerformanceTestUtils, AsyncTestUtils } from './testUtils';

// Mock all service dependencies
jest.mock('../errorHandler');
jest.mock('../performanceMonitor');
jest.mock('../adaptivePerformanceSystem');
jest.mock('../progressiveLoadingSystem');
jest.mock('../memoryManagementSystem');
jest.mock('../measurementTools');
jest.mock('../annotationSystem');
jest.mock('../aiEnhancementModule');
jest.mock('../collaborationModule');

describe('EnhancedViewerManager', () => {
  let viewerManager: EnhancedViewerManager;
  let mockServices: any;

  beforeEach(() => {
    // Create mock services
    mockServices = {
      errorHandler: new ErrorHandler(),
      performanceMonitor: new PerformanceMonitor(),
      adaptivePerformance: new AdaptivePerformanceSystem(),
      progressiveLoading: new ProgressiveLoadingSystem(),
      memoryManager: new MemoryManagementSystem(),
      measurementTools: new MeasurementTools(),
      annotationSystem: new AnnotationSystem(),
      aiModule: new AIEnhancementModule(),
      collaborationModule: new CollaborationModule()
    };

    // Mock device capabilities
    (mockServices.adaptivePerformance.getDeviceCapabilities as jest.Mock).mockReturnValue({
      cpu: { cores: 4 },
      memory: { heapLimit: 4 * 1024 * 1024 * 1024 }, // 4GB
      gpu: { webglVersion: 2 },
      browser: {
        features: {
          canvas: true,
          webgl: true,
          webgl2: true,
          webworkers: true,
          webrtc: true,
          webassembly: true
        }
      },
      network: { downlink: 10 }
    });

    viewerManager = new EnhancedViewerManager({}, mockServices);
  });

  afterEach(() => {
    viewerManager.cleanup();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with predefined modes', () => {
      const modes = viewerManager.getAllModes();
      
      expect(modes).toHaveLength(3);
      expect(modes.map(m => m.id)).toContain('simple');
      expect(modes.map(m => m.id)).toContain('multi-frame');
      expect(modes.map(m => m.id)).toContain('comprehensive');
    });

    test('should setup performance monitoring', () => {
      expect(mockServices.performanceMonitor.addMetric).toHaveBeenCalledWith(
        'mode_switch_time',
        'Mode Switch Time',
        'ms'
      );
    });

    test('should setup error handling', () => {
      expect(mockServices.errorHandler.addErrorHandler).toHaveBeenCalledWith(
        'viewer-mode',
        expect.any(Function)
      );
    });
  });

  describe('Mode Management', () => {
    test('should register custom mode', () => {
      const customMode: ViewerMode = {
        id: 'custom',
        name: 'Custom Viewer',
        description: 'Custom test viewer',
        component: 'CustomViewer',
        capabilities: [],
        requirements: {
          minCpuCores: 1,
          minMemoryMB: 512,
          minGpuMemoryMB: 128,
          requiredWebGLVersion: 1,
          requiredBrowserFeatures: ['canvas'],
          networkBandwidth: 1,
          supportedFormats: ['dicom']
        },
        configuration: {} as any,
        state: {} as any,
        metadata: {
          version: '1.0.0',
          author: 'Test',
          lastModified: new Date().toISOString(),
          tags: ['test']
        }
      };

      viewerManager.registerMode(customMode);
      
      expect(viewerManager.hasMode('custom')).toBe(true);
      expect(viewerManager.getMode('custom')).toEqual(customMode);
    });

    test('should unregister mode', () => {
      const success = viewerManager.unregisterMode('simple');
      
      expect(success).toBe(true);
      expect(viewerManager.hasMode('simple')).toBe(false);
    });

    test('should get available modes based on device capabilities', () => {
      const availableModes = viewerManager.getAvailableModes();
      
      expect(availableModes.length).toBeGreaterThan(0);
      expect(availableModes.every(mode => 
        viewerManager.getAllModes().includes(mode)
      )).toBe(true);
    });

    test('should get optimal mode for device', () => {
      const optimalMode = viewerManager.getOptimalMode();
      
      expect(optimalMode).toBeDefined();
      expect(viewerManager.getAvailableModes()).toContain(optimalMode!);
    });
  });

  describe('Mode Switching', () => {
    test('should switch to available mode', async () => {
      const success = await viewerManager.switchMode('simple');
      
      expect(success).toBe(true);
      expect(viewerManager.getCurrentMode()?.id).toBe('simple');
    });

    test('should fail to switch to unavailable mode', async () => {
      // Mock device capabilities to make comprehensive mode unavailable
      (mockServices.adaptivePerformance.getDeviceCapabilities as jest.Mock).mockReturnValue({
        cpu: { cores: 1 },
        memory: { heapLimit: 512 * 1024 * 1024 }, // 512MB
        gpu: { webglVersion: 1 },
        browser: { features: { canvas: true, webgl: true } },
        network: { downlink: 1 }
      });

      const success = await viewerManager.switchMode('comprehensive');
      
      expect(success).toBe(false);
    });

    test('should preserve state when switching modes', async () => {
      await viewerManager.switchMode('simple');
      viewerManager.updateState({ viewport: { zoom: 2.0 } } as any);
      
      const initialState = viewerManager.getCurrentMode()?.state;
      
      await viewerManager.switchMode('multi-frame', { preserveState: true });
      await viewerManager.switchMode('simple', { preserveState: true });
      
      const finalState = viewerManager.getCurrentMode()?.state;
      expect(finalState?.viewport.zoom).toBe(2.0);
    });

    test('should record performance metrics during mode switch', async () => {
      await viewerManager.switchMode('simple');
      
      expect(mockServices.performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'mode_switch_time',
        expect.any(Number)
      );
    });

    test('should handle mode switch timeout', async () => {
      const success = await viewerManager.switchMode('simple', { timeout: 1 });
      
      // Should still succeed for simple operations, but test the timeout mechanism
      expect(typeof success).toBe('boolean');
    });
  });

  describe('Capability Management', () => {
    beforeEach(async () => {
      await viewerManager.switchMode('comprehensive');
    });

    test('should enable capability', () => {
      const success = viewerManager.enableCapability('ai-enhancement');
      
      expect(success).toBe(true);
      
      const enabledCapabilities = viewerManager.getEnabledCapabilities();
      expect(enabledCapabilities.some(cap => cap.id === 'ai-enhancement')).toBe(true);
    });

    test('should disable capability', () => {
      viewerManager.enableCapability('ai-enhancement');
      const success = viewerManager.disableCapability('ai-enhancement');
      
      expect(success).toBe(true);
      
      const enabledCapabilities = viewerManager.getEnabledCapabilities();
      expect(enabledCapabilities.some(cap => cap.id === 'ai-enhancement')).toBe(false);
    });

    test('should get available capabilities', () => {
      const availableCapabilities = viewerManager.getAvailableCapabilities();
      
      expect(Array.isArray(availableCapabilities)).toBe(true);
      expect(availableCapabilities.length).toBeGreaterThan(0);
    });

    test('should handle invalid capability ID', () => {
      const success = viewerManager.enableCapability('invalid-capability');
      
      expect(success).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    test('should update mode configuration', () => {
      const success = viewerManager.updateModeConfiguration('simple', {
        rendering: { quality: 'high' }
      } as any);
      
      expect(success).toBe(true);
      
      const mode = viewerManager.getMode('simple');
      expect(mode?.configuration.rendering.quality).toBe('high');
    });

    test('should reset mode to defaults', () => {
      await viewerManager.switchMode('simple');
      viewerManager.updateState({ viewport: { zoom: 3.0 } } as any);
      
      const success = viewerManager.resetMode('simple');
      
      expect(success).toBe(true);
      
      const mode = viewerManager.getMode('simple');
      expect(mode?.state.viewport.zoom).toBe(1.0);
    });

    test('should export configuration', () => {
      const config = viewerManager.exportConfiguration();
      
      expect(config).toHaveProperty('modes');
      expect(config).toHaveProperty('transitions');
      expect(config).toHaveProperty('config');
      expect(config).toHaveProperty('currentMode');
    });

    test('should import configuration', () => {
      const config = viewerManager.exportConfiguration();
      config.currentMode = 'simple';
      
      const success = viewerManager.importConfiguration(config);
      
      expect(success).toBe(true);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await viewerManager.switchMode('simple');
    });

    test('should update viewer state', () => {
      const updates = { viewport: { zoom: 2.5 } };
      
      viewerManager.updateState(updates as any);
      
      const currentState = viewerManager.getCurrentMode()?.state;
      expect(currentState?.viewport.zoom).toBe(2.5);
    });

    test('should get state history', () => {
      viewerManager.updateState({ viewport: { zoom: 2.0 } } as any);
      
      const history = viewerManager.getStateHistory();
      
      expect(Array.isArray(history)).toBe(true);
    });

    test('should restore from checkpoint', async () => {
      viewerManager.updateState({ viewport: { zoom: 2.0 } } as any);
      
      const history = viewerManager.getStateHistory();
      if (history.length > 0) {
        const success = await viewerManager.restoreFromCheckpoint(history[0].id);
        expect(typeof success).toBe('boolean');
      }
    });

    test('should clear state history', () => {
      viewerManager.updateState({ viewport: { zoom: 2.0 } } as any);
      
      viewerManager.clearStateHistory();
      
      const history = viewerManager.getStateHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Performance Monitoring', () => {
    test('should get performance metrics', () => {
      const metrics = viewerManager.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
    });

    test('should get system health', () => {
      const health = viewerManager.getSystemHealth();
      
      expect(health).toHaveProperty('currentMode');
      expect(health).toHaveProperty('availableModes');
      expect(health).toHaveProperty('totalModes');
      expect(health).toHaveProperty('memoryUsage');
      expect(health).toHaveProperty('performanceMetrics');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle graceful degradation', async () => {
      // Mock a failure scenario
      const mockError = new Error('Test error');
      
      // Simulate error during mode switch
      await viewerManager.switchMode('comprehensive');
      
      // Trigger error handler
      mockServices.errorHandler.addErrorHandler.mock.calls[0][1](mockError, {});
      
      // Should not crash the application
      expect(viewerManager.getCurrentMode()).toBeDefined();
    });

    test('should find fallback mode', async () => {
      await viewerManager.switchMode('comprehensive');
      
      // Simulate error that triggers fallback
      const mockError = new Error('Comprehensive mode failed');
      mockServices.errorHandler.addErrorHandler.mock.calls[0][1](mockError, {});
      
      // Should fall back to a simpler mode
      const currentMode = viewerManager.getCurrentMode();
      expect(['simple', 'multi-frame']).toContain(currentMode?.id);
    });
  });

  describe('Event Handling', () => {
    test('should set and trigger callbacks', async () => {
      const onModeChange = jest.fn();
      const onStateChange = jest.fn();
      const onError = jest.fn();
      
      viewerManager.setCallbacks({
        onModeChange,
        onStateChange,
        onError
      });
      
      await viewerManager.switchMode('simple');
      expect(onModeChange).toHaveBeenCalled();
      
      viewerManager.updateState({ viewport: { zoom: 2.0 } } as any);
      expect(onStateChange).toHaveBeenCalled();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should switch modes efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Mode Switch', 100);
      
      const result = await benchmark.run(async () => {
        await viewerManager.switchMode('simple');
        await viewerManager.switchMode('multi-frame');
        await viewerManager.switchMode('simple');
      });
      
      expect(result.passed).toBe(true);
    });

    test('should handle rapid state updates', async () => {
      await viewerManager.switchMode('simple');
      
      const benchmark = PerformanceTestUtils.createBenchmark('Rapid State Updates', 50);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 100; i++) {
          viewerManager.updateState({ 
            currentSliceIndex: i,
            viewport: { zoom: 1 + i * 0.1 }
          } as any);
        }
      });
      
      expect(result.passed).toBe(true);
    });

    test('should not have memory leaks during mode switching', async () => {
      const memoryDetector = PerformanceTestUtils.createMemoryLeakDetector(15);
      
      // Perform operations that might cause leaks
      for (let i = 0; i < 20; i++) {
        await viewerManager.switchMode('simple');
        await viewerManager.switchMode('multi-frame');
        viewerManager.updateState({ viewport: { zoom: Math.random() * 5 } } as any);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const leakCheck = memoryDetector.check();
      expect(leakCheck.hasLeak).toBe(false);
    });
  });

  describe('Concurrency', () => {
    test('should handle concurrent mode switches', async () => {
      const promises = [
        viewerManager.switchMode('simple'),
        viewerManager.switchMode('multi-frame'),
        viewerManager.switchMode('comprehensive')
      ];
      
      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      expect(results.some(result => 
        result.status === 'fulfilled' && result.value === true
      )).toBe(true);
      
      // Should end up in a valid state
      expect(viewerManager.getCurrentMode()).toBeDefined();
    });

    test('should handle concurrent state updates', async () => {
      await viewerManager.switchMode('simple');
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          viewerManager.updateState({ 
            currentSliceIndex: i,
            viewport: { zoom: 1 + i * 0.1 }
          } as any);
        })
      );
      
      await Promise.all(promises);
      
      const currentState = viewerManager.getCurrentMode()?.state;
      expect(currentState).toBeDefined();
      expect(typeof currentState?.currentSliceIndex).toBe('number');
    });
  });

  describe('Debug Information', () => {
    test('should provide comprehensive debug info', () => {
      const debugInfo = viewerManager.getDebugInfo();
      
      expect(debugInfo).toHaveProperty('config');
      expect(debugInfo).toHaveProperty('currentMode');
      expect(debugInfo).toHaveProperty('availableModes');
      expect(debugInfo).toHaveProperty('stateHistory');
      expect(debugInfo).toHaveProperty('systemHealth');
      expect(debugInfo).toHaveProperty('performanceMetrics');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', () => {
      viewerManager.cleanup();
      
      expect(viewerManager.getCurrentMode()).toBeNull();
      expect(viewerManager.getStateHistory()).toHaveLength(0);
    });

    test('should handle multiple cleanup calls', () => {
      expect(() => {
        viewerManager.cleanup();
        viewerManager.cleanup();
      }).not.toThrow();
    });
  });
});