/**
 * CinePlayerService Tests
 * Tests for the cine player service functionality
 */

import { CinePlayerService } from '../cinePlayerService';
import { CacheIntegrationService } from '../cacheIntegrationService';
import { Study } from '../../types';

// Mock the cache integration service
jest.mock('../cacheIntegrationService');

describe('CinePlayerService', () => {
  let cineService: CinePlayerService;
  let mockCacheService: jest.Mocked<CacheIntegrationService>;
  let mockStudy: Study;

  beforeEach(() => {
    mockCacheService = new CacheIntegrationService() as jest.Mocked<CacheIntegrationService>;
    cineService = new CinePlayerService(mockCacheService);
    
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
  });

  afterEach(() => {
    cineService.cleanup();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const state = cineService.getState();
      
      expect(state.isPlaying).toBe(false);
      expect(state.currentSlice).toBe(0);
      expect(state.totalSlices).toBe(0);
      expect(state.frameRate).toBe(10);
      expect(state.playDirection).toBe('forward');
      expect(state.loopMode).toBe('loop');
      expect(state.speed).toBe(1.0);
    });

    test('should initialize for study', async () => {
      await cineService.initializeForStudy(mockStudy, 3);
      
      const state = cineService.getState();
      expect(state.currentSlice).toBe(3);
      expect(state.totalSlices).toBe(10);
    });

    test('should initialize with default start slice', async () => {
      await cineService.initializeForStudy(mockStudy);
      
      const state = cineService.getState();
      expect(state.currentSlice).toBe(0);
    });
  });

  describe('Playback Control', () => {
    beforeEach(async () => {
      await cineService.initializeForStudy(mockStudy, 0);
    });

    test('should start playback', async () => {
      await cineService.startPlayback();
      
      const state = cineService.getState();
      expect(state.isPlaying).toBe(true);
    });

    test('should pause playback', async () => {
      await cineService.startPlayback();
      cineService.pausePlayback();
      
      const state = cineService.getState();
      expect(state.isPlaying).toBe(false);
    });

    test('should stop playback and reset to first slice', () => {
      cineService.stopPlayback();
      
      const state = cineService.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentSlice).toBe(0);
    });

    test('should not start playback if already playing', async () => {
      await cineService.startPlayback();
      const firstState = cineService.getState();
      
      await cineService.startPlayback(); // Should not change state
      const secondState = cineService.getState();
      
      expect(firstState.isPlaying).toBe(secondState.isPlaying);
    });

    test('should not pause if not playing', () => {
      const initialState = cineService.getState();
      cineService.pausePlayback();
      const finalState = cineService.getState();
      
      expect(initialState.isPlaying).toBe(finalState.isPlaying);
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await cineService.initializeForStudy(mockStudy, 5);
    });

    test('should navigate to specific slice', async () => {
      const success = await cineService.goToSlice(3);
      
      expect(success).toBe(true);
      expect(cineService.getState().currentSlice).toBe(3);
    });

    test('should reject invalid slice indices', async () => {
      const negativeResult = await cineService.goToSlice(-1);
      const tooLargeResult = await cineService.goToSlice(15);
      
      expect(negativeResult).toBe(false);
      expect(tooLargeResult).toBe(false);
      expect(cineService.getState().currentSlice).toBe(5); // Should remain unchanged
    });

    test('should navigate to next frame in forward direction', async () => {
      const success = await cineService.nextFrame();
      
      expect(success).toBe(true);
      expect(cineService.getState().currentSlice).toBe(6);
    });

    test('should navigate to next frame in backward direction', async () => {
      cineService.setPlayDirection('backward');
      const success = await cineService.nextFrame();
      
      expect(success).toBe(true);
      expect(cineService.getState().currentSlice).toBe(4);
    });
  });

  describe('Loop Modes', () => {
    beforeEach(async () => {
      await cineService.initializeForStudy(mockStudy, 0);
    });

    test('should loop to beginning in loop mode', async () => {
      cineService.setLoopMode('loop');
      await cineService.goToSlice(9); // Last slice
      
      const success = await cineService.nextFrame();
      
      expect(success).toBe(true);
      expect(cineService.getState().currentSlice).toBe(0);
    });

    test('should stop at end in none mode', async () => {
      cineService.setLoopMode('none');
      await cineService.goToSlice(9); // Last slice
      await cineService.startPlayback();
      
      const success = await cineService.nextFrame();
      
      expect(success).toBe(false);
      expect(cineService.getState().isPlaying).toBe(false);
    });

    test('should bounce direction in bounce mode', async () => {
      cineService.setLoopMode('bounce');
      await cineService.goToSlice(9); // Last slice
      
      await cineService.nextFrame();
      
      const state = cineService.getState();
      expect(state.currentSlice).toBe(9);
      expect(state.playDirection).toBe('backward');
    });

    test('should bounce from beginning in backward direction', async () => {
      cineService.setLoopMode('bounce');
      cineService.setPlayDirection('backward');
      await cineService.goToSlice(0); // First slice
      
      await cineService.nextFrame();
      
      const state = cineService.getState();
      expect(state.currentSlice).toBe(0);
      expect(state.playDirection).toBe('forward');
    });
  });

  describe('Configuration', () => {
    test('should set frame rate within valid range', () => {
      cineService.setFrameRate(30);
      expect(cineService.getState().frameRate).toBe(30);
      
      cineService.setFrameRate(0); // Below minimum
      expect(cineService.getState().frameRate).toBe(1);
      
      cineService.setFrameRate(100); // Above maximum
      expect(cineService.getState().frameRate).toBe(60);
    });

    test('should set speed within valid range', () => {
      cineService.setSpeed(2.5);
      expect(cineService.getState().speed).toBe(2.5);
      
      cineService.setSpeed(0.05); // Below minimum
      expect(cineService.getState().speed).toBe(0.1);
      
      cineService.setSpeed(10); // Above maximum
      expect(cineService.getState().speed).toBe(5.0);
    });

    test('should set play direction', () => {
      cineService.setPlayDirection('backward');
      expect(cineService.getState().playDirection).toBe('backward');
      
      cineService.setPlayDirection('forward');
      expect(cineService.getState().playDirection).toBe('forward');
    });

    test('should set loop mode', () => {
      cineService.setLoopMode('none');
      expect(cineService.getState().loopMode).toBe('none');
      
      cineService.setLoopMode('bounce');
      expect(cineService.getState().loopMode).toBe('bounce');
    });
  });

  describe('Buffering', () => {
    beforeEach(async () => {
      await cineService.initializeForStudy(mockStudy, 5);
    });

    test('should check if slice is buffered', () => {
      // Initially, slices should be buffered around the start position
      const isBuffered = cineService.isSliceBuffered(5);
      expect(typeof isBuffered).toBe('boolean');
    });

    test('should get buffer status', () => {
      const bufferStatus = cineService.getBufferStatus();
      
      expect(bufferStatus).toHaveProperty('buffered');
      expect(bufferStatus).toHaveProperty('missing');
      expect(Array.isArray(bufferStatus.buffered)).toBe(true);
      expect(Array.isArray(bufferStatus.missing)).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await cineService.initializeForStudy(mockStudy, 0);
    });

    test('should provide performance metrics', () => {
      const metrics = cineService.getMetrics();
      
      expect(metrics).toHaveProperty('actualFrameRate');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('bufferHealth');
      expect(metrics).toHaveProperty('loadingLatency');
      expect(metrics).toHaveProperty('smoothnessScore');
      
      expect(typeof metrics.actualFrameRate).toBe('number');
      expect(typeof metrics.droppedFrames).toBe('number');
      expect(typeof metrics.bufferHealth).toBe('number');
      expect(typeof metrics.loadingLatency).toBe('number');
      expect(typeof metrics.smoothnessScore).toBe('number');
    });

    test('should track dropped frames', async () => {
      // Simulate a scenario that might cause dropped frames
      await cineService.startPlayback();
      
      // Navigate to unbuffered slice
      await cineService.goToSlice(9);
      
      const metrics = cineService.getMetrics();
      expect(metrics.droppedFrames).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event System', () => {
    let eventReceived: any = null;

    beforeEach(async () => {
      await cineService.initializeForStudy(mockStudy, 0);
      eventReceived = null;
    });

    test('should emit play event', async () => {
      cineService.addEventListener('play', (event) => {
        eventReceived = event;
      });
      
      await cineService.startPlayback();
      
      expect(eventReceived).toBeTruthy();
      expect(eventReceived.type).toBe('play');
    });

    test('should emit pause event', async () => {
      await cineService.startPlayback();
      
      cineService.addEventListener('pause', (event) => {
        eventReceived = event;
      });
      
      cineService.pausePlayback();
      
      expect(eventReceived).toBeTruthy();
      expect(eventReceived.type).toBe('pause');
    });

    test('should emit stop event', () => {
      cineService.addEventListener('stop', (event) => {
        eventReceived = event;
      });
      
      cineService.stopPlayback();
      
      expect(eventReceived).toBeTruthy();
      expect(eventReceived.type).toBe('stop');
    });

    test('should emit slice change event', async () => {
      cineService.addEventListener('slice_change', (event) => {
        eventReceived = event;
      });
      
      await cineService.goToSlice(3);
      
      expect(eventReceived).toBeTruthy();
      expect(eventReceived.type).toBe('slice_change');
      expect(eventReceived.data.currentSlice).toBe(3);
    });

    test('should remove event listeners', async () => {
      const listener = jest.fn();
      
      cineService.addEventListener('play', listener);
      cineService.removeEventListener('play', listener);
      
      await cineService.startPlayback();
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Custom Configuration', () => {
    test('should accept custom configuration', () => {
      const customConfig = {
        defaultFrameRate: 20,
        bufferSize: 30,
        preloadRadius: 15,
        enableSmoothing: false,
        adaptiveBuffering: false,
        maxConcurrentLoads: 5
      };
      
      const customService = new CinePlayerService(mockCacheService, customConfig);
      const state = customService.getState();
      
      expect(state.frameRate).toBe(20);
      
      customService.cleanup();
    });
  });

  describe('Error Handling', () => {
    test('should handle navigation errors gracefully', async () => {
      await cineService.initializeForStudy(mockStudy, 0);
      
      // Mock a loading error
      jest.spyOn(cineService as any, 'loadSlice').mockRejectedValue(new Error('Load failed'));
      
      const success = await cineService.goToSlice(5);
      
      expect(success).toBe(false);
    });

    test('should handle event listener errors gracefully', async () => {
      await cineService.initializeForStudy(mockStudy, 0);
      
      // Add a listener that throws an error
      cineService.addEventListener('play', () => {
        throw new Error('Listener error');
      });
      
      // Should not throw when emitting event
      expect(async () => {
        await cineService.startPlayback();
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', async () => {
      await cineService.initializeForStudy(mockStudy, 0);
      await cineService.startPlayback();
      
      cineService.cleanup();
      
      const state = cineService.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.bufferedSlices.size).toBe(0);
    });

    test('should handle multiple cleanup calls', () => {
      expect(() => {
        cineService.cleanup();
        cineService.cleanup();
        cineService.cleanup();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle single slice study', async () => {
      const singleSliceStudy = { ...mockStudy, total_slices: 1 };
      await cineService.initializeForStudy(singleSliceStudy, 0);
      
      const success = await cineService.nextFrame();
      
      // Should handle single slice appropriately based on loop mode
      expect(typeof success).toBe('boolean');
    });

    test('should handle empty study', async () => {
      const emptyStudy = { ...mockStudy, total_slices: 0 };
      
      await expect(cineService.initializeForStudy(emptyStudy, 0)).resolves.not.toThrow();
    });

    test('should handle rapid navigation', async () => {
      await cineService.initializeForStudy(mockStudy, 0);
      
      // Rapid navigation calls
      const promises = [
        cineService.goToSlice(1),
        cineService.goToSlice(2),
        cineService.goToSlice(3),
        cineService.goToSlice(4),
        cineService.goToSlice(5)
      ];
      
      const results = await Promise.all(promises);
      
      // All should complete without errors
      results.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
    });
  });
});