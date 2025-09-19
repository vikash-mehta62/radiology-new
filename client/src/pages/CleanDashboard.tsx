import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Button, Avatar, LinearProgress, Chip
} from '@mui/material';
import {
  Person, Assessment, Upload, TrendingUp,
  CheckCircle, Schedule, Image
} from '@mui/icons-material';
import { patientService } from '../services/patientService';
import { studyService } from '../services/studyService';

interface DashboardStats {
  totalPatients: number;
  totalStudies: number;
  processedStudies: number;
  recentUploads: number;
}

const CleanDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalStudies: 0,
    processedStudies: 0,
    recentUploads: 0
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [patientsResponse, studiesResponse] = await Promise.all([
        patientService.getPatients(),
        studyService.getStudies()
      ]);

      const patients = patientsResponse.patients || [];
      const studies = studiesResponse.studies || [];
      
      const processedStudies = studies.filter(s => 
        (s as any).processing_status === 'completed'
      ).length;

      setStats({
        totalPatients: patients.length,
        totalStudies: studies.length,
        processedStudies,
        recentUploads: studies.length
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2' }}>
          🏥 Medical Imaging Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Professional DICOM management system
        </Typography>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: '#1976d2', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <Person sx={{ fontSize: 32 }} />
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
              <Avatar sx={{ bgcolor: '#2e7d32', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <Assessment sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h4" color="success.main">
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
              <Avatar sx={{ bgcolor: '#ed6c02', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <CheckCircle sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h4" color="warning.main">
                {stats.processedStudies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: '#9c27b0', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                <Image sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h4" color="secondary.main">
                {stats.recentUploads}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Images Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Person />}
              onClick={() => navigate('/patients')}
              sx={{ py: 2 }}
            >
              Manage Patients
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => navigate('/studies')}
              sx={{ py: 2 }}
            >
              View Studies
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => navigate('/patients')}
              sx={{ py: 2 }}
            >
              Upload DICOM
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<TrendingUp />}
              onClick={loadDashboardData}
              sx={{ py: 2 }}
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default CleanDashboard;