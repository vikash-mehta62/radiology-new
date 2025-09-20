/**
 * Enhanced Error Display Component
 * Provides user-friendly error messages with recovery options
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Refresh as RetryIcon,
  Build as FixIcon,
  Report as ReportIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Close as CloseIcon,
  BugReport as BugIcon,
  Speed as PerformanceIcon,
  Memory as MemoryIcon,
  Wifi as NetworkIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { ViewerError, ErrorSeverity, ErrorType, RecoveryOption, RecoveryAction } from '../../services/errorHandler';

interface ErrorDisplayProps {
  error: ViewerError;
  recoveryOptions: RecoveryOption[];
  onRetry?: () => void;
  onDismiss?: () => void;
  onRecoveryAction?: (action: RecoveryAction) => Promise<boolean>;
  showDetails?: boolean;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  recoveryOptions,
  onRetry,
  onDismiss,
  onRecoveryAction,
  showDetails = false,
  compact = false
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'error';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return <ErrorIcon />;
      case ErrorSeverity.MEDIUM:
        return <WarningIcon />;
      case ErrorSeverity.LOW:
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getErrorTypeIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return <NetworkIcon />;
      case ErrorType.MEMORY_ERROR:
        return <MemoryIcon />;
      case ErrorType.RENDERING_ERROR:
      case ErrorType.DICOM_PARSING_ERROR:
        return <ImageIcon />;
      case ErrorType.GPU_ERROR:
        return <PerformanceIcon />;
      default:
        return <BugIcon />;
    }
  };

  const handleRecoveryAction = async (action: RecoveryAction) => {
    if (!onRecoveryAction) return;

    setExecuting(action.type);
    try {
      const success = await onRecoveryAction(action);
      if (success && onDismiss) {
        onDismiss();
      }
    } catch (error) {
      console.error('Recovery action failed:', error);
    } finally {
      setExecuting(null);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (compact) {
    return (
      <Alert
        severity={getSeverityColor(error.severity) as any}
        action={
          <Box>
            {onRetry && (
              <IconButton
                size="small"
                onClick={onRetry}
                disabled={!error.retryable}
              >
                <RetryIcon />
              </IconButton>
            )}
            {onDismiss && (
              <IconButton size="small" onClick={onDismiss}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        }
      >
        {error.message}
      </Alert>
    );
  }

  return (
    <Card
      sx={{
        mb: 2,
        border: `2px solid ${theme.palette[getSeverityColor(error.severity) as 'error' | 'warning' | 'info' | 'success'].main}`,
        backgroundColor: theme.palette.background.paper
      }}
    >
      <CardContent>
        {/* Error Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ mr: 2, mt: 0.5 }}>
            {getSeverityIcon(error.severity)}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {error.message}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip
                icon={getErrorTypeIcon(error.type)}
                label={error.type.replace('_', ' ').toUpperCase()}
                size="small"
                color={getSeverityColor(error.severity) as any}
                variant="outlined"
              />
              <Chip
                label={error.severity.toUpperCase()}
                size="small"
                color={getSeverityColor(error.severity) as any}
              />
              {error.retryable && (
                <Chip
                  label="RETRYABLE"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Error Code: {error.code} • {formatTimestamp(error.timestamp)}
            </Typography>
          </Box>
          {onDismiss && (
            <IconButton onClick={onDismiss} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Recovery Actions */}
        {recoveryOptions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Suggested Actions:
            </Typography>
            {recoveryOptions.map((option, optionIndex) => (
              <Box key={optionIndex} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {option.description}
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  {option.actions
                    .sort((a, b) => a.priority - b.priority)
                    .map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        onClick={() => handleRecoveryAction(action)}
                        disabled={executing === action.type}
                        startIcon={
                          executing === action.type ? (
                            <CircularProgress size={16} />
                          ) : action.type === 'retry' ? (
                            <RetryIcon />
                          ) : (
                            <FixIcon />
                          )
                        }
                      >
                        {action.label}
                      </Button>
                    ))}
                </ButtonGroup>
              </Box>
            ))}
          </Box>
        )}

        {/* Quick Retry Button */}
        {onRetry && error.retryable && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<RetryIcon />}
              onClick={onRetry}
              color={getSeverityColor(error.severity) as any}
            >
              Try Again
            </Button>
          </Box>
        )}

        {/* Expandable Details */}
        <Box>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <CollapseIcon /> : <ExpandIcon />}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <Collapse in={expanded}>
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              
              {/* Context Information */}
              {error.context && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Context Information:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                      {JSON.stringify(error.context, null, 2)}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Technical Details */}
              <Box sx={{ mb: 2 }}>
                <Button
                  size="small"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  startIcon={<BugIcon />}
                >
                  {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                <Collapse in={showTechnicalDetails}>
                  <Paper variant="outlined" sx={{ p: 1, mt: 1, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                      {error.stack || 'No stack trace available'}
                    </Typography>
                  </Paper>
                </Collapse>
              </Box>

              {/* Report Issue */}
              <Box>
                <Button
                  size="small"
                  startIcon={<ReportIcon />}
                  onClick={() => {
                    // Implementation for reporting issues
                    console.log('Report issue:', error);
                  }}
                >
                  Report This Issue
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ErrorDisplay;