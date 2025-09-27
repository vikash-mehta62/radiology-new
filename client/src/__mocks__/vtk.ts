/**
 * Mock for VTK.js (@kitware/vtk.js)
 */

// Mock vtkRenderWindow
export const vtkRenderWindow = {
  newInstance: jest.fn(() => ({
    addRenderer: jest.fn(),
    removeRenderer: jest.fn(),
    getRenderers: jest.fn(() => []),
    render: jest.fn(),
    getInteractor: jest.fn(),
    setInteractor: jest.fn(),
    getViews: jest.fn(() => []),
    addView: jest.fn(),
    removeView: jest.fn(),
    captureImages: jest.fn(() => []),
    getStatistics: jest.fn(() => ({})),
    delete: jest.fn()
  }))
};

// Mock vtkRenderer
export const vtkRenderer = {
  newInstance: jest.fn(() => ({
    addActor: jest.fn(),
    removeActor: jest.fn(),
    getActors: jest.fn(() => []),
    addVolume: jest.fn(),
    removeVolume: jest.fn(),
    getVolumes: jest.fn(() => []),
    setBackground: jest.fn(),
    getBackground: jest.fn(() => [0, 0, 0]),
    resetCamera: jest.fn(),
    getActiveCamera: jest.fn(() => ({
      setPosition: jest.fn(),
      getPosition: jest.fn(() => [0, 0, 1]),
      setFocalPoint: jest.fn(),
      getFocalPoint: jest.fn(() => [0, 0, 0]),
      setViewUp: jest.fn(),
      getViewUp: jest.fn(() => [0, 1, 0]),
      zoom: jest.fn(),
      getParallelScale: jest.fn(() => 1),
      setParallelScale: jest.fn(),
      computeViewPlaneNormal: jest.fn(() => [0, 0, -1])
    })),
    computeVisiblePropBounds: jest.fn(() => [0, 1, 0, 1, 0, 1]),
    resetCameraClippingRange: jest.fn(),
    setClippingRangeExpansion: jest.fn(),
    getClippingRangeExpansion: jest.fn(() => 0.5),
    delete: jest.fn()
  }))
};

// Mock vtkRenderWindowInteractor
export const vtkRenderWindowInteractor = {
  newInstance: jest.fn(() => ({
    setView: jest.fn(),
    getView: jest.fn(),
    initialize: jest.fn(),
    bindEvents: jest.fn(),
    unbindEvents: jest.fn(),
    start: jest.fn(),
    setInteractorStyle: jest.fn(),
    getInteractorStyle: jest.fn(),
    requestAnimation: jest.fn(),
    cancelAnimation: jest.fn(),
    delete: jest.fn()
  }))
};

// Mock vtkInteractorStyleTrackballCamera
export const vtkInteractorStyleTrackballCamera = {
  newInstance: jest.fn(() => ({
    setInteractor: jest.fn(),
    getInteractor: jest.fn(),
    onMouseMove: jest.fn(),
    onLeftButtonDown: jest.fn(),
    onLeftButtonUp: jest.fn(),
    onMiddleButtonDown: jest.fn(),
    onMiddleButtonUp: jest.fn(),
    onRightButtonDown: jest.fn(),
    onRightButtonUp: jest.fn(),
    onMouseWheelForward: jest.fn(),
    onMouseWheelBackward: jest.fn(),
    delete: jest.fn()
  }))
};

