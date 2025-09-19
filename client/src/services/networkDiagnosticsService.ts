import { apiService } from './api';

// Types for network diagnostics
export interface ConnectivityStatus {
  isConnected: boolean;
  latency: number;
  serverVersion?: string;
  corsEnabled: boolean;
  errors: string[];
}

export interface PreCheckResult {
  canUpload: boolean;
  maxFileSize: number;
  supportedFormats: string[];
  estimatedUploadTime: number;
  warnings: string[];
  errors: string[];
}

export interface HealthMetrics {
  responseTime: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
  timestamp: Date;
}

export interface DiagnosticReport {
  timestamp: Date;
  connectivity: ConnectivityStatus;
  systemHealth: {
    backend: boolean;
    database: boolean;
    uploadService: boolean;
  };
  recentErrors: ErrorLog[];
  performanceMetrics: PerformanceMetrics;
  recommendations: string[];
}

export interface ErrorLog {
  timestamp: Date;
  type: string;
  message: string;
  endpoint?: string;
  statusCode?: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successfulRequests: number;
  failedRequests: number;
  uptime: number;
}

class NetworkDiagnosticsService {
  private errorLog: ErrorLog[] = [];
  private performanceData: { timestamp: Date; responseTime: number; success: boolean }[] = [];
  private readonly maxLogSize = 100;

  /**
   * Check backend connectivity with detailed analysis
   */
  async checkBackendConnectivity(): Promise<ConnectivityStatus> {
    const startTime = Date.now();
    const errors: string[] = [];
    let isConnected = false;
    let serverVersion: string | undefined;
    let corsEnabled = false;

    try {
      // Test basic connectivity
      const healthResponse = await apiService.healthCheck();
      const latency = Date.now() - startTime;
      
      isConnected = true;
      serverVersion = healthResponse.version || 'unknown';
      
      // Test CORS by checking response headers
      corsEnabled = true; // If we got here, CORS is working
      
      // Log successful connection
      this.logPerformance(latency, true);
      
      return {
        isConnected,
        latency,
        serverVersion,
        corsEnabled,
        errors
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      // Analyze the error
      if (error.code === 'ECONNREFUSED') {
        errors.push('Backend server is not running or not accessible');
      } else if (error.code === 'ENOTFOUND') {
        errors.push('Backend server hostname cannot be resolved');
      } else if (error.message?.includes('CORS')) {
        errors.push('CORS policy is blocking the request');
        corsEnabled = false;
      } else if (error.code === 'ECONNABORTED') {
        errors.push('Connection timed out');
      } else {
        errors.push(`Connection failed: ${error.message}`);
      }

      // Log failed connection
      this.logPerformance(latency, false);
      this.logError('connectivity', error.message, '/health', error.response?.status);

      return {
        isConnected: false,
        latency,
        corsEnabled,
        errors
      };
    }
  }

  /**
   * Perform pre-upload checks to validate upload readiness
   */
  async performUploadPrecheck(fileSize: number): Promise<PreCheckResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let canUpload = true;

    try {
      // Check backend connectivity first
      const connectivity = await this.checkBackendConnectivity();
      if (!connectivity.isConnected) {
        canUpload = false;
        errors.push('Backend is not accessible');
        return {
          canUpload,
          maxFileSize: 0,
          supportedFormats: [],
          estimatedUploadTime: 0,
          warnings,
          errors
        };
      }

      // Check upload service health
      let uploadConfig;
      try {
        uploadConfig = await apiService.uploadHealthCheck();
      } catch (error) {
        // Fallback to default config if upload health endpoint is not available
        uploadConfig = {
          upload_config: {
            max_file_size: '100MB',
            supported_formats: ['dcm', 'dicom', 'pdf', 'jpg', 'png'],
            timeout: '60s'
          }
        };
        warnings.push('Upload health endpoint not available, using default configuration');
      }

      const maxFileSize = this.parseFileSize(uploadConfig.upload_config?.max_file_size || '100MB');
      const supportedFormats = uploadConfig.upload_config?.supported_formats || ['dcm', 'dicom', 'pdf', 'jpg', 'png'];

      // Validate file size
      if (fileSize > maxFileSize) {
        canUpload = false;
        errors.push(`File size (${this.formatFileSize(fileSize)}) exceeds maximum allowed size (${this.formatFileSize(maxFileSize)})`);
      } else if (fileSize > maxFileSize * 0.8) {
        warnings.push(`File size is close to the maximum limit. Upload may be slower.`);
      }

      // Estimate upload time based on file size and connection speed
      const estimatedUploadTime = this.estimateUploadTime(fileSize, connectivity.latency);

      if (estimatedUploadTime > 300) { // 5 minutes
        warnings.push(`Large file detected. Estimated upload time: ${Math.round(estimatedUploadTime / 60)} minutes`);
      }

      return {
        canUpload,
        maxFileSize,
        supportedFormats,
        estimatedUploadTime,
        warnings,
        errors
      };

    } catch (error: any) {
      this.logError('precheck', error.message);
      return {
        canUpload: false,
        maxFileSize: 0,
        supportedFormats: [],
        estimatedUploadTime: 0,
        warnings,
        errors: [`Pre-upload check failed: ${error.message}`]
      };
    }
  }

