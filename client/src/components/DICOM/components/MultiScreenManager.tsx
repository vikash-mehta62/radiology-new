/**
 * Multi-Screen Manager - Advanced Multi-Screen Display Management
 * 
 * Comprehensive multi-screen capabilities including:
 * - Multiple monitor detection and management
 * - Cross-screen viewport synchronization
 * - Flexible layout configurations
 * - Drag-and-drop viewport management
 * - Full-screen and windowed modes
 * - Screen-specific optimization
 * - Multi-user collaboration support
 * - Performance optimization across screens
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef
} from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  useTheme
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  OpenInNew as OpenInNewIcon,
  ViewQuilt as LayoutIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Launch as LaunchIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Components
import ViewerCore, { ViewerCoreRef } from '../core/ViewerCore';
import ViewportManager from './ViewportManager';

// Services
import { enhancedDicomService } from '../../../services/enhancedDicomService';
import { performanceMonitor } from '../../../services/performanceMonitor';

// Types
export interface MultiScreenManagerProps {
  // Screen configuration
  enableMultiScreen?: boolean;
  autoDetectScreens?: boolean;
  maxScreens?: number;
  
  // Layout options
  defaultLayout?: ScreenLayout;
  allowCustomLayouts?: boolean;
  enableDragDrop?: boolean;
  
  // Synchronization
  enableSynchronization?: boolean;
  syncOptions?: SyncOptions;
  
  // Performance
  enablePerformanceOptimization?: boolean;
  screenSpecificOptimization?: boolean;
  
  // Data
  seriesInstanceUID?: string;
  imageIds?: string[];
  viewportConfigs?: ViewportConfig[];
  
  // Event handlers
  onScreenAdded?: (screen: ScreenInfo) => void;
  onScreenRemoved?: (screenId: string) => void;
  onLayoutChange?: (layout: ScreenLayout) => void;
  onViewportMove?: (viewportId: string, fromScreen: string, toScreen: string) => void;
  onSyncStateChange?: (enabled: boolean, options: SyncOptions) => void;
  
  // Layout
  width?: number | string;
  height?: number | string;
  className?: string;
  sx?: any;
}

export interface MultiScreenManagerRef {
  // Screen management
  detectScreens: () => Promise<ScreenInfo[]>;
  addScreen: (config?: ScreenConfig) => Promise<string>;
  removeScreen: (screenId: string) => void;
  getScreens: () => ScreenInfo[];
  
  // Layout management
  setLayout: (layout: ScreenLayout) => void;
  getLayout: () => ScreenLayout;
  saveLayout: (name: string) => void;
  loadLayout: (name: string) => void;
  
  // Viewport management
  moveViewport: (viewportId: string, targetScreenId: string) => void;
  duplicateViewport: (viewportId: string, targetScreenId: string) => void;
  
  // Synchronization
  enableSync: (options?: SyncOptions) => void;
  disableSync: () => void;
  
  // Full-screen
  enterFullScreen: (screenId?: string) => void;
  exitFullScreen: () => void;
  
  // Export
  exportScreenshot: (screenId?: string) => string | null;
  exportAllScreens: () => { [screenId: string]: string };
}

interface ScreenInfo {
  id: string;
  name: string;
  isPrimary: boolean;
  resolution: { width: number; height: number };
  position: { x: number; y: number };
  dpi: number;
  colorDepth: number;
  refreshRate: number;
  isAvailable: boolean;
  window?: Window;
}

interface ScreenConfig {
  name?: string;
  layout?: ViewportLayout;
  optimization?: PerformanceConfig;
}

interface ViewportConfig {
  id: string;
  seriesInstanceUID?: string;
  imageIds?: string[];
  currentImageIndex?: number;
  windowLevel?: { window: number; level: number };
  zoom?: number;
  pan?: { x: number; y: number };
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
}

interface ViewportLayout {
  rows: number;
  cols: number;
  viewports: ViewportConfig[];
}

interface ScreenLayout {
  screens: {
    [screenId: string]: {
      layout: ViewportLayout;
      visible: boolean;
      fullscreen: boolean;
    };
  };
  synchronization: SyncOptions;
}

interface SyncOptions {
  enabled: boolean;
  syncWindowLevel: boolean;
  syncZoom: boolean;
  syncPan: boolean;
  syncSlice: boolean;
  syncRotation: boolean;
  syncAnnotations: boolean;
  masterScreen?: string;
}

interface PerformanceConfig {
  maxViewports: number;
  enableLOD: boolean;
  cacheSize: number;
  renderQuality: 'low' | 'medium' | 'high';
}

const MultiScreenManager = forwardRef<MultiScreenManagerRef, MultiScreenManagerProps>(({
  enableMultiScreen = true,
  autoDetectScreens = true,
  maxScreens = 4,
  defaultLayout,
  allowCustomLayouts = true,
  enableDragDrop = true,
  enableSynchronization = true,
  syncOptions = {
    enabled: true,
    syncWindowLevel: true,
    syncZoom: true,
    syncPan: false,
    syncSlice: true,
    syncRotation: false,
    syncAnnotations: true
  },
  enablePerformanceOptimization = true,
  screenSpecificOptimization = true,
  seriesInstanceUID,
  imageIds = [],
  viewportConfigs = [],
  onScreenAdded,
  onScreenRemoved,
  onLayoutChange,
  onViewportMove,
  onSyncStateChange,
  width = '100%',
  height = '100%',
  className,
  sx
}, ref) => {
  const theme = useTheme();
  const screenWindowsRef = useRef<{ [screenId: string]: Window }>({});
  const viewportRefsRef = useRef<{ [viewportId: string]: ViewerCoreRef | null }>({});
  
  // State management
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [currentLayout, setCurrentLayout] = useState<ScreenLayout>(
    defaultLayout || {
      screens: {},
      synchronization: syncOptions
    }
  );
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenScreenId, setFullScreenScreenId] = useState<string | null>(null);
  const [draggedViewport, setDraggedViewport] = useState<string | null>(null);
  const [showScreenDialog, setShowScreenDialog] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<{ [name: string]: ScreenLayout }>({});
  const [performanceStats, setPerformanceStats] = useState<{ [screenId: string]: any }>({});

  // Screen detection
  const detectScreens = useCallback(async (): Promise<ScreenInfo[]> => {
    try {
      // Use Screen API if available
      if ('screen' in window && 'getScreens' in (window.screen as any)) {
        const screenDetails = await (window.screen as any).getScreens();
        
        return screenDetails.screens.map((screen: any, index: number) => ({
          id: `screen-${index}`,
          name: screen.label || `Screen ${index + 1}`,
          isPrimary: screen.isPrimary || index === 0,
          resolution: {
            width: screen.width,
            height: screen.height
          },
          position: {
            x: screen.left || 0,
            y: screen.top || 0
          },
          dpi: screen.devicePixelRatio || 1,
          colorDepth: screen.colorDepth || 24,
          refreshRate: screen.refreshRate || 60,
          isAvailable: screen.isExtended !== false
        }));
      }
      
      // Fallback to basic screen detection
      const primaryScreen: ScreenInfo = {
        id: 'screen-0',
        name: 'Primary Screen',
        isPrimary: true,
        resolution: {
          width: window.screen.width,
          height: window.screen.height
        },
        position: { x: 0, y: 0 },
        dpi: window.devicePixelRatio || 1,
        colorDepth: window.screen.colorDepth || 24,
        refreshRate: 60,
        isAvailable: true
      };
      
      return [primaryScreen];
      
    } catch (error) {
      console.error('Failed to detect screens:', error);
      
      // Return primary screen as fallback
      return [{
        id: 'screen-0',
        name: 'Primary Screen',
        isPrimary: true,
        resolution: {
          width: window.screen.width,
          height: window.screen.height
        },
        position: { x: 0, y: 0 },
        dpi: window.devicePixelRatio || 1,
        colorDepth: window.screen.colorDepth || 24,
        refreshRate: 60,
        isAvailable: true
      }];
    }
  }, []);

  // Initialize screens
  useEffect(() => {
    if (enableMultiScreen && autoDetectScreens) {
      initializeScreens();
    }
  }, [enableMultiScreen, autoDetectScreens]);

  const initializeScreens = useCallback(async () => {
    try {
      const detectedScreens = await detectScreens();
      setScreens(detectedScreens);
      
      // Initialize layout for detected screens
      const newLayout: ScreenLayout = {
        screens: {},
        synchronization: syncOptions
      };
      
      detectedScreens.forEach((screen, index) => {
        newLayout.screens[screen.id] = {
          layout: {
            rows: 1,
            cols: 1,
            viewports: index === 0 ? viewportConfigs : []
          },
          visible: true,
          fullscreen: false
        };
      });
      
      setCurrentLayout(newLayout);
      
    } catch (error) {
      console.error('Failed to initialize screens:', error);
    }
  }, [detectScreens, syncOptions, viewportConfigs]);

  // Screen management
  const addScreen = useCallback(async (config?: ScreenConfig): Promise<string> => {
    try {
      const screenId = `screen-${Date.now()}`;
      
      // Open new window for additional screen
      const newWindow = window.open(
        '',
        screenId,
        'width=800,height=600,resizable=yes,scrollbars=no,menubar=no,toolbar=no'
      );
      
      if (!newWindow) {
        throw new Error('Failed to open new window - popup blocked?');
      }
      
      // Set up the new window
      newWindow.document.title = config?.name || `Screen ${screens.length + 1}`;
      newWindow.document.body.innerHTML = `
        <div id="screen-root" style="width: 100%; height: 100vh; margin: 0; padding: 0;"></div>
      `;
      
      screenWindowsRef.current[screenId] = newWindow;
      
      // Create screen info
      const newScreen: ScreenInfo = {
        id: screenId,
        name: config?.name || `Screen ${screens.length + 1}`,
        isPrimary: false,
        resolution: {
          width: newWindow.innerWidth,
          height: newWindow.innerHeight
        },
        position: {
          x: newWindow.screenX,
          y: newWindow.screenY
        },
        dpi: newWindow.devicePixelRatio || 1,
        colorDepth: 24,
        refreshRate: 60,
        isAvailable: true,
        window: newWindow
      };
      
      setScreens(prev => [...prev, newScreen]);
      
      // Update layout
      setCurrentLayout(prev => ({
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: {
            layout: config?.layout || {
              rows: 1,
              cols: 1,
              viewports: []
            },
            visible: true,
            fullscreen: false
          }
        }
      }));
      
      if (onScreenAdded) {
        onScreenAdded(newScreen);
      }
      
      return screenId;
      
    } catch (error) {
      console.error('Failed to add screen:', error);
      throw error;
    }
  }, [screens.length, onScreenAdded]);

  const removeScreen = useCallback((screenId: string) => {
    // Close window if it exists
    const window = screenWindowsRef.current[screenId];
    if (window && !window.closed) {
      window.close();
    }
    
    delete screenWindowsRef.current[screenId];
    
    // Remove from screens
    setScreens(prev => prev.filter(screen => screen.id !== screenId));
    
    // Update layout
    setCurrentLayout(prev => {
      const newLayout = { ...prev };
      delete newLayout.screens[screenId];
      return newLayout;
    });
    
    if (onScreenRemoved) {
      onScreenRemoved(screenId);
    }
  }, [onScreenRemoved]);

  // Layout management
  const setLayout = useCallback((layout: ScreenLayout) => {
    setCurrentLayout(layout);
    
    if (onLayoutChange) {
      onLayoutChange(layout);
    }
  }, [onLayoutChange]);

  const saveLayout = useCallback((name: string) => {
    setSavedLayouts(prev => ({
      ...prev,
      [name]: { ...currentLayout }
    }));
  }, [currentLayout]);

  const loadLayout = useCallback((name: string) => {
    const layout = savedLayouts[name];
    if (layout) {
      setLayout(layout);
    }
  }, [savedLayouts, setLayout]);

  // Viewport management
  const moveViewport = useCallback((viewportId: string, targetScreenId: string) => {
    setCurrentLayout(prev => {
      const newLayout = { ...prev };
      
      // Find and remove viewport from current screen
      Object.keys(newLayout.screens).forEach(screenId => {
        const screen = newLayout.screens[screenId];
        screen.layout.viewports = screen.layout.viewports.filter(
          vp => vp.id !== viewportId
        );
      });
      
      // Add viewport to target screen
      if (newLayout.screens[targetScreenId]) {
        const viewport = viewportConfigs.find(vp => vp.id === viewportId);
        if (viewport) {
          newLayout.screens[targetScreenId].layout.viewports.push(viewport);
        }
      }
      
      return newLayout;
    });
    
    if (onViewportMove) {
      onViewportMove(viewportId, '', targetScreenId);
    }
  }, [viewportConfigs, onViewportMove]);

  const duplicateViewport = useCallback((viewportId: string, targetScreenId: string) => {
    const viewport = viewportConfigs.find(vp => vp.id === viewportId);
    if (!viewport) return;
    
    const duplicatedViewport = {
      ...viewport,
      id: `${viewportId}-copy-${Date.now()}`
    };
    
    setCurrentLayout(prev => ({
      ...prev,
      screens: {
        ...prev.screens,
        [targetScreenId]: {
          ...prev.screens[targetScreenId],
          layout: {
            ...prev.screens[targetScreenId].layout,
            viewports: [
              ...prev.screens[targetScreenId].layout.viewports,
              duplicatedViewport
            ]
          }
        }
      }
    }));
  }, [viewportConfigs]);

  // Synchronization
  const enableSync = useCallback((options?: SyncOptions) => {
    const newSyncOptions = options || syncOptions;
    
    setCurrentLayout(prev => ({
      ...prev,
      synchronization: {
        ...newSyncOptions,
        enabled: true
      }
    }));
    
    if (onSyncStateChange) {
      onSyncStateChange(true, newSyncOptions);
    }
  }, [syncOptions, onSyncStateChange]);

  const disableSync = useCallback(() => {
    setCurrentLayout(prev => ({
      ...prev,
      synchronization: {
        ...prev.synchronization,
        enabled: false
      }
    }));
    
    if (onSyncStateChange) {
      onSyncStateChange(false, currentLayout.synchronization);
    }
  }, [currentLayout.synchronization, onSyncStateChange]);

  // Full-screen management
  const enterFullScreen = useCallback((screenId?: string) => {
    const targetScreenId = screenId || screens[0]?.id;
    if (!targetScreenId) return;
    
    setIsFullScreen(true);
    setFullScreenScreenId(targetScreenId);
    
    // Request fullscreen for the target screen
    const screenWindow = screenWindowsRef.current[targetScreenId];
    if (screenWindow && screenWindow.document.documentElement.requestFullscreen) {
      screenWindow.document.documentElement.requestFullscreen();
    }
  }, [screens]);

  const exitFullScreen = useCallback(() => {
    setIsFullScreen(false);
    setFullScreenScreenId(null);
    
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  // Export functions
  const exportScreenshot = useCallback((screenId?: string): string | null => {
    const targetScreenId = screenId || screens[0]?.id;
    if (!targetScreenId) return null;
    
    // Implementation would capture screen content
    return null;
  }, [screens]);

  const exportAllScreens = useCallback((): { [screenId: string]: string } => {
    const screenshots: { [screenId: string]: string } = {};
    
    screens.forEach(screen => {
      const screenshot = exportScreenshot(screen.id);
      if (screenshot) {
        screenshots[screen.id] = screenshot;
      }
    });
    
    return screenshots;
  }, [screens, exportScreenshot]);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    detectScreens,
    addScreen,
    removeScreen,
    getScreens: () => screens,
    setLayout,
    getLayout: () => currentLayout,
    saveLayout,
    loadLayout,
    moveViewport,
    duplicateViewport,
    enableSync,
    disableSync,
    enterFullScreen,
    exitFullScreen,
    exportScreenshot,
    exportAllScreens
  }), [
    detectScreens,
    addScreen,
    removeScreen,
    screens,
    setLayout,
    currentLayout,
    saveLayout,
    loadLayout,
    moveViewport,
    duplicateViewport,
    enableSync,
    disableSync,
    enterFullScreen,
    exitFullScreen,
    exportScreenshot,
    exportAllScreens
  ]);

  // Render screen card
  const renderScreenCard = (screen: ScreenInfo) => (
    <Card key={screen.id} variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MonitorIcon color={screen.isPrimary ? 'primary' : 'default'} />
          <Typography variant="h6">
            {screen.name}
          </Typography>
          {screen.isPrimary && (
            <Chip size="small" label="Primary" color="primary" />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {screen.resolution.width} × {screen.resolution.height} @ {screen.refreshRate}Hz
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip
            size="small"
            label={`${currentLayout.screens[screen.id]?.layout.viewports.length || 0} viewports`}
          />
          <Chip
            size="small"
            label={currentLayout.screens[screen.id]?.visible ? 'Visible' : 'Hidden'}
            color={currentLayout.screens[screen.id]?.visible ? 'success' : 'default'}
          />
        </Box>
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          startIcon={<FullscreenIcon />}
          onClick={() => enterFullScreen(screen.id)}
        >
          Full Screen
        </Button>
        
        {!screen.isPrimary && (
          <Button
            size="small"
            color="error"
            startIcon={<CloseIcon />}
            onClick={() => removeScreen(screen.id)}
          >
            Remove
          </Button>
        )}
      </CardActions>
    </Card>
  );

  // Render controls
  const renderControls = () => (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Multi-Screen Manager
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowScreenDialog(true)}
          >
            Add Screen
          </Button>
          
          <IconButton
            onClick={() => {
              currentLayout.synchronization.enabled ? disableSync() : enableSync();
            }}
            color={currentLayout.synchronization.enabled ? 'primary' : 'default'}
          >
            {currentLayout.synchronization.enabled ? <SyncIcon /> : <SyncDisabledIcon />}
          </IconButton>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Chip
          size="small"
          label={`${screens.length} screens`}
          color="primary"
        />
        
        <Chip
          size="small"
          label={`Sync: ${currentLayout.synchronization.enabled ? 'On' : 'Off'}`}
          color={currentLayout.synchronization.enabled ? 'success' : 'default'}
        />
        
        {isFullScreen && (
          <Chip
            size="small"
            label="Full Screen"
            color="warning"
          />
        )}
      </Box>
    </Box>
  );

  return (
    <Paper
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...sx
      }}
    >
      {/* Controls */}
      {renderControls()}
      
      {/* Screen List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {screens.map(screen => renderScreenCard(screen))}
        
        {screens.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No screens detected
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={initializeScreens}
              sx={{ mt: 2 }}
            >
              Detect Screens
            </Button>
          </Box>
        )}
      </Box>
      
      {/* Add Screen Dialog */}
      <Dialog
        open={showScreenDialog}
        onClose={() => setShowScreenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Screen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            This will open a new window that can be moved to another screen.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScreenDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await addScreen();
                setShowScreenDialog(false);
              } catch (error) {
                console.error('Failed to add screen:', error);
              }
            }}
          >
            Add Screen
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
});

MultiScreenManager.displayName = 'MultiScreenManager';

export default MultiScreenManager;
export type { 
  MultiScreenManagerProps, 
  MultiScreenManagerRef, 
  ScreenInfo, 
  ScreenLayout,
  ViewportConfig,
  SyncOptions 
};