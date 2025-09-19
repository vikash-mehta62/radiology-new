import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Straighten as RulerIcon,
  RadioButtonUnchecked as CircleIcon,
  CropFree as RectangleIcon,
  Timeline as AngleIcon,
  Delete as DeleteIcon,
  Clear as ClearAllIcon,
} from '@mui/icons-material';

export interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'circle';
  value: number;
  unit: string;
  points: Array<{ x: number; y: number }>;
  label?: string;
  created_at: string;
}

interface MeasurementToolsProps {
  measurements: Measurement[];
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  onMeasurementDelete: (id: string) => void;
  onClearAll: () => void;
  onMeasurementAdd?: (measurement: Omit<Measurement, 'id' | 'created_at'>) => void;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  measurements,
  activeTool,
  onToolSelect,
  onMeasurementDelete,
  onClearAll,
  onMeasurementAdd,
}) => {
  const tools = [
    { id: 'distance', icon: RulerIcon, label: 'Distance', description: 'Measure linear distance' },
    { id: 'area', icon: RectangleIcon, label: 'Area', description: 'Measure rectangular area' },
    { id: 'circle', icon: CircleIcon, label: 'Circle', description: 'Measure circular area' },
    { id: 'angle', icon: AngleIcon, label: 'Angle', description: 'Measure angle between lines' },
  ];

  const formatMeasurement = (measurement: Measurement): string => {
    switch (measurement.type) {
      case 'distance':
        return `${measurement.value.toFixed(2)} ${measurement.unit}`;
      case 'area':
        return `${measurement.value.toFixed(2)} ${measurement.unit}²`;
      case 'circle':
        return `${measurement.value.toFixed(2)} ${measurement.unit}² (circle)`;
      case 'angle':
        return `${measurement.value.toFixed(1)}°`;
      default:
        return `${measurement.value.toFixed(2)} ${measurement.unit}`;
    }
  };

  const getMeasurementIcon = (type: string) => {
    const tool = tools.find(t => t.id === type);
    return tool ? tool.icon : RulerIcon;
  };

  const getMeasurementColor = (type: string) => {
    switch (type) {
      case 'distance':
        return 'primary';
      case 'area':
        return 'secondary';
      case 'circle':
        return 'success';
      case 'angle':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tool Selection */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Measurement Tools
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {tools.map((tool) => {
            const IconComponent = tool.icon;
            const isActive = activeTool === tool.id;
            
            return (
              <Tooltip key={tool.id} title={tool.description} placement="top">
                <IconButton
                  size="small"
                  color={isActive ? 'primary' : 'default'}
                  onClick={() => onToolSelect(isActive ? null : tool.id)}
                  sx={{
                    border: 1,
                    borderColor: isActive ? 'primary.main' : 'grey.300',
                    bgcolor: isActive ? 'primary.50' : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.100' : 'grey.50',
                    },
                  }}
                >
                  <IconComponent fontSize="small" />
                </IconButton>
              </Tooltip>
            );
          })}
        </Box>

        {activeTool && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
            <Typography variant="caption" color="info.main">
              {tools.find(t => t.id === activeTool)?.description}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Measurements List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Measurements ({measurements.length})
          </Typography>
          {measurements.length > 0 && (
            <Tooltip title="Clear All">
              <IconButton size="small" onClick={onClearAll} color="error">
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {measurements.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No measurements yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select a tool and click on the image to start measuring
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ px: 1 }}>
            {measurements.map((measurement, index) => {
              const IconComponent = getMeasurementIcon(measurement.type);
              
              return (
                <React.Fragment key={measurement.id}>
                  <ListItem
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <IconComponent fontSize="small" color="action" />
                    </Box>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatMeasurement(measurement)}
                          </Typography>
                          <Chip
                            label={measurement.type}
                            size="small"
                            color={getMeasurementColor(measurement.type) as any}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {measurement.label || `Measurement ${index + 1}`}
                        </Typography>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => onMeasurementDelete(measurement.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < measurements.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      {/* Measurement Summary */}
      {measurements.length > 0 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Summary
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {['distance', 'area', 'circle', 'angle'].map((type) => {
              const count = measurements.filter(m => m.type === type).length;
              if (count === 0) return null;
              
              return (
                <Chip
                  key={type}
                  label={`${count} ${type}${count > 1 ? 's' : ''}`}
                  size="small"
                  color={getMeasurementColor(type) as any}
                  variant="filled"
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default MeasurementTools;