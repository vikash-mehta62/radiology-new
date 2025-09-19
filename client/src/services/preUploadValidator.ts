import { networkDiagnosticsService } from './networkDiagnosticsService';
import { apiService } from './api';

// Types for pre-upload validation
export interface ValidationResult {
  isValid: boolean;
  readinessScore: number; // 0-100
  checks: ValidationCheck[];
  warnings: ValidationWarning[];
  errors: ValidationError[];
  recommendations: string[];
  estimatedUploadTime?: number;
  canProceed: boolean;
}

export interface ValidationCheck {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'checking';
  message: string;
  details?: string;
  weight: number; // Impact on readiness score (0-1)
  category: 'connectivity' | 'file' | 'system' | 'configuration';
  icon?: string;
}

export interface ValidationWarning {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  recommendation: string;
  canIgnore: boolean;
}

export interface ValidationError {
  id: string;
  message: string;
  category: string;
  resolution: string;
  blocking: boolean;
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  requireDicom?: boolean;
  maxTotalSize?: number;
}

export interface ConnectivityValidationOptions {
  timeout?: number;
  requiredEndpoints?: string[];
  minimumSpeed?: number;
}

export interface SystemValidationOptions {
  checkBrowserSupport?: boolean;
  checkStorageQuota?: boolean;
  checkMemoryUsage?: boolean;
}

class PreUploadValidator {
  private defaultFileOptions: FileValidationOptions = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['dcm', 'dicom', 'pdf', 'jpg', 'jpeg', 'png', 'txt'],
    requireDicom: false,
    maxTotalSize: 500 * 1024 * 1024 // 500MB total
  };

  private defaultConnectivityOptions: ConnectivityValidationOptions = {
    timeout: 10000,
    requiredEndpoints: ['/health', '/upload/health'],
    minimumSpeed: 1024 * 1024 // 1 Mbps minimum
  };

  private defaultSystemOptions: SystemValidationOptions = {
    checkBrowserSupport: true,
    checkStorageQuota: true,
    checkMemoryUsage: true
  };

  /**
   * Perform comprehensive pre-upload validation
   */
  async validateUploadReadiness(
    files: File[],
    patientId: string,
    fileOptions?: Partial<FileValidationOptions>,
    connectivityOptions?: Partial<ConnectivityValidationOptions>,
    systemOptions?: Partial<SystemValidationOptions>
  ): Promise<ValidationResult> {
    console.log('🔍 Starting pre-upload validation for', files.length, 'files');

    const mergedFileOptions = { ...this.defaultFileOptions, ...fileOptions };
    const mergedConnectivityOptions = { ...this.defaultConnectivityOptions, ...connectivityOptions };
    const mergedSystemOptions = { ...this.defaultSystemOptions, ...systemOptions };

    const checks: ValidationCheck[] = [];
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: string[] = [];

    // Run all validation checks
    const connectivityChecks = await this.validateConnectivity(mergedConnectivityOptions);
    const fileChecks = await this.validateFiles(files, mergedFileOptions);
    const systemChecks = await this.validateSystem(mergedSystemOptions);
    const configurationChecks = await this.validateConfiguration(patientId);

    checks.push(...connectivityChecks.checks);
    checks.push(...fileChecks.checks);
    checks.push(...systemChecks.checks);
    checks.push(...configurationChecks.checks);

    warnings.push(...connectivityChecks.warnings);
    warnings.push(...fileChecks.warnings);
    warnings.push(...systemChecks.warnings);
    warnings.push(...configurationChecks.warnings);

    errors.push(...connectivityChecks.errors);
    errors.push(...fileChecks.errors);
    errors.push(...systemChecks.errors);
    errors.push(...configurationChecks.errors);

    // Calculate readiness score
    const readinessScore = this.calculateReadinessScore(checks);

    // Determine if upload can proceed
    const blockingErrors = errors.filter(e => e.blocking);
    const canProceed = blockingErrors.length === 0 && readinessScore >= 60;

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(checks, warnings, errors));

    // Estimate upload time
    const estimatedUploadTime = await this.estimateUploadTime(files, connectivityChecks.latency);

    const result: ValidationResult = {
      isValid: canProceed,
      readinessScore,
      checks,
      warnings,
      errors,
      recommendations,
      estimatedUploadTime,
      canProceed
    };

    console.log('✅ Pre-upload validation complete:', result);
    return result;
  }

  /**
   * Quick connectivity check for immediate feedback
   */
  async quickConnectivityCheck(): Promise<{
    isConnected: boolean;
    latency: number;
    message: string;
  }> {
    try {
      const result = await apiService.testConnectivity();
      return {
        isConnected: result.connected,
        latency: result.latency,
        message: result.connected 
          ? `Connected (${result.latency}ms)` 
          : result.error || 'Connection failed'
      };
    } catch (error) {
      return {
        isConnected: false,
        latency: 0,
        message: 'Unable to test connectivity'
      };
    }
  }

  /**
   * Validate individual file before adding to upload queue
   */
  async validateSingleFile(
    file: File,
    options?: Partial<FileValidationOptions>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fileInfo: {
      name: string;
      size: string;
      type: string;
      isDicom: boolean;
    };
  }> {
    const mergedOptions = { ...this.defaultFileOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // File size validation
    if (file.size > mergedOptions.maxFileSize!) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(mergedOptions.maxFileSize!)})`);
    } else if (file.size > mergedOptions.maxFileSize! * 0.8) {
      warnings.push(`File size is close to the maximum limit`);
    }

    // File type validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isDicom = ['dcm', 'dicom'].includes(fileExtension);
    
    if (!mergedOptions.allowedTypes!.includes(fileExtension)) {
      errors.push(`File type '.${fileExtension}' is not supported. Allowed types: ${mergedOptions.allowedTypes!.join(', ')}`);
    }

    if (mergedOptions.requireDicom && !isDicom) {
      errors.push('Only DICOM files are allowed for this upload');
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      warnings.push('File name contains special characters that may cause issues');
    }

    // Empty file check
    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        name: file.name,
        size: this.formatFileSize(file.size),
        type: fileExtension.toUpperCase(),
        isDicom
      }
    };
  }

  // Private validation methods

  private async validateConnectivity(options: ConnectivityValidationOptions): Promise<{
    checks: ValidationCheck[];
    warnings: ValidationWarning[];
    errors: ValidationError[];
    latency: number;
  }> {
    const checks: ValidationCheck[] = [];
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    let latency = 0;

    // Backend connectivity check
    try {
      const connectivityResult = await networkDiagnosticsService.checkBackendConnectivity();
      latency = connectivityResult.latency;

      checks.push({
        id: 'backend-connectivity',
        name: 'Backend Connection',
        status: connectivityResult.isConnected ? 'passed' : 'failed',
        message: connectivityResult.isConnected 
          ? `Connected (${connectivityResult.latency}ms)` 
          : 'Backend server is not accessible',
        details: connectivityResult.errors.join('; '),
        weight: 0.3,
        category: 'connectivity',
        icon: '🌐'
      });

      if (!connectivityResult.isConnected) {
        errors.push({
          id: 'backend-unreachable',
          message: 'Cannot connect to backend server',
          category: 'connectivity',
          resolution: 'Check your internet connection and ensure the server is running',
          blocking: true
        });
      } else if (connectivityResult.latency > 2000) {
        warnings.push({
          id: 'high-latency',
          message: 'High network latency detected',
          severity: 'medium',
          category: 'connectivity',
          recommendation: 'Consider using a faster internet connection for better upload performance',
          canIgnore: true
        });
      }

      // CORS check
      checks.push({
        id: 'cors-configuration',
        name: 'CORS Configuration',
        status: connectivityResult.corsEnabled ? 'passed' : 'failed',
        message: connectivityResult.corsEnabled 
          ? 'CORS is properly configured' 
          : 'CORS configuration issue detected',
        weight: 0.2,
        category: 'connectivity',
        icon: '🔒'
      });

      if (!connectivityResult.corsEnabled) {
        errors.push({
          id: 'cors-blocked',
          message: 'Browser security settings are blocking requests',
          category: 'connectivity',
          resolution: 'Contact your system administrator to fix CORS configuration',
          blocking: true
        });
      }

    } catch (error) {
      checks.push({
        id: 'connectivity-test',
        name: 'Connectivity Test',
        status: 'failed',
        message: 'Failed to test connectivity',
        details: error instanceof Error ? error.message : 'Unknown error',
        weight: 0.3,
        category: 'connectivity',
        icon: '❌'
      });

      errors.push({
        id: 'connectivity-test-failed',
        message: 'Unable to test backend connectivity',
        category: 'connectivity',
        resolution: 'Check your internet connection and try again',
        blocking: true
      });
    }

    // Upload service health check
    try {
      await apiService.uploadHealthCheck();
      
      checks.push({
        id: 'upload-service',
        name: 'Upload Service',
        status: 'passed',
        message: 'Upload service is healthy',
        weight: 0.2,
        category: 'connectivity',
        icon: '📤'
      });

    } catch (error) {
      checks.push({
        id: 'upload-service',
        name: 'Upload Service',
        status: 'warning',
        message: 'Upload service health check failed',
        details: 'Service may still work, but health endpoint is not available',
        weight: 0.1,
        category: 'connectivity',
        icon: '⚠️'
      });

      warnings.push({
        id: 'upload-service-health',
        message: 'Upload service health check failed',
        severity: 'low',
        category: 'connectivity',
        recommendation: 'Upload may still work, but monitoring is limited',
        canIgnore: true
      });
    }

    return { checks, warnings, errors, latency };
  }

  private async validateFiles(files: File[], options: FileValidationOptions): Promise<{
    checks: ValidationCheck[];
    warnings: ValidationWarning[];
    errors: ValidationError[];
  }> {
    const checks: ValidationCheck[] = [];
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];

    // File count check
    checks.push({
      id: 'file-count',
      name: 'File Count',
      status: files.length > 0 ? 'passed' : 'failed',
      message: `${files.length} file(s) selected`,
      weight: 0.1,
      category: 'file',
      icon: '📁'
    });

    if (files.length === 0) {
      errors.push({
        id: 'no-files',
        message: 'No files selected for upload',
        category: 'file',
        resolution: 'Select at least one file to upload',
        blocking: true
      });
      return { checks, warnings, errors };
    }

    // Total size check
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeValid = totalSize <= options.maxTotalSize!;

    checks.push({
      id: 'total-size',
      name: 'Total Size',
      status: totalSizeValid ? 'passed' : 'failed',
      message: `Total size: ${this.formatFileSize(totalSize)} / ${this.formatFileSize(options.maxTotalSize!)}`,
      weight: 0.2,
      category: 'file',
      icon: '📏'
    });

    if (!totalSizeValid) {
      errors.push({
        id: 'total-size-exceeded',
        message: `Total file size exceeds maximum allowed (${this.formatFileSize(options.maxTotalSize!)})`,
        category: 'file',
        resolution: 'Remove some files or compress them to reduce total size',
        blocking: true
      });
    }

    // Individual file validation
    let validFiles = 0;
    let dicomFiles = 0;
    const oversizedFiles: string[] = [];
    const unsupportedFiles: string[] = [];

    for (const file of files) {
      const validation = await this.validateSingleFile(file, options);
      
      if (validation.isValid) {
        validFiles++;
      }

      if (validation.fileInfo.isDicom) {
        dicomFiles++;
      }

      if (validation.errors.some(e => e.includes('exceeds maximum'))) {
        oversizedFiles.push(file.name);
      }

      if (validation.errors.some(e => e.includes('not supported'))) {
        unsupportedFiles.push(file.name);
      }

      // Add warnings for individual files
      validation.warnings.forEach(warning => {
        warnings.push({
          id: `file-warning-${file.name}`,
          message: `${file.name}: ${warning}`,
          severity: 'low',
          category: 'file',
          recommendation: 'Consider renaming or reformatting the file',
          canIgnore: true
        });
      });
    }

    // File validation summary
    checks.push({
      id: 'file-validation',
      name: 'File Validation',
      status: validFiles === files.length ? 'passed' : 'failed',
      message: `${validFiles}/${files.length} files are valid`,
      weight: 0.3,
      category: 'file',
      icon: '✅'
    });

    if (oversizedFiles.length > 0) {
      errors.push({
        id: 'oversized-files',
        message: `Files exceed size limit: ${oversizedFiles.join(', ')}`,
        category: 'file',
        resolution: 'Compress or split large files',
        blocking: true
      });
    }

    if (unsupportedFiles.length > 0) {
      errors.push({
        id: 'unsupported-files',
        message: `Unsupported file types: ${unsupportedFiles.join(', ')}`,
        category: 'file',
        resolution: 'Convert files to supported formats or remove them',
        blocking: true
      });
    }

    // DICOM file check
    if (options.requireDicom && dicomFiles === 0) {
      errors.push({
        id: 'no-dicom-files',
        message: 'No DICOM files found',
        category: 'file',
        resolution: 'Select DICOM files (.dcm or .dicom extension)',
        blocking: true
      });
    }

    if (dicomFiles > 0) {
      checks.push({
        id: 'dicom-files',
        name: 'DICOM Files',
        status: 'passed',
        message: `${dicomFiles} DICOM file(s) detected`,
        weight: 0.1,
        category: 'file',
        icon: '🏥'
      });
    }

    return { checks, warnings, errors };
  }

  private async validateSystem(options: SystemValidationOptions): Promise<{
    checks: ValidationCheck[];
    warnings: ValidationWarning[];
    errors: ValidationError[];
  }> {
    const checks: ValidationCheck[] = [];
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];

    // Browser support check
    if (options.checkBrowserSupport) {
      const browserSupport = this.checkBrowserSupport();
      
      checks.push({
        id: 'browser-support',
        name: 'Browser Support',
        status: browserSupport.supported ? 'passed' : 'failed',
        message: browserSupport.message,
        details: browserSupport.details,
        weight: 0.2,
        category: 'system',
        icon: '🌐'
      });

      if (!browserSupport.supported) {
        errors.push({
          id: 'browser-unsupported',
          message: 'Browser does not support required features',
          category: 'system',
          resolution: 'Use a modern browser like Chrome, Firefox, Safari, or Edge',
          blocking: true
        });
      }

      browserSupport.warnings.forEach(warning => {
        warnings.push({
          id: `browser-warning-${Date.now()}`,
          message: warning,
          severity: 'medium',
          category: 'system',
          recommendation: 'Consider updating your browser for better performance',
          canIgnore: true
        });
      });
    }

    // Storage quota check
    if (options.checkStorageQuota) {
      try {
        const storageEstimate = await navigator.storage?.estimate();
        if (storageEstimate) {
          const usedSpace = storageEstimate.usage || 0;
          const totalSpace = storageEstimate.quota || 0;
          const availableSpace = totalSpace - usedSpace;
          const usagePercentage = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;

          checks.push({
            id: 'storage-quota',
            name: 'Storage Space',
            status: usagePercentage < 90 ? 'passed' : 'warning',
            message: `${this.formatFileSize(availableSpace)} available (${(100 - usagePercentage).toFixed(1)}% free)`,
            weight: 0.1,
            category: 'system',
            icon: '💾'
          });

          if (usagePercentage > 95) {
            warnings.push({
              id: 'low-storage',
              message: 'Very low storage space available',
              severity: 'high',
              category: 'system',
              recommendation: 'Clear browser cache or free up disk space',
              canIgnore: false
            });
          }
        }
      } catch (error) {
        checks.push({
          id: 'storage-quota',
          name: 'Storage Space',
          status: 'warning',
          message: 'Unable to check storage quota',
          weight: 0.05,
          category: 'system',
          icon: '❓'
        });
      }
    }

    // Memory usage check
    if (options.checkMemoryUsage) {
      const memoryInfo = this.getMemoryInfo();
      
      checks.push({
        id: 'memory-usage',
        name: 'Memory Usage',
        status: memoryInfo.status,
        message: memoryInfo.message,
        weight: 0.1,
        category: 'system',
        icon: '🧠'
      });

      if (memoryInfo.warnings.length > 0) {
        memoryInfo.warnings.forEach(warning => {
          warnings.push({
            id: `memory-warning-${Date.now()}`,
            message: warning,
            severity: 'medium',
            category: 'system',
            recommendation: 'Close other browser tabs or applications to free up memory',
            canIgnore: true
          });
        });
      }
    }

    return { checks, warnings, errors };
  }

  private async validateConfiguration(patientId: string): Promise<{
    checks: ValidationCheck[];
    warnings: ValidationWarning[];
    errors: ValidationError[];
  }> {
    const checks: ValidationCheck[] = [];
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];

    // Patient ID validation
    const patientIdValid = /^[A-Z0-9]+$/.test(patientId) && patientId.length >= 3;
    
    checks.push({
      id: 'patient-id',
      name: 'Patient ID',
      status: patientIdValid ? 'passed' : 'failed',
      message: patientIdValid ? `Patient ID: ${patientId}` : 'Invalid patient ID format',
      weight: 0.2,
      category: 'configuration',
      icon: '🏥'
    });

    if (!patientIdValid) {
      errors.push({
        id: 'invalid-patient-id',
        message: 'Patient ID format is invalid',
        category: 'configuration',
        resolution: 'Use a valid patient ID (alphanumeric, at least 3 characters)',
        blocking: true
      });
    }

    // Environment configuration check
    const apiUrl = process.env.REACT_APP_API_URL;
    const isLocalhost = apiUrl?.includes('localhost') || apiUrl?.includes('127.0.0.1');
    
    checks.push({
      id: 'api-configuration',
      name: 'API Configuration',
      status: apiUrl ? 'passed' : 'failed',
      message: apiUrl ? `API URL: ${apiUrl}` : 'API URL not configured',
      weight: 0.1,
      category: 'configuration',
      icon: '⚙️'
    });

    if (!apiUrl) {
      errors.push({
        id: 'missing-api-url',
        message: 'API URL is not configured',
        category: 'configuration',
        resolution: 'Set REACT_APP_API_URL environment variable',
        blocking: true
      });
    } else if (isLocalhost) {
      warnings.push({
        id: 'localhost-api',
        message: 'Using localhost API endpoint',
        severity: 'low',
        category: 'configuration',
        recommendation: 'Ensure the local server is running',
        canIgnore: true
      });
    }

    return { checks, warnings, errors };
  }

  // Helper methods

  private calculateReadinessScore(checks: ValidationCheck[]): number {
    if (checks.length === 0) return 0;

    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const passedWeight = checks
      .filter(check => check.status === 'passed')
      .reduce((sum, check) => sum + check.weight, 0);

    const warningWeight = checks
      .filter(check => check.status === 'warning')
      .reduce((sum, check) => sum + (check.weight * 0.5), 0);

    return Math.round(((passedWeight + warningWeight) / totalWeight) * 100);
  }

  private generateRecommendations(
    checks: ValidationCheck[],
    warnings: ValidationWarning[],
    errors: ValidationError[]
  ): string[] {
    const recommendations: string[] = [];

    // Add error resolutions
    errors.forEach(error => {
      recommendations.push(`❌ ${error.resolution}`);
    });

    // Add warning recommendations
    warnings
      .filter(warning => !warning.canIgnore)
      .forEach(warning => {
        recommendations.push(`⚠️ ${warning.recommendation}`);
      });

    // Add general recommendations based on checks
    const failedConnectivity = checks.some(c => c.category === 'connectivity' && c.status === 'failed');
    if (failedConnectivity) {
      recommendations.push('🌐 Check your internet connection and server availability');
    }

    const largeFiles = checks.some(c => c.id === 'total-size' && c.status === 'warning');
    if (largeFiles) {
      recommendations.push('📁 Consider compressing files or uploading in smaller batches');
    }

    return recommendations;
  }

  private async estimateUploadTime(files: File[], latency: number): Promise<number> {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    // Estimate upload speed based on latency
    let estimatedSpeed: number; // bytes per second
    if (latency < 50) {
      estimatedSpeed = 10 * 1024 * 1024; // 10 Mbps
    } else if (latency < 200) {
      estimatedSpeed = 5 * 1024 * 1024; // 5 Mbps
    } else {
      estimatedSpeed = 1 * 1024 * 1024; // 1 Mbps
    }

    return Math.ceil(totalSize / estimatedSpeed);
  }

  private checkBrowserSupport(): {
    supported: boolean;
    message: string;
    details: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const requiredFeatures = {
      'File API': typeof File !== 'undefined',
      'FormData': typeof FormData !== 'undefined',
      'XMLHttpRequest': typeof XMLHttpRequest !== 'undefined',
      'Promise': typeof Promise !== 'undefined',
      'Fetch API': typeof fetch !== 'undefined'
    };

    const unsupportedFeatures = Object.entries(requiredFeatures)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature);

    const supported = unsupportedFeatures.length === 0;

    // Check for optional features
    if (!navigator.storage) {
      warnings.push('Storage API not available - storage quota checks disabled');
    }

    if (!navigator.clipboard) {
      warnings.push('Clipboard API not available - copy functionality limited');
    }

    return {
      supported,
      message: supported 
        ? 'Browser supports all required features' 
        : `Missing features: ${unsupportedFeatures.join(', ')}`,
      details: `Checked: ${Object.keys(requiredFeatures).join(', ')}`,
      warnings
    };
  }

  private getMemoryInfo(): {
    status: 'passed' | 'warning' | 'failed';
    message: string;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check if performance.memory is available (Chrome only)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      const usagePercentage = (usedMB / limitMB) * 100;

      if (usagePercentage > 80) {
        warnings.push('High memory usage detected');
        return {
          status: 'warning',
          message: `Memory usage: ${usedMB}MB / ${limitMB}MB (${usagePercentage.toFixed(1)}%)`,
          warnings
        };
      }

      return {
        status: 'passed',
        message: `Memory usage: ${usedMB}MB / ${limitMB}MB (${usagePercentage.toFixed(1)}%)`,
        warnings
      };
    }

    return {
      status: 'passed',
      message: 'Memory information not available',
      warnings: ['Memory usage cannot be checked in this browser']
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const preUploadValidator = new PreUploadValidator();