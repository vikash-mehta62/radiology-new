/**
 * DICOM Sidebar Component
 * Contextual tools and information panel
 */

import React, { useState } from 'react';
import {
  Box, Paper, Tabs, Tab, Typography, List, ListItem, ListItemText,
  Accordion, AccordionSummary, AccordionDetails, Chip, Button
} from '@mui/material';
import {
  ExpandMore, Info, Straighten, Notes, Settings, Timeline
} from '@mui/icons-material';
import type { Study } from '../../../types';

interface DicomSidebarProps {
  study: Study;
  measurements: any[];
  annotations: any[];
  onMeasurementSelect: (id: string) => void;
  onAnnotationSelect: (id: string) => void;
  userRole: string;
  enableAdvancedTools: boolean;
}

const DicomSidebar: React.FC<DicomSidebarProps> = ({
  study,
  measurements,
  annotations,
  onMeasurementSelect,
  onAnnotationSelect,
  userRole,
  enableAdvancedTools
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const renderStudyInfo = () => {
    if (!study) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Study Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No study data available
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Study Information
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemText
              primary="Patient"
              secondary={study.patient_info?.name || 'Unknown'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Study Date"
              secondary={study.study_date || 'Unknown'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Modality"
              secondary={study.modality || 'Unknown'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Description"
              secondary={study.study_description || 'No description'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Images"
              secondary={`${study.image_urls?.length || 0} images`}
            />
          </ListItem>
        </List>
      </Box>
    );
  };

  const renderDicomMetadata = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">DICOM Metadata</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Study UID"
              secondary={study.study_uid}
              secondaryTypographyProps={{ 
                sx: { fontFamily: 'monospace', fontSize: '0.75rem' }
              }}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Patient ID"
              secondary={study.patient_id}
            />
          </ListItem>
          {study.dicom_metadata && Object.entries(study.dicom_metadata).map(([key, value]) => (
            <ListItem key={key}>
              <ListItemText
                primary={key}
                secondary={String(value)}
              />
            </ListItem>
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );

  const renderMeasurements = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Measurements
      </Typography>
      
      {measurements.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No measurements available
        </Typography>
      ) : (
        <List>
          {measurements.map((measurement, index) => (
            <ListItem
              key={index}
              button
              onClick={() => onMeasurementSelect(measurement.id)}
            >
              <ListItemText
                primary={measurement.type}
                secondary={`${measurement.value} ${measurement.unit}`}
              />
              <Chip
                label={measurement.status || 'Active'}
                size="small"
                color={measurement.status === 'verified' ? 'success' : 'default'}
              />
            </ListItem>
          ))}
        </List>
      )}
      
      {userRole !== 'referring_physician' && (
        <Button
          variant="outlined"
          startIcon={<Straighten />}
          fullWidth
          sx={{ mt: 2 }}
        >
          Add Measurement
        </Button>
      )}
    </Box>
  );

  const renderAnnotations = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Annotations
      </Typography>
      
      {annotations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No annotations available
        </Typography>
      ) : (
        <List>
          {annotations.map((annotation, index) => (
            <ListItem
              key={index}
              button
              onClick={() => onAnnotationSelect(annotation.id)}
            >
              <ListItemText
                primary={annotation.title}
                secondary={annotation.description}
              />
            </ListItem>
          ))}
        </List>
      )}
      
      {userRole !== 'referring_physician' && (
        <Button
          variant="outlined"
          startIcon={<Notes />}
          fullWidth
          sx={{ mt: 2 }}
        >
          Add Annotation
        </Button>
      )}
    </Box>
  );

  const renderTools = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tools
      </Typography>
      
      <List>
        <ListItem button>
          <ListItemText primary="Window/Level Presets" />
        </ListItem>
        <ListItem button>
          <ListItemText primary="Image Filters" />
        </ListItem>
        {enableAdvancedTools && (
          <>
            <ListItem button>
              <ListItemText primary="AI Analysis" />
            </ListItem>
            <ListItem button>
              <ListItemText primary="3D Reconstruction" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Paper
      sx={{
        width: 320,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider'
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
      >
        <Tab icon={<Info />} label="Info" />
        <Tab icon={<Straighten />} label="Measure" />
        <Tab icon={<Notes />} label="Notes" />
        <Tab icon={<Settings />} label="Tools" />
      </Tabs>
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && renderStudyInfo()}
        {activeTab === 1 && renderMeasurements()}
        {activeTab === 2 && renderAnnotations()}
        {activeTab === 3 && renderTools()}
      </Box>
    </Paper>
  );
};

export default DicomSidebar;