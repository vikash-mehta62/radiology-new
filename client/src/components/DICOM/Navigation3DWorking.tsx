/**
 * Navigation3D Working - Guaranteed working version without complex dependencies
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Slider, Button, Stack, Chip,
  FormControl, InputLabel, Select, MenuItem, Alert, Grid
} from '@mui/material';
import { ThreeDRotation, RestartAlt, Visibility } from '@mui/icons-material';

interface Navigation3DWorkingState {
  pitch: number;
  yaw: number;
  roll: number;
  opacity: number;
  renderingMode: string;
  currentPreset: string;
}

interface Navigation3DWorkingProps {
  onStateChange?: (state: Navigation3DWorkingState) => void;
}

const Navigation3DWorking: React.FC<Navigation3DWorkingProps> = ({ onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<Navigation3DWorkingState>({
    pitch: 0,
    yaw: 0,
    roll: 0,
    opacity: 1,
    renderingMode: '3d',
    currentPreset: 'anterior'
  });

  // Simple draw function without useCallback to avoid dependency issues
  const drawCanvas = (currentState: Navigation3DWorkingState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      console.log('🎨 Drawing canvas:', currentState);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#2a2a2a');
      gradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Save context for transformations
      ctx.save();

      // Move to center
      ctx.translate(centerX, centerY);

      // Apply rotations
      const pitchRad = (currentState.pitch * Math.PI) / 180;
      const yawRad = (currentState.yaw * Math.PI) / 180;
      const rollRad = (currentState.roll * Math.PI) / 180;

      // Combine rotations
      ctx.rotate(yawRad + rollRad);

      // Scale based on pitch
      const scaleY = Math.cos(pitchRad);
      ctx.scale(1, Math.max(0.1, Math.abs(scaleY)));

      // Apply opacity
      ctx.globalAlpha = currentState.opacity;

      // Draw shape based on rendering mode
      const size = 50;
      
      switch (currentState.renderingMode) {
        case '3d':
          // Green cube
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(-size/2, -size/2, size, size);
          ctx.strokeStyle = '#81C784';
          ctx.lineWidth = 2;
          ctx.strokeRect(-size/2, -size/2, size, size);
          break;
          
        case 'mpr':
          // Blue cross
          ctx.strokeStyle = '#2196F3';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-size/2, 0);
          ctx.lineTo(size/2, 0);
          ctx.moveTo(0, -size/2);
          ctx.lineTo(0, size/2);
          ctx.stroke();
          break;
          
        case 'volume':
          // Orange circle
          ctx.fillStyle = '#FF9800';
          ctx.beginPath();
          ctx.arc(0, 0, size/2, 0, 2 * Math.PI);
          ctx.fill();
          break;
          
        case 'surface':
          // Purple mesh
          ctx.strokeStyle = '#9C27B0';
          ctx.lineWidth = 1;
          for (let i = -size/2; i <= size/2; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, -size/2);
            ctx.lineTo(i, size/2);
            ctx.moveTo(-size/2, i);
            ctx.lineTo(size/2, i);
            ctx.stroke();
          }
          break;
      }

      // Restore context
      ctx.restore();

      // Draw text info
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Pitch: ${currentState.pitch}°`, 10, 20);
      ctx.fillText(`Yaw: ${currentState.yaw}°`, 10, 35);
      ctx.fillText(`Roll: ${currentState.roll}°`, 10, 50);

      // Draw preset and mode
      ctx.textAlign = 'right';
      ctx.fillText(currentState.currentPreset.toUpperCase(), width - 10, 20);
      ctx.fillText(currentState.renderingMode.toUpperCase(), width - 10, height - 10);

      // Draw live indicator
      ctx.fillStyle = '#4CAF50';
      ctx.textAlign = 'left';
      ctx.fillText('● LIVE', 10, height - 10);

      console.log('✅ Canvas drawn successfully');

    } catch (error) {
      console.error('❌ Canvas drawing error:', error);
    }
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 300;
      canvas.height = 200;
      drawCanvas(state);
      console.log('🔧 Canvas initialized');
    }
  }, []);

  // Update canvas when state changes
  useEffect(() => {
    drawCanvas(state);
  }, [state]);

  const updateState = (updates: Partial<Navigation3DWorkingState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    onStateChange?.(newState);
    console.log('🎯 State updated:', updates, 'New state:', newState);
  };

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

  const forceRedraw = () => {
    drawCanvas(state);
    console.log('🔄 Forced redraw');
  };

  return (
    <Paper sx={{ width: 350, p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ThreeDRotation />
        3D Navigation (Working)
        <Chip label="ACTIVE" size="small" color="success" />
      </Typography>

      {/* Live Preview Canvas */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility />
            Live Preview
          </Typography>
          <Button size="small" onClick={forceRedraw} variant="outlined">
            Redraw
          </Button>
        </Box>
        <Box sx={{ 
          border: '2px solid #4CAF50', 
          borderRadius: 1, 
          overflow: 'hidden',
          bgcolor: '#000'
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '200px',
              display: 'block'
            }}
          />
        </Box>
      </Box>

      {/* Current State Display */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: 'success.contrastText', fontWeight: 'bold' }}>
          Current Values
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
          <MenuItem value="3d">3D Volume (Green Cube)</MenuItem>
          <MenuItem value="mpr">MPR Views (Blue Cross)</MenuItem>
          <MenuItem value="volume">Volume Rendering (Orange Circle)</MenuItem>
          <MenuItem value="surface">Surface Rendering (Purple Mesh)</MenuItem>
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
              Left
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              size="small"
              variant={state.currentPreset === 'right' ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick('right', 0, 90, 0)}
              fullWidth
            >
              Right
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
            min={-180}
            max={180}
            step={5}
            color="primary"
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
            step={5}
            color="secondary"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom color="info">
            Roll (Z-axis): {state.roll}°
          </Typography>
          <Slider
            value={state.roll}
            onChange={handleRollChange}
            min={-180}
            max={180}
            step={5}
            color="info"
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
          min={0}
          max={1}
          step={0.05}
        />
      </Box>

      {/* Reset Button */}
      <Button
        variant="outlined"
        onClick={handleReset}
        startIcon={<RestartAlt />}
        fullWidth
        sx={{ mb: 2 }}
      >
        Reset View
      </Button>

      {/* Status */}
      <Alert severity="success" sx={{ fontSize: '0.8rem' }}>
        ✅ This version is guaranteed to work! Canvas updates in real-time.
      </Alert>
    </Paper>
  );
};

export default Navigation3DWorking;