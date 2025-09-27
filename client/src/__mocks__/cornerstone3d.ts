/**
 * Mock for @cornerstonejs/core
 */

export const RenderingEngine = jest.fn().mockImplementation(() => ({
  id: 'mock-rendering-engine',
  hasBeenDestroyed: false,
  offScreenCanvasContainer: null,
  
  setViewports: jest.fn(),
  getViewport: jest.fn(() => ({
    id: 'mock-viewport',
    element: document.createElement('div'),
    canvas: document.createElement('canvas'),
    renderingEngine: null,
    type: 'stack',
    
    setStack: jest.fn(),
    setVolumes: jest.fn(),
    render: jest.fn(),
    reset: jest.fn(),
    getCamera: jest.fn(() => ({
      position: [0, 0, 0],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0]
    })),
    setCamera: jest.fn(),
    resetCamera: jest.fn(),
    getZoom: jest.fn(() => 1),
    setZoom: jest.fn(),
    getPan: jest.fn(() => ({ x: 0, y: 0 })),
    setPan: jest.fn(),
    getRotation: jest.fn(() => 0),
    setRotation: jest.fn(),
    
    getImageData: jest.fn(),
    getCurrentImageId: jest.fn(() => 'mock://image1'),
    hasImageURI: jest.fn(() => true),
    
    addActor: jest.fn(),
    removeActor: jest.fn(),
    getActors: jest.fn(() => []),
    
    getRenderer: jest.fn(),
    getRenderingEngine: jest.fn(),
    
    customRenderViewportToCanvas: jest.fn()
  })),
  getViewports: jest.fn(() => []),
  
  render: jest.fn(),
  renderViewports: jest.fn(),
  renderFrameOfReference: jest.fn(),
  
  resize: jest.fn(),
  destroy: jest.fn(),
  
  offScreenMultiRenderWindow: null
}));

export const StackViewport = jest.fn().mockImplementation(() => ({
  id: 'mock-stack-viewport',
  element: document.createElement('div'),
  canvas: document.createElement('canvas'),
  
  setStack: jest.fn(),
  addImages: jest.fn(),
  setImageIdIndex: jest.fn(),
  getCurrentImageIdIndex: jest.fn(() => 0),
  getImageIds: jest.fn(() => ['mock://image1', 'mock://image2']),
  
  render: jest.fn(),
  reset: jest.fn(),
  
  getCamera: jest.fn(() => ({
    position: [0, 0, 0],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0]
  })),
  setCamera: jest.fn(),
  resetCamera: jest.fn(),
  
  getZoom: jest.fn(() => 1),
  setZoom: jest.fn(),
  getPan: jest.fn(() => ({ x: 0, y: 0 })),
  setPan: jest.fn(),
  getRotation: jest.fn(() => 0),
  setRotation: jest.fn(),
  
  getImageData: jest.fn(),
  getCurrentImageId: jest.fn(() => 'mock://image1'),
  
  scroll: jest.fn(),
  scrollToImageIndex: jest.fn(),
  
  getProperties: jest.fn(() => ({})),
  setProperties: jest.fn()
}));

export const VolumeViewport = jest.fn().mockImplementation(() => ({
  id: 'mock-volume-viewport',
  element: document.createElement('div'),
  canvas: document.createElement('canvas'),
  
  setVolumes: jest.fn(),
  addVolumes: jest.fn(),
  removeVolumeActors: jest.fn(),
  getVolumeActors: jest.fn(() => []),
  
  render: jest.fn(),
  reset: jest.fn(),
  
  getCamera: jest.fn(() => ({
    position: [0, 0, 0],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0]
  })),
  setCamera: jest.fn(),
  resetCamera: jest.fn(),
  
  getSlice: jest.fn(() => ({
    min: 0,
    max: 100,
    current: 50
  })),
  setSlice: jest.fn(),
  
  getCurrentImageId: jest.fn(() => 'mock://volume-slice'),
  
  getProperties: jest.fn(() => ({})),
  setProperties: jest.fn()
}));

export const cache = {
  getVolume: jest.fn(),
  createAndCacheVolume: jest.fn(),
  removeVolumeLoadObject: jest.fn(),
  getCachedImageIds: jest.fn(() => []),
  getImageLoadObject: jest.fn(),
  putImageLoadObject: jest.fn(),
  removeImageLoadObject: jest.fn(),
  purgeCache: jest.fn(),
  getMaxCacheSize: jest.fn(() => 1024 * 1024 * 1024), // 1GB
  setMaxCacheSize: jest.fn(),
  getCacheSize: jest.fn(() => 100 * 1024 * 1024), // 100MB
  isCacheable: jest.fn(() => true)
};

