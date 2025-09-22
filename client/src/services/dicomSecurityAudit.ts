/**
 * DICOM Security Audit Service
 * Provides comprehensive security auditing and monitoring for DICOM operations
 */

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'validation_success' | 'validation_failure' | 'security_violation' | 'suspicious_activity' | 'performance_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  imageId?: string;
  userId?: string;
  sessionId?: string;
  details: {
    message: string;
    metadata?: Record<string, any>;
    stackTrace?: string;
    validationErrors?: string[];
    performanceMetrics?: {
      loadTime: number;
      fileSize: number;
      memoryUsage: number;
    };
  };
  remediationActions?: string[];
}

export interface SecurityMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  securityViolations: number;
  averageValidationTime: number;
  suspiciousActivityCount: number;
  lastAuditTime: Date;
}

export interface AuditConfiguration {
  enableRealTimeMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionPeriodDays: number;
  alertThresholds: {
    failureRatePercent: number;
    suspiciousActivityCount: number;
    performanceThresholdMs: number;
  };
  enableAutomaticRemediation: boolean;
}

class DicomSecurityAuditService {
  private auditEvents: SecurityAuditEvent[] = [];
  private metrics: SecurityMetrics;
  private config: AuditConfiguration;
  private alertCallbacks: ((event: SecurityAuditEvent) => void)[] = [];

  constructor(config?: Partial<AuditConfiguration>) {
    this.config = {
      enableRealTimeMonitoring: true,
      logLevel: 'info',
      retentionPeriodDays: 30,
      alertThresholds: {
        failureRatePercent: 10,
        suspiciousActivityCount: 5,
        performanceThresholdMs: 5000
      },
      enableAutomaticRemediation: false,
      ...config
    };

    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      securityViolations: 0,
      averageValidationTime: 0,
      suspiciousActivityCount: 0,
      lastAuditTime: new Date()
    };

    // Initialize periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Log a security audit event
   */
  async logSecurityEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: SecurityAuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Add to audit log
    this.auditEvents.push(auditEvent);

    // Update metrics
    this.updateMetrics(auditEvent);

    // Log to console based on severity and configuration
    this.logToConsole(auditEvent);

    // Check for alert conditions
    await this.checkAlertConditions(auditEvent);

    // Trigger real-time monitoring if enabled
    if (this.config.enableRealTimeMonitoring) {
      this.notifyAlertCallbacks(auditEvent);
    }

