import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  NetworkCheck as NetworkCheckIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

import { 
  networkDiagnosticsService, 
  DiagnosticReport, 
  ConnectivityStatus,
  PerformanceMetrics 
} from '../services/networkDiagnosticsService';

interface NetworkDiagnosticsProps {
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const NetworkDiagnostics: React.FC<NetworkDiagnosticsProps> = ({
  onClose,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const report = await networkDiagnosticsService.getDiagnosticReport();
      setDiagnosticReport(report);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(runDiagnostics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: boolean) => {
    return status ? 'success' : 'error';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
  };

  const formatLatency = (latency: number) => {
    if (latency < 100) return { text: `${latency}ms`, color: 'success' };
    if (latency < 500) return { text: `${latency}ms`, color: 'warning' };
    return { text: `${latency}ms`, color: 'error' };
  };

  const formatUptime = (uptime: number) => {
    if (uptime >= 99) return { text: `${uptime.toFixed(1)}%`, color: 'success' };
    if (uptime >= 95) return { text: `${uptime.toFixed(1)}%`, color: 'warning' };
    return { text: `${uptime.toFixed(1)}%`, color: 'error' };
  };

  if (!diagnosticReport && loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Running network diagnostics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          <NetworkCheckIcon sx={{ mr: 1 }} />
          Network Diagnostics
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={runDiagnostics}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} size="small" sx={{ ml: 1 }}>
              Close
            </Button>
          )}
        </Box>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
      )}

      {diagnosticReport && (
        <>
          {/* Overall Status */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {getStatusIcon(diagnosticReport.connectivity.isConnected)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Connectivity
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {diagnosticReport.connectivity.isConnected ? 'Connected' : 'Disconnected'}
                  </Typography>
                  {diagnosticReport.connectivity.isConnected && (
                    <Chip
                      label={formatLatency(diagnosticReport.connectivity.latency).text}
                      color={formatLatency(diagnosticReport.connectivity.latency).color as any}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Performance
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response: {Math.round(diagnosticReport.performanceMetrics.averageResponseTime)}ms
                  </Typography>
                  <Chip
                    label={formatUptime(diagnosticReport.performanceMetrics.uptime).text}
                    color={formatUptime(diagnosticReport.performanceMetrics.uptime).color as any}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimelineIcon color="primary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      System Health
                    </Typography>
                  </Box>
                  <Box>
                    <Chip
                      label={`Backend: ${diagnosticReport.systemHealth.backend ? 'OK' : 'Error'}`}
                      color={getStatusColor(diagnosticReport.systemHealth.backend)}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                    <Chip
                      label={`Upload: ${diagnosticReport.systemHealth.uploadService ? 'OK' : 'Error'}`}
                      color={getStatusColor(diagnosticReport.systemHealth.uploadService)}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recommendations */}
          {diagnosticReport.recommendations.length > 0 && (
            <Alert 
              severity={diagnosticReport.connectivity.isConnected ? "info" : "warning"} 
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Recommendations:
              </Typography>
              <List dense>
                {diagnosticReport.recommendations.map((recommendation, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {/* Detailed Information */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Connectivity Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Connection Status
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(diagnosticReport.connectivity.isConnected)}
                      </ListItemIcon>
                      <ListItemText 
                        primary="Backend Connection"
                        secondary={diagnosticReport.connectivity.isConnected ? 'Connected' : 'Disconnected'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(diagnosticReport.connectivity.corsEnabled)}
                      </ListItemIcon>
                      <ListItemText 
                        primary="CORS Configuration"
                        secondary={diagnosticReport.connectivity.corsEnabled ? 'Enabled' : 'Disabled'}
                      />
                    </ListItem>
                    {diagnosticReport.connectivity.serverVersion && (
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Server Version"
                          secondary={diagnosticReport.connectivity.serverVersion}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Performance Metrics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Average Response Time"
                        secondary={`${Math.round(diagnosticReport.performanceMetrics.averageResponseTime)}ms`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Successful Requests"
                        secondary={diagnosticReport.performanceMetrics.successfulRequests}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Failed Requests"
                        secondary={diagnosticReport.performanceMetrics.failedRequests}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Uptime"
                        secondary={`${diagnosticReport.performanceMetrics.uptime.toFixed(1)}%`}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Errors */}
          {diagnosticReport.recentErrors.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  Recent Errors ({diagnosticReport.recentErrors.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {diagnosticReport.recentErrors.slice(0, 10).map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={error.message}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Type: {error.type}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Time: {error.timestamp.toLocaleTimeString()}
                            </Typography>
                            {error.endpoint && (
                              <Typography variant="caption" display="block">
                                Endpoint: {error.endpoint}
                              </Typography>
                            )}
                            {error.statusCode && (
                              <Typography variant="caption" display="block">
                                Status: {error.statusCode}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Connection Errors */}
          {diagnosticReport.connectivity.errors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Connection Errors:
              </Typography>
              <List dense>
                {diagnosticReport.connectivity.errors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemIcon>
                      <ErrorIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary={error} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" mt={2}>
          <LinearProgress sx={{ width: '100%' }} />
        </Box>
      )}
    </Box>
  );
};

export default NetworkDiagnostics;