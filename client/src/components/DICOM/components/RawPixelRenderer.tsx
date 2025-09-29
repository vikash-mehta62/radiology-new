/**
 * Raw Pixel Renderer Component
 * 
 * Handles client-side rendering of raw DICOM pixel data using Web Workers
 * and HTML Canvas for optimal performance and scalability.
 */

import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { getDicomWorkerService } from '../../../services/dicomWorkerService';

export interface RawPixelRendererProps {
  patientId: string;
  filename: string;
  frame?: number;
  windowCenter?: number;
  windowWidth?: number;
  width?: number;
  height?: number;
  onLoad?: (success: boolean, error?: string) => void;
  onRenderComplete?: (renderTime: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface RawPixelRendererRef {
  getCanvas: () => HTMLCanvasElement | null;
  refresh: () => void;
  updateWindowing: (windowCenter: number, windowWidth: number) => void;
  exportImage: () => string | null;
}

interface RenderState {
  isLoading: boolean;
  error: string | null;
  renderTime: number | null;
  imageData: {
    width: number;
    height: number;
    pixelFormat: string;
  } | null;
}

const RawPixelRenderer = forwardRef<RawPixelRendererRef, RawPixelRendererProps>(({
  patientId,
  filename,
  frame = 0,
  windowCenter,
  windowWidth,
  width = 512,
  height = 512,
  onLoad,
  onRenderComplete,
  className,
  style
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerService = getDicomWorkerService();
  
  const [state, setState] = useState<RenderState>({
    isLoading: false,
    error: null,
    renderTime: null,
    imageData: null
  });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    refresh: loadAndRenderPixelData,
    updateWindowing: (newWindowCenter: number, newWindowWidth: number) => {
      loadAndRenderPixelData(newWindowCenter, newWindowWidth);
    },
    exportImage: () => {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL('image/png') : null;
    }
  }), []);

  /**
   * Fetch raw pixel data from the server
   */
  const fetchRawPixelData = useCallback(async (
    wc?: number,
    ww?: number
  ): Promise<{
    rawData: ArrayBuffer;
    metadata: {
      width: number;
      height: number;
      pixelFormat: string;
      bytes_per_pixel: number;
      data_size: number;
    };
  }> => {
    const params = new URLSearchParams({
      frame: frame.toString(),
      ...(wc !== undefined && { window_center: wc.toString() }),
      ...(ww !== undefined && { window_width: ww.toString() })
    });

    const response = await fetch(
      `/api/dicom/pixels/${patientId}/${filename}?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch pixel data: ${response.status} ${response.statusText}`);
    }

    // Read the response as ArrayBuffer
    const buffer = await response.arrayBuffer();
    
    // The first part should be JSON metadata, followed by binary data
    // We need to parse this carefully
    const textDecoder = new TextDecoder();
    const fullText = textDecoder.decode(buffer);
    
    // Find the end of JSON metadata (look for newline followed by binary data)
    const jsonEndIndex = fullText.indexOf('\n');
    if (jsonEndIndex === -1) {
      throw new Error('Invalid response format: no metadata found');
    }
    
    const metadataText = fullText.substring(0, jsonEndIndex);
    const metadata = JSON.parse(metadataText);
    
    if (!metadata.success) {
      throw new Error(metadata.error || 'Failed to extract pixel data');
    }
    
    // Extract binary data (skip the JSON part + newline)
    const jsonByteLength = new TextEncoder().encode(metadataText + '\n').length;
    const rawData = buffer.slice(jsonByteLength);
    
    return { rawData, metadata };
  }, [patientId, filename, frame]);

  /**
   * Load and render pixel data using Web Worker
   */
  const loadAndRenderPixelData = useCallback(async (
    wc: number = windowCenter,
    ww: number = windowWidth
  ) => {
    if (!workerService.isWorkerReady()) {
      setState(prev => ({ ...prev, error: 'Web Worker not ready' }));
      onLoad?.(false, 'Web Worker not ready');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const startTime = performance.now();

    try {
      // Fetch raw pixel data from server
      const { rawData, metadata } = await fetchRawPixelData(wc, ww);
      
      // Update state with image metadata
      setState(prev => ({
        ...prev,
        imageData: {
          width: metadata.width,
          height: metadata.height,
          pixelFormat: metadata.pixel_format
        }
      }));

      // Process pixel data using Web Worker
      const result = await workerService.renderRawPixels(
        rawData,
        metadata.width,
        metadata.height,
        metadata.pixel_format,
        wc,
        ww
      );

      // Render the ImageBitmap to canvas
      const canvas = canvasRef.current;
      if (canvas && result.imageBitmap) {
        // Resize canvas to match image dimensions
        canvas.width = result.width;
        canvas.height = result.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw the ImageBitmap
          ctx.drawImage(result.imageBitmap, 0, 0);
          
          // Clean up the ImageBitmap
          result.imageBitmap.close();
        }
      }

      const renderTime = performance.now() - startTime;
      setState(prev => ({
        ...prev,
        isLoading: false,
        renderTime
      }));

      onLoad?.(true);
      onRenderComplete?.(renderTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      onLoad?.(false, errorMessage);
      console.error('Failed to load and render pixel data:', error);
    }
  }, [patientId, filename, frame, windowCenter, windowWidth, workerService, fetchRawPixelData, onLoad, onRenderComplete]);

  // Load data when component mounts or props change
  useEffect(() => {
    loadAndRenderPixelData();
  }, [patientId, filename, frame, windowCenter, windowWidth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Canvas cleanup is handled automatically
      // Worker cleanup is handled by the service
    };
  }, []);

  return (
    <Box
      className={className}
      style={style}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height,
        minWidth: width,
        backgroundColor: '#000',
        ...style
      }}
    >
      {/* Canvas for rendering */}
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          display: state.isLoading ? 'none' : 'block'
        }}
      />

      {/* Loading indicator */}
      {state.isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" color="white">
            Processing pixel data...
          </Typography>
        </Box>
      )}

      {/* Error display */}
      {state.error && (
        <Alert
          severity="error"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '80%'
          }}
        >
          <Typography variant="body2">
            {state.error}
          </Typography>
        </Alert>
      )}

      {/* Performance info (development only) */}
      {process.env.NODE_ENV === 'development' && state.renderTime && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 1,
            fontSize: '0.75rem'
          }}
        >
          Render: {state.renderTime.toFixed(1)}ms
          {state.imageData && (
            <>
              <br />
              {state.imageData.width}×{state.imageData.height}
              <br />
              {state.imageData.pixelFormat}
            </>
          )}
        </Box>
      )}
    </Box>
  );
});

RawPixelRenderer.displayName = 'RawPixelRenderer';

export default RawPixelRenderer;