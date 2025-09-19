import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Alert, CircularProgress, Button,
  Card, CardContent, Grid, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Slider, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, ButtonGroup, Divider, Stack,
  useMediaQuery, useTheme, Drawer, Fab
} from '@mui/material';
import {
  ZoomIn, ZoomOut, RotateLeft, RotateRight, Brightness6,
  Contrast, Info, Download, Fullscreen, Share, RestartAlt,
  PlayArrow, Pause, SkipNext, SkipPrevious, Speed,
  ThreeDRotation, ViewInAr, ViewModule, Straighten,
  RadioButtonUnchecked, CropFree, Timeline, Delete,
  Clear, Settings, Visibility, VisibilityOff,
  Menu, Close, AutoAwesome, Psychology, Assessment
} from '@mui/icons-material';
import type { Study } from '../../types';

// Import existing components for integration
import CinePlayer from './CinePlayer';
import MeasurementTools, { Measurement } from './MeasurementTools';
import AnnotationTools from './AnnotationTools';
import WindowingPresets from './WindowingPresets';

interface ComprehensiveDicomViewerProps {
  study: Study;
  onError?: (error: string) => void;
}

interface ViewerState {
  // Core states
  loading: boolean;
  error: string | null;
  imageLoaded: boolean;
  
  // Image manipulation
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  pan: { x: number; y: number };
  
  // Multi-frame/slice support
  loadedImages: HTMLImageElement[];
  currentSlice: number;
  totalSlices: number;
  isPlaying: boolean;
  playSpeed: number;
  
  // Viewer modes
  viewerMode: 'basic' | 'smart' | 'multiframe' | '3d' | 'mpr';
  showMetadata: boolean;
  showMeasurements: boolean;
  showAnnotations: boolean;
  
  // Tools
  activeTool: string | null;
  measurements: Measurement[];
  
  // UI states
  sidebarOpen: boolean;
  fullscreen: boolean;
}

