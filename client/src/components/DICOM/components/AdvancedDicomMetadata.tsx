/**
 * Advanced DICOM Metadata Display Component
 * Comprehensive metadata visualization with structured reporting integration
 * Follows Apple HIG design principles for medical imaging applications
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  LinearProgress,
  Badge,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore,
  Info,
  Person,
  LocalHospital,
  Schedule,
  Camera,
  Assessment,
  Visibility,
  VisibilityOff,
  Download,
  Share,
  Print,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Timeline,
  DataObject,
  MedicalServices,
  Assignment,
  Science,
  Analytics,
  Settings,
  Edit,
  Save,
  Code,
  Biotech
} from '@mui/icons-material';
import { useAccessibility } from '../../Accessibility/AccessibilityProvider';
import { createAppleHIGStyles, appleHIGColors, appleHIGTypography, appleHIGBorderRadius } from '../AppleHIGStyles';
import StructuredReportingPanel from './StructuredReportingPanel';
import type { Study } from '../../../types';

interface DicomMetadata {
  // Patient Information
  PatientName?: string;
  PatientID?: string;
  PatientBirthDate?: string;
  PatientSex?: string;
  PatientAge?: string;
  PatientWeight?: string;
  PatientSize?: string;
  
  // Study Information
  StudyDate?: string;
  StudyTime?: string;
  StudyDescription?: string;
  StudyInstanceUID?: string;
  AccessionNumber?: string;
  ReferringPhysicianName?: string;
  
  // Series Information
  SeriesDate?: string;
  SeriesTime?: string;
  SeriesDescription?: string;
  SeriesInstanceUID?: string;
  SeriesNumber?: string;
  Modality?: string;
  
  // Image Information
  InstanceNumber?: string;
  SOPInstanceUID?: string;
  ImageType?: string[];
  AcquisitionDate?: string;
  AcquisitionTime?: string;
  
  // Technical Parameters
  Rows?: number;
  Columns?: number;
  BitsAllocated?: number;
  BitsStored?: number;
  HighBit?: number;
  PixelRepresentation?: number;
  WindowCenter?: number | number[];
  WindowWidth?: number | number[];
  RescaleIntercept?: number;
  RescaleSlope?: number;
  SliceThickness?: string;
  PixelSpacing?: string[];
  ImageOrientationPatient?: string[];
  ImagePositionPatient?: string[];
  
  // Additional metadata
  [key: string]: any;
}

interface StructuredReport {
  id: string;
  type: 'AI_DETECTION' | 'MEASUREMENT' | 'ANNOTATION' | 'CLINICAL_FINDING';
  title: string;
  content: any;
  confidence?: number;
  timestamp: string;
  author: string;
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED';
}

interface AdvancedDicomMetadataProps {
  study: Study;
  metadata?: DicomMetadata;
  structuredReports?: StructuredReport[];
  showOverlay?: boolean;
  compactMode?: boolean;
  onMetadataExport?: (format: 'json' | 'xml' | 'dicom-sr') => void;
  onReportGenerate?: () => void;
  enableStructuredReporting?: boolean;
}

const AdvancedDicomMetadata: React.FC<AdvancedDicomMetadataProps> = ({
  study,
  metadata,
  structuredReports = [],
  showOverlay = false,
  compactMode = false,
  onMetadataExport,
  onReportGenerate,
  enableStructuredReporting = true
}) => {
  const { highContrast, reducedMotion } = useAccessibility();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patient: true,
    study: true,
    series: false,
    image: false,
    technical: false,
    structured: false
  });
  const [overlayMode, setOverlayMode] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedReport, setSelectedReport] = useState<StructuredReport | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Apple HIG styles
  const theme = { palette: { mode: 'light' } }; // Mock theme for now
  const styles = createAppleHIGStyles(theme as any, false);

  // Process DICOM metadata
  const processedMetadata = useMemo(() => {
    const dicomMeta = study.dicom_metadata || metadata || {};
    
    return {
      patient: {
        name: dicomMeta.PatientName || study.patient_info?.name || 'Unknown',
        id: dicomMeta.PatientID || study.patient_id || 'Unknown',
        birthDate: dicomMeta.PatientBirthDate || study.patient_info?.date_of_birth || 'Unknown',
        sex: dicomMeta.PatientSex || study.patient_info?.gender || 'Unknown',
        age: dicomMeta.PatientAge || calculateAge(dicomMeta.PatientBirthDate) || 'Unknown',
        weight: dicomMeta.PatientWeight || 'Not specified',
        size: dicomMeta.PatientSize || 'Not specified'
      },
      study: {
        date: dicomMeta.StudyDate || study.study_date || 'Unknown',
        time: dicomMeta.StudyTime || study.study_time || 'Unknown',
        description: dicomMeta.StudyDescription || study.study_description || 'Unknown',
        uid: dicomMeta.StudyInstanceUID || study.study_uid || 'Unknown',
        accession: dicomMeta.AccessionNumber || 'Not specified',
        referringPhysician: dicomMeta.ReferringPhysicianName || 'Not specified',
        modality: dicomMeta.Modality || study.modality || 'Unknown'
      },
      series: {
        date: dicomMeta.SeriesDate || 'Unknown',
        time: dicomMeta.SeriesTime || 'Unknown',
        description: dicomMeta.SeriesDescription || study.series_description || 'Unknown',
        uid: dicomMeta.SeriesInstanceUID || 'Unknown',
        number: dicomMeta.SeriesNumber || 'Unknown'
      },
      image: {
        instanceNumber: dicomMeta.InstanceNumber || 'Unknown',
        sopInstanceUID: dicomMeta.SOPInstanceUID || 'Unknown',
        imageType: Array.isArray(dicomMeta.ImageType) ? dicomMeta.ImageType.join(', ') : 'Unknown',
        acquisitionDate: dicomMeta.AcquisitionDate || 'Unknown',
        acquisitionTime: dicomMeta.AcquisitionTime || 'Unknown'
      },
      technical: {
        dimensions: `${dicomMeta.Rows || 'Unknown'} × ${dicomMeta.Columns || 'Unknown'}`,
        bitsAllocated: dicomMeta.BitsAllocated || 'Unknown',
        bitsStored: dicomMeta.BitsStored || 'Unknown',
        pixelRepresentation: dicomMeta.PixelRepresentation || 'Unknown',
        windowCenter: Array.isArray(dicomMeta.WindowCenter) 
          ? dicomMeta.WindowCenter.join(', ') 
          : dicomMeta.WindowCenter || 'Unknown',
        windowWidth: Array.isArray(dicomMeta.WindowWidth) 
          ? dicomMeta.WindowWidth.join(', ') 
          : dicomMeta.WindowWidth || 'Unknown',
        rescaleIntercept: dicomMeta.RescaleIntercept || 'Unknown',
        rescaleSlope: dicomMeta.RescaleSlope || 'Unknown',
        sliceThickness: dicomMeta.SliceThickness || 'Unknown',
        pixelSpacing: Array.isArray(dicomMeta.PixelSpacing) 
          ? dicomMeta.PixelSpacing.join(' × ') + ' mm' 
          : 'Unknown'
      }
    };
  }, [study, metadata]);

  // Calculate age from birth date
  function calculateAge(birthDate?: string): string | null {
    if (!birthDate) return null;
    
    try {
      // DICOM date format: YYYYMMDD
      const year = parseInt(birthDate.substring(0, 4));
      const month = parseInt(birthDate.substring(4, 6)) - 1;
      const day = parseInt(birthDate.substring(6, 8));
      
      const birth = new Date(year, month, day);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      
      if (today.getMonth() < birth.getMonth() || 
          (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return `${age}Y`;
    } catch {
      return null;
    }
  }

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr === 'Unknown') return dateStr;
    
    try {
      // DICOM date format: YYYYMMDD
      if (dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${month}/${day}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    if (!timeStr || timeStr === 'Unknown') return timeStr;
    
    try {
      // DICOM time format: HHMMSS or HHMMSS.FFFFFF
      if (timeStr.length >= 6) {
        const hours = timeStr.substring(0, 2);
        const minutes = timeStr.substring(2, 4);
        const seconds = timeStr.substring(4, 6);
        return `${hours}:${minutes}:${seconds}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  // Handle section expansion
  const handleSectionToggle = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Handle export
  const handleExport = (format: 'json' | 'xml' | 'dicom-sr') => {
    onMetadataExport?.(format);
    setExportDialogOpen(false);
  };

  // Handle metadata export
  const handleMetadataExport = useCallback((format: 'json' | 'csv' | 'xml') => {
    const exportData = {
      patient: processedMetadata.patient,
      study: processedMetadata.study,
      series: processedMetadata.series,
      image: processedMetadata.image,
      technical: processedMetadata.technical,
      timestamp: new Date().toISOString()
    };

    const filename = `dicom-metadata-${study.study_uid}.${format}`;
    
    switch (format) {
      case 'json':
        const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = filename;
        jsonLink.click();
        URL.revokeObjectURL(jsonUrl);
        break;
      
      case 'csv':
        const csvData = Object.entries(exportData).flatMap(([category, data]) =>
          Object.entries(data as Record<string, any>).map(([key, value]) => ({
            Category: category,
            Field: key,
            Value: Array.isArray(value) ? value.join('; ') : String(value)
          }))
        );
        
        const csvHeaders = 'Category,Field,Value\n';
        const csvContent = csvData.map(row => 
          `${row.Category},${row.Field},"${row.Value}"`
        ).join('\n');
        
        const csvBlob = new Blob([csvHeaders + csvContent], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = filename;
        csvLink.click();
        URL.revokeObjectURL(csvUrl);
        break;
        
      case 'xml':
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dicom-metadata>
  ${Object.entries(exportData).map(([category, data]) => `
  <${category}>
    ${Object.entries(data as Record<string, any>).map(([key, value]) => `
    <${key}>${Array.isArray(value) ? value.join('; ') : String(value)}</${key}>`).join('')}
  </${category}>`).join('')}
</dicom-metadata>`;
        
        const xmlBlob = new Blob([xmlContent], { type: 'application/xml' });
        const xmlUrl = URL.createObjectURL(xmlBlob);
        const xmlLink = document.createElement('a');
        xmlLink.href = xmlUrl;
        xmlLink.download = filename;
        xmlLink.click();
        URL.revokeObjectURL(xmlUrl);
        break;
    }
    
    setExportDialogOpen(false);
  }, [study, processedMetadata]);

  // Filter metadata based on search and category
  const filteredMetadata = useMemo(() => {
    const allMetadata = {
      patient: processedMetadata.patient,
      study: processedMetadata.study,
      series: processedMetadata.series,
      image: processedMetadata.image,
      technical: processedMetadata.technical
    };

    if (!filterText && selectedCategory === 'all') {
      return allMetadata;
    }

    const filtered: any = {};
    
    Object.entries(allMetadata).forEach(([category, data]) => {
      if (selectedCategory !== 'all' && selectedCategory !== category) {
        return;
      }

      if (!filterText) {
        filtered[category] = data;
        return;
      }

      const filteredData: any = {};
      Object.entries(data as Record<string, any>).forEach(([key, value]) => {
        const searchText = filterText.toLowerCase();
        const keyMatch = key.toLowerCase().includes(searchText);
        const valueMatch = String(value).toLowerCase().includes(searchText);
        
        if (keyMatch || valueMatch) {
          filteredData[key] = value;
        }
      });

      if (Object.keys(filteredData).length > 0) {
        filtered[category] = filteredData;
      }
    });

    return filtered;
  }, [processedMetadata, filterText, selectedCategory]);

  // Handle report selection
  const handleReportSelect = (report: StructuredReport) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
  };

  // Get report status color
  const getReportStatusColor = (status: StructuredReport['status']) => {
    switch (status) {
      case 'FINAL': return 'success';
      case 'PRELIMINARY': return 'warning';
      case 'DRAFT': return 'info';
      case 'AMENDED': return 'secondary';
      default: return 'default';
    }
  };

  // Render overlay mode
  if (showOverlay) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {/* Top Left - Patient Info */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            pointerEvents: 'auto'
          }}
        >
          <Typography variant="caption" display="block">
            {processedMetadata.patient.name}
          </Typography>
          <Typography variant="caption" display="block">
            ID: {processedMetadata.patient.id}
          </Typography>
          <Typography variant="caption" display="block">
            {processedMetadata.patient.sex}, {processedMetadata.patient.age}
          </Typography>
        </Box>

        {/* Top Right - Study Info */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            textAlign: 'right',
            pointerEvents: 'auto'
          }}
        >
          <Typography variant="caption" display="block">
            {processedMetadata.study.modality}
          </Typography>
          <Typography variant="caption" display="block">
            {formatDate(processedMetadata.study.date)}
          </Typography>
          <Typography variant="caption" display="block">
            {formatTime(processedMetadata.study.time)}
          </Typography>
        </Box>

        {/* Bottom Left - Technical Info */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            pointerEvents: 'auto'
          }}
        >
          <Typography variant="caption" display="block">
            {processedMetadata.technical.dimensions}
          </Typography>
          <Typography variant="caption" display="block">
            W: {processedMetadata.technical.windowWidth} L: {processedMetadata.technical.windowCenter}
          </Typography>
          <Typography variant="caption" display="block">
            Spacing: {processedMetadata.technical.pixelSpacing}
          </Typography>
        </Box>

        {/* Bottom Right - Series Info */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            textAlign: 'right',
            pointerEvents: 'auto'
          }}
        >
          <Typography variant="caption" display="block">
            Series: {processedMetadata.series.number}
          </Typography>
          <Typography variant="caption" display="block">
            {processedMetadata.series.description}
          </Typography>
          <Typography variant="caption" display="block">
            Instance: {processedMetadata.image.instanceNumber}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render panel mode
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        ...styles.card
      }}
    >
      <CardContent sx={{ flex: 1, overflow: 'hidden', p: 0 }}>
        {/* Header with Controls */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DataObject color="primary" />
              DICOM Metadata
              <Chip 
                label={`${Object.keys(filteredMetadata).length} sections`} 
                size="small" 
                variant="outlined" 
              />
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={overlayMode}
                    onChange={(e) => setOverlayMode(e.target.checked)}
                    size="small"
                  />
                }
                label="Overlay"
                sx={{ mr: 1 }}
              />
              <Tooltip title="Export metadata">
                <IconButton size="small" onClick={() => setExportDialogOpen(true)}>
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Generate report">
                <IconButton size="small" onClick={() => setReportDialogOpen(true)}>
                  <Assignment />
                </IconButton>
              </Tooltip>
              <Tooltip title="Advanced settings">
                <IconButton 
                  size="small" 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  color={showAdvanced ? 'primary' : 'default'}
                >
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Search and Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search metadata..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="patient">Patient</MenuItem>
                <MenuItem value="study">Study</MenuItem>
                <MenuItem value="series">Series</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Advanced Controls */}
          {showAdvanced && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showTechnicalDetails}
                    onChange={(e) => setShowTechnicalDetails(e.target.checked)}
                    size="small"
                  />
                }
                label="Technical Details"
              />
              <Button
                size="small"
                startIcon={<Code />}
                onClick={() => console.log('Raw DICOM data:', study)}
              >
                Raw Data
              </Button>
              <Button
                size="small"
                startIcon={<Analytics />}
                onClick={() => console.log('Metadata analysis')}
              >
                Analyze
              </Button>
            </Box>
          )}
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Metadata" 
              icon={<DataObject />} 
              iconPosition="start"
            />
            <Tab 
              label="Structured Reports" 
              icon={<Assignment />} 
              iconPosition="start"
            />
            <Tab 
              label="Export & Share" 
              icon={<Share />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 0 && (
            <Box sx={{ p: 2 }}>
              {Object.keys(filteredMetadata).length === 0 ? (
                <Alert severity="info">
                  No metadata matches your current filter criteria.
                </Alert>
              ) : (
                Object.entries(filteredMetadata).map(([category, data]) => (
                  <Accordion
                    key={category}
                    expanded={expandedSections[category]}
                    onChange={() => handleSectionToggle(category)}
                    sx={{ mb: 1 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {category === 'patient' && <Person color="primary" />}
                        {category === 'study' && <LocalHospital color="primary" />}
                        {category === 'series' && <Timeline color="primary" />}
                        {category === 'image' && <Camera color="primary" />}
                        {category === 'technical' && <Settings color="primary" />}
                        <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                          {category} Information
                        </Typography>
                        <Chip 
                          label={Object.keys(data as Record<string, any>).length} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {Object.entries(data as Record<string, any>).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell sx={{ fontWeight: 'medium', width: '40%' }}>
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </TableCell>
                                <TableCell>
                                  {Array.isArray(value) ? (
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                      {value.map((item, index) => (
                                        <Chip key={index} label={String(item)} size="small" />
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                      {String(value)}
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 2, height: '100%' }}>
              <StructuredReportingPanel
                study={study}
                onReportSave={(report) => {
                  console.log('Report saved:', report);
                  // Handle report save
                }}
                onReportSubmit={(report) => {
                  console.log('Report submitted:', report);
                  // Handle report submission
                }}
                onReportExport={(report, format) => {
                  console.log('Report export:', report, format);
                  // Handle report export
                }}
                enableAI={true}
              />
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Download color="primary" />
                        Export Options
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon><DataObject /></ListItemIcon>
                          <ListItemText 
                            primary="JSON Format" 
                            secondary="Machine-readable structured data"
                          />
                          <Button 
                            size="small" 
                            onClick={() => handleMetadataExport('json')}
                          >
                            Export
                          </Button>
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Assessment /></ListItemIcon>
                          <ListItemText 
                            primary="CSV Format" 
                            secondary="Spreadsheet-compatible format"
                          />
                          <Button 
                            size="small" 
                            onClick={() => handleMetadataExport('csv')}
                          >
                            Export
                          </Button>
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Code /></ListItemIcon>
                          <ListItemText 
                            primary="XML Format" 
                            secondary="Structured markup format"
                          />
                          <Button 
                            size="small" 
                            onClick={() => handleMetadataExport('xml')}
                          >
                            Export
                          </Button>
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Share color="primary" />
                        Share Options
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon><Print /></ListItemIcon>
                          <ListItemText 
                            primary="Print Report" 
                            secondary="Generate printable metadata report"
                          />
                          <Button size="small">Print</Button>
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Assignment /></ListItemIcon>
                          <ListItemText 
                            primary="Generate Report" 
                            secondary="Create structured clinical report"
                          />
                          <Button 
                            size="small"
                            onClick={() => setReportDialogOpen(true)}
                          >
                            Generate
                          </Button>
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </CardContent>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Metadata</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Choose the format for exporting DICOM metadata:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DataObject />}
              onClick={() => handleExport('json')}
              fullWidth
            >
              JSON Format
            </Button>
            <Button
              variant="outlined"
              startIcon={<DataObject />}
              onClick={() => handleExport('xml')}
              fullWidth
            >
              XML Format
            </Button>
            <Button
              variant="outlined"
              startIcon={<Assignment />}
              onClick={() => handleExport('dicom-sr')}
              fullWidth
            >
              DICOM Structured Report
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Report Details Dialog */}
      <Dialog 
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment color="primary" />
            {selectedReport?.title}
            <Chip 
              label={selectedReport?.status} 
              size="small" 
              color={getReportStatusColor(selectedReport?.status || 'DRAFT')}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Generated on {new Date(selectedReport.timestamp).toLocaleString()} by {selectedReport.author}
              </Typography>
              {selectedReport.confidence && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Confidence: {Math.round(selectedReport.confidence * 100)}%
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {JSON.stringify(selectedReport.content, null, 2)}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<Download />}>Export</Button>
          <Button startIcon={<Share />}>Share</Button>
          <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AdvancedDicomMetadata;