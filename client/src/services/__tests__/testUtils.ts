/**
 * Test Utilities
 * Common utilities and helpers for testing DICOM viewer components and services
 */

import { ViewerState, GlobalState } from '../unifiedStateManager';
import { Study } from '../../types';

// Mock DICOM data generator
export class MockDicomDataGenerator {
  /**
   * Generate mock DICOM study
   */
  static generateMockStudy(options: {
    studyId?: string;
    patientId?: string;
    sliceCount?: number;
    modality?: string;
    hasMultiFrame?: boolean;
  } = {}): Study {
    const {
      studyId = `study-${Date.now()}`,
      patientId = `patient-${Math.random().toString(36).substr(2, 9)}`,
      sliceCount = 10,
      modality = 'CT',
      hasMultiFrame = false
    } = options;

    return {
      study_uid: studyId,
      patient_id: patientId,
      study_date: new Date().toISOString().split('T')[0],
      modality,
      study_description: `Mock ${modality} Study`,
      image_urls: Array.from({ length: sliceCount }, (_, i) => 
        `mock://dicom/${patientId}/slice-${i + 1}.dcm`
      ),
      total_slices: sliceCount,
      is_multi_slice: sliceCount > 1,
      processing_status: 'completed',
      ai_processing_status: 'completed',
      dicom_metadata: {
        PatientName: `Mock Patient ${patientId}`,
        PatientID: patientId,
        StudyInstanceUID: studyId,
        SeriesInstanceUID: `series-${studyId}`,
        Modality: modality,
        NumberOfFrames: hasMultiFrame ? sliceCount : undefined,
        Rows: 512,
        Columns: 512,
        PixelSpacing: [0.5, 0.5],
        SliceThickness: 1.0,
        WindowCenter: 40,
        WindowWidth: 400
      },
      image_metadata: {
        dimensions: { width: 512, height: 512, depth: sliceCount },
        spacing: { x: 0.5, y: 0.5, z: 1.0 },
        orientation: 'axial',
        pixel_data_type: 'int16',
        bits_allocated: 16,
        window_center: 40,
        window_width: 400
      },
      cache_status: {
        cached_slices: sliceCount,
        total_size_mb: sliceCount * 0.5,
        last_accessed: new Date().toISOString()
      },
      load_performance: {
        load_time_ms: 1000 + Math.random() * 2000,
        render_time_ms: 50 + Math.random() * 100,
        memory_usage_mb: sliceCount * 0.5
      },
      dicom_url: `mock://dicom/${patientId}/study.dcm`,
      original_filename: `${patientId}_${modality}_study.dcm`
    } as Study;
  }

  /**
   * Generate mock pixel data
   */
  static generateMockPixelData(width = 512, height = 512): Uint16Array {
    const data = new Uint16Array(width * height);
    
    // Generate realistic medical image pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        // Create circular pattern with noise (simulating organ)
        const centerX = width / 2;
        const centerY = height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const maxDistance = Math.min(width, height) / 2;
        
        let intensity = 0;
        if (distance < maxDistance * 0.3) {
          // Inner organ (high intensity)
          intensity = 3000 + Math.random() * 1000;
        } else if (distance < maxDistance * 0.7) {
          // Tissue (medium intensity)
          intensity = 1000 + Math.random() * 500;
        } else if (distance < maxDistance) {
          // Outer tissue (low intensity)
          intensity = 200 + Math.random() * 300;
        } else {
          // Background (very low intensity)
          intensity = Math.random() * 100;
        }
        
        data[index] = Math.floor(intensity);
      }
    }
    
    return data;
  }

  /**
   * Generate mock image data URL
   */
  static generateMockImageDataUrl(width = 512, height = 512): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    const imageData = ctx.createImageData(width, height);
    const pixelData = this.generateMockPixelData(width, height);
    
    // Convert to RGBA
    for (let i = 0; i < pixelData.length; i++) {
      const intensity = Math.floor((pixelData[i] / 4095) * 255); // Normalize to 8-bit
      const offset = i * 4;
      imageData.data[offset] = intensity;     // R
      imageData.data[offset + 1] = intensity; // G
      imageData.data[offset + 2] = intensity; // B
      imageData.data[offset + 3] = 255;       // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }

  /**
   * Generate mock AI analysis results
   */
  static generateMockAIAnalysis() {
    return {
      abnormalities: [
        {
          region: { x: 200, y: 150, width: 50, height: 40 },
          confidence: 0.85,
          type: 'nodule',
          description: 'Suspicious nodule detected',
          severity: 'medium' as const
        },
        {
          region: { x: 300, y: 250, width: 30, height: 25 },
          confidence: 0.72,
          type: 'calcification',
          description: 'Calcification present',
          severity: 'low' as const
        }
      ],
      image_quality_score: 0.92,
      enhancement_suggestions: [
        'Apply noise reduction',
        'Enhance contrast in region 200,150'
      ],
      processing_time: 1500,
      model_version: 'mock-ai-v1.0.0'
    };
  }
}

// Mock state generators
export class MockStateGenerator {
  /**
   * Generate mock viewer state
   */
  static generateMockViewerState(overrides: Partial<ViewerState> = {}): ViewerState {
    return {
      currentImageId: 'mock-image-1',
      currentSliceIndex: 0,
      totalSlices: 10,
      viewport: {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        rotation: 0,
        windowLevel: { center: 128, width: 256 },
        brightness: 100,
        contrast: 100
      },
      tools: {
        activeTool: null,
        toolSettings: {}
      },
      measurements: [],
      annotations: [],
      ui: {
        sidebarVisible: true,
        toolbarVisible: true,
        overlaysVisible: true,
        fullscreen: false,
        activeTab: 'main',
        panelStates: {}
      },
      session: {
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalInteractions: 0,
        errorCount: 0,
        sessionId: 'mock-session-123'
      },
      ...overrides
    };
  }

  /**
   * Generate mock global state
   */
  static generateMockGlobalState(overrides: Partial<GlobalState> = {}): GlobalState {
    return {
      currentMode: 'simple',
      viewerStates: {
        simple: this.generateMockViewerState(),
        'multi-frame': this.generateMockViewerState({ totalSlices: 50 }),
        comprehensive: this.generateMockViewerState({ totalSlices: 100 })
      },
      currentStudy: MockDicomDataGenerator.generateMockStudy(),
      loadedStudies: {},
      userPreferences: {
        defaultMode: 'simple',
        autoSave: true,
        syncSettings: true,
        theme: 'dark',
        language: 'en',
        shortcuts: {
          'zoom-in': 'Ctrl+=',
          'zoom-out': 'Ctrl+-',
          'reset': 'Ctrl+0',
          'next-slice': 'ArrowRight',
          'prev-slice': 'ArrowLeft',
          'play-pause': 'Space'
        }
      },
      application: {
        version: '1.0.0',
        lastUpdate: new Date().toISOString(),
        features: {},
        configuration: {}
      },
      collaboration: {
        activeSessions: {},
        connectionStatus: 'disconnected',
        lastSync: new Date().toISOString()
      },
      performance: {
        metrics: {},
        history: [],
        alerts: []
      },
      ...overrides
    };
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  /**
   * Measure function execution time
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    iterations = 1
  ): Promise<{ result: T; averageTime: number; times: number[] }> {
    const times: number[] = [];
    let result: T;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      result = await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    return {
      result: result!,
      averageTime,
      times
    };
  }

  /**
   * Create performance benchmark
   */
  static createBenchmark(name: string, targetTime: number) {
    return {
      name,
      targetTime,
      async run<T>(fn: () => Promise<T> | T): Promise<{
        passed: boolean;
        actualTime: number;
        targetTime: number;
        result: T;
      }> {
        const { result, averageTime } = await PerformanceTestUtils.measureExecutionTime(fn, 5);
        
        return {
          passed: averageTime <= targetTime,
          actualTime: averageTime,
          targetTime,
          result
        };
      }
    };
  }

  /**
   * Monitor memory usage
   */
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    
    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Create memory leak detector
   */
  static createMemoryLeakDetector(threshold = 10) {
    let initialMemory = this.getMemoryUsage();
    
    return {
      reset() {
        initialMemory = PerformanceTestUtils.getMemoryUsage();
      },
      
      check(): {
        hasLeak: boolean;
        memoryIncrease: number;
        current: ReturnType<typeof PerformanceTestUtils.getMemoryUsage>;
        initial: ReturnType<typeof PerformanceTestUtils.getMemoryUsage>;
      } {
        const current = PerformanceTestUtils.getMemoryUsage();
        const memoryIncrease = ((current.used - initialMemory.used) / initialMemory.used) * 100;
        
        return {
          hasLeak: memoryIncrease > threshold,
          memoryIncrease,
          current,
          initial: initialMemory
        };
      }
    };
  }
}

// Canvas testing utilities
export class CanvasTestUtils {
  /**
   * Create mock canvas context
   */
  static createMockCanvasContext(): Partial<CanvasRenderingContext2D> {
    const mockImageData = {
      data: new Uint8ClampedArray(512 * 512 * 4),
      width: 512,
      height: 512
    };

    return {
      canvas: {
        width: 512,
        height: 512,
        getContext: jest.fn()
      } as any,
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
      createImageData: jest.fn(() => mockImageData),
      getImageData: jest.fn(() => mockImageData),
      putImageData: jest.fn(),
      
      // Measurement methods
      measureText: jest.fn(() => ({ width: 100 }))
    };
  }

  /**
   * Create mock canvas element
   */
  static createMockCanvas(): HTMLCanvasElement {
    const mockContext = this.createMockCanvasContext();
    
    return {
      width: 512,
      height: 512,
      getContext: jest.fn(() => mockContext),
      toDataURL: jest.fn(() => 'data:image/png;base64,mock-data'),
      toBlob: jest.fn((callback) => {
        const blob = new Blob(['mock-blob'], { type: 'image/png' });
        callback?.(blob);
      })
    } as any;
  }

  /**
   * Verify canvas drawing operations
   */
  static verifyCanvasOperations(
    context: Partial<CanvasRenderingContext2D>,
    expectedOperations: string[]
  ): boolean {
    return expectedOperations.every(operation => {
      const method = (context as any)[operation];
      return method && jest.isMockFunction(method) && method.mock.calls.length > 0;
    });
  }
}

// WebSocket testing utilities
export class WebSocketTestUtils {
  /**
   * Create mock WebSocket
   */
  static createMockWebSocket(): WebSocket {
    const mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      url: 'ws://localhost:8080/test',
      protocol: '',
      extensions: '',
      binaryType: 'blob' as BinaryType,
      bufferedAmount: 0,
      
      // Event handlers
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      
      // Methods
      send: jest.fn(),
      close: jest.fn(),
      
      // Event methods
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      
      // Constants
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED
    } as any;

    // Helper methods for testing
    (mockWebSocket as any).simulateOpen = () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event('open'));
      }
    };

    (mockWebSocket as any).simulateMessage = (data: any) => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data }));
      }
    };

    (mockWebSocket as any).simulateClose = () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose(new CloseEvent('close'));
      }
    };

    (mockWebSocket as any).simulateError = () => {
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Event('error'));
      }
    };

    return mockWebSocket;
  }
}

// Test data validation utilities
export class TestValidationUtils {
  /**
   * Validate DICOM study structure
   */
  static validateStudyStructure(study: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!study.study_uid) errors.push('Missing study_uid');
    if (!study.patient_id) errors.push('Missing patient_id');
    if (!study.modality) errors.push('Missing modality');
    if (!Array.isArray(study.image_urls)) errors.push('image_urls must be an array');
    if (typeof study.total_slices !== 'number') errors.push('total_slices must be a number');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate viewer state structure
   */
  static validateViewerState(state: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (typeof state.currentSliceIndex !== 'number') errors.push('currentSliceIndex must be a number');
    if (typeof state.totalSlices !== 'number') errors.push('totalSlices must be a number');
    if (!state.viewport) errors.push('Missing viewport');
    if (!state.session) errors.push('Missing session');
    if (!state.ui) errors.push('Missing ui');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate performance metrics
   */
  static validatePerformanceMetrics(metrics: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (typeof metrics.averageTime !== 'number') errors.push('averageTime must be a number');
    if (!Array.isArray(metrics.times)) errors.push('times must be an array');
    if (metrics.averageTime < 0) errors.push('averageTime cannot be negative');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Async testing utilities
export class AsyncTestUtils {
  /**
   * Wait for condition to be true
   */
  static async waitFor(
    condition: () => boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Condition not met within ${timeout}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Wait for async operation to complete
   */
  static async waitForAsync<T>(
    asyncFn: () => Promise<T>,
    timeout = 5000
  ): Promise<T> {
    return Promise.race([
      asyncFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Async operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Create delayed promise
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export all utilities
export {
  MockDicomDataGenerator,
  MockStateGenerator,
  PerformanceTestUtils,
  CanvasTestUtils,
  WebSocketTestUtils,
  TestValidationUtils,
  AsyncTestUtils
};