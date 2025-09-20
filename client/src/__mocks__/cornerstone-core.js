/**
 * Mock for cornerstone-core library
 */

const mockCornerstone = {
  // Core functions
  enable: jest.fn(),
  disable: jest.fn(),
  displayImage: jest.fn().mockResolvedValue({}),
  loadImage: jest.fn().mockResolvedValue({
    imageId: 'mock-image-id',
    width: 512,
    height: 512,
    getPixelData: () => new Uint16Array(512 * 512),
    minPixelValue: 0,
    maxPixelValue: 4095,
    slope: 1,
    intercept: 0,
    windowCenter: 2048,
    windowWidth: 4096
  }),
  
  // Image loaders
  registerImageLoader: jest.fn(),
  loadAndCacheImage: jest.fn().mockResolvedValue({}),
  
  // Viewport functions
  setViewport: jest.fn(),
  getViewport: jest.fn().mockReturnValue({
    scale: 1,
    translation: { x: 0, y: 0 },
    rotation: 0,
    hflip: false,
    vflip: false,
    invert: false,
    pixelReplication: false,
    voi: {
      windowWidth: 256,
      windowCenter: 128
    }
  }),
  
  // Tools
  updateImage: jest.fn(),
  draw: jest.fn(),
  resize: jest.fn(),
  
  // Events
  events: {
    IMAGE_LOADED: 'cornerstoneimageloaded',
    IMAGE_RENDERED: 'cornerstoneimagerendered',
    ELEMENT_ENABLED: 'cornerstoneelementenabled',
    ELEMENT_DISABLED: 'cornerstoneelementdisabled'
  },
  
  // Utilities
  getEnabledElement: jest.fn().mockReturnValue({
    element: document.createElement('div'),
    image: null,
    viewport: {},
    canvas: document.createElement('canvas'),
    renderingTools: {}
  }),
  
  // Image cache
  imageCache: {
    getImageLoadObject: jest.fn(),
    putImageLoadObject: jest.fn(),
    removeImageLoadObject: jest.fn(),
    getCacheInfo: jest.fn().mockReturnValue({
      maximumSizeInBytes: 1024 * 1024 * 100, // 100MB
      cacheSizeInBytes: 0,
      numberOfImagesCached: 0
    })
  },
  
  // WebGL
  webGL: {
    renderer: {
      render: jest.fn()
    }
  }
};

module.exports = mockCornerstone;