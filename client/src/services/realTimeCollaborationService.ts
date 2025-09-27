/**
 * Real-time Collaboration Service
 * Multi-user editing capabilities for teaching hospitals
 */

import { io, Socket } from 'socket.io-client';
import { environmentService } from '../config/environment';

interface CollaborationUser {
  id: string;
  name: string;
  role: 'attending' | 'resident' | 'fellow' | 'student';
  avatar?: string;
  cursor?: { x: number; y: number };
  currentField?: string;
  isActive: boolean;
  lastSeen: Date;
}

interface CollaborationSession {
  id: string;
  reportId: string;
  studyId: string;
  users: CollaborationUser[];
  createdAt: Date;
  isActive: boolean;
  permissions: {
    [userId: string]: {
      canEdit: boolean;
      canComment: boolean;
      canApprove: boolean;
      canSign: boolean;
    };
  };
}

interface CollaborationEvent {
  type: 'field_change' | 'cursor_move' | 'comment_add' | 'user_join' | 'user_leave' | 'approval_request';
  userId: string;
  timestamp: Date;
  data: any;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  field: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies: Comment[];
}

interface ApprovalRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  field: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
  comments?: string;
}

class RealTimeCollaborationService {
  private socket: Socket | null = null;
  private currentSession: CollaborationSession | null = null;
  private currentUser: CollaborationUser | null = null;
  private eventHandlers: { [key: string]: Function[] } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const serverUrl = environmentService.getCollaborationUrl() || 'http://localhost:8001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupSocketEventHandlers();
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.reconnectAttempts = 0;
      this.emit('connection_established');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from collaboration server:', reason);
      this.emit('connection_lost', { reason });
      this.handleReconnection();
    });

    this.socket.on('user_joined', (user: CollaborationUser) => {
      if (this.currentSession) {
        this.currentSession.users.push(user);
        this.emit('user_joined', user);
      }
    });

    this.socket.on('user_left', (userId: string) => {
      if (this.currentSession) {
        this.currentSession.users = this.currentSession.users.filter(u => u.id !== userId);
        this.emit('user_left', { userId });
      }
    });

    this.socket.on('field_changed', (data: { userId: string; field: string; value: string; cursor: number }) => {
      this.emit('field_changed', data);
    });

    this.socket.on('cursor_moved', (data: { userId: string; field: string; position: number }) => {
      this.emit('cursor_moved', data);
    });

    this.socket.on('comment_added', (comment: Comment) => {
      this.emit('comment_added', comment);
    });

    this.socket.on('approval_requested', (request: ApprovalRequest) => {
      this.emit('approval_requested', request);
    });

    this.socket.on('approval_responded', (response: { requestId: string; status: string; comments?: string }) => {
      this.emit('approval_responded', response);
    });

    this.socket.on('session_updated', (session: CollaborationSession) => {
      this.currentSession = session;
      this.emit('session_updated', session);
    });

    this.socket.on('error', (error: any) => {
      console.error('Collaboration socket error:', error);
      this.emit('error', error);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, delay);
    } else {
      this.emit('connection_failed');
    }
  }

  // Public methods
  public async joinSession(reportId: string, user: CollaborationUser): Promise<CollaborationSession> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.currentUser = user;
      
      this.socket.emit('join_session', { reportId, user }, (response: any) => {
        if (response.success) {
          this.currentSession = response.session;
          resolve(response.session);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  public leaveSession(): void {
    if (this.socket && this.currentSession) {
      this.socket.emit('leave_session', { sessionId: this.currentSession.id });
      this.currentSession = null;
    }
  }

  public updateField(field: string, value: string, cursorPosition: number): void {
    if (this.socket && this.currentSession && this.currentUser) {
      this.socket.emit('field_change', {
        sessionId: this.currentSession.id,
        userId: this.currentUser.id,
        field,
        value,
        cursorPosition
      });
    }
  }

  public updateCursor(field: string, position: number): void {
    if (this.socket && this.currentSession && this.currentUser) {
      this.socket.emit('cursor_move', {
        sessionId: this.currentSession.id,
        userId: this.currentUser.id,
        field,
        position
      });
    }
  }

  public addComment(field: string, content: string): Promise<Comment> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.currentSession || !this.currentUser) {
        reject(new Error('Not connected to collaboration session'));
        return;
      }

      const comment: Partial<Comment> = {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        field,
        content,
        timestamp: new Date(),
        resolved: false,
        replies: []
      };

      this.socket.emit('add_comment', {
        sessionId: this.currentSession.id,
        comment
      }, (response: any) => {
        if (response.success) {
          resolve(response.comment);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  public requestApproval(toUserId: string, field: string, content: string): Promise<ApprovalRequest> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.currentSession || !this.currentUser) {
        reject(new Error('Not connected to collaboration session'));
        return;
      }

      const request: Partial<ApprovalRequest> = {
        fromUserId: this.currentUser.id,
        toUserId,
        field,
        content,
        status: 'pending',
        timestamp: new Date()
      };

      this.socket.emit('request_approval', {
        sessionId: this.currentSession.id,
        request
      }, (response: any) => {
        if (response.success) {
          resolve(response.request);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  public respondToApproval(requestId: string, status: 'approved' | 'rejected', comments?: string): void {
    if (this.socket && this.currentSession) {
      this.socket.emit('respond_approval', {
        sessionId: this.currentSession.id,
        requestId,
        status,
        comments
      });
    }
  }

  public getActiveUsers(): CollaborationUser[] {
    return this.currentSession?.users.filter(u => u.isActive) || [];
  }

  public getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getUserPermissions(userId: string): any {
    return this.currentSession?.permissions[userId] || {
      canEdit: false,
      canComment: true,
      canApprove: false,
      canSign: false
    };
  }

  // Event handling
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  public off(event: string, handler: Function): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  // Teaching-specific features
  public startTeachingSession(studentIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.currentSession) {
        reject(new Error('Not connected to collaboration session'));
        return;
      }

      this.socket.emit('start_teaching_session', {
        sessionId: this.currentSession.id,
        studentIds
      }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  public highlightField(field: string, duration: number = 3000): void {
    if (this.socket && this.currentSession) {
      this.socket.emit('highlight_field', {
        sessionId: this.currentSession.id,
        field,
        duration
      });
    }
  }

  public shareScreen(screenData: any): void {
    if (this.socket && this.currentSession) {
      this.socket.emit('share_screen', {
        sessionId: this.currentSession.id,
        screenData
      });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentSession = null;
    this.currentUser = null;
  }
}

export const realTimeCollaborationService = new RealTimeCollaborationService();
export default realTimeCollaborationService;