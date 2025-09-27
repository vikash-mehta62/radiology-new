/**
 * DICOM Security Validator
 * Comprehensive security validation for DICOM files to prevent vulnerabilities
 */

import * as dicomParser from 'dicom-parser';
import { errorHandler, ErrorType, ViewerError } from './errorHandler';

// Critical DICOM tags that must be validated
export const CRITICAL_DICOM_TAGS = {
  // Patient Information
  PATIENT_NAME: 'x00100010',
  PATIENT_ID: 'x00100020',
  PATIENT_BIRTH_DATE: 'x00100030',
  PATIENT_SEX: 'x00100040',
  
  // Study Information
  STUDY_INSTANCE_UID: 'x0020000d',
  STUDY_DATE: 'x00080020',
  STUDY_TIME: 'x00080030',
  MODALITY: 'x00080060',
  
  // Series Information
  SERIES_INSTANCE_UID: 'x0020000e',
  SERIES_NUMBER: 'x00200011',
  
  // Image Information
  SOP_INSTANCE_UID: 'x00080018',
  INSTANCE_NUMBER: 'x00200013',
  ROWS: 'x00280010',
  COLUMNS: 'x00280011',
  BITS_ALLOCATED: 'x00280100',
  BITS_STORED: 'x00280101',
  HIGH_BIT: 'x00280102',
  PIXEL_REPRESENTATION: 'x00280103',
  SAMPLES_PER_PIXEL: 'x00280002',
  PHOTOMETRIC_INTERPRETATION: 'x00280004',
  
  // Pixel Data
  PIXEL_DATA: 'x7fe00010',
  
  // Transfer Syntax
  TRANSFER_SYNTAX_UID: 'x00020010'
};

// Security limits for DICOM validation
export const SECURITY_LIMITS = {
  MAX_IMAGE_WIDTH: 8192,
  MAX_IMAGE_HEIGHT: 8192,
  MAX_PIXEL_DATA_SIZE: 512 * 1024 * 1024, // 512MB
  MAX_BITS_ALLOCATED: 32,
  MAX_SAMPLES_PER_PIXEL: 4,
  MIN_BITS_ALLOCATED: 1,
  MIN_SAMPLES_PER_PIXEL: 1,
  MAX_STRING_LENGTH: 1024,
  MAX_SEQUENCE_DEPTH: 10,
  MAX_SEQUENCE_ITEMS: 1000
};

export interface DicomValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
  metadata: {
    patientInfo?: any;
    studyInfo?: any;
    imageInfo?: any;
    pixelInfo?: any;
  };
}

export interface DicomSecurityAudit {
  timestamp: number;
  fileSize: number;
  validationResult: DicomValidationResult;
  processingTime: number;
  source: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class DicomSecurityValidator {
  private auditLog: DicomSecurityAudit[] = [];
  private maxAuditEntries = 1000;

  /**
   * Comprehensive DICOM file validation with security checks
   */
  async validateDicomFile(
    byteArray: Uint8Array,
    source: string = 'unknown'
  ): Promise<DicomValidationResult> {
    const startTime = performance.now();
    const result: DicomValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      securityIssues: [],
      metadata: {}
    };

    try {
      // 1. Basic file structure validation
      await this.validateFileStructure(byteArray, result);
      
      // 2. Parse DICOM data with security checks
      const dataSet = await this.secureParseDicom(byteArray, result);
      if (!dataSet) {
        return result;
      }

      // 3. Validate critical DICOM headers
      await this.validateCriticalHeaders(dataSet, result);
      
      // 4. Perform buffer overflow protection checks
      await this.validateBufferSafety(dataSet, result);
      
      // 5. Validate DICOM structure integrity
      await this.validateStructureIntegrity(dataSet, result);
      
      // 6. Extract and validate metadata
      await this.extractSecureMetadata(dataSet, result);
      
      // 7. Determine overall validation status
      result.isValid = result.errors.length === 0 && result.securityIssues.length === 0;
      
      // 8. Create security audit entry
      const processingTime = performance.now() - startTime;
      await this.createSecurityAudit(byteArray.length, result, processingTime, source);
      
      return result;
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.securityIssues.push('Unexpected error during validation - potential security risk');
      
      // Log security incident
      await errorHandler.handleError(error as Error, {
        severity: 'high'
      } as any);
      
      return result;
    }
  }

  /**
   * Validate basic DICOM file structure
   */
  private async validateFileStructure(
    byteArray: Uint8Array,
    result: DicomValidationResult
  ): Promise<void> {
    // Check minimum file size
    if (byteArray.length < 132) {
      result.errors.push('File too small to be a valid DICOM file');
      result.securityIssues.push('Potentially malformed file - security risk');
      return;
    }

    // Check DICOM preamble and prefix
    const preamble = byteArray.slice(128, 132);
    const expectedPrefix = new Uint8Array([0x44, 0x49, 0x43, 0x4D]); // "DICM"
    
    if (!this.arraysEqual(preamble, expectedPrefix)) {
      result.warnings.push('Missing or invalid DICOM prefix - may not be a standard DICOM file');
    }

    // Check for suspicious file size patterns
    if (byteArray.length > SECURITY_LIMITS.MAX_PIXEL_DATA_SIZE) {
      result.securityIssues.push(`File size exceeds security limit: ${byteArray.length} bytes`);
    }
  }

  /**
   * Securely parse DICOM data with error handling
   */
  private async secureParseDicom(
    byteArray: Uint8Array,
    result: DicomValidationResult
  ): Promise<dicomParser.DataSet | null> {
    try {
      // Parse with strict options for security
      const dataSet = dicomParser.parseDicom(byteArray, {
        untilTag: undefined,
        vrCallback: undefined,
        inflateSegmentedLosslessJPEG: false
      });
      
      return dataSet;
      
    } catch (error) {
      result.errors.push(`DICOM parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      result.securityIssues.push('Malformed DICOM structure detected - potential security risk');
      return null;
    }
  }

  /**
   * Validate critical DICOM headers for completeness and security
   */
  private async validateCriticalHeaders(
    dataSet: dicomParser.DataSet,
    result: DicomValidationResult
  ): Promise<void> {
    const missingCriticalTags: string[] = [];
    const invalidTags: string[] = [];

    // Check for required tags
    const requiredTags = [
      CRITICAL_DICOM_TAGS.SOP_INSTANCE_UID,
      CRITICAL_DICOM_TAGS.STUDY_INSTANCE_UID,
      CRITICAL_DICOM_TAGS.SERIES_INSTANCE_UID,
      CRITICAL_DICOM_TAGS.MODALITY
    ];

    for (const tag of requiredTags) {
      const element = dataSet.elements[tag];
      if (!element) {
        missingCriticalTags.push(tag);
      } else {
        // Validate tag content
        const value = dataSet.string(tag);
        if (!value || value.trim().length === 0) {
          invalidTags.push(`${tag}: empty value`);
        } else if (value.length > SECURITY_LIMITS.MAX_STRING_LENGTH) {
          result.securityIssues.push(`${tag}: value exceeds maximum length`);
        }
      }
    }

    if (missingCriticalTags.length > 0) {
      result.errors.push(`Missing critical DICOM tags: ${missingCriticalTags.join(', ')}`);
    }

    if (invalidTags.length > 0) {
      result.errors.push(`Invalid DICOM tag values: ${invalidTags.join(', ')}`);
    }

    // Validate UIDs format (should be valid DICOM UIDs)
    const uidTags = [
      CRITICAL_DICOM_TAGS.SOP_INSTANCE_UID,
      CRITICAL_DICOM_TAGS.STUDY_INSTANCE_UID,
      CRITICAL_DICOM_TAGS.SERIES_INSTANCE_UID
    ];

    for (const tag of uidTags) {
      const uid = dataSet.string(tag);
      if (uid && !this.isValidDicomUID(uid)) {
        result.securityIssues.push(`Invalid UID format in ${tag}: ${uid}`);
      }
    }
  }

  /**
   * Validate buffer safety and prevent overflow attacks
   */
  private async validateBufferSafety(
    dataSet: dicomParser.DataSet,
    result: DicomValidationResult
  ): Promise<void> {
    // Check image dimensions
    const rows = dataSet.uint16(CRITICAL_DICOM_TAGS.ROWS);
    const columns = dataSet.uint16(CRITICAL_DICOM_TAGS.COLUMNS);
    const bitsAllocated = dataSet.uint16(CRITICAL_DICOM_TAGS.BITS_ALLOCATED);
    const samplesPerPixel = dataSet.uint16(CRITICAL_DICOM_TAGS.SAMPLES_PER_PIXEL);

    if (rows && rows > SECURITY_LIMITS.MAX_IMAGE_HEIGHT) {
      result.securityIssues.push(`Image height exceeds security limit: ${rows} > ${SECURITY_LIMITS.MAX_IMAGE_HEIGHT}`);
    }

    if (columns && columns > SECURITY_LIMITS.MAX_IMAGE_WIDTH) {
      result.securityIssues.push(`Image width exceeds security limit: ${columns} > ${SECURITY_LIMITS.MAX_IMAGE_WIDTH}`);
    }

    if (bitsAllocated) {
      if (bitsAllocated > SECURITY_LIMITS.MAX_BITS_ALLOCATED) {
        result.securityIssues.push(`Bits allocated exceeds security limit: ${bitsAllocated}`);
      }
      if (bitsAllocated < SECURITY_LIMITS.MIN_BITS_ALLOCATED) {
        result.securityIssues.push(`Bits allocated below minimum: ${bitsAllocated}`);
      }
    }

    if (samplesPerPixel) {
      if (samplesPerPixel > SECURITY_LIMITS.MAX_SAMPLES_PER_PIXEL) {
        result.securityIssues.push(`Samples per pixel exceeds security limit: ${samplesPerPixel}`);
      }
      if (samplesPerPixel < SECURITY_LIMITS.MIN_SAMPLES_PER_PIXEL) {
        result.securityIssues.push(`Samples per pixel below minimum: ${samplesPerPixel}`);
      }
    }

    // Calculate expected pixel data size and validate
    if (rows && columns && bitsAllocated && samplesPerPixel) {
      const expectedPixelDataSize = rows * columns * (bitsAllocated / 8) * samplesPerPixel;
      
      if (expectedPixelDataSize > SECURITY_LIMITS.MAX_PIXEL_DATA_SIZE) {
        result.securityIssues.push(`Calculated pixel data size exceeds security limit: ${expectedPixelDataSize} bytes`);
      }

      // Check actual pixel data element if present
      const pixelDataElement = dataSet.elements[CRITICAL_DICOM_TAGS.PIXEL_DATA];
      if (pixelDataElement && pixelDataElement.length) {
        if (pixelDataElement.length > expectedPixelDataSize * 2) { // Allow some compression overhead
          result.securityIssues.push(`Pixel data size mismatch - potential buffer overflow risk`);
        }
      }
    }
  }

  /**
   * Validate DICOM structure integrity
   */
  private async validateStructureIntegrity(
    dataSet: dicomParser.DataSet,
    result: DicomValidationResult
  ): Promise<void> {
    let sequenceDepth = 0;
    let totalSequenceItems = 0;

    // Validate all elements in the dataset
    for (const [tag, element] of Object.entries(dataSet.elements)) {
      try {
        // Check for sequence elements and validate depth
        if (element.items) {
          sequenceDepth++;
          totalSequenceItems += element.items.length;
          
          if (sequenceDepth > SECURITY_LIMITS.MAX_SEQUENCE_DEPTH) {
            result.securityIssues.push(`Sequence nesting depth exceeds security limit: ${sequenceDepth}`);
          }
          
          if (totalSequenceItems > SECURITY_LIMITS.MAX_SEQUENCE_ITEMS) {
            result.securityIssues.push(`Total sequence items exceed security limit: ${totalSequenceItems}`);
          }
          
          // Recursively validate sequence items
          for (const item of element.items) {
            await this.validateSequenceItem(item as any, result, sequenceDepth);
          }
          
          sequenceDepth--;
        }

        // Validate element length
        if (element.length && element.length > SECURITY_LIMITS.MAX_PIXEL_DATA_SIZE) {
          result.securityIssues.push(`Element ${tag} length exceeds security limit: ${element.length}`);
        }

        // Check for undefined length elements (potential security risk)
        if (element.hadUndefinedLength) {
          result.warnings.push(`Element ${tag} had undefined length - potential parsing issue`);
        }

      } catch (error) {
        result.errors.push(`Error validating element ${tag}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Validate sequence items recursively
   */
  private async validateSequenceItem(
    item: dicomParser.DataSet,
    result: DicomValidationResult,
    depth: number
  ): Promise<void> {
    if (depth > SECURITY_LIMITS.MAX_SEQUENCE_DEPTH) {
      result.securityIssues.push(`Sequence item depth exceeds security limit: ${depth}`);
      return;
    }

    // Validate sequence item elements
    for (const [tag, element] of Object.entries(item.elements)) {
      if (element.items) {
        for (const nestedItem of element.items) {
          await this.validateSequenceItem(nestedItem as any, result, depth + 1);
        }
      }
    }
  }

  /**
   * Extract metadata securely with validation
   */
  private async extractSecureMetadata(
    dataSet: dicomParser.DataSet,
    result: DicomValidationResult
  ): Promise<void> {
    try {
      // Extract patient information safely
      result.metadata.patientInfo = {
        name: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.PATIENT_NAME)),
        id: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.PATIENT_ID)),
        birthDate: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.PATIENT_BIRTH_DATE)),
        sex: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.PATIENT_SEX))
      };

      // Extract study information safely
      result.metadata.studyInfo = {
        instanceUID: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.STUDY_INSTANCE_UID)),
        date: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.STUDY_DATE)),
        time: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.STUDY_TIME)),
        modality: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.MODALITY))
      };

      // Extract image information safely
      result.metadata.imageInfo = {
        rows: dataSet.uint16(CRITICAL_DICOM_TAGS.ROWS),
        columns: dataSet.uint16(CRITICAL_DICOM_TAGS.COLUMNS),
        instanceUID: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.SOP_INSTANCE_UID)),
        instanceNumber: dataSet.uint16(CRITICAL_DICOM_TAGS.INSTANCE_NUMBER)
      };

      // Extract pixel information safely
      result.metadata.pixelInfo = {
        bitsAllocated: dataSet.uint16(CRITICAL_DICOM_TAGS.BITS_ALLOCATED),
        bitsStored: dataSet.uint16(CRITICAL_DICOM_TAGS.BITS_STORED),
        highBit: dataSet.uint16(CRITICAL_DICOM_TAGS.HIGH_BIT),
        pixelRepresentation: dataSet.uint16(CRITICAL_DICOM_TAGS.PIXEL_REPRESENTATION),
        samplesPerPixel: dataSet.uint16(CRITICAL_DICOM_TAGS.SAMPLES_PER_PIXEL),
        photometricInterpretation: this.sanitizeString(dataSet.string(CRITICAL_DICOM_TAGS.PHOTOMETRIC_INTERPRETATION))
      };

    } catch (error) {
      result.warnings.push(`Error extracting metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create security audit entry
   */
  private async createSecurityAudit(
    fileSize: number,
    validationResult: DicomValidationResult,
    processingTime: number,
    source: string
  ): Promise<void> {
    const riskLevel = this.calculateRiskLevel(validationResult);
    
    const auditEntry: DicomSecurityAudit = {
      timestamp: Date.now(),
      fileSize,
      validationResult: { ...validationResult },
      processingTime,
      source,
      riskLevel
    };

    this.auditLog.push(auditEntry);

    // Maintain audit log size
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }

    // Log high-risk events
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await errorHandler.handleError(
        new Error(`High-risk DICOM file detected: ${validationResult.securityIssues.join(', ')}`),
        {
          severity: riskLevel === 'critical' ? 'critical' : 'high',
          metadata: { source, fileSize, riskLevel }
        } as any
      );
    }
  }

  /**
   * Calculate risk level based on validation results
   */
  private calculateRiskLevel(result: DicomValidationResult): 'low' | 'medium' | 'high' | 'critical' {
    if (result.securityIssues.length === 0 && result.errors.length === 0) {
      return 'low';
    }
    
    if (result.securityIssues.length > 0) {
      // Check for critical security issues
      const criticalKeywords = ['buffer overflow', 'exceeds security limit', 'malformed'];
      const hasCriticalIssue = result.securityIssues.some(issue =>
        criticalKeywords.some(keyword => issue.toLowerCase().includes(keyword))
      );
      
      if (hasCriticalIssue) {
        return 'critical';
      }
      
      return result.securityIssues.length > 3 ? 'high' : 'medium';
    }
    
    return result.errors.length > 2 ? 'medium' : 'low';
  }

  /**
   * Utility methods
   */
  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private isValidDicomUID(uid: string): boolean {
    // DICOM UID validation: should contain only digits and dots, max 64 chars
    const uidRegex = /^[0-9.]+$/;
    return uidRegex.test(uid) && uid.length <= 64 && !uid.startsWith('.') && !uid.endsWith('.');
  }

  private sanitizeString(value: string | undefined): string | undefined {
    if (!value) return undefined;
    
    // Remove potentially dangerous characters and limit length
    const sanitized = value
      .replace(/[<>\"'&]/g, '') // Remove HTML/XML dangerous chars
      .substring(0, SECURITY_LIMITS.MAX_STRING_LENGTH);
    
    return sanitized.trim() || undefined;
  }

  /**
   * Validate the environment for DICOM processing
   * Checks browser capabilities, security settings, and system requirements
   */
  async validateEnvironment(): Promise<boolean> {
    try {
      console.log('🔒 [DicomSecurityValidator] Validating environment...');
      
      // Check browser capabilities
      const browserChecks = this.validateBrowserCapabilities();
      
      // Check security settings
      const securityChecks = this.validateSecuritySettings();
      
      // Check memory availability
      const memoryChecks = this.validateMemoryAvailability();
      
      // Check WebGL/WebGPU support for rendering
      const renderingChecks = await this.validateRenderingCapabilities();
      
      const allChecks = [
        ...browserChecks,
        ...securityChecks,
        ...memoryChecks,
        ...renderingChecks
      ];
      
      const failedChecks = allChecks.filter(check => !check.passed);
      
      if (failedChecks.length > 0) {
        console.warn('⚠️ [DicomSecurityValidator] Environment validation warnings:', 
          failedChecks.map(check => check.message));
        
        // Log failed checks but don't block initialization
        await this.createSecurityAudit(
          0,
          {
            isValid: false,
            errors: failedChecks.map(check => check.message),
            warnings: [],
            securityIssues: failedChecks.filter(check => check.critical).map(check => check.message),
            metadata: {}
          },
          0,
          'environment-validation'
        );
        
        // Only fail if there are critical issues
        const criticalFailures = failedChecks.filter(check => check.critical);
        if (criticalFailures.length > 0) {
          console.error('❌ [DicomSecurityValidator] Critical environment validation failures:', 
            criticalFailures.map(check => check.message));
          return false;
        }
      }
      
      console.log('✅ [DicomSecurityValidator] Environment validation passed');
      return true;
      
    } catch (error) {
      console.error('❌ [DicomSecurityValidator] Environment validation failed:', error);
      return false;
    }
  }

  /**
   * Validate browser capabilities
   */
  private validateBrowserCapabilities(): Array<{passed: boolean, message: string, critical: boolean}> {
    const checks = [];
    
    // Check for required APIs
    checks.push({
      passed: typeof ArrayBuffer !== 'undefined',
      message: 'ArrayBuffer support required for DICOM processing',
      critical: true
    });
    
    checks.push({
      passed: typeof Uint8Array !== 'undefined',
      message: 'Uint8Array support required for binary data handling',
      critical: true
    });
    
    checks.push({
      passed: typeof Worker !== 'undefined',
      message: 'Web Workers support recommended for background processing',
      critical: false
    });
    
    checks.push({
      passed: typeof WebAssembly !== 'undefined',
      message: 'WebAssembly support recommended for performance',
      critical: false
    });
    
    // Check Canvas support
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      checks.push({
        passed: !!ctx,
        message: 'Canvas 2D context required for image rendering',
        critical: true
      });
    } catch (error) {
      checks.push({
        passed: false,
        message: 'Canvas support check failed',
        critical: true
      });
    }
    
    return checks;
  }

  /**
   * Validate security settings
   */
  private validateSecuritySettings(): Array<{passed: boolean, message: string, critical: boolean}> {
    const checks = [];
    
    // Check HTTPS in production
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    checks.push({
      passed: isSecure,
      message: 'HTTPS required for secure DICOM data transmission',
      critical: false // Not critical for development
    });
    
    // Check for Content Security Policy
    const hasCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
    checks.push({
      passed: hasCsp,
      message: 'Content Security Policy recommended for enhanced security',
      critical: false
    });
    
    return checks;
  }

  /**
   * Validate memory availability
   */
  private validateMemoryAvailability(): Array<{passed: boolean, message: string, critical: boolean}> {
    const checks = [];
    
    try {
      // Check available memory using performance.memory if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
        const minRequiredMemory = 128 * 1024 * 1024; // 128MB
        
        checks.push({
          passed: availableMemory > minRequiredMemory,
          message: `Insufficient memory available: ${Math.round(availableMemory / 1024 / 1024)}MB available, ${Math.round(minRequiredMemory / 1024 / 1024)}MB required`,
          critical: false
        });
      } else {
        // Fallback memory check
        checks.push({
          passed: true,
          message: 'Memory information not available, assuming sufficient',
          critical: false
        });
      }
    } catch (error) {
      checks.push({
        passed: true,
        message: 'Memory check failed, assuming sufficient',
        critical: false
      });
    }
    
    return checks;
  }

  /**
   * Validate rendering capabilities
   */
  private async validateRenderingCapabilities(): Promise<Array<{passed: boolean, message: string, critical: boolean}>> {
    const checks = [];
    
    try {
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      checks.push({
        passed: !!webglContext,
        message: 'WebGL support required for advanced rendering',
        critical: false
      });
      
      // Check WebGL2 support
      const webgl2Context = canvas.getContext('webgl2');
      checks.push({
        passed: !!webgl2Context,
        message: 'WebGL2 support recommended for enhanced rendering',
        critical: false
      });
      
      // Check WebGPU support (if available)
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          checks.push({
            passed: !!adapter,
            message: 'WebGPU support available for advanced rendering',
            critical: false
          });
        } catch (error) {
          checks.push({
            passed: false,
            message: 'WebGPU not available',
            critical: false
          });
        }
      } else {
        checks.push({
          passed: false,
          message: 'WebGPU not supported in this browser',
          critical: false
        });
      }
      
    } catch (error) {
      checks.push({
        passed: false,
        message: 'Rendering capabilities check failed',
        critical: false
      });
    }
    
    return checks;
  }

  /**
   * Get security audit log
   */
  getSecurityAuditLog(): DicomSecurityAudit[] {
    return [...this.auditLog];
  }

  /**
   * Clear security audit log
   */
  clearSecurityAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get security statistics
   */
  getSecurityStatistics(): {
    totalValidations: number;
    riskLevelCounts: Record<string, number>;
    recentHighRiskEvents: DicomSecurityAudit[];
  } {
    const riskLevelCounts = this.auditLog.reduce((acc, entry) => {
      acc[entry.riskLevel] = (acc[entry.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentHighRiskEvents = this.auditLog
      .filter(entry => entry.riskLevel === 'high' || entry.riskLevel === 'critical')
      .slice(-10); // Last 10 high-risk events

    return {
      totalValidations: this.auditLog.length,
      riskLevelCounts,
      recentHighRiskEvents
    };
  }
}

// Export singleton instance
export const dicomSecurityValidator = new DicomSecurityValidator();