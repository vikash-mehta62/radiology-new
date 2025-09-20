/**
 * Enhanced Cine Player Component
 * Professional medical imaging cine player with variable speed controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Tooltip,
  Paper,
  ButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  SkipNext,
  SkipPrevious,
  FastForward,
  FastRewind,
  Repeat,
  RepeatOne,
  Speed,
  Settings
} from '@mui/icons-material';

export interface CinePlayerProps {
  currentSlice: number;
  totalSlices: number;
  isPlaying: boolean;
  frameRate: number;
  onSliceChange: (sliceIndex: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onFrameRateChange: (frameRate: number) => void;
  isLoading?: boolean;
  loadingProgress?: number;
  enableKeyboardShortcuts?: boolean;
  className?: string;
}

export interface CinePlayerState {
  playDirection: 'forward' | 'backward';
  loopMode: 'none' | 'loop' | 'bounce';
  speed: number;
  customFrameRates: number[];
  showAdvancedControls: boolean;
  autoReverse: boolean;
}

export interface CinePlayerSettings {
  defaultFrameRate: number;
  minFrameRate: number;
  maxFrameRate: number;
  frameRatePresets: number[];
  enableSmoothing: boolean;
  bufferSize: number;
}

const DEFAULT_SETTINGS: CinePlayerSettings = {
  defaultFrameRate: 10,
  minFrameRate: 1,
  maxFrameRate: 60,
  frameRatePresets: [1, 2, 5, 10, 15, 20, 30, 60],
  enableSmoothing: true,
  bufferSize: 10
};

/**
 * Enhanced Cine Player with professional medical imaging controls
 */
