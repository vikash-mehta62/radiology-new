/**
 * Navigation3D Test Component
 * Simple test component to verify Navigation3D controls are working
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import Navigation3DControls from './Navigation3DControls';
import { 
  Navigation3DState, 
  getDefaultNavigation3DState, 
  createCompleteNavigation3DState 
} from './types/Navigation3DTypes';
import { navigation3DRenderer } from './services/Navigation3DRenderer';

const Navigation3DTestComponent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [navigationState, setNavigationState] = useState<Navigation3DState>(() => 
    getDefaultNavigation3DState({ axial: 100, sagittal: 100, coronal: 100 })
  );

  const maxSlices = { axial: 100, sagittal: 100, coronal: 100 };

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current) {
      const initialized = navigation3DRenderer.initialize(canvasRef.current);
      console.log('🧪 Test renderer initialized:', initialized);
      
      // Initial render
      navigation3DRenderer.updateRendering(navigationState);
    }
  }, []);

  // Handle state changes
  const handleStateChange = (updates: Partial<Navigation3DState>) => {
    console.log('🧪 Test state update:', updates);
    const newState = createCompleteNavigation3DState({
      ...navigationState,
      ...updates
    }, maxSlices);
    
    setNavigationState(newState);
    
    // Update rendering
    if (canvasRef.current) {
      navigation3DRenderer.updateRendering(newState);
    }
  };

  const handleReset = () => {
    console.log('🧪 Test reset');
    const defaultState = getDefaultNavigation3DState(maxSlices);
    setNavigationState(defaultState);
    
    if (canvasRef.current) {
      navigation3DRenderer.updateRendering(defaultState);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', gap: 2, p: 2 }}>
      {/* Canvas Area */}
      <Paper sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Navigation3D Test Canvas
        </Typography>
        
        <Box sx={{ flex: 1, position: 'relative', minHeight: 400 }}>
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
        
        {/* Debug Info */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" component="div">
            <strong>Current State:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            Pitch: {navigationState.pitch}°, Yaw: {navigationState.yaw}°, Roll: {navigationState.roll}°
          </Typography>
          <Typography variant="caption" component="div">
            Mode: {navigationState.renderingMode}, Opacity: {Math.round(navigationState.opacity * 100)}%
          </Typography>
          <Typography variant="caption" component="div">
            Preset: {navigationState.currentPreset}, Animating: {navigationState.isAnimating ? 'Yes' : 'No'}
          </Typography>
        </Box>
      </Paper>

      {/* Controls Area */}
      <Box sx={{ width: 350 }}>
        <Navigation3DControls
          state={navigationState}
          onStateChange={handleStateChange}
          maxSlices={maxSlices}
          onReset={handleReset}
          onRenderingUpdate={(state) => {
            console.log('🧪 Rendering update callback:', state);
          }}
          enableVolumeRendering={true}
          enableMPR={true}
          enableAnimation={true}
        />
      </Box>
    </Box>
  );
};

export default Navigation3DTestComponent;