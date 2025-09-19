import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Receipt as BillingIcon,
  TrendingUp as RevenueIcon,
  Assessment as AnalyticsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';

import BillingPanel from '../components/Billing/BillingPanel';
import { Study, Report } from '../types';
import { apiService } from '../services/api';

const BillingDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [study, setStudy] = useState<Study | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingStats, setBillingStats] = useState({
    totalSuperbills: 0,
    pendingValidation: 0,
    readyToSubmit: 0,
    submitted: 0,
    totalRevenue: 0,
  });

  const studyUid = searchParams.get('studyUid');
  const reportId = searchParams.get('reportId');

  // Load study and report data if provided
  useEffect(() => {
    const loadData = async () => {
      if (!studyUid && !reportId) return;

      try {
        setLoading(true);
        setError(null);

        if (reportId) {
          const reportData = await apiService.getReport(reportId);
          setReport(reportData);
          
          if (reportData.study_uid) {
            const studyData = await apiService.getStudy(reportData.study_uid);
            setStudy(studyData);
          }
        } else if (studyUid) {
          const studyData = await apiService.getStudy(studyUid);
          setStudy(studyData);
          
          // Get the latest report for this study
          const studyReports = await apiService.getStudyReports(studyUid);
          if (studyReports.reports && studyReports.reports.length > 0) {
            const latestReport = studyReports.reports[studyReports.reports.length - 1];
            const reportData = await apiService.getReport(latestReport.report_id);
            setReport(reportData);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studyUid, reportId]);

  // Load billing statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Mock statistics - in real implementation, this would come from API
        setBillingStats({
          totalSuperbills: 156,
          pendingValidation: 12,
          readyToSubmit: 8,
          submitted: 136,
          totalRevenue: 45670,
        });
      } catch (err) {
        console.error('Failed to load billing statistics:', err);
      }
    };

    loadStats();
  }, []);

  const handleSuperbillGenerated = (superbill: any) => {
    console.log('Superbill generated:', superbill);
    // Update statistics or show success message
  };

  const handleValidationUpdate = (validation: any) => {
    console.log('Validation updated:', validation);
    // Handle validation updates
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Billing Dashboard
        </Typography>
        
        {study && (
          <Typography variant="body2" color="text.secondary">
            {study.patient_id} - {study.study_description} | {study.exam_type}
          </Typography>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Overview */}
      {!study && !report && (
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <BillingIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="primary">
                    {billingStats.totalSuperbills}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Superbills
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <WarningIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="warning.main">
                    {billingStats.pendingValidation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Validation
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AnalyticsIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {billingStats.readyToSubmit}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready to Submit
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <RevenueIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="info.main">
                    ${billingStats.totalRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info">
            <Typography variant="body2">
              Select a study or report to access real-time billing validation and superbill generation.
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Billing Panel */}
      {(study || report) && (
        <Box sx={{ flexGrow: 1, p: 2, overflow: 'hidden' }}>
          <BillingPanel
            study={study || undefined}
            report={report || undefined}
            onSuperbillGenerated={handleSuperbillGenerated}
            onValidationUpdate={handleValidationUpdate}
          />
        </Box>
      )}
    </Box>
  );
};

export default BillingDashboard;