/**
 * Centralized Logging Service for DICOM Viewer
 * 
 * Features:
 * - Environment-aware logging (development vs production)
 * - Log levels (debug, info, warn, error)
 * - Structured logging with context
 * - Performance monitoring integration
 * - Remote logging capability for production
 * - Log filtering and categorization
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export enum LogCategory {
  DICOM = 'DICOM',
  VIEWER = 'VIEWER',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  AI = 'AI',
  NETWORK = 'NETWORK',
  RENDERING = 'RENDERING',
  NAVIGATION = 'NAVIGATION',
  CACHE = 'CACHE',
  SERVICE = 'SERVICE',
  USER_ACTION = 'USER_ACTION',
  SYSTEM = 'SYSTEM'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  component: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  studyId?: string;
  performanceMetrics?: {
    duration?: number;
    memoryUsage?: number;
    renderTime?: number;
  };
}

interface LoggingConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxLocalLogs: number;
  enablePerformanceLogging: boolean;
  enableUserActionLogging: boolean;
  categories: LogCategory[];
}

class LoggingService {
  private config: LoggingConfig;
  private localLogs: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private remoteQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = this.getDefaultConfig();
    this.initializeService();
  }

  private getDefaultConfig(): LoggingConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: isDevelopment,
      enableRemote: !isDevelopment,
      remoteEndpoint: process.env.REACT_APP_LOGGING_ENDPOINT || '/api/logs',
      maxLocalLogs: 1000,
      enablePerformanceLogging: true,
      enableUserActionLogging: true,
      categories: Object.values(LogCategory)
    };
  }

  private initializeService(): void {
    // Set up periodic remote log flushing
    if (this.config.enableRemote) {
      this.flushTimer = setInterval(() => {
        this.flushRemoteLogs();
      }, 30000); // Flush every 30 seconds
    }

    // Listen for page unload to flush remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushRemoteLogs();
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public setConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    return (
      level >= this.config.minLevel &&
      this.config.categories.includes(category)
    );
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    component: string,
    message: string,
    data?: any,
    studyId?: string,
    performanceMetrics?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      component,
      message,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      studyId,
      performanceMetrics
    };
  }

  private processLog(entry: LogEntry): void {
    // Add to local storage
    this.localLogs.push(entry);
    if (this.localLogs.length > this.config.maxLocalLogs) {
      this.localLogs.shift();
    }

    // Console logging for development
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Queue for remote logging
    if (this.config.enableRemote) {
      this.remoteQueue.push(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.category}:${entry.component}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (this.remoteQueue.length === 0) return;

    try {
      const logsToSend = [...this.remoteQueue];
      this.remoteQueue = [];

      const response = await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          sessionId: this.sessionId,
          userId: this.userId
        })
      });

      if (!response.ok) {
        // Re-queue logs if sending failed
        this.remoteQueue.unshift(...logsToSend);
      }
    } catch (error) {
      // Re-queue logs if sending failed
      this.remoteQueue.unshift(...this.remoteQueue);
    }
  }

  // Public logging methods
  public debug(
    category: LogCategory,
    component: string,
    message: string,
    data?: any,
    studyId?: string
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, category, component, message, data, studyId);
    this.processLog(entry);
  }

  public info(
    category: LogCategory,
    component: string,
    message: string,
    data?: any,
    studyId?: string
  ): void {
    if (!this.shouldLog(LogLevel.INFO, category)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, category, component, message, data, studyId);
    this.processLog(entry);
  }

  public warn(
    category: LogCategory,
    component: string,
    message: string,
    data?: any,
    studyId?: string
  ): void {
    if (!this.shouldLog(LogLevel.WARN, category)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, category, component, message, data, studyId);
    this.processLog(entry);
  }

  public error(
    category: LogCategory,
    component: string,
    message: string,
    error?: Error | any,
    studyId?: string
  ): void {
    if (!this.shouldLog(LogLevel.ERROR, category)) return;
    
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    const entry = this.createLogEntry(LogLevel.ERROR, category, component, message, errorData, studyId);
    this.processLog(entry);
  }

  // Performance logging
  public logPerformance(
    category: LogCategory,
    component: string,
    operation: string,
    duration: number,
    additionalMetrics?: any,
    studyId?: string
  ): void {
    if (!this.config.enablePerformanceLogging) return;

    const performanceMetrics = {
      duration,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      ...additionalMetrics
    };

    const entry = this.createLogEntry(
      LogLevel.INFO,
      category,
      component,
      `Performance: ${operation}`,
      null,
      studyId,
      performanceMetrics
    );
    
    this.processLog(entry);
  }

  // User action logging
  public logUserAction(
    component: string,
    action: string,
    details?: any,
    studyId?: string
  ): void {
    if (!this.config.enableUserActionLogging) return;

    this.info(
      LogCategory.USER_ACTION,
      component,
      `User action: ${action}`,
      details,
      studyId
    );
  }

  // Utility methods
  public getLogs(category?: LogCategory, component?: string): LogEntry[] {
    return this.localLogs.filter(log => {
      if (category && log.category !== category) return false;
      if (component && log.component !== component) return false;
      return true;
    });
  }

  public clearLogs(): void {
    this.localLogs = [];
  }

  public exportLogs(): string {
    return JSON.stringify(this.localLogs, null, 2);
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushRemoteLogs();
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Export convenience functions
export const logger = {
  debug: (category: LogCategory, component: string, message: string, data?: any, studyId?: string) =>
    loggingService.debug(category, component, message, data, studyId),
  
  info: (category: LogCategory, component: string, message: string, data?: any, studyId?: string) =>
    loggingService.info(category, component, message, data, studyId),
  
  warn: (category: LogCategory, component: string, message: string, data?: any, studyId?: string) =>
    loggingService.warn(category, component, message, data, studyId),
  
  error: (category: LogCategory, component: string, message: string, error?: Error | any, studyId?: string) =>
    loggingService.error(category, component, message, error, studyId),
  
  performance: (category: LogCategory, component: string, operation: string, duration: number, additionalMetrics?: any, studyId?: string) =>
    loggingService.logPerformance(category, component, operation, duration, additionalMetrics, studyId),
  
  userAction: (component: string, action: string, details?: any, studyId?: string) =>
    loggingService.logUserAction(component, action, details, studyId),
  
  setUserId: (userId: string) => loggingService.setUserId(userId),
  setConfig: (config: Partial<LoggingConfig>) => loggingService.setConfig(config),
  getLogs: (category?: LogCategory, component?: string) => loggingService.getLogs(category, component),
  clearLogs: () => loggingService.clearLogs(),
  exportLogs: () => loggingService.exportLogs()
};

export default loggingService;