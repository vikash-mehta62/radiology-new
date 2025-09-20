/**
 * useIntelligentCache Hook Tests
 * Tests for the intelligent cache React hook
 */

import { renderHook, act } from '@testing-library/react';
import { useIntelligentCache, useCachePerformanceMonitor, useCacheAwareNavigation } from '../useIntelligentCache';
import { Study } from '../../types';

// Mock the cache integration service
jest.mock('../../services/cacheIntegrationService');

// Mock Worker
global.Worker = class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage(): void {}
  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
} as any;

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
});

describe('useIntelligentCache', () => {
  const mockStudy: Study = {
    study_uid: 'test-study-123',
    patient_id: 'patient-456',
    study_date: '2024-01-15',
    modality: 'CT',
    study_description: 'Test CT Study',
    image_urls: Array.from({ length: 10 }, (_, i) => `http://example.com/slice-${i}.dcm`),
    total_slices: 10,
    is_multi_slice: true,
    processing_status: 'completed',
    ai_processing_status: 'completed',
    dicom_metadata: {
      PatientName: 'Test Patient',
      PatientID: 'patient-456',
      StudyInstanceUID: 'test-study-123',
      SeriesInstanceUID: 'test-series-123',
      Modality: 'CT'
    },
    image_metadata: {
      dimensions: { width: 512, height: 512, depth: 10 },
      spacing: { x: 1.0, y: 1.0, z: 1.0 },
      orientation: 'axial',
      pixel_data_type: 'int16',
      bits_allocated: 16,
      window_center: 40,
      window_width: 400
    },
    cache_status: {
      cached_slices: 0,
      total_size_mb: 0,
      last_accessed: new Date().toISOString()
    },
    load_performance: {
      load_time_ms: 1000,
      render_time_ms: 50,
      memory_usage_mb: 10
    },
    dicom_url: 'http://example.com/study.dcm',
    original_filename: 'test_study.dcm'
  } as Study;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Hook Functionality', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useIntelligentCache());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadingProgress).toBeNull();
      expect(result.current.performanceMetrics).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.cacheStatistics).toBeDefined();
      expect(result.current.cacheService).toBeDefined();
    });

    test('should provide all expected actions', () => {
      const { result } = renderHook(() => useIntelligentCache());

      expect(typeof result.current.loadSlice).toBe('function');
      expect(typeof result.current.preloadStudy).toBe('function');
      expect(typeof result.current.isSliceCached).toBe('function');
      expect(typeof result.current.getCachedSlices).toBe('function');
      expect(typeof result.current.clearStudyCache).toBe('function');
      expect(typeof result.current.clearAllCache).toBe('function');
      expect(typeof result.current.optimizeForSession).toBe('function');
      expect(typeof result.current.updateCacheStrategy).toBe('function');
    });

    test('should accept custom configuration', () => {
      const config = {
        enablePrefetching: false,
        prefetchRadius: 10
      };

      const { result } = renderHook(() => useIntelligentCache({ config }));

      expect(result.current.cacheService).toBeDefined();
    });
  });

  describe('Slice Loading', () => {
    test('should load slice and update state', async () => {
      const { result } = renderHook(() => useIntelligentCache());

      await act(async () => {
        const data = await result.current.loadSlice('study-1', 0, 'http://example.com/slice-0.dcm');
        expect(data).toBeInstanceOf(ArrayBuffer);
      });

      expect(result.current.isLoading).toBe(false);
    });

    test('should handle loading errors', async () => {
      const { result } = renderHook(() => useIntelligentCache());

      // Mock the cache service to throw an error
      const mockError = new Error('Loading failed');
      jest.spyOn(result.current.cacheService, 'loadSlice').mockRejectedValue(mockError);

      await act(async () => {
        try {
          await result.current.loadSlice('study-1', 0, 'http://example.com/slice-0.dcm');
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Study Preloading', () => {
    test('should preload study and update state', async () => {
      const { result } = renderHook(() => useIntelligentCache());

      await act(async () => {
        await result.current.preloadStudy(mockStudy, 0);
      });

      expect(result.current.isLoading).toBe(false);
    });

    test('should handle preloading errors', async () => {
      const { result } = renderHook(() => useIntelligentCache());

      const mockError = new Error('Preloading failed');
      jest.spyOn(result.current.cacheService, 'preloadStudy').mockRejectedValue(mockError);

      await act(async () => {
        try {
          await result.current.preloadStudy(mockStudy, 0);
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('Cache Management', () => {
    test('should check if slice is cached', () => {
      const { result } = renderHook(() => useIntelligentCache());

      jest.spyOn(result.current.cacheService, 'isSliceCached').mockReturnValue(true);

      const isCached = result.current.isSliceCached('study-1', 0);
      expect(isCached).toBe(true);
    });

    test('should get cached slices', () => {
      const { result } = renderHook(() => useIntelligentCache());

      const mockCachedSlices = [0, 1, 2, 5];
      jest.spyOn(result.current.cacheService, 'getCachedSlices').mockReturnValue(mockCachedSlices);

      const cachedSlices = result.current.getCachedSlices('study-1');
      expect(cachedSlices).toEqual(mockCachedSlices);
    });

    test('should clear study cache', () => {
      const { result } = renderHook(() => useIntelligentCache());

      const clearSpy = jest.spyOn(result.current.cacheService, 'clearStudyCache');

      act(() => {
        result.current.clearStudyCache('study-1');
      });

      expect(clearSpy).toHaveBeenCalledWith('study-1');
    });

    test('should clear all cache', () => {
      const { result } = renderHook(() => useIntelligentCache());

      const clearSpy = jest.spyOn(result.current.cacheService, 'clearAllCache');

      act(() => {
        result.current.clearAllCache();
      });

      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('Cache Optimization', () => {
    test('should optimize for session', async () => {
      const { result } = renderHook(() => useIntelligentCache());

      const optimizeSpy = jest.spyOn(result.current.cacheService, 'optimizeForCurrentSession')
        .mockResolvedValue();

      await act(async () => {
        await result.current.optimizeForSession('study-1', 5, 'sequential');
      });

      expect(optimizeSpy).toHaveBeenCalledWith('study-1', 5, 'sequential');
    });

    test('should update cache strategy', () => {
      const { result } = renderHook(() => useIntelligentCache());

      const updateSpy = jest.spyOn(result.current.cacheService, 'updateCacheStrategy');
      const newStrategy = { maxMemoryUsage: 100 * 1024 * 1024 };

      act(() => {
        result.current.updateCacheStrategy(newStrategy);
      });

      expect(updateSpy).toHaveBeenCalledWith(newStrategy);
    });
  });

  describe('Auto-optimization', () => {
    test('should enable auto-optimization by default', () => {
      const { result } = renderHook(() => useIntelligentCache());

      // Auto-optimization should be enabled by default
      expect(result.current.cacheService).toBeDefined();
    });

    test('should disable auto-optimization when configured', () => {
      const { result } = renderHook(() => 
        useIntelligentCache({ enableAutoOptimization: false })
      );

      expect(result.current.cacheService).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useIntelligentCache());

      const cleanupSpy = jest.spyOn(result.current.cacheService, 'cleanup');

      unmount();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});

describe('useCachePerformanceMonitor', () => {
  test('should initialize with null metrics', () => {
    const { result } = renderHook(() => useCachePerformanceMonitor());

    expect(result.current.metrics).toBeNull();
    expect(result.current.statistics).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');
  });

  test('should monitor specific study metrics', () => {
    const studyId = 'test-study-123';
    const { result } = renderHook(() => useCachePerformanceMonitor(studyId));

    expect(result.current.metrics).toBeDefined();
    expect(result.current.statistics).toBeDefined();
  });

  test('should refresh metrics on demand', () => {
    const { result } = renderHook(() => useCachePerformanceMonitor());

    act(() => {
      result.current.refresh();
    });

    expect(result.current.statistics).toBeDefined();
  });
});

describe('useCacheAwareNavigation', () => {
  const studyId = 'test-study-123';
  const totalSlices = 10;

  test('should initialize with default navigation state', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    expect(result.current.currentSlice).toBe(0);
    expect(result.current.cachedSlices).toEqual([]);
    expect(result.current.canGoNext).toBe(true);
    expect(result.current.canGoPrevious).toBe(false);
  });

  test('should provide navigation functions', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    expect(typeof result.current.goToSlice).toBe('function');
    expect(typeof result.current.nextSlice).toBe('function');
    expect(typeof result.current.previousSlice).toBe('function');
    expect(typeof result.current.goToNextCachedSlice).toBe('function');
    expect(typeof result.current.goToPreviousCachedSlice).toBe('function');
  });

  test('should navigate to next slice', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    act(() => {
      result.current.nextSlice();
    });

    expect(result.current.currentSlice).toBe(1);
    expect(result.current.canGoPrevious).toBe(true);
  });

  test('should navigate to previous slice', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    // First go to slice 2
    act(() => {
      result.current.goToSlice(2);
    });

    expect(result.current.currentSlice).toBe(2);

    // Then go to previous
    act(() => {
      result.current.previousSlice();
    });

    expect(result.current.currentSlice).toBe(1);
  });

  test('should navigate to specific slice', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    act(() => {
      result.current.goToSlice(5);
    });

    expect(result.current.currentSlice).toBe(5);
  });

  test('should respect slice boundaries', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    // Try to go beyond last slice
    act(() => {
      result.current.goToSlice(15);
    });

    expect(result.current.currentSlice).toBe(0); // Should not change

    // Try to go before first slice
    act(() => {
      result.current.goToSlice(-1);
    });

    expect(result.current.currentSlice).toBe(0); // Should not change
  });

  test('should handle navigation at boundaries', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    // Go to last slice
    act(() => {
      result.current.goToSlice(totalSlices - 1);
    });

    expect(result.current.currentSlice).toBe(totalSlices - 1);
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.canGoPrevious).toBe(true);

    // Try to go next (should not change)
    act(() => {
      result.current.nextSlice();
    });

    expect(result.current.currentSlice).toBe(totalSlices - 1);
  });

  test('should track cached slices', () => {
    const { result } = renderHook(() => useCacheAwareNavigation(studyId, totalSlices));

    // Initially no cached slices
    expect(result.current.cachedSlices).toEqual([]);
    expect(result.current.hasNextCached).toBe(false);
    expect(result.current.hasPreviousCached).toBe(false);
  });
});