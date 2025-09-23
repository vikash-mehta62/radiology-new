import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadService, UploadProgress, UploadResult } from '../services/uploadService';
import { patientService, Patient as PatientType } from '../services/patientService';
import { studyService } from '../services/studyService';
import SmartPatientDashboard from '../components/Patient/SmartPatientDashboard';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAccessibility } from '../components/Accessibility/AccessibilityProvider';
import { useRadiologyWorkflow } from '../hooks/useRadiologyWorkflow';
import WorkflowToolbar from '../components/Radiology/WorkflowToolbar';
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
  Avatar,
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
  CardActionArea,
  Badge,
  Skeleton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ViewList as ViewListIcon,
  Upload as UploadIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Wc as GenderIcon,
  MedicalServices as StudyIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  Assignment as AssignmentIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

// Using Patient interface from patientService
type Patient = PatientType & {
  study_count?: number;
  last_visit?: string;
};

const PatientList: React.FC = () => {
  console.log('PatientList component mounted');
  const navigate = useNavigate();
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  const { 
    hangingProtocols, 
    windowingPresets, 
    batchOperations,
    selectHangingProtocol,
    getAutoWindowing,
    createBatchOperation,
    executeBatchOperation
  } = useRadiologyWorkflow();
  const [fadeIn, setFadeIn] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStudiesDialog, setShowStudiesDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [patientStudies, setPatientStudies] = useState<any[]>([]);
  const [patientUploads, setPatientUploads] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize keyboard shortcuts for patient management
  useKeyboardShortcuts({
    onNewPatient: () => setShowAddDialog(true),
    onSearch: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onRefresh: () => window.location.reload(),
    shortcuts: [
      {
        key: 'Escape',
        action: () => {
          // Close any open dialogs
          if (showAddDialog) setShowAddDialog(false);
          if (showDetails) setShowDetails(false);
          if (showStudiesDialog) setShowStudiesDialog(false);
          if (showUploadDialog) setShowUploadDialog(false);
        },
        description: 'Close dialogs',
        category: 'actions'
      }
    ]
  });

  // New patient form state
  const [newPatient, setNewPatient] = useState({
    patient_id: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    medical_record_number: '',
    allergies: '',
    medical_history: ''
  });
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 100);
  }, []);

  useEffect(() => {
    console.log('showAddDialog changed:', showAddDialog);
  }, [showAddDialog]);

  // Fetch patients from API using patientService
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        console.log('Fetching patients from API...');
        console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');
        const response = await patientService.getPatients({ per_page: 100 });
        console.log('Patients data received:', response);
        console.log('Number of patients:', response.patients?.length || 0);
        setPatients(response.patients || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          status: (error as any)?.response?.status,
          statusText: (error as any)?.response?.statusText,
          data: (error as any)?.response?.data
        });
        // Fallback to empty array on error
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.phone && patient.phone.includes(searchTerm)) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetails(true);
  };

  const handleViewStudies = async (patient: Patient) => {
    try {
      setSelectedPatient(patient);
      console.log('Fetching studies for patient:', patient.patient_id);
      const studiesResponse = await studyService.getPatientStudies(patient.patient_id);
      const studies = studiesResponse.studies;
      console.log('Studies received:', studies);
      setPatientStudies(studies);
      setShowStudiesDialog(true);
    } catch (error) {
      console.error('Error fetching studies:', error);
      alert('Failed to load patient studies');
    }
  };

  const handleViewStudyDetails = (study: any) => {
    console.log('Viewing study details:', study);
    // Navigate to study details page
    navigate(`/studies/${study.study_uid}`);
  };

  const handleViewReport = (study: any) => {
    console.log('Viewing report for study:', study);
  };

  const handleUploadData = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowUploadDialog(true);
  };

  const handleBrowseFiles = (fileType?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    if (fileType === 'dicom') {
      input.accept = '.dcm,.dicom';
    } else if (fileType === 'documents') {
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    }
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      setSelectedFiles(prev => [...prev, ...files]);
    };
    
    input.click();
  };

  const handleStartUpload = async () => {
    if (!selectedPatient || selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    try {
      setIsUploading(true);
      setUploadResults([]);
      
      const results: UploadResult[] = [];
      
      for (const file of selectedFiles) {
        try {
          console.log(`Uploading file: ${file.name}`);
          
          const result = await uploadService.uploadFile(
            selectedPatient.patient_id,
            file,
            (progress) => {
              setUploadProgress(progress);
            }
          );
          
          // Check if the upload was actually successful
          if (result.success) {
            results.push({
              success: true,
              message: result.message || 'Upload successful',
              fileName: file.name,
              uploadedFiles: result.uploadedFiles || [],
              totalFiles: 1,
              fileId: result.fileId
            });
            console.log(`Successfully uploaded: ${file.name}`);
          } else {
            // Upload service returned failure
            results.push({
              success: false,
              message: result.message || 'Upload failed',
              fileName: file.name,
              uploadedFiles: [],
              totalFiles: 0,
              error: result.error || result.message || 'Upload failed'
            });
            console.error(`Upload failed for ${file.name}: ${result.error || result.message}`);
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          results.push({
            success: false,
            message: 'Upload failed',
            fileName: file.name,
            uploadedFiles: [],
            totalFiles: 0,
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      }
      
      setUploadResults(results);
      setUploadProgress(null);
      
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length > 0) {
        try {
          const files = await patientService.getPatientFiles(selectedPatient.patient_id);
          const dicomFiles = files.filter(file => file.file_type === 'dicom');
          const reportFiles = files.filter(file => file.file_type !== 'dicom');

          setPatientUploads({
            uploads: {
              dicom_files: dicomFiles,
              report_files: reportFiles,
              total_dicom_files: dicomFiles.length
            }
          });
        } catch (error) {
          console.error('Error refreshing patient files:', error);
        }
      }
       
      // Close dialog after successful upload
      if (successfulUploads.length > 0) {
        setTimeout(() => {
          setShowUploadDialog(false);
          setUploadResults([]);
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) return 0;
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 0;
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.patient_id || !newPatient.first_name || !newPatient.last_name || 
        !newPatient.date_of_birth || !newPatient.gender) {
      alert('Please fill in all required fields (Patient ID, First Name, Last Name, Date of Birth, Gender)');
      return;
    }

    setIsCreatingPatient(true);
    try {
      const createdPatient = await patientService.createPatient(newPatient);
      
      // Refresh the patient list
      const updatedPatients = await patientService.getPatients();
      setPatients(updatedPatients.patients);
      
      // Reset form and close dialog
      setNewPatient({
        patient_id: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'USA',
        medical_record_number: '',
        allergies: '',
        medical_history: ''
      });
      setShowAddDialog(false);
      
      alert(`Patient ${createdPatient.first_name} ${createdPatient.last_name} created successfully!`);
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert(`Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewPatient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUploadDate = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getGenderLabel = (gender: string): string => {
    switch (gender) {
      case 'M':
        return 'Male';
      case 'F':
        return 'Female';
      default:
        return 'Other';
    }
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Fade in={fadeIn} timeout={800}>
      <>
        <Box sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          p: 3
        }}>
        {/* Header Section */}
        <Paper sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}>
                Patient Demographics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage patient information and medical records
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log('Add Patient button clicked');
                setShowAddDialog(true);
                console.log('showAddDialog set to true');
              }}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                }
              }}
            >
              Add Patient
            </Button>
          </Box>
        </Paper>

        {/* Workflow Toolbar */}
        <WorkflowToolbar />

        {/* Search and Filter Section */}
        <Paper sx={{ 
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`
        }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="Search patients by name, ID, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      background: alpha(theme.palette.background.default, 0.5),
                      '&:hover': {
                        background: alpha(theme.palette.background.default, 0.7),
                      },
                      '&.Mui-focused': {
                        background: alpha(theme.palette.background.default, 0.8),
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Badge badgeContent={filteredPatients.length} color="primary" max={999}>
                    <Chip
                      icon={<AnalyticsIcon />}
                      label="Total Patients"
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        background: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                      }}
                    />
                  </Badge>
                  <Tooltip title="Refresh Data">
                    <IconButton 
                      onClick={() => window.location.reload()}
                      sx={{
                        background: alpha(theme.palette.action.hover, 0.5),
                        '&:hover': {
                          background: alpha(theme.palette.action.hover, 0.8),
                          transform: 'rotate(180deg)',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Paper>

      {/* Debug Info */}
      <Card sx={{ mb: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
        <CardContent>
          <Typography variant="body2">
            Debug Info - Loading: {loading.toString()}, Patients: {patients.length}, Filtered: {filteredPatients.length}, Search: "{searchTerm}"
          </Typography>
        </CardContent>
      </Card>

        {/* Patients Table */}
        <Paper sx={{
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
          overflow: 'hidden'
        }}>
          {loading ? (
            <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="circular"
                    width={60}
                    height={60}
                    animation="pulse"
                    sx={{
                      background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`
                    }}
                  />
                ))}
              </Box>
              <Typography variant="body1" color="text.secondary">
                Loading patient data...
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ 
              background: 'transparent',
              '& .MuiTable-root': {
                background: 'transparent'
              }
            }}>
              <Table>
                <TableHead>
                  <TableRow sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
                    '& .MuiTableCell-head': {
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      py: 2
                    }
                  }}>
                    <TableCell>Patient</TableCell>
                    <TableCell>Patient ID</TableCell>
                    <TableCell>Age/Gender</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Insurance</TableCell>
                    <TableCell>Studies</TableCell>
                    <TableCell>Last Visit</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPatients.map((patient, index) => (
                    <TableRow 
                      key={patient.id} 
                      sx={{
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
                          transform: 'translateX(4px)',
                          transition: 'all 0.2s ease'
                        },
                        '& .MuiTableCell-root': {
                          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          py: 2
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ 
                            bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            width: 48,
                            height: 48,
                            fontWeight: 600,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                          }}>
                            {getInitials(patient.first_name, patient.last_name)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {patient.first_name} {patient.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarIcon sx={{ fontSize: 14 }} />
                              DOB: {formatDate(patient.date_of_birth)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={patient.patient_id}
                          variant="outlined"
                          size="small"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            borderRadius: 2,
                            background: alpha(theme.palette.info.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {calculateAge(patient.date_of_birth)} years
                          </Typography>
                          <Chip
                            icon={<GenderIcon sx={{ fontSize: 14 }} />}
                            label={getGenderLabel(patient.gender)}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderRadius: 2,
                              background: alpha(theme.palette.secondary.main, 0.1),
                              border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {patient.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {patient.phone}
                              </Typography>
                            </Box>
                          )}
                          {patient.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {patient.email}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {patient.insurance ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              {patient.insurance.provider}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {patient.insurance.policy_number}
                            </Typography>
                          </Box>
                        ) : (
                          <Chip
                            label="No insurance"
                            size="small"
                            variant="outlined"
                            color="warning"
                            sx={{ borderRadius: 2 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge badgeContent={patient.study_count || 0} color="primary" max={99}>
                          <Chip
                            icon={<StudyIcon />}
                            label="Studies"
                            size="small"
                            color={patient.study_count ? 'primary' : 'default'}
                            onClick={() => patient.study_count && handleViewStudies(patient)}
                            sx={{ 
                              cursor: patient.study_count ? 'pointer' : 'default',
                              borderRadius: 2,
                              '&:hover': patient.study_count ? { 
                                transform: 'translateY(-2px)',
                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                              } : {},
                              transition: 'all 0.2s ease'
                            }}
                          />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.last_visit ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {formatDate(patient.last_visit)}
                            </Typography>
                          </Box>
                        ) : (
                          <Chip
                            label="Never"
                            size="small"
                            variant="outlined"
                            color="default"
                            sx={{ borderRadius: 2 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(patient)}
                              sx={{
                                background: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.main,
                                '&:hover': {
                                  background: alpha(theme.palette.info.main, 0.2),
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Studies">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewStudies(patient)}
                              sx={{
                                background: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  background: alpha(theme.palette.primary.main, 0.2),
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <ViewListIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Upload Data">
                            <IconButton 
                              size="small"
                              onClick={() => handleUploadData(patient)}
                              sx={{
                                background: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.main,
                                '&:hover': {
                                  background: alpha(theme.palette.success.main, 0.2),
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <UploadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!loading && filteredPatients.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.5)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
              borderRadius: 3,
              m: 3
            }}>
              <PersonIcon sx={{ 
                fontSize: 64, 
                color: alpha(theme.palette.primary.main, 0.5), 
                mb: 2 
              }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                No patients found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first patient to get started'}
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddDialog(true)}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                  }}
                >
                  Add First Patient
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Patient Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {selectedPatient && getInitials(selectedPatient.first_name, selectedPatient.last_name)}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedPatient?.first_name} {selectedPatient?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Patient ID: {selectedPatient?.patient_id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Personal Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="primary" />
                        <Typography variant="body2">
                          {selectedPatient.first_name} {selectedPatient.last_name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon color="primary" />
                        <Typography variant="body2">
                          DOB: {formatDate(selectedPatient.date_of_birth)} ({calculateAge(selectedPatient.date_of_birth)} years old)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GenderIcon color="primary" />
                        <Typography variant="body2">
                          {getGenderLabel(selectedPatient.gender)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Contact Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {selectedPatient.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon color="primary" />
                          <Typography variant="body2">
                            {selectedPatient.phone}
                          </Typography>
                        </Box>
                      )}
                      {selectedPatient.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon color="primary" />
                          <Typography variant="body2">
                            {selectedPatient.email}
                          </Typography>
                        </Box>
                      )}
                      {selectedPatient.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationIcon color="primary" />
                          <Typography variant="body2">
                            {typeof selectedPatient.address === 'string' 
                              ? selectedPatient.address 
                              : selectedPatient.address 
                                ? `${selectedPatient.address.street || ''} ${selectedPatient.address.city || ''} ${selectedPatient.address.state || ''} ${selectedPatient.address.zip_code || ''}`.trim()
                                : 'No address provided'
                            }
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {selectedPatient.insurance && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Insurance Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Provider
                          </Typography>
                          <Typography variant="body1">
                            {selectedPatient.insurance.provider}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Policy Number
                          </Typography>
                          <Typography variant="body1">
                            {selectedPatient.insurance.policy_number}
                          </Typography>
                        </Grid>
                        {selectedPatient.insurance.group_number && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Group Number
                            </Typography>
                            <Typography variant="body1">
                              {selectedPatient.insurance.group_number}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            Close
          </Button>
          <Button variant="contained" onClick={() => selectedPatient && handleViewStudies(selectedPatient)}>
            View Studies
          </Button>
        </DialogActions>
      </Dialog>

      {/* Studies Dialog */}
      <Dialog
        open={showStudiesDialog}
        onClose={() => setShowStudiesDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StudyIcon />
            <Box>
              <Typography variant="h6">
                Studies for {selectedPatient?.first_name} {selectedPatient?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Patient ID: {selectedPatient?.patient_id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {patientStudies.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Study Date</TableCell>
                    <TableCell>Modality</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Series Count</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patientStudies.map((study) => (
                    <TableRow key={study.study_uid || study.id || `study-${study.patient_id}-${study.study_date}`}>
                      <TableCell>
                        {study.study_date ? formatDate(study.study_date) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip label={study.modality || 'Unknown'} size="small" />
                      </TableCell>
                      <TableCell>
                        {study.study_description || 'No description'}
                      </TableCell>
                      <TableCell>
                        {study.series_count || 0}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleViewStudyDetails(study)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleViewReport(study)}
                          >
                            Report
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <StudyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No studies found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This patient has no imaging studies yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStudiesDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CloudUploadIcon />
            <Box>
              <Typography variant="h6">
                Upload Data for {selectedPatient?.first_name} {selectedPatient?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Patient ID: {selectedPatient?.patient_id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* DICOM Upload Section */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <StudyIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      DICOM Studies
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Upload medical imaging studies (CT, MRI, X-Ray, etc.)
                    </Typography>
                    <Box
                      onClick={() => handleBrowseFiles('dicom')}
                      sx={{
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        p: 3,
                        backgroundColor: 'primary.50',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'primary.100',
                        },
                      }}
                    >
                      <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant="body2">
                        Drop DICOM files here or click to browse
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supports .dcm, .dicom files
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Documents Upload Section */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <AttachFileIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Documents
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Upload patient documents, reports, or other files
                    </Typography>
                    <Box
                      onClick={() => handleBrowseFiles('documents')}
                      sx={{
                        border: '2px dashed',
                        borderColor: 'secondary.main',
                        borderRadius: 1,
                        p: 3,
                        backgroundColor: 'secondary.50',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'secondary.100',
                        },
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
                      <Typography variant="body2">
                        Drop documents here or click to browse
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supports PDF, DOC, JPG, PNG files
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Upload Options */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upload Options
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Study Description"
                        placeholder="e.g., Chest CT with contrast"
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Modality"
                        placeholder="e.g., CT, MRI, X-Ray"
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Study Date"
                        type="date"
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Referring Physician"
                        placeholder="Dr. Smith"
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Files ({selectedFiles.length})
                </Typography>
                {selectedFiles.map((file, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AssignmentIcon color="primary" />
                    <Typography variant="body2">{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={uploadProgress.percentage} 
                    size={24}
                  />
                  <Typography variant="body2">
                    {uploadProgress.percentage.toFixed(1)}% - {uploadProgress.fileName}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload Results
                </Typography>
                {uploadResults.map((result, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Alert 
                      severity={result.success ? "success" : "error"} 
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {result.fileName}: {result.success ? 'Uploaded successfully' : result.error}
                      </Typography>
                    </Alert>
                    
                    {/* Detailed Study Information */}
                    {result.success && result.studyDetails && (
                      <Card variant="outlined" sx={{ mt: 1, bgcolor: 'grey.50' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="subtitle2" gutterBottom color="primary">
                            📊 Study Processing Details
                          </Typography>
                          
                          {/* Study Statistics */}
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="primary">
                                  {result.studyDetails.study_statistics?.total_files || 0}
                                </Typography>
                                <Typography variant="caption">Files</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="secondary">
                                  {result.studyDetails.study_statistics?.total_size_mb || 0} MB
                                </Typography>
                                <Typography variant="caption">Size</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="success.main">
                                  {result.studyDetails.study_statistics?.series_count || 0}
                                </Typography>
                                <Typography variant="caption">Series</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                <Typography variant="h6" color="info.main">
                                  {result.studyDetails.modality || 'CT'}
                                </Typography>
                                <Typography variant="caption">Modality</Typography>
                              </Box>
                            </Grid>
                          </Grid>
                          
                          {/* Processing Log */}
                          {result.processingLog && result.processingLog.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                🔄 Processing Workflow
                              </Typography>
                              <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: 'white', p: 1, borderRadius: 1 }}>
                                {result.processingLog.map((log: any, logIndex: number) => (
                                  <Box key={logIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Box 
                                      sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        bgcolor: log.status === 'completed' ? 'success.main' : 
                                                log.status === 'error' ? 'error.main' : 'warning.main'
                                      }} 
                                    />
                                    <Typography variant="caption" sx={{ flex: 1 }}>
                                      <strong>{log.step}:</strong> {log.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )}
                          
                          {/* DICOM Metadata Preview */}
                          {result.studyDetails.dicom_files && result.studyDetails.dicom_files.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                🏥 DICOM Metadata
                              </Typography>
                              <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                {result.studyDetails.dicom_files[0].metadata && (
                                  <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" display="block">
                                        <strong>Patient:</strong> {result.studyDetails.dicom_files[0].metadata.PatientName}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Study Date:</strong> {result.studyDetails.dicom_files[0].metadata.StudyDate}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Modality:</strong> {result.studyDetails.dicom_files[0].metadata.Modality}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" display="block">
                                        <strong>Study UID:</strong> {result.studyDetails.dicom_files[0].metadata.StudyInstanceUID?.substring(0, 20)}...
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Series:</strong> {result.studyDetails.dicom_files[0].metadata.SeriesDescription}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Window:</strong> {result.studyDetails.dicom_files[0].metadata.WindowCenter}/{result.studyDetails.dicom_files[0].metadata.WindowWidth}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                )}
                              </Box>
                            </Box>
                          )}
                          
                          {/* Workflow Summary */}
                          {result.workflowSummary && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                ✅ Workflow Summary
                              </Typography>
                              <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1 }}>
                                <Typography variant="caption" display="block">
                                  <strong>Status:</strong> {result.workflowSummary.status}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  <strong>Processing Time:</strong> {result.workflowSummary.processing_time_ms}ms
                                </Typography>
                                <Typography variant="caption" display="block">
                                  <strong>Next Steps:</strong> {result.workflowSummary.next_steps?.join(', ')}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Uploaded Files Display */}
          {selectedPatient && patientUploads && patientUploads.uploads && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Uploaded Files
                </Typography>
                
                {/* DICOM Files */}
                {patientUploads.uploads.dicom_files && patientUploads.uploads.dicom_files.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      DICOM Files ({patientUploads.uploads.dicom_files.length})
                    </Typography>
                    {patientUploads.uploads.dicom_files.map((file: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <StudyIcon color="primary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {file.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.file_size)} • {formatUploadDate(file.upload_date)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {/* Report Files */}
                {patientUploads.uploads.report_files && patientUploads.uploads.report_files.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Report Files ({patientUploads.uploads.report_files.length})
                    </Typography>
                    {patientUploads.uploads.report_files.map((file: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <AttachFileIcon color="secondary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {file.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.file_size)} • {formatUploadDate(file.upload_date)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {/* Other Files */}
                {patientUploads.uploads.other_files && patientUploads.uploads.other_files.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Other Files ({patientUploads.uploads.other_files.length})
                    </Typography>
                    {patientUploads.uploads.other_files.map((file: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <AssignmentIcon color="info" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {file.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.file_size)} • {formatUploadDate(file.upload_date)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> All uploaded data will be automatically processed and integrated into the patient's record. 
              DICOM files will be sent to the PACS system for storage and viewing.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowUploadDialog(false);
              setSelectedFiles([]);
              setUploadProgress(null);
              setUploadResults([]);
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<AttachFileIcon />}
            onClick={() => handleBrowseFiles()}
            disabled={isUploading}
          >
            Browse Files
          </Button>
          <Button 
            variant="contained" 
            startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            onClick={handleStartUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Uploading...' : 'Start Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Patient Dialog */}
      <Dialog
  open={showAddDialog}
  onClose={() => {
    console.log('Dialog onClose called');
    setShowAddDialog(false);
  }}
  maxWidth="md"
  fullWidth
  scroll="paper"
  sx={{
    zIndex: (theme) => theme.zIndex.modal + 100,
    '& .MuiDialog-paper': {
      zIndex: (theme) => theme.zIndex.modal + 100,
      maxHeight: '90vh',
      overflow: 'auto', // ✅ allow scrolling inside dialog
      margin: '16px',
      borderRadius: 2,
    },
  }}
>
  <DialogTitle>Add New Patient</DialogTitle>

  <DialogContent
    sx={{
      padding: 3,
      overflow: 'auto', // ✅ content scrolls if too tall
      display: 'block', // ✅ prevents flex issues with Grid
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      Add a new patient to the system. Fields marked with * are required.
    </Typography>

    <Grid container spacing={2} sx={{ width: '100%', flexWrap: 'wrap' }}>
      {/* Basic Information */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
          Basic Information
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Patient ID *"
          value={newPatient.patient_id}
          onChange={(e) => handleInputChange('patient_id', e.target.value)}
          placeholder="e.g., PAT001"
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Medical Record Number"
          value={newPatient.medical_record_number}
          onChange={(e) =>
            handleInputChange('medical_record_number', e.target.value)
          }
          placeholder="e.g., MRN123456"
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="First Name *"
          value={newPatient.first_name}
          onChange={(e) => handleInputChange('first_name', e.target.value)}
          required
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Middle Name"
          value={newPatient.middle_name}
          onChange={(e) => handleInputChange('middle_name', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Last Name *"
          value={newPatient.last_name}
          onChange={(e) => handleInputChange('last_name', e.target.value)}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Date of Birth *"
          type="date"
          value={newPatient.date_of_birth}
          onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Gender *"
          value={newPatient.gender}
          onChange={(e) => handleInputChange('gender', e.target.value)}
          SelectProps={{ native: true }}
          required
        >
          <option value="">Select Gender</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </TextField>
      </Grid>

      {/* Contact Information */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
          Contact Information
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Phone"
          value={newPatient.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="e.g., (555) 123-4567"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={newPatient.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="e.g., patient@email.com"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Address"
          value={newPatient.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Street address"
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="City"
          value={newPatient.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="State"
          value={newPatient.state}
          onChange={(e) => handleInputChange('state', e.target.value)}
          placeholder="e.g., NY"
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="ZIP Code"
          value={newPatient.zip_code}
          onChange={(e) => handleInputChange('zip_code', e.target.value)}
          placeholder="e.g., 10001"
        />
      </Grid>

      {/* Medical Information */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, mt: 2, color: 'primary.main' }}>
          Medical Information
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Allergies"
          multiline
          rows={2}
          value={newPatient.allergies}
          onChange={(e) => handleInputChange('allergies', e.target.value)}
          placeholder="List any known allergies"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Medical History"
          multiline
          rows={3}
          value={newPatient.medical_history}
          onChange={(e) =>
            handleInputChange('medical_history', e.target.value)
          }
          placeholder="Brief medical history"
        />
      </Grid>
    </Grid>
  </DialogContent>

  <DialogActions
    sx={{
      px: 3,
      pb: 2,
      position: 'sticky', // ✅ sticks to bottom
      bottom: 0,
      backgroundColor: 'background.paper',
      borderTop: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Button onClick={() => setShowAddDialog(false)} disabled={isCreatingPatient}>
      Cancel
    </Button>
    <Button
      variant="contained"
      onClick={handleCreatePatient}
      disabled={isCreatingPatient}
      startIcon={isCreatingPatient ? <CircularProgress size={20} /> : <AddIcon />}
    >
      {isCreatingPatient ? 'Creating...' : 'Add Patient'}
    </Button>
  </DialogActions>
</Dialog>

      </>
    </Fade>
  );
};

export default PatientList;