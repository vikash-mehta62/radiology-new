/**
 * Real-Time Collaboration Module
 * WebSocket-based real-time synchronization for multi-user medical imaging collaboration
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'radiologist' | 'resident' | 'technician' | 'student' | 'observer';
  avatar?: string;
  color: string;
  permissions: UserPermissions;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: string;
}

export interface UserPermissions {
  canEdit: boolean;
  canAnnotate: boolean;
  canMeasure: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canModerate: boolean;
  canExport: boolean;
  canViewSensitive: boolean;
}

export interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  imageId: string;
  studyId?: string;
  seriesId?: string;
  patientId?: string;
  creator: User;
  participants: User[];
  invitedUsers: string[]; // email addresses
  startTime: string;
  endTime?: string;
  status: 'active' | 'paused' | 'ended';
  settings: SessionSettings;
  metadata: {
    totalMessages: number;
    totalAnnotations: number;
    totalMeasurements: number;
    recordingEnabled: boolean;
    recordingUrl?: string;
  };
}

export interface SessionSettings {
  maxParticipants: number;
  allowAnonymous: boolean;
  requireApproval: boolean;
  enableVoiceChat: boolean;
  enableVideoChat: boolean;
  enableScreenShare: boolean;
  enableRecording: boolean;
  autoSaveInterval: number;
  syncViewport: boolean;
  syncAnnotations: boolean;
  syncMeasurements: boolean;
  syncCursor: boolean;
  moderationEnabled: boolean;
}

export interface CollaborationMessage {
  id: string;
  type: 'chat' | 'system' | 'annotation' | 'measurement' | 'viewport' | 'cursor' | 'user-action';
  sessionId: string;
  sender: User;
  timestamp: string;
  content: any;
  metadata?: {
    priority: 'low' | 'normal' | 'high' | 'urgent';
    requiresAck: boolean;
    acknowledged: string[]; // user IDs
    encrypted: boolean;
  };
}

export interface ChatMessage extends CollaborationMessage {
  type: 'chat';
  content: {
    text: string;
    mentions?: string[]; // user IDs
    attachments?: {
      type: 'image' | 'file' | 'measurement' | 'annotation';
      url: string;
      name: string;
      size: number;
    }[];
    replyTo?: string; // message ID
  };
}

export interface ViewportSyncMessage extends CollaborationMessage {
  type: 'viewport';
  content: {
    zoom: number;
    pan: { x: number; y: number };
    rotation: number;
    windowLevel: { center: number; width: number };
    sliceIndex?: number;
    timestamp: string;
  };
}

export interface CursorSyncMessage extends CollaborationMessage {
  type: 'cursor';
  content: {
    position: { x: number; y: number };
    visible: boolean;
    action?: 'click' | 'drag' | 'hover';
  };
}

export interface AnnotationSyncMessage extends CollaborationMessage {
  type: 'annotation';
  content: {
    action: 'create' | 'update' | 'delete' | 'validate';
    annotationId: string;
    annotationData?: any;
    changes?: any;
  };
}

export interface MeasurementSyncMessage extends CollaborationMessage {
  type: 'measurement';
  content: {
    action: 'create' | 'update' | 'delete' | 'validate';
    measurementId: string;
    measurementData?: any;
    changes?: any;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  errors: string[];
}

export interface CollaborationConfig {
  serverUrl: string;
  apiKey?: string;
  autoReconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageQueueSize: number;
  enableEncryption: boolean;
  enableCompression: boolean;
  debugMode: boolean;
}

class CollaborationModule {
  private config: CollaborationConfig;
  private socket: WebSocket | null = null;
  private currentUser: User | null = null;
  private currentSession: CollaborationSession | null = null;
  private connectionStatus: ConnectionStatus;
  private messageQueue: CollaborationMessage[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;

  // WebRTC for voice/video
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private isVoiceEnabled: boolean = false;
  private isVideoEnabled: boolean = false;

  constructor(config: Partial<CollaborationConfig>) {
    this.config = {
      serverUrl: config.serverUrl || 'ws://localhost:8080',
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageQueueSize: config.messageQueueSize ?? 100,
      enableEncryption: config.enableEncryption ?? false,
      enableCompression: config.enableCompression ?? true,
      debugMode: config.debugMode ?? false,
      ...config
    };

    this.connectionStatus = {
      connected: false,
      reconnecting: false,
      latency: 0,
      quality: 'poor',
      errors: []
    };

    this.initialize();
  }

  /**
   * Initialize collaboration module
   */
  private initialize(): void {
    console.log('🤝 [CollaborationModule] Initializing...');
    
    // Setup event listener maps
    const eventTypes = ['connect', 'disconnect', 'message', 'user-join', 'user-leave', 'error', 'session-update'];
    eventTypes.forEach(type => {
      this.eventListeners.set(type, []);
    });

    console.log('🤝 [CollaborationModule] Initialized');
  }

  /**
   * Connect to collaboration server
   */
  public async connect(user: User): Promise<boolean> {
    try {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('🤝 [CollaborationModule] Already connected');
        return true;
      }

      console.log('🤝 [CollaborationModule] Connecting to server...');
      this.currentUser = user;

      // Create WebSocket connection
      this.socket = new WebSocket(`${this.config.serverUrl}?userId=${user.id}&apiKey=${this.config.apiKey}`);

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create WebSocket'));
          return;
        }

        this.socket.onopen = () => {
          console.log('🤝 [CollaborationModule] Connected to server');
          this.connectionStatus.connected = true;
          this.connectionStatus.reconnecting = false;
          this.connectionStatus.lastConnected = new Date().toISOString();
          this.reconnectAttempts = 0;

          // Start heartbeat
          this.startHeartbeat();

          // Send authentication
          this.sendMessage({
            id: `auth-${Date.now()}`,
            type: 'system',
            sessionId: '',
            sender: user,
            timestamp: new Date().toISOString(),
            content: {
              action: 'authenticate',
              user: user
            }
          });

          this.emit('connect', { user });
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket.onclose = (event) => {
          console.log('🤝 [CollaborationModule] Connection closed:', event.code, event.reason);
          this.connectionStatus.connected = false;
          this.stopHeartbeat();
          
          if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }

          this.emit('disconnect', { code: event.code, reason: event.reason });
        };

        this.socket.onerror = (error) => {
          console.error('🤝 [CollaborationModule] WebSocket error:', error);
          this.connectionStatus.errors.push(`WebSocket error: ${error}`);
          this.emit('error', { error });
          reject(error);
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });

    } catch (error) {
      console.error('🤝 [CollaborationModule] Connection failed:', error);
      this.connectionStatus.errors.push(`Connection failed: ${error}`);
      return false;
    }
  }

  /**
   * Disconnect from collaboration server
   */
  public disconnect(): void {
    console.log('🤝 [CollaborationModule] Disconnecting...');

    // Stop timers
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }

    // Close WebRTC connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    // Stop media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.connectionStatus.connected = false;
    this.currentSession = null;
  }

  /**
   * Create collaboration session
   */
  public async createSession(
    name: string,
    imageId: string,
    settings: Partial<SessionSettings> = {}
  ): Promise<CollaborationSession> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const session: CollaborationSession = {
      id: `session-${Date.now()}`,
      name,
      imageId,
      creator: this.currentUser,
      participants: [this.currentUser],
      invitedUsers: [],
      startTime: new Date().toISOString(),
      status: 'active',
      settings: {
        maxParticipants: 10,
        allowAnonymous: false,
        requireApproval: false,
        enableVoiceChat: true,
        enableVideoChat: true,
        enableScreenShare: true,
        enableRecording: false,
        autoSaveInterval: 30000,
        syncViewport: true,
        syncAnnotations: true,
        syncMeasurements: true,
        syncCursor: true,
        moderationEnabled: false,
        ...settings
      },
      metadata: {
        totalMessages: 0,
        totalAnnotations: 0,
        totalMeasurements: 0,
        recordingEnabled: false
      }
    };

    // Send session creation message
    await this.sendMessage({
      id: `create-session-${Date.now()}`,
      type: 'system',
      sessionId: session.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        action: 'create-session',
        session: session
      }
    });

    this.currentSession = session;
    console.log('🤝 [CollaborationModule] Created session:', session.id);

    return session;
  }

  /**
   * Join collaboration session
   */
  public async joinSession(sessionId: string): Promise<boolean> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      await this.sendMessage({
        id: `join-session-${Date.now()}`,
        type: 'system',
        sessionId,
        sender: this.currentUser,
        timestamp: new Date().toISOString(),
        content: {
          action: 'join-session',
          userId: this.currentUser.id
        }
      });

      console.log('🤝 [CollaborationModule] Joined session:', sessionId);
      return true;

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to join session:', error);
      return false;
    }
  }

  /**
   * Leave collaboration session
   */
  public async leaveSession(): Promise<boolean> {
    if (!this.currentSession || !this.currentUser) {
      return false;
    }

    try {
      await this.sendMessage({
        id: `leave-session-${Date.now()}`,
        type: 'system',
        sessionId: this.currentSession.id,
        sender: this.currentUser,
        timestamp: new Date().toISOString(),
        content: {
          action: 'leave-session',
          userId: this.currentUser.id
        }
      });

      this.currentSession = null;
      console.log('🤝 [CollaborationModule] Left session');
      return true;

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to leave session:', error);
      return false;
    }
  }

  /**
   * Send chat message
   */
  public async sendChatMessage(text: string, mentions?: string[], replyTo?: string): Promise<boolean> {
    if (!this.currentSession || !this.currentUser) {
      return false;
    }

    const message: ChatMessage = {
      id: `chat-${Date.now()}`,
      type: 'chat',
      sessionId: this.currentSession.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        text,
        mentions,
        replyTo
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Sync viewport state
   */
  public async syncViewport(
    zoom: number,
    pan: { x: number; y: number },
    rotation: number = 0,
    windowLevel?: { center: number; width: number },
    sliceIndex?: number
  ): Promise<boolean> {
    if (!this.currentSession || !this.currentUser || !this.currentSession.settings.syncViewport) {
      return false;
    }

    const message: ViewportSyncMessage = {
      id: `viewport-${Date.now()}`,
      type: 'viewport',
      sessionId: this.currentSession.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        zoom,
        pan,
        rotation,
        windowLevel: windowLevel || { center: 0, width: 100 },
        sliceIndex,
        timestamp: new Date().toISOString()
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Sync cursor position
   */
  public async syncCursor(
    position: { x: number; y: number },
    visible: boolean = true,
    action?: 'click' | 'drag' | 'hover'
  ): Promise<boolean> {
    if (!this.currentSession || !this.currentUser || !this.currentSession.settings.syncCursor) {
      return false;
    }

    const message: CursorSyncMessage = {
      id: `cursor-${Date.now()}`,
      type: 'cursor',
      sessionId: this.currentSession.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        position,
        visible,
        action
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Sync annotation changes
   */
  public async syncAnnotation(
    action: 'create' | 'update' | 'delete' | 'validate',
    annotationId: string,
    annotationData?: any,
    changes?: any
  ): Promise<boolean> {
    if (!this.currentSession || !this.currentUser || !this.currentSession.settings.syncAnnotations) {
      return false;
    }

    const message: AnnotationSyncMessage = {
      id: `annotation-${Date.now()}`,
      type: 'annotation',
      sessionId: this.currentSession.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        action,
        annotationId,
        annotationData,
        changes
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Sync measurement changes
   */
  public async syncMeasurement(
    action: 'create' | 'update' | 'delete' | 'validate',
    measurementId: string,
    measurementData?: any,
    changes?: any
  ): Promise<boolean> {
    if (!this.currentSession || !this.currentUser || !this.currentSession.settings.syncMeasurements) {
      return false;
    }

    const message: MeasurementSyncMessage = {
      id: `measurement-${Date.now()}`,
      type: 'measurement',
      sessionId: this.currentSession.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        action,
        measurementId,
        measurementData,
        changes
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Send message to server
   */
  private async sendMessage(message: CollaborationMessage): Promise<boolean> {
    try {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        // Queue message if not connected
        if (this.messageQueue.length < this.config.messageQueueSize) {
          this.messageQueue.push(message);
          console.log('🤝 [CollaborationModule] Message queued:', message.type);
        }
        return false;
      }

      // Compress message if enabled
      let messageData = JSON.stringify(message);
      if (this.config.enableCompression) {
        messageData = this.compressMessage(messageData);
      }

      // Encrypt message if enabled
      if (this.config.enableEncryption) {
        messageData = await this.encryptMessage(messageData);
      }

      this.socket.send(messageData);
      
      if (this.config.debugMode) {
        console.log('🤝 [CollaborationModule] Sent message:', message.type, message.id);
      }

      return true;

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      let messageData = event.data;

      // Decrypt message if needed
      if (this.config.enableEncryption) {
        messageData = await this.decryptMessage(messageData);
      }

      // Decompress message if needed
      if (this.config.enableCompression) {
        messageData = this.decompressMessage(messageData);
      }

      const message: CollaborationMessage = JSON.parse(messageData);

      if (this.config.debugMode) {
        console.log('🤝 [CollaborationModule] Received message:', message.type, message.id);
      }

      // Update latency
      if (message.type === 'system' && message.content.action === 'pong') {
        const now = Date.now();
        const sent = parseInt(message.content.timestamp);
        this.connectionStatus.latency = now - sent;
        this.updateConnectionQuality();
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'chat':
          this.handleChatMessage(message as ChatMessage);
          break;
        case 'viewport':
          this.handleViewportSync(message as ViewportSyncMessage);
          break;
        case 'cursor':
          this.handleCursorSync(message as CursorSyncMessage);
          break;
        case 'annotation':
          this.handleAnnotationSync(message as AnnotationSyncMessage);
          break;
        case 'measurement':
          this.handleMeasurementSync(message as MeasurementSyncMessage);
          break;
        case 'system':
          this.handleSystemMessage(message);
          break;
        case 'user-action':
          this.handleUserAction(message);
          break;
      }

      this.emit('message', message);

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to handle message:', error);
    }
  }

  /**
   * Handle chat message
   */
  private handleChatMessage(message: ChatMessage): void {
    if (this.currentSession) {
      this.currentSession.metadata.totalMessages++;
    }
    this.emit('chat-message', message);
  }

  /**
   * Handle viewport synchronization
   */
  private handleViewportSync(message: ViewportSyncMessage): void {
    // Don't sync our own viewport changes
    if (message.sender.id === this.currentUser?.id) {
      return;
    }

    this.emit('viewport-sync', message.content);
  }

  /**
   * Handle cursor synchronization
   */
  private handleCursorSync(message: CursorSyncMessage): void {
    // Don't sync our own cursor
    if (message.sender.id === this.currentUser?.id) {
      return;
    }

    this.emit('cursor-sync', {
      user: message.sender,
      ...message.content
    });
  }

  /**
   * Handle annotation synchronization
   */
  private handleAnnotationSync(message: AnnotationSyncMessage): void {
    if (this.currentSession && message.content.action === 'create') {
      this.currentSession.metadata.totalAnnotations++;
    }

    this.emit('annotation-sync', {
      user: message.sender,
      ...message.content
    });
  }

  /**
   * Handle measurement synchronization
   */
  private handleMeasurementSync(message: MeasurementSyncMessage): void {
    if (this.currentSession && message.content.action === 'create') {
      this.currentSession.metadata.totalMeasurements++;
    }

    this.emit('measurement-sync', {
      user: message.sender,
      ...message.content
    });
  }

  /**
   * Handle system messages
   */
  private handleSystemMessage(message: CollaborationMessage): void {
    const { action } = message.content;

    switch (action) {
      case 'user-joined':
        if (this.currentSession) {
          const user = message.content.user;
          if (!this.currentSession.participants.find(p => p.id === user.id)) {
            this.currentSession.participants.push(user);
          }
        }
        this.emit('user-join', message.content.user);
        break;

      case 'user-left':
        if (this.currentSession) {
          const userId = message.content.userId;
          this.currentSession.participants = this.currentSession.participants.filter(p => p.id !== userId);
        }
        this.emit('user-leave', message.content);
        break;

      case 'session-updated':
        if (this.currentSession && message.content.session.id === this.currentSession.id) {
          this.currentSession = { ...this.currentSession, ...message.content.session };
        }
        this.emit('session-update', message.content.session);
        break;

      case 'error':
        console.error('🤝 [CollaborationModule] Server error:', message.content.error);
        this.connectionStatus.errors.push(message.content.error);
        this.emit('error', message.content);
        break;
    }
  }

  /**
   * Handle user actions
   */
  private handleUserAction(message: CollaborationMessage): void {
    this.emit('user-action', {
      user: message.sender,
      action: message.content.action,
      data: message.content.data
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentUser) {
        this.sendMessage({
          id: `ping-${Date.now()}`,
          type: 'system',
          sessionId: this.currentSession?.id || '',
          sender: this.currentUser,
          timestamp: Date.now().toString(),
          content: {
            action: 'ping',
            timestamp: Date.now().toString()
          }
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.connectionStatus.reconnecting = true;
    this.reconnectAttempts++;

    console.log(`🤝 [CollaborationModule] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    this.reconnectTimer = window.setTimeout(async () => {
      if (this.currentUser) {
        try {
          await this.connect(this.currentUser);
          
          // Rejoin session if we were in one
          if (this.currentSession) {
            await this.joinSession(this.currentSession.id);
          }

          // Send queued messages
          await this.sendQueuedMessages();

        } catch (error) {
          console.error('🤝 [CollaborationModule] Reconnect failed:', error);
          
          if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            console.error('🤝 [CollaborationModule] Max reconnect attempts reached');
            this.connectionStatus.reconnecting = false;
          }
        }
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Send queued messages
   */
  private async sendQueuedMessages(): Promise<void> {
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      await this.sendMessage(message);
    }

    if (messages.length > 0) {
      console.log(`🤝 [CollaborationModule] Sent ${messages.length} queued messages`);
    }
  }

  /**
   * Update connection quality based on latency
   */
  private updateConnectionQuality(): void {
    const latency = this.connectionStatus.latency;
    
    if (latency < 100) {
      this.connectionStatus.quality = 'excellent';
    } else if (latency < 300) {
      this.connectionStatus.quality = 'good';
    } else if (latency < 1000) {
      this.connectionStatus.quality = 'fair';
    } else {
      this.connectionStatus.quality = 'poor';
    }
  }

  /**
   * Enable voice chat
   */
  public async enableVoiceChat(): Promise<boolean> {
    try {
      if (!this.currentSession?.settings.enableVoiceChat) {
        throw new Error('Voice chat not enabled for this session');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      this.localStream = stream;
      this.isVoiceEnabled = true;

      // Setup WebRTC connections for existing participants
      await this.setupWebRTCConnections();

      console.log('🤝 [CollaborationModule] Voice chat enabled');
      return true;

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to enable voice chat:', error);
      return false;
    }
  }

  /**
   * Enable video chat
   */
  public async enableVideoChat(): Promise<boolean> {
    try {
      if (!this.currentSession?.settings.enableVideoChat) {
        throw new Error('Video chat not enabled for this session');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });

      this.localStream = stream;
      this.isVideoEnabled = true;

      // Setup WebRTC connections for existing participants
      await this.setupWebRTCConnections();

      console.log('🤝 [CollaborationModule] Video chat enabled');
      return true;

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to enable video chat:', error);
      return false;
    }
  }

  /**
   * Setup WebRTC connections
   */
  private async setupWebRTCConnections(): Promise<void> {
    if (!this.currentSession || !this.localStream) return;

    for (const participant of this.currentSession.participants) {
      if (participant.id !== this.currentUser?.id) {
        await this.createPeerConnection(participant.id);
      }
    }
  }

  /**
   * Create WebRTC peer connection
   */
  private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      this.emit('remote-stream', {
        userId,
        stream: event.streams[0]
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentUser) {
        this.sendMessage({
          id: `ice-candidate-${Date.now()}`,
          type: 'system',
          sessionId: this.currentSession!.id,
          sender: this.currentUser,
          timestamp: new Date().toISOString(),
          content: {
            action: 'ice-candidate',
            targetUserId: userId,
            candidate: event.candidate
          }
        });
      }
    };

    this.peerConnections.set(userId, pc);
    return pc;
  }

  /**
   * Invite user to session
   */
  public async inviteUser(email: string): Promise<boolean> {
    if (!this.currentSession || !this.currentUser) {
      return false;
    }

    try {
      await this.sendMessage({
        id: `invite-user-${Date.now()}`,
        type: 'system',
        sessionId: this.currentSession.id,
        sender: this.currentUser,
        timestamp: new Date().toISOString(),
        content: {
          action: 'invite-user',
          email,
          sessionId: this.currentSession.id
        }
      });

      this.currentSession.invitedUsers.push(email);
      console.log('🤝 [CollaborationModule] Invited user:', email);
      return true;

    } catch (error) {
      console.error('🤝 [CollaborationModule] Failed to invite user:', error);
      return false;
    }
  }

  /**
   * Event listener management
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('🤝 [CollaborationModule] Event listener error:', error);
        }
      });
    }
  }

  /**
   * Utility methods
   */
  private compressMessage(message: string): string {
    // Simplified compression - would use proper compression library
    return btoa(message);
  }

  private decompressMessage(message: string): string {
    try {
      return atob(message);
    } catch {
      return message; // Return as-is if not compressed
    }
  }

  private async encryptMessage(message: string): Promise<string> {
    // Simplified encryption - would use proper encryption in production
    return btoa(message);
  }

  private async decryptMessage(message: string): Promise<string> {
    try {
      return atob(message);
    } catch {
      return message; // Return as-is if not encrypted
    }
  }

  /**
   * Get current session
   */
  public getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get session participants
   */
  public getParticipants(): User[] {
    return this.currentSession?.participants || [];
  }

  /**
   * Check if user has permission
   */
  public hasPermission(permission: keyof UserPermissions, userId?: string): boolean {
    const user = userId ? 
      this.currentSession?.participants.find(p => p.id === userId) : 
      this.currentUser;
    
    return user?.permissions[permission] || false;
  }

  /**
   * Update user status
   */
  public async updateUserStatus(status: User['status']): Promise<boolean> {
    if (!this.currentUser || !this.currentSession) {
      return false;
    }

    this.currentUser.status = status;
    this.currentUser.lastActivity = new Date().toISOString();

    return await this.sendMessage({
      id: `status-update-${Date.now()}`,
      type: 'system',
      sessionId: this.currentSession.id,
      sender: this.currentUser,
      timestamp: new Date().toISOString(),
      content: {
        action: 'status-update',
        status,
        lastActivity: this.currentUser.lastActivity
      }
    });
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.disconnect();
    this.eventListeners.clear();
    console.log('🤝 [CollaborationModule] Disposed');
  }
}

export { CollaborationModule };