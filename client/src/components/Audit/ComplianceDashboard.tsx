import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Download as ExportIcon,
} from '@mui/icons-material';
// Date picker imports removed for now - using TextField with type="date"

import { apiService } from '../../services/api';

interface ComplianceReport {
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  summary: {
    total_events: number;
    unique_users: number;
    study_accesses: number;
    report_modifications: number;
    billing_activities: number;
  };
  event_type_breakdown: Record<string, number>;
  user_activity_summary: Record<string, {
    total_events: number;
    event_types: Record<string, number>;
  }>;
  generated_at: string;
  hipaa_compliance_status: string;
}

const ComplianceDashboard: React.FC = () => {
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date>(new Date());

  const loadComplianceReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      const response = await apiService.get('/audit/compliance/report', { params });
      setComplianceReport(response.compliance_report);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load compliance report';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplianceReport();
  }, []);

  const handleDateChange = () => {
    loadComplianceReport();
  };

  const exportReport = async () => {
    if (!complianceReport) return;

    try {
      const reportContent = generateComplianceReportText(complianceReport);
      downloadReport(reportContent, `compliance_report_${new Date().toISOString().split('T')[0]}.txt`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatSafeDate = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatSafeDateTime = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const generateComplianceReportText = (report: ComplianceReport): string => {
    const lines = [
      'HIPAA COMPLIANCE AUDIT REPORT',
      '================================',
      '',
      `Report Period: ${formatSafeDate(report.period.start_date)} - ${formatSafeDate(report.period.end_date)}`,
      `Duration: ${report.period.days} days`,
      `Generated: ${formatSafeDateTime(report.generated_at)}`,
      `Compliance Status: ${report.hipaa_compliance_status}`,
      '',
      'SUMMARY STATISTICS',
      '------------------',
      `Total Events: ${report.summary.total_events}`,
      `Unique Users: ${report.summary.unique_users}`,
      `Study Accesses: ${report.summary.study_accesses}`,
      `Report Modifications: ${report.summary.report_modifications}`,
      `Billing Activities: ${report.summary.billing_activities}`,
      '',
      'EVENT TYPE BREAKDOWN',
      '-------------------',
    ];

    Object.entries(report.event_type_breakdown).forEach(([eventType, count]) => {
      lines.push(`${eventType}: ${count}`);
    });

    lines.push('');
    lines.push('USER ACTIVITY SUMMARY');
    lines.push('--------------------');

    Object.entries(report.user_activity_summary).forEach(([userId, activity]) => {
      lines.push(`${userId}: ${activity.total_events} total events`);
      Object.entries(activity.event_types).forEach(([eventType, count]) => {
        lines.push(`  - ${eventType}: ${count}`);
      });
    });

    return lines.join('\n');
  };

  const downloadReport = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getComplianceStatusColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'COMPLIANT':
        return 'success';
      case 'NO_ACTIVITY':
        return 'warning';
      default:
        return 'error';
    }
  };

  const getComplianceStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <CheckIcon />;
      case 'NO_ACTIVITY':
        return <WarningIcon />;
      default:
        return <WarningIcon />;
    }
  };

  const calculateActivityScore = (): number => {
    if (!complianceReport) return 0;
    const { summary } = complianceReport;
    const totalPossibleActivities = summary.total_events;
    const criticalActivities = summary.study_accesses + summary.report_modifications + summary.billing_activities;
    return totalPossibleActivities > 0 ? (criticalActivities / totalPossibleActivities) * 100 : 0;
  };

  return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            HIPAA Compliance Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportReport}
              disabled={!complianceReport}
            >
              Export Report
            </Button>
          </Box>
        </Box>

        {/* Date Range Selector */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Report Period
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
              
              <Button
                variant="contained"
                onClick={handleDateChange}
                disabled={loading}
              >
                Update Report
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Compliance Report */}
        {complianceReport && !loading && (
          <Grid container spacing={3}>
            {/* Compliance Status Overview */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Compliance Status
                    </Typography>
                    <Chip
                      icon={getComplianceStatusIcon(complianceReport.hipaa_compliance_status)}
                      label={complianceReport.hipaa_compliance_status}
                      color={getComplianceStatusColor(complianceReport.hipaa_compliance_status)}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="h4" color="primary">
                          {complianceReport.summary.total_events}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Events
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {complianceReport.summary.unique_users}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Users
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="h4" color="info.main">
                          {complianceReport.summary.study_accesses}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Study Accesses
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="h4" color="warning.main">
                          {Math.round(calculateActivityScore())}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Activity Score
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Activity Score: {Math.round(calculateActivityScore())}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={calculateActivityScore()}
                      color={calculateActivityScore() > 80 ? 'success' : calculateActivityScore() > 60 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Event Type Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Event Type Breakdown
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Event Type</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(complianceReport.event_type_breakdown)
                          .sort(([, a], [, b]) => b - a)
                          .map(([eventType, count]) => {
                            const percentage = (count / complianceReport.summary.total_events) * 100;
                            return (
                              <TableRow key={eventType}>
                                <TableCell>
                                  <Typography variant="body2">
                                    {eventType}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {count}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {percentage.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* User Activity Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Activity Summary
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>User ID</TableCell>
                          <TableCell align="right">Total Events</TableCell>
                          <TableCell align="right">Activity %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(complianceReport.user_activity_summary)
                          .sort(([, a], [, b]) => b.total_events - a.total_events)
                          .slice(0, 10) // Show top 10 users
                          .map(([userId, activity]) => {
                            const percentage = (activity.total_events / complianceReport.summary.total_events) * 100;
                            return (
                              <TableRow key={userId}>
                                <TableCell>
                                  <Typography variant="body2">
                                    {userId}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {activity.total_events}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {percentage.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Compliance Recommendations */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Recommendations
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {complianceReport.summary.total_events === 0 && (
                      <Alert severity="warning">
                        No audit events recorded during this period. Ensure audit logging is properly configured.
                      </Alert>
                    )}
                    
                    {complianceReport.summary.study_accesses === 0 && (
                      <Alert severity="info">
                        No study accesses recorded. This may indicate low system usage or potential logging issues.
                      </Alert>
                    )}
                    
                    {calculateActivityScore() < 50 && (
                      <Alert severity="warning">
                        Low activity score detected. Consider reviewing user training and system adoption.
                      </Alert>
                    )}
                    
                    {complianceReport.hipaa_compliance_status === 'COMPLIANT' && (
                      <Alert severity="success">
                        System is HIPAA compliant with comprehensive audit logging in place.
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
  );
};

export default ComplianceDashboard;