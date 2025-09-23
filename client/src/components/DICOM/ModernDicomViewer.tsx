import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, IconButton, Typography, Slider, Stack, Chip,
  useTheme, alpha, Tooltip, ButtonGroup, Switch, FormControlLabel,
  Drawer, List, ListItem, ListItemText, ListItemIcon, Divider,
  Card, CardContent, LinearProgress, Alert, Fab, Snackbar,
  useMediaQuery, CircularProgress
} from '@mui/material';
import {
  PlayArrow, Pause, SkipNext, SkipPrevious, ZoomIn, ZoomOut,
  RotateLeft, RotateRight, Brightness6, Contrast, Fullscreen,
  Settings, Info, Visibility, VisibilityOff, Speed, Loop,
  CropFree, Straighten, RestartAlt, TouchApp, PanTool,
  InvertColors, FullscreenExit
} from '@mui/icons-material';
import { useAccessibility } from '../Accessibility/AccessibilityProvider';
import { useRadiologyWorkflow } from '../../hooks/useRadiologyWorkflow';
import TouchControls from './TouchControls';
import { createAppleHIGStyles, appleHIGColors, appleHIGTypography, appleHIGBorderRadius } from './AppleHIGStyles';
import { TabletOptimization } from './TabletOptimization';
import { ColorblindAccessibility, useColorblindAccessibility } from './ColorblindAccessibility';
import { useRadiologyDarkMode } from './RadiologyDarkMode';
import AdvancedDicomMetadata from './components/AdvancedDicomMetadata';

interface ModernDicomViewerProps {
  studyId?: string;
  seriesId?: string;
  instanceId?: string;
  width?: number;
  height?: number;
  enableTouch?: boolean;
  enableStylus?: boolean;
  enableGestures?: boolean;
  enableColorblindAccessibility?: boolean;
  enableRadiologyDarkMode?: boolean;
  colorVisionType?: 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  darkModePreferences?: {
    blueLight?: 'minimal' | 'moderate' | 'high';
    brightness?: 'low' | 'medium' | 'high';
    contrast?: 'standard' | 'enhanced' | 'maximum';
  };
  showOverlay?: boolean;
  showMeasurements?: boolean;
  autoPlay?: boolean;
  playbackSpeed?: number;
  onImageLoad?: (imageData: any) => void;
  onError?: (error: Error) => void;
  onMeasurement?: (measurement: any) => void;
}

interface ViewerState {
  isLoading: boolean;
  error: string | null;
  currentFrame: number;
  totalFrames: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  windowWidth: number;
  windowCenter: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  isPlaying: boolean;
  playbackSpeed: number;
  fullscreen: boolean;
  sidebarOpen: boolean;
  touchMode: boolean;
  gestureMode: boolean;
  imageData: string[];
  loadedImages: HTMLImageElement[];
}

