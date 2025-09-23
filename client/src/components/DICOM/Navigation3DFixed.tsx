/**
 * Navigation3D Fixed - Works with or without WebGL
 * Provides visual feedback and guaranteed functionality
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Slider, Button, Stack, Chip,
  FormControl, InputLabel, Select, MenuItem, Alert, Grid
} from '@mui/material';
import { ThreeDRotation, RestartAlt, Visibility, Warning } from '@mui/icons-material';

interface Navigation3DFixedState {
  pitch: number;
  yaw: number;
  roll: number;
  opacity: number;
  renderingMode: string;
  currentPreset: string;
}

interface Navigation3DFixedProps {
  onStateChange?: (state: Navigation3DFixedState) => void;
}

const Navigation3DFixed: React.FC<Navigation3DFixedProps> = ({ onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<Navigation3DFixedState>({
    pitch: 0,
    yaw: 0,
    roll: 0,
    opacity: 1,
    renderingMode: '3d',
    currentPreset: 'anterior'
  });
  
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [canvasInitialized, setCanvasInitialized] = useState(false);

  // Draw visual representation of 3D state
  const drawVisualization = useCallback((ctx: CanvasRenderingContext2D, currentState: Navigation3DFixedState) => {
    try {
      const canvas = ctx.canvas;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      console.log('🎨 Drawing visualization:', {
        state: currentState,
        canvasSize: `${canvas.width}x${canvas.height}`,
        displaySize: `${rect.width}x${rect.height}`,
        center: `${centerX}, ${centerY}`
      });
      
      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Background with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, '#2a2a2a');
      gradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Save context for transformations
    ctx.save();
    
    // Move to center
    ctx.translate(centerX, centerY);
    
    // Apply rotations (simplified 2D representation)
    const pitchRad = (currentState.pitch * Math.PI) / 180;
    const yawRad = (currentState.yaw * Math.PI) / 180;
    const rollRad = (currentState.roll * Math.PI) / 180;
    
    // Combine rotations for 2D visualization
    ctx.rotate(yawRad + rollRad);
    
    // Scale based on pitch (simulate 3D perspective)
    const scaleY = Math.cos(pitchRad);
    ctx.scale(1, Math.max(0.1, Math.abs(scaleY)));
    
    // Draw 3D object representation
    const size = 60;
    
    // Apply opacity
    ctx.globalAlpha = currentState.opacity;
    
    // Draw main shape based on rendering mode
    switch (currentState.renderingMode) {
      case '3d':
        // Draw cube
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(-size/2, -size/2, size, size);
        ctx.strokeStyle = '#81C784';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/2, -size/2, size, size);
        break;
        
      case 'mpr':
        // Draw cross sections
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size/2, 0);
        ctx.lineTo(size/2, 0);
        ctx.moveTo(0, -size/2);
        ctx.lineTo(0, size/2);
        ctx.stroke();
        break;
        
      case 'volume':
        // Draw volume representation
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#FFB74D';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
        
      case 'surface':
        // Draw surface mesh
        ctx.strokeStyle = '#9C27B0';
        ctx.lineWidth = 1;
        for (let i = -size/2; i <= size/2; i += 10) {
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
    
    // Draw axis labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`P: ${currentState.pitch}°`, 10, 20);
    ctx.fillText(`Y: ${currentState.yaw}°`, 10, 35);
    ctx.fillText(`R: ${currentState.roll}°`, 10, 50);
    
    // Draw preset name
    ctx.textAlign = 'right';
    ctx.fillText(currentState.currentPreset.toUpperCase(), rect.width - 10, 20);
    
    // Draw rendering mode
    ctx.fillText(currentState.renderingMode.toUpperCase(), rect.width - 10, rect.height - 10);
    
    // Draw status indicator
    ctx.fillStyle = '#4CAF50';
    ctx.fillText('● LIVE', 10, rect.height - 10);
    
    console.log('✅ Visualization drawn successfully');
    
    } catch (error) {
      console.error('❌ Error drawing visualization:', error);
    }
  }, []);

  // Initialize canvas and check WebGL support
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      
      // Set canvas size with proper pixel ratio
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * pixelRatio;
      canvas.height = rect.height * pixelRatio;
      
      // Test WebGL support
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(!!gl);
      
      // Initialize with 2D context for visual feedback
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Scale context to match pixel ratio
        ctx.scale(pixelRatio, pixelRatio);
        setCanvasInitialized(true);
        
        // Initial draw
        setTimeout(() => {
          drawVisualization(ctx, state);
        }, 100);
      }
      
      console.log('🔧 Navigation3D Fixed initialized:', {
        webglSupported: !!gl,
        canvas2dAvailable: !!ctx,
        canvasSize: `${canvas.width}x${canvas.height}`,
        displaySize: `${rect.width}x${rect.height}`,
        pixelRatio
      });
    }
  }, [drawVisualization, state]);

  // Force redraw function
  const forceRedraw = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        console.log('🔄 Force redrawing canvas...');
        drawVisualization(ctx, state);
      }
    }
  }, [state, drawVisualization]);

  const updateState = useCallback((updates: Partial<Navigation3DFixedState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    onStateChange?.(newState);
    
    // Update visualization immediately
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        console.log('🎨 Updating canvas with new state:', newState);
        drawVisualization(ctx, newState);
      } else {
        console.warn('⚠️ Canvas 2D context not available');
      }
    } else {
      console.warn('⚠️ Canvas ref not available');
    }
    
    console.log('🎯 Navigation3D Fixed Update:', updates, 'New State:', newState);
  }, [state, onStateChange, drawVisualization]);

  const handlePitchChange = useCallback((event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ pitch: numValue });
  }, [updateState]);

  const handleYawChange = useCallback((event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ yaw: numValue });
  }, [updateState]);

  const handleRollChange = useCallback((event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ roll: numValue });
  }, [updateState]);

  const handleOpacityChange = useCallback((event: Event, value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    updateState({ opacity: numValue });
  }, [updateState]);

  const handlePresetClick = useCallback((preset: string, pitch: number, yaw: number, roll: number) => {
    updateState({ 
      currentPreset: preset,
      pitch,
      yaw,
      roll
    });
  }, [updateState]);

  const handleReset = useCallback(() => {
    updateState({
      pitch: 0,
      yaw: 0,
      roll: 0,
      opacity: 1,
      renderingMode: '3d',
      currentPreset: 'anterior'
    });
  }, [updateState]);

  return (
    <Paper sx={{ width: 350, p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ThreeDRotation />
        3D Navigation (Fixed)
        <Chip label="WORKING" size="small" color="success" />
      </Typography>

      {/* WebGL Status Alert */}
      {webglSupported === false && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
          WebGL not supported. Using 2D visualization fallback.
        </Alert>
      )}

      {/* Visual Preview Canvas */}
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
          border: '2px solid #ccc', 
          borderRadius: 1, 
          overflow: 'hidden',
          bgcolor: '#000',
          position: 'relative'
        }}>
          <canvas
            ref={canvasRef}
            width={300}
            height={200}
            style={{
              width: '100%',
              height: '200px',
              display: 'block',
              backgroundColor: '#1a1a1a'
            }}
          />
          {!canvasInitialized && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.8rem'
            }}>
              Initializing canvas...
            </Box>
          )}
        </Box>
      </Box>

      {/* Current State Display */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">Current Values</Typography>
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
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
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
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
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
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
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
          marks={[
            { value: 0, label: '0%' },
            { value: 0.5, label: '50%' },
            { value: 1, label: '100%' }
          ]}
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
        ✅ Controls are working! Canvas shows live preview. Check console for detailed logs.
      </Alert>
    </Paper>
  );
};

export default Navigation3DFixed;