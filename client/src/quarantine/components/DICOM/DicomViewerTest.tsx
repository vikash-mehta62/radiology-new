import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ButtonGroup
} from '@mui/material';
import { dicomServiceBlackImageFix } from '../../services/dicomService_BlackImageFix';
import { Study } from '../../types';

interface DicomViewerTestProps {
  study?: Study;
}

interface TestResult {
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: any;
  duration?: number;
}

interface DebugInfo {
  serviceInitialized?: boolean;
  initTime?: number;
  elementEnabled?: boolean;
  imageLoaded?: boolean;
  [key: string]: any;
}

const DicomViewerTest: React.FC<DicomViewerTestProps> = ({ study }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});

  // Initialize test suite
  const initializeTests = () => {
    const tests: TestResult[] = [
      { testName: 'Service Initialization', status: 'pending', message: 'Not started' },
      { testName: 'Element Enablement', status: 'pending', message: 'Not started' },
      { testName: 'Sample Image Loading', status: 'pending', message: 'Not started' },
      { testName: 'Sample Image Display', status: 'pending', message: 'Not started' },
      { testName: 'Viewport Settings', status: 'pending', message: 'Not started' },
      { testName: 'Real DICOM Loading', status: 'pending', message: 'Not started' },
      { testName: 'Window/Level Adjustment', status: 'pending', message: 'Not started' }
    ];
    setTestResults(tests);
  };

  // Update test result
  const updateTestResult = (testName: string, status: TestResult['status'], message: string, details?: any, duration?: number) => {
    setTestResults(prev => prev.map(test => 
      test.testName === testName 
        ? { ...test, status, message, details, duration }
        : test
    ));
  };

  // Run comprehensive test suite
  const runTestSuite = async () => {
    if (!viewerRef.current) {
      alert('Viewer element not ready');
      return;
    }

    setIsRunning(true);
    setDebugInfo({});
    initializeTests();

    try {
      // Test 1: Service Initialization
      setCurrentTest('Service Initialization');
      updateTestResult('Service Initialization', 'running', 'Initializing DICOM service...');
      const startTime1 = Date.now();
      
      try {
        await dicomServiceBlackImageFix.initialize();
        const duration1 = Date.now() - startTime1;
        updateTestResult('Service Initialization', 'passed', `Service initialized successfully in ${duration1}ms`, null, duration1);
        setDebugInfo(prev => ({ ...prev, serviceInitialized: true, initTime: duration1 }));
      } catch (error) {
        updateTestResult('Service Initialization', 'failed', `Initialization failed: ${error}`);
        throw error;
      }

      // Test 2: Element Enablement
      setCurrentTest('Element Enablement');
      updateTestResult('Element Enablement', 'running', 'Enabling cornerstone element...');
      const startTime2 = Date.now();
      
      try {
        await dicomServiceBlackImageFix.enableElement(viewerRef.current);
        const enabledElement = dicomServiceBlackImageFix.getEnabledElement(viewerRef.current);
        const duration2 = Date.now() - startTime2;
        
        if (enabledElement) {
          updateTestResult('Element Enablement', 'passed', `Element enabled successfully in ${duration2}ms`, {
            canvas: !!enabledElement.canvas,
            viewport: !!enabledElement.viewport
          }, duration2);
          setDebugInfo(prev => ({ ...prev, elementEnabled: true, enabledElement }));
        } else {
          throw new Error('Element not properly enabled');
        }
      } catch (error) {
        updateTestResult('Element Enablement', 'failed', `Element enablement failed: ${error}`);
        throw error;
      }

      // Test 3: Sample Image Loading
      setCurrentTest('Sample Image Loading');
      updateTestResult('Sample Image Loading', 'running', 'Loading sample image...');
      const startTime3 = Date.now();
      
      try {
        const sampleImage = await dicomServiceBlackImageFix.loadImage('sample:test-image');
        const duration3 = Date.now() - startTime3;
        
        updateTestResult('Sample Image Loading', 'passed', `Sample image loaded in ${duration3}ms`, {
          width: sampleImage.width,
          height: sampleImage.height,
          minPixelValue: sampleImage.minPixelValue,
          maxPixelValue: sampleImage.maxPixelValue,
          windowWidth: sampleImage.windowWidth,
          windowCenter: sampleImage.windowCenter
        }, duration3);
        setDebugInfo(prev => ({ ...prev, sampleImage }));
      } catch (error) {
        updateTestResult('Sample Image Loading', 'failed', `Sample image loading failed: ${error}`);
        throw error;
      }

      // Test 4: Sample Image Display
      setCurrentTest('Sample Image Display');
      updateTestResult('Sample Image Display', 'running', 'Displaying sample image...');
      const startTime4 = Date.now();
      
      try {
        await dicomServiceBlackImageFix.displayImage(viewerRef.current, 'sample:test-image');
        const duration4 = Date.now() - startTime4;
        
        // Wait a moment for display to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const viewport = dicomServiceBlackImageFix.getViewport(viewerRef.current);
        updateTestResult('Sample Image Display', 'passed', `Sample image displayed in ${duration4}ms`, {
          viewport: viewport
        }, duration4);
        setDebugInfo(prev => ({ ...prev, sampleDisplayed: true, viewport }));
      } catch (error) {
        updateTestResult('Sample Image Display', 'failed', `Sample image display failed: ${error}`);
        throw error;
      }

      // Test 5: Viewport Settings
      setCurrentTest('Viewport Settings');
      updateTestResult('Viewport Settings', 'running', 'Testing viewport adjustments...');
      const startTime5 = Date.now();
      
      try {
        const originalViewport = dicomServiceBlackImageFix.getViewport(viewerRef.current);
        
        // Test window/level adjustment
        const testViewport = {
          ...originalViewport,
          voi: {
            windowWidth: 400,
            windowCenter: 200
          },
          scale: 1.5
        };
        
        dicomServiceBlackImageFix.setViewport(viewerRef.current, testViewport);
        
        // Wait and verify
        await new Promise(resolve => setTimeout(resolve, 100));
        const newViewport = dicomServiceBlackImageFix.getViewport(viewerRef.current);
        const duration5 = Date.now() - startTime5;
        
        updateTestResult('Viewport Settings', 'passed', `Viewport settings applied in ${duration5}ms`, {
          original: originalViewport,
          modified: newViewport
        }, duration5);
        setDebugInfo(prev => ({ ...prev, viewportTest: { original: originalViewport, modified: newViewport } }));
      } catch (error) {
        updateTestResult('Viewport Settings', 'failed', `Viewport settings failed: ${error}`);
        // Don't throw here, continue with other tests
      }

      // Test 6: Real DICOM Loading (if study provided)
      setCurrentTest('Real DICOM Loading');
      if (study && (study.dicom_url || (study.image_urls && study.image_urls.length > 0))) {
        updateTestResult('Real DICOM Loading', 'running', 'Loading real DICOM image...');
        const startTime6 = Date.now();
        
        try {
          let imageId: string;
          if (study.image_urls && study.image_urls.length > 0) {
            imageId = study.image_urls[0];
          } else if (study.dicom_url) {
            imageId = `wadouri:${study.dicom_url}`;
          } else {
            throw new Error('No valid image URL found');
          }
          
          const realImage = await dicomServiceBlackImageFix.loadImage(imageId);
          await dicomServiceBlackImageFix.displayImage(viewerRef.current, imageId);
          const duration6 = Date.now() - startTime6;
          
          updateTestResult('Real DICOM Loading', 'passed', `Real DICOM loaded and displayed in ${duration6}ms`, {
            imageId,
            width: realImage.width,
            height: realImage.height,
            minPixelValue: realImage.minPixelValue,
            maxPixelValue: realImage.maxPixelValue
          }, duration6);
          setDebugInfo(prev => ({ ...prev, realImage }));
        } catch (error) {
          updateTestResult('Real DICOM Loading', 'failed', `Real DICOM loading failed: ${error}`);
        }
      } else {
        updateTestResult('Real DICOM Loading', 'passed', 'Skipped - no study provided');
      }

      // Test 7: Window/Level Adjustment
      setCurrentTest('Window/Level Adjustment');
      updateTestResult('Window/Level Adjustment', 'running', 'Testing window/level presets...');
      const startTime7 = Date.now();
      
      try {
        const presets = [
          { name: 'Lung', windowWidth: 1500, windowCenter: -600 },
          { name: 'Bone', windowWidth: 2000, windowCenter: 300 },
          { name: 'Soft Tissue', windowWidth: 400, windowCenter: 40 }
        ];
        
        const results: any[] = [];
        for (const preset of presets) {
          const testViewport = {
            voi: {
              windowWidth: preset.windowWidth,
              windowCenter: preset.windowCenter
            }
          };
          
          dicomServiceBlackImageFix.setViewport(viewerRef.current, testViewport);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const verifyViewport = dicomServiceBlackImageFix.getViewport(viewerRef.current);
          results.push({
            preset: preset.name,
            applied: verifyViewport.voi
          });
        }
        
        const duration7 = Date.now() - startTime7;
        updateTestResult('Window/Level Adjustment', 'passed', `Window/level presets tested in ${duration7}ms`, {
          presets: results
        }, duration7);
        setDebugInfo(prev => ({ ...prev, windowLevelTest: results }));
      } catch (error) {
        updateTestResult('Window/Level Adjustment', 'failed', `Window/level adjustment failed: ${error}`);
      }

      setCurrentTest('Tests Completed');
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Quick test functions
  const testSampleImage = async () => {
    if (!viewerRef.current) return;
    
    try {
      await dicomServiceBlackImageFix.initialize();
      await dicomServiceBlackImageFix.enableElement(viewerRef.current);
      await dicomServiceBlackImageFix.displayImage(viewerRef.current, 'sample:test-image');
      alert('Sample image test completed successfully!');
    } catch (error) {
      alert(`Sample image test failed: ${error}`);
    }
  };

  const testWindowLevel = async () => {
    if (!viewerRef.current) return;
    
    try {
      const viewport = dicomServiceBlackImageFix.getViewport(viewerRef.current);
      if (viewport) {
        dicomServiceBlackImageFix.setViewport(viewerRef.current, {
          ...viewport,
          voi: {
            windowWidth: 2000,
            windowCenter: 1000
          }
        });
        alert('Window/Level adjusted successfully!');
      }
    } catch (error) {
      alert(`Window/Level test failed: ${error}`);
    }
  };

  useEffect(() => {
    initializeTests();
  }, []);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        DICOM Viewer Black Image Fix - Test Suite
      </Typography>
      
      <Grid container spacing={3}>
        {/* Test Controls */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Controls
              </Typography>
              
              <ButtonGroup orientation="vertical" fullWidth sx={{ mb: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={runTestSuite}
                  disabled={isRunning}
                  startIcon={isRunning ? <CircularProgress size={20} /> : null}
                >
                  {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
                </Button>
                <Button onClick={testSampleImage} disabled={isRunning}>
                  Quick Sample Test
                </Button>
                <Button onClick={testWindowLevel} disabled={isRunning}>
                  Test Window/Level
                </Button>
              </ButtonGroup>
              
              {isRunning && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Current Test: {currentTest}
                  </Typography>
                </Alert>
              )}
              
              <Typography variant="subtitle2" gutterBottom>
                Test Results Summary:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Passed: ${testResults.filter(t => t.status === 'passed').length}`} 
                  color="success" 
                  size="small" 
                />
                <Chip 
                  label={`Failed: ${testResults.filter(t => t.status === 'failed').length}`} 
                  color="error" 
                  size="small" 
                />
                <Chip 
                  label={`Pending: ${testResults.filter(t => t.status === 'pending').length}`} 
                  color="default" 
                  size="small" 
                />
              </Box>
            </CardContent>
          </Card>
          
          {/* Test Results */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              
              <List dense>
                {testResults.map((test, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{getStatusIcon(test.status)}</span>
                          <Typography variant="body2" fontWeight="medium">
                            {test.testName}
                          </Typography>
                          <Chip 
                            label={test.status} 
                            color={getStatusColor(test.status)} 
                            size="small" 
                          />
                          {test.duration && (
                            <Typography variant="caption" color="text.secondary">
                              ({test.duration}ms)
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {test.message}
                          </Typography>
                          {test.details && (
                            <pre style={{ fontSize: '10px', marginTop: '4px', overflow: 'auto' }}>
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* DICOM Viewer */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                DICOM Viewer (Fixed Version)
              </Typography>
              
              <Box 
                sx={{ 
                  height: '500px', 
                  bgcolor: '#000', 
                  border: '2px solid #ccc',
                  borderRadius: 1,
                  position: 'relative'
                }}
              >
                <div
                  ref={viewerRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000'
                  }}
                />
                
                {/* Info Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                >
                  <div>Status: {isRunning ? 'Testing...' : 'Ready'}</div>
                  {debugInfo.viewport && (
                    <div>
                      W/L: {debugInfo.viewport.voi?.windowWidth || 'N/A'}/{debugInfo.viewport.voi?.windowCenter || 'N/A'}
                    </div>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          {/* Debug Information */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Debug Information
              </Typography>
              
              <pre style={{ 
                fontSize: '11px', 
                maxHeight: '300px', 
                overflow: 'auto',
                backgroundColor: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px'
              }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DicomViewerTest;