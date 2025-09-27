/**
 * Mock for @cornerstonejs/streaming-image-volume-loader
 */

export const cornerstoneStreamingImageVolumeLoader = {
  createAndCacheVolume: jest.fn().mockResolvedValue({
    volumeId: 'mock://streaming-volume',
    dimensions: [512, 512, 100],
    spacing: [1, 1, 1],
    origin: [0, 0, 0],
    direction: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    scalarData: new Uint16Array(512 * 512 * 100),
    metadata: {
      BitsAllocated: 16,
      BitsStored: 12,
      HighBit: 11,
      PhotometricInterpretation: 'MONOCHROME2',
      PixelRepresentation: 0,
      SamplesPerPixel: 1,
      Rows: 512,
      Columns: 512,
      PixelSpacing: [1, 1],
      SliceThickness: 1,
      SpacingBetweenSlices: 1
    },
    imageIds: Array.from({ length: 100 }, (_, i) => `mock://streaming-image-${i + 1}`),
    
    // Volume methods
    load: jest.fn().mockResolvedValue(true),
    cancel: jest.fn(),
    destroy: jest.fn(),
    
    // Event handling
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    
    // Progress tracking
    getLoadProgress: jest.fn(() => ({
      loaded: 100,
      total: 100,
      percentComplete: 100
    })),
    
    // Streaming specific
    getStreamingProperties: jest.fn(() => ({
      streamingEnabled: true,
      framesLoaded: 100,
      framesTotal: 100,
      bytesLoaded: 512 * 512 * 100 * 2,
      bytesTotal: 512 * 512 * 100 * 2
    })),
    
    setStreamingProperties: jest.fn(),
    
    // Cache management
    getCacheInfo: jest.fn(() => ({
      volumeId: 'mock://streaming-volume',
      sizeInBytes: 512 * 512 * 100 * 2,
      timeStamp: Date.now()
    }))
  }),
  
  // Loader registration
  registerVolumeLoader: jest.fn(),
  unregisterVolumeLoader: jest.fn(),
  
  // Configuration
  configure: jest.fn(),
  getConfiguration: jest.fn(() => ({
    maxConcurrentRequests: 6,
    enableCaching: true,
    cacheSize: 1024 * 1024 * 1024, // 1GB
    streamingEnabled: true,
    progressiveLoading: true
  })),
  
  // Statistics
  getStatistics: jest.fn(() => ({
    totalVolumesLoaded: 1,
    totalBytesLoaded: 512 * 512 * 100 * 2,
    averageLoadTime: 1000,
    cacheHitRate: 0.8,
    networkRequests: 100,
    failedRequests: 0
  })),
  
  // Utilities
  createStreamingImageVolume: jest.fn().mockResolvedValue({
    volumeId: 'mock://streaming-volume',
    load: jest.fn().mockResolvedValue(true),
    cancel: jest.fn(),
    destroy: jest.fn()
  }),
  
  // Event constants
  EVENTS: {
    VOLUME_LOADED: 'CORNERSTONE_STREAMING_VOLUME_LOADED',
    VOLUME_PROGRESS: 'CORNERSTONE_STREAMING_VOLUME_PROGRESS',
    VOLUME_ERROR: 'CORNERSTONE_STREAMING_VOLUME_ERROR',
    FRAME_LOADED: 'CORNERSTONE_STREAMING_FRAME_LOADED'
  }
};

// Mock streaming utilities
export const streamingUtils = {
  createProgressCallback: jest.fn((callback) => (progress) => {
    callback({
      loaded: progress.loaded || 0,
      total: progress.total || 100,
      percentComplete: ((progress.loaded || 0) / (progress.total || 100)) * 100
    });
  }),
  
  createErrorCallback: jest.fn((callback) => (error) => {
    callback({
      error: error.message || 'Unknown error',
      volumeId: error.volumeId || 'unknown',
      timestamp: Date.now()
    });
  }),
  
  estimateLoadTime: jest.fn(() => 1000),
  
  optimizeLoadOrder: jest.fn((imageIds) => imageIds),
  
  calculateBandwidth: jest.fn(() => ({
    bytesPerSecond: 1024 * 1024, // 1MB/s
    estimatedTime: 1000
  }))
};

// Mock cache management
export const streamingCache = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(() => false),
  delete: jest.fn(),
  clear: jest.fn(),
  
  getSize: jest.fn(() => 100 * 1024 * 1024), // 100MB
  getMaxSize: jest.fn(() => 1024 * 1024 * 1024), // 1GB
  setMaxSize: jest.fn(),
  
  getStatistics: jest.fn(() => ({
    hits: 80,
    misses: 20,
    hitRate: 0.8,
    size: 100 * 1024 * 1024,
    maxSize: 1024 * 1024 * 1024,
    itemCount: 10
  })),
  
  // LRU operations
  promote: jest.fn(),
  evict: jest.fn(),
  
  // Events
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock network manager
export const networkManager = {
  setMaxConcurrentRequests: jest.fn(),
  getMaxConcurrentRequests: jest.fn(() => 6),
  
  setRequestTimeout: jest.fn(),
  getRequestTimeout: jest.fn(() => 30000),
  
  setRetryAttempts: jest.fn(),
  getRetryAttempts: jest.fn(() => 3),
  
  getActiveRequests: jest.fn(() => []),
  getQueuedRequests: jest.fn(() => []),
  
  cancelAllRequests: jest.fn(),
  cancelRequest: jest.fn(),
  
  getStatistics: jest.fn(() => ({
    activeRequests: 0,
    queuedRequests: 0,
    completedRequests: 100,
    failedRequests: 0,
    averageResponseTime: 500
  }))
};

export default {
  cornerstoneStreamingImageVolumeLoader,
  streamingUtils,
  streamingCache,
  networkManager
};