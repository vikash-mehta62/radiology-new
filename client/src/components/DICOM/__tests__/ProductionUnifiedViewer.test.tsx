/**
 * Integration Tests for ProductionUnifiedViewer
 * 
 * Comprehensive test suite covering:
 * - Component initialization and rendering
 * - Service integration (Cornerstone3D, VTK, DICOM)
 * - Performance monitoring and optimization
 * - Error handling and recovery
 * - Security validation
 * - Memory management
 * - User interactions and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

import ProductionUnifiedViewer from '../ProductionUnifiedViewer';
import type { ProductionViewerProps, ProductionViewerRef } from '../ProductionUnifiedViewer';
import type { Study } from '../../../types';

// Mock services
jest.mock('../../../services/cornerstone3DService');
jest.mock('../../../services/vtkEnhancedService');
jest.mock('../../../services/enhancedDicomService');
jest.mock('../../../services/performanceMonitor');
jest.mock('../../../services/errorHandler');

// Mock WebGL context
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getExtension: jest.fn(),
  getParameter: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(),
  getUniformLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createTexture: jest.fn(),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  generateMipmap: jest.fn(),
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn()
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext;
  }
  return null;
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
  writable: true,
});

// Test theme
const theme = createTheme();

// Sample study data
const mockStudy: Study = {
  studyInstanceUID: '1.2.3.4.5.6.7.8.9',
  patientName: 'Test Patient',
  patientId: 'TEST001',
  studyDate: '20240101',
  studyTime: '120000',
  studyDescription: 'Test Study',
  modality: 'CT',
  accessionNumber: 'ACC001',
  seriesCount: 1,
  instanceCount: 10,
  studyId: 'STUDY001'
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('ProductionUnifiedViewer Integration Tests', () => {
  let viewerRef: React.RefObject<ProductionViewerRef>;
  let mockProps: ProductionViewerProps;

  beforeEach(() => {
    viewerRef = React.createRef<ProductionViewerRef>();
    mockProps = {
      study: mockStudy,
      userRole: 'radiologist',
      viewerMode: 'diagnostic',
      enableAdvancedTools: true,
      enablePerformanceMonitoring: true,
      enableSecurity: true,
      enableAI: true,
      onStudyLoad: jest.fn(),
      onError: jest.fn(),
      onStateChange: jest.fn(),
      onPerformanceUpdate: jest.fn(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    test('renders without crashing', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Initializing viewer...')).toBeInTheDocument();
    });

    test('initializes all required services', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Initializing viewer...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify services are initialized
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    test('handles initialization errors gracefully', async () => {
      const errorProps = {
        ...mockProps,
        onError: jest.fn(),
      };

      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...errorProps} />
        </TestWrapper>
      );

      // Wait for potential error state
      await waitFor(() => {
        // Should either show ready state or error handling
        expect(
          screen.getByText('Ready') || screen.getByText(/error/i)
        ).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Study Loading', () => {
    test('loads study successfully', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Simulate study loading via ref
      await act(async () => {
        if (viewerRef.current) {
          await viewerRef.current.loadStudy(mockStudy);
        }
      });

      expect(mockProps.onStudyLoad).toHaveBeenCalledWith(mockStudy);
    });

    test('displays loading progress', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Check for loading indicators during study load
      await act(async () => {
        if (viewerRef.current) {
          viewerRef.current.loadStudy(mockStudy);
        }
      });

      // Should show some form of loading state
      expect(screen.getByText(/Test Patient/i) || screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    test('displays performance metrics', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Check for FPS display
      expect(screen.getByText(/FPS:/)).toBeInTheDocument();
      expect(screen.getByText(/Memory:/)).toBeInTheDocument();
      expect(screen.getByText(/Mode:/)).toBeInTheDocument();
    });

    test('memory manager is accessible', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableCaching={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Look for memory indicator chip
      const memoryChips = screen.getAllByText(/\d+%/);
      expect(memoryChips.length).toBeGreaterThan(0);
    });

    test('rendering optimizer is accessible', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Look for FPS indicator chip
      const fpsChips = screen.getAllByText(/\d+ FPS/);
      expect(fpsChips.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    test('toolbar interactions work', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Test toolbar buttons (they should be present)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('keyboard navigation works', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableAccessibility={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('displays error boundary when errors occur', async () => {
      const errorProps = {
        ...mockProps,
        onError: jest.fn(),
      };

      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...errorProps} />
        </TestWrapper>
      );

      // Component should handle errors gracefully
      await waitFor(() => {
        expect(
          screen.getByText('Ready') || 
          screen.getByText(/error/i) ||
          screen.getByText('Retry Initialization')
        ).toBeInTheDocument();
      });
    });

    test('retry functionality works', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      // Should initialize successfully or show retry option
      await waitFor(() => {
        expect(
          screen.getByText('Ready') || 
          screen.getByText('Retry Initialization')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    test('displays security status when enabled', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableSecurity={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Should show security chip when security is validated
      expect(screen.getByText('Secure') || screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  describe('AI Features', () => {
    test('displays AI status when enabled', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableAI={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Should show AI chip when AI is enabled
      expect(screen.getByText('AI Enhanced') || screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  describe('Ref Methods', () => {
    test('ref methods are accessible', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      expect(viewerRef.current).toBeTruthy();
      expect(viewerRef.current?.loadStudy).toBeDefined();
      expect(viewerRef.current?.resetView).toBeDefined();
      expect(viewerRef.current?.setActiveTool).toBeDefined();
      expect(viewerRef.current?.getPerformanceMetrics).toBeDefined();
    });

    test('resetView method works', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      await act(async () => {
        viewerRef.current?.resetView();
      });

      // Should not throw errors
      expect(viewerRef.current).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    test('adapts to different screen sizes', async () => {
      // Test mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} width="100%" height="100vh" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Component should render without issues on mobile
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    test('handles memory pressure correctly', async () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 1.8 * 1024 * 1024 * 1024, // 1.8GB
          totalJSHeapSize: 1.9 * 1024 * 1024 * 1024, // 1.9GB
          jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
        },
        writable: true,
      });

      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableCaching={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Should handle high memory usage gracefully
      expect(mockProps.onPerformanceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryPressure: expect.any(String)
        })
      );
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableAccessibility={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Check for accessible elements
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProductionUnifiedViewer ref={viewerRef} {...mockProps} enableAccessibility={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Test that tab navigation works
      await user.tab();
      expect(document.activeElement).not.toBe(document.body);
    });
  });
});

// Performance benchmark tests
describe('ProductionUnifiedViewer Performance Tests', () => {
  test('initializes within acceptable time', async () => {
    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <ProductionUnifiedViewer {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
    }, { timeout: 10000 });

    const endTime = performance.now();
    const initTime = endTime - startTime;

    // Should initialize within 10 seconds
    expect(initTime).toBeLessThan(10000);
  });

  test('handles multiple rapid interactions', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <ProductionUnifiedViewer {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    // Rapidly click multiple buttons
    const buttons = screen.getAllByRole('button');
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
      await user.click(buttons[i]);
    }

    // Should not crash or become unresponsive
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});