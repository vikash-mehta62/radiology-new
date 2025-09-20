/**
 * Tests for Image Transformation Tools
 */

import { ImageTransformationTools } from '../imageTransformationTools';

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  },
  writable: true
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('ImageTransformationTools', () => {
  let transformationTools: ImageTransformationTools;

  beforeEach(() => {
    jest.clearAllMocks();
    transformationTools = new ImageTransformationTools();
  });

  afterEach(() => {
    transformationTools.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const state = transformationTools.getState();
      
      expect(state.zoom).toBe(1.0);
      expect(state.panX).toBe(0);
      expect(state.panY).toBe(0);
      expect(state.rotation).toBe(0);
      expect(state.flipX).toBe(false);
      expect(state.flipY).toBe(false);
    });

    test('should initialize with custom state', () => {
      const customTools = new ImageTransformationTools({
        zoom: 2.0,
        panX: 100,
        panY: 50,
        rotation: 90
      });

      const state = customTools.getState();
      expect(state.zoom).toBe(2.0);
      expect(state.panX).toBe(100);
      expect(state.panY).toBe(50);
      expect(state.rotation).toBe(90);

      customTools.destroy();
    });
  });

  describe('Zoom Operations', () => {
    test('should zoom to specific level', () => {
      transformationTools.zoomTo(2.0, undefined, undefined, false);
      
      const state = transformationTools.getState();
      expect(state.zoom).toBe(2.0);
    });

    test('should zoom by delta', () => {
      transformationTools.zoomBy(0.5, undefined, undefined, false);
      
      const state = transformationTools.getState();
      expect(state.zoom).toBe(1.5);
    });

    test('should clamp zoom to limits', () => {
      const limitedTools = new ImageTransformationTools(
        {},
        { minZoom: 0.5, maxZoom: 3.0 }
      );

      limitedTools.zoomTo(5.0, undefined, undefined, false);
      expect(limitedTools.getState().zoom).toBe(3.0);

      limitedTools.zoomTo(0.1, undefined, undefined, false);
      expect(limitedTools.getState().zoom).toBe(0.5);

      limitedTools.destroy();
    });
  });

  describe('Pan Operations', () => {
    test('should pan to specific position', () => {
      transformationTools.panTo(100, 50, false);
      
      const state = transformationTools.getState();
      expect(state.panX).toBe(100);
      expect(state.panY).toBe(50);
    });

    test('should pan by delta', () => {
      transformationTools.panBy(25, -10, false);
      
      const state = transformationTools.getState();
      expect(state.panX).toBe(25);
      expect(state.panY).toBe(-10);
    });
  });

  describe('Rotation Operations', () => {
    test('should rotate to specific angle', () => {
      transformationTools.rotateTo(45, false);
      
      const state = transformationTools.getState();
      expect(state.rotation).toBe(45);
    });

    test('should rotate by delta', () => {
      transformationTools.rotateBy(30, false);
      
      const state = transformationTools.getState();
      expect(state.rotation).toBe(30);
    });

    test('should normalize rotation angles', () => {
      transformationTools.rotateTo(450, false); // 450 degrees = 90 degrees
      
      const state = transformationTools.getState();
      expect(state.rotation).toBe(90);
    });
  });

  describe('Flip Operations', () => {
    test('should flip horizontally', () => {
      transformationTools.flipHorizontal(false);
      
      const state = transformationTools.getState();
      expect(state.flipX).toBe(true);
      expect(state.flipY).toBe(false);
    });

    test('should flip vertically', () => {
      transformationTools.flipVertical(false);
      
      const state = transformationTools.getState();
      expect(state.flipX).toBe(false);
      expect(state.flipY).toBe(true);
    });

    test('should toggle flip state', () => {
      transformationTools.flipHorizontal(false);
      transformationTools.flipHorizontal(false);
      
      const state = transformationTools.getState();
      expect(state.flipX).toBe(false); // Should be back to original
    });
  });

  describe('Reset and Fit Operations', () => {
    test('should reset to default state', () => {
      // Modify state
      transformationTools.zoomTo(2.0, undefined, undefined, false);
      transformationTools.panTo(100, 50, false);
      transformationTools.rotateTo(45, false);
      transformationTools.flipHorizontal(false);

      // Reset
      transformationTools.reset(false);

      const state = transformationTools.getState();
      expect(state.zoom).toBe(1.0);
      expect(state.panX).toBe(0);
      expect(state.panY).toBe(0);
      expect(state.rotation).toBe(0);
      expect(state.flipX).toBe(false);
      expect(state.flipY).toBe(false);
    });

    test('should fit to container', () => {
      transformationTools.fitToContainer(800, 600, 1600, 1200, false);
      
      const state = transformationTools.getState();
      expect(state.zoom).toBe(0.5); // Min of 800/1600 and 600/1200
      expect(state.panX).toBe(0);
      expect(state.panY).toBe(0);
    });
  });

  describe('State Management', () => {
    test('should set partial state', () => {
      transformationTools.setState({ zoom: 1.5, panX: 25 }, false);
      
      const state = transformationTools.getState();
      expect(state.zoom).toBe(1.5);
      expect(state.panX).toBe(25);
      expect(state.panY).toBe(0); // Should remain unchanged
    });

    test('should update limits', () => {
      transformationTools.updateLimits({ maxZoom: 5.0 });
      
      // Should be able to zoom to new limit
      transformationTools.zoomTo(4.0, undefined, undefined, false);
      expect(transformationTools.getState().zoom).toBe(4.0);
    });
  });

  describe('Cleanup', () => {
    test('should handle multiple destroy calls gracefully', () => {
      transformationTools.destroy();
      
      expect(() => {
        transformationTools.destroy();
      }).not.toThrow();
    });
  });
});