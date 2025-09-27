/**
 * ToolbarManager - Handles all toolbar interactions and tool state
 * 
 * This component provides:
 * - Centralized toolbar management
 * - Tool state handling
 * - Responsive toolbar layout
 * - Apple HIG-inspired design
 * - Accessibility features
 */

import React, { useCallback, useMemo, forwardRef, useImperativeHandle, startTransition } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Stack,
  Chip,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  ButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';

// Icons
import {
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  Fullscreen,
  FullscreenExit,
  Brightness6,
  Contrast,
  InvertColors,
  CenterFocusStrong,
  Navigation,
  ThreeDRotation,
  ViewInAr,
  Tune,
  Memory,
  Speed,
  HighQuality,
  Cached,
  SmartToy,
  Visibility,
  VisibilityOff,
  Download,
  Share,
  Print,
  Settings,
  MoreVert,
  Undo,
  Redo,
  RestartAlt
} from '@mui/icons-material';

// Types
import { 
  ViewerState, 
  ViewerConfiguration,
  ToolbarManagerProps,
  ToolbarManagerRef 
} from '../types/ViewerTypes';

// Tool definitions
interface ToolDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  tooltip: string;
  category: 'viewport' | 'image' | 'annotation' | 'ai' | 'export' | 'settings';
  shortcut?: string;
  requiresAdvanced?: boolean;
  onClick: () => void;
}

