import React from 'react';
import { Box, Container, Typography, Paper, Alert } from '@mui/material';
import UnifiedViewerTest from '../components/DICOM/UnifiedViewerTest';

const EnhancedViewerTestPage: React.FC = () => {
  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Enhanced DICOM Viewer Test Suite
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Phase 1 Implementation Testing
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Phase 1 Testing Environment</strong><br />
            This page provides isolated testing for the new Enhanced DICOM Viewer components 
            with Cornerstone3D 2.0 integration. Test new features safely without affecting 
            the production viewer.
          </Typography>
        </Alert>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            What's New in Phase 1:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">
                <strong>EnhancedViewerCore:</strong> New viewer component with Cornerstone3D 2.0 integration
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>GPU Acceleration:</strong> WebGPU support for enhanced performance
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Performance Monitoring:</strong> Real-time metrics and optimization recommendations
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Volume Rendering:</strong> Optional 3D volume rendering capabilities
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Advanced Controls:</strong> Enhanced zoom, pan, window/level controls
              </Typography>
            </li>
          </Box>
        </Paper>
      </Box>

      <UnifiedViewerTest />
    </Container>
  );
};

export default EnhancedViewerTestPage;