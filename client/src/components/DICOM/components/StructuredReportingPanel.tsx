/**
 * Structured Reporting Panel Component
 * DICOM SR compliant reporting interface with AI integration
 * Follows Apple HIG design principles for medical reporting workflows
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Rating
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Send,
  Print,
  Download,
  Share,
  Assessment,
  Assignment,
  Science,
  MedicalServices,
  Timeline,
  Analytics,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  ExpandMore,
  Visibility,
  VisibilityOff,
  AutoAwesome,
  Psychology,
  Biotech,
  LocalHospital,
  Person,
  Schedule,
  DataObject,
  Code,
  Verified
} from '@mui/icons-material';
import { useAccessibility } from '../../Accessibility/AccessibilityProvider';
import { createAppleHIGStyles, appleHIGColors, appleHIGTypography, appleHIGBorderRadius } from '../AppleHIGStyles';
import type { Study } from '../../../types';

// DICOM SR Template Types
interface SRTemplate {
  id: string;
  name: string;
  description: string;
  category: 'MEASUREMENT' | 'FINDING' | 'IMPRESSION' | 'RECOMMENDATION' | 'COMPARISON';
  fields: SRField[];
  requiredFields: string[];
  aiSupported: boolean;
}

interface SRField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'time' | 'measurement' | 'code';
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  units?: string;
  codingScheme?: string;
}

interface SREntry {
  id: string;
  templateId: string;
  templateName: string;
  data: Record<string, any>;
  confidence?: number;
  timestamp: string;
  author: string;
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED';
  aiGenerated: boolean;
  validated: boolean;
}

interface StructuredReport {
  id: string;
  studyUid: string;
  patientId: string;
  reportType: string;
  title: string;
  entries: SREntry[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    institution: string;
    version: string;
  };
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED';
  dicomSR?: string; // DICOM SR XML/JSON representation
}

interface StructuredReportingPanelProps {
  study: Study;
  onReportSave?: (report: StructuredReport) => void;
  onReportSubmit?: (report: StructuredReport) => void;
  onReportExport?: (report: StructuredReport, format: 'dicom-sr' | 'pdf' | 'json') => void;
  enableAI?: boolean;
  templates?: SRTemplate[];
  existingReport?: StructuredReport;
  readOnly?: boolean;
}

// Default SR Templates
const defaultTemplates: SRTemplate[] = [
  {
    id: 'chest-ct-findings',
    name: 'Chest CT Findings',
    description: 'Structured template for chest CT findings',
    category: 'FINDING',
    aiSupported: true,
    requiredFields: ['location', 'finding_type'],
    fields: [
      {
        id: 'location',
        name: 'location',
        type: 'select',
        label: 'Anatomical Location',
        required: true,
        options: ['Right Upper Lobe', 'Right Middle Lobe', 'Right Lower Lobe', 'Left Upper Lobe', 'Left Lower Lobe', 'Mediastinum', 'Pleura']
      },
      {
        id: 'finding_type',
        name: 'finding_type',
        type: 'select',
        label: 'Finding Type',
        required: true,
        options: ['Nodule', 'Mass', 'Consolidation', 'Ground Glass Opacity', 'Pleural Effusion', 'Pneumothorax']
      },
      {
        id: 'size',
        name: 'size',
        type: 'measurement',
        label: 'Size (mm)',
        required: false,
        units: 'mm',
        validation: { min: 0, max: 500 }
      },
      {
        id: 'characteristics',
        name: 'characteristics',
        type: 'multiselect',
        label: 'Characteristics',
        required: false,
        options: ['Solid', 'Part-solid', 'Ground glass', 'Calcified', 'Cavitary', 'Spiculated']
      }
    ]
  },
  {
    id: 'measurement-template',
    name: 'Measurement Report',
    description: 'Template for quantitative measurements',
    category: 'MEASUREMENT',
    aiSupported: true,
    requiredFields: ['measurement_type', 'value'],
    fields: [
      {
        id: 'measurement_type',
        name: 'measurement_type',
        type: 'select',
        label: 'Measurement Type',
        required: true,
        options: ['Length', 'Area', 'Volume', 'Angle', 'Density (HU)', 'Distance']
      },
      {
        id: 'value',
        name: 'value',
        type: 'number',
        label: 'Value',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'units',
        name: 'units',
        type: 'select',
        label: 'Units',
        required: true,
        options: ['mm', 'cm', 'mm²', 'cm²', 'mm³', 'cm³', 'degrees', 'HU']
      },
      {
        id: 'location',
        name: 'location',
        type: 'text',
        label: 'Anatomical Location',
        required: false
      }
    ]
  }
];

const StructuredReportingPanel: React.FC<StructuredReportingPanelProps> = ({
  study,
  onReportSave,
  onReportSubmit,
  onReportExport,
  enableAI = true,
  templates = defaultTemplates,
  existingReport,
  readOnly = false
}) => {
  const { highContrast, reducedMotion } = useAccessibility();
  const [activeTab, setActiveTab] = useState(0);
  const [currentReport, setCurrentReport] = useState<StructuredReport | null>(existingReport || null);
  const [selectedTemplate, setSelectedTemplate] = useState<SRTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SREntry | null>(null);
  const [entryData, setEntryData] = useState<Record<string, any>>({});
  const [aiProcessing, setAiProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Apple HIG styles
  const theme = { palette: { mode: 'light' } }; // Mock theme for now
  const styles = createAppleHIGStyles(theme as any, false);

  // Initialize new report
  const initializeReport = useCallback(() => {
    if (!currentReport) {
      const newReport: StructuredReport = {
        id: `sr-${Date.now()}`,
        studyUid: study.study_uid,
        patientId: study.patient_id,
        reportType: 'STRUCTURED_REPORT',
        title: `Structured Report - ${study.study_description}`,
        entries: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: 'Current User', // Should come from auth context
          institution: 'Medical Center', // Should come from config
          version: '1.0'
        },
        status: 'DRAFT'
      };
      setCurrentReport(newReport);
    }
  }, [currentReport, study]);

  useEffect(() => {
    initializeReport();
  }, [initializeReport]);

  // Validate entry data
  const validateEntry = useCallback((template: SRTemplate, data: Record<string, any>) => {
    const errors: Record<string, string> = {};

    template.fields.forEach(field => {
      const value = data[field.id];
      
      if (field.required && (!value || value === '')) {
        errors[field.id] = `${field.label} is required`;
      }

      if (field.validation && value) {
        if (field.type === 'number') {
          const numValue = Number(value);
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            errors[field.id] = `Value must be at least ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            errors[field.id] = `Value must be at most ${field.validation.max}`;
          }
        }

        if (field.validation.pattern && typeof value === 'string') {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors[field.id] = `Invalid format for ${field.label}`;
          }
        }
      }
    });

    return errors;
  }, []);

  // Handle template selection
  const handleTemplateSelect = (template: SRTemplate) => {
    setSelectedTemplate(template);
    setEntryData({});
    setValidationErrors({});
    setTemplateDialogOpen(false);
    setEntryDialogOpen(true);
  };

  // Handle entry save
  const handleEntrySave = () => {
    if (!selectedTemplate || !currentReport) return;

    const errors = validateEntry(selectedTemplate, entryData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const newEntry: SREntry = {
      id: editingEntry?.id || `entry-${Date.now()}`,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      data: { ...entryData },
      timestamp: new Date().toISOString(),
      author: 'Current User',
      status: 'DRAFT',
      aiGenerated: false,
      validated: true
    };

    const updatedReport = {
      ...currentReport,
      entries: editingEntry 
        ? currentReport.entries.map(e => e.id === editingEntry.id ? newEntry : e)
        : [...currentReport.entries, newEntry],
      metadata: {
        ...currentReport.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    setCurrentReport(updatedReport);
    setEntryDialogOpen(false);
    setEditingEntry(null);
    setEntryData({});
    setValidationErrors({});
  };

  // Handle entry edit
  const handleEntryEdit = (entry: SREntry) => {
    const template = templates.find(t => t.id === entry.templateId);
    if (template) {
      setSelectedTemplate(template);
      setEditingEntry(entry);
      setEntryData(entry.data);
      setEntryDialogOpen(true);
    }
  };

  // Handle entry delete
  const handleEntryDelete = (entryId: string) => {
    if (!currentReport) return;

    const updatedReport = {
      ...currentReport,
      entries: currentReport.entries.filter(e => e.id !== entryId),
      metadata: {
        ...currentReport.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    setCurrentReport(updatedReport);
  };

  // Generate AI suggestions
  const handleAIGeneration = async (template: SRTemplate) => {
    if (!enableAI || !currentReport) return;

    setAiProcessing(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock AI-generated data based on template
      const aiData: Record<string, any> = {};
      
      template.fields.forEach(field => {
        switch (field.id) {
          case 'location':
            aiData[field.id] = 'Right Upper Lobe';
            break;
          case 'finding_type':
            aiData[field.id] = 'Nodule';
            break;
          case 'size':
            aiData[field.id] = 12;
            break;
          case 'characteristics':
            aiData[field.id] = ['Solid', 'Spiculated'];
            break;
          case 'measurement_type':
            aiData[field.id] = 'Length';
            break;
          case 'value':
            aiData[field.id] = 15.2;
            break;
          case 'units':
            aiData[field.id] = 'mm';
            break;
        }
      });

      const aiEntry: SREntry = {
        id: `ai-entry-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        data: aiData,
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        author: 'AI Assistant',
        status: 'DRAFT',
        aiGenerated: true,
        validated: false
      };

      const updatedReport = {
        ...currentReport,
        entries: [...currentReport.entries, aiEntry],
        metadata: {
          ...currentReport.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      setCurrentReport(updatedReport);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setAiProcessing(false);
    }
  };

  // Handle report save
  const handleReportSave = () => {
    if (currentReport) {
      onReportSave?.(currentReport);
    }
  };

  // Handle report submit
  const handleReportSubmit = () => {
    if (currentReport) {
      const submittedReport = {
        ...currentReport,
        status: 'PRELIMINARY' as const,
        metadata: {
          ...currentReport.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      setCurrentReport(submittedReport);
      onReportSubmit?.(submittedReport);
    }
  };

  // Handle report export
  const handleReportExport = (format: 'dicom-sr' | 'pdf' | 'json') => {
    if (currentReport) {
      onReportExport?.(currentReport, format);
    }
  };

  // Render field input
  const renderFieldInput = (field: SRField, value: any, onChange: (value: any) => void) => {
    const error = validationErrors[field.id];

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={!!error}
            helperText={error || field.description}
            required={field.required}
            disabled={readOnly}
          />
        );

      case 'number':
      case 'measurement':
        return (
          <TextField
            fullWidth
            type="number"
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            error={!!error}
            helperText={error || field.description}
            required={field.required}
            disabled={readOnly}
            InputProps={{
              endAdornment: field.units && <Typography variant="body2">{field.units}</Typography>
            }}
            inputProps={{
              min: field.validation?.min,
              max: field.validation?.max
            }}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth error={!!error}>
            <InputLabel required={field.required}>{field.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              label={field.label}
              disabled={readOnly}
            >
              {field.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
            {(error || field.description) && (
              <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
                {error || field.description}
              </Typography>
            )}
          </FormControl>
        );

      case 'multiselect':
        return (
          <Autocomplete
            multiple
            options={field.options || []}
            value={value || []}
            onChange={(_, newValue) => onChange(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                error={!!error}
                helperText={error || field.description}
                required={field.required}
              />
            )}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  disabled={readOnly}
                />
              ))
            }
            disabled={readOnly}
          />
        );

      default:
        return null;
    }
  };

  if (!currentReport) {
    return (
      <Card sx={{ ...styles.card }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Structured Report
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Create a new structured report to document findings and measurements.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={initializeReport}
              sx={{ mt: 2 }}
            >
              Create Report
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...styles.card }}>
      <CardContent sx={{ flex: 1, overflow: 'hidden', p: 0 }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment color="primary" />
              Structured Report
              <Chip 
                label={currentReport.status} 
                size="small" 
                color={currentReport.status === 'FINAL' ? 'success' : 'warning'}
              />
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Add entry">
                <IconButton 
                  size="small" 
                  onClick={() => setTemplateDialogOpen(true)}
                  disabled={readOnly}
                >
                  <Add />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save report">
                <IconButton 
                  size="small" 
                  onClick={handleReportSave}
                  disabled={readOnly}
                >
                  <Save />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export report">
                <IconButton size="small">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            {currentReport.title} • {currentReport.entries.length} entries
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {currentReport.entries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DataObject sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Entries Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Add structured entries using templates or AI assistance.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setTemplateDialogOpen(true)}
                disabled={readOnly}
              >
                Add Entry
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 1 }}>
              {currentReport.entries.map((entry) => (
                <ListItem
                  key={entry.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    flexDirection: 'column',
                    alignItems: 'stretch'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', p: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {entry.aiGenerated && <AutoAwesome color="primary" fontSize="small" />}
                        {entry.templateName}
                        {entry.confidence && (
                          <Chip 
                            label={`${Math.round(entry.confidence * 100)}%`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.timestamp).toLocaleString()} • {entry.author}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEntryEdit(entry)}
                        disabled={readOnly}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEntryDelete(entry.id)}
                        disabled={readOnly}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Grid container spacing={2}>
                      {Object.entries(entry.data).map(([key, value]) => (
                        <Grid item xs={6} key={key}>
                          <Typography variant="caption" color="text.secondary">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography variant="body2">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Actions */}
        {!readOnly && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                  onClick={handleReportSave}
                >
                  Save Draft
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleReportSubmit}
                  disabled={currentReport.entries.length === 0}
                >
                  Submit Report
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleReportExport('json')}
                >
                  Export
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Template Selection Dialog */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Report Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Assignment color="primary" />
                      <Typography variant="subtitle1">{template.name}</Typography>
                      {template.aiSupported && (
                        <Chip label="AI" size="small" color="primary" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {template.description}
                    </Typography>
                    <Chip label={template.category} size="small" variant="outlined" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Entry Edit Dialog */}
      <Dialog 
        open={entryDialogOpen} 
        onClose={() => setEntryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {editingEntry ? 'Edit Entry' : 'New Entry'}
              {selectedTemplate && (
                <Chip label={selectedTemplate.name} size="small" />
              )}
            </Box>
            {selectedTemplate?.aiSupported && enableAI && (
              <Button
                startIcon={<AutoAwesome />}
                onClick={() => selectedTemplate && handleAIGeneration(selectedTemplate)}
                disabled={aiProcessing}
                size="small"
              >
                AI Assist
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {aiProcessing && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                AI is analyzing the image and generating suggestions...
              </Typography>
            </Box>
          )}
          
          {selectedTemplate && (
            <Grid container spacing={3}>
              {selectedTemplate.fields.map((field) => (
                <Grid item xs={12} sm={6} key={field.id}>
                  {renderFieldInput(
                    field,
                    entryData[field.id],
                    (value) => setEntryData(prev => ({ ...prev, [field.id]: value }))
                  )}
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEntrySave}
            variant="contained"
            disabled={Object.keys(validationErrors).length > 0}
          >
            {editingEntry ? 'Update' : 'Add'} Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default StructuredReportingPanel;