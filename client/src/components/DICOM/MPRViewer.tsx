import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Slider
} from '@mui/material';
import { Study } from '../../types';
import { dicomService } from '../../services/dicomService';

interface MPRViewerProps {
  study: Study;
  imageIds: string[];
  planes: {
    axial: boolean;
    sagittal: boolean;
    coronal: boolean;
  };
  onPlanesChange: (planes: any) => void;
}

const MPRViewer: React.FC<MPRViewerProps> = ({
  study,
  imageIds,
  planes,
  onPlanesChange
}) => {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const [crosshairPosition, setCrosshairPosition] = useState({ x: 0.5, y: 0.5, z: 0.5 });
  const [sliceIndices, setSliceIndices] = useState({ axial: 0, sagittal: 0, coronal: 0 });

  useEffect(() => {
    initializeMPRViewers();
  }, [imageIds]);

  const initializeMPRViewers = async () => {
    try {
      // Initialize each plane viewer
      if (planes.axial && axialRef.current && imageIds.length > 0) {
        await dicomService.displayImage(axialRef.current, imageIds[0]);
      }
      if (planes.sagittal && sagittalRef.current && imageIds.length > 0) {
        await dicomService.displayImage(sagittalRef.current, imageIds[0]);
      }
      if (planes.coronal && coronalRef.current && imageIds.length > 0) {
        await dicomService.displayImage(coronalRef.current, imageIds[0]);
      }
    } catch (error) {
      console.error('Failed to initialize MPR viewers:', error);
    }
  };

  const handleSliceChange = (plane: 'axial' | 'sagittal' | 'coronal', value: number) => {
    setSliceIndices(prev => ({ ...prev, [plane]: value }));
    
    // Update the corresponding viewer with new slice
    const imageIndex = Math.floor(value * (imageIds.length - 1));
    if (imageIndex < imageIds.length) {
      const ref = plane === 'axial' ? axialRef : plane === 'sagittal' ? sagittalRef : coronalRef;
      if (ref.current) {
        dicomService.displayImage(ref.current, imageIds[imageIndex]);
      }
    }
  };

  const renderPlaneViewer = (plane: 'axial' | 'sagittal' | 'coronal', ref: React.RefObject<HTMLDivElement>) => {
    if (!planes[plane]) return null;

    return (
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {plane.charAt(0).toUpperCase() + plane.slice(1)} View
            </Typography>
            <Box
              ref={ref}
              sx={{
                width: '100%',
                height: '300px',
                backgroundColor: '#000',
                position: 'relative',
                border: '1px solid #333'
              }}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" gutterBottom>
                Slice: {Math.round(sliceIndices[plane] * (imageIds.length - 1)) + 1} / {imageIds.length}
              </Typography>
              <Slider
                value={sliceIndices[plane]}
                onChange={(_, value) => handleSliceChange(plane, value as number)}
                min={0}
                max={1}
                step={1 / Math.max(1, imageIds.length - 1)}
                size="small"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Multi-Planar Reconstruction (MPR)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={planes.axial}
                onChange={(e) => onPlanesChange({ ...planes, axial: e.target.checked })}
              />
            }
            label="Axial"
          />
          <FormControlLabel
            control={
              <Switch
                checked={planes.sagittal}
                onChange={(e) => onPlanesChange({ ...planes, sagittal: e.target.checked })}
              />
            }
            label="Sagittal"
          />
          <FormControlLabel
            control={
              <Switch
                checked={planes.coronal}
                onChange={(e) => onPlanesChange({ ...planes, coronal: e.target.checked })}
              />
            }
            label="Coronal"
          />
        </Box>
      </Box>

      <Grid container spacing={2}>
        {renderPlaneViewer('axial', axialRef)}
        {renderPlaneViewer('sagittal', sagittalRef)}
        {renderPlaneViewer('coronal', coronalRef)}
      </Grid>

      {/* Crosshair Controls */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Crosshair Position
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="caption">X Position</Typography>
              <Slider
                value={crosshairPosition.x}
                onChange={(_, value) => setCrosshairPosition(prev => ({ ...prev, x: value as number }))}
                min={0}
                max={1}
                step={0.01}
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption">Y Position</Typography>
              <Slider
                value={crosshairPosition.y}
                onChange={(_, value) => setCrosshairPosition(prev => ({ ...prev, y: value as number }))}
                min={0}
                max={1}
                step={0.01}
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption">Z Position</Typography>
              <Slider
                value={crosshairPosition.z}
                onChange={(_, value) => setCrosshairPosition(prev => ({ ...prev, z: value as number }))}
                min={0}
                max={1}
                step={0.01}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MPRViewer;