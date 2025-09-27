/**
 * VTK.js Multi-Planar Reconstruction (MPR) Viewer Component
 * Provides synchronized axial, sagittal, and coronal views using VTK.js
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Sync,
  SyncDisabled,
  CenterFocusStrong,
  Refresh,
  Settings,
  Fullscreen,
  CameraAlt,
  Straighten
} from '@mui/icons-material';

// VTK.js imports
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageReslice from '@kitware/vtk.js/Imaging/Core/ImageReslice';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';
import { mat4 } from 'gl-matrix';

import { vtkDicomLoader } from '../services/vtkDicomLoader';

// Register OpenGL view
vtkRenderWindow.registerViewConstructor('WebGL', vtkOpenGLRenderWindow);

export interface VTKMPRViewerProps {
  studyId: string;
  seriesId: string;
  width?: number;
  height?: number;
  onError?: (error: string) => void;
  onVolumeLoaded?: (volumeInfo: any) => void;
  onSliceChange?: (plane: string, slice: number) => void;
  enableSynchronization?: boolean;
  showCrosshairs?: boolean;
  windowWidth?: number;
  windowCenter?: number;
}

interface MPRPlane {
  name: string;
  orientation: 'axial' | 'sagittal' | 'coronal';
  normal: [number, number, number];
  up: [number, number, number];
  color: string;
}

interface MPRViewport {
  renderWindow: any;
  renderer: any;
  interactor: any;
  imageSlice: any;
  imageMapper: any;
  reslice: any;
  container: HTMLDivElement | null;
}

interface CrosshairPosition {
  x: number;
  y: number;
  z: number;
}

const VTKMPRViewer: React.FC<VTKMPRViewerProps> = ({
  studyId,
  seriesId,
  width = 800,
  height = 600,
  onError,
  onVolumeLoaded,
  onSliceChange,
  enableSynchronization = true,
  showCrosshairs = true,
  windowWidth = 400,
  windowCenter = 200
}) => {
  // Container refs
  const axialContainerRef = useRef<HTMLDivElement>(null);
  const sagittalContainerRef = useRef<HTMLDivElement>(null);
  const coronalContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLoaded, setVolumeLoaded] = useState(false);
  const [synchronizedNavigation, setSynchronizedNavigation] = useState(enableSynchronization);
  const [showControls, setShowControls] = useState(true);
  
  // Volume data
  const [volumeData, setVolumeData] = useState<any>(null);
  const [imageData, setImageData] = useState<any>(null);

  // Crosshair position (normalized coordinates 0-1)
  const [crosshairPosition, setCrosshairPosition] = useState<CrosshairPosition>({
    x: 0.5,
    y: 0.5,
    z: 0.5
  });

  // Slice positions
  const [slicePositions, setSlicePositions] = useState({
    axial: 0.5,
    sagittal: 0.5,
    coronal: 0.5
  });

  // Window/Level settings - Optimized for better contrast
  const [windowSettings, setWindowSettings] = useState({
    width: windowWidth,
    center: windowCenter,
    // Performance optimizations
    interpolationType: 1, // Linear interpolation for better quality
    enableCaching: true, // Enable image caching for faster navigation
    renderingQuality: 'high' // High quality rendering
  });

  // Performance settings for MPR rendering
  const [performanceSettings, setPerformanceSettings] = useState({
    enableGPUAcceleration: true,
    maxTextureSize: 2048, // Optimized texture size
    enableLOD: false, // Disable Level of Detail for medical accuracy
    antiAliasing: true, // Enable anti-aliasing for smoother edges
    enableDepthPeeling: false, // Disable for better performance in 2D views
    renderOnDemand: true // Only render when needed
  });

  // MPR viewports
  const [viewports, setViewports] = useState<{
    axial: MPRViewport | null;
    sagittal: MPRViewport | null;
    coronal: MPRViewport | null;
  }>({
    axial: null,
    sagittal: null,
    coronal: null
  });

  // MPR plane configurations
  const mprPlanes: MPRPlane[] = [
    {
      name: 'Axial',
      orientation: 'axial',
      normal: [0, 0, 1],
      up: [0, 1, 0],
      color: '#ff0000'
    },
    {
      name: 'Sagittal',
      orientation: 'sagittal',
      normal: [1, 0, 0],
      up: [0, 0, 1],
      color: '#00ff00'
    },
    {
      name: 'Coronal',
      orientation: 'coronal',
      normal: [0, 1, 0],
      up: [0, 0, 1],
      color: '#0000ff'
    }
  ];

  /**
   * Initialize MPR viewport
   */
  const initializeViewport = useCallback((
    container: HTMLDivElement,
    plane: MPRPlane
  ): MPRViewport => {
    // Create render window
    const renderWindow = vtkRenderWindow.newInstance();
    const renderer = vtkRenderer.newInstance();
    renderWindow.addRenderer(renderer);

    // Set background color
    renderer.setBackground(0.1, 0.1, 0.1);

    // Create the OpenGL render window view first
    const openglRenderWindow = renderWindow.newAPISpecificView('WebGL');
    if (!openglRenderWindow) {
      throw new Error('Failed to create OpenGL render window view');
    }

    // Create interactor and set the view
    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);
    
    // Use image interaction style
    const interactorStyle = vtkInteractorStyleImage.newInstance();
    interactor.setInteractorStyle(interactorStyle);

    // Create image slice and mapper
    const imageSlice = vtkImageSlice.newInstance();
    const imageMapper = vtkImageMapper.newInstance();
    imageSlice.setMapper(imageMapper);

    // Create reslice filter
    const reslice = vtkImageReslice.newInstance();
    imageMapper.setInputConnection(reslice.getOutputPort());

    // Add slice to renderer
    renderer.addViewProp(imageSlice);

    // Initialize render window container - reuse the already created openglRenderWindow
    openglRenderWindow.setContainer(container);
    
    const viewportWidth = Math.floor(width / 2);
    const viewportHeight = Math.floor(height / 2);
    openglRenderWindow.setSize(viewportWidth, viewportHeight);

    interactor.initialize();
    interactor.bindEvents(container);

    return {
      renderWindow,
      renderer,
      interactor,
      imageSlice,
      imageMapper,
      reslice,
      container
    };
  }, [width, height]);

  /**
   * Load DICOM volume data
   */
  const loadVolumeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Loading DICOM volume data for MPR: ${studyId}, series: ${seriesId}`);

      // Load DICOM series
      const volumeData = await vtkDicomLoader.loadDicomSeries(studyId, seriesId, 100);
      
      if (!volumeData) {
        throw new Error('Failed to load DICOM volume data');
      }

      // Create VTK image data
      const imageData = vtkImageData.newInstance();
      
      // Set dimensions and spacing
      imageData.setDimensions(volumeData.dimensions);
      imageData.setSpacing(volumeData.spacing);
      imageData.setOrigin(volumeData.origin || [0, 0, 0]);

      // Create data array
      const dataArray = vtkDataArray.newInstance({
        name: 'scalars',
        values: volumeData.scalarData,
        numberOfComponents: 1
      });

      // Set scalar data
      imageData.getPointData().setScalars(dataArray);

      setVolumeData(volumeData);
      setImageData(imageData);
      setVolumeLoaded(true);

      onVolumeLoaded?.(volumeData);

      console.log('✅ DICOM volume data loaded for MPR');

    } catch (error) {
      console.error('❌ Failed to load volume data for MPR:', error);
      setError(`Failed to load volume data: ${error}`);
      onError?.(`Failed to load volume data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [studyId, seriesId, onError, onVolumeLoaded]);

  /**
   * Setup MPR reslicing for a specific plane
   */
  const setupMPRReslicing = useCallback((
    viewport: MPRViewport,
    plane: MPRPlane,
    slicePosition: number
  ) => {
    if (!imageData || !viewport) return;

    const { reslice, imageMapper, renderer } = viewport;

    // Set input data
    reslice.setInputData(imageData);

    // Create reslice matrix based on plane orientation
    const resliceMatrix = mat4.create();
    const bounds = imageData.getBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2
    ];

    // Calculate slice position in world coordinates
    const dimensions = imageData.getDimensions();
    const spacing = imageData.getSpacing();

    let sliceCenter = [...center];
    
    switch (plane.orientation) {
      case 'axial':
        sliceCenter[2] = bounds[4] + slicePosition * (bounds[5] - bounds[4]);
        // Set matrix elements directly (gl-matrix uses column-major order)
        resliceMatrix[0] = 1; resliceMatrix[4] = 0; resliceMatrix[8] = 0; resliceMatrix[12] = sliceCenter[0];
        resliceMatrix[1] = 0; resliceMatrix[5] = 1; resliceMatrix[9] = 0; resliceMatrix[13] = sliceCenter[1];
        resliceMatrix[2] = 0; resliceMatrix[6] = 0; resliceMatrix[10] = 0; resliceMatrix[14] = sliceCenter[2];
        resliceMatrix[3] = 0; resliceMatrix[7] = 0; resliceMatrix[11] = 0; resliceMatrix[15] = 1;
        break;
        
      case 'sagittal':
        sliceCenter[0] = bounds[0] + slicePosition * (bounds[1] - bounds[0]);
        // Set matrix elements directly (gl-matrix uses column-major order)
        resliceMatrix[0] = 0; resliceMatrix[4] = 0; resliceMatrix[8] = 1; resliceMatrix[12] = sliceCenter[0];
        resliceMatrix[1] = 0; resliceMatrix[5] = 1; resliceMatrix[9] = 0; resliceMatrix[13] = sliceCenter[1];
        resliceMatrix[2] = 1; resliceMatrix[6] = 0; resliceMatrix[10] = 0; resliceMatrix[14] = sliceCenter[2];
        resliceMatrix[3] = 0; resliceMatrix[7] = 0; resliceMatrix[11] = 0; resliceMatrix[15] = 1;
        break;
        
      case 'coronal':
        sliceCenter[1] = bounds[2] + slicePosition * (bounds[3] - bounds[2]);
        // Set matrix elements directly (gl-matrix uses column-major order)
        resliceMatrix[0] = 1; resliceMatrix[4] = 0; resliceMatrix[8] = 0; resliceMatrix[12] = sliceCenter[0];
        resliceMatrix[1] = 0; resliceMatrix[5] = 0; resliceMatrix[9] = 1; resliceMatrix[13] = sliceCenter[1];
        resliceMatrix[2] = 0; resliceMatrix[6] = 1; resliceMatrix[10] = 0; resliceMatrix[14] = sliceCenter[2];
        resliceMatrix[3] = 0; resliceMatrix[7] = 0; resliceMatrix[11] = 0; resliceMatrix[15] = 1;
        break;
    }

    // Apply reslice matrix
    reslice.setResliceAxes(resliceMatrix);
    reslice.setInterpolationModeToLinear();
    reslice.setOutputDimensionality(2);

    // Update window/level
    imageMapper.setColorWindow(windowSettings.width);
    imageMapper.setColorLevel(windowSettings.center);

    // Reset camera and render
    renderer.resetCamera();
    viewport.renderWindow.render();

  }, [imageData, windowSettings]);

  /**
   * Update all MPR views
   */
  const updateAllViews = useCallback(() => {
    if (!volumeLoaded || !imageData) return;

    Object.entries(viewports).forEach(([orientation, viewport]) => {
      if (viewport) {
        const plane = mprPlanes.find(p => p.orientation === orientation as any);
        if (plane) {
          const slicePosition = slicePositions[orientation as keyof typeof slicePositions];
          setupMPRReslicing(viewport, plane, slicePosition);
        }
      }
    });
  }, [volumeLoaded, imageData, viewports, slicePositions, setupMPRReslicing, mprPlanes]);

  /**
   * Handle slice position change
   */
  const handleSliceChange = useCallback((
    orientation: 'axial' | 'sagittal' | 'coronal',
    position: number
  ) => {
    setSlicePositions(prev => ({
      ...prev,
      [orientation]: position
    }));

    if (synchronizedNavigation) {
      // Update crosshair position based on the changed slice
      setCrosshairPosition(prev => ({
        ...prev,
        [orientation === 'axial' ? 'z' : orientation === 'sagittal' ? 'x' : 'y']: position
      }));
    }

    onSliceChange?.(orientation, position);
  }, [synchronizedNavigation, onSliceChange]);

  /**
   * Reset all views
   */
  const resetViews = useCallback(() => {
    setSlicePositions({
      axial: 0.5,
      sagittal: 0.5,
      coronal: 0.5
    });
    setCrosshairPosition({ x: 0.5, y: 0.5, z: 0.5 });
    
    // Reset cameras
    Object.values(viewports).forEach(viewport => {
      if (viewport) {
        viewport.renderer.resetCamera();
        viewport.renderWindow.render();
      }
    });
  }, [viewports]);

  /**
   * Take screenshot of all views
   */
  const takeScreenshot = useCallback(() => {
    // Create a canvas to combine all views
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewportWidth = Math.floor(width / 2);
    const viewportHeight = Math.floor(height / 2);
    
    canvas.width = width;
    canvas.height = height;

    // Get canvas from each viewport and draw to combined canvas
    const positions = [
      { x: 0, y: 0 }, // axial
      { x: viewportWidth, y: 0 }, // sagittal
      { x: 0, y: viewportHeight }, // coronal
    ];

    Object.values(viewports).forEach((viewport, index) => {
      if (viewport && viewport.renderWindow) {
        const vtkCanvas = viewport.renderWindow.getViews()[0].getCanvas();
        if (vtkCanvas) {
          ctx.drawImage(vtkCanvas, positions[index].x, positions[index].y);
        }
      }
    });

    // Download screenshot
    const link = document.createElement('a');
    link.download = `mpr-views-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [viewports, width, height]);

  // Initialize viewports when containers are ready
  useEffect(() => {
    const containers = [
      axialContainerRef.current,
      sagittalContainerRef.current,
      coronalContainerRef.current
    ];

    if (containers.every(container => container)) {
      const newViewports = {
        axial: initializeViewport(containers[0]!, mprPlanes[0]),
        sagittal: initializeViewport(containers[1]!, mprPlanes[1]),
        coronal: initializeViewport(containers[2]!, mprPlanes[2])
      };

      setViewports(newViewports);

      // Cleanup function
      return () => {
        Object.values(newViewports).forEach(viewport => {
          if (viewport) {
            viewport.interactor?.delete();
            viewport.renderWindow?.delete();
          }
        });
      };
    }
  }, [initializeViewport, mprPlanes]);

  // Load volume data when component mounts
  useEffect(() => {
    if (studyId && seriesId) {
      loadVolumeData();
    }
  }, [studyId, seriesId, loadVolumeData]);

  // Update views when data or settings change
  useEffect(() => {
    updateAllViews();
  }, [updateAllViews]);

  const viewportWidth = Math.floor(width / 2);
  const viewportHeight = Math.floor(height / 2);

  return (
    <Box sx={{ width, height, display: 'flex', position: 'relative' }}>
      {/* Main MPR Grid */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Axial View */}
          <Grid item xs={6} sx={{ height: '50%', position: 'relative' }}>
            <Paper
              sx={{
                height: '100%',
                m: 0.5,
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: mprPlanes[0].color
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 1000,
                  color: mprPlanes[0].color,
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  px: 1,
                  borderRadius: 1
                }}
              >
                {mprPlanes[0].name}
              </Typography>
              <div
                ref={axialContainerRef}
                style={{
                  width: '100%',
                  height: '100%'
                }}
              />
            </Paper>
          </Grid>

          {/* Sagittal View */}
          <Grid item xs={6} sx={{ height: '50%', position: 'relative' }}>
            <Paper
              sx={{
                height: '100%',
                m: 0.5,
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: mprPlanes[1].color
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 1000,
                  color: mprPlanes[1].color,
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  px: 1,
                  borderRadius: 1
                }}
              >
                {mprPlanes[1].name}
              </Typography>
              <div
                ref={sagittalContainerRef}
                style={{
                  width: '100%',
                  height: '100%'
                }}
              />
            </Paper>
          </Grid>

          {/* Coronal View */}
          <Grid item xs={6} sx={{ height: '50%', position: 'relative' }}>
            <Paper
              sx={{
                height: '100%',
                m: 0.5,
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: mprPlanes[2].color
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 1000,
                  color: mprPlanes[2].color,
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  px: 1,
                  borderRadius: 1
                }}
              >
                {mprPlanes[2].name}
              </Typography>
              <div
                ref={coronalContainerRef}
                style={{
                  width: '100%',
                  height: '100%'
                }}
              />
            </Paper>
          </Grid>

          {/* Info Panel */}
          <Grid item xs={6} sx={{ height: '50%' }}>
            <Paper
              sx={{
                height: '100%',
                m: 0.5,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto'
              }}
            >
              <Typography variant="h6" gutterBottom>
                MPR Information
              </Typography>

              {volumeData && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Dimensions:</strong> {volumeData.dimensions.join(' × ')}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Spacing:</strong> {volumeData.spacing.map((s: number) => s.toFixed(2)).join(' × ')} mm
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Data Range:</strong> {volumeData.dataRange[0]} - {volumeData.dataRange[1]}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" gutterBottom>
                <strong>Crosshair Position:</strong>
              </Typography>
              <Typography variant="caption">
                X: {(crosshairPosition.x * 100).toFixed(1)}%,{' '}
                Y: {(crosshairPosition.y * 100).toFixed(1)}%,{' '}
                Z: {(crosshairPosition.z * 100).toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Loading Overlay */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2000
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <CircularProgress color="primary" />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading DICOM Volume for MPR...
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              right: 16,
              zIndex: 2001
            }}
          >
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Toolbar */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 1,
            zIndex: 1999
          }}
        >
          <Tooltip title={synchronizedNavigation ? 'Disable Synchronization' : 'Enable Synchronization'}>
            <IconButton
              size="small"
              onClick={() => setSynchronizedNavigation(!synchronizedNavigation)}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: synchronizedNavigation ? '#4caf50' : 'white'
              }}
            >
              {synchronizedNavigation ? <Sync /> : <SyncDisabled />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Reset Views">
            <IconButton
              size="small"
              onClick={resetViews}
              sx={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
            >
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>

          <Tooltip title="Take Screenshot">
            <IconButton
              size="small"
              onClick={takeScreenshot}
              sx={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
            >
              <CameraAlt />
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle Controls">
            <IconButton
              size="small"
              onClick={() => setShowControls(!showControls)}
              sx={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
            >
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls Panel */}
      {showControls && (
        <Paper
          sx={{
            width: 280,
            ml: 2,
            p: 2,
            maxHeight: height,
            overflow: 'auto'
          }}
        >
          <Typography variant="h6" gutterBottom>
            MPR Controls
          </Typography>

          <Grid container spacing={2}>
            {/* Slice Position Controls */}
            {mprPlanes.map((plane) => (
              <Grid item xs={12} key={plane.orientation}>
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{ color: plane.color, fontWeight: 'bold' }}
                >
                  {plane.name} Slice: {(slicePositions[plane.orientation] * 100).toFixed(1)}%
                </Typography>
                <Slider
                  value={slicePositions[plane.orientation]}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(_, value) => handleSliceChange(plane.orientation, value as number)}
                  sx={{
                    color: plane.color,
                    '& .MuiSlider-thumb': {
                      backgroundColor: plane.color
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: plane.color
                    }
                  }}
                />
              </Grid>
            ))}

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Window/Level Controls */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Window Width: {windowSettings.width}
              </Typography>
              <Slider
                value={windowSettings.width}
                min={1}
                max={2000}
                step={1}
                onChange={(_, value) => setWindowSettings(prev => ({ ...prev, width: value as number }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Window Center: {windowSettings.center}
              </Typography>
              <Slider
                value={windowSettings.center}
                min={-1000}
                max={1000}
                step={1}
                onChange={(_, value) => setWindowSettings(prev => ({ ...prev, center: value as number }))}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={synchronizedNavigation}
                    onChange={(e) => setSynchronizedNavigation(e.target.checked)}
                  />
                }
                label="Synchronized Navigation"
              />
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default VTKMPRViewer;