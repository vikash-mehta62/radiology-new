import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Alert, CircularProgress, Button,
  Card, CardContent, Grid, Chip, IconButton, Tooltip,
  Tabs, Tab, Slider, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, ButtonGroup, Divider, Stack,
  useMediaQuery, useTheme, Fab, Badge, Snackbar
} from '@mui/material';
import {
  ZoomIn, ZoomOut, RotateLeft, RotateRight, Brightness6,
  Contrast, Info, Download, Fullscreen, RestartAlt,
  AutoAwesome, Psychology, Assessment, Speed, Cached,
  HighQuality, ImageSearch, Tune, CloudDownload
} from '@mui/icons-material';
import type { Study } from '../../types';
import { 
  enhancedDicomService, 
  EnhancementType, 
  FilterType, 
  OutputFormat,
  DicomMetadata,
  ProcessedDicomResult 
} from '../../services/enhancedDicomService';

interface OptimizedDicomViewerProps {
  study: Study;
  onError?: (error: string) => void;
  enablePreloading?: boolean;
  enableCaching?: boolean;
}

interface ViewerState {
  loading: boolean;
  error: string | null;
  imageLoaded: boolean;
  
  // Image data
  currentImageData: string | null;
  thumbnailData: string | null;
  metadata: DicomMetadata | null;
  
  // Processing options
  enhancement: EnhancementType | null;
  filter: FilterType | null;
  outputFormat: OutputFormat;
  
  // Image manipulation
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  pan: { x: number; y: number };
  
  // UI states
  showMetadata: boolean;
  showProcessingOptions: boolean;
  fullscreen: boolean;
  
  // Performance
  processingTime: number;
  cacheHit: boolean;
}

