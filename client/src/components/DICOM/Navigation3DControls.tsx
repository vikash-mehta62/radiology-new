/**
 * Navigation3D Controls Component
 * Production-ready 3D navigation controls with real-time rendering integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, Slider, IconButton, Button,
  FormControlLabel, Switch, Divider, Grid, ButtonGroup,
  Tooltip, Accordion, AccordionSummary, AccordionDetails,
  Select, MenuItem, FormControl, InputLabel, Chip, Stack
} from '@mui/material';
import {
  RotateLeft, RotateRight, FlipCameraAndroid, ThreeDRotation,
  Opacity as OpacityIcon, Layers, ExpandMore, PlayArrow, Pause,
  RestartAlt
} from '@mui/icons-material';

// Import centralized types and helpers
import {
  Navigation3DState,
  MaxSlices,
  createCompleteNavigation3DState,
  getDefaultNavigation3DState,
  safeNumberValue,
  VIEW_PRESETS
} from './types/Navigation3DTypes';

export interface Navigation3DControlsProps {
  state: Navigation3DState;
  onStateChange: (updates: Partial<Navigation3DState>) => void;
  maxSlices: MaxSlices;
  enableVolumeRendering?: boolean;
  enableMPR?: boolean;
  enableAnimation?: boolean;
  onPresetApply?: (preset: string) => void;
  onReset?: () => void;
  onRenderingUpdate?: (state: Navigation3DState) => void; // New: Real-time rendering callback
}

export const Navigation3DControls: React.FC<Navigation3DControlsProps> = ({
  state,
  onStateChange,
  maxSlices,
  enableVolumeRendering = true,
  enableMPR = true,
  enableAnimation = true,
  onPresetApply,
  onReset,
  onRenderingUpdate
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string>('rotation');

  // Ensure we always have a complete state - never work with partial state
  const completeState = createCompleteNavigation3DState(state, maxSlices);

  // Trigger rendering update whenever state changes
  useEffect(() => {
    if (onRenderingUpdate) {
      onRenderingUpdate(completeState);
    }
  }, [completeState, onRenderingUpdate]);

  // Safe state update helper - always sends complete partial updates
  const updateState = useCallback((updates: Partial<Navigation3DState>) => {
    console.log('🔄 Navigation3D state update:', updates);
    console.log('🔄 Current complete state:', completeState);
    onStateChange(updates);
  }, [onStateChange, completeState]);

  // Rotation controls with real-time updates
  const handleRotationChange = useCallback((axis: 'pitch' | 'yaw' | 'roll', value: number | number[]) => {
    const numValue = safeNumberValue(value);
    const clampedValue = Math.max(-180, Math.min(180, numValue));
    console.log(`🎯 Rotation change: ${axis} = ${clampedValue}°`);
    updateState({ [axis]: clampedValue });
  }, [updateState]);

  const handleQuickRotation = useCallback((axis: 'pitch' | 'yaw' | 'roll', increment: number) => {
    const currentValue = completeState[axis];
    const newValue = currentValue + increment;
    const clampedValue = Math.max(-180, Math.min(180, newValue));
    updateState({ [axis]: clampedValue });
  }, [completeState, updateState]);

  // Opacity controls with real-time updates
  const handleOpacityChange = useCallback((type: 'opacity' | 'volumeOpacity' | 'surfaceOpacity', value: number | number[]) => {
    const numValue = safeNumberValue(value);
    const clampedValue = Math.max(0, Math.min(1, numValue));
    updateState({ [type]: clampedValue });
  }, [updateState]);

  // Slice controls with bounds checking
  const handleSliceChange = useCallback((plane: 'axialSlice' | 'sagittalSlice' | 'coronalSlice', value: number | number[]) => {
    const numValue = safeNumberValue(value);
    const maxValue = plane === 'axialSlice' ? maxSlices.axial - 1 :
      plane === 'sagittalSlice' ? maxSlices.sagittal - 1 :
        maxSlices.coronal - 1;
    const clampedValue = Math.max(0, Math.min(maxValue, Math.floor(numValue)));
    updateState({ [plane]: clampedValue });
  }, [maxSlices, updateState]);

  // Clipping plane controls
  const handleClippingChange = useCallback((type: 'clipNear' | 'clipFar', value: number | number[]) => {
    const numValue = safeNumberValue(value);
    const clampedValue = Math.max(0, Math.min(100, numValue));
    updateState({ [type]: clampedValue });
  }, [updateState]);

  // Preset selection with complete state application
  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = VIEW_PRESETS.find(p => p.id === presetId);
    if (preset) {
      console.log(`🎯 Applying preset: ${preset.name}`);
      updateState({
        pitch: preset.pitch,
        yaw: preset.yaw,
        roll: preset.roll,
        currentPreset: presetId
      });
      onPresetApply?.(presetId);
    }
  }, [updateState, onPresetApply]);

  // Rendering mode change
  const handleRenderingModeChange = useCallback((mode: Navigation3DState['renderingMode']) => {
    console.log(`🎨 Changing rendering mode to: ${mode}`);
    updateState({ renderingMode: mode });
  }, [updateState]);

  // Animation controls
  const handleAnimationToggle = useCallback(() => {
    const newAnimationState = !completeState.isAnimating;
    console.log(`🎬 Animation ${newAnimationState ? 'started' : 'stopped'}`);
    updateState({ isAnimating: newAnimationState });
  }, [completeState.isAnimating, updateState]);

  const handleAnimationSpeedChange = useCallback((value: number | number[]) => {
    const numValue = safeNumberValue(value);
    const clampedValue = Math.max(0.1, Math.min(3, numValue));
    updateState({ animationSpeed: clampedValue });
  }, [updateState]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    console.log('🔄 Resetting Navigation3D to defaults');
    const defaultState = getDefaultNavigation3DState(maxSlices);
    // Send the complete default state as partial update
    updateState(defaultState);
    onReset?.();
  }, [maxSlices, updateState, onReset]);

  // Panel expansion control
  const handlePanelChange = useCallback((panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : '');
  }, []);

  return (
    <Paper sx={{ width: 320, height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThreeDRotation />
          3D Navigation
          <Chip
            label="ACTIVE"
            size="small"
            color="success"
            sx={{ ml: 1, fontSize: '0.6rem' }}
          />
        </Typography>

        {/* Rendering Mode Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="nav3d-rendering-mode-label">Rendering Mode</InputLabel>
          <Select
            labelId="nav3d-rendering-mode-label"
            value={completeState.renderingMode}
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
          <Typography variant="subtitle2" gutterBottom>View Presets</Typography>
          <Grid container spacing={1}>
            {VIEW_PRESETS.map((preset) => (
              <Grid item xs={6} key={preset.id}>
                <Tooltip title={preset.description || preset.name}>
                  <Button
                    size="small"
                    variant={completeState.currentPreset === preset.id ? 'contained' : 'outlined'}
                    onClick={() => handlePresetSelect(preset.id)}
                    fullWidth
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {preset.name}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Rotation Controls */}
        <Accordion expanded={expandedPanel === 'rotation'} onChange={handlePanelChange('rotation')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              <ThreeDRotation sx={{ mr: 1 }} />
              Rotation Controls
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Pitch (X-axis): {completeState.pitch}°</Typography>
              <Slider
                value={completeState.pitch}
                onChange={(_, v) => handleRotationChange('pitch', v)}
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
              <Typography variant="body2">Yaw (Y-axis): {completeState.yaw}°</Typography>
              <Slider
                value={completeState.yaw}
                onChange={(_, v) => handleRotationChange('yaw', v)}
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
              <Typography variant="body2">Roll (Z-axis): {completeState.roll}°</Typography>
              <Slider
                value={completeState.roll}
                onChange={(_, v) => handleRotationChange('roll', v)}
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

            <ButtonGroup variant="outlined" size="small" fullWidth>
              <Tooltip title="Rotate Left 15°">
                <IconButton onClick={() => handleQuickRotation('yaw', -15)}>
                  <RotateLeft />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Right 15°">
                <IconButton onClick={() => handleQuickRotation('yaw', 15)}>
                  <RotateRight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Flip View 180°">
                <IconButton onClick={() => handleQuickRotation('pitch', 180)}>
                  <FlipCameraAndroid />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </AccordionDetails>
        </Accordion>

        {/* Opacity Controls */}
        <Accordion expanded={expandedPanel === 'opacity'} onChange={handlePanelChange('opacity')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              <OpacityIcon sx={{ mr: 1 }} />
              Opacity & Transparency
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Overall Opacity: {Math.round(completeState.opacity * 100)}%</Typography>
              <Slider
                value={completeState.opacity}
                onChange={(_, v) => handleOpacityChange('opacity', v)}
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
                  <Typography variant="body2">Volume Opacity: {Math.round(completeState.volumeOpacity * 100)}%</Typography>
                  <Slider
                    value={completeState.volumeOpacity}
                    onChange={(_, v) => handleOpacityChange('volumeOpacity', v)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">Surface Opacity: {Math.round(completeState.surfaceOpacity * 100)}%</Typography>
                  <Slider
                    value={completeState.surfaceOpacity}
                    onChange={(_, v) => handleOpacityChange('surfaceOpacity', v)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </Box>
              </>
            )}
          </AccordionDetails>
        </Accordion>

        {/* MPR Slice Navigation */}
        {enableMPR && (
          <Accordion expanded={expandedPanel === 'slices'} onChange={handlePanelChange('slices')}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                <Layers sx={{ mr: 1 }} />
                MPR Slice Navigation
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Axial Slice: {completeState.axialSlice} / {maxSlices.axial - 1}</Typography>
                <Slider
                  value={completeState.axialSlice}
                  onChange={(_, v) => handleSliceChange('axialSlice', v)}
                  min={0}
                  max={maxSlices.axial - 1}
                  step={1}
                  marks={maxSlices.axial <= 10 ? undefined : [
                    { value: 0, label: '0' },
                    { value: Math.floor((maxSlices.axial - 1) / 2), label: 'Mid' },
                    { value: maxSlices.axial - 1, label: `${maxSlices.axial - 1}` }
                  ]}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Sagittal Slice: {completeState.sagittalSlice} / {maxSlices.sagittal - 1}</Typography>
                <Slider
                  value={completeState.sagittalSlice}
                  onChange={(_, v) => handleSliceChange('sagittalSlice', v)}
                  min={0}
                  max={maxSlices.sagittal - 1}
                  step={1}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Coronal Slice: {completeState.coronalSlice} / {maxSlices.coronal - 1}</Typography>
                <Slider
                  value={completeState.coronalSlice}
                  onChange={(_, v) => handleSliceChange('coronalSlice', v)}
                  min={0}
                  max={maxSlices.coronal - 1}
                  step={1}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Clipping Planes */}
        <Accordion expanded={expandedPanel === 'clipping'} onChange={handlePanelChange('clipping')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">
              <RestartAlt sx={{ mr: 1 }} />
              Clipping Planes
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Near Clipping: {completeState.clipNear}%</Typography>
              <Slider
                value={completeState.clipNear}
                onChange={(_, v) => handleClippingChange('clipNear', v)}
                min={0}
                max={100}
                step={1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' }
                ]}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Far Clipping: {completeState.clipFar}%</Typography>
              <Slider
                value={completeState.clipFar}
                onChange={(_, v) => handleClippingChange('clipFar', v)}
                min={0}
                max={100}
                step={1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' }
                ]}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Animation Controls */}
        {enableAnimation && (
          <Accordion expanded={expandedPanel === 'animation'} onChange={handlePanelChange('animation')}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Animation Controls</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={completeState.isAnimating}
                      onChange={handleAnimationToggle}
                    />
                  }
                  label="Enable Animation"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Animation Speed: {completeState.animationSpeed}x</Typography>
                <Slider
                  value={completeState.animationSpeed}
                  onChange={(_, v) => handleAnimationSpeedChange(v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  disabled={!completeState.isAnimating}
                  marks={[
                    { value: 0.1, label: '0.1x' },
                    { value: 1, label: '1x' },
                    { value: 3, label: '3x' }
                  ]}
                />
              </Box>

              <ButtonGroup variant="outlined" size="small" fullWidth>
                <Tooltip title={completeState.isAnimating ? 'Pause Animation' : 'Start Animation'}>
                  <IconButton onClick={handleAnimationToggle}>
                    {completeState.isAnimating ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Stop Animation">
                  <IconButton onClick={() => updateState({ isAnimating: false })}>
                    <RestartAlt />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </AccordionDetails>
          </Accordion>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Reset Button */}
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
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={completeState.renderingMode.toUpperCase()}
              size="small"
              color="primary"
            />
            <Chip
              label={`${Math.round(completeState.opacity * 100)}%`}
              size="small"
            />
            <Chip
              label={completeState.currentPreset.toUpperCase()}
              size="small"
              variant="outlined"
            />
            {completeState.isAnimating && (
              <Chip
                label="ANIMATING"
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

// Export the types and helpers for use by parent components
export type {
  Navigation3DState
} from './types/Navigation3DTypes';

export {
  createCompleteNavigation3DState,
  getDefaultNavigation3DState,
  applyViewPreset,
  VIEW_PRESETS
} from './types/Navigation3DTypes';