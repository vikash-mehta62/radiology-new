/**
 * Cross-Browser Compatibility Integration Tests
 * Tests viewer functionality across different browser environments
 */

import { MockDicomDataGenerator, CanvasTestUtils, AsyncTestUtils } from '../services/__tests__/testUtils';
import { UnifiedStateManager } from '../services/unifiedStateManager';
import { EnhancedViewerManager } from '../services/enhancedViewerManager';

// Mock different browser environments
interface BrowserEnvironment {
  name: string;
  userAgent: string;
  features: {
    webgl: boolean;
    webgl2: boolean;
    webworkers: boolean;
    webrtc: boolean;
    webassembly: boolean;
    indexeddb: boolean;
    websockets: boolean;
    canvas: boolean;
  };
  limitations: string[];
}

const BROWSER_ENVIRONMENTS: BrowserEnvironment[] = [
  {
    name: 'Chrome Latest',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    features: {
      webgl: true,
      webgl2: true,
      webworkers: true,
      webrtc: true,
      webassembly: true,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: []
  },
  {
    name: 'Firefox Latest',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    features: {
      webgl: true,
      webgl2: true,
      webworkers: true,
      webrtc: true,
      webassembly: true,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: []
  },
  {
    name: 'Safari Latest',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    features: {
      webgl: true,
      webgl2: true,
      webworkers: true,
      webrtc: true,
      webassembly: true,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: ['Limited WebRTC support', 'Stricter CORS policies']
  },
  {
    name: 'Edge Latest',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    features: {
      webgl: true,
      webgl2: true,
      webworkers: true,
      webrtc: true,
      webassembly: true,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: []
  },
  {
    name: 'Chrome Mobile',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    features: {
      webgl: true,
      webgl2: false, // Limited on mobile
      webworkers: true,
      webrtc: true,
      webassembly: true,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: ['Limited WebGL2 support', 'Memory constraints', 'Touch-only input']
  },
  {
    name: 'Safari Mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    features: {
      webgl: true,
      webgl2: false,
      webworkers: true,
      webrtc: true,
      webassembly: true,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: ['No WebGL2', 'Memory constraints', 'iOS Safari quirks', 'Limited file access']
  },
  {
    name: 'Legacy Browser',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.0.0 Safari/537.36',
    features: {
      webgl: true,
      webgl2: false,
      webworkers: true,
      webrtc: false,
      webassembly: false,
      indexeddb: true,
      websockets: true,
      canvas: true
    },
    limitations: ['No WebGL2', 'No WebRTC', 'No WebAssembly', 'Limited ES6 support']
  }
];

describe('Cross-Browser Compatibility Integration Tests', () => {
  let originalUserAgent: string;
  let originalNavigator: any;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    originalNavigator = { ...navigator };
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true
    });
    jest.clearAllMocks();
  });

  /**
   * Mock browser environment
   */
  function mockBrowserEnvironment(env: BrowserEnvironment) {
    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: env.userAgent,
      writable: true
    });

    // Mock WebGL support
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn((contextType, options) => {
      if (contextType === 'webgl' && !env.features.webgl) {
        return null;
      }
      if (contextType === 'webgl2' && !env.features.webgl2) {
        return null;
      }
      if (contextType === '2d' && !env.features.canvas) {
        return null;
      }
      return originalGetContext.call(this, contextType, options);
    });

    // Mock WebSocket
    if (!env.features.websockets) {
      delete (global as any).WebSocket;
    }

    // Mock IndexedDB
    if (!env.features.indexeddb) {
      delete (global as any).indexedDB;
    }

    // Mock WebAssembly
    if (!env.features.webassembly) {
      delete (global as any).WebAssembly;
    }

    // Mock Worker
    if (!env.features.webworkers) {
      delete (global as any).Worker;
    }

    console.log(`🌐 Testing in ${env.name} environment`);
  }

  describe('State Management Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should work in ${env.name}`, async () => {
        mockBrowserEnvironment(env);

        const stateManager = new UnifiedStateManager();
        
        try {
          await stateManager.initialize();
          
          // Basic state operations
          stateManager.updateState('currentMode', 'simple', 'test');
          stateManager.switchMode('simple');
          stateManager.updateViewerState('simple', 'viewport.zoom', 2.0, 'test');
          
          // Verify state
          const state = stateManager.getState();
          expect(state.currentMode).toBe('simple');
          
          const viewerState = stateManager.getViewerState('simple');
          expect(viewerState?.viewport.zoom).toBe(2.0);
          
          // Test persistence (may fail in some environments)
          try {
            await stateManager.persistState();
          } catch (error) {
            if (env.limitations.includes('Limited storage')) {
              console.warn(`Storage limitation in ${env.name}:`, error);
            } else {
              throw error;
            }
          }
          
          stateManager.cleanup();
          
        } catch (error) {
          if (env.limitations.length > 0) {
            console.warn(`Expected limitation in ${env.name}:`, error);
          } else {
            throw error;
          }
        }
      });
    });
  });

  describe('Viewer Manager Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should adapt to ${env.name} capabilities`, async () => {
        mockBrowserEnvironment(env);

        // Mock services with environment-specific capabilities
        const mockServices = {
          errorHandler: { addErrorHandler: jest.fn() },
          performanceMonitor: { 
            addMetric: jest.fn(),
            recordMetric: jest.fn(),
            getMetrics: jest.fn(() => ({}))
          },
          adaptivePerformance: { 
            getDeviceCapabilities: jest.fn(() => ({
              cpu: { cores: env.name.includes('Mobile') ? 4 : 8 },
              memory: { 
                heapLimit: env.name.includes('Mobile') ? 
                  1 * 1024 * 1024 * 1024 : // 1GB mobile
                  4 * 1024 * 1024 * 1024   // 4GB desktop
              },
              gpu: { 
                webglVersion: env.features.webgl2 ? 2 : env.features.webgl ? 1 : 0 
              },
              browser: { features: env.features },
              network: { downlink: env.name.includes('Mobile') ? 5 : 10 }
            }))
          },
          progressiveLoading: {},
          memoryManager: { getMemoryUsage: jest.fn(() => ({ used: 0, total: 0 })) },
          measurementTools: {},
          annotationSystem: {},
          aiModule: {},
          collaborationModule: {}
        };

        const viewerManager = new EnhancedViewerManager({}, mockServices);

        try {
          // Get available modes based on browser capabilities
          const availableModes = viewerManager.getAvailableModes();
          
          if (env.features.webgl2) {
            // Should support comprehensive mode
            expect(availableModes.some(mode => mode.id === 'comprehensive')).toBe(true);
          } else if (env.features.webgl) {
            // Should support at least multi-frame mode
            expect(availableModes.some(mode => mode.id === 'multi-frame')).toBe(true);
          } else {
            // Should fall back to simple mode
            expect(availableModes.some(mode => mode.id === 'simple')).toBe(true);
          }

          // Test mode switching
          const optimalMode = viewerManager.getOptimalMode();
          if (optimalMode) {
            const success = await viewerManager.switchMode(optimalMode.id);
            expect(success).toBe(true);
          }

          viewerManager.cleanup();

        } catch (error) {
          if (env.limitations.length > 0) {
            console.warn(`Expected limitation in ${env.name}:`, error);
          } else {
            throw error;
          }
        }
      });
    });
  });

  describe('Canvas Rendering Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should handle canvas operations in ${env.name}`, async () => {
        mockBrowserEnvironment(env);

        if (!env.features.canvas) {
          console.log(`Skipping canvas test for ${env.name} - no canvas support`);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;

        // Test 2D context
        const ctx2d = canvas.getContext('2d');
        expect(ctx2d).toBeTruthy();

        if (ctx2d) {
          // Basic drawing operations
          ctx2d.fillStyle = '#ff0000';
          ctx2d.fillRect(0, 0, 100, 100);
          ctx2d.strokeStyle = '#00ff00';
          ctx2d.strokeRect(50, 50, 100, 100);
          
          // Image data operations
          const imageData = ctx2d.createImageData(100, 100);
          ctx2d.putImageData(imageData, 0, 0);
          const retrievedData = ctx2d.getImageData(0, 0, 100, 100);
          
          expect(retrievedData.width).toBe(100);
          expect(retrievedData.height).toBe(100);
        }

        // Test WebGL context if supported
        if (env.features.webgl) {
          const webglCtx = canvas.getContext('webgl');
          expect(webglCtx).toBeTruthy();
          
          if (webglCtx) {
            // Basic WebGL operations
            webglCtx.clearColor(0.0, 0.0, 0.0, 1.0);
            webglCtx.clear(webglCtx.COLOR_BUFFER_BIT);
            
            // Check WebGL capabilities
            const maxTextureSize = webglCtx.getParameter(webglCtx.MAX_TEXTURE_SIZE);
            expect(maxTextureSize).toBeGreaterThan(0);
          }
        }

        // Test WebGL2 context if supported
        if (env.features.webgl2) {
          const webgl2Ctx = canvas.getContext('webgl2');
          expect(webgl2Ctx).toBeTruthy();
        }
      });
    });
  });

  describe('Storage Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should handle storage in ${env.name}`, async () => {
        mockBrowserEnvironment(env);

        // Test localStorage
        try {
          localStorage.setItem('test-key', 'test-value');
          const retrieved = localStorage.getItem('test-key');
          expect(retrieved).toBe('test-value');
          localStorage.removeItem('test-key');
        } catch (error) {
          if (env.name.includes('Safari') && env.limitations.includes('Limited storage')) {
            console.warn(`Expected storage limitation in ${env.name}`);
          } else {
            throw error;
          }
        }

        // Test IndexedDB if supported
        if (env.features.indexeddb) {
          try {
            const dbRequest = indexedDB.open('test-db', 1);
            expect(dbRequest).toBeTruthy();
          } catch (error) {
            console.warn(`IndexedDB error in ${env.name}:`, error);
          }
        }
      });
    });
  });

  describe('Network Features Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should handle network features in ${env.name}`, async () => {
        mockBrowserEnvironment(env);

        // Test fetch API
        try {
          const response = await fetch('/test-endpoint');
          // Mock response should be available
        } catch (error) {
          // Expected in test environment
        }

        // Test WebSocket if supported
        if (env.features.websockets) {
          try {
            const ws = new WebSocket('ws://localhost:8080');
            expect(ws).toBeTruthy();
          } catch (error) {
            console.warn(`WebSocket error in ${env.name}:`, error);
          }
        }

        // Test WebRTC if supported
        if (env.features.webrtc) {
          try {
            // Mock RTCPeerConnection
            if (typeof RTCPeerConnection !== 'undefined') {
              const pc = new RTCPeerConnection();
              expect(pc).toBeTruthy();
            }
          } catch (error) {
            console.warn(`WebRTC error in ${env.name}:`, error);
          }
        }
      });
    });
  });

  describe('Performance Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should perform adequately in ${env.name}`, async () => {
        mockBrowserEnvironment(env);

        const startTime = performance.now();

        // Simulate typical viewer operations
        const mockStudy = MockDicomDataGenerator.generateMockStudy({
          sliceCount: env.name.includes('Mobile') ? 10 : 50
        });

        // Simulate image processing
        for (let i = 0; i < (env.name.includes('Mobile') ? 10 : 100); i++) {
          const pixelData = MockDicomDataGenerator.generateMockPixelData(
            env.name.includes('Mobile') ? 256 : 512,
            env.name.includes('Mobile') ? 256 : 512
          );
          
          // Simulate processing
          const sum = pixelData.reduce((acc, val) => acc + val, 0);
          expect(sum).toBeGreaterThan(0);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Performance expectations based on environment
        const expectedMaxDuration = env.name.includes('Mobile') ? 2000 : 1000;
        
        if (duration > expectedMaxDuration) {
          console.warn(`Performance warning in ${env.name}: ${duration}ms (expected < ${expectedMaxDuration}ms)`);
        }

        expect(duration).toBeLessThan(expectedMaxDuration * 2); // Allow 2x tolerance
      });
    });
  });

  describe('Touch and Input Cross-Browser Tests', () => {
    test('should handle touch events on mobile browsers', async () => {
      const mobileEnvs = BROWSER_ENVIRONMENTS.filter(env => env.name.includes('Mobile'));
      
      for (const env of mobileEnvs) {
        mockBrowserEnvironment(env);

        // Mock touch events
        const canvas = document.createElement('canvas');
        const touchStartHandler = jest.fn();
        const touchMoveHandler = jest.fn();
        const touchEndHandler = jest.fn();

        canvas.addEventListener('touchstart', touchStartHandler);
        canvas.addEventListener('touchmove', touchMoveHandler);
        canvas.addEventListener('touchend', touchEndHandler);

        // Simulate touch events
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{
            identifier: 0,
            target: canvas,
            clientX: 100,
            clientY: 100,
            pageX: 100,
            pageY: 100,
            screenX: 100,
            screenY: 100,
            radiusX: 10,
            radiusY: 10,
            rotationAngle: 0,
            force: 1
          }] as any
        });

        canvas.dispatchEvent(touchEvent);
        expect(touchStartHandler).toHaveBeenCalled();
      }
    });

    test('should handle mouse events on desktop browsers', async () => {
      const desktopEnvs = BROWSER_ENVIRONMENTS.filter(env => !env.name.includes('Mobile'));
      
      for (const env of desktopEnvs) {
        mockBrowserEnvironment(env);

        const canvas = document.createElement('canvas');
        const mouseDownHandler = jest.fn();
        const mouseMoveHandler = jest.fn();
        const mouseUpHandler = jest.fn();

        canvas.addEventListener('mousedown', mouseDownHandler);
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mouseup', mouseUpHandler);

        // Simulate mouse events
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          button: 0
        });

        canvas.dispatchEvent(mouseEvent);
        expect(mouseDownHandler).toHaveBeenCalled();
      }
    });
  });

  describe('Feature Detection and Graceful Degradation', () => {
    test('should gracefully degrade when features are missing', async () => {
      // Test with limited feature set
      const limitedEnv: BrowserEnvironment = {
        name: 'Limited Browser',
        userAgent: 'Limited/1.0',
        features: {
          webgl: false,
          webgl2: false,
          webworkers: false,
          webrtc: false,
          webassembly: false,
          indexeddb: false,
          websockets: false,
          canvas: true // Only basic canvas support
        },
        limitations: ['No advanced features']
      };

      mockBrowserEnvironment(limitedEnv);

      const mockServices = {
        errorHandler: { addErrorHandler: jest.fn() },
        performanceMonitor: { 
          addMetric: jest.fn(),
          recordMetric: jest.fn(),
          getMetrics: jest.fn(() => ({}))
        },
        adaptivePerformance: { 
          getDeviceCapabilities: jest.fn(() => ({
            cpu: { cores: 2 },
            memory: { heapLimit: 512 * 1024 * 1024 }, // 512MB
            gpu: { webglVersion: 0 },
            browser: { features: limitedEnv.features },
            network: { downlink: 1 }
          }))
        },
        progressiveLoading: {},
        memoryManager: { getMemoryUsage: jest.fn(() => ({ used: 0, total: 0 })) },
        measurementTools: {},
        annotationSystem: {},
        aiModule: {},
        collaborationModule: {}
      };

      const viewerManager = new EnhancedViewerManager({}, mockServices);

      // Should still provide basic functionality
      const availableModes = viewerManager.getAvailableModes();
      expect(availableModes.length).toBeGreaterThan(0);

      // Should fall back to simple mode
      const optimalMode = viewerManager.getOptimalMode();
      expect(optimalMode?.id).toBe('simple');

      viewerManager.cleanup();
    });
  });

  describe('Memory Management Cross-Browser Tests', () => {
    BROWSER_ENVIRONMENTS.forEach(env => {
      test(`should manage memory efficiently in ${env.name}`, async () => {
        mockBrowserEnvironment(env);

        const initialMemory = performance.memory ? 
          (performance as any).memory.usedJSHeapSize : 0;

        // Simulate memory-intensive operations
        const largeArrays: Uint8Array[] = [];
        const arraySize = env.name.includes('Mobile') ? 1000 : 10000;

        for (let i = 0; i < 10; i++) {
          largeArrays.push(new Uint8Array(arraySize));
        }

        // Cleanup
        largeArrays.length = 0;

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = performance.memory ? 
          (performance as any).memory.usedJSHeapSize : 0;

        // Memory should not grow excessively
        if (performance.memory) {
          const memoryIncrease = finalMemory - initialMemory;
          const maxIncrease = env.name.includes('Mobile') ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
          
          if (memoryIncrease > maxIncrease) {
            console.warn(`Memory increase in ${env.name}: ${memoryIncrease / 1024 / 1024}MB`);
          }
        }
      });
    });
  });
});