// Toolbar manager implementation
export const ToolbarManager = forwardRef<ToolbarManagerRef, ToolbarManagerProps>(({
  state,
  onStateChange,
  configuration,
  onToolChange,
  onViewportReset,
  onExport
}, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Menu state
  const [moreMenuAnchor, setMoreMenuAnchor] = React.useState<null | HTMLElement>(() => null);
  const [exportMenuAnchor, setExportMenuAnchor] = React.useState<null | HTMLElement>(() => null);
  
  // Tool handlers
  const handleZoomIn = useCallback(() => {
    startTransition(() => {
      onStateChange({ zoom: Math.min(state.zoom * 1.2, 20) });
    });
  }, [state.zoom, onStateChange]);
  
  const handleZoomOut = useCallback(() => {
    startTransition(() => {
      onStateChange({ zoom: Math.max(state.zoom / 1.2, 0.1) });
    });
  }, [state.zoom, onStateChange]);
  
  const handleRotateLeft = useCallback(() => {
    startTransition(() => {
      onStateChange({ rotation: state.rotation - 90 });
    });
  }, [state.rotation, onStateChange]);
  
  const handleRotateRight = useCallback(() => {
    startTransition(() => {
      onStateChange({ rotation: state.rotation + 90 });
    });
  }, [state.rotation, onStateChange]);
  
  const handleToggleFullscreen = useCallback(() => {
    startTransition(() => {
      onStateChange({ fullscreen: !state.fullscreen });
    });
  }, [state.fullscreen, onStateChange]);
  
  const handleToggleInvert = useCallback(() => {
    startTransition(() => {
      onStateChange({ invert: !state.invert });
    });
  }, [state.invert, onStateChange]);
  
  const handleResetView = useCallback(() => {
    onViewportReset();
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
  }, [onViewportReset, onStateChange]);
  
  const handleToggle3D = useCallback(() => {
    startTransition(() => {
      onStateChange({
        navigation3D: {
          ...state.navigation3D,
          enabled: !state.navigation3D.enabled
        }
      });
    });
  }, [state.navigation3D, onStateChange]);
  
  const handleToggleMPR = useCallback(() => {
    startTransition(() => {
      onStateChange({ mprMode: !state.mprMode });
    });
  }, [state.mprMode, onStateChange]);
  
  const handleToggleAI = useCallback(() => {
    startTransition(() => {
      onStateChange({ aiEnhancementEnabled: !state.aiEnhancementEnabled });
    });
  }, [state.aiEnhancementEnabled, onStateChange]);
  
  const handleToggleSidebar = useCallback(() => {
    startTransition(() => {
      onStateChange({ sidebarOpen: !state.sidebarOpen });
    });
  }, [state.sidebarOpen, onStateChange]);
  
  // Tool definitions
  const tools: ToolDefinition[] = useMemo(() => [
    // Viewport tools
    {
      id: 'zoom-in',
      name: 'Zoom In',
      icon: <ZoomIn />,
      tooltip: 'Zoom In (Ctrl++)',
      category: 'viewport',
      shortcut: 'Ctrl++',
      onClick: handleZoomIn
    },
    {
      id: 'zoom-out',
      name: 'Zoom Out',
      icon: <ZoomOut />,
      tooltip: 'Zoom Out (Ctrl+-)',
      category: 'viewport',
      shortcut: 'Ctrl+-',
      onClick: handleZoomOut
    },
    {
      id: 'rotate-left',
      name: 'Rotate Left',
      icon: <RotateLeft />,
      tooltip: 'Rotate Left (Ctrl+L)',
      category: 'viewport',
      shortcut: 'Ctrl+L',
      onClick: handleRotateLeft
    },
    {
      id: 'rotate-right',
      name: 'Rotate Right',
      icon: <RotateRight />,
      tooltip: 'Rotate Right (Ctrl+R)',
      category: 'viewport',
      shortcut: 'Ctrl+R',
      onClick: handleRotateRight
    },
    {
      id: 'reset-view',
      name: 'Reset View',
      icon: <RestartAlt />,
      tooltip: 'Reset View (Ctrl+0)',
      category: 'viewport',
      shortcut: 'Ctrl+0',
      onClick: handleResetView
    },
    {
      id: 'fullscreen',
      name: state.fullscreen ? 'Exit Fullscreen' : 'Fullscreen',
      icon: state.fullscreen ? <FullscreenExit /> : <Fullscreen />,
      tooltip: state.fullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)',
      category: 'viewport',
      shortcut: 'F11',
      onClick: handleToggleFullscreen
    },
    
    // Image tools
    {
      id: 'invert',
      name: 'Invert',
      icon: <InvertColors />,
      tooltip: 'Invert Colors (Ctrl+I)',
      category: 'image',
      shortcut: 'Ctrl+I',
      onClick: handleToggleInvert
    },
    
    // Advanced tools
    {
      id: '3d-navigation',
      name: '3D Navigation',
      icon: <ThreeDRotation />,
      tooltip: 'Toggle 3D Navigation',
      category: 'annotation',
      requiresAdvanced: true,
      onClick: handleToggle3D
    },
    {
      id: 'mpr-mode',
      name: 'MPR Mode',
      icon: <ViewInAr />,
      tooltip: 'Multi-Planar Reconstruction',
      category: 'annotation',
      requiresAdvanced: true,
      onClick: handleToggleMPR
    },
    
    // AI tools
    {
      id: 'ai-enhancement',
      name: 'AI Enhancement',
      icon: <SmartToy />,
      tooltip: 'Toggle AI Enhancement',
      category: 'ai',
      requiresAdvanced: true,
      onClick: handleToggleAI
    },
    
    // Export tools
    {
      id: 'export',
      name: 'Export',
      icon: <Download />,
      tooltip: 'Export Image',
      category: 'export',
      onClick: () => startTransition(() => setExportMenuAnchor(document.getElementById('export-button')))
    },
    
    // Settings
    {
      id: 'sidebar',
      name: 'Tools Panel',
      icon: state.sidebarOpen ? <VisibilityOff /> : <Visibility />,
      tooltip: state.sidebarOpen ? 'Hide Tools Panel' : 'Show Tools Panel',
      category: 'settings',
      onClick: handleToggleSidebar
    }
  ], [
    state.fullscreen,
    state.sidebarOpen,
    handleZoomIn,
    handleZoomOut,
    handleRotateLeft,
    handleRotateRight,
    handleResetView,
    handleToggleFullscreen,
    handleToggleInvert,
    handleToggle3D,
    handleToggleMPR,
    handleToggleAI,
    handleToggleSidebar
  ]);
  
  // Filter tools based on configuration
  const availableTools = useMemo(() => {
    return tools.filter(tool => {
      if (tool.requiresAdvanced && !configuration.enableAdvancedTools) {
        return false;
      }
      if (tool.category === 'ai' && !configuration.enableAI) {
        return false;
      }
      return true;
    });
  }, [tools, configuration]);
  
  // Group tools by category
  const toolsByCategory = useMemo(() => {
    const grouped: Record<string, ToolDefinition[]> = {};
    availableTools.forEach(tool => {
      if (!grouped[tool.category]) {
        grouped[tool.category] = [];
      }
      grouped[tool.category].push(tool);
    });
    return grouped;
  }, [availableTools]);
  
  // Primary tools (always visible)
  const primaryTools = useMemo(() => [
    ...toolsByCategory.viewport?.slice(0, isMobile ? 3 : 6) || [],
    ...toolsByCategory.image?.slice(0, 1) || []
  ], [toolsByCategory, isMobile]);
  
  // Secondary tools (in more menu on mobile)
  const secondaryTools = useMemo(() => [
    ...toolsByCategory.viewport?.slice(isMobile ? 3 : 6) || [],
    ...toolsByCategory.image?.slice(1) || [],
    ...toolsByCategory.annotation || [],
    ...toolsByCategory.ai || [],
    ...toolsByCategory.export || [],
    ...toolsByCategory.settings || []
  ], [toolsByCategory, isMobile]);
  
  // Ref implementation
  useImperativeHandle(ref, () => ({
    setActiveTool: (tool: string | null) => {
      onToolChange(tool);
    },
    resetTools: () => {
      onToolChange(null);
    },
    getActiveTools: () => {
      return state.activeTool ? [state.activeTool] : [];
    }
  }), [state.activeTool, onToolChange]);
  
  // Render tool button
  const renderToolButton = useCallback((tool: ToolDefinition, variant: 'primary' | 'secondary' = 'primary') => {
    const isActive = state.activeTool === tool.id;
    
    return (
      <Tooltip key={tool.id} title={tool.tooltip} arrow>
        <IconButton
          onClick={tool.onClick}
          color={isActive ? 'primary' : 'default'}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            borderRadius: 2,
            backgroundColor: isActive 
              ? theme.palette.primary.main + '20'
              : 'transparent',
            '&:hover': {
              backgroundColor: isActive
                ? theme.palette.primary.main + '30'
                : theme.palette.action.hover
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {tool.icon}
        </IconButton>
      </Tooltip>
    );
  }, [state.activeTool, theme, isMobile]);
  
  // Handle export menu
  const handleExportMenuClose = useCallback(() => {
    startTransition(() => {
      setExportMenuAnchor(null);
    });
  }, []);
  
  const handleExport = useCallback((format: string) => {
    onExport();
    handleExportMenuClose();
  }, [onExport, handleExportMenuClose]);
  
  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(28, 28, 30, 0.95)'
            : 'rgba(248, 248, 248, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: isMobile ? 56 : 64,
            px: isMobile ? 1 : 2,
            gap: 1
          }}
        >
          {/* Logo/Title */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? '1rem' : '1.1rem',
              color: theme.palette.primary.main,
              mr: 2
            }}
          >
            DICOM Viewer
          </Typography>
          
          {/* Primary Tools */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {primaryTools.map(tool => renderToolButton(tool, 'primary'))}
          </Stack>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Status Indicators */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 'auto' }}>
            {/* Quality Indicator */}
            <Chip
              label={state.qualityLevel?.toUpperCase() || 'HIGH'}
              size="small"
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                borderColor: state.qualityLevel === 'diagnostic' ? 'success.main' : 'primary.main',
                color: state.qualityLevel === 'diagnostic' ? 'success.main' : 'primary.main'
              }}
            />
            
            {/* Rendering Mode */}
            <Chip
              icon={
                state.renderingMode === 'webgl' ? <HighQuality sx={{ fontSize: 14 }} /> :
                state.renderingMode === 'gpu' ? <Speed sx={{ fontSize: 14 }} /> :
                <Cached sx={{ fontSize: 14 }} />
              }
              label={state.renderingMode?.toUpperCase() || 'SOFTWARE'}
              size="small"
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 500,
                '& .MuiChip-icon': {
                  fontSize: 14
                }
              }}
            />
            
            {/* AI Status */}
            {configuration.enableAI && (
              <Badge
                badgeContent={state.aiDetectionResults.length}
                color="secondary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    height: 16,
                    minWidth: 16
                  }
                }}
              >
                <Chip
                  icon={<SmartToy sx={{ fontSize: 14 }} />}
                  label="AI"
                  size="small"
                  variant={state.aiEnhancementEnabled ? "filled" : "outlined"}
                  color={state.aiEnhancementEnabled ? "secondary" : "default"}
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      fontSize: 14
                    }
                  }}
                />
              </Badge>
            )}
          </Stack>
          
          {/* Export Button */}
          <IconButton
            id="export-button"
            onClick={(e) => startTransition(() => setExportMenuAnchor(e.currentTarget))}
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 2 }}
          >
            <Download />
          </IconButton>
          
          {/* More Menu (Mobile/Tablet) */}
          {(isMobile || isTablet) && secondaryTools.length > 0 && (
            <IconButton
              onClick={(e) => startTransition(() => setMoreMenuAnchor(e.currentTarget))}
              size="small"
              sx={{ borderRadius: 2 }}
            >
              <MoreVert />
            </IconButton>
          )}
          
          {/* Desktop Secondary Tools */}
          {!isMobile && !isTablet && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
              {secondaryTools.slice(0, 4).map(tool => renderToolButton(tool, 'secondary'))}
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      
      {/* More Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => startTransition(() => setMoreMenuAnchor(null))}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 200
          }
        }}
      >
        {secondaryTools.map(tool => (
          <MenuItem
            key={tool.id}
            onClick={() => {
              tool.onClick();
              startTransition(() => setMoreMenuAnchor(null));
            }}
            sx={{ borderRadius: 1, mx: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {tool.icon}
            </ListItemIcon>
            <ListItemText
              primary={tool.name}
              secondary={tool.shortcut}
              secondaryTypographyProps={{
                variant: 'caption',
                color: 'textSecondary'
              }}
            />
          </MenuItem>
        ))}
      </Menu>
      
      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 180
          }
        }}
      >
        <MenuItem onClick={() => handleExport('png')} sx={{ borderRadius: 1, mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Download />
          </ListItemIcon>
          <ListItemText primary="Export as PNG" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('jpg')} sx={{ borderRadius: 1, mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Download />
          </ListItemIcon>
          <ListItemText primary="Export as JPEG" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('dicom')} sx={{ borderRadius: 1, mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Download />
          </ListItemIcon>
          <ListItemText primary="Export DICOM" />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleExport('print')} sx={{ borderRadius: 1, mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Print />
          </ListItemIcon>
          <ListItemText primary="Print" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('share')} sx={{ borderRadius: 1, mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Share />
          </ListItemIcon>
          <ListItemText primary="Share" />
        </MenuItem>
      </Menu>
    </>
  );
});

ToolbarManager.displayName = 'ToolbarManager';

export default ToolbarManager;