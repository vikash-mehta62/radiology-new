/**
 * Tool Panel - Comprehensive Study Analysis Tools
 * 
 * Advanced tooling capabilities including:
 * - Measurement tools (length, angle, area, volume)
 * - Annotation tools (arrows, text, freehand)
 * - Image manipulation tools (zoom, pan, windowing, rotation)
 * - Advanced analysis tools (histogram, profile, ROI analysis)
 * - Synchronization and comparison tools
 * - Export and sharing capabilities
 */

import React, { 
  useState, 
  useCallback, 
  useMemo,
  useEffect
} from 'react';
import {
  Box,
  Paper,
  Typography,
  ButtonGroup,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Card,
  CardContent,
  Badge,
  useTheme
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PanTool as PanIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Rotate90DegreesCcw as RotateIcon,
  Straighten as RulerIcon,
  Timeline as AngleIcon,
  CropFree as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  Create as FreehandIcon,
  TextFields as TextIcon,
  ArrowForward as ArrowIcon,
  Brightness6 as WindowingIcon,
  Invert as InvertIcon,
  FlipCameraAndroid as FlipIcon,
  Sync as SyncIcon,
  Compare as CompareIcon,
  Assessment as HistogramIcon,
  ShowChart as ProfileIcon,
  CropOriginal as ROIIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';

// Services
import { measurementService } from '../../../services/measurementService';
import { annotationService } from '../../../services/annotationService';
import { imageProcessingService } from '../../../services/imageProcessingService';

// Types
export interface ToolPanelProps {
  // Current tool state
  activeTool?: string;
  onToolChange?: (tool: string) => void;
  
  // Image manipulation
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
  windowWidth?: number;
  windowCenter?: number;
  onWindowingChange?: (windowWidth: number, windowCenter: number) => void;
  invert?: boolean;
  onInvertChange?: (invert: boolean) => void;
  flipH?: boolean;
  flipV?: boolean;
  onFlipChange?: (flipH: boolean, flipV: boolean) => void;
  
  // Tools configuration
  enableMeasurements?: boolean;
  enableAnnotations?: boolean;
  enableAdvancedTools?: boolean;
  enableSynchronization?: boolean;
  
  // Measurements and annotations
  measurements?: any[];
  annotations?: any[];
  onMeasurementAdd?: (measurement: any) => void;
  onMeasurementUpdate?: (id: string, measurement: any) => void;
  onMeasurementDelete?: (id: string) => void;
  onAnnotationAdd?: (annotation: any) => void;
  onAnnotationUpdate?: (id: string, annotation: any) => void;
  onAnnotationDelete?: (id: string) => void;
  
  // Event handlers
  onReset?: () => void;
  onFitToWindow?: () => void;
  onExport?: () => void;
  onSave?: () => void;
  
  // Layout
  orientation?: 'vertical' | 'horizontal';
  compact?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
  sx?: any;
}

interface ToolGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  tools: Tool[];
}

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  tooltip: string;
  shortcut?: string;
  category: 'navigation' | 'measurement' | 'annotation' | 'manipulation' | 'analysis' | 'sync';
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  activeTool = 'pan',
  onToolChange,
  zoom = 1,
  onZoomChange,
  pan = { x: 0, y: 0 },
  onPanChange,
  rotation = 0,
  onRotationChange,
  windowWidth = 400,
  windowCenter = 40,
  onWindowingChange,
  invert = false,
  onInvertChange,
  flipH = false,
  flipV = false,
  onFlipChange,
  enableMeasurements = true,
  enableAnnotations = true,
  enableAdvancedTools = true,
  enableSynchronization = true,
  measurements = [],
  annotations = [],
  onMeasurementAdd,
  onMeasurementUpdate,
  onMeasurementDelete,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onReset,
  onFitToWindow,
  onExport,
  onSave,
  orientation = 'vertical',
  compact = false,
  width = orientation === 'vertical' ? 280 : '100%',
  height = orientation === 'vertical' ? '100%' : 120,
  className,
  sx
}) => {
  const theme = useTheme();
  
  // State
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'navigation', 'measurements', 'annotations'
  ]);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [windowingPreset, setWindowingPreset] = useState('custom');

  // Tool definitions
  const toolGroups: ToolGroup[] = useMemo(() => [
    {
      id: 'navigation',
      name: 'Navigation',
      icon: <PanIcon />,
      tools: [
        {
          id: 'pan',
          name: 'Pan',
          icon: <PanIcon />,
          tooltip: 'Pan image (P)',
          shortcut: 'P',
          category: 'navigation'
        },
        {
          id: 'zoom',
          name: 'Zoom',
          icon: <ZoomInIcon />,
          tooltip: 'Zoom tool (Z)',
          shortcut: 'Z',
          category: 'navigation'
        },
        {
          id: 'windowing',
          name: 'Windowing',
          icon: <WindowingIcon />,
          tooltip: 'Window/Level (W)',
          shortcut: 'W',
          category: 'navigation'
        }
      ]
    },
    {
      id: 'measurements',
      name: 'Measurements',
      icon: <RulerIcon />,
      tools: enableMeasurements ? [
        {
          id: 'length',
          name: 'Length',
          icon: <RulerIcon />,
          tooltip: 'Length measurement (L)',
          shortcut: 'L',
          category: 'measurement'
        },
        {
          id: 'angle',
          name: 'Angle',
          icon: <AngleIcon />,
          tooltip: 'Angle measurement (A)',
          shortcut: 'A',
          category: 'measurement'
        },
        {
          id: 'rectangle',
          name: 'Rectangle',
          icon: <RectangleIcon />,
          tooltip: 'Rectangle ROI (R)',
          shortcut: 'R',
          category: 'measurement'
        },
        {
          id: 'ellipse',
          name: 'Ellipse',
          icon: <CircleIcon />,
          tooltip: 'Ellipse ROI (E)',
          shortcut: 'E',
          category: 'measurement'
        },
        {
          id: 'freehand',
          name: 'Freehand',
          icon: <FreehandIcon />,
          tooltip: 'Freehand ROI (F)',
          shortcut: 'F',
          category: 'measurement'
        }
      ] : []
    },
    {
      id: 'annotations',
      name: 'Annotations',
      icon: <TextIcon />,
      tools: enableAnnotations ? [
        {
          id: 'arrow',
          name: 'Arrow',
          icon: <ArrowIcon />,
          tooltip: 'Arrow annotation',
          category: 'annotation'
        },
        {
          id: 'text',
          name: 'Text',
          icon: <TextIcon />,
          tooltip: 'Text annotation (T)',
          shortcut: 'T',
          category: 'annotation'
        }
      ] : []
    },
    {
      id: 'analysis',
      name: 'Analysis',
      icon: <HistogramIcon />,
      tools: enableAdvancedTools ? [
        {
          id: 'histogram',
          name: 'Histogram',
          icon: <HistogramIcon />,
          tooltip: 'Intensity histogram',
          category: 'analysis'
        },
        {
          id: 'profile',
          name: 'Profile',
          icon: <ProfileIcon />,
          tooltip: 'Intensity profile',
          category: 'analysis'
        },
        {
          id: 'roi_analysis',
          name: 'ROI Analysis',
          icon: <ROIIcon />,
          tooltip: 'ROI statistical analysis',
          category: 'analysis'
        }
      ] : []
    },
    {
      id: 'sync',
      name: 'Synchronization',
      icon: <SyncIcon />,
      tools: enableSynchronization ? [
        {
          id: 'sync',
          name: 'Sync',
          icon: <SyncIcon />,
          tooltip: 'Synchronize viewports',
          category: 'sync'
        },
        {
          id: 'compare',
          name: 'Compare',
          icon: <CompareIcon />,
          tooltip: 'Compare images',
          category: 'sync'
        }
      ] : []
    }
  ], [enableMeasurements, enableAnnotations, enableAdvancedTools, enableSynchronization]);

  // Handle tool selection
  const handleToolSelect = useCallback((toolId: string) => {
    if (onToolChange) {
      onToolChange(toolId);
    }
  }, [onToolChange]);

  // Handle section expand/collapse
  const handleSectionToggle = useCallback((sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  // Windowing presets
  const windowingPresets = [
    { name: 'Soft Tissue', ww: 400, wc: 40 },
    { name: 'Lung', ww: 1500, wc: -600 },
    { name: 'Bone', ww: 1800, wc: 400 },
    { name: 'Brain', ww: 80, wc: 40 },
    { name: 'Liver', ww: 150, wc: 30 },
    { name: 'Custom', ww: windowWidth, wc: windowCenter }
  ];

  // Handle windowing preset change
  const handleWindowingPresetChange = useCallback((presetName: string) => {
    setWindowingPreset(presetName);
    const preset = windowingPresets.find(p => p.name === presetName);
    if (preset && onWindowingChange) {
      onWindowingChange(preset.ww, preset.wc);
    }
  }, [windowingPresets, onWindowingChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key.toLowerCase();
      const tool = toolGroups
        .flatMap(group => group.tools)
        .find(tool => tool.shortcut?.toLowerCase() === key);

      if (tool) {
        event.preventDefault();
        handleToolSelect(tool.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toolGroups, handleToolSelect]);

  // Render tool button
  const renderToolButton = (tool: Tool) => (
    <Tooltip key={tool.id} title={`${tool.tooltip}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}>
      <Button
        variant={activeTool === tool.id ? 'contained' : 'outlined'}
        size={compact ? 'small' : 'medium'}
        onClick={() => handleToolSelect(tool.id)}
        sx={{
          minWidth: compact ? 36 : 48,
          aspectRatio: compact ? '1' : 'auto',
          ...(orientation === 'horizontal' && { mx: 0.5 })
        }}
      >
        {tool.icon}
        {!compact && orientation === 'vertical' && (
          <Typography variant="caption" sx={{ ml: 1 }}>
            {tool.name}
          </Typography>
        )}
      </Button>
    </Tooltip>
  );

  // Render tool group
  const renderToolGroup = (group: ToolGroup) => {
    if (group.tools.length === 0) return null;

    const isExpanded = expandedSections.includes(group.id);

    if (orientation === 'horizontal') {
      return (
        <Box key={group.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {group.name}
          </Typography>
          <ButtonGroup size="small">
            {group.tools.map(renderToolButton)}
          </ButtonGroup>
        </Box>
      );
    }

    return (
      <Accordion
        key={group.id}
        expanded={isExpanded}
        onChange={() => handleSectionToggle(group.id)}
        sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {group.icon}
            <Typography variant="subtitle2">{group.name}</Typography>
            {group.id === 'measurements' && measurements.length > 0 && (
              <Badge badgeContent={measurements.length} color="primary" />
            )}
            {group.id === 'annotations' && annotations.length > 0 && (
              <Badge badgeContent={annotations.length} color="secondary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.tools.map(renderToolButton)}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Paper
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        overflow: 'auto',
        ...sx
      }}
    >
      {orientation === 'vertical' ? (
        <>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">Tools</Typography>
          </Box>

          {/* Tool Groups */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {toolGroups.map(renderToolGroup)}

            {/* Image Manipulation Controls */}
            <Accordion
              expanded={expandedSections.includes('manipulation')}
              onChange={() => handleSectionToggle('manipulation')}
              sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon />
                  <Typography variant="subtitle2">Image Controls</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Zoom */}
                  <Box>
                    <Typography variant="caption" gutterBottom>
                      Zoom: {(zoom * 100).toFixed(0)}%
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => onZoomChange?.(Math.max(0.1, zoom - 0.1))}
                      >
                        <ZoomOutIcon />
                      </IconButton>
                      <Slider
                        value={zoom}
                        min={0.1}
                        max={5}
                        step={0.1}
                        onChange={(_, value) => onZoomChange?.(value as number)}
                        sx={{ flex: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => onZoomChange?.(Math.min(5, zoom + 0.1))}
                      >
                        <ZoomInIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Rotation */}
                  <Box>
                    <Typography variant="caption" gutterBottom>
                      Rotation: {rotation}°
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => onRotationChange?.((rotation - 90) % 360)}
                      >
                        <RotateIcon />
                      </IconButton>
                      <Slider
                        value={rotation}
                        min={-180}
                        max={180}
                        step={1}
                        onChange={(_, value) => onRotationChange?.(value as number)}
                        sx={{ flex: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => onRotationChange?.((rotation + 90) % 360)}
                      >
                        <RotateIcon sx={{ transform: 'scaleX(-1)' }} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Windowing */}
                  <Box>
                    <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                      <InputLabel>Windowing Preset</InputLabel>
                      <Select
                        value={windowingPreset}
                        onChange={(e) => handleWindowingPresetChange(e.target.value)}
                      >
                        {windowingPresets.map(preset => (
                          <MenuItem key={preset.name} value={preset.name}>
                            {preset.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          label="Window Width"
                          type="number"
                          size="small"
                          value={windowWidth}
                          onChange={(e) => onWindowingChange?.(
                            parseInt(e.target.value) || 0,
                            windowCenter
                          )}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Window Center"
                          type="number"
                          size="small"
                          value={windowCenter}
                          onChange={(e) => onWindowingChange?.(
                            windowWidth,
                            parseInt(e.target.value) || 0
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Image Transformations */}
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={invert}
                          onChange={(e) => onInvertChange?.(e.target.checked)}
                        />
                      }
                      label="Invert"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={flipH}
                          onChange={(e) => onFlipChange?.(e.target.checked, flipV)}
                        />
                      }
                      label="Flip Horizontal"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={flipV}
                          onChange={(e) => onFlipChange?.(flipH, e.target.checked)}
                        />
                      }
                      label="Flip Vertical"
                    />
                  </Box>

                  {/* Quick Actions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      onClick={onReset}
                      startIcon={<UndoIcon />}
                    >
                      Reset
                    </Button>
                    <Button
                      size="small"
                      onClick={onFitToWindow}
                      startIcon={<ZoomInIcon />}
                    >
                      Fit
                    </Button>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Measurements List */}
            {enableMeasurements && measurements.length > 0 && (
              <Accordion
                expanded={expandedSections.includes('measurement_list')}
                onChange={() => handleSectionToggle('measurement_list')}
                sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RulerIcon />
                    <Typography variant="subtitle2">
                      Measurements ({measurements.length})
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMeasurements(!showMeasurements);
                      }}
                    >
                      {showMeasurements ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {measurements.map((measurement, index) => (
                      <ListItem key={measurement.id || index}>
                        <ListItemIcon>
                          <RulerIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={measurement.type}
                          secondary={measurement.value}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => onMeasurementDelete?.(measurement.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Annotations List */}
            {enableAnnotations && annotations.length > 0 && (
              <Accordion
                expanded={expandedSections.includes('annotation_list')}
                onChange={() => handleSectionToggle('annotation_list')}
                sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextIcon />
                    <Typography variant="subtitle2">
                      Annotations ({annotations.length})
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAnnotations(!showAnnotations);
                      }}
                    >
                      {showAnnotations ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {annotations.map((annotation, index) => (
                      <ListItem key={annotation.id || index}>
                        <ListItemIcon>
                          <TextIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={annotation.type}
                          secondary={annotation.text}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => onAnnotationDelete?.(annotation.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                onClick={onSave}
                startIcon={<SaveIcon />}
                variant="contained"
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={onExport}
                startIcon={<ShareIcon />}
                variant="outlined"
              >
                Export
              </Button>
            </Box>
          </Box>
        </>
      ) : (
        /* Horizontal Layout */
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, overflow: 'auto' }}>
          {toolGroups.map(renderToolGroup)}
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">Zoom:</Typography>
            <Chip label={`${(zoom * 100).toFixed(0)}%`} size="small" />
            <IconButton size="small" onClick={() => onZoomChange?.(zoom - 0.1)}>
              <ZoomOutIcon />
            </IconButton>
            <IconButton size="small" onClick={() => onZoomChange?.(zoom + 0.1)}>
              <ZoomInIcon />
            </IconButton>
            <IconButton size="small" onClick={onFitToWindow}>
              <ZoomInIcon />
            </IconButton>
            <IconButton size="small" onClick={onReset}>
              <UndoIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ToolPanel;
export type { ToolPanelProps, ToolGroup, Tool };