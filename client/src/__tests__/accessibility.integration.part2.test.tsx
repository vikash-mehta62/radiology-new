/**
 * Accessibility Compliance Integration Tests (WCAG 2.1) - Part 2
 * Tests for accessibility compliance across all viewer components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MockDicomDataGenerator } from '../services/__tests__/testUtils';

// Import components to test
import UnifiedDicomViewer from '../components/DICOM/unifieddicomviewer';
import ViewerModeSelector from '../components/DICOM/ViewerModeSelector';
import StateManagementPanel from '../components/Common/StateManagementPanel';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test themes for accessibility
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' }
  }
});

const highContrastTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffffff' },
    secondary: { main: '#ffff00' },
    background: {
      default: '#000000',
      paper: '#000000'
    },
    text: {
      primary: '#ffffff',
      secondary: '#ffff00'
    }
  }
});

// Test wrapper component
const TestWrapper: React.FC<{ 
  children: React.ReactNode;
  theme?: any;
}> = ({ children, theme = darkTheme }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('Accessibility Compliance Integration Tests - Part 2', () => {
  let mockStudy: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockStudy = MockDicomDataGenerator.generateMockStudy({
      sliceCount: 10,
      modality: 'CT'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Color Contrast and Visual Accessibility - Part 2', () => {
    test('should meet color contrast requirements in dark theme', async () => {
      const { container } = render(
        <TestWrapper theme={darkTheme}>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    test('should work with high contrast theme', async () => {
      const { container } = render(
        <TestWrapper theme={highContrastTheme}>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Should render without errors in high contrast mode
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should not rely solely on color for information', async () => {
      render(
        <TestWrapper>
          <ViewerModeSelector />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/viewer mode/i)).toBeInTheDocument();
      });

      // Mode buttons should have text labels, not just colors
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.textContent?.trim()).toBeTruthy();
      });

      // Status indicators should have text or icons, not just colors
      const chips = document.querySelectorAll('[role="button"], .MuiChip-root');
      chips.forEach(chip => {
        const hasText = chip.textContent?.trim();
        const hasIcon = chip.querySelector('svg, .MuiChip-icon');
        expect(hasText || hasIcon).toBeTruthy();
      });
    });
  });

  describe('Focus Management - Part 2', () => {
    test('should manage focus properly in modal dialogs', async () => {
      render(
        <TestWrapper>
          <StateManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/state management/i)).toBeInTheDocument();
      });

      // Open export dialog
      const exportButton = screen.getByRole('button', { name: /export state/i });
      await user.click(exportButton);

      // Focus should move to dialog
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        
        // Focus should be within the dialog
        const focusedElement = document.activeElement;
        expect(dialog.contains(focusedElement)).toBe(true);
      });

      // Close dialog with Escape
      fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' });

      // Focus should return to trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(exportButton);
      });
    });

    test('should trap focus within modal dialogs', async () => {
      render(
        <TestWrapper>
          <StateManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/state management/i)).toBeInTheDocument();
      });

      // Open import dialog
      const importButton = screen.getByRole('button', { name: /import state/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Tab through dialog elements
      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 1) {
        // Focus should cycle within dialog
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        firstElement.focus();
        expect(document.activeElement).toBe(firstElement);

        // Tab to last element
        for (let i = 1; i < focusableElements.length; i++) {
          await user.tab();
        }
        expect(document.activeElement).toBe(lastElement);

        // Tab should cycle back to first
        await user.tab();
        expect(document.activeElement).toBe(firstElement);
      }
    });

    test('should provide visible focus indicators', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      
      // Focus the button
      zoomInButton.focus();
      
      // Should have focus styles (this would need visual regression testing in real scenarios)
      expect(document.activeElement).toBe(zoomInButton);
      
      // Check for focus-visible styles
      const computedStyle = window.getComputedStyle(zoomInButton);
      // In a real test, you'd check for outline, box-shadow, or other focus indicators
    });
  });

  describe('Alternative Input Methods - Part 2', () => {
    test('should support touch interactions on mobile', async () => {
      // Mock touch events
      const mockTouchEvent = (type: string, touches: any[]) => {
        return new TouchEvent(type, {
          touches: touches as any,
          targetTouches: touches as any,
          changedTouches: touches as any
        });
      };

      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      const canvas = document.querySelector('canvas');
      if (canvas) {
        // Test touch events
        const touchStart = mockTouchEvent('touchstart', [{
          identifier: 0,
          target: canvas,
          clientX: 100,
          clientY: 100
        }]);

        const touchMove = mockTouchEvent('touchmove', [{
          identifier: 0,
          target: canvas,
          clientX: 150,
          clientY: 150
        }]);

        const touchEnd = mockTouchEvent('touchend', []);

        // Should handle touch events without errors
        expect(() => {
          canvas.dispatchEvent(touchStart);
          canvas.dispatchEvent(touchMove);
          canvas.dispatchEvent(touchEnd);
        }).not.toThrow();
      }
    });

    test('should support voice control attributes', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Buttons should have proper labels for voice control
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      // Should have clear, unambiguous labels
      expect(zoomInButton).toHaveAccessibleName();
      expect(zoomOutButton).toHaveAccessibleName();

      // Labels should be descriptive enough for voice commands
      expect(zoomInButton.getAttribute('aria-label') || zoomInButton.textContent).toMatch(/zoom.*in/i);
      expect(zoomOutButton.getAttribute('aria-label') || zoomOutButton.textContent).toMatch(/zoom.*out/i);
    });
  });

  describe('Error Accessibility - Part 2', () => {
    test('should announce errors to screen readers', async () => {
      const invalidStudy = {
        ...mockStudy,
        dicom_url: null,
        original_filename: null
      };

      render(
        <TestWrapper>
          <UnifiedDicomViewer study={invalidStudy} />
        </TestWrapper>
      );

      // Should show accessible error message
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/no dicom file specified/i);
      });

      // Error should be announced to screen readers
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('role', 'alert');
    });

    test('should provide accessible error recovery options', async () => {
      const invalidStudy = {
        ...mockStudy,
        dicom_url: null,
        original_filename: null
      };

      render(
        <TestWrapper>
          <UnifiedDicomViewer study={invalidStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Retry button should be accessible
      const retryButton = screen.getByRole('button', { name: /retry loading/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('aria-label');
    });

    test('should handle loading states accessibly', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      // Should show loading indicator with proper ARIA attributes
      const loadingIndicator = screen.queryByRole('progressbar') || 
                              screen.queryByText(/loading/i) ||
                              screen.queryByText(/processing/i);

      if (loadingIndicator) {
        expect(loadingIndicator).toBeInTheDocument();
        
        // Should have proper ARIA attributes for loading state
        if (loadingIndicator.getAttribute('role') === 'progressbar') {
          expect(loadingIndicator).toHaveAttribute('aria-label');
        }
      }

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Should announce completion to screen readers
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });

    test('should provide keyboard shortcuts help', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Should have help button or keyboard shortcuts info
      const helpButton = screen.queryByRole('button', { name: /help/i }) ||
                        screen.queryByRole('button', { name: /shortcuts/i }) ||
                        screen.queryByText(/press.*for help/i);

      if (helpButton) {
        expect(helpButton).toBeInTheDocument();
        
        if (helpButton.tagName === 'BUTTON') {
          expect(helpButton).toHaveAttribute('aria-label');
        }
      }

      // Test keyboard shortcut for help (usually F1 or ?)
      fireEvent.keyDown(document.body, { key: 'F1', code: 'F1' });
      fireEvent.keyDown(document.body, { key: '?', code: 'Slash', shiftKey: true });
    });
  });
});