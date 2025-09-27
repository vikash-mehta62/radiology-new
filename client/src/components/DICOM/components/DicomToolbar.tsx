/**
 * Production DICOM Toolbar Component
 * 
 * Enhanced toolbar with:
 * - Medical imaging tools (Window/Level, Zoom, Pan, etc.)
 * - Layout controls
 * - Measurement tools
 * - AI-powered tools
 * - Export and sharing options
 * - Accessibility features
 * - Performance monitoring controls
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  ButtonGroup,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Stack,
  Box,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  FormControl,
  InputLabel,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha
} from '@mui/material';
import {
  // Basic tools
  PanTool,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  RestartAlt,
  Fullscreen,
  FullscreenExit,
  
  // Window/Level tools
  Brightness6,
  Contrast,
  InvertColors,
  Tune,
  
  // Measurement tools
  Straighten,
  CropFree,
  Timeline,
  Assessment,
  
  // Layout tools
  ViewModule,
  Dashboard,
  ViewComfy,
  ViewInAr,
  
  // Playback controls
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  Speed,
  
  // AI tools
  SmartToy,
  AutoAwesome,
  Visibility,
  Search,
  
  // Export/Share
  Download,
  Share,
  Print,
  CloudDownload,
  
  // Settings
  Settings,
  Palette,
  Accessibility,
  Security,
  Memory,
  
  // More options
  MoreVert,
  ExpandMore,
  
  // Status indicators
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';

interface DicomToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  layout: string;
  onLayoutChange: (layout: string) => void;
  enableAdvancedTools?: boolean;
  userRole?: 'radiologist' | 'technician' | 'referring_physician' | 'student' | 'admin';
  viewerMode?: 'diagnostic' | 'review' | 'comparison' | 'teaching' | 'research';
  
  // Tool states
  windowWidth?: number;
  windowCenter?: number;
  zoom?: number;
  isPlaying?: boolean;
  playbackSpeed?: number;
  
  // Feature flags
  enableAI?: boolean;
  enableCollaboration?: boolean;
  enableExport?: boolean;
  enableMeasurements?: boolean;
  
  // Callbacks
  onWindowLevelChange?: (width: number, center: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPlaybackToggle?: () => void;
  onPlaybackSpeedChange?: (speed: number) => void;
  onExport?: (format: string) => void;
  onShare?: () => void;
  onFullscreenToggle?: () => void;
  onSettingsOpen?: () => void;
  
  // Performance
  performanceMetrics?: any;
  memoryUsage?: number;
  renderingMode?: 'software' | 'webgl' | 'webgpu';
  
  // Legacy compatibility
  studyType?: 'single-frame' | 'multi-frame' | 'volume' | 'series';
  modality?: string;
  currentFrame?: number;
  totalFrames?: number;
  rotation?: number;
  recommendedTools?: string[];
  onZoom?: (delta: number) => void;
  onRotate?: (angle: number) => void;
  onWindowing?: (width: number, center: number) => void;
  onReset?: () => void;
  onNavigateFrame?: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  onToolSelect?: (tool: string) => void;
  onSidebarToggle?: () => void;
  isMobile?: boolean;
  mprMode?: boolean;
  mprViewerMode?: 'single' | 'multi-plane';
  volumeDataAvailable?: boolean;
  onMPRToggle?: () => void;
  onMPRViewerModeChange?: (mode: 'single' | 'multi-plane') => void;
}

const DicomToolbar: React.FC<DicomToolbarProps> = ({
  // New props
  activeTool,
  onToolChange,
  layout,
  onLayoutChange,
  enableAdvancedTools = true,
  userRole = 'radiologist',
  viewerMode = 'diagnostic',
  windowWidth = 400,
  windowCenter = 40,
  zoom = 1,
  isPlaying = false,
  playbackSpeed = 1,
  enableAI = true,
  enableCollaboration = false,
  enableExport = true,
  enableMeasurements = true,
  onWindowLevelChange,
  onZoomChange,
  onPlaybackToggle,
  onPlaybackSpeedChange,
  onExport,
  onShare,
  onFullscreenToggle,
  onSettingsOpen,
  performanceMetrics,
  memoryUsage = 0,
  renderingMode = 'webgl',
  
  // Legacy props for backward compatibility
  studyType = 'single-frame',
  modality = 'CT',
  currentFrame = 0,
  totalFrames = 1,
  rotation = 0,
  recommendedTools = [],
  onZoom,
  onRotate,
  onWindowing,
  onReset,
  onNavigateFrame,
  onToolSelect,
  onSidebarToggle,
  isMobile = false,
  mprMode = false,
  mprViewerMode = 'single',
  volumeDataAvailable = false,
  onMPRToggle,
  onMPRViewerModeChange
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Tool categories
  const basicTools = useMemo(() => [
    { id: 'pan', icon: PanTool, label: 'Pan' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
    { id: 'windowLevel', icon: Brightness6, label: 'Window/Level' },
    { id: 'rotate', icon: RotateLeft, label: 'Rotate' },
    { id: 'reset', icon: RestartAlt, label: 'Reset' }
  ], []);

  const measurementTools = useMemo(() => [
    { id: 'length', icon: Straighten, label: 'Length' },
    { id: 'area', icon: CropFree, label: 'Area' },
    { id: 'angle', icon: Timeline, label: 'Angle' },
    { id: 'ellipse', icon: Assessment, label: 'Ellipse' }
  ], []);

  const aiTools = useMemo(() => [
    { id: 'aiDetection', icon: SmartToy, label: 'AI Detection' },
    { id: 'autoEnhance', icon: AutoAwesome, label: 'Auto Enhance' },
    { id: 'smartSearch', icon: Search, label: 'Smart Search' }
  ], []);

  const layouts = useMemo(() => [
    { id: '1x1', icon: ViewModule, label: '1x1' },
    { id: '2x2', icon: Dashboard, label: '2x2' },
    { id: '1x2', icon: ViewComfy, label: '1x2' },
    { id: 'mpr', icon: ViewInAr, label: 'MPR' }
  ], []);

  // Handle tool selection with backward compatibility
  const handleToolSelect = useCallback((toolId: string) => {
    onToolChange?.(toolId);
    onToolSelect?.(toolId); // Legacy support
  }, [onToolChange, onToolSelect]);

  // Handle zoom with backward compatibility
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.1, Math.min(10, zoom + delta));
    onZoomChange?.(newZoom);
    onZoom?.(delta); // Legacy support
  }, [zoom, onZoomChange, onZoom]);

  // Handle window/level with backward compatibility
  const handleWindowLevel = useCallback((width: number, center: number) => {
    onWindowLevelChange?.(width, center);
    onWindowing?.(width, center); // Legacy support
  }, [onWindowLevelChange, onWindowing]);

  const showFrameControls = studyType === 'multi-frame' || studyType === 'volume' || totalFrames > 1;
  const show3DControls = studyType === 'volume' || volumeDataAvailable;
  const showAITools = enableAI && (userRole === 'radiologist' || userRole === 'admin');
  const showMeasurements = enableMeasurements && userRole !== 'student';

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 48, px: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
          
          {/* Menu Toggle */}
          {onSidebarToggle && (
            <IconButton onClick={onSidebarToggle} size="small">
              <Menu />
            </IconButton>
          )}

          {/* Basic Tools */}
          <ButtonGroup size="small" variant="outlined">
            {basicTools.map(({ id, icon: Icon, label }) => (
              <Tooltip key={id} title={label}>
                <IconButton
                  onClick={() => handleToolSelect(id)}
                  color={activeTool === id ? 'primary' : 'default'}
                  size="small"
                >
                  <Icon fontSize="small" />
                </IconButton>
              </Tooltip>
            ))}
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Layout Controls */}
          <ToggleButtonGroup
            value={layout}
            exclusive
            onChange={(_, newLayout) => newLayout && onLayoutChange(newLayout)}
            size="small"
          >
            {layouts.map(({ id, icon: Icon, label }) => (
              <ToggleButton key={id} value={id}>
                <Tooltip title={label}>
                  <Icon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Frame Navigation */}
          {showFrameControls && (
            <>
              <Divider orientation="vertical" flexItem />
              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Previous Frame">
                  <IconButton 
                    onClick={() => onNavigateFrame?.('previous')}
                    disabled={currentFrame <= 0}
                  >
                    <SkipPrevious fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                  <IconButton onClick={onPlaybackToggle}>
                    {isPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next Frame">
                  <IconButton 
                    onClick={() => onNavigateFrame?.('next')}
                    disabled={currentFrame >= totalFrames - 1}
                  >
                    <SkipNext fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
              
              <Chip
                label={`${currentFrame + 1}/${totalFrames}`}
                size="small"
                variant="outlined"
              />
            </>
          )}

          {/* Measurement Tools */}
          {showMeasurements && (
            <>
              <Divider orientation="vertical" flexItem />
              <ButtonGroup size="small" variant="outlined">
                {measurementTools.slice(0, 2).map(({ id, icon: Icon, label }) => (
                  <Tooltip key={id} title={label}>
                    <IconButton
                      onClick={() => handleToolSelect(id)}
                      color={activeTool === id ? 'primary' : 'default'}
                      size="small"
                    >
                      <Icon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ))}
                <Tooltip title="More Tools">
                  <IconButton
                    onClick={(e) => setToolsMenuAnchor(e.currentTarget)}
                    size="small"
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </>
          )}

          {/* AI Tools */}
          {showAITools && (
            <>
              <Divider orientation="vertical" flexItem />
              <ButtonGroup size="small" variant="outlined">
                {aiTools.slice(0, 2).map(({ id, icon: Icon, label }) => (
                  <Tooltip key={id} title={label}>
                    <IconButton
                      onClick={() => handleToolSelect(id)}
                      color={activeTool === id ? 'primary' : 'default'}
                      size="small"
                    >
                      <Icon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ))}
              </ButtonGroup>
            </>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Performance Indicator */}
          {performanceMetrics && (
            <Tooltip title={`Memory: ${memoryUsage}MB | Mode: ${renderingMode}`}>
              <Chip
                icon={<Memory />}
                label={`${Math.round(memoryUsage)}MB`}
                size="small"
                color={memoryUsage > 500 ? 'warning' : 'default'}
                variant="outlined"
              />
            </Tooltip>
          )}

          {/* Export/Share */}
          {enableExport && (
            <ButtonGroup size="small" variant="outlined">
              <Tooltip title="Export">
                <IconButton onClick={(e) => setExportMenuAnchor(e.currentTarget)}>
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
              {enableCollaboration && (
                <Tooltip title="Share">
                  <IconButton onClick={onShare}>
                    <Share fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </ButtonGroup>
          )}

          {/* Fullscreen */}
          <Tooltip title="Fullscreen">
            <IconButton onClick={onFullscreenToggle} size="small">
              <Fullscreen fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Settings */}
          <Tooltip title="Settings">
            <IconButton onClick={onSettingsOpen} size="small">
              <Settings fontSize="small" />
            </IconButton>
          </Tooltip>

        </Stack>

        {/* Tools Menu */}
        <Menu
          anchorEl={toolsMenuAnchor}
          open={Boolean(toolsMenuAnchor)}
          onClose={() => setToolsMenuAnchor(null)}
        >
          {measurementTools.slice(2).map(({ id, icon: Icon, label }) => (
            <MenuItem
              key={id}
              onClick={() => {
                handleToolSelect(id);
                setToolsMenuAnchor(null);
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        {/* Export Menu */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={() => { onExport?.('dicom'); setExportMenuAnchor(null); }}>
            <ListItemIcon><CloudDownload fontSize="small" /></ListItemIcon>
            <ListItemText>Export DICOM</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onExport?.('png'); setExportMenuAnchor(null); }}>
            <ListItemIcon><Download fontSize="small" /></ListItemIcon>
            <ListItemText>Export PNG</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onExport?.('pdf'); setExportMenuAnchor(null); }}>
            <ListItemIcon><Print fontSize="small" /></ListItemIcon>
            <ListItemText>Export PDF</ListItemText>
          </MenuItem>
        </Menu>

      </Toolbar>
    </AppBar>
  );
};

export default DicomToolbar;