export const CinePlayer: React.FC<CinePlayerProps> = ({
  currentSlice,
  totalSlices,
  isPlaying,
  frameRate,
  onSliceChange,
  onPlayStateChange,
  onFrameRateChange,
  isLoading = false,
  loadingProgress = 0,
  enableKeyboardShortcuts = true,
  className
}) => {
  // State management
  const [state, setState] = useState<CinePlayerState>({
    playDirection: 'forward',
    loopMode: 'loop',
    speed: 1.0,
    customFrameRates: DEFAULT_SETTINGS.frameRatePresets,
    showAdvancedControls: false,
    autoReverse: false
  });

  const [settings] = useState<CinePlayerSettings>(DEFAULT_SETTINGS);
  
  // Refs for animation and timing
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(1000 / frameRate);

  // Update frame interval when frame rate changes
  useEffect(() => {
    frameIntervalRef.current = 1000 / (frameRate * state.speed);
  }, [frameRate, state.speed]);

  // Animation loop for cine playback
  const animateSlices = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    if (timestamp - lastFrameTimeRef.current >= frameIntervalRef.current) {
      let nextSlice = currentSlice;

      if (state.playDirection === 'forward') {
        nextSlice = currentSlice + 1;
        
        if (nextSlice >= totalSlices) {
          switch (state.loopMode) {
            case 'loop':
              nextSlice = 0;
              break;
            case 'bounce':
              nextSlice = totalSlices - 1;
              setState(prev => ({ ...prev, playDirection: 'backward' }));
              break;
            case 'none':
            default:
              onPlayStateChange(false);
              return;
          }
        }
      } else {
        nextSlice = currentSlice - 1;
        
        if (nextSlice < 0) {
          switch (state.loopMode) {
            case 'loop':
              nextSlice = totalSlices - 1;
              break;
            case 'bounce':
              nextSlice = 0;
              setState(prev => ({ ...prev, playDirection: 'forward' }));
              break;
            case 'none':
            default:
              onPlayStateChange(false);
              return;
          }
        }
      }

      onSliceChange(nextSlice);
      lastFrameTimeRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(animateSlices);
  }, [
    isPlaying,
    currentSlice,
    totalSlices,
    state.playDirection,
    state.loopMode,
    onSliceChange,
    onPlayStateChange
  ]);

  // Start/stop animation
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animateSlices);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animateSlices]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent default behavior for our shortcuts
      const shortcuts = ['Space', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (shortcuts.includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'Space':
          handlePlayPause();
          break;
        case 'ArrowLeft':
          if (event.shiftKey) {
            handleStepBackward();
          } else {
            handlePreviousSlice();
          }
          break;
        case 'ArrowRight':
          if (event.shiftKey) {
            handleStepForward();
          } else {
            handleNextSlice();
          }
          break;
        case 'Home':
          handleFirstSlice();
          break;
        case 'End':
          handleLastSlice();
          break;
        case 'KeyR':
          if (event.ctrlKey) {
            handleToggleDirection();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [enableKeyboardShortcuts, isPlaying, currentSlice, totalSlices]);

  // Control handlers
  const handlePlayPause = useCallback(() => {
    onPlayStateChange(!isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const handleStop = useCallback(() => {
    onPlayStateChange(false);
    onSliceChange(0);
  }, [onPlayStateChange, onSliceChange]);

  const handleNextSlice = useCallback(() => {
    const nextSlice = Math.min(currentSlice + 1, totalSlices - 1);
    onSliceChange(nextSlice);
  }, [currentSlice, totalSlices, onSliceChange]);

  const handlePreviousSlice = useCallback(() => {
    const prevSlice = Math.max(currentSlice - 1, 0);
    onSliceChange(prevSlice);
  }, [currentSlice, onSliceChange]);

  const handleFirstSlice = useCallback(() => {
    onSliceChange(0);
  }, [onSliceChange]);

  const handleLastSlice = useCallback(() => {
    onSliceChange(totalSlices - 1);
  }, [totalSlices, onSliceChange]);

  const handleStepForward = useCallback(() => {
    const step = Math.max(1, Math.floor(totalSlices / 10));
    const nextSlice = Math.min(currentSlice + step, totalSlices - 1);
    onSliceChange(nextSlice);
  }, [currentSlice, totalSlices, onSliceChange]);

  const handleStepBackward = useCallback(() => {
    const step = Math.max(1, Math.floor(totalSlices / 10));
    const prevSlice = Math.max(currentSlice - step, 0);
    onSliceChange(prevSlice);
  }, [currentSlice, totalSlices, onSliceChange]);

  const handleSliceSliderChange = useCallback((_: Event, value: number | number[]) => {
    const sliceIndex = Array.isArray(value) ? value[0] : value;
    onSliceChange(sliceIndex);
  }, [onSliceChange]);

  const handleFrameRateChange = useCallback((event: any) => {
    const newFrameRate = event.target.value as number;
    onFrameRateChange(newFrameRate);
  }, [onFrameRateChange]);

  const handleSpeedChange = useCallback((_: Event, value: number | number[]) => {
    const newSpeed = Array.isArray(value) ? value[0] : value;
    setState(prev => ({ ...prev, speed: newSpeed }));
  }, []);

  const handleToggleDirection = useCallback(() => {
    setState(prev => ({
      ...prev,
      playDirection: prev.playDirection === 'forward' ? 'backward' : 'forward'
    }));
  }, []);

  const handleLoopModeChange = useCallback((event: any) => {
    const newLoopMode = event.target.value as CinePlayerState['loopMode'];
    setState(prev => ({ ...prev, loopMode: newLoopMode }));
  }, []);

  const handleToggleAdvancedControls = useCallback(() => {
    setState(prev => ({ ...prev, showAdvancedControls: !prev.showAdvancedControls }));
  }, []);

  // Calculate progress percentage
  const progressPercentage = totalSlices > 1 ? (currentSlice / (totalSlices - 1)) * 100 : 0;

  return (
    <Paper 
      className={className}
      sx={{ 
        p: 2, 
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2
      }}
    >
      {/* Loading Progress */}
      {isLoading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Loading slices...
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      )}

      {/* Slice Navigation Slider */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Slice: {currentSlice + 1} / {totalSlices}
        </Typography>
        <Slider
          value={currentSlice}
          min={0}
          max={totalSlices - 1}
          step={1}
          onChange={handleSliceSliderChange}
          disabled={isLoading}
          data-testid="slice-slider"
          sx={{
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
            },
            '& .MuiSlider-track': {
              height: 6,
            },
            '& .MuiSlider-rail': {
              height: 6,
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            0
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Progress: {progressPercentage.toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalSlices - 1}
          </Typography>
        </Box>
      </Box>

      {/* Main Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <ButtonGroup variant="outlined" size="small" sx={{ mr: 2 }}>
          <Tooltip title="First Slice (Home)">
            <IconButton onClick={handleFirstSlice} disabled={isLoading || currentSlice === 0}>
              <SkipPrevious />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Step Backward (Shift + ←)">
            <IconButton onClick={handleStepBackward} disabled={isLoading}>
              <FastRewind />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Previous Slice (←)">
            <IconButton onClick={handlePreviousSlice} disabled={isLoading || currentSlice === 0}>
              <SkipPrevious fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Tooltip title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
          <IconButton
            onClick={handlePlayPause}
            disabled={isLoading}
            size="large"
            sx={{
              mx: 2,
              backgroundColor: isPlaying ? 'warning.main' : 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: isPlaying ? 'warning.dark' : 'primary.dark',
              }
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Stop">
          <IconButton onClick={handleStop} disabled={isLoading} sx={{ mr: 2 }}>
            <Stop />
          </IconButton>
        </Tooltip>

        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Next Slice (→)">
            <IconButton 
              onClick={handleNextSlice} 
              disabled={isLoading || currentSlice === totalSlices - 1}
            >
              <SkipNext fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Step Forward (Shift + →)">
            <IconButton onClick={handleStepForward} disabled={isLoading}>
              <FastForward />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Last Slice (End)">
            <IconButton 
              onClick={handleLastSlice} 
              disabled={isLoading || currentSlice === totalSlices - 1}
            >
              <SkipNext />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Box>

      {/* Frame Rate and Speed Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="frame-rate-label">Frame Rate</InputLabel>
          <Select
            value={frameRate}
            label="Frame Rate"
            labelId="frame-rate-label"
            onChange={handleFrameRateChange}
            disabled={isLoading}
            data-testid="frame-rate-select"
          >
            {state.customFrameRates.map(rate => (
              <MenuItem key={rate} value={rate}>
                {rate} FPS
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1, mx: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Speed: {state.speed.toFixed(1)}x
          </Typography>
          <Slider
            value={state.speed}
            min={0.1}
            max={5.0}
            step={0.1}
            onChange={handleSpeedChange}
            disabled={isLoading}
            size="small"
            data-testid="speed-slider"
            sx={{ width: '100%' }}
          />
        </Box>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="loop-mode-label">Loop</InputLabel>
          <Select
            value={state.loopMode}
            label="Loop"
            labelId="loop-mode-label"
            onChange={handleLoopModeChange}
            disabled={isLoading}
            data-testid="loop-mode-select"
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="loop">Loop</MenuItem>
            <MenuItem value="bounce">Bounce</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Advanced Controls Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={`Direction: ${state.playDirection}`}>
            <IconButton 
              onClick={handleToggleDirection}
              disabled={isLoading}
              size="small"
              color={state.playDirection === 'backward' ? 'primary' : 'default'}
            >
              <Speed />
            </IconButton>
          </Tooltip>

          <Typography variant="body2" color="text.secondary">
            {state.playDirection === 'forward' ? '→' : '←'} {state.loopMode}
          </Typography>
        </Box>

        <Tooltip title="Advanced Controls">
          <IconButton 
            onClick={handleToggleAdvancedControls}
            size="small"
            color={state.showAdvancedControls ? 'primary' : 'default'}
          >
            <Settings />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Advanced Controls Panel */}
      {state.showAdvancedControls && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Advanced Settings
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.autoReverse}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    autoReverse: e.target.checked 
                  }))}
                  disabled={isLoading}
                />
              }
              label="Auto-reverse at boundaries"
            />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Playback Statistics
              </Typography>
              <Typography variant="caption" display="block">
                Current FPS: {(frameRate * state.speed).toFixed(1)}
              </Typography>
              <Typography variant="caption" display="block">
                Frame Interval: {frameIntervalRef.current.toFixed(1)}ms
              </Typography>
              <Typography variant="caption" display="block">
                Total Duration: {((totalSlices / frameRate) / state.speed).toFixed(1)}s
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Keyboard Shortcuts Help */}
      {enableKeyboardShortcuts && (
        <Box sx={{ mt: 2, p: 1, backgroundColor: 'info.light', borderRadius: 1 }}>
          <Typography variant="caption" color="info.contrastText">
            Shortcuts: Space (play/pause), ← → (navigate), Shift+← → (step), Home/End (first/last), Ctrl+R (reverse)
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CinePlayer;