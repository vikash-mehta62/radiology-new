const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Study = require('../models/Study');
const { v4: uuidv4 } = require('uuid');

// Create a new report
router.post('/', async (req, res) => {
  try {
    const { study_uid, patient_id, exam_type, ai_generated = false } = req.body;

    // Validate required fields
    if (!study_uid || !patient_id) {
      return res.status(400).json({
        success: false,
        error: 'study_uid and patient_id are required'
      });
    }

    // Check if study exists
    const study = await Study.findOne({ study_uid });
    if (!study) {
      return res.status(404).json({
        success: false,
        error: 'Study not found'
      });
    }

    // Generate unique report ID
    const report_id = uuidv4();

    // Create report
    const report = new Report({
      report_id,
      study_uid,
      patient_id,
      exam_type: exam_type || study.dicom_metadata?.study_description || 'Unknown',
      ai_generated,
      status: 'draft'
    });

    await report.save();

    console.log(`✅ Report created: ${report_id} for study: ${study_uid}`);

    res.json({
      success: true,
      ...report.toObject(),
      id: report._id.toString()
    });

  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
      message: error.message
    });
  }
});

// Get all reports with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      skip = 0, 
      limit = 50, 
      status, 
      exam_type, 
      radiologist_id, 
      ai_generated 
    } = req.query;

    // Build filter query
    const filter = { active: true };
    if (status) filter.status = status;
    if (exam_type) filter.exam_type = exam_type;
    if (radiologist_id) filter.radiologist_id = radiologist_id;
    if (ai_generated !== undefined) filter.ai_generated = ai_generated === 'true';

    // Get reports with pagination
    const reports = await Report.find(filter)
      .sort({ created_at: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      reports: reports.map(report => ({
        ...report.toObject(),
        id: report._id.toString()
      })),
      total,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Error getting reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reports',
      message: error.message,
      reports: [],
      total: 0
    });
  }
});

// Get report templates (must come before /:reportId route)
router.get('/templates', (req, res) => {
  try {
    const { exam_type } = req.query;

    // Return basic templates (in a real implementation, these would be stored in database)
    const templates = getReportTemplates(exam_type);

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('❌ Error getting report templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report templates',
      message: error.message,
      templates: []
    });
  }
});

// Get a specific report by ID
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findOne({ 
      $or: [
        { report_id: reportId },
        { _id: reportId }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      ...report.toObject(),
      id: report._id.toString()
    });

  } catch (error) {
    console.error('❌ Error getting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report',
      message: error.message
    });
  }
});

// Get all reports for a study
router.get('/study/:studyUid', async (req, res) => {
  try {
    const { studyUid } = req.params;

    const reports = await Report.find({ 
      study_uid: studyUid,
      active: true 
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      reports: reports.map(report => ({
        ...report.toObject(),
        id: report._id.toString()
      }))
    });

  } catch (error) {
    console.error('❌ Error getting study reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get study reports',
      message: error.message,
      reports: []
    });
  }
});

// Update a report
router.put('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { findings, impressions, recommendations, status } = req.body;

    const report = await Report.findOne({ 
      $or: [
        { report_id: reportId },
        { _id: reportId }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Update fields
    if (findings !== undefined) report.findings = findings;
    if (impressions !== undefined) report.impressions = impressions;
    if (recommendations !== undefined) report.recommendations = recommendations;
    if (status !== undefined) {
      report.status = status;
      if (status === 'final' && !report.finalized_at) {
        report.finalized_at = new Date();
      }
    }

    await report.save();

    console.log(`✅ Report updated: ${reportId}`);

    res.json({
      success: true,
      ...report.toObject(),
      id: report._id.toString()
    });

  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update report',
      message: error.message
    });
  }
});

// Delete a report
router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findOne({ 
      $or: [
        { report_id: reportId },
        { _id: reportId }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Soft delete
    report.active = false;
    await report.save();

    console.log(`✅ Report deleted: ${reportId}`);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      message: error.message
    });
  }
});

// Finalize a report
router.post('/:reportId/finalize', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findOne({ 
      $or: [
        { report_id: reportId },
        { _id: reportId }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    report.status = 'final';
    report.finalized_at = new Date();
    await report.save();

    console.log(`✅ Report finalized: ${reportId}`);

    res.json({
      success: true,
      ...report.toObject(),
      id: report._id.toString()
    });

  } catch (error) {
    console.error('❌ Error finalizing report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize report',
      message: error.message
    });
  }
});

