import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Build as BuildIcon,
  Person as PersonIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

import { UserFriendlyError, TroubleshootingStep, RecoveryAction } from '../services/errorHandlingService';

interface ErrorDisplayProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onContactSupport?: () => void;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  onContactSupport,
  showTechnicalDetails = false,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ErrorIcon />;
      case 'medium':
        return <WarningIcon />;
      case 'low':
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '👍';
      case 'medium':
        return '⚠️';
      case 'advanced':
        return '🔧';
      default:
        return '❓';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatErrorForSupport = () => {
    return `
Error Report
============
Title: ${error.title}
Message: ${error.message}
Error Code: ${error.errorCode}
Timestamp: ${error.timestamp.toISOString()}
Type: ${error.classification.type}
Severity: ${error.classification.severity}
Category: ${error.classification.category}
Retryable: ${error.classification.retryable}

Context:
${error.context ? JSON.stringify(error.context, null, 2) : 'No context available'}

Technical Details:
${error.technicalDetails || 'No technical details available'}
    `.trim();
  };

  if (compact) {
    return (
      <Alert 
        severity={getSeverityColor(error.classification.severity) as any}
        action={
          <Box>
            {error.classification.retryable && onRetry && (
              <Button size="small" onClick={onRetry} startIcon={<RefreshIcon />}>
                Retry
              </Button>
            )}
            {onDismiss && (
              <IconButton size="small" onClick={onDismiss}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle>{error.title}</AlertTitle>
        {error.message}
      </Alert>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Error Header */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="flex-start" gap={2}>
            {getSeverityIcon(error.classification.severity)}
            <Box>
              <Typography variant="h6" color="error" gutterBottom>
                {error.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {error.message}
              </Typography>
              
              {/* Error Metadata */}
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip
                  label={error.classification.type}
                  color={getSeverityColor(error.classification.severity) as any}
                  size="small"
                />
                <Chip
                  label={error.classification.severity}
                  variant="outlined"
                  size="small"
                />
                {error.classification.retryable && (
                  <Chip
                    label="Retryable"
                    color="info"
                    size="small"
                    icon={<RefreshIcon />}
                  />
                )}
                {error.errorCode && (
                  <Chip
                    label={`Code: ${error.errorCode}`}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </Box>

          {onDismiss && (
            <IconButton onClick={onDismiss} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Recovery Actions */}
        {error.recoveryActions.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Actions:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {error.recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.primary ? "contained" : "outlined"}
                  size="small"
                  onClick={action.action}
                  startIcon={action.icon ? <span>{action.icon}</span> : undefined}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Troubleshooting Steps */}
        {error.troubleshooting.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" display="flex" alignItems="center">
                <HelpIcon sx={{ mr: 1 }} />
                Troubleshooting Steps ({error.troubleshooting.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stepper orientation="vertical">
                {error.troubleshooting.map((step, index) => (
                  <Step key={index} active={true}>
                    <StepLabel>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">
                          {step.title}
                        </Typography>
                        <Chip
                          label={step.difficulty}
                          color={getDifficultyColor(step.difficulty) as any}
                          size="small"
                          icon={<span>{getDifficultyIcon(step.difficulty)}</span>}
                        />
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {step.description}
                      </Typography>
                      {step.action && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            <strong>Action:</strong> {step.action}
                          </Typography>
                        </Alert>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Context Information */}
        {error.context && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" display="flex" alignItems="center">
                <InfoIcon sx={{ mr: 1 }} />
                Error Context
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {error.context.fileName && (
                  <ListItem>
                    <ListItemIcon>📁</ListItemIcon>
                    <ListItemText
                      primary="File Name"
                      secondary={error.context.fileName}
                    />
                  </ListItem>
                )}
                {error.context.fileSize && (
                  <ListItem>
                    <ListItemIcon>📏</ListItemIcon>
                    <ListItemText
                      primary="File Size"
                      secondary={`${(error.context.fileSize / 1024 / 1024).toFixed(2)} MB`}
                    />
                  </ListItem>
                )}
                {error.context.patientId && (
                  <ListItem>
                    <ListItemIcon>🏥</ListItemIcon>
                    <ListItemText
                      primary="Patient ID"
                      secondary={error.context.patientId}
                    />
                  </ListItem>
                )}
                {error.context.retryAttempt && (
                  <ListItem>
                    <ListItemIcon>🔄</ListItemIcon>
                    <ListItemText
                      primary="Retry Attempt"
                      secondary={`${error.context.retryAttempt} of ${error.context.maxRetries || 'unlimited'}`}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>⏰</ListItemIcon>
                  <ListItemText
                    primary="Occurred At"
                    secondary={error.timestamp.toLocaleString()}
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Technical Details */}
        {(showTechnicalDetails || error.technicalDetails) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" display="flex" alignItems="center">
                <BuildIcon sx={{ mr: 1 }} />
                Technical Details
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Error Code: {error.errorCode}
                  </Typography>
                  <Tooltip title={copiedToClipboard ? "Copied!" : "Copy error details"}>
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(formatErrorForSupport())}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {error.technicalDetails && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {error.technicalDetails}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Support Actions */}
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Need more help?
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              onClick={() => copyToClipboard(formatErrorForSupport())}
              startIcon={<CopyIcon />}
            >
              Copy Error Details
            </Button>
            {onContactSupport && (
              <Button
                size="small"
                onClick={onContactSupport}
                startIcon={<PersonIcon />}
              >
                Contact Support
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;