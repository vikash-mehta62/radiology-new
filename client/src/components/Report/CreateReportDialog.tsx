import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Assignment as ReportIcon,
  AutoAwesome as AIIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { reportService, CreateReportRequest } from '../../services/reportService';
import type { Study } from '../../types';

interface CreateReportDialogProps {
  open: boolean;
  onClose: () => void;
  study: Study;
  onReportCreated?: (reportId: string) => void;
}

const CreateReportDialog: React.FC<CreateReportDialogProps> = ({
  open,
  onClose,
  study,
  onReportCreated
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [examType, setExamType] = useState(study.exam_type || '');

  const handleCreateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const reportData: CreateReportRequest = {
        study_uid: study.study_uid,
        patient_id: study.patient_id,
        exam_type: examType || study.exam_type,
        ai_generated: aiGenerated
      };

      let report;
      if (aiGenerated) {
        // Generate AI report
        report = await reportService.generateAIReport(study.study_uid);
      } else {
        // Create manual report
        report = await reportService.createReport(reportData);
      }

      console.log('✅ Report created:', report);
      
      if (onReportCreated) {
        onReportCreated(report.report_id);
      }
      
      onClose();
    } catch (err) {
      console.error('❌ Failed to create report:', err);
      setError(err instanceof Error ? err.message : 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1
      }}>
        <ReportIcon color="primary" />
        <Typography variant="h6" component="div">
          Create Medical Report
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Study Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Study Information
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PersonIcon fontSize="small" color="primary" />
            <Typography variant="body2">
              <strong>Patient:</strong> {study.patient_id}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Study UID:</strong> {study.study_uid.substring(0, 30)}...
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Modality:</strong> {study.modality}
          </Typography>
          <Typography variant="body2">
            <strong>Date:</strong> {study.study_date}
          </Typography>
        </Box>

        {/* Exam Type */}
        <TextField
          fullWidth
          label="Exam Type"
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
          placeholder="e.g., CT Chest, MRI Brain, X-Ray"
          sx={{ mb: 3 }}
          helperText="Specify the type of examination for this report"
        />

        {/* AI Generation Option */}
        <Box sx={{ 
          p: 2, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1,
          mb: 2
        }}>
          <FormControlLabel
            control={
              <Switch
                checked={aiGenerated}
                onChange={(e) => setAiGenerated(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon color={aiGenerated ? "primary" : "disabled"} />
                <Typography variant="body2">
                  Generate AI-Powered Report
                </Typography>
              </Box>
            }
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {aiGenerated 
              ? "AI will analyze the medical images and generate findings automatically"
              : "Create a blank report template for manual completion"
            }
          </Typography>
        </Box>

        {/* Report Type Info */}
        <Alert 
          severity={aiGenerated ? "info" : "success"} 
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            {aiGenerated 
              ? "🤖 AI will analyze the study and generate preliminary findings. You can review and edit the report afterward."
              : "📝 A blank report template will be created for you to fill in manually."
            }
          </Typography>
        </Alert>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateReport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <ReportIcon />}
          sx={{ minWidth: 140 }}
        >
          {loading 
            ? (aiGenerated ? 'Generating...' : 'Creating...') 
            : (aiGenerated ? 'Generate AI Report' : 'Create Report')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateReportDialog;