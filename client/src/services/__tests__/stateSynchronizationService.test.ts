/**
 * Unit Tests for StateSynchronizationService
 * Tests for real-time collaboration and state synchronization
 */

import { StateSynchronizationService, SyncMessage, SyncSession } from '../stateSynchronizationService';
import { WebSocketTestUtils, AsyncTestUtils, MockStateGenerator } from './testUtils';

// Mock WebSocket
global.WebSocket = jest.fn();

describe('StateSynchronizationService', () => {
  let syncService: StateSynchronizationService;
  let mockWebSocket: WebSocket;

  beforeEach(() => {
    mockWebSocket = WebSocketTestUtils.createMockWebSocket();
    (global.WebSocket as jest.Mock).mockImplementation(() => mockWebSocket);
    
    syncService = new StateSynchronizationService();
  });

  afterEach(() => {
    syncService.cleanup();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with user ID', async () => {
      await syncService.initialize('user-123');
      
      expect(syncService['currentUserId']).toBe('user-123');
    });

    test('should connect to WebSocket when URL provided', async () => {
      const connectPromise = syncService.initialize('user-123', 'ws://localhost:8080');
      
      // Simulate WebSocket connection
      (mockWebSocket as any).simulateOpen();
      
      await connectPromise;
      
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
    });

    test('should handle WebSocket connection errors', async () => {
      const connectPromise = syncService.initialize('user-123', 'ws://localhost:8080');
      
      // Simulate WebSocket error
      (mockWebSocket as any).simulateError();
      
      await expect(connectPromise).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await syncService.initialize('user-123');
      (mockWebSocket as any).simulateOpen();
    });

    test('should create collaboration session', () => {
      const session = syncService.createSession();
      
      expect(session).toBeDefined();
      expect(session.id).toMatch(/^session-\d+-\w+$/);
      expect(session.hostId).toBe('user-123');
      expect(session.participants.has('user-123')).toBe(true);
    });

    test('should create session with custom settings', () => {
      const settings = {
        syncViewport: false,
        conflictResolution: 'host-wins' as const
      };
      
      const session = syncService.createSession(settings);
      
      expect(session.settings.syncViewport).toBe(false);
      expect(session.settings.conflictResolution).toBe('host-wins');
    });

    test('should join existing session', async () => {
      // Create a session first
      const session = syncService.createSession();
      
      // Simulate another user joining
      const joinPromise = syncService.joinSession(session.id, 'Test User');
      
      // Simulate successful join response
      setTimeout(() => {
        syncService.emit('joinResponse', true, session);
      }, 10);
      
      const success = await joinPromise;
      expect(success).toBe(true);
    });

    test('should handle join timeout', async () => {
      const joinPromise = syncService.joinSession('non-existent-session', 'Test User');
      
      // Don't simulate response - should timeout
      const success = await joinPromise;
      expect(success).toBe(false);
    });

    test('should leave session', () => {
      const session = syncService.createSession();
      
      syncService.leaveSession();
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"leave-session"')
      );
    });

    test('should get current session', () => {
      const session = syncService.createSession();
      
      expect(syncService.getCurrentSession()).toBe(session);
    });

    test('should get participants', () => {
      const session = syncService.createSession();
      
      const participants = syncService.getParticipants();
      expect(participants).toHaveLength(1);
      expect(participants[0].id).toBe('user-123');
    });
  });

  describe('State Synchronization', () => {
    let session: SyncSession;

    beforeEach(async () => {
      await syncService.initialize('user-123');
      (mockWebSocket as any).simulateOpen();
      session = syncService.createSession();
    });

    test('should sync viewer state', () => {
      const viewerState = MockStateGenerator.generateMockViewerState();
      
      syncService.syncViewerState(viewerState);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"viewport-sync"')
      );
    });

    test('should sync cursor position', () => {
      syncService.syncCursorPosition(100, 200);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"cursor-position"')
      );
    });

    test('should sync annotations', () => {
      const annotation = {
        id: 'annotation-1',
        type: 'text',
        content: 'Test annotation'
      };
      
      syncService.syncAnnotation(annotation, 'create');
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"annotation"')
      );
    });

    test('should sync measurements', () => {
      const measurement = {
        id: 'measurement-1',
        type: 'distance',
        value: 10.5
      };
      
      syncService.syncMeasurement(measurement, 'create');
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"measurement"')
      );
    });

    test('should respect session settings', () => {
      // Disable viewport sync
      syncService.updateSessionSettings({ syncViewport: false });
      
      const viewerState = MockStateGenerator.generateMockViewerState();
      syncService.syncViewerState(viewerState);
      
      // Should not send message when sync is disabled
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(
        expect.stringContaining('"type":"viewport-sync"')
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await syncService.initialize('user-123');
      (mockWebSocket as any).simulateOpen();
      syncService.createSession();
    });

    test('should handle incoming viewport sync', () => {
      const viewportSyncHandler = jest.fn();
      syncService.on('viewportSync', viewportSyncHandler);
      
      const message: SyncMessage = {
        id: 'msg-1',
        type: 'viewport-sync',
        sessionId: 'session-1',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
        data: {
          viewport: { zoom: 2.0, pan: { x: 10, y: 20 } },
          currentSlice: 5,
          totalSlices: 100
        }
      };
      
      (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      
      expect(viewportSyncHandler).toHaveBeenCalledWith({
        userId: 'user-456',
        viewport: { zoom: 2.0, pan: { x: 10, y: 20 } },
        currentSlice: 5,
        totalSlices: 100
      });
    });

    test('should handle incoming cursor sync', () => {
      const cursorSyncHandler = jest.fn();
      syncService.on('cursorSync', cursorSyncHandler);
      
      const message: SyncMessage = {
        id: 'msg-2',
        type: 'cursor-position',
        sessionId: 'session-1',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
        data: { x: 150, y: 250 }
      };
      
      (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      
      expect(cursorSyncHandler).toHaveBeenCalledWith({
        userId: 'user-456',
        x: 150,
        y: 250
      });
    });

    test('should handle incoming annotation sync', () => {
      const annotationSyncHandler = jest.fn();
      syncService.on('annotationSync', annotationSyncHandler);
      
      const message: SyncMessage = {
        id: 'msg-3',
        type: 'annotation',
        sessionId: 'session-1',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
        data: {
          annotation: { id: 'ann-1', type: 'text', content: 'Test' },
          action: 'create'
        }
      };
      
      (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      
      expect(annotationSyncHandler).toHaveBeenCalledWith({
        userId: 'user-456',
        annotation: { id: 'ann-1', type: 'text', content: 'Test' },
        action: 'create'
      });
    });

    test('should ignore own messages', () => {
      const viewportSyncHandler = jest.fn();
      syncService.on('viewportSync', viewportSyncHandler);
      
      const message: SyncMessage = {
        id: 'msg-4',
        type: 'viewport-sync',
        sessionId: 'session-1',
        userId: 'user-123', // Same as current user
        timestamp: new Date().toISOString(),
        data: { viewport: { zoom: 2.0 } }
      };
      
      (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      
      expect(viewportSyncHandler).not.toHaveBeenCalled();
    });

    test('should send acknowledgment for messages requiring it', () => {
      const message: SyncMessage = {
        id: 'msg-5',
        type: 'annotation',
        sessionId: 'session-1',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
        data: { annotation: {}, action: 'create' },
        metadata: { source: 'test', priority: 'high', requiresAck: true }
      };
      
      (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"ack"')
      );
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await syncService.initialize('user-123');
    });

    test('should handle connection status', () => {
      expect(syncService.isConnectedToSession()).toBe(false);
      
      (mockWebSocket as any).simulateOpen();
      syncService.createSession();
      
      expect(syncService.isConnectedToSession()).toBe(true);
    });

    test('should handle disconnection', () => {
      (mockWebSocket as any).simulateOpen();
      const session = syncService.createSession();
      
      expect(syncService.isConnectedToSession()).toBe(true);
      
      (mockWebSocket as any).simulateClose();
      
      expect(syncService['isConnected']).toBe(false);
    });

    test('should attempt reconnection on disconnect', async () => {
      (mockWebSocket as any).simulateOpen();
      
      // Simulate disconnect
      (mockWebSocket as any).simulateClose();
      
      // Should attempt to reconnect
      await AsyncTestUtils.delay(100);
      
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    test('should queue messages when disconnected', () => {
      // Don't simulate open - keep disconnected
      syncService.createSession();
      
      const viewerState = MockStateGenerator.generateMockViewerState();
      syncService.syncViewerState(viewerState);
      
      // Message should be queued, not sent immediately
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      expect(syncService['messageQueue']).toHaveLength(2); // Session creation + viewport sync
    });

    test('should process queued messages on reconnection', () => {
      // Queue messages while disconnected
      syncService.createSession();
      const viewerState = MockStateGenerator.generateMockViewerState();
      syncService.syncViewerState(viewerState);
      
      expect(syncService['messageQueue'].length).toBeGreaterThan(0);
      
      // Simulate connection
      (mockWebSocket as any).simulateOpen();
      
      // Messages should be sent
      expect(mockWebSocket.send).toHaveBeenCalled();
      expect(syncService['messageQueue']).toHaveLength(0);
    });
  });

  describe('Session Settings', () => {
    let session: SyncSession;

    beforeEach(async () => {
      await syncService.initialize('user-123');
      (mockWebSocket as any).simulateOpen();
      session = syncService.createSession();
    });

    test('should update session settings', () => {
      const newSettings = {
        syncViewport: false,
        conflictResolution: 'merge' as const
      };
      
      syncService.updateSessionSettings(newSettings);
      
      expect(session.settings.syncViewport).toBe(false);
      expect(session.settings.conflictResolution).toBe('merge');
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"settings-updated"')
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket errors gracefully', async () => {
      const errorHandler = jest.fn();
      syncService.on('error', errorHandler);
      
      await syncService.initialize('user-123', 'ws://localhost:8080');
      (mockWebSocket as any).simulateError();
      
      expect(errorHandler).toHaveBeenCalled();
    });

    test('should handle malformed messages', () => {
      const errorHandler = jest.fn();
      syncService.on('error', errorHandler);
      
      // Simulate malformed JSON message
      expect(() => {
        (mockWebSocket as any).simulateMessage('invalid json');
      }).not.toThrow();
    });

    test('should handle missing session gracefully', () => {
      // Try to sync without creating session
      const viewerState = MockStateGenerator.generateMockViewerState();
      
      expect(() => {
        syncService.syncViewerState(viewerState);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await syncService.initialize('user-123');
      (mockWebSocket as any).simulateOpen();
      syncService.createSession();
    });

    test('should handle high-frequency cursor updates', () => {
      const startTime = performance.now();
      
      // Simulate rapid cursor movements
      for (let i = 0; i < 100; i++) {
        syncService.syncCursorPosition(i, i);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(100);
    });

    test('should handle large message volumes', () => {
      const messageCount = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < messageCount; i++) {
        const message: SyncMessage = {
          id: `msg-${i}`,
          type: 'cursor-position',
          sessionId: 'session-1',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
          data: { x: i, y: i }
        };
        
        (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should process messages efficiently
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', async () => {
      await syncService.initialize('user-123', 'ws://localhost:8080');
      (mockWebSocket as any).simulateOpen();
      syncService.createSession();
      
      syncService.cleanup();
      
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(syncService.getCurrentSession()).toBeNull();
      expect(syncService['messageQueue']).toHaveLength(0);
    });

    test('should handle multiple cleanup calls', () => {
      expect(() => {
        syncService.cleanup();
        syncService.cleanup();
      }).not.toThrow();
    });
  });

  describe('Concurrency', () => {
    beforeEach(async () => {
      await syncService.initialize('user-123');
      (mockWebSocket as any).simulateOpen();
      syncService.createSession();
    });

    test('should handle concurrent message sending', () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          syncService.syncCursorPosition(i, i);
        })
      );
      
      expect(() => Promise.all(promises)).not.toThrow();
    });

    test('should handle concurrent message receiving', () => {
      const handler = jest.fn();
      syncService.on('cursorSync', handler);
      
      // Simulate concurrent messages
      for (let i = 0; i < 10; i++) {
        const message: SyncMessage = {
          id: `msg-${i}`,
          type: 'cursor-position',
          sessionId: 'session-1',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
          data: { x: i, y: i }
        };
        
        (mockWebSocket as any).simulateMessage(JSON.stringify(message));
      }
      
      expect(handler).toHaveBeenCalledTimes(10);
    });
  });
});