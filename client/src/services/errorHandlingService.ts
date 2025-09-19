// Types for error handling
export interface ErrorClassification {
  type: 'network' | 'timeout' | 'server' | 'validation' | 'authentication' | 'permission' | 'quota' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'connectivity' | 'configuration' | 'user_input' | 'system' | 'external';
  retryable: boolean;
  userActionRequired: boolean;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  technicalDetails?: string;
  troubleshooting: TroubleshootingStep[];
  recoveryActions: RecoveryAction[];
  classification: ErrorClassification;
  errorCode?: string;
  timestamp: Date;
  context?: ErrorContext;
}

export interface TroubleshootingStep {
  step: number;
  title: string;
  description: string;
  action?: string;
  icon?: string;
  difficulty: 'easy' | 'medium' | 'advanced';
}

export interface RecoveryAction {
  label: string;
  description: string;
  action: () => Promise<void> | void;
  primary?: boolean;
  icon?: string;
}

export interface ErrorContext {
  fileName?: string;
  fileSize?: number;
  uploadId?: string;
  patientId?: string;
  endpoint?: string;
  userAgent?: string;
  connectionType?: string;
  retryAttempt?: number;
  maxRetries?: number;
}

export interface ErrorPattern {
  pattern: RegExp | string;
  classification: ErrorClassification;
  messageTemplate: string;
  troubleshootingSteps: Omit<TroubleshootingStep, 'step'>[];
}

class ErrorHandlingService {
  private errorPatterns: ErrorPattern[] = [];
  private errorHistory: UserFriendlyError[] = [];
  private readonly maxHistorySize = 50;

  constructor() {
    this.initializeErrorPatterns();
  }

  /**
   * Convert a raw error into a user-friendly error with troubleshooting guidance
   */
  processError(error: any, context?: ErrorContext): UserFriendlyError {
    console.log('🔍 Processing error:', error, 'Context:', context);

    const classification = this.classifyError(error);
    const errorPattern = this.findMatchingPattern(error);
    
    const userFriendlyError: UserFriendlyError = {
      title: this.generateErrorTitle(classification, context),
      message: this.generateUserMessage(error, errorPattern, context),
      technicalDetails: this.extractTechnicalDetails(error),
      troubleshooting: this.generateTroubleshootingSteps(classification, errorPattern, context),
      recoveryActions: this.generateRecoveryActions(classification, context),
      classification,
      errorCode: this.generateErrorCode(classification, error),
      timestamp: new Date(),
      context
    };

    // Add to error history
    this.errorHistory.push(userFriendlyError);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    console.log('✅ Generated user-friendly error:', userFriendlyError);
    return userFriendlyError;
  }

