/**
 * Phase 1 Core Functionality Integration Tests
 * Tests email integration, AI report generation, and advanced AI analysis
 */

import { emailService } from '../services/emailService';
import { aiReportService } from '../services/aiReportService';
import { advancedAIAnalysisService } from '../services/advancedAIAnalysis';
import { enhancedReportService } from '../services/enhancedReportService';
import { reportService } from '../services/reportService';

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock audit service
jest.mock('../services/auditService', () => ({
  auditService: {
    logEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock performance monitor
jest.mock('../services/performanceMonitor', () => ({
  performanceMonitor: {
    recordImageLoadTime: jest.fn(),
    recordReportGenerationTime: jest.fn()
  }
}));

describe('Phase 1: Core Functionality Integration Tests', () => {
  const mockStudyUid = 'test-study-123';
  const mockReportId = 'test-report-456';
  const mockPatientEmail = 'patient@test.com';
  const mockDoctorEmail = 'doctor@test.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Integration Service', () => {
    test('should send report to patient with HIPAA compliance', async () => {
      const { apiService } = require('../services/api');
      const mockDeliveryStatus = {
        id: 'delivery-123',
        status: 'sent',
        trackingId: 'track-456',
        sentAt: new Date().toISOString()
      };

      apiService.post.mockResolvedValue(mockDeliveryStatus);

      const result = await emailService.sendReportToPatient(
        mockReportId,
        mockPatientEmail,
        'John Doe',
        {
          priority: 'high',
          encrypted: true,
          expirationDays: 30
        }
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/email/send-report',
        expect.objectContaining({
          reportId: mockReportId,
          recipient: {
            email: mockPatientEmail,
            name: 'John Doe',
            type: 'patient'
          },
          template: 'patient_report_delivery',
          options: expect.objectContaining({
            encrypted: true,
            priority: 'high',
            expirationDays: 30
          })
        })
      );

      expect(result).toEqual(mockDeliveryStatus);
    });

    test('should send report to doctor with proper configuration', async () => {
      const { apiService } = require('../services/api');
      const mockDeliveryStatus = {
        id: 'delivery-789',
        status: 'sent',
        trackingId: 'track-789'
      };

      apiService.post.mockResolvedValue(mockDeliveryStatus);

      const result = await emailService.sendReportToDoctor(
        mockReportId,
        mockDoctorEmail,
        'Dr. Smith'
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/email/send-report',
        expect.objectContaining({
          reportId: mockReportId,
          recipient: {
            email: mockDoctorEmail,
            name: 'Dr. Smith',
            type: 'doctor'
          },
          template: 'doctor_report_delivery',
          options: expect.objectContaining({
            encrypted: true,
            priority: 'high',
            expirationDays: 90
          })
        })
      );

      expect(result).toEqual(mockDeliveryStatus);
    });

    test('should validate email configuration', async () => {
      const { apiService } = require('../services/api');
      const mockValidation = {
        isConfigured: true,
        smtpConnected: true,
        encryptionEnabled: true,
        issues: []
      };

      apiService.get.mockResolvedValue(mockValidation);

      const result = await emailService.validateEmailConfiguration();

      expect(apiService.get).toHaveBeenCalledWith('/api/email/validate-config');
      expect(result).toEqual(mockValidation);
    });
  });

  describe('AI Report Generation Service', () => {
    test('should generate AI analysis for study', async () => {
      const { apiService } = require('../services/api');
      const mockAnalysisResult = {
        analysisId: 'ai-analysis-123',
        studyUid: mockStudyUid,
        status: 'completed',
        confidence: 0.85,
        processingTime: 1500,
        findings: [
          {
            id: 'finding-1',
            type: 'normal',
            description: 'No acute findings',
            confidence: 0.9,
            severity: 'low'
          }
        ],
        overallImpression: 'Normal study with no acute findings',
        recommendations: ['Routine follow-up'],
        reviewRequired: false
      };

      apiService.post.mockResolvedValue(mockAnalysisResult);

      const analysisRequest = {
        studyUid: mockStudyUid,
        imageIds: ['image1', 'image2'],
        examType: 'CT_CHEST',
        urgency: 'routine' as const,
        analysisType: 'full' as const
      };

      const result = await aiReportService.generateAIAnalysis(analysisRequest);

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/ai-reports/analyze',
        analysisRequest
      );
      expect(result).toEqual(mockAnalysisResult);
    });

    test('should generate report from AI analysis', async () => {
      const { apiService } = require('../services/api');
      const mockReportTemplate = {
        examType: 'CT_CHEST',
        template: {
          findings: 'AI-generated findings text',
          impression: 'AI-generated impression',
          recommendations: 'AI-generated recommendations'
        },
        confidence: 0.88
      };

      apiService.post.mockResolvedValue(mockReportTemplate);

      const result = await aiReportService.generateReportFromAnalysis(
        'ai-analysis-123',
        {
          detailLevel: 'standard',
          includeRecommendations: true,
          includeMeasurements: true
        }
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/ai-reports/generate-report',
        {
          analysisId: 'ai-analysis-123',
          customizations: {
            includeNormalFindings: true,
            detailLevel: 'standard',
            includeRecommendations: true,
            includeMeasurements: true
          }
        }
      );
      expect(result).toEqual(mockReportTemplate);
    });

    test('should perform AI comparison between studies', async () => {
      const { apiService } = require('../services/api');
      const mockComparison = {
        comparisonId: 'comparison-123',
        keyChanges: [
          {
            type: 'new',
            description: 'New nodule detected in right upper lobe',
            confidence: 0.82,
            location: 'Right upper lobe'
          }
        ],
        overallAssessment: 'New findings detected requiring follow-up',
        recommendations: ['Short-term follow-up CT in 3 months']
      };

      apiService.post.mockResolvedValue(mockComparison);

      const result = await aiReportService.performAIComparison(
        mockStudyUid,
        ['previous-study-1', 'previous-study-2'],
        'follow_up'
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/ai-reports/compare',
        {
          currentStudyUid: mockStudyUid,
          previousStudyUids: ['previous-study-1', 'previous-study-2'],
          comparisonType: 'follow_up'
        }
      );
      expect(result).toEqual(mockComparison);
    });
  });

  describe('Advanced AI Analysis Service', () => {
    test('should detect abnormalities in medical images', async () => {
      const { apiService } = require('../services/api');
      const mockAbnormalities = [
        {
          id: 'abnormality-1',
          type: 'nodule',
          location: {
            slice: 15,
            coordinates: { x: 100, y: 150 },
            anatomicalRegion: 'Right upper lobe'
          },
          characteristics: {
            size: { width: 8, height: 8, unit: 'mm' },
            shape: 'round',
            density: 'hypodense'
          },
          confidence: 0.87,
          severity: 'indeterminate',
          differentialDiagnosis: ['Benign nodule', 'Early malignancy'],
          recommendedFollowUp: ['3-month follow-up CT']
        }
      ];

      apiService.post.mockResolvedValue({ abnormalities: mockAbnormalities });

      const result = await advancedAIAnalysisService.detectAbnormalities(
        mockStudyUid,
        {
          sensitivity: 'high',
          excludeNormalVariants: true
        }
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/advanced-ai/detect-abnormalities',
        {
          studyUid: mockStudyUid,
          options: {
            sensitivity: 'high',
            excludeNormalVariants: true
          }
        }
      );
      expect(result).toEqual(mockAbnormalities);
    });

    test('should perform automated measurements', async () => {
      const { apiService } = require('../services/api');
      const mockMeasurements = [
        {
          id: 'measurement-1',
          type: 'distance',
          name: 'Aortic diameter',
          value: 32,
          unit: 'mm',
          location: {
            slice: 20,
            coordinates: [{ x: 200, y: 250 }, { x: 232, y: 250 }]
          },
          normalRange: { min: 20, max: 35 },
          isAbnormal: false,
          confidence: 0.94,
          method: 'ai_segmentation'
        }
      ];

      apiService.post.mockResolvedValue({ measurements: mockMeasurements });

      const result = await advancedAIAnalysisService.performAutomatedMeasurements(
        mockStudyUid,
        ['distance', 'area'],
        { precision: 'high' }
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/advanced-ai/automated-measurements',
        {
          studyUid: mockStudyUid,
          measurementTypes: ['distance', 'area'],
          options: {
            precision: 'high'
          }
        }
      );
      expect(result).toEqual(mockMeasurements);
    });

    test('should assess risk based on imaging findings', async () => {
      const { apiService } = require('../services/api');
      const mockRiskAssessments = [
        {
          category: 'Cardiovascular',
          riskLevel: 'moderate',
          riskScore: 65,
          factors: [
            {
              factor: 'Coronary calcification',
              contribution: 40,
              description: 'Moderate coronary calcification detected'
            }
          ],
          recommendations: ['Cardiology consultation', 'Lipid management'],
          timeframe: '6 months'
        }
      ];

      apiService.post.mockResolvedValue({ riskAssessments: mockRiskAssessments });

      const patientData = {
        age: 55,
        gender: 'M' as const,
        clinicalHistory: 'Chest pain',
        riskFactors: ['Smoking', 'Hypertension']
      };

      const result = await advancedAIAnalysisService.assessRisk(mockStudyUid, patientData);

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/advanced-ai/risk-assessment',
        {
          studyUid: mockStudyUid,
          patientData
        }
      );
      expect(result).toEqual(mockRiskAssessments);
    });
  });

  describe('Enhanced Report Service Integration', () => {
    test('should create report with AI enhancements and email notifications', async () => {
      const { apiService } = require('../services/api');
      
      // Mock the base report creation
      const mockReport = {
        id: mockReportId,
        report_id: mockReportId,
        study_uid: mockStudyUid,
        patient_id: 'patient-123',
        exam_type: 'CT_CHEST',
        status: 'draft',
        findings: 'Initial findings',
        impressions: 'Initial impression',
        created_at: new Date().toISOString()
      };

      // Mock AI analysis
      const mockAIAnalysis = {
        analysisId: 'ai-123',
        findings: [{ description: 'AI finding', confidence: 0.9 }],
        overallImpression: 'AI impression'
      };

      // Mock email delivery
      const mockEmailDelivery = {
        id: 'email-123',
        status: 'sent',
        trackingId: 'track-123'
      };

      apiService.post
        .mockResolvedValueOnce(mockReport) // Report creation
        .mockResolvedValueOnce(mockAIAnalysis) // AI analysis
        .mockResolvedValueOnce(mockReport) // Report update
        .mockResolvedValueOnce(mockEmailDelivery); // Email sending

      const createRequest = {
        study_uid: mockStudyUid,
        patient_id: 'patient-123',
        exam_type: 'CT_CHEST',
        ai_generated: false
      };

      const postCreationOptions = {
        autoSave: true,
        generateAIInsights: true,
        sendToPatient: true,
        sendToReferringDoctor: true,
        exportToPDF: true,
        emailOptions: {
          priority: 'high' as const,
          encrypted: true,
          expirationDays: 30
        }
      };

      const result = await enhancedReportService.createReportWithEnhancements({
        ...createRequest,
        postCreationOptions
      });

      expect(result).toEqual(mockReport);
      
      // Verify report creation was called
      expect(apiService.post).toHaveBeenCalledWith(
        '/api/reports',
        expect.objectContaining(createRequest)
      );
    });
  });

  describe('Report Service AI Integration', () => {
    test('should generate comprehensive AI report with all features', async () => {
      const { apiService } = require('../services/api');
      
      // Mock study data
      const mockStudy = {
        study_uid: mockStudyUid,
        patient_id: 'patient-123',
        exam_type: 'CT_CHEST',
        image_urls: ['image1.dcm', 'image2.dcm']
      };

      // Mock AI analysis result
      const mockAIAnalysis = {
        analysisId: 'ai-comprehensive-123',
        studyUid: mockStudyUid,
        status: 'completed',
        confidence: 0.92,
        findings: [
          {
            id: 'finding-1',
            description: 'Normal lung parenchyma',
            confidence: 0.95
          }
        ],
        overallImpression: 'No acute cardiopulmonary abnormalities'
      };

      // Mock AI report template
      const mockReportTemplate = {
        examType: 'CT_CHEST',
        template: {
          findings: 'Comprehensive AI findings',
          impression: 'AI-generated impression',
          recommendations: 'AI recommendations'
        },
        confidence: 0.92
      };

      // Mock final report
      const mockFinalReport = {
        id: 'ai-report-123',
        report_id: 'ai-report-123',
        study_uid: mockStudyUid,
        ai_generated: true,
        ai_confidence: 0.92,
        findings: mockReportTemplate.template.findings,
        impressions: mockReportTemplate.template.impression
      };

      apiService.get.mockResolvedValueOnce(mockStudy);
      apiService.post
        .mockResolvedValueOnce(mockAIAnalysis) // AI analysis
        .mockResolvedValueOnce(mockReportTemplate) // Report template
        .mockResolvedValueOnce(mockFinalReport); // Final report

      const result = await reportService.generateAIReport(mockStudyUid, {
        examType: 'CT_CHEST',
        urgency: 'routine',
        customizations: {
          detailLevel: 'detailed',
          includeNormalFindings: true,
          includeMeasurements: true
        }
      });

      expect(result).toEqual(mockFinalReport);
      expect(result.ai_generated).toBe(true);
      expect(result.ai_confidence).toBe(0.92);
    });

    test('should handle AI report generation with comparison', async () => {
      const { apiService } = require('../services/api');
      
      const mockStudy = { study_uid: mockStudyUid, patient_id: 'patient-123' };
      const mockAIAnalysis = { analysisId: 'ai-123', confidence: 0.9, findings: [] };
      const mockReportTemplate = { template: { findings: 'AI findings' }, confidence: 0.9 };
      const mockReport = { id: 'report-123', findings: 'AI findings', recommendations: 'AI recommendations' };
      const mockComparison = {
        keyChanges: [{ description: 'New finding detected' }],
        recommendations: ['Follow-up recommended']
      };
      const mockUpdatedReport = { 
        id: 'report-123', 
        findings: 'AI findings\n\nCOMPARISON WITH PRIOR STUDIES:\n- New finding detected',
        recommendations: 'AI recommendations\n\nCOMPARISON RECOMMENDATIONS:\nFollow-up recommended'
      };

      apiService.get.mockResolvedValue(mockStudy);
      apiService.post
        .mockResolvedValueOnce(mockAIAnalysis)
        .mockResolvedValueOnce(mockReportTemplate)
        .mockResolvedValueOnce(mockReport)
        .mockResolvedValueOnce(mockComparison);
      apiService.put.mockResolvedValueOnce(mockUpdatedReport);

      const result = await reportService.generateAIReport(mockStudyUid, {
        includeComparison: true,
        previousStudyUids: ['prev-study-1']
      });

      expect(result).toEqual(mockUpdatedReport);
      expect(result.findings).toContain('COMPARISON WITH PRIOR STUDIES');
      expect(result.recommendations).toContain('COMPARISON RECOMMENDATIONS');
    });
  });

  describe('End-to-End Integration', () => {
    test('should complete full workflow: AI analysis → Report creation → Email delivery', async () => {
      const { apiService } = require('../services/api');
      
      // Mock all API responses for complete workflow
      const mockStudy = { study_uid: mockStudyUid, patient_id: 'patient-123' };
      const mockAIAnalysis = { analysisId: 'ai-123', confidence: 0.9, findings: [] };
      const mockReportTemplate = { template: { findings: 'AI findings' }, confidence: 0.9 };
      const mockReport = { id: 'report-123', study_uid: mockStudyUid };
      const mockEmailDelivery = { status: 'sent', trackingId: 'track-123' };

      apiService.get.mockResolvedValue(mockStudy);
      apiService.post
        .mockResolvedValueOnce(mockAIAnalysis)
        .mockResolvedValueOnce(mockReportTemplate)
        .mockResolvedValueOnce(mockReport)
        .mockResolvedValueOnce(mockEmailDelivery);

      // Execute full workflow
      const aiReport = await reportService.generateAIReport(mockStudyUid);
      const emailResult = await emailService.sendReportToPatient(
        aiReport.id,
        mockPatientEmail,
        'John Doe'
      );

      expect(aiReport).toBeDefined();
      expect(emailResult.status).toBe('sent');
      expect(emailResult.trackingId).toBe('track-123');
    });
  });
});