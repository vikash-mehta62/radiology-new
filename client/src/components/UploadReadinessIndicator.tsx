import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  CloudUpload as UploadIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';

import { 
  preUploadValidator, 
  ValidationResult, 
  ValidationCheck,
  ValidationWarning,
  ValidationError 
} from '../services/preUploadValidator';

interface UploadReadinessIndicatorProps {
  files: File[];
  patientId: string;
  onValidationComplete?: (result: ValidationResult) => void;
  onRetryValidation?: () => void;
  autoValidate?: boolean;
  showDetails?: boolean;
}

const UploadReadinessIndicator: React.FC<UploadReadinessIndicatorProps> = ({
  files,
  patientId,
  onValidationComplete,
  onRetryValidation,
  autoValidate = true,
  showDetails = true
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);

  const runValidation = async () => {
    if (files.length === 0 || !patientId) return;

    setIsValidating(true);
    try {
      const result = await preUploadValidator.validateUploadReadiness(files, patientId);
      setValidationResult(result);
      setLastValidation(new Date());
      
      if (onValidationComplete) {
        onValidationComplete(result);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (autoValidate && files.length > 0 && patientId) {
      runValidation();
    }
  }, [files, patientId, autoValidate]);

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getReadinessMessage = (score: number, canProceed: boolean) => {
    if (!canProceed) return 'Upload blocked - resolve errors to continue';
    if (score >= 90) return 'Excellent - Ready for upload';
    if (score >= 80) return 'Good - Ready for upload';
    if (score >= 60) return 'Fair - Upload possible with warnings';
    return 'Poor - Upload not recommended';
  };

  const getCheckIcon = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'checking':
        return <CircularProgress size={20} />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'connectivity':
        return <NetworkIcon />;
      case 'file':
        return <StorageIcon />;
      case 'system':
        return <SpeedIcon />;
      case 'configuration':
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (files.length === 0) {
    return (
      <Alert severity="info">
        <AlertTitle>Upload Readiness</AlertTitle>
        Select files to check upload readiness
      </Alert>
    );
  }

  if (isValidating) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography variant="h6">
              Checking Upload Readiness...
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Validating connectivity, files, and system requirements
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Upload Readiness Check</Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={runValidation}
              variant="outlined"
              size="small"
            >
              Check Readiness
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { readinessScore, canProceed, checks, warnings, errors, recommendations, estimatedUploadTime } = validationResult;

  return (
    <Card>
      <CardContent>
        {/* Readiness Score Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Readiness
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h4" color={`${getReadinessColor(readinessScore)}.main`}>
                  {readinessScore}%
                </Typography>
                {canProceed ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {getReadinessMessage(readinessScore, canProceed)}
                </Typography>
                {lastValidation && (
                  <Typography variant="caption" color="text.secondary">
                    Last checked: {lastValidation.toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              runValidation();
              if (onRetryValidation) onRetryValidation();
            }}
            size="small"
            variant="outlined"
          >
            Recheck
          </Button>
        </Box>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={readinessScore}
          color={getReadinessColor(readinessScore) as any}
          sx={{ height: 8, borderRadius: 4, mb: 2 }}
        />

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="success.main">
                {checks.filter(c => c.status === 'passed').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Passed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="warning.main">
                {warnings.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Warnings
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="error.main">
                {errors.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Errors
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary.main">
                {estimatedUploadTime ? formatTime(estimatedUploadTime) : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Est. Time
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Blocking Errors */}
        {errors.filter(e => e.blocking).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Upload Blocked</AlertTitle>
            <List dense>
              {errors.filter(e => e.blocking).map((error, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemText
                    primary={error.message}
                    secondary={error.resolution}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Recommendations</AlertTitle>
            <List dense>
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemText primary={recommendation} />
                </ListItem>
              ))}
            </List>
            {recommendations.length > 3 && (
              <Typography variant="caption" color="text.secondary">
                +{recommendations.length - 3} more recommendations
              </Typography>
            )}
          </Alert>
        )}

        {/* Detailed Checks */}
        {showDetails && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Detailed Validation Results ({checks.length} checks)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Group checks by category */}
              {['connectivity', 'file', 'system', 'configuration'].map(category => {
                const categoryChecks = checks.filter(c => c.category === category);
                if (categoryChecks.length === 0) return null;

                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCategoryIcon(category)}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Typography>
                    <List dense>
                      {categoryChecks.map((check, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getCheckIcon(check.status)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                  {check.name}
                                </Typography>
                                {check.icon && <span>{check.icon}</span>}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  {check.message}
                                </Typography>
                                {check.details && (
                                  <Typography variant="caption" color="text.secondary">
                                    {check.details}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                );
              })}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Warnings Details */}
        {warnings.length > 0 && showDetails && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" color="warning.main">
                Warnings ({warnings.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {warnings.map((warning, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning.message}
                      secondary={
                        <Box>
                          <Typography variant="caption">
                            {warning.recommendation}
                          </Typography>
                          <Chip
                            label={warning.severity}
                            size="small"
                            color={warning.severity === 'high' ? 'error' : 'warning'}
                            sx={{ ml: 1 }}
                          />
                          {warning.canIgnore && (
                            <Chip
                              label="Can ignore"
                              size="small"
                              variant="outlined"
                              sx={{ ml: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadReadinessIndicator;