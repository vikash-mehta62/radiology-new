/**
 * Real-time Collaboration Service
 * Provides multi-user editing, commenting, and real-time synchronization for reports
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  role: 'radiologist' | 'resident' | 'technologist' | 'admin' | 'viewer';
  avatar?: string;
  isOnline: boolean;
  lastSeen: string;
  currentSection?: string;
  cursorPosition?: {
    sectionId: string;
    fieldId: string;
    position: number;
  };
}

export interface CollaborationSession {
  id: string;
  reportId: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  participants: CollaborationUser[];
  permissions: {
    canEdit: string[];
    canComment: string[];
    canView: string[];
    canApprove: string[];
  };
  settings: {
    autoSave: boolean;
    conflictResolution: 'last_writer_wins' | 'merge' | 'manual';
    notificationLevel: 'all' | 'mentions' | 'none';
  };
}

export interface RealtimeEdit {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  type: 'insert' | 'delete' | 'replace' | 'format';
  sectionId: string;
  fieldId: string;
  position: number;
  content: string;
  length?: number;
  metadata?: {
    source: 'typing' | 'voice' | 'ai' | 'paste';
    confidence?: number;
  };
}

export interface Comment {
  id: string;
  reportId: string;
  sectionId: string;
  fieldId?: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  replies: CommentReply[];
  mentions: string[];
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  position?: {
    start: number;
    end: number;
  };
}

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  mentions: string[];
}

export interface VersionHistory {
  id: string;
  reportId: string;
  version: number;
  createdBy: string;
  createdAt: string;
  description: string;
  changes: Array<{
    type: 'field_added' | 'field_removed' | 'field_modified' | 'section_added' | 'section_removed';
    sectionId: string;
    fieldId?: string;
    oldValue?: any;
    newValue?: any;
  }>;
  snapshot: any; // Full report data at this version
}

export interface ConflictResolution {
  id: string;
  reportId: string;
  sectionId: string;
  fieldId: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'permission_change';
  users: string[];
  versions: Array<{
    userId: string;
    content: string;
    timestamp: string;
  }>;
  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    chosenVersion: string;
    mergedContent?: string;
  };
}

class CollaborationService {
  private baseUrl = '/api/collaboration';
  private websocket: WebSocket | null = null;
  private currentSession: CollaborationSession | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Start a collaboration session for a report
   */
  async startCollaborationSession(reportId: string, permissions?: Partial<CollaborationSession['permissions']>): Promise<CollaborationSession> {
    try {
      console.log('🤝 Starting collaboration session for report:', reportId);

      const response = await apiService.post<CollaborationSession>(`${this.baseUrl}/sessions`, {
        reportId,
        permissions: {
          canEdit: [],
          canComment: [],
          canView: [],
          canApprove: [],
          ...permissions
        },
        settings: {
          autoSave: true,
          conflictResolution: 'last_writer_wins',
          notificationLevel: 'mentions'
        }
      });

      this.currentSession = response;

      // Establish WebSocket connection
      await this.connectWebSocket(response.id);

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: `Collaboration session started for report ${reportId}`,
        resource_type: 'Report',
        resource_id: reportId,
        report_id: reportId,
        metadata: {
          action_details: {
            session_id: response.id,
            participants_count: response.participants.length
          }
        }
      });

      console.log('✅ Collaboration session started:', response.id);
      return response;
    } catch (error) {
      console.error('❌ Failed to start collaboration session:', error);
      throw new Error('Failed to start collaboration session. Please try again.');
    }
  }

  /**
   * Join an existing collaboration session
   */
  async joinCollaborationSession(sessionId: string): Promise<CollaborationSession> {
    try {
      console.log('🚪 Joining collaboration session:', sessionId);

      const response = await apiService.post<CollaborationSession>(`${this.baseUrl}/sessions/${sessionId}/join`);
      
      this.currentSession = response;

      // Establish WebSocket connection
      await this.connectWebSocket(sessionId);

      console.log('✅ Joined collaboration session successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to join collaboration session:', error);
      throw new Error('Failed to join collaboration session. Please check the session ID and try again.');
    }
  }

  /**
   * Leave the current collaboration session
   */
  async leaveCollaborationSession(): Promise<void> {
    try {
      if (!this.currentSession) {
        return;
      }

      console.log('🚪 Leaving collaboration session:', this.currentSession.id);

      await apiService.post(`${this.baseUrl}/sessions/${this.currentSession.id}/leave`);

      // Close WebSocket connection
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      this.currentSession = null;
      console.log('✅ Left collaboration session successfully');
    } catch (error) {
      console.error('❌ Failed to leave collaboration session:', error);
      throw new Error('Failed to leave collaboration session.');
    }
  }

  /**
   * Establish WebSocket connection for real-time updates
   */
  private async connectWebSocket(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/collaboration/${sessionId}`;
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          console.log('🔌 WebSocket connected for collaboration');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.websocket.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code);
          this.handleWebSocketClose();
        };

        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(data: any): void {
    const { type, payload } = data;

    switch (type) {
      case 'user_joined':
        this.emit('userJoined', payload);
        break;
      case 'user_left':
        this.emit('userLeft', payload);
        break;
      case 'realtime_edit':
        this.emit('realtimeEdit', payload);
        break;
      case 'cursor_position':
        this.emit('cursorPosition', payload);
        break;
      case 'comment_added':
        this.emit('commentAdded', payload);
        break;
      case 'comment_resolved':
        this.emit('commentResolved', payload);
        break;
      case 'conflict_detected':
        this.emit('conflictDetected', payload);
        break;
      case 'session_updated':
        this.currentSession = payload;
        this.emit('sessionUpdated', payload);
        break;
      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleWebSocketClose(): void {
    if (this.currentSession && this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connectWebSocket(this.currentSession!.id).catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connectionLost', {});
    }
  }

  /**
   * Send real-time edit
   */
  async sendRealtimeEdit(edit: Omit<RealtimeEdit, 'id' | 'sessionId' | 'timestamp'>): Promise<void> {
    try {
      if (!this.currentSession || !this.websocket) {
        throw new Error('No active collaboration session');
      }

      const editData = {
        ...edit,
        sessionId: this.currentSession.id,
        timestamp: new Date().toISOString()
      };

      // Send via WebSocket for real-time updates
      this.websocket.send(JSON.stringify({
        type: 'realtime_edit',
        payload: editData
      }));

      // Also send to API for persistence
      await apiService.post(`${this.baseUrl}/sessions/${this.currentSession.id}/edits`, editData);
    } catch (error) {
      console.error('❌ Failed to send real-time edit:', error);
      throw new Error('Failed to send edit. Please try again.');
    }
  }

  /**
   * Update cursor position
   */
  updateCursorPosition(position: CollaborationUser['cursorPosition']): void {
    if (!this.currentSession || !this.websocket) {
      return;
    }

    this.websocket.send(JSON.stringify({
      type: 'cursor_position',
      payload: {
        sessionId: this.currentSession.id,
        position
      }
    }));
  }

  /**
   * Add a comment
   */
  async addComment(comment: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'isResolved'>): Promise<Comment> {
    try {
      if (!this.currentSession) {
        throw new Error('No active collaboration session');
      }

      console.log('💬 Adding comment to report:', comment.reportId);

      const response = await apiService.post<Comment>(`${this.baseUrl}/comments`, {
        ...comment,
        sessionId: this.currentSession.id
      });

      // Send via WebSocket for real-time updates
      if (this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'comment_added',
          payload: response
        }));
      }

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: `Comment added to report ${comment.reportId}`,
        resource_type: 'Report',
        resource_id: comment.reportId,
        report_id: comment.reportId,
        metadata: {
          action_details: {
            comment_id: response.id,
            section_id: comment.sectionId,
            field_id: comment.fieldId,
            mentions: comment.mentions
          }
        }
      });

      console.log('✅ Comment added successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to add comment:', error);
      throw new Error('Failed to add comment. Please try again.');
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, reply: Omit<CommentReply, 'id' | 'timestamp'>): Promise<CommentReply> {
    try {
      console.log('💬 Replying to comment:', commentId);

      const response = await apiService.post<CommentReply>(`${this.baseUrl}/comments/${commentId}/replies`, reply);

      console.log('✅ Comment reply added successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to reply to comment:', error);
      throw new Error('Failed to reply to comment. Please try again.');
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string): Promise<Comment> {
    try {
      console.log('✅ Resolving comment:', commentId);

      const response = await apiService.put<Comment>(`${this.baseUrl}/comments/${commentId}/resolve`);

      // Send via WebSocket for real-time updates
      if (this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'comment_resolved',
          payload: response
        }));
      }

      console.log('✅ Comment resolved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to resolve comment:', error);
      throw new Error('Failed to resolve comment. Please try again.');
    }
  }

  /**
   * Get comments for a report
   */
  async getComments(reportId: string, filters?: {
    sectionId?: string;
    isResolved?: boolean;
    userId?: string;
  }): Promise<Comment[]> {
    try {
      const queryParams = new URLSearchParams({ reportId });
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await apiService.get<{ comments: Comment[] }>(`${this.baseUrl}/comments?${queryParams}`);
      return response.comments;
    } catch (error) {
      console.error('❌ Failed to fetch comments:', error);
      throw new Error('Failed to load comments. Please try again.');
    }
  }

  /**
   * Get version history for a report
   */
  async getVersionHistory(reportId: string): Promise<VersionHistory[]> {
    try {
      const response = await apiService.get<{ versions: VersionHistory[] }>(`${this.baseUrl}/reports/${reportId}/versions`);
      return response.versions;
    } catch (error) {
      console.error('❌ Failed to fetch version history:', error);
      throw new Error('Failed to load version history. Please try again.');
    }
  }

  /**
   * Create a new version
   */
  async createVersion(reportId: string, description: string): Promise<VersionHistory> {
    try {
      console.log('📝 Creating new version for report:', reportId);

      const response = await apiService.post<VersionHistory>(`${this.baseUrl}/reports/${reportId}/versions`, {
        description
      });

      console.log('✅ Version created successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to create version:', error);
      throw new Error('Failed to create version. Please try again.');
    }
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(reportId: string, versionId: string): Promise<void> {
    try {
      console.log('🔄 Restoring version:', versionId);

      await apiService.post(`${this.baseUrl}/reports/${reportId}/versions/${versionId}/restore`);

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: `Version ${versionId} restored for report ${reportId}`,
        resource_type: 'Report',
        resource_id: reportId,
        report_id: reportId,
        metadata: {
          action_details: {
            version_id: versionId,
            action: 'restore'
          }
        }
      });

      console.log('✅ Version restored successfully');
    } catch (error) {
      console.error('❌ Failed to restore version:', error);
      throw new Error('Failed to restore version. Please try again.');
    }
  }

  /**
   * Get active conflicts
   */
  async getConflicts(reportId: string): Promise<ConflictResolution[]> {
    try {
      const response = await apiService.get<{ conflicts: ConflictResolution[] }>(`${this.baseUrl}/reports/${reportId}/conflicts`);
      return response.conflicts;
    } catch (error) {
      console.error('❌ Failed to fetch conflicts:', error);
      throw new Error('Failed to load conflicts. Please try again.');
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(conflictId: string, resolution: {
    chosenVersion?: string;
    mergedContent?: string;
  }): Promise<ConflictResolution> {
    try {
      console.log('🔧 Resolving conflict:', conflictId);

      const response = await apiService.put<ConflictResolution>(`${this.baseUrl}/conflicts/${conflictId}/resolve`, resolution);

      console.log('✅ Conflict resolved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to resolve conflict:', error);
      throw new Error('Failed to resolve conflict. Please try again.');
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  /**
   * Update session permissions
   */
  async updateSessionPermissions(permissions: Partial<CollaborationSession['permissions']>): Promise<CollaborationSession> {
    try {
      if (!this.currentSession) {
        throw new Error('No active collaboration session');
      }

      const response = await apiService.put<CollaborationSession>(`${this.baseUrl}/sessions/${this.currentSession.id}/permissions`, permissions);
      
      this.currentSession = response;
      return response;
    } catch (error) {
      console.error('❌ Failed to update session permissions:', error);
      throw new Error('Failed to update permissions. Please try again.');
    }
  }

  /**
   * Event handling
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('❌ Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Get collaboration statistics
   */
  async getCollaborationStats(reportId: string): Promise<{
    totalSessions: number;
    totalParticipants: number;
    totalComments: number;
    totalEdits: number;
    averageSessionDuration: number;
    mostActiveUsers: Array<{ userId: string; userName: string; editCount: number }>;
  }> {
    try {
      const response = await apiService.get<any>(`${this.baseUrl}/reports/${reportId}/stats`);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch collaboration stats:', error);
      throw new Error('Failed to load collaboration statistics. Please try again.');
    }
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;