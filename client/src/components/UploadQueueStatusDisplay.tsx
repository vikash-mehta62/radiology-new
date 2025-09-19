import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Badge,
  Divider,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Replay as RetryIcon,
  CloudUpload as UploadIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';

import { queueManagementService, QueueStats } from '../services/queueManagementService';
import { PersistedUpload } from '../services/uploadQueuePersistence';

interface UploadQueueStatusDisplayProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showControls?: boolean;
  compact?: boolean;
  onUploadRetry?: (uploadId: string) => void;
  onUploadCancel?: (uploadId: string) => void;
}

const UploadQueueStatusDisplay: React.FC<UploadQueueStatusDisplayProps> = ({
  autoRefresh = true,
  refreshInterval = 5000,
  showControls = true,
  compact = false,
  onUploadRetry,
  onUploadCancel,
}) => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [uploads, setUploads] = useState<PersistedUpload[]>([]);
  const [connectivityStatus, setConnectivityStatus] = useState<any>(null);
  const [isProcessingPaused, setIsProcessingPaused] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Load queue data
  const loadQueueData = async () => {
    try {
      setLoading(true);
      const stats = queueManagementService.getQueueStats();
      const allUploads = queueManagementService.getAllUploads();
      const connectivity = queueManagementService.getConnectivityStatus();
      
      setQueueStats(stats);
      setUploads(allUploads);
      setConnectivityStatus(connectivity);
    } catch (error) {
      console.error('Failed to load queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    loadQueueData();
    
    if (autoRefresh) {
      const interval = setInterval(loadQueueData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Filter uploads by status
  const filteredUploads = uploads.filter(upload => {
    if (selectedStatus === 'all') return true;
    return upload.status === selectedStatus;
  });

  // Handle retry failed uploads
  const handleRetryFailed = async () => {
    try {
      setLoading(true);
      const result = await queueManagementService.retryFailedUploads();
      console.log(`Retried ${result.retriedCount} uploads: ${result.successCount} successful, ${result.failedCount} failed`);
      await loadQueueData();
    } catch (error) {
      console.error('Failed to retry uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle clear completed
  const handleClearCompleted = () => {
    const count = queueManagementService.clearCompleted();
    console.log(`Cleared ${count} completed uploads`);
    loadQueueData();
  };

  // Handle clear all
  const handleClearAll = () => {
    const count = queueManagementService.clearAll();
    console.log(`Cleared ${count} uploads`);
    setClearDialogOpen(false);
    loadQueueData();
  };

  // Handle pause/resume processing
  const handleToggleProcessing = () => {
    if (isProcessingPaused) {
      queueManagementService.resumeProcessing();
      setIsProcessingPaused(false);
    } else {
      queueManagementService.pauseProcessing();
      setIsProcessingPaused(true);
    }
  };

  // Handle force connectivity check
  const handleForceConnectivityCheck = async () => {
    try {
      setLoading(true);
      const isOnline = await queueManagementService.forceConnectivityCheck();
      console.log(`Connectivity check: ${isOnline ? 'Online' : 'Offline'}`);
      await loadQueueData();
    } catch (error) {
      console.error('Failed to check connectivity:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: PersistedUpload['status']) => {
    switch (status) {
      case 'queued':
        return { icon: <ScheduleIcon />, color: 'info', label: 'Queued' };
      case 'uploading':
        return { icon: <UploadIcon />, color: 'primary', label: 'Uploading' };
      case 'completed':
        return { icon: <CheckCircleIcon />, color: 'success', label: 'Completed' };
      case 'failed':
        return { icon: <ErrorIcon />, color: 'error', label: 'Failed' };
      case 'cancelled':
        return { icon: <ClearIcon />, color: 'default', label: 'Cancelled' };
      default:
        return { icon: <InfoIcon />, color: 'default', label: status };
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (compact && queueStats) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge badgeContent={queueStats.queuedItems + queueStats.uploadingItems} color="primary">
                <UploadIcon color="action" />
              </Badge>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Upload Queue
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                size="small"
                label={`${queueStats.totalItems} total`}
                color="default"
                variant="outlined"
              />
              {queueStats.failedItems > 0 && (
                <Chip
                  size="small"
                  label={`${queueStats.failedItems} failed`}
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Upload Queue Status
          </Typography>
          {connectivityStatus && (
            <Chip
              size="small"
              icon={<NetworkIcon />}
              label={connectivityStatus.isOnline ? 'Online' : 'Offline'}
              color={connectivityStatus.isOnline ? 'success' : 'error'}
              variant="outlined"
            />
          )}
        </Box>
        
        {showControls && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Force connectivity check">
              <IconButton
                size="small"
                onClick={handleForceConnectivityCheck}
                disabled={loading}
              >
                <NetworkIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isProcessingPaused ? 'Resume processing' : 'Pause processing'}>
              <IconButton
                size="small"
                onClick={handleToggleProcessing}
                color={isProcessingPaused ? 'error' : 'primary'}
              >
                {isProcessingPaused ? <PlayIcon /> : <PauseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh queue">
              <IconButton
                size="small"
                onClick={loadQueueData}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Queue Statistics */}
      {queueStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                  {queueStats.totalItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Items
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                  {queueStats.queuedItems + queueStats.uploadingItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                  {queueStats.completedItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" color="error.main" sx={{ fontWeight: 600 }}>
                  {queueStats.failedItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Queue Controls */}
      {showControls && queueStats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {queueStats.failedItems > 0 && (
            <Button
              variant="outlined"
              startIcon={<RetryIcon />}
              onClick={handleRetryFailed}
              disabled={loading}
              color="warning"
            >
              Retry Failed ({queueStats.failedItems})
            </Button>
          )}
          
          {queueStats.completedItems > 0 && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearCompleted}
              disabled={loading}
            >
              Clear Completed ({queueStats.completedItems})
            </Button>
          )}
          
          {queueStats.totalItems > 0 && (
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => setClearDialogOpen(true)}
              disabled={loading}
              color="error"
            >
              Clear All
            </Button>
          )}
        </Box>
      )}

      {/* Status Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {['all', 'queued', 'uploading', 'completed', 'failed', 'cancelled'].map((status) => (
          <Chip
            key={status}
            label={status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            onClick={() => setSelectedStatus(status)}
            color={selectedStatus === status ? 'primary' : 'default'}
            variant={selectedStatus === status ? 'filled' : 'outlined'}
            size="small"
          />
        ))}
      </Box>

      {/* Upload List */}
      {filteredUploads.length > 0 ? (
        <List>
          {filteredUploads.map((upload, index) => {
            const statusDisplay = getStatusDisplay(upload.status);
            
            return (
              <React.Fragment key={upload.id}>
                <ListItem>
                  <ListItemIcon>
                    <Tooltip title={statusDisplay.label}>
                      <Box sx={{ color: `${statusDisplay.color}.main` }}>
                        {statusDisplay.icon}
                      </Box>
                    </Tooltip>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {upload.fileName}
                        </Typography>
                        <Chip
                          size="small"
                          label={upload.fileType}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(upload.fileSize)} • Patient: {upload.patientId}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatTimeAgo(upload.createdAt)}
                          {upload.lastAttemptAt && ` • Last attempt: ${formatTimeAgo(upload.lastAttemptAt)}`}
                          {upload.attempts > 0 && ` • Attempts: ${upload.attempts}/${upload.maxRetries}`}
                        </Typography>
                        {upload.errorMessage && (
                          <>
                            <br />
                            <Typography variant="caption" color="error.main">
                              Error: {upload.errorMessage}
                            </Typography>
                          </>
                        )}
                        {upload.nextRetryAt && new Date(upload.nextRetryAt) > new Date() && (
                          <>
                            <br />
                            <Typography variant="caption" color="warning.main">
                              Next retry: {formatTimeAgo(upload.nextRetryAt)}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                  
                  {upload.progress > 0 && upload.progress < 100 && (
                    <Box sx={{ width: 100, mr: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={upload.progress}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                        {upload.progress}%
                      </Typography>
                    </Box>
                  )}
                  
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {upload.status === 'failed' && upload.attempts < upload.maxRetries && (
                        <Tooltip title="Retry upload">
                          <IconButton
                            size="small"
                            onClick={() => onUploadRetry?.(upload.id)}
                            color="warning"
                          >
                            <RetryIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {(upload.status === 'queued' || upload.status === 'uploading') && (
                        <Tooltip title="Cancel upload">
                          <IconButton
                            size="small"
                            onClick={() => onUploadCancel?.(upload.id)}
                            color="error"
                          >
                            <ClearIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="Remove from queue">
                        <IconButton
                          size="small"
                          onClick={() => {
                            queueManagementService.removeFromQueue(upload.id);
                            loadQueueData();
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < filteredUploads.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          {selectedStatus === 'all' 
            ? 'No uploads in queue'
            : `No ${selectedStatus} uploads`
          }
        </Alert>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear All Uploads</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear all uploads from the queue? This action cannot be undone.
          </Typography>
          {queueStats && queueStats.queuedItems + queueStats.uploadingItems > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This will cancel {queueStats.queuedItems + queueStats.uploadingItems} active uploads.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearAll} color="error" variant="contained">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UploadQueueStatusDisplay;