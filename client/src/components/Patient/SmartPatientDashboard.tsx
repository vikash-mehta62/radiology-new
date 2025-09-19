import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent, CardMedia,
    Button, Chip, IconButton, Avatar, LinearProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from '@mui/material';
import {
    Person, Upload, Visibility, Image, Timeline,
    CheckCircle, Error, Warning, Info, Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import SmartDicomUpload from '../Upload/SmartDicomUpload';
import type { Patient } from '../../types';

interface SmartPatientDashboardProps {
    patient: Patient;
    onStudyUpdate?: () => void;
}

interface StudyPreview {
    study_uid: string;
    original_filename: string;
    study_description: string;
    study_date: string;
    modality: string;
    processing_status?: string;
    preview_url?: string;
    thumbnail_url?: string;
    processed_images?: any;
    file_size?: number;
}

const SmartPatientDashboard: React.FC<SmartPatientDashboardProps> = ({
    patient,
    onStudyUpdate
}) => {
    const navigate = useNavigate();
    const [studies, setStudies] = useState<StudyPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadStats, setUploadStats] = useState({
        total: 0,
        processed: 0,
        withImages: 0
    });

    const loadPatientStudies = async () => {
        try {
            setLoading(true);
            const response = await patientService.getPatientStudies(patient.patient_id);

            if (response.studies) {
                setStudies(response.studies);

                // Calculate stats
                const stats = {
                    total: response.studies.length,
                    processed: response.studies.filter(s => (s as any).processing_status === 'completed').length,
                    withImages: response.studies.filter(s =>
                        (s as any).processed_images || (s as any).preview_url || (s as any).thumbnail_url
                    ).length
                };
                setUploadStats(stats);
            }
        } catch (error) {
            console.error('Failed to load patient studies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewStudy = (studyUid: string) => {
        navigate(`/studies/${studyUid}`);
    };

    const handleUploadComplete = (results: any[]) => {
        console.log('📊 Upload completed:', results);
        setShowUpload(false);
        loadPatientStudies(); // Refresh studies
        if (onStudyUpdate) {
            onStudyUpdate();
        }
    };

    const getProcessingStatusColor = (status?: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'processing': return 'warning';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const getImagePreview = (study: StudyPreview) => {
        const studyAny = study as any;

        // Priority: processed images > preview > thumbnail
        const imageUrl =
            studyAny.processed_images?.preview ||
            studyAny.processed_images?.thumbnail ||
            studyAny.preview_url ||
            studyAny.thumbnail_url;

        if (imageUrl) {
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:8000/${imageUrl}`;
            return fullUrl;
        }

        return null;
    };

    useEffect(() => {
        loadPatientStudies();
    }, [patient.patient_id]);

    return (
        <Box>
            {/* Smart Patient Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item>
                        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                            <Person sx={{ fontSize: 32 }} />
                        </Avatar>
                    </Grid>

                    <Grid item xs>
                        <Typography variant="h5" gutterBottom>
                            🧠 Smart Patient Dashboard
                        </Typography>
                        <Typography variant="h6" color="primary" gutterBottom>
                            {patient.first_name} {patient.last_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip label={`ID: ${patient.patient_id}`} size="small" />
                            <Chip label={patient.gender || 'Unknown'} size="small" variant="outlined" />
                            {patient.date_of_birth && (
                                <Chip label={`DOB: ${patient.date_of_birth}`} size="small" variant="outlined" />
                            )}
                        </Box>
                    </Grid>

                    <Grid item>
                        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                            <Button
                                startIcon={<Upload />}
                                onClick={() => setShowUpload(true)}
                                variant="contained"
                                size="large"
                            >
                                Smart Upload
                            </Button>
                            <Button
                                startIcon={<Refresh />}
                                onClick={loadPatientStudies}
                                variant="outlined"
                                size="small"
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {/* Smart Stats */}
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                    <Typography variant="h4" color="primary">
                                        {uploadStats.total}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Studies
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                    <Typography variant="h4" color="success.main">
                                        {uploadStats.processed}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Processed
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Card variant="outlined">
                                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                    <Typography variant="h4" color="info.main">
                                        {uploadStats.withImages}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        With Images
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            {/* Smart Studies Grid */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography>Loading smart studies...</Typography>
                </Box>
            ) : studies.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        No studies found for this patient
                    </Typography>
                    <Typography variant="body2">
                        Upload DICOM files to get started with intelligent medical imaging.
                    </Typography>
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {studies.map((study) => {
                        const imagePreview = getImagePreview(study);
                        const studyAny = study as any;

                        return (
                            <Grid item xs={12} sm={6} md={4} key={study.study_uid}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4
                                        }
                                    }}
                                    onClick={() => handleViewStudy(study.study_uid)}
                                >
                                    {/* Image Preview */}
                                    {imagePreview ? (
                                        <CardMedia
                                            component="img"
                                            height="200"
                                            image={imagePreview}
                                            alt={study.original_filename}
                                            sx={{
                                                objectFit: 'contain',
                                                bgcolor: 'grey.100'
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                height: 200,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.100'
                                            }}
                                        >
                                            <Image sx={{ fontSize: 48, color: 'grey.400' }} />
                                        </Box>
                                    )}

                                    <CardContent>
                                        <Typography variant="subtitle1" gutterBottom noWrap>
                                            {study.original_filename}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {study.study_description || 'DICOM Study'}
                                        </Typography>

                                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                                            <Chip
                                                label={study.modality || 'Unknown'}
                                                size="small"
                                                color="primary"
                                            />
                                            <Chip
                                                label={study.study_date || 'No date'}
                                                size="small"
                                                variant="outlined"
                                            />
                                            {studyAny.processing_status && (
                                                <Chip
                                                    label={studyAny.processing_status}
                                                    size="small"
                                                    color={getProcessingStatusColor(studyAny.processing_status) as any}
                                                />
                                            )}
                                        </Box>

                                        {/* Smart Features */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {imagePreview && (
                                                    <Chip
                                                        icon={<Image />}
                                                        label="Preview"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                )}
                                                {studyAny.dicom_metadata && (
                                                    <Chip
                                                        icon={<Info />}
                                                        label="Metadata"
                                                        size="small"
                                                        color="info"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>

                                            <Typography variant="caption" color="text.secondary">
                                                {study.file_size ? `${Math.round(study.file_size / 1024)} KB` : ''}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Smart Upload Dialog */}
            <Dialog
                open={showUpload}
                onClose={() => setShowUpload(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    🧠 Smart DICOM Upload - {patient.first_name} {patient.last_name}
                </DialogTitle>
                <DialogContent>
                    <SmartDicomUpload
                        patientId={patient.patient_id}
                        onUploadComplete={handleUploadComplete}
                        onError={(error) => console.error('Upload error:', error)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowUpload(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SmartPatientDashboard;