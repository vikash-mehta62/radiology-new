import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

const DicomTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Starting test...');
  const [logs, setLogs] = useState<string[]>([]);
  const elementRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const runTest = async () => {
      try {
        addLog('🔄 Starting DICOM test...');
        setStatus('Testing cornerstone library...');

        // Test 1: Check if cornerstone is available
        addLog(`📚 Cornerstone available: ${typeof cornerstone}`);
        addLog(`📚 Enable function: ${typeof cornerstone.enable}`);
        addLog(`📚 LoadImage function: ${typeof cornerstone.loadImage}`);
        
        // Test 2: Check WADO Image Loader
        addLog(`📚 WADO Image Loader: ${typeof cornerstoneWADOImageLoader}`);
        addLog(`📚 DICOM Parser: ${typeof dicomParser}`);
        
        // Test 3: Initialize WADO Image Loader
        setStatus('Initializing WADO Image Loader...');
        try {
          if (typeof (cornerstoneWADOImageLoader as any).external === 'function') {
            (cornerstoneWADOImageLoader as any).external({
              cornerstone: cornerstone,
              dicomParser: dicomParser
            });
          } else {
            // Fallback to old API
            (cornerstoneWADOImageLoader as any).external.cornerstone = cornerstone;
            (cornerstoneWADOImageLoader as any).external.dicomParser = dicomParser;
          }
          
          const config = {
            maxWebWorkers: 1,
            startWebWorkersOnDemand: false,
            taskConfiguration: {
              decodeTask: {
                initializeCodecsOnStartup: false,
                strict: false
              }
            }
          };
          
          if ((cornerstoneWADOImageLoader as any).webWorkerManager) {
            (cornerstoneWADOImageLoader as any).webWorkerManager.initialize(config);
          }
          addLog('✅ WADO Image Loader initialized');
        } catch (wadiInitError) {
          addLog(`⚠️ WADO Image Loader init failed: ${wadiInitError}`);
        }
        
        // Test 4: Check element
        setStatus('Testing element...');
        if (!elementRef.current) {
          throw new Error('Element ref is null');
        }
        
        const element = elementRef.current;
        addLog(`📏 Element: ${element.tagName}, ${element.offsetWidth}x${element.offsetHeight}`);
        
        // Test 5: Enable element
        setStatus('Enabling cornerstone element...');
        cornerstone.enable(element);
        addLog('✅ Element enabled successfully');
        
        // Test 6: Verify element
        const enabledElement = cornerstone.getEnabledElement(element);
        addLog(`🔍 Enabled element: canvas=${!!enabledElement.canvas}, viewport=${!!enabledElement.viewport}`);
        
        // Test 7: Create sample image
        setStatus('Creating sample image...');
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        const imageData = context.createImageData(256, 256);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.floor(Math.random() * 255);
          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
          data[i + 3] = 255;  // A
        }
        
        context.putImageData(imageData, 0, 0);
        
        const pixelData = new Uint8Array(256 * 256);
        for (let i = 0; i < pixelData.length; i++) {
          pixelData[i] = data[i * 4];
        }
        
        const sampleImage = {
          imageId: 'test:sample',
          minPixelValue: 0,
          maxPixelValue: 255,
          slope: 1,
          intercept: 0,
          windowCenter: 128,
          windowWidth: 256,
          render: undefined,
          getPixelData: () => pixelData,
          rows: 256,
          columns: 256,
          height: 256,
          width: 256,
          color: false,
          columnPixelSpacing: 1,
          rowPixelSpacing: 1,
          sizeInBytes: 256 * 256,
          invert: false,
          voiLUT: undefined,
          modalityLUT: undefined,
          photometricInterpretation: 'MONOCHROME2',
          planarConfiguration: 0,
          pixelRepresentation: 0,
          smallestPixelValue: 0,
          largestPixelValue: 255
        };
        
        addLog('✅ Sample image created');
        
        // Test 8: Display image
        setStatus('Displaying image...');
        cornerstone.displayImage(element, sampleImage);
        addLog('✅ Image displayed successfully!');
        
        setStatus('✅ All tests passed!');
        
      } catch (error) {
        addLog(`❌ Test failed: ${error}`);
        setStatus(`❌ Test failed: ${error}`);
      }
    };
    
    runTest();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        DICOM Cornerstone Test
      </Typography>
      
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
        Status: {status}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Test Canvas
          </Typography>
          <div
            ref={elementRef}
            style={{
              width: '256px',
              height: '256px',
              border: '2px solid #ccc',
              backgroundColor: '#000'
            }}
          />
        </Paper>
        
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Test Log
          </Typography>
          <Box sx={{ maxHeight: '300px', overflow: 'auto', fontSize: '0.875rem' }}>
            {logs.map((log, index) => (
              <Typography key={index} sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                {log}
              </Typography>
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default DicomTest;