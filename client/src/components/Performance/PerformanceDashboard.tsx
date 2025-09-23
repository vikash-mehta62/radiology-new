/**
 * Performance Dashboard Component
 * Comprehensive monitoring dashboard for DICOM operations and system performance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  alpha,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Switch,
  FormControlLabel,
  useMediaQuery,
  Fab,
  Snackbar
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
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
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { useAccessibility } from '../Accessibility/AccessibilityProvider';
import { createAppleHIGStyles, appleHIGColors, appleHIGTypography, appleHIGBorderRadius } from '../DICOM/AppleHIGStyles';

interface PerformanceDashboardProps {
  open: boolean;
  onClose: () => void;
  compact?: boolean;
  showAlerts?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
  showAdvancedMetrics?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`performance-tabpanel-${index}`}
      aria-labelledby={`performance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const CHART_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FFCC00', '#FF2D92'];

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  open,
  onClose,
  compact = false,
  showAlerts = true,
  autoRefresh = true,
  refreshInterval = 5,
  showAdvancedMetrics = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { announceToScreenReader } = useAccessibility();
  const styles = createAppleHIGStyles(theme, theme.palette.mode === 'dark');
  const colors = theme.palette.mode === 'dark' ? appleHIGColors.dark : appleHIGColors.light;
  
  const {
    dicomMetrics,
    renderingMetrics,
    interactionMetrics,
    systemMetrics,
    alerts,
    summary,
    isMonitoring,
    thresholds,
    exportMetrics,
    clearMetrics,
    updateThresholds,
    resolveAlert,
  } = usePerformanceMonitoring();

  const [currentTab, setCurrentTab] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [showResolvedAlerts, setShowResolvedAlerts] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshEnabled && open) {
      const interval = setInterval(() => {
        // Trigger re-render by updating a dummy state
        setCurrentTab(prev => prev);
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled, open, refreshInterval]);

  // Prepare chart data
  const renderingChartData = useMemo(() => {
    return renderingMetrics.slice(-20).map((metric, index) => ({
      frame: index + 1,
      renderTime: metric.renderDuration || 0,
      fps: metric.fps || 0,
      memoryUsage: metric.memoryUsage || 0,
    }));
  }, [renderingMetrics]);

  const dicomLoadingChartData = useMemo(() => {
    return dicomMetrics.slice(-10).map((metric, index) => ({
      load: index + 1,
      duration: metric.duration || 0,
      size: metric.fileSize ? metric.fileSize / 1024 / 1024 : 0, // MB
      speed: metric.loadingSpeed || 0,
      cached: metric.cacheHit ? 1 : 0,
    }));
  }, [dicomMetrics]);

  const interactionChartData = useMemo(() => {
    const interactionTypes = ['zoom', 'pan', 'rotate', 'windowing', 'measurement', 'annotation'];
    return interactionTypes.map(type => {
      const typeMetrics = interactionMetrics.filter(m => m.type === type && m.duration);
      const avgDuration = typeMetrics.length > 0 
        ? typeMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / typeMetrics.length 
        : 0;
      return {
        type,
        avgDuration,
        count: typeMetrics.length,
      };
    });
  }, [interactionMetrics]);

  const systemMetricsChartData = useMemo(() => {
    return systemMetrics.slice(-20).map((metric, index) => ({
      time: index + 1,
      memory: metric.memoryUsage,
      available: metric.availableMemory,
      networkSpeed: metric.networkSpeed || 0,
      battery: metric.batteryLevel || 100,
    }));
  }, [systemMetrics]);

  const alertsByCategory = useMemo(() => {
    const categories = ['loading', 'rendering', 'interaction', 'system'];
    return categories.map(category => ({
      category,
      count: alerts.filter(a => a.category === category && (!a.resolved || showResolvedAlerts)).length,
    }));
  }, [alerts, showResolvedAlerts]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    announceToScreenReader(`Switched to ${getTabLabel(newValue)} tab`);
  };

  const getTabLabel = (index: number) => {
    const labels = ['Overview', 'DICOM Loading', 'Rendering', 'Interactions', 'System', 'Alerts'];
    return labels[index] || 'Unknown';
  };

  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    const data = exportMetrics(format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
    announceToScreenReader(`Performance metrics exported as ${format.toUpperCase()}`);
  };

  // Performance status indicator
  const getPerformanceStatus = () => {
    const criticalAlerts = alerts.filter(a => a.type === 'error' && !a.resolved).length;
    const warningAlerts = alerts.filter(a => a.type === 'warning' && !a.resolved).length;
    
    if (criticalAlerts > 0) return { status: 'critical', color: 'error', label: 'Critical Issues' };
    if (warningAlerts > 3) return { status: 'warning', color: 'warning', label: 'Performance Issues' };
    if (summary.currentFPS < thresholds.minFPS) return { status: 'warning', color: 'warning', label: 'Low Performance' };
    return { status: 'good', color: 'success', label: 'Good Performance' };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...styles.card,
          minHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ 
        ...appleHIGTypography.title2, 
        borderBottom: `1px solid ${colors.separator}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon sx={{ color: colors.systemBlue }} />
          <Typography variant="h6">Performance Dashboard</Typography>
          <Chip
            label={performanceStatus.label}
            color={performanceStatus.color as any}
            size="small"
            icon={performanceStatus.status === 'critical' ? <ErrorIcon /> : 
                  performanceStatus.status === 'warning' ? <WarningIcon /> : <SpeedIcon />}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                size="small"
              />
            }
            label="Auto Refresh"
            sx={{ ...appleHIGTypography.caption1 }}
          />
          
          <Tooltip title="Export Metrics">
            <IconButton onClick={() => setExportDialogOpen(true)} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear Metrics">
            <IconButton onClick={clearMetrics} size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh">
            <IconButton onClick={() => setCurrentTab(prev => prev)} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{ borderBottom: `1px solid ${colors.separator}` }}
        >
          <Tab label="Overview" icon={<SpeedIcon />} />
          <Tab label="DICOM Loading" icon={<VisibilityIcon />} />
          <Tab label="Rendering" icon={<TimelineIcon />} />
          <Tab label="Interactions" icon={<InteractionIcon />} />
          <Tab label="System" icon={<MemoryIcon />} />
          <Tab label="Alerts" icon={<WarningIcon />} />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={3}>
              <Card sx={styles.card}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SpeedIcon sx={{ color: colors.systemBlue }} />
                    <Box>
                      <Typography variant="h4" sx={appleHIGTypography.largeTitle}>
                        {Math.round(summary.averageLoadTime)}ms
                      </Typography>
                      <Typography variant="caption" sx={appleHIGTypography.caption1}>
                        Avg DICOM Load Time
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={styles.card}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TimelineIcon sx={{ color: colors.systemGreen }} />
                    <Box>
                      <Typography variant="h4" sx={appleHIGTypography.largeTitle}>
                        {Math.round(summary.currentFPS)}
                      </Typography>
                      <Typography variant="caption" sx={appleHIGTypography.caption1}>
                        Current FPS
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={styles.card}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MemoryIcon sx={{ color: colors.systemOrange }} />
                    <Box>
                      <Typography variant="h4" sx={appleHIGTypography.largeTitle}>
                        {Math.round(summary.memoryUsage)}MB
                      </Typography>
                      <Typography variant="caption" sx={appleHIGTypography.caption1}>
                        Memory Usage
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={styles.card}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <NetworkIcon sx={{ color: colors.systemTeal }} />
                    <Box>
                      <Typography variant="h4" sx={appleHIGTypography.largeTitle}>
                        {Math.round(summary.cacheHitRate)}%
                      </Typography>
                      <Typography variant="caption" sx={appleHIGTypography.caption1}>
                        Cache Hit Rate
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Trends Chart */}
            <Grid item xs={12}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    Performance Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={renderingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.separator} />
              <XAxis dataKey="frame" stroke={colors.label} />
              <YAxis stroke={colors.label} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: colors.secondarySystemBackground,
                           border: `1px solid ${colors.separator}`,
                          borderRadius: appleHIGBorderRadius.md,
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="renderTime" 
                        stroke={CHART_COLORS[0]} 
                        name="Render Time (ms)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fps" 
                        stroke={CHART_COLORS[1]} 
                        name="FPS"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Alert Summary */}
            <Grid item xs={12} md={6}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    Alert Summary
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={alertsByCategory}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ category, count }) => `${category}: ${count}`}
                      >
                        {alertsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* System Status */}
            <Grid item xs={12} md={6}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    System Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={appleHIGTypography.body}>
                      Memory Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(summary.memoryUsage / thresholds.memoryUsage) * 100}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={appleHIGTypography.body}>
                      Performance Score
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, 100 - (summary.errorRate * 2) - (alerts.filter(a => !a.resolved).length * 5))}
                      color="success"
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={appleHIGTypography.caption1}>
                    Monitoring Status: {isMonitoring ? 'Active' : 'Inactive'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* DICOM Loading Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    DICOM Loading Performance
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dicomLoadingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.separator} />
              <XAxis dataKey="load" stroke={colors.label} />
              <YAxis stroke={colors.label} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: colors.secondarySystemBackground,
                           border: `1px solid ${colors.separator}`,
                          borderRadius: appleHIGBorderRadius.md,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="duration" fill={CHART_COLORS[0]} name="Load Time (ms)" />
                      <Bar dataKey="speed" fill={CHART_COLORS[1]} name="Speed (MB/s)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    Recent DICOM Loads
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Study ID</TableCell>
                          <TableCell>Duration (ms)</TableCell>
                          <TableCell>Size (MB)</TableCell>
                          <TableCell>Speed (MB/s)</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Cached</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dicomMetrics.slice(-10).map((metric, index) => (
                          <TableRow key={index}>
                            <TableCell>{metric.studyId}</TableCell>
                            <TableCell>{Math.round(metric.duration || 0)}</TableCell>
                            <TableCell>{metric.fileSize ? Math.round(metric.fileSize / 1024 / 1024) : '-'}</TableCell>
                            <TableCell>{metric.loadingSpeed ? Math.round(metric.loadingSpeed * 100) / 100 : '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={metric.status}
                                color={metric.status === 'completed' ? 'success' : 
                                       metric.status === 'failed' ? 'error' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{metric.cacheHit ? '✓' : '✗'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Rendering Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    Rendering Performance
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={renderingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.separator} />
              <XAxis dataKey="frame" stroke={colors.label} />
              <YAxis stroke={colors.label} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: colors.secondarySystemBackground,
                           border: `1px solid ${colors.separator}`,
                          borderRadius: appleHIGBorderRadius.md,
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="renderTime" 
                        stackId="1" 
                        stroke={CHART_COLORS[0]} 
                        fill={CHART_COLORS[0]} 
                        name="Render Time (ms)"
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="fps" 
                        stackId="2" 
                        stroke={CHART_COLORS[1]} 
                        fill={CHART_COLORS[1]} 
                        name="FPS"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Interactions Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    User Interaction Performance
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={interactionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.separator} />
              <XAxis dataKey="type" stroke={colors.label} />
              <YAxis stroke={colors.label} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: colors.secondarySystemBackground,
                           border: `1px solid ${colors.separator}`,
                          borderRadius: appleHIGBorderRadius.md,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="avgDuration" fill={CHART_COLORS[2]} name="Avg Duration (ms)" />
                      <Bar dataKey="count" fill={CHART_COLORS[3]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* System Tab */}
        <TabPanel value={currentTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={styles.card}>
                <CardContent>
                  <Typography variant="h6" sx={{ ...appleHIGTypography.title2, mb: 2 }}>
                    System Metrics
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={systemMetricsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.separator} />
              <XAxis dataKey="time" stroke={colors.label} />
              <YAxis stroke={colors.label} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: colors.secondarySystemBackground,
                           border: `1px solid ${colors.separator}`,
                          borderRadius: appleHIGBorderRadius.md,
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="memory" 
                        stroke={CHART_COLORS[4]} 
                        name="Memory Usage (MB)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="networkSpeed" 
                        stroke={CHART_COLORS[5]} 
                        name="Network Speed (Mbps)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Alerts Tab */}
        <TabPanel value={currentTab} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={appleHIGTypography.title2}>
                  Performance Alerts
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showResolvedAlerts}
                      onChange={(e) => setShowResolvedAlerts(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Show Resolved"
                  sx={{ ...appleHIGTypography.caption1 }}
                />
              </Box>
              
              {alerts
                .filter(alert => !alert.resolved || showResolvedAlerts)
                .slice(-20)
                .map((alert) => (
                  <Alert
                    key={alert.id}
                    severity={alert.type}
                    sx={{ mb: 1 }}
                    action={
                      !alert.resolved && (
                        <IconButton
                          size="small"
                          onClick={() => resolveAlert(alert.id)}
                          aria-label="resolve alert"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <AlertTitle>
                      {alert.category.charAt(0).toUpperCase() + alert.category.slice(1)} Alert
                      {alert.resolved && ' (Resolved)'}
                    </AlertTitle>
                    {alert.message}
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </Typography>
                  </Alert>
                ))}
              
              {alerts.filter(alert => !alert.resolved || showResolvedAlerts).length === 0 && (
                <Alert severity="success">
                  <AlertTitle>No Performance Issues</AlertTitle>
                  All systems are running optimally.
                </Alert>
              )}
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${colors.separator}`, p: 2 }}>
        <Button onClick={onClose} sx={styles.secondaryButton}>
          Close
        </Button>
      </DialogActions>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Performance Metrics</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choose the format for exporting performance metrics:
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleExport('csv')} variant="outlined">
            Export CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="contained">
            Export JSON
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default PerformanceDashboard;