  /**
   * Get error history for analysis
   */
  getErrorHistory(): UserFriendlyError[] {
    return [...this.errorHistory];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    retryableErrors: number;
    recentErrors: UserFriendlyError[];
  } {
    const totalErrors = this.errorHistory.length;
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let retryableErrors = 0;

    this.errorHistory.forEach(error => {
      errorsByType[error.classification.type] = (errorsByType[error.classification.type] || 0) + 1;
      errorsBySeverity[error.classification.severity] = (errorsBySeverity[error.classification.severity] || 0) + 1;
      if (error.classification.retryable) retryableErrors++;
    });

    const recentErrors = this.errorHistory.slice(-10);

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      retryableErrors,
      recentErrors
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  // Private methods

  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      // Network Errors
      {
        pattern: /network error|net::err_network_changed|net::err_internet_disconnected/i,
        classification: {
          type: 'network',
          severity: 'high',
          category: 'connectivity',
          retryable: true,
          userActionRequired: true
        },
        messageTemplate: 'Network connection lost during upload',
        troubleshootingSteps: [
          {
            title: 'Check Internet Connection',
            description: 'Verify that your device is connected to the internet',
            action: 'Try opening a web page in another tab',
            icon: '🌐',
            difficulty: 'easy'
          },
          {
            title: 'Check Network Stability',
            description: 'Ensure your network connection is stable',
            action: 'Try moving closer to your WiFi router or switching to a wired connection',
            icon: '📶',
            difficulty: 'easy'
          },
          {
            title: 'Restart Network Connection',
            description: 'Reset your network connection',
            action: 'Disconnect and reconnect to your WiFi network',
            icon: '🔄',
            difficulty: 'medium'
          }
        ]
      },

      // Timeout Errors
      {
        pattern: /timeout|timed out|request timeout/i,
        classification: {
          type: 'timeout',
          severity: 'medium',
          category: 'connectivity',
          retryable: true,
          userActionRequired: false
        },
        messageTemplate: 'Upload timed out due to slow connection or large file size',
        troubleshootingSteps: [
          {
            title: 'Check File Size',
            description: 'Large files may take longer to upload',
            action: 'Consider compressing the file or splitting it into smaller parts',
            icon: '📁',
            difficulty: 'easy'
          },
          {
            title: 'Improve Connection Speed',
            description: 'Slow connections can cause timeouts',
            action: 'Close other applications using internet, or switch to a faster connection',
            icon: '⚡',
            difficulty: 'easy'
          },
          {
            title: 'Try During Off-Peak Hours',
            description: 'Network congestion can slow uploads',
            action: 'Try uploading during less busy times',
            icon: '⏰',
            difficulty: 'easy'
          }
        ]
      },

      // Server Errors
      {
        pattern: /5\d\d|internal server error|service unavailable|bad gateway/i,
        classification: {
          type: 'server',
          severity: 'high',
          category: 'system',
          retryable: true,
          userActionRequired: false
        },
        messageTemplate: 'Server is temporarily unavailable',
        troubleshootingSteps: [
          {
            title: 'Wait and Retry',
            description: 'Server issues are usually temporary',
            action: 'Wait a few minutes and try uploading again',
            icon: '⏳',
            difficulty: 'easy'
          },
          {
            title: 'Check System Status',
            description: 'Verify if there are known system issues',
            action: 'Contact your system administrator if the problem persists',
            icon: '📞',
            difficulty: 'medium'
          }
        ]
      },

      // File Size Errors
      {
        pattern: /file too large|413|payload too large|request entity too large/i,
        classification: {
          type: 'validation',
          severity: 'medium',
          category: 'user_input',
          retryable: false,
          userActionRequired: true
        },
        messageTemplate: 'File exceeds maximum allowed size',
        troubleshootingSteps: [
          {
            title: 'Compress the File',
            description: 'Reduce file size using compression',
            action: 'Use file compression software to reduce the file size',
            icon: '🗜️',
            difficulty: 'easy'
          },
          {
            title: 'Split Large Files',
            description: 'Break large files into smaller parts',
            action: 'Use file splitting tools to create smaller files',
            icon: '✂️',
            difficulty: 'medium'
          },
          {
            title: 'Contact Administrator',
            description: 'Request increased file size limits',
            action: 'Contact your system administrator to increase upload limits',
            icon: '👨‍💼',
            difficulty: 'advanced'
          }
        ]
      },

      // Authentication Errors
      {
        pattern: /401|unauthorized|authentication failed|invalid token/i,
        classification: {
          type: 'authentication',
          severity: 'high',
          category: 'configuration',
          retryable: false,
          userActionRequired: true
        },
        messageTemplate: 'Authentication failed - please log in again',
        troubleshootingSteps: [
          {
            title: 'Refresh the Page',
            description: 'Reload the page to refresh your session',
            action: 'Press F5 or click the refresh button',
            icon: '🔄',
            difficulty: 'easy'
          },
          {
            title: 'Log Out and Log In',
            description: 'Reset your authentication session',
            action: 'Log out completely and log back in',
            icon: '🔐',
            difficulty: 'easy'
          },
          {
            title: 'Clear Browser Cache',
            description: 'Remove stored authentication data',
            action: 'Clear your browser cache and cookies for this site',
            icon: '🧹',
            difficulty: 'medium'
          }
        ]
      },

      // Permission Errors
      {
        pattern: /403|forbidden|access denied|permission denied/i,
        classification: {
          type: 'permission',
          severity: 'high',
          category: 'configuration',
          retryable: false,
          userActionRequired: true
        },
        messageTemplate: 'You do not have permission to upload files',
        troubleshootingSteps: [
          {
            title: 'Check User Permissions',
            description: 'Verify you have upload permissions',
            action: 'Contact your administrator to verify your account permissions',
            icon: '👤',
            difficulty: 'medium'
          },
          {
            title: 'Verify Patient Access',
            description: 'Ensure you can access this patient record',
            action: 'Check if you have permission to modify this patient\'s files',
            icon: '🏥',
            difficulty: 'medium'
          }
        ]
      },

      // CORS Errors
      {
        pattern: /cors|cross-origin|access-control-allow-origin/i,
        classification: {
          type: 'network',
          severity: 'critical',
          category: 'configuration',
          retryable: false,
          userActionRequired: false
        },
        messageTemplate: 'Browser security settings are blocking the upload',
        troubleshootingSteps: [
          {
            title: 'Contact Technical Support',
            description: 'This is a configuration issue that requires technical assistance',
            action: 'Contact your system administrator or technical support',
            icon: '🛠️',
            difficulty: 'advanced'
          },
          {
            title: 'Try Different Browser',
            description: 'Some browsers handle security differently',
            action: 'Try using a different web browser',
            icon: '🌐',
            difficulty: 'easy'
          }
        ]
      },

      // Unsupported File Type
      {
        pattern: /415|unsupported media type|invalid file type|file format not supported/i,
        classification: {
          type: 'validation',
          severity: 'medium',
          category: 'user_input',
          retryable: false,
          userActionRequired: true
        },
        messageTemplate: 'File type is not supported',
        troubleshootingSteps: [
          {
            title: 'Check Supported Formats',
            description: 'Verify the file type is supported',
            action: 'Supported formats: DICOM (.dcm), PDF, JPEG, PNG',
            icon: '📋',
            difficulty: 'easy'
          },
          {
            title: 'Convert File Format',
            description: 'Convert to a supported format',
            action: 'Use file conversion software to change the file format',
            icon: '🔄',
            difficulty: 'medium'
          }
        ]
      }
    ];
  }

  private classifyError(error: any): ErrorClassification {
    // Check for enhanced error type from patient service
    if (error.type) {
      switch (error.type) {
        case 'timeout':
          return {
            type: 'timeout',
            severity: 'medium',
            category: 'connectivity',
            retryable: true,
            userActionRequired: false
          };
        case 'network':
          return {
            type: 'network',
            severity: 'high',
            category: 'connectivity',
            retryable: true,
            userActionRequired: true
          };
        case 'server_error':
          return {
            type: 'server',
            severity: 'high',
            category: 'system',
            retryable: true,
            userActionRequired: false
          };
        case 'file_too_large':
          return {
            type: 'validation',
            severity: 'medium',
            category: 'user_input',
            retryable: false,
            userActionRequired: true
          };
        case 'unsupported_format':
          return {
            type: 'validation',
            severity: 'medium',
            category: 'user_input',
            retryable: false,
            userActionRequired: true
          };
      }
    }

    // Fallback classification based on error properties
    const statusCode = error.response?.status || error.status;
    const message = error.message || error.toString();

    if (statusCode) {
      if (statusCode === 401) {
        return {
          type: 'authentication',
          severity: 'high',
          category: 'configuration',
          retryable: false,
          userActionRequired: true
        };
      } else if (statusCode === 403) {
        return {
          type: 'permission',
          severity: 'high',
          category: 'configuration',
          retryable: false,
          userActionRequired: true
        };
      } else if (statusCode === 413) {
        return {
          type: 'validation',
          severity: 'medium',
          category: 'user_input',
          retryable: false,
          userActionRequired: true
        };
      } else if (statusCode >= 500) {
        return {
          type: 'server',
          severity: 'high',
          category: 'system',
          retryable: true,
          userActionRequired: false
        };
      }
    }

    if (message.includes('timeout') || message.includes('ECONNABORTED')) {
      return {
        type: 'timeout',
        severity: 'medium',
        category: 'connectivity',
        retryable: true,
        userActionRequired: false
      };
    }

    if (message.includes('Network Error') || message.includes('ECONNREFUSED')) {
      return {
        type: 'network',
        severity: 'high',
        category: 'connectivity',
        retryable: true,
        userActionRequired: true
      };
    }

    // Default classification
    return {
      type: 'unknown',
      severity: 'medium',
      category: 'system',
      retryable: true,
      userActionRequired: false
    };
  }

  private findMatchingPattern(error: any): ErrorPattern | null {
    const message = error.message || error.toString();
    const statusCode = error.response?.status || error.status;
    const searchText = `${message} ${statusCode || ''}`;

    return this.errorPatterns.find(pattern => {
      if (typeof pattern.pattern === 'string') {
        return searchText.toLowerCase().includes(pattern.pattern.toLowerCase());
      } else {
        return pattern.pattern.test(searchText);
      }
    }) || null;
  }

  private generateErrorTitle(classification: ErrorClassification, context?: ErrorContext): string {
    const fileName = context?.fileName ? ` for ${context.fileName}` : '';
    
    switch (classification.type) {
      case 'network':
        return `Network Connection Error${fileName}`;
      case 'timeout':
        return `Upload Timeout${fileName}`;
      case 'server':
        return `Server Error${fileName}`;
      case 'validation':
        return `File Validation Error${fileName}`;
      case 'authentication':
        return 'Authentication Required';
      case 'permission':
        return 'Permission Denied';
      case 'quota':
        return 'Storage Quota Exceeded';
      default:
        return `Upload Error${fileName}`;
    }
  }

  private generateUserMessage(error: any, pattern: ErrorPattern | null, context?: ErrorContext): string {
    if (pattern) {
      let message = pattern.messageTemplate;
      
      // Replace placeholders with context data
      if (context?.fileName) {
        message = message.replace('{fileName}', context.fileName);
      }
      if (context?.fileSize) {
        message = message.replace('{fileSize}', this.formatFileSize(context.fileSize));
      }
      
      return message;
    }

    // Fallback to simplified error message
    const originalMessage = error.message || 'An unexpected error occurred';
    return this.simplifyErrorMessage(originalMessage);
  }

  private simplifyErrorMessage(message: string): string {
    // Remove technical jargon and make user-friendly
    const simplifications: Record<string, string> = {
      'ECONNREFUSED': 'Could not connect to server',
      'ECONNABORTED': 'Connection was interrupted',
      'ENOTFOUND': 'Server could not be found',
      'ETIMEDOUT': 'Connection timed out',
      'Network Error': 'Network connection problem',
      'Request failed with status code': 'Server returned an error',
    };

    let simplified = message;
    Object.entries(simplifications).forEach(([technical, friendly]) => {
      simplified = simplified.replace(new RegExp(technical, 'gi'), friendly);
    });

    return simplified;
  }

  private extractTechnicalDetails(error: any): string {
    const details: string[] = [];
    
    if (error.response?.status) {
      details.push(`HTTP Status: ${error.response.status}`);
    }
    
    if (error.code) {
      details.push(`Error Code: ${error.code}`);
    }
    
    if (error.response?.data?.detail) {
      details.push(`Server Message: ${error.response.data.detail}`);
    }
    
    if (error.stack) {
      details.push(`Stack Trace: ${error.stack.split('\n')[0]}`);
    }

    return details.join(' | ');
  }

  private generateTroubleshootingSteps(
    classification: ErrorClassification,
    pattern: ErrorPattern | null,
    context?: ErrorContext
  ): TroubleshootingStep[] {
    let steps: Omit<TroubleshootingStep, 'step'>[] = [];

    if (pattern) {
      steps = [...pattern.troubleshootingSteps];
    } else {
      // Default troubleshooting steps based on classification
      switch (classification.type) {
        case 'network':
          steps = [
            {
              title: 'Check Internet Connection',
              description: 'Verify your internet connection is working',
              action: 'Try loading another website',
              icon: '🌐',
              difficulty: 'easy'
            }
          ];
          break;
        case 'timeout':
          steps = [
            {
              title: 'Retry Upload',
              description: 'The upload may succeed on retry',
              action: 'Click the retry button or try uploading again',
              icon: '🔄',
              difficulty: 'easy'
            }
          ];
          break;
        default:
          steps = [
            {
              title: 'Try Again',
              description: 'The error may be temporary',
              action: 'Wait a moment and try the upload again',
              icon: '⏳',
              difficulty: 'easy'
            }
          ];
      }
    }

    // Add step numbers
    return steps.map((step, index) => ({
      step: index + 1,
      ...step
    }));
  }

  private generateRecoveryActions(classification: ErrorClassification, context?: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    if (classification.retryable) {
      actions.push({
        label: 'Retry Upload',
        description: 'Try uploading the file again',
        action: async () => {
          // This would be implemented by the calling component
          console.log('Retry action triggered');
        },
        primary: true,
        icon: '🔄'
      });
    }

    if (classification.type === 'network') {
      actions.push({
        label: 'Check Connection',
        description: 'Test your internet connection',
        action: async () => {
          window.open('https://www.google.com', '_blank');
        },
        icon: '🌐'
      });
    }

    if (classification.type === 'validation' && context?.fileName) {
      actions.push({
        label: 'Choose Different File',
        description: 'Select a different file to upload',
        action: async () => {
          // This would trigger file selection
          console.log('File selection triggered');
        },
        icon: '📁'
      });
    }

    actions.push({
      label: 'Contact Support',
      description: 'Get help from technical support',
      action: async () => {
        // This would open support contact
        console.log('Support contact triggered');
      },
      icon: '🆘'
    });

    return actions;
  }

  private generateErrorCode(classification: ErrorClassification, error: any): string {
    const timestamp = Date.now().toString(36);
    const typeCode = classification.type.substring(0, 3).toUpperCase();
    const statusCode = error.response?.status || error.status || '000';
    
    return `${typeCode}-${statusCode}-${timestamp}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const errorHandlingService = new ErrorHandlingService();