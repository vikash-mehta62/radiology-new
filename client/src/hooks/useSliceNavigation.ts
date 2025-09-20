/**
 * React Hook for Slice Navigation
 * Provides easy integration of slice navigation in React components
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { 
  SliceNavigationController, 
  SliceNavigationConfig, 
  NavigationEvent,
  KeyboardShortcut 
} from '../services/sliceNavigationController';

interface UseSliceNavigationOptions extends Partial<SliceNavigationConfig> {
  onSliceChange?: (sliceIndex: number, event: NavigationEvent) => void;
  onAnimationStart?: (event: NavigationEvent) => void;
  onAnimationEnd?: (event: NavigationEvent) => void;
  onBoundaryReached?: (event: NavigationEvent) => void;
}

interface UseSliceNavigationReturn {
  currentSlice: number;
  totalSlices: number;
  isAnimating: boolean;
  goToSlice: (index: number, animate?: boolean) => void;
  nextSlice: (animate?: boolean) => void;
  previousSlice: (animate?: boolean) => void;
  firstSlice: (animate?: boolean) => void;
  lastSlice: (animate?: boolean) => void;
  setNavigationEnabled: (method: 'keyboard' | 'mouse' | 'touch', enabled: boolean) => void;
  getKeyboardShortcuts: () => KeyboardShortcut[];
  bindToElement: (element: HTMLElement | null) => void;
  updateConfig: (config: Partial<SliceNavigationConfig>) => void;
}

export const useSliceNavigation = (options: UseSliceNavigationOptions = {}): UseSliceNavigationReturn => {
  const {
    onSliceChange,
    onAnimationStart,
    onAnimationEnd,
    onBoundaryReached,
    ...config
  } = options;

  const controllerRef = useRef<SliceNavigationController | null>(null);
  const [currentSlice, setCurrentSlice] = useState(config.currentSlice || 0);
  const [totalSlices, setTotalSlices] = useState(config.totalSlices || 1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize controller
  useEffect(() => {
    controllerRef.current = new SliceNavigationController(config);
    
    // Setup event listeners
    const handleNavigationEvent = (event: NavigationEvent) => {
      switch (event.type) {
        case 'slice_changed':
          setCurrentSlice(event.currentSlice);
          if (onSliceChange) {
            onSliceChange(event.currentSlice, event);
          }
          break;
        case 'animation_start':
          setIsAnimating(true);
          if (onAnimationStart) {
            onAnimationStart(event);
          }
          break;
        case 'animation_end':
          setIsAnimating(false);
          if (onAnimationEnd) {
            onAnimationEnd(event);
          }
          break;
        case 'boundary_reached':
          if (onBoundaryReached) {
            onBoundaryReached(event);
          }
          break;
      }
    };

    controllerRef.current.onNavigationEvent(handleNavigationEvent);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update controller config when options change
  useEffect(() => {
    if (controllerRef.current && config) {
      controllerRef.current.updateConfig(config);
      setTotalSlices(config.totalSlices || 1);
    }
  }, [config.totalSlices, config.currentSlice, config.enableKeyboard, config.enableMouseWheel, config.enableTouch]);

  // Navigation methods
  const goToSlice = useCallback((index: number, animate: boolean = true) => {
    if (controllerRef.current) {
      controllerRef.current.goToSlice(index, animate, 'programmatic');
    }
  }, []);

  const nextSlice = useCallback((animate: boolean = true) => {
    if (controllerRef.current) {
      controllerRef.current.nextSlice(animate, 'programmatic');
    }
  }, []);

  const previousSlice = useCallback((animate: boolean = true) => {
    if (controllerRef.current) {
      controllerRef.current.previousSlice(animate, 'programmatic');
    }
  }, []);

  const firstSlice = useCallback((animate: boolean = true) => {
    if (controllerRef.current) {
      controllerRef.current.firstSlice(animate, 'programmatic');
    }
  }, []);

  const lastSlice = useCallback((animate: boolean = true) => {
    if (controllerRef.current) {
      controllerRef.current.lastSlice(animate, 'programmatic');
    }
  }, []);

  const setNavigationEnabled = useCallback((method: 'keyboard' | 'mouse' | 'touch', enabled: boolean) => {
    if (controllerRef.current) {
      controllerRef.current.setNavigationEnabled(method, enabled);
    }
  }, []);

  const getKeyboardShortcuts = useCallback((): KeyboardShortcut[] => {
    if (controllerRef.current) {
      return controllerRef.current.getKeyboardShortcuts();
    }
    return [];
  }, []);

  const bindToElement = useCallback((element: HTMLElement | null) => {
    if (controllerRef.current) {
      if (element) {
        controllerRef.current.initialize(element);
      } else {
        controllerRef.current.destroy();
      }
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SliceNavigationConfig>) => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig(newConfig);
      if (newConfig.totalSlices !== undefined) {
        setTotalSlices(newConfig.totalSlices);
      }
    }
  }, []);

  return {
    currentSlice,
    totalSlices,
    isAnimating,
    goToSlice,
    nextSlice,
    previousSlice,
    firstSlice,
    lastSlice,
    setNavigationEnabled,
    getKeyboardShortcuts,
    bindToElement,
    updateConfig
  };
};

// Specialized hooks for common use cases

export const useKeyboardSliceNavigation = (
  totalSlices: number,
  onSliceChange?: (sliceIndex: number) => void
) => {
  return useSliceNavigation({
    totalSlices,
    enableKeyboard: true,
    enableMouseWheel: false,
    enableTouch: false,
    onSliceChange: onSliceChange ? (index) => onSliceChange(index) : undefined
  });
};

export const useMouseWheelSliceNavigation = (
  totalSlices: number,
  onSliceChange?: (sliceIndex: number) => void
) => {
  return useSliceNavigation({
    totalSlices,
    enableKeyboard: false,
    enableMouseWheel: true,
    enableTouch: false,
    wheelSensitivity: 0.5,
    onSliceChange: onSliceChange ? (index) => onSliceChange(index) : undefined
  });
};

export const useTouchSliceNavigation = (
  totalSlices: number,
  onSliceChange?: (sliceIndex: number) => void
) => {
  return useSliceNavigation({
    totalSlices,
    enableKeyboard: false,
    enableMouseWheel: false,
    enableTouch: true,
    touchSensitivity: 1.0,
    onSliceChange: onSliceChange ? (index) => onSliceChange(index) : undefined
  });
};

export const useFullSliceNavigation = (
  totalSlices: number,
  onSliceChange?: (sliceIndex: number) => void
) => {
  return useSliceNavigation({
    totalSlices,
    enableKeyboard: true,
    enableMouseWheel: true,
    enableTouch: true,
    enableMomentum: true,
    animationDuration: 150,
    boundaryBehavior: 'stop',
    onSliceChange: onSliceChange ? (index) => onSliceChange(index) : undefined
  });
};