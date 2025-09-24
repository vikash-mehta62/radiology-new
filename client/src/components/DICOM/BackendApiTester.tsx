/**
 * Backend API Tester Component
 * Test DICOM backend APIs and display results
 */

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Stack, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { ExpandMore, PlayArrow, CheckCircle, Error, Warning } from '@mui/icons-material';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

const BackendApiTester: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<string>('');

  const BASE_URL = 'http://localhost:8000';
  const TEST_PATIENT_ID = 'PAT_PALAK_57F5AE30';
  const TEST_FILENAME = '0002.DCM';

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const testSliceDetection = async (): Promise<any> => {
    const detectionUrl = `${BASE_URL}/dicom/process/${TEST_PATIENT_ID}/${TEST_FILENAME}?output_format=PNG&auto_detect=true&t=${Date.now()}`;
    
    addTestResult({
      name: 'Slice Detection API',
      status: 'pending',
      message: `Testing: ${detectionUrl}`
    });

    try {
      const response = await fetch(detectionUrl);
      
      if (response.ok) {
        const result = await response.json();
        addTestResult({
          name: 'Slice Detection API',
          status: 'success',
          message: `Detected ${result.total_slices || 'unknown'} slices`,
          data: result
        });
        return result;
      } else {
        const errorText = await response.text();
        addTestResult({
          name: 'Slice Detection API',
          status: 'error',
          message: `HTTP ${response.status}: ${errorText}`
        });
        return null;
      }
    } catch (error) {
      addTestResult({
        name: 'Slice Detection API',
        status: 'error',
        message: `Network Error: ${error}`
      });
      return null;
    }
  };

  const testFrameConversion = async (frameIndex: number): Promise<any> => {
    const convertUrl = `${BASE_URL}/dicom/convert/${TEST_PATIENT_ID}/${TEST_FILENAME}?slice=${frameIndex}&t=${Date.now()}`;
    
    addTestResult({
      name: `Frame ${frameIndex} Conversion`,
      status: 'pending',
      message: `Testing: ${convertUrl}`
    });

    try {
      const response = await fetch(convertUrl);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.png_url) {
          addTestResult({
            name: `Frame ${frameIndex} Conversion`,
            status: 'success',
            message: `Converted successfully: ${result.png_url}`,
            data: result
          });
        } else {
          addTestResult({
            name: `Frame ${frameIndex} Conversion`,
            status: 'warning',
            message: `Conversion failed: ${result.error || 'Unknown error'}`,
            data: result
          });
        }
        return result;
      } else {
        const errorText = await response.text();
        addTestResult({
          name: `Frame ${frameIndex} Conversion`,
          status: 'error',
          message: `HTTP ${response.status}: ${errorText}`
        });
        return null;
      }
    } catch (error) {
      addTestResult({
        name: `Frame ${frameIndex} Conversion`,
        status: 'error',
        message: `Network Error: ${error}`
      });
      return null;
    }
  };

  const testImageAccess = async (imageUrl: string): Promise<boolean> => {
    const fullImageUrl = `${BASE_URL}${imageUrl}`;
    
    addTestResult({
      name: 'Image Access Test',
      status: 'pending',
      message: `Testing: ${fullImageUrl}`
    });

    try {
      const response = await fetch(fullImageUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        addTestResult({
          name: 'Image Access Test',
          status: 'success',
          message: `Image accessible: ${blob.size} bytes, ${blob.type}`,
          data: { size: blob.size, type: blob.type }
        });
        return true;
      } else {
        addTestResult({
          name: 'Image Access Test',
          status: 'error',
          message: `HTTP ${response.status}: Cannot access image`
        });
        return false;
      }
    } catch (error) {
      addTestResult({
        name: 'Image Access Test',
        status: 'error',
        message: `Network Error: ${error}`
      });
      return false;
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSummary('');

    try {
      // Test 1: Slice Detection
      const detectionResult = await testSliceDetection();
      
      // Test 2: Frame Conversions
      const framesToTest = [0, 1, 2, 10, 50];
      const conversionResults = [];
      
      for (const frameIndex of framesToTest) {
        const result = await testFrameConversion(frameIndex);
        conversionResults.push({ frameIndex, result });
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Test 3: Image Access
      const successfulConversions = conversionResults.filter(r => r.result?.success && r.result?.png_url);
      if (successfulConversions.length > 0) {
        await testImageAccess(successfulConversions[0].result.png_url);
      }
      
      // Generate summary
      const successCount = conversionResults.filter(r => r.result?.success).length;
      const totalTests = conversionResults.length;
      
      setSummary(`
        Detection: ${detectionResult ? 'Success' : 'Failed'}
        Frame Conversions: ${successCount}/${totalTests} successful
        Image Access: ${successfulConversions.length > 0 ? 'Success' : 'Failed'}
      `);
      
    } catch (error) {
      addTestResult({
        name: 'Test Suite',
        status: 'error',
        message: `Test suite failed: ${error}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      default: return <CircularProgress size={20} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🧪 Backend API Tester
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This tool tests the DICOM backend APIs to identify conversion issues.
        Make sure the backend server is running on http://localhost:8000
      </Alert>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={runFullTest}
          disabled={isRunning}
          startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrow />}
        >
          {isRunning ? 'Running Tests...' : 'Run Full Test'}
        </Button>
      </Stack>

      {summary && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Test Summary:</Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{summary}</pre>
        </Alert>
      )}

      {testResults.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">
              Test Results ({testResults.length} tests)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Test Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getStatusIcon(result.status)}
                          <Chip 
                            label={result.status.toUpperCase()} 
                            size="small" 
                            color={getStatusColor(result.status) as any}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {result.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {result.data && (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {JSON.stringify(result.data, null, 2).substring(0, 100)}...
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default BackendApiTester;