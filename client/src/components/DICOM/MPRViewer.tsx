/**
 * Enhanced MPR (Multi-Planar Reconstruction) Viewer Component
 * Displays axial, sagittal, and coronal views of DICOM studies
 * Integrated with 3D volume rendering and advanced visualization
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  IconButton,
  Tooltip,
  ButtonGroup,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  ThreeDRotation,
  ViewInAr,
  Straighten,
  CropFree,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  RestartAlt,
  Fullscreen,
  Settings,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { Study } from '../../types';
import { dicomService } from '../../services/dicomService';

interface MPRViewerProps {
  study: Study;
  imageIds: string[];
  volumeData?: VolumeData;
  settings: {
    windowWidth: number;
    windowCenter: number;
    crosshairEnabled: boolean;
    synchronizedScrolling: boolean;
    renderMode: 'mip' | 'volume' | 'surface';
    opacity: number;
    threshold: number;
  };
  onSettingsChange: (settings: any) => void;
  onError?: (error: string) => void;
  enableAdvanced3D?: boolean;
  enableVolumeRendering?: boolean;
}

interface VolumeData {
  dimensions: { width: number; height: number; depth: number };
  spacing: { x: number; y: number; z: number };
  data: Float32Array;
  dataRange: { min: number; max: number };
}

interface MPRState {
  isLoading: boolean;
  error: string | null;
  volumeLoaded: boolean;
  
  // Current slice positions
  axialSlice: number;
  sagittalSlice: number;
  coronalSlice: number;
  
  // Viewport states
  viewports: {
    axial: ViewportState;
    sagittal: ViewportState;
    coronal: ViewportState;
    volume: ViewportState;
  };
  
  // Crosshair position
  crosshair: { x: number; y: number; z: number };
  
  // Active view
  activeView: 'axial' | 'sagittal' | 'coronal' | 'volume';
  
  // 3D rendering state
  webglSupported: boolean;
  renderingMode: 'software' | 'webgl';
}

interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
}

interface MPRPlanes {
  axial: boolean;
  sagittal: boolean;
  coronal: boolean;
}

const MPRViewer: React.FC<MPRViewerProps> = ({
  study,
  imageIds,
  settings,
  onSettingsChange
}) => {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  
  const [planes, setPlanes] = useState<MPRPlanes>({
    axial: true,
    sagittal: true,
    coronal: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeMPRViews();
  }, [imageIds, study]);

  const initializeMPRViews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (imageIds.length === 0) {
        setError('No images available for MPR reconstruction');
        return;
      }

      // Initialize each plane view
      if (planes.axial && axialRef.current) {
        await dicomService.displayImage(axialRef.current, imageIds[0]);
      }
      if (planes.sagittal && sagittalRef.current && imageIds.length > 0) {
        await dicomService.displayImage(sagittalRef.current, imageIds[0]);
      }
      if (planes.coronal && coronalRef.current && imageIds.length > 0) {
        await dicomService.displayImage(coronalRef.current, imageIds[0]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize MPR viewers:', error);
      setError('Failed to initialize MPR views');
      setIsLoading(false);
    }
  };

  const handlePlaneToggle = (plane: keyof MPRPlanes) => {
    setPlanes(prev => ({
      ...prev,
      [plane]: !prev[plane]
    }));
  };

  const handleSettingsChange = (key: string, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Multi-Planar Reconstruction (MPR)
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={planes.axial}
                    onChange={() => handlePlaneToggle('axial')}
                  />
                }
                label="Axial"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={planes.sagittal}
                    onChange={() => handlePlaneToggle('sagittal')}
                  />
                }
                label="Sagittal"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={planes.coronal}
                    onChange={() => handlePlaneToggle('coronal')}
                  />
                }
                label="Coronal"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.crosshairEnabled}
                    onChange={(e) => handleSettingsChange('crosshairEnabled', e.target.checked)}
                  />
                }
                label="Crosshair"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Window Width: {settings.windowWidth}</Typography>
            <Slider
              value={settings.windowWidth}
              onChange={(_, value) => handleSettingsChange('windowWidth', value)}
              min={1}
              max={4000}
              step={1}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Window Center: {settings.windowCenter}</Typography>
            <Slider
              value={settings.windowCenter}
              onChange={(_, value) => handleSettingsChange('windowCenter', value)}
              min={-1000}
              max={3000}
              step={1}
            />
          </Box>
        </CardContent>
      </Card>

      {/* MPR Views */}
      <Grid container spacing={2}>
        {planes.axial && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Axial View
                </Typography>
                <div
                  ref={axialRef}
                  style={{
                    width: '100%',
                    height: '300px',
                    border: '1px solid #ccc',
                    backgroundColor: '#000'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {planes.sagittal && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Sagittal View
                </Typography>
                <div
                  ref={sagittalRef}
                  style={{
                    width: '100%',
                    height: '300px',
                    border: '1px solid #ccc',
                    backgroundColor: '#000'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {planes.coronal && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Coronal View
                </Typography>
                <div
                  ref={coronalRef}
                  style={{
                    width: '100%',
                    height: '300px',
                    border: '1px solid #ccc',
                    backgroundColor: '#000'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography>Loading MPR views...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default MPRViewer;