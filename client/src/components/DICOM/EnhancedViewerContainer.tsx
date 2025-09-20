/**
 * Enhanced Viewer Container
 * Integrates the Enhanced Viewer Manager with existing DICOM viewers
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, Alert, CircularProgress, Fade, Backdrop,
  Snackbar, Typography, Card, CardContent
} from '@mui/material';
import { useViewerManager } from '../../hooks/useViewerManager';
import ViewerModeSelector from './ViewerModeSelector';

// Import existing viewers
import SimpleDicomViewer from './SimpleDicomViewer';
import MultiFrameDicomViewer from './MultiFrameDicomViewer';
import ComprehensiveDicomViewer from './ComprehensiveDicomViewer';

import type { Study } from '../../types';

interface EnhancedViewerContainerProps {
  study: Study;
  initialMode?: string;
  onError?: (error: string) => void;
  onModeChange?: (modeId: string) => void;
  showModeSelector?: boolean;
  enableAutoOptimization?: boolean;
}

const EnhancedViewerContainer: React.FC<EnhancedViewerContainerProps> = ({
  study,
  initialMode,
  onError,
  onModeChange,
  showModeSelector = true,
  enableAutoOptimization = true
}) => {
  const {
    manager,
    currentMode,
    currentState,
    isInitialized,
    isLoading,
    error,
    switchMode,
    updateState,
    getOptimalMode
  } = useViewerManager({
    config: {
      enableStatePreservation: true,
      enableGracefulDegradation: true,
      enablePerformanceMonitoring: true,
      enableAutoOptimization: enableAutoOptimization
    }
  });

  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Initialize with optimal or specified mode
  useEffect(() => {
    if (isInitialized && !currentMode) {
      const initializeMode = async () => {
        let targetMode = initialMode;
        
        if (!targetMode && enableAutoOptimization) {
          const optimal = getOptimalMode();
          targetMode = optimal?.id || 'simple';
        }
        
        if (!targetMode) {
          targetMode = 'simple';
        }

        console.log('🎛️ [EnhancedViewerContainer] Initializing with mode:', targetMode);
        await switchMode(targetMode);
      };

      initializeMode();
    }
  }, [isInitialized, currentMode, initialMode, enableAutoOptimization, getOptimalMode, switchMode]);

  // Handle mode changes
  const handleModeChange = useCallback(async (modeId: string) => {
    setIsTransitioning(true);
    setViewerError(null);

    try {
      const success = await switchMode(modeId, { preserveState: true });
      
      if (success) {
        setShowSuccessMessage(true);
        if (onModeChange) {
          onModeChange(modeId);
        }
        console.log('🎛️ [EnhancedViewerContainer] Successfully switched to mode:', modeId);
      } else {
        setViewerError(`Failed to switch to ${modeId} mode`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mode switch failed';
      setViewerError(errorMessage);
      console.error('🎛️ [EnhancedViewerContainer] Mode switch error:', err);
    } finally {
      setIsTransitioning(false);
    }
  }, [switchMode, onModeChange]);

  // Handle viewer errors
  const handleViewerError = useCallback((errorMessage: string) => {
    setViewerError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }

    // Update error count in state
    if (currentState) {
      updateState({
        session: {
          ...currentState.session,
          errorCount: currentState.session.errorCount + 1
        }
      });
    }
  }, [onError, currentState, updateState]);

  // Render appropriate viewer based on current mode
  const renderViewer = useMemo(() => {
    if (!currentMode || !isInitialized) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      );
    }

    const viewerProps = {
      study,
      onError: handleViewerError,
      // Pass current state for state preservation
      initialState: currentState ? {
        zoom: currentState.viewport.zoom,
        rotation: currentState.viewport.rotation,
        brightness: currentState.viewport.windowLevel.center,
        contrast: currentState.viewport.windowLevel.width,
        pan: currentState.viewport.pan,
        currentSlice: currentState.currentSliceIndex
      } : undefined
    };

    switch (currentMode.component) {
      case 'SimpleDicomViewer':
        return <SimpleDicomViewer {...viewerProps} />;
      
      case 'MultiFrameDicomViewer':
        return <MultiFrameDicomViewer {...viewerProps} />;
      
      case 'ComprehensiveDicomViewer':
        return <ComprehensiveDicomViewer {...viewerProps} />;
      
      default:
        return (
          <Alert severity="warning">
            Unknown viewer component: {currentMode.component}
          </Alert>
        );
    }
  }, [currentMode, isInitialized, study, handleViewerError, currentState]);

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Initializing Enhanced Viewer...
        </Typography>
      </Box>
    );
  }

  // Show initialization error
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to initialize viewer: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Mode Selector */}
      {showModeSelector && (
        <Box sx={{ mb: 2 }}>
          <ViewerModeSelector
            onModeChange={handleModeChange}
            showCapabilities={true}
            showSystemHealth={true}
          />
        </Box>
      )}

      {/* Viewer Error Display */}
      {viewerError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setViewerError(null)}
        >
          {viewerError}
        </Alert>
      )}

      {/* Current Mode Info */}
      {currentMode && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Active Mode: <strong>{currentMode.name}</strong> | 
              Capabilities: {currentMode.capabilities.filter(cap => cap.enabled).length} enabled | 
              Performance: CPU {(currentMode.capabilities.reduce((sum, cap) => sum + cap.performance.cpuUsage, 0) * 100).toFixed(0)}%, 
              Memory {(currentMode.capabilities.reduce((sum, cap) => sum + cap.performance.memoryUsage, 0) * 100).toFixed(0)}%
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Viewer Container */}
      <Paper 
        elevation={2} 
        sx={{ 
          position: 'relative',
          overflow: 'hidden',
          minHeight: 400
        }}
      >
        <Fade in={!isTransitioning} timeout={300}>
          <Box>
            {renderViewer}
          </Box>
        </Fade>

        {/* Transition Overlay */}
        <Backdrop
          open={isTransitioning}
          sx={{ 
            position: 'absolute',
            zIndex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <CircularProgress color="inherit" />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Switching viewer mode...
            </Typography>
          </Box>
        </Backdrop>
      </Paper>

      {/* Success Message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        message={`Switched to ${currentMode?.name} mode`}
      />
    </Box>
  );
};

export default EnhancedViewerContainer;