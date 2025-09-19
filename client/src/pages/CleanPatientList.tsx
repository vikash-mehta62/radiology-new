import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, TextField, InputAdornment, Avatar, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, List,
  ListItem, ListItemText, ListItemIcon, Divider, Alert
} from '@mui/material';
import {
  Person, Search, Upload, Visibility, Image, Add,
  Phone, Email, CalendarToday, Badge, Close
} from '@mui/icons-material';
import { patientService, Patient as PatientType } from '../services/patientService';
import SimpleDicomUpload from '../components/Upload/SimpleDicomUpload';

const CleanPatientList: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientType | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [patientStudies, setPatientStudies] = useState<any[]>([]);
  const [showStudies, setShowStudies] = useState(false);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatients();
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientStudies = async (patientId: string) => {
    try {
      const response = await patientService.getPatientStudies(patientId);
      setPatientStudies(response.studies || []);
      setShowStudies(true);
    } catch (error) {
      console.error('Failed to load patient studies:', error);
    }
  };

  const handleViewStudy = (studyUid: string) => {
    navigate(`/studies/${studyUid}`);
  };

  const filteredPatients = patients.filter(patient =>
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              🏥 Patient Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage patients and their medical imaging studies
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: '#f8f9fa' }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Patient Cards */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">Loading patients...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredPatients.map((patient) => (
            <Grid item xs={12} sm={6} md={4} key={patient.patient_id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: '#1976d2', 
                        width: 56, 
                        height: 56, 
                        mr: 2 
                      }}
                    >
                      <Person sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {patient.first_name} {patient.last_name}
                      </Typography>
                      <Chip 
                        label={patient.patient_id} 
                        size="small" 
                        color="primary"
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {patient.date_of_birth && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          DOB: {patient.date_of_birth}
                        </Typography>
                      </Box>
                    )}
                    
                    {patient.gender && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Gender: {patient.gender}
                        </Typography>
                      </Box>
                    )}

                    {patient.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {patient.phone}
                        </Typography>
                      </Box>
                    )}

                    {patient.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {patient.email}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Button
                    startIcon={<Visibility />}
                    onClick={() => {
                      setSelectedPatient(patient);
                      loadPatientStudies(patient.patient_id);
                    }}
                    variant="outlined"
                    size="small"
                  >
                    View Studies
                  </Button>
                  <Button
                    startIcon={<Upload />}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowUpload(true);
                    }}
                    variant="contained"
                    size="small"
                  >
                    Upload
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredPatients.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No patients found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'Try adjusting your search terms' : 'No patients in the system'}
          </Typography>
        </Paper>
      )}

      {/* Upload Dialog */}
      <Dialog 
        open={showUpload} 
        onClose={() => setShowUpload(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              📤 Upload DICOM Files - {selectedPatient?.first_name} {selectedPatient?.last_name}
            </Typography>
            <IconButton onClick={() => setShowUpload(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <SimpleDicomUpload
              patientId={selectedPatient.patient_id}
              onUploadComplete={() => {
                setShowUpload(false);
                loadPatients(); // Refresh patient list
              }}
              onError={(error) => console.error('Upload error:', error)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Studies Dialog */}
      <Dialog 
        open={showStudies} 
        onClose={() => setShowStudies(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              📊 Studies - {selectedPatient?.first_name} {selectedPatient?.last_name}
            </Typography>
            <IconButton onClick={() => setShowStudies(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {patientStudies.length === 0 ? (
            <Alert severity="info">
              No studies found for this patient. Upload DICOM files to get started.
            </Alert>
          ) : (
            <List>
              {patientStudies.map((study, index) => (
                <React.Fragment key={study.study_uid || index}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleViewStudy(study.study_uid)}
                  >
                    <ListItemIcon>
                      <Image color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={study.original_filename || study.study_description}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Date: {study.study_date || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Modality: {study.modality || 'Unknown'}
                          </Typography>
                          {(study as any).processing_status && (
                            <Chip 
                              label={(study as any).processing_status}
                              size="small"
                              color={(study as any).processing_status === 'completed' ? 'success' : 'warning'}
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < patientStudies.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStudies(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CleanPatientList;