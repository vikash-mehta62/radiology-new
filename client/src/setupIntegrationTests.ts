/**
 * Integration Test Setup
 * Additional setup for integration tests beyond unit test setup
 */

import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// Import base setup
import './setupTests';

// Additional mocks for integration tests
import { server } from './mocks/server';

// Mock IntersectionObserver for integration tests
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock MutationObserver for integration tests
global.MutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Enhanced WebSocket mock for integration tests
class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public url: string;
  public protocol = '';
  public extensions = '';
  public binaryType: BinaryType = 'blob';
  public bufferedAmount = 0;

  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      const event = new Event('open');
      if (this.onopen) this.onopen(event);
      this.dispatchEvent(event);
    }, 100);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Mock sending - in real tests, you might want to simulate responses
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      const event = new CloseEvent('close', { code: code || 1000, reason: reason || '' });
      if (this.onclose) this.onclose(event);
      this.dispatchEvent(event);
    }, 50);
  }

  // Helper methods for testing
  simulateMessage(data: any): void {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', { data });
      if (this.onmessage) this.onmessage(event);
      this.dispatchEvent(event);
    }
  }

  simulateError(): void {
    const event = new Event('error');
    if (this.onerror) this.onerror(event);
    this.dispatchEvent(event);
  }
}

global.WebSocket = MockWebSocket as any;

// Mock RTCPeerConnection for collaboration tests
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockResolvedValue({}),
  createAnswer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue(undefined),
  setRemoteDescription: jest.fn().mockResolvedValue(undefined),
  addIceCandidate: jest.fn().mockResolvedValue(undefined),
  createDataChannel: jest.fn().mockReturnValue({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  iceConnectionState: 'new',
  connectionState: 'new',
  signalingState: 'stable'
}));

// Mock getUserMedia for collaboration tests
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
        getSettings: () => ({ width: 640, height: 480 })
      }]
    }),
    getDisplayMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
        getSettings: () => ({ width: 1920, height: 1080 })
      }]
    })
  }
});

// Enhanced File API mocks for integration tests
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsArrayBuffer: jest.fn(function(this: any) {
    setTimeout(() => {
      this.result = new ArrayBuffer(1024);
      if (this.onload) this.onload({ target: this });
    }, 10);
  }),
  readAsDataURL: jest.fn(function(this: any) {
    setTimeout(() => {
      this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      if (this.onload) this.onload({ target: this });
    }, 10);
  }),
  readAsText: jest.fn(function(this: any) {
    setTimeout(() => {
      this.result = 'mock file content';
      if (this.onload) this.onload({ target: this });
    }, 10);
  }),
  onload: null,
  onerror: null,
  onprogress: null,
  result: null,
  error: null,
  readyState: 0
}));

// Mock Notification API
global.Notification = jest.fn().mockImplementation((title, options) => ({
  title,
  body: options?.body || '',
  icon: options?.icon || '',
  close: jest.fn(),
  onclick: null,
  onclose: null,
  onerror: null,
  onshow: null
}));

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  writable: true
});

Notification.requestPermission = jest.fn().mockResolvedValue('granted');

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue('mock clipboard content'),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([])
  }
});

// Mock Gamepad API for accessibility testing
Object.defineProperty(navigator, 'getGamepads', {
  value: jest.fn().mockReturnValue([])
});

// Mock Battery API
Object.defineProperty(navigator, 'getBattery', {
  value: jest.fn().mockResolvedValue({
    charging: true,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    level: 1.0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })
});

// Mock Network Information API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock Permissions API
Object.defineProperty(navigator, 'permissions', {
  value: {
    query: jest.fn().mockResolvedValue({
      state: 'granted',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })
  }
});

// Mock Vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn().mockReturnValue(true)
});

// Enhanced performance monitoring for integration tests
const originalPerformanceNow = performance.now;
let performanceOffset = 0;

performance.now = jest.fn(() => originalPerformanceNow() + performanceOffset);

// Helper to simulate time passage in tests
global.advanceTime = (ms: number) => {
  performanceOffset += ms;
};

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(() => callback({ 
    didTimeout: false, 
    timeRemaining: () => 50 
  }), 1);
  return 1;
});

global.cancelIdleCallback = jest.fn();

// Mock OffscreenCanvas for advanced rendering tests
global.OffscreenCanvas = jest.fn().mockImplementation((width, height) => ({
  width,
  height,
  getContext: jest.fn().mockReturnValue({
    canvas: { width, height },
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    })),
    putImageData: jest.fn()
  }),
  transferToImageBitmap: jest.fn().mockReturnValue({
    width,
    height,
    close: jest.fn()
  })
}));

// Mock ImageBitmap
global.createImageBitmap = jest.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: jest.fn()
});

// Setup MSW (Mock Service Worker) for API mocking
beforeAll(() => {
  // Start the mock server
  if (typeof server !== 'undefined') {
    server.listen({
      onUnhandledRequest: 'warn'
    });
  }
});

afterEach(() => {
  // Reset handlers after each test
  if (typeof server !== 'undefined') {
    server.resetHandlers();
  }
  
  // Reset performance offset
  performanceOffset = 0;
  
  // Clear any pending timers
  jest.clearAllTimers();
});

afterAll(() => {
  // Clean up after all tests
  if (typeof server !== 'undefined') {
    server.close();
  }
});

// Global test utilities for integration tests
global.integrationTestUtils = {
  // Wait for async operations to complete
  waitForAsyncOperations: async (timeout = 5000) => {
    return new Promise((resolve) => {
      const checkPending = () => {
        if (document.querySelectorAll('[data-testid*="loading"]').length === 0) {
          resolve(undefined);
        } else {
          setTimeout(checkPending, 100);
        }
      };
      checkPending();
      setTimeout(() => resolve(undefined), timeout);
    });
  },

  // Simulate network conditions
  simulateNetworkCondition: (condition: 'fast' | 'slow' | 'offline') => {
    const networkInfo = (navigator as any).connection;
    switch (condition) {
      case 'fast':
        networkInfo.effectiveType = '4g';
        networkInfo.downlink = 10;
        networkInfo.rtt = 50;
        break;
      case 'slow':
        networkInfo.effectiveType = '2g';
        networkInfo.downlink = 0.5;
        networkInfo.rtt = 500;
        break;
      case 'offline':
        networkInfo.effectiveType = 'none';
        networkInfo.downlink = 0;
        networkInfo.rtt = 0;
        break;
    }
  },

  // Simulate device capabilities
  simulateDevice: (device: 'desktop' | 'tablet' | 'mobile') => {
    const capabilities = {
      desktop: { cores: 8, memory: 8 * 1024 * 1024 * 1024, gpu: 'high' },
      tablet: { cores: 4, memory: 4 * 1024 * 1024 * 1024, gpu: 'medium' },
      mobile: { cores: 4, memory: 2 * 1024 * 1024 * 1024, gpu: 'low' }
    };
    
    const deviceCapabilities = capabilities[device];
    
    // Mock performance.memory if available
    if ('memory' in performance) {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: deviceCapabilities.memory * 0.1,
          totalJSHeapSize: deviceCapabilities.memory * 0.5,
          jsHeapSizeLimit: deviceCapabilities.memory
        }
      });
    }
  },

  // Create test DICOM data
  createTestDicomData: (options: any = {}) => {
    const { width = 512, height = 512, slices = 1 } = options;
    return {
      width,
      height,
      slices,
      pixelData: new Uint16Array(width * height * slices).fill(1000),
      metadata: {
        PatientName: 'Test^Patient',
        StudyDate: '20231201',
        Modality: 'CT'
      }
    };
  }
};

// Increase timeout for integration tests
jest.setTimeout(60000);

console.log('🔧 Integration test setup complete');

export {};