// Mock vtkImageData
export const vtkImageData = {
  newInstance: jest.fn(() => ({
    setDimensions: jest.fn(),
    getDimensions: jest.fn(() => [256, 256, 1]),
    setSpacing: jest.fn(),
    getSpacing: jest.fn(() => [1, 1, 1]),
    setOrigin: jest.fn(),
    getOrigin: jest.fn(() => [0, 0, 0]),
    setDirection: jest.fn(),
    getDirection: jest.fn(() => [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    getPointData: jest.fn(() => ({
      setScalars: jest.fn(),
      getScalars: jest.fn(() => ({
        setData: jest.fn(),
        getData: jest.fn(() => new Uint16Array(256 * 256)),
        getNumberOfTuples: jest.fn(() => 256 * 256),
        getNumberOfComponents: jest.fn(() => 1),
        getDataType: jest.fn(() => 'Uint16Array')
      })),
      getNumberOfArrays: jest.fn(() => 1),
      getArray: jest.fn(),
      addArray: jest.fn(),
      removeArray: jest.fn()
    })),
    getBounds: jest.fn(() => [0, 255, 0, 255, 0, 0]),
    getCenter: jest.fn(() => [127.5, 127.5, 0]),
    getLength: jest.fn(() => Math.sqrt(255 * 255 + 255 * 255)),
    delete: jest.fn()
  }))
};

// Mock vtkImageMapper
export const vtkImageMapper = {
  newInstance: jest.fn(() => ({
    setInputData: jest.fn(),
    getInputData: jest.fn(),
    setSlice: jest.fn(),
    getSlice: jest.fn(() => 0),
    setSliceAtFocalPoint: jest.fn(),
    getSliceAtFocalPoint: jest.fn(() => true),
    setColorWindow: jest.fn(),
    getColorWindow: jest.fn(() => 255),
    setColorLevel: jest.fn(),
    getColorLevel: jest.fn(() => 127.5),
    delete: jest.fn()
  }))
};

// Mock vtkImageSlice
export const vtkImageSlice = {
  newInstance: jest.fn(() => ({
    setMapper: jest.fn(),
    getMapper: jest.fn(),
    setProperty: jest.fn(),
    getProperty: jest.fn(() => ({
      setColorWindow: jest.fn(),
      getColorWindow: jest.fn(() => 255),
      setColorLevel: jest.fn(),
      getColorLevel: jest.fn(() => 127.5),
      setInterpolationType: jest.fn(),
      getInterpolationType: jest.fn(() => 1)
    })),
    getActors: jest.fn(() => []),
    getBounds: jest.fn(() => [0, 255, 0, 255, 0, 0]),
    delete: jest.fn()
  }))
};

// Mock vtkVolumeMapper
export const vtkVolumeMapper = {
  newInstance: jest.fn(() => ({
    setInputData: jest.fn(),
    getInputData: jest.fn(),
    setSampleDistance: jest.fn(),
    getSampleDistance: jest.fn(() => 1.0),
    setBlendMode: jest.fn(),
    getBlendMode: jest.fn(() => 0),
    setAutoAdjustSampleDistances: jest.fn(),
    getAutoAdjustSampleDistances: jest.fn(() => true),
    delete: jest.fn()
  }))
};

// Mock vtkVolume
export const vtkVolume = {
  newInstance: jest.fn(() => ({
    setMapper: jest.fn(),
    getMapper: jest.fn(),
    setProperty: jest.fn(),
    getProperty: jest.fn(() => ({
      setScalarOpacity: jest.fn(),
      getScalarOpacity: jest.fn(),
      setRGBTransferFunction: jest.fn(),
      getRGBTransferFunction: jest.fn(),
      setInterpolationType: jest.fn(),
      getInterpolationType: jest.fn(() => 1),
      setShade: jest.fn(),
      getShade: jest.fn(() => false)
    })),
    getBounds: jest.fn(() => [0, 255, 0, 255, 0, 255]),
    delete: jest.fn()
  }))
};

// Mock vtkPiecewiseFunction
export const vtkPiecewiseFunction = {
  newInstance: jest.fn(() => ({
    addPoint: jest.fn(),
    removePoint: jest.fn(),
    removeAllPoints: jest.fn(),
    getSize: jest.fn(() => 0),
    getRange: jest.fn(() => [0, 1]),
    getValue: jest.fn(() => 0.5),
    getTable: jest.fn(() => []),
    buildFunctionFromTable: jest.fn(),
    delete: jest.fn()
  }))
};

// Mock vtkColorTransferFunction
export const vtkColorTransferFunction = {
  newInstance: jest.fn(() => ({
    addRGBPoint: jest.fn(),
    addHSVPoint: jest.fn(),
    removePoint: jest.fn(),
    removeAllPoints: jest.fn(),
    getSize: jest.fn(() => 0),
    getRange: jest.fn(() => [0, 1]),
    getColor: jest.fn(() => [1, 1, 1]),
    getTable: jest.fn(() => []),
    buildFunctionFromTable: jest.fn(),
    setColorSpace: jest.fn(),
    getColorSpace: jest.fn(() => 0),
    delete: jest.fn()
  }))
};

// Mock vtkDataArray
export const vtkDataArray = {
  newInstance: jest.fn(() => ({
    setData: jest.fn(),
    getData: jest.fn(() => new Float32Array()),
    setName: jest.fn(),
    getName: jest.fn(() => ''),
    setNumberOfComponents: jest.fn(),
    getNumberOfComponents: jest.fn(() => 1),
    setNumberOfTuples: jest.fn(),
    getNumberOfTuples: jest.fn(() => 0),
    getDataType: jest.fn(() => 'Float32Array'),
    getRange: jest.fn(() => [0, 1]),
    delete: jest.fn()
  }))
};

// Mock vtkOpenGLRenderWindow
export const vtkOpenGLRenderWindow = {
  newInstance: jest.fn(() => ({
    setContainer: jest.fn(),
    getContainer: jest.fn(),
    setSize: jest.fn(),
    getSize: jest.fn(() => [300, 300]),
    render: jest.fn(),
    captureImages: jest.fn(() => []),
    getCanvas: jest.fn(() => document.createElement('canvas')),
    getContext: jest.fn(() => ({})),
    delete: jest.fn()
  }))
};

// Mock macro utilities
export const macro = {
  newInstance: jest.fn((publicAPI, model, initialValues = {}) => {
    Object.assign(model, initialValues);
    return publicAPI;
  }),
  obj: jest.fn((publicAPI = {}, model = {}) => ({ publicAPI, model })),
  get: jest.fn((publicAPI, model, fieldNames) => {
    fieldNames.forEach(field => {
      publicAPI[`get${field}`] = () => model[field];
    });
  }),
  set: jest.fn((publicAPI, model, fieldNames) => {
    fieldNames.forEach(field => {
      publicAPI[`set${field}`] = (value) => {
        model[field] = value;
        return publicAPI;
      };
    });
  }),
  setGet: jest.fn((publicAPI, model, fieldNames) => {
    macro.get(publicAPI, model, fieldNames);
    macro.set(publicAPI, model, fieldNames);
  }),
  algo: jest.fn((publicAPI, model, numberOfInputs, numberOfOutputs) => {
    publicAPI.getNumberOfInputPorts = () => numberOfInputs;
    publicAPI.getNumberOfOutputPorts = () => numberOfOutputs;
    publicAPI.getInputData = jest.fn();
    publicAPI.setInputData = jest.fn();
    publicAPI.getOutputData = jest.fn();
  }),
  event: jest.fn((publicAPI, model, eventName) => {
    const callbacks = [];
    publicAPI[`on${eventName}`] = (callback) => {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      };
    };
    publicAPI[`invoke${eventName}`] = (...args) => {
      callbacks.forEach(callback => callback(...args));
    };
  })
};

// Main VTK object
const vtk = {
  vtkRenderWindow,
  vtkRenderer,
  vtkRenderWindowInteractor,
  vtkInteractorStyleTrackballCamera,
  vtkImageData,
  vtkImageMapper,
  vtkImageSlice,
  vtkVolumeMapper,
  vtkVolume,
  vtkPiecewiseFunction,
  vtkColorTransferFunction,
  vtkDataArray,
  vtkOpenGLRenderWindow,
  macro
};

export default vtk;