    // Perform automatic remediation if enabled and applicable
    if (this.config.enableAutomaticRemediation && auditEvent.remediationActions) {
      await this.performAutomaticRemediation(auditEvent);
    }
  }

  /**
   * Log successful DICOM validation
   */
  async logValidationSuccess(imageId: string, performanceMetrics?: any): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'validation_success',
      severity: 'low',
      imageId,
      details: {
        message: `DICOM validation successful for image: ${imageId}`,
        performanceMetrics
      }
    });
  }

  /**
   * Log failed DICOM validation
   */
  async logValidationFailure(imageId: string, errors: string[], metadata?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'validation_failure',
      severity: 'high',
      imageId,
      details: {
        message: `DICOM validation failed for image: ${imageId}`,
        validationErrors: errors,
        metadata
      },
      remediationActions: [
        'Block file processing',
        'Notify security team',
        'Quarantine suspicious file'
      ]
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    imageId: string, 
    violationType: string, 
    details: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'security_violation',
      severity: 'critical',
      imageId,
      details: {
        message: `Security violation detected: ${violationType} - ${details}`,
        metadata
      },
      remediationActions: [
        'Immediately block processing',
        'Alert security team',
        'Log IP address for investigation',
        'Increase monitoring for this session'
      ]
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'medium',
      userId,
      sessionId,
      details: {
        message: `Suspicious activity detected: ${description}`,
        metadata
      },
      remediationActions: [
        'Increase monitoring',
        'Log additional context',
        'Review user permissions'
      ]
    });
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get audit events with filtering
   */
  getAuditEvents(filter?: {
    eventType?: SecurityAuditEvent['eventType'];
    severity?: SecurityAuditEvent['severity'];
    startDate?: Date;
    endDate?: Date;
    imageId?: string;
  }): SecurityAuditEvent[] {
    let events = [...this.auditEvents];

    if (filter) {
      if (filter.eventType) {
        events = events.filter(e => e.eventType === filter.eventType);
      }
      if (filter.severity) {
        events = events.filter(e => e.severity === filter.severity);
      }
      if (filter.startDate) {
        events = events.filter(e => e.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        events = events.filter(e => e.timestamp <= filter.endDate!);
      }
      if (filter.imageId) {
        events = events.filter(e => e.imageId === filter.imageId);
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate security report
   */
  generateSecurityReport(timeRange?: { start: Date; end: Date }): {
    summary: SecurityMetrics;
    events: SecurityAuditEvent[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const events = this.getAuditEvents(timeRange ? {
      startDate: timeRange.start,
      endDate: timeRange.end
    } : undefined);

    const recommendations = this.generateRecommendations(events);
    const riskLevel = this.calculateRiskLevel(events);

    return {
      summary: this.getSecurityMetrics(),
      events,
      recommendations,
      riskLevel
    };
  }

  /**
   * Register alert callback
   */
  onSecurityAlert(callback: (event: SecurityAuditEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Clear audit history
   */
  clearAuditHistory(): void {
    this.auditEvents = [];
    this.resetMetrics();
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(event: SecurityAuditEvent): void {
    this.metrics.lastAuditTime = new Date();

    switch (event.eventType) {
      case 'validation_success':
        this.metrics.totalValidations++;
        this.metrics.successfulValidations++;
        break;
      case 'validation_failure':
        this.metrics.totalValidations++;
        this.metrics.failedValidations++;
        break;
      case 'security_violation':
        this.metrics.securityViolations++;
        break;
      case 'suspicious_activity':
        this.metrics.suspiciousActivityCount++;
        break;
    }

    // Update average validation time if performance metrics are available
    if (event.details.performanceMetrics?.loadTime) {
      const totalTime = this.metrics.averageValidationTime * (this.metrics.totalValidations - 1);
      this.metrics.averageValidationTime = (totalTime + event.details.performanceMetrics.loadTime) / this.metrics.totalValidations;
    }
  }

  private logToConsole(event: SecurityAuditEvent): void {
    const logLevel = this.getSeverityLogLevel(event.severity);
    
    if (this.shouldLog(logLevel)) {
      const logMessage = `[DICOM Security Audit] ${event.eventType.toUpperCase()}: ${event.details.message}`;
      
      switch (event.severity) {
        case 'critical':
          console.error('🚨', logMessage, event);
          break;
        case 'high':
          console.error('❌', logMessage, event);
          break;
        case 'medium':
          console.warn('⚠️', logMessage, event);
          break;
        case 'low':
          console.info('ℹ️', logMessage);
          break;
      }
    }
  }

  private getSeverityLogLevel(severity: SecurityAuditEvent['severity']): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const eventLevelIndex = levels.indexOf(level);
    return eventLevelIndex >= configLevelIndex;
  }

  private async checkAlertConditions(event: SecurityAuditEvent): Promise<void> {
    // Check failure rate threshold
    if (this.metrics.totalValidations > 0) {
      const failureRate = (this.metrics.failedValidations / this.metrics.totalValidations) * 100;
      if (failureRate > this.config.alertThresholds.failureRatePercent) {
        await this.logSecurityEvent({
          eventType: 'performance_anomaly',
          severity: 'high',
          details: {
            message: `High failure rate detected: ${failureRate.toFixed(2)}%`,
            metadata: { failureRate, threshold: this.config.alertThresholds.failureRatePercent }
          }
        });
      }
    }

    // Check suspicious activity threshold
    if (this.metrics.suspiciousActivityCount > this.config.alertThresholds.suspiciousActivityCount) {
      await this.logSecurityEvent({
        eventType: 'security_violation',
        severity: 'critical',
        details: {
          message: `Suspicious activity threshold exceeded: ${this.metrics.suspiciousActivityCount} incidents`,
          metadata: { count: this.metrics.suspiciousActivityCount, threshold: this.config.alertThresholds.suspiciousActivityCount }
        }
      });
    }
  }

  private notifyAlertCallbacks(event: SecurityAuditEvent): void {
    if (event.severity === 'high' || event.severity === 'critical') {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in security alert callback:', error);
        }
      });
    }
  }

  private async performAutomaticRemediation(event: SecurityAuditEvent): Promise<void> {
    if (!event.remediationActions) return;

    console.log('🔧 [DICOM Security Audit] Performing automatic remediation:', event.remediationActions);

    // Implement automatic remediation actions based on the event
    for (const action of event.remediationActions) {
      try {
        await this.executeRemediationAction(action, event);
      } catch (error) {
        console.error('Failed to execute remediation action:', action, error);
      }
    }
  }

  private async executeRemediationAction(action: string, event: SecurityAuditEvent): Promise<void> {
    switch (action.toLowerCase()) {
      case 'block file processing':
        // Add to blocked files list (would need integration with file processing service)
        console.log('🚫 Blocking file processing for:', event.imageId);
        break;
      case 'increase monitoring':
        // Temporarily increase monitoring sensitivity
        console.log('👁️ Increasing monitoring sensitivity');
        break;
      case 'log additional context':
        // Log additional debugging information
        console.log('📝 Logging additional context for investigation');
        break;
      default:
        console.log('⚙️ Remediation action not implemented:', action);
    }
  }

  private generateRecommendations(events: SecurityAuditEvent[]): string[] {
    const recommendations: string[] = [];
    
    const criticalEvents = events.filter(e => e.severity === 'critical');
    const highEvents = events.filter(e => e.severity === 'high');
    const securityViolations = events.filter(e => e.eventType === 'security_violation');
    
    if (criticalEvents.length > 0) {
      recommendations.push('Immediate attention required: Critical security events detected');
    }
    
    if (securityViolations.length > 3) {
      recommendations.push('Consider implementing stricter validation rules');
      recommendations.push('Review and update security policies');
    }
    
    if (this.metrics.failedValidations > this.metrics.successfulValidations * 0.1) {
      recommendations.push('High validation failure rate - review DICOM file sources');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Security posture appears healthy - continue monitoring');
    }
    
    return recommendations;
  }

  private calculateRiskLevel(events: SecurityAuditEvent[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = events.filter(e => e.severity === 'critical').length;
    const highCount = events.filter(e => e.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 5) return 'high';
    if (highCount > 0) return 'medium';
    return 'low';
  }

  private startPeriodicCleanup(): void {
    // Clean up old audit events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000); // 1 hour
  }

  private cleanupOldEvents(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriodDays);
    
    const initialCount = this.auditEvents.length;
    this.auditEvents = this.auditEvents.filter(event => event.timestamp > cutoffDate);
    
    const removedCount = initialCount - this.auditEvents.length;
    if (removedCount > 0) {
      console.log(`🧹 [DICOM Security Audit] Cleaned up ${removedCount} old audit events`);
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      securityViolations: 0,
      averageValidationTime: 0,
      suspiciousActivityCount: 0,
      lastAuditTime: new Date()
    };
  }
}

// Export singleton instance
export const dicomSecurityAudit = new DicomSecurityAuditService();
export default dicomSecurityAudit;