import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Calculate as CalculateIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';

import { MeasurementValue } from '../../types';
import { apiService } from '../../services/api';

interface MeasurementEditorProps {
  examType: string;
  measurements: Record<string, MeasurementValue>;
  onChange: (measurements: Record<string, MeasurementValue>) => void;
  disabled?: boolean;
}

interface MeasurementTemplate {
  [key: string]: {
    label: string;
    unit: string;
    normal_range?: string;
    category: string;
    required?: boolean;
  };
}

const MeasurementEditor: React.FC<MeasurementEditorProps> = ({
  examType,
  measurements,
  onChange,
  disabled = false,
}) => {
  const [template, setTemplate] = useState<MeasurementTemplate>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['primary']));

  // Load measurement template for exam type
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(`/measurements/template/${examType}`);
        setTemplate(response.template || {});
        
        // Auto-expand primary category
        setExpandedCategories(new Set(['primary']));
      } catch (err) {
        console.error('Failed to load measurement template:', err);
        // Use default template based on exam type
        setTemplate(getDefaultTemplate(examType));
      } finally {
        setLoading(false);
      }
    };

    if (examType) {
      loadTemplate();
    }
  }, [examType]);

  const getDefaultTemplate = (examType: string): MeasurementTemplate => {
    switch (examType) {
      case 'echo_complete':
        return {
          'left_ventricular_ejection_fraction': {
            label: 'LV Ejection Fraction',
            unit: '%',
            normal_range: '55-70%',
            category: 'primary',
            required: true,
          },
          'left_ventricular_end_diastolic_dimension': {
            label: 'LVEDD',
            unit: 'cm',
            normal_range: '3.9-5.3 cm',
            category: 'primary',
          },
          'interventricular_septal_thickness': {
            label: 'IVS Thickness',
            unit: 'cm',
            normal_range: '0.6-1.0 cm',
            category: 'primary',
          },
          'left_atrial_dimension': {
            label: 'LA Dimension',
            unit: 'cm',
            normal_range: '2.7-4.0 cm',
            category: 'secondary',
          },
          'aortic_root_dimension': {
            label: 'Aortic Root',
            unit: 'cm',
            normal_range: '2.0-3.7 cm',
            category: 'secondary',
          },
        };
      
      case 'vascular_carotid':
        return {
          'right_ica_peak_systolic_velocity': {
            label: 'Right ICA PSV',
            unit: 'cm/s',
            normal_range: '<125 cm/s',
            category: 'primary',
            required: true,
          },
          'left_ica_peak_systolic_velocity': {
            label: 'Left ICA PSV',
            unit: 'cm/s',
            normal_range: '<125 cm/s',
            category: 'primary',
            required: true,
          },
          'right_ica_end_diastolic_velocity': {
            label: 'Right ICA EDV',
            unit: 'cm/s',
            normal_range: '<40 cm/s',
            category: 'secondary',
          },
          'left_ica_end_diastolic_velocity': {
            label: 'Left ICA EDV',
            unit: 'cm/s',
            normal_range: '<40 cm/s',
            category: 'secondary',
          },
        };
      
      default:
        return {};
    }
  };

  const updateMeasurement = (key: string, field: keyof MeasurementValue, value: any) => {
    const updatedMeasurements = {
      ...measurements,
      [key]: {
        ...measurements[key],
        [field]: value,
      },
    };

    // Check if value is abnormal based on normal range
    if (field === 'value' && template[key]?.normal_range) {
      const isAbnormal = checkIfAbnormal(value, template[key].normal_range);
      updatedMeasurements[key].abnormal = isAbnormal;
    }

    onChange(updatedMeasurements);
  };

  const checkIfAbnormal = (value: number, normalRange: string): boolean => {
    // Simple range checking - in real implementation, this would be more sophisticated
    const rangeMatch = normalRange.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return value < min || value > max;
    }
    
    const lessThanMatch = normalRange.match(/<(\d+(?:\.\d+)?)/);
    if (lessThanMatch) {
      const max = parseFloat(lessThanMatch[1]);
      return value >= max;
    }
    
    return false;
  };

  const addCustomMeasurement = () => {
    const key = `custom_${Date.now()}`;
    const newMeasurement: MeasurementValue = {
      value: 0,
      unit: 'cm',
      normal_range: '',
      abnormal: false,
    };
    
    onChange({
      ...measurements,
      [key]: newMeasurement,
    });
  };

  const removeMeasurement = (key: string) => {
    const updatedMeasurements = { ...measurements };
    delete updatedMeasurements[key];
    onChange(updatedMeasurements);
  };

  const generateAIMeasurements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would call the AI service to generate measurements
      // For now, we'll populate with sample values
      const aiMeasurements: Record<string, MeasurementValue> = {};
      
      Object.keys(template).forEach(key => {
        const templateItem = template[key];
        let sampleValue = 0;
        
        // Generate realistic sample values based on exam type
        if (examType === 'echo_complete') {
          switch (key) {
            case 'left_ventricular_ejection_fraction':
              sampleValue = 62;
              break;
            case 'left_ventricular_end_diastolic_dimension':
              sampleValue = 4.8;
              break;
            case 'interventricular_septal_thickness':
              sampleValue = 0.9;
              break;
            case 'left_atrial_dimension':
              sampleValue = 3.6;
              break;
            case 'aortic_root_dimension':
              sampleValue = 3.2;
              break;
          }
        } else if (examType === 'vascular_carotid') {
          switch (key) {
            case 'right_ica_peak_systolic_velocity':
              sampleValue = 85;
              break;
            case 'left_ica_peak_systolic_velocity':
              sampleValue = 78;
              break;
            case 'right_ica_end_diastolic_velocity':
              sampleValue = 22;
              break;
            case 'left_ica_end_diastolic_velocity':
              sampleValue = 19;
              break;
          }
        }
        
        aiMeasurements[key] = {
          value: sampleValue,
          unit: templateItem.unit,
          normal_range: templateItem.normal_range,
          abnormal: checkIfAbnormal(sampleValue, templateItem.normal_range || ''),
        };
      });
      
      onChange({ ...measurements, ...aiMeasurements });
      
    } catch (err) {
      setError('Failed to generate AI measurements');
    } finally {
      setLoading(false);
    }
  };

  const groupMeasurementsByCategory = () => {
    const categories: Record<string, string[]> = {};
    
    Object.keys(template).forEach(key => {
      const category = template[key].category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(key);
    });
    
    // Add custom measurements to 'custom' category
    Object.keys(measurements).forEach(key => {
      if (!template[key]) {
        if (!categories['custom']) {
          categories['custom'] = [];
        }
        categories['custom'].push(key);
      }
    });
    
    return categories;
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const categories = groupMeasurementsByCategory();

  return (
    <Box>
      {/* AI Generation Button */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<AIIcon />}
          onClick={generateAIMeasurements}
          disabled={disabled || loading}
          size="small"
        >
          Generate AI Measurements
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addCustomMeasurement}
          disabled={disabled}
          size="small"
        >
          Add Custom
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Measurement Categories */}
      {Object.entries(categories).map(([category, measurementKeys]) => (
        <Accordion
          key={category}
          expanded={expandedCategories.has(category)}
          onChange={() => toggleCategory(category)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
              {category} Measurements ({measurementKeys.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {measurementKeys.map(key => {
                const templateItem = template[key];
                const measurement = measurements[key] || {
                  value: 0,
                  unit: templateItem?.unit || 'cm',
                  normal_range: templateItem?.normal_range || '',
                  abnormal: false,
                };
                
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {templateItem?.label || key.replace(/_/g, ' ')}
                          {templateItem?.required && (
                            <Chip label="Required" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        
                        {!templateItem && (
                          <IconButton
                            size="small"
                            onClick={() => removeMeasurement(key)}
                            disabled={disabled}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          type="number"
                          value={measurement.value}
                          onChange={(e) => updateMeasurement(key, 'value', parseFloat(e.target.value) || 0)}
                          disabled={disabled}
                          size="small"
                          sx={{ flexGrow: 1 }}
                        />
                        
                        <TextField
                          value={measurement.unit}
                          onChange={(e) => updateMeasurement(key, 'unit', e.target.value)}
                          disabled={disabled}
                          size="small"
                          sx={{ width: 60 }}
                        />
                        
                        {measurement.abnormal && (
                          <Chip
                            label="Abnormal"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {templateItem?.normal_range && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Normal: {templateItem.normal_range}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {Object.keys(categories).length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No measurements available for this exam type
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addCustomMeasurement}
            disabled={disabled}
            sx={{ mt: 1 }}
          >
            Add Custom Measurement
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MeasurementEditor;