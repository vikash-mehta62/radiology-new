/**
 * Multiplanar Reconstruction (MPR) Viewer Component
 * Provides real-time cross-sectional views with synchronized navigation
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Grid, Paper, Typography, Slider, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { Sync, SyncDisabled, CenterFocusStrong, Refresh, Settings } from '@mui/icons-material';
import { VolumeData } from '../services/volumeRenderingEngine';

export interface MPRPlane {
  name: string;
  normal: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  position: number; // 0-1 normalized position along normal
  color: string;
}

export interface MPRViewerProps {
  volumeData: VolumeData | null;
  width?: number;
  height?: number;
  onPlaneChange?: (plane: MPRPlane, position: number) => void;
  onCrosshairMove?: (x: number, y: number, z: number) => void;
  enableSynchronization?: boolean;
  showCrosshairs?: boolean;
  interpolationMode?: 'nearest' | 'linear' | 'cubic';
}

interface CrosshairPosition {
  x: number;
  y: number;
  z: number;
}

interface MPRViewport {
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  plane: MPRPlane;
  imageData: ImageData | null;
  zoom: number;
  pan: { x: number; y: number };
}

const MPRViewer: React.FC<MPRViewerProps> = ({
  volumeData,
  width = 800,
  height = 600,
  onPlaneChange,
  onCrosshairMove,
  enableSynchronization = true,
  showCrosshairs = true,
  interpolationMode = 'linear'
}) => {
  // Canvas refs for each viewport
  const axialCanvasRef = useRef<HTMLCanvasElement>(null);
  const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
  const coronalCanvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [crosshairPosition, setCrosshairPosition] = useState<CrosshairPosition>({ x: 0.5, y: 0.5, z: 0.5 });
  const [synchronizedNavigation, setSynchronizedNavigation] = useState(enableSynchronization);
  const [currentInterpolation, setCurrentInterpolation] = useState(interpolationMode);
  
  // MPR planes configuration
  const [planes, setPlanes] = useState<MPRPlane[]>([
    {
      name: 'Axial',
      normal: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      position: 0.5,
      color: '#ff0000'
    },
    {
      name: 'Sagittal',
      normal: { x: 1, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      position: 0.5,
      color: '#00ff00'
    },
    {
      name: 'Coronal',
      normal: { x: 0, y: 1, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      position: 0.5,
      color: '#0000ff'
    }
  ]);

  // Viewports state
  const [viewports, setViewports] = useState<MPRViewport[]>([]);

  /**
   * Initialize viewports
   */
  useEffect(() => {
    const canvases = [axialCanvasRef.current, sagittalCanvasRef.current, coronalCanvasRef.current];
    
    const newViewports: MPRViewport[] = planes.map((plane, index) => ({
      canvas: canvases[index],
      context: canvases[index]?.getContext('2d') || null,
      plane,
      imageData: null,
      zoom: 1.0,
      pan: { x: 0, y: 0 }
    }));

    setViewports(newViewports);
  }, [planes]);

  /**
   * Sample volume data at specific coordinates with interpolation
   */
  const sampleVolume = useCallback((x: number, y: number, z: number): number => {
    if (!volumeData) return 0;

    const { width, height, depth } = volumeData.dimensions;
    
    // Clamp coordinates
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    z = Math.max(0, Math.min(1, z));

    // Convert to voxel coordinates
    const vx = x * (width - 1);
    const vy = y * (height - 1);
    const vz = z * (depth - 1);

    if (currentInterpolation === 'nearest') {
      // Nearest neighbor sampling
      const ix = Math.round(vx);
      const iy = Math.round(vy);
      const iz = Math.round(vz);
      
      const index = iz * width * height + iy * width + ix;
      
      if (volumeData.dataType === 'uint8') {
        return (volumeData.data as Uint8Array)[index] || 0;
      } else if (volumeData.dataType === 'uint16') {
        return (volumeData.data as Uint16Array)[index] || 0;
      } else {
        return (volumeData.data as Float32Array)[index] || 0;
      }
    } else {
      // Trilinear interpolation
      const x0 = Math.floor(vx);
      const y0 = Math.floor(vy);
      const z0 = Math.floor(vz);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);
      const z1 = Math.min(z0 + 1, depth - 1);

      const fx = vx - x0;
      const fy = vy - y0;
      const fz = vz - z0;

      // Sample 8 neighboring voxels
      const getValue = (ix: number, iy: number, iz: number): number => {
        const index = iz * width * height + iy * width + ix;
        if (volumeData.dataType === 'uint8') {
          return (volumeData.data as Uint8Array)[index] || 0;
        } else if (volumeData.dataType === 'uint16') {
          return (volumeData.data as Uint16Array)[index] || 0;
        } else {
          return (volumeData.data as Float32Array)[index] || 0;
        }
      };

      const c000 = getValue(x0, y0, z0);
      const c001 = getValue(x0, y0, z1);
      const c010 = getValue(x0, y1, z0);
      const c011 = getValue(x0, y1, z1);
      const c100 = getValue(x1, y0, z0);
      const c101 = getValue(x1, y0, z1);
      const c110 = getValue(x1, y1, z0);
      const c111 = getValue(x1, y1, z1);

      // Trilinear interpolation
      const c00 = c000 * (1 - fx) + c100 * fx;
      const c01 = c001 * (1 - fx) + c101 * fx;
      const c10 = c010 * (1 - fx) + c110 * fx;
      const c11 = c011 * (1 - fx) + c111 * fx;

      const c0 = c00 * (1 - fy) + c10 * fy;
      const c1 = c01 * (1 - fy) + c11 * fy;

      return c0 * (1 - fz) + c1 * fz;
    }
  }, [volumeData, currentInterpolation]);

  /**
   * Generate MPR slice for a specific plane
   */
  const generateMPRSlice = useCallback((plane: MPRPlane, slicePosition: number, width: number, height: number): ImageData => {
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    if (!volumeData) {
      return imageData;
    }

    // Calculate plane basis vectors
    const normal = plane.normal;
    const up = plane.up;
    
    // Calculate right vector (cross product of up and normal)
    const right = {
      x: up.y * normal.z - up.z * normal.y,
      y: up.z * normal.x - up.x * normal.z,
      z: up.x * normal.y - up.y * normal.x
    };

    // Normalize vectors
    const rightLength = Math.sqrt(right.x * right.x + right.y * right.y + right.z * right.z);
    right.x /= rightLength;
    right.y /= rightLength;
    right.z /= rightLength;

    // Calculate plane center position
    const center = {
      x: 0.5 + normal.x * (slicePosition - 0.5),
      y: 0.5 + normal.y * (slicePosition - 0.5),
      z: 0.5 + normal.z * (slicePosition - 0.5)
    };

    // Generate slice
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Convert pixel coordinates to normalized coordinates [-0.5, 0.5]
        const u = (x / width) - 0.5;
        const v = (y / height) - 0.5;

        // Calculate 3D position in volume
        const pos = {
          x: center.x + u * right.x + v * up.x,
          y: center.y + u * right.y + v * up.y,
          z: center.z + u * right.z + v * up.z
        };

        // Sample volume
        const value = sampleVolume(pos.x, pos.y, pos.z);
        
        // Normalize value to [0, 255]
        const normalizedValue = Math.floor(
          ((value - volumeData.minValue) / (volumeData.maxValue - volumeData.minValue)) * 255
        );
        
        const pixelIndex = (y * width + x) * 4;
        data[pixelIndex] = normalizedValue;     // R
        data[pixelIndex + 1] = normalizedValue; // G
        data[pixelIndex + 2] = normalizedValue; // B
        data[pixelIndex + 3] = 255;             // A
      }
    }

    return imageData;
  }, [volumeData, sampleVolume]);

  /**
   * Draw crosshairs on canvas
   */
  const drawCrosshairs = useCallback((context: CanvasRenderingContext2D, plane: MPRPlane, canvasWidth: number, canvasHeight: number) => {
    if (!showCrosshairs) return;

    context.save();
    context.strokeStyle = plane.color;
    context.lineWidth = 1;
    context.setLineDash([5, 5]);

    // Calculate crosshair position based on plane orientation
    let crossX = crosshairPosition.x * canvasWidth;
    let crossY = crosshairPosition.y * canvasHeight;

    if (plane.name === 'Axial') {
      crossX = crosshairPosition.x * canvasWidth;
      crossY = (1 - crosshairPosition.y) * canvasHeight;
    } else if (plane.name === 'Sagittal') {
      crossX = crosshairPosition.z * canvasWidth;
      crossY = (1 - crosshairPosition.y) * canvasHeight;
    } else if (plane.name === 'Coronal') {
      crossX = crosshairPosition.x * canvasWidth;
      crossY = (1 - crosshairPosition.z) * canvasHeight;
    }

    // Draw horizontal line
    context.beginPath();
    context.moveTo(0, crossY);
    context.lineTo(canvasWidth, crossY);
    context.stroke();

    // Draw vertical line
    context.beginPath();
    context.moveTo(crossX, 0);
    context.lineTo(crossX, canvasHeight);
    context.stroke();

    context.restore();
  }, [crosshairPosition, showCrosshairs]);

  /**
   * Render viewport
   */
  const renderViewport = useCallback((viewport: MPRViewport) => {
    if (!viewport.canvas || !viewport.context || !volumeData) return;

    const canvas = viewport.canvas;
    const context = viewport.context;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    // Generate MPR slice
    const imageData = generateMPRSlice(viewport.plane, viewport.plane.position, canvasWidth, canvasHeight);
    
    // Apply zoom and pan
    context.save();
    context.translate(canvasWidth / 2 + viewport.pan.x, canvasHeight / 2 + viewport.pan.y);
    context.scale(viewport.zoom, viewport.zoom);
    context.translate(-canvasWidth / 2, -canvasHeight / 2);
    
    // Draw image
    context.putImageData(imageData, 0, 0);
    
    context.restore();

    // Draw crosshairs
    drawCrosshairs(context, viewport.plane, canvasWidth, canvasHeight);

    // Draw plane label
    context.save();
    context.fillStyle = viewport.plane.color;
    context.font = '14px Arial';
    context.fillText(viewport.plane.name, 10, 25);
    context.restore();
  }, [volumeData, generateMPRSlice, drawCrosshairs]);

  /**
   * Render all viewports
   */
  const renderAllViewports = useCallback(() => {
    viewports.forEach(renderViewport);
  }, [viewports, renderViewport]);

  /**
   * Handle mouse events for navigation
   */
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>, viewportIndex: number) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    if (synchronizedNavigation) {
      const plane = planes[viewportIndex];
      let newCrosshair = { ...crosshairPosition };

      if (plane.name === 'Axial') {
        newCrosshair.x = x;
        newCrosshair.y = 1 - y;
      } else if (plane.name === 'Sagittal') {
        newCrosshair.z = x;
        newCrosshair.y = 1 - y;
      } else if (plane.name === 'Coronal') {
        newCrosshair.x = x;
        newCrosshair.z = 1 - y;
      }

      setCrosshairPosition(newCrosshair);
      onCrosshairMove?.(newCrosshair.x, newCrosshair.y, newCrosshair.z);
    }
  }, [synchronizedNavigation, planes, crosshairPosition, onCrosshairMove]);

  /**
   * Handle plane position changes
   */
  const handlePlanePositionChange = useCallback((planeIndex: number, position: number) => {
    const newPlanes = [...planes];
    newPlanes[planeIndex].position = position;
    setPlanes(newPlanes);
    onPlaneChange?.(newPlanes[planeIndex], position);
  }, [planes, onPlaneChange]);

  /**
   * Reset all views to center
   */
  const resetViews = useCallback(() => {
    setCrosshairPosition({ x: 0.5, y: 0.5, z: 0.5 });
    const newPlanes = planes.map(plane => ({ ...plane, position: 0.5 }));
    setPlanes(newPlanes);
    
    // Reset zoom and pan for all viewports
    setViewports(prev => prev.map(viewport => ({
      ...viewport,
      zoom: 1.0,
      pan: { x: 0, y: 0 }
    })));
  }, [planes]);

  // Update viewports when planes change
  useEffect(() => {
    setViewports(prev => prev.map((viewport, index) => ({
      ...viewport,
      plane: planes[index]
    })));
  }, [planes]);

  // Render when volume data or crosshair position changes
  useEffect(() => {
    renderAllViewports();
  }, [renderAllViewports, crosshairPosition]);

  // Setup canvas sizes
  useEffect(() => {
    const canvases = [axialCanvasRef.current, sagittalCanvasRef.current, coronalCanvasRef.current];
    const viewportWidth = Math.floor(width / 2);
    const viewportHeight = Math.floor(height / 2);

    canvases.forEach(canvas => {
      if (canvas) {
        canvas.width = viewportWidth;
        canvas.height = viewportHeight;
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;
      }
    });
  }, [width, height]);  return (

    <Box sx={{ width, height, display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Tooltip title={synchronizedNavigation ? 'Disable Synchronization' : 'Enable Synchronization'}>
          <IconButton
            onClick={() => setSynchronizedNavigation(!synchronizedNavigation)}
            color={synchronizedNavigation ? 'primary' : 'default'}
          >
            {synchronizedNavigation ? <Sync /> : <SyncDisabled />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset Views">
          <IconButton onClick={resetViews}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Interpolation</InputLabel>
          <Select
            value={currentInterpolation}
            label="Interpolation"
            onChange={(e) => setCurrentInterpolation(e.target.value as 'nearest' | 'linear' | 'cubic')}
          >
            <MenuItem value="nearest">Nearest</MenuItem>
            <MenuItem value="linear">Linear</MenuItem>
            <MenuItem value="cubic">Cubic</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary">
          Position: ({Math.round(crosshairPosition.x * 100)}%, {Math.round(crosshairPosition.y * 100)}%, {Math.round(crosshairPosition.z * 100)}%)
        </Typography>
      </Box>

      {/* Main viewport grid */}
      <Box sx={{ flex: 1, display: 'flex' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Axial view */}
          <Grid item xs={6} sx={{ position: 'relative' }}>
            <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <canvas
                ref={axialCanvasRef}
                onMouseDown={(e) => handleMouseDown(e, 0)}
                style={{
                  cursor: synchronizedNavigation ? 'crosshair' : 'default',
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
              />
              
              {/* Axial plane position slider */}
              <Box sx={{ 
                position: 'absolute', 
                bottom: 10, 
                left: 10, 
                right: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 1,
                p: 1
              }}>
                <Typography variant="caption" color="white" gutterBottom>
                  Axial Position: {Math.round(planes[0]?.position * 100)}%
                </Typography>
                <Slider
                  value={planes[0]?.position || 0.5}
                  onChange={(_, value) => handlePlanePositionChange(0, value as number)}
                  min={0}
                  max={1}
                  step={0.01}
                  size="small"
                  sx={{ color: planes[0]?.color }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Sagittal view */}
          <Grid item xs={6} sx={{ position: 'relative' }}>
            <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <canvas
                ref={sagittalCanvasRef}
                onMouseDown={(e) => handleMouseDown(e, 1)}
                style={{
                  cursor: synchronizedNavigation ? 'crosshair' : 'default',
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
              />
              
              {/* Sagittal plane position slider */}
              <Box sx={{ 
                position: 'absolute', 
                bottom: 10, 
                left: 10, 
                right: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 1,
                p: 1
              }}>
                <Typography variant="caption" color="white" gutterBottom>
                  Sagittal Position: {Math.round(planes[1]?.position * 100)}%
                </Typography>
                <Slider
                  value={planes[1]?.position || 0.5}
                  onChange={(_, value) => handlePlanePositionChange(1, value as number)}
                  min={0}
                  max={1}
                  step={0.01}
                  size="small"
                  sx={{ color: planes[1]?.color }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Coronal view */}
          <Grid item xs={6} sx={{ position: 'relative' }}>
            <Paper sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <canvas
                ref={coronalCanvasRef}
                onMouseDown={(e) => handleMouseDown(e, 2)}
                style={{
                  cursor: synchronizedNavigation ? 'crosshair' : 'default',
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
              />
              
              {/* Coronal plane position slider */}
              <Box sx={{ 
                position: 'absolute', 
                bottom: 10, 
                left: 10, 
                right: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 1,
                p: 1
              }}>
                <Typography variant="caption" color="white" gutterBottom>
                  Coronal Position: {Math.round(planes[2]?.position * 100)}%
                </Typography>
                <Slider
                  value={planes[2]?.position || 0.5}
                  onChange={(_, value) => handlePlanePositionChange(2, value as number)}
                  min={0}
                  max={1}
                  step={0.01}
                  size="small"
                  sx={{ color: planes[2]?.color }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Info panel */}
          <Grid item xs={6} sx={{ position: 'relative' }}>
            <Paper sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">MPR Information</Typography>
              
              {volumeData && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Volume Dimensions:</strong> {volumeData.dimensions.width} × {volumeData.dimensions.height} × {volumeData.dimensions.depth}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Spacing:</strong> {volumeData.spacing.x.toFixed(2)} × {volumeData.spacing.y.toFixed(2)} × {volumeData.spacing.z.toFixed(2)} mm
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Data Range:</strong> {volumeData.minValue} - {volumeData.maxValue}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Data Type:</strong> {volumeData.dataType}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="body2" gutterBottom>
                  <strong>Current Position:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  X: {(crosshairPosition.x * (volumeData?.dimensions.width || 1)).toFixed(1)} / {volumeData?.dimensions.width || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Y: {(crosshairPosition.y * (volumeData?.dimensions.height || 1)).toFixed(1)} / {volumeData?.dimensions.height || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Z: {(crosshairPosition.z * (volumeData?.dimensions.depth || 1)).toFixed(1)} / {volumeData?.dimensions.depth || 0}
                </Typography>
              </Box>

              {volumeData && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Voxel Value:</strong> {sampleVolume(crosshairPosition.x, crosshairPosition.y, crosshairPosition.z).toFixed(2)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                  Click on any view to navigate. Use sliders to adjust plane positions.
                  {synchronizedNavigation && ' Navigation is synchronized across all views.'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MPRViewer;