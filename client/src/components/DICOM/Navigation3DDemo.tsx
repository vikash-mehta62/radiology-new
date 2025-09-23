/**
 * Navigation3D Demo Component
 * Demonstrates the complete 3D navigation system with real-time rendering
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import Navigation3DControls, { 
  Navigation3DState, 
  getDefaultNavigation3DState, 
  createCompleteNavigation3DState 
} from './Navigation3DControls';
import { navigation3DRenderer } from './services/Navigation3DRenderer';

interface ViewerState {
  navigation3D: Navigation3DState;
  imageData?: ImageData;
  totalFrames: number;
}

export const Navigation3DDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Central viewer state with complete navigation3D object
  const [viewerState, setViewerState] = useState<ViewerState>(() => ({
    navigation3D: getDefaultNavigation3DState({ axial: 100, sagittal: 100, coronal: 100 }),
    totalFrames: 100
  }));

  // Initialize renderer when component mounts
  useEffect(() => {
    if (canvasRef.current && !isInitialized) {
      const success = navigation3DRenderer.initialize(canvasRef.current);
      if (success) {
        setIsInitialized(true);
        console.log('✅ Navigation3D Demo: Renderer initialized');
        
        // Initial render
        navigation3DRenderer.updateRendering(viewerState.navigation3D);
      } else {
        console.error('❌ Navigation3D Demo: Failed to initialize renderer');
      }
    }
  }, [isInitialized, viewerState.navigation3D]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && isInitialized) {
        const rect = canvasRef.current.getBoundingClientRect();
        navigation3DRenderer.resize(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInitialized]);

  // Handle navigation state changes with real-time rendering
  const handleNavigationChange = (updates: Partial<Navigation3DState>) => {
    console.log('🔄 Navigation3D Demo: State update', updates);
    
    // Always merge with complete state, never replace with partial
    const newNavigationState = createCompleteNavigation3DState({
      ...viewerState.navigation3D,
      ...updates
    }, {
      axial: viewerState.totalFrames,
      sagittal: viewerState.totalFrames,
      coronal: viewerState.totalFrames
    });

    // Update viewer state
    setViewerState(prev => ({
      ...prev,
      navigation3D: newNavigationState
    }));

    // Trigger real-time rendering update
    if (isInitialized) {
      navigation3DRenderer.updateRendering(newNavigationState, viewerState.imageData);
    }
  };

  // Handle preset application
  const handlePresetApply = (presetId: string) => {
    console.log(`🎯 Navigation3D Demo: Applied preset ${presetId}`);
  };

  // Handle reset
  const handleReset = () => {
    console.log('🔄 Navigation3D Demo: Reset to defaults');
    const defaultState = getDefaultNavigation3DState({
      axial: viewerState.totalFrames,
      sagittal: viewerState.totalFrames,
      coronal: viewerState.totalFrames
    });
    
    setViewerState(prev => ({
      ...prev,
      navigation3D: defaultState
    }));

    if (isInitialized) {
      navigation3DRenderer.updateRendering(defaultState, viewerState.imageData);
    }
  };

  // Real-time rendering callback
  const handleRenderingUpdate = (navigationState: Navigation3DState) => {
    if (isInitialized) {
      navigation3DRenderer.updateRendering(navigationState, viewerState.imageData);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ p: 2 }}>
        Navigation3D System Demo
      </Typography>
      
      <Grid container sx={{ flexGrow: 1 }}>
        {/* 3D Viewer Canvas */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', m: 1, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                backgroundColor: '#000'
              }}
            />
            
            {/* Status Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: 1,
                borderRadius: 1,
                fontSize: '0.875rem'
              }}
            >
              <Typography variant="body2">
                Renderer: {isInitialized ? '✅ Active' : '❌ Not Initialized'}
              </Typography>
              <Typography variant="body2">
                Mode: {viewerState.navigation3D.renderingMode.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                Preset: {viewerState.navigation3D.currentPreset.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                Rotation: P:{viewerState.navigation3D.pitch}° Y:{viewerState.navigation3D.yaw}° R:{viewerState.navigation3D.roll}°
              </Typography>
              <Typography variant="body2">
                Opacity: {Math.round(viewerState.navigation3D.opacity * 100)}%
              </Typography>
              {viewerState.navigation3D.isAnimating && (
                <Typography variant="body2" sx={{ color: '#ff4444' }}>
                  🎬 ANIMATING ({viewerState.navigation3D.animationSpeed}x)
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Navigation Controls */}
        <Grid item xs={12} md={4}>
          <Navigation3DControls
            state={viewerState.navigation3D}
            onStateChange={handleNavigationChange}
            maxSlices={{
              axial: viewerState.totalFrames,
              sagittal: viewerState.totalFrames,
              coronal: viewerState.totalFrames
            }}
            onPresetApply={handlePresetApply}
            onReset={handleReset}
            onRenderingUpdate={handleRenderingUpdate}
            enableVolumeRendering={true}
            enableMPR={true}
            enableAnimation={true}
          />
        </Grid>
      </Grid>

      {/* Debug Information */}
      <Paper sx={{ m: 1, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Debug Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Current Navigation State:</Typography>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(viewerState.navigation3D, null, 2)}
            </pre>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">System Status:</Typography>
            <ul style={{ fontSize: '0.875rem' }}>
              <li>Renderer Initialized: {isInitialized ? '✅ Yes' : '❌ No'}</li>
              <li>Canvas Available: {canvasRef.current ? '✅ Yes' : '❌ No'}</li>
              <li>WebGL Support: {canvasRef.current?.getContext('webgl') ? '✅ Yes' : '❌ No'}</li>
              <li>Total Frames: {viewerState.totalFrames}</li>
              <li>Current Preset: {viewerState.navigation3D.currentPreset}</li>
              <li>Animation Active: {viewerState.navigation3D.isAnimating ? '✅ Yes' : '❌ No'}</li>
            </ul>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Navigation3DDemo;