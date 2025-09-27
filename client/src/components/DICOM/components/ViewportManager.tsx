/**
 * Viewport Manager Component
 * Manages multiple viewports for 2D, 3D, and MPR viewing in the Unified DICOM Viewer
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Card,
  CardContent,
  Badge,
  Chip,
  LinearProgress,
  Alert,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import {
  ViewComfy,
  ViewCompact,
  ViewArray,
  ViewModule,
  ViewInAr,
  Fullscreen,
  FullscreenExit,
  Sync,
  SyncDisabled,
  Link,
  LinkOff,
  Refresh,
  Error,
  Warning,
  Info,
  CheckCircle,
  Close,
  Maximize,
  Minimize
} from '@mui/icons-material';

// Import viewer components
import ViewerCore from '../core/ViewerCore';
import MPRViewer from '../MPRViewer';

export interface ViewportConfig {
  id: string;
  type: '2d' | '3d' | 'mpr' | 'volume';
  title: string;
  seriesInstanceUID?: string;
  imageIds?: string[];
  orientation?: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  renderingEngine?: string;
  viewportId?: string;
  element?: HTMLElement;
  isActive?: boolean;
  isLoading?: boolean;
  error?: string;
  metadata?: any;
}

export interface ViewportManagerProps {
  // Layout configuration
  layout: 'single' | 'dual' | 'quad' | 'mpr' | '3d' | 'custom' | 'comparison' | 'timeline';
  viewports: ViewportConfig[];
  activeViewportId?: string;
  activeTool?: string;
  
  // Synchronization
  syncEnabled?: boolean;
  linkedViewports?: string[];
  
  // Event handlers
  onLayoutChange?: (layout: string) => void;
  onViewportActivate?: (viewportId: string) => void;
  onViewportClick?: (viewportId: string) => void;
  onViewportSync?: (viewportIds: string[]) => void;
  onViewportLink?: (viewportIds: string[]) => void;
  onViewportClose?: (viewportId: string) => void;
  onViewportMaximize?: (viewportId: string) => void;
  onViewportReset?: (viewportId: string) => void;
  onToolChange?: (tool: string) => void;
  
  // Data
  studyInstanceUID?: string;
  seriesData?: any[];
  imageData?: any[];
  
  // Feature flags
  enableSync?: boolean;
  enableLink?: boolean;
  enableFullscreen?: boolean;
  enableSynchronization?: boolean;
  enableCrosshair?: boolean;
  enableMeasurements?: boolean;
  enableAnnotations?: boolean;
  enablePerformanceOptimization?: boolean;
  showViewportInfo?: boolean;
  showLoadingProgress?: boolean;
  
  // Performance
  maxViewports?: number;
  renderingPriority?: 'quality' | 'performance';
  
  // Styling
  spacing?: number;
  borderRadius?: number;
  elevation?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  sx?: any;
}

// Layout configurations
const LAYOUT_CONFIGS = {
  single: { rows: 1, cols: 1, viewports: 1 },
  dual: { rows: 1, cols: 2, viewports: 2 },
  quad: { rows: 2, cols: 2, viewports: 4 },
  mpr: { rows: 2, cols: 2, viewports: 4, specialized: true },
  '3d': { rows: 1, cols: 1, viewports: 1, specialized: true },
  custom: { rows: 0, cols: 0, viewports: 0 }
};

// MPR orientations
const MPR_ORIENTATIONS = [
  { id: 'axial', label: 'Axial', orientation: 'axial' },
  { id: 'sagittal', label: 'Sagittal', orientation: 'sagittal' },
  { id: 'coronal', label: 'Coronal', orientation: 'coronal' },
  { id: '3d', label: '3D Volume', orientation: 'oblique' }
];

export const ViewportManager: React.FC<ViewportManagerProps> = ({
  layout,
  viewports,
  activeViewportId,
  activeTool,
  syncEnabled = false,
  linkedViewports = [],
  onLayoutChange,
  onViewportActivate,
  onViewportClick,
  onViewportSync,
  onViewportLink,
  onViewportClose,
  onViewportMaximize,
  onViewportReset,
  onToolChange,
  studyInstanceUID,
  seriesData = [],
  imageData = [],
  enableSync = true,
  enableLink = true,
  enableFullscreen = true,
  enableSynchronization = true,
  enableCrosshair = true,
  enableMeasurements = true,
  enableAnnotations = true,
  enablePerformanceOptimization = true,
  showViewportInfo = true,
  showLoadingProgress = true,
  maxViewports = 4,
  renderingPriority = 'quality',
  spacing = 1,
  borderRadius = 1,
  elevation = 1,
  width = '100%',
  height = '100%',
  className,
  sx
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [maximizedViewport, setMaximizedViewport] = useState<string | null>(null);
  const [viewportElements, setViewportElements] = useState<Map<string, HTMLElement>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, number>>(new Map());
  const [errorStates, setErrorStates] = useState<Map<string, string>>(new Map());
  
  // Get layout configuration
  const layoutConfig = useMemo(() => {
    return LAYOUT_CONFIGS[layout as keyof typeof LAYOUT_CONFIGS] || LAYOUT_CONFIGS.single;
  }, [layout]);
  
  // Generate viewport grid
  const viewportGrid = useMemo(() => {
    if (layout === 'mpr') {
      return MPR_ORIENTATIONS.map((orientation, index) => ({
        ...orientation,
        viewport: viewports[index] || {
          id: `mpr-${orientation.id}`,
          type: orientation.id === '3d' ? '3d' : 'mpr' as const,
          title: orientation.label,
          orientation: orientation.orientation as any,
          isActive: activeViewportId === `mpr-${orientation.id}`
        }
      }));
    }
    
    const gridSize = layoutConfig.rows * layoutConfig.cols;
    return Array.from({ length: gridSize }, (_, index) => ({
      id: `viewport-${index}`,
      viewport: viewports[index] || {
        id: `viewport-${index}`,
        type: '2d' as const,
        title: `Viewport ${index + 1}`,
        isActive: activeViewportId === `viewport-${index}`
      }
    }));
  }, [layout, layoutConfig, viewports, activeViewportId]);
  
  // Handle viewport element registration
  const registerViewportElement = useCallback((viewportId: string, element: HTMLElement) => {
    setViewportElements(prev => new Map(prev.set(viewportId, element)));
  }, []);
  
  // Handle viewport activation
  const handleViewportActivate = useCallback((viewportId: string) => {
    onViewportActivate(viewportId);
  }, [onViewportActivate]);
  
  // Handle viewport maximize/minimize
  const handleViewportMaximize = useCallback((viewportId: string) => {
    if (maximizedViewport === viewportId) {
      setMaximizedViewport(null);
    } else {
      setMaximizedViewport(viewportId);
      onViewportMaximize(viewportId);
    }
  }, [maximizedViewport, onViewportMaximize]);
  
  // Handle sync toggle
  const handleSyncToggle = useCallback(() => {
    if (syncEnabled) {
      onViewportSync([]);
    } else {
      const activeViewports = viewports.filter(v => v.isActive).map(v => v.id);
      onViewportSync(activeViewports);
    }
  }, [syncEnabled, viewports, onViewportSync]);
  
  // Handle link toggle
  const handleLinkToggle = useCallback(() => {
    if (linkedViewports.length > 0) {
      onViewportLink([]);
    } else {
      const activeViewports = viewports.filter(v => v.isActive).map(v => v.id);
      onViewportLink(activeViewports);
    }
  }, [linkedViewports, viewports, onViewportLink]);
  
  // Update loading state
  const updateLoadingState = useCallback((viewportId: string, progress: number) => {
    setLoadingStates(prev => new Map(prev.set(viewportId, progress)));
  }, []);
  
  // Update error state
  const updateErrorState = useCallback((viewportId: string, error: string | null) => {
    if (error) {
      setErrorStates(prev => new Map(prev.set(viewportId, error)));
    } else {
      setErrorStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(viewportId);
        return newMap;
      });
    }
  }, []);
  
  // Render viewport header
  const renderViewportHeader = useCallback((viewport: ViewportConfig) => {
    const isActive = viewport.id === activeViewportId;
    const isLinked = linkedViewports.includes(viewport.id);
    const isLoading = loadingStates.get(viewport.id) || 0;
    const error = errorStates.get(viewport.id);
    
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 0.5,
          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 32
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="caption"
            sx={{
              fontWeight: isActive ? 'bold' : 'normal',
              color: isActive ? 'primary.main' : 'text.secondary'
            }}
          >
            {viewport.title}
          </Typography>
          
          {viewport.orientation && (
            <Chip
              label={viewport.orientation.toUpperCase()}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
          
          {isLinked && (
            <Tooltip title="Linked Viewport">
              <Link fontSize="small" color="primary" />
            </Tooltip>
          )}
          
          {error && (
            <Tooltip title={error}>
              <Error fontSize="small" color="error" />
            </Tooltip>
          )}
        </Stack>
        
        <Stack direction="row" spacing={0.5}>
          {enableFullscreen && (
            <Tooltip title={maximizedViewport === viewport.id ? 'Minimize' : 'Maximize'}>
              <IconButton
                size="small"
                onClick={() => handleViewportMaximize(viewport.id)}
              >
                {maximizedViewport === viewport.id ? <Minimize /> : <Maximize />}
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Reset Viewport">
            <IconButton
              size="small"
              onClick={() => onViewportReset(viewport.id)}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          
          {viewports.length > 1 && (
            <Tooltip title="Close Viewport">
              <IconButton
                size="small"
                onClick={() => onViewportClose(viewport.id)}
              >
                <Close />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    );
  }, [
    activeViewportId,
    linkedViewports,
    loadingStates,
    errorStates,
    maximizedViewport,
    enableFullscreen,
    handleViewportMaximize,
    onViewportReset,
    onViewportClose,
    viewports.length,
    theme
  ]);
  
  // Render viewport content
  const renderViewportContent = useCallback((viewport: ViewportConfig) => {
    const isLoading = loadingStates.get(viewport.id) || 0;
    const error = errorStates.get(viewport.id);
    
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 200,
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => handleViewportActivate(viewport.id)}
      >
        {error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : viewport.type === 'mpr' ? (
          <MPRViewer
            study={null} // TODO: Pass actual study data
            imageIds={viewport.imageIds || []}
            settings={{
              windowWidth: 400,
              windowCenter: 40,
              crosshairEnabled: true,
              synchronizedScrolling: true,
              renderMode: 'volume',
              opacity: 1,
              threshold: 0.5
            }}
            onSettingsChange={(settings) => console.log('MPR settings changed:', settings)}
            onError={(error) => updateErrorState(viewport.id, error)}
          />
        ) : viewport.type === '3d' ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <ViewInAr sx={{ fontSize: 48, opacity: 0.5 }} />
              <Typography variant="body2" color="inherit">
                3D Volume Rendering
              </Typography>
            </Stack>
          </Box>
        ) : (
          <ViewerCore
            state={{
              isLoading: viewport.isLoading || false,
              loadingProgress: 0,
              loadingMessage: '',
              currentStudy: null,
              currentSeries: null,
              currentImage: null,
              layout: 'single',
              activeViewport: viewport.id,
              viewports: {},
              activeTool: 'WindowLevel',
              toolSettings: {},
              windowWidth: 400,
              windowCenter: 40,
              zoom: 1,
              pan: { x: 0, y: 0 },
              rotation: 0,
              invert: false,
              isPlaying: false,
              currentFrame: 0,
              totalFrames: 1,
              playbackSpeed: 1,
              sidebarOpen: false,
              toolbarVisible: true,
              overlayVisible: true,
              fullscreen: false,
              performanceMetrics: {},
              memoryUsage: 0,
              renderingMode: 'software',
              securityValidated: false,
              securityEvents: [],
              error: null,
              warnings: []
            }}
            onStateChange={(updates) => console.log('ViewerCore state changed:', updates)}
            onError={(error) => updateErrorState(viewport.id, error)}
          />
        )}
        
        {/* Loading overlay */}
        {isLoading > 0 && isLoading < 100 && showLoadingProgress && (
          <Fade in>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000
              }}
            >
              <LinearProgress
                variant="determinate"
                value={isLoading}
                sx={{
                  height: 2,
                  backgroundColor: alpha(theme.palette.common.white, 0.2),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.main
                  }
                }}
              />
            </Box>
          </Fade>
        )}
        
        {/* Viewport info overlay */}
        {showViewportInfo && viewport.metadata && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              color: 'white',
              backgroundColor: alpha(theme.palette.common.black, 0.7),
              p: 1,
              borderRadius: 1,
              fontSize: '0.75rem'
            }}
          >
            <Typography variant="caption" display="block">
              {viewport.metadata.patientName}
            </Typography>
            <Typography variant="caption" display="block">
              {viewport.metadata.studyDate}
            </Typography>
            <Typography variant="caption" display="block">
              {viewport.metadata.modality}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [
    loadingStates,
    errorStates,
    handleViewportActivate,
    registerViewportElement,
    updateLoadingState,
    updateErrorState,
    showLoadingProgress,
    showViewportInfo,
    theme
  ]);
  
  // Render single viewport (maximized)
  if (maximizedViewport) {
    const viewport = viewports.find(v => v.id === maximizedViewport);
    if (viewport) {
      return (
        <Paper
          elevation={elevation}
          sx={{
            height: '100%',
            borderRadius: borderRadius,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {renderViewportHeader(viewport)}
          {renderViewportContent(viewport)}
        </Paper>
      );
    }
  }
  
  return (
    <Box ref={containerRef} sx={{ height: '100%', width: '100%' }}>
      {/* Viewport controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          backgroundColor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2">
            Layout: {layout?.toUpperCase() || 'SINGLE'}
          </Typography>
          
          <Chip
            label={`${viewports.length} viewports`}
            size="small"
            variant="outlined"
          />
        </Stack>
        
        <Stack direction="row" spacing={1}>
          {enableSync && (
            <Tooltip title={syncEnabled ? 'Disable Sync' : 'Enable Sync'}>
              <IconButton
                size="small"
                color={syncEnabled ? 'primary' : 'default'}
                onClick={handleSyncToggle}
              >
                {syncEnabled ? <Sync /> : <SyncDisabled />}
              </IconButton>
            </Tooltip>
          )}
          
          {enableLink && (
            <Tooltip title={linkedViewports.length > 0 ? 'Unlink Viewports' : 'Link Viewports'}>
              <IconButton
                size="small"
                color={linkedViewports.length > 0 ? 'primary' : 'default'}
                onClick={handleLinkToggle}
              >
                <Badge badgeContent={linkedViewports.length} color="primary">
                  {linkedViewports.length > 0 ? <Link /> : <LinkOff />}
                </Badge>
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
      
      {/* Viewport grid */}
      <Box sx={{ height: 'calc(100% - 64px)', p: spacing }}>
        <Grid container spacing={spacing} sx={{ height: '100%' }}>
          {viewportGrid.map((item, index) => (
            <Grid
              key={item.id || `grid-${index}`}
              item
              xs={12 / layoutConfig.cols}
              sx={{ height: `${100 / layoutConfig.rows}%` }}
            >
              <Paper
                elevation={elevation}
                sx={{
                  height: '100%',
                  borderRadius: borderRadius,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: item.viewport?.isActive ? `2px solid ${theme.palette.primary.main}` : 'none'
                }}
              >
                {item.viewport && (
                  <>
                    {renderViewportHeader(item.viewport)}
                    {renderViewportContent(item.viewport)}
                  </>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default ViewportManager;