const OptimizedDicomViewer: React.FC<OptimizedDicomViewerProps> = ({ 
  study, 
  onError,
  enablePreloading = true,
  enableCaching = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [state, setState] = useState<ViewerState>({
    loading: true,
    error: null,
    imageLoaded: false,
    currentImageData: null,
    thumbnailData: null,
    metadata: null,
    enhancement: null,
    filter: null,
    outputFormat: 'PNG',
    zoom: 1,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    pan: { x: 0, y: 0 },
    showMetadata: false,
    showProcessingOptions: false,
    fullscreen: false,
    processingTime: 0,
    cacheHit: false
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Memoized processing options
  const processingOptions = useMemo(() => ({
    enhancement: state.enhancement || undefined,
    filter: state.filter || undefined,
    outputFormat: state.outputFormat,
    useCache: enableCaching
  }), [state.enhancement, state.filter, state.outputFormat, enableCaching]);

  // Extract patient ID and filename from study
  const { patientId, filename } = useMemo(() => {
    const dicomUrl = study.dicom_url || '';
    const urlParts = dicomUrl.split('/');
    return {
      patientId: urlParts[urlParts.length - 2] || 'unknown',
      filename: urlParts[urlParts.length - 1] || 'unknown.dcm'
    };
  }, [study.dicom_url]);

  // Load DICOM image with optimizations
  const loadDicomImage = useCallback(async (forceReload = false) => {
    if (!patientId || !filename) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    const startTime = Date.now();

    try {
      // Load thumbnail first for quick preview
      if (!state.thumbnailData || forceReload) {
        try {
          const thumbnail = await enhancedDicomService.getDicomThumbnail(patientId, filename);
          setState(prev => ({ ...prev, thumbnailData: thumbnail }));
        } catch (error) {
          console.warn('Failed to load thumbnail:', error);
        }
      }

      // Load full image with processing
      const result = await enhancedDicomService.processDicomFile(
        patientId,
        filename,
        processingOptions
      );

      const processingTime = Date.now() - startTime;

      setState(prev => ({
        ...prev,
        loading: false,
        imageLoaded: true,
        currentImageData: result.image_data,
        metadata: result.metadata,
        processingTime,
        cacheHit: processingTime < 100 // Assume cache hit if very fast
      }));

      // Show performance info
      setSnackbar({
        open: true,
        message: `Image loaded in ${processingTime}ms ${processingTime < 100 ? '(cached)' : ''}`,
        severity: 'success'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load DICOM image';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      onError?.(errorMessage);
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  }, [patientId, filename, processingOptions, onError, state.thumbnailData]);

  // Preload related images
  const preloadRelatedImages = useCallback(async () => {
    if (!enablePreloading) return;

    // This would be expanded to preload other images in the study/series
    // For now, just preload different enhancement versions
    const enhancements: EnhancementType[] = ['clahe', 'histogram_eq'];
    
    try {
      await Promise.allSettled(
        enhancements.map(enhancement =>
          enhancedDicomService.preloadDicomImage(patientId, filename, {
            enhancement,
            priority: 'low'
          })
        )
      );
    } catch (error) {
      console.warn('Preloading failed:', error);
    }
  }, [patientId, filename, enablePreloading]);

  // Initial load
  useEffect(() => {
    loadDicomImage();
    preloadRelatedImages();
  }, [loadDicomImage, preloadRelatedImages]);

  // Reload when processing options change
  useEffect(() => {
    if (state.imageLoaded) {
      loadDicomImage(true);
    }
  }, [processingOptions]);

  // Canvas drawing with optimizations
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !state.currentImageData) return;

    // Create image from base64 data
    if (!imageRef.current) {
      imageRef.current = new Image();
      imageRef.current.onload = () => drawImage();
    }

    const img = imageRef.current;
    if (img.src !== enhancedDicomService.createImageDataUrl(state.currentImageData, state.outputFormat)) {
      img.src = enhancedDicomService.createImageDataUrl(state.currentImageData, state.outputFormat);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply transformations
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.translate(centerX + state.pan.x, centerY + state.pan.y);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.zoom, state.zoom);

    // Apply brightness and contrast filters
    ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`;

    // Draw image centered
    const drawWidth = img.naturalWidth;
    const drawHeight = img.naturalHeight;
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Restore context
    ctx.restore();
  }, [state.currentImageData, state.zoom, state.rotation, state.brightness, state.contrast, state.pan, state.outputFormat]);

  // Draw when image data or transformations change
  useEffect(() => {
    if (state.currentImageData) {
      drawImage();
    }
  }, [drawImage, state.currentImageData]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawImage();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawImage]);

  // Enhancement handlers
  const handleEnhancementChange = (enhancement: EnhancementType | null) => {
    setState(prev => ({ ...prev, enhancement }));
  };

  const handleFilterChange = (filter: FilterType | null) => {
    setState(prev => ({ ...prev, filter }));
  };

  const handleDownload = async () => {
    try {
      await enhancedDicomService.convertAndDownload(
        patientId,
        filename,
        state.outputFormat,
        state.enhancement || undefined
      );
      
      setSnackbar({
        open: true,
        message: 'Download started',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Download failed',
        severity: 'error'
      });
    }
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      zoom: 1,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      pan: { x: 0, y: 0 },
      enhancement: null,
      filter: null
    }));
  };

  // Mouse/touch handlers for pan and zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(10, prev.zoom * delta))
    }));
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;

    setState(prev => ({
      ...prev,
      pan: {
        x: prev.pan.x + deltaX,
        y: prev.pan.y + deltaY
      }
    }));

    setLastMousePos({ x: event.clientX, y: event.clientY });
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (state.loading && !state.thumbnailData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading DICOM image...
        </Typography>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {state.error}
        <Button onClick={() => loadDicomImage(true)} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 1, mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* Zoom controls */}
          <ButtonGroup size="small">
            <IconButton onClick={() => setState(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom * 0.8) }))}>
              <ZoomOut />
            </IconButton>
            <Button variant="outlined" size="small" sx={{ minWidth: 60 }}>
              {Math.round(state.zoom * 100)}%
            </Button>
            <IconButton onClick={() => setState(prev => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.2) }))}>
              <ZoomIn />
            </IconButton>
          </ButtonGroup>

          {/* Rotation controls */}
          <ButtonGroup size="small">
            <IconButton onClick={() => setState(prev => ({ ...prev, rotation: prev.rotation - 90 }))}>
              <RotateLeft />
            </IconButton>
            <IconButton onClick={() => setState(prev => ({ ...prev, rotation: prev.rotation + 90 }))}>
              <RotateRight />
            </IconButton>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Enhancement controls */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Enhancement</InputLabel>
            <Select
              value={state.enhancement || ''}
              onChange={(e) => handleEnhancementChange(e.target.value as EnhancementType || null)}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="clahe">CLAHE</MenuItem>
              <MenuItem value="histogram_eq">Histogram EQ</MenuItem>
              <MenuItem value="gamma">Gamma Correction</MenuItem>
              <MenuItem value="adaptive_eq">Adaptive EQ</MenuItem>
              <MenuItem value="unsharp_mask">Unsharp Mask</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={state.filter || ''}
              onChange={(e) => handleFilterChange(e.target.value as FilterType || null)}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="gaussian">Gaussian</MenuItem>
              <MenuItem value="median">Median</MenuItem>
              <MenuItem value="bilateral">Bilateral</MenuItem>
              <MenuItem value="edge_enhance">Edge Enhance</MenuItem>
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem />

          {/* Action buttons */}
          <IconButton onClick={handleDownload} title="Download">
            <CloudDownload />
          </IconButton>
          
          <IconButton onClick={handleReset} title="Reset">
            <RestartAlt />
          </IconButton>

          <IconButton 
            onClick={() => setState(prev => ({ ...prev, showMetadata: !prev.showMetadata }))}
            title="Toggle Metadata"
          >
            <Info />
          </IconButton>

          {/* Performance indicator */}
          {state.processingTime > 0 && (
            <Chip
              icon={state.cacheHit ? <Cached /> : <Speed />}
              label={`${state.processingTime}ms`}
              size="small"
              color={state.cacheHit ? 'success' : 'default'}
            />
          )}
        </Stack>

        {/* Brightness and Contrast sliders */}
        <Stack direction="row" spacing={2} sx={{ mt: 1 }} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
            <Brightness6 sx={{ mr: 1 }} />
            <Slider
              value={state.brightness}
              onChange={(_, value) => setState(prev => ({ ...prev, brightness: value as number }))}
              min={0}
              max={200}
              size="small"
            />
            <Typography variant="caption" sx={{ ml: 1, minWidth: 30 }}>
              {state.brightness}%
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
            <Contrast sx={{ mr: 1 }} />
            <Slider
              value={state.contrast}
              onChange={(_, value) => setState(prev => ({ ...prev, contrast: value as number }))}
              min={0}
              max={200}
              size="small"
            />
            <Typography variant="caption" sx={{ ml: 1, minWidth: 30 }}>
              {state.contrast}%
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Main viewer area */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Canvas container */}
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Show thumbnail while loading full image */}
          {state.loading && state.thumbnailData && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.7,
                zIndex: 1
              }}
            >
              <img
                src={enhancedDicomService.createImageDataUrl(state.thumbnailData, 'JPEG')}
                alt="Thumbnail"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <CircularProgress />
              </Box>
            </Box>
          )}

          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: state.currentImageData ? 'block' : 'none'
            }}
          />
        </Box>

        {/* Metadata panel */}
        {state.showMetadata && state.metadata && (
          <Paper sx={{ width: 300, p: 2, ml: 1, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              DICOM Metadata
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Patient</Typography>
                <Typography variant="body2">{state.metadata.patient_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">ID</Typography>
                <Typography variant="body2">{state.metadata.patient_id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Sex</Typography>
                <Typography variant="body2">{state.metadata.patient_sex}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Study</Typography>
                <Typography variant="body2">{state.metadata.study_description}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Modality</Typography>
                <Typography variant="body2">{state.metadata.modality}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Date</Typography>
                <Typography variant="body2">{state.metadata.study_date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Dimensions</Typography>
                <Typography variant="body2">{state.metadata.rows} × {state.metadata.columns}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Thickness</Typography>
                <Typography variant="body2">{state.metadata.slice_thickness}</Typography>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default OptimizedDicomViewer;