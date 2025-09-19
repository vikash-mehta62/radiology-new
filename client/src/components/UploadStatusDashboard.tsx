import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

import { enhancedUploadService } from '../services/enhancedUploadService';
import { uploadProgressManager } from '../services/uploadProgressManager';
import { errorHandlingService } from '../services/errorHandlingService';

interface UploadStatusDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
}

interface DashboardMetrics {
  activeUploads: number;
  queuedUploads: number;
  completedUploads: number;
  failedUploads: number;
  totalDataTransferred: number;
  averageSpeed: number;
  successRate: number;
  recentErrors: any[];
  systemHealth: 'healthy' | 'warning' | 'error';
}

const UploadStatusDashboard: React.FC<UploadStatusDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 5000,
  compact = false
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMetrics = async () => {
    try {
      // Get queue status
      const queueStatus = enhancedUploadService.getQueueStatus();
      
      // Get aggregate metrics
      const aggregateMetrics = uploadProgressManager.getAggregateMetrics();
      
      // Get error statistics
      const errorStats = errorHandlingService.getErrorStatistics();
      
      // Calculate system health
      const systemHealth = calculateSystemHealth(queueStatus, aggregateMetrics, errorStats);
      
      const dashboardMetrics: DashboardMetrics = {
        activeUploads: queueStatus.uploadingItems,
        queuedUploads: queueStatus.queuedItems,
        completedUploads: queueStatus.completedItems,
        failedUploads: queueStatus.failedItems,
        totalDataTransferred: aggregateMetrics.totalDataTransferred,
        averageSpeed: aggregateMetrics.averageSpeed,
        successRate: aggregateMetrics.totalUploads > 0 
          ? (aggregateMetrics.successfulUploads / aggregateMetrics.totalUploads) * 100 
          : 100,
        recentErrors: errorStats.recentErrors.slice(0, 5),
        systemHealth
      };

      setMetrics(dashboardMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemHealth = (queueStatus: any, aggregateMetrics: any, errorStats: any): DashboardMetrics['systemHealth'] => {
    // Calculate based on error rate and queue status
    const errorRate = aggregateMetrics.totalUploads > 0 
      ? (aggregateMetrics.failedUploads / aggregateMetrics.totalUploads) * 100 
      : 0;
    
    if (errorRate > 20 || errorStats.recentErrors.length > 10) {
      return 'error';
    } else if (errorRate > 10 || queueStatus.failedItems > 5) {
      return 'warning';
    } else {
      return 'healthy';
    }
  };

  useEffect(() => {
    refreshMetrics();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refreshMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

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

  const getHealthColor = (health: DashboardMetrics['systemHealth']) => {
    switch (health) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (health: DashboardMetrics['systemHealth']) => {
    switch (health) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <AssessmentIcon />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading dashboard...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="error">
        Failed to load dashboard metrics. Please try refreshing.
      </Alert>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <UploadIcon />
              Upload Status
            </Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={refreshMetrics}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {metrics.activeUploads}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">
                  {metrics.queuedUploads}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Queued
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {metrics.completedUploads}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">
                  {metrics.failedUploads}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Success Rate</Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.successRate.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metrics.successRate}
              color={metrics.successRate > 90 ? 'success' : metrics.successRate > 70 ? 'warning' : 'error'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" display="flex" alignItems="center" gap={1}>
          <AssessmentIcon />
          Upload Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            icon={getHealthIcon(metrics.systemHealth)}
            label={`System ${metrics.systemHealth}`}
            color={getHealthColor(metrics.systemHealth) as any}
            size="small"
          />
          <Button
            startIcon={<RefreshIcon />}
            onClick={refreshMetrics}
            size="small"
            variant="outlined"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3} mb={3}>
        {/* Active Uploads */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {metrics.activeUploads}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Uploads
                  </Typography>
                </Box>
                <UploadIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Queued Uploads */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {metrics.queuedUploads}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Queued
                  </Typography>
                </Box>
                <TimerIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {metrics.successRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={metrics.successRate}
                color={metrics.successRate > 90 ? 'success' : 'warning'}
                sx={{ mt: 1, height: 4, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Average Speed */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatSpeed(metrics.averageSpeed)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Speed
                  </Typography>
                </Box>
                <SpeedIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Metrics */}
      <Grid container spacing={3} mb={3}>
        {/* Upload Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon />
                Upload Summary
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Completed Uploads"
                    secondary={`${metrics.completedUploads} files`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <ErrorIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Failed Uploads"
                    secondary={`${metrics.failedUploads} files`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SpeedIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Data Transferred"
                    secondary={formatFileSize(metrics.totalDataTransferred)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Errors */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <ErrorIcon />
                Recent Errors
              </Typography>
              
              {metrics.recentErrors.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No recent errors
                </Typography>
              ) : (
                <List dense>
                  {metrics.recentErrors.map((error, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={error.title || 'Upload Error'}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {error.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {error.timestamp.toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < metrics.recentErrors.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Health Alert */}
      {metrics.systemHealth !== 'healthy' && (
        <Alert 
          severity={metrics.systemHealth === 'error' ? 'error' : 'warning'}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">
            System Health: {metrics.systemHealth}
          </Typography>
          <Typography variant="body2">
            {metrics.systemHealth === 'error' 
              ? 'Multiple upload failures detected. Check network connectivity and server status.'
              : 'Some upload issues detected. Monitor the situation and check for patterns.'
            }
          </Typography>
        </Alert>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          Last updated: {lastUpdated.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

export default UploadStatusDashboard;