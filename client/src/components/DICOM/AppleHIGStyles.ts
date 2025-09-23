/**
 * Apple Human Interface Guidelines (HIG) Styling System
 * Optimized for medical imaging and radiology workflows
 */

import { Theme, alpha } from '@mui/material/styles';

// Apple HIG Color System for Medical Imaging
export const appleHIGColors = {
  // System Colors (Light Mode)
  light: {
    // Primary System Colors
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemIndigo: '#5856D6',
    systemOrange: '#FF9500',
    systemPink: '#FF2D92',
    systemPurple: '#AF52DE',
    systemRed: '#FF3B30',
    systemTeal: '#5AC8FA',
    systemYellow: '#FFCC00',

    // Gray Colors
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',

    // Label Colors
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C43',
    quaternaryLabel: '#2C2C2E',

    // Fill Colors
    systemFill: '#78788033',
    secondarySystemFill: '#78788028',
    tertiarySystemFill: '#7676801E',
    quaternarySystemFill: '#74748014',

    // Background Colors
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',

    // Grouped Background Colors
    systemGroupedBackground: '#F2F2F7',
    secondarySystemGroupedBackground: '#FFFFFF',
    tertiarySystemGroupedBackground: '#F2F2F7',

    // Separator Colors
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',

    // Medical Imaging Specific
    dicomBackground: '#000000',
    dicomOverlay: '#00FF00',
    dicomText: '#FFFF00',
    dicomMeasurement: '#FF0080',
    dicomAnnotation: '#00FFFF',
  },

  // System Colors (Dark Mode)
  dark: {
    // Primary System Colors
    systemBlue: '#0A84FF',
    systemGreen: '#30D158',
    systemIndigo: '#5E5CE6',
    systemOrange: '#FF9F0A',
    systemPink: '#FF375F',
    systemPurple: '#BF5AF2',
    systemRed: '#FF453A',
    systemTeal: '#64D2FF',
    systemYellow: '#FFD60A',

    // Gray Colors
    systemGray: '#8E8E93',
    systemGray2: '#636366',
    systemGray3: '#48484A',
    systemGray4: '#3A3A3C',
    systemGray5: '#2C2C2E',
    systemGray6: '#1C1C1E',

    // Label Colors
    label: '#FFFFFF',
    secondaryLabel: '#EBEBF5',
    tertiaryLabel: '#EBEBF5',
    quaternaryLabel: '#EBEBF5',

    // Fill Colors
    systemFill: '#78788033',
    secondarySystemFill: '#78788028',
    tertiarySystemFill: '#7676801E',
    quaternarySystemFill: '#74748014',

    // Background Colors
    systemBackground: '#000000',
    secondarySystemBackground: '#1C1C1E',
    tertiarySystemBackground: '#2C2C2E',

    // Grouped Background Colors
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    tertiarySystemGroupedBackground: '#2C2C2E',

    // Separator Colors
    separator: '#54545899',
    opaqueSeparator: '#38383A',

    // Medical Imaging Specific
    dicomBackground: '#000000',
    dicomOverlay: '#00FF00',
    dicomText: '#FFFF00',
    dicomMeasurement: '#FF0080',
    dicomAnnotation: '#00FFFF',
  }
};

// Typography System following Apple HIG
export const appleHIGTypography = {
  // iOS Text Styles
  largeTitle: {
    fontSize: '34px',
    fontWeight: 400,
    lineHeight: '41px',
    letterSpacing: '0.37px',
  },
  title1: {
    fontSize: '28px',
    fontWeight: 400,
    lineHeight: '34px',
    letterSpacing: '0.36px',
  },
  title2: {
    fontSize: '22px',
    fontWeight: 400,
    lineHeight: '28px',
    letterSpacing: '0.35px',
  },
  title3: {
    fontSize: '20px',
    fontWeight: 400,
    lineHeight: '25px',
    letterSpacing: '0.38px',
  },
  headline: {
    fontSize: '17px',
    fontWeight: 600,
    lineHeight: '22px',
    letterSpacing: '-0.41px',
  },
  body: {
    fontSize: '17px',
    fontWeight: 400,
    lineHeight: '22px',
    letterSpacing: '-0.41px',
  },
  callout: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '21px',
    letterSpacing: '-0.32px',
  },
  subheadline: {
    fontSize: '15px',
    fontWeight: 400,
    lineHeight: '20px',
    letterSpacing: '-0.24px',
  },
  footnote: {
    fontSize: '13px',
    fontWeight: 400,
    lineHeight: '18px',
    letterSpacing: '-0.08px',
  },
  caption1: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '16px',
    letterSpacing: '0px',
  },
  caption2: {
    fontSize: '11px',
    fontWeight: 400,
    lineHeight: '13px',
    letterSpacing: '0.07px',
  },

  // Medical Imaging Specific
  dicomOverlay: {
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'Monaco, "Courier New", monospace',
    lineHeight: '14px',
  },
  measurement: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Monaco, "Courier New", monospace',
    lineHeight: '16px',
  },
};

