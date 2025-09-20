/**
 * Interactive 3D Controls Component
 * Provides comprehensive 3D manipulation controls for volume rendering
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  RotateLeft,
  RotateRight,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  ThreeDRotation,
  Crop,
  Save,
  GetApp,
  Settings,
  Visibility,
  VisibilityOff,
  ContentCut
} from '@mui/icons-material';
import { Camera, RenderingParameters } from '../services/volumeRenderingEngine';

export interface ClippingPlane {
  id: string;
  normal: { x: number; y: number; z: number };
  distance: number;
  enabled: boolean;
  color: string;
}

export interface MeasurementTool {
  type: 'distance' | 'volume' | 'angle';
  points: { x: number; y: number; z: number }[];
  value: number;
  unit: string;
  id: string;
}

export interface Interactive3DControlsProps {
  camera: Camera;
  renderingParams: RenderingParameters;
  onCameraChange: (camera: Partial<Camera>) => void;
  onRenderingParamsChange: (params: Partial<RenderingParameters>) => void;
  onClippingPlaneChange: (planes: ClippingPlane[]) => void;
  onMeasurementAdd: (measurement: MeasurementTool) => void;
  onExport: (format: 'png' | 'jpg' | 'pdf' | 'obj') => void;
  volumeDimensions?: { width: number; height: number; depth: number };
  volumeSpacing?: { x: number; y: number; z: number };
}

const Interactive3DControls: React.FC<Interactive3DControlsProps> = ({
  camera,
  renderingParams,
  onCameraChange,
  onRenderingParamsChange,
  onClippingPlaneChange,
  onMeasurementAdd,
  onExport,
  volumeDimensions,
  volumeSpacing
}) => {
  // State for camera controls
  const [cameraDistance, setCameraDistance] = useState(2);
  const [cameraAzimuth, setCameraAzimuth] = useState(0);
  const [cameraElevation, setCameraElevation] = useState(0);
  
  // State for clipping planes
  const [clippingPlanes, setClippingPlanes] = useState<ClippingPlane[]>([
    {
      id: 'x-plane',
      normal: { x: 1, y: 0, z: 0 },
      distance: 0.5,
      enabled: false,
      color: '#ff0000'
    },
    {
      id: 'y-plane',
      normal: { x: 0, y: 1, z: 0 },
      distance: 0.5,
      enabled: false,
      color: '#00ff00'
    },
    {
      id: 'z-plane',
      normal: { x: 0, y: 0, z: 1 },
      distance: 0.5,
      enabled: false,
      color: '#0000ff'
    }
  ]);

  // State for measurements
  const [measurements, setMeasurements] = useState<MeasurementTool[]>([]);
  const [activeMeasurementTool, setActiveMeasurementTool] = useState<'distance' | 'volume' | 'angle' | null>(null);

  // State for dialogs
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  /**
   * Update camera position based on spherical coordinates
   */
  const updateCameraPosition = useCallback(() => {
    const azimuthRad = (cameraAzimuth * Math.PI) / 180;
    const elevationRad = (cameraElevation * Math.PI) / 180;

    const x = cameraDistance * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const y = cameraDistance * Math.sin(elevationRad);
    const z = cameraDistance * Math.cos(elevationRad) * Math.sin(azimuthRad);

    onCameraChange({
      position: { x, y, z }
    });
  }, [cameraDistance, cameraAzimuth, cameraElevation, onCameraChange]);

  // Update camera when spherical coordinates change
  useEffect(() => {
    updateCameraPosition();
  }, [updateCameraPosition]);

  /**
   * Handle camera rotation
   */
  const handleRotation = useCallback((deltaAzimuth: number, deltaElevation: number) => {
    setCameraAzimuth(prev => (prev + deltaAzimuth) % 360);
    setCameraElevation(prev => Math.max(-90, Math.min(90, prev + deltaElevation)));
  }, []);

  /**
   * Handle camera zoom
   */
  const handleZoom = useCallback((factor: number) => {
    setCameraDistance(prev => Math.max(0.5, Math.min(10, prev * factor)));
  }, []);

  /**
   * Reset camera to default position
   */
  const resetCamera = useCallback(() => {
    setCameraDistance(2);
    setCameraAzimuth(0);
    setCameraElevation(0);
    onCameraChange({
      position: { x: 0, y: 0, z: 2 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 }
    });
  }, [onCameraChange]);

  /**
   * Start/stop automatic rotation animation
   */
  const toggleAnimation = useCallback(() => {
    if (isAnimating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setIsAnimating(false);
    } else {
      setIsAnimating(true);
      
      const animate = () => {
        setCameraAzimuth(prev => (prev + 1) % 360);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animate();
    }
  }, [isAnimating]);

  /**
   * Handle clipping plane changes
   */
  const handleClippingPlaneChange = useCallback((planeId: string, property: string, value: any) => {
    const newPlanes = clippingPlanes.map(plane => {
      if (plane.id === planeId) {
        return { ...plane, [property]: value };
      }
      return plane;
    });
    
    setClippingPlanes(newPlanes);
    onClippingPlaneChange(newPlanes);
  }, [clippingPlanes, onClippingPlaneChange]);

  /**
   * Add measurement
   */
  const addMeasurement = useCallback((type: 'distance' | 'volume' | 'angle') => {
    const newMeasurement: MeasurementTool = {
      type,
      points: [],
      value: 0,
      unit: type === 'distance' ? 'mm' : type === 'volume' ? 'mm³' : '°',
      id: `measurement-${Date.now()}`
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
    onMeasurementAdd(newMeasurement);
    setActiveMeasurementTool(type);
  }, [onMeasurementAdd]);

  /**
   * Remove measurement
   */
  const removeMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  /**
   * Calculate volume from measurements
   */
  const calculateVolume = useCallback((points: { x: number; y: number; z: number }[]): number => {
    if (!volumeSpacing || points.length < 4) return 0;
    
    // Simplified volume calculation for demonstration
    // In practice, you'd use more sophisticated algorithms
    const bounds = {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y)),
      minZ: Math.min(...points.map(p => p.z)),
      maxZ: Math.max(...points.map(p => p.z))
    };
    
    const volume = (bounds.maxX - bounds.minX) * volumeSpacing.x *
                   (bounds.maxY - bounds.minY) * volumeSpacing.y *
                   (bounds.maxZ - bounds.minZ) * volumeSpacing.z;
    
    return volume;
  }, [volumeSpacing]);

  /**
   * Calculate distance between two points
   */
  const calculateDistance = useCallback((p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }): number => {
    if (!volumeSpacing) return 0;
    
    const dx = (p2.x - p1.x) * volumeSpacing.x;
    const dy = (p2.y - p1.y) * volumeSpacing.y;
    const dz = (p2.z - p1.z) * volumeSpacing.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [volumeSpacing]);

  /**
   * Calculate angle between three points
   */
  const calculateAngle = useCallback((p1: { x: number; y: number; z: number }, 
                                   p2: { x: number; y: number; z: number }, 
                                   p3: { x: number; y: number; z: number }): number => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
    
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">3D Controls</Typography>
      </Box>

      {/* Main controls */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Camera Controls */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Camera Controls
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Tooltip title="Rotate Left">
                  <IconButton onClick={() => handleRotation(-15, 0)}>
                    <RotateLeft />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rotate Right">
                  <IconButton onClick={() => handleRotation(15, 0)}>
                    <RotateRight />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom In">
                  <IconButton onClick={() => handleZoom(0.8)}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton onClick={() => handleZoom(1.2)}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset Camera">
                  <IconButton onClick={resetCamera}>
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isAnimating ? "Stop Animation" : "Start Animation"}>
                  <IconButton onClick={toggleAnimation} color={isAnimating ? "primary" : "default"}>
                    <ThreeDRotation />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Distance: {cameraDistance.toFixed(1)}</Typography>
              <Slider
                value={cameraDistance}
                onChange={(_, value) => setCameraDistance(value as number)}
                min={0.5}
                max={10}
                step={0.1}
                size="small"
              />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" gutterBottom>Azimuth: {cameraAzimuth}°</Typography>
              <Slider
                value={cameraAzimuth}
                onChange={(_, value) => setCameraAzimuth(value as number)}
                min={0}
                max={360}
                step={1}
                size="small"
              />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" gutterBottom>Elevation: {cameraElevation}°</Typography>
              <Slider
                value={cameraElevation}
                onChange={(_, value) => setCameraElevation(value as number)}
                min={-90}
                max={90}
                step={1}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Rendering Parameters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Rendering Quality
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Quality Level</InputLabel>
                <Select
                  value={renderingParams.qualityLevel}
                  label="Quality Level"
                  onChange={(e) => onRenderingParamsChange({ qualityLevel: e.target.value as any })}
                >
                  <MenuItem value="low">Low (Fast)</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="ultra">Ultra (Slow)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={renderingParams.enableShading}
                    onChange={(e) => onRenderingParamsChange({ enableShading: e.target.checked })}
                  />
                }
                label="Enable Shading"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={renderingParams.enableJittering}
                    onChange={(e) => onRenderingParamsChange({ enableJittering: e.target.checked })}
                  />
                }
                label="Enable Jittering"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Clipping Planes */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Clipping Planes
          </Typography>
          
          {clippingPlanes.map((plane) => (
            <Box key={plane.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={plane.enabled}
                      onChange={(e) => handleClippingPlaneChange(plane.id, 'enabled', e.target.checked)}
                    />
                  }
                  label={`${plane.id.toUpperCase()} Plane`}
                />
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: plane.color,
                    borderRadius: '50%'
                  }}
                />
              </Box>
              
              {plane.enabled && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Position: {(plane.distance * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={plane.distance}
                    onChange={(_, value) => handleClippingPlaneChange(plane.id, 'distance', value)}
                    min={0}
                    max={1}
                    step={0.01}
                    size="small"
                  />
                </Box>
              )}
            </Box>
          ))}
        </Paper>

        {/* Measurement Tools */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Measurement Tools
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={activeMeasurementTool === 'distance' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => addMeasurement('distance')}
            >
              Distance
            </Button>
            <Button
              variant={activeMeasurementTool === 'volume' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => addMeasurement('volume')}
            >
              Volume
            </Button>
            <Button
              variant={activeMeasurementTool === 'angle' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => addMeasurement('angle')}
            >
              Angle
            </Button>
          </Box>
          
          {measurements.length > 0 && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Active Measurements:
              </Typography>
              {measurements.map((measurement) => (
                <Box key={measurement.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2">
                    {measurement.type}: {measurement.value.toFixed(2)} {measurement.unit}
                  </Typography>
                  <IconButton size="small" onClick={() => removeMeasurement(measurement.id)}>
                    <ContentCut fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={() => setExportDialogOpen(true)}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setSettingsDialogOpen(true)}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export 3D View</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Choose export format:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button onClick={() => { onExport('png'); setExportDialogOpen(false); }}>
              PNG Image
            </Button>
            <Button onClick={() => { onExport('jpg'); setExportDialogOpen(false); }}>
              JPEG Image
            </Button>
            <Button onClick={() => { onExport('pdf'); setExportDialogOpen(false); }}>
              PDF Report
            </Button>
            <Button onClick={() => { onExport('obj'); setExportDialogOpen(false); }}>
              3D Model (OBJ)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Advanced Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Step Size: {renderingParams.stepSize}
              </Typography>
              <Slider
                value={renderingParams.stepSize}
                onChange={(_, value) => onRenderingParamsChange({ stepSize: value as number })}
                min={0.001}
                max={0.1}
                step={0.001}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Max Steps: {renderingParams.maxSteps}
              </Typography>
              <Slider
                value={renderingParams.maxSteps}
                onChange={(_, value) => onRenderingParamsChange({ maxSteps: value as number })}
                min={100}
                max={2000}
                step={50}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Ambient Light: {renderingParams.ambientLight}
              </Typography>
              <Slider
                value={renderingParams.ambientLight}
                onChange={(_, value) => onRenderingParamsChange({ ambientLight: value as number })}
                min={0}
                max={1}
                step={0.1}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Diffuse Light: {renderingParams.diffuseLight}
              </Typography>
              <Slider
                value={renderingParams.diffuseLight}
                onChange={(_, value) => onRenderingParamsChange({ diffuseLight: value as number })}
                min={0}
                max={1}
                step={0.1}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Interactive3DControls;