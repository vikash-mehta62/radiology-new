/**
 * Device Discovery Page
 * Main page component for medical device discovery and management
 */

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { DeviceDiscoveryDashboard } from '../components/DeviceDiscoveryDashboard';

const DeviceDiscovery: React.FC = () => {
  return (
    <Box sx={{ 
      flexGrow: 1, 
      bgcolor: 'background.default',
      minHeight: '100vh',
      py: 3
    }}>
      <Container maxWidth="xl">
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              mb: 1
            }}
          >
            Medical Device Discovery
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: 600
            }}
          >
            Discover, test, and manage medical devices on your network. 
            This system safely identifies DICOM devices, PACS systems, and imaging equipment 
            without disrupting clinical operations.
          </Typography>
        </Box>

        {/* Main Dashboard */}
        <DeviceDiscoveryDashboard />
      </Container>
    </Box>
  );
};

export default DeviceDiscovery;