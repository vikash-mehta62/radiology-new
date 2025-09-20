/**
 * Tests for Enhanced DICOM Service
 */

import { enhancedDicomService } from '../enhancedDicomService';
import { errorHandler } from '../errorHandler';
import { Study } from '../../types';

// Mock cornerstone
jest.mock('cornerstone-core', () => ({
  enable: jest.fn(),
  loadImage: jest.fn(),
  registerImageLoader: jest.fn(),
  events: {
    addEventListener: jest.fn()
  }
}));

// Mock cornerstone loaders
jest.mock('cornerstone-wado-image-loader', () => ({
  configure: jest.fn(),
  wadouri: {
    loadImage: jest.fn()
  },
  external: {}
}));

jest.mock('cornerstone-web-image-loader', () => ({
  loadImage: jest.fn(),
  external: {}
}));

jest.mock('dicom-parser', () => ({}));

// Mock fetch
global.fetch = jest.fn();

const mockStudy: Study = {
  id: 'test-study-1',
  study_uid: 'test-study-uid-123',
  patient_id: 'TEST_PATIENT_001',
  modality: 'CT',
  exam_type: 'Chest CT',
  status: 'completed',
  created_at: '2024-01-01T00:00:00Z',
  image_urls: [
    'http://localhost:8000/uploads/TEST_PATIENT_001/test.dcm',
    'http://localhost:8000/uploads/TEST_PATIENT_001/test2.dcm'
  ],
  original_filename: 'test.dcm'
};

describe('EnhancedDicomService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(enhancedDicomService.initialize()).resolves.not.toThrow();
    });

    test('should handle initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock cornerstone.enable to throw
      const cornerstone = require('cornerstone-core');
      cornerstone.enable.mockImplementationOnce(() => {
        throw new Error('Cornerstone initialization failed');
      });

      await expect(enhancedDicomService.initialize()).rejects.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Image Loading', () => {
    test('should load image successfully with cornerstone', async () => {
      const mockImage = {
        imageId: 'test-image',
        width: 512,
        height: 512,
        getPixelData: () => new Uint8Array(512 * 512)
      };

      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockResolvedValue(mockImage);

      const result = await enhancedDicomService.loadImage('wadouri:http://test.com/image.dcm');
      
      expect(result).toBe(mockImage);
      expect(cornerstone.loadImage).toHaveBeenCalledWith('wadouri:http://test.com/image.dcm');
    });

    test('should use cache when available', async () => {
      const mockImage = {
        imageId: 'cached-image',
        width: 256,
        height: 256
      };

      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockResolvedValue(mockImage);

      // First load
      await enhancedDicomService.loadImage('wadouri:http://test.com/cached.dcm');
      
      // Second load should use cache
      const result = await enhancedDicomService.loadImage('wadouri:http://test.com/cached.dcm');
      
      expect(result).toBe(mockImage);
      // Should only call cornerstone.loadImage once
      expect(cornerstone.loadImage).toHaveBeenCalledTimes(1);
    });

    test('should handle loading errors with retry', async () => {
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ imageId: 'success', width: 512, height: 512 });

      const result = await enhancedDicomService.loadImage('wadouri:http://test.com/retry.dcm');
      
      expect(result.imageId).toBe('success');
      expect(cornerstone.loadImage).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockRejectedValue(new Error('Persistent error'));

      await expect(
        enhancedDicomService.loadImage('wadouri:http://test.com/fail.dcm')
      ).rejects.toThrow();
    });
  });

  describe('Fallback Strategies', () => {
    test('should try multiple loading strategies', async () => {
      const cornerstone = require('cornerstone-core');
      
      // First strategy fails
      cornerstone.loadImage
        .mockRejectedValueOnce(new Error('Cornerstone failed'));

      // Mock fetch for direct HTTP strategy
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      const result = await enhancedDicomService.loadImageWithFallbacks('http://test.com/fallback.dcm');
      
      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalled();
    });

    test('should use backend API as fallback', async () => {
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockRejectedValue(new Error('All cornerstone methods failed'));

      // Mock direct HTTP failure
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Direct HTTP failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            image_data: 'base64encodedimage'
          })
        });

      // Mock Image constructor for base64 conversion
      const mockImage = {
        width: 512,
        height: 512,
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      global.Image = jest.fn(() => mockImage) as any;

      const loadPromise = enhancedDicomService.loadImageWithFallbacks(
        'http://localhost:8000/uploads/patient/test.dcm'
      );

      // Simulate image load success
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await loadPromise;
      
      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/dicom/process/'),
        expect.any(Object)
      );
    });
  });

  describe('Study Loading', () => {
    test('should load complete study with progress tracking', async () => {
      const mockImages = [
        { imageId: 'image1', width: 512, height: 512 },
        { imageId: 'image2', width: 512, height: 512 }
      ];

      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage
        .mockResolvedValueOnce(mockImages[0])
        .mockResolvedValueOnce(mockImages[1]);

      const progressCallback = jest.fn();
      
      const result = await enhancedDicomService.loadStudy(mockStudy, progressCallback);
      
      expect(result.images).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(progressCallback).toHaveBeenCalled();
    });

    test('should handle partial study loading failures', async () => {
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage
        .mockResolvedValueOnce({ imageId: 'image1', width: 512, height: 512 })
        .mockRejectedValueOnce(new Error('Second image failed'));

      const result = await enhancedDicomService.loadStudy(mockStudy);
      
      expect(result.images).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Second image failed');
    });

    test('should fail when no images can be loaded', async () => {
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockRejectedValue(new Error('All images failed'));

      await expect(
        enhancedDicomService.loadStudy(mockStudy)
      ).rejects.toThrow('Failed to load any images');
    });
  });

  describe('Cache Management', () => {
    test('should provide cache statistics', () => {
      const stats = enhancedDicomService.getCacheStatistics();
      
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('itemCount');
      expect(stats).toHaveProperty('hitRate');
    });

    test('should clear cache when requested', () => {
      enhancedDicomService.clearCache(true);
      
      const stats = enhancedDicomService.getCacheStatistics();
      expect(stats.totalSize).toBe(0);
      expect(stats.itemCount).toBe(0);
    });
  });

  describe('Error Handling Integration', () => {
    test('should integrate with error handler for failures', async () => {
      const handleErrorSpy = jest.spyOn(errorHandler, 'handleError');
      
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockRejectedValue(new Error('Test error'));

      await expect(
        enhancedDicomService.loadImage('wadouri:http://test.com/error.dcm')
      ).rejects.toThrow();

      expect(handleErrorSpy).toHaveBeenCalled();
    });

    test('should notify error callbacks', async () => {
      const errorCallback = jest.fn();
      enhancedDicomService.onError(errorCallback);

      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockRejectedValue(new Error('Callback test error'));

      await expect(
        enhancedDicomService.loadImage('wadouri:http://test.com/callback.dcm')
      ).rejects.toThrow();

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after repeated failures', async () => {
      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockRejectedValue(new Error('Repeated failure'));

      const imageId = 'wadouri:http://test.com/circuit-breaker.dcm';

      // Trigger multiple failures
      for (let i = 0; i < 4; i++) {
        try {
          await enhancedDicomService.loadImage(imageId);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next attempt should be blocked by circuit breaker
      await expect(
        enhancedDicomService.loadImage(imageId)
      ).rejects.toThrow('Circuit breaker');
    });
  });

  describe('Preloading', () => {
    test('should preload adjacent images', async () => {
      const imageIds = [
        'wadouri:http://test.com/image1.dcm',
        'wadouri:http://test.com/image2.dcm',
        'wadouri:http://test.com/image3.dcm'
      ];

      const cornerstone = require('cornerstone-core');
      cornerstone.loadImage.mockResolvedValue({ imageId: 'test', width: 512, height: 512 });

      await enhancedDicomService.preloadImages(0, imageIds, 2);

      // Should have attempted to load the next 2 images
      expect(cornerstone.loadImage).toHaveBeenCalledTimes(2);
    });
  });
});