import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, LinearProgress,
  Chip, IconButton, Collapse, Alert, Button, Divider,
  List, ListItem, ListItemIcon, ListItemText, Switch,
  FormControlLabel, Tooltip, Paper, Stack
} from '@mui/material';
import {
  Speed, Memory, Cached, NetworkCheck, TrendingUp,
  ExpandMore, ExpandLess, Refresh, Settings, Warning,
  CheckCircle, Info, Tune, AutoAwesome, CleaningServices
} from '@mui/icons-material';
import { useDicomOptimization } from '../../hooks/useDicomOptimization';

interface DicomPerformanceMonitorProps {
  onConfigChange?: (config: any) => void;
  showRecommendations?: boolean;
  compact?: boolean;
}

const DicomPerformanceMonitor: React.FC<DicomPerformanceMonitorProps> = ({
  onConfigChange,
  showRecommendations = true,
  compact = false
}) => {
  const {
    config,
    metrics,
    cacheStatus,
    isOptimizing,
    updateConfig,
    clearCache,
    optimizeMemory,
    getPerformanceReport
  } = useDicomOptimization();

  const [expanded, setExpanded] = useState(!compact);
  const [report, setReport] = useState<any>(null);

  // Update performance report
  useEffect(() => {
    const updateReport = () => {
      setReport(getPerformanceReport());
    };

    updateReport();
    const interval = setInterval(updateReport, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [getPerformanceReport]);

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const handleConfigChange = (key: string, value: any) => {
    updateConfig({ [key]: value });
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'success';
    if (value <= thresholds.warning) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (compact && !expanded) {
    return (
      <Paper sx={{ p: 1, mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Speed fontSize="small" />
          <Typography variant="caption">
            {formatTime(metrics.averageResponseTime)}
          </Typography>
          
          <Cached fontSize="small" />
          <Typography variant="caption">
            {metrics.cacheHitRate.toFixed(1)}%
          </Typography>
          
          <Memory fontSize="small" />
          <Typography variant="caption">
            {formatBytes(metrics.memoryUsage * 1024 * 1024)}
          </Typography>
          
          <IconButton size="small" onClick={() => setExpanded(true)}>
            <ExpandMore />
          </IconButton>
        </Stack>
      </Paper>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            Performance Monitor
          </Typography>
          <Box>
            <IconButton onClick={optimizeMemory} size="small" title="Optimize Memory">
              <AutoAwesome />
            </IconButton>
            <IconButton onClick={clearCache} size="small" title="Clear Cache">
              <CleaningServices />
            </IconButton>
            {compact && (
              <IconButton onClick={() => setExpanded(!expanded)} size="small">
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        </Box>

        <Collapse in={expanded}>
          {/* Performance Metrics */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Speed 
                  color={getPerformanceColor(metrics.averageResponseTime, { good: 500, warning: 2000 })} 
                  sx={{ fontSize: 40, mb: 1 }} 
                />
                <Typography variant="h6">
                  {formatTime(metrics.averageResponseTime)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Avg Response Time
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (2000 - metrics.averageResponseTime) / 20)}
                  color={getPerformanceColor(metrics.averageResponseTime, { good: 500, warning: 2000 })}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Cached 
                  color={getPerformanceColor(100 - metrics.cacheHitRate, { good: 30, warning: 50 })} 
                  sx={{ fontSize: 40, mb: 1 }} 
                />
                <Typography variant="h6">
                  {metrics.cacheHitRate.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Cache Hit Rate
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.cacheHitRate}
                  color={getPerformanceColor(100 - metrics.cacheHitRate, { good: 30, warning: 50 })}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Memory 
                  color={getPerformanceColor(metrics.memoryUsage, { good: 50, warning: 100 })} 
                  sx={{ fontSize: 40, mb: 1 }} 
                />
                <Typography variant="h6">
                  {formatBytes(metrics.memoryUsage * 1024 * 1024)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Memory Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (metrics.memoryUsage / 200) * 100)}
                  color={getPerformanceColor(metrics.memoryUsage, { good: 50, warning: 100 })}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <NetworkCheck 
                  color="primary" 
                  sx={{ fontSize: 40, mb: 1 }} 
                />
                <Typography variant="h6">
                  {metrics.networkRequests}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total Requests
                </Typography>
                <Box mt={1}>
                  <Chip 
                    label={isOptimizing ? "Optimizing..." : "Ready"} 
                    color={isOptimizing ? "warning" : "success"}
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Cache Status */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              Cache Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">Size</Typography>
                <Typography variant="body2">{cacheStatus.size.toFixed(1)} MB</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">Entries</Typography>
                <Typography variant="body2">{cacheStatus.entries}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">Hit Rate</Typography>
                <Typography variant="body2">{cacheStatus.hitRate.toFixed(1)}%</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Configuration */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              Optimization Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableCaching}
                      onChange={(e) => handleConfigChange('enableCaching', e.target.checked)}
                    />
                  }
                  label="Enable Caching"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enablePreloading}
                      onChange={(e) => handleConfigChange('enablePreloading', e.target.checked)}
                    />
                  }
                  label="Enable Preloading"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableProgressiveLoading}
                      onChange={(e) => handleConfigChange('enableProgressiveLoading', e.target.checked)}
                    />
                  }
                  label="Progressive Loading"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableWebWorkers}
                      onChange={(e) => handleConfigChange('enableWebWorkers', e.target.checked)}
                    />
                  }
                  label="Web Workers"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Recommendations */}
          {showRecommendations && report?.recommendations?.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Performance Recommendations
              </Typography>
              <List dense>
                {report.recommendations.map((recommendation: string, index: number) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Info fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {/* Performance Summary */}
          {report && (
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Performance Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Cache Efficiency</Typography>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {report.summary.cacheEfficiency.toFixed(1)}%
                    </Typography>
                    {report.summary.cacheEfficiency > 70 ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <Warning color="warning" fontSize="small" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Load Performance</Typography>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {report.summary.averageLoadTime < 1000 ? 'Excellent' : 
                       report.summary.averageLoadTime < 2000 ? 'Good' : 'Needs Improvement'}
                    </Typography>
                    {report.summary.averageLoadTime < 1000 ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : report.summary.averageLoadTime < 2000 ? (
                      <Info color="info" fontSize="small" />
                    ) : (
                      <Warning color="warning" fontSize="small" />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default DicomPerformanceMonitor;