export const imageLoader = {
  loadImage: jest.fn().mockResolvedValue({
    imageId: 'mock://image1',
    minPixelValue: 0,
    maxPixelValue: 4095,
    slope: 1,
    intercept: 0,
    windowCenter: 2048,
    windowWidth: 4096,
    getPixelData: jest.fn(() => new Uint16Array(512 * 512)),
    rows: 512,
    columns: 512,
    height: 512,
    width: 512,
    color: false,
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,
    invert: false,
    sizeInBytes: 512 * 512 * 2
  }),
  registerImageLoader: jest.fn(),
  unregisterImageLoader: jest.fn(),
  loadAndCacheImage: jest.fn()
};

export const volumeLoader = {
  createAndCacheVolume: jest.fn().mockResolvedValue({
    volumeId: 'mock://volume1',
    dimensions: [512, 512, 100],
    spacing: [1, 1, 1],
    origin: [0, 0, 0],
    direction: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    scalarData: new Uint16Array(512 * 512 * 100),
    metadata: {},
    imageIds: Array.from({ length: 100 }, (_, i) => `mock://image${i + 1}`)
  }),
  registerVolumeLoader: jest.fn(),
  unregisterVolumeLoader: jest.fn()
};

export const metaData = {
  addProvider: jest.fn(),
  removeProvider: jest.fn(),
  get: jest.fn((type, imageId) => {
    if (type === 'imagePlaneModule') {
      return {
        frameOfReferenceUID: 'mock-frame-of-reference',
        rows: 512,
        columns: 512,
        imageOrientationPatient: [1, 0, 0, 0, 1, 0],
        imagePositionPatient: [0, 0, 0],
        pixelSpacing: [1, 1],
        columnCosines: [1, 0, 0],
        rowCosines: [0, 1, 0],
        columnPixelSpacing: 1,
        rowPixelSpacing: 1
      };
    }
    if (type === 'imagePixelModule') {
      return {
        bitsAllocated: 16,
        bitsStored: 12,
        highBit: 11,
        photometricInterpretation: 'MONOCHROME2',
        pixelRepresentation: 0,
        samplesPerPixel: 1
      };
    }
    return {};
  })
};

export const utilities = {
  loadImageToCanvas: jest.fn(),
  renderToCanvas: jest.fn(),
  calibratedPixelSpacingMetadataProvider: {
    add: jest.fn(),
    get: jest.fn()
  }
};

export const init = jest.fn().mockResolvedValue(true);
export const destroy = jest.fn();

export const CONSTANTS = {
  VIEWPORT_TYPE: {
    STACK: 'stack',
    ORTHOGRAPHIC: 'orthographic',
    PERSPECTIVE: 'perspective',
    VOLUME_3D: 'volume3d'
  },
  EVENTS: {
    IMAGE_RENDERED: 'CORNERSTONE_IMAGE_RENDERED',
    IMAGE_VOLUME_MODIFIED: 'CORNERSTONE_IMAGE_VOLUME_MODIFIED',
    VOLUME_NEW_IMAGE: 'CORNERSTONE_VOLUME_NEW_IMAGE',
    STACK_NEW_IMAGE: 'CORNERSTONE_STACK_NEW_IMAGE',
    CAMERA_MODIFIED: 'CORNERSTONE_CAMERA_MODIFIED',
    VOI_MODIFIED: 'CORNERSTONE_VOI_MODIFIED',
    ELEMENT_ENABLED: 'CORNERSTONE_ELEMENT_ENABLED',
    ELEMENT_DISABLED: 'CORNERSTONE_ELEMENT_DISABLED'
  }
};

export const eventTarget = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
};

export const getRenderingEngine = jest.fn();
export const getRenderingEngines = jest.fn(() => []);

export default {
  RenderingEngine,
  StackViewport,
  VolumeViewport,
  cache,
  imageLoader,
  volumeLoader,
  metaData,
  utilities,
  init,
  destroy,
  CONSTANTS,
  eventTarget,
  getRenderingEngine,
  getRenderingEngines
};