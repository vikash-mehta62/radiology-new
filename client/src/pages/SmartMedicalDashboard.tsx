import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Button, Chip, LinearProgress, Alert, Avatar,
  List, ListItem, ListItemText, ListItemIcon,
  Divider, IconButton, Tooltip, useTheme, alpha,
  Fade, Skeleton, CardActionArea, Badge
} from '@mui/material';
import {
  Dashboard, Person, Image, Timeline, Speed,
  CheckCircle, Warning, Error, Info, Refresh,
  Upload, Visibility, TrendingUp, Assessment,
  Analytics, HealthAndSafety, Schedule,
  CloudDone, Insights, MonitorHeart
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { patientService } from '../services/patientService';
import { studyService } from '../services/studyService';
import { useAccessibility } from '../components/Accessibility/AccessibilityProvider';

interface DashboardStats {
  totalPatients: number;
  totalStudies: number;
  processedStudies: number;
  studiesWithImages: number;
  recentUploads: number;
  processingQueue: number;
}

interface RecentActivity {
  id: string;
  type: 'upload' | 'processing' | 'view';
  patient_id: string;
  study_name: string;
  timestamp: string;
  status: 'success' | 'processing' | 'error';
}

const SmartMedicalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalStudies: 0,
    processedStudies: 0,
    studiesWithImages: 0,
    recentUploads: 0,
    processingQueue: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [fadeIn, setFadeIn] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      announceToScreenReader('Loading dashboard data...');
      
      // Load patients
      const patientsResponse = await patientService.getPatients();
      const patients = patientsResponse.patients || [];
      
      // Load studies
      const studiesResponse = await studyService.getStudies();
      const studies = studiesResponse.studies || [];
      
      // Calculate stats
      const processedStudies = studies.filter(s => 
        (s as any).processing_status === 'completed'
      ).length;
      
      const studiesWithImages = studies.filter(s => 
        (s as any).processed_images || (s as any).preview_url || (s as any).image_urls
      ).length;
      
      const recentUploads = studies.filter(s => {
        const uploadTime = new Date(s.created_at || '');
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return uploadTime > dayAgo;
      }).length;

      setStats({
        totalPatients: patients.length,
        totalStudies: studies.length,
        processedStudies,
        studiesWithImages,
        recentUploads,
        processingQueue: studies.length - processedStudies
      });

      // Generate recent activity
      const activity: RecentActivity[] = studies
        .slice(0, 10)
        .map((study, index) => ({
          id: study.study_uid || `activity-${index}`,
          type: 'upload',
          patient_id: study.patient_id || 'Unknown',
          study_name: (study as any).original_filename || study.study_description || 'Unknown Study',
          timestamp: study.created_at || new Date().toISOString(),
          status: (study as any).processing_status === 'completed' ? 'success' : 
                  (study as any).processing_status === 'failed' ? 'error' : 'processing'
        }));

      setRecentActivity(activity);

      // Determine system health
      const errorRate = (studies.length - processedStudies) / Math.max(studies.length, 1);
      if (errorRate > 0.3) {
        setSystemHealth('error');
      } else if (errorRate > 0.1) {
        setSystemHealth('warning');
      } else {
        setSystemHealth('healthy');
      }

      announceToScreenReader('Dashboard data loaded successfully');

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSystemHealth('error');
      announceToScreenReader('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Initialize keyboard shortcuts for dashboard
  useKeyboardShortcuts({
    onRefresh: loadDashboardData,
    onNewPatient: () => navigate('/patients'),
    shortcuts: [
      {
        key: 'm',
        ctrlKey: true,
        action: () => navigate('/patients'),
        description: 'Manage Patients',
        category: 'navigation'
      },
      {
        key: 'v',
        ctrlKey: true,
        action: () => navigate('/studies'),
        description: 'View All Studies',
        category: 'navigation'
      }
    ]
  });

  const getHealthColor = () => {
    switch (systemHealth) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = () => {
    switch (systemHealth) {
      case 'healthy': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      default: return <Info />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload': return <Upload />;
      case 'processing': return <Timeline />;
      case 'view': return <Visibility />;
      default: return <Info />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    // Trigger fade-in animation
    setTimeout(() => setFadeIn(true), 100);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        p: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        minHeight: '100vh'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 3
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 3,
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}>
            <Avatar sx={{ 
              bgcolor: 'primary.main', 
              width: 56, 
              height: 56,
              animation: 'pulse 2s infinite'
            }}>
              <MonitorHeart />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Initializing Smart Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Loading medical imaging analytics...
              </Typography>
            </Box>
          </Box>
          <LinearProgress 
            sx={{ 
              width: 300,
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
              }
            }} 
          />
        </Box>
      </Box>
    );
  }

  return (
    <Fade in={fadeIn} timeout={800}>
      <Box 
        component="main"
        role="main"
        aria-label="Smart Medical Dashboard"
        sx={{ 
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          minHeight: '100vh'
        }}>
        {/* Header */}
        <Box 
          component="header"
          role="banner"
          aria-label="Dashboard header"
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 4,
            p: 3,
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`
          }}>
          <Box>
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <MonitorHeart sx={{ color: theme.palette.primary.main }} />
              Smart Medical Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Intelligent DICOM processing and medical image management
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              icon={getHealthIcon()}
              label={`System ${systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1)}`}
              color={getHealthColor() as any}
              variant="filled"
              aria-label={`System health status: ${systemHealth}`}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                px: 1,
                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
              }}
            />
            <Tooltip title="Refresh Dashboard" arrow>
              <IconButton 
                onClick={loadDashboardData}
                aria-label="Refresh dashboard data"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid 
          container 
          spacing={3} 
          sx={{ mb: 4 }}
          role="region"
          aria-label="Dashboard statistics"
        >
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              component={CardActionArea}
              onClick={() => navigate('/patients')}
              aria-label={`Total patients: ${stats.totalPatients}. Click to manage patients.`}
              sx={{
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Badge 
                  badgeContent={stats.totalPatients > 99 ? '99+' : stats.totalPatients} 
                  color="primary"
                  sx={{ mb: 2 }}
                >
                  <Avatar sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    color: 'primary.main',
                    mx: 'auto', 
                    width: 64, 
                    height: 64,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  }}>
                    <Person fontSize="large" />
                  </Avatar>
                </Badge>
                <Typography variant="h3" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.totalPatients}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total Patients
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <TrendingUp fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                    Active
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              component={CardActionArea}
              onClick={() => navigate('/studies')}
              aria-label={`Total studies: ${stats.totalStudies}. Click to view all studies.`}
              sx={{
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(theme.palette.info.main, 0.15)}`
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Badge 
                  badgeContent={stats.totalStudies > 99 ? '99+' : stats.totalStudies} 
                  color="info"
                  sx={{ mb: 2 }}
                >
                  <Avatar sx={{ 
                    bgcolor: alpha(theme.palette.info.main, 0.1), 
                    color: 'info.main',
                    mx: 'auto', 
                    width: 64, 
                    height: 64,
                    border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`
                  }}>
                    <Assessment fontSize="large" />
                  </Avatar>
                </Badge>
                <Typography variant="h3" color="info.main" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.totalStudies}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total Studies
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <Analytics fontSize="small" color="info" />
                  <Typography variant="caption" color="info.main" sx={{ fontWeight: 600 }}>
                    Analyzed
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              aria-label={`Processed studies: ${stats.processedStudies} out of ${stats.totalStudies}`}
              sx={{
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(theme.palette.success.main, 0.15)}`
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Badge 
                  badgeContent={stats.processedStudies > 99 ? '99+' : stats.processedStudies} 
                  color="success"
                  sx={{ mb: 2 }}
                >
                  <Avatar sx={{ 
                    bgcolor: alpha(theme.palette.success.main, 0.1), 
                    color: 'success.main',
                    mx: 'auto', 
                    width: 64, 
                    height: 64,
                    border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`
                  }}>
                    <CloudDone fontSize="large" />
                  </Avatar>
                </Badge>
                <Typography variant="h3" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.processedStudies}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Processed Studies
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <CheckCircle fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                    {stats.totalStudies > 0 ? Math.round((stats.processedStudies / stats.totalStudies) * 100) : 0}% Complete
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card 
              aria-label={`Studies with images: ${stats.studiesWithImages} out of ${stats.totalStudies}`}
              sx={{
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(theme.palette.secondary.main, 0.15)}`
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Badge 
                  badgeContent={stats.studiesWithImages > 99 ? '99+' : stats.studiesWithImages} 
                  color="secondary"
                  sx={{ mb: 2 }}
                >
                  <Avatar sx={{ 
                    bgcolor: alpha(theme.palette.secondary.main, 0.1), 
                    color: 'secondary.main',
                    mx: 'auto', 
                    width: 64, 
                    height: 64,
                    border: `2px solid ${alpha(theme.palette.secondary.main, 0.2)}`
                  }}>
                    <Image fontSize="large" />
                  </Avatar>
                </Badge>
                <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.studiesWithImages}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  With Images
                </Typography>
                <Box sx={{ 
                  mt: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <Insights fontSize="small" color="secondary" />
                  <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 600 }}>
                    Visualized
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid 
          container 
          spacing={3}
          role="region"
          aria-label="Dashboard main content"
        >
          {/* Processing Overview */}
          <Grid item xs={12} md={8}>
            <Card sx={{
              borderRadius: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 3 
                }}>
                  <Avatar sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    color: 'primary.main',
                    width: 48,
                    height: 48
                  }}>
                    <Analytics />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Processing Overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time system performance metrics
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Processing Success Rate
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {stats.totalStudies > 0 ? Math.round((stats.processedStudies / stats.totalStudies) * 100) : 0}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.totalStudies > 0 ? (stats.processedStudies / stats.totalStudies) * 100 : 0}
                    sx={{ 
                      height: 12, 
                      borderRadius: 6,
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
                      }
                    }}
                  />
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Images Generated
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                      {stats.totalStudies > 0 ? Math.round((stats.studiesWithImages / stats.totalStudies) * 100) : 0}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.totalStudies > 0 ? (stats.studiesWithImages / stats.totalStudies) * 100 : 0}
                    sx={{ 
                      height: 12, 
                      borderRadius: 6,
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`
                      }
                    }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      borderRadius: 2,
                      background: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.15)}`
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <Upload color="success" />
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                          {stats.recentUploads}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Recent Uploads (24h)
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      borderRadius: 2,
                      background: alpha(theme.palette.warning.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 24px ${alpha(theme.palette.warning.main, 0.15)}`
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <Schedule color="warning" />
                        <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                          {stats.processingQueue}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Processing Queue
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              borderRadius: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 3 
                }}>
                  <Avatar sx={{ 
                    bgcolor: alpha(theme.palette.info.main, 0.1), 
                    color: 'info.main',
                    width: 48,
                    height: 48
                  }}>
                    <Timeline />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Recent Activity
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Latest system events
                    </Typography>
                  </Box>
                </Box>
                
                <List 
                  dense 
                  sx={{ maxHeight: 400, overflow: 'auto' }}
                  role="list"
                  aria-label="Recent activity list"
                >
                  {recentActivity.slice(0, 8).map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem 
                        role="listitem"
                        aria-label={`${activity.study_name} for patient ${activity.patient_id}, status: ${activity.status}`}
                        sx={{
                          borderRadius: 2,
                          mb: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.04)
                          }
                        }}>
                        <ListItemIcon>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main'
                          }}>
                            {getActivityIcon(activity.type)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                                {activity.study_name}
                              </Typography>
                              <Chip 
                                label={activity.status}
                                size="small"
                                color={getStatusColor(activity.status) as any}
                                sx={{ 
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {activity.patient_id} • {new Date(activity.timestamp).toLocaleString()}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < recentActivity.slice(0, 8).length - 1 && (
                        <Divider sx={{ mx: 2, opacity: 0.3 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>

                {recentActivity.length === 0 && (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.info.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                    }}
                  >
                    No recent activity found
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Paper 
          component="section"
          role="region"
          aria-label="Quick actions"
          sx={{ 
            p: 4, 
            mt: 4,
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`
          }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 3 
          }}>
            <Avatar sx={{ 
              bgcolor: alpha(theme.palette.secondary.main, 0.1), 
              color: 'secondary.main',
              width: 48,
              height: 48
            }}>
              <Speed />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Streamlined workflow shortcuts
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              startIcon={<Person />}
              onClick={() => navigate('/patients')}
              variant="contained"
              size="large"
              aria-label="Navigate to patient management page"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`
                }
              }}
            >
              Manage Patients
            </Button>
            <Button
              startIcon={<Assessment />}
              onClick={() => navigate('/studies')}
              variant="outlined"
              size="large"
              aria-label="Navigate to studies page to view all studies"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.info.main, 0.2)}`
                }
              }}
            >
              View All Studies
            </Button>
            <Button
              startIcon={<Upload />}
              onClick={() => navigate('/patients')}
              variant="outlined"
              size="large"
              aria-label="Navigate to upload DICOM files"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.2)}`
                }
              }}
            >
              Upload DICOM
            </Button>
            <Button
              startIcon={<Refresh />}
              onClick={loadDashboardData}
              variant="outlined"
              size="large"
              aria-label="Refresh dashboard data"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.secondary.main, 0.2)}`
                }
              }}
            >
              Refresh Data
            </Button>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default SmartMedicalDashboard;