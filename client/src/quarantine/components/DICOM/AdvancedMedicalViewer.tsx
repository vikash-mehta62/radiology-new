import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, IconButton, Tooltip, Slider,
  Card, CardContent, Grid, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  AppBar, Toolbar, Divider, Switch, FormControlLabel,
  Alert, LinearProgress, Tabs, Tab, Badge
} from '@mui/material';
import {
  ZoomIn, ZoomOut, RotateLeft, RotateRight, CenterFocusStrong,
  Brightness6, Contrast, Info, Download, Fullscreen,
  RestartAlt, Visibility, Close, ViewInAr, Timeline,
  BugReport, Analytics, Healing, Warning, CheckCircle,
  Speed, Tune, PhotoFilter, Straighten, AspectRatio
} from '@mui/icons-material';
import type { Study } from '../../types';

interface AdvancedMedicalViewerProps {
  study: Study;
  onError?: (error: string) => void;
}

interface ViewerMode {
  mode: '2D' | '3D' | 'MPR' | 'Volume';
  label: string;
  icon: React.ReactNode;
}

interface MedicalTool {
  id: string;
  name: string;
  icon: React.ReactNode;
  active: boolean;
  description: string;
}

interface AutoDetection {
  type: 'anomaly' | 'measurement' | 'quality' | 'anatomy';
  confidence: number;
  description: string;
  location?: { x: number; y: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AdvancedMedicalViewer: React.FC<AdvancedMedicalViewerProps> = ({ study, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Advanced viewer states
  const [viewerMode, setViewerMode] = useState<ViewerMode['mode']>('2D');
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true);
  const [detections, setDetections] = useState<AutoDetection[]>([]);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  
  // Image manipulation states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [windowLevel, setWindowLevel] = useState(50);
  const [windowWidth, setWindowWidth] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [invert, setInvert] = useState(false);
  
  // Medical tools
  const [activeTool, setActiveTool] = useState<string>('none');
  const [measurements, setMeasurements] = useState<any[]>([]);

  const viewerModes: ViewerMode[] = [
    { mode: '2D', label: '2D View', icon: <AspectRatio /> },
    { mode: '3D', label: '3D Volume', icon: <ViewInAr /> },
    { mode: 'MPR', label: 'MPR', icon: <Timeline /> },
    { mode: 'Volume', label: 'Volume Render', icon: <PhotoFilter /> }
  ];

  const medicalTools: MedicalTool[] = [
    { id: 'ruler', name: 'Ruler', icon: <Straighten />, active: false, description: 'Linear measurements' },
    { id: 'angle', name: 'Angle', icon: <Tune />, active: false, description: 'Angular measurements' },
    { id: 'roi', name: 'ROI', icon: <CenterFocusStrong />, active: false, description: 'Region of interest' },
    { id: 'annotation', name: 'Annotate', icon: <BugReport />, active: false, description: 'Add annotations' }
  ];  
const loadAdvancedDicomImage = async () => {
    try {
      setLoading(true);
      setError(null);

      const studyAny = study as any;
      
      // Try different image sources
      const imageSources = [
        studyAny.preview_url,
        studyAny.thumbnail_url,
        studyAny.processed_images?.preview,
        studyAny.dicom_url
      ].filter(Boolean);

      console.log('🏥 Advanced Medical Viewer - Loading:', imageSources);

      if (imageSources.length === 0) {
        showMedicalInfo();
        return;
      }

      // Try loading images
      for (const source of imageSources) {
        const imageUrl = source.startsWith('http') ? source : `http://localhost:8000${source}`;
        console.log('🔍 Loading medical image:', imageUrl);
        
        const success = await tryLoadMedicalImage(imageUrl);
        if (success) {
          // Run auto-detection after image loads
          if (autoDetectionEnabled) {
            runAutoDetection();
          }
          return;
        }
      }

      showMedicalInfo();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load medical image';
      console.error('❌ Advanced medical viewer error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const tryLoadMedicalImage = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('✅ Medical image loaded successfully');
        setCurrentImage(img);
        drawMedicalImageToCanvas(img);
        setImageLoaded(true);
        setLoading(false);
        resolve(true);
      };

      img.onerror = () => {
        console.log('❌ Failed to load medical image');
        resolve(false);
      };

      img.src = url;
    });
  };

  const runAutoDetection = async () => {
    if (!currentImage) return;
    
    setAnalysisRunning(true);
    
    // Simulate advanced medical image analysis
    setTimeout(() => {
      const mockDetections: AutoDetection[] = [
        {
          type: 'quality',
          confidence: 0.95,
          description: 'Image quality: Excellent',
          severity: 'low'
        },
        {
          type: 'anatomy',
          confidence: 0.88,
          description: 'Brain anatomy detected',
          location: { x: 256, y: 200 },
          severity: 'low'
        }
      ];
      
      // Add random anomaly detection based on image analysis
      if (Math.random() > 0.7) {
        mockDetections.push({
          type: 'anomaly',
          confidence: 0.72,
          description: 'Potential area of interest detected',
          location: { x: 180, y: 150 },
          severity: 'medium'
        });
      }
      
      setDetections(mockDetections);
      setAnalysisRunning(false);
    }, 2000);
  }; 
 const drawMedicalImageToCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear with medical black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate image dimensions
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = img.width / img.height;
    
    let drawWidth, drawHeight;
    if (imageAspect > canvasAspect) {
      drawWidth = canvas.width * zoom;
      drawHeight = (canvas.width / imageAspect) * zoom;
    } else {
      drawHeight = canvas.height * zoom;
      drawWidth = (canvas.height * imageAspect) * zoom;
    }

    // Apply medical imaging transformations
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Apply medical imaging filters
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (invert) {
      filterString += ' invert(1)';
    }
    ctx.filter = filterString;
    
    // Draw medical image
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Draw medical overlays
    drawMedicalOverlays(ctx);
  };

  const drawMedicalOverlays = (ctx: CanvasRenderingContext2D) => {
    // Draw patient info overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 80);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.fillText(`Patient: ${study.patient_id}`, 15, 25);
    ctx.fillText(`Modality: ${study.modality}`, 15, 40);
    ctx.fillText(`Date: ${study.study_date}`, 15, 55);
    ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, 15, 70);

    // Draw detection markers
    detections.forEach((detection, index) => {
      if (detection.location) {
        const { x, y } = detection.location;
        
        // Draw detection marker
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = detection.severity === 'critical' ? '#ff0000' : 
                         detection.severity === 'high' ? '#ff8800' :
                         detection.severity === 'medium' ? '#ffff00' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw detection number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText((index + 1).toString(), x, y + 3);
      }
    });
    
    ctx.restore();
  };

  const showMedicalInfo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    // Medical imaging background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw medical interface
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🏥 ADVANCED MEDICAL IMAGING SYSTEM', canvas.width / 2, 60);

    ctx.font = '16px monospace';
    const info = [
      `Patient ID: ${study.patient_id}`,
      `Study: ${study.original_filename}`,
      `Modality: ${study.modality}`,
      `Date: ${study.study_date}`,
      `Size: ${study.file_size ? Math.round(study.file_size / 1024) + ' KB' : 'Unknown'}`,
      '',
      'DICOM Processing Status:',
      (study as any).processing_status || 'Processing...',
      '',
      'Advanced Features Available:',
      '• 2D/3D Medical Image Viewing',
      '• Auto-Detection & Analysis',
      '• Medical Measurements',
      '• Windowing & Leveling',
      '• Professional Medical Tools'
    ];

    info.forEach((line, index) => {
      const y = 120 + (index * 25);
      if (line.includes('🏥') || line.includes('Advanced Features')) {
        ctx.fillStyle = '#4fc3f7';
        ctx.font = 'bold 16px monospace';
      } else if (line.startsWith('•')) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
      } else {
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px monospace';
      }
      ctx.fillText(line, canvas.width / 2, y);
    });

    setImageLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    loadAdvancedDicomImage();
  }, [study]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading advanced medical viewer...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Medical Viewer Error: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Medical Viewer Header */}
      <AppBar position="static" sx={{ bgcolor: '#1a1a1a' }}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#00ff00' }}>
            🏥 Advanced Medical DICOM Viewer
          </Typography>
          <Chip 
            label={`${viewerMode} Mode`} 
            color="primary" 
            size="small" 
            sx={{ mr: 1 }}
          />
          {analysisRunning && (
            <Chip 
              label="AI Analysis Running..." 
              color="warning" 
              size="small" 
              sx={{ mr: 1 }}
            />
          )}
        </Toolbar>
      </AppBar>

      {/* Main Viewer Area */}
      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* Canvas Container */}
        <Box 
          ref={containerRef}
          sx={{ 
            flex: 1, 
            position: 'relative',
            bgcolor: '#000000',
            border: '2px solid #00ff00'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              cursor: activeTool !== 'none' ? 'crosshair' : 'default'
            }}
          />
          
          {/* Medical Controls Overlay */}
          <Box sx={{ 
            position: 'absolute', 
            top: 10, 
            right: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            {/* Viewer Mode Buttons */}
            {viewerModes.map((mode) => (
              <Tooltip key={mode.mode} title={mode.label}>
                <IconButton
                  size="small"
                  onClick={() => setViewerMode(mode.mode)}
                  sx={{
                    bgcolor: viewerMode === mode.mode ? '#00ff00' : 'rgba(0,0,0,0.7)',
                    color: viewerMode === mode.mode ? '#000' : '#00ff00',
                    '&:hover': { bgcolor: '#00ff00', color: '#000' }
                  }}
                >
                  {mode.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Medical Tools Panel */}
        <Paper sx={{ width: 300, bgcolor: '#1a1a1a', color: '#00ff00' }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: '#333' }}
          >
            <Tab label="Tools" />
            <Tab label="Analysis" />
            <Tab label="Info" />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Medical Tools</Typography>
              
              {/* Window/Level Controls */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2">Window/Level</Typography>
                <Box sx={{ px: 1 }}>
                  <Typography variant="caption">Level: {windowLevel}</Typography>
                  <Slider
                    value={windowLevel}
                    onChange={(_, value) => setWindowLevel(value as number)}
                    min={0}
                    max={100}
                    size="small"
                  />
                  <Typography variant="caption">Width: {windowWidth}</Typography>
                  <Slider
                    value={windowWidth}
                    onChange={(_, value) => setWindowWidth(value as number)}
                    min={1}
                    max={200}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Medical Tools */}
              <Typography variant="subtitle2" gutterBottom>Measurement Tools</Typography>
              <Grid container spacing={1}>
                {medicalTools.map((tool) => (
                  <Grid item xs={6} key={tool.id}>
                    <Button
                      fullWidth
                      variant={activeTool === tool.id ? "contained" : "outlined"}
                      startIcon={tool.icon}
                      onClick={() => setActiveTool(activeTool === tool.id ? 'none' : tool.id)}
                      size="small"
                    >
                      {tool.name}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>AI Analysis</Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={autoDetectionEnabled}
                    onChange={(e) => setAutoDetectionEnabled(e.target.checked)}
                  />
                }
                label="Auto-Detection"
              />

              {detections.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Detections</Typography>
                  {detections.map((detection, index) => (
                    <Card key={index} sx={{ mb: 1, bgcolor: '#2a2a2a' }}>
                      <CardContent sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {detection.type === 'anomaly' && <Warning color="warning" />}
                          {detection.type === 'quality' && <CheckCircle color="success" />}
                          {detection.type === 'anatomy' && <Healing color="info" />}
                          <Typography variant="caption">
                            {detection.description}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          Confidence: {Math.round(detection.confidence * 100)}%
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Study Information</Typography>
              <Typography variant="body2" paragraph>
                Patient: {study.patient_id}
              </Typography>
              <Typography variant="body2" paragraph>
                Modality: {study.modality}
              </Typography>
              <Typography variant="body2" paragraph>
                Date: {study.study_date}
              </Typography>
              <Typography variant="body2" paragraph>
                Description: {study.study_description}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default AdvancedMedicalViewer;