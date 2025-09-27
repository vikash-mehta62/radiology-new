/**
 * Final DICOM Viewer Demo Page
 * 
 * Comprehensive demonstration of the ultimate DICOM viewer implementation
 * showcasing all enhanced features, GPU acceleration, and latest optimizations.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  Speed,
  Memory,
  SmartToy,
  Security,
  Accessibility,
  HighQuality,
  ViewModule,
  Assessment,
  Timeline,
  CheckCircle,
  Warning,
  Info,
  PlayArrow,
  Stop,
  Refresh,
  Download,
  Share,
  Settings,
  ExpandMore,
  Fullscreen,
  GraphicEq,
  AutoAwesome,
  Tune,
  CloudDownload,
  Cached,
  TouchApp,
  Visibility,
  ThreeDRotation,
  Straighten,
  CropFree,
  Brightness6,
  Contrast,
  InvertColors
} from '@mui/icons-material';

import UnifiedDicomViewer, { 
  UnifiedDicomViewerRef, 
  UnifiedDicomViewerProps,
  GPUCapabilities,
  PerformanceMetrics
} from '../components/DICOM/unifieddicomviewer';

// Sample DICOM studies for demonstration
const DEMO_STUDIES = [
  {
    studyInstanceUID: 'demo.study.1',
    patientName: 'Demo Patient 1',
    patientID: 'DEMO001',
    studyDate: '20240115',
    studyTime: '143000',
    studyDescription: 'CT Chest with Contrast',
    modality: 'CT',
    numberOfSeries: 3,
    numberOfImages: 256,
    accessionNumber: 'ACC001',
    studyID: 'STU001'
  },
  {
    studyInstanceUID: 'demo.study.2',
    patientName: 'Demo Patient 2',
    patientID: 'DEMO002',
    studyDate: '20240116',
    studyTime: '091500',
    studyDescription: 'MRI Brain without Contrast',
    modality: 'MR',
    numberOfSeries: 5,
    numberOfImages: 180,
    accessionNumber: 'ACC002',
    studyID: 'STU002'
  },
  {
    studyInstanceUID: 'demo.study.3',
    patientName: 'Demo Patient 3',
    patientID: 'DEMO003',
    studyDate: '20240117',
    studyTime: '161200',
    studyDescription: 'Digital Mammography Screening',
    modality: 'MG',
    numberOfSeries: 4,
    numberOfImages: 8,
    accessionNumber: 'ACC003',
    studyID: 'STU003'
  },
  // Real patient data for testing
  {
    studyInstanceUID: 'real.study.pat001',
    patientName: 'PAT001 Real Patient',
    patientID: 'PAT001',
    studyDate: '20240118',
    studyTime: '100000',
    studyDescription: 'Real DICOM Study - CT Scan',
    modality: 'CT',
    numberOfSeries: 1,
    numberOfImages: 1,
    accessionNumber: 'REAL001',
    studyID: 'PAT001_REAL',
    // Additional properties for real DICOM loading
    filename: '0002.DCM',
    patient_id: 'PAT001',
    dicom_url: '/uploads/PAT001/0002.DCM',
    isRealPatientData: true
  }
];

// Feature categories for demonstration
const FEATURE_CATEGORIES = {
  'GPU Acceleration': {
    icon: <Speed />,
    color: 'success',
    features: [
      'WebGPU rendering with fallback to WebGL 2.0',
      'NVIDIA RTX 40 series optimization',
      'AMD RDNA 3 architecture support',
      'Intel Arc GPU compatibility',
      'Automatic GPU capability detection',
      'Adaptive quality based on performance'
    ]
  },
  'Advanced Decoding': {
    icon: <GraphicEq />,
    color: 'primary',
    features: [
      'HTJ2K (High-Throughput JPEG 2000) support',
      'NVIDIA nvJPEG2000 GPU acceleration',
      'Progressive image loading',
      'Smart caching with memory management',
      'Multi-threaded decoding',
      'Lossless compression optimization'
    ]
  },
  'AI Enhancement': {
    icon: <SmartToy />,
    color: 'secondary',
    features: [
      'Automatic windowing optimization',
      'Abnormality detection with confidence scoring',
      'Smart measurement suggestions',
      'Image enhancement algorithms',
      'Noise reduction and sharpening',
      'Adaptive contrast adjustment'
    ]
  },
  'Security & Compliance': {
    icon: <Security />,
    color: 'warning',
    features: [
      'DICOM security validation',
      'Encrypted data transmission',
      'Audit trail logging',
      'HIPAA compliance features',
      'Access control integration',
      'Secure export functionality'
    ]
  },
  'Accessibility': {
    icon: <Accessibility />,
    color: 'info',
    features: [
      'WCAG 2.1 AA compliance',
      'Screen reader support',
      'High contrast mode',
      'Keyboard navigation',
      'Voice control integration',
      'Colorblind accessibility'
    ]
  },
  'Performance': {
    icon: <Assessment />,
    color: 'error',
    features: [
      'Real-time performance monitoring',
      'Memory usage optimization',
      'Frame rate targeting (60 FPS)',
      'GPU utilization tracking',
      'Automatic quality adjustment',
      'Resource usage analytics'
    ]
  }
};

interface DemoState {
  selectedStudy: any | null;
  viewerConfig: Partial<UnifiedDicomViewerProps>;
  performanceMetrics: PerformanceMetrics | null;
  gpuCapabilities: GPUCapabilities | null;
  isViewerActive: boolean;
  selectedTab: number;
  showConfigDialog: boolean;
  demoMode: 'basic' | 'advanced' | 'performance' | 'ai' | 'comparison';
}

const FinalDicomViewerDemo: React.FC = () => {
  const theme = useTheme();
  const viewerRef = useRef<UnifiedDicomViewerRef>(null);
  
  const [state, setState] = useState<DemoState>({
    selectedStudy: null,
    viewerConfig: {
      userRole: 'radiologist',
      viewerMode: 'diagnostic',
      enableAdvancedTools: true,
      enableAI: true,
      enableWebGPU: true,
      enableWebGL2: true,
      enableGPUAcceleration: true,
      preferredRenderingMode: 'auto',
      qualityPreset: 'diagnostic',
      enablePerformanceMonitoring: true,
      enableSecurity: true,
      enableAccessibility: true,
      targetFrameRate: 60,
      maxMemoryUsage: 2048,
      defaultLayout: 'single'
    },
    performanceMetrics: null,
    gpuCapabilities: null,
    isViewerActive: false,
    selectedTab: 0,
    showConfigDialog: false,
    demoMode: 'basic'
  });

  // Handle study selection
  const handleStudySelect = (study: any) => {
    setState(prev => ({ 
      ...prev, 
      selectedStudy: study,
      isViewerActive: true
    }));
  };

  // Handle performance metrics update
  const handlePerformanceUpdate = (metrics: PerformanceMetrics) => {
    setState(prev => ({ ...prev, performanceMetrics: metrics }));
  };

  // Handle GPU capabilities detection
  const handleGPUCapabilitiesDetected = (capabilities: GPUCapabilities) => {
    setState(prev => ({ ...prev, gpuCapabilities: capabilities }));
  };

  // Handle configuration changes
  const handleConfigChange = (key: keyof FinalDicomViewerProps, value: any) => {
    setState(prev => ({
      ...prev,
      viewerConfig: { ...prev.viewerConfig, [key]: value }
    }));
  };

  // Demo mode configurations
  const getDemoModeConfig = (mode: string): Partial<FinalDicomViewerProps> => {
    switch (mode) {
      case 'performance':
        return {
          enablePerformanceMonitoring: true,
          targetFrameRate: 120,
          qualityPreset: 'high',
          enableGPUAcceleration: true,
          preferredRenderingMode: 'webgpu'
        };
      case 'ai':
        return {
          enableAI: true,
          enableAIEnhancement: true,
          enableAbnormalityDetection: true,
          enableAutoWindowing: true,
          enableSmartMeasurements: true,
          aiConfidenceThreshold: 0.7
        };
      case 'comparison':
        return {
          defaultLayout: 'comparison',
          enableSynchronization: true,
          enableLinking: true
        };
      case 'advanced':
        return {
          enableAdvancedTools: true,
          enableMultiViewport: true,
          defaultLayout: 'mpr',
          enableCollaboration: true
        };
      default:
        return {
          defaultLayout: 'single',
          enableAdvancedTools: false,
          enableAI: false
        };
    }
  };

  // Apply demo mode
  const applyDemoMode = (mode: string) => {
    const modeConfig = getDemoModeConfig(mode);
    setState(prev => ({
      ...prev,
      demoMode: mode as any,
      viewerConfig: { ...prev.viewerConfig, ...modeConfig }
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Final DICOM Viewer
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Ultimate medical imaging solution with GPU acceleration and AI enhancement
        </Typography>
        
        {/* GPU Status Badge */}
        {state.gpuCapabilities && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              icon={<Speed />}
              label={`${state.gpuCapabilities.vendor.toUpperCase()} GPU Detected`}
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<Memory />}
              label={`${state.gpuCapabilities.memory}MB VRAM`}
              color="info"
              variant="outlined"
            />
            {state.gpuCapabilities.webgpu && (
              <Chip
                icon={<HighQuality />}
                label="WebGPU Ready"
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        )}
      </Box>

      {/* Demo Mode Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Demo Modes
        </Typography>
        <Grid container spacing={2}>
          {[
            { mode: 'basic', title: 'Basic Viewing', description: 'Simple DICOM viewing with essential tools' },
            { mode: 'advanced', title: 'Advanced Tools', description: 'Multi-viewport layouts with advanced measurement tools' },
            { mode: 'performance', title: 'Performance', description: 'GPU-accelerated rendering with performance monitoring' },
            { mode: 'ai', title: 'AI Enhancement', description: 'AI-powered analysis and automatic optimizations' },
            { mode: 'comparison', title: 'Comparison', description: 'Side-by-side study comparison with synchronization' }
          ].map(({ mode, title, description }) => (
            <Grid item xs={12} sm={6} md={2.4} key={mode}>
              <Card 
                variant={state.demoMode === mode ? "elevation" : "outlined"}
                sx={{ 
                  cursor: 'pointer',
                  border: state.demoMode === mode ? 2 : 1,
                  borderColor: state.demoMode === mode ? 'primary.main' : 'divider'
                }}
                onClick={() => applyDemoMode(mode)}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Feature Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Enhanced Features
        </Typography>
        <Grid container spacing={3}>
          {Object.entries(FEATURE_CATEGORIES).map(([category, { icon, color, features }]) => (
            <Grid item xs={12} md={6} lg={4} key={category}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Box sx={{ color: `${color}.main` }}>
                      {icon}
                    </Box>
                    <Typography variant="h6">
                      {category}
                    </Typography>
                  </Stack>
                  <List dense>
                    {features.map((feature, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircle color={color} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Study Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Demo Studies
        </Typography>
        <Grid container spacing={2}>
          {DEMO_STUDIES.map((study) => (
            <Grid item xs={12} md={4} key={study.studyInstanceUID}>
              <Card 
                variant={state.selectedStudy?.studyInstanceUID === study.studyInstanceUID ? "elevation" : "outlined"}
                sx={{ 
                  cursor: 'pointer',
                  border: state.selectedStudy?.studyInstanceUID === study.studyInstanceUID ? 2 : 1,
                  borderColor: state.selectedStudy?.studyInstanceUID === study.studyInstanceUID ? 'primary.main' : 'divider'
                }}
                onClick={() => handleStudySelect(study)}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Typography variant="h6">
                      {study.patientName}
                    </Typography>
                    <Chip label={study.modality} size="small" color="primary" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {study.studyDescription}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label={`${study.numberOfSeries} Series`} size="small" variant="outlined" />
                    <Chip label={`${study.numberOfImages} Images`} size="small" variant="outlined" />
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrow />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStudySelect(study);
                    }}
                  >
                    Load Study
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Performance Metrics */}
      {state.performanceMetrics && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Real-time Performance
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {Math.round(state.performanceMetrics.fps)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    FPS
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">
                    {Math.round(state.performanceMetrics.memoryUsage)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    MB Memory
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {Math.round(state.performanceMetrics.frameTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ms Frame Time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {state.performanceMetrics.renderingMode.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rendering
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* DICOM Viewer */}
      {state.isViewerActive && state.selectedStudy && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ height: '80vh' }}>
            <UnifiedDicomViewer
              ref={viewerRef}
              study={state.selectedStudy}
              {...state.viewerConfig}
              onPerformanceUpdate={handlePerformanceUpdate}
              onGPUCapabilitiesDetected={handleGPUCapabilitiesDetected}
              onError={(error) => console.error('Viewer error:', error)}
              onStateChange={(viewerState) => console.log('Viewer state:', viewerState)}
            />
          </Box>
        </Paper>
      )}

      {/* Configuration Panel */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configuration
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Viewer Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>User Role</InputLabel>
                  <Select
                    value={state.viewerConfig.userRole || 'radiologist'}
                    onChange={(e) => handleConfigChange('userRole', e.target.value)}
                  >
                    <MenuItem value="radiologist">Radiologist</MenuItem>
                    <MenuItem value="technician">Technician</MenuItem>
                    <MenuItem value="referring_physician">Referring Physician</MenuItem>
                    <MenuItem value="student">Student</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Quality Preset</InputLabel>
                  <Select
                    value={state.viewerConfig.qualityPreset || 'diagnostic'}
                    onChange={(e) => handleConfigChange('qualityPreset', e.target.value)}
                  >
                    <MenuItem value="diagnostic">Diagnostic</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="balanced">Balanced</MenuItem>
                    <MenuItem value="performance">Performance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Rendering Mode</InputLabel>
                  <Select
                    value={state.viewerConfig.preferredRenderingMode || 'auto'}
                    onChange={(e) => handleConfigChange('preferredRenderingMode', e.target.value)}
                  >
                    <MenuItem value="auto">Auto</MenuItem>
                    <MenuItem value="webgpu">WebGPU</MenuItem>
                    <MenuItem value="webgl2">WebGL 2.0</MenuItem>
                    <MenuItem value="webgl">WebGL</MenuItem>
                    <MenuItem value="software">Software</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.viewerConfig.enableAI || false}
                      onChange={(e) => handleConfigChange('enableAI', e.target.checked)}
                    />
                  }
                  label="AI Enhancement"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.viewerConfig.enableGPUAcceleration || false}
                      onChange={(e) => handleConfigChange('enableGPUAcceleration', e.target.checked)}
                    />
                  }
                  label="GPU Acceleration"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.viewerConfig.enablePerformanceMonitoring || false}
                      onChange={(e) => handleConfigChange('enablePerformanceMonitoring', e.target.checked)}
                    />
                  }
                  label="Performance Monitoring"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Container>
  );
};

export default FinalDicomViewerDemo;