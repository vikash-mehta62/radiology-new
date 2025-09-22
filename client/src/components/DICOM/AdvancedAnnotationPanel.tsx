/**
 * Advanced Annotation Panel Component
 * Comprehensive annotation system with templates, layers, and collaboration
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Button,
  ButtonGroup,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Slider,
  Badge,
  Avatar,
  AvatarGroup,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  Add,
  Save,
  Share,
  Download,
  Upload,
  Layers,
  Group,
  Article,
  TextFields,
  Timeline,
  RadioButtonUnchecked,
  CropFree,
  Gesture,
  Straighten,
  Architecture,
  ColorLens,
  Person,
  Comment,
  History,
  Undo,
  Redo
} from '@mui/icons-material';

import { 
  AnnotationSystem, 
  Annotation, 
  AnnotationLayer, 
  AnnotationGroup, 
  AnnotationTemplate,
  AnnotationSession,
  TextAnnotation,
  ArrowAnnotation,
  ShapeAnnotation,
  PolygonAnnotation,
  FreehandAnnotation
} from '../../services/annotationSystem';

export interface AdvancedAnnotationPanelProps {
  imageId: string;
  annotations: Annotation[];
  layers: AnnotationLayer[];
  groups: AnnotationGroup[];
  templates: AnnotationTemplate[];
  activeLayer: string;
  activeGroup?: string;
  onAnnotationCreate: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'lastModified'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  onLayerCreate: (layer: Omit<AnnotationLayer, 'annotations'>) => void;
  onLayerUpdate: (id: string, updates: Partial<AnnotationLayer>) => void;
  onLayerDelete: (id: string) => void;
  onGroupCreate: (group: Omit<AnnotationGroup, 'annotations'>) => void;
  onGroupUpdate: (id: string, updates: Partial<AnnotationGroup>) => void;
  onGroupDelete: (id: string) => void;
  onActiveLayerChange: (layerId: string) => void;
  onActiveGroupChange: (groupId?: string) => void;
  onExport: (format: 'json' | 'dicom-sr' | 'pdf') => void;
  onImport: (data: any) => void;
  collaborators?: { id: string; name: string; avatar?: string; online: boolean }[];
  enableCollaboration?: boolean;
  currentUser: { id: string; name: string };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: '16px 0' }}>
    {value === index && children}
  </div>
);

export const AdvancedAnnotationPanel: React.FC<AdvancedAnnotationPanelProps> = ({
  imageId,
  annotations,
  layers,
  groups,
  templates,
  activeLayer,
  activeGroup,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onLayerCreate,
  onLayerUpdate,
  onLayerDelete,
  onGroupCreate,
  onGroupUpdate,
  onGroupDelete,
  onActiveLayerChange,
  onActiveGroupChange,
  onExport,
  onImport,
  collaborators = [],
  enableCollaboration = false,
  currentUser
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ff4757');
  const [lineWidth, setLineWidth] = useState(2);
  const [fontSize, setFontSize] = useState(12);
  const [opacity, setOpacity] = useState(1);

  const annotationTools = [
    { id: 'text', icon: TextFields, label: 'Text', description: 'Add text annotation' },
    { id: 'arrow', icon: Timeline, label: 'Arrow', description: 'Point to specific area' },
    { id: 'circle', icon: RadioButtonUnchecked, label: 'Circle', description: 'Circular annotation' },
    { id: 'rectangle', icon: CropFree, label: 'Rectangle', description: 'Rectangular annotation' },
    { id: 'polygon', icon: Architecture, label: 'Polygon', description: 'Multi-point polygon' },
    { id: 'freehand', icon: Gesture, label: 'Freehand', description: 'Free drawing' },
    { id: 'ruler', icon: Straighten, label: 'Ruler', description: 'Measurement ruler' }
  ];

  const currentLayer = useMemo(() => 
    layers.find(layer => layer.id === activeLayer), 
    [layers, activeLayer]
  );

  const currentGroup = useMemo(() => 
    activeGroup ? groups.find(group => group.id === activeGroup) : undefined, 
    [groups, activeGroup]
  );

  const layerAnnotations = useMemo(() => 
    annotations.filter(annotation => annotation.layer === activeLayer),
    [annotations, activeLayer]
  );

  const handleToolSelect = useCallback((toolId: string) => {
    setSelectedTool(selectedTool === toolId ? null : toolId);
  }, [selectedTool]);

  const handleTemplateApply = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const baseAnnotation = {
      type: template.type,
      position: { x: 100, y: 100 }, // Default position
      style: template.defaultStyle,
      layer: activeLayer,
      group: activeGroup,
      visible: true,
      locked: false,
      creator: currentUser.id,
      lastModifiedBy: currentUser.id,
      metadata: {
        imageId,
        confidence: 1,
        validated: false,
        clinicalRelevance: 'medium' as const,
        tags: []
      }
    };

    if (template.type === 'text') {
      const textAnnotation = {
        ...baseAnnotation,
        text: template.defaultText || 'New annotation',
        alignment: 'left' as const,
        verticalAlignment: 'top' as const,
        padding: { top: 4, right: 8, bottom: 4, left: 8 }
      };
      onAnnotationCreate(textAnnotation);
    } else if (template.type === 'arrow') {
      const arrowAnnotation = {
        ...baseAnnotation,
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 150, y: 150 },
        arrowHeadSize: 10,
        arrowHeadAngle: 30
      };
      onAnnotationCreate(arrowAnnotation);
    }
    // Add other annotation types as needed

    setShowTemplateDialog(false);
  }, [templates, activeLayer, activeGroup, currentUser, imageId, onAnnotationCreate]);

  const handleAnnotationEdit = useCallback((annotationId: string, text: string) => {
    onAnnotationUpdate(annotationId, { 
      text,
      lastModified: new Date().toISOString(),
      lastModifiedBy: currentUser.id
    } as Partial<TextAnnotation>);
    setEditingAnnotation(null);
    setAnnotationText('');
  }, [onAnnotationUpdate, currentUser]);

  const handleLayerToggleVisibility = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      onLayerUpdate(layerId, { visible: !layer.visible });
    }
  }, [layers, onLayerUpdate]);

  const handleLayerToggleLock = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      onLayerUpdate(layerId, { locked: !layer.locked });
    }
  }, [layers, onLayerUpdate]);

  const handleExport = useCallback((format: 'json' | 'dicom-sr' | 'pdf') => {
    onExport(format);
  }, [onExport]);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <Edit color="primary" />
            Annotations
          </Typography>
          
          {enableCollaboration && collaborators.length > 0 && (
            <Box display="flex" alignItems="center" gap={1}>
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24 } }}>
                {collaborators.map(collaborator => (
                  <Avatar
                    key={collaborator.id}
                    src={collaborator.avatar}
                    sx={{ 
                      bgcolor: collaborator.online ? 'success.main' : 'grey.400',
                      border: collaborator.online ? '2px solid green' : 'none'
                    }}
                  >
                    {collaborator.name.charAt(0)}
                  </Avatar>
                ))}
              </AvatarGroup>
              <Badge
                badgeContent={collaborators.filter(c => c.online).length}
                color="success"
                variant="dot"
              />
            </Box>
          )}
        </Box>

        {/* Quick Actions */}
        <Box display="flex" gap={1} mt={1}>
          <Button
            size="small"
            startIcon={<Article />}
            onClick={() => setShowTemplateDialog(true)}
          >
            Templates
          </Button>
          <Button
            size="small"
            startIcon={<Download />}
            onClick={() => handleExport('json')}
          >
            Export
          </Button>
          <Button
            size="small"
            startIcon={<Share />}
            disabled={!enableCollaboration}
          >
            Share
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Tools" />
          <Tab label="Layers" />
          <Tab label="Annotations" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Tools Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Annotation Tools
            </Typography>
            <Grid container spacing={1}>
              {annotationTools.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <Grid item xs={6} key={tool.id}>
                    <Tooltip title={tool.description}>
                      <Button
                        fullWidth
                        variant={selectedTool === tool.id ? 'contained' : 'outlined'}
                        startIcon={<IconComponent />}
                        onClick={() => handleToolSelect(tool.id)}
                        size="small"
                      >
                        {tool.label}
                      </Button>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Style Controls */}
            <Typography variant="subtitle2" gutterBottom>
              Style Settings
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption">Color</Typography>
              <Box display="flex" gap={1} mt={1}>
                {['#ff4757', '#2ed573', '#3742fa', '#ff9f43', '#a4b0be'].map(color => (
                  <Box
                    key={color}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: color,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: selectedColor === color ? '2px solid #000' : '1px solid #ccc'
                    }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption">Line Width</Typography>
              <Slider
                value={lineWidth}
                onChange={(_, value) => setLineWidth(value as number)}
                min={1}
                max={10}
                step={1}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption">Font Size</Typography>
              <Slider
                value={fontSize}
                onChange={(_, value) => setFontSize(value as number)}
                min={8}
                max={24}
                step={1}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption">Opacity</Typography>
              <Slider
                value={opacity}
                onChange={(_, value) => setOpacity(value as number)}
                min={0.1}
                max={1}
                step={0.1}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Layers Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2">
                Layers ({layers.length})
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  const newLayer = {
                    id: `layer-${Date.now()}`,
                    name: `Layer ${layers.length + 1}`,
                    visible: true,
                    locked: false,
                    opacity: 1,
                    blendMode: 'normal' as const,
                    color: '#ff4757',
                    category: 'custom' as const
                  };
                  onLayerCreate(newLayer);
                }}
              >
                Add Layer
              </Button>
            </Box>

            <List dense>
              {layers.map(layer => (
                <ListItem
                  key={layer.id}
                  sx={{
                    bgcolor: layer.id === activeLayer ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => onActiveLayerChange(layer.id)}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      bgcolor: layer.color,
                      borderRadius: '50%',
                      mr: 1
                    }}
                  />
                  <ListItemText
                    primary={layer.name}
                    secondary={`${layer.annotations.length} annotations`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayerToggleVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayerToggleLock(layer.id);
                      }}
                    >
                      {layer.locked ? <Lock /> : <LockOpen />}
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>

        {/* Annotations Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Layer: {currentLayer?.name}
            </Typography>
            
            {layerAnnotations.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No annotations in this layer
              </Typography>
            ) : (
              <List dense>
                {layerAnnotations.map(annotation => (
                  <ListItem key={annotation.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={annotation.type}
                            size="small"
                            sx={{ bgcolor: annotation.style.color, color: 'white' }}
                          />
                          {editingAnnotation === annotation.id ? (
                            <TextField
                              value={annotationText}
                              onChange={(e) => setAnnotationText(e.target.value)}
                              size="small"
                              fullWidth
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAnnotationEdit(annotation.id, annotationText);
                                }
                              }}
                            />
                          ) : (
                            <Typography variant="body2">
                              {'text' in annotation ? annotation.text : `${annotation.type} annotation`}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={`Created by ${annotation.creator} • ${new Date(annotation.timestamp).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                      {editingAnnotation === annotation.id ? (
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleAnnotationEdit(annotation.id, annotationText)}
                          >
                            <Save />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingAnnotation(null);
                              setAnnotationText('');
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingAnnotation(annotation.id);
                              setAnnotationText('text' in annotation ? annotation.text : '');
                            }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onAnnotationDelete(annotation.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Export Options
            </Typography>
            <ButtonGroup orientation="vertical" fullWidth sx={{ mb: 2 }}>
              <Button onClick={() => handleExport('json')}>Export as JSON</Button>
              <Button onClick={() => handleExport('dicom-sr')}>Export as DICOM-SR</Button>
              <Button onClick={() => handleExport('pdf')}>Export as PDF</Button>
            </ButtonGroup>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Collaboration
            </Typography>
            <FormControlLabel
              control={<Switch checked={enableCollaboration} disabled />}
              label="Enable Real-time Collaboration"
            />
            
            {enableCollaboration && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {collaborators.filter(c => c.online).length} users online
              </Alert>
            )}
          </Box>
        </TabPanel>
      </Box>

      {/* Template Selection Dialog */}
      <Dialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Annotation Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates.map(template => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleTemplateApply(template.id)}
                >
                  <CardContent>
                    <Typography variant="h6">{template.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                    <Chip
                      label={template.category}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdvancedAnnotationPanel;