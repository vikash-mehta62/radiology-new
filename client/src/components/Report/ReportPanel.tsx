import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Save as SaveIcon,
  Send as FinalizeIcon,
  Refresh as RegenerateIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

import { Report, Study, MeasurementValue } from '../../types';
import { apiService } from '../../services/api';
import MeasurementEditor from './MeasurementEditor';
import WorkflowTimer from './WorkflowTimer';

interface ReportPanelProps {
  study: Study;
  report?: Report;
  onReportUpdate?: (report: Report) => void;
  onReportFinalized?: (report: Report) => void;
}

interface AIGenerationStatus {
  isGenerating: boolean;
  progress: number;
  stage: string;
  timeElapsed: number;
}

const ReportPanel: React.FC<ReportPanelProps> = ({
  study,
  report: initialReport,
  onReportUpdate,
  onReportFinalized,
}) => {
  const [report, setReport] = useState<Report | null>(initialReport || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIGenerationStatus>({
    isGenerating: false,
    progress: 0,
    stage: '',
    timeElapsed: 0,
  });
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [workflowStartTime, setWorkflowStartTime] = useState<Date | null>(null);

  // Form state
  const [findings, setFindings] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, MeasurementValue>>({});
  const [impressions, setImpressions] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);

  // Initialize form with existing report data
  useEffect(() => {
    if (report) {
      setFindings(report.findings || '');
      setMeasurements(report.measurements || {});
      setImpressions(report.impressions || '');
      setRecommendations(report.recommendations || '');
      setDiagnosisCodes(report.diagnosis_codes || []);
    }
  }, [report]);

  // Auto-generate AI report when component mounts for new reports
  useEffect(() => {
    if (!report && study) {
      setWorkflowStartTime(new Date());
      generateAIReport();
    }
  }, [study, report]);

  const generateAIReport = async () => {
    if (!study) return;

    try {
      setAiStatus({
        isGenerating: true,
        progress: 0,
        stage: 'Initializing AI analysis...',
        timeElapsed: 0,
      });

      const startTime = Date.now();
      const updateProgress = (progress: number, stage: string) => {
        setAiStatus({
          isGenerating: true,
          progress,
          stage,
          timeElapsed: (Date.now() - startTime) / 1000,
        });
      };

      // Simulate AI processing stages
      updateProgress(10, 'Analyzing DICOM images...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateProgress(30, 'Extracting measurements...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      updateProgress(60, 'Generating clinical findings...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      updateProgress(80, 'Creating impressions and recommendations...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateProgress(95, 'Finalizing report...');

      // Generate AI report
      const aiReport = await apiService.generateAIReport(study.study_uid, study.exam_type);
      
      updateProgress(100, 'AI report generated successfully!');

      // Extract data from AI response
      const reportDraft = aiReport.report_draft;
      setFindings(reportDraft.findings || '');
      setMeasurements(reportDraft.measurements || {});
      setImpressions(reportDraft.impressions || '');
      setRecommendations(reportDraft.recommendations || '');
      setDiagnosisCodes(reportDraft.suggested_diagnosis_codes || []);

      // Create the report in the database
      const newReport = await apiService.createReport({
        study_uid: study.study_uid,
        exam_type: study.exam_type,
        findings: reportDraft.findings,
        measurements: reportDraft.measurements,
        impressions: reportDraft.impressions,
        recommendations: reportDraft.recommendations,
        diagnosis_codes: reportDraft.suggested_diagnosis_codes,
        cpt_codes: reportDraft.suggested_cpt_codes,
        status: 'draft',
        ai_generated: true,
      });

      setReport(newReport);
      onReportUpdate?.(newReport);

      setTimeout(() => {
        setAiStatus({
          isGenerating: false,
          progress: 100,
          stage: 'Ready for review',
          timeElapsed: (Date.now() - startTime) / 1000,
        });
      }, 500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI report';
      setError(errorMessage);
      setAiStatus({
        isGenerating: false,
        progress: 0,
        stage: 'Error occurred',
        timeElapsed: 0,
      });
    }
  };

  const saveReport = async () => {
    if (!report) return;

    try {
      setIsLoading(true);
      setError(null);

      const updatedReport = await apiService.updateReport(report.report_id, {
        findings,
        measurements,
        impressions,
        recommendations,
        diagnosis_codes: diagnosisCodes,
        status: 'draft',
      });

      setReport(updatedReport);
      onReportUpdate?.(updatedReport);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save report';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeReport = async () => {
    if (!report) return;

    try {
      setIsLoading(true);
      setError(null);

      // First save current changes
      await saveReport();

      // Then finalize the report
      const finalizedReport = await apiService.finalizeReport(report.report_id);
      
      setReport(finalizedReport);
      onReportFinalized?.(finalizedReport);
      setShowFinalizeDialog(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize report';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateAIReport = async () => {
    await generateAIReport();
  };

  const getWorkflowTimeElapsed = (): number => {
    if (!workflowStartTime) return 0;
    return (Date.now() - workflowStartTime.getTime()) / 1000;
  };

  const isWithinTargetTime = (): boolean => {
    return getWorkflowTimeElapsed() <= 60; // 1 minute target
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Workflow Timer */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI-Assisted Report Generation
          </Typography>
          
          {workflowStartTime && (
            <WorkflowTimer
              startTime={workflowStartTime}
              targetTime={60}
              isCompleted={report?.status === 'final'}
            />
          )}
        </Box>

        {/* AI Generation Progress */}
        {aiStatus.isGenerating && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AIIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2" color="primary">
                {aiStatus.stage}
              </Typography>
              <Typography variant="caption" sx={{ ml: 'auto' }}>
                {aiStatus.timeElapsed.toFixed(1)}s
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={aiStatus.progress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RegenerateIcon />}
            onClick={regenerateAIReport}
            disabled={aiStatus.isGenerating || isLoading}
            size="small"
          >
            Regenerate AI
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveReport}
            disabled={!report || isLoading}
            size="small"
          >
            Save Draft
          </Button>
          
          <Button
            variant="contained"
            startIcon={<FinalizeIcon />}
            onClick={() => setShowFinalizeDialog(true)}
            disabled={!report || report.status === 'final' || isLoading}
            color={isWithinTargetTime() ? 'primary' : 'warning'}
            size="small"
          >
            Finalize Report
          </Button>
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Report Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {/* Findings Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Clinical Findings
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Enter clinical findings..."
                  disabled={aiStatus.isGenerating}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Measurements Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Measurements
                </Typography>
                <MeasurementEditor
                  examType={study.exam_type}
                  measurements={measurements}
                  onChange={setMeasurements}
                  disabled={aiStatus.isGenerating}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Impressions Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Impressions
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                  placeholder="Enter clinical impressions..."
                  disabled={aiStatus.isGenerating}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Recommendations Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommendations
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Enter recommendations..."
                  disabled={aiStatus.isGenerating}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Diagnosis Codes Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Diagnosis Codes
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {diagnosisCodes.map((code, index) => (
                    <Chip
                      key={index}
                      label={code}
                      onDelete={() => {
                        setDiagnosisCodes(prev => prev.filter((_, i) => i !== index));
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  AI-suggested ICD-10 codes based on findings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeDialog} onClose={() => setShowFinalizeDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isWithinTargetTime() ? (
              <CheckIcon color="success" sx={{ mr: 1 }} />
            ) : (
              <WarningIcon color="warning" sx={{ mr: 1 }} />
            )}
            Finalize Report
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you ready to finalize this report? This action will:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Lock the report for editing</li>
            <li>Generate billing codes automatically</li>
            <li>Create superbill for submission</li>
            <li>Trigger audit logging</li>
          </Box>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: isWithinTargetTime() ? 'success.50' : 'warning.50', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Workflow Time:</strong> {getWorkflowTimeElapsed().toFixed(1)}s / 60s target
            </Typography>
            <Typography variant="body2" color={isWithinTargetTime() ? 'success.main' : 'warning.main'}>
              {isWithinTargetTime() ? '✓ Within target time' : '⚠ Exceeds target time'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinalizeDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={finalizeReport} 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <FinalizeIcon />}
          >
            {isLoading ? 'Finalizing...' : 'Finalize Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportPanel;