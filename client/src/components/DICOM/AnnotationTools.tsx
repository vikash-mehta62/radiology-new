import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tooltip,
  ButtonGroup,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  TextFields as TextIcon,
  RadioButtonUnchecked as CircleIcon,
  CropFree as RectangleIcon,
  Timeline as ArrowIcon,
  Gesture as FreehandIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

export interface Annotation {
  id: string;
  type: 'text' | 'arrow' | 'circle' | 'rectangle' | 'freehand';
  content: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  color: string;
  created_at: string;
  created_by?: string;
}

interface AnnotationToolsProps {
  annotations: Annotation[];
  activeAnnotationType: string | null;
  onAnnotationTypeSelect: (type: string | null) => void;
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'created_at'>) => void;
  onAnnotationEdit: (id: string, content: string) => void;
  onAnnotationDelete: (id: string) => void;
  onClearAll: () => void;
}

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  annotations,
  activeAnnotationType,
  onAnnotationTypeSelect,
  onAnnotationAdd,
  onAnnotationEdit,
  onAnnotationDelete,
  onClearAll
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF0000');

  const annotationTypes = [
    { id: 'text', icon: TextIcon, label: 'Text', description: 'Add text annotation' },
    { id: 'arrow', icon: ArrowIcon, label: 'Arrow', description: 'Point to specific area' },
    { id: 'circle', icon: CircleIcon, label: 'Circle', description: 'Highlight circular area' },
    { id: 'rectangle', icon: RectangleIcon, label: 'Rectangle', description: 'Highlight rectangular area' },
    { id: 'freehand', icon: FreehandIcon, label: 'Freehand', description: 'Draw freehand annotation' }
  ];

  const colors = [
    { value: '#FF0000', label: 'Red' },
    { value: '#00FF00', label: 'Green' },
    { value: '#0000FF', label: 'Blue' },
    { value: '#FFFF00', label: 'Yellow' },
    { value: '#FF00FF', label: 'Magenta' },
    { value: '#00FFFF', label: 'Cyan' },
    { value: '#FFFFFF', label: 'White' }
  ];

  const handleEditStart = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditContent(annotation.content);
  };

  const handleEditSave = () => {
    if (editingId) {
      onAnnotationEdit(editingId, editContent);
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Annotation Tools
        </Typography>

        {/* Annotation Type Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Annotation Type
          </Typography>
          <ButtonGroup size="small" orientation="vertical" fullWidth>
            {annotationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Tooltip key={type.id} title={type.description} placement="right">
                  <IconButton
                    color={activeAnnotationType === type.id ? 'primary' : 'default'}
                    onClick={() => onAnnotationTypeSelect(
                      activeAnnotationType === type.id ? null : type.id
                    )}
                    sx={{ justifyContent: 'flex-start', px: 2 }}
                  >
                    <IconComponent sx={{ mr: 1 }} />
                    {type.label}
                  </IconButton>
                </Tooltip>
              );
            })}
          </ButtonGroup>
        </Box>

        {/* Color Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Color
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Annotation Color</InputLabel>
            <Select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              label="Annotation Color"
            >
              {colors.map((color) => (
                <MenuItem key={color.value} value={color.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: color.value,
                        border: '1px solid #ccc',
                        mr: 1
                      }}
                    />
                    {color.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Annotations List */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">
            Annotations ({annotations.length})
          </Typography>
          {annotations.length > 0 && (
            <Tooltip title="Clear All Annotations">
              <IconButton size="small" onClick={onClearAll}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {annotations.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No annotations yet. Select a tool and click on the image to add annotations.
          </Typography>
        ) : (
          <List dense>
            {annotations.map((annotation) => (
              <ListItem key={annotation.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={annotation.type}
                        size="small"
                        sx={{ backgroundColor: annotation.color, color: 'white' }}
                      />
                      {editingId === annotation.id ? (
                        <TextField
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          size="small"
                          fullWidth
                          autoFocus
                        />
                      ) : (
                        <Typography variant="body2">
                          {annotation.content || `${annotation.type} annotation`}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={`Created: ${formatDate(annotation.created_at)}`}
                />
                <ListItemSecondaryAction>
                  {editingId === annotation.id ? (
                    <Box>
                      <IconButton size="small" onClick={handleEditSave}>
                        <SaveIcon />
                      </IconButton>
                      <IconButton size="small" onClick={handleEditCancel}>
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box>
                      <IconButton size="small" onClick={() => handleEditStart(annotation)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => onAnnotationDelete(annotation.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnotationTools;