import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import ErrorDisplay from '../components/ErrorHandling/ErrorDisplay';

const ErrorHandlingDemo: React.FC = () => {
  const [showError, setShowError] = useState<string | null>(null);

  const mockErrors = {
    studyNotFound: {
      error: "StudyNotFoundError",
      message: "Study not found: 1.2.3.4.5.6.7.8.9.missing",
      code: "STUDY_NOT_FOUND",
      details: {
        study_uid: "1.2.3.4.5.6.7.8.9.missing",
        requested_by: "radiologist_001",
        search_attempted: true
      },
      request_id: "req_abc123def456",
      timestamp: "2024-01-15T10:30:45.123Z"
    },
    aiServiceError: {
      error: "AIServiceError",
      message: "AI service error: Processing timeout after 30 seconds",
      code: "AI_SERVICE_ERROR",
      details: {
        service_response: {
          timeout: 30,
          retries: 3,
          queue_position: 15,
          estimated_wait_time: "2 minutes"
        },
        study_uid: "1.2.3.4.5.6.7.8.9.timeout",
        exam_type: "echo_complete"
      },
      request_id: "req_xyz789abc123",
      timestamp: "2024-01-15T10:35:22.456Z"
    },
    validationError: {
      error: "ValidationError",
      message: "Invalid patient ID format: must be alphanumeric, 6-12 characters",
      code: "VALIDATION_ERROR",
      details: {
        field: "patient_id",
        provided_value: "PAT-001@#$",
        expected_format: "alphanumeric, 6-12 characters",
        examples: ["PAT001", "PATIENT123", "ABC123DEF"]
      },
      request_id: "req_def456ghi789",
      timestamp: "2024-01-15T10:28:15.789Z"
    },
    circuitBreakerError: {
      error: "KiroException",
      message: "Circuit breaker ai_service is OPEN",
      code: "CIRCUIT_BREAKER_OPEN",
      details: {
        circuit_breaker: "ai_service",
        state: "open",
        failure_count: 8,
        last_failure_time: "2024-01-15T10:42:30.123Z",
        recovery_timeout_seconds: 60,
        estimated_recovery_time: "2024-01-15T10:43:30.123Z"
      },
      request_id: "req_circuit_breaker_123",
      timestamp: "2024-01-15T10:42:45.456Z"
    },
    rateLimitError: {
      error: "RateLimitError",
      message: "Rate limit exceeded: Too many requests",
      code: "RATE_LIMIT_ERROR",
      details: {
        limit: 100,
        window: "1 minute",
        current_requests: 150,
        reset_time: "2024-01-15T10:46:00.000Z"
      },
      request_id: "req_rate_limit_456",
      timestamp: "2024-01-15T10:45:30.123Z"
    }
  };

  const triggerComponentError = () => {
    // This will trigger the ErrorBoundary
    throw new Error('This is a test component error to demonstrate the ErrorBoundary');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Error Handling & Monitoring Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This page demonstrates the comprehensive error handling system implemented in Kiro-mini.
        Click the buttons below to see different types of errors and how they are displayed.
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>Error Handling Features</AlertTitle>
        • Standardized error responses with detailed context<br/>
        • Request ID tracking for debugging<br/>
        • User-friendly error messages with actionable suggestions<br/>
        • Automatic error logging and monitoring<br/>
        • Circuit breaker and retry logic visualization<br/>
        • Error boundary for component-level error handling
      </Alert>

      <Grid container spacing={3}>
        {/* API Error Examples */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Error Examples
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These errors come from the backend API and show structured error responses.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowError('studyNotFound')}
                  startIcon={<ErrorIcon />}
                >
                  Study Not Found Error
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowError('aiServiceError')}
                  startIcon={<ErrorIcon />}
                >
                  AI Service Error
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowError('validationError')}
                  startIcon={<WarningIcon />}
                >
                  Validation Error
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowError('circuitBreakerError')}
                  startIcon={<ErrorIcon />}
                >
                  Circuit Breaker Open
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowError('rateLimitError')}
                  startIcon={<WarningIcon />}
                >
                  Rate Limit Error
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Component Error Examples */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component Error Examples
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These errors demonstrate the ErrorBoundary component that catches React component errors.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={triggerComponentError}
                  startIcon={<BugReportIcon />}
                >
                  Trigger Component Error
                </Button>
                <Typography variant="caption" color="text.secondary">
                  ⚠️ This will trigger the ErrorBoundary and show the error page
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        <Grid item xs={12}>
          {showError && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Error Display Example
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowError(null)}
                  >
                    Clear
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <ErrorDisplay
                  error={mockErrors[showError as keyof typeof mockErrors]}
                  onRetry={() => {
                    console.log('Retry clicked for:', showError);
                    setShowError(null);
                  }}
                  showDetails={true}
                />
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Error Handling Features */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Handling System Features
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      🔍 Detailed Error Context
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Every error includes detailed context, request IDs, timestamps, and actionable suggestions for resolution.
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      🔄 Retry Logic & Circuit Breakers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Automatic retry with exponential backoff and circuit breakers protect against cascading failures.
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      📊 Error Monitoring
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All errors are automatically logged and monitored with real-time alerting for critical issues.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ErrorHandlingDemo;