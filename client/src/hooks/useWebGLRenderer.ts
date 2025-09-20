/**
 * React Hook for WebGL Rendering Engine
 * Provides easy integration of WebGL rendering in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WebGLRenderingEngine,
  RenderingConfig,
  ViewportTransform,
  ImageAdjustments,
  RenderingMetrics,
  TextureConfig
} from '../services/webglRenderingEngine';

interface UseWebGLRendererOptions {
  enableAntialiasing?: boolean;
  enableDepthTest?: boolean;
  enableBlending?: boolean;
  maxTextureSize?: number;
  adaptiveQuality?: boolean;
  debugMode?: boolean;
  colorSpace?: 'srgb' | 'rec2020' | 'display-p3';
  pixelRatio?: number;
  onError?: (error: string) => void;
  onMetricsUpdate?: (metrics: RenderingMetrics) => void;
}

interface UseWebGLRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  renderer: WebGLRenderingEngine | null;
  isInitialized: boolean;
  error: string | null;
  metrics: RenderingMetrics | null;
  contextInfo: any;
  
  // Rendering methods
  createTexture: (name: string, data: any, config?: Partial<TextureConfig>) => boolean;
  renderImage: (textureName: string) => void;
  setViewportTransform: (transform: Partial<ViewportTransform>) => void;
  setImageAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  
  // Utility methods
  resetMetrics: () => void;
  getMetrics: () => RenderingMetrics | null;
  destroy: () => void;
}

export const useWebGLRenderer = (options: UseWebGLRendererOptions = {}): UseWebGLRendererReturn => {
  const {
    enableAntialiasing = true,
    enableDepthTest = false,
    enableBlending = true,
    maxTextureSize = 4096,
    adaptiveQuality = true,
    debugMode = false,
    colorSpace = 'srgb',
    pixelRatio = window.devicePixelRatio || 1,
    onError,
    onMetricsUpdate
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderingEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RenderingMetrics | null>(null);
  const [contextInfo, setContextInfo] = useState<any>(null);

  // Initialize renderer when canvas is available
  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    try {
      const config: Partial<RenderingConfig> = {
        canvas: canvasRef.current,
        enableAntialiasing,
        enableDepthTest,
        enableBlending,
        maxTextureSize,
        adaptiveQuality,
        debugMode,
        colorSpace,
        pixelRatio
      };

      rendererRef.current = new WebGLRenderingEngine(config);
      setContextInfo(rendererRef.current.getContextInfo());
      setIsInitialized(true);
      setError(null);

      console.log('🎨 [useWebGLRenderer] Renderer initialized');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize WebGL renderer';
      setError(errorMessage);
      setIsInitialized(false);
      onError?.(errorMessage);
      console.error('🎨 [useWebGLRenderer] Initialization failed:', err);
    }
  }, [enableAntialiasing, enableDepthTest, enableBlending, maxTextureSize, adaptiveQuality, debugMode, colorSpace, pixelRatio, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;

    const updateMetrics = () => {
      if (rendererRef.current) {
        const currentMetrics = rendererRef.current.getMetrics();
        setMetrics(currentMetrics);
        onMetricsUpdate?.(currentMetrics);
      }
    };

    const interval = setInterval(updateMetrics, 1000); // Update every second
    return () => clearInterval(interval);
  }, [isInitialized, onMetricsUpdate]);

  // Rendering methods
  const createTexture = useCallback((name: string, data: any, config?: Partial<TextureConfig>): boolean => {
    if (!rendererRef.current) {
      console.warn('🎨 [useWebGLRenderer] Renderer not initialized');
      return false;
    }

    try {
      const texture = rendererRef.current.createTexture(name, data, config);
      return texture !== null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create texture';
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  const renderImage = useCallback((textureName: string) => {
    if (!rendererRef.current) {
      console.warn('🎨 [useWebGLRenderer] Renderer not initialized');
      return;
    }

    try {
      rendererRef.current.renderImage(textureName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render image';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  const setViewportTransform = useCallback((transform: Partial<ViewportTransform>) => {
    if (!rendererRef.current) {
      console.warn('🎨 [useWebGLRenderer] Renderer not initialized');
      return;
    }

    rendererRef.current.setViewportTransform(transform);
  }, []);

  const setImageAdjustments = useCallback((adjustments: Partial<ImageAdjustments>) => {
    if (!rendererRef.current) {
      console.warn('🎨 [useWebGLRenderer] Renderer not initialized');
      return;
    }

    rendererRef.current.setImageAdjustments(adjustments);
  }, []);

  const resetMetrics = useCallback(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.resetMetrics();
    setMetrics(rendererRef.current.getMetrics());
  }, []);

  const getMetrics = useCallback((): RenderingMetrics | null => {
    if (!rendererRef.current) return null;
    return rendererRef.current.getMetrics();
  }, []);

  const destroy = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.destroy();
      rendererRef.current = null;
      setIsInitialized(false);
      setError(null);
      setMetrics(null);
      setContextInfo(null);
    }
  }, []);

  return {
    canvasRef,
    renderer: rendererRef.current,
    isInitialized,
    error,
    metrics,
    contextInfo,
    createTexture,
    renderImage,
    setViewportTransform,
    setImageAdjustments,
    resetMetrics,
    getMetrics,
    destroy
  };
};

// Specialized hooks for different use cases

export const useDicomWebGLRenderer = (options: UseWebGLRendererOptions = {}) => {
  return useWebGLRenderer({
    enableAntialiasing: false, // Prefer pixel-perfect rendering for medical images
    enableDepthTest: false,
    enableBlending: true,
    maxTextureSize: 4096,
    adaptiveQuality: true,
    debugMode: false,
    colorSpace: 'srgb',
    ...options
  });
};

export const useHighQualityWebGLRenderer = (options: UseWebGLRendererOptions = {}) => {
  return useWebGLRenderer({
    enableAntialiasing: true,
    enableDepthTest: true,
    enableBlending: true,
    maxTextureSize: 8192,
    adaptiveQuality: false, // Always use highest quality
    debugMode: false,
    colorSpace: 'display-p3',
    pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    ...options
  });
};

export const usePerformanceWebGLRenderer = (options: UseWebGLRendererOptions = {}) => {
  return useWebGLRenderer({
    enableAntialiasing: false,
    enableDepthTest: false,
    enableBlending: false,
    maxTextureSize: 2048,
    adaptiveQuality: true,
    debugMode: false,
    colorSpace: 'srgb',
    pixelRatio: 1, // Force 1x pixel ratio for performance
    ...options
  });
};