/**
 * ViewerCore - Core DICOM rendering and viewport management
 * 
 * This component handles:
 * - Canvas rendering (2D/WebGL)
 * - Viewport transformations (zoom, pan, rotation)
 * - Image display and windowing
 * - Mouse/touch interactions
 * - Progressive loading display
 * 
 * Extracted from UnifiedDicomViewer for better separation of concerns
 */

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, startTransition } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { ViewerState } from '../types/ViewerTypes';

export interface ViewerCoreProps {
  state: ViewerState;
  onStateChange: (updates: Partial<ViewerState>) => void;
  onError?: (error: string) => void;
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;
  width?: number;
  height?: number;
}

export interface ViewerCoreRef {
  getCanvas: () => HTMLCanvasElement | null;
  getWebGLContext: () => WebGL2RenderingContext | null;
  render: () => void;
  resetView: () => void;
  fitToWindow: () => void;
  exportImage: () => string | null;
}

const ViewerCore = forwardRef<ViewerCoreRef, ViewerCoreProps>(({
  state,
  onStateChange,
  onError,
  enableWebGL = true,
  enableProgressiveLoading = true,
  width = 800,
  height = 600
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglContextRef = useRef<WebGL2RenderingContext | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize canvas contexts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    try {
      // Try WebGL first if enabled
      if (enableWebGL) {
        const webglContext = canvas.getContext('webgl2', {
          alpha: false,
          antialias: true,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        }) as WebGL2RenderingContext;

        if (webglContext) {
          webglContextRef.current = webglContext;
          console.log('🎨 [ViewerCore] WebGL2 context initialized');
          
          startTransition(() => {
            onStateChange({
              renderingMode: 'webgl'
            });
          });
        } else {
          throw new Error('WebGL2 not supported');
        }
      } else {
        throw new Error('WebGL disabled');
      }
    } catch (error) {
      // Fallback to 2D context
      console.warn('🎨 [ViewerCore] WebGL failed, falling back to 2D:', error);
      const context2d = canvas.getContext('2d');
      if (context2d) {
        contextRef.current = context2d;
        startTransition(() => {
          onStateChange({
            renderingMode: 'software'
          });
        });
      } else {
        onError?.('Failed to initialize canvas context');
      }
    }
  }, [width, height, enableWebGL, onStateChange, onError]);

  // Render current frame
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Add null check for state and currentFrame
    if (!state || state.currentFrame === undefined || state.currentFrame === null) {
      // Show loading or placeholder when state is not ready
      if (webglContextRef.current) {
        const gl = webglContextRef.current;
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      } else if (contextRef.current) {
        const ctx = contextRef.current;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Show loading text
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Initializing...', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    const currentImageIndex = state.currentFrame;
    const imageElement = state.loadedImages?.[currentImageIndex];
    
    if (!imageElement) {
      // Show loading or placeholder
      if (webglContextRef.current) {
        const gl = webglContextRef.current;
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      } else if (contextRef.current) {
        const ctx = contextRef.current;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Show loading text
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    try {
      if (webglContextRef.current) {
        renderWebGL(imageElement);
      } else if (contextRef.current) {
        render2D(imageElement);
      }
    } catch (error) {
      console.error('🎨 [ViewerCore] Render error:', error?.message || error?.toString() || JSON.stringify(error));
      onError?.(`Rendering failed: ${error.message}`);
    }
  }, [state?.currentFrame, state?.loadedImages, state?.zoom, state?.pan, state?.rotation, state?.windowWidth, state?.windowCenter, state?.invert]);

  // WebGL rendering
  const renderWebGL = useCallback((imageElement: HTMLImageElement) => {
    const gl = webglContextRef.current;
    const canvas = canvasRef.current;
    if (!gl || !canvas) return;

    // Clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Create texture from image
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Upload image data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageElement);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // TODO: Implement WebGL shader program for DICOM windowing and transformations
    // For now, use basic texture rendering
    
    // Cleanup
    gl.deleteTexture(texture);
  }, []);

  // 2D Canvas rendering
  const render2D = useCallback((imageElement: HTMLImageElement) => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(state.pan.x, state.pan.y);
    ctx.scale(state.zoom, state.zoom);
    ctx.rotate((state.rotation * Math.PI) / 180);

    // Calculate image position (centered)
    const imgWidth = imageElement.naturalWidth;
    const imgHeight = imageElement.naturalHeight;
    const x = -imgWidth / 2;
    const y = -imgHeight / 2;

    // Apply windowing (brightness/contrast)
    if (state.windowWidth !== 1 || state.windowCenter !== 0.5) {
      ctx.filter = `brightness(${state.windowCenter * 200}%) contrast(${state.windowWidth * 200}%)`;
    }

    // Apply inversion
    if (state.invert) {
      ctx.filter += ' invert(1)';
    }

    // Draw image
    ctx.drawImage(imageElement, x, y);

    // Restore context state
    ctx.restore();
  }, [state.zoom, state.pan, state.rotation, state.windowWidth, state.windowCenter, state.invert]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Start panning
    const startPan = { x: state.pan.x, y: state.pan.y };
    const startMouse = { x, y };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - rect.left;
      const newY = moveEvent.clientY - rect.top;
      
      const deltaX = newX - startMouse.x;
      const deltaY = newY - startMouse.y;

      startTransition(() => {
        onStateChange({
          pan: {
            x: startPan.x + deltaX,
            y: startPan.y + deltaY
          }
        });
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [state.pan, onStateChange]);

  // Wheel event handler for zooming
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, state.zoom * zoomFactor));
    
    startTransition(() => {
      onStateChange({ zoom: newZoom });
    });
  }, [state.zoom, onStateChange]);

  // Reset view to default
  const resetView = useCallback(() => {
    startTransition(() => {
      onStateChange({
        zoom: 1,
        pan: { x: 0, y: 0 },
        rotation: 0,
        windowWidth: 1,
        windowCenter: 0.5,
        invert: false
      });
    });
  }, [onStateChange]);

  // Fit image to window
  const fitToWindow = useCallback(() => {
    const canvas = canvasRef.current;
    const currentImage = state.loadedImages[state.currentFrame];
    
    if (!canvas || !currentImage) return;

    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = currentImage.naturalWidth / currentImage.naturalHeight;
    
    let zoom: number;
    if (imageAspect > canvasAspect) {
      // Image is wider than canvas
      zoom = canvas.width / currentImage.naturalWidth;
    } else {
      // Image is taller than canvas
      zoom = canvas.height / currentImage.naturalHeight;
    }

    startTransition(() => {
      onStateChange({
        zoom: zoom * 0.9, // Add 10% padding
        pan: { x: 0, y: 0 },
        rotation: 0
      });
    });
  }, [state.loadedImages, state.currentFrame, onStateChange]);

  // Export current view as image
  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    try {
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('🎨 [ViewerCore] Export failed:', error);
      return null;
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getWebGLContext: () => webglContextRef.current,
    render,
    resetView,
    fitToWindow,
    exportImage
  }), [render, resetView, fitToWindow, exportImage]);

  // Render on state changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          cursor: 'grab',
          display: 'block'
        }}
      />
      
      {/* Loading overlay */}
      {state.isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1
          }}
        >
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Error overlay */}
      {state.error && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 2
          }}
        >
          <Alert severity="error" onClose={() => startTransition(() => onStateChange({ error: null }))}>
            {state.error}
          </Alert>
        </Box>
      )}
    </Box>
  );
});

ViewerCore.displayName = 'ViewerCore';

export default ViewerCore;