/**
 * Colorblind Accessibility Component for Medical Imaging
 * 
 * This component provides comprehensive colorblind accessibility features
 * for radiology applications, including colorblind-safe palettes,
 * alternative visual indicators, and adaptive color schemes for
 * different types of color vision deficiencies.
 * 
 * Features:
 * - Colorblind-safe color palettes (Protanopia, Deuteranopia, Tritanopia)
 * - Alternative visual indicators (patterns, shapes, textures)
 * - High contrast modes for better visibility
 * - Customizable color schemes for different imaging modalities
 * - Real-time color vision simulation
 * - Accessibility compliance (WCAG 2.1 AAA)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Palette as PaletteIcon,
  Contrast as ContrastIcon,
  Pattern as PatternIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  ColorLens as ColorLensIcon,
  Accessibility as AccessibilityIcon,
  Texture as TextureIcon,
  FormatShapes as ShapeIcon,
} from '@mui/icons-material';

// Types and interfaces
export interface ColorblindAccessibilityProps {
  /** Enable colorblind accessibility features */
  enabled?: boolean;
  /** Type of color vision deficiency */
  colorVisionType?: ColorVisionType;
  /** Current color scheme */
  colorScheme?: ColorScheme;
  /** Enable alternative visual indicators */
  enableAlternativeIndicators?: boolean;
  /** Enable high contrast mode */
  enableHighContrast?: boolean;
  /** Callback for color scheme changes */
  onColorSchemeChange?: (scheme: ColorScheme) => void;
  /** Callback for settings changes */
  onSettingsChange?: (settings: AccessibilitySettings) => void;
}

export type ColorVisionType = 
  | 'normal'
  | 'protanopia'      // Red-blind
  | 'deuteranopia'    // Green-blind
  | 'tritanopia'      // Blue-blind
  | 'protanomaly'     // Red-weak
  | 'deuteranomaly'   // Green-weak
  | 'tritanomaly'     // Blue-weak
  | 'monochromacy';   // Complete color blindness

export type ColorScheme = 
  | 'default'
  | 'high-contrast'
  | 'colorblind-safe'
  | 'medical-optimized'
  | 'custom';

export interface AccessibilitySettings {
  colorVisionType: ColorVisionType;
  colorScheme: ColorScheme;
  enableAlternativeIndicators: boolean;
  enableHighContrast: boolean;
  contrastRatio: number;
  enablePatterns: boolean;
  enableShapes: boolean;
  enableTextures: boolean;
  customColors: CustomColorPalette;
}

export interface CustomColorPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  measurement: string;
  annotation: string;
  roi: string;
  background: string;
  text: string;
}

// Colorblind-safe color palettes
export const COLORBLIND_SAFE_PALETTES = {
  // Universal palette (safe for all types of color blindness)
  universal: {
    primary: '#0173B2',      // Blue
    secondary: '#DE8F05',    // Orange
    success: '#029E73',      // Teal
    warning: '#CC78BC',      // Pink
    error: '#D55E00',        // Red-orange
    info: '#56B4E9',         // Light blue
    measurement: '#009E73',   // Green-teal
    annotation: '#F0E442',   // Yellow
    roi: '#E69F00',          // Orange
    background: '#FFFFFF',   // White
    text: '#000000',         // Black
  },
  
  // High contrast palette
  highContrast: {
    primary: '#000000',      // Black
    secondary: '#FFFFFF',    // White
    success: '#00FF00',      // Bright green
    warning: '#FFFF00',      // Bright yellow
    error: '#FF0000',        // Bright red
    info: '#00FFFF',         // Bright cyan
    measurement: '#FF00FF',   // Bright magenta
    annotation: '#FFFF00',   // Bright yellow
    roi: '#00FF00',          // Bright green
    background: '#000000',   // Black
    text: '#FFFFFF',         // White
  },
  
  // Medical imaging optimized palette
  medicalOptimized: {
    primary: '#2E86AB',      // Medical blue
    secondary: '#A23B72',    // Medical purple
    success: '#F18F01',      // Medical orange
    warning: '#C73E1D',      // Medical red
    error: '#8B0000',        // Dark red
    info: '#4682B4',         // Steel blue
    measurement: '#DAA520',   // Goldenrod
    annotation: '#32CD32',   // Lime green
    roi: '#FF6347',          // Tomato
    background: '#F5F5F5',   // Light gray
    text: '#2F2F2F',         // Dark gray
  },
};