// Generate AI report
router.post('/ai-generate', async (req, res) => {
  try {
    const { study_uid } = req.body;

    if (!study_uid) {
      return res.status(400).json({
        success: false,
        error: 'study_uid is required'
      });
    }

    // Check if study exists
    const study = await Study.findOne({ study_uid });
    if (!study) {
      return res.status(404).json({
        success: false,
        error: 'Study not found'
      });
    }

    // Generate unique report ID
    const report_id = uuidv4();

    // Simulate AI analysis (in a real implementation, this would call an AI service)
    const aiFindings = generateAIFindings(study);
    const aiImpressions = generateAIImpressions(study);
    const aiRecommendations = generateAIRecommendations(study);

    // Create AI-generated report
    const report = new Report({
      report_id,
      study_uid,
      patient_id: study.patient_id,
      exam_type: study.dicom_metadata?.study_description || 'AI Analysis',
      ai_generated: true,
      ai_confidence: 0.85, // Simulated confidence score
      status: 'draft',
      findings: aiFindings,
      impressions: aiImpressions,
      recommendations: aiRecommendations
    });

    await report.save();

    console.log(`✅ AI Report generated: ${report_id} for study: ${study_uid}`);

    res.json({
      success: true,
      ...report.toObject(),
      id: report._id.toString()
    });

  } catch (error) {
    console.error('❌ Error generating AI report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI report',
      message: error.message
    });
  }
});

// Helper functions for AI generation (simulated)
function generateAIFindings(study) {
  const modality = study.modality || 'Unknown';
  const studyDescription = study.study_description || study.dicom_metadata?.study_description || 'Medical imaging study';
  
  return `AI Analysis of ${modality} study (${studyDescription}):

TECHNIQUE: ${modality} imaging was performed according to standard protocol.

FINDINGS:
- Image quality is adequate for diagnostic interpretation
- No acute abnormalities detected in the visualized structures
- Normal anatomical variants noted
- Further clinical correlation recommended

Note: This is an AI-generated preliminary report. Please review and modify as appropriate based on clinical findings and radiologist interpretation.`;
}

function generateAIImpressions(study) {
  return `IMPRESSION:
1. No acute abnormalities detected on this ${study.modality || 'imaging'} study
2. Recommend clinical correlation
3. Follow-up as clinically indicated

AI Confidence: 85%
Note: This AI-generated impression requires radiologist review and approval.`;
}

function generateAIRecommendations(study) {
  return `RECOMMENDATIONS:
1. Clinical correlation with patient symptoms and physical examination
2. Consider follow-up imaging if clinically indicated
3. Radiologist review and final interpretation required

Generated by AI Analysis System - Requires physician validation`;
}

function getReportTemplates(examType) {
  const baseTemplates = [
    {
      id: 'basic',
      name: 'Basic Report Template',
      exam_type: 'general',
      template: {
        findings: 'TECHNIQUE:\n\nFINDINGS:\n\n',
        impressions: 'IMPRESSION:\n1. \n2. \n3. ',
        recommendations: 'RECOMMENDATIONS:\n1. \n2. '
      }
    },
    {
      id: 'ct_chest',
      name: 'CT Chest Template',
      exam_type: 'CT',
      template: {
        findings: 'TECHNIQUE: CT chest with/without contrast\n\nFINDINGS:\nLungs:\nPleura:\nMediastinum:\nHeart:\nBones:\n',
        impressions: 'IMPRESSION:\n1. \n2. ',
        recommendations: 'RECOMMENDATIONS:\n1. Clinical correlation\n2. Follow-up as indicated'
      }
    },
    {
      id: 'xray_chest',
      name: 'Chest X-Ray Template',
      exam_type: 'CR',
      template: {
        findings: 'TECHNIQUE: Chest radiograph\n\nFINDINGS:\nLungs:\nHeart:\nMediastinum:\nBones:\n',
        impressions: 'IMPRESSION:\n1. \n2. ',
        recommendations: 'RECOMMENDATIONS:\n1. Clinical correlation'
      }
    }
  ];

  if (examType) {
    return baseTemplates.filter(template => 
      template.exam_type.toLowerCase() === examType.toLowerCase() || 
      template.exam_type === 'general'
    );
  }

  return baseTemplates;
}

module.exports = router;