/**
 * Test Setup Configuration
 * Global test setup and mocks for DICOM viewer testing
 */

import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Suppress known warnings/errors that are expected in tests
  const message = args[0];
  if (
    typeof message === 'string' &&
    (
      message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Warning: componentWillReceiveProps') ||
      message.includes('WebGL context') ||
      message.includes('Canvas context')
    )
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (
      message.includes('componentWillReceiveProps') ||
      message.includes('deprecated')
    )
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
  if (contextType === '2d') {
    return {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      
      // Drawing methods
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      clearRect: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      drawImage: jest.fn(),
      
      // Path methods
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      
      // Transform methods
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      transform: jest.fn(),
      setTransform: jest.fn(),
      resetTransform: jest.fn(),
      
      // Image data methods
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(512 * 512 * 4),
        width: 512,
        height: 512
      })),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(512 * 512 * 4),
        width: 512,
        height: 512
      })),
      putImageData: jest.fn(),
      
      // Measurement methods
      measureText: jest.fn(() => ({ width: 100 }))
    };
  }
  
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: { width: 512, height: 512 },
      drawingBufferWidth: 512,
      drawingBufferHeight: 512,
      
      // WebGL methods (minimal mock)
      getParameter: jest.fn(),
      createShader: jest.fn(),
      createProgram: jest.fn(),
      createBuffer: jest.fn(),
      createTexture: jest.fn(),
      bindBuffer: jest.fn(),
      bindTexture: jest.fn(),
      bufferData: jest.fn(),
      texImage2D: jest.fn(),
      useProgram: jest.fn(),
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      viewport: jest.fn()
    };
  }
  
  return null;
});

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-data');
HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  const blob = new Blob(['mock-blob'], { type: 'image/png' });
  if (callback) callback(blob);
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
) as jest.Mock;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn().mockImplementation(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          put: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null })
        }),
        oncomplete: null,
        onerror: null
      }),
      createObjectStore: jest.fn(),
      close: jest.fn()
    }
  })),
  deleteDatabase: jest.fn()
};
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB
});

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: WebSocket.CONNECTING,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null
}));

// Mock performance.memory if not available
if (!('memory' in performance)) {
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 50000000,
      jsHeapSizeLimit: 100000000
    }
  });
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock Image constructor
global.Image = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onload: null,
  onerror: null,
  src: '',
  width: 0,
  height: 0,
  naturalWidth: 512,
  naturalHeight: 512,
  complete: false
}));

// Mock File and FileReader
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  name,
  size: bits.length,
  type: options?.type || '',
  lastModified: Date.now(),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  text: () => Promise.resolve(''),
  stream: () => new ReadableStream()
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsArrayBuffer: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  onload: null,
  onerror: null,
  onprogress: null,
  result: null,
  error: null,
  readyState: 0
}));

// Mock Blob
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  size: parts ? parts.reduce((size: number, part: any) => size + (part.length || 0), 0) : 0,
  type: options?.type || '',
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  text: () => Promise.resolve(''),
  stream: () => new ReadableStream(),
  slice: jest.fn()
}));

// Mock crypto for generating IDs
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9))
  }
});

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

// Increase timeout for async operations in tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Wait for next tick
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Wait for condition
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },
  
  // Simulate user interaction
  simulateUserInteraction: () => {
    // Simulate user activation for APIs that require it
    Object.defineProperty(navigator, 'userActivation', {
      value: { isActive: true, hasBeenActive: true }
    });
  }
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset sessionStorage
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  
  // Reset fetch
  (global.fetch as jest.Mock).mockClear();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};