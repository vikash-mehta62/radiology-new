import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Collapse,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Assessment as DiagnosticsIcon,
  Queue as QueueIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

import UploadReadinessIndicator from './UploadReadinessIndicator';
import UploadProgressDisplay from './UploadProgressDisplay';
import NetworkDiagnostics from './NetworkDiagnostics';
import UploadQueueManager from './UploadQueueManager';
import ErrorDisplay from './ErrorDisplay';
import { enhancedUploadService } from '../services/enhancedUploadService';
import { preUploadValidator } from '../services/preUploadValidator';
import { errorHandlingService } from '../services/errorHandlingService';

interface EnhancedUploadDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  onUploadComplete?: (results: any[]) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`upload-tabpanel-${index}`}
      aria-labelledby={`upload-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const EnhancedUploadDialog: React.FC<EnhancedUploadDialogProps> = ({
  open,
  onClose,
  patientId,
  onUploadComplete
}) => {
  // Core state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  // Validation and diagnostics state
  const [validationResult, setValidationResult] = useState<any>(null);
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);
  const [connectivityStatus, setConnectivityStatus] = useState<any>(null);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoRefreshDiagnostics, setAutoRefreshDiagnostics] = useState(true);

  // Upload tracking
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [activeUploads, setActiveUploads] = useState<string[]>([]);

  const steps = [
    'Select Files',
    'Validate Upload',
    'Upload Files',
    'Complete'
  ];

  // File selection handler
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setCurrentStep(files.length > 0 ? 1 : 0);
    setUploadErrors([]);
    setUploadResults([]);
    
    console.log('📁 Selected files:', files.map(f => f.name));
  }, []);

  // Validation completion handler
  const handleValidationComplete = useCallback((result: any) => {
    setValidationResult(result);
    
    if (result.canProceed && currentStep === 1) {
      // Auto-advance to upload step if validation passes
      setCurrentStep(2);
    }
  }, [currentStep]);

  // Upload start handler
  const handleUploadStart = useCallback(async () => {
    if (selectedFiles.length === 0 || !validationResult?.canProceed) return;

    setIsUploading(true);
    setCurrentStep(2);
    setUploadResults([]);
    setUploadErrors([]);

    const results: any[] = [];

    try {
      for (const file of selectedFiles) {
        try {
          console.log(`🚀 Starting enhanced upload: ${file.name}`);

          const result = await enhancedUploadService.uploadWithRetry(file, {
            patientId,
            description: `Enhanced upload: ${file.name}`,
            maxRetries: 3,
            timeout: 60000
          });

          results.push({
            file: file.name,
            success: result.success,
            message: result.message,
            uploadTime: result.uploadTime,
            attempts: result.attempts
          });

          console.log(`✅ Upload completed: ${file.name}`);

        } catch (error: any) {
          console.error(`❌ Upload failed: ${file.name}`, error);

          // Process error with enhanced error handling
          const userFriendlyError = errorHandlingService.processError(error, {
            fileName: file.name,
            fileSize: file.size,
            patientId,
            retryAttempt: 1,
            maxRetries: 3
          });

          setUploadErrors(prev => [...prev, userFriendlyError]);

          results.push({
            file: file.name,
            success: false,
            message: userFriendlyError.message,
            error: userFriendlyError
          });
        }
      }

      setUploadResults(results);
      setCurrentStep(3);

      if (onUploadComplete) {
        onUploadComplete(results);
      }

    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, validationResult, patientId, onUploadComplete]);

  // Connectivity check
  const checkConnectivity = useCallback(async () => {
    try {
      const status = await preUploadValidator.quickConnectivityCheck();
      setConnectivityStatus(status);
    } catch (error) {
      console.error('Connectivity check failed:', error);
      setConnectivityStatus({
        isConnected: false,
        latency: 0,
        message: 'Connectivity check failed'
      });
    }
  }, []);

  // Auto-refresh connectivity
  useEffect(() => {
    if (open && autoRefreshDiagnostics) {
      checkConnectivity();
      const interval = setInterval(checkConnectivity, 30000);
      return () => clearInterval(interval);
    }
  }, [open, autoRefreshDiagnostics, checkConnectivity]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setTabValue(0);
      setSelectedFiles([]);
      setValidationResult(null);
      setUploadErrors([]);
      setUploadResults([]);
      setIsUploading(false);
    }
  }, [open]);

  const handleClose = () => {
    if (!isUploading) {
      onClose();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) return '✅';
    if (step === currentStep) return '🔄';
    return '⏳';
  };

  const getTabBadgeContent = (tab: number) => {
    switch (tab) {
      case 1: // Diagnostics
        return uploadErrors.length > 0 ? uploadErrors.length : null;
      case 2: // Queue
        const queueStatus = enhancedUploadService.getQueueStatus();
        return queueStatus.queuedItems > 0 ? queueStatus.queuedItems : null;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={isUploading}
      PaperProps={{
        sx: { minHeight: '70vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <UploadIcon color="primary" />
            <Typography variant="h6">Enhanced File Upload</Typography>
            {connectivityStatus && (
              <Tooltip title={connectivityStatus.message}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: connectivityStatus.isConnected ? 'success.main' : 'error.main'
                  }}
                />
              </Tooltip>
            )}
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Advanced Options">
              <IconButton
                size="small"
                onClick={() => setShowAdvanced(!showAdvanced)}
                color={showAdvanced ? 'primary' : 'default'}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Diagnostics">
              <IconButton size="small" onClick={checkConnectivity}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            {!isUploading && (
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Advanced Options */}
        <Collapse in={showAdvanced}>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Options
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setAutoRefreshDiagnostics(!autoRefreshDiagnostics)}
              >
                Auto-refresh: {autoRefreshDiagnostics ? 'ON' : 'OFF'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => enhancedUploadService.clearCompletedUploads()}
              >
                Clear Completed
              </Button>
            </Box>
          </Box>
        </Collapse>

        {/* Progress Stepper */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stepper activeStep={currentStep} orientation="horizontal">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  icon={getStepIcon(index)}
                  error={index === 2 && uploadErrors.length > 0}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Main Content Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Upload" />
            <Tab 
              label={
                <Badge badgeContent={getTabBadgeContent(1)} color="error">
                  Diagnostics
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={getTabBadgeContent(2)} color="primary">
                  Queue
                </Badge>
              }
            />
          </Tabs>
        </Box>

        {/* Upload Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 2 }}>
            {/* File Selection */}
            {currentStep === 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Select Files to Upload
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose DICOM files (.dcm) or other supported formats for upload.
                  </Typography>

                  <input
                    type="file"
                    multiple
                    accept=".dcm,.dicom,.pdf,.jpg,.jpeg,.png,.txt"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="enhanced-file-upload-input"
                  />

                  <label htmlFor="enhanced-file-upload-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      fullWidth
                      size="large"
                      sx={{ py: 2 }}
                    >
                      Select Files
                    </Button>
                  </label>
                </CardContent>
              </Card>
            )}

            {/* Validation Step */}
            {currentStep >= 1 && selectedFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <UploadReadinessIndicator
                  files={selectedFiles}
                  patientId={patientId}
                  onValidationComplete={handleValidationComplete}
                  autoValidate={true}
                  showDetails={true}
                />
              </Box>
            )}

            {/* Upload Progress */}
            {currentStep >= 2 && (
              <Box sx={{ mb: 2 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Upload Progress
                    </Typography>
                    
                    {isUploading && (
                      <UploadProgressDisplay
                        showMetrics={true}
                        showHistory={false}
                        compact={false}
                      />
                    )}

                    {uploadResults.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Upload Results:
                        </Typography>
                        {uploadResults.map((result, index) => (
                          <Alert
                            key={index}
                            severity={result.success ? 'success' : 'error'}
                            sx={{ mb: 1 }}
                          >
                            <AlertTitle>{result.file}</AlertTitle>
                            {result.message}
                            {result.uploadTime && (
                              <Typography variant="caption" display="block">
                                Upload time: {result.uploadTime}ms
                              </Typography>
                            )}
                          </Alert>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {uploadErrors.map((error, index) => (
                  <ErrorDisplay
                    key={index}
                    error={error}
                    onRetry={() => {
                      setUploadErrors(prev => prev.filter((_, i) => i !== index));
                      // Could implement retry logic here
                    }}
                    onDismiss={() => {
                      setUploadErrors(prev => prev.filter((_, i) => i !== index));
                    }}
                    compact={false}
                  />
                ))}
              </Box>
            )}

            {/* Completion Step */}
            {currentStep === 3 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upload Complete
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {uploadResults.filter(r => r.success).length} of {uploadResults.length} files uploaded successfully.
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCurrentStep(0);
                        setSelectedFiles([]);
                        setUploadResults([]);
                        setValidationResult(null);
                      }}
                      sx={{ mr: 1 }}
                    >
                      Upload More Files
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleClose}
                    >
                      Close
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </TabPanel>

        {/* Diagnostics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 2 }}>
            <NetworkDiagnostics
              autoRefresh={autoRefreshDiagnostics}
              refreshInterval={30000}
            />
          </Box>
        </TabPanel>

        {/* Queue Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 2 }}>
            <UploadQueueManager
              autoRefresh={true}
              refreshInterval={2000}
              showCompletedUploads={true}
            />
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Box>
            {connectivityStatus && (
              <Typography variant="caption" color="text.secondary">
                Connection: {connectivityStatus.message}
              </Typography>
            )}
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              onClick={handleClose}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Close'}
            </Button>
            
            {currentStep === 2 && !isUploading && (
              <Button
                variant="contained"
                onClick={handleUploadStart}
                disabled={
                  selectedFiles.length === 0 || 
                  !validationResult?.canProceed
                }
                startIcon={<UploadIcon />}
              >
                Start Upload
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedUploadDialog;