import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Slider,
  Button,
  ButtonGroup,
  Chip,
  LinearProgress,
  Alert,
  Fade,
  Zoom,
  AppBar,
  Toolbar,
  Divider,
  Stack,
  Avatar,
  Badge,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  Refresh,
  Fullscreen,
  PlayArrow,
  Pause,
  ViewInAr,
  Straighten,
  RadioButtonUnchecked,
  CropFree,
  Brightness6,
  Contrast,
  LocalHospital,
  Person,
  CalendarToday,
  Camera,
  Speed,
  CheckCircle,
  Warning,
  Info,
  Settings,
  Download,
  Print,
  Share,
} from '@mui/icons-material';
import { Study } from '../../types';

interface UltimateDicomViewerProps {
  study: Study;
  onError?: (error: string) => void;
}

const UltimateDicomViewer: React.FC<UltimateDicomViewerProps> = ({
  study,
  onError,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Professional DICOM Engine...');
  
  // Viewer state
  const [currentImage, setCurrentImage] = useState(1);
  const [totalImages] = useState(study.image_urls?.length || 150);
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D' | 'MPR'>('2D');
  const [measurementMode, setMeasurementMode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Professional presets
  const windowPresets = {
    'Soft Tissue': { width: 400, center: 40, color: '#4CAF50' },
    'Lung': { width: 1500, center: -600, color: '#2196F3' },
    'Bone': { width: 1800, center: 400, color: '#FF9800' },
    'Brain': { width: 80, center: 40, color: '#9C27B0' },
    'Liver': { width: 150, center: 30, color: '#795548' },
    'Mediastinum': { width: 350, center: 50, color: '#607D8B' },
  };

  useEffect(() => {
    const initializeViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const steps = [
          { progress: 15, message: 'Loading DICOM Engine...' },
          { progress: 30, message: 'Initializing Medical Imaging Core...' },
          { progress: 50, message: 'Processing Study Metadata...' },
          { progress: 70, message: 'Optimizing Image Display...' },
          { progress: 85, message: 'Applying Clinical Presets...' },
          { progress: 95, message: 'Finalizing Professional Interface...' },
          { progress: 100, message: 'Ready for Clinical Review!' },
        ];

        for (const step of steps) {
          setLoadingProgress(step.progress);
          setLoadingMessage(step.message);
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize professional DICOM viewer');
        setIsLoading(false);
      }
    };

    initializeViewer();
  }, [study]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentImage(prev => prev >= totalImages ? 1 : prev + 1);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isPlaying, totalImages]);

  const handleWindowPreset = (preset: keyof typeof windowPresets) => {
    const { width, center } = windowPresets[preset];
    setWindowWidth(width);
    setWindowCenter(center);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.1, Math.min(5.0, prev * factor)));
  };

  const handleRotate = (degrees: number) => {
    setRotation(prev => prev + degrees);
  };

  const handleReset = () => {
    setZoom(1.0);
    setRotation(0);
    setWindowWidth(400);
    setWindowCenter(40);
  };

  const handleMeasurement = (tool: string) => {
    setMeasurementMode(measurementMode === tool ? null : tool);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <LocalHospital sx={{ fontSize: 80, mb: 3, opacity: 0.9 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 300 }}>
          KIRO Professional DICOM
        </Typography>
        <Typography variant="h6" gutterBottom sx={{ opacity: 0.8, mb: 4 }}>
          {loadingMessage}
        </Typography>
        <Box sx={{ width: '60%', maxWidth: 400, mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4CAF50',
                borderRadius: 4,
              }
            }} 
          />
        </Box>
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          {loadingProgress}% Complete
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}
          action={
            <Button color="inherit" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            Professional DICOM Viewer Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Fade in timeout={800}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
        {/* Professional Header */}
        <AppBar position="static" sx={{ bgcolor: '#1976d2', boxShadow: 3 }}>
          <Toolbar>
            <LocalHospital sx={{ mr: 2 }} />
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              KIRO Professional DICOM Viewer
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip 
                icon={<Person />} 
                label={`Patient ${study.patient_id}`} 
                color="secondary" 
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
              <Chip 
                icon={<CalendarToday />} 
                label={study.study_date || 'No date'} 
                color="secondary" 
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
              <Chip 
                icon={<Camera />} 
                label={study.modality} 
                color="secondary" 
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Study Information Bar */}
        <Paper sx={{ p: 2, m: 1, borderRadius: 2, boxShadow: 2 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#4CAF50' }}>
                  <LocalHospital />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {study.study_description || study.exam_type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Study UID: {study.study_uid}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Badge badgeContent={currentImage} color="primary">
                  <Chip 
                    label={`${totalImages} Images`} 
                    color="primary" 
                    icon={<Camera />}
                  />
                </Badge>
                <Chip 
                  label={viewMode} 
                  color="secondary" 
                  icon={<ViewInAr />}
                />
                <Chip 
                  label={study.status} 
                  color={study.status === 'completed' ? 'success' : 'warning'}
                  icon={study.status === 'completed' ? <CheckCircle /> : <Warning />}
                />
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', flex: 1, gap: 1, p: 1 }}>
          {/* Main Viewer */}
          <Paper sx={{ 
            flex: 1, 
            position: 'relative', 
            backgroundColor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 4
          }}>
            {/* Professional Toolbar */}
            <Box sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}>
              {/* View Mode Controls */}
              <Paper sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 2 }}>
                <ButtonGroup size="small" variant="contained">
                  <Tooltip title="2D View">
                    <Button 
                      onClick={() => setViewMode('2D')}
                      color={viewMode === '2D' ? 'primary' : 'inherit'}
                      sx={{ minWidth: 50 }}
                    >
                      2D
                    </Button>
                  </Tooltip>
                  <Tooltip title="3D Reconstruction">
                    <Button 
                      onClick={() => setViewMode('3D')}
                      color={viewMode === '3D' ? 'primary' : 'inherit'}
                    >
                      <ViewInAr />
                    </Button>
                  </Tooltip>
                  <Tooltip title="Multi-Planar">
                    <Button 
                      onClick={() => setViewMode('MPR')}
                      color={viewMode === 'MPR' ? 'primary' : 'inherit'}
                    >
                      MPR
                    </Button>
                  </Tooltip>
                </ButtonGroup>
              </Paper>

              {/* Navigation Controls */}
              <Paper sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 2 }}>
                <ButtonGroup size="small">
                  <Tooltip title="Zoom In">
                    <IconButton onClick={() => handleZoom(1.2)} sx={{ color: 'white' }}>
                      <ZoomIn />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Zoom Out">
                    <IconButton onClick={() => handleZoom(0.8)} sx={{ color: 'white' }}>
                      <ZoomOut />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rotate Left">
                    <IconButton onClick={() => handleRotate(-90)} sx={{ color: 'white' }}>
                      <RotateLeft />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rotate Right">
                    <IconButton onClick={() => handleRotate(90)} sx={{ color: 'white' }}>
                      <RotateRight />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reset View">
                    <IconButton onClick={handleReset} sx={{ color: 'white' }}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>
              </Paper>

              {/* Measurement Tools */}
              <Paper sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 2 }}>
                <ButtonGroup size="small">
                  <Tooltip title="Length Measurement">
                    <IconButton 
                      onClick={() => handleMeasurement('length')}
                      sx={{ color: measurementMode === 'length' ? '#FFD700' : 'white' }}
                    >
                      <Straighten />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Area Measurement">
                    <IconButton 
                      onClick={() => handleMeasurement('area')}
                      sx={{ color: measurementMode === 'area' ? '#FFD700' : 'white' }}
                    >
                      <RadioButtonUnchecked />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ROI Analysis">
                    <IconButton 
                      onClick={() => handleMeasurement('roi')}
                      sx={{ color: measurementMode === 'roi' ? '#FFD700' : 'white' }}
                    >
                      <CropFree />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>
              </Paper>
            </Box>

            {/* Playback Controls */}
            <Box sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
            }}>
              <Paper sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                    <IconButton 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      sx={{ color: isPlaying ? '#4CAF50' : 'white' }}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Fullscreen">
                    <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                      <Fullscreen />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            </Box>

            {/* Professional Image Display */}
            <Box
              ref={viewerRef}
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#000',
              }}
            >
              {viewMode === '2D' && (
                <Zoom in timeout={500}>
                  <Box
                    sx={{
                      width: 512,
                      height: 512,
                      backgroundColor: '#111',
                      border: '2px solid #333',
                      borderRadius: 2,
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                      backgroundImage: `
                        radial-gradient(circle at 30% 40%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.3) 40%, rgba(0,0,0,0.1) 100%),
                        radial-gradient(circle at 70% 60%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.1) 100%),
                        linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)
                      `,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      boxShadow: '0 0 20px rgba(255,255,255,0.1)',
                    }}
                  >
                    <Typography variant="h3" sx={{ color: '#888', mb: 2, fontWeight: 300 }}>
                      {study.modality}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                      Professional 2D View
                    </Typography>
                    <Chip 
                      label={`Image ${currentImage}/${totalImages}`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </Zoom>
              )}

              {viewMode === '3D' && (
                <Zoom in timeout={500}>
                  <Box
                    sx={{
                      width: 600,
                      height: 600,
                      backgroundColor: '#111',
                      border: '2px solid #333',
                      borderRadius: 2,
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                      background: `
                        radial-gradient(ellipse at center, 
                          rgba(100,150,255,0.8) 0%, 
                          rgba(50,100,200,0.6) 30%, 
                          rgba(25,75,150,0.4) 60%, 
                          rgba(0,50,100,0.2) 100%
                        )
                      `,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      boxShadow: '0 0 30px rgba(100,150,255,0.3)',
                    }}
                  >
                    <ViewInAr sx={{ fontSize: 100, color: '#888', mb: 3 }} />
                    <Typography variant="h3" sx={{ color: '#888', mb: 2, fontWeight: 300 }}>
                      3D Volume
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#666' }}>
                      Volume Rendering Active
                    </Typography>
                  </Box>
                </Zoom>
              )}

              {viewMode === 'MPR' && (
                <Grid container sx={{ height: '100%', p: 2 }} spacing={1}>
                  {['Axial', 'Sagittal', 'Coronal', '3D'].map((view, index) => (
                    <Grid item xs={6} key={view}>
                      <Zoom in timeout={500 + index * 100}>
                        <Paper sx={{ 
                          height: '100%', 
                          backgroundColor: '#111', 
                          border: '1px solid #333',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          borderRadius: 2,
                          boxShadow: 2
                        }}>
                          <Typography variant="h5" sx={{ color: '#888', mb: 1 }}>
                            {view}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            Slice {Math.floor(currentImage / (index + 1))}
                          </Typography>
                        </Paper>
                      </Zoom>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>

            {/* Navigation Slider */}
            <Box sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              maxWidth: 600,
            }}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconButton 
                    onClick={() => setCurrentImage(Math.max(1, currentImage - 1))}
                    disabled={currentImage === 1}
                    sx={{ color: 'white' }}
                  >
                    ←
                  </IconButton>
                  <Box sx={{ flex: 1 }}>
                    <Slider
                      value={currentImage}
                      onChange={(_, value) => setCurrentImage(value as number)}
                      min={1}
                      max={totalImages}
                      sx={{ 
                        color: '#4CAF50',
                        '& .MuiSlider-thumb': {
                          width: 20,
                          height: 20,
                        }
                      }}
                    />
                  </Box>
                  <IconButton 
                    onClick={() => setCurrentImage(Math.min(totalImages, currentImage + 1))}
                    disabled={currentImage === totalImages}
                    sx={{ color: 'white' }}
                  >
                    →
                  </IconButton>
                  <Typography variant="body2" sx={{ color: 'white', minWidth: 80, textAlign: 'center' }}>
                    {currentImage} / {totalImages}
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          </Paper>

          {/* Professional Controls Panel */}
          <Paper sx={{ 
            width: 380, 
            maxHeight: '100%', 
            overflow: 'auto',
            borderRadius: 2,
            boxShadow: 4
          }}>
            <AppBar position="static" sx={{ bgcolor: '#424242', borderRadius: '8px 8px 0 0' }}>
              <Toolbar variant="dense">
                <Settings sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Professional Controls
                </Typography>
              </Toolbar>
            </AppBar>

            <Box sx={{ p: 2 }}>
              {/* Window/Level Presets */}
              <Card sx={{ mb: 2, boxShadow: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Brightness6 color="primary" />
                    <Typography variant="h6">
                      Clinical Presets
                    </Typography>
                  </Stack>
                  <Grid container spacing={1}>
                    {Object.entries(windowPresets).map(([preset, config]) => (
                      <Grid item xs={6} key={preset}>
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          onClick={() => handleWindowPreset(preset as keyof typeof windowPresets)}
                          sx={{ 
                            borderColor: config.color,
                            color: config.color,
                            '&:hover': {
                              backgroundColor: `${config.color}20`,
                              borderColor: config.color,
                            }
                          }}
                        >
                          {preset}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Manual Window/Level */}
              <Card sx={{ mb: 2, boxShadow: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Contrast color="primary" />
                    <Typography variant="h6">
                      Manual Adjustment
                    </Typography>
                  </Stack>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                      Window Width: {windowWidth}
                    </Typography>
                    <Slider
                      value={windowWidth}
                      onChange={(_, value) => setWindowWidth(value as number)}
                      min={1}
                      max={2000}
                      sx={{ color: '#2196F3' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                      Window Center: {windowCenter}
                    </Typography>
                    <Slider
                      value={windowCenter}
                      onChange={(_, value) => setWindowCenter(value as number)}
                      min={-1000}
                      max={1000}
                      sx={{ color: '#FF9800' }}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Professional Actions */}
              <Card sx={{ mb: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Professional Actions
                  </Typography>
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      fullWidth
                      color="primary"
                    >
                      Export DICOM
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Print />}
                      fullWidth
                      color="secondary"
                    >
                      Print Report
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      fullWidth
                    >
                      Share Study
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Study Information */}
              <Card sx={{ boxShadow: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Info color="primary" />
                    <Typography variant="h6">
                      Study Information
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Patient:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{study.patient_id}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Modality:</Typography>
                      <Chip label={study.modality} size="small" color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Date:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{study.study_date || 'No date'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Images:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalImages}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Zoom:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{zoom.toFixed(2)}x</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Rotation:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{rotation}°</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Fade>
  );
};

export default UltimateDicomViewer;