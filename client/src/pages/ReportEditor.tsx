import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Badge,
  LinearProgress,
  Snackbar,
  RadioGroup,
  Radio,
  Slider,
  Switch,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Send as FinalizeIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Verified as SignedIcon,
  History as HistoryIcon,
  Compare as CompareIcon,
  VoiceChat as VoiceIcon,
  Spellcheck as SpellcheckIcon,
  AutoAwesome as AIIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as PreviewIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import ReportPanel from '../components/Report/ReportPanel';
import { Report, Study } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface ReportVersion {
  id: string;
  version: number;
  content: Partial<Report>;
  created_at: string;
  created_by: string;
  comment?: string;
}

interface DigitalSignature {
  id: string;
  signer_id: string;
  signer_name: string;
  signed_at: string;
  signature_hash: string;
  certificate_info: {
    issuer: string;
    valid_from: string;
    valid_to: string;
  };
}

interface ReportWorkflow {
  status: 'draft' | 'pending_review' | 'reviewed' | 'signed' | 'final' | 'amended';
  current_step: number;
  steps: {
    name: string;
    completed: boolean;
    completed_by?: string;
    completed_at?: string;
    required: boolean;
  }[];
  estimated_completion: string;
  time_spent: number;
}

const ReportEditor: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Core state
  const [report, setReport] = useState<Report | null>(null);
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced features state
  const [activeTab, setActiveTab] = useState(0);
  const [reportVersions, setReportVersions] = useState<ReportVersion[]>([]);
  const [digitalSignatures, setDigitalSignatures] = useState<DigitalSignature[]>([]);
  const [workflow, setWorkflow] = useState<ReportWorkflow | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Dialog states
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  
  // Menu states
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Form state
  const [reportData, setReportData] = useState({
    findings: '',
    impressions: '',
    recommendations: '',
    measurements: {},
    diagnosis_codes: [] as string[],
    cpt_codes: [] as string[],
    urgency: 'routine' as 'stat' | 'urgent' | 'routine',
    quality_score: 0,
    confidence_level: 'high' as 'low' | 'medium' | 'high',
    follow_up_required: false,
    follow_up_timeframe: '',
    critical_findings: false,
    critical_findings_communicated: false,
    communication_log: [] as any[],
  });
  
  // Refs
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const workflowTimer = useRef<NodeJS.Timeout | null>(null);

  const studyUid = searchParams.get('studyUid');
  const isNewReport = reportId === 'new';

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!isDirty || !report || !autoSaveEnabled) return;
    
    try {
      const updatedReport = await apiService.updateReport(report.id, reportData);
      setReport(updatedReport);
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [isDirty, report, reportData, autoSaveEnabled]);

  // Set up auto-save timer
  useEffect(() => {
    if (autoSaveEnabled && isDirty) {
      autoSaveTimer.current = setTimeout(autoSave, 30000); // Auto-save every 30 seconds
    }
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [autoSave, autoSaveEnabled, isDirty]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('ReportEditor: Loading data with reportId:', reportId, 'studyUid:', studyUid, 'isNewReport:', isNewReport);

        if (isNewReport && studyUid) {
          // Creating new report for study
          console.log('ReportEditor: Creating new report for study:', studyUid);
          const studyData = await apiService.getStudy(studyUid);
          setStudy(studyData);
          
          // Initialize workflow
          setWorkflow({
            status: 'draft',
            current_step: 0,
            steps: [
              { name: 'Draft Report', completed: false, required: true },
              { name: 'Review Findings', completed: false, required: true },
              { name: 'Add Measurements', completed: false, required: false },
              { name: 'Quality Check', completed: false, required: true },
              { name: 'Digital Signature', completed: false, required: true },
              { name: 'Final Review', completed: false, required: true },
            ],
            estimated_completion: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            time_spent: 0
          });
        } else if (reportId) {
          // Editing existing report
          console.log('ReportEditor: Loading existing report with ID:', reportId);
          const reportData = await apiService.getReport(reportId);
          console.log('ReportEditor: Loaded report data:', reportData);
          setReport(reportData);
          setReportData({
            findings: reportData.findings || '',
            impressions: reportData.impressions || '',
            recommendations: reportData.recommendations || '',
            measurements: reportData.measurements || {},
            diagnosis_codes: reportData.diagnosis_codes || [],
            cpt_codes: reportData.cpt_codes || [],
            urgency: 'routine',
            quality_score: reportData.ai_confidence || 0,
            confidence_level: 'high',
            follow_up_required: false,
            follow_up_timeframe: '',
            critical_findings: false,
            critical_findings_communicated: false,
            communication_log: [],
          });
          
          // Also load the study
          const studyData = await apiService.getStudy(reportData.study_uid);
          setStudy(studyData);
          
          // Load versions and signatures
          await loadReportVersions(reportId);
          await loadDigitalSignatures(reportId);
          await loadWorkflowStatus(reportId);
        } else {
          setError('Invalid report or study parameters');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error loading report/study:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [reportId, studyUid, isNewReport]);

  // Load report versions
  const loadReportVersions = async (reportId: string) => {
    try {
      // Mock data - in real implementation, fetch from API
      const versions: ReportVersion[] = [
        {
          id: '1',
          version: 1,
          content: { findings: 'Initial findings...' },
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          created_by: 'Dr. Smith',
          comment: 'Initial draft'
        },
        {
          id: '2',
          version: 2,
          content: { findings: 'Updated findings with measurements...' },
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          created_by: 'Dr. Smith',
          comment: 'Added measurements and refined findings'
        }
      ];
      setReportVersions(versions);
    } catch (error) {
      console.error('Failed to load report versions:', error);
    }
  };

  // Load digital signatures
  const loadDigitalSignatures = async (reportId: string) => {
    try {
      // Mock data - in real implementation, fetch from API
      const signatures: DigitalSignature[] = [];
      setDigitalSignatures(signatures);
    } catch (error) {
      console.error('Failed to load digital signatures:', error);
    }
  };

  // Load workflow status
  const loadWorkflowStatus = async (reportId: string) => {
    try {
      // Mock data - in real implementation, fetch from API
      const workflowStatus: ReportWorkflow = {
        status: 'draft',
        current_step: 1,
        steps: [
          { name: 'Draft Report', completed: true, completed_by: 'Dr. Smith', completed_at: new Date().toISOString(), required: true },
          { name: 'Review Findings', completed: false, required: true },
          { name: 'Add Measurements', completed: false, required: false },
          { name: 'Quality Check', completed: false, required: true },
          { name: 'Digital Signature', completed: false, required: true },
          { name: 'Final Review', completed: false, required: true },
        ],
        estimated_completion: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        time_spent: 15 * 60 // 15 minutes
      };
      setWorkflow(workflowStatus);
    } catch (error) {
      console.error('Failed to load workflow status:', error);
    }
  };

  // Handle form changes
  const handleReportDataChange = (field: string, value: any) => {
    setReportData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Save report
  const handleSave = async () => {
    if (!report && !study) return;
    
    try {
      let savedReport: Report;
      
      if (isNewReport && study) {
        // Create new report
        savedReport = await apiService.createReport({
          study_uid: study.study_uid,
          exam_type: study.exam_type,
          ...reportData,
          status: 'draft',
          ai_generated: false,
        });
        setReport(savedReport);
        // Update URL to reflect the new report ID
        navigate(`/reports/${savedReport.id}?studyUid=${study.study_uid}`, { replace: true });
      } else if (report) {
        // Update existing report
        savedReport = await apiService.updateReport(report.id, reportData);
        setReport(savedReport);
      }
      
      setLastSaved(new Date());
      setIsDirty(false);
      
      // Update workflow
      if (workflow && workflow.current_step === 0) {
        const updatedWorkflow = { ...workflow };
        updatedWorkflow.steps[0].completed = true;
        updatedWorkflow.steps[0].completed_by = user?.full_name || user?.username || 'Unknown';
        updatedWorkflow.steps[0].completed_at = new Date().toISOString();
        updatedWorkflow.current_step = 1;
        setWorkflow(updatedWorkflow);
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  };

  // Digital signature
  const handleDigitalSign = async () => {
    if (!report) return;
    
    try {
      // In real implementation, this would integrate with digital signature service
      const signature: DigitalSignature = {
        id: Date.now().toString(),
        signer_id: user?.id || 'unknown',
        signer_name: user?.full_name || user?.username || 'Unknown',
        signed_at: new Date().toISOString(),
        signature_hash: 'mock_signature_hash_' + Date.now(),
        certificate_info: {
          issuer: 'Kiro Medical Certificate Authority',
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }
      };
      
      setDigitalSignatures(prev => [...prev, signature]);
      
      // Update workflow
      if (workflow) {
        const updatedWorkflow = { ...workflow };
        const signatureStepIndex = updatedWorkflow.steps.findIndex(step => step.name === 'Digital Signature');
        if (signatureStepIndex !== -1) {
          updatedWorkflow.steps[signatureStepIndex].completed = true;
          updatedWorkflow.steps[signatureStepIndex].completed_by = signature.signer_name;
          updatedWorkflow.steps[signatureStepIndex].completed_at = signature.signed_at;
          updatedWorkflow.current_step = Math.max(updatedWorkflow.current_step, signatureStepIndex + 1);
        }
        setWorkflow(updatedWorkflow);
      }
      
      setShowSignDialog(false);
    } catch (error) {
      console.error('Failed to sign report:', error);
    }
  };

  // Finalize report
  const handleFinalize = async () => {
    if (!report) return;
    
    try {
      const finalizedReport = await apiService.finalizeReport(report.id);
      setReport(finalizedReport);
      
      // Update workflow to final
      if (workflow) {
        const updatedWorkflow = { ...workflow };
        updatedWorkflow.status = 'final';
        updatedWorkflow.steps.forEach(step => {
          if (step.required && !step.completed) {
            step.completed = true;
            step.completed_by = user?.full_name || user?.username || 'System';
            step.completed_at = new Date().toISOString();
          }
        });
        setWorkflow(updatedWorkflow);
      }
      
      // Navigate to study viewer
      navigate(`/studies/${finalizedReport.study_uid}`);
    } catch (error) {
      console.error('Failed to finalize report:', error);
    }
  };

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (!report || !study) return;
    
    try {
      // Mock PDF generation - in real implementation, call API
      const pdfBlob = await generateReportPDF(report, study, digitalSignatures);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${study.patient_id}_${study.study_uid}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  // Mock PDF generation
  const generateReportPDF = async (report: Report, study: Study, signatures: DigitalSignature[]): Promise<Blob> => {
    // In real implementation, this would call a PDF generation service
    const pdfContent = `
      MEDICAL IMAGING REPORT
      
      Patient: ${study.patient_id}
      Study: ${study.study_description}
      Date: ${new Date(study.study_date || '').toLocaleDateString()}
      
      FINDINGS:
      ${reportData.findings}
      
      IMPRESSIONS:
      ${reportData.impressions}
      
      RECOMMENDATIONS:
      ${reportData.recommendations}
      
      ${signatures.length > 0 ? `
      DIGITAL SIGNATURES:
      ${signatures.map(sig => `- ${sig.signer_name} (${new Date(sig.signed_at).toLocaleString()})`).join('\n')}
      ` : ''}
    `;
    
    return new Blob([pdfContent], { type: 'application/pdf' });
  };

  // AI assistance
  const handleAIAssist = async () => {
    if (!study) return;
    
    try {
      const aiSuggestions = await apiService.generateAIReport(study.study_uid, study.exam_type);
      
      // Merge AI suggestions with current data
      setReportData(prev => ({
        ...prev,
        findings: prev.findings || aiSuggestions.findings || '',
        impressions: prev.impressions || aiSuggestions.impressions || '',
        recommendations: prev.recommendations || aiSuggestions.recommendations || '',
        measurements: { ...aiSuggestions.measurements, ...prev.measurements },
      }));
      
      setIsDirty(true);
    } catch (error) {
      console.error('AI assistance failed:', error);
    }
  };

  // Spell check
  const handleSpellCheck = () => {
    // Mock spell check - in real implementation, integrate with spell check service
    console.log('Spell check initiated');
  };

  // Voice dictation
  const handleVoiceDictation = () => {
    // Mock voice dictation - in real implementation, integrate with speech recognition
    console.log('Voice dictation started');
  };

  const handleReportUpdate = (updatedReport: Report) => {
    setReport(updatedReport);
  };

  const handleReportFinalized = (finalizedReport: Report) => {
    setReport(finalizedReport);
    navigate(`/studies/${finalizedReport.study_uid}`);
  };

  const handleBack = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        if (study) {
          navigate(`/studies/${study.study_uid}`);
        } else {
          navigate('/studies');
        }
      }
    } else {
      if (study) {
        navigate(`/studies/${study.study_uid}`);
      } else {
        navigate('/studies');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!study) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="warning">Study not found</Alert>
      </Box>
    );
  }

  const getWorkflowProgress = () => {
    if (!workflow) return 0;
    const completedSteps = workflow.steps.filter(step => step.completed).length;
    return (completedSteps / workflow.steps.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'warning';
      case 'pending_review': return 'info';
      case 'reviewed': return 'primary';
      case 'signed': return 'success';
      case 'final': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Advanced Header with Workflow */}
      <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<BackIcon />}
              onClick={handleBack}
              variant="outlined"
              size="small"
            >
              Back
            </Button>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {isNewReport ? 'Create Report' : 'Edit Report'} - {study.patient_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {study.study_description} | {study.exam_type} | Study Date: {new Date(study.study_date || '').toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          {/* Status and Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {workflow && (
              <Chip
                label={workflow.status.replace('_', ' ').toUpperCase()}
                color={getStatusColor(workflow.status) as any}
                size="small"
              />
            )}
            
            {lastSaved && (
              <Typography variant="caption" color="text.secondary">
                Last saved: {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
            
            {isDirty && (
              <Chip label="Unsaved Changes" color="warning" size="small" />
            )}

            {/* Auto-save toggle */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-save"
              sx={{ ml: 1 }}
            />
          </Box>
        </Box>

        {/* Workflow Progress */}
        {workflow && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Report Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(getWorkflowProgress())}% Complete
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={getWorkflowProgress()} 
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Time spent: {Math.floor(workflow.time_spent / 60)}m {workflow.time_spent % 60}s
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Est. completion: {new Date(workflow.estimated_completion).toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Action Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
            variant="contained"
            disabled={!isDirty}
          >
            Save
          </Button>

          <Button
            startIcon={<AIIcon />}
            onClick={handleAIAssist}
            variant="outlined"
            color="secondary"
          >
            AI Assist
          </Button>

          <Button
            startIcon={<VoiceIcon />}
            onClick={handleVoiceDictation}
            variant="outlined"
          >
            Dictate
          </Button>

          <Button
            startIcon={<SpellcheckIcon />}
            onClick={handleSpellCheck}
            variant="outlined"
          >
            Spell Check
          </Button>

          <Button
            startIcon={<PreviewIcon />}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            variant={isPreviewMode ? 'contained' : 'outlined'}
          >
            Preview
          </Button>

          <Button
            startIcon={<HistoryIcon />}
            onClick={() => setShowVersionHistory(true)}
            variant="outlined"
          >
            Versions ({reportVersions.length})
          </Button>

          <Button
            startIcon={<SecurityIcon />}
            onClick={() => setShowSignDialog(true)}
            variant="outlined"
            color="success"
            disabled={digitalSignatures.length > 0}
          >
            {digitalSignatures.length > 0 ? 'Signed' : 'Sign'}
          </Button>

          {/* Export Menu */}
          <Button
            startIcon={<ShareIcon />}
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
            variant="outlined"
          >
            Export
          </Button>

          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={handleGeneratePDF}>
              <ListItemIcon><PdfIcon /></ListItemIcon>
              <ListItemText>Export as PDF</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => window.print()}>
              <ListItemIcon><PrintIcon /></ListItemIcon>
              <ListItemText>Print Report</ListItemText>
            </MenuItem>
            <MenuItem>
              <ListItemIcon><CloudUploadIcon /></ListItemIcon>
              <ListItemText>Send to PACS</ListItemText>
            </MenuItem>
          </Menu>

          {report && report.status === 'draft' && (
            <Button
              startIcon={<FinalizeIcon />}
              onClick={handleFinalize}
              variant="contained"
              color="success"
              disabled={digitalSignatures.length === 0}
            >
              Finalize
            </Button>
          )}
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Report Form */}
        <Box sx={{ width: '60%', display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Report Content" />
            <Tab label="Measurements" />
            <Tab label="Coding" />
            <Tab label="Quality" />
          </Tabs>

          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {/* Clinical Findings */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Clinical Findings" />
                    <CardContent>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Findings"
                        value={reportData.findings}
                        onChange={(e) => handleReportDataChange('findings', e.target.value)}
                        placeholder="Describe the imaging findings..."
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Impressions */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Impressions" />
                    <CardContent>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Impressions"
                        value={reportData.impressions}
                        onChange={(e) => handleReportDataChange('impressions', e.target.value)}
                        placeholder="Clinical impressions and diagnosis..."
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recommendations */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Recommendations" />
                    <CardContent>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Recommendations"
                        value={reportData.recommendations}
                        onChange={(e) => handleReportDataChange('recommendations', e.target.value)}
                        placeholder="Clinical recommendations and follow-up..."
                      />
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={reportData.follow_up_required}
                              onChange={(e) => handleReportDataChange('follow_up_required', e.target.checked)}
                            />
                          }
                          label="Follow-up Required"
                        />
                        
                        {reportData.follow_up_required && (
                          <TextField
                            size="small"
                            label="Timeframe"
                            value={reportData.follow_up_timeframe}
                            onChange={(e) => handleReportDataChange('follow_up_timeframe', e.target.value)}
                            placeholder="e.g., 6 months"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Critical Findings */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader 
                      title="Critical Findings" 
                      action={
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={reportData.critical_findings}
                              onChange={(e) => handleReportDataChange('critical_findings', e.target.checked)}
                              color="error"
                            />
                          }
                          label="Critical"
                        />
                      }
                    />
                    {reportData.critical_findings && (
                      <CardContent>
                        <Alert severity="error" sx={{ mb: 2 }}>
                          Critical findings require immediate communication with referring physician
                        </Alert>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={reportData.critical_findings_communicated}
                              onChange={(e) => handleReportDataChange('critical_findings_communicated', e.target.checked)}
                            />
                          }
                          label="Communicated to referring physician"
                        />
                      </CardContent>
                    )}
                  </Card>
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Card>
                <CardHeader title="Measurements" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Measurement tools will be integrated here
                  </Typography>
                </CardContent>
              </Card>
            )}

            {activeTab === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="ICD-10 Diagnosis Codes" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Diagnosis codes: {reportData.diagnosis_codes.length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="CPT Procedure Codes" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Procedure codes: {reportData.cpt_codes.length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {activeTab === 3 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Report Quality" />
                    <CardContent>
                      <Typography gutterBottom>Confidence Level</Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={reportData.confidence_level}
                          onChange={(e) => handleReportDataChange('confidence_level', e.target.value)}
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <Typography gutterBottom sx={{ mt: 2 }}>Quality Score</Typography>
                      <Slider
                        value={reportData.quality_score}
                        onChange={(_, value) => handleReportDataChange('quality_score', value)}
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Urgency Level" />
                    <CardContent>
                      <FormControl component="fieldset">
                        <RadioGroup
                          value={reportData.urgency}
                          onChange={(e) => handleReportDataChange('urgency', e.target.value)}
                        >
                          <FormControlLabel value="routine" control={<Radio />} label="Routine" />
                          <FormControlLabel value="urgent" control={<Radio />} label="Urgent" />
                          <FormControlLabel value="stat" control={<Radio />} label="STAT" />
                        </RadioGroup>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>

        {/* Right Panel - Study Viewer and Workflow */}
        <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column' }}>
          <Tabs value={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Study Images" />
            <Tab label="Workflow" />
            <Tab label="History" />
          </Tabs>

          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            {/* Study Images */}
            <Card sx={{ mb: 2 }}>
              <CardHeader title="DICOM Viewer" />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  DICOM viewer will be integrated here
                </Typography>
              </CardContent>
            </Card>

            {/* Workflow Status */}
            {workflow && (
              <Card>
                <CardHeader title="Workflow Status" />
                <CardContent>
                  <Stepper orientation="vertical" activeStep={workflow.current_step}>
                    {workflow.steps.map((step, index) => (
                      <Step key={step.name}>
                        <StepLabel
                          optional={!step.required ? <Typography variant="caption">Optional</Typography> : null}
                          StepIconComponent={() => (
                            step.completed ? <CheckIcon color="success" /> : <ScheduleIcon color="disabled" />
                          )}
                        >
                          {step.name}
                          {step.completed && step.completed_by && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              by {step.completed_by} at {new Date(step.completed_at!).toLocaleTimeString()}
                            </Typography>
                          )}
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Box>

      {/* Digital Signature Dialog */}
      <Dialog open={showSignDialog} onClose={() => setShowSignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Digital Signature</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            By signing this report, you certify that you have reviewed all findings and agree with the clinical assessment.
          </Alert>
          <Typography variant="body2" gutterBottom>
            Signer: {user?.full_name || user?.username}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Date: {new Date().toLocaleString()}
          </Typography>
          <Typography variant="body2">
            Report ID: {report?.id}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSignDialog(false)}>Cancel</Button>
          <Button onClick={handleDigitalSign} variant="contained" startIcon={<SignedIcon />}>
            Sign Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onClose={() => setShowVersionHistory(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Version History</DialogTitle>
        <DialogContent>
          {reportVersions.map((version) => (
            <Card key={version.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Version {version.version}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(version.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                  Created by: {version.created_by}
                </Typography>
                {version.comment && (
                  <Typography variant="body2" color="text.secondary">
                    {version.comment}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={isDirty && autoSaveEnabled}
        message="Auto-saving..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
};

export default ReportEditor;