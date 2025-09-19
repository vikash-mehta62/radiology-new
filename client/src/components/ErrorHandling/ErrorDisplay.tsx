import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

interface ApiError {
  error: string;
  message: string;
  code: string;
  details?: Record<string, any>;
  request_id?: string;
  timestamp?: string;
}

interface ErrorDisplayProps {
  error: ApiError | Error | string;
  onRetry?: () => void;
  showDetails?: boolean;
  severity?: 'error' | 'warning' | 'info';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  showDetails = false,
  severity = 'error'
}) => {
  const parseError = (err: ApiError | Error | string): ApiError => {
    if (typeof err === 'string') {
      return {
        error: 'Error',
        message: err,
        code: 'UNKNOWN_ERROR'
      };
    }

    if (err instanceof Error) {
      return {
        error: err.name || 'Error',
        message: err.message,
        code: 'CLIENT_ERROR'
      };
    }

    return err;
  };

  const parsedError = parseError(error);

  const copyErrorDetails = () => {
    const errorDetails = {
      error: parsedError.error,
      message: parsedError.message,
      code: parsedError.code,
      details: parsedError.details,
      request_id: parsedError.request_id,
      timestamp: parsedError.timestamp || new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  const getErrorTitle = () => {
    switch (parsedError.code) {
      case 'STUDY_NOT_FOUND':
        return 'Study Not Found';
      case 'AI_SERVICE_ERROR':
        return 'AI Service Error';
      case 'VALIDATION_ERROR':
        return 'Validation Error';
      case 'BILLING_VALIDATION_ERROR':
        return 'Billing Validation Error';
      case 'CIRCUIT_BREAKER_OPEN':
        return 'Service Temporarily Unavailable';
      case 'RATE_LIMIT_ERROR':
        return 'Rate Limit Exceeded';
      default:
        return 'Error';
    }
  };

  const getErrorIcon = () => {
    switch (parsedError.code) {
      case 'CIRCUIT_BREAKER_OPEN':
        return '🚫';
      case 'RATE_LIMIT_ERROR':
        return '⏱️';
      case 'AI_SERVICE_ERROR':
        return '🤖';
      case 'VALIDATION_ERROR':
        return '⚠️';
      case 'STUDY_NOT_FOUND':
        return '📋';
      default:
        return '❌';
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      <Alert severity={severity}>
        <AlertTitle>
          {getErrorIcon()} {getErrorTitle()}
        </AlertTitle>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          {parsedError.message}
        </Typography>

        {parsedError.request_id && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Request ID: <Chip label={parsedError.request_id} size="small" />
            </Typography>
          </Box>
        )}

        {parsedError.timestamp && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Time: {new Date(parsedError.timestamp).toLocaleString()}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {onRetry && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={copyErrorDetails}
          >
            Copy Details
          </Button>
        </Box>

        {/* Error Details */}
        {(showDetails || process.env.NODE_ENV === 'development') && (
          <>
            <Divider sx={{ my: 1 }} />
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  Error Details
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Code:
                  </Typography>
                  <Chip label={parsedError.code} size="small" />
                </Box>

                {parsedError.details && Object.keys(parsedError.details).length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Additional Details:
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      <pre>{JSON.stringify(parsedError.details, null, 2)}</pre>
                    </Box>
                  </Box>
                )}

                {/* Specific error guidance */}
                {parsedError.code === 'STUDY_NOT_FOUND' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suggestions:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Check if the study UID is correct
                      • Verify the study has been properly ingested
                      • Contact support if the study should exist
                    </Typography>
                  </Box>
                )}

                {parsedError.code === 'AI_SERVICE_ERROR' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suggestions:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • The AI service may be temporarily overloaded
                      • Try again in a few moments
                      • You can create reports manually if needed
                    </Typography>
                  </Box>
                )}

                {parsedError.code === 'CIRCUIT_BREAKER_OPEN' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suggestions:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • The service is temporarily unavailable due to high failure rate
                      • Please wait a moment and try again
                      • The system will automatically recover when the service is stable
                    </Typography>
                  </Box>
                )}

                {parsedError.code === 'VALIDATION_ERROR' && parsedError.details?.examples && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Valid Examples:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {parsedError.details.examples.map((example: string, index: number) => (
                        <Chip key={index} label={example} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Alert>
    </Box>
  );
};

export default ErrorDisplay;