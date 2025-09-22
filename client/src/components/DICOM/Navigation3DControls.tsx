/**
 * 3D Navigation Controls Component
 * Provides comprehensive 3D navigation controls for volume rendering and MPR views
 * Features:
 * - 3D rotation controls (pitch, yaw, roll)
 * - Opacity and transparency controls
 * - Slice navigation for MPR views
 * - Preset viewing angles (axial, sagittal, coronal)
 * - Volume rendering parameters
 * - Clipping plane controls
 * - Animation controls for smooth transitions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, Slider, IconButton, Button,
  FormControlLabel, Switch, Divider, Grid, Card, CardContent,
  ButtonGroup, Tooltip, Accordion, AccordionSummary, AccordionDetails,
  Select, MenuItem, FormControl, InputLabel, Chip, Stack
} from '@mui/material';
import {
  RotateLeft, RotateRight, FlipCameraAndroid, ThreeDRotation,
  Visibility, VisibilityOff, Opacity, Layers, ViewInAr,
  ExpandMore, PlayArrow, Pause, RestartAlt, Speed,
  CropFree, FilterVintage, Tune, AutoAwesome, Settings,
  Navigation, Explore, CameraAlt, Movie, Timeline
} from '@mui/icons-material';

export interface Navigation3DState {
  // Rotation angles in degrees
  pitch: number;  // X-axis rotation
  yaw: number;    // Y-axis rotation  
  roll: number;   // Z-axis rotation
  
  // Opacity and rendering
  opacity: number;
  volumeOpacity: number;
  surfaceOpacity: number;
  
  // Slice positions for MPR
  axialSlice: number;
  sagittalSlice: number;
  coronalSlice: number;
  
  // Clipping planes
  clipNear: number;
  clipFar: number;
  
  // Rendering mode
  renderingMode: '3d' | 'mpr' | 'volume' | 'surface';
  
  // Animation
  isAnimating: boolean;
  animationSpeed: number;
  
  // View presets
  currentPreset: string;
}

export interface Navigation3DControlsProps {
  state: Navigation3DState;
  onStateChange: (updates: Partial<Navigation3DState>) => void;
  maxSlices: {
    axial: number;
    sagittal: number;
    coronal: number;
  };
  enableVolumeRendering?: boolean;
  enableMPR?: boolean;
  enableAnimation?: boolean;
  onPresetApply?: (preset: string) => void;
  onReset?: () => void;
}

const viewPresets = [
  { id: 'anterior', name: 'Anterior', pitch: 0, yaw: 0, roll: 0 },
  { id: 'posterior', name: 'Posterior', pitch: 0, yaw: 180, roll: 0 },
  { id: 'left-lateral', name: 'Left Lateral', pitch: 0, yaw: -90, roll: 0 },
  { id: 'right-lateral', name: 'Right Lateral', pitch: 0, yaw: 90, roll: 0 },
  { id: 'superior', name: 'Superior', pitch: -90, yaw: 0, roll: 0 },
  { id: 'inferior', name: 'Inferior', pitch: 90, yaw: 0, roll: 0 },
  { id: 'oblique-1', name: 'Oblique 1', pitch: -30, yaw: 45, roll: 0 },
  { id: 'oblique-2', name: 'Oblique 2', pitch: 30, yaw: -45, roll: 0 }
];

export const Navigation3DControls: React.FC<Navigation3DControlsProps> = ({
  state,
  onStateChange,
  maxSlices,
  enableVolumeRendering = true,
  enableMPR = true,
  enableAnimation = true,
  onPresetApply,
  onReset
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string>('rotation');

  const handleRotationChange = useCallback((axis: 'pitch' | 'yaw' | 'roll', value: number) => {
    onStateChange({ [axis]: value });
  }, [onStateChange]);

  const handleOpacityChange = useCallback((type: 'opacity' | 'volumeOpacity' | 'surfaceOpacity', value: number) => {
    onStateChange({ [type]: value });
  }, [onStateChange]);

  const handleSliceChange = useCallback((plane: 'axialSlice' | 'sagittalSlice' | 'coronalSlice', value: number) => {
    onStateChange({ [plane]: value });
  }, [onStateChange]);

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = viewPresets.find(p => p.id === presetId);
    if (preset) {
      onStateChange({
        pitch: preset.pitch,
        yaw: preset.yaw,
        roll: preset.roll,
        currentPreset: presetId
      });
      onPresetApply?.(presetId);
    }
  }, [onStateChange, onPresetApply]);

  const handleRenderingModeChange = useCallback((mode: Navigation3DState['renderingMode']) => {
    onStateChange({ renderingMode: mode });
  }, [onStateChange]);

  const handleAnimationToggle = useCallback(() => {
    onStateChange({ isAnimating: !state.isAnimating });
  }, [state.isAnimating, onStateChange]);

  const handleReset = useCallback(() => {
    const resetState: Partial<Navigation3DState> = {
      pitch: 0,
      yaw: 0,
      roll: 0,
      opacity: 1,
      volumeOpacity: 0.8,
      surfaceOpacity: 1,
      axialSlice: Math.floor(maxSlices.axial / 2),
      sagittalSlice: Math.floor(maxSlices.sagittal / 2),
      coronalSlice: Math.floor(maxSlices.coronal / 2),
      clipNear: 0,
      clipFar: 100,
      renderingMode: '3d',
      isAnimating: false,
      animationSpeed: 1,
      currentPreset: 'anterior'
    };
    onStateChange(resetState);
    onReset?.();
  }, [maxSlices, onStateChange, onReset]);

  const handlePanelChange = useCallback((panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : '');
  }, []);

  return (
    <Paper sx={{ width: 320, height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThreeDRotation color="primary" />
          3D Navigation
        </Typography>

        {/* Rendering Mode Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Rendering Mode</InputLabel>
          <Select
            value={state.renderingMode}
            label="Rendering Mode"
            onChange={(e) => handleRenderingModeChange(e.target.value as Navigation3DState['renderingMode'])}
          >
            <MenuItem value="3d">3D Volume</MenuItem>
            <MenuItem value="mpr">MPR Views</MenuItem>
            <MenuItem value="volume">Volume Rendering</MenuItem>
            <MenuItem value="surface">Surface Rendering</MenuItem>
          </Select>
        </FormControl>

        {/* View Presets */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            View Presets
          </Typography>
          <Grid container spacing={1}>
            {viewPresets.map((preset) => (
              <Grid item xs={6} key={preset.id}>
                <Button
                  size="small"
                  variant={state.currentPreset === preset.id ? "contained" : "outlined"}
                  onClick={() => handlePresetSelect(preset.id)}
                  fullWidth
                  sx={{ fontSize: '0.75rem' }}
                >
                  {preset.name}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Rotation Controls */}
        <Accordion 
          expanded={expandedPanel === 'rotation'} 
          onChange={handlePanelChange('rotation')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              <ThreeDRotation sx={{ mr: 1, verticalAlign: 'middle' }} />
              Rotation Controls
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Pitch (X-axis): {state.pitch}°
              </Typography>
              <Slider
                value={state.pitch}
                onChange={(_, value) => handleRotationChange('pitch', value as number)}
                min={-180}
                max={180}
                step={1}
                marks={[
                  { value: -90, label: '-90°' },
                  { value: 0, label: '0°' },
                  { value: 90, label: '90°' }
                ]}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Yaw (Y-axis): {state.yaw}°
              </Typography>
              <Slider
                value={state.yaw}
                onChange={(_, value) => handleRotationChange('yaw', value as number)}
                min={-180}
                max={180}
                step={1}
                marks={[
                  { value: -90, label: '-90°' },
                  { value: 0, label: '0°' },
                  { value: 90, label: '90°' }
                ]}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Roll (Z-axis): {state.roll}°
              </Typography>
              <Slider
                value={state.roll}
                onChange={(_, value) => handleRotationChange('roll', value as number)}
                min={-180}
                max={180}
                step={1}
                marks={[
                  { value: -90, label: '-90°' },
                  { value: 0, label: '0°' },
                  { value: 90, label: '90°' }
                ]}
              />
            </Box>

            <ButtonGroup variant="outlined" size="small" fullWidth>
              <Tooltip title="Rotate Left">
                <IconButton onClick={() => handleRotationChange('yaw', state.yaw - 15)}>
                  <RotateLeft />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Right">
                <IconButton onClick={() => handleRotationChange('yaw', state.yaw + 15)}>
                  <RotateRight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Flip View">
                <IconButton onClick={() => handleRotationChange('pitch', state.pitch + 180)}>
                  <FlipCameraAndroid />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </AccordionDetails>
        </Accordion>

        {/* Opacity Controls */}
        <Accordion 
          expanded={expandedPanel === 'opacity'} 
          onChange={handlePanelChange('opacity')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              <Opacity sx={{ mr: 1, verticalAlign: 'middle' }} />
              Opacity & Transparency
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Overall Opacity: {Math.round(state.opacity * 100)}%
              </Typography>
              <Slider
                value={state.opacity}
                onChange={(_, value) => handleOpacityChange('opacity', value as number)}
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

            {enableVolumeRendering && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Volume Opacity: {Math.round(state.volumeOpacity * 100)}%
                  </Typography>
                  <Slider
                    value={state.volumeOpacity}
                    onChange={(_, value) => handleOpacityChange('volumeOpacity', value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Surface Opacity: {Math.round(state.surfaceOpacity * 100)}%
                  </Typography>
                  <Slider
                    value={state.surfaceOpacity}
                    onChange={(_, value) => handleOpacityChange('surfaceOpacity', value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </Box>
              </>
            )}
          </AccordionDetails>
        </Accordion>

        {/* MPR Slice Controls */}
        {enableMPR && (
          <Accordion 
            expanded={expandedPanel === 'slices'} 
            onChange={handlePanelChange('slices')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                <Layers sx={{ mr: 1, verticalAlign: 'middle' }} />
                MPR Slice Navigation
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Axial Slice: {state.axialSlice} / {maxSlices.axial}
                </Typography>
                <Slider
                  value={state.axialSlice}
                  onChange={(_, value) => handleSliceChange('axialSlice', value as number)}
                  min={0}
                  max={maxSlices.axial - 1}
                  step={1}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Sagittal Slice: {state.sagittalSlice} / {maxSlices.sagittal}
                </Typography>
                <Slider
                  value={state.sagittalSlice}
                  onChange={(_, value) => handleSliceChange('sagittalSlice', value as number)}
                  min={0}
                  max={maxSlices.sagittal - 1}
                  step={1}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Coronal Slice: {state.coronalSlice} / {maxSlices.coronal}
                </Typography>
                <Slider
                  value={state.coronalSlice}
                  onChange={(_, value) => handleSliceChange('coronalSlice', value as number)}
                  min={0}
                  max={maxSlices.coronal - 1}
                  step={1}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Clipping Controls */}
        <Accordion 
          expanded={expandedPanel === 'clipping'} 
          onChange={handlePanelChange('clipping')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              <CropFree sx={{ mr: 1, verticalAlign: 'middle' }} />
              Clipping Planes
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Near Clipping: {state.clipNear}%
              </Typography>
              <Slider
                value={state.clipNear}
                onChange={(_, value) => onStateChange({ clipNear: value as number })}
                min={0}
                max={100}
                step={1}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Far Clipping: {state.clipFar}%
              </Typography>
              <Slider
                value={state.clipFar}
                onChange={(_, value) => onStateChange({ clipFar: value as number })}
                min={0}
                max={100}
                step={1}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Animation Controls */}
        {enableAnimation && (
          <Accordion 
            expanded={expandedPanel === 'animation'} 
            onChange={handlePanelChange('animation')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                <Movie sx={{ mr: 1, verticalAlign: 'middle' }} />
                Animation Controls
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.isAnimating}
                      onChange={handleAnimationToggle}
                    />
                  }
                  label="Enable Animation"
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Animation Speed: {state.animationSpeed}x
                </Typography>
                <Slider
                  value={state.animationSpeed}
                  onChange={(_, value) => onStateChange({ animationSpeed: value as number })}
                  min={0.1}
                  max={3}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1, label: '1x' },
                    { value: 2, label: '2x' }
                  ]}
                  disabled={!state.isAnimating}
                />
              </Box>

              <ButtonGroup variant="outlined" size="small" fullWidth>
                <Tooltip title={state.isAnimating ? "Pause" : "Play"}>
                  <IconButton onClick={handleAnimationToggle}>
                    {state.isAnimating ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset Animation">
                  <IconButton onClick={() => onStateChange({ isAnimating: false })}>
                    <RestartAlt />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Action Buttons */}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleReset}
            startIcon={<RestartAlt />}
            size="small"
            fullWidth
          >
            Reset View
          </Button>
        </Stack>

        {/* Current State Display */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Current State
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip 
              label={`${state.renderingMode.toUpperCase()}`} 
              size="small" 
              color="primary" 
            />
            <Chip 
              label={`${Math.round(state.opacity * 100)}%`} 
              size="small" 
            />
            {state.isAnimating && (
              <Chip 
                label="Animating" 
                size="small" 
                color="secondary" 
              />
            )}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
};

export default Navigation3DControls;