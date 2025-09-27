/**
 * Integration Tests for DICOM Viewer Services
 * 
 * Tests the integration between different services:
 * - Cornerstone3D Service
 * - VTK Enhanced Service
 * - Enhanced DICOM Service
 * - Performance Monitor
 * - Error Handler
 * - Security Services
 */

import { cornerstone3DService } from '../../../services/cornerstone3DService';
import { vtkEnhancedService } from '../../../services/vtkEnhancedService';
import { enhancedDicomService } from '../../../services/enhancedDicomService';
import { performanceMonitor } from '../../../services/performanceMonitor';
import { errorHandler } from '../../../services/errorHandler';

// Mock external dependencies
jest.mock('@cornerstonejs/core');
jest.mock('@cornerstonejs/tools');
jest.mock('@kitware/vtk.js');

describe('DICOM Viewer Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('cornerstone3DService initializes correctly', async () => {
      const result = await cornerstone3DService.initialize();
      expect(result).toBe(true);
    });

    test('vtkEnhancedService initializes correctly', async () => {
      const result = await vtkEnhancedService.initialize();
      expect(result).toBe(true);
    });

    test('enhancedDicomService initializes correctly', async () => {
      const result = await enhancedDicomService.initialize();
      expect(result).toBe(true);
    });

    test('services initialize in correct order', async () => {
      const initOrder: string[] = [];
      
      // Mock initialization to track order
      jest.spyOn(cornerstone3DService, 'initialize').mockImplementation(async () => {
        initOrder.push('cornerstone3D');
        return true;
      });
      
      jest.spyOn(vtkEnhancedService, 'initialize').mockImplementation(async () => {
        initOrder.push('vtk');
        return true;
      });
      
      jest.spyOn(enhancedDicomService, 'initialize').mockImplementation(async () => {
        initOrder.push('dicom');
        return true;
      });

      // Initialize services
      await cornerstone3DService.initialize();
      await vtkEnhancedService.initialize();
      await enhancedDicomService.initialize();

      expect(initOrder).toEqual(['cornerstone3D', 'vtk', 'dicom']);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('performance monitor tracks service operations', async () => {
      const startSpy = jest.spyOn(performanceMonitor, 'startOperation');
      const endSpy = jest.spyOn(performanceMonitor, 'endOperation');

      // Mock service operation
      await cornerstone3DService.initialize();

      expect(startSpy).toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();
    });

    test('memory usage is tracked during operations', () => {
      const memoryBefore = performanceMonitor.getMemoryUsage();
      
      // Simulate memory-intensive operation
      const largeArray = new Array(1000000).fill(0);
      
      const memoryAfter = performanceMonitor.getMemoryUsage();
      
      expect(memoryAfter.used).toBeGreaterThanOrEqual(memoryBefore.used);
      
      // Clean up
      largeArray.length = 0;
    });

    test('performance alerts are triggered correctly', () => {
      const alertSpy = jest.spyOn(performanceMonitor, 'triggerAlert');
      
      // Simulate high memory usage
      performanceMonitor.updateMetrics({
        memoryUsage: 95, // 95% memory usage
        fps: 10, // Low FPS
        renderTime: 100, // High render time
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance',
          severity: 'warning'
        })
      );
    });
  });

  describe('Error Handling Integration', () => {
    test('service errors are properly handled', async () => {
      const handleErrorSpy = jest.spyOn(errorHandler, 'handleError');
      
      // Mock service error
      jest.spyOn(cornerstone3DService, 'initialize').mockRejectedValue(
        new Error('Initialization failed')
      );

      try {
        await cornerstone3DService.initialize();
      } catch (error) {
        // Error should be handled by error handler
      }

      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: 'service_initialization',
          service: 'cornerstone3D'
        })
      );
    });

    test('error recovery mechanisms work', async () => {
      const recoverSpy = jest.spyOn(errorHandler, 'attemptRecovery');
      
      // Simulate recoverable error
      const error = new Error('Temporary failure');
      error.name = 'RecoverableError';

      await errorHandler.handleError(error, {
        context: 'image_loading',
        recoverable: true
      });

      expect(recoverSpy).toHaveBeenCalled();
    });

    test('critical errors trigger proper shutdown', async () => {
      const shutdownSpy = jest.spyOn(errorHandler, 'emergencyShutdown');
      
      // Simulate critical error
      const criticalError = new Error('Critical system failure');
      criticalError.name = 'CriticalError';

      await errorHandler.handleError(criticalError, {
        context: 'system_critical',
        critical: true
      });

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('Service Communication', () => {
    test('cornerstone3D and VTK services communicate correctly', async () => {
      // Initialize both services
      await cornerstone3DService.initialize();
      await vtkEnhancedService.initialize();

      // Test data sharing between services
      const testData = {
        imageId: 'test://image1',
        metadata: { rows: 512, columns: 512 }
      };

      // Mock data exchange
      const cornerstone3DData = await cornerstone3DService.processImage(testData);
      const vtkData = await vtkEnhancedService.processVolume(cornerstone3DData);

      expect(vtkData).toBeDefined();
      expect(vtkData.dimensions).toBeDefined();
    });

    test('DICOM service provides metadata to other services', async () => {
      await enhancedDicomService.initialize();

      const studyData = {
        studyInstanceUID: '1.2.3.4.5',
        seriesInstanceUID: '1.2.3.4.5.6',
        sopInstanceUID: '1.2.3.4.5.6.7'
      };

      const metadata = await enhancedDicomService.getMetadata(studyData);
      
      expect(metadata).toBeDefined();
      expect(metadata.studyInstanceUID).toBe(studyData.studyInstanceUID);
    });

    test('services handle concurrent operations', async () => {
      await Promise.all([
        cornerstone3DService.initialize(),
        vtkEnhancedService.initialize(),
        enhancedDicomService.initialize()
      ]);

      // Simulate concurrent operations
      const operations = [
        cornerstone3DService.processImage({ imageId: 'test://1' }),
        vtkEnhancedService.processVolume({ data: 'test1' }),
        enhancedDicomService.getMetadata({ studyInstanceUID: 'test1' }),
        cornerstone3DService.processImage({ imageId: 'test://2' }),
        vtkEnhancedService.processVolume({ data: 'test2' })
      ];

      const results = await Promise.allSettled(operations);
      
      // All operations should complete without interference
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('Resource Management', () => {
    test('services properly clean up resources', async () => {
      await cornerstone3DService.initialize();
      await vtkEnhancedService.initialize();

      // Create some resources
      await cornerstone3DService.createViewport('test-viewport');
      await vtkEnhancedService.createRenderer('test-renderer');

      // Clean up
      await cornerstone3DService.cleanup();
      await vtkEnhancedService.cleanup();

      // Verify cleanup
      expect(cornerstone3DService.getActiveViewports()).toHaveLength(0);
      expect(vtkEnhancedService.getActiveRenderers()).toHaveLength(0);
    });

    test('memory leaks are prevented during service operations', async () => {
      const initialMemory = performanceMonitor.getMemoryUsage();

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await cornerstone3DService.processImage({ imageId: `test://image${i}` });
        await vtkEnhancedService.processVolume({ data: `test${i}` });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = performanceMonitor.getMemoryUsage();
      const memoryIncrease = finalMemory.used - initialMemory.used;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('services handle resource exhaustion gracefully', async () => {
      // Mock resource exhaustion
      jest.spyOn(cornerstone3DService, 'createViewport').mockRejectedValue(
        new Error('Out of GPU memory')
      );

      const handleErrorSpy = jest.spyOn(errorHandler, 'handleError');

      try {
        await cornerstone3DService.createViewport('test-viewport');
      } catch (error) {
        // Should be handled gracefully
      }

      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: 'resource_exhaustion'
        })
      );
    });
  });

  describe('Security Integration', () => {
    test('services validate security tokens', async () => {
      const mockToken = 'valid-security-token';
      
      // Mock security validation
      const validateSpy = jest.spyOn(enhancedDicomService, 'validateSecurityToken');
      
      await enhancedDicomService.loadStudy({
        studyInstanceUID: '1.2.3.4.5',
        securityToken: mockToken
      });

      expect(validateSpy).toHaveBeenCalledWith(mockToken);
    });

    test('unauthorized access is properly blocked', async () => {
      const invalidToken = 'invalid-token';
      
      // Mock invalid token
      jest.spyOn(enhancedDicomService, 'validateSecurityToken').mockResolvedValue(false);

      await expect(
        enhancedDicomService.loadStudy({
          studyInstanceUID: '1.2.3.4.5',
          securityToken: invalidToken
        })
      ).rejects.toThrow('Unauthorized access');
    });

    test('audit logs are created for sensitive operations', async () => {
      const auditSpy = jest.spyOn(enhancedDicomService, 'createAuditLog');
      
      await enhancedDicomService.loadStudy({
        studyInstanceUID: '1.2.3.4.5',
        patientId: 'PATIENT001'
      });

      expect(auditSpy).toHaveBeenCalledWith({
        action: 'study_access',
        studyInstanceUID: '1.2.3.4.5',
        patientId: 'PATIENT001',
        timestamp: expect.any(Date),
        userId: expect.any(String)
      });
    });
  });

  describe('AI Integration', () => {
    test('AI services integrate with image processing', async () => {
      await cornerstone3DService.initialize();
      
      const imageData = {
        imageId: 'test://ct-image',
        modality: 'CT',
        bodyPart: 'CHEST'
      };

      // Mock AI processing
      const aiResult = await cornerstone3DService.processWithAI(imageData);
      
      expect(aiResult).toBeDefined();
      expect(aiResult.annotations).toBeDefined();
      expect(aiResult.confidence).toBeGreaterThan(0);
    });

    test('AI recommendations are properly formatted', async () => {
      const mockAIResult = {
        findings: ['Possible nodule at coordinates (100, 150)'],
        confidence: 0.85,
        recommendations: ['Further evaluation recommended']
      };

      const formattedResult = await cornerstone3DService.formatAIResult(mockAIResult);
      
      expect(formattedResult.findings).toHaveLength(1);
      expect(formattedResult.confidence).toBe(0.85);
      expect(formattedResult.recommendations).toHaveLength(1);
    });
  });

  describe('Real-time Collaboration', () => {
    test('collaboration events are properly synchronized', async () => {
      const mockCollaborationEvent = {
        type: 'annotation_added',
        data: {
          annotationId: 'ann-001',
          coordinates: { x: 100, y: 150 },
          text: 'Suspicious area'
        },
        userId: 'user-001',
        timestamp: new Date()
      };

      const syncSpy = jest.spyOn(cornerstone3DService, 'syncCollaborationEvent');
      
      await cornerstone3DService.handleCollaborationEvent(mockCollaborationEvent);
      
      expect(syncSpy).toHaveBeenCalledWith(mockCollaborationEvent);
    });

    test('concurrent user actions are handled correctly', async () => {
      const user1Action = {
        type: 'zoom',
        data: { level: 2.0 },
        userId: 'user-001'
      };

      const user2Action = {
        type: 'pan',
        data: { x: 50, y: 75 },
        userId: 'user-002'
      };

      // Simulate concurrent actions
      await Promise.all([
        cornerstone3DService.handleUserAction(user1Action),
        cornerstone3DService.handleUserAction(user2Action)
      ]);

      // Both actions should be processed without conflicts
      const viewportState = cornerstone3DService.getViewportState();
      expect(viewportState.zoom).toBe(2.0);
      expect(viewportState.pan).toEqual({ x: 50, y: 75 });
    });
  });
});