/**
 * Navigation3D Diagnostic Component
 * Helps debug Navigation3D issues
 */

import React from 'react';
import { Box, Typography, Paper, Chip, Stack, Alert } from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';
import { Navigation3DState } from './types/Navigation3DTypes';

interface Navigation3DDiagnosticProps {
  navigationState: Navigation3DState;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  sidebarOpen: boolean;
  enableAdvancedTools: boolean;
}

const Navigation3DDiagnostic: React.FC<Navigation3DDiagnosticProps> = ({
  navigationState,
  canvasRef,
  sidebarOpen,
  enableAdvancedTools
}) => {
  const canvasAvailable = !!canvasRef.current;
  
  // More thorough WebGL testing
  let webglSupported = false;
  let webglError = '';
  
  if (canvasRef.current) {
    try {
      const gl = canvasRef.current.getContext('webgl') || canvasRef.current.getContext('experimental-webgl');
      webglSupported = !!gl;
      if (!gl) {
        webglError = 'WebGL context creation failed';
      }
    } catch (error) {
      webglError = `WebGL error: ${error}`;
    }
  } else {
    webglError = 'Canvas not available';
  }

  const diagnostics = [
    {
      name: 'Advanced Tools Enabled',
      status: enableAdvancedTools,
      severity: enableAdvancedTools ? 'success' : 'error'
    },
    {
      name: 'Sidebar Open',
      status: sidebarOpen,
      severity: sidebarOpen ? 'success' : 'warning'
    },
    {
      name: 'Canvas Available',
      status: canvasAvailable,
      severity: canvasAvailable ? 'success' : 'error'
    },
    {
      name: 'WebGL Support',
      status: webglSupported,
      severity: webglSupported ? 'success' : 'warning'
    },
    {
      name: 'Navigation State Valid',
      status: navigationState && typeof navigationState.pitch === 'number',
      severity: (navigationState && typeof navigationState.pitch === 'number') ? 'success' : 'error'
    }
  ];

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🔧 Navigation3D Diagnostics
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {diagnostics.map((diagnostic) => (
          <Box key={diagnostic.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {diagnostic.severity === 'success' && <CheckCircle color="success" fontSize="small" />}
            {diagnostic.severity === 'warning' && <Warning color="warning" fontSize="small" />}
            {diagnostic.severity === 'error' && <Error color="error" fontSize="small" />}
            
            <Typography variant="body2" sx={{ flex: 1 }}>
              {diagnostic.name}
            </Typography>
            
            <Chip
              label={diagnostic.status ? 'OK' : 'FAIL'}
              size="small"
              color={diagnostic.severity as any}
              variant={diagnostic.status ? 'filled' : 'outlined'}
            />
          </Box>
        ))}
      </Stack>

      {navigationState && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Current Navigation State:</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1 }}>
            <Chip label={`Pitch: ${navigationState.pitch}°`} size="small" />
            <Chip label={`Yaw: ${navigationState.yaw}°`} size="small" />
            <Chip label={`Roll: ${navigationState.roll}°`} size="small" />
            <Chip label={`Mode: ${navigationState.renderingMode}`} size="small" />
            <Chip label={`Opacity: ${Math.round(navigationState.opacity * 100)}%`} size="small" />
            <Chip label={`Preset: ${navigationState.currentPreset}`} size="small" />
          </Box>
        </Box>
      )}

      {!enableAdvancedTools && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Advanced Tools are disabled. Navigation3D controls will not be visible.
        </Alert>
      )}

      {!sidebarOpen && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Sidebar is closed. Click the sidebar toggle button in the toolbar to open Navigation3D controls.
        </Alert>
      )}

      {!canvasAvailable && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Canvas element is not available. 3D rendering will not work.
        </Alert>
      )}

      {!webglSupported && canvasAvailable && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <strong>WebGL Issue:</strong> {webglError}
          <br />
          <strong>Solution:</strong> Navigation3D will use 2D Canvas fallback for visual feedback.
          <br />
          <strong>Note:</strong> Controls will still work, but 3D rendering may be limited.
        </Alert>
      )}
    </Paper>
  );
};

export default Navigation3DDiagnostic;