/**
 * useIntelligentCache Hook
 * React hook for using the Intelligent Cache Manager in components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheIntegrationService, CacheIntegrationConfig, LoadingProgress, CachePerformanceMetrics } from '../services/cacheIntegrationService';
import { CacheStatistics } from '../services/intelligentCacheManager';
import { Study } from '../types';

export interface UseIntelligentCacheOptions {
  config?: Partial<CacheIntegrationConfig>;
  enableAutoOptimization?: boolean;
  optimizationInterval?: number; // milliseconds
}

export interface CacheHookState {
  isLoading: boolean;
  loadingProgress: LoadingProgress | null;
  performanceMetrics: CachePerformanceMetrics | null;
  cacheStatistics: CacheStatistics;
  error: Error | null;
}

export interface CacheHookActions {
  loadSlice: (studyId: string, sliceIndex: number, imageUrl: string) => Promise<ArrayBuffer>;
  preloadStudy: (study: Study, currentSlice?: number) => Promise<void>;
  isSliceCached: (studyId: string, sliceIndex: number) => boolean;
  getCachedSlices: (studyId: string) => number[];
  clearStudyCache: (studyId: string) => void;
  clearAllCache: () => void;
  optimizeForSession: (studyId: string, currentSlice: number, pattern?: 'sequential' | 'random' | 'focused') => Promise<void>;
  updateCacheStrategy: (strategy: Partial<CacheIntegrationConfig['cacheStrategy']>) => void;
}

export interface UseIntelligentCacheReturn extends CacheHookState, CacheHookActions {
  cacheService: CacheIntegrationService;
}

/**
 * Hook for intelligent caching of DICOM images
 */
export function useIntelligentCache(options: UseIntelligentCacheOptions = {}): UseIntelligentCacheReturn {
  const {
    config,
    enableAutoOptimization = true,
    optimizationInterval = 30000 // 30 seconds
  } = options;

  // Create cache service instance (stable reference)
  const cacheServiceRef = useRef<CacheIntegrationService | null>(null);
  if (!cacheServiceRef.current) {
    cacheServiceRef.current = new CacheIntegrationService(config);
  }
  const cacheService = cacheServiceRef.current;

  // State management
  const [state, setState] = useState<CacheHookState>({
    isLoading: false,
    loadingProgress: null,
    performanceMetrics: null,
    cacheStatistics: cacheService.getCacheStatistics(),
    error: null
  });

  // Auto-optimization timer
  const optimizationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<CacheHookState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  // Load slice with error handling and state updates
  const loadSlice = useCallback(async (studyId: string, sliceIndex: number, imageUrl: string): Promise<ArrayBuffer> => {
    updateState({ isLoading: true, error: null });

    try {
      const result = await cacheService.loadSlice(studyId, sliceIndex, imageUrl);
      
      // Update state with latest progress and metrics
      const loadingProgress = cacheService.getLoadingProgress(studyId);
      const performanceMetrics = cacheService.getPerformanceMetrics(studyId);
      const cacheStatistics = cacheService.getCacheStatistics();

      updateState({
        isLoading: false,
        loadingProgress,
        performanceMetrics,
        cacheStatistics
      });

      return result;
    } catch (error) {
      updateState({
        isLoading: false,
        error: error as Error
      });
      throw error;
    }
  }, [cacheService, updateState]);

  // Preload study with progress tracking
  const preloadStudy = useCallback(async (study: Study, currentSlice = 0): Promise<void> => {
    updateState({ isLoading: true, error: null });

    try {
      await cacheService.preloadStudy(study, currentSlice);
      
      const loadingProgress = cacheService.getLoadingProgress(study.study_uid);
      const cacheStatistics = cacheService.getCacheStatistics();

      updateState({
        isLoading: false,
        loadingProgress,
        cacheStatistics
      });
    } catch (error) {
      updateState({
        isLoading: false,
        error: error as Error
      });
      throw error;
    }
  }, [cacheService, updateState]);

  // Check if slice is cached
  const isSliceCached = useCallback((studyId: string, sliceIndex: number): boolean => {
    return cacheService.isSliceCached(studyId, sliceIndex);
  }, [cacheService]);

  // Get cached slices for a study
  const getCachedSlices = useCallback((studyId: string): number[] => {
    return cacheService.getCachedSlices(studyId);
  }, [cacheService]);

  // Clear cache for specific study
  const clearStudyCache = useCallback((studyId: string): void => {
    cacheService.clearStudyCache(studyId);
    
    const cacheStatistics = cacheService.getCacheStatistics();
    updateState({
      loadingProgress: null,
      performanceMetrics: null,
      cacheStatistics
    });
  }, [cacheService, updateState]);

  // Clear all cache
  const clearAllCache = useCallback((): void => {
    cacheService.clearAllCache();
    
    const cacheStatistics = cacheService.getCacheStatistics();
    updateState({
      loadingProgress: null,
      performanceMetrics: null,
      cacheStatistics
    });
  }, [cacheService, updateState]);

  // Optimize cache for current session
  const optimizeForSession = useCallback(async (
    studyId: string, 
    currentSlice: number, 
    pattern?: 'sequential' | 'random' | 'focused'
  ): Promise<void> => {
    try {
      await cacheService.optimizeForCurrentSession(studyId, currentSlice, pattern);
      
      const cacheStatistics = cacheService.getCacheStatistics();
      updateState({ cacheStatistics });
    } catch (error) {
      updateState({ error: error as Error });
      throw error;
    }
  }, [cacheService, updateState]);

  // Update cache strategy
  const updateCacheStrategy = useCallback((strategy: Partial<CacheIntegrationConfig['cacheStrategy']>): void => {
    if (strategy) {
      cacheService.updateCacheStrategy(strategy);
      
      const cacheStatistics = cacheService.getCacheStatistics();
      updateState({ cacheStatistics });
    }
  }, [cacheService, updateState]);

  // Periodic state updates for loading progress
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const cacheStatistics = cacheService.getCacheStatistics();
      
      // Only update if there are changes to avoid unnecessary re-renders
      setState(prevState => {
        if (JSON.stringify(prevState.cacheStatistics) !== JSON.stringify(cacheStatistics)) {
          return { ...prevState, cacheStatistics };
        }
        return prevState;
      });
    }, 1000); // Update every second

    return () => clearInterval(updateInterval);
  }, [cacheService]);

  // Auto-optimization
  useEffect(() => {
    if (enableAutoOptimization) {
      optimizationTimerRef.current = setInterval(() => {
        // Trigger cache optimization
        const stats = cacheService.getCacheStatistics();
        
        // Only optimize if memory usage is high
        if (stats.memoryUsage.percentage > 80) {
          cacheService.getCacheStatistics(); // This triggers internal optimization
        }
      }, optimizationInterval);

      return () => {
        if (optimizationTimerRef.current) {
          clearInterval(optimizationTimerRef.current);
        }
      };
    }
  }, [enableAutoOptimization, optimizationInterval, cacheService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (optimizationTimerRef.current) {
        clearInterval(optimizationTimerRef.current);
      }
      cacheService.cleanup();
    };
  }, [cacheService]);

  return {
    // State
    isLoading: state.isLoading,
    loadingProgress: state.loadingProgress,
    performanceMetrics: state.performanceMetrics,
    cacheStatistics: state.cacheStatistics,
    error: state.error,

    // Actions
    loadSlice,
    preloadStudy,
    isSliceCached,
    getCachedSlices,
    clearStudyCache,
    clearAllCache,
    optimizeForSession,
    updateCacheStrategy,

    // Service reference
    cacheService
  };
}

/**
 * Hook for monitoring cache performance metrics
 */
export function useCachePerformanceMonitor(studyId?: string) {
  const [metrics, setMetrics] = useState<CachePerformanceMetrics | null>(null);
  const [statistics, setStatistics] = useState<CacheStatistics | null>(null);
  const cacheServiceRef = useRef<CacheIntegrationService | null>(null);

  if (!cacheServiceRef.current) {
    cacheServiceRef.current = new CacheIntegrationService();
  }

  useEffect(() => {
    const updateMetrics = () => {
      const cacheService = cacheServiceRef.current!;
      
      if (studyId) {
        const studyMetrics = cacheService.getPerformanceMetrics(studyId);
        setMetrics(studyMetrics);
      }
      
      const cacheStats = cacheService.getCacheStatistics();
      setStatistics(cacheStats);
    };

    // Initial update
    updateMetrics();

    // Periodic updates
    const interval = setInterval(updateMetrics, 2000); // Every 2 seconds

    return () => {
      clearInterval(interval);
      cacheServiceRef.current?.cleanup();
    };
  }, [studyId]);

  return {
    metrics,
    statistics,
    refresh: () => {
      const cacheService = cacheServiceRef.current!;
      
      if (studyId) {
        setMetrics(cacheService.getPerformanceMetrics(studyId));
      }
      setStatistics(cacheService.getCacheStatistics());
    }
  };
}

/**
 * Hook for cache-aware slice navigation
 */
export function useCacheAwareNavigation(studyId: string, totalSlices: number) {
  const { isSliceCached, getCachedSlices, loadSlice } = useIntelligentCache();
  const [currentSlice, setCurrentSlice] = useState(0);
  const [cachedSlices, setCachedSlices] = useState<number[]>([]);

  // Update cached slices list
  useEffect(() => {
    const updateCachedSlices = () => {
      const cached = getCachedSlices(studyId);
      setCachedSlices(cached);
    };

    updateCachedSlices();
    
    // Update periodically
    const interval = setInterval(updateCachedSlices, 1000);
    return () => clearInterval(interval);
  }, [studyId, getCachedSlices]);

  // Navigation functions
  const goToSlice = useCallback((sliceIndex: number) => {
    if (sliceIndex >= 0 && sliceIndex < totalSlices) {
      setCurrentSlice(sliceIndex);
    }
  }, [totalSlices]);

  const nextSlice = useCallback(() => {
    goToSlice(currentSlice + 1);
  }, [currentSlice, goToSlice]);

  const previousSlice = useCallback(() => {
    goToSlice(currentSlice - 1);
  }, [currentSlice, goToSlice]);

  const goToNextCachedSlice = useCallback(() => {
    const nextCached = cachedSlices.find(slice => slice > currentSlice);
    if (nextCached !== undefined) {
      goToSlice(nextCached);
    }
  }, [cachedSlices, currentSlice, goToSlice]);

  const goToPreviousCachedSlice = useCallback(() => {
    const prevCached = cachedSlices
      .filter(slice => slice < currentSlice)
      .pop(); // Get the last (highest) cached slice before current
    
    if (prevCached !== undefined) {
      goToSlice(prevCached);
    }
  }, [cachedSlices, currentSlice, goToSlice]);

  return {
    currentSlice,
    cachedSlices,
    isCurrentSliceCached: isSliceCached(studyId, currentSlice),
    canGoNext: currentSlice < totalSlices - 1,
    canGoPrevious: currentSlice > 0,
    hasNextCached: cachedSlices.some(slice => slice > currentSlice),
    hasPreviousCached: cachedSlices.some(slice => slice < currentSlice),
    
    // Navigation actions
    goToSlice,
    nextSlice,
    previousSlice,
    goToNextCachedSlice,
    goToPreviousCachedSlice
  };
}

export default useIntelligentCache;