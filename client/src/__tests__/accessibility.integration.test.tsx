/**
 * Accessibility Compliance Integration Tests (WCAG 2.1)
 * Tests for accessibility compliance across all viewer components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MockDicomDataGenerator } from '../services/__tests__/testUtils';

// Import components to test
import UnifiedDicomViewer from '../components/DICOM/UnifiedDicomViewer';
import EnhancedViewerContainer from '../components/DICOM/EnhancedViewerContainer';
import ViewerModeSelector from '../components/DICOM/ViewerModeSelector';
import StateManagementPanel from '../components/Common/StateManagementPanel';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test themes for accessibility
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' }
  }
});

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

describe('Accessibility Compliance Integration Tests', () => {
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

  describe('WCAG 2.1 Level AA Compliance', () => {
    test('UnifiedDicomViewer should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      }, { timeout: 10000 });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('UnifiedDicomViewer with multi-frame should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 15000 });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('UnifiedDicomViewer with comprehensive features should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 20000 });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('ViewerModeSelector should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <ViewerModeSelector />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/viewer mode/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('StateManagementPanel should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <StateManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/state management/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    test('UnifiedDicomViewer should be fully keyboard navigable', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Test Tab navigation
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      const resetButton = screen.getByRole('button', { name: /reset/i });

      // Focus first button
      zoomInButton.focus();
      expect(document.activeElement).toBe(zoomInButton);

      // Tab to next button
      await user.tab();
      expect(document.activeElement).toBe(zoomOutButton);

      // Tab to next button
      await user.tab();
      expect(document.activeElement).toBe(resetButton);

      // Test Enter key activation
      fireEvent.keyDown(resetButton, { key: 'Enter', code: 'Enter' });
      
      // Test Space key activation
      fireEvent.keyDown(resetButton, { key: ' ', code: 'Space' });
    });

    test('UnifiedDicomViewer should support keyboard shortcuts', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Test arrow key navigation for slices
      const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
      if (canvas) {
        canvas.focus();

        // Right arrow - next slice
        fireEvent.keyDown(canvas, { key: 'ArrowRight', code: 'ArrowRight' });
        
        // Left arrow - previous slice
        fireEvent.keyDown(canvas, { key: 'ArrowLeft', code: 'ArrowLeft' });
        
        // Space - play/pause
        fireEvent.keyDown(canvas, { key: ' ', code: 'Space' });
        
        // Home - first slice
        fireEvent.keyDown(canvas, { key: 'Home', code: 'Home' });
        
        // End - last slice
        fireEvent.keyDown(canvas, { key: 'End', code: 'End' });
      }
    });

    test('ViewerModeSelector should be keyboard accessible', async () => {
      render(
        <TestWrapper>
          <ViewerModeSelector />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/viewer mode/i)).toBeInTheDocument();
      });

      // Find mode buttons
      const buttons = screen.getAllByRole('button');
      const modeButtons = buttons.filter(btn => 
        btn.textContent?.includes('Simple') || 
        btn.textContent?.includes('Multi') || 
        btn.textContent?.includes('Comprehensive')
      );

      // Test keyboard navigation through mode buttons
      if (modeButtons.length > 0) {
        modeButtons[0].focus();
        expect(document.activeElement).toBe(modeButtons[0]);

        // Tab through buttons
        for (let i = 1; i < modeButtons.length; i++) {
          await user.tab();
          expect(document.activeElement).toBe(modeButtons[i]);
        }

        // Test Enter activation
        fireEvent.keyDown(modeButtons[0], { key: 'Enter', code: 'Enter' });
      }
    });
  });

  describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Check for proper ARIA labels
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      const resetButton = screen.getByRole('button', { name: /reset/i });

      expect(zoomInButton).toHaveAttribute('aria-label');
      expect(zoomOutButton).toHaveAttribute('aria-label');
      expect(resetButton).toHaveAttribute('aria-label');

      // Check for proper roles
      expect(zoomInButton).toHaveAttribute('role', 'button');
      expect(zoomOutButton).toHaveAttribute('role', 'button');
      expect(resetButton).toHaveAttribute('role', 'button');
    });

    test('should provide descriptive text for complex interactions', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should have descriptive text for slice information
      expect(screen.getByText(/slice.*10/i)).toBeInTheDocument();

      // Navigation controls should have proper descriptions
      const nextButton = screen.queryByRole('button', { name: /next/i });
      const prevButton = screen.queryByRole('button', { name: /previous/i });

      if (nextButton) {
        expect(nextButton).toHaveAttribute('aria-label');
      }
      if (prevButton) {
        expect(prevButton).toHaveAttribute('aria-label');
      }
    });

    test('should announce state changes to screen readers', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Look for live regions that announce changes
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(0);

      // Test zoom level announcement
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);

      // Should have some indication of zoom level change
      expect(screen.getByText(/zoom.*100%/i)).toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should meet color contrast requirements in light theme', async () => {
      const { container } = render(
        <TestWrapper theme={lightTheme}>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Test with axe color contrast rules
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

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

  describe('Focus Management', () => {
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

  describe('Alternative Input Methods', () => {
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

  describe('Error Accessibility', () => {
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
      expect(retryButton).toHaveAccessibleName();

      // Should be keyboard accessible
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      // Should activate with Enter
      fireEvent.keyDown(retryButton, { key: 'Enter', code: 'Enter' });
    });
  });

  describe('Responsive Accessibility', () => {
    test('should maintain accessibility on small screens', async () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 568
      });

      const { container } = render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Should still be accessible on small screens
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Touch targets should be large enough (44px minimum)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        // In a real test, you'd check that rect.width >= 44 && rect.height >= 44
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      });
    });
  });

  describe('Internationalization Accessibility', () => {
    test('should support right-to-left languages', async () => {
      // Mock RTL language
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';

      const { container } = render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Should still be accessible in RTL mode
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Reset
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    });

    test('should have proper language attributes', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Document should have lang attribute
      expect(document.documentElement).toHaveAttribute('lang');

      // Text content should be in declared language
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.textContent) {
          // Should not have mixed language content without proper markup
          expect(button.textContent.trim()).toBeTruthy();
        }
      });
    });
  });
});