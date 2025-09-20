/**
 * React Hook for Image Adjustment Controls
 * Provides easy integration of image adjustment controls in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ImageAdjustmentControls,
  ImageAdjustments,
  WindowingPreset,
  HistogramData,
  AdjustmentEvent,
  AdjustmentLimits
} from '../services/imageAdjustmentControls';

interface UseImageAdjustmentOptions {
  initialAdjustments?: Partial<ImageAdjustments>;
  limits?: Partial<AdjustmentLimits>;
  onAdjustmentChange?: (adjustments: ImageAdjustments) => void;
  onPresetApplied?: (preset: WindowingPreset) => void;
  enableAutoAdjust?: boolean;
}

interface UseImageAdjustmentReturn {
  adjustmentControls: ImageAdjustmentControls | null;
  adjustments: ImageAdjustments;
  histogramData: HistogramData | null;
  windowingPresets: WindowingPreset[];
  
  // Adjustment methods
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setGamma: (value: number) => void;
  setWindowCenter: (value: number) => void;
  setWindowWidth: (value: number) => void;
  setWindowing: (center: number, width: number) => void;
  setSaturation: (value: number) => void;
  setHue: (value: number) => void;
  setExposure: (value: number) => void;
  toggleInvert: () => void;
  setColormap: (colormap: string) => void;
  
  // Preset methods
  applyWindowingPreset: (presetName: string) => boolean;
  addWindowingPreset: (preset: WindowingPreset) => void;
  getPresetsByRegion: (region: string) => WindowingPreset[];
  
  // Utility methods
  reset: () => void;
  setAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  calculateHistogram: (imageData: Uint8Array | Uint16Array | Float32Array, bins?: number) => HistogramData;
  autoAdjustLevels: (percentileLow?: number, percentileHigh?: number) => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  
  // State
  isAdjusting: boolean;
  error: string | null;
}

export const useImageAdjustment = (options: UseImageAdjustmentOptions = {}): UseImageAdjustmentReturn => {
  const {
    initialAdjustments = {},
    limits = {},
    onAdjustmentChange,
    onPresetApplied,
    enableAutoAdjust = true
  } = options;

  const adjustmentControlsRef = useRef<ImageAdjustmentControls | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 1,
    gamma: 1,
    windowCenter: 0.5,
    windowWidth: 1.0,
    invert: false,
    colormap: 'grayscale',
    saturation: 1,
    hue: 0,
    exposure: 0,
    ...initialAdjustments
  });

  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [windowingPresets, setWindowingPresets] = useState<WindowingPreset[]>([]);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize adjustment controls
  useEffect(() => {
    try {
      adjustmentControlsRef.current = new ImageAdjustmentControls(initialAdjustments, limits);
      
      // Get initial state
      setAdjustments(adjustmentControlsRef.current.getAdjustments());
      setWindowingPresets(adjustmentControlsRef.current.getWindowingPresets());
      
      // Setup event listener
      const handleAdjustment = (event: AdjustmentEvent) => {
        setAdjustments(event.adjustments);
        
        if (event.type === 'adjustment_start') {
          setIsAdjusting(true);
        } else if (event.type === 'adjustment_end') {
          setIsAdjusting(false);
        }
        
        if (event.preset && onPresetApplied) {
          onPresetApplied(event.preset);
        }
        
        if (onAdjustmentChange) {
          onAdjustmentChange(event.adjustments);
        }
      };

      adjustmentControlsRef.current.onAdjustment(handleAdjustment);
      
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize image adjustment controls';
      setError(errorMessage);
      console.error('Failed to initialize image adjustment controls:', err);
    }

    return () => {
      if (adjustmentControlsRef.current) {
        adjustmentControlsRef.current.destroy();
        adjustmentControlsRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update limits when they change
  useEffect(() => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.updateLimits(limits);
    }
  }, [limits]);

  // Adjustment methods
  const setBrightness = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setBrightness(value);
    }
  }, []);

  const setContrast = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setContrast(value);
    }
  }, []);

  const setGamma = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setGamma(value);
    }
  }, []);

  const setWindowCenter = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setWindowCenter(value);
    }
  }, []);

  const setWindowWidth = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setWindowWidth(value);
    }
  }, []);

  const setWindowing = useCallback((center: number, width: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setWindowing(center, width);
    }
  }, []);

  const setSaturation = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setSaturation(value);
    }
  }, []);

  const setHue = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setHue(value);
    }
  }, []);

  const setExposure = useCallback((value: number) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setExposure(value);
    }
  }, []);

  const toggleInvert = useCallback(() => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.toggleInvert();
    }
  }, []);

  const setColormap = useCallback((colormap: string) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setColormap(colormap);
    }
  }, []);

  // Preset methods
  const applyWindowingPreset = useCallback((presetName: string): boolean => {
    if (adjustmentControlsRef.current) {
      return adjustmentControlsRef.current.applyWindowingPreset(presetName);
    }
    return false;
  }, []);

  const addWindowingPreset = useCallback((preset: WindowingPreset) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.addWindowingPreset(preset);
      setWindowingPresets(adjustmentControlsRef.current.getWindowingPresets());
    }
  }, []);

  const getPresetsByRegion = useCallback((region: string): WindowingPreset[] => {
    if (adjustmentControlsRef.current) {
      return adjustmentControlsRef.current.getPresetsByRegion(region);
    }
    return [];
  }, []);

  // Utility methods
  const reset = useCallback(() => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.reset();
    }
  }, []);

  const setAdjustmentsMethod = useCallback((newAdjustments: Partial<ImageAdjustments>) => {
    if (adjustmentControlsRef.current) {
      adjustmentControlsRef.current.setAdjustments(newAdjustments);
    }
  }, []);

  const calculateHistogram = useCallback((
    imageData: Uint8Array | Uint16Array | Float32Array, 
    bins: number = 256
  ): HistogramData => {
    if (!adjustmentControlsRef.current) {
      throw new Error('Adjustment controls not initialized');
    }
    
    const histogram = adjustmentControlsRef.current.calculateHistogram(imageData, bins);
    setHistogramData(histogram);
    return histogram;
  }, []);

  const autoAdjustLevels = useCallback((percentileLow: number = 1, percentileHigh: number = 99) => {
    if (adjustmentControlsRef.current && enableAutoAdjust) {
      adjustmentControlsRef.current.autoAdjustLevels(percentileLow, percentileHigh);
    }
  }, [enableAutoAdjust]);

  const exportSettings = useCallback((): string => {
    if (adjustmentControlsRef.current) {
      return adjustmentControlsRef.current.exportSettings();
    }
    return '{}';
  }, []);

  const importSettings = useCallback((settingsJson: string): boolean => {
    if (adjustmentControlsRef.current) {
      const success = adjustmentControlsRef.current.importSettings(settingsJson);
      if (success) {
        setAdjustments(adjustmentControlsRef.current.getAdjustments());
        setWindowingPresets(adjustmentControlsRef.current.getWindowingPresets());
      }
      return success;
    }
    return false;
  }, []);

  return {
    adjustmentControls: adjustmentControlsRef.current,
    adjustments,
    histogramData,
    windowingPresets,
    setBrightness,
    setContrast,
    setGamma,
    setWindowCenter,
    setWindowWidth,
    setWindowing,
    setSaturation,
    setHue,
    setExposure,
    toggleInvert,
    setColormap,
    applyWindowingPreset,
    addWindowingPreset,
    getPresetsByRegion,
    reset,
    setAdjustments: setAdjustmentsMethod,
    calculateHistogram,
    autoAdjustLevels,
    exportSettings,
    importSettings,
    isAdjusting,
    error
  };
};

// Specialized hooks for different use cases

export const useMedicalImageAdjustment = (options: UseImageAdjustmentOptions = {}) => {
  return useImageAdjustment({
    limits: {
      brightness: { min: -0.5, max: 0.5 },
      contrast: { min: 0.5, max: 3.0 },
      gamma: { min: 0.5, max: 2.0 },
      windowCenter: { min: -1024, max: 3071 },
      windowWidth: { min: 1, max: 4095 },
      saturation: { min: 0.8, max: 1.2 },
      hue: { min: -10, max: 10 },
      exposure: { min: -1, max: 1 }
    },
    enableAutoAdjust: true,
    ...options
  });
};

export const usePhotoImageAdjustment = (options: UseImageAdjustmentOptions = {}) => {
  return useImageAdjustment({
    limits: {
      brightness: { min: -1, max: 1 },
      contrast: { min: 0.1, max: 5 },
      gamma: { min: 0.1, max: 3 },
      windowCenter: { min: 0, max: 1 },
      windowWidth: { min: 0.1, max: 1 },
      saturation: { min: 0, max: 2 },
      hue: { min: -180, max: 180 },
      exposure: { min: -3, max: 3 }
    },
    enableAutoAdjust: true,
    ...options
  });
};

export const useBasicImageAdjustment = (options: UseImageAdjustmentOptions = {}) => {
  return useImageAdjustment({
    limits: {
      brightness: { min: -0.3, max: 0.3 },
      contrast: { min: 0.7, max: 1.5 },
      gamma: { min: 0.8, max: 1.2 },
      windowCenter: { min: 0.2, max: 0.8 },
      windowWidth: { min: 0.5, max: 1.0 },
      saturation: { min: 0.9, max: 1.1 },
      hue: { min: -5, max: 5 },
      exposure: { min: -0.5, max: 0.5 }
    },
    enableAutoAdjust: false,
    ...options
  });
};