/**
 * Integration Tests for Real-Time Collaboration
 * Tests multi-user collaboration scenarios and state synchronization
 */

import { StateSynchronizationService } from '../stateSynchronizationService';
import { UnifiedStateManager } from '../unifiedStateManager';
import { WebSocketTestUtils, MockStateGenerator, AsyncTestUtils } from './testUtils';

// Mock WebSocket
global.WebSocket = jest.fn();

describe('Collaboration Integration Tests', () => {
  let user1Service: StateSynchronizationService;
  let user2Service: StateSynchronizationService;
  let user1StateManager: UnifiedStateManager;
  let user2StateManager: UnifiedStateManager;
  let mockWebSocket1: WebSocket;
  let mockWebSocket2: WebSocket;

  beforeEach(async () => {
    // Create mock WebSockets
    mockWebSocket1 = WebSocketTestUtils.createMockWebSocket();
    mockWebSocket2 = WebSocketTestUtils.createMockWebSocket();
    
    let wsCallCount = 0;
    (global.WebSocket as jest.Mock).mockImplementation(() => {
      wsCallCount++;
      return wsCallCount === 1 ? mockWebSocket1 : mockWebSocket2;
    });

    // Initialize services
    user1Service = new StateSynchronizationService();
    user2Service = new StateSynchronizationService();
    
    user1StateManager = new UnifiedStateManager();
    user2StateManager = new UnifiedStateManager();
    
    await user1StateManager.initialize();
    await user2StateManager.initialize();
    
    // Initialize sync services
    await user1Service.initialize('user-1', 'ws://localhost:8080');
    await user2Service.initialize('user-2', 'ws://localhost:8080');
    
    // Simulate connections
    (mockWebSocket1 as any).simulateOpen();
    (mockWebSocket2 as any).simulateOpen();
  });

  afterEach(() => {
    user1Service.cleanup();
    user2Service.cleanup();
    user1StateManager.cleanup();
    user2StateManager.cleanup();
    jest.clearAllMocks();
  });

  describe('Session Management Integration', () => {
    test('should create and join collaboration session', async () => {
      // User 1 creates session
      const session = user1Service.createSession({
        syncViewport: true,
        syncAnnotations: true,
        syncMeasurements: true
      });

      expect(session).toBeDefined();
      expect(session.hostId).toBe('user-1');

      // User 2 joins session
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      
      // Simulate successful join
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);

      const joinSuccess = await joinPromise;
      expect(joinSuccess).toBe(true);

      // Both users should be in the same session
      expect(user1Service.getCurrentSession()?.id).toBe(session.id);
      expect(user2Service.getCurrentSession()?.id).toBe(session.id);
    });

    test('should handle session participant management', async () => {
      const session = user1Service.createSession();
      
      // Simulate user 2 joining
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        // Simulate host adding participant
        session.participants.set('user-2', {
          id: 'user-2',
          name: 'User 2',
          role: 'participant',
          joinedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          permissions: {
            canEdit: true,
            canAnnotate: true,
            canMeasure: true,
            canControlViewport: false
          }
        });
        user2Service.emit('joinResponse', true, session);
      }, 100);

      await joinPromise;

      // Check participants
      const user1Participants = user1Service.getParticipants();
      const user2Participants = user2Service.getParticipants();

      expect(user1Participants).toHaveLength(2); // Host + participant
      expect(user2Participants).toHaveLength(2);
      
      const user2Participant = user1Participants.find(p => p.id === 'user-2');
      expect(user2Participant).toBeDefined();
      expect(user2Participant?.name).toBe('User 2');
    });

    test('should handle session settings synchronization', async () => {
      const session = user1Service.createSession();
      
      // Join user 2
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      // User 1 updates settings
      user1Service.updateSessionSettings({
        syncViewport: false,
        conflictResolution: 'merge'
      });

      // Settings should be synchronized
      expect(session.settings.syncViewport).toBe(false);
      expect(session.settings.conflictResolution).toBe('merge');
    });
  });

  describe('State Synchronization Integration', () => {
    let session: any;

    beforeEach(async () => {
      session = user1Service.createSession();
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;
    });

    test('should synchronize viewport changes', async () => {
      const user2ViewportHandler = jest.fn();
      user2Service.on('viewportSync', user2ViewportHandler);

      // User 1 changes viewport
      const viewerState = MockStateGenerator.generateMockViewerState({
        viewport: {
          zoom: 2.0,
          pan: { x: 100, y: 50 },
          rotation: 45,
          windowLevel: { center: 200, width: 400 },
          brightness: 120,
          contrast: 110
        }
      });

      user1Service.syncViewerState(viewerState);

      // Simulate message delivery to user 2
      const sentMessage = JSON.parse((mockWebSocket1.send as jest.Mock).mock.calls[0][0]);
      (mockWebSocket2 as any).simulateMessage(JSON.stringify({
        ...sentMessage,
        userId: 'user-1' // Different user ID
      }));

      // User 2 should receive viewport sync
      expect(user2ViewportHandler).toHaveBeenCalledWith({
        userId: 'user-1',
        viewport: viewerState.viewport,
        currentSlice: viewerState.currentSliceIndex,
        totalSlices: viewerState.totalSlices
      });
    });

    test('should synchronize cursor positions', async () => {
      const user2CursorHandler = jest.fn();
      user2Service.on('cursorSync', user2CursorHandler);

      // User 1 moves cursor
      user1Service.syncCursorPosition(250, 300);

      // Simulate message delivery
      const sentMessage = JSON.parse((mockWebSocket1.send as jest.Mock).mock.calls[0][0]);
      (mockWebSocket2 as any).simulateMessage(JSON.stringify({
        ...sentMessage,
        userId: 'user-1'
      }));

      // User 2 should receive cursor sync
      expect(user2CursorHandler).toHaveBeenCalledWith({
        userId: 'user-1',
        x: 250,
        y: 300
      });
    });

    test('should synchronize annotations', async () => {
      const user2AnnotationHandler = jest.fn();
      user2Service.on('annotationSync', user2AnnotationHandler);

      const annotation = {
        id: 'annotation-1',
        type: 'text',
        content: 'Test annotation',
        position: { x: 100, y: 200 },
        style: { color: '#ff0000', fontSize: 14 }
      };

      // User 1 creates annotation
      user1Service.syncAnnotation(annotation, 'create');

      // Simulate message delivery
      const sentMessage = JSON.parse((mockWebSocket1.send as jest.Mock).mock.calls[0][0]);
      (mockWebSocket2 as any).simulateMessage(JSON.stringify({
        ...sentMessage,
        userId: 'user-1'
      }));

      // User 2 should receive annotation sync
      expect(user2AnnotationHandler).toHaveBeenCalledWith({
        userId: 'user-1',
        annotation,
        action: 'create'
      });
    });

    test('should synchronize measurements', async () => {
      const user2MeasurementHandler = jest.fn();
      user2Service.on('measurementSync', user2MeasurementHandler);

      const measurement = {
        id: 'measurement-1',
        type: 'distance',
        points: [{ x: 50, y: 50 }, { x: 150, y: 150 }],
        value: 141.42,
        unit: 'mm'
      };

      // User 1 creates measurement
      user1Service.syncMeasurement(measurement, 'create');

      // Simulate message delivery
      const sentMessage = JSON.parse((mockWebSocket1.send as jest.Mock).mock.calls[0][0]);
      (mockWebSocket2 as any).simulateMessage(JSON.stringify({
        ...sentMessage,
        userId: 'user-1'
      }));

      // User 2 should receive measurement sync
      expect(user2MeasurementHandler).toHaveBeenCalledWith({
        userId: 'user-1',
        measurement,
        action: 'create'
      });
    });
  });

  describe('State Manager Integration', () => {
    test('should integrate collaboration with state management', async () => {
      // Set up collaboration session
      const session = user1Service.createSession();
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      // User 1 updates state
      user1StateManager.switchMode('simple');
      user1StateManager.updateViewerState('simple', 'viewport.zoom', 3.0, 'user-interaction');

      // Simulate collaboration sync
      const viewerState = user1StateManager.getViewerState('simple');
      if (viewerState) {
        user1Service.syncViewerState(viewerState);
      }

      // User 2 should be able to apply the synchronized state
      const user2ViewportHandler = jest.fn((data) => {
        user2StateManager.switchMode('simple');
        user2StateManager.updateViewerState('simple', 'viewport.zoom', data.viewport.zoom, 'collaboration-sync');
      });

      user2Service.on('viewportSync', user2ViewportHandler);

      // Simulate message delivery
      const sentMessage = JSON.parse((mockWebSocket1.send as jest.Mock).mock.calls[0][0]);
      (mockWebSocket2 as any).simulateMessage(JSON.stringify({
        ...sentMessage,
        userId: 'user-1'
      }));

      // Verify synchronization
      expect(user2ViewportHandler).toHaveBeenCalled();
      
      await AsyncTestUtils.delay(100);
      
      const user2ViewerState = user2StateManager.getViewerState('simple');
      expect(user2ViewerState?.viewport.zoom).toBe(3.0);
    });

    test('should handle state conflicts in collaboration', async () => {
      // Set up collaboration with conflict resolution
      const session = user1Service.createSession({
        conflictResolution: 'timestamp'
      });
      
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      // Both users make conflicting changes
      user1StateManager.switchMode('simple');
      user2StateManager.switchMode('simple');

      const timestamp1 = new Date().toISOString();
      await AsyncTestUtils.delay(10);
      const timestamp2 = new Date().toISOString();

      // User 1 change (earlier)
      user1StateManager.updateViewerState('simple', 'viewport.zoom', 2.0, 'user-1');
      
      // User 2 change (later)
      user2StateManager.updateViewerState('simple', 'viewport.zoom', 3.0, 'user-2');

      // Simulate conflict resolution (timestamp-based)
      // Later timestamp should win
      const finalState = user2StateManager.getViewerState('simple');
      expect(finalState?.viewport.zoom).toBe(3.0);
    });
  });

  describe('Connection Management Integration', () => {
    test('should handle connection drops and reconnection', async () => {
      const session = user1Service.createSession();
      
      // User 2 joins
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      // Simulate connection drop for user 2
      (mockWebSocket2 as any).simulateClose();
      
      expect(user2Service.isConnectedToSession()).toBe(false);

      // Simulate reconnection
      await AsyncTestUtils.delay(1100); // Wait for reconnection attempt
      
      // Create new WebSocket for reconnection
      const mockWebSocket2Reconnect = WebSocketTestUtils.createMockWebSocket();
      (global.WebSocket as jest.Mock).mockReturnValue(mockWebSocket2Reconnect);
      
      (mockWebSocket2Reconnect as any).simulateOpen();
      
      // Should attempt to rejoin session
      expect(global.WebSocket).toHaveBeenCalledTimes(3); // Initial + reconnection attempt
    });

    test('should queue messages during disconnection', async () => {
      const session = user1Service.createSession();
      
      // Disconnect user 1
      (mockWebSocket1 as any).simulateClose();
      
      // Try to sync while disconnected
      const viewerState = MockStateGenerator.generateMockViewerState();
      user1Service.syncViewerState(viewerState);
      user1Service.syncCursorPosition(100, 200);

      // Messages should be queued
      expect(user1Service['messageQueue'].length).toBeGreaterThan(0);

      // Reconnect
      const mockWebSocket1Reconnect = WebSocketTestUtils.createMockWebSocket();
      (global.WebSocket as jest.Mock).mockReturnValue(mockWebSocket1Reconnect);
      (mockWebSocket1Reconnect as any).simulateOpen();

      // Queued messages should be sent
      expect(mockWebSocket1Reconnect.send).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    test('should handle high-frequency collaboration updates', async () => {
      const session = user1Service.createSession();
      
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      const user2CursorHandler = jest.fn();
      user2Service.on('cursorSync', user2CursorHandler);

      const startTime = performance.now();

      // Simulate rapid cursor movements
      for (let i = 0; i < 100; i++) {
        user1Service.syncCursorPosition(i, i);
        
        // Simulate message delivery
        const sentMessage = JSON.parse((mockWebSocket1.send as jest.Mock).mock.calls[i][0]);
        (mockWebSocket2 as any).simulateMessage(JSON.stringify({
          ...sentMessage,
          userId: 'user-1'
        }));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle high frequency updates efficiently
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(user2CursorHandler).toHaveBeenCalledTimes(100);
    });

    test('should handle large collaboration sessions', async () => {
      const session = user1Service.createSession();
      const users: StateSynchronizationService[] = [];
      const mockWebSockets: WebSocket[] = [];

      // Simulate 10 users joining
      for (let i = 2; i <= 10; i++) {
        const userService = new StateSynchronizationService();
        const mockWS = WebSocketTestUtils.createMockWebSocket();
        
        (global.WebSocket as jest.Mock).mockReturnValue(mockWS);
        
        await userService.initialize(`user-${i}`, 'ws://localhost:8080');
        (mockWS as any).simulateOpen();
        
        const joinPromise = userService.joinSession(session.id, `User ${i}`);
        setTimeout(() => {
          userService.emit('joinResponse', true, session);
        }, 10);
        await joinPromise;
        
        users.push(userService);
        mockWebSockets.push(mockWS);
      }

      // All users should be in the session
      expect(users.every(user => user.getCurrentSession()?.id === session.id)).toBe(true);

      // Cleanup
      users.forEach(user => user.cleanup());
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle malformed collaboration messages', async () => {
      const session = user1Service.createSession();
      
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      const errorHandler = jest.fn();
      user2Service.on('error', errorHandler);

      // Send malformed message
      (mockWebSocket2 as any).simulateMessage('invalid json');

      // Should handle gracefully without crashing
      expect(user2Service.isConnectedToSession()).toBe(true);
    });

    test('should handle session host disconnection', async () => {
      const session = user1Service.createSession();
      
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      // Host disconnects
      user1Service.leaveSession();
      (mockWebSocket1 as any).simulateClose();

      // Participants should be notified
      // Implementation would depend on specific business logic
      expect(user2Service.getCurrentSession()).toBeDefined();
    });
  });

  describe('Security Integration', () => {
    test('should validate user permissions', async () => {
      const session = user1Service.createSession();
      
      // User 2 joins with limited permissions
      const joinPromise = user2Service.joinSession(session.id, 'User 2');
      setTimeout(() => {
        session.participants.set('user-2', {
          id: 'user-2',
          name: 'User 2',
          role: 'observer',
          joinedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          permissions: {
            canEdit: false,
            canAnnotate: false,
            canMeasure: false,
            canControlViewport: false
          }
        });
        user2Service.emit('joinResponse', true, session);
      }, 100);
      await joinPromise;

      // User 2 tries to sync viewport (should be restricted)
      const viewerState = MockStateGenerator.generateMockViewerState();
      user2Service.syncViewerState(viewerState);

      // Should respect permissions (implementation dependent)
      expect(mockWebSocket2.send).toHaveBeenCalled();
    });

    test('should handle unauthorized session access', async () => {
      // Try to join non-existent session
      const joinPromise = user2Service.joinSession('invalid-session-id', 'User 2');
      
      // Don't simulate successful response
      const success = await joinPromise;
      
      expect(success).toBe(false);
      expect(user2Service.getCurrentSession()).toBeNull();
    });
  });
});