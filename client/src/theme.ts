import { createTheme, ThemeOptions } from '@mui/material/styles';

// Apple HIG-inspired design tokens for medical imaging
const appleDesignTokens = {
  // Apple-inspired color palette optimized for medical imaging
  colors: {
    // Primary blue - Apple's system blue adapted for medical context
    systemBlue: {
      light: '#007AFF',
      main: '#0056CC',
      dark: '#003D99',
    },
    // Medical-specific colors
    medical: {
      critical: '#FF3B30',    // Apple red for critical findings
      warning: '#FF9500',     // Apple orange for warnings
      success: '#34C759',     // Apple green for completed studies
      info: '#5AC8FA',        // Apple light blue for information
    },
    // Neutral grays following Apple's system grays
    systemGray: {
      50: '#F2F2F7',
      100: '#E5E5EA',
      200: '#D1D1D6',
      300: '#C7C7CC',
      400: '#AEAEB2',
      500: '#8E8E93',
      600: '#636366',
      700: '#48484A',
      800: '#3A3A3C',
      900: '#2C2C2E',
    },
  },
  // Apple-inspired spacing system (4pt grid)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  // Apple-inspired typography scale
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'SF Pro Display',
      'SF Pro Text',
      'Helvetica Neue',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  // Apple-inspired border radius
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
};

// Dark theme configuration (primary theme for radiology)
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: appleDesignTokens.colors.systemBlue.light,
      light: '#40A9FF',
      dark: appleDesignTokens.colors.systemBlue.dark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: appleDesignTokens.colors.medical.info,
      light: '#7DD3FC',
      dark: '#0284C7',
      contrastText: '#000000',
    },
    success: {
      main: appleDesignTokens.colors.medical.success,
      light: '#4ADE80',
      dark: '#16A34A',
    },
    warning: {
      main: appleDesignTokens.colors.medical.warning,
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: appleDesignTokens.colors.medical.critical,
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: appleDesignTokens.colors.medical.info,
      light: '#7DD3FC',
      dark: '#0284C7',
    },
    background: {
      default: '#000000',        // Pure black for DICOM viewing
      paper: '#1C1C1E',          // Apple's dark gray for cards/panels
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
};

// Light theme configuration (secondary theme)
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: appleDesignTokens.colors.systemBlue.main,
      light: appleDesignTokens.colors.systemBlue.light,
      dark: appleDesignTokens.colors.systemBlue.dark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: appleDesignTokens.colors.medical.info,
      light: '#7DD3FC',
      dark: '#0284C7',
      contrastText: '#000000',
    },
    success: {
      main: appleDesignTokens.colors.medical.success,
      light: '#4ADE80',
      dark: '#16A34A',
    },
    warning: {
      main: appleDesignTokens.colors.medical.warning,
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: appleDesignTokens.colors.medical.critical,
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: appleDesignTokens.colors.medical.info,
      light: '#7DD3FC',
      dark: '#0284C7',
    },
    background: {
      default: appleDesignTokens.colors.systemGray[50],
      paper: '#FFFFFF',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
};
// Shared typography and component configurations
const sharedThemeConfig = {
  typography: {
    fontFamily: appleDesignTokens.typography.fontFamily,
    // Apple-inspired typography scale
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      fontWeight: 400,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: appleDesignTokens.borderRadius.md,
  },
  spacing: 8, // Base spacing unit
  components: {
    // Apple-inspired button styles
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          borderRadius: appleDesignTokens.borderRadius.md,
          padding: '10px 20px',
          minHeight: 44, // Apple's minimum touch target
          transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
          '&:focus-visible': {
            outline: '2px solid',
            outlineOffset: '2px',
          },
        },
        contained: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          '&:hover': {
            boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    // Apple-inspired card styles
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          borderRadius: appleDesignTokens.borderRadius.lg,
          transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    // Apple-inspired paper styles
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'box-shadow 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        },
        elevation2: {
          boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        },
        elevation3: {
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
        },
      },
    },
    // Apple-inspired text field styles
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: appleDesignTokens.borderRadius.md,
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
          },
        },
      },
    },
    // Apple-inspired chip styles
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: appleDesignTokens.borderRadius.xl,
          fontWeight: 500,
          height: 32,
        },
      },
    },
    // Apple-inspired app bar styles
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        },
      },
    },
    // Apple-inspired drawer styles
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    // Apple-inspired list item styles
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: appleDesignTokens.borderRadius.md,
          margin: '2px 8px',
          transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(0, 122, 255, 0.15)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    // Apple-inspired tab styles
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          minHeight: 48,
          fontSize: '0.875rem',
          transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
          '&:hover': {
            opacity: 0.8,
          },
        },
      },
    },
    // Apple-inspired alert styles
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: appleDesignTokens.borderRadius.md,
          fontWeight: 500,
        },
      },
    },
    // Apple-inspired icon button styles
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: appleDesignTokens.borderRadius.md,
          transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            transform: 'scale(1.05)',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
};

