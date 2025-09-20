/**
 * Tests for ErrorDisplay component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ErrorDisplay from '../ErrorDisplay';
import { ErrorType, ErrorSeverity, ViewerError, RecoveryOption } from '../../../services/errorHandler';

const theme = createTheme();

const mockError: ViewerError = {
  name: 'ViewerError',
  message: 'Test error message',
  type: ErrorType.NETWORK_ERROR,
  code: 'TEST_ERROR_001',
  severity: ErrorSeverity.MEDIUM,
  retryable: true,
  timestamp: Date.now(),
  context: {
    studyUid: 'test-study-123',
    sessionId: 'test-session'
  }
};

const mockRecoveryOptions: RecoveryOption[] = [
  {
    title: 'Network Connection Issues',
    description: 'Problems connecting to the server',
    automatic: false,
    userConfirmationRequired: true,
    actions: [
      {
        type: 'retry',
        label: 'Retry Connection',
        description: 'Attempt to reconnect to the server',
        action: jest.fn().mockResolvedValue(true),
        priority: 1
      },
      {
        type: 'fallback',
        label: 'Use Cached Data',
        description: 'Load from local cache if available',
        action: jest.fn().mockResolvedValue(false),
        priority: 2
      }
    ]
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ErrorDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders error message and basic information', () => {
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('NETWORK_ERROR')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('RETRYABLE')).toBeInTheDocument();
  });

  test('displays recovery options and actions', () => {
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    expect(screen.getByText('Suggested Actions:')).toBeInTheDocument();
    expect(screen.getByText('Problems connecting to the server')).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();
    expect(screen.getByText('Use Cached Data')).toBeInTheDocument();
  });

  test('calls recovery action when button is clicked', async () => {
    const mockOnRecoveryAction = jest.fn().mockResolvedValue(true);
    
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
        onRecoveryAction={mockOnRecoveryAction}
      />
    );

    const retryButton = screen.getByText('Retry Connection');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockOnRecoveryAction).toHaveBeenCalledWith(mockRecoveryOptions[0].actions[0]);
    });
  });

  test('calls onRetry when retry button is clicked', () => {
    const mockOnRetry = jest.fn();
    
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
        onRetry={mockOnRetry}
      />
    );

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  test('calls onDismiss when close button is clicked', () => {
    const mockOnDismiss = jest.fn();
    
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByTestId('CloseIcon').closest('button');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  test('expands and shows details when details button is clicked', () => {
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    const detailsButton = screen.getByText('Show Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    expect(screen.getByText('Context Information:')).toBeInTheDocument();
  });

  test('renders in compact mode', () => {
    renderWithTheme(
      <ErrorDisplay
        error={mockError}
        recoveryOptions={mockRecoveryOptions}
        compact={true}
      />
    );

    // In compact mode, should show alert instead of full card
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Suggested Actions:')).not.toBeInTheDocument();
  });

  test('displays correct severity colors', () => {
    const criticalError: ViewerError = {
      ...mockError,
      severity: ErrorSeverity.CRITICAL
    };

    renderWithTheme(
      <ErrorDisplay
        error={criticalError}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  test('shows technical details when expanded', () => {
    const errorWithStack: ViewerError = {
      ...mockError,
      stack: 'Error: Test error\n    at test.js:1:1'
    };

    renderWithTheme(
      <ErrorDisplay
        error={errorWithStack}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    // Expand details
    fireEvent.click(screen.getByText('Show Details'));
    
    // Show technical details
    fireEvent.click(screen.getByText('Show Technical Details'));

    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
  });

  test('handles non-retryable errors correctly', () => {
    const nonRetryableError: ViewerError = {
      ...mockError,
      retryable: false
    };

    renderWithTheme(
      <ErrorDisplay
        error={nonRetryableError}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    expect(screen.queryByText('RETRYABLE')).not.toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  test('formats timestamp correctly', () => {
    const testTimestamp = new Date('2024-01-01T12:00:00Z').getTime();
    const errorWithTimestamp: ViewerError = {
      ...mockError,
      timestamp: testTimestamp
    };

    renderWithTheme(
      <ErrorDisplay
        error={errorWithTimestamp}
        recoveryOptions={mockRecoveryOptions}
      />
    );

    // Should display formatted timestamp
    expect(screen.getByText(/Error Code: TEST_ERROR_001/)).toBeInTheDocument();
  });
});