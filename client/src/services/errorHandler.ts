/**
 * Enhanced Error Handler for DICOM Viewer
 * Provides comprehensive error classification, recovery strategies, and user-friendly error management
 */

import { DicomError, RetryConfig, LoadingAttempt } from '../types';
import { ViewerError } from '../components/DICOM/types/ViewerTypes';

export { ViewerError };

export enum ErrorType {
  NETWORK_ERROR = 'network',
  DICOM_PARSING_ERROR = 'dicom_parsing',
  RENDERING_ERROR = 'rendering',
  GPU_ERROR = 'gpu',
  MEMORY_ERROR = 'memory',
  AI_PROCESSING_ERROR = 'ai_processing',
  COLLABORATION_ERROR = 'collaboration',
  AUTHENTICATION_ERROR = 'authentication',
  TIMEOUT_ERROR = 'timeout',
  NOT_FOUND_ERROR = 'not_found',
  CORRUPTED_DATA_ERROR = 'corrupted',
  BROWSER_COMPATIBILITY_ERROR = 'browser_compatibility',
  INITIALIZATION_ERROR = 'initialization',
  SECURITY_ERROR = 'security'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'reload' | 'switch_mode' | 'clear_cache' | 'report_issue';
  label: string;
  description: string;
  action: () => Promise<boolean>;
  priority: number;
}

export interface RecoveryOption {
  title: string;
  description: string;
  actions: RecoveryAction[];
  automatic: boolean;
  userConfirmationRequired: boolean;
}

export interface RecoveryResult {
  success: boolean;
  action: string;
  message: string;
  fallbackMode?: string;
}

export interface ErrorContext {
  studyUid?: string;
  imageId?: string;
  viewerMode?: string;
  userAgent?: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  performanceMetrics?: {
    memoryUsage: number;
    renderingTime: number;
    networkLatency: number;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: ViewerError[] = [];
  private recoveryStrategies: Map<ErrorType, RecoveryOption[]> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();
  private errorCallbacks: ((error: ViewerError) => void)[] = [];
  private maxHistorySize = 100;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Classify an error based on its characteristics
   */
  public classifyError(error: Error | any): ErrorType {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    
    // Timeout errors (check first since they can contain other keywords)
    if (message.includes('timeout') || error.name === 'TimeoutError') {
      return ErrorType.TIMEOUT_ERROR;
    }

    // Memory errors (high priority)
    if (message.includes('memory') || message.includes('out of memory') ||
        message.includes('allocation failed')) {
      return ErrorType.MEMORY_ERROR;
    }

    // DICOM parsing errors
    if (message.includes('dicom') || message.includes('parsing') ||
        message.includes('invalid dicom') || message.includes('cornerstone')) {
      return ErrorType.DICOM_PARSING_ERROR;
    }

    // GPU/WebGL errors
    if (message.includes('webgl') || message.includes('gpu') ||
        message.includes('context lost') || message.includes('shader')) {
      return ErrorType.GPU_ERROR;
    }

    // Rendering errors
    if (message.includes('render') || message.includes('canvas') ||
        message.includes('draw') || stack.includes('rendering')) {
      return ErrorType.RENDERING_ERROR;
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') ||
        error.status === 401 || error.status === 403) {
      return ErrorType.AUTHENTICATION_ERROR;
    }

    // Not found errors
    if (message.includes('not found') || error.status === 404) {
      return ErrorType.NOT_FOUND_ERROR;
    }

    // Corrupted data errors
    if (message.includes('corrupt') || message.includes('invalid format') ||
        message.includes('malformed')) {
      return ErrorType.CORRUPTED_DATA_ERROR;
    }

    // Browser compatibility errors
    if (message.includes('not supported') || message.includes('compatibility')) {
      return ErrorType.BROWSER_COMPATIBILITY_ERROR;
    }

    // Network-related errors (check last since many errors can contain network-related keywords)
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('cors') || error.code === 'NETWORK_ERROR' || 
        error.name === 'NetworkError') {
      return ErrorType.NETWORK_ERROR;
    }

    // Default to network error for unknown errors
    return ErrorType.NETWORK_ERROR;
  }

  /**
   * Create a ViewerError from a generic error
   */
  public createViewerError(
    error: Error | any,
    context?: Partial<ErrorContext>
  ): ViewerError {
    const type = this.classifyError(error);
    const severity = this.determineSeverity(type, error);
    const retryable = this.isRetryable(type, error);
    const code = this.generateErrorCode(type);

    // Properly serialize error message to avoid [object Object] display
    let errorMessage = '';
    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && typeof error.toString === 'function') {
        const stringified = error.toString();
        errorMessage = stringified !== '[object Object]' ? stringified : JSON.stringify(error);
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else {
      errorMessage = String(error);
    }

    const viewerError = new ViewerError(
      this.getUserFriendlyMessage(type, errorMessage),
      code,
      severity
    );

    // Add additional properties
    (viewerError as any).type = type;
    (viewerError as any).retryable = retryable;
    (viewerError as any).timestamp = Date.now();
    (viewerError as any).context = context;
    (viewerError as any).originalError = error;
    (viewerError as any).requestId = context?.sessionId || this.sessionId;
    (viewerError as any).studyUid = context?.studyUid;
    (viewerError as any).imageId = context?.imageId;

    return viewerError;
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  public async handleError(
    error: Error | ViewerError,
    context?: Partial<ErrorContext>
  ): Promise<RecoveryResult> {
    const viewerError = error instanceof Error && !(error as any).type 
      ? this.createViewerError(error, context)
      : error as ViewerError;

    // Add to error history
    this.addToHistory(viewerError);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(viewerError.type)) {
      return {
        success: false,
        action: 'circuit_breaker_open',
        message: 'Too many recent failures. Please try again later.',
        fallbackMode: 'basic'
      };
    }

    // Notify error callbacks
    this.notifyErrorCallbacks(viewerError);

    // Log error for debugging
    this.logError(viewerError);

    // Attempt automatic recovery
    const recoveryResult = await this.attemptRecovery(viewerError);

    // Update circuit breaker
    this.updateCircuitBreaker(viewerError.type, recoveryResult.success);

    return recoveryResult;
  }

  /**
   * Attempt automatic recovery based on error type
   */
  public async attemptRecovery(error: ViewerError): Promise<RecoveryResult> {
    const strategies = this.recoveryStrategies.get(error.type) || [];
    
    for (const strategy of strategies) {
      if (strategy.automatic) {
        for (const action of strategy.actions) {
          try {
            const success = await action.action();
            if (success) {
              return {
                success: true,
                action: action.type,
                message: `Recovered using ${action.label}`
              };
            }
          } catch (recoveryError) {
            console.warn(`Recovery action ${action.type} failed:`, recoveryError);
          }
        }
      }
    }

    // If no automatic recovery worked, suggest manual options
    return {
      success: false,
      action: 'manual_intervention_required',
      message: 'Automatic recovery failed. Manual intervention required.',
      fallbackMode: this.getFallbackMode(error.type)
    };
  }

  /**
   * Get recovery options for user interaction
   */
  public getRecoveryOptions(error: ViewerError): RecoveryOption[] {
    return this.recoveryStrategies.get(error.type) || [];
  }

  /**
   * Enable fallback mode for graceful degradation
   */
  public enableFallbackMode(errorType: ErrorType): void {
    const fallbackMode = this.getFallbackMode(errorType);
    
    // Emit fallback mode event
    window.dispatchEvent(new CustomEvent('viewer-fallback-mode', {
      detail: { mode: fallbackMode, reason: errorType }
    }));
  }

  /**
   * Switch to compatibility mode for older browsers
   */
  public switchToCompatibilityMode(): void {
    // Disable advanced features
    const compatibilitySettings = {
      webglEnabled: false,
      aiEnabled: false,
      collaborationEnabled: false,
      advancedCaching: false
    };

    window.dispatchEvent(new CustomEvent('viewer-compatibility-mode', {
      detail: compatibilitySettings
    }));
  }

  /**
   * Display user-friendly error message
   */
  public displayUserFriendlyError(error: ViewerError): void {
    const message = this.getUserFriendlyMessage(error.type, error.message);
    const recoveryOptions = this.getRecoveryOptions(error);

    window.dispatchEvent(new CustomEvent('viewer-error-display', {
      detail: {
        error,
        message,
        recoveryOptions,
        severity: error.severity
      }
    }));
  }

