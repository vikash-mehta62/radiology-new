import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  FormControlLabel,
  Switch,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  ViewInAr,
  Dashboard,
  Security,
  Speed,
  Memory,
  Assessment,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info
} from '@mui/icons-material';

import UnifiedDicomViewer, { UnifiedDicomViewerRef } from './unifieddicomviewer';
import type { Study } from '../../types';

// Dynamic DICOM metadata fetching function
const fetchDicomMetadata = async (patientId: string, filename: string) => {
  try {
    console.log(`🔍 Fetching metadata for ${patientId}/${filename}`);
    const response = await fetch(`http://localhost:8000/dicom/process/${patientId}/${filename}?auto_detect=true&frame=0`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Backend error: ${data.error}`);
    }
    
    console.log(`📊 Metadata fetched:`, {
      totalSlices: data.total_slices,
      autoDetectionInfo: data.auto_detection_info
    });
    
    return {
      totalSlices: data.total_slices || 1,
      metadata: data.metadata,
      autoDetectionInfo: data.auto_detection_info
    };
  } catch (error) {
    console.error(`❌ Error fetching metadata for ${patientId}/${filename}:`, error);
    return {
      totalSlices: 1,
      metadata: null,
      autoDetectionInfo: null
    };
  }
};

// Generate dynamic imageIds based on actual frame count
const generateDynamicImageIds = (patientId: string, filename: string, totalFrames: number) => {
  return Array.from({ length: totalFrames }, (_, i) => 
    `dicomweb://localhost:8000/rs/studies/${patientId}/instances/${filename}/frames/${i + 1}`
  );
};

// Create dynamic mock study with real PAT_VIKASH_7F64CCAA data
const createDynamicMockStudy = async (): Promise<Study> => {
  // Fetch metadata for PAT_VIKASH_7F64CCAA
  const metadata = await fetchDicomMetadata('PAT_VIKASH_7F64CCAA', '0002.DCM');
  
  const dynamicStudy: Study = {
    studyInstanceUID: 'PAT_VIKASH_7F64CCAA',
    studyDate: '20240115',
    studyTime: '143022',
    studyDescription: 'Multi-slice DICOM Test (Dynamic)',
    patientName: 'VIKASH^TEST^PATIENT',
    patientId: 'PAT_VIKASH_7F64CCAA',
    patientBirthDate: '19850315',
    patientSex: 'M',
    accessionNumber: 'ACC_VIKASH',
    modality: 'CT',
    numberOfSeries: 1,
    numberOfInstances: metadata.totalSlices,
    institutionName: 'Test Hospital',
    referringPhysicianName: 'Dr. Test',
    studyId: 'STUDY_VIKASH',
    seriesData: [
      {
        seriesInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.79',
        seriesNumber: 1,
        seriesDescription: `Multi-slice CT (${metadata.totalSlices} frames)`,
        modality: 'CT',
        numberOfInstances: metadata.totalSlices,
        bodyPartExamined: 'CHEST',
        imageIds: generateDynamicImageIds('PAT_VIKASH_7F64CCAA', '0002.DCM', metadata.totalSlices)
      }
    ]
  };
  
  console.log(`✅ Created dynamic mock study with ${metadata.totalSlices} frames`);
  return dynamicStudy;
};

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const UnifiedViewerTest: React.FC = () => {
  const viewerRef = useRef<UnifiedDicomViewerRef>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingRunning, setIsTestingRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [dynamicStudy, setDynamicStudy] = useState<Study | null>(null);
  const [isLoadingStudy, setIsLoadingStudy] = useState(true);
  
  // Load dynamic study on component mount
  useEffect(() => {
    const loadDynamicStudy = async () => {
      try {
        setIsLoadingStudy(true);
        const study = await createDynamicMockStudy();
        setDynamicStudy(study);
        console.log('🎯 Dynamic study loaded successfully:', study);
      } catch (error) {
        console.error('❌ Failed to load dynamic study:', error);
        // Fallback to a basic study structure
        setDynamicStudy({
          studyInstanceUID: 'PAT_VIKASH_7F64CCAA',
          studyDate: '20240115',
          studyTime: '143022',
          studyDescription: 'Multi-slice DICOM Test (Fallback)',
          patientName: 'VIKASH^TEST^PATIENT',
          patientId: 'PAT_VIKASH_7F64CCAA',
          patientBirthDate: '19850315',
          patientSex: 'M',
          accessionNumber: 'ACC_VIKASH',
          modality: 'CT',
          numberOfSeries: 1,
          numberOfInstances: 1,
          institutionName: 'Test Hospital',
          referringPhysicianName: 'Dr. Test',
          studyId: 'STUDY_VIKASH',
          seriesData: [
            {
              seriesInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.79',
              seriesNumber: 1,
              seriesDescription: 'Multi-slice CT (Fallback)',
              modality: 'CT',
              numberOfInstances: 1,
              bodyPartExamined: 'CHEST',
              imageIds: ['dicomweb://localhost:8000/rs/studies/PAT_VIKASH_7F64CCAA/instances/0002.DCM/frames/1']
            }
          ]
        });
      } finally {
        setIsLoadingStudy(false);
      }
    };

    loadDynamicStudy();
  }, []);
  
  // Viewer configuration for testing
  const [viewerConfig, setViewerConfig] = useState({
    enableWebGL: true,
    enableWebGPU: true,
    enableAdvancedTools: true,
    enableAI: true,
    enableSecurity: true,
    enablePerformanceMonitoring: true,
    enableMultiViewport: true,
    enableCollaboration: false,
    targetFrameRate: 60,
    maxMemoryUsage: 512,
    layout: 'single' as 'single' | 'dual' | 'quad' | 'mpr' | '3d',
    userRole: 'radiologist' as 'radiologist' | 'technician' | 'referring_physician' | 'student'
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);

  // Test definitions
  const tests: Array<{ name: string; test: () => Promise<void> }> = [
    {
      name: 'Service Initialization',
      test: async () => {
        // Test if all services initialize properly
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!viewerRef.current) throw new Error('Viewer not initialized');
      }
    },
    {
      name: 'Study Loading',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        if (!dynamicStudy) throw new Error('Dynamic study not loaded');
        await viewerRef.current.loadStudy(dynamicStudy);
      }
    },
    {
      name: 'Layout Changes',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        const layouts = ['single', 'dual', 'quad', 'mpr', '3d'];
        for (const layout of layouts) {
          viewerRef.current.setLayout(layout);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    },
    {
      name: 'Tool Activation',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        const tools = ['WindowLevel', 'Pan', 'Zoom', 'Length', 'Angle', 'Rectangle'];
        for (const tool of tools) {
          viewerRef.current.setActiveTool(tool);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    },
    {
      name: 'Viewport Controls',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        viewerRef.current.resetView();
        await new Promise(resolve => setTimeout(resolve, 500));
        viewerRef.current.fitToWindow();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    {
      name: 'Image Export',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        const exportResult = viewerRef.current.exportImage();
        if (!exportResult) throw new Error('Export failed');
      }
    },
    {
      name: 'Performance Monitoring',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        const metrics = viewerRef.current.getPerformanceMetrics();
        if (!metrics) throw new Error('Performance metrics not available');
        setPerformanceMetrics(metrics);
      }
    },
    {
      name: 'Fullscreen Toggle',
      test: async () => {
        if (!viewerRef.current) throw new Error('Viewer not available');
        viewerRef.current.toggleFullscreen();
        await new Promise(resolve => setTimeout(resolve, 1000));
        viewerRef.current.toggleFullscreen();
      }
    }
  ];

  const runTests = async () => {
    setIsTestingRunning(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    
    for (const { name, test } of tests) {
      setCurrentTest(name);
      const result: TestResult = { name, status: 'running' };
      results.push(result);
      setTestResults([...results]);
      
      const startTime = Date.now();
      
      try {
        await test();
        result.status = 'passed';
        result.duration = Date.now() - startTime;
        result.message = `Completed in ${result.duration}ms`;
      } catch (error) {
        result.status = 'failed';
        result.duration = Date.now() - startTime;
        result.message = error instanceof Error ? error.message : 'Unknown error';
      }
      
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsTestingRunning(false);
    setCurrentTest('');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'running': return <Speed color="primary" />;
      default: return <Info color="disabled" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Test Control Panel */}
      <Paper 
        elevation={3} 
        sx={{ 
          width: 400, 
          p: 2, 
          overflow: 'auto',
          borderRadius: 0
        }}
      >
        <Typography variant="h6" gutterBottom>
          DICOM Viewer Test Suite
        </Typography>
        
        {isLoadingStudy && (
          <Alert severity="info" sx={{ mb: 2 }}>
            🔄 Loading dynamic DICOM study...
          </Alert>
        )}
        
        {dynamicStudy && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Dynamic study loaded: {dynamicStudy.numberOfInstances} frames
          </Alert>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* Configuration */}
        <Typography variant="subtitle2" gutterBottom>
          Configuration
        </Typography>
        
        <Stack spacing={2} sx={{ mb: 3 }}>
          <FormControl size="small">
            <InputLabel>Layout</InputLabel>
            <Select
              value={viewerConfig.layout}
              label="Layout"
              onChange={(e) => setViewerConfig(prev => ({ ...prev, layout: e.target.value as any }))}
            >
              <MenuItem value="single">Single</MenuItem>
              <MenuItem value="dual">Dual</MenuItem>
              <MenuItem value="quad">Quad</MenuItem>
              <MenuItem value="mpr">MPR</MenuItem>
              <MenuItem value="3d">3D</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small">
            <InputLabel>User Role</InputLabel>
            <Select
              value={viewerConfig.userRole}
              label="User Role"
              onChange={(e) => setViewerConfig(prev => ({ ...prev, userRole: e.target.value as any }))}
            >
              <MenuItem value="radiologist">Radiologist</MenuItem>
              <MenuItem value="technician">Technician</MenuItem>
              <MenuItem value="referring_physician">Referring Physician</MenuItem>
              <MenuItem value="student">Student</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={viewerConfig.enableWebGPU}
                onChange={(e) => setViewerConfig(prev => ({ ...prev, enableWebGPU: e.target.checked }))}
              />
            }
            label="Enable WebGPU"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={viewerConfig.enableAdvancedTools}
                onChange={(e) => setViewerConfig(prev => ({ ...prev, enableAdvancedTools: e.target.checked }))}
              />
            }
            label="Advanced Tools"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={viewerConfig.enableAI}
                onChange={(e) => setViewerConfig(prev => ({ ...prev, enableAI: e.target.checked }))}
              />
            }
            label="AI Features"
          />
          
          <Box>
            <Typography variant="caption" gutterBottom>
              Target FPS: {viewerConfig.targetFrameRate}
            </Typography>
            <Slider
              value={viewerConfig.targetFrameRate}
              onChange={(_, value) => setViewerConfig(prev => ({ ...prev, targetFrameRate: value as number }))}
              min={30}
              max={120}
              step={10}
              marks
              size="small"
            />
          </Box>
        </Stack>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Test Controls */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={runTests}
            disabled={isTestingRunning || isLoadingStudy || !dynamicStudy}
            fullWidth
          >
            {isTestingRunning ? 'Running Tests...' : isLoadingStudy ? 'Loading Study...' : 'Run All Tests'}
          </Button>
          
          {currentTest && (
            <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
              Running: {currentTest}
            </Alert>
          )}
        </Stack>
        
        {/* Test Results */}
        <Typography variant="subtitle2" gutterBottom>
          Test Results ({testResults.filter(r => r.status === 'passed').length}/{testResults.length} passed)
        </Typography>
        
        <List dense>
          {testResults.map((result, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getStatusIcon(result.status)}
              </ListItemIcon>
              <ListItemText
                primary={result.name}
                secondary={result.message}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
              <Chip
                label={result.status}
                color={getStatusColor(result.status) as any}
                size="small"
              />
            </ListItem>
          ))}
        </List>
        
        {/* Performance Metrics */}
        {Object.keys(performanceMetrics).length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Performance Metrics
            </Typography>
            <Stack spacing={1}>
              {Object.entries(performanceMetrics).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{key}:</Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {typeof value === 'number' ? value.toFixed(2) : String(value)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Paper>
      
      {/* Viewer */}
      <Box sx={{ flex: 1 }}>
        {dynamicStudy ? (
          <UnifiedDicomViewer
            ref={viewerRef}
            study={dynamicStudy}
            userRole={viewerConfig.userRole}
            enableWebGL={viewerConfig.enableWebGL}
            enableWebGPU={viewerConfig.enableWebGPU}
            enableAdvancedTools={viewerConfig.enableAdvancedTools}
            enableAI={viewerConfig.enableAI}
            enableSecurity={viewerConfig.enableSecurity}
            enablePerformanceMonitoring={viewerConfig.enablePerformanceMonitoring}
            enableMultiViewport={viewerConfig.enableMultiViewport}
            enableCollaboration={viewerConfig.enableCollaboration}
            targetFrameRate={viewerConfig.targetFrameRate}
            maxMemoryUsage={viewerConfig.maxMemoryUsage}
            defaultLayout={viewerConfig.layout}
            onPerformanceUpdate={setPerformanceMetrics}
            onSecurityEvent={(event) => setSecurityEvents(prev => [...prev, event])}
            onError={(error) => console.error('Viewer Error:', error)}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="h6" color="text.secondary">
              {isLoadingStudy ? 'Loading DICOM study...' : 'Failed to load DICOM study'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default UnifiedViewerTest;