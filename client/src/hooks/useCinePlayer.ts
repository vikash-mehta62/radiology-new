/**
 * useCinePlayer Hook
 * React hook for managing cine player functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CinePlayerService, CinePlaybackState, CinePerformanceMetrics, CinePlaybackEvent } from '../services/cinePlayerService';
import { CacheIntegrationService } from '../services/cacheIntegrationService';
import { Study } from '../types';

export interface UseCinePlayerOptions {
  cacheService?: CacheIntegrationService;
  autoBuffer?: boolean;
  enablePerformanceMonitoring?: boolean;
  frameRate?: number;
  bufferSize?: number;
}

export interface CinePlayerHookState {
  // Playback state
  isPlaying: boolean;
  currentSlice: number;
  totalSlices: number;
  frameRate: number;
  playDirection: 'forward' | 'backward';
  loopMode: 'none' | 'loop' | 'bounce';
  speed: number;
  
  // Buffer state
  bufferedSlices: Set<number>;
  preloadProgress: number;
  bufferHealth: number;
  
  // Performance metrics
  actualFrameRate: number;
  droppedFrames: number;
  smoothnessScore: number;
  loadingLatency: number;
  
  // Status
  isInitialized: boolean;
  isBuffering: boolean;
  error: Error | null;
}

export interface CinePlayerHookActions {
  // Playback control
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  goToSlice: (sliceIndex: number) => Promise<boolean>;
  nextFrame: () => Promise<boolean>;
  previousFrame: () => Promise<boolean>;
  
  // Configuration
  setFrameRate: (frameRate: number) => void;
  setSpeed: (speed: number) => void;
  setPlayDirection: (direction: 'forward' | 'backward') => void;
  setLoopMode: (loopMode: 'none' | 'loop' | 'bounce') => void;
  
  // Initialization
  initializeForStudy: (study: Study, startSlice?: number) => Promise<void>;
  
  // Buffer management
  isSliceBuffered: (sliceIndex: number) => boolean;
  getBufferStatus: () => { buffered: number[]; missing: number[] };
  
  // Cleanup
  cleanup: () => void;
}

export interface UseCinePlayerReturn extends CinePlayerHookState, CinePlayerHookActions {
  cineService: CinePlayerService;
}

/**
 * Hook for managing cine player functionality
 */
