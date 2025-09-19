import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Alert } from '@mui/material';
import { apiService } from '../services/api';

const DebugReports: React.FC = () => {
  const [reportId, setReportId] = useState('RPT001');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allReports, setAllReports] = useState<any[]>([]);

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    try {
      const response = await apiService.getReports();
      setAllReports(response.reports || []);
      console.log('All reports:', response.reports);
    } catch (err) {
      console.error('Error loading all reports:', err);
    }
  };

  const loadReport = async () => {
    if (!reportId.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Debug: Loading report with ID:', reportId);
      
      const data = await apiService.getReport(reportId);
      console.log('Debug: Received report data:', data);
      setReportData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
      setError(errorMessage);
      console.error('Debug: Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Debug Reports
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available Reports
          </Typography>
          {allReports.map((report, index) => (
            <Box key={report.report_id} sx={{ mb: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setReportId(report.report_id)}
                sx={{ mr: 1 }}
              >
                Load {report.report_id}
              </Button>
              <Typography variant="body2" component="span">
                {report.report_id} - {report.exam_type} - {report.status}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          label="Report ID"
          value={reportId}
          onChange={(e) => setReportId(e.target.value)}
          size="small"
        />
        <Button
          variant="contained"
          onClick={loadReport}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load Report'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {reportData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Report Data
            </Typography>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DebugReports;