  /**
   * Monitor upload health during the process
   */
  async monitorUploadHealth(uploadId: string): Promise<HealthMetrics> {
    const startTime = Date.now();
    
    try {
      // Test connectivity during upload
      const connectivity = await this.checkBackendConnectivity();
      const responseTime = Date.now() - startTime;
      
      // Calculate success rate from recent performance data
      const recentData = this.performanceData.slice(-10); // Last 10 requests
      const successRate = recentData.length > 0 
        ? recentData.filter(d => d.success).length / recentData.length 
        : 1;

      const errorCount = this.errorLog.filter(
        e => Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
      ).length;

      const lastError = this.errorLog.length > 0 
        ? this.errorLog[this.errorLog.length - 1].message 
        : undefined;

      return {
        responseTime,
        successRate,
        errorCount,
        lastError,
        timestamp: new Date()
      };

    } catch (error: any) {
      this.logError('monitoring', error.message);
      return {
        responseTime: Date.now() - startTime,
        successRate: 0,
        errorCount: this.errorLog.length,
        lastError: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate comprehensive diagnostic report
   */
  async getDiagnosticReport(): Promise<DiagnosticReport> {
    const connectivity = await this.checkBackendConnectivity();
    
    // Test system health
    const systemHealth = {
      backend: connectivity.isConnected,
      database: false,
      uploadService: false
    };

    try {
      const healthResponse = await apiService.healthCheck();
      systemHealth.database = healthResponse.services?.database === 'connected';
    } catch (error) {
      // Database status unknown
    }

    try {
      await apiService.uploadHealthCheck();
      systemHealth.uploadService = true;
    } catch (error) {
      // Upload service status unknown
    }

    // Get recent errors (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentErrors = this.errorLog.filter(e => e.timestamp.getTime() > oneHourAgo);

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics();

    // Generate recommendations
    const recommendations = this.generateRecommendations(connectivity, systemHealth, recentErrors);

    return {
      timestamp: new Date(),
      connectivity,
      systemHealth,
      recentErrors,
      performanceMetrics,
      recommendations
    };
  }

  /**
   * Validate specific upload endpoints
   */
  async validateUploadEndpoints(): Promise<{ [endpoint: string]: boolean }> {
    const endpoints = {
      '/health': false,
      '/upload/health': false,
      '/patients/PAT001/upload/dicom': false,
      '/patients/PAT001/upload': false
    };

    // Test health endpoint
    try {
      await apiService.healthCheck();
      endpoints['/health'] = true;
    } catch (error) {
      this.logError('endpoint_validation', 'Health endpoint failed', '/health');
    }

    // Test upload health endpoint
    try {
      await apiService.uploadHealthCheck();
      endpoints['/upload/health'] = true;
    } catch (error) {
      this.logError('endpoint_validation', 'Upload health endpoint failed', '/upload/health');
    }

    // Note: We can't easily test the actual upload endpoints without sending files
    // In a real implementation, we might send OPTIONS requests to test CORS

    return endpoints;
  }

  // Private helper methods

  private logError(type: string, message: string, endpoint?: string, statusCode?: number): void {
    const error: ErrorLog = {
      timestamp: new Date(),
      type,
      message,
      endpoint,
      statusCode
    };

    this.errorLog.push(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  private logPerformance(responseTime: number, success: boolean): void {
    this.performanceData.push({
      timestamp: new Date(),
      responseTime,
      success
    });

    // Keep performance data manageable
    if (this.performanceData.length > this.maxLogSize) {
      this.performanceData = this.performanceData.slice(-this.maxLogSize);
    }
  }

  private parseFileSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+)\s*([A-Z]+)$/i);
    if (!match) return 100 * 1024 * 1024; // Default 100MB

    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();
    
    return value * (units[unit] || 1);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private estimateUploadTime(fileSize: number, latency: number): number {
    // Rough estimation based on file size and connection quality
    // Assumes average upload speed based on latency
    let uploadSpeedBps: number;
    
    if (latency < 50) {
      uploadSpeedBps = 10 * 1024 * 1024; // 10 Mbps for good connection
    } else if (latency < 200) {
      uploadSpeedBps = 5 * 1024 * 1024; // 5 Mbps for average connection
    } else {
      uploadSpeedBps = 1 * 1024 * 1024; // 1 Mbps for slow connection
    }

    return Math.ceil(fileSize / uploadSpeedBps);
  }

  private calculatePerformanceMetrics(): PerformanceMetrics {
    if (this.performanceData.length === 0) {
      return {
        averageResponseTime: 0,
        successfulRequests: 0,
        failedRequests: 0,
        uptime: 100
      };
    }

    const totalResponseTime = this.performanceData.reduce((sum, data) => sum + data.responseTime, 0);
    const averageResponseTime = totalResponseTime / this.performanceData.length;
    const successfulRequests = this.performanceData.filter(d => d.success).length;
    const failedRequests = this.performanceData.length - successfulRequests;
    const uptime = (successfulRequests / this.performanceData.length) * 100;

    return {
      averageResponseTime,
      successfulRequests,
      failedRequests,
      uptime
    };
  }

  private generateRecommendations(
    connectivity: ConnectivityStatus, 
    systemHealth: any, 
    recentErrors: ErrorLog[]
  ): string[] {
    const recommendations: string[] = [];

    if (!connectivity.isConnected) {
      recommendations.push('Check if the backend server is running and accessible');
      recommendations.push('Verify the API URL configuration in environment variables');
    }

    if (connectivity.latency > 1000) {
      recommendations.push('High latency detected. Consider checking network connection');
    }

    if (!connectivity.corsEnabled) {
      recommendations.push('CORS issues detected. Check backend CORS configuration');
    }

    if (!systemHealth.database) {
      recommendations.push('Database connectivity issues detected');
    }

    if (!systemHealth.uploadService) {
      recommendations.push('Upload service may not be properly configured');
    }

    if (recentErrors.length > 5) {
      recommendations.push('High error rate detected. Check system logs for details');
    }

    const timeoutErrors = recentErrors.filter(e => e.message.includes('timeout'));
    if (timeoutErrors.length > 0) {
      recommendations.push('Timeout errors detected. Consider increasing timeout values or checking file sizes');
    }

    if (recommendations.length === 0) {
      recommendations.push('System appears to be healthy. No immediate issues detected.');
    }

    return recommendations;
  }

  // Public utility methods for external use

  /**
   * Clear diagnostic logs and reset metrics
   */
  clearDiagnosticData(): void {
    this.errorLog = [];
    this.performanceData = [];
  }

  /**
   * Get current error log
   */
  getErrorLog(): ErrorLog[] {
    return [...this.errorLog];
  }

  /**
   * Get performance data
   */
  getPerformanceData(): { timestamp: Date; responseTime: number; success: boolean }[] {
    return [...this.performanceData];
  }
}

export const networkDiagnosticsService = new NetworkDiagnosticsService();