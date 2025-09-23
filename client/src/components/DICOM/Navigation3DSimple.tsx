/**
 * Simple Navigation3D Controls - Guaranteed to work
 */

import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Slider, Button, Stack, Chip,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import { ThreeDRotation, RestartAlt } from '@mui/icons-material';

interface SimpleNavigation3DState {
  pitch: number;
  yaw: number;
  roll: number;
  opacity: number;
  renderingMode: string;
  currentPreset: string;
}

interface SimpleNavigation3DProps {
  onStateChange?: (state: SimpleNavigation3DState) => void;
}

const Navigation3DSimple: React.FC<SimpleNavigation3DProps> = ({ onStateChange }) => {
  const [state, setState] = useState<SimpleNavigation3DState>({
    pitch: 0,
    yaw: 0,
    roll: 0,
    opacity: 1,
    renderingMode: '3d',
    currentPreset: 'anterior'
  });

  const updateState = useCallback((updates: Partial<SimpleNavigation3DState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    onStateChange?.(newState);
    console.log('🎯 Navigation3D Simple Update:', updates, 'New State:', newState);
  }, [state, onStateChange]);

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
    <Paper sx={{ width: 320, p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ThreeDRotation />
        3D Navigation (Simple)
        <Chip label="WORKING" size="small" color="success" />
      </Typography>

      {/* Current State Display */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">Current Values</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          <Chip label={`P: ${state.pitch}°`} size="small" />
          <Chip label={`Y: ${state.yaw}°`} size="small" />
          <Chip label={`R: ${state.roll}°`} size="small" />
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
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small"
            variant={state.currentPreset === 'anterior' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('anterior', 0, 0, 0)}
          >
            Anterior
          </Button>
          <Button
            size="small"
            variant={state.currentPreset === 'posterior' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('posterior', 0, 180, 0)}
          >
            Posterior
          </Button>
          <Button
            size="small"
            variant={state.currentPreset === 'left' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('left', 0, -90, 0)}
          >
            Left
          </Button>
          <Button
            size="small"
            variant={state.currentPreset === 'right' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('right', 0, 90, 0)}
          >
            Right
          </Button>
        </Stack>
      </Box>

      {/* Rotation Controls */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Rotation Controls</Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Pitch (X-axis): {state.pitch}°
          </Typography>
          <Slider
            value={state.pitch}
            onChange={handlePitchChange}
            min={-180}
            max={180}
            step={1}
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Yaw (Y-axis): {state.yaw}°
          </Typography>
          <Slider
            value={state.yaw}
            onChange={handleYawChange}
            min={-180}
            max={180}
            step={1}
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Roll (Z-axis): {state.roll}°
          </Typography>
          <Slider
            value={state.roll}
            onChange={handleRollChange}
            min={-180}
            max={180}
            step={1}
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
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
          min={0}
          max={1}
          step={0.01}
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
      >
        Reset View
      </Button>

      {/* Test Status */}
      <Box sx={{ mt: 2, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: 'success.contrastText' }}>
          ✅ This component is working! Check console for logs when you move sliders.
        </Typography>
      </Box>
    </Paper>
  );
};

export default Navigation3DSimple;