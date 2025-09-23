/**
 * Navigation3D Test Page - Complete test environment
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Alert, Button, Stack } from '@mui/material';
import Navigation3DSimple from './Navigation3DSimple';
import Navigation3DDebugTest from './Navigation3DDebugTest';
import { navigation3DRenderer } from './services/Navigation3DRenderer';

const Navigation3DTestPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendererInitialized, setRendererInitialized] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    if (canvasRef.current) {
      const initialized = navigation3DRenderer.initialize(canvasRef.current);
      setRendererInitialized(initialized);
      console.log('🧪 Test page renderer initialized:', initialized);
    }
  }, []);

  const addTestResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const handleSimpleStateChange = (state: any) => {
    addTestResult(`Simple controls: P:${state.pitch}° Y:${state.yaw}° R:${state.roll}° O:${Math.round(state.opacity * 100)}%`);
    
    // Update renderer if available
    if (canvasRef.current && rendererInitialized) {
      // Create a mock Navigation3DState for the renderer
      const mockState = {
        pitch: state.pitch,
        yaw: state.yaw,
        roll: state.roll,
        opacity: state.opacity,
        volumeOpacity: 0.8,
        surfaceOpacity: 1,
        axialSlice: 50,
        sagittalSlice: 50,
        coronalSlice: 50,
        clipNear: 0,
        clipFar: 100,
        renderingMode: state.renderingMode,
        isAnimating: false,
        animationSpeed: 1,
        currentPreset: state.currentPreset,
        annotations: [],
        layers: [],
        groups: []
      };
      
      navigation3DRenderer.updateRendering(mockState as any);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h3" gutterBottom>
        🔧 Navigation3D Test Environment
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This page tests all Navigation3D components. Check the console and test results below.
      </Alert>

      <Grid container spacing={3}>
        {/* Simple Controls Test */}
        <Grid item xs={12} md={4}>
          <Typography variant="h5" gutterBottom>
            Simple Controls Test
          </Typography>
          <Navigation3DSimple onStateChange={handleSimpleStateChange} />
        </Grid>

        {/* Canvas Test */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom>
              Renderer Test Canvas
            </Typography>
            
            <Alert 
              severity={rendererInitialized ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              Renderer: {rendererInitialized ? 'Initialized ✅' : 'Failed ❌'}
            </Alert>

            <Box sx={{ position: 'relative', height: 300, mb: 2 }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  background: '#000'
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary">
              This canvas should show visual changes when you move the controls on the left.
            </Typography>
          </Paper>
        </Grid>

        {/* Test Results */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Test Results
              </Typography>
              <Button size="small" onClick={clearResults}>
                Clear
              </Button>
            </Box>
            
            <Box sx={{ 
              maxHeight: 400, 
              overflow: 'auto', 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.75rem'
            }}>
              {testResults.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No test results yet. Try using the controls on the left.
                </Typography>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {result}
                  </div>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Debug Test Component */}
        <Grid item xs={12}>
          <Navigation3DDebugTest />
        </Grid>
      </Grid>

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          🎯 How to Test
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            1. <strong>Move the sliders</strong> in the "Simple Controls Test" section
          </Typography>
          <Typography variant="body2">
            2. <strong>Click preset buttons</strong> (Anterior, Posterior, Left, Right)
          </Typography>
          <Typography variant="body2">
            3. <strong>Check the console</strong> for detailed logs (F12 → Console)
          </Typography>
          <Typography variant="body2">
            4. <strong>Watch the test results</strong> panel for real-time feedback
          </Typography>
          <Typography variant="body2">
            5. <strong>Observe the canvas</strong> for visual changes (if renderer is working)
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Navigation3DTestPage;