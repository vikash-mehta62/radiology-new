/**
 * Quality Assurance Service - Medical Imaging Quality Management
 * 
 * Comprehensive quality assurance service for medical imaging applications:
 * - Image quality assessment and validation
 * - System performance monitoring
 * - Quality metrics tracking and reporting
 * - Automated quality checks and alerts
 * - Compliance with quality standards
 * - Continuous improvement processes
 */

import { auditService } from './auditService';

export interface QualityAssuranceConfig {
  enabledChecks: string[];
  qualityLevel: 'basic' | 'standard' | 'comprehensive' | 'enterprise';
  automaticChecks: boolean;
  checkFrequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
  alertThresholds: QualityThresholds;
  reportingEnabled: boolean;
  benchmarkingEnabled: boolean;
}

export interface QualityThresholds {
  imageQuality: {
    contrast: { min: number; target: number };
    noise: { max: number; target: number };
    resolution: { min: number; target: number };
    artifacts: { max: number; target: number };
  };
  systemPerformance: {
    responseTime: { max: number; target: number };
    throughput: { min: number; target: number };
    availability: { min: number; target: number };
    errorRate: { max: number; target: number };
  };
  userExperience: {
    loadTime: { max: number; target: number };
    renderTime: { max: number; target: number };
    interactionDelay: { max: number; target: number };
  };
}

export interface QualityCheck {
  id: string;
  name: string;
  description: string;
  category: 'image_quality' | 'system_performance' | 'user_experience' | 'compliance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  checker: (data: any) => Promise<QualityResult>;
  schedule?: string;
  dependencies?: string[];
}

export interface QualityResult {
  checkId: string;
  checkName: string;
  passed: boolean;
  score: number;
  timestamp: Date;
  duration: number;
  issues: QualityIssue[];
  recommendations: string[];
  metrics: QualityMetric[];
  data?: any;
}

export interface QualityIssue {
  id: string;
  checkId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  location?: string;
  remediation?: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export interface QualityMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  target?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface QualityReport {
  id: string;
  timestamp: Date;
  period: { start: Date; end: Date };
  summary: QualitySummary;
  details: QualityDetails;
  trends: QualityTrend[];
  benchmarks: QualityBenchmark[];
  recommendations: string[];
  actionItems: QualityActionItem[];
}

export interface QualitySummary {
  overallScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface QualityDetails {
  categoryScores: { [category: string]: number };
  checkResults: QualityResult[];
  issuesByCategory: { [category: string]: number };
  issuesBySeverity: { [severity: string]: number };
  performanceMetrics: QualityMetric[];
}

export interface QualityTrend {
  date: Date;
  score: number;
  category?: string;
  metric?: string;
}

export interface QualityBenchmark {
  name: string;
  category: string;
  target: number;
  current: number;
  status: 'above' | 'at' | 'below';
  trend: 'improving' | 'stable' | 'declining';
}

export interface QualityActionItem {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  dueDate?: Date;
  assignee?: string;
  status: 'pending' | 'in-progress' | 'completed';
  estimatedEffort?: number;
}

class QualityAssuranceService {
  private config: QualityAssuranceConfig;
  private qualityChecks: Map<string, QualityCheck> = new Map();
  private checkResults: QualityResult[] = [];
  private qualityIssues: QualityIssue[] = [];
  private qualityHistory: QualityReport[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.config = {
      enabledChecks: ['image_quality', 'system_performance', 'user_experience'],
      qualityLevel: 'standard',
      automaticChecks: true,
      checkFrequency: 'hourly',
      alertThresholds: {
        imageQuality: {
          contrast: { min: 0.1, target: 0.3 },
          noise: { max: 0.2, target: 0.05 },
          resolution: { min: 512, target: 1024 },
          artifacts: { max: 0.1, target: 0.02 }
        },
        systemPerformance: {
          responseTime: { max: 2000, target: 500 },
          throughput: { min: 10, target: 50 },
          availability: { min: 99.0, target: 99.9 },
          errorRate: { max: 1.0, target: 0.1 }
        },
        userExperience: {
          loadTime: { max: 5000, target: 2000 },
          renderTime: { max: 100, target: 16 },
          interactionDelay: { max: 200, target: 50 }
        }
      },
      reportingEnabled: true,
      benchmarkingEnabled: true
    };

    this.initializeQualityAssurance();
  }

