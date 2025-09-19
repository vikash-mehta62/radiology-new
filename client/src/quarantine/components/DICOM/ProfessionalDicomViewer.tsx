import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, IconButton, Tooltip, Slider,
  Card, CardContent, Grid, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  AppBar, Toolbar, Divider
} from '@mui/material';
import {
  ZoomIn, ZoomOut, RotateLeft, RotateRight, CenterFocusStrong,
  Brightness6, Contrast, Info, Download, Fullscreen,
  RestartAlt, Visibility, Close
} from '@mui/icons-material';
import type { Study } from '../../types';

interface ProfessionalDicomViewerProps {
  study: Study;
  onError?: (error: string) => void;
}

const ProfessionalDicomViewer: React.FC<ProfessionalDicomViewerProps> = ({ study, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  
  // Image manipulation states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const loadDicomImage = async () => {
    try {
      setLoading(true);
      setError(null);

      const studyAny = study as any;
      
      // Try different image sources in priority order
      const imageSources = [
        studyAny.preview_url,
        studyAny.thumbnail_url,
        studyAny.processed_images?.preview,
        studyAny.processed_images?.thumbnail,
        studyAny.dicom_url
      ].filter(Boolean);

      console.log('🔍 Available image sources:', imageSources);

      if (imageSources.length === 0) {
        showDicomInfo();
        return;
      }

      // Try loading images
      for (const source of imageSources) {
        const imageUrl = source.startsWith('http') ? source : `http://localhost:8000${source}`;
        console.log('🔍 Trying to load:', imageUrl);
        
        const success = await tryLoadImage(imageUrl);
        if (success) {
          return;
        }
      }

      // If no images loaded, show info
      showDicomInfo();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load DICOM image';
      console.error('❌ DICOM loading error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const tryLoadImage = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('✅ Image loaded successfully');
        setCurrentImage(img);
        drawImageToCanvas(img);
        setImageLoaded(true);
        setLoading(false);
        resolve(true);
      };

      img.onerror = () => {
        console.log('❌ Failed to load image');
        resolve(false);
      };

      img.src = url;
    });
  };

  const showDicomInfo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 512;
    canvas.height = 400;

    // Clear canvas with medical imaging background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Draw DICOM info
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    
    const lines = [
      '🏥 DICOM Medical Image',
      '',
      `File: ${study.original_filename || 'Unknown'}`,
      `Patient: ${study.patient_id || 'Unknown'}`,
      `Modality: ${study.modality || 'Unknown'}`,
      `Date: ${study.study_date || 'Unknown'}`,
      '',
      'Image processing in progress...',
      'Preview will be available shortly.'
    ];

    lines.forEach((line, index) => {
      if (line === '') return;
      const y = 60 + (index * 30);
      if (line.includes('🏥')) {
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#4fc3f7';
      } else {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(line, canvas.width / 2, y);
    });

    setImageLoaded(true);
    setLoading(false);
  };

  const drawImageToCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
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

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    
    // Draw image centered
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 10));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleRotateLeft = () => setRotation(prev => prev - 90);
  const handleRotateRight = () => setRotation(prev => prev + 90);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setPan({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${study.original_filename || 'dicom_image'}_processed.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  useEffect(() => {
    loadDicomImage();
  }, [study]);

  useEffect(() => {
    if (currentImage && imageLoaded) {
      drawImageToCanvas(currentImage);
    }
  }, [zoom, rotation, brightness, contrast, pan, currentImage, imageLoaded]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#121212' }}>
      {/* Professional Header */}
      <AppBar position="static" sx={{ bgcolor: '#1e1e1e' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#4fc3f7' }}>
            🏥 Medical DICOM Viewer
          </Typography>
          <Chip 
            label={study.modality || 'Unknown'} 
            color="primary" 
            size="small" 
            sx={{ mr: 1 }}
          />
          <Chip 
            label={study.original_filename || 'Unknown'} 
            variant="outlined" 
            size="small" 
            sx={{ mr: 2, color: '#fff' }}
          />
          <Button
            startIcon={<Info />}
            onClick={() => setShowMetadata(true)}
            color="inherit"
            size="small"
          >
            Metadata
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Main Image Area */}
        <Box 
          ref={containerRef}
          sx={{ 
            flexGrow: 1, 
            position: 'relative',
            bgcolor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading && (
            <Box sx={{ textAlign: 'center', color: '#fff' }}>
              <Typography variant="h6" gutterBottom>
                Loading Medical Image...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ textAlign: 'center', color: '#f44336', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Image Loading Error
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              display: imageLoaded ? 'block' : 'none',
              cursor: 'crosshair'
            }}
          />
        </Box>

        {/* Professional Control Panel */}
        <Paper 
          sx={{ 
            width: 280, 
            bgcolor: '#1e1e1e', 
            color: '#fff',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Patient Info */}
          <Card sx={{ m: 2, bgcolor: '#2a2a2a' }}>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Patient Information
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', mb: 1 }}>
                ID: {study.patient_id || 'Unknown'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', mb: 1 }}>
                Date: {study.study_date || 'Unknown'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                Size: {study.file_size ? `${Math.round(study.file_size / 1024)} KB` : 'Unknown'}
              </Typography>
            </CardContent>
          </Card>

          {/* Image Controls */}
          {imageLoaded && (
            <Box sx={{ p: 2, flexGrow: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Image Controls
              </Typography>

              {/* Zoom Controls */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Zoom: {Math.round(zoom * 100)}%
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <IconButton onClick={handleZoomOut} size="small" sx={{ color: '#fff' }}>
                    <ZoomOut />
                  </IconButton>
                  <IconButton onClick={handleZoomIn} size="small" sx={{ color: '#fff' }}>
                    <ZoomIn />
                  </IconButton>
                </Box>
                <Slider
                  value={zoom}
                  onChange={(_, value) => setZoom(value as number)}
                  min={0.1}
                  max={5}
                  step={0.1}
                  size="small"
                  sx={{ color: '#4fc3f7' }}
                />
              </Box>

              {/* Rotation Controls */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Rotation: {rotation}°
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={handleRotateLeft} size="small" sx={{ color: '#fff' }}>
                    <RotateLeft />
                  </IconButton>
                  <IconButton onClick={handleRotateRight} size="small" sx={{ color: '#fff' }}>
                    <RotateRight />
                  </IconButton>
                </Box>
              </Box>

              {/* Brightness Control */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Brightness: {brightness}%
                </Typography>
                <Slider
                  value={brightness}
                  onChange={(_, value) => setBrightness(value as number)}
                  min={50}
                  max={200}
                  size="small"
                  sx={{ color: '#4fc3f7' }}
                />
              </Box>

              {/* Contrast Control */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Contrast: {contrast}%
                </Typography>
                <Slider
                  value={contrast}
                  onChange={(_, value) => setContrast(value as number)}
                  min={50}
                  max={200}
                  size="small"
                  sx={{ color: '#4fc3f7' }}
                />
              </Box>

              <Divider sx={{ my: 2, bgcolor: '#333' }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  startIcon={<RestartAlt />}
                  onClick={handleReset}
                  variant="outlined"
                  size="small"
                  fullWidth
                >
                  Reset View
                </Button>
                <Button
                  startIcon={<Download />}
                  onClick={handleDownload}
                  variant="contained"
                  size="small"
                  fullWidth
                >
                  Download
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Metadata Dialog */}
      <Dialog 
        open={showMetadata} 
        onClose={() => setShowMetadata(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#1e1e1e', color: '#fff' } }}
      >
        <DialogTitle sx={{ color: '#4fc3f7' }}>
          📊 DICOM Metadata - {study.original_filename}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#4fc3f7', fontWeight: 'bold' }}>Property</TableCell>
                  <TableCell sx={{ color: '#4fc3f7', fontWeight: 'bold' }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: '#fff' }}>Patient ID</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{study.patient_id || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#fff' }}>Modality</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{study.modality || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#fff' }}>Study Date</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{study.study_date || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#fff' }}>File Size</TableCell>
                  <TableCell sx={{ color: '#fff' }}>
                    {study.file_size ? `${Math.round(study.file_size / 1024)} KB` : 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: '#fff' }}>Processing Status</TableCell>
                  <TableCell sx={{ color: '#fff' }}>
                    {(study as any).processing_status || 'Unknown'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMetadata(false)} sx={{ color: '#4fc3f7' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfessionalDicomViewer;