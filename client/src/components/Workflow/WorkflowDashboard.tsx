import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
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
  Alert,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

interface WorkflowStats {
  total_studies: number;
  unassigned_studies: number;
  in_progress_studies: number;
  overdue_studies: number;
  stat_studies: number;
  urgent_studies: number;
  routine_studies: number;
}

interface RadiologistStatus {
  radiologist_id: string;
  name: string;
  availability_status: string;
  current_workload: number;
  max_workload: number;
  workload_percentage: number;
  subspecialties: string[];
  performance_score: number;
}

interface WorkflowNotification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

interface PerformanceMetrics {
  studies_processed_today: number;
  average_assignment_time_minutes: number;
  automation_success_rate: number;
  notification_delivery_rate: number;
  overdue_studies_count: number;
  unassigned_studies_count: number;
  active_radiologists: number;
  average_workload_percentage: number;
}

interface WorkflowDashboardData {
  worklist_statistics: WorkflowStats;
  radiologist_status: RadiologistStatus[];
  recent_notifications: WorkflowNotification[];
  performance_metrics: PerformanceMetrics;
  automation_rules_active: number;
  notification_rules_active: number;
  last_updated: string;
}

const WorkflowDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<WorkflowDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [automationEngineRunning, setAutomationEngineRunning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/workflow/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setDashboardData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomationEngine = async () => {
    try {
      const endpoint = automationEngineRunning ? '/api/workflow/automation/stop' : '/api/workflow/automation/start';
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (response.ok) {
        setAutomationEngineRunning(!automationEngineRunning);
      }
    } catch (err) {
      console.error('Error toggling automation engine:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'stat': return 'error';
      case 'urgent': return 'warning';
      case 'routine': return 'primary';
      default: return 'default';
    }
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading workflow dashboard...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading dashboard: {error}
        </Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No dashboard data available
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 2 }} />
          Workflow Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          
          <Button
            variant={automationEngineRunning ? "contained" : "outlined"}
            color={automationEngineRunning ? "error" : "success"}
            startIcon={automationEngineRunning ? <StopIcon /> : <StartIcon />}
            onClick={toggleAutomationEngine}
          >
            {automationEngineRunning ? 'Stop' : 'Start'} Automation
          </Button>
          
          <IconButton onClick={fetchDashboardData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Total Studies
              </Typography>
              <Typography variant="h3">
                {dashboardData.worklist_statistics.total_studies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active in system
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Unassigned
              </Typography>
              <Typography variant="h3">
                {dashboardData.worklist_statistics.unassigned_studies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting assignment
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Overdue
              </Typography>
              <Typography variant="h3">
                {dashboardData.performance_metrics.overdue_studies_count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Past target time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Active Radiologists
              </Typography>
              <Typography variant="h3">
                {dashboardData.performance_metrics.active_radiologists}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Priority Breakdown */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Studies by Priority
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label="STAT" color="error" size="small" />
                  <Typography variant="body2">
                    {dashboardData.worklist_statistics.stat_studies}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label="URGENT" color="warning" size="small" />
                  <Typography variant="body2">
                    {dashboardData.worklist_statistics.urgent_studies}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Chip label="ROUTINE" color="primary" size="small" />
                  <Typography variant="body2">
                    {dashboardData.worklist_statistics.routine_studies}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Automation Success Rate
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData.performance_metrics.automation_success_rate * 100}
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption">
                  {(dashboardData.performance_metrics.automation_success_rate * 100).toFixed(1)}%
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Average Assignment Time
                </Typography>
                <Typography variant="h6">
                  {dashboardData.performance_metrics.average_assignment_time_minutes.toFixed(1)} min
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Radiologist Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Radiologist Status
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Workload</TableCell>
                      <TableCell>Subspecialties</TableCell>
                      <TableCell>Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.radiologist_status.map((radiologist) => (
                      <TableRow key={radiologist.radiologist_id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                            {radiologist.name}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={radiologist.availability_status}
                            color={radiologist.availability_status === 'available' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={radiologist.workload_percentage}
                              color={getWorkloadColor(radiologist.workload_percentage)}
                              sx={{ width: 60 }}
                            />
                            <Typography variant="caption">
                              {radiologist.current_workload}/{radiologist.max_workload}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {radiologist.subspecialties.slice(0, 2).map((specialty) => (
                              <Chip key={specialty} label={specialty} size="small" variant="outlined" />
                            ))}
                            {radiologist.subspecialties.length > 2 && (
                              <Chip label={`+${radiologist.subspecialties.length - 2}`} size="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TrendingUpIcon sx={{ mr: 0.5, fontSize: 16 }} />
                            {radiologist.performance_score.toFixed(1)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Notifications
              </Typography>
              
              <List dense>
                {dashboardData.recent_notifications.map((notification) => (
                  <ListItem key={notification.id}>
                    <ListItemIcon>
                      {notification.severity === 'warning' ? (
                        <WarningIcon color="warning" />
                      ) : notification.severity === 'error' ? (
                        <WarningIcon color="error" />
                      ) : (
                        <NotificationsIcon color="primary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.message}
                      secondary={new Date(notification.timestamp).toLocaleTimeString()}
                    />
                  </ListItem>
                ))}
                
                {dashboardData.recent_notifications.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No recent notifications"
                      secondary="System is running smoothly"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Automation Status */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Automation Status
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {dashboardData.automation_rules_active}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Automation Rules
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {dashboardData.notification_rules_active}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Notification Rules
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {(dashboardData.performance_metrics.notification_delivery_rate * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Notification Delivery Rate
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {dashboardData.performance_metrics.studies_processed_today}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Studies Processed Today
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(dashboardData.last_updated).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkflowDashboard;