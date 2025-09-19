import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Button, Chip, LinearProgress, Alert, Avatar,
  List, ListItem, ListItemText, ListItemIcon,
  Divider, IconButton, Tooltip
} from '@mui/material';
import {
  Dashboard, Person, Image, Timeline, Speed,
  CheckCircle, Warning, Error, Info, Refresh,
  Upload, Visibility, TrendingUp, Assessment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../services/patientService';
import { studyService } from '../services/studyService';

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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
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

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSystemHealth('error');
    } finally {
      setLoading(false);
    }
  };

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
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading smart medical dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🧠 Smart Medical Imaging Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Intelligent DICOM processing and medical image management
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            icon={getHealthIcon()}
            label={`System ${systemHealth.toUpperCase()}`}
            color={getHealthColor() as any}
          />
          <Tooltip title="Refresh Dashboard">
            <IconButton onClick={loadDashboardData}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <Person />
              </Avatar>
              <Typography variant="h4" color="primary">
                {stats.totalPatients}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                <Assessment />
              </Avatar>
              <Typography variant="h4" color="info.main">
                {stats.totalStudies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Studies
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                <CheckCircle />
              </Avatar>
              <Typography variant="h4" color="success.main">
                {stats.processedStudies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed Studies
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 1 }}>
                <Image />
              </Avatar>
              <Typography variant="h4" color="secondary.main">
                {stats.studiesWithImages}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                With Images
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Processing Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Processing Overview
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Processing Success Rate</Typography>
                  <Typography variant="body2">
                    {stats.totalStudies > 0 ? Math.round((stats.processedStudies / stats.totalStudies) * 100) : 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.totalStudies > 0 ? (stats.processedStudies / stats.totalStudies) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Images Generated</Typography>
                  <Typography variant="body2">
                    {stats.totalStudies > 0 ? Math.round((stats.studiesWithImages / stats.totalStudies) * 100) : 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.totalStudies > 0 ? (stats.studiesWithImages / stats.totalStudies) * 100 : 0}
                  color="secondary"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                    <Typography variant="h5" color="success.main">
                      {stats.recentUploads}
                    </Typography>
                    <Typography variant="body2">
                      Recent Uploads (24h)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                    <Typography variant="h5" color="warning.main">
                      {stats.processingQueue}
                    </Typography>
                    <Typography variant="body2">
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🕒 Recent Activity
              </Typography>
              
              <List dense>
                {recentActivity.slice(0, 8).map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" noWrap>
                              {activity.study_name}
                            </Typography>
                            <Chip 
                              label={activity.status}
                              size="small"
                              color={getStatusColor(activity.status) as any}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {activity.patient_id} • {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {recentActivity.length === 0 && (
                <Alert severity="info">
                  No recent activity found
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          🚀 Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            startIcon={<Person />}
            onClick={() => navigate('/patients')}
            variant="contained"
          >
            Manage Patients
          </Button>
          <Button
            startIcon={<Assessment />}
            onClick={() => navigate('/studies')}
            variant="outlined"
          >
            View All Studies
          </Button>
          <Button
            startIcon={<Upload />}
            onClick={() => navigate('/patients')}
            variant="outlined"
          >
            Upload DICOM
          </Button>
          <Button
            startIcon={<TrendingUp />}
            onClick={loadDashboardData}
            variant="outlined"
          >
            Refresh Data
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SmartMedicalDashboard;