/**
 * Navigation3D Debug Test - Minimal working example
 */

import React, { useState } from 'react';
import { Box, Typography, Paper, Slider, Button, Stack, Alert } from '@mui/material';
import { 
  Navigation3DState, 
  getDefaultNavigation3DState, 
  createCompleteNavigation3DState 
} from './types/Navigation3DTypes';

const Navigation3DDebugTest: React.FC = () => {
  const maxSlices = { axial: 100, sagittal: 100, coronal: 100 };
  const [navigationState, setNavigationState] = useState<Navigation3DState>(() => 
    getDefaultNavigation3DState(maxSlices)
  );

  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handlePitchChange = (value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    const clampedValue = Math.max(-180, Math.min(180, numValue));
    
    addTestResult(`Pitch changed to ${clampedValue}°`);
    
    const newState = createCompleteNavigation3DState({
      ...navigationState,
      pitch: clampedValue
    }, maxSlices);
    
    setNavigationState(newState);
    console.log('🎯 Pitch changed:', clampedValue, 'New state:', newState);
  };

  const handleYawChange = (value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    const clampedValue = Math.max(-180, Math.min(180, numValue));
    
    addTestResult(`Yaw changed to ${clampedValue}°`);
    
    const newState = createCompleteNavigation3DState({
      ...navigationState,
      yaw: clampedValue
    }, maxSlices);
    
    setNavigationState(newState);
    console.log('🎯 Yaw changed:', clampedValue, 'New state:', newState);
  };

  const handleRollChange = (value: number | number[]) => {
    const numValue = Array.isArray(value) ? value[0] : value;
    const clampedValue = Math.max(-180, Math.min(180, numValue));
    
    addTestResult(`Roll changed to ${clampedValue}°`);
    
    const newState = createCompleteNavigation3DState({
      ...navigationState,
      roll: clampedValue
    }, maxSlices);
    
    setNavigationState(newState);
    console.log('🎯 Roll changed:', clampedValue, 'New state:', newState);
  };

  const handleReset = () => {
    const defaultState = getDefaultNavigation3DState(maxSlices);
    setNavigationState(defaultState);
    addTestResult('Reset to default state');
    console.log('🔄 Reset to default state:', defaultState);
  };

  const testPreset = (presetName: string, pitch: number, yaw: number, roll: number) => {
    const newState = createCompleteNavigation3DState({
      ...navigationState,
      pitch,
      yaw,
      roll,
      currentPreset: presetName
    }, maxSlices);
    
    setNavigationState(newState);
    addTestResult(`Applied preset: ${presetName} (P:${pitch}° Y:${yaw}° R:${roll}°)`);
    console.log('🎯 Applied preset:', presetName, newState);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🔧 Navigation3D Debug Test
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This is a minimal test to verify Navigation3D controls are working. 
        Move the sliders and check the console for logs.
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current State
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Pitch:</strong> {navigationState.pitch}°
          </Typography>
          <Typography variant="body2">
            <strong>Yaw:</strong> {navigationState.yaw}°
          </Typography>
          <Typography variant="body2">
            <strong>Roll:</strong> {navigationState.roll}°
          </Typography>
          <Typography variant="body2">
            <strong>Preset:</strong> {navigationState.currentPreset}
          </Typography>
        </Stack>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Pitch (X-axis): {navigationState.pitch}°
          </Typography>
          <Slider
            value={navigationState.pitch}
            onChange={(_, value) => handlePitchChange(value)}
            min={-180}
            max={180}
            step={1}
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            Yaw (Y-axis): {navigationState.yaw}°
          </Typography>
          <Slider
            value={navigationState.yaw}
            onChange={(_, value) => handleYawChange(value)}
            min={-180}
            max={180}
            step={1}
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            Roll (Z-axis): {navigationState.roll}°
          </Typography>
          <Slider
            value={navigationState.roll}
            onChange={(_, value) => handleRollChange(value)}
            min={-180}
            max={180}
            step={1}
            marks={[
              { value: -180, label: '-180°' },
              { value: 0, label: '0°' },
              { value: 180, label: '180°' }
            ]}
            sx={{ mb: 2 }}
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => testPreset('anterior', 0, 0, 0)}
          >
            Anterior
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => testPreset('posterior', 0, 180, 0)}
          >
            Posterior
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => testPreset('left-lateral', 0, -90, 0)}
          >
            Left Lateral
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => testPreset('right-lateral', 0, 90, 0)}
          >
            Right Lateral
          </Button>
          <Button 
            variant="contained" 
            size="small"
            onClick={handleReset}
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Results Log
        </Typography>
        <Box sx={{ 
          maxHeight: 200, 
          overflow: 'auto', 
          bgcolor: 'grey.50', 
          p: 2, 
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.8rem'
        }}>
          {testResults.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No test results yet. Try moving the sliders above.
            </Typography>
          ) : (
            testResults.map((result, index) => (
              <div key={index}>{result}</div>
            ))
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Navigation3DDebugTest;