const ModernDicomViewer: React.FC<ModernDicomViewerProps> = ({
  studyId,
  seriesId,
  instanceId,
  width = 800,
  height = 600,
  enableTouch = true,
  enableStylus = true,
  enableGestures = true,
  enableColorblindAccessibility = true,
  enableRadiologyDarkMode = true,
  colorVisionType = 'normal',
  darkModePreferences = {
    blueLight: 'moderate',
    brightness: 'medium',
    contrast: 'enhanced',
  },
  showOverlay = true,
  showMeasurements = true,
  autoPlay = false,
  playbackSpeed = 1,
  onImageLoad,
  onError,
  onMeasurement
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State management
  const [state, setState] = useState<ViewerState>({
    isLoading: true,
    error: null,
    currentFrame: 0,
    totalFrames: 1,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    windowWidth: 400,
    windowCenter: 40,
    brightness: 50,
    contrast: 50,
    invert: false,
    isPlaying: false,
    playbackSpeed: 1,
    fullscreen: false,
    sidebarOpen: false,
    touchMode: false,
    gestureMode: false,
    imageData: [],
    loadedImages: []
  });

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'info' | 'warning' | 'error'
  });

  // Hooks
  const { 
    highContrast, 
    reducedMotion, 
    fontSize, 
    focusVisible, 
    screenReaderAnnouncements,
    toggleHighContrast, 
    toggleReducedMotion, 
    setFontSize, 
    announceToScreenReader, 
    clearAnnouncements
  } = useAccessibility();
  
  const { 
    hangingProtocols,
    windowingPresets,
    autoWindowingRules,
    batchOperations,
    currentProtocol,
    isAutoWindowingEnabled,
    selectHangingProtocol,
    createCustomProtocol,
    updateProtocol,
    deleteProtocol,
    getProtocolsByStudyType,
    getAutoWindowing,
    createAutoWindowingRule,
    setIsAutoWindowingEnabled,
    createBatchOperation,
    executeBatchOperation,
    cancelBatchOperation,
    createWindowingPreset,
    updateWindowingPreset,
    deleteWindowingPreset,
    getPresetsByBodyPart,
    clearCaches
  } = useRadiologyWorkflow();
  
  const { 
    colors, 
    isColorblindMode, 
    colorblindType, 
    toggleColorblindMode 
  } = useColorblindAccessibility({
    colorVisionType: colorVisionType,
    enableAlternativeIndicators: enableColorblindAccessibility,
  });
  
  const { 
    theme: radiologyTheme, 
    preferences: radiologyPreferences, 
    updatePreferences: updateRadiologyPreferences 
  } = useRadiologyDarkMode();
  
  // Extract radiology colors from theme
  const radiologyColors = radiologyTheme.custom?.radiology || {
    background: { primary: '#0A0A0B', secondary: '#1A1A1C' },
    text: { primary: '#F5F5F7', secondary: '#D1D1D6' },
    surface: { level1: '#1C1C1E' },
    accent: { primary: '#007AFF' }
  };

  // Load DICOM data
  useEffect(() => {
    const loadDicomData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Simulate DICOM loading
        const mockImageData = Array.from({ length: 10 }, (_, i) => 
          `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
        );
        
        setState(prev => ({
          ...prev,
          imageData: mockImageData,
          totalFrames: mockImageData.length,
          isLoading: false
        }));
        
        if (onImageLoad) {
          onImageLoad(mockImageData);
        }
        
        announceToScreenReader(`DICOM study loaded with ${mockImageData.length} frames`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load DICOM data';
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        setNotification({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      }
    };

    if (studyId || seriesId || instanceId) {
      loadDicomData();
    }
  }, [studyId, seriesId, instanceId, onImageLoad, onError, announceToScreenReader]);

  // Playback control
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (state.isPlaying && state.totalFrames > 1) {
      intervalId = setInterval(() => {
        setState(prev => ({
          ...prev,
          currentFrame: (prev.currentFrame + 1) % prev.totalFrames
        }));
      }, 1000 / state.playbackSpeed);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isPlaying, state.playbackSpeed, state.totalFrames]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Skip keyboard shortcuts if focus is on input elements
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (event.key) {
        case ' ':
          event.preventDefault();
          setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setState(prev => ({ 
            ...prev, 
            currentFrame: Math.max(0, prev.currentFrame - 1) 
          }));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setState(prev => ({ 
            ...prev, 
            currentFrame: Math.min(prev.totalFrames - 1, prev.currentFrame + 1) 
          }));
          break;
        case 'r':
          if (event.ctrlKey) {
            event.preventDefault();
            setState(prev => ({ 
              ...prev, 
              zoom: 1, 
              pan: { x: 0, y: 0 }, 
              rotation: 0 
            }));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state.imageData[state.currentFrame]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply transformations
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(state.zoom, state.zoom);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.translate(state.pan.x, state.pan.y);
      
      // Apply image adjustments
      ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) ${state.invert ? 'invert(1)' : ''}`;
      
      // Draw image
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    };
    
    img.src = state.imageData[state.currentFrame];
  }, [state.currentFrame, state.imageData, state.zoom, state.pan, state.rotation, state.brightness, state.contrast, state.invert]);

  // Toolbar button component
  const ToolbarButton = ({ icon, onClick, tooltip, active = false }: {
    icon: React.ReactNode;
    onClick: () => void;
    tooltip: string;
    active?: boolean;
  }) => (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={onClick}
        size="small"
        sx={{
          color: active ? colors.primary : colors.onSurface,
          backgroundColor: active ? alpha(colors.primary, 0.12) : 'transparent',
          '&:hover': {
            backgroundColor: alpha(colors.primary, 0.08),
          },
          '&:disabled': {
            opacity: 0.38,
          },
          transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: enableRadiologyDarkMode ? radiologyColors.background.primary : colors.background,
        position: 'relative',
        overflow: 'hidden',
        // Apply radiology dark mode theme
        ...(enableRadiologyDarkMode && {
          backgroundColor: radiologyColors.background.primary,
          color: radiologyColors.text.primary,
          '& .MuiPaper-root': {
            backgroundColor: radiologyColors.surface.level1,
            color: radiologyColors.text.primary,
          },
          '& .MuiIconButton-root': {
            color: radiologyColors.text.secondary,
            '&:hover': {
              backgroundColor: alpha(radiologyColors.accent.primary, 0.08),
            },
          },
          '& .MuiSlider-root': {
            color: radiologyColors.accent.primary,
          },
          '& .MuiCard-root': {
            backgroundColor: radiologyColors.surface.level1,
            borderColor: alpha(radiologyColors.text.primary, 0.12),
          },
        }),
      }}
    >
      {/* Top Toolbar - Apple HIG Style */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${alpha(colors.onSurface, 0.12)}`,
          backdropFilter: 'blur(20px)',
          zIndex: 1000,
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Navigation Controls */}
          <ButtonGroup variant="outlined" size="small">
            <ToolbarButton
              icon={<SkipPrevious />}
              onClick={() => setState(prev => ({ ...prev, currentFrame: 0 }))}
              tooltip="First Frame"
            />
            <ToolbarButton
              icon={state.isPlaying ? <Pause /> : <PlayArrow />}
              onClick={() => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
              tooltip={state.isPlaying ? 'Pause' : 'Play'}
              active={state.isPlaying}
            />
            <ToolbarButton
              icon={<SkipNext />}
              onClick={() => setState(prev => ({ ...prev, currentFrame: prev.totalFrames - 1 }))}
              tooltip="Last Frame"
            />
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Zoom Controls */}
          <ButtonGroup variant="outlined" size="small">
            <ToolbarButton
              icon={<ZoomOut />}
              onClick={() => setState(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom * 0.8) }))}
              tooltip="Zoom Out"
            />
            <ToolbarButton
              icon={<ZoomIn />}
              onClick={() => setState(prev => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.25) }))}
              tooltip="Zoom In"
            />
            <ToolbarButton
              icon={<RestartAlt />}
              onClick={() => setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0 }))}
              tooltip="Reset View"
            />
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Touch Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={state.touchMode}
                onChange={(e) => setState(prev => ({ ...prev, touchMode: e.target.checked }))}
                size="small"
              />
            }
            label="Touch Mode"
            sx={{ ml: 1 }}
          />

          {/* Sidebar Toggle */}
          <ToolbarButton
            icon={<Settings />}
            onClick={() => setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))}
            tooltip="Toggle Sidebar"
            active={state.sidebarOpen}
          />

          {/* Frame Counter */}
          <Typography variant="body2" sx={{ ml: 'auto', color: colors.onSurface }}>
            {state.currentFrame + 1} / {state.totalFrames}
          </Typography>

          {/* Playback Speed */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Typography variant="caption">Speed:</Typography>
            <Slider
              value={state.playbackSpeed}
              onChange={(_, value) => setState(prev => ({ ...prev, playbackSpeed: value as number }))}
              min={0.25}
              max={4}
              step={0.25}
              size="small"
              sx={{ width: 80 }}
            />
            <Typography variant="caption">{state.playbackSpeed}x</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Canvas Container */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {state.isLoading ? (
            <CircularProgress size={60} sx={{ color: colors.primary }} />
          ) : state.error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {state.error}
            </Alert>
          ) : (
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                border: `1px solid ${alpha(colors.onSurface, 0.12)}`,
                borderRadius: 8,
              }}
            />
          )}

          {/* Touch Controls Overlay */}
          {enableTouch && state.touchMode && (
            <TouchControls
              onZoom={(factor) => setState(prev => ({ ...prev, zoom: prev.zoom * factor }))}
              onPan={(delta) => setState(prev => ({ 
                ...prev, 
                pan: { x: prev.pan.x + delta.x, y: prev.pan.y + delta.y } 
              }))}
              onRotate={(angle) => setState(prev => ({ ...prev, rotation: prev.rotation + angle }))}
              onWindowLevel={(windowWidth, windowCenter) => setState(prev => ({ 
                ...prev, 
                windowWidth, 
                windowCenter 
              }))}
              onBrightness={(brightness) => setState(prev => ({ ...prev, brightness }))}
              onContrast={(contrast) => setState(prev => ({ ...prev, contrast }))}
              currentZoom={state.zoom}
              currentPan={state.pan}
              currentRotation={state.rotation}
              currentWindowWidth={state.windowWidth}
              currentWindowCenter={state.windowCenter}
              currentBrightness={state.brightness}
              currentContrast={state.contrast}
              enableStylus={enableStylus}
              enableGestures={enableGestures}
            />
          )}

          {/* Tablet Optimization */}
          {isMobile && (
            <TabletOptimization
              enableTouch={enableTouch}
              enableStylus={enableStylus}
              enableHaptics={true}
              enablePalmRejection={true}
              orientation={isPortrait ? 'portrait' : 'landscape'}
              touchSensitivity={0.7}
              stylusSensitivity={0.8}
              onGesture={(gesture, data) => {
                // Handle gesture events
                console.log('Gesture:', gesture, data);
              }}
              onTouch={(event, data) => {
                // Handle touch events
                console.log('Touch:', event, data);
              }}
              onStylus={(event, data) => {
                // Handle stylus events
                console.log('Stylus:', event, data);
              }}
              onSettingsChange={(settings) => {
                // Handle settings changes
                console.log('Settings changed:', settings);
              }}
            />
          )}
        </Box>

        {/* Sidebar */}
        <Drawer
          anchor="right"
          open={state.sidebarOpen}
          onClose={() => setState(prev => ({ ...prev, sidebarOpen: false }))}
          variant="persistent"
          sx={{
            width: state.sidebarOpen ? 420 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 420,
              boxSizing: 'border-box',
              position: 'relative',
              height: '100%',
              backgroundColor: colors.surface,
              borderLeft: `1px solid ${alpha(colors.onSurface, 0.12)}`,
            },
          }}
        >
          <AdvancedDicomMetadata
            study={{
              id: studyId || '',
              study_uid: studyId || 'unknown',
              patient_id: 'unknown',
              patient_info: { 
                patient_id: 'unknown',
                name: 'Unknown Patient',
                gender: 'unknown'
              },
              study_date: new Date().toISOString().split('T')[0],
              modality: 'CT',
              exam_type: 'CT',
              study_description: 'DICOM Study',
              status: 'completed' as const,
              created_at: new Date().toISOString(),
              image_urls: [],
              dicom_metadata: {}
            }}
            showOverlay={showOverlay}
            compactMode={false}
          />

          {/* Quick Image Controls */}
          <Box sx={{ p: 2, borderTop: `1px solid ${alpha(colors.onSurface, 0.12)}` }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Controls
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption">Window Width</Typography>
                <Slider
                  value={state.windowWidth}
                  onChange={(_, value) => setState(prev => ({ ...prev, windowWidth: value as number }))}
                  min={1}
                  max={4000}
                  size="small"
                />
              </Box>
              
              <Box>
                <Typography variant="caption">Window Center</Typography>
                <Slider
                  value={state.windowCenter}
                  onChange={(_, value) => setState(prev => ({ ...prev, windowCenter: value as number }))}
                  min={-1000}
                  max={3000}
                  size="small"
                />
              </Box>
              
              <Box>
                <Typography variant="caption">Zoom: {state.zoom.toFixed(2)}x</Typography>
                <Slider
                  value={state.zoom}
                  onChange={(_, value) => setState(prev => ({ ...prev, zoom: value as number }))}
                  min={0.1}
                  max={10}
                  step={0.1}
                  size="small"
                />
              </Box>
            </Stack>
          </Box>
        </Drawer>
      </Box>

      {/* Colorblind Accessibility */}
      {enableColorblindAccessibility && (
        <ColorblindAccessibility
          enabled={isColorblindMode}
          colorVisionType={colorblindType}
          onSettingsChange={toggleColorblindMode}
        />
      )}

      {/* Fullscreen Toggle */}
      <Fab
        color="primary"
        size="small"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: state.sidebarOpen ? 436 : 16,
          transition: 'right 0.3s ease',
        }}
        onClick={() => {
          if (containerRef.current) {
            if (!document.fullscreenElement) {
              containerRef.current.requestFullscreen();
              setState(prev => ({ ...prev, fullscreen: true }));
            } else {
              document.exitFullscreen();
              setState(prev => ({ ...prev, fullscreen: false }));
            }
          }
        }}
      >
        {state.fullscreen ? <FullscreenExit /> : <Fullscreen />}
      </Fab>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={notification.severity} onClose={() => setNotification(prev => ({ ...prev, open: false }))}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ModernDicomViewer;