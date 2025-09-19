import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

import { 
  enhancedUploadService, 
  QueuedUpload, 
  UploadQueueStatus,
  UploadResult,
  UploadError 
} from '../services/enhancedUploadService';

interface UploadQueueManagerProps {
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showCompletedUploads?: boolean;
}

const UploadQueueManager: React.FC<UploadQueueManagerProps> = ({
  onClose,
  autoRefresh = true,
  refreshInterval = 2000,
  showCompletedUploads = false
}) => {
  const [queueStatus, setQueueStatus] = useState<UploadQueueStatus | null>(null);
  const [uploads, setUploads] = useState<QueuedUpload[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });

  const refreshData = () => {
    const status = enhancedUploadService.getQueueStatus();
    setQueueStatus(status);

    // Get all uploads (we'll need to implement a method to get all uploads)
    // For now, we'll simulate this
    const allUploads: QueuedUpload[] = [];
    setUploads(showCompletedUploads ? allUploads : allUploads.filter(u => u.status !== 'completed'));
  };

  useEffect(() => {
    refreshData();
  }, [showCompletedUploads]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleCancelUpload = (uploadId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Cancel Upload',
      message: 'Are you sure you want to cancel this upload?',
      action: async () => {
        try {
          await enhancedUploadService.cancelUpload(uploadId);
          refreshData();
        } catch (error) {
          console.error('Failed to cancel upload:', error);
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleResumeQueue = async () => {
    try {
      await enhancedUploadService.resumeQueuedUploads();
      refreshData();
    } catch (error) {
      console.error('Failed to resume queue:', error);
    }
  };

  const handleClearCompleted = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear Completed Uploads',
      message: 'This will remove all completed uploads from the queue. Continue?',
      action: () => {
        enhancedUploadService.clearCompletedUploads();
        refreshData();
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleClearAll = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All Uploads',
      message: 'This will remove ALL uploads from the queue, including active ones. Continue?',
      action: () => {
        enhancedUploadService.clearAllUploads();
        refreshData();
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const toggleExpanded = (uploadId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(uploadId)) {
      newExpanded.delete(uploadId);
    } else {
      newExpanded.add(uploadId);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (status: QueuedUpload['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'uploading':
        return <UploadIcon color="primary" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'cancelled':
        return <CancelIcon color="disabled" />;
      case 'queued':
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = (status: QueuedUpload['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'uploading':
        return 'primary';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'queued':
      default:
        return 'warning';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (!queueStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography>Loading queue status...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          <UploadIcon sx={{ mr: 1 }} />
          Upload Queue Manager
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={refreshData}
            size="small"
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} size="small">
              Close
            </Button>
          )}
        </Box>
      </Box>

      {/* Queue Status Overview */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Queue Status
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip
              label={`Total: ${queueStatus.totalItems}`}
              color="default"
              size="small"
            />
            <Chip
              label={`Queued: ${queueStatus.queuedItems}`}
              color="warning"
              size="small"
            />
            <Chip
              label={`Uploading: ${queueStatus.uploadingItems}`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Completed: ${queueStatus.completedItems}`}
              color="success"
              size="small"
            />
            <Chip
              label={`Failed: ${queueStatus.failedItems}`}
              color="error"
              size="small"
            />
          </Box>
          
          {queueStatus.isProcessing && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Queue is processing...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Queue Actions */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        <Button
          startIcon={<PlayIcon />}
          onClick={handleResumeQueue}
          disabled={queueStatus.failedItems === 0}
          size="small"
        >
          Resume Failed
        </Button>
        <Button
          startIcon={<ClearIcon />}
          onClick={handleClearCompleted}
          disabled={queueStatus.completedItems === 0}
          size="small"
        >
          Clear Completed
        </Button>
        <Button
          startIcon={<ClearIcon />}
          onClick={handleClearAll}
          disabled={queueStatus.totalItems === 0}
          color="error"
          size="small"
        >
          Clear All
        </Button>
      </Box>

      {/* Upload List */}
      {uploads.length === 0 ? (
        <Alert severity="info">
          No uploads in queue. Upload files to see them here.
        </Alert>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <List>
              {uploads.map((upload, index) => (
                <React.Fragment key={upload.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(upload.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" noWrap>
                            {upload.file.name}
                          </Typography>
                          <Chip
                            label={upload.status}
                            color={getStatusColor(upload.status) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Size: {formatFileSize(upload.file.size)} • 
                            Attempts: {upload.attempts}/{upload.maxRetries}
                          </Typography>
                          {upload.status === 'uploading' && (
                            <LinearProgress
                              variant="determinate"
                              value={upload.progress}
                              sx={{ mt: 1 }}
                            />
                          )}
                          {upload.lastError && (
                            <Typography variant="caption" color="error" display="block">
                              Error: {upload.lastError.message}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center">
                        {upload.status === 'queued' || upload.status === 'uploading' ? (
                          <Tooltip title="Cancel Upload">
                            <IconButton
                              size="small"
                              onClick={() => handleCancelUpload(upload.id)}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        <Tooltip title="Show Details">
                          <IconButton
                            size="small"
                            onClick={() => toggleExpanded(upload.id)}
                          >
                            {expandedItems.has(upload.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* Expanded Details */}
                  <Collapse in={expandedItems.has(upload.id)}>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Upload Details
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Patient ID:</strong> {upload.options.patientId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Created:</strong> {upload.createdAt.toLocaleString()}
                      </Typography>
                      {upload.lastAttemptAt && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Last Attempt:</strong> {upload.lastAttemptAt.toLocaleString()}
                        </Typography>
                      )}
                      {upload.nextRetryAt && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Next Retry:</strong> {upload.nextRetryAt.toLocaleString()}
                        </Typography>
                      )}
                      {upload.options.description && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Description:</strong> {upload.options.description}
                        </Typography>
                      )}
                      {upload.lastError && (
                        <Box mt={1}>
                          <Typography variant="subtitle2" color="error">
                            Last Error:
                          </Typography>
                          <Typography variant="body2" color="error">
                            Type: {upload.lastError.type}
                          </Typography>
                          <Typography variant="body2" color="error">
                            Message: {upload.lastError.message}
                          </Typography>
                          <Typography variant="body2" color="error">
                            Retryable: {upload.lastError.retryable ? 'Yes' : 'No'}
                          </Typography>
                          {upload.lastError.statusCode && (
                            <Typography variant="body2" color="error">
                              Status Code: {upload.lastError.statusCode}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Collapse>

                  {index < uploads.length - 1 && <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button onClick={confirmDialog.action} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadQueueManager;