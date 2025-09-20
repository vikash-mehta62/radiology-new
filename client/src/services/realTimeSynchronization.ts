/**
 * Real-Time Synchronization Service
 * Handles viewport, annotation, and measurement synchronization across multiple users
 */

import { CollaborationModule, User, ViewportSyncMessage, CursorSyncMessage } from './collaborationModule';
import { Annotation } from './annotationSystem';
import { Measurement } from './measurementTools';

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  windowLevel: { center: number; width: number };
  sliceIndex: number;
  timestamp: string;
  userId: string;
}

export interface CursorState {
  userId: string;
  position: { x: number; y: number };
  visible: boolean;
  action?: 'click' | 'drag' | 'hover';
  color: string;
  name: string;
  timestamp: string;
}

export interface SyncConflict {
  id: string;
  type: 'annotation' | 'measurement' | 'viewport';
  objectId: string;
  conflictingUsers: User[];
  timestamp: string;
  resolved: boolean;
  resolution?: 'merge' | 'override' | 'manual';
  resolvedBy?: string;
}

export interface SyncStatistics {
  totalSyncEvents: number;
  syncEventsByType: { [type: string]: number };
  averageLatency: number;
  conflictsResolved: number;
  lastSyncTime: string;
  participantCount: number;
}

export interface SyncSettings {
  enableViewportSync: boolean;
  enableAnnotationSync: boolean;
  enableMeasurementSync: boolean;
  enableCursorSync: boolean;
  conflictResolution: 'automatic' | 'manual' | 'priority-based';
  syncThrottleMs: number;
  maxSyncHistory: number;
  enableOptimisticUpdates: boolean;
  enableConflictDetection: boolean;
}

class RealTimeSynchronization {
  private collaborationModule: CollaborationModule;
  private settings: SyncSettings;
  private viewportState: ViewportState | null = null;
  private cursorStates: Map<string, CursorState> = new Map();
  private syncHistory: any[] = [];
  private conflicts: Map<string, SyncConflict> = new Map();
  private statistics: SyncStatistics;
  private syncThrottleTimers: Map<string, number> = new Map();
  private pendingOperations: Map<string, any> = new Map();

  // Event callbacks
  private onViewportSyncCallback?: (state: ViewportState) => void;
  private onCursorSyncCallback?: (cursors: CursorState[]) => void;
  private onAnnotationSyncCallback?: (action: string, data: any) => void;
  private onMeasurementSyncCallback?: (action: string, data: any) => void;
  private onConflictCallback?: (conflict: SyncConflict) => void;

  constructor(collaborationModule: CollaborationModule, settings: Partial<SyncSettings> = {}) {
    this.collaborationModule = collaborationModule;
    
    this.settings = {
      enableViewportSync: true,
      enableAnnotationSync: true,
      enableMeasurementSync: true,
      enableCursorSync: true,
      conflictResolution: 'automatic',
      syncThrottleMs: 100,
      maxSyncHistory: 1000,
      enableOptimisticUpdates: true,
      enableConflictDetection: true,
      ...settings
    };

    this.statistics = {
      totalSyncEvents: 0,
      syncEventsByType: {},
      averageLatency: 0,
      conflictsResolved: 0,
      lastSyncTime: '',
      participantCount: 0
    };

    this.initialize();
  }

  /**
   * Initialize synchronization service
   */
  private initialize(): void {
    console.log('🔄 [RealTimeSynchronization] Initializing...');

    // Setup collaboration module event listeners
    this.collaborationModule.on('viewport-sync', (data: any) => {
      this.handleViewportSync(data);
    });

    this.collaborationModule.on('cursor-sync', (data: any) => {
      this.handleCursorSync(data);
    });

    this.collaborationModule.on('annotation-sync', (data: any) => {
      this.handleAnnotationSync(data);
    });

    this.collaborationModule.on('measurement-sync', (data: any) => {
      this.handleMeasurementSync(data);
    });

    this.collaborationModule.on('user-join', (user: User) => {
      this.handleUserJoin(user);
    });

    this.collaborationModule.on('user-leave', (data: any) => {
      this.handleUserLeave(data.userId);
    });

    console.log('🔄 [RealTimeSynchronization] Initialized');
  }

  /**
   * Sync viewport state
   */
  public syncViewport(
    zoom: number,
    pan: { x: number; y: number },
    rotation: number = 0,
    windowLevel: { center: number; width: number },
    sliceIndex: number = 0
  ): void {
    if (!this.settings.enableViewportSync) return;

    const currentUser = this.collaborationModule.getCurrentUser();
    if (!currentUser) return;

    // Throttle viewport sync to avoid flooding
    const throttleKey = 'viewport';
    if (this.syncThrottleTimers.has(throttleKey)) {
      clearTimeout(this.syncThrottleTimers.get(throttleKey));
    }

    this.syncThrottleTimers.set(throttleKey, window.setTimeout(() => {
      const viewportState: ViewportState = {
        zoom,
        pan,
        rotation,
        windowLevel,
        sliceIndex,
        timestamp: new Date().toISOString(),
        userId: currentUser.id
      };

      // Update local state
      this.viewportState = viewportState;

      // Send to other participants
      this.collaborationModule.syncViewport(zoom, pan, rotation, windowLevel, sliceIndex);

      // Add to sync history
      this.addToSyncHistory('viewport', viewportState);

      console.log('🔄 [RealTimeSynchronization] Synced viewport state');
    }, this.settings.syncThrottleMs));
  }

  /**
   * Sync cursor position
   */
  public syncCursor(
    position: { x: number; y: number },
    visible: boolean = true,
    action?: 'click' | 'drag' | 'hover'
  ): void {
    if (!this.settings.enableCursorSync) return;

    const currentUser = this.collaborationModule.getCurrentUser();
    if (!currentUser) return;

    // Throttle cursor sync
    const throttleKey = 'cursor';
    if (this.syncThrottleTimers.has(throttleKey)) {
      clearTimeout(this.syncThrottleTimers.get(throttleKey));
    }

    this.syncThrottleTimers.set(throttleKey, window.setTimeout(() => {
      this.collaborationModule.syncCursor(position, visible, action);
    }, Math.min(this.settings.syncThrottleMs, 50))); // Faster throttling for cursor
  }

  /**
   * Sync annotation changes
   */
  public syncAnnotation(
    action: 'create' | 'update' | 'delete' | 'validate',
    annotation: Annotation,
    changes?: any
  ): void {
    if (!this.settings.enableAnnotationSync) return;

    const currentUser = this.collaborationModule.getCurrentUser();
    if (!currentUser) return;

    // Check for conflicts if enabled
    if (this.settings.enableConflictDetection && action === 'update') {
      const conflict = this.detectAnnotationConflict(annotation, currentUser);
      if (conflict) {
        this.handleConflict(conflict);
        return;
      }
    }

    // Apply optimistic update if enabled
    if (this.settings.enableOptimisticUpdates) {
      this.applyOptimisticUpdate('annotation', annotation.id, { action, annotation, changes });
    }

    // Send sync message
    this.collaborationModule.syncAnnotation(action, annotation.id, annotation, changes);

    // Add to sync history
    this.addToSyncHistory('annotation', { action, annotation, changes, userId: currentUser.id });

    console.log('🔄 [RealTimeSynchronization] Synced annotation:', action, annotation.id);
  }

  /**
   * Sync measurement changes
   */
  public syncMeasurement(
    action: 'create' | 'update' | 'delete' | 'validate',
    measurement: Measurement,
    changes?: any
  ): void {
    if (!this.settings.enableMeasurementSync) return;

    const currentUser = this.collaborationModule.getCurrentUser();
    if (!currentUser) return;

    // Check for conflicts if enabled
    if (this.settings.enableConflictDetection && action === 'update') {
      const conflict = this.detectMeasurementConflict(measurement, currentUser);
      if (conflict) {
        this.handleConflict(conflict);
        return;
      }
    }

    // Apply optimistic update if enabled
    if (this.settings.enableOptimisticUpdates) {
      this.applyOptimisticUpdate('measurement', measurement.id, { action, measurement, changes });
    }

    // Send sync message
    this.collaborationModule.syncMeasurement(action, measurement.id, measurement, changes);

    // Add to sync history
    this.addToSyncHistory('measurement', { action, measurement, changes, userId: currentUser.id });

    console.log('🔄 [RealTimeSynchronization] Synced measurement:', action, measurement.id);
  }

  /**
   * Handle incoming viewport sync
   */
  private handleViewportSync(data: ViewportState): void {
    // Don't apply our own viewport changes
    const currentUser = this.collaborationModule.getCurrentUser();
    if (currentUser && data.userId === currentUser.id) {
      return;
    }

    // Update viewport state
    this.viewportState = data;

    // Notify callback
    if (this.onViewportSyncCallback) {
      this.onViewportSyncCallback(data);
    }

    // Update statistics
    this.updateStatistics('viewport');

    console.log('🔄 [RealTimeSynchronization] Received viewport sync from user:', data.userId);
  }

  /**
   * Handle incoming cursor sync
   */
  private handleCursorSync(data: any): void {
    const { user, position, visible, action } = data;

    // Don't show our own cursor
    const currentUser = this.collaborationModule.getCurrentUser();
    if (currentUser && user.id === currentUser.id) {
      return;
    }

    const cursorState: CursorState = {
      userId: user.id,
      position,
      visible,
      action,
      color: user.color,
      name: user.name,
      timestamp: new Date().toISOString()
    };

    // Update cursor state
    if (visible) {
      this.cursorStates.set(user.id, cursorState);
    } else {
      this.cursorStates.delete(user.id);
    }

    // Notify callback
    if (this.onCursorSyncCallback) {
      this.onCursorSyncCallback(Array.from(this.cursorStates.values()));
    }

    // Update statistics
    this.updateStatistics('cursor');
  }

  /**
   * Handle incoming annotation sync
   */
  private handleAnnotationSync(data: any): void {
    const { user, action, annotationId, annotationData, changes } = data;

    // Don't apply our own changes if optimistic updates are enabled
    const currentUser = this.collaborationModule.getCurrentUser();
    if (this.settings.enableOptimisticUpdates && currentUser && user.id === currentUser.id) {
      // Remove from pending operations
      this.pendingOperations.delete(`annotation-${annotationId}`);
      return;
    }

    // Check for conflicts
    if (this.settings.enableConflictDetection && action === 'update') {
      const existingOperation = this.pendingOperations.get(`annotation-${annotationId}`);
      if (existingOperation && existingOperation.userId !== user.id) {
        const conflict = this.createConflict('annotation', annotationId, [user, existingOperation.user]);
        this.handleConflict(conflict);
        return;
      }
    }

    // Apply the change
    if (this.onAnnotationSyncCallback) {
      this.onAnnotationSyncCallback(action, { annotationId, annotationData, changes, user });
    }

    // Add to sync history
    this.addToSyncHistory('annotation', { action, annotationId, annotationData, changes, userId: user.id });

    // Update statistics
    this.updateStatistics('annotation');

    console.log('🔄 [RealTimeSynchronization] Received annotation sync:', action, annotationId, 'from user:', user.name);
  }

  /**
   * Handle incoming measurement sync
   */
  private handleMeasurementSync(data: any): void {
    const { user, action, measurementId, measurementData, changes } = data;

    // Don't apply our own changes if optimistic updates are enabled
    const currentUser = this.collaborationModule.getCurrentUser();
    if (this.settings.enableOptimisticUpdates && currentUser && user.id === currentUser.id) {
      // Remove from pending operations
      this.pendingOperations.delete(`measurement-${measurementId}`);
      return;
    }

    // Check for conflicts
    if (this.settings.enableConflictDetection && action === 'update') {
      const existingOperation = this.pendingOperations.get(`measurement-${measurementId}`);
      if (existingOperation && existingOperation.userId !== user.id) {
        const conflict = this.createConflict('measurement', measurementId, [user, existingOperation.user]);
        this.handleConflict(conflict);
        return;
      }
    }

    // Apply the change
    if (this.onMeasurementSyncCallback) {
      this.onMeasurementSyncCallback(action, { measurementId, measurementData, changes, user });
    }

    // Add to sync history
    this.addToSyncHistory('measurement', { action, measurementId, measurementData, changes, userId: user.id });

    // Update statistics
    this.updateStatistics('measurement');

    console.log('🔄 [RealTimeSynchronization] Received measurement sync:', action, measurementId, 'from user:', user.name);
  }

  /**
   * Handle user join
   */
  private handleUserJoin(user: User): void {
    console.log('🔄 [RealTimeSynchronization] User joined:', user.name);
    
    // Send current viewport state to new user
    if (this.viewportState && this.settings.enableViewportSync) {
      // This would typically be handled by the server to send state to the new user
    }

    this.statistics.participantCount = this.collaborationModule.getParticipants().length;
  }

  /**
   * Handle user leave
   */
  private handleUserLeave(userId: string): void {
    console.log('🔄 [RealTimeSynchronization] User left:', userId);
    
    // Remove cursor state
    this.cursorStates.delete(userId);
    
    // Notify cursor callback
    if (this.onCursorSyncCallback) {
      this.onCursorSyncCallback(Array.from(this.cursorStates.values()));
    }

    // Remove pending operations for this user
    for (const [key, operation] of this.pendingOperations.entries()) {
      if (operation.userId === userId) {
        this.pendingOperations.delete(key);
      }
    }

    this.statistics.participantCount = this.collaborationModule.getParticipants().length;
  }

  /**
   * Detect annotation conflict
   */
  private detectAnnotationConflict(annotation: Annotation, user: User): SyncConflict | null {
    const pendingKey = `annotation-${annotation.id}`;
    const existingOperation = this.pendingOperations.get(pendingKey);
    
    if (existingOperation && existingOperation.userId !== user.id) {
      return this.createConflict('annotation', annotation.id, [user, existingOperation.user]);
    }
    
    return null;
  }

  /**
   * Detect measurement conflict
   */
  private detectMeasurementConflict(measurement: Measurement, user: User): SyncConflict | null {
    const pendingKey = `measurement-${measurement.id}`;
    const existingOperation = this.pendingOperations.get(pendingKey);
    
    if (existingOperation && existingOperation.userId !== user.id) {
      return this.createConflict('measurement', measurement.id, [user, existingOperation.user]);
    }
    
    return null;
  }

  /**
   * Create conflict object
   */
  private createConflict(
    type: 'annotation' | 'measurement' | 'viewport',
    objectId: string,
    conflictingUsers: User[]
  ): SyncConflict {
    const conflict: SyncConflict = {
      id: `conflict-${Date.now()}`,
      type,
      objectId,
      conflictingUsers,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  /**
   * Handle conflict
   */
  private handleConflict(conflict: SyncConflict): void {
    console.warn('🔄 [RealTimeSynchronization] Conflict detected:', conflict);

    // Notify callback
    if (this.onConflictCallback) {
      this.onConflictCallback(conflict);
    }

    // Auto-resolve based on settings
    if (this.settings.conflictResolution === 'automatic') {
      this.resolveConflictAutomatically(conflict);
    } else if (this.settings.conflictResolution === 'priority-based') {
      this.resolveConflictByPriority(conflict);
    }
    // Manual resolution requires user intervention
  }

  /**
   * Resolve conflict automatically (last writer wins)
   */
  private resolveConflictAutomatically(conflict: SyncConflict): void {
    // Simple last-writer-wins resolution
    conflict.resolved = true;
    conflict.resolution = 'override';
    conflict.resolvedBy = 'system';

    this.statistics.conflictsResolved++;
    console.log('🔄 [RealTimeSynchronization] Conflict auto-resolved:', conflict.id);
  }

  /**
   * Resolve conflict by user priority
   */
  private resolveConflictByPriority(conflict: SyncConflict): void {
    // Resolve based on user role priority
    const rolePriority = {
      'radiologist': 4,
      'resident': 3,
      'technician': 2,
      'student': 1,
      'observer': 0
    };

    const highestPriorityUser = conflict.conflictingUsers.reduce((prev, current) => {
      return rolePriority[prev.role] > rolePriority[current.role] ? prev : current;
    });

    conflict.resolved = true;
    conflict.resolution = 'override';
    conflict.resolvedBy = highestPriorityUser.id;

    this.statistics.conflictsResolved++;
    console.log('🔄 [RealTimeSynchronization] Conflict resolved by priority:', conflict.id, 'winner:', highestPriorityUser.name);
  }

  /**
   * Apply optimistic update
   */
  private applyOptimisticUpdate(type: string, objectId: string, operation: any): void {
    const key = `${type}-${objectId}`;
    this.pendingOperations.set(key, {
      ...operation,
      timestamp: new Date().toISOString()
    });

    // Clean up old pending operations
    setTimeout(() => {
      this.pendingOperations.delete(key);
    }, 10000); // 10 second timeout
  }

  /**
   * Add to sync history
   */
  private addToSyncHistory(type: string, data: any): void {
    this.syncHistory.push({
      type,
      data,
      timestamp: new Date().toISOString()
    });

    // Limit history size
    if (this.syncHistory.length > this.settings.maxSyncHistory) {
      this.syncHistory = this.syncHistory.slice(-this.settings.maxSyncHistory);
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(type: string): void {
    this.statistics.totalSyncEvents++;
    this.statistics.syncEventsByType[type] = (this.statistics.syncEventsByType[type] || 0) + 1;
    this.statistics.lastSyncTime = new Date().toISOString();
  }

  /**

   * Set event callbacks
   */
  public setViewportSyncCallback(callback: (state: ViewportState) => void): void {
    this.onViewportSyncCallback = callback;
  }

  public setCursorSyncCallback(callback: (cursors: CursorState[]) => void): void {
    this.onCursorSyncCallback = callback;
  }

  public setAnnotationSyncCallback(callback: (action: string, data: any) => void): void {
    this.onAnnotationSyncCallback = callback;
  }

  public setMeasurementSyncCallback(callback: (action: string, data: any) => void): void {
    this.onMeasurementSyncCallback = callback;
  }

  public setConflictCallback(callback: (conflict: SyncConflict) => void): void {
    this.onConflictCallback = callback;
  }

  /**
   * Get current viewport state
   */
  public getCurrentViewportState(): ViewportState | null {
    return this.viewportState;
  }

  /**
   * Get all cursor states
   */
  public getCursorStates(): CursorState[] {
    return Array.from(this.cursorStates.values());
  }

  /**
   * Get sync statistics
   */
  public getStatistics(): SyncStatistics {
    return { ...this.statistics };
  }

  /**
   * Get sync history
   */
  public getSyncHistory(type?: string, limit?: number): any[] {
    let history = this.syncHistory;
    
    if (type) {
      history = history.filter(entry => entry.type === type);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Get active conflicts
   */
  public getActiveConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved);
  }

  /**
   * Resolve conflict manually
   */
  public resolveConflict(conflictId: string, resolution: 'merge' | 'override', winnerId?: string): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.resolved = true;
    conflict.resolution = resolution;
    conflict.resolvedBy = winnerId || 'manual';

    this.statistics.conflictsResolved++;
    console.log('🔄 [RealTimeSynchronization] Conflict manually resolved:', conflictId);
    
    return true;
  }

  /**
   * Update sync settings
   */
  public updateSettings(newSettings: Partial<SyncSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('🔄 [RealTimeSynchronization] Settings updated');
  }

  /**
   * Get sync settings
   */
  public getSettings(): SyncSettings {
    return { ...this.settings };
  }

  /**
   * Force sync all data
   */
  public forceSyncAll(): void {
    const currentUser = this.collaborationModule.getCurrentUser();
    if (!currentUser) return;

    // This would trigger a full state sync with all participants
    console.log('🔄 [RealTimeSynchronization] Force sync all data');
    
    // In a real implementation, this would request current state from server
    // and broadcast to all participants
  }

  /**
   * Clear sync history
   */
  public clearSyncHistory(): void {
    this.syncHistory = [];
    console.log('🔄 [RealTimeSynchronization] Sync history cleared');
  }

  /**
   * Clear resolved conflicts
   */
  public clearResolvedConflicts(): void {
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) {
        this.conflicts.delete(id);
      }
    }
    console.log('🔄 [RealTimeSynchronization] Resolved conflicts cleared');
  }

  /**
   * Get sync latency
   */
  public getSyncLatency(): number {
    return this.collaborationModule.getConnectionStatus().latency;
  }

  /**
   * Check if sync is enabled for type
   */
  public isSyncEnabled(type: 'viewport' | 'annotation' | 'measurement' | 'cursor'): boolean {
    switch (type) {
      case 'viewport': return this.settings.enableViewportSync;
      case 'annotation': return this.settings.enableAnnotationSync;
      case 'measurement': return this.settings.enableMeasurementSync;
      case 'cursor': return this.settings.enableCursorSync;
      default: return false;
    }
  }

  /**
   * Pause synchronization
   */
  public pauseSync(): void {
    this.settings.enableViewportSync = false;
    this.settings.enableAnnotationSync = false;
    this.settings.enableMeasurementSync = false;
    this.settings.enableCursorSync = false;
    console.log('🔄 [RealTimeSynchronization] Synchronization paused');
  }

  /**
   * Resume synchronization
   */
  public resumeSync(): void {
    this.settings.enableViewportSync = true;
    this.settings.enableAnnotationSync = true;
    this.settings.enableMeasurementSync = true;
    this.settings.enableCursorSync = true;
    console.log('🔄 [RealTimeSynchronization] Synchronization resumed');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clear all timers
    for (const timer of this.syncThrottleTimers.values()) {
      clearTimeout(timer);
    }
    this.syncThrottleTimers.clear();

    // Clear state
    this.cursorStates.clear();
    this.conflicts.clear();
    this.pendingOperations.clear();
    this.syncHistory = [];

    console.log('🔄 [RealTimeSynchronization] Disposed');
  }
}

export { RealTimeSynchronization };