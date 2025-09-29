import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { enhancedDicomService } from '../../../services/enhancedDicomService';
import { getDicomWorkerService } from '../../../services/dicomWorkerService';

interface RawPixelRendererProps {
  patientId: string;
  filename: string;
  frame?: number;
  windowCenter?: number;
  windowWidth?: number;
  onLoadStart?: () => void;
  onLoadComplete?: (info: any) => void;
  onRenderComplete?: (renderInfo: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface RawPixelRendererRef {
  refresh: () => void;
  updateWindowing: (windowCenter: number, windowWidth: number) => void;
  exportAsImage: () => string;
  getCanvas: () => HTMLCanvasElement | null;
}

export const RawPixelRenderer = forwardRef<RawPixelRendererRef, RawPixelRendererProps>(
  ({
    patientId,
    filename,
    frame = 0,
    windowCenter = 128,
    windowWidth = 256,
    onLoadStart,
    onLoadComplete,
    onRenderComplete,
    onError,
    className,
    style
  }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageData, setImageData] = useState<any>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      refresh: () => {
        loadAndRender();
      },
      updateWindowing: (newWindowCenter: number, newWindowWidth: number) => {
        if (imageData) {
          renderWithWindowing(imageData, newWindowCenter, newWindowWidth);
        }
      },
      exportAsImage: () => {
        if (canvasRef.current) {
          return canvasRef.current.toDataURL('image/png');
        }
        return '';
      },
      getCanvas: () => canvasRef.current
    }));

    const loadAndRender = async () => {
      if (!patientId || !filename) return;

      setIsLoading(true);
      setError(null);
      onLoadStart?.();

      try {
        const startTime = performance.now();

        // Load raw pixel data
        const imageId = `dicom:${patientId}/${filename}`;
        const result = await enhancedDicomService.loadRawPixelData(
          imageId,
          frame,
          windowCenter,
          windowWidth
        );

        const loadTime = performance.now() - startTime;

        // Store image data for windowing updates
        setImageData(result);

        // Render using Web Worker
        await renderWithWorker(result);

        onLoadComplete?.({
          loadTime,
          dimensions: `${result.metadata.width}x${result.metadata.height}`,
          pixelFormat: result.metadata.pixelFormat,
          dataSize: result.rawData.byteLength
        });

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        console.error('Failed to load and render raw pixel data:', error);
        setError(error.message);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    const renderWithWorker = async (data: any) => {
      if (!canvasRef.current) return;

      const renderStartTime = performance.now();

      try {
        // Use Web Worker to process pixel data
        const result = await getDicomWorkerService().renderRawPixels(
          data.rawData,
          data.metadata.width,
          data.metadata.height,
          data.metadata.pixelFormat || 'uint16',
          windowCenter,
          windowWidth
        );

        // Draw the ImageBitmap to canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx && result.imageBitmap) {
          // Set canvas dimensions
          canvas.width = data.metadata.width;
          canvas.height = data.metadata.height;

          // Clear canvas and draw the processed image
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(result.imageBitmap, 0, 0);

          // Clean up ImageBitmap
          result.imageBitmap.close();
        }

        const renderTime = performance.now() - renderStartTime;

        onRenderComplete?.({
          renderTime,
          method: 'WebWorker',
          dimensions: `${data.metadata.width}x${data.metadata.height}`
        });

      } catch (err) {
        console.error('Web Worker rendering failed, falling back to direct rendering:', err);
        await renderDirect(data);
      }
    };

    const renderWithWindowing = async (data: any, newWindowCenter: number, newWindowWidth: number) => {
      if (!canvasRef.current) return;

      try {
        // Use Web Worker to apply new windowing
        const result = await getDicomWorkerService().renderRawPixels(
          data.rawData,
          data.metadata.width,
          data.metadata.height,
          data.metadata.pixelFormat || 'uint16',
          newWindowCenter,
          newWindowWidth
        );

        // Draw the ImageBitmap to canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx && result.imageBitmap) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(result.imageBitmap, 0, 0);
          result.imageBitmap.close();
        }

      } catch (err) {
        console.error('Windowing update failed:', err);
        setError('Failed to update windowing');
      }
    };

    const renderDirect = async (data: any) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions
      canvas.width = data.metadata.width;
      canvas.height = data.metadata.height;

      // Create ImageData from raw pixel data
      const imageData = ctx.createImageData(data.metadata.width, data.metadata.height);
      
      // Convert raw data to RGBA
      const rawArray = new Uint16Array(data.rawData);
      const pixels = imageData.data;

      for (let i = 0; i < rawArray.length; i++) {
        const pixelValue = rawArray[i];
        
        // Apply basic windowing
        let displayValue = ((pixelValue - windowCenter) / windowWidth + 0.5) * 255;
        displayValue = Math.max(0, Math.min(255, displayValue));

        const pixelIndex = i * 4;
        pixels[pixelIndex] = displayValue;     // R
        pixels[pixelIndex + 1] = displayValue; // G
        pixels[pixelIndex + 2] = displayValue; // B
        pixels[pixelIndex + 3] = 255;          // A
      }

      // Draw to canvas
      ctx.putImageData(imageData, 0, 0);

      onRenderComplete?.({
        renderTime: 0,
        method: 'Direct',
        dimensions: `${data.metadata.width}x${data.metadata.height}`
      });
    };

    // Load and render when props change
    useEffect(() => {
      loadAndRender();
    }, [patientId, filename, frame, windowCenter, windowWidth]);

    return (
      <div className={className} style={style}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            zIndex: 10
          }}>
            🔄 Loading and rendering...
          </div>
        )}
        
        {error && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(231, 76, 60, 0.9)',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            zIndex: 10
          }}>
            ❌ Error: {error}
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: '#000'
          }}
        />
      </div>
    );
  }
);

RawPixelRenderer.displayName = 'RawPixelRenderer';

export default RawPixelRenderer;