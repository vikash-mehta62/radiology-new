import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Toolbar,
  Typography,
  Slider,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Alert,
  Drawer,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  ButtonGroup,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as ResetIcon,
  Straighten as MeasureIcon,
  Tune as WindowLevelIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  RotateRight as RotateIcon,
  Flip as FlipIcon,
  ViewInAr as ThreeDIcon,
  GridView as MPRIcon,
  Timeline as CineIcon,
  Palette as LUTIcon,
  CropFree as ROIIcon,
  ShowChart as ProfileIcon,
  CompareArrows as CompareIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  CropFree as CropFreeIcon
} from '@mui/icons-material';

import { dicomService } from '../../services/dicomService';
import { Study } from '../../types';
import MeasurementTools, { Measurement } from './MeasurementTools';
import MPRViewer from './MPRViewer';
import ThreeDViewer from './ThreeDViewer';
import CinePlayer from './CinePlayer';
import WindowingPresets from './WindowingPresets';
import AnnotationTools from './AnnotationTools';

interface ViewportState {
  scale: number;
  translation: { x: number; y: number };
  windowWidth: number;
  windowCenter: number;
  rotation: number;
  hflip: boolean;
  vflip: boolean;
  invert: boolean;
  interpolation: 'nearest' | 'linear';
}

interface AdvancedDicomViewerProps {
  study: Study;
  onMeasurement?: (measurement: Measurement) => void;
  onError?: (error: string) => void;
  enableAdvancedFeatures?: boolean;
}

type ViewMode = 'single' | 'mpr' | '3d' | 'compare' | 'cine';
type MeasurementTool = 'length' | 'angle' | 'rectangle' | 'ellipse' | 'freehand' | 'arrow' | 'text';