// Spacing System (8pt grid)
export const appleHIGSpacing = {
  xs: 4,   // 0.5 * 8
  sm: 8,   // 1 * 8
  md: 16,  // 2 * 8
  lg: 24,  // 3 * 8
  xl: 32,  // 4 * 8
  xxl: 48, // 6 * 8
  xxxl: 64, // 8 * 8
};

// Border Radius System
export const appleHIGBorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: '50%',
  continuous: '20px', // Apple's continuous corner radius
};

// Shadow System
export const appleHIGShadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  xxl: '0 25px 50px rgba(0, 0, 0, 0.25)',
  
  // Medical imaging specific shadows
  dicomPanel: '0 8px 32px rgba(0, 0, 0, 0.3)',
  floatingControls: '0 12px 40px rgba(0, 0, 0, 0.15)',
};

// Animation System
export const appleHIGAnimations = {
  // Timing Functions
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',

  // Durations
  shortest: 150,
  shorter: 200,
  short: 250,
  standard: 300,
  complex: 375,
  enteringScreen: 225,
  leavingScreen: 195,

  // Medical imaging specific
  dicomTransition: 200,
  toolbarSlide: 300,
  overlayFade: 150,
};

// Component Styles
export const createAppleHIGStyles = (theme: Theme, isDark: boolean) => {
  const colors = isDark ? appleHIGColors.dark : appleHIGColors.light;

  return {
    // Button Styles
    primaryButton: {
      backgroundColor: colors.systemBlue,
      color: '#FFFFFF',
      borderRadius: appleHIGBorderRadius.lg,
      padding: `${appleHIGSpacing.sm}px ${appleHIGSpacing.md}px`,
      fontSize: appleHIGTypography.body.fontSize,
      fontWeight: appleHIGTypography.headline.fontWeight,
      textTransform: 'none' as const,
      boxShadow: appleHIGShadows.sm,
      transition: `all ${appleHIGAnimations.short}ms ${appleHIGAnimations.easeInOut}`,
      '&:hover': {
        backgroundColor: alpha(colors.systemBlue, 0.8),
        boxShadow: appleHIGShadows.md,
        transform: 'translateY(-1px)',
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: appleHIGShadows.sm,
      },
    },

    secondaryButton: {
      backgroundColor: 'transparent',
      color: colors.systemBlue,
      border: `1px solid ${colors.systemBlue}`,
      borderRadius: appleHIGBorderRadius.lg,
      padding: `${appleHIGSpacing.sm}px ${appleHIGSpacing.md}px`,
      fontSize: appleHIGTypography.body.fontSize,
      fontWeight: appleHIGTypography.body.fontWeight,
      textTransform: 'none' as const,
      transition: `all ${appleHIGAnimations.short}ms ${appleHIGAnimations.easeInOut}`,
      '&:hover': {
        backgroundColor: alpha(colors.systemBlue, 0.1),
      },
    },

    // Card Styles
    card: {
      backgroundColor: colors.secondarySystemBackground,
      borderRadius: appleHIGBorderRadius.xl,
      boxShadow: appleHIGShadows.md,
      border: `1px solid ${colors.separator}`,
      overflow: 'hidden',
      transition: `all ${appleHIGAnimations.standard}ms ${appleHIGAnimations.easeInOut}`,
      '&:hover': {
        boxShadow: appleHIGShadows.lg,
        transform: 'translateY(-2px)',
      },
    },

    // Panel Styles
    panel: {
      backgroundColor: colors.systemBackground,
      borderRadius: appleHIGBorderRadius.lg,
      border: `1px solid ${colors.separator}`,
      boxShadow: appleHIGShadows.sm,
    },

    // Toolbar Styles
    toolbar: {
      backgroundColor: alpha(colors.systemBackground, 0.8),
      backdropFilter: 'blur(20px)',
      borderRadius: appleHIGBorderRadius.lg,
      border: `1px solid ${colors.separator}`,
      boxShadow: appleHIGShadows.floatingControls,
      padding: appleHIGSpacing.sm,
    },

    // DICOM Viewer Specific Styles
    dicomViewer: {
      backgroundColor: colors.dicomBackground,
      borderRadius: appleHIGBorderRadius.lg,
      overflow: 'hidden',
      position: 'relative' as const,
    },

    dicomOverlay: {
      color: colors.dicomOverlay,
      fontFamily: appleHIGTypography.dicomOverlay.fontFamily,
      fontSize: appleHIGTypography.dicomOverlay.fontSize,
      fontWeight: appleHIGTypography.dicomOverlay.fontWeight,
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
      userSelect: 'none' as const,
    },

    dicomMeasurement: {
      color: colors.dicomMeasurement,
      fontFamily: appleHIGTypography.measurement.fontFamily,
      fontSize: appleHIGTypography.measurement.fontSize,
      fontWeight: appleHIGTypography.measurement.fontWeight,
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
    },

    // Touch Controls
    touchControl: {
      backgroundColor: alpha(colors.systemBackground, 0.9),
      backdropFilter: 'blur(20px)',
      borderRadius: appleHIGBorderRadius.continuous,
      border: `1px solid ${colors.separator}`,
      boxShadow: appleHIGShadows.floatingControls,
      padding: appleHIGSpacing.md,
    },

    // Accessibility Styles
    focusRing: {
      outline: `2px solid ${colors.systemBlue}`,
      outlineOffset: '2px',
    },

    highContrast: {
      border: `2px solid ${colors.label}`,
      backgroundColor: colors.systemBackground,
      color: colors.label,
    },

    // Animation Classes
    slideIn: {
      animation: `slideIn ${appleHIGAnimations.enteringScreen}ms ${appleHIGAnimations.easeOut}`,
    },

    fadeIn: {
      animation: `fadeIn ${appleHIGAnimations.overlayFade}ms ${appleHIGAnimations.easeInOut}`,
    },

    // Responsive Breakpoints (Apple device sizes)
    breakpoints: {
      iPhone: '@media (max-width: 428px)',
      iPad: '@media (min-width: 429px) and (max-width: 1024px)',
      desktop: '@media (min-width: 1025px)',
    },
  };
};

// CSS-in-JS Keyframes
export const appleHIGKeyframes = `
  @keyframes slideIn {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
`;

// Utility Functions
export const getColorForMode = (lightColor: string, darkColor: string, isDark: boolean) => {
  return isDark ? darkColor : lightColor;
};

export const createGlassEffect = (isDark: boolean) => ({
  backgroundColor: alpha(isDark ? '#000000' : '#FFFFFF', 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(isDark ? '#FFFFFF' : '#000000', 0.1)}`,
});

export const createNeumorphism = (isDark: boolean) => ({
  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
  boxShadow: isDark 
    ? 'inset 5px 5px 10px #1a1a1c, inset -5px -5px 10px #3e3e40'
    : 'inset 5px 5px 10px #d1d1d6, inset -5px -5px 10px #ffffff',
});

export default {
  colors: appleHIGColors,
  typography: appleHIGTypography,
  spacing: appleHIGSpacing,
  borderRadius: appleHIGBorderRadius,
  shadows: appleHIGShadows,
  animations: appleHIGAnimations,
  createStyles: createAppleHIGStyles,
  keyframes: appleHIGKeyframes,
  getColorForMode,
  createGlassEffect,
  createNeumorphism,
};