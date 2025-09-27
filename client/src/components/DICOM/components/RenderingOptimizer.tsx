/**
 * Rendering Optimizer Component
 * 
 * Advanced rendering optimizations for DICOM viewer:
 * - GPU acceleration management
 * - Progressive loading strategies
 * - Viewport optimization
 * - Frame rate monitoring
 * - Quality vs performance balancing
 * - WebGL/WebGPU optimization
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  Speed,
  Tune,
  GraphicEq,
  Memory,
  Visibility,
  HighQuality,
  LowPriority,
  Timeline,
  Settings,
  Refresh,
  Warning,
  CheckCircle,
  Computer,
  Videocam,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

interface RenderingSettings {
  // Quality settings
  imageQuality: 'low' | 'medium' | 'high' | 'ultra';
  antiAliasing: boolean;
  anisotropicFiltering: number;
  
  // Performance settings
  maxFPS: number;
  adaptiveQuality: boolean;
  gpuAcceleration: boolean;
  webGPUEnabled: boolean;
  
  // Progressive loading
  progressiveLoading: boolean;
  tileSize: number;
  preloadDistance: number;
  
  // Viewport optimization
  cullingEnabled: boolean;
  lodEnabled: boolean; // Level of Detail
  frustumCulling: boolean;
  
  // Memory management
  textureCompression: boolean;
  maxTextureSize: number;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  gpuUtilization: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  renderTime: number;
  loadTime: number;
}

interface RenderingOptimizerProps {
  onSettingsChange?: (settings: RenderingSettings) => void;
  onPerformanceAlert?: (metric: string, value: number, threshold: number) => void;
  initialSettings?: Partial<RenderingSettings>;
}

const defaultSettings: RenderingSettings = {
  imageQuality: 'high',
  antiAliasing: true,
  anisotropicFiltering: 4,
  maxFPS: 60,
  adaptiveQuality: true,
  gpuAcceleration: true,
  webGPUEnabled: false,
  progressiveLoading: true,
  tileSize: 512,
  preloadDistance: 2,
  cullingEnabled: true,
  lodEnabled: true,
  frustumCulling: true,
  textureCompression: true,
  maxTextureSize: 4096,
  cacheStrategy: 'balanced'
};

const RenderingOptimizer: React.FC<RenderingOptimizerProps> = ({
  onSettingsChange,
  onPerformanceAlert,
  initialSettings = {}
}) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<RenderingSettings>({
    ...defaultSettings,
    ...initialSettings
  });
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    gpuUtilization: 45,
    memoryUsage: 512,
    drawCalls: 150,
    triangles: 50000,
    renderTime: 12.5,
    loadTime: 250
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();

  // Performance monitoring
  const updatePerformanceMetrics = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    if (deltaTime >= 1000) { // Update every second
      const fps = (frameCountRef.current * 1000) / deltaTime;
      const frameTime = deltaTime / frameCountRef.current;
      
      // Simulate other metrics (in real implementation, these would come from WebGL/WebGPU)
      const newMetrics: PerformanceMetrics = {
        fps: Math.round(fps * 10) / 10,
        frameTime: Math.round(frameTime * 100) / 100,
        gpuUtilization: Math.random() * 30 + 40, // 40-70%
        memoryUsage: Math.random() * 200 + 400, // 400-600MB
        drawCalls: Math.floor(Math.random() * 100 + 100), // 100-200
        triangles: Math.floor(Math.random() * 20000 + 40000), // 40k-60k
        renderTime: Math.random() * 5 + 10, // 10-15ms
        loadTime: Math.random() * 100 + 200 // 200-300ms
      };
      
      setMetrics(newMetrics);
      setPerformanceHistory(prev => [...prev.slice(-29), newMetrics.fps]); // Keep last 30 values
      
      // Check performance thresholds
      if (newMetrics.fps < 30 && onPerformanceAlert) {
        onPerformanceAlert('fps', newMetrics.fps, 30);
      }
      if (newMetrics.gpuUtilization > 90 && onPerformanceAlert) {
        onPerformanceAlert('gpu', newMetrics.gpuUtilization, 90);
      }
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    frameCountRef.current++;
    animationFrameRef.current = requestAnimationFrame(updatePerformanceMetrics);
  }, [onPerformanceAlert]);

  // Auto-optimization based on performance
  const performAutoOptimization = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      let newSettings = { ...settings };
      
      // If FPS is low, reduce quality
      if (metrics.fps < 30) {
        if (settings.imageQuality === 'ultra') {
          newSettings.imageQuality = 'high';
        } else if (settings.imageQuality === 'high') {
          newSettings.imageQuality = 'medium';
        }
        
        if (settings.antiAliasing) {
          newSettings.antiAliasing = false;
        }
        
        if (settings.anisotropicFiltering > 2) {
          newSettings.anisotropicFiltering = Math.max(1, settings.anisotropicFiltering / 2);
        }
      }
      
      // If GPU utilization is high, enable more optimizations
      if (metrics.gpuUtilization > 80) {
        newSettings.cullingEnabled = true;
        newSettings.lodEnabled = true;
        newSettings.textureCompression = true;
        
        if (settings.maxTextureSize > 2048) {
          newSettings.maxTextureSize = 2048;
        }
      }
      
      // If memory usage is high, be more aggressive with caching
      if (metrics.memoryUsage > 800) {
        newSettings.cacheStrategy = 'conservative';
        newSettings.preloadDistance = Math.max(1, settings.preloadDistance - 1);
      }
      
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
      
    } finally {
      setIsOptimizing(false);
    }
  }, [settings, metrics, onSettingsChange]);

  // Settings update handler
  const updateSetting = useCallback(<K extends keyof RenderingSettings>(
    key: K,
    value: RenderingSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  }, [settings, onSettingsChange]);

  // WebGPU detection
  const [webGPUSupported, setWebGPUSupported] = useState(false);
  
  useEffect(() => {
    const checkWebGPU = async () => {
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setWebGPUSupported(!!adapter);
        } catch (error) {
          setWebGPUSupported(false);
        }
      }
    };
    
    checkWebGPU();
  }, []);

  // Start performance monitoring
  useEffect(() => {
    updatePerformanceMetrics();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updatePerformanceMetrics]);

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'success';
    if (value >= thresholds.warning) return 'warning';
    return 'error';
  };

  const renderQualityTab = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>Image Quality</Typography>
        <Slider
          value={['low', 'medium', 'high', 'ultra'].indexOf(settings.imageQuality)}
          onChange={(_, value) => updateSetting('imageQuality', 
            ['low', 'medium', 'high', 'ultra'][value as number] as any)}
          min={0}
          max={3}
          step={1}
          marks={[
            { value: 0, label: 'Low' },
            { value: 1, label: 'Medium' },
            { value: 2, label: 'High' },
            { value: 3, label: 'Ultra' }
          ]}
        />
      </Box>
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.antiAliasing}
            onChange={(e) => updateSetting('antiAliasing', e.target.checked)}
          />
        }
        label="Anti-Aliasing"
      />
      
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Anisotropic Filtering: {settings.anisotropicFiltering}x
        </Typography>
        <Slider
          value={settings.anisotropicFiltering}
          onChange={(_, value) => updateSetting('anisotropicFiltering', value as number)}
          min={1}
          max={16}
          step={1}
          marks={[1, 2, 4, 8, 16].map(v => ({ value: v, label: `${v}x` }))}
        />
      </Box>
      
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Max Texture Size: {settings.maxTextureSize}px
        </Typography>
        <Slider
          value={settings.maxTextureSize}
          onChange={(_, value) => updateSetting('maxTextureSize', value as number)}
          min={1024}
          max={8192}
          step={1024}
          marks={[1024, 2048, 4096, 8192].map(v => ({ value: v, label: `${v}px` }))}
        />
      </Box>
    </Stack>
  );

  const renderPerformanceTab = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Max FPS: {settings.maxFPS}
        </Typography>
        <Slider
          value={settings.maxFPS}
          onChange={(_, value) => updateSetting('maxFPS', value as number)}
          min={30}
          max={120}
          step={15}
          marks={[30, 60, 90, 120].map(v => ({ value: v, label: `${v}` }))}
        />
      </Box>
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.adaptiveQuality}
            onChange={(e) => updateSetting('adaptiveQuality', e.target.checked)}
          />
        }
        label="Adaptive Quality (Auto-adjust based on performance)"
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.gpuAcceleration}
            onChange={(e) => updateSetting('gpuAcceleration', e.target.checked)}
          />
        }
        label="GPU Acceleration"
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.webGPUEnabled}
            onChange={(e) => updateSetting('webGPUEnabled', e.target.checked)}
            disabled={!webGPUSupported}
          />
        }
        label={`WebGPU ${webGPUSupported ? '(Available)' : '(Not Supported)'}`}
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.textureCompression}
            onChange={(e) => updateSetting('textureCompression', e.target.checked)}
          />
        }
        label="Texture Compression"
      />
    </Stack>
  );

  const renderOptimizationTab = () => (
    <Stack spacing={3}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.cullingEnabled}
            onChange={(e) => updateSetting('cullingEnabled', e.target.checked)}
          />
        }
        label="Frustum Culling"
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.lodEnabled}
            onChange={(e) => updateSetting('lodEnabled', e.target.checked)}
          />
        }
        label="Level of Detail (LOD)"
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={settings.progressiveLoading}
            onChange={(e) => updateSetting('progressiveLoading', e.target.checked)}
          />
        }
        label="Progressive Loading"
      />
      
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Tile Size: {settings.tileSize}px
        </Typography>
        <Slider
          value={settings.tileSize}
          onChange={(_, value) => updateSetting('tileSize', value as number)}
          min={256}
          max={1024}
          step={128}
          marks={[256, 512, 768, 1024].map(v => ({ value: v, label: `${v}px` }))}
        />
      </Box>
      
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Preload Distance: {settings.preloadDistance} tiles
        </Typography>
        <Slider
          value={settings.preloadDistance}
          onChange={(_, value) => updateSetting('preloadDistance', value as number)}
          min={1}
          max={5}
          step={1}
          marks={[1, 2, 3, 4, 5].map(v => ({ value: v, label: `${v}` }))}
        />
      </Box>
    </Stack>
  );

  const renderMetricsTab = () => (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Speed color={getPerformanceColor(metrics.fps, { good: 50, warning: 30 })} />
                <Typography variant="h6">{metrics.fps}</Typography>
                <Typography variant="body2">FPS</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Timeline color={getPerformanceColor(100 - metrics.frameTime, { good: 83, warning: 66 })} />
                <Typography variant="h6">{metrics.frameTime.toFixed(1)}</Typography>
                <Typography variant="body2">ms</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Computer color={getPerformanceColor(100 - metrics.gpuUtilization, { good: 30, warning: 10 })} />
                <Typography variant="h6">{metrics.gpuUtilization.toFixed(0)}%</Typography>
                <Typography variant="body2">GPU</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Memory color={getPerformanceColor(1000 - metrics.memoryUsage, { good: 400, warning: 200 })} />
                <Typography variant="h6">{metrics.memoryUsage.toFixed(0)}</Typography>
                <Typography variant="body2">MB</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* FPS History Chart */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>FPS History</Typography>
          <Box sx={{ height: 100, position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 300 100">
              <polyline
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth="2"
                points={performanceHistory.map((fps, i) => 
                  `${(i / (performanceHistory.length - 1)) * 300},${100 - (fps / 60) * 100}`
                ).join(' ')}
              />
            </svg>
          </Box>
        </CardContent>
      </Card>
      
      <Button
        variant="contained"
        onClick={performAutoOptimization}
        disabled={isOptimizing}
        startIcon={<Tune />}
        fullWidth
      >
        {isOptimizing ? 'Optimizing...' : 'Auto-Optimize Performance'}
      </Button>
    </Stack>
  );

  return (
    <>
      {/* Performance Indicator */}
      <Tooltip title={`FPS: ${metrics.fps} | GPU: ${metrics.gpuUtilization.toFixed(0)}%`}>
        <Chip
          icon={<Speed />}
          label={`${metrics.fps.toFixed(0)} FPS`}
          size="small"
          color={getPerformanceColor(metrics.fps, { good: 50, warning: 30 }) as any}
          onClick={() => setIsOpen(true)}
          sx={{ cursor: 'pointer' }}
        />
      </Tooltip>

      {/* Rendering Optimizer Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GraphicEq />
            <Typography variant="h6">Rendering Optimizer</Typography>
            <Chip
              label={`${metrics.fps.toFixed(0)} FPS`}
              size="small"
              color={getPerformanceColor(metrics.fps, { good: 50, warning: 30 }) as any}
            />
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
              <Tab label="Quality" icon={<HighQuality />} />
              <Tab label="Performance" icon={<Speed />} />
              <Tab label="Optimization" icon={<Tune />} />
              <Tab label="Metrics" icon={<Timeline />} />
            </Tabs>
          </Box>
          
          {activeTab === 0 && renderQualityTab()}
          {activeTab === 1 && renderPerformanceTab()}
          {activeTab === 2 && renderOptimizationTab()}
          {activeTab === 3 && renderMetricsTab()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setSettings(defaultSettings)} color="secondary">
            Reset to Defaults
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RenderingOptimizer;