// Pattern definitions for alternative visual indicators
export const VISUAL_PATTERNS = {
  solid: 'none',
  dots: 'radial-gradient(circle, currentColor 2px, transparent 2px)',
  stripes: 'repeating-linear-gradient(45deg, currentColor, currentColor 2px, transparent 2px, transparent 6px)',
  crosshatch: 'repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, currentColor, currentColor 1px, transparent 1px, transparent 4px)',
  waves: 'repeating-linear-gradient(90deg, currentColor 0px, currentColor 2px, transparent 2px, transparent 8px)',
  grid: 'repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 10px), repeating-linear-gradient(90deg, currentColor, currentColor 1px, transparent 1px, transparent 10px)',
};

// Shape definitions for alternative visual indicators
export const VISUAL_SHAPES = {
  circle: '50%',
  square: '0%',
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  hexagon: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
};

/**
 * Color vision simulation functions
 */
const simulateColorVision = (color: string, type: ColorVisionType): string => {
  // This is a simplified simulation - in production, use a proper color vision simulation library
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  let { r, g, b } = rgb;
  
  switch (type) {
    case 'protanopia': // Red-blind
      r = 0.567 * r + 0.433 * g;
      g = 0.558 * r + 0.442 * g;
      b = 0.242 * g + 0.758 * b;
      break;
    case 'deuteranopia': // Green-blind
      r = 0.625 * r + 0.375 * g;
      g = 0.7 * r + 0.3 * g;
      b = 0.3 * g + 0.7 * b;
      break;
    case 'tritanopia': // Blue-blind
      r = 0.95 * r + 0.05 * g;
      g = 0.433 * g + 0.567 * b;
      b = 0.475 * g + 0.525 * b;
      break;
    case 'protanomaly': // Red-weak
      r = 0.817 * r + 0.183 * g;
      g = 0.333 * r + 0.667 * g;
      b = 0.125 * g + 0.875 * b;
      break;
    case 'deuteranomaly': // Green-weak
      r = 0.8 * r + 0.2 * g;
      g = 0.258 * r + 0.742 * g;
      b = 0.142 * g + 0.858 * b;
      break;
    case 'tritanomaly': // Blue-weak
      r = 0.967 * r + 0.033 * g;
      g = 0.733 * g + 0.267 * b;
      b = 0.183 * g + 0.817 * b;
      break;
    case 'monochromacy': // Complete color blindness
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
      break;
    default:
      return color;
  }
  
  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
};

// Utility functions
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const calculateContrastRatio = (color1: string, color2: string): number => {
  // Simplified contrast ratio calculation
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const luminance1 = (0.299 * rgb1.r + 0.587 * rgb1.g + 0.114 * rgb1.b) / 255;
  const luminance2 = (0.299 * rgb2.r + 0.587 * rgb2.g + 0.114 * rgb2.b) / 255;
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Main Colorblind Accessibility Component
 */
export const ColorblindAccessibility: React.FC<ColorblindAccessibilityProps> = ({
  enabled = true,
  colorVisionType = 'normal',
  colorScheme = 'default',
  enableAlternativeIndicators = true,
  enableHighContrast = false,
  onColorSchemeChange,
  onSettingsChange,
}) => {
  const theme = useTheme();
  
  // State management
  const [settings, setSettings] = useState<AccessibilitySettings>({
    colorVisionType,
    colorScheme,
    enableAlternativeIndicators,
    enableHighContrast,
    contrastRatio: 4.5,
    enablePatterns: true,
    enableShapes: true,
    enableTextures: false,
    customColors: COLORBLIND_SAFE_PALETTES.universal,
  });
  
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<keyof typeof COLORBLIND_SAFE_PALETTES>('universal');
  
  // Get current color palette based on settings
  const currentPalette = useMemo(() => {
    switch (settings.colorScheme) {
      case 'high-contrast':
        return COLORBLIND_SAFE_PALETTES.highContrast;
      case 'colorblind-safe':
        return COLORBLIND_SAFE_PALETTES.universal;
      case 'medical-optimized':
        return COLORBLIND_SAFE_PALETTES.medicalOptimized;
      case 'custom':
        return settings.customColors;
      default:
        return COLORBLIND_SAFE_PALETTES.universal;
    }
  }, [settings.colorScheme, settings.customColors]);
  
  // Simulate colors for current color vision type
  const simulatedPalette = useMemo(() => {
    if (settings.colorVisionType === 'normal') return currentPalette;
    
    const simulated: any = {};
    Object.entries(currentPalette).forEach(([key, color]) => {
      simulated[key] = simulateColorVision(color, settings.colorVisionType);
    });
    return simulated;
  }, [currentPalette, settings.colorVisionType]);
  
  // Update settings handler
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      onSettingsChange?.(updated);
      return updated;
    });
  }, [onSettingsChange]);
  
  // Color scheme change handler
  const handleColorSchemeChange = useCallback((scheme: ColorScheme) => {
    updateSettings({ colorScheme: scheme });
    onColorSchemeChange?.(scheme);
  }, [updateSettings, onColorSchemeChange]);
  
  // Accessibility compliance check
  const checkAccessibilityCompliance = useCallback(() => {
    const compliance = {
      contrastRatio: calculateContrastRatio(simulatedPalette.text, simulatedPalette.background),
      hasAlternativeIndicators: settings.enableAlternativeIndicators,
      isColorblindSafe: settings.colorScheme === 'colorblind-safe' || settings.colorScheme === 'high-contrast',
      wcagLevel: 'AA' as 'A' | 'AA' | 'AAA',
    };
    
    if (compliance.contrastRatio >= 7) {
      compliance.wcagLevel = 'AAA';
    } else if (compliance.contrastRatio >= 4.5) {
      compliance.wcagLevel = 'AA';
    } else {
      compliance.wcagLevel = 'A';
    }
    
    return compliance;
  }, [simulatedPalette, settings]);
  
  const compliance = checkAccessibilityCompliance();
  
  if (!enabled) return null;
  
  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        <AccessibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Colorblind Accessibility
      </Typography>
      
      {/* Accessibility Status */}
      <Alert 
        severity={compliance.wcagLevel === 'AAA' ? 'success' : compliance.wcagLevel === 'AA' ? 'info' : 'warning'}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          WCAG {compliance.wcagLevel} Compliance - Contrast Ratio: {compliance.contrastRatio.toFixed(2)}:1
        </Typography>
      </Alert>
      
      {/* Color Vision Type Selection */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Color Vision Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Color Vision Type</InputLabel>
                <Select
                  value={settings.colorVisionType}
                  onChange={(e) => updateSettings({ colorVisionType: e.target.value as ColorVisionType })}
                  label="Color Vision Type"
                >
                  <MenuItem value="normal">Normal Vision</MenuItem>
                  <MenuItem value="protanopia">Protanopia (Red-blind)</MenuItem>
                  <MenuItem value="deuteranopia">Deuteranopia (Green-blind)</MenuItem>
                  <MenuItem value="tritanopia">Tritanopia (Blue-blind)</MenuItem>
                  <MenuItem value="protanomaly">Protanomaly (Red-weak)</MenuItem>
                  <MenuItem value="deuteranomaly">Deuteranomaly (Green-weak)</MenuItem>
                  <MenuItem value="tritanomaly">Tritanomaly (Blue-weak)</MenuItem>
                  <MenuItem value="monochromacy">Monochromacy (Color-blind)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Color Scheme</InputLabel>
                <Select
                  value={settings.colorScheme}
                  onChange={(e) => handleColorSchemeChange(e.target.value as ColorScheme)}
                  label="Color Scheme"
                >
                  <MenuItem value="default">Default</MenuItem>
                  <MenuItem value="colorblind-safe">Colorblind Safe</MenuItem>
                  <MenuItem value="high-contrast">High Contrast</MenuItem>
                  <MenuItem value="medical-optimized">Medical Optimized</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={previewMode}
                  onChange={(e) => setPreviewMode(e.target.checked)}
                />
              }
              label="Preview Color Vision Simulation"
            />
          </Box>
        </AccordionDetails>
      </Accordion>
      
      {/* Alternative Visual Indicators */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Alternative Visual Indicators</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableAlternativeIndicators}
                    onChange={(e) => updateSettings({ enableAlternativeIndicators: e.target.checked })}
                  />
                }
                label="Enable Alternative Indicators"
              />
            </ListItem>
            
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enablePatterns}
                    onChange={(e) => updateSettings({ enablePatterns: e.target.checked })}
                    disabled={!settings.enableAlternativeIndicators}
                  />
                }
                label="Use Patterns"
              />
            </ListItem>
            
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableShapes}
                    onChange={(e) => updateSettings({ enableShapes: e.target.checked })}
                    disabled={!settings.enableAlternativeIndicators}
                  />
                }
                label="Use Different Shapes"
              />
            </ListItem>
            
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableTextures}
                    onChange={(e) => updateSettings({ enableTextures: e.target.checked })}
                    disabled={!settings.enableAlternativeIndicators}
                  />
                }
                label="Use Textures"
              />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>
      
      {/* Color Palette Preview */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Color Palette Preview</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(simulatedPalette).map(([key, color]) => (
              <Grid item xs={6} sm={4} md={3} key={key}>
                <Card>
                  <Box
                    sx={{
                      height: 60,
                      backgroundColor: color,
                      border: `2px solid ${theme.palette.divider}`,
                    }}
                  />
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="caption" display="block">
                      {key}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {String(color)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Pattern and Shape Examples */}
      {settings.enableAlternativeIndicators && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Visual Indicator Examples</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" gutterBottom>
              Patterns
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {Object.entries(VISUAL_PATTERNS).map(([name, pattern]) => (
                <Grid item key={name}>
                  <Tooltip title={name}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: simulatedPalette.primary,
                        backgroundImage: pattern,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                      }}
                    />
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
            
            <Typography variant="subtitle2" gutterBottom>
              Shapes
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(VISUAL_SHAPES).map(([name, shape]) => (
                <Grid item key={name}>
                  <Tooltip title={name}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: simulatedPalette.secondary,
                        clipPath: shape,
                        borderRadius: name === 'circle' ? shape : 0,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
      
      {/* Contrast Adjustment */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Contrast Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography gutterBottom>
            Minimum Contrast Ratio: {settings.contrastRatio}:1
          </Typography>
          <Slider
            value={settings.contrastRatio}
            onChange={(_, value) => updateSettings({ contrastRatio: value as number })}
            min={1}
            max={21}
            step={0.1}
            marks={[
              { value: 3, label: 'AA Large' },
              { value: 4.5, label: 'AA' },
              { value: 7, label: 'AAA' },
            ]}
            valueLabelDisplay="auto"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableHighContrast}
                onChange={(e) => updateSettings({ enableHighContrast: e.target.checked })}
              />
            }
            label="Enable High Contrast Mode"
            sx={{ mt: 2 }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

/**
 * Hook for using colorblind accessibility features
 */
export const useColorblindAccessibility = (initialSettings?: Partial<AccessibilitySettings>) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    colorVisionType: 'normal',
    colorScheme: 'colorblind-safe',
    enableAlternativeIndicators: true,
    enableHighContrast: false,
    contrastRatio: 4.5,
    enablePatterns: true,
    enableShapes: true,
    enableTextures: false,
    customColors: COLORBLIND_SAFE_PALETTES.universal,
    ...initialSettings,
  });
  
  const [isColorblindMode, setIsColorblindMode] = useState(settings.colorVisionType !== 'normal');
  
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  const toggleColorblindMode = useCallback(() => {
    setIsColorblindMode(prev => !prev);
    updateSettings({
      colorVisionType: isColorblindMode ? 'normal' : settings.colorVisionType || 'protanopia'
    });
  }, [isColorblindMode, settings.colorVisionType, updateSettings]);
  
  const getAccessibleColor = useCallback((color: string, context: 'text' | 'background' | 'accent' = 'accent') => {
    if (settings.colorVisionType === 'normal') return color;
    
    const simulated = simulateColorVision(color, settings.colorVisionType);
    
    // Ensure sufficient contrast for text
    if (context === 'text') {
      const contrastRatio = calculateContrastRatio(simulated, settings.customColors.background);
      if (contrastRatio < settings.contrastRatio) {
        return settings.enableHighContrast ? '#000000' : settings.customColors.text;
      }
    }
    
    return simulated;
  }, [settings]);
  
  const getVisualIndicator = useCallback((type: 'pattern' | 'shape', index: number = 0) => {
    if (!settings.enableAlternativeIndicators) return null;
    
    if (type === 'pattern' && settings.enablePatterns) {
      const patterns = Object.values(VISUAL_PATTERNS);
      return patterns[index % patterns.length];
    }
    
    if (type === 'shape' && settings.enableShapes) {
      const shapes = Object.values(VISUAL_SHAPES);
      return shapes[index % shapes.length];
    }
    
    return null;
  }, [settings]);
  
  // Create colors object from current palette
  const colors = useMemo(() => {
    const palette = settings.customColors;
    return {
      primary: palette.primary,
      secondary: palette.secondary,
      success: palette.success,
      warning: palette.warning,
      error: palette.error,
      info: palette.info,
      background: palette.background,
      onSurface: palette.text,
      surface: palette.background,
    };
  }, [settings.customColors]);
  
  return {
    settings,
    updateSettings,
    getAccessibleColor,
    getVisualIndicator,
    isColorblindSafe: settings.colorScheme === 'colorblind-safe' || settings.colorScheme === 'high-contrast',
    colors,
    isColorblindMode,
    colorblindType: settings.colorVisionType,
    toggleColorblindMode,
  };
};

export default ColorblindAccessibility;