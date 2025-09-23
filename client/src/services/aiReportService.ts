/**
 * AI Report Generation Service
 * Integrates with medical AI APIs for automated report generation
 */

import { apiService } from './api';
import { auditService } from './auditService';
import { performanceMonitor } from './performanceMonitor';

export interface AIAnalysisRequest {
  studyUid: string;
  imageIds: string[];
  examType: string;
  patientAge?: number;
  patientGender?: 'M' | 'F' | 'O';
  clinicalHistory?: string;
  urgency: 'routine' | 'urgent' | 'stat';
  analysisType: 'full' | 'screening' | 'comparison' | 'measurement';
}

export interface AIFinding {
  id: string;
  type: 'normal' | 'abnormal' | 'incidental';
  category: string;
  description: string;
  location: {
    slice?: number;
    coordinates?: { x: number; y: number; z?: number };
    anatomicalRegion: string;
  };
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  measurements?: {
    name: string;
    value: number;
    unit: string;
    normalRange?: { min: number; max: number };
  }[];
  recommendations?: string[];
}

export interface AIAnalysisResult {
  analysisId: string;
  studyUid: string;
  status: 'processing' | 'completed' | 'failed' | 'review_required';
  confidence: number;
  processingTime: number;
  findings: AIFinding[];
  overallImpression: string;
  recommendations: string[];
  reviewRequired: boolean;
  qualityMetrics: {
    imageQuality: number;
    analysisReliability: number;
    modelVersion: string;
  };
}

export interface AIReportTemplate {
  templateId: string;
  examType: string;
  findings: string;
  impression: string;
  recommendations: string;
  confidence: number;
  metadata: {
    modelVersion: string;
    processingTime: number;
    imageCount: number;
  };
}

class AIReportService {
  private baseUrl = '/api/ai-reports';

