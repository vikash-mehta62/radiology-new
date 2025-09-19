import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.prototype.generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In a real application, this would send the error to your monitoring service
    console.error('Error Boundary caught an error:', {
      errorId: this.state.errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Example of sending to backend monitoring service
    // monitoringService.logError({
    //   errorId: this.state.errorId,
    //   message: error.message,
    //   stack: error.stack,
    //   componentStack: errorInfo.componentStack,
    //   userAgent: navigator.userAgent,
    //   url: window.location.href,
    //   timestamp: new Date().toISOString(),
    // });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BugReportIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h5" color="error">
                  Something went wrong
                </Typography>
              </Box>

              <Alert severity="error" sx={{ mb: 3 }}>
                An unexpected error occurred in the application. The error has been logged and our team has been notified.
              </Alert>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Error ID: <Chip label={this.state.errorId} size="small" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Timestamp: {new Date().toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                  sx={{ mr: 2 }}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Error Details (for development/debugging) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Error Details (Development Mode)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Error Message:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          backgroundColor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {this.state.error.message}
                      </Typography>
                    </Box>

                    {this.state.error.stack && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Stack Trace:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.75rem',
                          }}
                        >
                          {this.state.error.stack}
                        </Typography>
                      </Box>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Component Stack:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.75rem',
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  If this problem persists, please contact support with the error ID above.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;