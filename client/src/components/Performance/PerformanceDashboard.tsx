/**
 * Performance Dashboard Component
 * Real-time performance monitoring and visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Wifi as NetworkIcon,
  TouchApp as InteractionIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  performanceMonitor,
  PerformanceMetrics,
  SystemHealthStatus,
  PerformanceAlert,
  PerformanceReport
} from '../../services/performanceMonitor';

interface PerformanceDashboardProps {
  compact?: boolean;
  showAlerts?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  compact = false,
  showAlerts = true,
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const currentMetrics = performanceMonitor.getCurrentMetrics();
    const health = performanceMonitor.getSystemHealth();
    
    setMetrics(currentMetrics);
    setSystemHealth(health);
  }, []);

  // Handle alerts
  const handleAlert = useCallback((alert: PerformanceAlert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
  }, []);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      performanceMonitor.stopMonitoring();
      setIsMonitoring(false);
    } else {
      performanceMonitor.startMonitoring();
      setIsMonitoring(true);
    }
  }, [isMonitoring]);

  // Generate report
  const generateReport = useCallback(() => {
    const newReport = performanceMonitor.generatePerformanceReport();
    setReport(newReport);
    setShowReport(true);
  }, []);

  // Setup monitoring
  useEffect(() => {
    // Start monitoring automatically
    performanceMonitor.startMonitoring();
    setIsMonitoring(true);

    // Setup metrics observer
    performanceMonitor.onMetricsUpdate(updateMetrics);
    
    // Setup alert observer
    performanceMonitor.onAlert(handleAlert);

    // Initial update
    updateMetrics();

    // Setup auto-refresh
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(updateMetrics, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      performanceMonitor.removeMetricsObserver(updateMetrics);
    };
  }, [updateMetrics, handleAlert, autoRefresh, refreshInterval]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return theme.palette.success.main;
      case 'good': return theme.palette.info.main;
      case 'fair': return theme.palette.warning.main;
      case 'poor': return theme.palette.error.light;
      case 'critical': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent':
      case 'good':
        return <CheckCircleIcon sx={{ color: getHealthColor(health) }} />;
      case 'fair':
        return <WarningIcon sx={{ color: getHealthColor(health) }} />;
      case 'poor':
      case 'critical':
        return <ErrorIcon sx={{ color: getHealthColor(health) }} />;
      default:
        return <WarningIcon sx={{ color: getHealthColor(health) }} />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!metrics || !systemHealth) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress sx={{ flexGrow: 1 }} />
            <Typography variant="body2">Loading performance data...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card sx={{ mb: 1 }}>
        <CardContent sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getHealthIcon(systemHealth.overall)}
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              System Health: {systemHealth.overall.toUpperCase()}
            </Typography>
            <Chip
              label={`${metrics.frameRate.toFixed(1)} FPS`}
              size="small"
              color={metrics.frameRate >= 45 ? 'success' : 'warning'}
            />
            <Chip
              label={formatBytes(metrics.memoryUsage)}
              size="small"
              color={metrics.memoryUsage < 100 * 1024 * 1024 ? 'success' : 'warning'}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">Performance Dashboard</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={updateMetrics}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={generateReport}
              >
                Report
              </Button>
              <Button
                variant={isMonitoring ? 'contained' : 'outlined'}
                size="small"
                color={isMonitoring ? 'success' : 'primary'}
                onClick={toggleMonitoring}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </Button>
            </Box>
          </Box>

          {/* Overall Health */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {getHealthIcon(systemHealth.overall)}
            <Typography variant="h6">
              Overall Health: {systemHealth.overall.toUpperCase()}
            </Typography>
            <Chip
              label={isMonitoring ? 'MONITORING' : 'STOPPED'}
              color={isMonitoring ? 'success' : 'default'}
              size="small"
            />
          </Box>

          {/* Recommendations */}
          {systemHealth.recommendations.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Recommendations</AlertTitle>
              <List dense>
                {systemHealth.recommendations.slice(0, 3).map((rec, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Rendering Performance */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ mr: 1, color: getHealthColor(systemHealth.rendering) }} />
                <Typography variant="h6">Rendering</Typography>
                {getHealthIcon(systemHealth.rendering)}
              </Box>
              
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metrics.frameRate.toFixed(1)} FPS
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={Math.min((metrics.frameRate / 60) * 100, 100)}
                sx={{ mb: 1 }}
                color={metrics.frameRate >= 45 ? 'success' : 'warning'}
              />
              
              <Typography variant="body2" color="text.secondary">
                Avg: {formatTime(metrics.averageRenderTime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ mr: 1, color: getHealthColor(systemHealth.memory) }} />
                <Typography variant="h6">Memory</Typography>
                {getHealthIcon(systemHealth.memory)}
              </Box>
              
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatBytes(metrics.memoryUsage)}
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={Math.min((metrics.memoryUsage / (200 * 1024 * 1024)) * 100, 100)}
                sx={{ mb: 1 }}
                color={metrics.memoryUsage < 100 * 1024 * 1024 ? 'success' : 'warning'}
              />
              
              <Typography variant="body2" color="text.secondary">
                Cache: {formatBytes(metrics.cacheSize)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Network Performance */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkIcon sx={{ mr: 1, color: getHealthColor(systemHealth.network) }} />
                <Typography variant="h6">Network</Typography>
                {getHealthIcon(systemHealth.network)}
              </Box>
              
              <Typography variant="h4" sx={{ mb: 1 }}>
                {metrics.networkLatency.toFixed(0)}ms
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={Math.max(0, 100 - (metrics.networkLatency / 500) * 100)}
                sx={{ mb: 1 }}
                color={metrics.networkLatency < 100 ? 'success' : 'warning'}
              />
              
              <Typography variant="body2" color="text.secondary">
                Cache Hit: {(metrics.cacheHitRate * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* User Experience */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InteractionIcon sx={{ mr: 1, color: getHealthColor(systemHealth.userExperience) }} />
                <Typography variant="h6">User Experience</Typography>
                {getHealthIcon(systemHealth.userExperience)}
              </Box>
              
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatTime(metrics.responseTime)}
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={Math.max(0, 100 - (metrics.responseTime / 200) * 100)}
                sx={{ mb: 1 }}
                color={metrics.responseTime < 100 ? 'success' : 'warning'}
              />
              
              <Typography variant="body2" color="text.secondary">
                Error Rate: {(metrics.errorRate * 100).toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {showAlerts && alerts.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Recent Alerts</Typography>
              <IconButton
                onClick={() => setExpanded(expanded === 'alerts' ? null : 'alerts')}
                size="small"
              >
                {expanded === 'alerts' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={expanded === 'alerts'}>
              <List>
                {alerts.slice(0, 5).map((alert, index) => (
                  <ListItem key={alert.id}>
                    <ListItemIcon>
                      {alert.severity === 'critical' ? (
                        <ErrorIcon color="error" />
                      ) : alert.severity === 'error' ? (
                        <ErrorIcon color="warning" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.message}
                      secondary={new Date(alert.timestamp).toLocaleTimeString()}
                    />
                    <Chip
                      label={alert.severity.toUpperCase()}
                      size="small"
                      color={alert.severity === 'critical' ? 'error' : 'warning'}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Performance Report Dialog */}
      <Dialog
        open={showReport}
        onClose={() => setShowReport(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Performance Report</DialogTitle>
        <DialogContent>
          {report && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Average Frame Rate: {report.summary.frameRate.toFixed(1)} FPS
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Memory Usage: {formatBytes(report.summary.memoryUsage)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Network Latency: {report.summary.networkLatency.toFixed(0)}ms
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Response Time: {formatTime(report.summary.responseTime)}
                  </Typography>
                </Grid>
              </Grid>

              {report.recommendations.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Recommendations
                  </Typography>
                  <List>
                    {report.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={rec.title}
                          secondary={rec.description}
                        />
                        <Chip
                          label={rec.priority.toUpperCase()}
                          size="small"
                          color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReport(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Download report as JSON
              const dataStr = JSON.stringify(report, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `performance-report-${Date.now()}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceDashboard;