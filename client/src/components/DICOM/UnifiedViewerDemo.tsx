/**
 * Unified DICOM Viewer Demo
 * Demonstrates the capabilities of the unified viewer with sample data
 */

import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Chip, Alert, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { PlayArrow, Info, Settings } from '@mui/icons-material';
import UnifiedDicomViewer from './UnifiedDicomViewer';
import type { Study } from '../../types';

const UnifiedViewerDemo: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string>('ct-chest');
  const [userRole, setUserRole] = useState<'radiologist' | 'referring_physician' | 'student'>('radiologist');

  // Sample study data for demonstration
  const demoStudies: Record<string, Study> = {
    'ct-chest': {
      id: 'demo-ct-001',
      study_uid: '1.2.3.4.5.6.7.8.9.demo.ct',
      patient_id: 'DEMO001',
      patient_info: {
        patient_id: 'DEMO001',
        name: 'Demo Patient',
        date_of_birth: '1980-01-01',
        gender: 'M'
      },
      study_date: '2024-01-15',
      modality: 'CT',
      exam_type: 'Chest CT',
      study_description: 'CT Chest with Contrast',
      series_description: 'Axial Images',
      status: 'completed',
      created_at: '2024-01-15T10:30:00Z',
      image_urls: Array.from({ length: 120 }, (_, i) => 
        `https://demo.dicom.server/studies/ct-chest/images/${i + 1}.dcm`
      )
    },
    'mri-brain': {
      id: 'demo-mri-001',
      study_uid: '1.2.3.4.5.6.7.8.9.demo.mri',
      patient_id: 'DEMO002',
      patient_info: {
        patient_id: 'DEMO002',
        name: 'Demo Patient 2',
        date_of_birth: '1975-05-15',
        gender: 'F'
      },
      study_date: '2024-01-16',
      modality: 'MRI',
      exam_type: 'Brain MRI',
      study_description: 'MRI Brain T1 with Gadolinium',
      series_description: 'T1 Weighted Images',
      status: 'completed',
      created_at: '2024-01-16T14:20:00Z',
      image_urls: Array.from({ length: 80 }, (_, i) => 
        `https://demo.dicom.server/studies/mri-brain/images/${i + 1}.dcm`
      )
    },
    'xray-chest': {
      id: 'demo-xr-001',
      study_uid: '1.2.3.4.5.6.7.8.9.demo.xr',
      patient_id: 'DEMO003',
      patient_info: {
        patient_id: 'DEMO003',
        name: 'Demo Patient 3',
        date_of_birth: '1990-12-10',
        gender: 'M'
      },
      study_date: '2024-01-17',
      modality: 'CR',
      exam_type: 'Chest X-Ray',
      study_description: 'Chest X-Ray PA and Lateral',
      series_description: 'Digital Radiography',
      status: 'completed',
      created_at: '2024-01-17T09:15:00Z',
      image_urls: [
        'https://demo.dicom.server/studies/xray-chest/images/pa.dcm',
        'https://demo.dicom.server/studies/xray-chest/images/lateral.dcm'
      ]
    }
  };

  const currentStudy = demoStudies[selectedDemo];

  const getStudyTypeInfo = (study: Study) => {
    const imageCount = study.image_urls?.length || 0;
    if (imageCount > 50) return { type: 'Volume Study', color: 'primary' as const };
    if (imageCount > 1) return { type: 'Multi-Frame', color: 'secondary' as const };
    return { type: 'Single Frame', color: 'default' as const };
  };

  const studyInfo = getStudyTypeInfo(currentStudy);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Demo Header */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              🏥 Unified DICOM Viewer Demo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Industry-standard medical imaging viewer with adaptive intelligence
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Demo Study</InputLabel>
                  <Select
                    value={selectedDemo}
                    label="Demo Study"
                    onChange={(e) => setSelectedDemo(e.target.value)}
                  >
                    <MenuItem value="ct-chest">CT Chest (120 slices)</MenuItem>
                    <MenuItem value="mri-brain">MRI Brain (80 slices)</MenuItem>
                    <MenuItem value="xray-chest">X-Ray Chest (2 views)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>User Role</InputLabel>
                  <Select
                    value={userRole}
                    label="User Role"
                    onChange={(e) => setUserRole(e.target.value as any)}
                  >
                    <MenuItem value="radiologist">Radiologist</MenuItem>
                    <MenuItem value="referring_physician">Referring Physician</MenuItem>
                    <MenuItem value="student">Student</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Study Information */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={currentStudy.modality} 
            color="primary" 
            size="small" 
          />
          <Chip 
            label={studyInfo.type} 
            color={studyInfo.color} 
            size="small" 
          />
          <Chip 
            label={`${currentStudy.image_urls?.length || 0} images`} 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            label={`User: ${userRole}`} 
            variant="outlined" 
            size="small" 
          />
        </Box>
      </Paper>

      {/* Demo Features Alert */}
      <Alert severity="info" sx={{ mb: 1 }}>
        <Typography variant="body2">
          <strong>Demo Features:</strong> This viewer automatically adapts based on study type ({studyInfo.type.toLowerCase()}) 
          and modality ({currentStudy.modality}). Tools and interface adjust for {userRole} workflow.
        </Typography>
      </Alert>

      {/* Unified Viewer */}
      <Box sx={{ flex: 1 }}>
        <UnifiedDicomViewer
          key={`${selectedDemo}-${userRole}`} // Force re-render on changes
          study={currentStudy}
          userRole={userRole}
          viewerMode="diagnostic"
          enableAdvancedTools={userRole === 'radiologist'}
          enableCollaboration={false}
          enableAI={userRole === 'radiologist'}
          onError={(error) => {
            console.error('Demo Viewer Error:', error);
          }}
        />
      </Box>

      {/* Demo Footer */}
      <Paper sx={{ p: 1, mt: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="caption" color="text.secondary">
              🎯 <strong>Code Reduction:</strong> This single viewer replaces 5 separate viewers, 
              reducing codebase by 84.6% (221KB → 34KB) while providing adaptive functionality.
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                startIcon={<Info />}
                onClick={() => window.open('/components/DICOM/MIGRATION_GUIDE.md', '_blank')}
              >
                Migration Guide
              </Button>
              <Button
                size="small"
                startIcon={<Settings />}
                onClick={() => window.open('/components/DICOM/CODE_REDUCTION_ANALYSIS.md', '_blank')}
              >
                Analysis
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default UnifiedViewerDemo;