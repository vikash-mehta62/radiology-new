/**
 * Tablet Optimization Component for Radiology Reading Rooms
 * 
 * This component provides comprehensive tablet optimization for radiology workflows,
 * including touch gestures, stylus support, adaptive layouts, and specialized
 * controls optimized for medical imaging on tablet devices.
 * 
 * Features:
 * - Touch-optimized UI with larger touch targets
 * - Stylus support for precise annotations and measurements
 * - Adaptive layouts for portrait/landscape orientations
 * - Gesture recognition for common radiology tasks
 * - Haptic feedback for tactile confirmation
 * - Palm rejection for stylus use
 * - Multi-touch support for advanced gestures
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Slider,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  TouchApp as TouchIcon,
  Gesture as GestureIcon,
  Edit as StylusIcon,
  Rotate90DegreesCcw as RotateIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  PanTool as PanIcon,
  Straighten as MeasureIcon,
  RadioButtonUnchecked as ROIIcon,
  TextFields as TextIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Brightness6 as BrightnessIcon,
  Contrast as ContrastIcon,
  Palette as PaletteIcon,
  Vibration as HapticIcon,
  TouchApp,
  SwipeLeft,
  SwipeRight,
  SwipeUp,
  SwipeDown,
} from '@mui/icons-material';

// Types and interfaces
export interface TabletOptimizationProps {
  /** Enable touch gestures */
  enableTouch?: boolean;
  /** Enable stylus support */
  enableStylus?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Enable palm rejection */
  enablePalmRejection?: boolean;
  /** Current orientation */
  orientation?: 'portrait' | 'landscape';
  /** Touch sensitivity (0-1) */
  touchSensitivity?: number;
  /** Stylus pressure sensitivity (0-1) */
  stylusSensitivity?: number;
  /** Gesture callbacks */
  onGesture?: (gesture: GestureType, data: GestureData) => void;
  /** Touch event callbacks */
  onTouch?: (event: TouchEvent, data: TouchData) => void;
  /** Stylus event callbacks */
  onStylus?: (event: StylusEvent, data: StylusData) => void;
  /** Settings change callback */
  onSettingsChange?: (settings: TabletSettings) => void;
}

export interface GestureData {
  type: GestureType;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  distance: number;
  velocity: number;
  direction: 'up' | 'down' | 'left' | 'right';
  fingers: number;
  timestamp: number;
}

export interface TouchData {
  touches: TouchPoint[];
  pressure: number;
  area: number;
  timestamp: number;
}

export interface StylusData {
  point: { x: number; y: number };
  pressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: 'pen' | 'touch';
  timestamp: number;
}

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  pressure: number;
  radiusX: number;
  radiusY: number;
}

export interface TabletSettings {
  touchSensitivity: number;
  stylusSensitivity: number;
  enableHaptics: boolean;
  enablePalmRejection: boolean;
  gestureThreshold: number;
  touchTargetSize: 'small' | 'medium' | 'large';
  orientationLock: boolean;
  autoHideUI: boolean;
}

export type GestureType = 
  | 'tap' 
  | 'double-tap' 
  | 'long-press' 
  | 'swipe' 
  | 'pinch' 
  | 'rotate' 
  | 'pan' 
  | 'two-finger-tap'
  | 'three-finger-tap';

export type TouchEvent = 'start' | 'move' | 'end' | 'cancel';
export type StylusEvent = 'down' | 'move' | 'up' | 'hover';

// Touch target sizes for different accessibility needs
const TOUCH_TARGET_SIZES = {
  small: {
    minSize: 44,
    padding: 8,
    fontSize: '0.875rem',
  },
  medium: {
    minSize: 56,
    padding: 12,
    fontSize: '1rem',
  },
  large: {
    minSize: 72,
    padding: 16,
    fontSize: '1.125rem',
  },
};

// Gesture recognition thresholds
const GESTURE_THRESHOLDS = {
  tap: { maxDistance: 10, maxDuration: 300 },
  doubleTap: { maxDistance: 20, maxInterval: 400 },
  longPress: { minDuration: 500, maxDistance: 10 },
  swipe: { minDistance: 50, minVelocity: 0.5 },
  pinch: { minDistance: 20 },
  rotate: { minAngle: 15 },
  pan: { minDistance: 5 },
};

/**
 * Main Tablet Optimization Component
 */
