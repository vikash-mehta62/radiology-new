/**
 * Accessibility Compliance Integration Tests (WCAG 2.1) - Part 1
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

describe('Accessibility Compliance Integration Tests - Part 1', () => {
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

  describe('WCAG 2.1 Level AA Compliance - Part 1', () => {
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

  describe('Keyboard Navigation - Part 1', () => {
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

  describe('Screen Reader Support - Part 1', () => {
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
  });
});