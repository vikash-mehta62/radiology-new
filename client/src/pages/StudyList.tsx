import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { Study, StudyStatus } from '../types';
import { apiService } from '../services/api';
import { enhancedUploadService } from '../services/enhancedUploadService';
import NetworkDiagnostics from '../components/NetworkDiagnostics';
import UploadQueueManager from '../components/UploadQueueManager';
import UploadQueueManagerDialog from '../components/UploadQueueManagerDialog';
import UploadQueueStatusDisplay from '../components/UploadQueueStatusDisplay';
import UploadProgressDisplay from '../components/UploadProgressDisplay';
import ErrorDisplay from '../components/ErrorDisplay';
import UploadReadinessIndicator from '../components/UploadReadinessIndicator';
import ConnectivityStatusIndicator from '../components/ConnectivityStatusIndicator';
import { errorHandlingService } from '../services/errorHandlingService';
import { preUploadValidator } from '../services/preUploadValidator';

const StudyList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'all'>('all');
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadResults, setUploadResults] = useState<{ [key: string]: any }>({});
  const [isUploading, setIsUploading] = useState(false);
  
  // Diagnostics state
  const [diagnosticsDialogOpen, setDiagnosticsDialogOpen] = useState(false);
  
  // Queue manager state
  const [queueManagerOpen, setQueueManagerOpen] = useState(false);
  const [queueManagerDialogOpen, setQueueManagerDialogOpen] = useState(false);
  
  // Error handling state
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);
  
  // Validation state
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // Diagnostic panel state
  const [diagnosticPanelOpen, setDiagnosticPanelOpen] = useState(false);

  // Load studies from API
  const loadStudies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getStudies({
        skip: 0,
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      setStudies(response.studies || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load studies';
      setError(errorMessage);
      console.error('Error loading studies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load studies on component mount and when filter changes
  useEffect(() => {
    loadStudies();
  }, [statusFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadStudies, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const getStatusColor = (status: StudyStatus) => {
    switch (status) {
      case 'received':
        return 'info';
      case 'processing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'billed':
        return 'secondary';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredStudies = studies.filter((study) => {
    const matchesSearch =
      study.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.study_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.study_uid.includes(searchTerm);

    return matchesSearch;
  });

  const handleViewStudy = (studyUid: string) => {
    navigate(`/studies/${studyUid}`);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleStatusFilterChange = (status: StudyStatus | 'all') => {
    setStatusFilter(status);
    handleFilterClose();
  };

  // Upload handlers
  const handleUploadClick = () => {
    setUploadDialogOpen(true);
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadResults({});
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    console.log('📁 Selected files:', files.map(f => f.name));
  };

  const handleUploadStart = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    console.log('🚀 Starting upload of', selectedFiles.length, 'files');

    // Create a default patient for study uploads
    const defaultPatientId = 'PAT001'; // You can make this configurable

    // Comprehensive pre-upload validation
    console.log('🔍 Running comprehensive pre-upload validation...');
    try {
      const validation = await preUploadValidator.validateUploadReadiness(
        selectedFiles,
        defaultPatientId
      );
      
      setValidationResult(validation);
      
      if (!validation.canProceed) {
        console.error('❌ Pre-upload validation failed');
        setIsUploading(false);
        
        // Show validation errors for all files
        const validationError = {
          success: false,
          message: 'Upload validation failed',
          troubleshooting: validation.recommendations.join(' '),
          errorType: 'validation',
          error: true,
          validationResult: validation
        };
        
        const errorResults: { [key: string]: any } = {};
        selectedFiles.forEach(file => {
          errorResults[file.name] = validationError;
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        });
        setUploadResults(errorResults);
        return;
      }
      
      console.log(`✅ Pre-upload validation passed (${validation.readinessScore}% readiness)`);
      
    } catch (error: any) {
      console.error('❌ Pre-upload validation error:', error);
      setIsUploading(false);
      
      const validationError = {
        success: false,
        message: 'Validation check failed',
        troubleshooting: 'Unable to validate upload readiness. Please try again.',
        errorType: 'validation',
        error: true
      };
      
      const errorResults: { [key: string]: any } = {};
      selectedFiles.forEach(file => {
        errorResults[file.name] = validationError;
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      });
      setUploadResults(errorResults);
      return;
    }

    for (const file of selectedFiles) {
      let progressInterval: NodeJS.Timeout | null = null;
      
      try {
        console.log(`📤 Uploading ${file.name}...`);

        // Update progress to show starting
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));

        // Create form data
        const formData = new FormData();
        formData.append('files', file);
        formData.append('description', `Study upload: ${file.name}`);

        // Determine endpoint based on file type
        const isDicom = file.name.toLowerCase().endsWith('.dcm') ||
          file.name.toLowerCase().endsWith('.dicom') ||
          file.name.toUpperCase().includes('MR') ||
          file.name.toUpperCase().includes('CT');

        const endpoint = isDicom
          ? `/patients/${defaultPatientId}/upload/dicom`
          : `/patients/${defaultPatientId}/upload/reports`;

        console.log(`📡 Using endpoint: ${endpoint}`);

        // Simulate progress updates
        progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
          }));
        }, 200);

        // Upload file using enhanced upload service
        const result = await enhancedUploadService.uploadWithRetry(file, {
          patientId: defaultPatientId,
          description: `Study upload: ${file.name}`,
          maxRetries: 3,
          timeout: 60000
        });

        // Clear progress interval
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        // Set complete
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));

        setUploadResults(prev => ({
          ...prev,
          [file.name]: {
            success: result.success,
            message: result.message,
            size: file.size,
            type: isDicom ? 'DICOM' : 'Report',
            uploadTime: result.uploadTime,
            attempts: result.attempts
          }
        }));

        console.log(`✅ ${file.name} uploaded successfully`);

      } catch (error: any) {
        console.error(`❌ ${file.name} upload failed:`, error);

        // Clear progress interval if it exists
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));

        // Process error with enhanced error handling service
        const userFriendlyError = errorHandlingService.processError(error, {
          fileName: file.name,
          fileSize: file.size,
          patientId: defaultPatientId,
          retryAttempt: 1,
          maxRetries: 3
        });

        // Add to upload errors for display
        setUploadErrors(prev => [...prev, userFriendlyError]);

        setUploadResults(prev => ({
          ...prev,
          [file.name]: {
            success: false,
            message: userFriendlyError.message,
            troubleshooting: userFriendlyError.troubleshooting.map(step => step.description).join(' '),
            errorType: userFriendlyError.classification.type,
            error: true,
            userFriendlyError
          }
        }));
      }
    }

    setIsUploading(false);

    // Refresh studies list after upload
    setTimeout(() => {
      loadStudies();
    }, 1000);
  };

  const handleUploadClose = () => {
    if (!isUploading) {
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setUploadProgress({});
      setUploadResults({});
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Studies
          </Typography>
          <ConnectivityStatusIndicator
            autoRefresh={true}
            refreshInterval={30000}
            showDetails={true}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/patients')}
          >
            New Study
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadStudies}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search studies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={handleFilterClick}
          >
            Filter: {statusFilter === 'all' ? 'All' : statusFilter}
          </Button>
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={handleFilterClose}
          >
            <MenuItem onClick={() => handleStatusFilterChange('all')}>
              All Statuses
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterChange('received')}>
              Received
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterChange('processing')}>
              Processing
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterChange('completed')}>
              Completed
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterChange('billed')}>
              Billed
            </MenuItem>
            <MenuItem onClick={() => handleStatusFilterChange('error')}>
              Error
            </MenuItem>
          </Menu>
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Studies Table */}
      {!loading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Patient ID</TableCell>
                <TableCell>Study Date</TableCell>
                <TableCell>Modality</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reports</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudies.map((study) => (
                <TableRow key={study.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {study.patient_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {study.study_uid.slice(-12)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {study.study_date
                      ? new Date(study.study_date).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip label={study.modality} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {study.study_description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {study.exam_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={study.status}
                      size="small"
                      color={getStatusColor(study.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {study.report_count && study.report_count > 0 ? (
                      <Box>
                        <Typography variant="body2">
                          {study.report_count} report(s)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {study.latest_report_status || 'Unknown status'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No reports
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewStudy(study.study_uid)}
                      title="View Study"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && filteredStudies.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No studies found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Studies will appear here when they are received'}
          </Typography>
        </Box>
      )}

      {/* Floating Upload Button */}
      <Fab
        color="primary"
        aria-label="upload"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
        onClick={handleUploadClick}
      >
        <UploadIcon />
      </Fab>

      {/* Upload Dialog with Real-time Progress */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleUploadClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={isUploading}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Upload Study Files</Typography>
            {!isUploading && (
              <IconButton onClick={handleUploadClose}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Connectivity Status Header */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Upload System Status</Typography>
              <ConnectivityStatusIndicator
                autoRefresh={true}
                refreshInterval={10000}
                showDetails={true}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              System connectivity and upload service status. Click the status indicator for detailed diagnostics.
            </Typography>
            
            {/* Compact Queue Status */}
            <Box sx={{ mt: 2 }}>
              <UploadQueueStatusDisplay
                autoRefresh={true}
                refreshInterval={5000}
                showControls={false}
                compact={true}
              />
            </Box>
            
            {/* Diagnostic Panel Toggle */}
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                onClick={() => setDiagnosticPanelOpen(!diagnosticPanelOpen)}
                startIcon={<AssessmentIcon />}
                endIcon={diagnosticPanelOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ textTransform: 'none' }}
              >
                Upload Health & Diagnostics
              </Button>
            </Box>
            
            {/* Collapsible Diagnostic Panel */}
            {diagnosticPanelOpen && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  System Health Overview
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                  {/* Upload Queue Status */}
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">Upload Queue</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Object.keys(uploadProgress).length} active
                    </Typography>
                  </Box>
                  
                  {/* Error Count */}
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">Upload Errors</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: uploadErrors.length > 0 ? 'error.main' : 'success.main' }}>
                      {uploadErrors.length} errors
                    </Typography>
                  </Box>
                  
                  {/* Validation Status */}
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">Validation Status</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: validationResult?.canProceed ? 'success.main' : 'warning.main' }}>
                      {validationResult ? (validationResult.canProceed ? 'Ready' : 'Blocked') : 'Pending'}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Quick Actions */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setDiagnosticsDialogOpen(true)}
                    startIcon={<SearchIcon />}
                  >
                    Full Diagnostics
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setQueueManagerDialogOpen(true)}
                    startIcon={<RefreshIcon />}
                  >
                    Manage Queue
                  </Button>
                  {uploadErrors.length > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => setUploadErrors([])}
                    >
                      Clear Errors
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select DICOM files (.dcm) or other study files to upload. Files will be processed and added to the studies list.
            </Typography>

            <input
              type="file"
              multiple
              accept=".dcm,.dicom,.pdf,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-upload-input"
            />

            <label htmlFor="file-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                disabled={isUploading}
                fullWidth
                sx={{ mb: 2 }}
              >
                Select Files
              </Button>
            </label>

            {selectedFiles.length > 0 && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Selected Files ({selectedFiles.length}):
                </Typography>
                <List dense>
                  {selectedFiles.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {file.name.toLowerCase().endsWith('.dcm') || file.name.toLowerCase().endsWith('.dicom') ?
                          '🏥' : '📄'}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Upload Readiness Indicator */}
            {selectedFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <UploadReadinessIndicator
                  files={selectedFiles}
                  patientId="PAT001"
                  onValidationComplete={(result) => {
                    setValidationResult(result);
                  }}
                  autoValidate={true}
                  showDetails={false}
                />
              </Box>
            )}
          </Box>

          {/* Enhanced Upload Progress Display */}
          {isUploading && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="primary.main">
                  🚀 Upload in Progress
                </Typography>
                <Chip
                  label={`${selectedFiles.length} files`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <UploadProgressDisplay
                showMetrics={true}
                showHistory={false}
                compact={false}
                onCancel={(uploadId) => {
                  // Handle upload cancellation
                  console.log(`Cancelling upload: ${uploadId}`);
                  // Add cancellation logic here
                }}
              />
              
              <Box sx={{ mt: 2, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="caption" color="info.main">
                  💡 Upload stages: Preparing → Validating → Uploading → Processing → Complete
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Upload Errors Display */}
          {uploadErrors.length > 0 && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="error.main">
                  ⚠️ Upload Issues Detected
                </Typography>
                <Chip
                  label={`${uploadErrors.length} errors`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
              
              {uploadErrors.map((error, index) => (
                <Box key={index} sx={{ mb: index < uploadErrors.length - 1 ? 2 : 0 }}>
                  <ErrorDisplay
                    error={error}
                    onRetry={() => {
                      // Remove this error and retry upload
                      setUploadErrors(prev => prev.filter((_, i) => i !== index));
                      // Trigger retry logic here
                    }}
                    onDismiss={() => {
                      setUploadErrors(prev => prev.filter((_, i) => i !== index));
                    }}
                    compact={false}
                  />
                </Box>
              ))}
              
              <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="caption" color="warning.main">
                  💡 Tip: Use the Network Diagnostics button below to troubleshoot connectivity issues
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Fallback Legacy Progress Display */}
          {!isUploading && Object.keys(uploadProgress).length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Upload Results:
              </Typography>

              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <Box key={fileName} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                      {fileName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {progress}%
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ mb: 1 }}
                    color={uploadResults[fileName]?.success === false ? 'error' : 'primary'}
                  />

                  {uploadResults[fileName] && (
                    <Box>
                      <Typography
                        variant="caption"
                        color={uploadResults[fileName].success ? 'success.main' : 'error.main'}
                      >
                        {uploadResults[fileName].success ? '✅' : '❌'} {uploadResults[fileName].message}
                        {uploadResults[fileName].type && ` (${uploadResults[fileName].type})`}
                      </Typography>
                      {uploadResults[fileName].troubleshooting && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
                        >
                          💡 {uploadResults[fileName].troubleshooting}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
          {/* Diagnostic Tools */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => setDiagnosticsDialogOpen(true)}
              disabled={isUploading}
              color="info"
              size="small"
              variant="outlined"
              startIcon={<AssessmentIcon />}
            >
              Diagnostics
            </Button>
            <Button
              onClick={() => setQueueManagerOpen(true)}
              disabled={isUploading}
              color="secondary"
              size="small"
              variant="outlined"
            >
              Queue ({Object.keys(uploadProgress).length})
            </Button>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Main Actions */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Manual Retry Button for Failed Uploads */}
            {uploadErrors.length > 0 && !isUploading && (
              <Button
                onClick={() => {
                  // Clear errors and retry failed uploads
                  setUploadErrors([]);
                  handleUploadStart();
                }}
                color="warning"
                size="small"
                startIcon={<RefreshIcon />}
              >
                Retry Failed
              </Button>
            )}
            
            <Button
              onClick={handleUploadClose}
              disabled={isUploading}
              color="inherit"
            >
              {isUploading ? 'Uploading...' : 'Close'}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleUploadStart}
              disabled={
                selectedFiles.length === 0 || 
                isUploading || 
                (validationResult && !validationResult.canProceed)
              }
              startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
              sx={{ minWidth: 140 }}
            >
              {isUploading 
                ? 'Uploading...' 
                : validationResult && !validationResult.canProceed
                  ? 'Upload Blocked'
                  : 'Start Upload'
              }
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Network Diagnostics Dialog */}
      <Dialog
        open={diagnosticsDialogOpen}
        onClose={() => setDiagnosticsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Network Diagnostics</Typography>
            <IconButton onClick={() => setDiagnosticsDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <NetworkDiagnostics 
            onClose={() => setDiagnosticsDialogOpen(false)}
            autoRefresh={true}
            refreshInterval={30000}
          />
        </DialogContent>
      </Dialog>

      {/* Upload Queue Manager Dialog */}
      <Dialog
        open={queueManagerOpen}
        onClose={() => setQueueManagerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Upload Queue Manager</Typography>
            <IconButton onClick={() => setQueueManagerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <UploadQueueManager 
            onClose={() => setQueueManagerOpen(false)}
            autoRefresh={true}
            refreshInterval={2000}
            showCompletedUploads={true}
          />
        </DialogContent>
      </Dialog>

      {/* Enhanced Upload Queue Manager Dialog */}
      <UploadQueueManagerDialog
        open={queueManagerDialogOpen}
        onClose={() => setQueueManagerDialogOpen(false)}
        onUploadRetry={(uploadId) => {
          console.log(`Retrying upload: ${uploadId}`);
          // The retry logic is handled within the dialog
        }}
        onUploadCancel={(uploadId) => {
          console.log(`Cancelling upload: ${uploadId}`);
          // The cancel logic is handled within the dialog
        }}
      />
    </Box>
  );
};

export default StudyList;