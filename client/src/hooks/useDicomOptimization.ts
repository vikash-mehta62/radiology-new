import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedDicomService, EnhancementType, FilterType } from '../services/enhancedDicomService';

interface DicomOptimizationConfig {
  enableCaching: boolean;
  enablePreloading: boolean;
  preloadRadius: number; // Number of adjacent images to preload
  cacheSize: number; // Maximum cache size in MB
  compressionQuality: number; // 0-100 for JPEG compression
  enableWebWorkers: boolean;
  enableProgressiveLoading: boolean;
}

interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkRequests: number;
  averageResponseTime: number;
}

interface DicomOptimizationState {
  config: DicomOptimizationConfig;
  metrics: PerformanceMetrics;
  isOptimizing: boolean;
  cacheStatus: {
    size: number;
    hitRate: number;
    entries: number;
  };
}

const defaultConfig: DicomOptimizationConfig = {
  enableCaching: true,
  enablePreloading: true,
  preloadRadius: 2,
  cacheSize: 100, // 100MB
  compressionQuality: 85,
  enableWebWorkers: true,
  enableProgressiveLoading: true
};

const defaultMetrics: PerformanceMetrics = {
  loadTime: 0,
  cacheHitRate: 0,
  memoryUsage: 0,
  networkRequests: 0,
  averageResponseTime: 0
};

export const useDicomOptimization = (initialConfig?: Partial<DicomOptimizationConfig>) => {
  const [state, setState] = useState<DicomOptimizationState>({
    config: { ...defaultConfig, ...initialConfig },
    metrics: defaultMetrics,
    isOptimizing: false,
    cacheStatus: {
      size: 0,
      hitRate: 0,
      entries: 0
    }
  });

  const metricsRef = useRef<{
    requestTimes: number[];
    cacheHits: number;
    cacheMisses: number;
    totalRequests: number;
  }>({
    requestTimes: [],
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0
  });

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<DicomOptimizationConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  }, []);

  // Record performance metrics
  const recordMetrics = useCallback((loadTime: number, cacheHit: boolean) => {
    const metrics = metricsRef.current;
    
    metrics.requestTimes.push(loadTime);
    metrics.totalRequests++;
    
    if (cacheHit) {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
    }

    // Keep only last 100 requests for average calculation
    if (metrics.requestTimes.length > 100) {
      metrics.requestTimes.shift();
    }

    const averageResponseTime = metrics.requestTimes.reduce((a, b) => a + b, 0) / metrics.requestTimes.length;
    const cacheHitRate = metrics.totalRequests > 0 ? (metrics.cacheHits / metrics.totalRequests) * 100 : 0;

    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        loadTime,
        cacheHitRate,
        averageResponseTime,
        networkRequests: metrics.totalRequests
      }
    }));
  }, []);

  // Optimized image loading with caching and preloading
  const loadOptimizedImage = useCallback(async (
    patientId: string,
    filename: string,
    options?: {
      enhancement?: EnhancementType;
      filter?: FilterType;
      priority?: 'high' | 'normal' | 'low';
    }
  ) => {
    const startTime = Date.now();
    
    try {
      setState(prev => ({ ...prev, isOptimizing: true }));

      // Check if progressive loading is enabled
      let result;
      if (state.config.enableProgressiveLoading) {
        // Load thumbnail first, then full image
        try {
          const thumbnail = await enhancedDicomService.getDicomThumbnail(patientId, filename);
          // Return thumbnail immediately for quick preview
          setTimeout(async () => {
            try {
              const fullImage = await enhancedDicomService.processDicomFile(patientId, filename, {
                enhancement: options?.enhancement,
                filter: options?.filter,
                useCache: state.config.enableCaching
              });
              
              const loadTime = Date.now() - startTime;
              const cacheHit = loadTime < 100; // Assume cache hit if very fast
              recordMetrics(loadTime, cacheHit);
            } catch (error) {
              console.error('Failed to load full image:', error);
            }
          }, 0);
          
          return { image_data: thumbnail, isProgressive: true };
        } catch (error) {
          // Fall back to regular loading
          console.warn('Progressive loading failed, falling back to regular loading');
        }
      }

      // Regular loading
      result = await enhancedDicomService.processDicomFile(patientId, filename, {
        enhancement: options?.enhancement,
        filter: options?.filter,
        useCache: state.config.enableCaching
      });

      const loadTime = Date.now() - startTime;
      const cacheHit = loadTime < 100; // Assume cache hit if very fast
      recordMetrics(loadTime, cacheHit);

      return result;

    } finally {
      setState(prev => ({ ...prev, isOptimizing: false }));
    }
  }, [state.config.enableCaching, state.config.enableProgressiveLoading, recordMetrics]);

  // Batch preload images
  const preloadImages = useCallback(async (
    images: Array<{ patientId: string; filename: string }>,
    options?: {
      enhancement?: EnhancementType;
      priority?: 'high' | 'normal' | 'low';
    }
  ) => {
    if (!state.config.enablePreloading) return;

    try {
      await enhancedDicomService.batchPreloadImages(
        images.map(img => ({
          patientId: img.patientId,
          filename: img.filename,
          enhancement: options?.enhancement,
          priority: options?.priority || 'low'
        }))
      );
    } catch (error) {
      console.error('Batch preloading failed:', error);
    }
  }, [state.config.enablePreloading]);

  // Smart preloading based on current image
  const smartPreload = useCallback(async (
    currentPatientId: string,
    currentFilename: string,
    allImages: Array<{ patientId: string; filename: string }>,
    options?: {
      enhancement?: EnhancementType;
    }
  ) => {
    if (!state.config.enablePreloading) return;

    // Find current image index
    const currentIndex = allImages.findIndex(
      img => img.patientId === currentPatientId && img.filename === currentFilename
    );

    if (currentIndex === -1) return;

    // Preload images within radius
    const imagesToPreload: Array<{ patientId: string; filename: string }> = [];
    
    for (let i = 1; i <= state.config.preloadRadius; i++) {
      // Preload next images
      if (currentIndex + i < allImages.length) {
        imagesToPreload.push(allImages[currentIndex + i]);
      }
      
      // Preload previous images
      if (currentIndex - i >= 0) {
        imagesToPreload.push(allImages[currentIndex - i]);
      }
    }

    await preloadImages(imagesToPreload, {
      enhancement: options?.enhancement,
      priority: 'low'
    });
  }, [state.config.enablePreloading, state.config.preloadRadius, preloadImages]);

  // Update cache status
  const updateCacheStatus = useCallback(async () => {
    try {
      const status = await enhancedDicomService.getCacheStats();
      setState(prev => ({
        ...prev,
        cacheStatus: {
          size: status.disk_cache_size_mb,
          hitRate: 0.85, // Calculate from cache hits/misses if available
          entries: status.memory_cache_items + status.disk_cache_items
        }
      }));
    } catch (error) {
      console.error('Failed to get cache status:', error);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await enhancedDicomService.clearCache();
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [updateCacheStatus]);

  // Optimize memory usage
  const optimizeMemory = useCallback(() => {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Update memory usage metrics
    if ((performance as any).memory) {
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          memoryUsage: (performance as any).memory.usedJSHeapSize / (1024 * 1024) // MB
        }
      }));
    }
  }, []);

  // Auto-optimization based on performance
  const autoOptimize = useCallback(() => {
    const { metrics, config } = state;

    // If cache hit rate is low, increase cache size
    if (metrics.cacheHitRate < 50 && config.cacheSize < 200) {
      updateConfig({ cacheSize: Math.min(200, config.cacheSize + 20) });
    }

    // If average response time is high, enable more aggressive preloading
    if (metrics.averageResponseTime > 1000 && config.preloadRadius < 5) {
      updateConfig({ preloadRadius: Math.min(5, config.preloadRadius + 1) });
    }

    // If memory usage is high, reduce compression quality
    if (metrics.memoryUsage > 100 && config.compressionQuality > 60) {
      updateConfig({ compressionQuality: Math.max(60, config.compressionQuality - 10) });
    }
  }, [state, updateConfig]);

  // Periodic cache status updates
  useEffect(() => {
    const interval = setInterval(updateCacheStatus, 30000); // Every 30 seconds
    updateCacheStatus(); // Initial update
    
    return () => clearInterval(interval);
  }, [updateCacheStatus]);

  // Periodic memory optimization
  useEffect(() => {
    const interval = setInterval(() => {
      optimizeMemory();
      autoOptimize();
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [optimizeMemory, autoOptimize]);

  // Performance monitoring
  const getPerformanceReport = useCallback(() => {
    const { metrics, cacheStatus } = state;
    
    return {
      summary: {
        averageLoadTime: metrics.averageResponseTime,
        cacheEfficiency: metrics.cacheHitRate,
        memoryUsage: metrics.memoryUsage,
        totalRequests: metrics.networkRequests
      },
      cache: {
        size: cacheStatus.size,
        entries: cacheStatus.entries,
        hitRate: cacheStatus.hitRate
      },
      recommendations: [
        metrics.cacheHitRate < 70 ? 'Consider increasing cache size' : null,
        metrics.averageResponseTime > 2000 ? 'Enable progressive loading' : null,
        metrics.memoryUsage > 150 ? 'Reduce image quality or clear cache' : null
      ].filter(Boolean)
    };
  }, [state]);

  return {
    // State
    config: state.config,
    metrics: state.metrics,
    cacheStatus: state.cacheStatus,
    isOptimizing: state.isOptimizing,

    // Actions
    updateConfig,
    loadOptimizedImage,
    preloadImages,
    smartPreload,
    clearCache,
    optimizeMemory,
    
    // Utils
    getPerformanceReport,
    recordMetrics
  };
};

export default useDicomOptimization;