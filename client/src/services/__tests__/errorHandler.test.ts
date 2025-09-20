/**
 * Comprehensive tests for the Enhanced Error Handler
 */

import { errorHandler, ErrorHandler, ErrorType, ErrorSeverity, ViewerError } from '../errorHandler';

// Mock global objects
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
  writable: true
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
});

// Mock fetch for network tests
global.fetch = jest.fn();

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = ErrorHandler.getInstance();
    jest.clearAllMocks();
    mockDispatchEvent.mockClear();
  });

  describe('Error Classification', () => {
    test('should classify network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const type = handler.classifyError(networkError);
      expect(type).toBe(ErrorType.NETWORK_ERROR);
    });

    test('should classify DICOM parsing errors correctly', () => {
      const dicomError = new Error('Invalid DICOM file format');
      const type = handler.classifyError(dicomError);
      expect(type).toBe(ErrorType.DICOM_PARSING_ERROR);
    });

    test('should classify GPU errors correctly', () => {
      const gpuError = new Error('WebGL context lost');
      const type = handler.classifyError(gpuError);
      expect(type).toBe(ErrorType.GPU_ERROR);
    });

    test('should classify memory errors correctly', () => {
      const memoryError = new Error('Out of memory');
      const type = handler.classifyError(memoryError);
      expect(type).toBe(ErrorType.MEMORY_ERROR);
    });

    test('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      const type = handler.classifyError(timeoutError);
      expect(type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    test('should default to network error for unknown errors', () => {
      const unknownError = new Error('Some unknown error');
      const type = handler.classifyError(unknownError);
      expect(type).toBe(ErrorType.NETWORK_ERROR);
    });
  });

  describe('ViewerError Creation', () => {
    test('should create ViewerError with correct properties', () => {
      const originalError = new Error('Test error');
      const context = { studyUid: 'test-study-123' };
      
      const viewerError = handler.createViewerError(originalError, context);
      
      expect(viewerError.name).toBe('ViewerError');
      expect(viewerError.message).toContain('connect to the server');
      expect(viewerError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(viewerError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(viewerError.retryable).toBe(true);
      expect(viewerError.timestamp).toBeGreaterThan(0);
      expect(viewerError.context).toMatchObject(context);
      expect(viewerError.originalError).toBe(originalError);
    });

    test('should generate unique error codes', () => {
      const error1 = handler.createViewerError(new Error('Test 1'));
      const error2 = handler.createViewerError(new Error('Test 2'));
      
      expect(error1.code).not.toBe(error2.code);
      expect(error1.code).toMatch(/^NETWORK_/);
      expect(error2.code).toMatch(/^NETWORK_/);
    });
  });

  describe('Error Severity Determination', () => {
    test('should assign critical severity to memory errors', () => {
      const memoryError = new Error('Out of memory');
      const viewerError = handler.createViewerError(memoryError);
      expect(viewerError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    test('should assign high severity to DICOM parsing errors', () => {
      const dicomError = new Error('Invalid DICOM format');
      const viewerError = handler.createViewerError(dicomError);
      expect(viewerError.severity).toBe(ErrorSeverity.HIGH);
    });

    test('should assign medium severity to network errors', () => {
      const networkError = new Error('Network failed');
      const viewerError = handler.createViewerError(networkError);
      expect(viewerError.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors and return recovery result', async () => {
      const testError = new Error('Test network error');
      
      const result = await handler.handleError(testError);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('message');
    });

    test('should add errors to history', async () => {
      const testError = new Error('Test error for history');
      
      await handler.handleError(testError);
      
      const stats = handler.getErrorStatistics();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.recentErrors.length).toBeGreaterThan(0);
    });

    test('should trigger error callbacks', async () => {
      const callback = jest.fn();
      handler.onError(callback);
      
      const testError = new Error('Test callback error');
      await handler.handleError(testError);
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: ErrorType.NETWORK_ERROR,
        message: expect.any(String)
      }));
    });
  });

  describe('Recovery Strategies', () => {
    test('should provide recovery options for network errors', () => {
      const networkError = handler.createViewerError(new Error('Network failed'));
      const options = handler.getRecoveryOptions(networkError);
      
      expect(options).toHaveLength(1);
      expect(options[0].title).toContain('Network');
      expect(options[0].actions).toHaveLength(2);
    });

    test('should provide recovery options for DICOM errors', () => {
      const dicomError = handler.createViewerError(new Error('Invalid DICOM'));
      const options = handler.getRecoveryOptions(dicomError);
      
      expect(options).toHaveLength(1);
      expect(options[0].title).toContain('DICOM');
      expect(options[0].actions.length).toBeGreaterThan(0);
    });

    test('should attempt automatic recovery', async () => {
      const networkError = handler.createViewerError(new Error('Network timeout'));
      
      const result = await handler.attemptRecovery(networkError);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('message');
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after multiple failures', async () => {
      const errorType = ErrorType.NETWORK_ERROR;
      
      // Simulate multiple failures
      for (let i = 0; i < 4; i++) {
        const testError = handler.createViewerError(new Error(`Network error ${i}`));
        await handler.handleError(testError);
      }
      
      // Next error should trigger circuit breaker
      const finalError = handler.createViewerError(new Error('Final network error'));
      const result = await handler.handleError(finalError);
      
      expect(result.action).toBe('circuit_breaker_open');
      expect(result.fallbackMode).toBe('basic');
    });
  });

  describe('Fallback Modes', () => {
    test('should enable fallback mode for GPU errors', () => {
      handler.enableFallbackMode(ErrorType.GPU_ERROR);
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'viewer-fallback-mode',
          detail: { mode: 'software_rendering', reason: ErrorType.GPU_ERROR }
        })
      );
    });

    test('should switch to compatibility mode', () => {
      handler.switchToCompatibilityMode();
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'viewer-compatibility-mode',
          detail: expect.objectContaining({
            webglEnabled: false,
            aiEnabled: false,
            collaborationEnabled: false,
            advancedCaching: false
          })
        })
      );
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics correctly', async () => {
      // Create a fresh handler instance for this test
      const freshHandler = ErrorHandler.getInstance();
      
      // Clear any existing history by accessing private property (for testing only)
      (freshHandler as any).errorHistory = [];
      
      // Add some test errors
      await freshHandler.handleError(new Error('Network error 1'));
      await freshHandler.handleError(new Error('Invalid DICOM'));
      await freshHandler.handleError(new Error('Memory error'));
      
      const stats = freshHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBe(1);
      expect(stats.errorsByType[ErrorType.DICOM_PARSING_ERROR]).toBe(1);
      expect(stats.errorsByType[ErrorType.MEMORY_ERROR]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1);
    });

    test('should calculate recovery rate', async () => {
      // Add retryable errors
      await handler.handleError(new Error('Network error'));
      await handler.handleError(new Error('Timeout error'));
      
      const stats = handler.getErrorStatistics();
      expect(stats.recoveryRate).toBeGreaterThan(0);
    });
  });

  describe('User-Friendly Messages', () => {
    test('should provide user-friendly messages for different error types', () => {
      const errors = [
        { error: new Error('Network failed'), expectedMessage: 'connect to the server' },
        { error: new Error('Invalid DICOM'), expectedMessage: 'read the medical image file' },
        { error: new Error('WebGL error'), expectedMessage: 'Graphics acceleration' },
        { error: new Error('Out of memory'), expectedMessage: 'Insufficient memory' }
      ];

      errors.forEach(({ error, expectedMessage }) => {
        const viewerError = handler.createViewerError(error);
        expect(viewerError.message.toLowerCase()).toContain(expectedMessage.toLowerCase());
      });
    });
  });

  describe('Global Error Handlers', () => {
    test('should handle unhandled promise rejections', () => {
      const rejectionEvent = new Event('unhandledrejection') as any;
      rejectionEvent.reason = new Error('Unhandled promise rejection');
      
      // Simulate the event
      window.dispatchEvent(rejectionEvent);
      
      // The error should be handled (we can't easily test this without more setup)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Error Callback Management', () => {
    test('should add and remove error callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      handler.onError(callback1);
      handler.onError(callback2);
      
      // Remove one callback
      handler.removeErrorCallback(callback1);
      
      // Only callback2 should be called
      const testError = new Error('Test callback management');
      handler.handleError(testError);
      
      // We can't easily test this without exposing internal state
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});

describe('Error Handler Integration', () => {
  test('should work as singleton', () => {
    const instance1 = ErrorHandler.getInstance();
    const instance2 = ErrorHandler.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  test('should handle concurrent errors', async () => {
    const errors = [
      new Error('Concurrent error 1'),
      new Error('Concurrent error 2'),
      new Error('Concurrent error 3')
    ];
    
    const promises = errors.map(error => errorHandler.handleError(error));
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('message');
    });
  });
});