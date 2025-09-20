/**
 * Cache Integration Service Tests
 * Tests for the service that integrates caching with DICOM loading
 */

import { CacheIntegrationService, CacheIntegrationConfig } from '../cacheIntegrationService';
import { Study } from '../../types';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock Worker
global.Worker = class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  postMessage(message: any): void {
    setTimeout(() => {
      if (this.onmessage) {
        const { action, data, id } = message;
        let result;
        
        if (action === 'compress') {
          result = new Uint8Array(data.length * 0.7);
        } else if (action === 'decompress') {
          result = new Uint8Array(data.length * 1.43);
        }
        
        this.onmessage(new MessageEvent('message', {
          data: { id, result, success: true }
        }));
      }
    }, 10);
  }
  
  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
} as any;

describe('CacheIntegrationService', () => {
  let cacheService: CacheIntegrationService;
  let mockStudy: Study;

  beforeEach(() => {
    cacheService = new CacheIntegrationService();
    
    mockStudy = {
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

    // Mock successful fetch responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    });
  });

  afterEach(() => {
    cacheService.cleanup();
    jest.clearAllMocks();
  });

  describe('Slice Loading', () => {
    test('should load slice from network when not cached', async () => {
      const studyId = mockStudy.study_uid;
      const sliceIndex = 0;
      const imageUrl = mockStudy.image_urls[sliceIndex];

      const result = await cacheService.loadSlice(studyId, sliceIndex, imageUrl);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(global.fetch).toHaveBeenCalledWith(imageUrl);
    });

    test('should load slice from cache when available', async () => {
      const studyId = mockStudy.study_uid;
      const sliceIndex = 0;
      const imageUrl = mockStudy.image_urls[sliceIndex];

      // First load - should fetch from network
      await cacheService.loadSlice(studyId, sliceIndex, imageUrl);
      
      // Reset fetch mock
      (global.fetch as jest.Mock).mockClear();

      // Second load - should come from cache
      const result = await cacheService.loadSlice(studyId, sliceIndex, imageUrl);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should handle network errors gracefully', async () => {
      const studyId = mockStudy.study_uid;
      const sliceIndex = 0;
      const imageUrl = mockStudy.image_urls[sliceIndex];

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(cacheService.loadSlice(studyId, sliceIndex, imageUrl))
        .rejects.toThrow('Network error');
    });

    test('should avoid duplicate network requests for same slice', async () => {
      const studyId = mockStudy.study_uid;
      const sliceIndex = 0;
      const imageUrl = mockStudy.image_urls[sliceIndex];

      // Start multiple concurrent loads for the same slice
      const promises = [
        cacheService.loadSlice(studyId, sliceIndex, imageUrl),
        cacheService.loadSlice(studyId, sliceIndex, imageUrl),
        cacheService.loadSlice(studyId, sliceIndex, imageUrl)
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result).toBeInstanceOf(ArrayBuffer);
      });

      // But only one network request should have been made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Study Preloading', () => {
    test('should initialize loading progress when preloading study', async () => {
      const studyId = mockStudy.study_uid;

      await cacheService.preloadStudy(mockStudy, 0);

      const progress = cacheService.getLoadingProgress(studyId);
      expect(progress).toBeTruthy();
      expect(progress!.studyId).toBe(studyId);
      expect(progress!.totalSlices).toBe(mockStudy.total_slices);
      expect(progress!.currentSlice).toBe(0);
    });

    test('should start background loading when enabled', async () => {
      const config: Partial<CacheIntegrationConfig> = {
        enableBackgroundLoading: true,
        prefetchRadius: 3
      };

      const backgroundCacheService = new CacheIntegrationService(config);

      await backgroundCacheService.preloadStudy(mockStudy, 0);

      // Allow some time for background loading to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const progress = backgroundCacheService.getLoadingProgress(mockStudy.study_uid);
      expect(progress).toBeTruthy();

      backgroundCacheService.cleanup();
    });
  });

  describe('Cache Management', () => {
    test('should check if slice is cached', async () => {
      const studyId = mockStudy.study_uid;
      const sliceIndex = 0;

      expect(cacheService.isSliceCached(studyId, sliceIndex)).toBe(false);

      await cacheService.loadSlice(studyId, sliceIndex, mockStudy.image_urls[sliceIndex]);

      expect(cacheService.isSliceCached(studyId, sliceIndex)).toBe(true);
    });

    test('should get list of cached slices', async () => {
      const studyId = mockStudy.study_uid;

      // Load a few slices
      await cacheService.loadSlice(studyId, 0, mockStudy.image_urls[0]);
      await cacheService.loadSlice(studyId, 2, mockStudy.image_urls[2]);
      await cacheService.loadSlice(studyId, 5, mockStudy.image_urls[5]);

      const cachedSlices = cacheService.getCachedSlices(studyId);
      expect(cachedSlices).toEqual([0, 2, 5]);
    });

    test('should clear cache for specific study', async () => {
      const studyId1 = 'study-1';
      const studyId2 = 'study-2';

      // Load slices for both studies
      await cacheService.loadSlice(studyId1, 0, 'http://example.com/study1-slice0.dcm');
      await cacheService.loadSlice(studyId2, 0, 'http://example.com/study2-slice0.dcm');

      expect(cacheService.isSliceCached(studyId1, 0)).toBe(true);
      expect(cacheService.isSliceCached(studyId2, 0)).toBe(true);

      // Clear cache for study1 only
      cacheService.clearStudyCache(studyId1);

      expect(cacheService.isSliceCached(studyId1, 0)).toBe(false);
      expect(cacheService.isSliceCached(studyId2, 0)).toBe(true);
    });

    test('should clear all cache', async () => {
      const studyId = mockStudy.study_uid;

      await cacheService.loadSlice(studyId, 0, mockStudy.image_urls[0]);
      await cacheService.loadSlice(studyId, 1, mockStudy.image_urls[1]);

      expect(cacheService.getCachedSlices(studyId)).toHaveLength(2);

      cacheService.clearAllCache();

      expect(cacheService.getCachedSlices(studyId)).toHaveLength(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', async () => {
      const studyId = mockStudy.study_uid;

      // Load a slice (cache miss)
      await cacheService.loadSlice(studyId, 0, mockStudy.image_urls[0]);

      // Load same slice again (cache hit)
      await cacheService.loadSlice(studyId, 0, mockStudy.image_urls[0]);

      const metrics = cacheService.getPerformanceMetrics(studyId);
      expect(metrics).toBeTruthy();
      expect(metrics!.averageLoadTime).toBeGreaterThan(0);
      expect(metrics!.cacheHitRate).toBeGreaterThanOrEqual(0);
    });

    test('should provide cache statistics', () => {
      const stats = cacheService.getCacheStatistics();
      
      expect(stats).toBeTruthy();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.totalSize).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsage).toBeDefined();
    });
  });

  describe('Cache Optimization', () => {
    test('should optimize cache for sequential viewing pattern', async () => {
      const studyId = mockStudy.study_uid;
      const currentSlice = 5;

      await cacheService.optimizeForCurrentSession(studyId, currentSlice, 'sequential');

      // Optimization should complete without errors
      expect(true).toBe(true);
    });

    test('should optimize cache for random viewing pattern', async () => {
      const studyId = mockStudy.study_uid;
      const currentSlice = 3;

      await cacheService.optimizeForCurrentSession(studyId, currentSlice, 'random');

      // Optimization should complete without errors
      expect(true).toBe(true);
    });

    test('should optimize cache for focused viewing pattern', async () => {
      const studyId = mockStudy.study_uid;
      const currentSlice = 7;

      await cacheService.optimizeForCurrentSession(studyId, currentSlice, 'focused');

      // Optimization should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('should accept custom configuration', () => {
      const config: Partial<CacheIntegrationConfig> = {
        enablePrefetching: false,
        prefetchRadius: 10,
        enableBackgroundLoading: false,
        loadingPriority: 'current'
      };

      const customCacheService = new CacheIntegrationService(config);
      
      // Service should be created successfully with custom config
      expect(customCacheService).toBeTruthy();
      
      customCacheService.cleanup();
    });

    test('should update cache strategy', () => {
      const newStrategy = {
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        prefetchCount: 15,
        compressionEnabled: true
      };

      expect(() => {
        cacheService.updateCacheStrategy(newStrategy);
      }).not.toThrow();
    });
  });

  describe('Loading Progress Tracking', () => {
    test('should track loading progress', async () => {
      const studyId = mockStudy.study_uid;

      await cacheService.preloadStudy(mockStudy, 0);

      const progress = cacheService.getLoadingProgress(studyId);
      expect(progress).toBeTruthy();
      expect(progress!.studyId).toBe(studyId);
      expect(progress!.totalSlices).toBe(mockStudy.total_slices);
      expect(progress!.isLoading).toBe(true);
    });

    test('should return null for non-existent study progress', () => {
      const progress = cacheService.getLoadingProgress('non-existent-study');
      expect(progress).toBeNull();
    });

    test('should return null for non-existent study metrics', () => {
      const metrics = cacheService.getPerformanceMetrics('non-existent-study');
      expect(metrics).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle HTTP errors gracefully', async () => {
      const studyId = mockStudy.study_uid;
      const sliceIndex = 0;
      const imageUrl = mockStudy.image_urls[sliceIndex];

      // Mock HTTP error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(cacheService.loadSlice(studyId, sliceIndex, imageUrl))
        .rejects.toThrow('HTTP 404: Not Found');
    });

    test('should handle preload errors gracefully', async () => {
      // Mock fetch to fail
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await expect(cacheService.preloadStudy(mockStudy, 0))
        .rejects.toThrow('Network failure');

      // Progress should still be updated to indicate failure
      const progress = cacheService.getLoadingProgress(mockStudy.study_uid);
      expect(progress).toBeTruthy();
      expect(progress!.isLoading).toBe(false);
    });
  });

  describe('Resource Cleanup', () => {
    test('should cleanup resources properly', async () => {
      const studyId = mockStudy.study_uid;

      // Load some data
      await cacheService.loadSlice(studyId, 0, mockStudy.image_urls[0]);
      await cacheService.preloadStudy(mockStudy, 0);

      expect(cacheService.getLoadingProgress(studyId)).toBeTruthy();
      expect(cacheService.getCachedSlices(studyId)).toHaveLength(1);

      // Cleanup
      cacheService.cleanup();

      expect(cacheService.getLoadingProgress(studyId)).toBeNull();
      expect(cacheService.getCachedSlices(studyId)).toHaveLength(0);
    });

    test('should handle multiple cleanup calls', () => {
      expect(() => {
        cacheService.cleanup();
        cacheService.cleanup();
        cacheService.cleanup();
      }).not.toThrow();
    });
  });
});