export function useCinePlayer(options: UseCinePlayerOptions = {}): UseCinePlayerReturn {
  const {
    cacheService,
    autoBuffer = true,
    enablePerformanceMonitoring = true,
    frameRate = 10,
    bufferSize = 20
  } = options;

  // Create service instance (stable reference)
  const cineServiceRef = useRef<CinePlayerService | null>(null);
  if (!cineServiceRef.current) {
    const defaultCacheService = cacheService || new CacheIntegrationService();
    cineServiceRef.current = new CinePlayerService(defaultCacheService, {
      defaultFrameRate: frameRate,
      bufferSize,
      adaptiveBuffering: autoBuffer
    });
  }
  const cineService = cineServiceRef.current;

  // State management
  const [state, setState] = useState<CinePlayerHookState>({
    // Playback state
    isPlaying: false,
    currentSlice: 0,
    totalSlices: 0,
    frameRate,
    playDirection: 'forward',
    loopMode: 'loop',
    speed: 1.0,
    
    // Buffer state
    bufferedSlices: new Set(),
    preloadProgress: 0,
    bufferHealth: 0,
    
    // Performance metrics
    actualFrameRate: 0,
    droppedFrames: 0,
    smoothnessScore: 1.0,
    loadingLatency: 0,
    
    // Status
    isInitialized: false,
    isBuffering: false,
    error: null
  });

  // Animation frame for smooth playback
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  // Update state from service
  const updateStateFromService = useCallback(() => {
    const serviceState = cineService.getState();
    const metrics = cineService.getMetrics();
    
    setState(prevState => ({
      ...prevState,
      isPlaying: serviceState.isPlaying,
      currentSlice: serviceState.currentSlice,
      totalSlices: serviceState.totalSlices,
      frameRate: serviceState.frameRate,
      playDirection: serviceState.playDirection,
      loopMode: serviceState.loopMode,
      speed: serviceState.speed,
      bufferedSlices: serviceState.bufferedSlices,
      preloadProgress: serviceState.preloadProgress,
      bufferHealth: metrics.bufferHealth,
      actualFrameRate: metrics.actualFrameRate,
      droppedFrames: metrics.droppedFrames,
      smoothnessScore: metrics.smoothnessScore,
      loadingLatency: metrics.loadingLatency
    }));
  }, [cineService]);

  // Animation loop for cine playback
  const animationLoop = useCallback((timestamp: number) => {
    if (!state.isPlaying) return;

    const frameInterval = 1000 / (state.frameRate * state.speed);
    
    if (timestamp - lastFrameTimeRef.current >= frameInterval) {
      cineService.nextFrame().then(success => {
        if (!success) {
          // Playback ended
          updateStateFromService();
        }
      });
      
      lastFrameTimeRef.current = timestamp;
      updateStateFromService();
    }

    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [state.isPlaying, state.frameRate, state.speed, cineService, updateStateFromService]);

  // Start/stop animation loop
  useEffect(() => {
    if (state.isPlaying) {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, animationLoop]);

  // Event listeners for service events
  useEffect(() => {
    const handlePlaybackEvent = (event: CinePlaybackEvent) => {
      switch (event.type) {
        case 'play':
        case 'pause':
        case 'stop':
        case 'slice_change':
          updateStateFromService();
          break;
        case 'buffer_update':
          setState(prevState => ({
            ...prevState,
            bufferHealth: event.data?.bufferHealth || prevState.bufferHealth,
            isBuffering: event.data?.isBuffering || false
          }));
          break;
        case 'performance_update':
          if (enablePerformanceMonitoring && event.data?.metrics) {
            const metrics = event.data.metrics;
            setState(prevState => ({
              ...prevState,
              actualFrameRate: metrics.actualFrameRate,
              droppedFrames: metrics.droppedFrames,
              smoothnessScore: metrics.smoothnessScore,
              loadingLatency: metrics.loadingLatency
            }));
          }
          break;
      }
    };

    // Add event listeners
    const eventTypes = ['play', 'pause', 'stop', 'slice_change', 'buffer_update', 'performance_update'];
    eventTypes.forEach(eventType => {
      cineService.addEventListener(eventType, handlePlaybackEvent);
    });

    return () => {
      // Remove event listeners
      eventTypes.forEach(eventType => {
        cineService.removeEventListener(eventType, handlePlaybackEvent);
      });
    };
  }, [cineService, updateStateFromService, enablePerformanceMonitoring]);

  // Periodic state updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isInitialized) {
        updateStateFromService();
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [state.isInitialized, updateStateFromService]);

  // Actions
  const play = useCallback(async (): Promise<void> => {
    try {
      await cineService.startPlayback();
      updateStateFromService();
    } catch (error) {
      setState(prevState => ({ ...prevState, error: error as Error }));
      throw error;
    }
  }, [cineService, updateStateFromService]);

  const pause = useCallback((): void => {
    cineService.pausePlayback();
    updateStateFromService();
  }, [cineService, updateStateFromService]);

  const stop = useCallback((): void => {
    cineService.stopPlayback();
    updateStateFromService();
  }, [cineService, updateStateFromService]);

  const goToSlice = useCallback(async (sliceIndex: number): Promise<boolean> => {
    try {
      const success = await cineService.goToSlice(sliceIndex);
      updateStateFromService();
      return success;
    } catch (error) {
      setState(prevState => ({ ...prevState, error: error as Error }));
      return false;
    }
  }, [cineService, updateStateFromService]);

  const nextFrame = useCallback(async (): Promise<boolean> => {
    try {
      const success = await cineService.nextFrame();
      updateStateFromService();
      return success;
    } catch (error) {
      setState(prevState => ({ ...prevState, error: error as Error }));
      return false;
    }
  }, [cineService, updateStateFromService]);

  const previousFrame = useCallback(async (): Promise<boolean> => {
    try {
      // Calculate previous slice based on current direction and loop mode
      let prevSlice: number;
      
      if (state.playDirection === 'forward') {
        prevSlice = state.currentSlice - 1;
        if (prevSlice < 0) {
          if (state.loopMode === 'loop') {
            prevSlice = state.totalSlices - 1;
          } else {
            return false;
          }
        }
      } else {
        prevSlice = state.currentSlice + 1;
        if (prevSlice >= state.totalSlices) {
          if (state.loopMode === 'loop') {
            prevSlice = 0;
          } else {
            return false;
          }
        }
      }
      
      return await goToSlice(prevSlice);
    } catch (error) {
      setState(prevState => ({ ...prevState, error: error as Error }));
      return false;
    }
  }, [state.playDirection, state.currentSlice, state.totalSlices, state.loopMode, goToSlice]);

  const setFrameRate = useCallback((newFrameRate: number): void => {
    cineService.setFrameRate(newFrameRate);
    updateStateFromService();
  }, [cineService, updateStateFromService]);

  const setSpeed = useCallback((newSpeed: number): void => {
    cineService.setSpeed(newSpeed);
    updateStateFromService();
  }, [cineService, updateStateFromService]);

  const setPlayDirection = useCallback((direction: 'forward' | 'backward'): void => {
    cineService.setPlayDirection(direction);
    updateStateFromService();
  }, [cineService, updateStateFromService]);

  const setLoopMode = useCallback((loopMode: 'none' | 'loop' | 'bounce'): void => {
    cineService.setLoopMode(loopMode);
    updateStateFromService();
  }, [cineService, updateStateFromService]);

  const initializeForStudy = useCallback(async (study: Study, startSlice = 0): Promise<void> => {
    try {
      setState(prevState => ({ ...prevState, isBuffering: true, error: null }));
      
      await cineService.initializeForStudy(study, startSlice);
      
      setState(prevState => ({
        ...prevState,
        isInitialized: true,
        isBuffering: false,
        totalSlices: study.image_urls?.length || 1,
        currentSlice: startSlice
      }));
      
      updateStateFromService();
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        isBuffering: false,
        error: error as Error
      }));
      throw error;
    }
  }, [cineService, updateStateFromService]);

  const isSliceBuffered = useCallback((sliceIndex: number): boolean => {
    return cineService.isSliceBuffered(sliceIndex);
  }, [cineService]);

  const getBufferStatus = useCallback(() => {
    return cineService.getBufferStatus();
  }, [cineService]);

  const cleanup = useCallback((): void => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    cineService.cleanup();
    setState(prevState => ({
      ...prevState,
      isInitialized: false,
      isPlaying: false,
      currentSlice: 0,
      totalSlices: 0,
      bufferedSlices: new Set(),
      error: null
    }));
  }, [cineService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // State
    isPlaying: state.isPlaying,
    currentSlice: state.currentSlice,
    totalSlices: state.totalSlices,
    frameRate: state.frameRate,
    playDirection: state.playDirection,
    loopMode: state.loopMode,
    speed: state.speed,
    bufferedSlices: state.bufferedSlices,
    preloadProgress: state.preloadProgress,
    bufferHealth: state.bufferHealth,
    actualFrameRate: state.actualFrameRate,
    droppedFrames: state.droppedFrames,
    smoothnessScore: state.smoothnessScore,
    loadingLatency: state.loadingLatency,
    isInitialized: state.isInitialized,
    isBuffering: state.isBuffering,
    error: state.error,

    // Actions
    play,
    pause,
    stop,
    goToSlice,
    nextFrame,
    previousFrame,
    setFrameRate,
    setSpeed,
    setPlayDirection,
    setLoopMode,
    initializeForStudy,
    isSliceBuffered,
    getBufferStatus,
    cleanup,

    // Service reference
    cineService
  };
}

/**
 * Hook for cine player performance monitoring
 */
export function useCinePlayerPerformance(cineService?: CinePlayerService) {
  const [metrics, setMetrics] = useState<CinePerformanceMetrics>({
    actualFrameRate: 0,
    droppedFrames: 0,
    bufferHealth: 0,
    loadingLatency: 0,
    smoothnessScore: 1.0
  });

  useEffect(() => {
    if (!cineService) return;

    const updateMetrics = () => {
      const currentMetrics = cineService.getMetrics();
      setMetrics(currentMetrics);
    };

    // Initial update
    updateMetrics();

    // Periodic updates
    const interval = setInterval(updateMetrics, 1000);

    // Listen for performance events
    const handlePerformanceUpdate = (event: CinePlaybackEvent) => {
      if (event.type === 'performance_update' && event.data?.metrics) {
        setMetrics(event.data.metrics);
      }
    };

    cineService.addEventListener('performance_update', handlePerformanceUpdate);

    return () => {
      clearInterval(interval);
      cineService.removeEventListener('performance_update', handlePerformanceUpdate);
    };
  }, [cineService]);

  return metrics;
}

export default useCinePlayer;