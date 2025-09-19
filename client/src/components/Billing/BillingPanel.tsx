import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  LinearProgress,
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
  Receipt as BillingIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as RevenueIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Assessment as AnalyticsIcon,
} from '@mui/icons-material';

import { Report, Study, ValidationResult, CodeSuggestion } from '../../types';
import { apiService } from '../../services/api';
import CodeSuggestionPanel from './CodeSuggestionPanel';
import ValidationResultPanel from './ValidationResultPanel';
import ReimbursementEstimator from './ReimbursementEstimator';
import SuperbillGenerator from './SuperbillGenerator';

interface BillingPanelProps {
  study?: Study;
  report?: Report;
  onSuperbillGenerated?: (superbill: any) => void;
  onValidationUpdate?: (validation: ValidationResult) => void;
}

interface BillingState {
  cptCodes: string[];
  icd10Codes: string[];
  validation: ValidationResult | null;
  suggestions: CodeSuggestion[];
  reimbursementEstimate: any;
  superbill: any;
  isLoading: boolean;
  error: string | null;
}

const BillingPanel: React.FC<BillingPanelProps> = ({
  study,
  report,
  onSuperbillGenerated,
  onValidationUpdate,
}) => {
  const [billingState, setBillingState] = useState<BillingState>({
    cptCodes: [],
    icd10Codes: [],
    validation: null,
    suggestions: [],
    reimbursementEstimate: null,
    superbill: null,
    isLoading: false,
    error: null,
  });

  const [showSuperbillDialog, setShowSuperbillDialog] = useState(false);
  const [autoValidation, setAutoValidation] = useState(true);

  // Initialize billing codes from report
  useEffect(() => {
    if (report) {
      setBillingState(prev => ({
        ...prev,
        cptCodes: report.cpt_codes || [],
        icd10Codes: report.diagnosis_codes || [],
      }));
    }
  }, [report]);

  // Auto-validate codes when they change
  useEffect(() => {
    if (autoValidation && billingState.cptCodes.length > 0 && billingState.icd10Codes.length > 0) {
      validateCodes();
    }
  }, [billingState.cptCodes, billingState.icd10Codes, autoValidation]);

  const validateCodes = useCallback(async () => {
    if (billingState.cptCodes.length === 0 || billingState.icd10Codes.length === 0) {
      return;
    }

    try {
      setBillingState(prev => ({ ...prev, isLoading: true, error: null }));

      const validation = await apiService.validateCodesRealtime(
        billingState.cptCodes,
        billingState.icd10Codes,
        study?.exam_type || 'unknown',
        study ? { patient_id: study.patient_id, modality: study.modality } : undefined
      );

      setBillingState(prev => ({
        ...prev,
        validation,
        isLoading: false,
      }));

      onValidationUpdate?.(validation);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setBillingState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [billingState.cptCodes, billingState.icd10Codes, study, onValidationUpdate]);

  const generateSuperbill = async () => {
    if (!report) {
      setBillingState(prev => ({
        ...prev,
        error: 'Report is required to generate superbill',
      }));
      return;
    }

    try {
      setBillingState(prev => ({ ...prev, isLoading: true, error: null }));

      const superbill = await apiService.generateSuperbill(report.report_id);

      setBillingState(prev => ({
        ...prev,
        superbill,
        isLoading: false,
      }));

      onSuperbillGenerated?.(superbill);
      setShowSuperbillDialog(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate superbill';
      setBillingState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  const getValidationStatusColor = (): 'success' | 'warning' | 'error' | 'info' => {
    if (!billingState.validation) return 'info';
    if (billingState.validation.valid) return 'success';
    if (billingState.validation.warnings.length > 0) return 'warning';
    return 'error';
  };

  const getValidationStatusText = (): string => {
    if (!billingState.validation) return 'Not Validated';
    if (billingState.validation.valid) return 'Valid';
    if (billingState.validation.warnings.length > 0) return 'Warnings';
    return 'Invalid';
  };

  const getComplianceScore = (): number => {
    return billingState.validation?.compliance_score || 0;
  };

  const getRiskScore = (): number => {
    return billingState.validation?.reimbursement_risk || 0;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Real-time Billing Validation
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Validation">
              <IconButton
                size="small"
                onClick={validateCodes}
                disabled={billingState.isLoading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<BillingIcon />}
              onClick={generateSuperbill}
              disabled={!report || billingState.isLoading}
              size="small"
            >
              Generate Superbill
            </Button>
          </Box>
        </Box>

        {/* Loading Progress */}
        {billingState.isLoading && (
          <LinearProgress sx={{ mt: 2 }} />
        )}
      </Paper>

      {/* Error Display */}
      {billingState.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {billingState.error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {/* Validation Status Overview */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Validation Status</Typography>
                  <Chip
                    label={getValidationStatusText()}
                    color={getValidationStatusColor()}
                    icon={
                      getValidationStatusColor() === 'success' ? <ValidIcon /> :
                      getValidationStatusColor() === 'warning' ? <WarningIcon /> :
                      <ErrorIcon />
                    }
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {Math.round(getComplianceScore() * 100)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Compliance Score
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color={getRiskScore() > 0.5 ? 'error' : 'success'}>
                        {Math.round(getRiskScore() * 100)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Denial Risk
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success">
                        ${billingState.validation?.estimated_reimbursement?.commercial_120 || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Est. Reimbursement
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Code Suggestions */}
          <Grid item xs={12} md={6}>
            <CodeSuggestionPanel
              examType={study?.exam_type || ''}
              findings={report?.findings || ''}
              currentCodes={billingState.icd10Codes}
              onCodesUpdate={(codes) => {
                setBillingState(prev => ({ ...prev, icd10Codes: codes }));
              }}
            />
          </Grid>

          {/* Validation Results */}
          <Grid item xs={12} md={6}>
            <ValidationResultPanel
              validation={billingState.validation}
              cptCodes={billingState.cptCodes}
              icd10Codes={billingState.icd10Codes}
              onCodesUpdate={(cptCodes, icd10Codes) => {
                setBillingState(prev => ({ ...prev, cptCodes, icd10Codes }));
              }}
            />
          </Grid>

          {/* Reimbursement Estimator */}
          <Grid item xs={12} md={6}>
            <ReimbursementEstimator
              cptCodes={billingState.cptCodes}
              icd10Codes={billingState.icd10Codes}
              validation={billingState.validation}
            />
          </Grid>

          {/* Current Codes Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Billing Codes
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    CPT Codes
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {billingState.cptCodes.length > 0 ? (
                      billingState.cptCodes.map((code, index) => (
                        <Chip
                          key={index}
                          label={code}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No CPT codes assigned
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    ICD-10 Diagnosis Codes
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {billingState.icd10Codes.length > 0 ? (
                      billingState.icd10Codes.map((code, index) => (
                        <Chip
                          key={index}
                          label={code}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No diagnosis codes assigned
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Superbill Dialog */}
      <Dialog
        open={showSuperbillDialog}
        onClose={() => setShowSuperbillDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BillingIcon sx={{ mr: 1 }} />
            Generated Superbill
          </Box>
        </DialogTitle>
        <DialogContent>
          {billingState.superbill && (
            <SuperbillGenerator
              superbill={billingState.superbill}
              onExport={(format) => {
                console.log('Exporting superbill in format:', format);
                // Implementation for export functionality
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuperbillDialog(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={() => {
              // Implementation for export functionality
              console.log('Exporting superbill');
            }}
          >
            Export 837P
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingPanel;