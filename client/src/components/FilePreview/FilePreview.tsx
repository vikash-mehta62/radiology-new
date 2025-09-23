import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Toolbar,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Fullscreen as FullscreenIcon,
  Print as PrintIcon,
} from '@mui/icons-material';

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  file: {
    filename: string;
    type: string;
    size: number;
    downloadUrl: string;
    mimeType?: string;
  } | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ open, onClose, file }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open && file) {
      setLoading(true);
      setError(null);
      setZoom(100);
      setRotation(0);
      
      // Simulate loading time for preview
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [open, file]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation(prev => prev + 90);
  };

  const handleDownload = () => {
    if (file?.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    }
  };

  const renderPreview = () => {
    if (!file) return null;

    const { type, filename, downloadUrl, mimeType } = file;

    // Image preview
    if (type === 'image' || (mimeType && mimeType.startsWith('image/'))) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            maxHeight: '70vh',
            overflow: 'auto',
          }}
        >
          <img
            src={downloadUrl}
            alt={filename}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out',
            }}
            onError={() => setError('Failed to load image')}
          />
        </Box>
      );
    }

    // PDF preview
    if (type === 'document' && filename.toLowerCase().endsWith('.pdf')) {
      return (
        <Box sx={{ height: '70vh', width: '100%' }}>
          <iframe
            src={`${downloadUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={filename}
          />
        </Box>
      );
    }

    // DICOM preview (basic implementation)
    if (type === 'medical' || filename.toLowerCase().endsWith('.dcm')) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            p: 3,
          }}
        >
          <Typography variant="h6" gutterBottom>
            DICOM File Preview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {filename}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            DICOM files require specialized viewer. Click download to view in external application.
          </Alert>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download DICOM File
          </Button>
        </Box>
      );
    }

    // Video preview
    if (type === 'video' || (mimeType && mimeType.startsWith('video/'))) {
      return (
        <Box sx={{ width: '100%', maxHeight: '70vh' }}>
          <video
            controls
            style={{ width: '100%', height: 'auto' }}
            preload="metadata"
          >
            <source src={downloadUrl} type={mimeType} />
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    }

    // Audio preview
    if (type === 'audio' || (mimeType && mimeType.startsWith('audio/'))) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            p: 3,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {filename}
          </Typography>
          <audio controls style={{ width: '100%', maxWidth: 400 }}>
            <source src={downloadUrl} type={mimeType} />
            Your browser does not support the audio element.
          </audio>
        </Box>
      );
    }

    // Text files preview
    if (mimeType && mimeType.startsWith('text/')) {
      return (
        <Box sx={{ height: '70vh', overflow: 'auto' }}>
          <iframe
            src={downloadUrl}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={filename}
          />
        </Box>
      );
    }

    // Default preview for unsupported files
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          p: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Preview not available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {filename}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          File type: {type} • Size: {formatFileSize(file.size)}
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download File
        </Button>
      </Box>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showImageControls = file && (
    file.type === 'image' || 
    (file.mimeType && file.mimeType.startsWith('image/'))
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {file?.filename || 'File Preview'}
          </Typography>
          
          {/* Image controls */}
          {showImageControls && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Tooltip title="Zoom Out">
                <IconButton onClick={handleZoomOut} disabled={zoom <= 25}>
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: 50, textAlign: 'center' }}>
                {zoom}%
              </Typography>
              <Tooltip title="Zoom In">
                <IconButton onClick={handleZoomIn} disabled={zoom >= 300}>
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Left">
                <IconButton onClick={handleRotateLeft}>
                  <RotateLeftIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Right">
                <IconButton onClick={handleRotateRight}>
                  <RotateRightIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Tooltip title="Download">
            <IconButton onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : (
          renderPreview()
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;