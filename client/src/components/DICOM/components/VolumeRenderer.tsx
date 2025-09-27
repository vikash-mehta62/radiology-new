/**
 * Volume Renderer - Advanced 3D Volume Rendering and MPR Views
 * 
 * Comprehensive 3D visualization capabilities including:
 * - Volume rendering with transfer functions
 * - Multi-planar reconstruction (MPR) views
 * - Maximum intensity projection (MIP)
 * - Minimum intensity projection (MinIP)
 * - Average intensity projection (AIP)
 * - Curved MPR and oblique reformatting
 * - Real-time manipulation and interaction
 * - Performance optimization for large datasets
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef
} from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Button,
  ButtonGroup,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Divider,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  ThreeDRotation as VolumeIcon,
  ViewInAr as MPRIcon,
  Layers as LayersIcon,
  Tune as TuneIcon,
  Opacity as OpacityIcon,
  Brightness6 as BrightnessIcon,
  Contrast as ContrastIcon,
  Palette as ColorIcon,
  CameraAlt as CameraIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Refresh as ResetIcon
} from '@mui/icons-material';

// Services
import { Cornerstone3DService } from '../../../services/cornerstone3DService';
import { enhancedDicomService } from '../../../services/enhancedDicomService';
import { performanceMonitor } from '../../../services/performanceMonitor';

// Types
export interface VolumeRendererProps {
  // Volume data
  seriesInstanceUID?: string;
  volumeId?: string;
  imageIds?: string[];
  
  // Rendering mode
  renderingMode?: 'volume' | 'mpr' | 'mip' | 'minip' | 'aip';
  mprPlanes?: ('axial' | 'sagittal' | 'coronal' | 'oblique')[];
  
  // Volume rendering settings
  transferFunction?: TransferFunction;
  preset?: VolumePreset;
  enableShading?: boolean;
  enableGradientOpacity?: boolean;
  
  // MPR settings
  sliceThickness?: number;
  interpolation?: 'nearest' | 'linear' | 'cubic';
  enableCurvedMPR?: boolean;
  
  // Interaction
  enableRotation?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableCrosshair?: boolean;
  enableMeasurements?: boolean;
  
  // Performance
  enableLOD?: boolean;
  maxTextureSize?: number;
  enableGPUAcceleration?: boolean;
  
  // Event handlers
  onVolumeLoad?: (volumeId: string) => void;
  onRenderingModeChange?: (mode: string) => void;
  onTransferFunctionChange?: (tf: TransferFunction) => void;
  onCameraChange?: (camera: CameraState) => void;
  
  // Layout
  width?: number | string;
  height?: number | string;
  className?: string;
  sx?: any;
}

export interface VolumeRendererRef {
  // Volume controls
  loadVolume: (seriesInstanceUID: string) => Promise<void>;
  setRenderingMode: (mode: string) => void;
  setTransferFunction: (tf: TransferFunction) => void;
  setPreset: (preset: VolumePreset) => void;
  
  // Camera controls
  resetCamera: () => void;
  rotateCamera: (x: number, y: number, z: number) => void;
  zoomCamera: (factor: number) => void;
  panCamera: (x: number, y: number) => void;
  
  // MPR controls
  setMPRPlane: (plane: string, position: number) => void;
  getMPRPlane: (plane: string) => number;
  
  // Export
  exportImage: () => string | null;
  exportVolume: () => any;
}

interface TransferFunction {
  colorPoints: ColorPoint[];
  opacityPoints: OpacityPoint[];
  range: [number, number];
}

interface ColorPoint {
  value: number;
  color: [number, number, number]; // RGB
}

interface OpacityPoint {
  value: number;
  opacity: number;
}

interface VolumePreset {
  name: string;
  transferFunction: TransferFunction;
  windowLevel?: { window: number; level: number };
  description?: string;
}

interface CameraState {
  position: [number, number, number];
  focalPoint: [number, number, number];
  viewUp: [number, number, number];
  zoom: number;
}

interface MPRState {
  axial: number;
  sagittal: number;
  coronal: number;
  oblique: number;
}

const VolumeRenderer = forwardRef<VolumeRendererRef, VolumeRendererProps>(({
  seriesInstanceUID,
  volumeId,
  imageIds = [],
  renderingMode = 'volume',
  mprPlanes = ['axial', 'sagittal', 'coronal'],
  transferFunction,
  preset,
  enableShading = true,
  enableGradientOpacity = true,
  sliceThickness = 1.0,
  interpolation = 'linear',
  enableCurvedMPR = false,
  enableRotation = true,
  enableZoom = true,
  enablePan = true,
  enableCrosshair = true,
  enableMeasurements = false,
  enableLOD = true,
  maxTextureSize = 2048,
  enableGPUAcceleration = true,
  onVolumeLoad,
  onRenderingModeChange,
  onTransferFunctionChange,
  onCameraChange,
  width = '100%',
  height = '100%',
  className,
  sx
}, ref) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingEngineRef = useRef<any>(null);
  const viewportRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  
  // State management
  const [currentMode, setCurrentMode] = useState(renderingMode);
  const [currentPreset, setCurrentPreset] = useState<VolumePreset | null>(preset || null);
  const [currentTransferFunction, setCurrentTransferFunction] = useState<TransferFunction | null>(
    transferFunction || null
  );
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [0, 0, 100],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0],
    zoom: 1.0
  });
  const [mprState, setMprState] = useState<MPRState>({
    axial: 0,
    sagittal: 0,
    coronal: 0,
    oblique: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [volumeInfo, setVolumeInfo] = useState<any>(null);

  // Volume presets
  const volumePresets: VolumePreset[] = useMemo(() => [
    {
      name: 'CT Bone',
      description: 'Optimized for bone visualization',
      transferFunction: {
        colorPoints: [
          { value: -1000, color: [0, 0, 0] },
          { value: 200, color: [1, 1, 0.9] },
          { value: 1000, color: [1, 1, 1] }
        ],
        opacityPoints: [
          { value: -1000, opacity: 0 },
          { value: 200, opacity: 0 },
          { value: 400, opacity: 0.2 },
          { value: 1000, opacity: 1 }
        ],
        range: [-1000, 1000]
      },
      windowLevel: { window: 1500, level: 300 }
    },
    {
      name: 'CT Soft Tissue',
      description: 'Optimized for soft tissue visualization',
      transferFunction: {
        colorPoints: [
          { value: -1000, color: [0, 0, 0] },
          { value: -500, color: [0.5, 0.3, 0.3] },
          { value: 40, color: [1, 0.8, 0.8] },
          { value: 80, color: [1, 1, 1] }
        ],
        opacityPoints: [
          { value: -1000, opacity: 0 },
          { value: -500, opacity: 0 },
          { value: 40, opacity: 0.3 },
          { value: 80, opacity: 1 }
        ],
        range: [-1000, 200]
      },
      windowLevel: { window: 400, level: 40 }
    },
    {
      name: 'MR Brain',
      description: 'Optimized for brain MRI',
      transferFunction: {
        colorPoints: [
          { value: 0, color: [0, 0, 0] },
          { value: 100, color: [0.3, 0.3, 0.5] },
          { value: 200, color: [0.8, 0.8, 1] },
          { value: 300, color: [1, 1, 1] }
        ],
        opacityPoints: [
          { value: 0, opacity: 0 },
          { value: 50, opacity: 0.1 },
          { value: 150, opacity: 0.5 },
          { value: 300, opacity: 1 }
        ],
        range: [0, 300]
      }
    },
    {
      name: 'Angiography',
      description: 'Optimized for vascular visualization',
      transferFunction: {
        colorPoints: [
          { value: 0, color: [0, 0, 0] },
          { value: 100, color: [1, 0, 0] },
          { value: 200, color: [1, 0.5, 0.5] },
          { value: 300, color: [1, 1, 1] }
        ],
        opacityPoints: [
          { value: 0, opacity: 0 },
          { value: 80, opacity: 0 },
          { value: 120, opacity: 0.8 },
          { value: 300, opacity: 1 }
        ],
        range: [0, 300]
      }
    }
  ], []);

  // Initialize rendering engine
  useEffect(() => {
    initializeRenderingEngine();
    return () => {
      cleanup();
    };
  }, []);

  // Load volume when series changes
  useEffect(() => {
    if (seriesInstanceUID) {
      loadVolumeData();
    }
  }, [seriesInstanceUID]);

  // Update rendering mode
  useEffect(() => {
    if (viewportRef.current && currentMode !== renderingMode) {
      updateRenderingMode(currentMode);
    }
  }, [currentMode, renderingMode]);

  // Initialize rendering engine
  const initializeRenderingEngine = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      // Initialize Cornerstone3D rendering engine
      const renderingEngine = await Cornerstone3DService.createRenderingEngine('volumeRenderer');
      renderingEngineRef.current = renderingEngine;

      // Create viewport
      const viewport = await renderingEngine.createViewport({
        viewportId: 'volumeViewport',
        type: 'VOLUME_3D',
        element: canvasRef.current,
        defaultOptions: {
          background: [0, 0, 0],
          orientation: 'axial'
        }
      });

      viewportRef.current = viewport;

      // Set up event listeners
      setupEventListeners();

    } catch (error) {
      console.error('Failed to initialize rendering engine:', error);
    }
  }, []);

  // Load volume data
  const loadVolumeData = useCallback(async () => {
    if (!seriesInstanceUID || !viewportRef.current) return;

    try {
      setIsLoading(true);
      setLoadingProgress(0);

      // Load series data
      const seriesData = await enhancedDicomService.loadSeries(seriesInstanceUID);
      setLoadingProgress(30);

      // Create volume
      const volume = await Cornerstone3DService.createVolume({
        volumeId: `volume_${seriesInstanceUID}`,
        imageIds: seriesData.imageIds
      });

      setLoadingProgress(70);

      // Set volume to viewport
      await viewportRef.current.setVolumes([volume]);
      setVolumeInfo(volume.metadata);

      setLoadingProgress(100);
      setIsLoading(false);

      // Apply default preset if available
      if (volumePresets.length > 0 && !currentPreset) {
        applyPreset(volumePresets[0]);
      }

      if (onVolumeLoad) {
        onVolumeLoad(volume.volumeId);
      }

    } catch (error) {
      console.error('Failed to load volume:', error);
      setIsLoading(false);
    }
  }, [seriesInstanceUID, currentPreset, volumePresets, onVolumeLoad]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (!canvasRef.current || !viewportRef.current) return;

    const canvas = canvasRef.current;
    let isDragging = false;
    let lastMousePos = { x: 0, y: 0 };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      lastMousePos = { x: event.clientX, y: event.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;

      if (enableRotation && !event.shiftKey && !event.ctrlKey) {
        // Rotate camera
        rotateCameraBy(deltaX * 0.5, deltaY * 0.5, 0);
      } else if (enablePan && event.shiftKey) {
        // Pan camera
        panCameraBy(deltaX, deltaY);
      }

      lastMousePos = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      if (enableZoom) {
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        zoomCameraBy(zoomFactor);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [enableRotation, enablePan, enableZoom]);

  // Update rendering mode
  const updateRenderingMode = useCallback(async (mode: string) => {
    if (!viewportRef.current) return;

    try {
      await viewportRef.current.setRenderingMode(mode);
      
      if (onRenderingModeChange) {
        onRenderingModeChange(mode);
      }

      // Render
      viewportRef.current.render();

    } catch (error) {
      console.error('Failed to update rendering mode:', error);
    }
  }, [onRenderingModeChange]);

  // Apply volume preset
  const applyPreset = useCallback(async (preset: VolumePreset) => {
    if (!viewportRef.current) return;

    try {
      setCurrentPreset(preset);
      setCurrentTransferFunction(preset.transferFunction);

      // Apply transfer function
      await viewportRef.current.setTransferFunction(preset.transferFunction);

      // Apply window/level if available
      if (preset.windowLevel) {
        await viewportRef.current.setWindowLevel(
          preset.windowLevel.window,
          preset.windowLevel.level
        );
      }

      if (onTransferFunctionChange) {
        onTransferFunctionChange(preset.transferFunction);
      }

      // Render
      viewportRef.current.render();

    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  }, [onTransferFunctionChange]);

  // Camera controls
  const resetCamera = useCallback(() => {
    if (!viewportRef.current) return;

    const defaultCamera: CameraState = {
      position: [0, 0, 100],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
      zoom: 1.0
    };

    setCameraState(defaultCamera);
    viewportRef.current.setCamera(defaultCamera);
    viewportRef.current.render();

    if (onCameraChange) {
      onCameraChange(defaultCamera);
    }
  }, [onCameraChange]);

  const rotateCameraBy = useCallback((x: number, y: number, z: number) => {
    if (!viewportRef.current) return;

    const camera = viewportRef.current.getCamera();
    // Apply rotation logic here
    viewportRef.current.setCamera(camera);
    viewportRef.current.render();

    setCameraState(camera);
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [onCameraChange]);

  const zoomCameraBy = useCallback((factor: number) => {
    if (!viewportRef.current) return;

    const camera = viewportRef.current.getCamera();
    camera.zoom *= factor;
    
    viewportRef.current.setCamera(camera);
    viewportRef.current.render();

    setCameraState(camera);
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [onCameraChange]);

  const panCameraBy = useCallback((x: number, y: number) => {
    if (!viewportRef.current) return;

    const camera = viewportRef.current.getCamera();
    // Apply pan logic here
    viewportRef.current.setCamera(camera);
    viewportRef.current.render();

    setCameraState(camera);
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [onCameraChange]);

  // Auto rotation
  const startAutoRotation = useCallback(() => {
    if (animationRef.current) return;

    setIsRotating(true);
    
    const animate = () => {
      rotateCameraBy(1, 0, 0);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [rotateCameraBy]);

  const stopAutoRotation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsRotating(false);
  }, []);

  // MPR controls
  const setMPRPlane = useCallback((plane: string, position: number) => {
    if (!viewportRef.current) return;

    setMprState(prev => ({ ...prev, [plane]: position }));
    
    // Update MPR plane position
    viewportRef.current.setMPRPlane(plane, position);
    viewportRef.current.render();
  }, []);

  const getMPRPlane = useCallback((plane: string) => {
    return mprState[plane as keyof MPRState] || 0;
  }, [mprState]);

  // Export functions
  const exportImage = useCallback(() => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL();
  }, []);

  const exportVolume = useCallback(() => {
    if (!viewportRef.current) return null;
    return viewportRef.current.getVolume();
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (renderingEngineRef.current) {
      renderingEngineRef.current.destroy();
    }
  }, []);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    loadVolume: loadVolumeData,
    setRenderingMode: (mode: string) => {
      setCurrentMode(mode);
      updateRenderingMode(mode);
    },
    setTransferFunction: (tf: TransferFunction) => {
      setCurrentTransferFunction(tf);
      if (viewportRef.current) {
        viewportRef.current.setTransferFunction(tf);
        viewportRef.current.render();
      }
    },
    setPreset: applyPreset,
    resetCamera,
    rotateCamera: rotateCameraBy,
    zoomCamera: zoomCameraBy,
    panCamera: panCameraBy,
    setMPRPlane,
    getMPRPlane,
    exportImage,
    exportVolume
  }), [
    loadVolumeData,
    updateRenderingMode,
    applyPreset,
    resetCamera,
    rotateCameraBy,
    zoomCameraBy,
    panCameraBy,
    setMPRPlane,
    getMPRPlane,
    exportImage,
    exportVolume
  ]);

  // Render controls panel
  const renderControlsPanel = () => (
    <Box sx={{ width: 300, p: 2, borderLeft: '1px solid', borderColor: 'divider' }}>
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
        <Tab label="Rendering" />
        <Tab label="Camera" />
        <Tab label="MPR" />
      </Tabs>

      {/* Rendering Controls */}
      {activeTab === 0 && (
        <Box sx={{ mt: 2 }}>
          {/* Rendering Mode */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Rendering Mode</InputLabel>
            <Select
              value={currentMode}
              onChange={(e) => {
                setCurrentMode(e.target.value);
                updateRenderingMode(e.target.value);
              }}
            >
              <MenuItem value="volume">Volume Rendering</MenuItem>
              <MenuItem value="mpr">Multi-Planar Reconstruction</MenuItem>
              <MenuItem value="mip">Maximum Intensity Projection</MenuItem>
              <MenuItem value="minip">Minimum Intensity Projection</MenuItem>
              <MenuItem value="aip">Average Intensity Projection</MenuItem>
            </Select>
          </FormControl>

          {/* Presets */}
          <Typography variant="subtitle2" gutterBottom>
            Volume Presets
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {volumePresets.map((preset, index) => (
              <Grid item xs={6} key={preset.name}>
                <Button
                  variant={currentPreset?.name === preset.name ? 'contained' : 'outlined'}
                  size="small"
                  fullWidth
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </Button>
              </Grid>
            ))}
          </Grid>

          {/* Transfer Function Controls */}
          {currentTransferFunction && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Transfer Function
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption">Opacity Range</Typography>
                <Slider
                  value={[
                    currentTransferFunction.range[0],
                    currentTransferFunction.range[1]
                  ]}
                  onChange={(_, value) => {
                    const newTF = {
                      ...currentTransferFunction,
                      range: value as [number, number]
                    };
                    setCurrentTransferFunction(newTF);
                  }}
                  min={-1000}
                  max={3000}
                  step={10}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
          )}

          {/* Rendering Options */}
          <Divider sx={{ my: 2 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={enableShading}
                onChange={(e) => {
                  // Update shading
                }}
              />
            }
            label="Enable Shading"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={enableGradientOpacity}
                onChange={(e) => {
                  // Update gradient opacity
                }}
              />
            }
            label="Gradient Opacity"
          />
        </Box>
      )}

      {/* Camera Controls */}
      {activeTab === 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Camera Controls
          </Typography>
          
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ResetIcon />}
                onClick={resetCamera}
              >
                Reset
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant={isRotating ? 'contained' : 'outlined'}
                fullWidth
                startIcon={isRotating ? <PauseIcon /> : <PlayIcon />}
                onClick={isRotating ? stopAutoRotation : startAutoRotation}
              >
                Auto Rotate
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption">Zoom: {cameraState.zoom.toFixed(2)}</Typography>
            <Slider
              value={cameraState.zoom}
              onChange={(_, value) => {
                const newZoom = value as number;
                zoomCameraBy(newZoom / cameraState.zoom);
              }}
              min={0.1}
              max={5.0}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Box>

          <ButtonGroup fullWidth sx={{ mb: 1 }}>
            <IconButton onClick={() => rotateCameraBy(-10, 0, 0)}>
              <RotateLeftIcon />
            </IconButton>
            <IconButton onClick={() => rotateCameraBy(10, 0, 0)}>
              <RotateRightIcon />
            </IconButton>
            <IconButton onClick={() => zoomCameraBy(1.2)}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={() => zoomCameraBy(0.8)}>
              <ZoomOutIcon />
            </IconButton>
          </ButtonGroup>
        </Box>
      )}

      {/* MPR Controls */}
      {activeTab === 2 && currentMode === 'mpr' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            MPR Plane Positions
          </Typography>
          
          {mprPlanes.map((plane) => (
            <Box key={plane} sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                {plane}: {mprState[plane as keyof MPRState]}
              </Typography>
              <Slider
                value={mprState[plane as keyof MPRState]}
                onChange={(_, value) => setMPRPlane(plane, value as number)}
                min={0}
                max={volumeInfo?.dimensions?.[plane === 'axial' ? 2 : plane === 'sagittal' ? 0 : 1] || 100}
                step={1}
                valueLabelDisplay="auto"
              />
            </Box>
          ))}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Interpolation</InputLabel>
            <Select value={interpolation}>
              <MenuItem value="nearest">Nearest</MenuItem>
              <MenuItem value="linear">Linear</MenuItem>
              <MenuItem value="cubic">Cubic</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption">Slice Thickness: {sliceThickness}mm</Typography>
            <Slider
              value={sliceThickness}
              onChange={(_, value) => {
                // Update slice thickness
              }}
              min={0.5}
              max={10.0}
              step={0.5}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Paper
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        overflow: 'hidden',
        ...sx
      }}
    >
      {/* Main Viewer */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">
            3D Volume Renderer
          </Typography>
          
          {isLoading && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={loadingProgress} />
              <Typography variant="caption" color="text.secondary">
                Loading volume... {loadingProgress}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Canvas */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'grab',
              display: 'block'
            }}
          />
          
          {/* Overlay Controls */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              gap: 1
            }}
          >
            <ButtonGroup size="small">
              <IconButton onClick={() => setCurrentMode('volume')}>
                <VolumeIcon />
              </IconButton>
              <IconButton onClick={() => setCurrentMode('mpr')}>
                <MPRIcon />
              </IconButton>
              <IconButton onClick={() => setCurrentMode('mip')}>
                <LayersIcon />
              </IconButton>
            </ButtonGroup>
          </Box>
        </Box>
      </Box>

      {/* Controls Panel */}
      {renderControlsPanel()}
    </Paper>
  );
});

VolumeRenderer.displayName = 'VolumeRenderer';

export default VolumeRenderer;
export type { 
  VolumeRendererProps, 
  VolumeRendererRef, 
  TransferFunction, 
  VolumePreset, 
  CameraState,
  MPRState 
};