// Create dark theme (primary for radiology)
export const darkTheme = createTheme({
  ...darkThemeOptions,
  ...sharedThemeConfig,
  components: {
    ...sharedThemeConfig.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(28, 28, 30, 0.8)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        ...sharedThemeConfig.components.MuiButton.styleOverrides,
        text: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          ...sharedThemeConfig.components.MuiListItem.styleOverrides.root,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          ...sharedThemeConfig.components.MuiIconButton.styleOverrides.root,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            transform: 'scale(1.05)',
          },
        },
      },
    },
  },
});

// Create light theme (secondary)
export const lightTheme = createTheme({
  ...lightThemeOptions,
  ...sharedThemeConfig,
});

// Default export (dark theme for radiology)
export const theme = darkTheme;

// Custom theme extensions for medical imaging (enhanced with Apple HIG principles)
export const medicalTheme = {
  ...darkTheme,
  palette: {
    ...darkTheme.palette,
    // DICOM-specific colors optimized for dark mode viewing
    dicom: {
      background: '#000000',           // Pure black for optimal DICOM viewing
      text: '#FFFFFF',                 // High contrast white text
      overlay: '#00FF00',              // Green for overlays (traditional radiology)
      measurement: '#FFFF00',          // Yellow for measurements
      annotation: '#FF3B30',           // Apple red for critical annotations
      roi: '#5AC8FA',                  // Apple light blue for ROI
      crosshair: '#FFFFFF',            // White crosshairs
      windowLevel: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white for window/level indicators
    },
    // Study status colors following Apple's semantic color system
    status: {
      received: '#5AC8FA',             // Apple light blue
      processing: '#FF9500',           // Apple orange
      completed: '#34C759',            // Apple green
      billed: '#AF52DE',               // Apple purple
      error: '#FF3B30',                // Apple red
      pending: '#8E8E93',              // Apple gray
    },
    // AI confidence levels using Apple's color semantics
    confidence: {
      high: '#34C759',                 // Apple green for high confidence
      medium: '#FF9500',               // Apple orange for medium confidence
      low: '#FF3B30',                  // Apple red for low confidence
    },
    // Workflow priority colors
    priority: {
      urgent: '#FF3B30',               // Apple red
      high: '#FF9500',                 // Apple orange
      normal: '#34C759',               // Apple green
      low: '#8E8E93',                  // Apple gray
    },
    // Anatomical region colors (subtle, accessible)
    anatomy: {
      chest: '#5AC8FA',                // Light blue
      abdomen: '#AF52DE',              // Purple
      pelvis: '#FF9500',               // Orange
      head: '#34C759',                 // Green
      spine: '#FFCC02',                // Yellow
      extremities: '#FF2D92',          // Pink
    },
  },
  // Medical imaging specific spacing
  spacing: {
    ...darkTheme.spacing,
    viewer: {
      toolbar: 48,                     // Standard toolbar height
      sidebar: 280,                    // Sidebar width for tools
      minimap: 120,                    // Minimap size
      thumbnail: 80,                   // Thumbnail size
    },
  },
  // Medical imaging typography
  typography: {
    ...darkTheme.typography,
    // Monospace for measurements and technical data
    monospace: {
      fontFamily: ['SF Mono', 'Monaco', 'Consolas', 'monospace'].join(','),
      fontSize: '0.875rem',
      lineHeight: 1.4,
    },
    // Patient info typography
    patientInfo: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0.02em',
    },
    // Study metadata typography
    metadata: {
      fontSize: '0.6875rem',
      fontWeight: 400,
      lineHeight: 1.3,
      color: 'rgba(255, 255, 255, 0.6)',
    },
  },
  // Medical imaging specific z-index layers
  zIndex: {
    ...darkTheme.zIndex,
    dicomViewer: 1000,
    annotations: 1100,
    measurements: 1200,
    overlays: 1300,
    contextMenu: 1400,
    modal: 1500,
  },
  // Transition presets for medical imaging interactions
  transitions: {
    // Fast transitions for real-time interactions
    fast: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Standard transitions for UI elements
    standard: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Slow transitions for complex animations
    slow: 'all 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Easing for Apple-like feel
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  },
};