  private async initializeQualityAssurance(): Promise<void> {
    try {
      // Load configuration
      await this.loadQualityConfig();
      
      // Initialize quality checks
      this.initializeQualityChecks();
      
      // Start quality monitoring
      this.startQualityMonitoring();
      
      await auditService.logEvent({
        id: `qa_init_${Date.now()}`,
        timestamp: new Date(),
        user: 'system',
        action: 'quality_assurance_initialized',
        resource: 'quality_assurance_service',
        outcome: 'success',
        details: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize quality assurance service:', error);
    }
  }

  private async loadQualityConfig(): Promise<void> {
    try {
      const savedConfig = localStorage.getItem('quality_assurance_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load quality assurance config:', error);
    }
  }

  private initializeQualityChecks(): void {
    // Image Quality Checks
    this.qualityChecks.set('image_contrast', {
      id: 'image_contrast',
      name: 'Image Contrast Check',
      description: 'Validates image contrast levels',
      category: 'image_quality',
      severity: 'medium',
      enabled: true,
      checker: this.checkImageContrast.bind(this)
    });

    this.qualityChecks.set('image_noise', {
      id: 'image_noise',
      name: 'Image Noise Check',
      description: 'Detects excessive noise in images',
      category: 'image_quality',
      severity: 'medium',
      enabled: true,
      checker: this.checkImageNoise.bind(this)
    });

    this.qualityChecks.set('image_artifacts', {
      id: 'image_artifacts',
      name: 'Image Artifacts Check',
      description: 'Detects imaging artifacts',
      category: 'image_quality',
      severity: 'high',
      enabled: true,
      checker: this.checkImageArtifacts.bind(this)
    });

    // System Performance Checks
    this.qualityChecks.set('response_time', {
      id: 'response_time',
      name: 'Response Time Check',
      description: 'Monitors system response times',
      category: 'system_performance',
      severity: 'medium',
      enabled: true,
      checker: this.checkResponseTime.bind(this)
    });

    this.qualityChecks.set('memory_usage', {
      id: 'memory_usage',
      name: 'Memory Usage Check',
      description: 'Monitors memory consumption',
      category: 'system_performance',
      severity: 'high',
      enabled: true,
      checker: this.checkMemoryUsage.bind(this)
    });

    this.qualityChecks.set('error_rate', {
      id: 'error_rate',
      name: 'Error Rate Check',
      description: 'Monitors system error rates',
      category: 'system_performance',
      severity: 'high',
      enabled: true,
      checker: this.checkErrorRate.bind(this)
    });

    // User Experience Checks
    this.qualityChecks.set('load_time', {
      id: 'load_time',
      name: 'Load Time Check',
      description: 'Monitors application load times',
      category: 'user_experience',
      severity: 'medium',
      enabled: true,
      checker: this.checkLoadTime.bind(this)
    });

    this.qualityChecks.set('render_performance', {
      id: 'render_performance',
      name: 'Render Performance Check',
      description: 'Monitors rendering performance',
      category: 'user_experience',
      severity: 'medium',
      enabled: true,
      checker: this.checkRenderPerformance.bind(this)
    });
  }

  private startQualityMonitoring(): void {
    if (this.config.automaticChecks && !this.isRunning) {
      this.isRunning = true;
      
      const interval = this.getCheckInterval();
      setInterval(() => {
        this.runQualityChecks();
      }, interval);

      // Generate reports periodically
      setInterval(() => {
        this.generateQualityReport();
      }, 24 * 60 * 60 * 1000); // Daily reports
    }
  }

  private getCheckInterval(): number {
    switch (this.config.checkFrequency) {
      case 'continuous': return 60000; // 1 minute
      case 'hourly': return 3600000; // 1 hour
      case 'daily': return 24 * 60 * 60 * 1000; // 1 day
      case 'weekly': return 7 * 24 * 60 * 60 * 1000; // 1 week
      default: return 3600000;
    }
  }

  public async runQualityChecks(data?: any): Promise<QualityResult[]> {
    const results: QualityResult[] = [];

    for (const [checkId, check] of this.qualityChecks.entries()) {
      if (!check.enabled || !this.config.enabledChecks.includes(check.category)) {
        continue;
      }

      try {
        const startTime = Date.now();
        const result = await check.checker(data);
        const duration = Date.now() - startTime;

        const qualityResult: QualityResult = {
          ...result,
          checkId,
          checkName: check.name,
          timestamp: new Date(),
          duration
        };

        results.push(qualityResult);
        this.checkResults.push(qualityResult);

        // Process issues
        for (const issue of result.issues) {
          this.qualityIssues.push(issue);
          
          // Trigger alerts for high severity issues
          if (issue.severity === 'high' || issue.severity === 'critical') {
            await this.triggerQualityAlert(issue);
          }
        }

        await auditService.logEvent({
          id: `qa_check_${checkId}_${Date.now()}`,
          timestamp: new Date(),
          user: 'system',
          action: 'quality_check_performed',
          resource: 'quality_assurance_service',
          outcome: result.passed ? 'success' : 'failure',
          details: { checkId, score: result.score, issues: result.issues.length }
        });
      } catch (error) {
        console.error(`Quality check ${checkId} failed:`, error);
        
        const errorResult: QualityResult = {
          checkId,
          checkName: check.name,
          passed: false,
          score: 0,
          timestamp: new Date(),
          duration: 0,
          issues: [{
            id: `error_${checkId}_${Date.now()}`,
            checkId,
            severity: 'critical',
            category: check.category,
            description: `Quality check failed: ${error}`,
            timestamp: new Date(),
            resolved: false
          }],
          recommendations: ['Investigate quality check failure'],
          metrics: []
        };
        
        results.push(errorResult);
        this.checkResults.push(errorResult);
      }
    }

    return results;
  }

  // Image Quality Check Implementations
  private async checkImageContrast(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock contrast calculation
    const contrast = Math.random() * 0.5; // Simulated contrast value
    const threshold = this.config.alertThresholds.imageQuality.contrast;

    metrics.push({
      name: 'Image Contrast',
      value: contrast,
      unit: 'ratio',
      threshold: threshold.min,
      target: threshold.target,
      status: contrast >= threshold.min ? 'good' : 'critical'
    });

    if (contrast < threshold.min) {
      issues.push({
        id: `contrast_low_${Date.now()}`,
        checkId: 'image_contrast',
        severity: 'medium',
        category: 'image_quality',
        description: `Low image contrast detected: ${contrast.toFixed(3)}`,
        remediation: 'Adjust window/level settings or imaging parameters',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Increase contrast settings or adjust imaging parameters');
    }

    const passed = issues.length === 0;
    const score = Math.min(100, (contrast / threshold.target) * 100);

    return {
      checkId: 'image_contrast',
      checkName: 'Image Contrast Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  private async checkImageNoise(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock noise calculation
    const noise = Math.random() * 0.3; // Simulated noise level
    const threshold = this.config.alertThresholds.imageQuality.noise;

    metrics.push({
      name: 'Image Noise',
      value: noise,
      unit: 'ratio',
      threshold: threshold.max,
      target: threshold.target,
      status: noise <= threshold.max ? 'good' : 'warning'
    });

    if (noise > threshold.max) {
      issues.push({
        id: `noise_high_${Date.now()}`,
        checkId: 'image_noise',
        severity: 'medium',
        category: 'image_quality',
        description: `High image noise detected: ${noise.toFixed(3)}`,
        remediation: 'Apply noise reduction filters or adjust acquisition parameters',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Apply noise reduction or improve acquisition parameters');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - (noise / threshold.max) * 100);

    return {
      checkId: 'image_noise',
      checkName: 'Image Noise Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  private async checkImageArtifacts(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock artifact detection
    const artifacts = Math.random() * 0.15; // Simulated artifact level
    const threshold = this.config.alertThresholds.imageQuality.artifacts;

    metrics.push({
      name: 'Image Artifacts',
      value: artifacts,
      unit: 'ratio',
      threshold: threshold.max,
      target: threshold.target,
      status: artifacts <= threshold.max ? 'good' : 'critical'
    });

    if (artifacts > threshold.max) {
      issues.push({
        id: `artifacts_detected_${Date.now()}`,
        checkId: 'image_artifacts',
        severity: 'high',
        category: 'image_quality',
        description: `Image artifacts detected: ${artifacts.toFixed(3)}`,
        remediation: 'Review acquisition parameters and patient positioning',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Review imaging protocol and patient setup');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - (artifacts / threshold.max) * 100);

    return {
      checkId: 'image_artifacts',
      checkName: 'Image Artifacts Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  // System Performance Check Implementations
  private async checkResponseTime(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock response time measurement
    const responseTime = Math.random() * 3000; // Simulated response time in ms
    const threshold = this.config.alertThresholds.systemPerformance.responseTime;

    metrics.push({
      name: 'Response Time',
      value: responseTime,
      unit: 'ms',
      threshold: threshold.max,
      target: threshold.target,
      status: responseTime <= threshold.max ? 'good' : 'warning'
    });

    if (responseTime > threshold.max) {
      issues.push({
        id: `response_slow_${Date.now()}`,
        checkId: 'response_time',
        severity: 'medium',
        category: 'system_performance',
        description: `Slow response time detected: ${responseTime.toFixed(0)}ms`,
        remediation: 'Optimize system performance or increase resources',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Optimize performance or scale system resources');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - ((responseTime - threshold.target) / threshold.max) * 100);

    return {
      checkId: 'response_time',
      checkName: 'Response Time Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  private async checkMemoryUsage(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock memory usage measurement
    const memoryUsage = Math.random() * 100; // Simulated memory usage percentage
    const threshold = 80; // 80% threshold

    metrics.push({
      name: 'Memory Usage',
      value: memoryUsage,
      unit: '%',
      threshold,
      target: 60,
      status: memoryUsage <= threshold ? 'good' : 'critical'
    });

    if (memoryUsage > threshold) {
      issues.push({
        id: `memory_high_${Date.now()}`,
        checkId: 'memory_usage',
        severity: 'high',
        category: 'system_performance',
        description: `High memory usage detected: ${memoryUsage.toFixed(1)}%`,
        remediation: 'Free up memory or increase system memory',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Optimize memory usage or increase available memory');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - memoryUsage);

    return {
      checkId: 'memory_usage',
      checkName: 'Memory Usage Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  private async checkErrorRate(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock error rate calculation
    const errorRate = Math.random() * 2; // Simulated error rate percentage
    const threshold = this.config.alertThresholds.systemPerformance.errorRate;

    metrics.push({
      name: 'Error Rate',
      value: errorRate,
      unit: '%',
      threshold: threshold.max,
      target: threshold.target,
      status: errorRate <= threshold.max ? 'good' : 'critical'
    });

    if (errorRate > threshold.max) {
      issues.push({
        id: `error_rate_high_${Date.now()}`,
        checkId: 'error_rate',
        severity: 'high',
        category: 'system_performance',
        description: `High error rate detected: ${errorRate.toFixed(2)}%`,
        remediation: 'Investigate and fix system errors',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Investigate error sources and implement fixes');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - (errorRate / threshold.max) * 100);

    return {
      checkId: 'error_rate',
      checkName: 'Error Rate Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  // User Experience Check Implementations
  private async checkLoadTime(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock load time measurement
    const loadTime = Math.random() * 8000; // Simulated load time in ms
    const threshold = this.config.alertThresholds.userExperience.loadTime;

    metrics.push({
      name: 'Load Time',
      value: loadTime,
      unit: 'ms',
      threshold: threshold.max,
      target: threshold.target,
      status: loadTime <= threshold.max ? 'good' : 'warning'
    });

    if (loadTime > threshold.max) {
      issues.push({
        id: `load_slow_${Date.now()}`,
        checkId: 'load_time',
        severity: 'medium',
        category: 'user_experience',
        description: `Slow load time detected: ${loadTime.toFixed(0)}ms`,
        remediation: 'Optimize loading performance',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Optimize application loading performance');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - ((loadTime - threshold.target) / threshold.max) * 100);

    return {
      checkId: 'load_time',
      checkName: 'Load Time Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  private async checkRenderPerformance(data: any): Promise<QualityResult> {
    const issues: QualityIssue[] = [];
    const metrics: QualityMetric[] = [];
    const recommendations: string[] = [];

    // Mock render performance measurement
    const renderTime = Math.random() * 150; // Simulated render time in ms
    const threshold = this.config.alertThresholds.userExperience.renderTime;

    metrics.push({
      name: 'Render Time',
      value: renderTime,
      unit: 'ms',
      threshold: threshold.max,
      target: threshold.target,
      status: renderTime <= threshold.max ? 'good' : 'warning'
    });

    if (renderTime > threshold.max) {
      issues.push({
        id: `render_slow_${Date.now()}`,
        checkId: 'render_performance',
        severity: 'medium',
        category: 'user_experience',
        description: `Slow render performance detected: ${renderTime.toFixed(0)}ms`,
        remediation: 'Optimize rendering performance',
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Optimize rendering algorithms and GPU usage');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - ((renderTime - threshold.target) / threshold.max) * 100);

    return {
      checkId: 'render_performance',
      checkName: 'Render Performance Check',
      passed,
      score,
      timestamp: new Date(),
      duration: 0,
      issues,
      recommendations,
      metrics
    };
  }

  private async triggerQualityAlert(issue: QualityIssue): Promise<void> {
    console.warn('Quality Alert:', issue);
    
    await auditService.logEvent({
      id: `qa_alert_${issue.id}`,
      timestamp: new Date(),
      user: 'system',
      action: 'quality_alert_triggered',
      resource: 'quality_assurance_service',
      outcome: 'success',
      details: issue
    });
  }

  public async generateQualityReport(): Promise<QualityReport> {
    try {
      const period = this.getReportPeriod();
      const recentResults = this.checkResults.filter(r => 
        r.timestamp >= period.start && r.timestamp <= period.end
      );

      const report: QualityReport = {
        id: `qa_report_${Date.now()}`,
        timestamp: new Date(),
        period,
        summary: this.generateQualitySummary(recentResults),
        details: this.generateQualityDetails(recentResults),
        trends: this.generateQualityTrends(),
        benchmarks: this.generateQualityBenchmarks(),
        recommendations: this.generateQualityRecommendations(recentResults),
        actionItems: this.generateQualityActionItems()
      };

      this.qualityHistory.push(report);

      await auditService.logEvent({
        id: `qa_report_${report.id}`,
        timestamp: new Date(),
        user: 'system',
        action: 'quality_report_generated',
        resource: 'quality_assurance_service',
        outcome: 'success',
        details: { reportId: report.id, period }
      });

      return report;
    } catch (error) {
      console.error('Failed to generate quality report:', error);
      throw new Error('Quality report generation failed');
    }
  }

  private getReportPeriod(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7); // Last 7 days
    return { start, end };
  }

  private generateQualitySummary(results: QualityResult[]): QualitySummary {
    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;

    const allIssues = results.flatMap(r => r.issues);
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const highIssues = allIssues.filter(i => i.severity === 'high').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'medium').length;
    const lowIssues = allIssues.filter(i => i.severity === 'low').length;

    const overallScore = totalChecks > 0 ? 
      results.reduce((sum, r) => sum + r.score, 0) / totalChecks : 0;

    // Determine trend (simplified)
    const improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';

    return {
      overallScore,
      totalChecks,
      passedChecks,
      failedChecks,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      improvementTrend
    };
  }

  private generateQualityDetails(results: QualityResult[]): QualityDetails {
    const categoryScores: { [category: string]: number } = {};
    const issuesByCategory: { [category: string]: number } = {};
    const issuesBySeverity: { [severity: string]: number } = {};

    // Calculate category scores
    const categories = ['image_quality', 'system_performance', 'user_experience'];
    categories.forEach(category => {
      const categoryResults = results.filter(r => {
        const check = this.qualityChecks.get(r.checkId);
        return check?.category === category;
      });
      
      if (categoryResults.length > 0) {
        categoryScores[category] = categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length;
      }
    });

    // Count issues by category and severity
    results.forEach(result => {
      const check = this.qualityChecks.get(result.checkId);
      if (check) {
        issuesByCategory[check.category] = (issuesByCategory[check.category] || 0) + result.issues.length;
      }
      
      result.issues.forEach(issue => {
        issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      });
    });

    // Collect performance metrics
    const performanceMetrics: QualityMetric[] = results.flatMap(r => r.metrics);

    return {
      categoryScores,
      checkResults: results,
      issuesByCategory,
      issuesBySeverity,
      performanceMetrics
    };
  }

  private generateQualityTrends(): QualityTrend[] {
    return this.qualityHistory.slice(-30).map(report => ({
      date: report.timestamp,
      score: report.summary.overallScore
    }));
  }

  private generateQualityBenchmarks(): QualityBenchmark[] {
    return [
      {
        name: 'Overall Quality Score',
        category: 'overall',
        target: 90,
        current: this.checkResults.length > 0 ? 
          this.checkResults.reduce((sum, r) => sum + r.score, 0) / this.checkResults.length : 0,
        status: 'at',
        trend: 'stable'
      }
    ];
  }

  private generateQualityRecommendations(results: QualityResult[]): string[] {
    const recommendations = new Set<string>();
    
    results.forEach(result => {
      result.recommendations.forEach(rec => recommendations.add(rec));
    });

    return Array.from(recommendations);
  }

  private generateQualityActionItems(): QualityActionItem[] {
    const actionItems: QualityActionItem[] = [];
    
    this.qualityIssues.filter(issue => !issue.resolved).forEach(issue => {
      actionItems.push({
        id: `action_${issue.id}`,
        priority: issue.severity as 'low' | 'medium' | 'high' | 'critical',
        category: issue.category,
        description: `Resolve quality issue: ${issue.description}`,
        dueDate: this.calculateDueDate(issue.severity),
        status: 'pending'
      });
    });

    return actionItems;
  }

  private calculateDueDate(severity: string): Date {
    const now = new Date();
    switch (severity) {
      case 'critical': return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case 'high': return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
      case 'medium': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
      default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
    }
  }

  public getQualityMetrics(): { overallScore: number; categoryScores: { [category: string]: number }; trends: QualityTrend[]; benchmarks: QualityBenchmark[] } {
    const recentResults = this.checkResults.slice(-100); // Last 100 results
    
    const overallScore = recentResults.length > 0 ? 
      recentResults.reduce((sum, r) => sum + r.score, 0) / recentResults.length : 0;

    const categoryScores: { [category: string]: number } = {};
    const categories = ['image_quality', 'system_performance', 'user_experience'];
    
    categories.forEach(category => {
      const categoryResults = recentResults.filter(r => {
        const check = this.qualityChecks.get(r.checkId);
        return check?.category === category;
      });
      
      if (categoryResults.length > 0) {
        categoryScores[category] = categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length;
      }
    });

    const trends = this.generateQualityTrends();
    const benchmarks = this.generateQualityBenchmarks();

    return { overallScore, categoryScores, trends, benchmarks };
  }

  public resolveQualityIssue(issueId: string, resolution: string): void {
    const issue = this.qualityIssues.find(i => i.id === issueId);
    if (issue) {
      issue.resolved = true;
      issue.resolution = resolution;
    }
  }

  public updateQualityConfig(newConfig: Partial<QualityAssuranceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('quality_assurance_config', JSON.stringify(this.config));
  }

  public getQualityIssues(): QualityIssue[] {
    return this.qualityIssues;
  }

  public getQualityHistory(): QualityReport[] {
    return this.qualityHistory;
  }
}

export const qualityAssuranceService = new QualityAssuranceService();
export default qualityAssuranceService;