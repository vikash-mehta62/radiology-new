/**
 * Tests for Image Adjustment Controls
 */

import { ImageAdjustmentControls, AdjustmentEvent } from '../imageAdjustmentControls';

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  },
  writable: true
});

describe('ImageAdjustmentControls', () => {
  let adjustmentControls: ImageAdjustmentControls;
  let adjustmentEvents: AdjustmentEvent[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    adjustmentEvents = [];

    adjustmentControls = new ImageAdjustmentControls();

    // Setup event listener
    adjustmentControls.onAdjustment((event) => {
      adjustmentEvents.push(event);
    });
  });

  afterEach(() => {
    adjustmentControls.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default adjustments', () => {
      const adjustments = adjustmentControls.getAdjustments();
      
      expect(adjustments.brightness).toBe(0);
      expect(adjustments.contrast).toBe(1);
      expect(adjustments.gamma).toBe(1);
      expect(adjustments.windowCenter).toBe(0.5);
      expect(adjustments.windowWidth).toBe(1.0);
      expect(adjustments.invert).toBe(false);
      expect(adjustments.colormap).toBe('grayscale');
      expect(adjustments.saturation).toBe(1);
      expect(adjustments.hue).toBe(0);
      expect(adjustments.exposure).toBe(0);
    });

    test('should initialize with custom adjustments', () => {
      const customControls = new ImageAdjustmentControls({
        brightness: 0.2,
        contrast: 1.5,
        gamma: 0.8,
        invert: true,
        colormap: 'hot'
      });

      const adjustments = customControls.getAdjustments();
      expect(adjustments.brightness).toBe(0.2);
      expect(adjustments.contrast).toBe(1.5);
      expect(adjustments.gamma).toBe(0.8);
      expect(adjustments.invert).toBe(true);
      expect(adjustments.colormap).toBe('hot');

      customControls.destroy();
    });

    test('should initialize with custom limits', () => {
      const customControls = new ImageAdjustmentControls(
        {},
        { brightness: { min: -0.5, max: 0.5 } }
      );

      const limits = customControls.getLimits();
      expect(limits.brightness.min).toBe(-0.5);
      expect(limits.brightness.max).toBe(0.5);

      customControls.destroy();
    });
  });

  describe('Basic Adjustments', () => {
    test('should set brightness', () => {
      adjustmentControls.setBrightness(0.3);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.brightness).toBe(0.3);
      expect(adjustmentEvents.length).toBeGreaterThan(0);
      expect(adjustmentEvents[0].changedProperty).toBe('brightness');
    });

    test('should set contrast', () => {
      adjustmentControls.setContrast(1.5);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.contrast).toBe(1.5);
    });

    test('should set gamma', () => {
      adjustmentControls.setGamma(0.8);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.gamma).toBe(0.8);
    });

    test('should clamp values to limits', () => {
      adjustmentControls.setBrightness(5.0); // Above max limit
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.brightness).toBe(1.0); // Should be clamped to max
    });

    test('should toggle invert', () => {
      adjustmentControls.toggleInvert();
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.invert).toBe(true);
      
      adjustmentControls.toggleInvert();
      expect(adjustmentControls.getAdjustments().invert).toBe(false);
    });

    test('should set colormap', () => {
      adjustmentControls.setColormap('hot');
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.colormap).toBe('hot');
    });
  });

  describe('Windowing Controls', () => {
    test('should set window center', () => {
      adjustmentControls.setWindowCenter(100);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.windowCenter).toBe(100);
    });

    test('should set window width', () => {
      adjustmentControls.setWindowWidth(200);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.windowWidth).toBe(200);
    });

    test('should set windowing (center and width together)', () => {
      adjustmentControls.setWindowing(50, 150);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.windowCenter).toBe(50);
      expect(adjustments.windowWidth).toBe(150);
    });
  });

  describe('Advanced Adjustments', () => {
    test('should set saturation', () => {
      adjustmentControls.setSaturation(1.2);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.saturation).toBe(1.2);
    });

    test('should set hue', () => {
      adjustmentControls.setHue(45);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.hue).toBe(45);
    });

    test('should set exposure', () => {
      adjustmentControls.setExposure(0.5);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.exposure).toBe(0.5);
    });
  });

  describe('Windowing Presets', () => {
    test('should get windowing presets', () => {
      const presets = adjustmentControls.getWindowingPresets();
      
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some(p => p.name === 'Soft Tissue')).toBe(true);
      expect(presets.some(p => p.name === 'Lung')).toBe(true);
      expect(presets.some(p => p.name === 'Bone')).toBe(true);
    });

    test('should apply windowing preset', () => {
      const success = adjustmentControls.applyWindowingPreset('Lung');
      
      expect(success).toBe(true);
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.windowCenter).toBe(-600);
      expect(adjustments.windowWidth).toBe(1600);
    });

    test('should return false for non-existent preset', () => {
      const success = adjustmentControls.applyWindowingPreset('NonExistent');
      
      expect(success).toBe(false);
    });

    test('should get presets by region', () => {
      const chestPresets = adjustmentControls.getPresetsByRegion('chest');
      
      expect(chestPresets.length).toBeGreaterThan(0);
      expect(chestPresets.some(p => p.name === 'Lung')).toBe(true);
      expect(chestPresets.some(p => p.name === 'Mediastinum')).toBe(true);
    });

    test('should add custom windowing preset', () => {
      const customPreset = {
        name: 'Custom Test',
        windowCenter: 123,
        windowWidth: 456,
        description: 'Test preset',
        anatomicalRegion: 'test'
      };

      adjustmentControls.addWindowingPreset(customPreset);
      
      const presets = adjustmentControls.getWindowingPresets();
      expect(presets.some(p => p.name === 'Custom Test')).toBe(true);
      
      const success = adjustmentControls.applyWindowingPreset('Custom Test');
      expect(success).toBe(true);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.windowCenter).toBe(123);
      expect(adjustments.windowWidth).toBe(456);
    });
  });

  describe('Histogram Calculation', () => {
    test('should calculate histogram from image data', () => {
      const imageData = new Uint8Array([0, 50, 100, 150, 200, 255, 128, 64, 192, 32]);
      
      const histogram = adjustmentControls.calculateHistogram(imageData, 10);
      
      expect(histogram).toBeDefined();
      expect(histogram.bins.length).toBe(10);
      expect(histogram.values.length).toBe(10);
      expect(histogram.min).toBe(0);
      expect(histogram.max).toBe(255);
      expect(histogram.mean).toBeCloseTo(117.1, 1);
      expect(histogram.percentiles).toBeDefined();
      expect(histogram.entropy).toBeGreaterThan(0);
    });

    test('should calculate statistics correctly', () => {
      const imageData = new Uint16Array([100, 200, 300, 400, 500]);
      
      const histogram = adjustmentControls.calculateHistogram(imageData, 5);
      
      expect(histogram.min).toBe(100);
      expect(histogram.max).toBe(500);
      expect(histogram.mean).toBe(300);
      expect(histogram.median).toBe(300);
    });

    test('should get histogram data', () => {
      const imageData = new Uint8Array([0, 128, 255]);
      adjustmentControls.calculateHistogram(imageData);
      
      const histogramData = adjustmentControls.getHistogramData();
      expect(histogramData).toBeDefined();
      expect(histogramData?.min).toBe(0);
      expect(histogramData?.max).toBe(255);
    });
  });

  describe('Auto Adjustment', () => {
    test('should auto-adjust levels based on histogram', () => {
      const imageData = new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 256));
      adjustmentControls.calculateHistogram(imageData);
      
      adjustmentControls.autoAdjustLevels(5, 95);
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.windowCenter).toBeGreaterThan(0);
      expect(adjustments.windowWidth).toBeGreaterThan(0);
    });

    test('should warn when no histogram data available', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      adjustmentControls.autoAdjustLevels();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No histogram data available')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Bulk Operations', () => {
    test('should set multiple adjustments at once', () => {
      adjustmentControls.setAdjustments({
        brightness: 0.2,
        contrast: 1.3,
        gamma: 0.9,
        invert: true
      });
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.brightness).toBe(0.2);
      expect(adjustments.contrast).toBe(1.3);
      expect(adjustments.gamma).toBe(0.9);
      expect(adjustments.invert).toBe(true);
    });

    test('should reset all adjustments', () => {
      // Modify some values first
      adjustmentControls.setBrightness(0.5);
      adjustmentControls.setContrast(2.0);
      adjustmentControls.toggleInvert();
      
      // Reset
      adjustmentControls.reset();
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.brightness).toBe(0);
      expect(adjustments.contrast).toBe(1);
      expect(adjustments.invert).toBe(false);
    });
  });

  describe('Limits Management', () => {
    test('should update limits', () => {
      adjustmentControls.updateLimits({
        brightness: { min: -0.3, max: 0.3 },
        contrast: { min: 0.5, max: 2.0 }
      });
      
      const limits = adjustmentControls.getLimits();
      expect(limits.brightness.min).toBe(-0.3);
      expect(limits.brightness.max).toBe(0.3);
      expect(limits.contrast.min).toBe(0.5);
      expect(limits.contrast.max).toBe(2.0);
    });

    test('should clamp existing values when limits are updated', () => {
      adjustmentControls.setBrightness(0.8);
      adjustmentControls.updateLimits({
        brightness: { min: -0.5, max: 0.5 }
      });
      
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.brightness).toBe(0.5); // Should be clamped to new max
    });
  });

  describe('Event System', () => {
    test('should emit adjustment events', () => {
      adjustmentControls.setBrightness(0.3);
      
      expect(adjustmentEvents.length).toBeGreaterThan(0);
      const event = adjustmentEvents[0];
      expect(event.type).toBe('adjustment_update');
      expect(event.adjustments.brightness).toBe(0.3);
      expect(event.changedProperty).toBe('brightness');
    });

    test('should emit preset applied events', () => {
      adjustmentControls.applyWindowingPreset('Lung');
      
      const presetEvents = adjustmentEvents.filter(e => e.type === 'preset_applied');
      expect(presetEvents.length).toBeGreaterThan(0);
      expect(presetEvents[0].preset?.name).toBe('Lung');
    });

    test('should emit reset events', () => {
      adjustmentControls.reset();
      
      const resetEvents = adjustmentEvents.filter(e => e.type === 'reset');
      expect(resetEvents.length).toBeGreaterThan(0);
    });

    test('should handle multiple event listeners', () => {
      const events1: AdjustmentEvent[] = [];
      const events2: AdjustmentEvent[] = [];

      adjustmentControls.onAdjustment(event => events1.push(event));
      adjustmentControls.onAdjustment(event => events2.push(event));

      adjustmentControls.setBrightness(0.2);

      expect(events1.length).toBeGreaterThan(0);
      expect(events2.length).toBeGreaterThan(0);
      expect(events1.length).toBe(events2.length);
    });

    test('should remove event listeners', () => {
      const events: AdjustmentEvent[] = [];
      const callback = (event: AdjustmentEvent) => events.push(event);

      adjustmentControls.onAdjustment(callback);
      adjustmentControls.setBrightness(0.2);
      expect(events.length).toBeGreaterThan(0);

      events.length = 0; // Clear array
      adjustmentControls.removeAdjustmentListener(callback);
      adjustmentControls.setBrightness(0.3);
      expect(events.length).toBe(0);
    });
  });

  describe('Settings Import/Export', () => {
    test('should export settings', () => {
      adjustmentControls.setBrightness(0.2);
      adjustmentControls.setContrast(1.3);
      adjustmentControls.setColormap('hot');
      
      const settings = adjustmentControls.exportSettings();
      
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('string');
      
      const parsed = JSON.parse(settings);
      expect(parsed.adjustments.brightness).toBe(0.2);
      expect(parsed.adjustments.contrast).toBe(1.3);
      expect(parsed.adjustments.colormap).toBe('hot');
    });

    test('should import settings', () => {
      const settings = JSON.stringify({
        adjustments: {
          brightness: 0.4,
          contrast: 1.6,
          gamma: 0.7,
          colormap: 'jet'
        }
      });
      
      const success = adjustmentControls.importSettings(settings);
      
      expect(success).toBe(true);
      const adjustments = adjustmentControls.getAdjustments();
      expect(adjustments.brightness).toBe(0.4);
      expect(adjustments.contrast).toBe(1.6);
      expect(adjustments.gamma).toBe(0.7);
      expect(adjustments.colormap).toBe('jet');
    });

    test('should handle invalid import settings', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const success = adjustmentControls.importSettings('invalid json');
      
      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    test('should get available colormaps', () => {
      const colormaps = adjustmentControls.getAvailableColormaps();
      
      expect(colormaps.length).toBeGreaterThan(0);
      expect(colormaps).toContain('grayscale');
      expect(colormaps).toContain('hot');
      expect(colormaps).toContain('jet');
    });

    test('should suppress events when requested', () => {
      adjustmentControls.setBrightness(0.3, false);
      
      expect(adjustmentEvents.length).toBe(0);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup properly on destroy', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      adjustmentControls.destroy();
      
      expect(consoleSpy).toHaveBeenCalledWith('🎨 [ImageAdjustmentControls] Destroyed');
      
      consoleSpy.mockRestore();
    });
  });
});