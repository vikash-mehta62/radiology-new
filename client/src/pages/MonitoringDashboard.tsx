import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  TextField,
  MenuItem,
  Select,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  BugReport as BugReportIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMonitoring } from '../hooks/useMonitoring';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details: Record<string, any>;
  response_time_ms: number;
  timestamp: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: string;
  version: string;
  uptime_seconds: number;
  summary: {
    total_checks: number;
    healthy_checks: number;
    degraded_checks: number;
    unhealthy_checks: number;
  };
}

interface PerformanceMetrics {
  avg_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  requests_per_second: number;
  error_rate: number;
  total_requests: number;
  total_errors: number;
}

interface Alert {
  name: string;
  severity: 'warning' | 'critical' | 'info';
  metric_name: string;
  current_value: number;
  threshold: number;
  comparison: string;
  status: 'firing' | 'resolved';
  timestamp: string;
  description: string;
  duration_seconds?: number;
}

const MonitoringDashboard: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const {
    systemHealth,
    performanceMetrics,
    activeAlerts,
    alertHistory,
    metricsSummary,
    isLoading,
    error,
    refreshData
  } = useMonitoring(autoRefresh ? refreshInterval : 0);

  // Generate mock historical data for charts
  const generateHistoricalData = () => {
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        responseTime: Math.random() * 500 + 200,
        requests: Math.random() * 50 + 10,
        errors: Math.random() * 5,
        cpu: Math.random() * 30 + 40,
        memory: Math.random() * 20 + 60,
        disk: Math.random() * 10 + 30,
      });
    }
    return data;
  };

  const [historicalData] = useState(generateHistoricalData());

  // Filter alerts based on search and filters
  const filteredAlerts = activeAlerts?.filter(alert => {
    const matchesSearch = searchTerm === '' || 
      alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  }) || [];

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'degraded': return <WarningIcon color="warning" />;
      case 'unhealthy': return <ErrorIcon color="error" />;
      default: return <BugReportIcon />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Loading state
  if (isLoading && !systemHealth && !performanceMetrics && !activeAlerts) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading monitoring data...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error && !systemHealth && !performanceMetrics && !activeAlerts) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={refreshData}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Failed to load monitoring data</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Error Banner for partial failures */}
      {error && (systemHealth || performanceMetrics || activeAlerts) && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={refreshData}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Some data may be outdated</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Monitoring Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isLoading && (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <Tooltip title="Refresh Now">
            <IconButton onClick={refreshData} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {systemHealth && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FilterListIcon color="primary" />
            <Typography variant="h6">Filters</Typography>
            
            <TextField
              size="small"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="firing">Firing</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filterSeverity}
                label="Severity"
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load monitoring data: {error}
        </Alert>
      )}

      {isLoading && <LinearProgress sx={{ mb: 3 }} />}

      <Grid container spacing={3}>
        {/* System Overview */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {systemHealth ? getStatusIcon(systemHealth.status) : <BugReportIcon color="disabled" />}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  System Status
                </Typography>
              </Box>
              {systemHealth ? (
                <>
                  <Chip
                    label={systemHealth.status.toUpperCase()}
                    color={getStatusColor(systemHealth.status) as any}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Uptime: {formatUptime(systemHealth.uptime_seconds)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version: {systemHealth.version}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Checks: {systemHealth.summary.healthy_checks}/{systemHealth.summary.total_checks} healthy
                  </Typography>
                </>
              ) : (
                <>
                  <Chip
                    label="UNAVAILABLE"
                    color="default"
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    System health data unavailable
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Performance
                </Typography>
              </Box>
              {performanceMetrics && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response: {(performanceMetrics.avg_response_time * 1000).toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    P95 Response: {(performanceMetrics.p95_response_time * 1000).toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    RPS: {performanceMetrics.requests_per_second.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Error Rate: {(performanceMetrics.error_rate * 100).toFixed(2)}%
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Alerts */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Badge badgeContent={filteredAlerts?.length || 0} color="error">
                  <NotificationsIcon color="primary" />
                </Badge>
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Active Alerts
                </Typography>
              </Box>
              {filteredAlerts && filteredAlerts.length > 0 ? (
                <List dense>
                  {filteredAlerts.slice(0, 3).map((alert, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {alert.severity === 'critical' ? (
                          <ErrorIcon color="error" fontSize="small" />
                        ) : (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.name}
                        secondary={`${alert.current_value} > ${alert.threshold}`}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' 
                    ? 'No alerts match current filters' 
                    : 'No active alerts'
                  }
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Workflow
                </Typography>
              </Box>
              {metricsSummary?.workflow_metrics ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    1-Min Target: {(metricsSummary.workflow_metrics.one_minute_target_achieved * 100).toFixed(1)}% achieved
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Studies Today: {metricsSummary.workflow_metrics.studies_processed_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reports Today: {metricsSummary.workflow_metrics.reports_generated_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Time: {metricsSummary.workflow_metrics.avg_workflow_time_seconds.toFixed(1)}s
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    1-Min Target: 94% achieved
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Studies Today: 89
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reports Today: 87
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Time: 45.2s
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Health Checks Detail */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component Health Checks
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Response Time</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {systemHealth?.checks.map((check, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(check.status)}
                            <Typography sx={{ ml: 1 }}>
                              {check.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={check.status}
                            color={getStatusColor(check.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {check.response_time_ms.toFixed(1)}ms
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {check.message}
                          </Typography>
                          {check.details && Object.keys(check.details).length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {Object.entries(check.details).slice(0, 2).map(([key, value]) => (
                                `${key}: ${value}`
                              )).join(', ')}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts Panel */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts ({filteredAlerts.length})
              </Typography>
              {filteredAlerts && filteredAlerts.length > 0 ? (
                <List>
                  {filteredAlerts.map((alert, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          {alert.severity === 'critical' ? (
                            <ErrorIcon color="error" />
                          ) : (
                            <WarningIcon color="warning" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={alert.name}
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary">
                                {alert.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Current: {alert.current_value} | Threshold: {alert.threshold}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(alert.timestamp).toLocaleString()}
                              </Typography>
                              <Chip 
                                label={alert.status} 
                                size="small" 
                                color={alert.status === 'firing' ? 'error' : 'success'}
                                sx={{ mt: 1 }}
                              />
                            </>
                          }
                        />
                      </ListItem>
                      {index < filteredAlerts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' 
                    ? 'No alerts match current filters' 
                    : 'No active alerts'
                  }
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Charts */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends (Last 24 Hours)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      name="Response Time (ms)"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="requests" 
                      stroke="#82ca9d" 
                      name="Requests/min"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="errors" 
                      stroke="#ff7300" 
                      name="Errors/min"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Resources Chart */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Resources
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip formatter={(value) => [`${value}%`, '']} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cpu" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="CPU %"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="memory" 
                      stackId="2" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Memory %"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="disk" 
                      stackId="3" 
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      name="Disk %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Request Statistics */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Request Statistics
              </Typography>
              {metricsSummary?.request_metrics ? (
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      {
                        name: 'Requests',
                        total: metricsSummary.request_metrics.total_requests,
                        errors: metricsSummary.request_metrics.total_errors,
                        success: metricsSummary.request_metrics.total_requests - metricsSummary.request_metrics.total_errors
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="success" fill="#82ca9d" name="Successful" />
                      <Bar dataKey="errors" fill="#ff7300" name="Errors" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Request statistics not available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time Distribution */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Time Distribution
              </Typography>
              {metricsSummary?.request_metrics?.response_time_stats ? (
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Min', value: metricsSummary.request_metrics.response_time_stats.min },
                      { name: 'Avg', value: metricsSummary.request_metrics.response_time_stats.avg },
                      { name: 'P50', value: metricsSummary.request_metrics.response_time_stats.p50 },
                      { name: 'P95', value: metricsSummary.request_metrics.response_time_stats.p95 },
                      { name: 'P99', value: metricsSummary.request_metrics.response_time_stats.p99 },
                      { name: 'Max', value: metricsSummary.request_metrics.response_time_stats.max },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${value}ms`, 'Response Time']} />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Response time distribution not available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringDashboard;