import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Alert, Badge, List, ListItem,
  ListItemText, ListItemIcon, Divider, Button, Switch, FormControlLabel,
  Tabs, Tab, Avatar, Stack, useTheme, alpha, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Assignment as AssignmentIcon, Schedule as ScheduleIcon, Warning as WarningIcon,
  CheckCircle as CheckCircleIcon, Person as PersonIcon, Notifications as NotificationsIcon,
  Refresh as RefreshIcon, PlayArrow as StartIcon, Stop as StopIcon,
  Dashboard as DashboardIcon, TrendingUp as TrendingUpIcon, Timeline,
  Speed, Assessment, Visibility, LocalHospital, Description, Analytics,
  FilterList, Download, Settings, Info, Error as ErrorIcon
} from '@mui/icons-material';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts';
import { useAccessibility } from '../Accessibility/AccessibilityProvider';
import { appleHIGTypography, createAppleHIGStyles } from '../DICOM/AppleHIGStyles';

interface WorkflowMetrics {
  studyId: string;
  patientId: string;
  modality: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'reported';
  assignedRadiologist: string;
  startTime: Date;
  endTime?: Date;
  reportingTime?: number; // minutes
  interruptions: number;
  keystrokes: number;
  mouseClicks: number;
  scrollDistance: number;
  zoomOperations: number;
  windowLevelAdjustments: number;
  annotationsCreated: number;
  measurementsTaken: number;
  cineLoopsViewed: number;
  seriesViewed: number;
  imagesViewed: number;
  averageTimePerImage: number; // seconds
  qualityScore?: number; // 1-10
  complexityScore: number; // 1-10
  errorRate?: number;
  followUpRequired: boolean;
}

interface RadiologistPerformance {
  radiologistId: string;
  name: string;
  specialty: string;
  avatar?: string;
  totalStudies: number;
  completedStudies: number;
  averageReportingTime: number;
  accuracyRate: number;
  productivityScore: number;
  efficiencyTrend: 'up' | 'down' | 'stable';
  currentWorkload: number;
  maxWorkload: number;
  breakTime: number;
  overtimeHours: number;
  preferredModalities: string[];
  certifications: string[];
}

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
  const theme = useTheme();
  const { highContrast, reducedMotion, fontSize } = useAccessibility();
  const appleStyles = createAppleHIGStyles(theme, theme.palette.mode === 'dark');

  const [dashboardData, setDashboardData] = useState<WorkflowDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [automationEngineRunning, setAutomationEngineRunning] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics[]>([]);
  const [radiologistPerformance, setRadiologistPerformance] = useState<RadiologistPerformance[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedRadiologist, setSelectedRadiologist] = useState<RadiologistPerformance | null>(null);
  const [efficiencyFilter, setEfficiencyFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  // Mock data for demonstration
  const mockWorkflowMetrics: WorkflowMetrics[] = useMemo(() => [
    {
      studyId: 'ST001',
      patientId: 'PT001',
      modality: 'CT',
      priority: 'urgent',
      status: 'in_progress',
      assignedRadiologist: 'Dr. Smith',
      startTime: new Date(Date.now() - 30 * 60000),
      reportingTime: 25,
      interruptions: 2,
      keystrokes: 1250,
      mouseClicks: 89,
      scrollDistance: 2400,
      zoomOperations: 15,
      windowLevelAdjustments: 8,
      annotationsCreated: 3,
      measurementsTaken: 5,
      cineLoopsViewed: 2,
      seriesViewed: 4,
      imagesViewed: 120,
      averageTimePerImage: 12.5,
      complexityScore: 7,
      followUpRequired: false
    },
    {
      studyId: 'ST002',
      patientId: 'PT002',
      modality: 'MRI',
      priority: 'normal',
      status: 'completed',
      assignedRadiologist: 'Dr. Johnson',
      startTime: new Date(Date.now() - 90 * 60000),
      endTime: new Date(Date.now() - 15 * 60000),
      reportingTime: 75,
      interruptions: 1,
      keystrokes: 2100,
      mouseClicks: 156,
      scrollDistance: 3800,
      zoomOperations: 22,
      windowLevelAdjustments: 12,
      annotationsCreated: 7,
      measurementsTaken: 9,
      cineLoopsViewed: 5,
      seriesViewed: 8,
      imagesViewed: 280,
      averageTimePerImage: 16.1,
      qualityScore: 9,
      complexityScore: 8,
      errorRate: 0.02,
      followUpRequired: true
    }
  ], []);

  const mockRadiologistPerformance: RadiologistPerformance[] = useMemo(() => [
    {
      radiologistId: 'RAD001',
      name: 'Dr. Sarah Smith',
      specialty: 'Chest Imaging',
      totalStudies: 45,
      completedStudies: 42,
      averageReportingTime: 28.5,
      accuracyRate: 98.2,
      productivityScore: 92,
      efficiencyTrend: 'up',
      currentWorkload: 8,
      maxWorkload: 12,
      breakTime: 45,
      overtimeHours: 2.5,
      preferredModalities: ['CT', 'X-Ray'],
      certifications: ['ABR', 'Chest CT']
    },
    {
      radiologistId: 'RAD002',
      name: 'Dr. Michael Johnson',
      specialty: 'Neuroradiology',
      totalStudies: 32,
      completedStudies: 30,
      averageReportingTime: 42.1,
      accuracyRate: 97.8,
      productivityScore: 88,
      efficiencyTrend: 'stable',
      currentWorkload: 6,
      maxWorkload: 10,
      breakTime: 60,
      overtimeHours: 1.0,
      preferredModalities: ['MRI', 'CT'],
      certifications: ['ABR', 'Neuro MRI', 'CAQ']
    }
  ], []);

  // Efficiency calculation functions
  const calculateEfficiencyScore = (radiologist: RadiologistPerformance): number => {
    const workloadRatio = radiologist.currentWorkload / radiologist.maxWorkload;
    const accuracyWeight = radiologist.accuracyRate / 100;
    const timeEfficiency = Math.max(0, (60 - radiologist.averageReportingTime) / 60);
    return Math.round((workloadRatio * 0.3 + accuracyWeight * 0.4 + timeEfficiency * 0.3) * 100);
  };

  const getEfficiencyLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const filteredRadiologists = useMemo(() => {
    return mockRadiologistPerformance.filter(radiologist => {
      if (efficiencyFilter === 'all') return true;
      const efficiency = getEfficiencyLevel(calculateEfficiencyScore(radiologist));
      return efficiency === efficiencyFilter;
    });
  }, [mockRadiologistPerformance, efficiencyFilter]);

  // Chart data preparation
  const productivityChartData = useMemo(() => {
    return mockRadiologistPerformance.map(radiologist => ({
      name: radiologist.name.split(' ')[1], // Last name only
      studies: radiologist.completedStudies,
      accuracy: radiologist.accuracyRate,
      avgTime: radiologist.averageReportingTime,
      efficiency: calculateEfficiencyScore(radiologist)
    }));
  }, [mockRadiologistPerformance]);

  const workloadDistributionData = useMemo(() => {
    const modalityCount = mockWorkflowMetrics.reduce((acc, metric) => {
      acc[metric.modality] = (acc[metric.modality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(modalityCount).map(([modality, count]) => ({
      name: modality,
      value: count,
      color: modality === 'CT' ? '#8884d8' : modality === 'MRI' ? '#82ca9d' : '#ffc658'
    }));
  }, [mockWorkflowMetrics]);

  const performanceTrendData = useMemo(() => {
    // Mock trend data for the last 7 days
    return Array.from({ length: 7 }, (_, i) => ({
      day: `Day ${i + 1}`,
      studies: Math.floor(Math.random() * 50) + 20,
      avgTime: Math.floor(Math.random() * 20) + 25,
      accuracy: Math.floor(Math.random() * 5) + 95
    }));
  }, []);

  useEffect(() => {
    setWorkflowMetrics(mockWorkflowMetrics);
    setRadiologistPerformance(mockRadiologistPerformance);
  }, [mockWorkflowMetrics, mockRadiologistPerformance]);

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
    <Box sx={{ 
      p: 3, 
      backgroundColor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ 
          display: 'flex', 
          alignItems: 'center',
          ...appleHIGTypography.title1
        }}>
          <DashboardIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
          Workflow Optimization Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Efficiency</InputLabel>
            <Select
              value={efficiencyFilter}
              label="Efficiency"
              onChange={(e) => setEfficiencyFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="high">High (80%+)</MenuItem>
              <MenuItem value="medium">Medium (60-79%)</MenuItem>
              <MenuItem value="low">Low (&lt;60%)</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={realTimeUpdates}
                onChange={(e) => setRealTimeUpdates(e.target.checked)}
                color="primary"
              />
            }
            label="Real-time Updates"
          />
          
          <Button
            variant={automationEngineRunning ? "contained" : "outlined"}
            color={automationEngineRunning ? "error" : "success"}
            startIcon={automationEngineRunning ? <StopIcon /> : <StartIcon />}
            onClick={toggleAutomationEngine}
            sx={appleStyles.primaryButton}
          >
            {automationEngineRunning ? 'Stop' : 'Start'} AI Optimization
          </Button>
          
          <IconButton 
            onClick={fetchDashboardData}
            sx={{ 
              ...appleStyles.primaryButton,
              backgroundColor: alpha(theme.palette.primary.main, 0.1)
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3, ...appleStyles.card }}>
        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              ...appleHIGTypography.body,
              textTransform: 'none',
              fontWeight: 500
            }
          }}
        >
          <Tab icon={<Analytics />} label="Performance Analytics" />
          <Tab icon={<Speed />} label="Efficiency Metrics" />
          <Tab icon={<Timeline />} label="Workflow Tracking" />
          <Tab icon={<Assessment />} label="Quality Insights" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {/* Key Performance Indicators */}
          <Grid item xs={12}>
            <Card sx={appleStyles.card}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
                  Key Performance Indicators
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                        {mockRadiologistPerformance.reduce((sum, r) => sum + r.completedStudies, 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Studies Completed Today
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                        {Math.round(mockRadiologistPerformance.reduce((sum, r) => sum + r.averageReportingTime, 0) / mockRadiologistPerformance.length)}m
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg. Reporting Time
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>
                        {Math.round(mockRadiologistPerformance.reduce((sum, r) => sum + r.accuracyRate, 0) / mockRadiologistPerformance.length * 10) / 10}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Accuracy Rate
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>
                        {Math.round(mockRadiologistPerformance.reduce((sum, r) => sum + calculateEfficiencyScore(r), 0) / mockRadiologistPerformance.length)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall Efficiency
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Trends Chart */}
          <Grid item xs={12} md={8}>
            <Card sx={appleStyles.card}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
                  Performance Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="studies" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Studies Completed"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avgTime" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Avg Time (min)"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#ffc658" 
                      strokeWidth={2}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Workload Distribution */}
          <Grid item xs={12} md={4}>
            <Card sx={appleStyles.card}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
                  Modality Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={workloadDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {workloadDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          {/* Radiologist Performance Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
              Radiologist Efficiency Analysis
            </Typography>
            <Grid container spacing={2}>
              {filteredRadiologists.map((radiologist) => {
                const efficiencyScore = calculateEfficiencyScore(radiologist);
                const efficiencyLevel = getEfficiencyLevel(efficiencyScore);
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={radiologist.radiologistId}>
                    <Card 
                      sx={{ 
                        ...appleStyles.card,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[8]
                        }
                      }}
                      onClick={() => {
                        setSelectedRadiologist(radiologist);
                        setPerformanceDialogOpen(true);
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
                            {radiologist.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={appleHIGTypography.subheadline}>
                              {radiologist.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {radiologist.specialty}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Efficiency Score</Typography>
                            <Chip 
                              label={`${efficiencyScore}%`}
                              color={efficiencyLevel === 'high' ? 'success' : efficiencyLevel === 'medium' ? 'warning' : 'error'}
                              size="small"
                            />
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={efficiencyScore} 
                            color={efficiencyLevel === 'high' ? 'success' : efficiencyLevel === 'medium' ? 'warning' : 'error'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>

                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Studies</Typography>
                            <Typography variant="h6">{radiologist.completedStudies}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Accuracy</Typography>
                            <Typography variant="h6">{radiologist.accuracyRate}%</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Avg Time</Typography>
                            <Typography variant="h6">{radiologist.averageReportingTime}m</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Workload</Typography>
                            <Typography variant="h6">{radiologist.currentWorkload}/{radiologist.maxWorkload}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          {/* Real-time Workflow Tracking */}
          <Grid item xs={12}>
            <Card sx={appleStyles.card}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
                  Active Studies Tracking
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Study ID</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Modality</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Radiologist</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Time Elapsed</TableCell>
                        <TableCell>Interactions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockWorkflowMetrics.map((metric) => (
                        <TableRow key={metric.studyId}>
                          <TableCell>{metric.studyId}</TableCell>
                          <TableCell>{metric.patientId}</TableCell>
                          <TableCell>
                            <Chip label={metric.modality} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={metric.priority} 
                              color={metric.priority === 'urgent' ? 'error' : metric.priority === 'high' ? 'warning' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{metric.assignedRadiologist}</TableCell>
                          <TableCell>
                            <Chip 
                              label={metric.status.replace('_', ' ')} 
                              color={metric.status === 'completed' ? 'success' : metric.status === 'in_progress' ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {Math.round((Date.now() - metric.startTime.getTime()) / 60000)}m
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Mouse Clicks">
                                <Chip label={metric.mouseClicks} size="small" icon={<Visibility />} />
                              </Tooltip>
                              <Tooltip title="Annotations">
                                <Chip label={metric.annotationsCreated} size="small" icon={<Description />} />
                              </Tooltip>
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
        </Grid>
      )}

      {selectedTab === 3 && (
        <Grid container spacing={3}>
          {/* Quality Insights */}
          <Grid item xs={12} md={6}>
            <Card sx={appleStyles.card}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
                  Productivity Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productivityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="studies" fill="#8884d8" name="Studies Completed" />
                    <Bar dataKey="efficiency" fill="#82ca9d" name="Efficiency Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={appleStyles.card}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, ...appleHIGTypography.subheadline }}>
                  Performance Radar
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={productivityChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Accuracy"
                      dataKey="accuracy"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Efficiency"
                      dataKey="efficiency"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Performance Detail Dialog */}
      <Dialog 
        open={performanceDialogOpen} 
        onClose={() => setPerformanceDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRadiologist && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
                {selectedRadiologist.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedRadiologist.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedRadiologist.specialty}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedRadiologist && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Performance Metrics</Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Assessment /></ListItemIcon>
                    <ListItemText 
                      primary="Efficiency Score" 
                      secondary={`${calculateEfficiencyScore(selectedRadiologist)}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Speed /></ListItemIcon>
                    <ListItemText 
                      primary="Productivity Score" 
                      secondary={`${selectedRadiologist.productivityScore}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Accuracy Rate" 
                      secondary={`${selectedRadiologist.accuracyRate}%`}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Workload Details</Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><AssignmentIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Current Workload" 
                      secondary={`${selectedRadiologist.currentWorkload}/${selectedRadiologist.maxWorkload} studies`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><ScheduleIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Average Reporting Time" 
                      secondary={`${selectedRadiologist.averageReportingTime} minutes`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><LocalHospital /></ListItemIcon>
                    <ListItemText 
                      primary="Preferred Modalities" 
                      secondary={selectedRadiologist.preferredModalities.join(', ')}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPerformanceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowDashboard;