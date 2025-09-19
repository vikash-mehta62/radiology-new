import { errorHandlingService } from '../errorHandlingService';

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    errorHandlingService.clearErrorHistory();
  });

  describe('processError', () => {
    it('should process network errors correctly', () => {
      const error = new Error('Network Error');
      (error as any).type = 'network';

      const result = errorHandlingService.processError(error, {
        fileName: 'test.dcm',
        fileSize: 1024,
        patientId: 'PAT001'
      });

      expect(result.title).toContain('Network Connection Error');
      expect(result.classification.type).toBe('network');
      expect(result.classification.retryable).toBe(true);
      expect(result.troubleshooting.length).toBeGreaterThan(0);
      expect(result.recoveryActions.length).toBeGreaterThan(0);
    });

    it('should process timeout errors correctly', () => {
      const error = new Error('Request timeout');
      (error as any).type = 'timeout';

      const result = errorHandlingService.processError(error);

      expect(result.title).toContain('Upload Timeout');
      expect(result.classification.type).toBe('timeout');
      expect(result.classification.retryable).toBe(true);
      expect(result.classification.severity).toBe('medium');
    });

    it('should process server errors correctly', () => {
      const error = new Error('Internal Server Error');
      (error as any).response = { status: 500 };

      const result = errorHandlingService.processError(error);

      expect(result.title).toContain('Server Error');
      expect(result.classification.type).toBe('server');
      expect(result.classification.retryable).toBe(true);
      expect(result.classification.severity).toBe('high');
    });

    it('should process validation errors correctly', () => {
      const error = new Error('File too large');
      (error as any).type = 'file_too_large';

      const result = errorHandlingService.processError(error, {
        fileName: 'large-file.dcm',
        fileSize: 200 * 1024 * 1024 // 200MB
      });

      expect(result.title).toContain('File Validation Error');
      expect(result.classification.type).toBe('validation');
      expect(result.classification.retryable).toBe(false);
      expect(result.classification.userActionRequired).toBe(true);
    });

    it('should process authentication errors correctly', () => {
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };

      const result = errorHandlingService.processError(error);

      expect(result.title).toBe('Authentication Required');
      expect(result.classification.type).toBe('authentication');
      expect(result.classification.retryable).toBe(false);
      expect(result.classification.userActionRequired).toBe(true);
    });

    it('should process permission errors correctly', () => {
      const error = new Error('Forbidden');
      (error as any).response = { status: 403 };

      const result = errorHandlingService.processError(error);

      expect(result.title).toBe('Permission Denied');
      expect(result.classification.type).toBe('permission');
      expect(result.classification.retryable).toBe(false);
    });

    it('should generate error codes', () => {
      const error = new Error('Test error');
      (error as any).response = { status: 500 };

      const result = errorHandlingService.processError(error);

      expect(result.errorCode).toBeTruthy();
      expect(result.errorCode).toMatch(/^[A-Z]{3}-\d{3}-[a-z0-9]+$/);
    });

    it('should include context information', () => {
      const error = new Error('Test error');
      const context = {
        fileName: 'test.dcm',
        fileSize: 1024,
        patientId: 'PAT001',
        uploadId: 'upload-123',
        retryAttempt: 2,
        maxRetries: 3
      };

      const result = errorHandlingService.processError(error, context);

      expect(result.context).toEqual(context);
      expect(result.title).toContain('test.dcm');
    });

    it('should extract technical details', () => {
      const error = new Error('Test error');
      (error as any).response = {
        status: 500,
        data: { detail: 'Internal server error occurred' }
      };
      (error as any).code = 'ECONNREFUSED';

      const result = errorHandlingService.processError(error);

      expect(result.technicalDetails).toContain('HTTP Status: 500');
      expect(result.technicalDetails).toContain('Error Code: ECONNREFUSED');
      expect(result.technicalDetails).toContain('Server Message: Internal server error occurred');
    });
  });

  describe('error patterns', () => {
    it('should match network error patterns', () => {
      const networkErrors = [
        'Network Error',
        'net::ERR_NETWORK_CHANGED',
        'net::ERR_INTERNET_DISCONNECTED'
      ];

      networkErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const result = errorHandlingService.processError(error);
        
        expect(result.classification.type).toBe('network');
        expect(result.troubleshooting.some(step => 
          step.title.includes('Internet Connection')
        )).toBe(true);
      });
    });

    it('should match timeout error patterns', () => {
      const timeoutErrors = [
        'Request timeout',
        'Connection timed out',
        'Upload timed out'
      ];

      timeoutErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const result = errorHandlingService.processError(error);
        
        expect(result.classification.type).toBe('timeout');
        expect(result.troubleshooting.some(step => 
          step.title.includes('File Size') || step.title.includes('Connection Speed')
        )).toBe(true);
      });
    });

    it('should match server error patterns', () => {
      const serverErrors = [
        'Internal Server Error',
        'Service Unavailable',
        'Bad Gateway',
        '500 Internal Server Error'
      ];

      serverErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const result = errorHandlingService.processError(error);
        
        expect(result.classification.type).toBe('server');
        expect(result.troubleshooting.some(step => 
          step.title.includes('Wait and Retry')
        )).toBe(true);
      });
    });

    it('should match file size error patterns', () => {
      const fileSizeErrors = [
        'File too large',
        '413 Payload Too Large',
        'Request entity too large'
      ];

      fileSizeErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const result = errorHandlingService.processError(error);
        
        expect(result.classification.type).toBe('validation');
        expect(result.troubleshooting.some(step => 
          step.title.includes('Compress')
        )).toBe(true);
      });
    });

    it('should match CORS error patterns', () => {
      const corsErrors = [
        'CORS policy blocked',
        'Access-Control-Allow-Origin',
        'Cross-origin request blocked'
      ];

      corsErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const result = errorHandlingService.processError(error);
        
        expect(result.classification.type).toBe('network');
        expect(result.classification.severity).toBe('critical');
        expect(result.troubleshooting.some(step => 
          step.title.includes('Technical Support')
        )).toBe(true);
      });
    });
  });

  describe('troubleshooting steps', () => {
    it('should generate appropriate troubleshooting steps for network errors', () => {
      const error = new Error('Network Error');
      (error as any).type = 'network';

      const result = errorHandlingService.processError(error);

      expect(result.troubleshooting.length).toBeGreaterThan(0);
      expect(result.troubleshooting[0].step).toBe(1);
      expect(result.troubleshooting.some(step => 
        step.difficulty === 'easy'
      )).toBe(true);
      expect(result.troubleshooting.some(step => 
        step.icon && step.icon.length > 0
      )).toBe(true);
    });

    it('should include actions in troubleshooting steps', () => {
      const error = new Error('File too large');
      (error as any).type = 'file_too_large';

      const result = errorHandlingService.processError(error);

      expect(result.troubleshooting.some(step => 
        step.action && step.action.length > 0
      )).toBe(true);
    });
  });

  describe('recovery actions', () => {
    it('should generate retry action for retryable errors', () => {
      const error = new Error('Network Error');
      (error as any).type = 'network';

      const result = errorHandlingService.processError(error);

      expect(result.recoveryActions.some(action => 
        action.label === 'Retry Upload'
      )).toBe(true);
      expect(result.recoveryActions.some(action => 
        action.primary === true
      )).toBe(true);
    });

    it('should not generate retry action for non-retryable errors', () => {
      const error = new Error('File too large');
      (error as any).type = 'file_too_large';

      const result = errorHandlingService.processError(error);

      expect(result.recoveryActions.some(action => 
        action.label === 'Retry Upload'
      )).toBe(false);
    });

    it('should always include contact support action', () => {
      const error = new Error('Test error');

      const result = errorHandlingService.processError(error);

      expect(result.recoveryActions.some(action => 
        action.label === 'Contact Support'
      )).toBe(true);
    });
  });

  describe('error history', () => {
    it('should track error history', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      errorHandlingService.processError(error1);
      errorHandlingService.processError(error2);

      const history = errorHandlingService.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toContain('First error');
      expect(history[1].message).toContain('Second error');
    });

    it('should limit error history size', () => {
      // Add more errors than the max history size
      for (let i = 0; i < 60; i++) {
        const error = new Error(`Error ${i}`);
        errorHandlingService.processError(error);
      }

      const history = errorHandlingService.getErrorHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should clear error history', () => {
      const error = new Error('Test error');
      errorHandlingService.processError(error);

      expect(errorHandlingService.getErrorHistory()).toHaveLength(1);

      errorHandlingService.clearErrorHistory();
      expect(errorHandlingService.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('error statistics', () => {
    it('should calculate error statistics', () => {
      const networkError = new Error('Network Error');
      (networkError as any).type = 'network';
      
      const timeoutError = new Error('Timeout');
      (timeoutError as any).type = 'timeout';
      
      const serverError = new Error('Server Error');
      (serverError as any).response = { status: 500 };

      errorHandlingService.processError(networkError);
      errorHandlingService.processError(timeoutError);
      errorHandlingService.processError(serverError);

      const stats = errorHandlingService.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.network).toBe(1);
      expect(stats.errorsByType.timeout).toBe(1);
      expect(stats.errorsByType.server).toBe(1);
      expect(stats.retryableErrors).toBe(3); // All these errors are retryable
      expect(stats.recentErrors.length).toBe(3);
    });

    it('should track errors by severity', () => {
      const criticalError = new Error('CORS Error');
      const highError = new Error('Network Error');
      (highError as any).type = 'network';
      const mediumError = new Error('Timeout');
      (mediumError as any).type = 'timeout';

      errorHandlingService.processError(criticalError);
      errorHandlingService.processError(highError);
      errorHandlingService.processError(mediumError);

      const stats = errorHandlingService.getErrorStatistics();

      expect(stats.errorsBySeverity.high).toBeGreaterThan(0);
      expect(stats.errorsBySeverity.medium).toBeGreaterThan(0);
    });
  });

  describe('message simplification', () => {
    it('should simplify technical error messages', () => {
      const technicalErrors = [
        'ECONNREFUSED connection refused',
        'ECONNABORTED request aborted',
        'ENOTFOUND host not found',
        'ETIMEDOUT connection timed out'
      ];

      technicalErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        const result = errorHandlingService.processError(error);
        
        // Should not contain technical jargon
        expect(result.message).not.toContain('ECONN');
        expect(result.message).not.toContain('ETIMEDOUT');
        
        // Should contain user-friendly terms
        expect(result.message.toLowerCase()).toMatch(
          /connect|connection|server|timeout|network/
        );
      });
    });
  });
});