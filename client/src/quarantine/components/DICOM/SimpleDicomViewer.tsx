import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import type { Study } from '../../types';

interface SimpleDicomViewerProps {
  study: Study;
  onError?: (error: string) => void;
}

const SimpleDicomViewer: React.FC<SimpleDicomViewerProps> = ({ study, onError }) => {
  const handleImageError = (error: string) => {
    console.error('Simple DICOM Viewer Error:', error);
    if (onError) {
      onError(error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          DICOM Study Viewer
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Study: {study.study_description || 'No description'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Patient: {study.patient_id}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Modality: {study.modality}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date: {study.study_date}
        </Typography>
      </Paper>

      <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {study.image_urls && study.image_urls.length > 0 ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              DICOM Image Available
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              File: {study.original_filename || 'Unknown'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Size: {study.file_size ? `${Math.round(study.file_size / 1024)} KB` : 'Unknown'}
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              DICOM file is available for download. Professional DICOM viewer initialization is in progress.
            </Alert>
            {study.dicom_url && (
              <Box sx={{ mt: 2 }}>
                <a 
                  href={`http://localhost:8000${study.dicom_url}`} 
                  download={study.original_filename}
                  style={{ textDecoration: 'none' }}
                >
                  <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                    Download DICOM File
                  </Typography>
                </a>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No DICOM Images Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This study does not contain viewable DICOM images.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SimpleDicomViewer;