  /**
   * Add error callback for custom handling
   */
  public onError(callback: (error: ViewerError) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove error callback
   */
  public removeErrorCallback(callback: (error: ViewerError) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Get error statistics for monitoring
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: ViewerError[];
    recoveryRate: number;
  } {
    const errorsByType = {} as Record<ErrorType, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    let recoveredErrors = 0;

    this.errorHistory.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      
      // Check if error was recovered (simplified logic)
      if (error.retryable) {
        recoveredErrors++;
      }
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(-10),
      recoveryRate: this.errorHistory.length > 0 ? recoveredErrors / this.errorHistory.length : 0
    };
  }

  // Private methods

  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK_ERROR, [
      {
        title: 'Network Connection Issues',
        description: 'Problems connecting to the server',
        automatic: true,
        userConfirmationRequired: false,
        actions: [
          {
            type: 'retry',
            label: 'Retry Connection',
            description: 'Attempt to reconnect to the server',
            action: async () => this.retryNetworkConnection(),
            priority: 1
          },
          {
            type: 'fallback',
            label: 'Use Cached Data',
            description: 'Load from local cache if available',
            action: async () => this.useCachedData(),
            priority: 2
          }
        ]
      }
    ]);

    // DICOM parsing error recovery
    this.recoveryStrategies.set(ErrorType.DICOM_PARSING_ERROR, [
      {
        title: 'DICOM File Issues',
        description: 'Problems reading the medical image file',
        automatic: true,
        userConfirmationRequired: false,
        actions: [
          {
            type: 'fallback',
            label: 'Try Alternative Parser',
            description: 'Use backup DICOM parsing method',
            action: async () => this.tryAlternativeParser(),
            priority: 1
          },
          {
            type: 'switch_mode',
            label: 'Switch to Basic Viewer',
            description: 'Use simplified viewer mode',
            action: async () => this.switchToBasicViewer(),
            priority: 2
          }
        ]
      }
    ]);

    // GPU error recovery
    this.recoveryStrategies.set(ErrorType.GPU_ERROR, [
      {
        title: 'Graphics Processing Issues',
        description: 'Problems with hardware acceleration',
        automatic: true,
        userConfirmationRequired: false,
        actions: [
          {
            type: 'fallback',
            label: 'Disable GPU Acceleration',
            description: 'Switch to software rendering',
            action: async () => this.disableGPUAcceleration(),
            priority: 1
          }
        ]
      }
    ]);

    // Memory error recovery
    this.recoveryStrategies.set(ErrorType.MEMORY_ERROR, [
      {
        title: 'Memory Issues',
        description: 'Insufficient memory for operation',
        automatic: true,
        userConfirmationRequired: false,
        actions: [
          {
            type: 'clear_cache',
            label: 'Clear Image Cache',
            description: 'Free up memory by clearing cached images',
            action: async () => this.clearImageCache(),
            priority: 1
          },
          {
            type: 'switch_mode',
            label: 'Switch to Low Memory Mode',
            description: 'Use memory-efficient viewer settings',
            action: async () => this.switchToLowMemoryMode(),
            priority: 2
          }
        ]
      }
    ]);
  }

  private determineSeverity(type: ErrorType, error: any): ErrorSeverity {
    // Critical errors that prevent core functionality
    if (type === ErrorType.MEMORY_ERROR || type === ErrorType.CORRUPTED_DATA_ERROR) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors that significantly impact functionality
    if (type === ErrorType.DICOM_PARSING_ERROR || type === ErrorType.RENDERING_ERROR) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors that impact some features
    if (type === ErrorType.NETWORK_ERROR || type === ErrorType.GPU_ERROR) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors that have minimal impact
    return ErrorSeverity.LOW;
  }

  private isRetryable(type: ErrorType, error: any): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RENDERING_ERROR
    ];
    return retryableTypes.includes(type);
  }

  private generateErrorCode(type: ErrorType): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type.toUpperCase().replace('_', '_')}_${timestamp}_${random}`;
  }

  private getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
    const messages = {
      [ErrorType.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
      [ErrorType.DICOM_PARSING_ERROR]: 'Unable to read the medical image file. The file may be corrupted or in an unsupported format.',
      [ErrorType.RENDERING_ERROR]: 'Unable to display the image. Please try refreshing the page.',
      [ErrorType.GPU_ERROR]: 'Graphics acceleration is not available. The viewer will use software rendering.',
      [ErrorType.MEMORY_ERROR]: 'Insufficient memory to load the image. Please close other applications and try again.',
      [ErrorType.AI_PROCESSING_ERROR]: 'AI analysis is temporarily unavailable. Basic viewing functions remain available.',
      [ErrorType.COLLABORATION_ERROR]: 'Unable to connect to collaboration services. You can continue viewing independently.',
      [ErrorType.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
      [ErrorType.TIMEOUT_ERROR]: 'The operation timed out. Please try again.',
      [ErrorType.NOT_FOUND_ERROR]: 'The requested image or study was not found.',
      [ErrorType.CORRUPTED_DATA_ERROR]: 'The image data is corrupted and cannot be displayed.',
      [ErrorType.BROWSER_COMPATIBILITY_ERROR]: 'Your browser does not support all features. Please update your browser or use a supported one.'
    };

    return messages[type] || 'An unexpected error occurred. Please try again.';
  }

  private getFallbackMode(type: ErrorType): string {
    const fallbackModes: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: 'offline',
      [ErrorType.DICOM_PARSING_ERROR]: 'basic_viewer',
      [ErrorType.RENDERING_ERROR]: 'software_rendering',
      [ErrorType.GPU_ERROR]: 'software_rendering',
      [ErrorType.MEMORY_ERROR]: 'low_memory',
      [ErrorType.AI_PROCESSING_ERROR]: 'no_ai',
      [ErrorType.COLLABORATION_ERROR]: 'single_user',
      [ErrorType.AUTHENTICATION_ERROR]: 'guest',
      [ErrorType.TIMEOUT_ERROR]: 'cached',
      [ErrorType.NOT_FOUND_ERROR]: 'basic',
      [ErrorType.CORRUPTED_DATA_ERROR]: 'basic',
      [ErrorType.BROWSER_COMPATIBILITY_ERROR]: 'compatibility'
    };

    return fallbackModes[type] || 'basic';
  }

  private addToHistory(error: ViewerError): void {
    this.errorHistory.push(error);
    
    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  private notifyErrorCallbacks(error: ViewerError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  private logError(error: ViewerError): void {
    const logData = {
      type: error.type,
      code: error.code,
      message: error.message,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack
    };

    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      console.error('🔴 [ErrorHandler] Critical/High severity error:', logData);
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      console.warn('🟡 [ErrorHandler] Medium severity error:', logData);
    } else {
      console.info('🔵 [ErrorHandler] Low severity error:', logData);
    }
  }

  private isCircuitBreakerOpen(type: ErrorType): boolean {
    const breaker = this.circuitBreakers.get(type);
    if (!breaker) return false;

    const now = Date.now();
    const timeoutDuration = 60000; // 1 minute

    if (breaker.isOpen && (now - breaker.lastFailure) > timeoutDuration) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }

    return breaker.isOpen;
  }

  private updateCircuitBreaker(type: ErrorType, success: boolean): void {
    let breaker = this.circuitBreakers.get(type);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitBreakers.set(type, breaker);
    }

    if (success) {
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      // Open circuit breaker after 3 failures
      if (breaker.failures >= 3) {
        breaker.isOpen = true;
      }
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // Prevent the default browser error display
      event.preventDefault();
      
      const error = this.createViewerError(event.reason, {
        timestamp: Date.now()
      });
      this.handleError(error);
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      // Prevent the default browser error display
      event.preventDefault();
      
      const error = this.createViewerError(event.error || new Error(event.message), {
        timestamp: Date.now()
      });
      this.handleError(error);
    });
  }

  // Recovery action implementations
  private async retryNetworkConnection(): Promise<boolean> {
    try {
      const response = await fetch('/health', { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async useCachedData(): Promise<boolean> {
    // Implementation would check for cached data
    return false; // Placeholder
  }

  private async tryAlternativeParser(): Promise<boolean> {
    // Implementation would try alternative DICOM parsing
    return false; // Placeholder
  }

  private async switchToBasicViewer(): Promise<boolean> {
    this.enableFallbackMode(ErrorType.DICOM_PARSING_ERROR);
    return true;
  }

  private async disableGPUAcceleration(): Promise<boolean> {
    window.dispatchEvent(new CustomEvent('disable-gpu-acceleration'));
    return true;
  }

  private async clearImageCache(): Promise<boolean> {
    window.dispatchEvent(new CustomEvent('clear-image-cache'));
    return true;
  }

  private async switchToLowMemoryMode(): Promise<boolean> {
    this.enableFallbackMode(ErrorType.MEMORY_ERROR);
    return true;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();