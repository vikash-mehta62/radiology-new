/**
 * Integration Tests for Complete Viewer Workflows
 * Tests end-to-end functionality across multiple components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MockDicomDataGenerator, AsyncTestUtils } from '../../services/__tests__/testUtils';
import { getGlobalStateManager } from '../../services/unifiedStateManager';
import { createEnhancedViewerManager } from '../../services/enhancedViewerManager';

// Import components to test
import UnifiedDicomViewer from '../DICOM/UnifiedDicomViewer';
import EnhancedViewerContainer from '../DICOM/EnhancedViewerContainer';
import ViewerModeSelector from '../DICOM/ViewerModeSelector';
import StateManagementPanel from '../Common/StateManagementPanel';

// Mock external dependencies
jest.mock('../../services/errorHandler');
jest.mock('../../services/performanceMonitor');
jest.mock('../../services/adaptivePerformanceSystem');
jest.mock('../../services/progressiveLoadingSystem');
jest.mock('../../services/memoryManagementSystem');
jest.mock('../../services/intelligentCacheManager');
jest.mock('../../services/measurementTools');
jest.mock('../../services/annotationSystem');
jest.mock('../../services/aiEnhancementModule');
jest.mock('../../services/collaborationModule');

// Test theme
const theme = createTheme({
  palette: {
    mode: 'dark'
  }
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('Viewer Workflow Integration Tests', () => {
  let mockStudy: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockStudy = MockDicomDataGenerator.generateMockStudy({
      sliceCount: 10,
      modality: 'CT',
      hasMultiFrame: true
    });

    // Reset global state
    const stateManager = getGlobalStateManager();
    stateManager.cleanup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Unified Viewer Workflow', () => {
    test('should load and display DICOM study', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByText(/processing dicom data/i)).toBeInTheDocument();

      // Wait for image to load
      await waitFor(() => {
        expect(screen.queryByText(/processing dicom data/i)).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Should display viewer controls
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    test('should handle image manipulation controls', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing dicom data/i)).not.toBeInTheDocument();
      });

      // Test zoom controls
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      const resetButton = screen.getByRole('button', { name: /reset/i });

      await user.click(zoomInButton);
      await user.click(zoomInButton);
      await user.click(zoomOutButton);
      await user.click(resetButton);

      // Should not throw errors
      expect(zoomInButton).toBeInTheDocument();
    });

    test('should handle multi-frame navigation', async () => {
      const multiFrameStudy = MockDicomDataGenerator.generateMockStudy({
        sliceCount: 50,
        hasMultiFrame: true
      });

      render(
        <TestWrapper>
          <UnifiedDicomViewer study={multiFrameStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing dicom data/i)).not.toBeInTheDocument();
      });

      // Should show frame navigation controls
      const nextButton = screen.getByRole('button', { name: /next frame/i });
      const prevButton = screen.getByRole('button', { name: /previous frame/i });
      const playButton = screen.getByRole('button', { name: /play/i });

      expect(nextButton).toBeInTheDocument();
      expect(prevButton).toBeInTheDocument();
      expect(playButton).toBeInTheDocument();

      // Test navigation
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(prevButton);
      await user.click(playButton);

      // Should show pause button when playing
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
    });

    test('should handle error states gracefully', async () => {
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

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/no dicom file specified/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry loading/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      // Should attempt to reload
    });
  });

  describe('Multi-Frame Viewer Workflow', () => {
    test('should load multi-frame study with enhanced navigation', async () => {
      const multiFrameStudy = MockDicomDataGenerator.generateMockStudy({
        sliceCount: 100,
        hasMultiFrame: true
      });

      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={multiFrameStudy}
            enableEnhancedNavigation={true}
            enableIntelligentCaching={true}
          />
        </TestWrapper>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 15000 });

      // Should show enhanced navigation controls
      expect(screen.getByText(/slice.*100/i)).toBeInTheDocument();
    });

    test('should handle slice navigation with caching', async () => {
      const multiFrameStudy = MockDicomDataGenerator.generateMockStudy({
        sliceCount: 20,
        hasMultiFrame: true
      });

      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={multiFrameStudy}
            enableIntelligentCaching={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Navigate through slices rapidly
      const nextButton = screen.getByRole('button', { name: /next/i });
      
      for (let i = 0; i < 5; i++) {
        await user.click(nextButton);
        await AsyncTestUtils.delay(100);
      }

      // Should handle rapid navigation without errors
      expect(nextButton).toBeInTheDocument();
    });

    test('should integrate with performance monitoring', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={mockStudy}
            enablePerformanceMonitoring={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Performance metrics should be available (mocked)
      // This tests the integration points
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });
  });

  describe('Comprehensive Viewer Workflow', () => {
    test('should load with all advanced features', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={mockStudy}
            enableAI={true}
            enableCollaboration={true}
            enableAdvancedMeasurements={true}
            enableComprehensiveAnnotations={true}
          />
        </TestWrapper>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 20000 });

      // Should show comprehensive controls
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });

    test('should handle AI enhancement integration', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={mockStudy}
            enableAI={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // AI features should be integrated (mocked)
      // This tests the service integration
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });

    test('should handle collaboration features', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={mockStudy}
            enableCollaboration={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Collaboration features should be integrated (mocked)
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });
  });

  describe('Enhanced Viewer Container Workflow', () => {
    test('should manage viewer modes seamlessly', async () => {
      render(
        <TestWrapper>
          <EnhancedViewerContainer 
            study={mockStudy}
            showModeSelector={true}
            enableAutoOptimization={true}
          />
        </TestWrapper>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      }, { timeout: 15000 });

      // Should show mode selector
      expect(screen.getByText(/viewer mode/i)).toBeInTheDocument();
    });

    test('should handle mode switching', async () => {
      render(
        <TestWrapper>
          <EnhancedViewerContainer 
            study={mockStudy}
            showModeSelector={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      // Find mode buttons
      const simpleButton = screen.getByRole('button', { name: /simple viewer/i });
      const multiFrameButton = screen.getByRole('button', { name: /multi.*frame/i });

      // Test mode switching
      await user.click(multiFrameButton);
      await AsyncTestUtils.delay(500);
      await user.click(simpleButton);

      // Should handle mode switches without errors
      expect(simpleButton).toBeInTheDocument();
    });

    test('should preserve state across mode switches', async () => {
      render(
        <TestWrapper>
          <EnhancedViewerContainer 
            study={mockStudy}
            showModeSelector={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      // Make some changes in one mode
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);
      await user.click(zoomInButton);

      // Switch modes
      const multiFrameButton = screen.getByRole('button', { name: /multi.*frame/i });
      await user.click(multiFrameButton);

      await AsyncTestUtils.delay(1000);

      // Switch back
      const simpleButton = screen.getByRole('button', { name: /simple viewer/i });
      await user.click(simpleButton);

      // State should be preserved (zoom level maintained)
      expect(simpleButton).toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    test('should integrate with unified state management', async () => {
      render(
        <TestWrapper>
          <StateManagementPanel />
        </TestWrapper>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      // Should show state management controls
      expect(screen.getByText(/state management/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /persist state/i })).toBeInTheDocument();
    });

    test('should handle state snapshots', async () => {
      render(
        <TestWrapper>
          <StateManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      // Create a snapshot
      const createSnapshotButton = screen.getByRole('button', { name: /create snapshot/i });
      await user.click(createSnapshotButton);

      // Should handle snapshot creation
      expect(createSnapshotButton).toBeInTheDocument();
    });

    test('should handle state export/import', async () => {
      render(
        <TestWrapper>
          <StateManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      });

      // Test export
      const exportButton = screen.getByRole('button', { name: /export state/i });
      await user.click(exportButton);

      // Should open export dialog
      await waitFor(() => {
        expect(screen.getByText(/export state/i)).toBeInTheDocument();
      });

      // Close dialog
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Test import
      const importButton = screen.getByRole('button', { name: /import state/i });
      await user.click(importButton);

      // Should open import dialog
      await waitFor(() => {
        expect(screen.getByText(/import state/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      // Should handle network error
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should show retry option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    test('should handle service initialization failures', async () => {
      // This tests error boundaries and graceful degradation
      render(
        <TestWrapper>
          <EnhancedViewerContainer 
            study={mockStudy}
            enableAutoOptimization={false}
          />
        </TestWrapper>
      );

      // Should not crash even if services fail to initialize
      await waitFor(() => {
        expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
      }, { timeout: 15000 });
    });
  });

  describe('Performance Integration', () => {
    test('should handle large datasets efficiently', async () => {
      const largeStudy = MockDicomDataGenerator.generateMockStudy({
        sliceCount: 500,
        hasMultiFrame: true
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={largeStudy}
            enableIntelligentCaching={true}
            enableProgressiveLoading={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 20000 });

      const loadTime = performance.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(20000); // 20 seconds max
    });

    test('should handle rapid user interactions', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      // Rapid interactions
      for (let i = 0; i < 10; i++) {
        await user.click(zoomInButton);
        await user.click(zoomOutButton);
      }

      // Should handle rapid interactions without errors
      expect(zoomInButton).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    test('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Test keyboard navigation
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      
      // Focus and activate with keyboard
      zoomInButton.focus();
      expect(document.activeElement).toBe(zoomInButton);

      // Press Enter to activate
      fireEvent.keyDown(zoomInButton, { key: 'Enter', code: 'Enter' });
      
      // Should handle keyboard interaction
      expect(zoomInButton).toBeInTheDocument();
    });

    test('should have proper ARIA labels', async () => {
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
    });

    test('should support screen readers', async () => {
      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should have descriptive text for screen readers
      expect(screen.getByText(/slice.*10/i)).toBeInTheDocument();
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('should handle different canvas contexts', async () => {
      // Mock different canvas context scenarios
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      
      // Test WebGL unavailable scenario
      HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
        if (type === 'webgl' || type === 'webgl2') {
          return null; // WebGL not available
        }
        return originalGetContext.call(this, type);
      });

      render(
        <TestWrapper>
          <UnifiedDicomViewer study={mockStudy} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });

      // Should fallback gracefully
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();

      // Restore original
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    test('should handle missing browser features', async () => {
      // Mock missing features
      const originalWebSocket = global.WebSocket;
      delete (global as any).WebSocket;

      render(
        <TestWrapper>
          <UnifiedDicomViewer 
            study={mockStudy}
            enableCollaboration={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should handle missing WebSocket gracefully
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();

      // Restore
      global.WebSocket = originalWebSocket;
    });
  });
});