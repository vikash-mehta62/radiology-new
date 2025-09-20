/**
 * React Hook for Image Transformation Tools
 * Provides easy integration of image transformation in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ImageTransformationTools,
  TransformationState,
  TransformationLimits,
  AnimationConfig,
  TransformationEvent
} from '../services/imageTransformationTools';

interface UseImageTransformationOptions {
  initialState?: Partial<TransformationState>;
  limits?: Partial<TransformationLimits>;
  animationConfig?: Partial<AnimationConfig>;
  onTransformation?: (event: TransformationEvent) => void;
  enableKeyboardShortcuts?: boolean;
  enableGestures?: boolean;
}

interface UseImageTransformationReturn {
  elementRef: React.RefObject<HTMLElement>;
  transformationTools: ImageTransformationTools | null;
  state: TransformationState;
  
  // Transformation methods
  zoomTo: (zoom: number, centerX?: number, centerY?: number, animate?: boolean) => void;
  zoomBy: (delta: number, centerX?: number, centerY?: number, animate?: boolean) => void;
  panTo: (x: number, y: number, animate?: boolean) => void;
  panBy: (deltaX: number, deltaY: number, animate?: boolean) => void;
  rotateTo: (angle: number, animate?: boolean) => void;
  rotateBy: (delta: number, animate?: boolean) => void;
  flipHorizontal: (animate?: boolean) => void;
  flipVertical: (animate?: boolean) => void;
  reset: (animate?: boolean) => void;
  fitToContainer: (containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number, animate?: boolean) => void;
  
  // Utility methods
  setState: (newState: Partial<TransformationState>, animate?: boolean) => void;
  updateLimits: (newLimits: Partial<TransformationLimits>) => void;
  startMomentum: (velocityX: number, velocityY: number) => void;
  stopMomentum: () => void;
}

export const useImageTransformation = (options: UseImageTransformationOptions = {}): UseImageTransformationReturn => {
  const {
    initialState = {},
    limits = {},
    animationConfig = {},
    onTransformation,
    enableKeyboardShortcuts = true,
    enableGestures = true
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const transformationToolsRef = useRef<ImageTransformationTools | null>(null);
  const [state, setState] = useState<TransformationState>({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    centerX: 0.5,
    centerY: 0.5,
    ...initialState
  });

  // Initialize transformation tools
  useEffect(() => {
    transformationToolsRef.current = new ImageTransformationTools(
      initialState,
      limits,
      animationConfig
    );

    // Setup event listener
    const handleTransformation = (event: TransformationEvent) => {
      setState(event.state);
      onTransformation?.(event);
    };

    transformationToolsRef.current.onTransformation(handleTransformation);

    return () => {
      if (transformationToolsRef.current) {
        transformationToolsRef.current.destroy();
        transformationToolsRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Bind to element when ref changes
  useEffect(() => {
    if (elementRef.current && transformationToolsRef.current && enableGestures) {
      transformationToolsRef.current.bindToElement(elementRef.current);
      
      // Make element focusable for keyboard shortcuts
      if (enableKeyboardShortcuts) {
        elementRef.current.setAttribute('tabindex', '0');
        elementRef.current.style.outline = 'none';
      }
    }
  }, [enableGestures, enableKeyboardShortcuts]);

  // Update limits when they change
  useEffect(() => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.updateLimits(limits);
    }
  }, [limits]);

  // Transformation methods
  const zoomTo = useCallback((zoom: number, centerX?: number, centerY?: number, animate: boolean = true) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.zoomTo(zoom, centerX, centerY, animate);
    }
  }, []);

  const zoomBy = useCallback((delta: number, centerX?: number, centerY?: number, animate: boolean = false) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.zoomBy(delta, centerX, centerY, animate);
    }
  }, []);

  const panTo = useCallback((x: number, y: number, animate: boolean = true) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.panTo(x, y, animate);
    }
  }, []);

  const panBy = useCallback((deltaX: number, deltaY: number, animate: boolean = false) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.panBy(deltaX, deltaY, animate);
    }
  }, []);

  const rotateTo = useCallback((angle: number, animate: boolean = true) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.rotateTo(angle, animate);
    }
  }, []);

  const rotateBy = useCallback((delta: number, animate: boolean = false) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.rotateBy(delta, animate);
    }
  }, []);

  const flipHorizontal = useCallback((animate: boolean = true) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.flipHorizontal(animate);
    }
  }, []);

  const flipVertical = useCallback((animate: boolean = true) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.flipVertical(animate);
    }
  }, []);

  const reset = useCallback((animate: boolean = true) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.reset(animate);
    }
  }, []);

  const fitToContainer = useCallback((
    containerWidth: number, 
    containerHeight: number, 
    imageWidth: number, 
    imageHeight: number, 
    animate: boolean = true
  ) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.fitToContainer(containerWidth, containerHeight, imageWidth, imageHeight, animate);
    }
  }, []);

  const setTransformationState = useCallback((newState: Partial<TransformationState>, animate: boolean = false) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.setState(newState, animate);
    }
  }, []);

  const updateLimits = useCallback((newLimits: Partial<TransformationLimits>) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.updateLimits(newLimits);
    }
  }, []);

  const startMomentum = useCallback((velocityX: number, velocityY: number) => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.startMomentum(velocityX, velocityY);
    }
  }, []);

  const stopMomentum = useCallback(() => {
    if (transformationToolsRef.current) {
      transformationToolsRef.current.stopMomentum();
    }
  }, []);

  return {
    elementRef,
    transformationTools: transformationToolsRef.current,
    state,
    zoomTo,
    zoomBy,
    panTo,
    panBy,
    rotateTo,
    rotateBy,
    flipHorizontal,
    flipVertical,
    reset,
    fitToContainer,
    setState: setTransformationState,
    updateLimits,
    startMomentum,
    stopMomentum
  };
};

// Specialized hooks for different use cases

export const useMedicalImageTransformation = (options: UseImageTransformationOptions = {}) => {
  return useImageTransformation({
    limits: {
      minZoom: 0.1,
      maxZoom: 20.0,
      maxPan: 2000,
      snapToAngles: [0, 90, 180, 270],
      snapThreshold: 5,
      boundaryBehavior: 'clamp'
    },
    animationConfig: {
      duration: 200,
      easing: 'ease-out',
      fps: 60
    },
    ...options
  });
};

export const usePhotoViewerTransformation = (options: UseImageTransformationOptions = {}) => {
  return useImageTransformation({
    limits: {
      minZoom: 0.5,
      maxZoom: 5.0,
      maxPan: 1000,
      snapToAngles: [0],
      snapThreshold: 2,
      boundaryBehavior: 'elastic'
    },
    animationConfig: {
      duration: 400,
      easing: 'ease-in-out',
      fps: 60
    },
    ...options
  });
};

export const useHighPrecisionTransformation = (options: UseImageTransformationOptions = {}) => {
  return useImageTransformation({
    limits: {
      minZoom: 0.01,
      maxZoom: 100.0,
      maxPan: 10000,
      snapToAngles: [0, 45, 90, 135, 180, 225, 270, 315],
      snapThreshold: 1,
      boundaryBehavior: 'infinite'
    },
    animationConfig: {
      duration: 150,
      easing: 'linear',
      fps: 120
    },
    ...options
  });
};