  /**
   * Generate AI analysis for a study
   */
  async generateAIAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    try {
      console.log('🤖 Starting AI analysis for study:', request.studyUid);
      
      const startTime = performance.now();

      // Log audit event for AI analysis start
      await auditService.logEvent({
        event_type: 'report_created',
        event_description: 'AI analysis started',
        resource_type: 'Study',
        resource_id: request.studyUid,
        metadata: {
          action_details: {
            exam_type: request.examType,
            analysis_type: request.analysisType,
            urgency: request.urgency,
            image_count: request.imageIds.length
          }
        }
      });

      const response = await apiService.post<AIAnalysisResult>(
        `${this.baseUrl}/analyze`,
        request
      );

      const processingTime = performance.now() - startTime;

      // Record performance metrics
      performanceMonitor.recordImageLoadTime(processingTime);

      // Log completion audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: 'AI analysis completed',
        resource_type: 'Study',
        resource_id: request.studyUid,
        metadata: {
          action_details: {
            analysis_id: response.analysisId,
            confidence: response.confidence,
            findings_count: response.findings.length,
            processing_time_ms: processingTime,
            review_required: response.reviewRequired
          }
        }
      });

      console.log('✅ AI analysis completed:', {
        analysisId: response.analysisId,
        confidence: response.confidence,
        findingsCount: response.findings.length,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return response;
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
           
      // Log failure audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: 'AI analysis failed',
        resource_type: 'Study',
        resource_id: request.studyUid,
        metadata: {
          action_details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            exam_type: request.examType
          }
        }
      });

      throw new Error('AI analysis failed. Please try again or create a manual report.');
    }
  }

  /**
   * Generate structured report from AI analysis
   */
  async generateReportFromAnalysis(
    analysisId: string,
    customizations?: {
      includeNormalFindings?: boolean;
      detailLevel: 'brief' | 'standard' | 'detailed';
      includeRecommendations?: boolean;
      includeMeasurements?: boolean;
    }
  ): Promise<AIReportTemplate> {
    try {
      console.log('📝 Generating report from AI analysis:', analysisId);

      const requestData = {
        analysisId,
        customizations: {
          includeNormalFindings: true,
          detailLevel: 'standard',
          includeRecommendations: true,
          includeMeasurements: true,
          ...customizations
        }
      };

      const response = await apiService.post<AIReportTemplate>(
        `${this.baseUrl}/generate-report`,
        requestData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_created',
        event_description: 'AI report generated',
        resource_type: 'Report',
        resource_id: analysisId,
        metadata: {
          action_details: {
            detail_level: requestData.customizations.detailLevel,
            confidence: response.confidence,
            exam_type: response.examType
          }
        }
      });

      console.log('✅ AI report generated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to generate AI report:', error);
      throw new Error('Failed to generate AI report. Please try again.');
    }
  }

  /**
   * Get AI analysis status
   */
  async getAnalysisStatus(analysisId: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    estimatedTimeRemaining?: number;
    currentStep?: string;
  }> {
    try {
      const response = await apiService.get<{
        status: 'processing' | 'completed' | 'failed';
        progress: number;
        estimatedTimeRemaining?: number;
        currentStep?: string;
      }>(`${this.baseUrl}/status/${analysisId}`);
           
      return response;
    } catch (error) {
      console.error('❌ Failed to get analysis status:', error);
      return {
        status: 'failed',
        progress: 0
      };
    }
  }

  /**
   * Compare current study with previous studies using AI
   */
  async performAIComparison(
    currentStudyUid: string,
    previousStudyUids: string[],
    comparisonType: 'progression' | 'treatment_response' | 'follow_up'
  ): Promise<{
    comparisonId: string;
    keyChanges: Array<{
      type: 'new' | 'resolved' | 'progressed' | 'stable';
      description: string;
      confidence: number;
      location?: string;
    }>;
    overallAssessment: string;
    recommendations: string[];
  }> {
    try {
      console.log('🔍 Performing AI comparison for study:', currentStudyUid);

      const requestData = {
        currentStudyUid,
        previousStudyUids,
        comparisonType
      };

      const response = await apiService.post<{
        comparisonId: string;
        keyChanges: Array<{
          type: 'new' | 'resolved' | 'progressed' | 'stable';
          description: string;
          confidence: number;
          location?: string;
        }>;
        overallAssessment: string;
        recommendations: string[];
      }>(`${this.baseUrl}/compare`, requestData);

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'AI comparison performed',
        resource_type: 'Study',
        resource_id: currentStudyUid,
        metadata: {
          action_details: {
            comparison_id: response.comparisonId,
            comparison_type: comparisonType,
            previous_studies_count: previousStudyUids.length,
            changes_detected: response.keyChanges.length
          }
        }
      });

      console.log('✅ AI comparison completed');
      return response;
    } catch (error) {
      console.error('❌ AI comparison failed:', error);
      throw new Error('AI comparison failed. Please try again.');
    }
  }

  /**
   * Get available AI models and their capabilities
   */
  async getAvailableAIModels(): Promise<Array<{
    id: string;
    name: string;
    specialty: string;
    examTypes: string[];
    capabilities: string[];
    accuracy: number;
    version: string;
    lastUpdated: string;
    isActive: boolean;
  }>> {
    try {
      const response = await apiService.get<{
        models: Array<{
          id: string;
          name: string;
          specialty: string;
          examTypes: string[];
          capabilities: string[];
          accuracy: number;
          version: string;
          lastUpdated: string;
          isActive: boolean;
        }>
      }>(`${this.baseUrl}/models`);
           
      return response.models || [];
    } catch (error) {
      console.error('❌ Failed to get AI models:', error);
      return [];
    }
  }

  /**
   * Validate AI service connectivity and model availability
   */
  async validateAIService(): Promise<{
    isAvailable: boolean;
    modelsLoaded: number;
    averageResponseTime: number;
    issues: string[];
  }> {
    try {
      const response = await apiService.get<{
        isAvailable: boolean;
        modelsLoaded: number;
        averageResponseTime: number;
        issues: string[];
      }>(`${this.baseUrl}/health`);
           
      return response;
    } catch (error) {
      console.error('❌ Failed to validate AI service:', error);
      return {
        isAvailable: false,
        modelsLoaded: 0,
        averageResponseTime: 0,
        issues: ['Failed to connect to AI service']
      };
    }
  }

  /**
   * Submit feedback on AI analysis for model improvement
   */
  async submitAIFeedback(
    analysisId: string,
    feedback: {
      accuracy: number; // 1-5 scale
      findings: Array<{
        findingId: string;
        isCorrect: boolean;
        correctedDescription?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
      }>;
      overallComments?: string;
      radiologistId: string;
    }
  ): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/feedback`, {
        analysisId,
        ...feedback,
        submittedAt: new Date().toISOString()
      });

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: 'AI feedback submitted',
        resource_type: 'Report',
        resource_id: analysisId,
        metadata: {
          action_details: {
            accuracy_rating: feedback.accuracy,
            findings_reviewed: feedback.findings.length,
            radiologist_id: feedback.radiologistId
          }
        }
      });

      console.log('✅ AI feedback submitted successfully');
    } catch (error) {
      console.error('❌ Failed to submit AI feedback:', error);
      throw new Error('Failed to submit feedback. Please try again.');
    }
  }
}

export const aiReportService = new AIReportService();
export default aiReportService;