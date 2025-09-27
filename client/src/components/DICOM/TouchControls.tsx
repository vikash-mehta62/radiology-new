/**
 * Enhanced Touch Controls for DICOM Viewer
 * Optimized for tablet use in radiology reading rooms with stylus support
 */

import React, { useRef, useCallback, useEffect, useState, useMemo, startTransition } from 'react';
import {
  Box, Paper, IconButton, Typography, Slider, Stack, Chip,
  useTheme, alpha, Tooltip, ButtonGroup, Switch, FormControlLabel
} from '@mui/material';
import {
  TouchApp, PanTool, Gesture, ZoomIn, ZoomOut, RotateLeft, RotateRight,
  Brightness6, Contrast, Straighten, CropFree, RestartAlt,
  Visibility, VisibilityOff, Settings, Info
} from '@mui/icons-material';

interface TouchControlsProps {
  onZoom: (zoom: number) => void;
  onPan: (pan: { x: number; y: number }) => void;
  onRotate: (rotation: number) => void;
  onWindowLevel: (windowWidth: number, windowCenter: number) => void;
  onBrightness: (brightness: number) => void;
  onContrast: (contrast: number) => void;
  currentZoom: number;
  currentPan: { x: number; y: number };
  currentRotation: number;
  currentWindowWidth: number;
  currentWindowCenter: number;
  currentBrightness: number;
  currentContrast: number;
  enableStylus?: boolean;
  enableGestures?: boolean;
}

interface TouchState {
  isActive: boolean;
  startPosition: { x: number; y: number };
  lastPosition: { x: number; y: number };
  initialZoom: number;
  initialPan: { x: number; y: number };
  touchCount: number;
  gestureType: 'none' | 'pan' | 'zoom' | 'rotate' | 'window';
  stylusMode: boolean;
  pressureSupported: boolean;
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onZoom,
  onPan,
  onRotate,
  onWindowLevel,
  onBrightness,
  onContrast,
  currentZoom,
  currentPan,
  currentRotation,
  currentWindowWidth,
  currentWindowCenter,
  currentBrightness,
  currentContrast,
  enableStylus = true,
  enableGestures = true
}) => {
  const theme = useTheme();
  const touchAreaRef = useRef<HTMLDivElement>(null);
  
  // Initialize state with lazy initialization for React 19
  const [touchState, setTouchState] = useState<TouchState>(() => ({
    isActive: false,
    startPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    touchCount: 0,
    gestureType: 'none',
    stylusMode: false,
    pressureSupported: false
  }));

  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeGesture, setActiveGesture] = useState<string>('pan');

  // Memoize colors for React 19 performance
  const colors = useMemo(() => ({
    primary: theme.palette.mode === 'dark' ? '#007AFF' : '#0066CC',
    secondary: theme.palette.mode === 'dark' ? '#5AC8FA' : '#34C759',
    surface: theme.palette.mode === 'dark' ? '#1C1C1E' : '#FFFFFF',
    surfaceVariant: theme.palette.mode === 'dark' ? '#2C2C2E' : '#F2F2F7',
    onSurface: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
    accent: theme.palette.mode === 'dark' ? '#FF9F0A' : '#FF9500'
  }), [theme.palette.mode]);

  // Detect stylus and pressure support - React 19 optimized
  useEffect(() => {
    const checkStylusSupport = () => {
      const hasPointerEvents = 'PointerEvent' in window;
      const hasPressure = 'pressure' in (new PointerEvent('pointerdown') as any);
      
      startTransition(() => {
        setTouchState(prev => ({
          ...prev,
          pressureSupported: hasPointerEvents && hasPressure
        }));
      });
    };

    checkStylusSupport();
  }, []);

  // Touch event handlers with gesture recognition - React 19 optimized
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableGestures) return;

    const touches = e.touches;
    const touch = touches[0];
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    startTransition(() => {
      setTouchState(prev => ({
        ...prev,
        isActive: true,
        startPosition: { x, y },
        lastPosition: { x, y },
        initialZoom: currentZoom,
        initialPan: currentPan,
        touchCount: touches.length,
        gestureType: touches.length === 1 ? 'pan' : touches.length === 2 ? 'zoom' : 'none'
      }));
    });

    e.preventDefault();
  }, [enableGestures, currentZoom, currentPan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.isActive || !enableGestures) return;

    const touches = e.touches;
    const touch = touches[0];
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (touchState.gestureType === 'pan' && touches.length === 1) {
      const deltaX = x - touchState.lastPosition.x;
      const deltaY = y - touchState.lastPosition.y;
      
      if (activeGesture === 'pan') {
        onPan({
          x: currentPan.x + deltaX,
          y: currentPan.y + deltaY
        });
      } else if (activeGesture === 'window') {
        const windowDelta = deltaX * 10;
        const levelDelta = -deltaY * 5;
        onWindowLevel(
          Math.max(1, currentWindowWidth + windowDelta),
          currentWindowCenter + levelDelta
        );
      }
    } else if (touchState.gestureType === 'zoom' && touches.length === 2) {
      const touch2 = touches[1];
      const x2 = touch2.clientX - rect.left;
      const y2 = touch2.clientY - rect.top;
      
      const currentDistance = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
      const initialDistance = Math.sqrt(
        Math.pow(touchState.startPosition.x - x, 2) + 
        Math.pow(touchState.startPosition.y - y, 2)
      );
      
      if (initialDistance > 0) {
        const zoomFactor = currentDistance / initialDistance;
        onZoom(Math.max(0.1, Math.min(10, touchState.initialZoom * zoomFactor)));
      }
    }

    startTransition(() => {
      setTouchState(prev => ({
        ...prev,
        lastPosition: { x, y }
      }));
    });

    e.preventDefault();
  }, [touchState, enableGestures, activeGesture, currentPan, currentWindowWidth, currentWindowCenter, onPan, onWindowLevel, onZoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    startTransition(() => {
      setTouchState(prev => ({
        ...prev,
        isActive: false,
        gestureType: 'none',
        touchCount: 0
      }));
    });

    e.preventDefault();
  }, []);

  // Stylus/Pointer event handlers - React 19 optimized
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!enableStylus || e.pointerType !== 'pen') return;

    startTransition(() => {
      setTouchState(prev => ({
        ...prev,
        stylusMode: true,
        pressureSupported: 'pressure' in e && e.pressure > 0
      }));
    });

    if (e.pressure > 0.5) {
      startTransition(() => {
        setActiveGesture('annotate');
      });
    }
  }, [enableStylus]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!touchState.stylusMode || e.pointerType !== 'pen') return;

    if ('pressure' in e && e.pressure > 0) {
      const pressure = e.pressure;
      
      if (pressure > 0.7) {
        // High pressure - fine adjustments
      } else if (pressure > 0.3) {
        // Medium pressure - normal interaction
      }
    }
  }, [touchState.stylusMode]);

  // Memoize gesture buttons for React 19 performance
  const gestureButtons = useMemo(() => [
    { id: 'pan', icon: <PanTool />, label: 'Pan', tooltip: 'Drag to move image' },
    { id: 'zoom', icon: <ZoomIn />, label: 'Zoom', tooltip: 'Pinch to zoom' },
    { id: 'window', icon: <Brightness6 />, label: 'Window', tooltip: 'Adjust window/level' },
    { id: 'rotate', icon: <RotateLeft />, label: 'Rotate', tooltip: 'Two-finger rotate' }
  ], []);

  // Memoize zoom handlers for React 19 performance
  const handleZoomOut = useCallback(() => {
    onZoom(Math.max(0.1, currentZoom * 0.8));
  }, [onZoom, currentZoom]);

  const handleZoomIn = useCallback(() => {
    onZoom(Math.min(5, currentZoom * 1.25));
  }, [onZoom, currentZoom]);

  const handleRotateLeft = useCallback(() => {
    onRotate(currentRotation - 90);
  }, [onRotate, currentRotation]);

  const handleRotateRight = useCallback(() => {
    onRotate(currentRotation + 90);
  }, [onRotate, currentRotation]);

  const handleReset = useCallback(() => {
    onZoom(1);
    onPan({ x: 0, y: 0 });
    onRotate(0);
  }, [onZoom, onPan, onRotate]);

  const handleControlsToggle = useCallback(() => {
    startTransition(() => {
      setControlsVisible(prev => !prev);
    });
  }, []);

  const handleGestureChange = useCallback((gestureId: string) => {
    startTransition(() => {
      setActiveGesture(gestureId);
    });
  }, []);

  // Memoize touch area styles for React 19 performance
  const touchAreaStyles = useMemo(() => ({
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    zIndex: 1,
    cursor: touchState.isActive ? 'grabbing' : 'grab',
    touchAction: 'none' as const,
  }), [touchState.isActive]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Touch Area */}
      <Box
        ref={touchAreaRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        sx={touchAreaStyles}
      />

      {/* Floating Touch Controls */}
      {controlsVisible && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 1000,
            backgroundColor: alpha(colors.surface, 0.95),
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            p: 2,
          }}
        >
          {/* Gesture Mode Selector */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Touch Gesture
            </Typography>
            <ButtonGroup variant="outlined" size="small" fullWidth>
              {gestureButtons.map((gesture) => (
                <Tooltip key={gesture.id} title={gesture.tooltip}>
                  <IconButton
                    onClick={() => handleGestureChange(gesture.id)}
                    sx={{
                      backgroundColor: activeGesture === gesture.id ? colors.primary : 'transparent',
                      color: activeGesture === gesture.id ? 'white' : colors.onSurface,
                      '&:hover': {
                        backgroundColor: activeGesture === gesture.id ? colors.primary : alpha(colors.onSurface, 0.08),
                      },
                    }}
                  >
                    {gesture.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </ButtonGroup>
          </Box>

          {/* Quick Controls */}
          <Stack spacing={2}>
            {/* Zoom Control */}
            <Box>
              <Typography variant="caption" gutterBottom>
                Zoom: {Math.round(currentZoom * 100)}%
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={handleZoomOut}>
                  <ZoomOut />
                </IconButton>
                <Slider
                  value={currentZoom}
                  min={0.1}
                  max={5}
                  step={0.1}
                  onChange={(_, value) => onZoom(value as number)}
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" onClick={handleZoomIn}>
                  <ZoomIn />
                </IconButton>
              </Stack>
            </Box>

            {/* Window/Level Control */}
            <Box>
              <Typography variant="caption" gutterBottom>
                Window: {currentWindowWidth} / Level: {currentWindowCenter}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">Width</Typography>
                  <Slider
                    value={currentWindowWidth}
                    min={1}
                    max={4000}
                    onChange={(_, value) => onWindowLevel(value as number, currentWindowCenter)}
                    size="small"
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">Center</Typography>
                  <Slider
                    value={currentWindowCenter}
                    min={-1000}
                    max={3000}
                    onChange={(_, value) => onWindowLevel(currentWindowWidth, value as number)}
                    size="small"
                  />
                </Box>
              </Stack>
            </Box>

            {/* Quick Actions */}
            <Stack direction="row" spacing={1} justifyContent="space-between">
              <IconButton
                size="small"
                onClick={handleRotateLeft}
                sx={{ backgroundColor: alpha(colors.onSurface, 0.08) }}
              >
                <RotateLeft />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleRotateRight}
                sx={{ backgroundColor: alpha(colors.onSurface, 0.08) }}
              >
                <RotateRight />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleReset}
                sx={{ backgroundColor: alpha(colors.onSurface, 0.08) }}
              >
                <RestartAlt />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleControlsToggle}
                sx={{ backgroundColor: alpha(colors.onSurface, 0.08) }}
              >
                <VisibilityOff />
              </IconButton>
            </Stack>

            {/* Stylus Status */}
            {enableStylus && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  icon={<TouchApp />}
                  label={touchState.stylusMode ? 'Stylus Active' : 'Touch Mode'}
                  color={touchState.stylusMode ? 'primary' : 'default'}
                />
                {touchState.pressureSupported && (
                  <Chip
                    size="small"
                    label="Pressure Sensitive"
                    color="secondary"
                  />
                )}
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Show Controls Button */}
      {!controlsVisible && (
        <IconButton
          onClick={handleControlsToggle}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            backgroundColor: colors.primary,
            color: 'white',
            '&:hover': {
              backgroundColor: colors.primary,
            },
          }}
        >
          <Settings />
        </IconButton>
      )}

      {/* Active Gesture Indicator */}
      {touchState.isActive && (
        <Chip
          label={`${activeGesture.toUpperCase()} Active`}
          color="primary"
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000,
          }}
        />
      )}
    </Box>
  );
};

export default React.memo(TouchControls);