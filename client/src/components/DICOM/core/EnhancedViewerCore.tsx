import React, { useRef, useEffect, useCallback, useState, startTransition } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { RenderingEngine, Types, Enums } from '@cornerstonejs/core';
import { ViewerState } from '../types/ViewerTypes';

// For now, let's use a simplified approach without the problematic StackScrollMouseWheelTool
// We'll implement basic functionality first and add advanced scrolling later
const { 
  PanTool, 
  ZoomTool, 
  WindowLevelTool, 
  ToolGroupManager 
} = cornerstoneTools;

interface EnhancedViewerCoreProps {
  dicomFile?: File;
  viewerState: ViewerState;
  onViewerStateChange: (state: Partial<ViewerState>) => void;
  onImageLoad?: (imageData: any) => void;
  onError?: (error: string) => void;
  enableGPUAcceleration?: boolean;
  enableVolumeRendering?: boolean;
  className?: string;
}

interface ViewportInfo {
  viewportId: string;
  element: HTMLDivElement;
  renderingEngine: RenderingEngine;
}

// Interface for the ref handle
interface EnhancedViewerRef {
  resetView: () => void;
  getViewportInfo: () => ViewportInfo | null;
  renderingEngine?: RenderingEngine;
  viewport?: any;
}

export const EnhancedViewerCore = React.forwardRef<EnhancedViewerRef, EnhancedViewerCoreProps>(({
  dicomFile,
  viewerState,
  onViewerStateChange,
  onImageLoad,
  onError,
  enableGPUAcceleration = true,
  enableVolumeRendering = false,
  className
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Initialize state with lazy initialization for React 19 compatibility
  const [isLoading, setIsLoading] = useState(() => false);
  const [error, setError] = useState<string | null>(() => null);
  const [isInitialized, setIsInitialized] = useState(() => false);
  const viewportInfoRef = useRef<ViewportInfo | null>(null);

  // Initialize Cornerstone3D
  const initializeCornerstone = useCallback(async () => {
    try {
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });

      // Initialize Cornerstone3D core (version 1.x syntax)
      await cornerstone.init();

      // Initialize tools
      cornerstoneTools.init();

      // Add tools
      cornerstoneTools.addTool(PanTool);
      cornerstoneTools.addTool(ZoomTool);
      cornerstoneTools.addTool(WindowLevelTool);
      // Note: StackScrollMouseWheelTool will be added in Phase 2 after library updates

      startTransition(() => {
        setIsInitialized(true);
      });
    } catch (err) {
      const errorMessage = `Failed to initialize Cornerstone3D: ${err instanceof Error ? err.message : 'Unknown error'}`;
      startTransition(() => {
        setError(errorMessage);
      });
      onError?.(errorMessage);
    } finally {
      startTransition(() => {
        setIsLoading(false);
      });
    }
  }, [enableGPUAcceleration, onError]);

  // Create viewport and rendering engine
  const createViewport = useCallback(async () => {
    if (!canvasRef.current || !isInitialized) return;

    try {
      const element = canvasRef.current;
      const viewportId = 'enhanced-viewport-' + Date.now();
      
      // Create rendering engine
      const renderingEngine = new RenderingEngine(viewportId + '-engine');

      // Create viewport
      const viewportInput = {
        viewportId,
        type: enableVolumeRendering ? Enums.ViewportType.VOLUME_3D : Enums.ViewportType.STACK,
        element,
        defaultOptions: {
          background: [0, 0, 0] as Types.Point3,
          orientation: Enums.OrientationAxis.AXIAL,
        },
      };

      renderingEngine.enableElement(viewportInput);

      viewportInfoRef.current = {
        viewportId,
        element,
        renderingEngine
      };

      // Set up tool group
      const toolGroup = ToolGroupManager.createToolGroup('enhanced-tool-group');
      
      if (toolGroup) {
          toolGroup.addTool(PanTool.toolName);
          toolGroup.addTool(ZoomTool.toolName);
          toolGroup.addTool(WindowLevelTool.toolName);
          // Note: StackScrollMouseWheelTool will be added in Phase 2

          // Set tool modes
          toolGroup.setToolActive(PanTool.toolName, {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
          });
          toolGroup.setToolActive(ZoomTool.toolName, {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
          });
          toolGroup.setToolActive(WindowLevelTool.toolName, {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
          });
          // Note: StackScrollMouseWheelTool activation will be added in Phase 2

        // Add viewport to tool group
        toolGroup.addViewport(viewportId, renderingEngine.id);
      }

    } catch (err) {
      const errorMessage = `Failed to create viewport: ${err instanceof Error ? err.message : 'Unknown error'}`;
      startTransition(() => {
        setError(errorMessage);
      });
      onError?.(errorMessage);
    }
  }, [isInitialized, enableVolumeRendering, onError]);

  // Load DICOM image
  const loadDicomImage = useCallback(async () => {
    if (!dicomFile || !viewportInfoRef.current) return;

    try {
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });

      const { viewportId, renderingEngine } = viewportInfoRef.current;
      const viewport = renderingEngine.getViewport(viewportId);

      // Create image URL from file
      const imageUrl = URL.createObjectURL(dicomFile);
      
      // Load image using Cornerstone3D
      const imageId = 'web:' + imageUrl;
      
      if (enableVolumeRendering) {
        // Volume rendering mode
        const volume = await cornerstone.volumeLoader.createAndCacheVolume('volume-1', {
          imageIds: [imageId],
        });
        
        await volume.load();
        
        if (viewport && 'setVolumes' in viewport) {
          // Cast to VolumeViewport to access setVolumes method
          const volumeViewport = viewport as Types.IVolumeViewport;
          await volumeViewport.setVolumes([{ volumeId: 'volume-1' }]);
        }
      } else {
        // Stack rendering mode
        if (viewport && 'setStack' in viewport) {
          // Cast to StackViewport to access setStack method
          const stackViewport = viewport as Types.IStackViewport;
          await stackViewport.setStack([imageId]);
        }
      }

      // Apply viewer state
      if (viewport) {
        const camera = viewport.getCamera();
        
        // Apply zoom
        if (viewerState.zoom !== 1) {
          viewport.setZoom(viewerState.zoom);
        }

        // Apply pan
        if (viewerState.pan.x !== 0 || viewerState.pan.y !== 0) {
          const currentPan = camera.position;
          viewport.setCamera({
            ...camera,
            position: [
              currentPan[0] + viewerState.pan.x,
              currentPan[1] + viewerState.pan.y,
              currentPan[2]
            ] as Types.Point3
          });
        }

        // Apply window/level
        if (viewerState.windowWidth && viewerState.windowCenter) {
          if ('setProperties' in viewport) {
            // Cast to appropriate viewport type to access setProperties method
            const typedViewport = viewport as any;
            typedViewport.setProperties({
              voiRange: {
                lower: viewerState.windowCenter - viewerState.windowWidth / 2,
                upper: viewerState.windowCenter + viewerState.windowWidth / 2,
              }
            });
          }
        }

        viewport.render();
      }

      // Clean up URL
      URL.revokeObjectURL(imageUrl);

      onImageLoad?.(dicomFile);

    } catch (err) {
      const errorMessage = `Failed to load DICOM image: ${err instanceof Error ? err.message : 'Unknown error'}`;
      startTransition(() => {
        setError(errorMessage);
      });
      onError?.(errorMessage);
    } finally {
      startTransition(() => {
        setIsLoading(false);
      });
    }
  }, [dicomFile, viewerState, enableVolumeRendering, onImageLoad, onError]);

  // Update viewport when viewer state changes
  const updateViewport = useCallback(() => {
    if (!viewportInfoRef.current) return;

    try {
      const { viewportId, renderingEngine } = viewportInfoRef.current;
      const viewport = renderingEngine.getViewport(viewportId);

      if (viewport) {
        // Update zoom
        viewport.setZoom(viewerState.zoom);

        // Update window/level
        if (viewerState.windowWidth && viewerState.windowCenter && 'setProperties' in viewport) {
          // Cast to appropriate viewport type to access setProperties method
          const typedViewport = viewport as any;
          typedViewport.setProperties({
            voiRange: {
              lower: viewerState.windowCenter - viewerState.windowWidth / 2,
              upper: viewerState.windowCenter + viewerState.windowWidth / 2,
            }
          });
        }

        viewport.render();
      }
    } catch (err) {
      console.warn('Failed to update viewport:', err);
    }
  }, [viewerState]);

  // Initialize on mount
  useEffect(() => {
    initializeCornerstone();

    return () => {
      // Cleanup
      if (viewportInfoRef.current) {
        try {
          const { renderingEngine } = viewportInfoRef.current;
          renderingEngine.destroy();
        } catch (err) {
          console.warn('Error during cleanup:', err);
        }
      }
    };
  }, [initializeCornerstone]);

  // Create viewport when initialized
  useEffect(() => {
    if (isInitialized) {
      createViewport();
    }
  }, [isInitialized, createViewport]);

  // Load image when file changes
  useEffect(() => {
    if (dicomFile && viewportInfoRef.current) {
      loadDicomImage();
    }
  }, [dicomFile, loadDicomImage]);

  // Update viewport when state changes
  useEffect(() => {
    updateViewport();
  }, [updateViewport]);

  // Public methods for external control
  const resetView = useCallback(() => {
    if (viewportInfoRef.current) {
      const { viewportId, renderingEngine } = viewportInfoRef.current;
      const viewport = renderingEngine.getViewport(viewportId);
      if (viewport) {
        viewport.resetCamera();
        viewport.render();
      }
    }
  }, []);

  const getViewportInfo = useCallback(() => {
    return viewportInfoRef.current;
  }, []);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    resetView,
    getViewportInfo,
    renderingEngine: viewportInfoRef.current?.renderingEngine,
    viewport: viewportInfoRef.current ? 
      viewportInfoRef.current.renderingEngine.getViewport(viewportInfoRef.current.viewportId) : 
      null
  }));

  return (
    <Box 
      className={className}
      sx={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        minHeight: '400px',
        backgroundColor: '#000'
      }}
    >
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            right: 16, 
            zIndex: 1000 
          }}
        >
          {error}
        </Alert>
      )}
      
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            color: 'white'
          }}
        >
          <CircularProgress size={24} />
          <span>Loading DICOM viewer...</span>
        </Box>
      )}

      <div
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />
    </Box>
  );
});

export default EnhancedViewerCore;