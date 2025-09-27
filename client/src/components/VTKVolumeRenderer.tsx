/**
 * VTK.js Volume Renderer Component
 * Provides advanced 3D volume rendering using VTK.js for DICOM data
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ThreeDRotation,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Fullscreen,
  Settings,
  Visibility,
  VisibilityOff,
  CameraAlt,
  Save
} from '@mui/icons-material';

// VTK.js imports
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkVolumeProperty from '@kitware/vtk.js/Rendering/Core/VolumeProperty';
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';

// Register OpenGL view
vtkRenderWindow.registerViewConstructor('WebGL', vtkOpenGLRenderWindow);

import { vtkService } from '../services/vtkService';
import { vtkDicomLoader } from '../services/vtkDicomLoader';

export interface VTKVolumeRendererProps {
  studyId: string;
  seriesId: string;
  width?: number;
  height?: number;
  onError?: (error: string) => void;
  onVolumeLoaded?: (volumeInfo: any) => void;
  enableInteraction?: boolean;
  renderingMode?: 'volume' | 'mip' | 'isosurface';
  backgroundColor?: [number, number, number];
}

interface VolumeRenderingSettings {
  opacity: number;
  windowWidth: number;
  windowCenter: number;
  renderingMode: 'volume' | 'mip' | 'isosurface';
  sampleDistance: number;
  blendMode: number;
  ambient: number;
  diffuse: number;
  specular: number;
  specularPower: number;
  shade: boolean;
  interpolationType: number;
}

interface CameraSettings {
  position: [number, number, number];
  focalPoint: [number, number, number];
  viewUp: [number, number, number];
  zoom: number;
}

const VTKVolumeRenderer: React.FC<VTKVolumeRendererProps> = ({
  studyId,
  seriesId,
  width = 800,
  height = 600,
  onError,
  onVolumeLoaded,
  enableInteraction = true,
  renderingMode = 'volume',
  backgroundColor = [0.1, 0.1, 0.1]
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vtkContainerRef = useRef<HTMLDivElement>(null);
  
  // VTK.js objects
  const [vtkObjects, setVtkObjects] = useState<{
    renderWindow: any;
    renderer: any;
    interactor: any;
    volume: any;
    volumeMapper: any;
    volumeProperty: any;
  } | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLoaded, setVolumeLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Rendering settings - Optimized for performance
  const [settings, setSettings] = useState<VolumeRenderingSettings>({
    opacity: 0.8,
    windowWidth: 400,
    windowCenter: 200,
    renderingMode: renderingMode,
    sampleDistance: 0.8, // Reduced for better quality (was 1.0)
    blendMode: 0, // Composite
    ambient: 0.15, // Increased for better visibility (was 0.1)
    diffuse: 0.8, // Increased for better lighting (was 0.7)
    specular: 0.3, // Increased for better highlights (was 0.2)
    specularPower: 15, // Increased for sharper highlights (was 10)
    shade: true,
    interpolationType: 1 // Linear
  });

  // Camera settings
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    position: [0, 0, 400],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0],
    zoom: 1.0
  });

  /**
   * Initialize VTK.js rendering pipeline
   */
  const initializeVTK = useCallback(() => {
    if (!vtkContainerRef.current) return;

    try {
      // Create render window
      const renderWindow = vtkRenderWindow.newInstance();
      const renderer = vtkRenderer.newInstance();
      renderWindow.addRenderer(renderer);

      // Set background color
      renderer.setBackground(backgroundColor);

      // Create the OpenGL render window view first
      const openglRenderWindow = renderWindow.newAPISpecificView('WebGL');
      if (!openglRenderWindow) {
        throw new Error('Failed to create OpenGL render window view');
      }

      // Create interactor and set the view
      const interactor = vtkRenderWindowInteractor.newInstance();
      interactor.setView(openglRenderWindow);
      
      if (enableInteraction) {
        const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
        interactor.setInteractorStyle(interactorStyle);
      }

      // Create volume objects
      const volume = vtkVolume.newInstance();
      const volumeMapper = vtkVolumeMapper.newInstance();
      const volumeProperty = vtkVolumeProperty.newInstance();

      // Configure volume mapper
      volumeMapper.setSampleDistance(settings.sampleDistance);
      volumeMapper.setBlendMode(settings.blendMode);

      // Configure volume property
      volumeProperty.setShade(settings.shade);
      volumeProperty.setAmbient(settings.ambient);
      volumeProperty.setDiffuse(settings.diffuse);
      volumeProperty.setSpecular(settings.specular);
      volumeProperty.setSpecularPower(settings.specularPower);
      volumeProperty.setInterpolationType(settings.interpolationType);

      // Connect volume pipeline
      volume.setMapper(volumeMapper);
      volume.setProperty(volumeProperty);

      // Add volume to renderer
      renderer.addVolume(volume);

      // Initialize render window container - reuse the already created openglRenderWindow
      openglRenderWindow.setContainer(vtkContainerRef.current);
      openglRenderWindow.setSize(width, height);

      interactor.initialize();
      interactor.bindEvents(vtkContainerRef.current);

      // Store VTK objects
      setVtkObjects({
        renderWindow,
        renderer,
        interactor,
        volume,
        volumeMapper,
        volumeProperty
      });

      console.log('✅ VTK.js rendering pipeline initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize VTK.js:', error);
      setError(`Failed to initialize VTK.js: ${error}`);
      onError?.(`Failed to initialize VTK.js: ${error}`);
    }
  }, [width, height, backgroundColor, enableInteraction, settings, onError]);

  /**
   * Load DICOM volume data
   */
  const loadVolumeData = useCallback(async () => {
    if (!vtkObjects) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Loading DICOM volume data for study: ${studyId}, series: ${seriesId}`);

      // Load DICOM series using our custom loader
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

      // Set image data to volume mapper
      vtkObjects.volumeMapper.setInputData(imageData);

      // Setup transfer functions
      setupTransferFunctions(volumeData.dataRange);

      // Reset camera to fit volume
      vtkObjects.renderer.resetCamera();
      
      // Update camera settings
      const camera = vtkObjects.renderer.getActiveCamera();
      setCameraSettings({
        position: camera.getPosition() as [number, number, number],
        focalPoint: camera.getFocalPoint() as [number, number, number],
        viewUp: camera.getViewUp() as [number, number, number],
        zoom: 1.0
      });

      // Render
      vtkObjects.renderWindow.render();

      setVolumeLoaded(true);
      onVolumeLoaded?.(volumeData);

      console.log('✅ DICOM volume data loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load volume data:', error);
      setError(`Failed to load volume data: ${error}`);
      onError?.(`Failed to load volume data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [studyId, seriesId, vtkObjects, onError, onVolumeLoaded]);

  /**
   * Setup transfer functions for volume rendering
   */
  const setupTransferFunctions = useCallback((dataRange: [number, number]) => {
    if (!vtkObjects) return;

    const [minValue, maxValue] = dataRange;
    const range = maxValue - minValue;

    // Create opacity transfer function
    const opacityFunction = vtkPiecewiseFunction.newInstance();
    opacityFunction.addPoint(minValue, 0.0);
    opacityFunction.addPoint(minValue + range * 0.1, 0.0);
    opacityFunction.addPoint(minValue + range * 0.3, 0.1);
    opacityFunction.addPoint(minValue + range * 0.6, 0.3);
    opacityFunction.addPoint(maxValue, settings.opacity);

    // Create color transfer function
    const colorFunction = vtkColorTransferFunction.newInstance();
    colorFunction.addRGBPoint(minValue, 0.0, 0.0, 0.0);
    colorFunction.addRGBPoint(minValue + range * 0.2, 0.2, 0.1, 0.0);
    colorFunction.addRGBPoint(minValue + range * 0.4, 0.6, 0.3, 0.1);
    colorFunction.addRGBPoint(minValue + range * 0.6, 0.9, 0.7, 0.5);
    colorFunction.addRGBPoint(maxValue, 1.0, 1.0, 1.0);

    // Apply transfer functions
    vtkObjects.volumeProperty.setScalarOpacity(opacityFunction);
    vtkObjects.volumeProperty.setRGBTransferFunction(colorFunction);

    // Apply windowing by recreating transfer functions with new range
    const windowLevel = settings.windowCenter;
    const windowWidth = settings.windowWidth;
    const lower = windowLevel - windowWidth / 2;
    const upper = windowLevel + windowWidth / 2;

    // Update color function for windowing
    colorFunction.removeAllPoints();
    colorFunction.addRGBPoint(lower, 0.0, 0.0, 0.0);
    colorFunction.addRGBPoint(lower + (upper - lower) * 0.2, 0.2, 0.1, 0.0);
    colorFunction.addRGBPoint(lower + (upper - lower) * 0.4, 0.6, 0.3, 0.1);
    colorFunction.addRGBPoint(lower + (upper - lower) * 0.6, 0.9, 0.7, 0.5);
    colorFunction.addRGBPoint(upper, 1.0, 1.0, 1.0);

    // Update opacity function for windowing
    opacityFunction.removeAllPoints();
    opacityFunction.addPoint(lower, 0.0);
    opacityFunction.addPoint(lower + (upper - lower) * 0.1, 0.0);
    opacityFunction.addPoint(lower + (upper - lower) * 0.3, 0.1);
    opacityFunction.addPoint(lower + (upper - lower) * 0.6, 0.3);
    opacityFunction.addPoint(upper, settings.opacity);

  }, [vtkObjects, settings.opacity, settings.windowCenter, settings.windowWidth]);

  /**
   * Update rendering settings
   */
  const updateRenderingSettings = useCallback((newSettings: Partial<VolumeRenderingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));

    if (!vtkObjects || !volumeLoaded) return;

    // Update volume mapper settings
    if (newSettings.sampleDistance !== undefined) {
      vtkObjects.volumeMapper.setSampleDistance(newSettings.sampleDistance);
    }
    if (newSettings.blendMode !== undefined) {
      vtkObjects.volumeMapper.setBlendMode(newSettings.blendMode);
    }

    // Update volume property settings
    if (newSettings.shade !== undefined) {
      vtkObjects.volumeProperty.setShade(newSettings.shade);
    }
    if (newSettings.ambient !== undefined) {
      vtkObjects.volumeProperty.setAmbient(newSettings.ambient);
    }
    if (newSettings.diffuse !== undefined) {
      vtkObjects.volumeProperty.setDiffuse(newSettings.diffuse);
    }
    if (newSettings.specular !== undefined) {
      vtkObjects.volumeProperty.setSpecular(newSettings.specular);
    }
    if (newSettings.specularPower !== undefined) {
      vtkObjects.volumeProperty.setSpecularPower(newSettings.specularPower);
    }
    if (newSettings.interpolationType !== undefined) {
      vtkObjects.volumeProperty.setInterpolationType(newSettings.interpolationType);
    }

    // Update transfer functions if opacity or windowing changed
    if (newSettings.opacity !== undefined || 
        newSettings.windowCenter !== undefined || 
        newSettings.windowWidth !== undefined) {
      // Get current data range
      const imageData = vtkObjects.volumeMapper.getInputData();
      if (imageData) {
        const dataRange = imageData.getPointData().getScalars().getRange();
        setupTransferFunctions(dataRange);
      }
    }

    // Render
    vtkObjects.renderWindow.render();
  }, [vtkObjects, volumeLoaded, setupTransferFunctions]);

  /**
   * Reset camera to default position
   */
  const resetCamera = useCallback(() => {
    if (!vtkObjects) return;

    vtkObjects.renderer.resetCamera();
    const camera = vtkObjects.renderer.getActiveCamera();
    
    setCameraSettings({
      position: camera.getPosition() as [number, number, number],
      focalPoint: camera.getFocalPoint() as [number, number, number],
      viewUp: camera.getViewUp() as [number, number, number],
      zoom: 1.0
    });

    vtkObjects.renderWindow.render();
  }, [vtkObjects]);

  /**
   * Take screenshot
   */
  const takeScreenshot = useCallback(() => {
    if (!vtkObjects) return;

    const canvas = vtkObjects.renderWindow.getViews()[0].getCanvas();
    const link = document.createElement('a');
    link.download = `volume-render-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [vtkObjects]);

  // Initialize VTK when component mounts
  useEffect(() => {
    initializeVTK();

    return () => {
      // Cleanup VTK objects
      if (vtkObjects) {
        vtkObjects.interactor?.delete();
        vtkObjects.renderWindow?.delete();
      }
    };
  }, [initializeVTK]);

  // Load volume data when VTK is initialized
  useEffect(() => {
    if (vtkObjects && studyId && seriesId) {
      loadVolumeData();
    }
  }, [vtkObjects, studyId, seriesId, loadVolumeData]);

  // Update settings when they change
  useEffect(() => {
    updateRenderingSettings(settings);
  }, [settings, updateRenderingSettings]);

  return (
    <Box sx={{ width, height, display: 'flex', position: 'relative' }}>
      {/* VTK Container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <div
          ref={vtkContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        />

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
              zIndex: 1000
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <CircularProgress color="primary" />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading DICOM Volume...
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
              zIndex: 1001
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
            zIndex: 999
          }}
        >
          <Tooltip title="Toggle Controls">
            <IconButton
              size="small"
              onClick={() => setShowControls(!showControls)}
              sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' }}
            >
              <Settings />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset Camera">
            <IconButton
              size="small"
              onClick={resetCamera}
              sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' }}
            >
              <RestartAlt />
            </IconButton>
          </Tooltip>

          <Tooltip title="Take Screenshot">
            <IconButton
              size="small"
              onClick={takeScreenshot}
              sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white' }}
            >
              <CameraAlt />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls Panel */}
      {showControls && (
        <Paper
          sx={{
            width: 300,
            ml: 2,
            p: 2,
            maxHeight: height,
            overflow: 'auto'
          }}
        >
          <Typography variant="h6" gutterBottom>
            Volume Rendering Controls
          </Typography>

          <Grid container spacing={2}>
            {/* Opacity */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Opacity: {settings.opacity.toFixed(2)}
              </Typography>
              <Slider
                value={settings.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(_, value) => updateRenderingSettings({ opacity: value as number })}
              />
            </Grid>

            {/* Window Width */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Window Width: {settings.windowWidth}
              </Typography>
              <Slider
                value={settings.windowWidth}
                min={1}
                max={2000}
                step={1}
                onChange={(_, value) => updateRenderingSettings({ windowWidth: value as number })}
              />
            </Grid>

            {/* Window Center */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Window Center: {settings.windowCenter}
              </Typography>
              <Slider
                value={settings.windowCenter}
                min={-1000}
                max={1000}
                step={1}
                onChange={(_, value) => updateRenderingSettings({ windowCenter: value as number })}
              />
            </Grid>

            {/* Sample Distance */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Sample Distance: {settings.sampleDistance.toFixed(2)}
              </Typography>
              <Slider
                value={settings.sampleDistance}
                min={0.1}
                max={5.0}
                step={0.1}
                onChange={(_, value) => updateRenderingSettings({ sampleDistance: value as number })}
              />
            </Grid>

            {/* Rendering Mode */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Rendering Mode</InputLabel>
                <Select
                  value={settings.renderingMode}
                  label="Rendering Mode"
                  onChange={(e) => updateRenderingSettings({ renderingMode: e.target.value as any })}
                >
                  <MenuItem value="volume">Volume Rendering</MenuItem>
                  <MenuItem value="mip">Maximum Intensity Projection</MenuItem>
                  <MenuItem value="isosurface">Isosurface</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Shading */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.shade}
                    onChange={(e) => updateRenderingSettings({ shade: e.target.checked })}
                  />
                }
                label="Enable Shading"
              />
            </Grid>

            {/* Ambient */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Ambient: {settings.ambient.toFixed(2)}
              </Typography>
              <Slider
                value={settings.ambient}
                min={0}
                max={1}
                step={0.01}
                onChange={(_, value) => updateRenderingSettings({ ambient: value as number })}
              />
            </Grid>

            {/* Diffuse */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Diffuse: {settings.diffuse.toFixed(2)}
              </Typography>
              <Slider
                value={settings.diffuse}
                min={0}
                max={1}
                step={0.01}
                onChange={(_, value) => updateRenderingSettings({ diffuse: value as number })}
              />
            </Grid>

            {/* Specular */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Specular: {settings.specular.toFixed(2)}
              </Typography>
              <Slider
                value={settings.specular}
                min={0}
                max={1}
                step={0.01}
                onChange={(_, value) => updateRenderingSettings({ specular: value as number })}
              />
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default VTKVolumeRenderer;