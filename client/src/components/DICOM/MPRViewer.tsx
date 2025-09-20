/**
 * MPR (Multi-Planar Reconstruction) Viewer Component
 * Displays axial, sagittal, and coronal views of DICOM studies
 */

import React, { useRef, useEffect, useState } from 'react';
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
  Alert
} from '@mui/material';
import { Study } from '../../types';
import { dicomService } from '../../services/dicomService';

interface MPRViewerProps {
  study: Study;
  imageIds: string[];
  settings: {
    windowWidth: number;
    windowCenter: number;
    crosshairEnabled: boolean;
    synchronizedScrolling: boolean;
  };
  onSettingsChange: (settings: any) => void;
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
  const axialRef = useRef<HTMLCanvasElement>(null);
  const sagittalRef = useRef<HTMLCanvasElement>(null);
  const coronalRef = useRef<HTMLCanvasElement>(null);
  
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
                <canvas
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
                <canvas
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
                <canvas
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