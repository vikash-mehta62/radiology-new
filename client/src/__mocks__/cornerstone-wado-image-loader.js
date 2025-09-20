/**
 * Mock for cornerstone-wado-image-loader library
 */

const mockWadoImageLoader = {
  // External dependencies
  external: {
    cornerstone: null,
    dicomParser: null
  },
  
  // Configuration
  configure: jest.fn(),
  
  // WADO URI loader
  wadouri: {
    loadImage: jest.fn().mockImplementation((imageId) => {
      return Promise.resolve({
        imageId,
        width: 512,
        height: 512,
        getPixelData: () => new Uint16Array(512 * 512),
        minPixelValue: 0,
        maxPixelValue: 4095,
        slope: 1,
        intercept: 0,
        windowCenter: 2048,
        windowWidth: 4096,
        color: false,
        columnPixelSpacing: 1,
        rowPixelSpacing: 1,
        sizeInBytes: 512 * 512 * 2
      });
    }),
    
    // Metadata providers
    metaDataProvider: jest.fn(),
    
    // File manager
    fileManager: {
      add: jest.fn(),
      get: jest.fn(),
      remove: jest.fn()
    }
  },
  
  // WADO RS loader
  wadoRS: {
    loadImage: jest.fn().mockImplementation((imageId) => {
      return Promise.resolve({
        imageId,
        width: 512,
        height: 512,
        getPixelData: () => new Uint16Array(512 * 512),
        minPixelValue: 0,
        maxPixelValue: 4095,
        slope: 1,
        intercept: 0,
        windowCenter: 2048,
        windowWidth: 4096
      });
    })
  },
  
  // Web workers
  webWorkerManager: {
    initialize: jest.fn(),
    terminate: jest.fn(),
    loadImage: jest.fn()
  },
  
  // Utilities
  createImage: jest.fn(),
  
  // Constants
  EVENTS: {
    IMAGE_LOAD_PROGRESS: 'cornerstoneimageloadprogress',
    IMAGE_LOADED: 'cornerstoneimageloaded'
  }
};

module.exports = mockWadoImageLoader;