const ComprehensiveDicomViewer: React.FC<ComprehensiveDicomViewerProps> = ({ study, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentImageRef = useRef<HTMLImageElement | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Comprehensive state management
  const [state, setState] = useState<ViewerState>({
    loading: true,
    error: null,
    imageLoaded: false,
    zoom: 1,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    pan: { x: 0, y: 0 },
    loadedImages: [],
    currentSlice: 0,
    totalSlices: 1,
    isPlaying: false,
    playSpeed: 2,
    viewerMode: 'smart',
    showMetadata: false,
    showMeasurements: false,
    showAnnotations: false,
    activeTool: null,
    measurements: [],
    sidebarOpen: !isMobile,
    fullscreen: false
  });

  // URL building utility with enhanced error handling
  const buildUrl = useCallback((raw: string) => {
    if (!raw) return '';
    const cleaned = raw.replace(/^wadouri:/i, '').replace(/^dicom:/i, '').trim();
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    if (cleaned.startsWith('/')) return `http://localhost:8000${cleaned}`;
    return `http://localhost:8000/${cleaned}`;
  }, []);

  // Enhanced image loading with fallback strategies
  const loadComprehensiveImage = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const studyAny = study as any;

      // Comprehensive image priority with all available sources
      const imageOptions = [
        { url: studyAny.processed_images?.preview, type: 'Processed Preview', quality: 'High' },
        { url: studyAny.processed_images?.normalized, type: 'Normalized', quality: 'High' },
        { url: studyAny.processed_images?.windowed, type: 'Windowed', quality: 'Medical' },
        { url: studyAny.preview_url, type: 'Preview', quality: 'Medium' },
        { url: studyAny.thumbnail_url, type: 'Thumbnail', quality: 'Low' },
        { url: studyAny.processed_images?.thumbnail, type: 'Processed Thumbnail', quality: 'Low' },
        { url: studyAny.dicom_url, type: 'DICOM File', quality: 'Original' },
        ...(studyAny.image_urls || []).map((url: string, index: number) => ({
          url: url.replace('wadouri:', ''),
          type: `Image ${index + 1}`,
          quality: 'Original'
        }))
      ].filter(option => option.url);

      if (imageOptions.length === 0) {
        throw new Error('No viewable images available for this DICOM study');
      }

      // Try loading images in priority order
      for (const option of imageOptions) {
        const fullUrl = buildUrl(option.url);

        const success = await tryLoadImage(fullUrl, option.type);
        if (success) {
          return;
        }
      }

      // If no images could be loaded, show DICOM file info
      showDicomFileInfo();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load DICOM image';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [study, buildUrl, onError]);

  // Enhanced image loading with retry logic
  const tryLoadImage = useCallback((url: string, type: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        currentImageRef.current = img;
        drawImageToCanvas(img);
        
        setState(prev => ({
          ...prev,
          imageLoaded: true,
          loading: false,
          totalSlices: 1 // Will be updated for multi-frame
        }));
        
        resolve(true);
      };

      img.onerror = (error) => {
        resolve(false);
      };

      img.src = url;
    });
  }, []);

  // Enhanced canvas drawing with image manipulation
  const drawImageToCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context for transformations
    ctx.save();

    // Apply transformations
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Translate to center
    ctx.translate(centerX + state.pan.x, centerY + state.pan.y);

    // Apply rotation
    ctx.rotate((state.rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(state.zoom, state.zoom);

    // Calculate image dimensions to fit canvas while maintaining aspect ratio
    const imgAspect = img.width / img.height;
    const canvasAspect = canvas.width / canvas.height;
    
    let drawWidth, drawHeight;
    if (imgAspect > canvasAspect) {
      drawWidth = canvas.width * 0.9; // Leave some margin
      drawHeight = drawWidth / imgAspect;
    } else {
      drawHeight = canvas.height * 0.9;
      drawWidth = drawHeight * imgAspect;
    }

    // Apply brightness and contrast filters
    ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`;

    // Draw image centered
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Restore context
    ctx.restore();

    // Draw measurements and annotations if enabled
    if (state.showMeasurements) {
      drawMeasurements(ctx);
    }
  }, [state.pan, state.rotation, state.zoom, state.brightness, state.contrast, state.showMeasurements]);

  // Draw measurements on canvas
  const drawMeasurements = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.font = '14px Arial';
    ctx.fillStyle = '#00ff00';

    state.measurements.forEach(measurement => {
      if (measurement.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
        
        for (let i = 1; i < measurement.points.length; i++) {
          ctx.lineTo(measurement.points[i].x, measurement.points[i].y);
        }
        
        if (measurement.type === 'circle') {
          const radius = Math.sqrt(
            Math.pow(measurement.points[1].x - measurement.points[0].x, 2) +
            Math.pow(measurement.points[1].y - measurement.points[0].y, 2)
          );
          ctx.arc(measurement.points[0].x, measurement.points[0].y, radius, 0, 2 * Math.PI);
        }
        
        ctx.stroke();
        
        // Draw measurement value
        const midX = measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length;
        const midY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length;
        ctx.fillText(`${measurement.value.toFixed(2)} ${measurement.unit}`, midX + 5, midY - 5);
      }
    });
    
    ctx.restore();
  }, [state.measurements]);

  // Show DICOM file info when image loading fails
  const showDicomFileInfo = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: false,
      error: 'Image display not available - DICOM file information shown below'
    }));
  }, []);

  // Image manipulation handlers
  const handleZoomIn = useCallback(() => {
    setState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 10) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setState(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  }, []);

  const handleRotateRight = useCallback(() => {
    setState(prev => ({ ...prev, rotation: prev.rotation + 90 }));
  }, []);

  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: 1,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      pan: { x: 0, y: 0 }
    }));
  }, []);

  // Tool handlers
  const handleToolSelect = useCallback((tool: string | null) => {
    setState(prev => ({ ...prev, activeTool: tool }));
  }, []);

  const handleMeasurementAdd = useCallback((measurement: Omit<Measurement, 'id' | 'created_at'>) => {
    const newMeasurement: Measurement = {
      ...measurement,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement]
    }));
  }, []);

  const handleMeasurementDelete = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      measurements: prev.measurements.filter(m => m.id !== id)
    }));
  }, []);

  const handleClearAllMeasurements = useCallback(() => {
    setState(prev => ({ ...prev, measurements: [] }));
  }, []);

  // Viewer mode handlers
  const handleViewerModeChange = useCallback((mode: ViewerState['viewerMode']) => {
    setState(prev => ({ ...prev, viewerMode: mode }));
  }, []);

  // Initialize viewer
  useEffect(() => {
    loadComprehensiveImage();
  }, [loadComprehensiveImage]);

  // Redraw canvas when state changes
  useEffect(() => {
    if (currentImageRef.current && state.imageLoaded) {
      drawImageToCanvas(currentImageRef.current);
    }
  }, [drawImageToCanvas, state.imageLoaded]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (currentImageRef.current && state.imageLoaded) {
        drawImageToCanvas(currentImageRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawImageToCanvas, state.imageLoaded]);

  // Render main viewer interface
  const renderMainViewer = () => (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Viewer Toolbar */}
      <Paper elevation={1} sx={{ p: 1, mb: 1 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            <Tabs
              value={state.viewerMode}
              onChange={(_, value) => handleViewerModeChange(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Smart" value="smart" icon={<Psychology />} />
              <Tab label="Multi-Frame" value="multiframe" icon={<ViewModule />} />
              <Tab label="3D" value="3d" icon={<ViewInAr />} />
              <Tab label="MPR" value="mpr" icon={<ThreeDRotation />} />
            </Tabs>
          </Grid>
          
          <Grid item sx={{ ml: 'auto' }}>
            <ButtonGroup size="small">
              <Tooltip title="Zoom In">
                <IconButton onClick={handleZoomIn}>
                  <ZoomIn />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton onClick={handleZoomOut}>
                  <ZoomOut />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Left">
                <IconButton onClick={handleRotateLeft}>
                  <RotateLeft />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Right">
                <IconButton onClick={handleRotateRight}>
                  <RotateRight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset">
                <IconButton onClick={handleReset}>
                  <RestartAlt />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Canvas Area */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#000',
          border: '1px solid #333',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        {state.loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1, color: 'white' }}>
              Loading DICOM image...
            </Typography>
          </Box>
        )}

        {state.error && (
          <Alert
            severity="warning"
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              right: 16,
              zIndex: 10
            }}
          >
            {state.error}
          </Alert>
        )}

        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: state.activeTool ? 'crosshair' : 'default'
          }}
        />

        {/* Image Info Overlay */}
        {state.imageLoaded && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              p: 1,
              borderRadius: 1,
              fontSize: '0.75rem'
            }}
          >
            <Typography variant="caption" display="block">
              Zoom: {(state.zoom * 100).toFixed(0)}%
            </Typography>
            <Typography variant="caption" display="block">
              Rotation: {state.rotation}°
            </Typography>
            {state.totalSlices > 1 && (
              <Typography variant="caption" display="block">
                Slice: {state.currentSlice + 1}/{state.totalSlices}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Image Adjustment Controls */}
      <Paper elevation={1} sx={{ p: 2, mt: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" gutterBottom>
              Brightness: {state.brightness}%
            </Typography>
            <Slider
              value={state.brightness}
              onChange={(_, value) => setState(prev => ({ ...prev, brightness: value as number }))}
              min={0}
              max={200}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" gutterBottom>
              Contrast: {state.contrast}%
            </Typography>
            <Slider
              value={state.contrast}
              onChange={(_, value) => setState(prev => ({ ...prev, contrast: value as number }))}
              min={0}
              max={200}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // Render sidebar with tools and metadata
  const renderSidebar = () => (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tool Selection */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Tools
        </Typography>
        <Grid container spacing={1}>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={state.showMeasurements}
                  onChange={(e) => setState(prev => ({ ...prev, showMeasurements: e.target.checked }))}
                />
              }
              label="Measurements"
            />
          </Grid>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={state.showAnnotations}
                  onChange={(e) => setState(prev => ({ ...prev, showAnnotations: e.target.checked }))}
                />
              }
              label="Annotations"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Measurement Tools */}
      {state.showMeasurements && (
        <Paper elevation={1} sx={{ p: 2, mb: 1, flex: 1, overflow: 'auto' }}>
          <MeasurementTools
            measurements={state.measurements}
            activeTool={state.activeTool}
            onToolSelect={handleToolSelect}
            onMeasurementDelete={handleMeasurementDelete}
            onClearAll={handleClearAllMeasurements}
            onMeasurementAdd={handleMeasurementAdd}
          />
        </Paper>
      )}

      {/* Study Metadata */}
      <Paper elevation={1} sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Study Information
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Patient ID:</strong> {study.patient_id}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Study UID:</strong> {study.study_uid}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Modality:</strong> {study.modality}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Exam Type:</strong> {study.exam_type}
        </Typography>
        {study.study_date && (
          <Typography variant="body2" gutterBottom>
            <strong>Study Date:</strong> {new Date(study.study_date).toLocaleDateString()}
          </Typography>
        )}
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Typography variant="h5">
              Comprehensive DICOM Viewer
            </Typography>
          </Grid>
          <Grid item>
            <Chip
              label={`${study.modality} - ${study.exam_type}`}
              color="primary"
              size="small"
            />
          </Grid>
          <Grid item sx={{ ml: 'auto' }}>
            <IconButton
              onClick={() => setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))}
            >
              {state.sidebarOpen ? <Close /> : <Menu />}
            </IconButton>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
        {/* Main Viewer */}
        <Box sx={{ flex: 1 }}>
          {renderMainViewer()}
        </Box>

        {/* Sidebar */}
        {state.sidebarOpen && (
          <Box sx={{ flexShrink: 0 }}>
            {renderSidebar()}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ComprehensiveDicomViewer;