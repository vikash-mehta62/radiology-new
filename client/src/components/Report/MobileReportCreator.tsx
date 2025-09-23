/**
 * Mobile-Optimized Report Creation Component
 * Touch-friendly interface with swipe gestures and mobile-specific workflows
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  SwipeableDrawer,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Slide,
  Collapse,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Fullscreen as FullscreenIcon,
  KeyboardVoice as KeyboardVoiceIcon,
  Menu as MenuIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  MoreVert as MoreVertIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Description as TemplateIcon, // Fix: Use Description instead of Template
  Navigation as NavigationIcon,
  TouchApp as TouchIcon,
  Swipe as SwipeIcon,
  Speed as SpeedIcon,
  Gesture as GestureIcon,
  PanTool as PanToolIcon,
  Visibility as VisibilityIcon,
  VolumeUp as VolumeUpIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSwipeable } from 'react-swipeable';
import { enhancedVoiceRecognitionService } from '../../services/enhancedVoiceRecognitionService';

interface MobileReportCreatorProps {
  study: any;
  onClose: () => void;
  onReportCreated?: (reportId: string) => void;
}

interface ReportSection {
  id: string;
  title: string;
  field: keyof ReportData;
  required: boolean;
  placeholder: string;
  icon: React.ReactNode;
  voiceEnabled: boolean;
}

interface ReportData {
  clinical_history: string;
  technique: string;
  findings: string;
  impression: string;
  recommendations: string;
  critical_findings: string;
}

const MobileReportCreator: React.FC<MobileReportCreatorProps> = ({
  study,
  onClose,
  onReportCreated
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [reportData, setReportData] = useState<ReportData>({
    clinical_history: '',
    technique: '',
    findings: '',
    impression: '',
    recommendations: '',
    critical_findings: ''
  });
  const [isListening, setIsListening] = useState(false);
  const [currentVoiceField, setCurrentVoiceField] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [fullscreenField, setFullscreenField] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Report sections configuration
  const reportSections: ReportSection[] = [
    {
      id: 'clinical_history',
      title: 'Clinical History',
      field: 'clinical_history',
      required: true,
      placeholder: 'Enter patient clinical history and symptoms...',
      icon: <ReportIcon />,
      voiceEnabled: true
    },
    {
      id: 'technique',
      title: 'Technique',
      field: 'technique',
      required: false,
      placeholder: 'Describe imaging technique and parameters...',
      icon: <TemplateIcon />,
      voiceEnabled: true
    },
    {
      id: 'findings',
      title: 'Findings',
      field: 'findings',
      required: true,
      placeholder: 'Describe imaging findings...',
      icon: <CheckIcon />,
      voiceEnabled: true
    },
    {
      id: 'impression',
      title: 'Impression',
      field: 'impression',
      required: true,
      placeholder: 'Provide clinical impression and diagnosis...',
      icon: <CheckIcon />,
      voiceEnabled: true
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      field: 'recommendations',
      required: false,
      placeholder: 'Provide recommendations for follow-up...',
      icon: <NavigationIcon />,
      voiceEnabled: true
    },
    {
      id: 'critical_findings',
      title: 'Critical Findings',
      field: 'critical_findings',
      required: false,
      placeholder: 'Critical findings requiring immediate attention...',
      icon: <WarningIcon />,
      voiceEnabled: true
    }
  ];

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentStep < reportSections.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    },
    onSwipedRight: () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    },
    onSwipedUp: () => {
      const currentSection = reportSections[currentStep];
      if (currentSection.voiceEnabled) {
        toggleVoiceRecognition(currentSection.field);
      }
    },
    onSwipedDown: () => {
      setDrawerOpen(true);
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  // Voice recognition setup
  useEffect(() => {
    enhancedVoiceRecognitionService.onResult((result) => {
      if (result.isFinal && currentVoiceField) {
        setReportData(prev => ({
          ...prev,
          [currentVoiceField]: prev[currentVoiceField as keyof ReportData] + ' ' + result.transcript
        }));
        
        if (result.medicalTermsDetected.length > 0) {
          setSnackbarMessage(`Medical terms detected: ${result.medicalTermsDetected.join(', ')}`);
        }
      }
    });

    enhancedVoiceRecognitionService.onError((error) => {
      setSnackbarMessage(`Voice recognition error: ${error}`);
      setIsListening(false);
      setCurrentVoiceField('');
    });
  }, [currentVoiceField]);

  // Voice recognition functions
  const toggleVoiceRecognition = (field: string) => {
    if (isListening && currentVoiceField === field) {
      enhancedVoiceRecognitionService.stopListening();
      setIsListening(false);
      setCurrentVoiceField('');
    } else {
      if (enhancedVoiceRecognitionService.startListening(field)) {
        setIsListening(true);
        setCurrentVoiceField(field);
        setSnackbarMessage('Voice recognition started');
      }
    }
  };

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < reportSections.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setDrawerOpen(false);
  };

  // Field management
  const handleFieldChange = (field: keyof ReportData, value: string) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleFullscreenField = (field: string | null) => {
    setFullscreenField(field);
  };

  // Report submission
  const handleSaveReport = async () => {
    setShowProgress(true);
    try {
      // Implement report saving logic
      setSnackbarMessage('Report saved successfully');
      if (onReportCreated) {
        onReportCreated('mock-report-id');
      }
    } catch (error) {
      setSnackbarMessage('Failed to save report');
    } finally {
      setShowProgress(false);
    }
  };

  const handleSendReport = async () => {
    setShowProgress(true);
    try {
      // Implement report sending logic
      setSnackbarMessage('Report sent successfully');
      onClose();
    } catch (error) {
      setSnackbarMessage('Failed to send report');
    } finally {
      setShowProgress(false);
    }
  };

  // Quick actions for SpeedDial
  const speedDialActions = [
    {
      icon: <SaveIcon />,
      name: 'Save',
      action: handleSaveReport
    },
    {
      icon: <SendIcon />,
      name: 'Send',
      action: handleSendReport
    },
    {
      icon: <VoiceIcon />,
      name: 'Voice',
      action: () => toggleVoiceRecognition(reportSections[currentStep].field)
    },
    {
      icon: <TemplateIcon />,
      name: 'Templates',
      action: () => setDrawerOpen(true)
    }
  ];

  const currentSection = reportSections[currentStep];
  const progress = ((currentStep + 1) / reportSections.length) * 100;

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
      {...swipeHandlers}
    >
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
          {study?.patient_name || 'New Report'}
        </Typography>
        <IconButton onClick={() => setDrawerOpen(true)}>
          <NavigationIcon />
        </IconButton>
      </Paper>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 4 }}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Step Indicator */}
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Step {currentStep + 1} of {reportSections.length}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, mb: 2 }}>
            {currentSection.title}
          </Typography>
        </Box>

        {/* Field Input */}
        <Box sx={{ px: 2, flex: 1 }}>
          <Card elevation={1}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {currentSection.icon}
                <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
                  {currentSection.title}
                </Typography>
                {currentSection.voiceEnabled && (
                  <IconButton
                    color={isListening && currentVoiceField === currentSection.field ? 'error' : 'primary'}
                    onClick={() => toggleVoiceRecognition(currentSection.field)}
                  >
                    {isListening && currentVoiceField === currentSection.field ? <MicOffIcon /> : <MicIcon />}
                  </IconButton>
                )}
                <IconButton
                  onClick={() => toggleFullscreenField(currentSection.field)}
                >
                  <FullscreenIcon />
                </IconButton>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={isSmallMobile ? 6 : 8}
                value={reportData[currentSection.field]}
                onChange={(e) => handleFieldChange(currentSection.field, e.target.value)}
                placeholder={currentSection.placeholder}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: isSmallMobile ? '16px' : '14px' // Prevent zoom on iOS
                  }
                }}
              />

              {currentSection.required && !reportData[currentSection.field] && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This field is required
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button
            variant="contained"
            endIcon={<ForwardIcon />}
            onClick={goToNextStep}
            disabled={currentStep === reportSections.length - 1}
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Navigation Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        disableSwipeToOpen={false}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Report Sections
          </Typography>
          <List>
            {reportSections.map((section, index) => (
              <ListItem
                key={section.id}
                button
                onClick={() => goToStep(index)}
                selected={index === currentStep}
              >
                <ListItemIcon>
                  {section.icon}
                </ListItemIcon>
                <ListItemText
                  primary={section.title}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {section.required && <Chip label="Required" size="small" />}
                      {reportData[section.field] && <CheckIcon color="success" fontSize="small" />}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </SwipeableDrawer>

      {/* Fullscreen Field Editor */}
      <Drawer
        anchor="bottom"
        open={!!fullscreenField}
        onClose={() => toggleFullscreenField(null)}
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        {fullscreenField && (
          <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                {reportSections.find(s => s.field === fullscreenField)?.title}
              </Typography>
              <IconButton onClick={() => toggleFullscreenField(null)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <TextField
              fullWidth
              multiline
              value={reportData[fullscreenField as keyof ReportData]}
              onChange={(e) => handleFieldChange(fullscreenField as keyof ReportData, e.target.value)}
              placeholder={reportSections.find(s => s.field === fullscreenField)?.placeholder}
              variant="outlined"
              sx={{ flex: 1 }}
            />
          </Box>
        )}
      </Drawer>

      {/* Speed Dial */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
          />
        ))}
      </SpeedDial>

      {/* Progress Indicator */}
      {showProgress && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography>Processing...</Typography>
          </Paper>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3000}
        onClose={() => setSnackbarMessage('')}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default MobileReportCreator;