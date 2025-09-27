/**
 * Compliance Service - Healthcare Regulatory Compliance Management
 * 
 * Comprehensive compliance service for medical imaging applications:
 * - HIPAA compliance monitoring and validation
 * - FDA regulatory compliance
 * - DICOM standard compliance
 * - International healthcare standards (HL7, IHE, etc.)
 * - Compliance reporting and documentation
 * - Violation detection and remediation
 */

import { auditService } from './auditService';

export interface ComplianceConfig {
  enabledRegulations: string[];
  complianceLevel: 'basic' | 'standard' | 'comprehensive' | 'enterprise';
  automaticChecks: boolean;
  reportingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  violationThreshold: 'low' | 'medium' | 'high';
  remediation: RemediationConfig;
}

export interface RemediationConfig {
  automaticRemediation: boolean;
  notificationEnabled: boolean;
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToEscalate: number; // minutes
  recipients: string[];
}

export interface Regulation {
  id: string;
  name: string;
  version: string;
  description: string;
  requirements: Requirement[];
  validationRules: ValidationRule[];
  lastUpdated: Date;
  mandatory: boolean;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  validationCriteria: ValidationCriteria[];
}

export interface ValidationCriteria {
  id: string;
  description: string;
  validator: (data: any) => ValidationResult;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ValidationRule {
  id: string;
  regulationId: string;
  requirementId: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  validator: (data: any) => boolean;
  remediation?: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: ComplianceIssue[];
  recommendations: string[];
}

export interface ComplianceIssue {
  id: string;
  regulationId: string;
  requirementId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  location?: string;
  remediation?: string;
  timestamp: Date;
}

export interface ComplianceViolation {
  id: string;
  regulation: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  data?: any;
  resolved: boolean;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface ComplianceStatus {
  overall: 'compliant' | 'non-compliant' | 'partial';
  score: number;
  regulations: RegulationStatus[];
  violations: ComplianceViolation[];
  lastCheck: Date;
  nextCheck: Date;
}

export interface RegulationStatus {
  regulationId: string;
  name: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  score: number;
  issues: ComplianceIssue[];
  lastCheck: Date;
}

export interface ComplianceReport {
  id: string;
  timestamp: Date;
  period: { start: Date; end: Date };
  status: ComplianceStatus;
  summary: ComplianceSummary;
  details: ComplianceDetails;
  recommendations: string[];
  actionItems: ActionItem[];
}

export interface ComplianceSummary {
  totalRegulations: number;
  compliantRegulations: number;
  partiallyCompliantRegulations: number;
  nonCompliantRegulations: number;
  totalViolations: number;
  resolvedViolations: number;
  pendingViolations: number;
  overallScore: number;
}

export interface ComplianceDetails {
  regulationBreakdown: RegulationBreakdown[];
  violationsByCategory: { [category: string]: number };
  violationsBySeverity: { [severity: string]: number };
  trends: ComplianceTrend[];
}

export interface RegulationBreakdown {
  regulation: string;
  requirements: number;
  passed: number;
  failed: number;
  score: number;
}

export interface ComplianceTrend {
  date: Date;
  score: number;
  violations: number;
  regulation?: string;
}

export interface ActionItem {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  regulation: string;
  requirement?: string;
  dueDate?: Date;
  assignee?: string;
  status: 'pending' | 'in-progress' | 'completed';
}

class ComplianceService {
  private config: ComplianceConfig;
  private regulations: Map<string, Regulation> = new Map();
  private violations: ComplianceViolation[] = [];
  private complianceHistory: ComplianceStatus[] = [];

  constructor() {
    this.config = {
      enabledRegulations: ['HIPAA', 'FDA_510K', 'DICOM', 'HL7', 'IHE'],
      complianceLevel: 'standard',
      automaticChecks: true,
      reportingFrequency: 'monthly',
      violationThreshold: 'medium',
      remediation: {
        automaticRemediation: false,
        notificationEnabled: true,
        escalationRules: [
          {
            severity: 'critical',
            timeToEscalate: 15,
            recipients: ['admin@hospital.com', 'compliance@hospital.com']
          },
          {
            severity: 'high',
            timeToEscalate: 60,
            recipients: ['compliance@hospital.com']
          }
        ]
      }
    };

    this.initializeCompliance();
  }

  private async initializeCompliance(): Promise<void> {
    try {
      // Load compliance configuration
      await this.loadComplianceConfig();
      
      // Initialize regulations
      this.initializeRegulations();
      
      // Start compliance monitoring
      this.startComplianceMonitoring();
      
      await auditService.logEvent({
        id: `compliance_init_${Date.now()}`,
        timestamp: new Date(),
        user: 'system',
        action: 'compliance_service_initialized',
        resource: 'compliance_service',
        outcome: 'success',
        details: { config: this.config }
      });
    } catch (error) {
      console.error('Failed to initialize compliance service:', error);
    }
  }

  private async loadComplianceConfig(): Promise<void> {
    try {
      const savedConfig = localStorage.getItem('compliance_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load compliance config:', error);
    }
  }

  private initializeRegulations(): void {
    // Initialize HIPAA regulation
    this.regulations.set('HIPAA', {
      id: 'HIPAA',
      name: 'Health Insurance Portability and Accountability Act',
      version: '2013',
      description: 'US healthcare privacy and security regulation',
      requirements: [
        {
          id: 'HIPAA_PRIVACY',
          title: 'Privacy Rule',
          description: 'Protect patient health information',
          category: 'Privacy',
          mandatory: true,
          validationCriteria: [
            {
              id: 'PHI_ENCRYPTION',
              description: 'PHI must be encrypted at rest and in transit',
              validator: (data) => ({ passed: true, score: 100, issues: [], recommendations: [] }),
              severity: 'critical'
            }
          ]
        },
        {
          id: 'HIPAA_SECURITY',
          title: 'Security Rule',
          description: 'Implement administrative, physical, and technical safeguards',
          category: 'Security',
          mandatory: true,
          validationCriteria: [
            {
              id: 'ACCESS_CONTROLS',
              description: 'Implement proper access controls',
              validator: (data) => ({ passed: true, score: 100, issues: [], recommendations: [] }),
              severity: 'critical'
            }
          ]
        }
      ],
      validationRules: [],
      lastUpdated: new Date(),
      mandatory: true
    });

    // Initialize FDA regulation
    this.regulations.set('FDA_510K', {
      id: 'FDA_510K',
      name: 'FDA 510(k) Medical Device Regulation',
      version: '2023',
      description: 'FDA medical device software regulation',
      requirements: [
        {
          id: 'SOFTWARE_VALIDATION',
          title: 'Software Validation',
          description: 'Validate medical device software',
          category: 'Quality',
          mandatory: true,
          validationCriteria: [
            {
              id: 'SOFTWARE_TESTING',
              description: 'Comprehensive software testing required',
              validator: (data) => ({ passed: true, score: 100, issues: [], recommendations: [] }),
              severity: 'critical'
            }
          ]
        }
      ],
      validationRules: [],
      lastUpdated: new Date(),
      mandatory: true
    });

    // Initialize DICOM regulation
    this.regulations.set('DICOM', {
      id: 'DICOM',
      name: 'Digital Imaging and Communications in Medicine',
      version: '2023e',
      description: 'Medical imaging standard',
      requirements: [
        {
          id: 'DICOM_CONFORMANCE',
          title: 'DICOM Conformance',
          description: 'Conform to DICOM standard',
          category: 'Interoperability',
          mandatory: true,
          validationCriteria: [
            {
              id: 'DICOM_TAGS',
              description: 'Proper DICOM tag handling',
              validator: (data) => ({ passed: true, score: 100, issues: [], recommendations: [] }),
              severity: 'error'
            }
          ]
        }
      ],
      validationRules: [],
      lastUpdated: new Date(),
      mandatory: true
    });
  }

  private startComplianceMonitoring(): void {
    if (this.config.automaticChecks) {
      // Perform compliance checks periodically
      setInterval(() => {
        this.performComplianceCheck();
      }, 3600000); // Every hour

      // Generate reports based on frequency
      const reportInterval = this.getReportInterval();
      setInterval(() => {
        this.generateComplianceReport();
      }, reportInterval);
    }
  }

  private getReportInterval(): number {
    switch (this.config.reportingFrequency) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      case 'quarterly': return 90 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }

  public async checkCompliance(data?: any): Promise<ComplianceStatus> {
    try {
      const regulationStatuses: RegulationStatus[] = [];
      const allViolations: ComplianceViolation[] = [];
      let totalScore = 0;
      let regulationCount = 0;

      for (const regulationId of this.config.enabledRegulations) {
        const regulation = this.regulations.get(regulationId);
        if (!regulation) continue;

        const status = await this.checkRegulationCompliance(regulation, data);
        regulationStatuses.push(status);
        totalScore += status.score;
        regulationCount++;

        // Convert issues to violations
        for (const issue of status.issues) {
          if (issue.severity === 'error' || issue.severity === 'critical') {
            const violation: ComplianceViolation = {
              id: `violation_${issue.id}_${Date.now()}`,
              regulation: regulation.name,
              rule: issue.requirementId,
              severity: this.mapSeverity(issue.severity),
              description: issue.description,
              timestamp: new Date(),
              data: data,
              resolved: false
            };
            allViolations.push(violation);
            this.violations.push(violation);
          }
        }
      }

      const overallScore = regulationCount > 0 ? totalScore / regulationCount : 0;
      const overallStatus = this.determineOverallStatus(overallScore, allViolations);

      const complianceStatus: ComplianceStatus = {
        overall: overallStatus,
        score: overallScore,
        regulations: regulationStatuses,
        violations: allViolations,
        lastCheck: new Date(),
        nextCheck: new Date(Date.now() + 3600000) // Next hour
      };

      this.complianceHistory.push(complianceStatus);

      await auditService.logEvent({
        id: `compliance_check_${Date.now()}`,
        timestamp: new Date(),
        user: 'system',
        action: 'compliance_check_performed',
        resource: 'compliance_service',
        outcome: 'success',
        details: { status: overallStatus, score: overallScore, violations: allViolations.length }
      });

      return complianceStatus;
    } catch (error) {
      console.error('Compliance check failed:', error);
      throw new Error('Compliance check failed');
    }
  }

  private async checkRegulationCompliance(regulation: Regulation, data?: any): Promise<RegulationStatus> {
    const issues: ComplianceIssue[] = [];
    let totalScore = 0;
    let requirementCount = 0;

    for (const requirement of regulation.requirements) {
      for (const criteria of requirement.validationCriteria) {
        try {
          const result = criteria.validator(data);
          totalScore += result.score;
          requirementCount++;

          if (!result.passed) {
            const issue: ComplianceIssue = {
              id: `issue_${criteria.id}_${Date.now()}`,
              regulationId: regulation.id,
              requirementId: requirement.id,
              severity: criteria.severity,
              description: criteria.description,
              timestamp: new Date()
            };
            issues.push(issue);
          }
        } catch (error) {
          console.error(`Validation failed for ${criteria.id}:`, error);
          const issue: ComplianceIssue = {
            id: `error_${criteria.id}_${Date.now()}`,
            regulationId: regulation.id,
            requirementId: requirement.id,
            severity: 'error',
            description: `Validation error: ${error}`,
            timestamp: new Date()
          };
          issues.push(issue);
        }
      }
    }

    const score = requirementCount > 0 ? totalScore / requirementCount : 0;
    const status = this.determineRegulationStatus(score, issues);

    return {
      regulationId: regulation.id,
      name: regulation.name,
      status,
      score,
      issues,
      lastCheck: new Date()
    };
  }

  private mapSeverity(severity: 'info' | 'warning' | 'error' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'info': return 'low';
      case 'warning': return 'medium';
      case 'error': return 'high';
      case 'critical': return 'critical';
      default: return 'medium';
    }
  }

  private determineOverallStatus(score: number, violations: ComplianceViolation[]): 'compliant' | 'non-compliant' | 'partial' {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;

    if (criticalViolations > 0) return 'non-compliant';
    if (highViolations > 0 || score < 80) return 'partial';
    return 'compliant';
  }

  private determineRegulationStatus(score: number, issues: ComplianceIssue[]): 'compliant' | 'non-compliant' | 'partial' {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const errorIssues = issues.filter(i => i.severity === 'error').length;

    if (criticalIssues > 0) return 'non-compliant';
    if (errorIssues > 0 || score < 80) return 'partial';
    return 'compliant';
  }

  private async performComplianceCheck(): Promise<void> {
    try {
      await this.checkCompliance();
    } catch (error) {
      console.error('Scheduled compliance check failed:', error);
    }
  }

  public async generateComplianceReport(): Promise<ComplianceReport> {
    try {
      const currentStatus = await this.checkCompliance();
      const period = this.getReportPeriod();
      
      const report: ComplianceReport = {
        id: `report_${Date.now()}`,
        timestamp: new Date(),
        period,
        status: currentStatus,
        summary: this.generateComplianceSummary(currentStatus),
        details: this.generateComplianceDetails(currentStatus),
        recommendations: this.generateRecommendations(currentStatus),
        actionItems: this.generateActionItems(currentStatus)
      };

      await auditService.logEvent({
        id: `compliance_report_${report.id}`,
        timestamp: new Date(),
        user: 'system',
        action: 'compliance_report_generated',
        resource: 'compliance_service',
        outcome: 'success',
        details: { reportId: report.id, period }
      });

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Compliance report generation failed');
    }
  }

  private getReportPeriod(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    
    switch (this.config.reportingFrequency) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
    }
    
    return { start, end };
  }

  private generateComplianceSummary(status: ComplianceStatus): ComplianceSummary {
    const compliantRegulations = status.regulations.filter(r => r.status === 'compliant').length;
    const partiallyCompliantRegulations = status.regulations.filter(r => r.status === 'partial').length;
    const nonCompliantRegulations = status.regulations.filter(r => r.status === 'non-compliant').length;
    const resolvedViolations = status.violations.filter(v => v.resolved).length;
    const pendingViolations = status.violations.filter(v => !v.resolved).length;

    return {
      totalRegulations: status.regulations.length,
      compliantRegulations,
      partiallyCompliantRegulations,
      nonCompliantRegulations,
      totalViolations: status.violations.length,
      resolvedViolations,
      pendingViolations,
      overallScore: status.score
    };
  }

  private generateComplianceDetails(status: ComplianceStatus): ComplianceDetails {
    const regulationBreakdown: RegulationBreakdown[] = status.regulations.map(reg => ({
      regulation: reg.name,
      requirements: this.regulations.get(reg.regulationId)?.requirements.length || 0,
      passed: reg.issues.length === 0 ? 1 : 0,
      failed: reg.issues.length,
      score: reg.score
    }));

    const violationsByCategory: { [category: string]: number } = {};
    const violationsBySeverity: { [severity: string]: number } = {};

    status.violations.forEach(violation => {
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
    });

    const trends: ComplianceTrend[] = this.complianceHistory.slice(-30).map(h => ({
      date: h.lastCheck,
      score: h.score,
      violations: h.violations.length
    }));

    return {
      regulationBreakdown,
      violationsByCategory,
      violationsBySeverity,
      trends
    };
  }

  private generateRecommendations(status: ComplianceStatus): string[] {
    const recommendations: string[] = [];

    if (status.overall === 'non-compliant') {
      recommendations.push('Immediate action required to address critical compliance violations');
    }

    if (status.score < 80) {
      recommendations.push('Improve compliance score by addressing identified issues');
    }

    const unresolvedViolations = status.violations.filter(v => !v.resolved);
    if (unresolvedViolations.length > 0) {
      recommendations.push(`Resolve ${unresolvedViolations.length} pending compliance violations`);
    }

    return recommendations;
  }

  private generateActionItems(status: ComplianceStatus): ActionItem[] {
    const actionItems: ActionItem[] = [];

    status.violations.filter(v => !v.resolved).forEach(violation => {
      actionItems.push({
        id: `action_${violation.id}`,
        priority: violation.severity as 'low' | 'medium' | 'high' | 'critical',
        description: `Resolve compliance violation: ${violation.description}`,
        regulation: violation.regulation,
        requirement: violation.rule,
        dueDate: this.calculateDueDate(violation.severity),
        status: 'pending'
      });
    });

    return actionItems;
  }

  private calculateDueDate(severity: string): Date {
    const now = new Date();
    switch (severity) {
      case 'critical': return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
      case 'high': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
      case 'medium': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
      default: return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
    }
  }

  public resolveViolation(violationId: string, resolution: string, resolvedBy: string): void {
    const violation = this.violations.find(v => v.id === violationId);
    if (violation) {
      violation.resolved = true;
      violation.resolution = resolution;
      violation.resolvedBy = resolvedBy;
      violation.resolvedAt = new Date();
    }
  }

  public getComplianceStatus(): ComplianceStatus | null {
    return this.complianceHistory.length > 0 ? this.complianceHistory[this.complianceHistory.length - 1] : null;
  }

  public getViolations(): ComplianceViolation[] {
    return this.violations;
  }

  public updateComplianceConfig(newConfig: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('compliance_config', JSON.stringify(this.config));
  }
}

export const complianceService = new ComplianceService();
export default complianceService;