/**
 * Environment Configuration Service
 * 
 * Centralized configuration management for environment variables
 * Provides type-safe access to environment variables with fallbacks
 */

export interface EnvironmentConfig {
  // Application Environment
  env: 'development' | 'production' | 'test';
  
  // API Configuration
  apiUrl: string;
  wsUrl: string;
  
  // DICOM Services
  dicomWebUrl: string;
  wadoRsUrl: string;
  qidoRsUrl: string;
  stowRsUrl: string;
  orthancUrl: string;
  
  // AI Services
  aiServiceUrl: string;
  aiEnhancementEnabled: boolean;
  
  // Collaboration
  collaborationUrl: string;
  collaborationEnabled: boolean;
  
  // Feature Flags
  enableAiAssist: boolean;
  enableRealtimeBilling: boolean;
  enableWorkflowTimer: boolean;
  enable3dNavigation: boolean;
  enableAdvancedTools: boolean;
  enableStructuredReporting: boolean;
  
  // Security
  authEnabled: boolean;
  jwtSecretKey: string;
  
  // Performance
  enablePerformanceMonitoring: boolean;
  cacheSizeMb: number;
  maxConcurrentRequests: number;
  
  // Logging
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableRemoteLogging: boolean;
  logEndpoint: string;
  
  // Network
  requestTimeout: number;
  retryAttempts: number;
  enableOfflineMode: boolean;
}

class EnvironmentService {
  private config: EnvironmentConfig;
  
  constructor() {
    this.config = this.loadConfiguration();
  }
  
  private loadConfiguration(): EnvironmentConfig {
    return {
      // Application Environment
      env: (process.env.REACT_APP_ENV as any) || 'development',
      
      // API Configuration
      apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
      
      // DICOM Services
      dicomWebUrl: process.env.REACT_APP_DICOM_WEB_URL || 'http://localhost:8080/dicomweb',
      wadoRsUrl: process.env.REACT_APP_WADO_RS_URL || 'http://localhost:8080/dicomweb',
      qidoRsUrl: process.env.REACT_APP_QIDO_RS_URL || 'http://localhost:8080/dicomweb',
      stowRsUrl: process.env.REACT_APP_STOW_RS_URL || 'http://localhost:8080/dicomweb',
      orthancUrl: process.env.REACT_APP_ORTHANC_URL || 'http://localhost:8042',
      
      // AI Services
      aiServiceUrl: process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:5000',
      aiEnhancementEnabled: process.env.REACT_APP_AI_ENHANCEMENT_ENABLED === 'true',
      
      // Collaboration
      collaborationUrl: process.env.REACT_APP_COLLABORATION_URL || 'http://localhost:3002',
      collaborationEnabled: process.env.REACT_APP_COLLABORATION_ENABLED === 'true',
      
      // Feature Flags
      enableAiAssist: process.env.REACT_APP_ENABLE_AI_ASSIST !== 'false',
      enableRealtimeBilling: process.env.REACT_APP_ENABLE_REALTIME_BILLING !== 'false',
      enableWorkflowTimer: process.env.REACT_APP_ENABLE_WORKFLOW_TIMER !== 'false',
      enable3dNavigation: process.env.REACT_APP_ENABLE_3D_NAVIGATION !== 'false',
      enableAdvancedTools: process.env.REACT_APP_ENABLE_ADVANCED_TOOLS !== 'false',
      enableStructuredReporting: process.env.REACT_APP_ENABLE_STRUCTURED_REPORTING !== 'false',
      
      // Security
      authEnabled: process.env.REACT_APP_AUTH_ENABLED === 'true',
      jwtSecretKey: process.env.REACT_APP_JWT_SECRET_KEY || 'default-dev-key',
      
      // Performance
      enablePerformanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING !== 'false',
      cacheSizeMb: parseInt(process.env.REACT_APP_CACHE_SIZE_MB || '512', 10),
      maxConcurrentRequests: parseInt(process.env.REACT_APP_MAX_CONCURRENT_REQUESTS || '10', 10),
      
      // Logging
      debug: process.env.REACT_APP_DEBUG === 'true',
      logLevel: (process.env.REACT_APP_LOG_LEVEL as any) || 'info',
      enableRemoteLogging: process.env.REACT_APP_ENABLE_REMOTE_LOGGING === 'true',
      logEndpoint: process.env.REACT_APP_LOG_ENDPOINT || 'http://localhost:3001/api/logs',
      
      // Network
      requestTimeout: parseInt(process.env.REACT_APP_REQUEST_TIMEOUT || '30000', 10),
      retryAttempts: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || '3', 10),
      enableOfflineMode: process.env.REACT_APP_ENABLE_OFFLINE_MODE === 'true',
    };
  }
  
  /**
   * Get the complete configuration object
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }
  
  /**
   * Get a specific configuration value
   */
  get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }
  
  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.config.env === 'development';
  }
  
  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.config.env === 'production';
  }
  
  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return this.config.env === 'test';
  }
  
  /**
   * Get API base URL with proper formatting
   */
  getApiUrl(endpoint?: string): string {
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    return endpoint ? `${baseUrl}/${endpoint.replace(/^\//, '')}` : baseUrl;
  }
  
  /**
   * Get DICOM service URL with proper formatting
   */
  getDicomUrl(service: 'wado' | 'qido' | 'stow' = 'wado', endpoint?: string): string {
    let baseUrl: string;
    switch (service) {
      case 'wado':
        baseUrl = this.config.wadoRsUrl;
        break;
      case 'qido':
        baseUrl = this.config.qidoRsUrl;
        break;
      case 'stow':
        baseUrl = this.config.stowRsUrl;
        break;
      default:
        baseUrl = this.config.dicomWebUrl;
    }
    
    baseUrl = baseUrl.replace(/\/$/, '');
    return endpoint ? `${baseUrl}/${endpoint.replace(/^\//, '')}` : baseUrl;
  }
  
  /**
   * Get collaboration service URL
   */
  getCollaborationUrl(endpoint?: string): string {
    const baseUrl = this.config.collaborationUrl.replace(/\/$/, '');
    return endpoint ? `${baseUrl}/${endpoint.replace(/^\//, '')}` : baseUrl;
  }
  
  /**
   * Validate configuration and log warnings for missing required values
   */
  validateConfiguration(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;
    
    // Check required URLs in production
    if (this.isProduction()) {
      const requiredUrls = [
        { key: 'apiUrl', value: this.config.apiUrl },
        { key: 'dicomWebUrl', value: this.config.dicomWebUrl },
        { key: 'orthancUrl', value: this.config.orthancUrl }
      ];
      
      requiredUrls.forEach(({ key, value }) => {
        if (value.includes('localhost') || value.includes('127.0.0.1')) {
          warnings.push(`Production environment detected but ${key} is still using localhost: ${value}`);
          isValid = false;
        }
      });
      
      // Check authentication in production
      if (!this.config.authEnabled) {
        warnings.push('Authentication is disabled in production environment');
      }
      
      // Check JWT secret
      if (this.config.jwtSecretKey === 'default-dev-key' || this.config.jwtSecretKey.includes('your-')) {
        warnings.push('JWT secret key appears to be using default/placeholder value in production');
        isValid = false;
      }
    }
    
    return { isValid, warnings };
  }
}

// Create singleton instance
export const environmentService = new EnvironmentService();

// Export configuration for direct access
export const config = environmentService.getConfig();

// Export commonly used values
export const {
  env,
  apiUrl,
  dicomWebUrl,
  orthancUrl,
  enablePerformanceMonitoring,
  debug,
  logLevel
} = config;