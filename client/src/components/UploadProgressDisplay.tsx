import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Tooltip,
  Grid,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

import { 
  uploadProgressManager, 
  UploadStatus, 
  ProgressUpdate,
  PerformanceMetrics 
} from '../services/uploadProgressManager';

interface UploadProgressDisplayProps {
  uploadId?: string; // If provided, shows single upload, otherwise shows all
  showMetrics?: boolean;
  showHistory?: boolean;
  compact?: boolean;
  onCancel?: (uploadId: string) => void;
}

const UploadProgressDisplay: React.FC<UploadProgressDisplayProps> = ({
  uploadId,
  showMetrics = true,
  showHistory = false,
  compact = false,
  onCancel
}) => {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [expandedUploads, setExpandedUploads] = useState<Set<string>>(new Set());
  const [aggregateMetrics, setAggregateMetrics] = useState<any>(null);

  useEffect(() => {
    const updateUploads = () => {
      if (uploadId) {
        const upload = uploadProgressManager.getUploadStatus(uploadId);
        setUploads(upload ? [upload] : []);
      } else {
        setUploads(uploadProgressManager.getActiveUploads());
      }

      if (showMetrics) {
        setAggregateMetrics(uploadProgressManager.getAggregateMetrics());
      }
    };

    // Initial load
    updateUploads();

    // Subscribe to global updates
    const unsubscribe = uploadProgressManager.subscribeToGlobalStatus(updateUploads);

    return unsubscribe;
  }, [uploadId, showMetrics]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedUploads);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedUploads(newExpanded);
  };

  const getStatusIcon = (status: UploadStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'cancelled':
        return <CancelIcon color="disabled" />;
      case 'active':
      default:
        return <UploadIcon color="primary" />;
    }
  };

  const getStageColor = (stage: ProgressUpdate['stage']) => {
    switch (stage) {
      case 'complete':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'primary';
      case 'processing':
        return 'secondary';
      case 'preparing':
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

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
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

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s remaining`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m remaining`;
    } else {
      return `${Math.round(seconds / 3600)}h remaining`;
    }
  };

  const getLatestProgress = (upload: UploadStatus): ProgressUpdate | null => {
    return upload.progressHistory.length > 0 
      ? upload.progressHistory[upload.progressHistory.length - 1]
      : null;
  };

  if (uploads.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No active uploads to display.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Aggregate Metrics */}
      {showMetrics && aggregateMetrics && !uploadId && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Upload Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="primary">
                    {aggregateMetrics.totalUploads}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Uploads
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="success.main">
                    {aggregateMetrics.successfulUploads}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Successful
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="primary">
                    {formatSpeed(aggregateMetrics.averageSpeed)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Speed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="primary">
                    {formatFileSize(aggregateMetrics.totalDataTransferred)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Data Transferred
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Upload List */}
      <List>
        {uploads.map((upload) => {
          const latestProgress = getLatestProgress(upload);
          const isExpanded = expandedUploads.has(upload.uploadId);

          return (
            <Card key={upload.uploadId} sx={{ mb: 1 }}>
              <ListItem>
                <ListItemIcon>
                  {getStatusIcon(upload.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" noWrap>
                        {upload.fileName}
                      </Typography>
                      <Chip
                        label={upload.currentStage}
                        color={getStageColor(upload.currentStage) as any}
                        size="small"
                      />
                      {upload.metadata?.fileType && (
                        <Chip
                          label={upload.metadata.fileType}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {/* Progress Bar */}
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <LinearProgress
                          variant="determinate"
                          value={upload.overallProgress}
                          sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          color={upload.status === 'failed' ? 'error' : 'primary'}
                        />
                        <Typography variant="caption" color="text.secondary" minWidth={40}>
                          {Math.round(upload.overallProgress)}%
                        </Typography>
                      </Box>

                      {/* Upload Details */}
                      <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(upload.fileSize)}
                        </Typography>
                        
                        {latestProgress?.speed && (
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                            <SpeedIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            {formatSpeed(latestProgress.speed)}
                          </Typography>
                        )}

                        {latestProgress?.estimatedTimeRemaining && upload.status === 'active' && (
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                            <TimerIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            {formatTimeRemaining(latestProgress.estimatedTimeRemaining)}
                          </Typography>
                        )}

                        {upload.duration && upload.status !== 'active' && (
                          <Typography variant="caption" color="text.secondary">
                            Duration: {formatDuration(upload.duration)}
                          </Typography>
                        )}

                        {upload.metadata?.attempts && upload.metadata.attempts > 1 && (
                          <Typography variant="caption" color="warning.main">
                            Attempt {upload.metadata.attempts}
                          </Typography>
                        )}
                      </Box>

                      {/* Current Message */}
                      {latestProgress?.message && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {latestProgress.message}
                        </Typography>
                      )}
                    </Box>
                  }
                />

                {/* Action Buttons */}
                <Box display="flex" alignItems="center">
                  {upload.status === 'active' && onCancel && (
                    <Tooltip title="Cancel Upload">
                      <IconButton
                        size="small"
                        onClick={() => onCancel(upload.uploadId)}
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  {!compact && (
                    <Tooltip title={isExpanded ? "Hide Details" : "Show Details"}>
                      <IconButton
                        size="small"
                        onClick={() => toggleExpanded(upload.uploadId)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItem>

              {/* Expanded Details */}
              {!compact && (
                <Collapse in={isExpanded}>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Grid container spacing={2}>
                      {/* Upload Information */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Upload Information
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Patient ID:</strong> {upload.metadata?.patientId || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Started:</strong> {upload.startTime.toLocaleString()}
                        </Typography>
                        {upload.endTime && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Completed:</strong> {upload.endTime.toLocaleString()}
                          </Typography>
                        )}
                        {upload.metadata?.description && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Description:</strong> {upload.metadata.description}
                          </Typography>
                        )}
                      </Grid>

                      {/* Performance Metrics */}
                      {showMetrics && upload.averageSpeed && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Performance
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Average Speed:</strong> {formatSpeed(upload.averageSpeed)}
                          </Typography>
                          {latestProgress?.speed && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Current Speed:</strong> {formatSpeed(latestProgress.speed)}
                            </Typography>
                          )}
                          {upload.duration && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Duration:</strong> {formatDuration(upload.duration)}
                            </Typography>
                          )}
                        </Grid>
                      )}

                      {/* Progress History */}
                      {showHistory && upload.progressHistory.length > 1 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Progress History
                          </Typography>
                          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {upload.progressHistory.slice(-10).map((progress, index) => (
                              <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="caption">
                                    {progress.stage} - {progress.message}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {progress.timestamp.toLocaleTimeString()}
                                  </Typography>
                                </Box>
                                {progress.speed && (
                                  <Typography variant="caption" color="text.secondary">
                                    Speed: {formatSpeed(progress.speed)}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Collapse>
              )}
            </Card>
          );
        })}
      </List>
    </Box>
  );
};

export default UploadProgressDisplay;