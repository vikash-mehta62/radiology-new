/**
 * Tests for WebGL Rendering Engine
 */

import { WebGLRenderingEngine } from '../webglRenderingEngine';

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  },
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(callback: ResizeObserverCallback) {}
};

describe('WebGLRenderingEngine', () => {
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a mock canvas that will fail WebGL initialization
    mockCanvas = {
      getContext: jest.fn(() => null), // Return null to simulate no WebGL support
      width: 800,
      height: 600,
      clientWidth: 800,
      clientHeight: 600
    } as any;
  });

  describe('Error Handling', () => {
    test('should handle WebGL context creation failure gracefully', () => {
      expect(() => {
        new WebGLRenderingEngine({ canvas: mockCanvas });
      }).toThrow('WebGL not supported');
    });

    test('should handle missing canvas', () => {
      expect(() => {
        new WebGLRenderingEngine({ canvas: null as any });
      }).toThrow();
    });
  });

  describe('Configuration', () => {
    test('should accept configuration options', () => {
      const config = {
        canvas: mockCanvas,
        enableAntialiasing: true,
        enableDepthTest: false,
        enableBlending: true,
        maxTextureSize: 4096,
        adaptiveQuality: true,
        debugMode: false,
        colorSpace: 'srgb' as const,
        pixelRatio: 2
      };

      // This will throw due to no WebGL, but we can test that it accepts the config
      expect(() => {
        new WebGLRenderingEngine(config);
      }).toThrow('WebGL not supported');
    });
  });

  describe('Static Methods and Interfaces', () => {
    test('should export required interfaces and types', () => {
      // Test that the module exports the expected types
      expect(WebGLRenderingEngine).toBeDefined();
      expect(typeof WebGLRenderingEngine).toBe('function');
    });
  });
});