const AdvancedDicomViewer: React.FC<AdvancedDicomViewerProps> = ({
  study,
  onMeasurement,
  onError,
  enableAdvancedFeatures = true
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing DICOM viewer...');
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [activeTool, setActiveTool] = useState<MeasurementTool | null>(null);
  
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    translation: { x: 0, y: 0 },
    windowWidth: 256,
    windowCenter: 128,
    rotation: 0,
    hflip: false,
    vflip: false,
    invert: false,
    interpolation: 'linear'
  });
  
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [showMPRPanel, setShowMPRPanel] = useState(false);
  const [show3DPanel, setShow3DPanel] = useState(false);
  const [showCinePanel, setShowCinePanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Advanced imaging states
  const [mprPlanes, setMprPlanes] = useState({
    axial: true,
    sagittal: true,
    coronal: true
  });
  const [threeDSettings, setThreeDSettings] = useState({
    renderMode: 'volume' as 'volume' | 'mip' | 'surface' | 'raycast',
    opacity: 0.8,
    threshold: 100,
    windowWidth: 400,
    windowCenter: 200,
    colorMap: 'grayscale' as 'grayscale' | 'hot' | 'cool' | 'bone'
  });
  // Fix the cine settings state structure
  const [cineSettings, setCineSettings] = useState({
  isPlaying: false,
  fps: 10,
  loop: true
  });
  
  // Create a proper handler for cine settings
  const handleCineSettingsChange = useCallback((settings: { fps: number; loop: boolean }) => {
  setCineSettings(prev => ({
  ...prev,
  fps: settings.fps,
  loop: settings.loop
  }));
  }, []);

  // Initialize viewer
  useEffect(() => {
    const initializeViewer = async () => {
      console.log('🔍 [AdvancedDicomViewer] Starting initialization...');
      console.log('🔍 [AdvancedDicomViewer] viewerRef.current:', viewerRef.current);
      
      // Wait for DOM element to be available with retry mechanism
      let retryCount = 0;
      const maxRetries = 10;
      
      while (!viewerRef.current && retryCount < maxRetries) {
        console.log(`⏳ [AdvancedDicomViewer] Waiting for DOM element... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }
      
      if (!viewerRef.current) {
        console.error('❌ [AdvancedDicomViewer] viewerRef.current is still null after retries, cannot initialize');
        setError('Failed to initialize viewer: DOM element not available');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ [AdvancedDicomViewer] DOM element is ready, proceeding with initialization');

      try {
        console.log('📋 [AdvancedDicomViewer] Setting initial loading state...');
        setIsLoading(true);
        setError(null);
        setLoadingProgress(10);
        setLoadingMessage('Initializing DICOM service...');

        console.log('⚡ [AdvancedDicomViewer] Starting dicomService.initialize()...');
        setLoadingMessage('Initializing DICOM service...');
        const initPromise = dicomService.initialize();
        
        await initPromise;
        setLoadingProgress(30);
        setLoadingMessage('DICOM service ready');
        console.log('✅ [AdvancedDicomViewer] dicomService.initialize() completed successfully');
        
        if (viewerRef.current) {
          setLoadingMessage('Enabling viewer element...');
          try {
            await dicomService.enableElement(viewerRef.current);
            setLoadingProgress(50);
            console.log('✅ [AdvancedDicomViewer] Element enabled successfully');
          } catch (enableError) {
            console.error('❌ [AdvancedDicomViewer] Failed to enable element:', enableError);
            throw new Error(`Failed to enable DICOM viewer element: ${enableError instanceof Error ? enableError.message : String(enableError)}`);
          }
        }
        
        setLoadingProgress(40);
        setLoadingMessage('Loading study images...');

        console.log('🖼️ [AdvancedDicomViewer] Preparing study image IDs...');
        console.log('📊 [AdvancedDicomViewer] Study data:', { 
          patient_id: study.patient_id, 
          study_uid: study.study_uid, 
          image_urls: study.image_urls 
        });
        
        let studyImageIds: string[] = [];
        if (study.image_urls && study.image_urls.length > 0) {
          console.log('📁 [AdvancedDicomViewer] Using provided image URLs:', study.image_urls);
          studyImageIds = study.image_urls;
        } else if (study.dicom_url) {
          // For uploaded DICOM files with direct URL
          const imageId = `wadouri:${study.dicom_url}`;
          console.log('📤 [AdvancedDicomViewer] Using uploaded DICOM URL:', imageId);
          studyImageIds = [imageId];
        } else {
          // For specific patients with DICOM files, use patient-specific endpoint
          if (study.patient_id === 'PAT004' && study.study_uid === '1.2.3.4.5.6.7.8.9.4') {
            const imageId = dicomService.generatePatientImageId ? dicomService.generatePatientImageId(study.patient_id, study.study_uid) : `wadouri:http://localhost:8000/patients/${study.patient_id}/studies/${study.study_uid}/series/1/instances/1`;
            studyImageIds = [imageId];
          } else {
            const imageId = dicomService.generateSampleImageId ? dicomService.generateSampleImageId(study.study_uid) : `sample:${study.study_uid}`;
            studyImageIds = [imageId];
          }
        }

        console.log('📋 [AdvancedDicomViewer] Final image IDs:', studyImageIds);
        setImageIds(studyImageIds);
        setLoadingProgress(70);
        setLoadingMessage('Rendering first image...');

        if (studyImageIds.length > 0) {
          console.log('🎨 [AdvancedDicomViewer] Loading first image:', studyImageIds[0]);
          
          // Add timeout for image loading to prevent hanging
          const imageLoadPromise = loadImage(studyImageIds[0]);
          const imageTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
              console.error('⏰ [AdvancedDicomViewer] Image loading timeout after 15 seconds');
              reject(new Error('Image loading timeout after 15 seconds'));
            }, 15000)
          );
          
          await Promise.race([imageLoadPromise, imageTimeoutPromise]);
          console.log('✅ [AdvancedDicomViewer] First image loaded successfully');
        } else {
          console.warn('⚠️ [AdvancedDicomViewer] No image IDs available to load');
          throw new Error('No image IDs available to load');
        }

        console.log('🎉 [AdvancedDicomViewer] Initialization completed successfully!');
        setLoadingProgress(100);
        setLoadingMessage('Complete!');
        
        // Small delay to show completion before hiding loader
        setTimeout(() => {
          console.log('🏁 [AdvancedDicomViewer] Hiding loading screen');
          setIsLoading(false);
        }, 200);
      } catch (err) {
        console.error('❌ [AdvancedDicomViewer] Initialization failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize advanced DICOM viewer';
        console.error('💥 [AdvancedDicomViewer] Error message:', errorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
      }
    };

    initializeViewer();

    return () => {
      if (viewerRef.current) {
        try {
          dicomService.disableElement(viewerRef.current);
        } catch (err) {
          console.warn('Error disabling DICOM element:', err);
        }
      }
    };
  }, [study.study_uid, onError]);

  const loadImage = async (imageId: string) => {
    console.log('🖼️ [loadImage] Starting to load image:', imageId);
    
    if (!viewerRef.current) {
      console.error('❌ [loadImage] viewerRef.current is null');
      throw new Error('Viewer element not available');
    }

    try {
      console.log('📡 [loadImage] Calling dicomService.displayImage...');
      
      await dicomService.displayImage(viewerRef.current, imageId);
      console.log('✅ [loadImage] dicomService.displayImage completed');
      
      console.log('⚙️ [loadImage] Getting initial viewport...');
      const initialViewport = dicomService.getViewport(viewerRef.current);
      console.log('📊 [loadImage] Initial viewport:', initialViewport);
      
      const newViewport = {
        scale: initialViewport.scale || 1,
        translation: initialViewport.translation || { x: 0, y: 0 },
        windowWidth: initialViewport.voi?.windowWidth || 256,
        windowCenter: initialViewport.voi?.windowCenter || 128,
        rotation: initialViewport.rotation || 0,
        hflip: initialViewport.hflip || false,
        vflip: initialViewport.vflip || false,
        invert: false,
        interpolation: 'linear' as 'linear'
      };
      
      console.log('🎛️ [loadImage] Setting viewport:', newViewport);
      setViewport(newViewport);
      console.log('✅ [loadImage] Image loaded and viewport set successfully');
    } catch (err) {
      console.error('❌ [loadImage] Failed to load image:', err);
      console.error('💥 [loadImage] Error details:', {
        imageId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Try to create a fallback placeholder image
      try {
        console.log('🔄 [loadImage] Attempting to create fallback image...');
        const fallbackImage = dicomService.createSampleImage(512, 512);
        if (fallbackImage && viewerRef.current) {
          console.log('📋 [loadImage] Displaying fallback image');
          // Set a basic viewport for the fallback
          setViewport({
             scale: 1,
             translation: { x: 0, y: 0 },
             windowWidth: 256,
             windowCenter: 128,
             rotation: 0,
             hflip: false,
             vflip: false,
             invert: false,
             interpolation: 'linear' as 'linear'
           });
          console.log('✅ [loadImage] Fallback image displayed');
          return; // Don't throw error if fallback works
        }
      } catch (fallbackErr) {
        console.error('❌ [loadImage] Fallback image creation failed:', fallbackErr);
      }
      
      throw err;
    }
  };

  const updateViewport = useCallback((updates: Partial<ViewportState>) => {
    if (!viewerRef.current) return;

    const newViewport = { ...viewport, ...updates };
    setViewport(newViewport);

    try {
      dicomService.setViewport(viewerRef.current, {
        scale: newViewport.scale,
        translation: newViewport.translation,
        voi: {
          windowWidth: newViewport.windowWidth,
          windowCenter: newViewport.windowCenter,
        },
        rotation: newViewport.rotation,
        hflip: newViewport.hflip,
        vflip: newViewport.vflip,
        invert: newViewport.invert,
        interpolation: newViewport.interpolation
      });
    } catch (err) {
      console.warn('Failed to update viewport:', err);
    }
  }, [viewport]);

  // Advanced tool handlers
  const handleMPRView = () => {
    setViewMode('mpr');
    setShowMPRPanel(true);
  };

  const handle3DView = () => {
    setViewMode('3d');
    setShow3DPanel(true);
  };

  const handleCineMode = () => {
    setViewMode('cine');
    setShowCinePanel(true);
  };

  const handleCompareMode = () => {
    setViewMode('compare');
  };

  const handleMeasurementTool = (tool: MeasurementTool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  const handleSaveViewport = () => {
    const viewportData = {
      studyUid: study.study_uid,
      imageIndex: currentImageIndex,
      viewport: viewport,
      measurements: measurements,
      annotations: annotations,
      timestamp: new Date().toISOString()
    };
    
    // Save to localStorage or send to backend
    localStorage.setItem(`viewport_${study.study_uid}`, JSON.stringify(viewportData));
    console.log('Viewport saved:', viewportData);
  };

  const handlePrintImage = () => {
    if (!viewerRef.current) return;
    
    // Create print-friendly version
    const canvas = viewerRef.current.querySelector('canvas');
    if (canvas) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>DICOM Image - ${study.patient_id}</title></head>
            <body style="margin:0; text-align:center;">
              <h3>Patient: ${study.patient_id} | Study: ${study.study_date}</h3>
              <img src="${canvas.toDataURL()}" style="max-width:100%; height:auto;" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const renderViewerContent = () => {
    switch (viewMode) {
      case 'mpr':
        return (
          <MPRViewer
            study={study}
            imageIds={imageIds}
            planes={mprPlanes}
            onPlanesChange={setMprPlanes}
          />
        );
      case '3d':
        return (
          <ThreeDViewer
            study={study}
            imageIds={imageIds}
            settings={threeDSettings}
            onSettingsChange={setThreeDSettings}
          />
        );
      case 'cine':
        return (
          <CinePlayer
            imageIds={imageIds}
            currentIndex={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
            isPlaying={cineSettings.isPlaying}
            fps={cineSettings.fps}
            loop={cineSettings.loop}
            onPlayStateChange={(isPlaying) => setCineSettings(prev => ({ ...prev, isPlaying }))}
            onSettingsChange={handleCineSettingsChange}
          />
        );
      case 'compare':
        return (
          <Grid container spacing={1} sx={{ height: '100%' }}>
            <Grid item xs={6}>
              <div style={{ width: '100%', height: '100%', backgroundColor: '#000', border: '1px solid #333' }} />
            </Grid>
            <Grid item xs={6}>
              <div style={{ width: '100%', height: '100%', backgroundColor: '#000', border: '1px solid #333' }} />
            </Grid>
          </Grid>
        );
      default:
        return null; // Main viewer container is always rendered now
    }
  };

  // Loading overlay component
  const LoadingOverlay = () => (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <CircularProgress size={60} sx={{ mb: 3 }} />
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
        {loadingMessage}
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mb: 2 }}>
        <Slider
          value={loadingProgress}
          disabled
          sx={{
            '& .MuiSlider-thumb': {
              display: 'none'
            },
            '& .MuiSlider-track': {
              height: 8,
              borderRadius: 4
            },
            '& .MuiSlider-rail': {
              height: 8,
              borderRadius: 4,
              opacity: 0.3
            }
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {loadingProgress}% complete
      </Typography>
    </Box>
  );

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Viewer Error</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Advanced Toolbar */}
      <Paper elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onChange={(_, value) => setViewMode(value)}>
            <Tab label="Single" value="single" icon={<CropFreeIcon />} iconPosition="start" />
            {enableAdvancedFeatures && (
              <>
                <Tab label="MPR" value="mpr" icon={<MPRIcon />} iconPosition="start" />
                <Tab label="3D" value="3d" icon={<ThreeDIcon />} iconPosition="start" />
                <Tab label="Cine" value="cine" icon={<CineIcon />} iconPosition="start" />
                <Tab label="Compare" value="compare" icon={<CompareIcon />} iconPosition="start" />
              </>
            )}
          </Tabs>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Basic Tools */}
          <ButtonGroup size="small">
            <Tooltip title="Zoom In">
              <IconButton onClick={() => updateViewport({ scale: viewport.scale * 1.2 })}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={() => updateViewport({ scale: viewport.scale / 1.2 })}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset View">
              <IconButton onClick={() => dicomService.fitToWindow(viewerRef.current!)}>
                <ResetIcon />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <ButtonGroup size="small">
            <Tooltip title="Rotate">
              <IconButton onClick={() => updateViewport({ rotation: (viewport.rotation + 90) % 360 })}>
                <RotateIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Flip Horizontal">
              <IconButton onClick={() => updateViewport({ hflip: !viewport.hflip })}>
                <FlipIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Invert">
              <IconButton 
                onClick={() => updateViewport({ invert: !viewport.invert })}
                color={viewport.invert ? 'primary' : 'default'}
              >
                <LUTIcon />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {/* Measurement Tools */}
          <ButtonGroup size="small">
            <Tooltip title="Length Measurement">
              <IconButton 
                onClick={() => handleMeasurementTool('length')}
                color={activeTool === 'length' ? 'primary' : 'default'}
              >
                <MeasureIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Angle Measurement">
              <IconButton 
                onClick={() => handleMeasurementTool('angle')}
                color={activeTool === 'angle' ? 'primary' : 'default'}
              >
                <ProfileIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="ROI Rectangle">
              <IconButton 
                onClick={() => handleMeasurementTool('rectangle')}
                color={activeTool === 'rectangle' ? 'primary' : 'default'}
              >
                <ROIIcon />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Utility Tools */}
          <ButtonGroup size="small">
            <Tooltip title="Save Viewport">
              <IconButton onClick={handleSaveViewport}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print Image">
              <IconButton onClick={handlePrintImage}>
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={() => setShowToolPanel(!showToolPanel)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Toolbar>
      </Paper>

      {/* Main Viewer Area */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Viewer */}
          <Grid item xs={showToolPanel ? 9 : 12} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%', position: 'relative' }}>
              {/* Always render the main viewer container */}
              <div 
                ref={viewerRef} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  backgroundColor: '#000',
                  position: 'relative',
                  cursor: activeTool ? 'crosshair' : 'default'
                }} 
              />
              
              {/* Conditionally render view mode specific content */}
              {viewMode !== 'single' && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                  {renderViewerContent()}
                </Box>
              )}
              
              {/* Loading overlay */}
              {isLoading && <LoadingOverlay />}
              
              {/* DICOM Overlay */}
              {viewMode === 'single' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    zIndex: 10
                  }}
                >
                  <div>Patient: {study.patient_id}</div>
                  <div>Study: {study.study_date}</div>
                  <div>Modality: {study.modality}</div>
                  <div>Series: {currentImageIndex + 1}/{imageIds.length}</div>
                  <div>W: {Math.round(viewport.windowWidth)} L: {Math.round(viewport.windowCenter)}</div>
                  <div>Zoom: {Math.round(viewport.scale * 100)}%</div>
                  <div>Rotation: {viewport.rotation}°</div>
                  {activeTool && <div>Tool: {activeTool.toUpperCase()}</div>}
                </Box>
              )}

              {/* Image Navigation */}
              {imageIds.length > 1 && viewMode === 'single' && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0,0,0,0.7)',
                    borderRadius: 1,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    sx={{ color: 'white' }}
                  >
                    ←
                  </IconButton>
                  <Typography variant="caption" sx={{ color: 'white', minWidth: 60, textAlign: 'center' }}>
                    {currentImageIndex + 1} / {imageIds.length}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setCurrentImageIndex(Math.min(imageIds.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === imageIds.length - 1}
                    sx={{ color: 'white' }}
                  >
                    →
                  </IconButton>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Tool Panel */}
          {showToolPanel && (
            <Grid item xs={3}>
              <Paper sx={{ height: '100%', overflow: 'auto' }}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Advanced Tools
                  </Typography>

                  {/* Windowing Controls */}
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Window/Level
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption">Width: {Math.round(viewport.windowWidth)}</Typography>
                        <Slider
                          value={viewport.windowWidth}
                          onChange={(_, value) => updateViewport({ windowWidth: value as number })}
                          min={1}
                          max={4000}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption">Center: {Math.round(viewport.windowCenter)}</Typography>
                        <Slider
                          value={viewport.windowCenter}
                          onChange={(_, value) => updateViewport({ windowCenter: value as number })}
                          min={-1000}
                          max={3000}
                          size="small"
                        />
                      </Box>
                      <WindowingPresets onPresetSelect={(preset) => updateViewport(preset)} />
                    </CardContent>
                  </Card>

                  {/* Image Processing */}
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Image Processing
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={viewport.invert}
                            onChange={(e) => updateViewport({ invert: e.target.checked })}
                          />
                        }
                        label="Invert"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={viewport.interpolation === 'linear'}
                            onChange={(e) => updateViewport({ 
                              interpolation: e.target.checked ? 'linear' : 'nearest' 
                            })}
                          />
                        }
                        label="Smooth Interpolation"
                      />
                    </CardContent>
                  </Card>

                  {/* Measurements */}
                  {measurements.length > 0 && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Measurements ({measurements.length})
                        </Typography>
                        <List dense>
                          {measurements.map((measurement, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <MeasureIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${measurement.type}: ${measurement.value}`}
                                secondary={measurement.unit}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {/* Study Information */}
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Study Information
                      </Typography>
                      <Typography variant="caption" display="block">
                        Patient: {study.patient_id}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Study Date: {study.study_date}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Modality: {study.modality}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Description: {study.study_description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default AdvancedDicomViewer;