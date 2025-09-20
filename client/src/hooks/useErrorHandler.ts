/**
 * React Hook for Error Handling
 * Provides easy integration of error handling in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { errorHandler, ViewerError, RecoveryOption, RecoveryAction, ErrorType } from '../services/errorHandler';

interface UseErrorHandlerOptions {
  onError?: (error: ViewerError) => void;
  onRecovery?: (success: boolean, action: string) => void;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseErrorHandlerReturn {
  error: ViewerError | null;
  isRetrying: boolean;
  retryCount: number;
  recoveryOptions: RecoveryOption[];
  handleError: (error: Error | ViewerError, context?: any) => Promise<void>;
  retry: () => Promise<void>;
  dismiss: () => void;
  executeRecoveryAction: (action: RecoveryAction) => Promise<boolean>;
  clearError: () => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn => {
  const {
    onError,
    onRecovery,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const [error, setError] = useState<ViewerError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOption[]>([]);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const lastErrorActionRef = useRef<(() => Promise<void>) | null>(null);

  // Handle error with automatic recovery attempts
  const handleError = useCallback(async (
    errorInput: Error | ViewerError,
    context?: any
  ): Promise<void> => {
    try {
      const result = await errorHandler.handleError(errorInput, context);
      
      let viewerError: ViewerError;
      if (errorInput instanceof Error && !(errorInput as any).type) {
        viewerError = errorHandler.createViewerError(errorInput, context);
      } else {
        viewerError = errorInput as ViewerError;
      }

      setError(viewerError);
      setRecoveryOptions(errorHandler.getRecoveryOptions(viewerError));
      
      // Call custom error handler
      if (onError) {
        onError(viewerError);
      }

      // Handle automatic recovery result
      if (result.success) {
        if (onRecovery) {
          onRecovery(true, result.action);
        }
        // Clear error if recovery was successful
        setTimeout(() => {
          setError(null);
          setRetryCount(0);
        }, 2000);
      } else if (result.fallbackMode) {
        // Enable fallback mode
        errorHandler.enableFallbackMode(viewerError.type);
      }

      // Auto-retry logic
      if (!result.success && autoRetry && viewerError.retryable && retryCount < maxRetries) {
        scheduleRetry();
      }

    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      // Fallback error display
      setError({
        name: 'ErrorHandlerError',
        message: 'An error occurred while handling the original error',
        type: ErrorType.RENDERING_ERROR,
        code: 'ERROR_HANDLER_FAILURE',
        severity: 'high' as any,
        retryable: false,
        timestamp: Date.now()
      });
    }
  }, [onError, onRecovery, autoRetry, maxRetries, retryCount]);

  // Schedule automatic retry
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setIsRetrying(true);
    
    retryTimeoutRef.current = setTimeout(async () => {
      await retry();
    }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
  }, [retryDelay, retryCount]);

  // Manual retry function
  const retry = useCallback(async (): Promise<void> => {
    if (!error || !error.retryable) {
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // If we have a stored action to retry, execute it
      if (lastErrorActionRef.current) {
        await lastErrorActionRef.current();
        
        // If successful, clear the error
        setError(null);
        setRetryCount(0);
        
        if (onRecovery) {
          onRecovery(true, 'manual_retry');
        }
      } else {
        // Otherwise, just clear the error and let the component handle it
        setError(null);
        setRetryCount(0);
      }
    } catch (retryError) {
      // Retry failed, handle the new error
      await handleError(retryError as Error);
      
      if (onRecovery) {
        onRecovery(false, 'manual_retry');
      }
    } finally {
      setIsRetrying(false);
    }
  }, [error, handleError, onRecovery]);

  // Execute a specific recovery action
  const executeRecoveryAction = useCallback(async (action: RecoveryAction): Promise<boolean> => {
    try {
      setIsRetrying(true);
      const success = await action.action();
      
      if (success) {
        setError(null);
        setRetryCount(0);
        
        if (onRecovery) {
          onRecovery(true, action.type);
        }
      }
      
      return success;
    } catch (actionError) {
      console.error('Recovery action failed:', actionError);
      
      if (onRecovery) {
        onRecovery(false, action.type);
      }
      
      return false;
    } finally {
      setIsRetrying(false);
    }
  }, [onRecovery]);

  // Dismiss error without retry
  const dismiss = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // Clear error (alias for dismiss)
  const clearError = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // Store retry action for later use
  const setRetryAction = useCallback((action: () => Promise<void>) => {
    lastErrorActionRef.current = action;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Listen for global error events
  useEffect(() => {
    const handleGlobalError = (event: CustomEvent) => {
      const { error: globalError } = event.detail;
      handleError(globalError);
    };

    const handleFallbackMode = (event: CustomEvent) => {
      const { mode, reason } = event.detail;
      console.log(`Switched to fallback mode: ${mode} (reason: ${reason})`);
    };

    window.addEventListener('viewer-error-display', handleGlobalError as EventListener);
    window.addEventListener('viewer-fallback-mode', handleFallbackMode as EventListener);

    return () => {
      window.removeEventListener('viewer-error-display', handleGlobalError as EventListener);
      window.removeEventListener('viewer-fallback-mode', handleFallbackMode as EventListener);
    };
  }, [handleError]);

  return {
    error,
    isRetrying,
    retryCount,
    recoveryOptions,
    handleError,
    retry,
    dismiss,
    executeRecoveryAction,
    clearError
  };
};

// Specialized hooks for common error scenarios

export const useDicomErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  return useErrorHandler({
    ...options,
    autoRetry: true,
    maxRetries: 3,
    retryDelay: 2000
  });
};

export const useNetworkErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  return useErrorHandler({
    ...options,
    autoRetry: true,
    maxRetries: 5,
    retryDelay: 1000
  });
};

export const useRenderingErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  return useErrorHandler({
    ...options,
    autoRetry: false, // Rendering errors usually need manual intervention
    maxRetries: 1
  });
};