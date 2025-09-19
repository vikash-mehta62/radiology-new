import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
// Date picker imports removed for now - using TextField with type="date"

import { apiService } from '../../services/api';

interface AuditLog {
  id: string;
  event_type: string;
  event_description: string;
  user_id: string;
  user_role: string;
  resource_type?: string;
  resource_id?: string;
  study_uid?: string;
  report_id?: string;
  superbill_id?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: any;
}

interface AuditFilters {
  resource_type?: string;
  resource_id?: string;
  study_uid?: string;
  user_id?: string;
  event_type?: string;
  start_date?: Date;
  end_date?: Date;
}

const AuditLogViewer: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit: 100,
      };

      if (filters.resource_type) params.resource_type = filters.resource_type;
      if (filters.resource_id) params.resource_id = filters.resource_id;
      if (filters.study_uid) params.study_uid = filters.study_uid;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.event_type) params.event_type = filters.event_type;
      if (filters.start_date) params.start_date = filters.start_date.toISOString();
      if (filters.end_date) params.end_date = filters.end_date.toISOString();

      const response = await apiService.get('/audit/trail', { params });
      setAuditLogs(response.audit_logs || []);
      setTotalLogs(response.total || 0);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load logs on component mount and when filters change
  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleFilterChange = (field: keyof AuditFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    loadAuditLogs();
  };

  const clearFilters = () => {
    setFilters({});
    setTimeout(loadAuditLogs, 100);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const exportLogs = async () => {
    try {
      // In a real implementation, this would generate and download a CSV/PDF
      const csvContent = generateCSV(auditLogs);
      downloadCSV(csvContent, 'audit_logs.csv');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const generateCSV = (logs: AuditLog[]): string => {
    const headers = [
      'Timestamp',
      'Event Type',
      'Description',
      'User ID',
      'User Role',
      'Resource Type',
      'Resource ID',
      'IP Address'
    ];

    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.event_type,
      log.event_description,
      log.user_id,
      log.user_role,
      log.resource_type || '',
      log.resource_id || '',
      log.ip_address || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getEventTypeColor = (eventType: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    if (eventType.includes('ERROR') || eventType.includes('FAILED')) return 'error';
    if (eventType.includes('CREATE') || eventType.includes('SUCCESS')) return 'success';
    if (eventType.includes('UPDATE') || eventType.includes('MODIFY')) return 'warning';
    if (eventType.includes('DELETE') || eventType.includes('REMOVE')) return 'error';
    if (eventType.includes('ACCESS') || eventType.includes('VIEW')) return 'info';
    return 'default';
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Audit Log Viewer
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadAuditLogs}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportLogs}
              disabled={auditLogs.length === 0}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Resource Type</InputLabel>
                  <Select
                    value={filters.resource_type || ''}
                    onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                    label="Resource Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="Study">Study</MenuItem>
                    <MenuItem value="Report">Report</MenuItem>
                    <MenuItem value="Superbill">Superbill</MenuItem>
                    <MenuItem value="AIJob">AI Job</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={filters.event_type || ''}
                    onChange={(e) => handleFilterChange('event_type', e.target.value)}
                    label="Event Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="STUDY_ACCESS">Study Access</MenuItem>
                    <MenuItem value="REPORT_CREATE">Report Create</MenuItem>
                    <MenuItem value="REPORT_UPDATE">Report Update</MenuItem>
                    <MenuItem value="BILLING_CREATE">Billing Create</MenuItem>
                    <MenuItem value="AI_PROCESSING">AI Processing</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="User ID"
                  value={filters.user_id || ''}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Study UID"
                  value={filters.study_uid || ''}
                  onChange={(e) => handleFilterChange('study_uid', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  fullWidth
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  fullWidth
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<FilterIcon />}
                    onClick={applyFilters}
                    disabled={loading}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
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

        {/* Audit Logs Table */}
        {!loading && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Audit Logs ({totalLogs} total)
                </Typography>
                <Chip
                  icon={<SecurityIcon />}
                  label="HIPAA Compliant"
                  color="success"
                  variant="outlined"
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Resource</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimestamp(log.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.event_type}
                            size="small"
                            color={getEventTypeColor(log.event_type)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.event_description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {log.user_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {log.user_role}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {log.resource_type && (
                            <Box>
                              <Typography variant="body2">
                                {log.resource_type}
                              </Typography>
                              {log.resource_id && (
                                <Typography variant="caption" color="text.secondary">
                                  {log.resource_id.slice(-8)}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.ip_address || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(log)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {auditLogs.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No audit logs found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your filters or date range
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Log Details Dialog */}
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Audit Log Details
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Event Information
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Event Type:</strong> {selectedLog.event_type}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Description:</strong> {selectedLog.event_description}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      User Information
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>User ID:</strong> {selectedLog.user_id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Role:</strong> {selectedLog.user_role}
                      </Typography>
                      <Typography variant="body2">
                        <strong>IP Address:</strong> {selectedLog.ip_address || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>

                  {selectedLog.resource_type && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Resource Information
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Resource Type:</strong> {selectedLog.resource_type}
                        </Typography>
                        {selectedLog.resource_id && (
                          <Typography variant="body2">
                            <strong>Resource ID:</strong> {selectedLog.resource_id}
                          </Typography>
                        )}
                        {selectedLog.study_uid && (
                          <Typography variant="body2">
                            <strong>Study UID:</strong> {selectedLog.study_uid}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  )}

                  {selectedLog.metadata && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Additional Metadata
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default AuditLogViewer;