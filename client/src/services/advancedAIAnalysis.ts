/**
 * Advanced AI Analysis Service
 * Provides sophisticated medical image analysis capabilities
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface AbnormalityDetection {
  id: string;
  type: 'lesion' | 'mass' | 'nodule' | 'fracture' | 'inflammation' | 'other';
  location: {
    slice: number;
    coordinates: { x: number; y: number };
    anatomicalRegion: string;
    side?: 'left' | 'right' | 'bilateral';
  };
  characteristics: {
    size: { width: number; height: number; depth?: number; unit: 'mm' | 'cm' };
    shape: 'round' | 'oval' | 'irregular' | 'linear';
    density: 'hypodense' | 'isodense' | 'hyperdense' | 'mixed';
    enhancement?: 'none' | 'mild' | 'moderate' | 'avid';
  };
  confidence: number;
  severity: 'benign' | 'probably_benign' | 'indeterminate' | 'suspicious' | 'highly_suspicious';
  differentialDiagnosis: string[];
  recommendedFollowUp: string[];
}

export interface AutomatedMeasurement {
  id: string;
  type: 'distance' | 'area' | 'volume' | 'angle' | 'density';
  name: string;
  value: number;
  unit: string;
  location: {
    slice?: number;
    coordinates: { x: number; y: number; z?: number }[];
  };
  normalRange?: { min: number; max: number };
  isAbnormal: boolean;
  confidence: number;
  method: 'ai_segmentation' | 'edge_detection' | 'template_matching';
}

export interface RiskAssessment {
  category: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative';
    weight: number;
  }>;
  recommendations: string[];
}

export interface TreatmentRecommendation {
  id: string;
  category: 'medication' | 'procedure' | 'lifestyle' | 'monitoring' | 'referral';
  recommendation: string;
  priority: 'immediate' | 'urgent' | 'routine' | 'elective';
  evidence: {
    level: 'A' | 'B' | 'C' | 'D';
    references: string[];
  };
  contraindications?: string[];
  alternatives?: string[];
}

export interface ComparisonAnalysis {
  comparisonId: string;
  keyChanges: Array<{
    type: 'new' | 'resolved' | 'progressed' | 'stable';
    description: string;
    significance: 'minor' | 'moderate' | 'significant' | 'critical';
    location?: string;
    quantification?: {
      previousValue: number;
      currentValue: number;
      changePercent: number;
    };
  }>;
  overallTrend: 'improving' | 'stable' | 'worsening' | 'mixed';
  recommendations: string[];
}

class AdvancedAIAnalysisService {
  private baseUrl = '/api/advanced-ai';

  /**
   * Detect abnormalities in medical images
   */
  async detectAbnormalities(
    studyUid: string,
    options?: {
      sensitivity: 'low' | 'standard' | 'high';
      anatomicalRegions?: string[];
      excludeTypes?: string[];
    }
  ): Promise<AbnormalityDetection[]> {
    try {
      console.log('🔍 Detecting abnormalities for study:', studyUid);

      const requestData = {
        studyUid,
        options: {
          sensitivity: 'standard',
          ...options
        }
      };

      const response = await apiService.post<{ abnormalities: AbnormalityDetection[] }>(
        `${this.baseUrl}/detect-abnormalities`,
        requestData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'Abnormality detection performed',
        resource_type: 'Study',
        resource_id: studyUid,
        metadata: {
          action_details: {
            abnormalities_found: response.abnormalities.length,
            sensitivity: requestData.options.sensitivity,
            high_confidence_findings: response.abnormalities.filter(a => a.confidence > 0.8).length
          }
        }
      });

      console.log('✅ Abnormality detection completed:', {
        totalFindings: response.abnormalities.length,
        highConfidenceFindings: response.abnormalities.filter(a => a.confidence > 0.8).length
      });

      return response.abnormalities;
    } catch (error) {
      console.error('❌ Abnormality detection failed:', error);
      throw new Error('Abnormality detection failed. Please try again.');
    }
  }

  /**
   * Perform automated measurements
   */
  async performAutomatedMeasurements(
    studyUid: string,
    measurementTypes: string[],
    options?: {
      anatomicalRegions?: string[];
      precision: 'standard' | 'high';
    }
  ): Promise<AutomatedMeasurement[]> {
    try {
      console.log('📏 Performing automated measurements for study:', studyUid);

      const requestData = {
        studyUid,
        measurementTypes,
        options: {
          precision: 'standard',
          ...options
        }
      };

      const response = await apiService.post<{ measurements: AutomatedMeasurement[] }>(
        `${this.baseUrl}/automated-measurements`,
        requestData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'Automated measurements performed',
        resource_type: 'Study',
        resource_id: studyUid,
        metadata: {
          action_details: {
            measurement_types: measurementTypes,
            measurements_taken: response.measurements.length,
            abnormal_measurements: response.measurements.filter(m => m.isAbnormal).length
          }
        }
      });

      console.log('✅ Automated measurements completed:', {
        totalMeasurements: response.measurements.length,
        abnormalMeasurements: response.measurements.filter(m => m.isAbnormal).length
      });

      return response.measurements;
    } catch (error) {
      console.error('❌ Automated measurements failed:', error);
      throw new Error('Automated measurements failed. Please try again.');
    }
  }

  /**
   * Assess risk based on imaging findings
   */
  async assessRisk(
    studyUid: string,
    patientData: {
      age: number;
      gender: 'M' | 'F' | 'O';
      clinicalHistory?: string;
      familyHistory?: string;
      riskFactors?: string[];
    }
  ): Promise<RiskAssessment[]> {
    try {
      console.log('⚠️ Assessing risk for study:', studyUid);

      const requestData = {
        studyUid,
        patientData
      };

      const response = await apiService.post<{ riskAssessments: RiskAssessment[] }>(
        `${this.baseUrl}/risk-assessment`,
        requestData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'Risk assessment performed',
        resource_type: 'Study',
        resource_id: studyUid,
        metadata: {
          action_details: {
            risk_categories: response.riskAssessments.length,
            high_risk_findings: response.riskAssessments.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
            patient_age: patientData.age,
            patient_gender: patientData.gender
          }
        }
      });

      console.log('✅ Risk assessment completed:', {
        riskCategories: response.riskAssessments.length,
        highRiskFindings: response.riskAssessments.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length
      });

      return response.riskAssessments;
    } catch (error) {
      console.error('❌ Risk assessment failed:', error);
      throw new Error('Risk assessment failed. Please try again.');
    }
  }

  /**
   * Generate treatment recommendations
   */
  async generateTreatmentRecommendations(
    studyUid: string,
    findings: string[],
    patientContext: {
      age: number;
      comorbidities?: string[];
      currentTreatments?: string[];
      preferences?: string[];
    }
  ): Promise<TreatmentRecommendation[]> {
    try {
      console.log('💊 Generating treatment recommendations for study:', studyUid);

      const requestData = {
        studyUid,
        findings,
        patientContext
      };

      const response = await apiService.post<{ recommendations: TreatmentRecommendation[] }>(
        `${this.baseUrl}/treatment-recommendations`,
        requestData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: 'Treatment recommendations generated',
        resource_type: 'Study',
        resource_id: studyUid,
        metadata: {
          action_details: {
            findings_count: findings.length,
            recommendations_count: response.recommendations.length,
            immediate_priority: response.recommendations.filter(r => r.priority === 'immediate').length,
            patient_age: patientContext.age
          }
        }
      });

      console.log('✅ Treatment recommendations generated:', {
        totalRecommendations: response.recommendations.length,
        immediatePriority: response.recommendations.filter(r => r.priority === 'immediate').length
      });

      return response.recommendations;
    } catch (error) {
      console.error('❌ Treatment recommendation generation failed:', error);
      throw new Error('Treatment recommendation generation failed. Please try again.');
    }
  }

  /**
   * Perform detailed comparison with previous studies
   */
  async performDetailedComparison(
    currentStudyUid: string,
    previousStudyUids: string[],
    comparisonFocus?: string[]
  ): Promise<ComparisonAnalysis> {
    try {
      console.log('🔄 Performing detailed comparison for study:', currentStudyUid);

      const requestData = {
        currentStudyUid,
        previousStudyUids,
        comparisonFocus
      };

      const response = await apiService.post<ComparisonAnalysis>(
        `${this.baseUrl}/detailed-comparison`,
        requestData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'Detailed comparison performed',
        resource_type: 'Study',
        resource_id: currentStudyUid,
        metadata: {
          action_details: {
            previous_studies_count: previousStudyUids.length,
            key_changes_count: response.keyChanges.length,
            overall_trend: response.overallTrend,
            significant_changes: response.keyChanges.filter(c => c.significance === 'significant').length
          }
        }
      });

      console.log('✅ Detailed comparison completed:', {
        keyChanges: response.keyChanges.length,
        overallTrend: response.overallTrend,
        significantChanges: response.keyChanges.filter(c => c.significance === 'significant').length
      });

      return response;
    } catch (error) {
      console.error('❌ Detailed comparison failed:', error);
      throw new Error('Detailed comparison failed. Please try again.');
    }
  }

  /**
   * Get comprehensive AI analysis combining all advanced features
   */
  async getComprehensiveAnalysis(
    studyUid: string,
    patientData: {
      age: number;
      gender: 'M' | 'F' | 'O';
      clinicalHistory?: string;
      familyHistory?: string;
      riskFactors?: string[];
      comorbidities?: string[];
    },
    previousStudyUids?: string[]
  ): Promise<{
    abnormalities: AbnormalityDetection[];
    measurements: AutomatedMeasurement[];
    riskAssessments: RiskAssessment[];
    treatmentRecommendations: TreatmentRecommendation[];
    comparison?: ComparisonAnalysis;
    overallSummary: string;
    criticalFindings: string[];
    followUpRecommendations: string[];
  }> {
    try {
      console.log('🧠 Performing comprehensive AI analysis for study:', studyUid);

      const startTime = performance.now();

      // Run all analyses in parallel for efficiency
      const [
        abnormalities,
        measurements,
        riskAssessments,
        comparison
      ] = await Promise.all([
        this.detectAbnormalities(studyUid, { sensitivity: 'standard' }),
        this.performAutomatedMeasurements(studyUid, ['distance', 'area', 'volume']),
        this.assessRisk(studyUid, patientData),
        previousStudyUids?.length ?
          this.performDetailedComparison(studyUid, previousStudyUids) :
          Promise.resolve(undefined)
      ]);

      // Generate treatment recommendations based on findings
      const findings = [
        ...abnormalities.map(a => a.type),
        ...measurements.filter(m => m.isAbnormal).map(m => m.name)
      ];

      const treatmentRecommendations = findings.length > 0 ?
        await this.generateTreatmentRecommendations(studyUid, findings, patientData) :
        [];

      // Generate overall summary
      const criticalFindings = [
        ...abnormalities.filter(a => a.severity === 'highly_suspicious' || a.severity === 'suspicious').map(a => a.type),
        ...riskAssessments.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').map(r => r.category)
      ];

      const followUpRecommendations = [
        ...treatmentRecommendations.filter(t => t.priority === 'immediate' || t.priority === 'urgent').map(t => t.recommendation),
        ...riskAssessments.flatMap(r => r.recommendations)
      ];

      const processingTime = performance.now() - startTime;

      // Log comprehensive analysis completion
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: 'Comprehensive AI analysis completed',
        resource_type: 'Study',
        resource_id: studyUid,
        metadata: {
          action_details: {
            processing_time_ms: processingTime,
            abnormalities_found: abnormalities.length,
            measurements_taken: measurements.length,
            risk_assessments: riskAssessments.length,
            treatment_recommendations: treatmentRecommendations.length,
            critical_findings: criticalFindings.length,
            comparison_performed: !!comparison
          }
        }
      });

      const result = {
        abnormalities,
        measurements,
        riskAssessments,
        treatmentRecommendations,
        comparison,
        overallSummary: this.generateOverallSummary(abnormalities, measurements, riskAssessments, comparison),
        criticalFindings,
        followUpRecommendations
      };

      console.log('✅ Comprehensive AI analysis completed:', {
        processingTime: `${processingTime.toFixed(2)}ms`,
        abnormalities: abnormalities.length,
        measurements: measurements.length,
        criticalFindings: criticalFindings.length
      });

      return result;
    } catch (error) {
      console.error('❌ Comprehensive AI analysis failed:', error);
      throw new Error('Comprehensive AI analysis failed. Please try again.');
    }
  }

  /**
   * Generate overall summary from analysis results
   */
  private generateOverallSummary(
    abnormalities: AbnormalityDetection[],
    measurements: AutomatedMeasurement[],
    riskAssessments: RiskAssessment[],
    comparison?: ComparisonAnalysis
  ): string {
    const parts = [];

    if (abnormalities.length === 0) {
      parts.push("No significant abnormalities detected.");
    } else {
      const suspicious = abnormalities.filter(a => a.severity === 'suspicious' || a.severity === 'highly_suspicious');
      if (suspicious.length > 0) {
        parts.push(`${suspicious.length} suspicious finding(s) requiring attention.`);
      }
      parts.push(`Total of ${abnormalities.length} finding(s) identified.`);
    }

    const abnormalMeasurements = measurements.filter(m => m.isAbnormal);
    if (abnormalMeasurements.length > 0) {
      parts.push(`${abnormalMeasurements.length} abnormal measurement(s) detected.`);
    }

    const highRisk = riskAssessments.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical');
    if (highRisk.length > 0) {
      parts.push(`${highRisk.length} high-risk factor(s) identified.`);
    }

    if (comparison) {
      parts.push(`Comparison shows ${comparison.overallTrend} trend with ${comparison.keyChanges.length} notable change(s).`);
    }

    return parts.join(' ');
  }
}

export const advancedAIAnalysisService = new AdvancedAIAnalysisService();
export default advancedAIAnalysisService;