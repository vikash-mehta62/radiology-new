/**
 * Navigation3D Main Canvas - Works directly with main DICOM viewer canvas
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Slider, Button, Stack, Chip,
  FormControl, InputLabel, Select, MenuItem, Alert, Grid
} from '@mui/material';
import { ThreeDRotation, RestartAlt, Visibility } from '@mui/icons-material';

interface Navigation3DMainCanvasState {
  pitch: number;
  yaw: number;
  roll: number;
  opacity: number;
  renderingMode: string;
  currentPreset: string;
}

interface Navigation3DMainCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onStateChange?: (state: Navigation3DMainCanvasState) => void;
}

const Navigation3DMainCanvas: React.FC<Navigation3DMainCanvasProps> = ({ 
  canvasRef, 
  onStateChange 
}) => {
  const [state, setState] = useState<Navigation3DMainCanvasState>({
    pitch: 0,
    yaw: 0,
    roll: 0,
    opacity: 1,
    renderingMode: '3d',
    currentPreset: 'anterior'
  });

  const [canvasStatus, setCanvasStatus] = useState<string>('Checking...');

  // Check canvas availability
  useEffect(() => {
    if (canvasRef.current) {
      setCanvasStatus('✅ Main Canvas Connected');
      console.log('🔗 Navigation3D connected to main canvas:', canvasRef.current);
    } else {
      setCanvasStatus('❌ Main Canvas Not Available');
    }
  }, [canvasRef]);

  // Apply 3D transformations to main canvas
  const applyTransformToMainCanvas = (currentState: Navigation3DMainCanvasState) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Main canvas not available for transformation');
      return;
    }

    try {
      // Apply CSS transforms to the main canvas for 3D effect
      const pitchRad = (currentState.pitch * Math.PI) / 180;
      const yawRad = (currentState.yaw * Math.PI) / 180;
      const rollRad = (currentState.roll * Math.PI) / 180;

      // Convert to CSS transform
      const rotateX = `rotateX(${currentState.pitch}deg)`;
      const rotateY = `rotateY(${currentState.yaw}deg)`;
      const rotateZ = `rotateZ(${currentState.roll}deg)`;
      const scale = `scale(${0.5 + currentState.opacity * 0.5})`;

      const transform = `perspective(1000px) ${rotateX} ${rotateY} ${rotateZ} ${scale}`;

      // Apply transform to canvas
      canvas.style.transform = transform;
      canvas.style.opacity = currentState.opacity.toString();

      console.log('🎯 Applied 3D transform to main canvas:', {
        pitch: currentState.pitch,
        yaw: currentState.yaw,
        roll: currentState.roll,
        opacity: currentState.opacity,
        transform
      });

      // Add visual indicator overlay
      addTransformIndicator(canvas, currentState);

    } catch (error) {
      console.error('❌ Error applying transform to main canvas:', error);
    }
  };

  // Add visual indicator overlay to show 3D state
  const addTransformIndicator = (canvas: HTMLCanvasElement, currentState: Navigation3DMainCanvasState) => {
    // Remove existing indicator
    const existingIndicator = document.getElementById('nav3d-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'nav3d-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      border: 2px solid #4CAF50;
    `;
    
    indicator.innerHTML = `
      <div style="color: #4CAF50; font-weight: bold;">🎯 3D Navigation Active</div>
      <div>Pitch: ${currentState.pitch}°</div>
      <div>Yaw: ${currentState.yaw}°</div>
      <div>Roll: ${currentState.roll}°</div>
      <div>Opacity: ${Math.round(currentState.opacity * 100)}%</div>
      <div>Mode: ${currentState.renderingMode.toUpperCase()}</div>
      <div>Preset: ${currentState.currentPreset.toUpperCase()}</div>
    `;

    // Add to canvas parent
    const canvasParent = canvas.parentElement;
    if (canvasParent) {
      canvasParent.style.position = 'relative';
      canvasParent.appendChild(indicator);
    }
  };

  const updateState = (updates: Partial<Navigation3DMainCanvasState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    onStateChange?.(newState);
    
    // Apply transformation to main canvas
    applyTransformToMainCanvas(newState);
    
    console.log('🎯 Navigation3D Main Canvas state updated:', updates, 'New state:', newState);
  };

  // Apply initial state
  useEffect(() => {
    if (canvasRef.current) {
      applyTransformToMainCanvas(state);
    }
  }, [canvasRef.current]);

  const handlePitchChange = (event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ pitch: numValue });
  };

  const handleYawChange = (event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ yaw: numValue });
  };

  const handleRollChange = (event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ roll: numValue });
  };

  const handleOpacityChange = (event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ opacity: numValue });
  };

  const handlePresetClick = (preset: string, pitch: number, yaw: number, roll: number) => {
    updateState({ 
      currentPreset: preset,
      pitch,
      yaw,
      roll
    });
  };

  const handleReset = () => {
    updateState({
      pitch: 0,
      yaw: 0,
      roll: 0,
      opacity: 1,
      renderingMode: '3d',
      currentPreset: 'anterior'
    });
  };

  const resetCanvasTransform = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transform = 'none';
      canvas.style.opacity = '1';
      
      // Remove indicator
      const indicator = document.getElementById('nav3d-indicator');
      if (indicator) {
        indicator.remove();
      }
      
      console.log('🔄 Reset main canvas transform');
    }
  };

  return (
    <Paper sx={{ width: 350, p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ThreeDRotation />
        3D Navigation (Main Canvas)
        <Chip label="LIVE" size="small" color="success" />
      </Typography>

      {/* Canvas Status */}
      <Alert 
        severity={canvasStatus.includes('✅') ? 'success' : 'error'} 
        sx={{ mb: 2, fontSize: '0.8rem' }}
      >
        <strong>Main Canvas Status:</strong> {canvasStatus}
        <br />
        <strong>Target:</strong> Main DICOM Viewer Canvas
      </Alert>

      {/* Current State Display */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>
          🎯 Active 3D Transform
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          <Chip label={`P: ${state.pitch}°`} size="small" color="primary" />
          <Chip label={`Y: ${state.yaw}°`} size="small" color="secondary" />
          <Chip label={`R: ${state.roll}°`} size="small" color="info" />
          <Chip label={`${Math.round(state.opacity * 100)}%`} size="small" />
          <Chip label={state.currentPreset.toUpperCase()} size="small" variant="outlined" />
        </Stack>
      </Box>

      {/* Rendering Mode */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Rendering Mode</InputLabel>
        <Select
          value={state.renderingMode}
          label="Rendering Mode"
          onChange={(e) => updateState({ renderingMode: e.target.value })}
        >
          <MenuItem value="3d">3D Volume</MenuItem>
          <MenuItem value="mpr">MPR Views</MenuItem>
          <MenuItem value="volume">Volume Rendering</MenuItem>
          <MenuItem value="surface">Surface Rendering</MenuItem>
        </Select>
      </FormControl>

      {/* View Presets */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>View Presets</Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Button
              size="small"
              variant={state.currentPreset === 'anterior' ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick('anterior', 0, 0, 0)}
              fullWidth
            >
              Anterior
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              size="small"
              variant={state.currentPreset === 'posterior' ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick('posterior', 0, 180, 0)}
              fullWidth
            >
              Posterior
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              size="small"
              variant={state.currentPreset === 'left' ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick('left', 0, -90, 0)}
              fullWidth
            >
              Left (-90°)
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              size="small"
              variant={state.currentPreset === 'right' ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick('right', 0, 90, 0)}
              fullWidth
            >
              Right (+90°)
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Rotation Controls */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Rotation Controls</Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom color="primary">
            Pitch (X-axis): {state.pitch}°
          </Typography>
          <Slider
            value={state.pitch}
            onChange={handlePitchChange}
            min={-90}
            max={90}
            step={5}
            color="primary"
            marks={[
              { value: -90, label: '-90°' },
              { value: 0, label: '0°' },
              { value: 90, label: '90°' }
            ]}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom color="secondary">
            Yaw (Y-axis): {state.yaw}°
          </Typography>
          <Slider
            value={state.yaw}
            onChange={handleYawChange}
            min={-180}
            max={180}
            step={15}
            color="secondary"
            marks={[
              { value: -180, label: '-180°' },
              { value: -90, label: '-90°' },
              { value: 0, label: '0°' },
              { value: 90, label: '90°' },
              { value: 180, label: '180°' }
            ]}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom color="info">
            Roll (Z-axis): {state.roll}°
          </Typography>
          <Slider
            value={state.roll}
            onChange={handleRollChange}
            min={-45}
            max={45}
            step={5}
            color="info"
            marks={[
              { value: -45, label: '-45°' },
              { value: 0, label: '0°' },
              { value: 45, label: '45°' }
            ]}
          />
        </Box>
      </Box>

      {/* Opacity Control */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Opacity: {Math.round(state.opacity * 100)}%
        </Typography>
        <Slider
          value={state.opacity}
          onChange={handleOpacityChange}
          min={0.1}
          max={1}
          step={0.1}
          marks={[
            { value: 0.1, label: '10%' },
            { value: 0.5, label: '50%' },
            { value: 1, label: '100%' }
          ]}
        />
      </Box>

      {/* Control Buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          startIcon={<RestartAlt />}
          size="small"
          fullWidth
        >
          Reset View
        </Button>
        <Button
          variant="outlined"
          onClick={resetCanvasTransform}
          size="small"
          fullWidth
        >
          Clear Transform
        </Button>
      </Stack>

      {/* Status */}
      <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
        ✅ Controls are directly manipulating the main DICOM viewer canvas using CSS 3D transforms.
        Look for the green indicator overlay on the main canvas.
      </Alert>
    </Paper>
  );
};

export default Navigation3DMainCanvas;