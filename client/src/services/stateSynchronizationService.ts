/**
 * State Synchronization Service
 * Handles real-time state synchronization for collaboration features
 */

import { EventEmitter } from 'events';
import { ViewerState, StateChangeEvent } from './unifiedStateManager';

export interface SyncMessage {
  id: string;
  type: 'state-update' | 'cursor-position' | 'annotation' | 'measurement' | 'viewport-sync';
  sessionId: string;
  userId: string;
  timestamp: string;
  data: any;
  metadata?: {
    source: string;
    priority: 'low' | 'medium' | 'high';
    requiresAck: boolean;
  };
}

export interface SyncSession {
  id: string;
  hostId: string;
  participants: Map<string, SyncParticipant>;
  createdAt: string;
  lastActivity: string;
  settings: {
    syncViewport: boolean;
    syncAnnotations: boolean;
    syncMeasurements: boolean;
    syncCursor: boolean;
    conflictResolution: 'host-wins' | 'timestamp' | 'merge';
  };
}

export interface SyncParticipant {
  id: string;
  name: string;
  role: 'host' | 'participant' | 'observer';
  joinedAt: string;
  lastSeen: string;
  permissions: {
    canEdit: boolean;
    canAnnotate: boolean;
    canMeasure: boolean;
    canControlViewport: boolean;
  };
}

export interface ConflictResolution {
  conflictId: string;
  type: 'state' | 'annotation' | 'measurement';
  participants: string[];
  changes: Array<{
    userId: string;
    timestamp: string;
    data: any;
  }>;
  resolution?: {
    strategy: string;
    resolvedBy: string;
    resolvedAt: string;
    finalValue: any;
  };
}

class StateSynchronizationService extends EventEmitter {
  private sessions: Map<string, SyncSession> = new Map();
  private currentSession: SyncSession | null = null;
  private currentUserId: string | null = null;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: SyncMessage[] = [];
  private conflictQueue: ConflictResolution[] = [];
  private isConnected = false;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Initialize the synchronization service
   */
  public async initialize(userId: string, websocketUrl?: string): Promise<void> {
    this.currentUserId = userId;
    
    if (websocketUrl) {
      await this.connectWebSocket(websocketUrl);
    }

    console.log('🔄 [StateSynchronizationService] Initialized for user:', userId);
  }

  /**
   * Connect to WebSocket server
   */
  private async connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          console.log('🔗 [StateSynchronizationService] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleIncomingMessage(JSON.parse(event.data));
        };

        this.websocket.onclose = () => {
          console.log('🔌 [StateSynchronizationService] WebSocket disconnected');
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect(url);
        };

        this.websocket.onerror = (error) => {
          console.error('❌ [StateSynchronizationService] WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [StateSynchronizationService] Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 [StateSynchronizationService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connectWebSocket(url).catch(console.error);
    }, delay);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('stateChange', (event: StateChangeEvent) => {
      this.broadcastStateChange(event);
    });

    this.on('conflict', (conflict: ConflictResolution) => {
      this.handleConflict(conflict);
    });
  }

  /**
   * Create a new collaboration session
   */
  public createSession(settings?: Partial<SyncSession['settings']>): SyncSession {
    if (!this.currentUserId) {
      throw new Error('User ID not set');
    }

    const sessionId = this.generateSessionId();
    const session: SyncSession = {
      id: sessionId,
      hostId: this.currentUserId,
      participants: new Map(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      settings: {
        syncViewport: true,
        syncAnnotations: true,
        syncMeasurements: true,
        syncCursor: true,
        conflictResolution: 'timestamp',
        ...settings
      }
    };

    // Add host as participant
    session.participants.set(this.currentUserId, {
      id: this.currentUserId,
      name: 'Host',
      role: 'host',
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      permissions: {
        canEdit: true,
        canAnnotate: true,
        canMeasure: true,
        canControlViewport: true
      }
    });

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    this.sendMessage({
      type: 'state-update',
      data: { action: 'session-created', session }
    });

    this.emit('sessionCreated', session);
    console.log('🎯 [StateSynchronizationService] Session created:', sessionId);

    return session;
  }

  /**
   * Join an existing session
   */
  public async joinSession(sessionId: string, userName: string): Promise<boolean> {
    if (!this.currentUserId) {
      throw new Error('User ID not set');
    }

    try {
      // Request to join session
      this.sendMessage({
        type: 'state-update',
        data: { 
          action: 'join-request', 
          sessionId, 
          userId: this.currentUserId,
          userName 
        }
      });

      // Wait for response (in real implementation, this would be handled by WebSocket response)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        
        this.once('joinResponse', (success: boolean, session?: SyncSession) => {
          clearTimeout(timeout);
          if (success && session) {
            this.currentSession = session;
            this.sessions.set(sessionId, session);
            this.emit('sessionJoined', session);
          }
          resolve(success);
        });
      });

    } catch (error) {
      console.error('❌ [StateSynchronizationService] Failed to join session:', error);
      return false;
    }
  }

  /**
   * Leave current session
   */
  public leaveSession(): void {
    if (!this.currentSession || !this.currentUserId) return;

    this.sendMessage({
      type: 'state-update',
      data: { 
        action: 'leave-session', 
        sessionId: this.currentSession.id,
        userId: this.currentUserId
      }
    });

    this.emit('sessionLeft', this.currentSession);
    this.currentSession = null;

    console.log('👋 [StateSynchronizationService] Left session');
  }

  /**
   * Synchronize viewer state
   */
  public syncViewerState(state: ViewerState): void {
    if (!this.currentSession || !this.currentSession.settings.syncViewport) return;

    this.sendMessage({
      type: 'viewport-sync',
      data: {
        viewport: state.viewport,
        currentSlice: state.currentSliceIndex,
        totalSlices: state.totalSlices
      },
      metadata: {
        source: 'viewport-sync',
        priority: 'medium',
        requiresAck: false
      }
    });
  }

  /**
   * Synchronize cursor position
   */
  public syncCursorPosition(x: number, y: number): void {
    if (!this.currentSession || !this.currentSession.settings.syncCursor) return;

    this.sendMessage({
      type: 'cursor-position',
      data: { x, y },
      metadata: {
        source: 'cursor-sync',
        priority: 'low',
        requiresAck: false
      }
    });
  }

  /**
   * Synchronize annotation
   */
  public syncAnnotation(annotation: any, action: 'create' | 'update' | 'delete'): void {
    if (!this.currentSession || !this.currentSession.settings.syncAnnotations) return;

    this.sendMessage({
      type: 'annotation',
      data: { annotation, action },
      metadata: {
        source: 'annotation-sync',
        priority: 'high',
        requiresAck: true
      }
    });
  }

  /**
   * Synchronize measurement
   */
  public syncMeasurement(measurement: any, action: 'create' | 'update' | 'delete'): void {
    if (!this.currentSession || !this.currentSession.settings.syncMeasurements) return;

    this.sendMessage({
      type: 'measurement',
      data: { measurement, action },
      metadata: {
        source: 'measurement-sync',
        priority: 'high',
        requiresAck: true
      }
    });
  }

  /**
   * Send message to other participants
   */
  private sendMessage(messageData: Partial<SyncMessage>): void {
    if (!this.currentUserId || !this.currentSession) return;

    const message: SyncMessage = {
      id: this.generateMessageId(),
      sessionId: this.currentSession.id,
      userId: this.currentUserId,
      timestamp: new Date().toISOString(),
      ...messageData
    } as SyncMessage;

    if (this.isConnected && this.websocket) {
      this.websocket.send(JSON.stringify(message));
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
    }
  }

  /**
   * Handle incoming message
   */
  private handleIncomingMessage(message: SyncMessage): void {
    // Don't process our own messages
    if (message.userId === this.currentUserId) return;

    console.log('📨 [StateSynchronizationService] Received message:', message.type);

    switch (message.type) {
      case 'viewport-sync':
        this.handleViewportSync(message);
        break;
      case 'cursor-position':
        this.handleCursorSync(message);
        break;
      case 'annotation':
        this.handleAnnotationSync(message);
        break;
      case 'measurement':
        this.handleMeasurementSync(message);
        break;
      case 'state-update':
        this.handleStateUpdate(message);
        break;
    }

    // Send acknowledgment if required
    if (message.metadata?.requiresAck) {
      this.sendAcknowledgment(message.id);
    }

    this.emit('messageReceived', message);
  }

  /**
   * Handle viewport synchronization
   */
  private handleViewportSync(message: SyncMessage): void {
    this.emit('viewportSync', {
      userId: message.userId,
      viewport: message.data.viewport,
      currentSlice: message.data.currentSlice,
      totalSlices: message.data.totalSlices
    });
  }

  /**
   * Handle cursor synchronization
   */
  private handleCursorSync(message: SyncMessage): void {
    this.emit('cursorSync', {
      userId: message.userId,
      x: message.data.x,
      y: message.data.y
    });
  }

  /**
   * Handle annotation synchronization
   */
  private handleAnnotationSync(message: SyncMessage): void {
    const { annotation, action } = message.data;
    
    // Check for conflicts
    if (this.detectConflict('annotation', annotation.id, message)) {
      return; // Conflict will be handled separately
    }

    this.emit('annotationSync', {
      userId: message.userId,
      annotation,
      action
    });
  }

  /**
   * Handle measurement synchronization
   */
  private handleMeasurementSync(message: SyncMessage): void {
    const { measurement, action } = message.data;
    
    // Check for conflicts
    if (this.detectConflict('measurement', measurement.id, message)) {
      return; // Conflict will be handled separately
    }

    this.emit('measurementSync', {
      userId: message.userId,
      measurement,
      action
    });
  }

  /**
   * Handle state update
   */
  private handleStateUpdate(message: SyncMessage): void {
    const { action } = message.data;

    switch (action) {
      case 'session-created':
        // Handle session creation notification
        break;
      case 'join-request':
        this.handleJoinRequest(message);
        break;
      case 'participant-joined':
        this.handleParticipantJoined(message);
        break;
      case 'participant-left':
        this.handleParticipantLeft(message);
        break;
    }
  }

  /**
   * Handle join request
   */
  private handleJoinRequest(message: SyncMessage): void {
    if (!this.currentSession || this.currentSession.hostId !== this.currentUserId) return;

    const { userId, userName } = message.data;
    
    // Add participant to session
    const participant: SyncParticipant = {
      id: userId,
      name: userName,
      role: 'participant',
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      permissions: {
        canEdit: true,
        canAnnotate: true,
        canMeasure: true,
        canControlViewport: false // Only host can control viewport by default
      }
    };

    this.currentSession.participants.set(userId, participant);
    
    // Notify all participants
    this.sendMessage({
      type: 'state-update',
      data: { 
        action: 'participant-joined', 
        participant,
        session: this.currentSession
      }
    });

    this.emit('participantJoined', participant);
  }

  /**
   * Handle participant joined
   */
  private handleParticipantJoined(message: SyncMessage): void {
    const { participant, session } = message.data;
    
    if (this.currentSession && this.currentSession.id === session.id) {
      this.currentSession.participants.set(participant.id, participant);
      this.emit('participantJoined', participant);
    }
  }

  /**
   * Handle participant left
   */
  private handleParticipantLeft(message: SyncMessage): void {
    const { userId } = message.data;
    
    if (this.currentSession) {
      this.currentSession.participants.delete(userId);
      this.emit('participantLeft', userId);
    }
  }

  /**
   * Detect conflicts
   */
  private detectConflict(type: string, itemId: string, message: SyncMessage): boolean {
    // Simple conflict detection based on timestamp
    // In a real implementation, this would be more sophisticated
    return false;
  }

  /**
   * Handle conflict resolution
   */
  private handleConflict(conflict: ConflictResolution): void {
    const strategy = this.currentSession?.settings.conflictResolution || 'timestamp';
    
    switch (strategy) {
      case 'host-wins':
        this.resolveConflictHostWins(conflict);
        break;
      case 'timestamp':
        this.resolveConflictByTimestamp(conflict);
        break;
      case 'merge':
        this.resolveConflictByMerge(conflict);
        break;
    }
  }

  /**
   * Resolve conflict with host wins strategy
   */
  private resolveConflictHostWins(conflict: ConflictResolution): void {
    if (!this.currentSession) return;
    
    const hostChange = conflict.changes.find(c => c.userId === this.currentSession!.hostId);
    if (hostChange) {
      conflict.resolution = {
        strategy: 'host-wins',
        resolvedBy: this.currentUserId!,
        resolvedAt: new Date().toISOString(),
        finalValue: hostChange.data
      };
    }
  }

  /**
   * Resolve conflict by timestamp
   */
  private resolveConflictByTimestamp(conflict: ConflictResolution): void {
    const latestChange = conflict.changes.reduce((latest, current) => 
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );
    
    conflict.resolution = {
      strategy: 'timestamp',
      resolvedBy: this.currentUserId!,
      resolvedAt: new Date().toISOString(),
      finalValue: latestChange.data
    };
  }

  /**
   * Resolve conflict by merge
   */
  private resolveConflictByMerge(conflict: ConflictResolution): void {
    // Simple merge strategy - in practice, this would be type-specific
    const mergedData = conflict.changes.reduce((merged, change) => ({
      ...merged,
      ...change.data
    }), {});
    
    conflict.resolution = {
      strategy: 'merge',
      resolvedBy: this.currentUserId!,
      resolvedAt: new Date().toISOString(),
      finalValue: mergedData
    };
  }

  /**
   * Send acknowledgment
   */
  private sendAcknowledgment(messageId: string): void {
    this.sendMessage({
      type: 'state-update',
      data: { action: 'ack', messageId }
    });
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected && this.websocket) {
      const message = this.messageQueue.shift()!;
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast state change
   */
  private broadcastStateChange(event: StateChangeEvent): void {
    if (!this.currentSession) return;

    this.sendMessage({
      type: 'state-update',
      data: { 
        action: 'state-changed',
        event
      },
      metadata: {
        source: 'state-broadcast',
        priority: 'medium',
        requiresAck: false
      }
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): SyncSession | null {
    return this.currentSession;
  }

  /**
   * Get session participants
   */
  public getParticipants(): SyncParticipant[] {
    if (!this.currentSession) return [];
    return Array.from(this.currentSession.participants.values());
  }

  /**
   * Update session settings
   */
  public updateSessionSettings(settings: Partial<SyncSession['settings']>): void {
    if (!this.currentSession) return;
    
    this.currentSession.settings = {
      ...this.currentSession.settings,
      ...settings
    };

    this.sendMessage({
      type: 'state-update',
      data: { 
        action: 'settings-updated',
        settings: this.currentSession.settings
      }
    });
  }

  /**
   * Get connection status
   */
  public isConnectedToSession(): boolean {
    return this.isConnected && this.currentSession !== null;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.currentSession = null;
    this.sessions.clear();
    this.messageQueue = [];
    this.conflictQueue = [];
    this.removeAllListeners();
    
    console.log('🧹 [StateSynchronizationService] Cleaned up resources');
  }
}

// Singleton instance
let globalSyncService: StateSynchronizationService | null = null;

/**
 * Get global synchronization service instance
 */
export function getGlobalSyncService(): StateSynchronizationService {
  if (!globalSyncService) {
    globalSyncService = new StateSynchronizationService();
  }
  return globalSyncService;
}

/**
 * Reset global synchronization service
 */
export function resetGlobalSyncService(): void {
  if (globalSyncService) {
    globalSyncService.cleanup();
    globalSyncService = null;
  }
}

export { StateSynchronizationService };