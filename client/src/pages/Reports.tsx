import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Fade,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Assignment as ReportIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MedicalServices as StudyIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { pdfService } from '../services/pdfService';

interface Report {
  id: string;
  report_id: string;
  study_uid: string;
  patient_id: string;
  exam_type: string;
  status: 'draft' | 'final' | 'billed';
  findings: string;
  impressions: string;
  recommendations: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
}

interface Patient {
  patient_id: string;
  name: string;
  dob?: string;
  gender?: string;
}

interface Study {
  study_uid: string;
  study_date: string;
  modality: string;
  study_description: string;
}

interface ReportWithDetails extends Report {
  patient_name?: string;
  patient_dob?: string;
  patient_gender?: string;
  study_date?: string;
  study_description?: string;
  modality?: string;
}

const Reports: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterAndSortReports();
  }, [reports, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all reports
      const reportsResponse = await fetch('/api/reports');
      const reportsData = await reportsResponse.json();

      if (!reportsData.success) {
        throw new Error(reportsData.error || 'Failed to fetch reports');
      }

      const reportsWithDetails: ReportWithDetails[] = [];

      // Fetch patient and study details for each report
      for (const report of reportsData.reports || []) {
        try {
          // Fetch patient details
          const patientResponse = await fetch(`/api/patients/${report.patient_id}`);
          const patientData = await patientResponse.json();

          // Fetch study details
          const studyResponse = await fetch(`/api/studies/${report.study_uid}`);
          const studyData = await studyResponse.json();

          reportsWithDetails.push({
            ...report,
            patient_name: patientData.success ? patientData.patient?.name : 'Unknown Patient',
            patient_dob: patientData.success ? patientData.patient?.dob : undefined,
            patient_gender: patientData.success ? patientData.patient?.gender : undefined,
            study_date: studyData.success ? studyData.study?.study_date : undefined,
            study_description: studyData.success ? studyData.study?.study_description : undefined,
            modality: studyData.success ? studyData.study?.modality : undefined
          });
        } catch (err) {
          console.error('Error fetching details for report:', report.report_id, err);
          reportsWithDetails.push({
            ...report,
            patient_name: 'Unknown Patient',
            study_description: 'Unknown Study'
          });
        }
      }

      setReports(reportsWithDetails);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortReports = () => {
    let filtered = [...reports];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(report =>
        report.patient_name?.toLowerCase().includes(searchLower) ||
        report.study_description?.toLowerCase().includes(searchLower) ||
        report.exam_type?.toLowerCase().includes(searchLower) ||
        report.report_id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof ReportWithDetails];
      let bValue: any = b[sortBy as keyof ReportWithDetails];

      if (sortBy === 'created_at' || sortBy === 'study_date') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReports(filtered);
  };

  const handleViewReport = (report: ReportWithDetails) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleEditReport = (report: ReportWithDetails) => {
    navigate(`/reports/${report.report_id}`);
  };

  const handleDownloadPDF = async (report: ReportWithDetails) => {
    try {
      // Create a mock study object for PDF generation
      const mockStudy = {
        id: `study_${report.study_uid}`,
        study_uid: report.study_uid,
        patient_id: report.patient_id,
        study_date: report.study_date || new Date().toISOString(),
        modality: report.modality || 'Unknown',
        exam_type: report.exam_type || report.modality || 'Unknown',
        study_description: report.study_description || 'Unknown Study',
        status: 'completed' as const,
        created_at: new Date().toISOString(),
        patient_info: {
          patient_id: report.patient_id,
          name: report.patient_name || 'Unknown Patient',
          dob: report.patient_dob,
          gender: report.patient_gender
        }
      };

      await pdfService.generatePDF(report, mockStudy, []);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'warning';
      case 'final':
        return 'success';
      case 'billed':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
        Reports
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                  <MenuItem value="billed">Billed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="created_at">Date Created</MenuItem>
                  <MenuItem value="patient_name">Patient Name</MenuItem>
                  <MenuItem value="study_date">Study Date</MenuItem>
                  <MenuItem value="exam_type">Exam Type</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  label="Order"
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                >
                  <MenuItem value="desc">Newest First</MenuItem>
                  <MenuItem value="asc">Oldest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchReports}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Reports ({filteredReports.length})
          </Typography>
          
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report ID</TableCell>
                  <TableCell>Patient Name</TableCell>
                  <TableCell>Study Date</TableCell>
                  <TableCell>Exam Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>AI Generated</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {report.report_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {report.patient_name || 'Unknown Patient'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(report.study_date)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <StudyIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {report.exam_type || 'Unknown'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.status.toUpperCase()}
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.ai_generated ? 'AI' : 'Manual'}
                        color={report.ai_generated ? 'secondary' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(report.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Report">
                          <IconButton
                            size="small"
                            onClick={() => handleViewReport(report)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Report">
                          <IconButton
                            size="small"
                            onClick={() => handleEditReport(report)}
                          >
                            <ReportIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download PDF">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadPDF(report)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No reports found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Report Details - {selectedReport?.report_id}
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Patient Information
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedReport.patient_name || 'Unknown'}
                </Typography>
                <Typography variant="body2">
                  <strong>DOB:</strong> {formatDate(selectedReport.patient_dob)}
                </Typography>
                <Typography variant="body2">
                  <strong>Gender:</strong> {selectedReport.patient_gender || 'Unknown'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Study Information
                </Typography>
                <Typography variant="body2">
                  <strong>Study Date:</strong> {formatDate(selectedReport.study_date)}
                </Typography>
                <Typography variant="body2">
                  <strong>Modality:</strong> {selectedReport.modality || 'Unknown'}
                </Typography>
                <Typography variant="body2">
                  <strong>Description:</strong> {selectedReport.study_description || 'Unknown'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Findings
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedReport.findings || 'No findings recorded'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Impressions
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedReport.impressions || 'No impressions recorded'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Recommendations
                </Typography>
                <Typography variant="body2">
                  {selectedReport.recommendations || 'No recommendations recorded'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (selectedReport) {
                handleDownloadPDF(selectedReport);
              }
            }}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;