export const TabletOptimization: React.FC<TabletOptimizationProps> = ({
  enableTouch = true,
  enableStylus = true,
  enableHaptics = true,
  enablePalmRejection = true,
  orientation = 'landscape',
  touchSensitivity = 0.7,
  stylusSensitivity = 0.8,
  onGesture,
  onTouch,
  onStylus,
  onSettingsChange,
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isPortrait = useMediaQuery('(orientation: portrait)');
  
  // State management
  const [settings, setSettings] = useState<TabletSettings>({
    touchSensitivity,
    stylusSensitivity,
    enableHaptics,
    enablePalmRejection,
    gestureThreshold: 0.5,
    touchTargetSize: 'medium',
    orientationLock: false,
    autoHideUI: false,
  });
  
  const [activeGestures, setActiveGestures] = useState<Set<GestureType>>(new Set());
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [stylusActive, setStylusActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  // Refs for gesture tracking
  const gestureStartRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const touchHistoryRef = useRef<TouchPoint[][]>([]);
  
  // Haptic feedback function
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.enableHaptics || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    
    navigator.vibrate(patterns[type]);
  }, [settings.enableHaptics]);
  
  // Gesture recognition
  const recognizeGesture = useCallback((
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    duration: number,
    fingers: number
  ): GestureType | null => {
    const distance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + 
      Math.pow(endPoint.y - startPoint.y, 2)
    );
    const velocity = distance / duration;
    
    // Tap gestures
    if (distance <= GESTURE_THRESHOLDS.tap.maxDistance) {
      if (duration <= GESTURE_THRESHOLDS.tap.maxDuration) {
        if (fingers === 1) return 'tap';
        if (fingers === 2) return 'two-finger-tap';
        if (fingers === 3) return 'three-finger-tap';
      } else if (duration >= GESTURE_THRESHOLDS.longPress.minDuration) {
        return 'long-press';
      }
    }
    
    // Swipe gestures
    if (distance >= GESTURE_THRESHOLDS.swipe.minDistance && 
        velocity >= GESTURE_THRESHOLDS.swipe.minVelocity) {
      return 'swipe';
    }
    
    // Pan gesture
    if (distance >= GESTURE_THRESHOLDS.pan.minDistance && fingers === 1) {
      return 'pan';
    }
    
    // Multi-touch gestures
    if (fingers === 2) {
      if (distance >= GESTURE_THRESHOLDS.pinch.minDistance) {
        return 'pinch';
      }
    }
    
    return null;
  }, []);
  
  // Touch event handlers
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!enableTouch) return;
    
    const touches = Array.from(event.touches).map((touch, index) => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      pressure: (touch as any).force || 0.5,
      radiusX: (touch as any).radiusX || 20,
      radiusY: (touch as any).radiusY || 20,
    }));
    
    setTouchPoints(touches);
    
    if (touches.length === 1) {
      gestureStartRef.current = {
        x: touches[0].x,
        y: touches[0].y,
        timestamp: Date.now(),
      };
    }
    
    // Palm rejection
    if (settings.enablePalmRejection && stylusActive) {
      event.preventDefault();
      return;
    }
    
    triggerHaptic('light');
    
    onTouch?.('start', {
      touches,
      pressure: touches.reduce((sum, t) => sum + t.pressure, 0) / touches.length,
      area: touches.reduce((sum, t) => sum + (t.radiusX * t.radiusY), 0),
      timestamp: Date.now(),
    });
  }, [enableTouch, settings.enablePalmRejection, stylusActive, triggerHaptic, onTouch]);
  
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!enableTouch) return;
    
    const touches = Array.from(event.touches).map((touch, index) => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      pressure: (touch as any).force || 0.5,
      radiusX: (touch as any).radiusX || 20,
      radiusY: (touch as any).radiusY || 20,
    }));
    
    setTouchPoints(touches);
    touchHistoryRef.current.push(touches);
    
    // Keep only recent history
    if (touchHistoryRef.current.length > 10) {
      touchHistoryRef.current.shift();
    }
    
    onTouch?.('move', {
      touches,
      pressure: touches.reduce((sum, t) => sum + t.pressure, 0) / touches.length,
      area: touches.reduce((sum, t) => sum + (t.radiusX * t.radiusY), 0),
      timestamp: Date.now(),
    });
  }, [enableTouch, onTouch]);
  
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!enableTouch || !gestureStartRef.current) return;
    
    const endTime = Date.now();
    const duration = endTime - gestureStartRef.current.timestamp;
    const remainingTouches = Array.from(event.touches);
    
    if (remainingTouches.length === 0) {
      // All fingers lifted - recognize gesture
      const lastTouch = touchPoints[0];
      if (lastTouch) {
        const gesture = recognizeGesture(
          gestureStartRef.current,
          { x: lastTouch.x, y: lastTouch.y },
          duration,
          touchPoints.length
        );
        
        if (gesture) {
          setActiveGestures(prev => new Set([...prev, gesture]));
          
          // Check for double tap
          if (gesture === 'tap' && lastTapRef.current) {
            const timeSinceLastTap = endTime - lastTapRef.current.timestamp;
            const distanceFromLastTap = Math.sqrt(
              Math.pow(lastTouch.x - lastTapRef.current.x, 2) +
              Math.pow(lastTouch.y - lastTapRef.current.y, 2)
            );
            
            if (timeSinceLastTap <= GESTURE_THRESHOLDS.doubleTap.maxInterval &&
                distanceFromLastTap <= GESTURE_THRESHOLDS.doubleTap.maxDistance) {
              setActiveGestures(prev => new Set([...prev, 'double-tap']));
              
              onGesture?.('double-tap', {
                type: 'double-tap',
                startPoint: gestureStartRef.current!,
                endPoint: { x: lastTouch.x, y: lastTouch.y },
                distance: distanceFromLastTap,
                velocity: distanceFromLastTap / duration,
                direction: getSwipeDirection(gestureStartRef.current!, { x: lastTouch.x, y: lastTouch.y }),
                fingers: 1,
                timestamp: endTime,
              });
              
              triggerHaptic('medium');
              lastTapRef.current = null;
            } else {
              lastTapRef.current = { x: lastTouch.x, y: lastTouch.y, timestamp: endTime };
            }
          } else if (gesture === 'tap') {
            lastTapRef.current = { x: lastTouch.x, y: lastTouch.y, timestamp: endTime };
          }
          
          onGesture?.(gesture, {
            type: gesture,
            startPoint: gestureStartRef.current,
            endPoint: { x: lastTouch.x, y: lastTouch.y },
            distance: Math.sqrt(
              Math.pow(lastTouch.x - gestureStartRef.current.x, 2) +
              Math.pow(lastTouch.y - gestureStartRef.current.y, 2)
            ),
            velocity: Math.sqrt(
              Math.pow(lastTouch.x - gestureStartRef.current.x, 2) +
              Math.pow(lastTouch.y - gestureStartRef.current.y, 2)
            ) / duration,
            direction: getSwipeDirection(gestureStartRef.current, { x: lastTouch.x, y: lastTouch.y }),
            fingers: touchPoints.length,
            timestamp: endTime,
          });
          
          triggerHaptic(gesture === 'long-press' ? 'heavy' : 'light');
        }
      }
      
      // Clear gesture tracking
      gestureStartRef.current = null;
      setTouchPoints([]);
      touchHistoryRef.current = [];
      
      // Clear active gestures after a delay
      setTimeout(() => {
        setActiveGestures(new Set());
      }, 100);
    }
    
    onTouch?.('end', {
      touches: remainingTouches.map((touch, index) => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        pressure: (touch as any).force || 0.5,
        radiusX: (touch as any).radiusX || 20,
        radiusY: (touch as any).radiusY || 20,
      })),
      pressure: 0,
      area: 0,
      timestamp: endTime,
    });
  }, [enableTouch, touchPoints, recognizeGesture, onGesture, onTouch, triggerHaptic]);
  
  // Stylus event handlers
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (!enableStylus || event.pointerType !== 'pen') return;
    
    setStylusActive(true);
    
    const stylusData: StylusData = {
      point: { x: event.clientX, y: event.clientY },
      pressure: event.pressure,
      tiltX: event.tiltX || 0,
      tiltY: event.tiltY || 0,
      twist: (event as any).twist || 0,
      pointerType: event.pointerType as 'pen',
      timestamp: Date.now(),
    };
    
    triggerHaptic('light');
    onStylus?.('down', stylusData);
  }, [enableStylus, triggerHaptic, onStylus]);
  
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!enableStylus || event.pointerType !== 'pen') return;
    
    const stylusData: StylusData = {
      point: { x: event.clientX, y: event.clientY },
      pressure: event.pressure,
      tiltX: event.tiltX || 0,
      tiltY: event.tiltY || 0,
      twist: (event as any).twist || 0,
      pointerType: event.pointerType as 'pen',
      timestamp: Date.now(),
    };
    
    onStylus?.('move', stylusData);
  }, [enableStylus, onStylus]);
  
  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (!enableStylus || event.pointerType !== 'pen') return;
    
    setStylusActive(false);
    
    const stylusData: StylusData = {
      point: { x: event.clientX, y: event.clientY },
      pressure: 0,
      tiltX: event.tiltX || 0,
      tiltY: event.tiltY || 0,
      twist: (event as any).twist || 0,
      pointerType: event.pointerType as 'pen',
      timestamp: Date.now(),
    };
    
    onStylus?.('up', stylusData);
  }, [enableStylus, onStylus]);
  
  // Settings update handler
  const updateSettings = useCallback((newSettings: Partial<TabletSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      onSettingsChange?.(updated);
      return updated;
    });
  }, [onSettingsChange]);
  
  // Utility function to determine swipe direction
  const getSwipeDirection = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  };
  
  // Touch target size based on settings
  const touchTargetSize = TOUCH_TARGET_SIZES[settings.touchTargetSize];
  
  // Speed dial actions for common radiology tasks
  const speedDialActions = [
    {
      icon: <ZoomInIcon />,
      name: 'Zoom In',
      action: () => onGesture?.('pinch', {} as GestureData),
    },
    {
      icon: <ZoomOutIcon />,
      name: 'Zoom Out',
      action: () => onGesture?.('pinch', {} as GestureData),
    },
    {
      icon: <RotateIcon />,
      name: 'Rotate',
      action: () => onGesture?.('rotate', {} as GestureData),
    },
    {
      icon: <MeasureIcon />,
      name: 'Measure',
      action: () => {},
    },
    {
      icon: <ROIIcon />,
      name: 'ROI',
      action: () => {},
    },
    {
      icon: <TextIcon />,
      name: 'Annotate',
      action: () => {},
    },
  ];
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Touch visualization overlay */}
      {touchPoints.map((touch) => (
        <Box
          key={touch.id}
          sx={{
            position: 'absolute',
            left: touch.x - 20,
            top: touch.y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 122, 255, 0.3)',
            border: '2px solid rgba(0, 122, 255, 0.6)',
            pointerEvents: 'none',
            transform: `scale(${touch.pressure})`,
            transition: 'transform 0.1s ease',
          }}
        />
      ))}
      
      {/* Stylus indicator */}
      {stylusActive && (
        <Chip
          icon={<StylusIcon />}
          label="Stylus Active"
          color="primary"
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000,
          }}
        />
      )}
      
      {/* Active gesture indicators */}
      {activeGestures.size > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            gap: 1,
            zIndex: 1000,
          }}
        >
          {Array.from(activeGestures).map((gesture) => (
            <Chip
              key={gesture}
              icon={<GestureIcon />}
              label={gesture}
              color="secondary"
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      )}
      
      {/* Speed dial for quick actions */}
      <SpeedDial
        ariaLabel="Tablet Actions"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          '& .MuiFab-primary': {
            width: touchTargetSize.minSize,
            height: touchTargetSize.minSize,
          },
        }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
            sx={{
              '& .MuiFab-primary': {
                width: touchTargetSize.minSize * 0.8,
                height: touchTargetSize.minSize * 0.8,
              },
            }}
          />
        ))}
      </SpeedDial>
      
      {/* Settings FAB */}
      <Fab
        color="default"
        size="medium"
        onClick={() => setSettingsOpen(true)}
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          width: touchTargetSize.minSize,
          height: touchTargetSize.minSize,
        }}
      >
        <SettingsIcon />
      </Fab>
      
      {/* Settings drawer */}
      <Drawer
        anchor="left"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            padding: 2,
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Tablet Settings
        </Typography>
        
        <List>
          <ListItem>
            <ListItemText
              primary="Touch Sensitivity"
              secondary={`Current: ${Math.round(settings.touchSensitivity * 100)}%`}
            />
          </ListItem>
          <ListItem>
            <Slider
              value={settings.touchSensitivity}
              onChange={(_, value) => updateSettings({ touchSensitivity: value as number })}
              min={0.1}
              max={1.0}
              step={0.1}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </ListItem>
          
          <Divider />
          
          <ListItem>
            <ListItemText
              primary="Stylus Sensitivity"
              secondary={`Current: ${Math.round(settings.stylusSensitivity * 100)}%`}
            />
          </ListItem>
          <ListItem>
            <Slider
              value={settings.stylusSensitivity}
              onChange={(_, value) => updateSettings({ stylusSensitivity: value as number })}
              min={0.1}
              max={1.0}
              step={0.1}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </ListItem>
          
          <Divider />
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableHaptics}
                  onChange={(e) => updateSettings({ enableHaptics: e.target.checked })}
                />
              }
              label="Haptic Feedback"
            />
          </ListItem>
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enablePalmRejection}
                  onChange={(e) => updateSettings({ enablePalmRejection: e.target.checked })}
                />
              }
              label="Palm Rejection"
            />
          </ListItem>
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.orientationLock}
                  onChange={(e) => updateSettings({ orientationLock: e.target.checked })}
                />
              }
              label="Lock Orientation"
            />
          </ListItem>
          
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoHideUI}
                  onChange={(e) => updateSettings({ autoHideUI: e.target.checked })}
                />
              }
              label="Auto-hide UI"
            />
          </ListItem>
        </List>
      </Drawer>
      
      {/* Notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={index}
          open={true}
          autoHideDuration={3000}
          onClose={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="info" onClose={() => setNotifications(prev => prev.filter((_, i) => i !== index))}>
            {notification}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default TabletOptimization;