/**
 * Unified State Management System
 * Centralized state management for all viewer components with persistence and synchronization
 */

import { EventEmitter } from 'events';

// Core state interfaces
export interface ViewerState {
  // Core viewer state
  currentImageId: string | null;
  currentSliceIndex: number;
  totalSlices: number;
  
  // Viewport state
  viewport: {
    zoom: number;
    pan: { x: number; y: number };
    rotation: number;
    windowLevel: { center: number; width: number };
    brightness: number;
    contrast: number;
  };
  
  // Tools and interactions
  tools: {
    activeTool: string | null;
    toolSettings: { [toolId: string]: any };
  };
  
  // Measurements and annotations
  measurements: string[]; // measurement IDs
  annotations: string[]; // annotation IDs
  
  // UI state
  ui: {
    sidebarVisible: boolean;
    toolbarVisible: boolean;
    overlaysVisible: boolean;
    fullscreen: boolean;
    activeTab: string;
    panelStates: { [panelId: string]: boolean };
  };
  
  // Session information
  session: {
    startTime: string;
    lastActivity: string;
    totalInteractions: number;
    errorCount: number;
    sessionId: string;
  };
  
  // Collaboration state
  collaboration?: {
    sessionId: string;
    participants: string[];
    isHost: boolean;
    syncEnabled: boolean;
  };
  
  // AI and enhancement state
  enhancements?: {
    activeEnhancements: string[];
    aiSettings: { [key: string]: any };
    processingQueue: string[];
  };
  
  // Performance state
  performance?: {
    adaptiveQuality: 'low' | 'medium' | 'high';
    cacheSize: number;
    memoryUsage: number;
    renderTime: number;
  };
}

export interface GlobalState {
  // Current viewer mode and state
  currentMode: string | null;
  viewerStates: { [modeId: string]: ViewerState };
  
  // Study and image data
  currentStudy: any | null;
  loadedStudies: { [studyId: string]: any };
  
  // User preferences
  userPreferences: {
    defaultMode: string;
    autoSave: boolean;
    syncSettings: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
    shortcuts: { [action: string]: string };
  };
  
  // Application state
  application: {
    version: string;
    lastUpdate: string;
    features: { [featureId: string]: boolean };
    configuration: { [key: string]: any };
  };
  
  // Collaboration state
  collaboration: {
    activeSessions: { [sessionId: string]: any };
    connectionStatus: 'connected' | 'disconnected' | 'connecting';
    lastSync: string;
  };
  
  // Performance metrics
  performance: {
    metrics: { [metricName: string]: any };
    history: Array<{ timestamp: string; metrics: any }>;
    alerts: Array<{ id: string; type: string; message: string; timestamp: string }>;
  };
}

export interface StateChangeEvent {
  type: 'viewer' | 'global' | 'collaboration' | 'performance';
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  source: string;
}

export interface StateMigration {
  fromVersion: string;
  toVersion: string;
  migrations: Array<{
    path: string;
    transform: (oldValue: any) => any;
    condition?: (state: any) => boolean;
  }>;
}

export interface StateSnapshot {
  id: string;
  timestamp: string;
  version: string;
  state: GlobalState;
  metadata: {
    source: string;
    description?: string;
    tags: string[];
  };
}

class UnifiedStateManager extends EventEmitter {
  private state: GlobalState;
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots = 50;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private migrations: StateMigration[] = [];
  private isInitialized = false;
  private storageKey = 'unified-viewer-state';
  private version = '1.0.0';

  constructor() {
    super();
    this.state = this.createDefaultState();
    this.setupEventHandlers();
  }

  /**
   * Initialize the state manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 [UnifiedStateManager] Initializing...');

      // Load persisted state
      await this.loadPersistedState();

      // Setup auto-save
      this.setupAutoSave();

      // Setup collaboration sync
      this.setupCollaborationSync();

      // Register migrations
      this.registerMigrations();

      this.isInitialized = true;
      this.emit('initialized', this.state);

      console.log('✅ [UnifiedStateManager] Initialized successfully');
    } catch (error) {
      console.error('❌ [UnifiedStateManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create default state
   */
  private createDefaultState(): GlobalState {
    return {
      currentMode: null,
      viewerStates: {},
      currentStudy: null,
      loadedStudies: {},
      userPreferences: {
        defaultMode: 'simple',
        autoSave: true,
        syncSettings: true,
        theme: 'dark',
        language: 'en',
        shortcuts: {
          'zoom-in': 'Ctrl+=',
          'zoom-out': 'Ctrl+-',
          'reset': 'Ctrl+0',
          'next-slice': 'ArrowRight',
          'prev-slice': 'ArrowLeft',
          'play-pause': 'Space'
        }
      },
      application: {
        version: this.version,
        lastUpdate: new Date().toISOString(),
        features: {},
        configuration: {}
      },
      collaboration: {
        activeSessions: {},
        connectionStatus: 'disconnected',
        lastSync: new Date().toISOString()
      },
      performance: {
        metrics: {},
        history: [],
        alerts: []
      }
    };
  }

  /**
   * Create default viewer state
   */
  private createDefaultViewerState(): ViewerState {
    return {
      currentImageId: null,
      currentSliceIndex: 0,
      totalSlices: 1,
      viewport: {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        rotation: 0,
        windowLevel: { center: 128, width: 256 },
        brightness: 100,
        contrast: 100
      },
      tools: {
        activeTool: null,
        toolSettings: {}
      },
      measurements: [],
      annotations: [],
      ui: {
        sidebarVisible: true,
        toolbarVisible: true,
        overlaysVisible: true,
        fullscreen: false,
        activeTab: 'main',
        panelStates: {}
      },
      session: {
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalInteractions: 0,
        errorCount: 0,
        sessionId: this.generateSessionId()
      }
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle state changes
    this.on('stateChange', (event: StateChangeEvent) => {
      this.updateLastActivity();
      this.emit('change', event);
    });

    // Handle errors
    this.on('error', (error: Error) => {
      console.error('🔴 [UnifiedStateManager] Error:', error?.message || error?.toString() || JSON.stringify(error));
      this.incrementErrorCount();
    });
  }

  /**
   * Get current state
   */
  public getState(): GlobalState {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy
  }

  /**
   * Get viewer state for specific mode
   */
  public getViewerState(modeId: string): ViewerState | null {
    return this.state.viewerStates[modeId] || null;
  }

  /**
   * Get current viewer state
   */
  public getCurrentViewerState(): ViewerState | null {
    if (!this.state.currentMode) return null;
    return this.getViewerState(this.state.currentMode);
  }

  /**
   * Update global state
   */
  public updateState(path: string, value: any, source = 'unknown'): void {
    const oldValue = this.getNestedValue(this.state, path);
    this.setNestedValue(this.state, path, value);

    const event: StateChangeEvent = {
      type: 'global',
      path,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString(),
      source
    };

    this.emit('stateChange', event);
  }

  /**
   * Update viewer state
   */
  public updateViewerState(modeId: string, path: string, value: any, source = 'unknown'): void {
    // Ensure viewer state exists
    if (!this.state.viewerStates[modeId]) {
      this.state.viewerStates[modeId] = this.createDefaultViewerState();
    }

    const oldValue = this.getNestedValue(this.state.viewerStates[modeId], path);
    this.setNestedValue(this.state.viewerStates[modeId], path, value);

    const event: StateChangeEvent = {
      type: 'viewer',
      path: `viewerStates.${modeId}.${path}`,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString(),
      source
    };

    this.emit('stateChange', event);
  }

  /**
   * Switch viewer mode
   */
  public switchMode(modeId: string, preserveState = true): void {
    const oldMode = this.state.currentMode;
    
    // Ensure target mode state exists
    if (!this.state.viewerStates[modeId]) {
      this.state.viewerStates[modeId] = this.createDefaultViewerState();
    }

    // Migrate state if preserving
    if (preserveState && oldMode && this.state.viewerStates[oldMode]) {
      this.migrateViewerState(oldMode, modeId);
    }

    this.state.currentMode = modeId;

    const event: StateChangeEvent = {
      type: 'global',
      path: 'currentMode',
      oldValue: oldMode,
      newValue: modeId,
      timestamp: new Date().toISOString(),
      source: 'mode-switch'
    };

    this.emit('stateChange', event);
  }

  /**
   * Migrate state between viewer modes
   */
  private migrateViewerState(fromMode: string, toMode: string): void {
    const fromState = this.state.viewerStates[fromMode];
    const toState = this.state.viewerStates[toMode];

    if (!fromState || !toState) return;

    // Migrate common properties
    toState.currentImageId = fromState.currentImageId;
    toState.currentSliceIndex = fromState.currentSliceIndex;
    toState.totalSlices = fromState.totalSlices;
    toState.viewport = { ...fromState.viewport };
    toState.measurements = [...fromState.measurements];
    toState.annotations = [...fromState.annotations];

    console.log(`🔄 [UnifiedStateManager] Migrated state from ${fromMode} to ${toMode}`);
  }

  /**
   * Create state snapshot
   */
  public createSnapshot(description?: string, tags: string[] = []): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: this.version,
      state: JSON.parse(JSON.stringify(this.state)),
      metadata: {
        source: 'manual',
        description,
        tags
      }
    };

    this.snapshots.push(snapshot);

    // Limit snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.emit('snapshotCreated', snapshot);
    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  public restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    try {
      // Apply migrations if needed
      const migratedState = this.applyMigrations(snapshot.state, snapshot.version);
      
      this.state = migratedState;
      this.emit('stateRestored', snapshot);
      
      console.log(`✅ [UnifiedStateManager] Restored snapshot: ${snapshotId}`);
      return true;
    } catch (error) {
      console.error('❌ [UnifiedStateManager] Snapshot restore failed:', error);
      return false;
    }
  }

  /**
   * Get snapshots
   */
  public getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear snapshots
   */
  public clearSnapshots(): void {
    this.snapshots = [];
    this.emit('snapshotsCleared');
  }

  /**
   * Persist state to storage
   */
  public async persistState(): Promise<void> {
    try {
      const serializedState = JSON.stringify({
        state: this.state,
        snapshots: this.snapshots,
        version: this.version,
        timestamp: new Date().toISOString()
      });

      localStorage.setItem(this.storageKey, serializedState);
      
      // Also persist to IndexedDB for larger data
      await this.persistToIndexedDB(serializedState);
      
      console.log('💾 [UnifiedStateManager] State persisted successfully');
    } catch (error) {
      console.error('❌ [UnifiedStateManager] State persistence failed:', error);
      throw error;
    }
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      // Try localStorage first
      const stored = localStorage.getItem(this.storageKey);
      let persistedData = null;

      if (stored) {
        persistedData = JSON.parse(stored);
      } else {
        // Try IndexedDB
        persistedData = await this.loadFromIndexedDB();
      }

      if (persistedData) {
        // Apply migrations if needed
        const migratedState = this.applyMigrations(persistedData.state, persistedData.version);
        
        this.state = migratedState;
        this.snapshots = persistedData.snapshots || [];
        
        console.log('📂 [UnifiedStateManager] Persisted state loaded successfully');
      }
    } catch (error) {
      console.warn('⚠️ [UnifiedStateManager] Failed to load persisted state:', error);
      // Continue with default state
    }
  }

  /**
   * Persist to IndexedDB
   */
  private async persistToIndexedDB(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ViewerStateDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['states'], 'readwrite');
        const store = transaction.objectStore('states');
        
        store.put({ id: 'current', data, timestamp: Date.now() });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('states')) {
          db.createObjectStore('states', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ViewerStateDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['states'], 'readonly');
        const store = transaction.objectStore('states');
        const getRequest = store.get('current');
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(JSON.parse(getRequest.result.data));
          } else {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  /**
   * Setup auto-save
   */
  private setupAutoSave(): void {
    if (this.state.userPreferences.autoSave) {
      this.autoSaveInterval = setInterval(() => {
        this.persistState().catch(console.error);
      }, 30000); // Auto-save every 30 seconds
    }
  }

  /**
   * Setup collaboration sync
   */
  private setupCollaborationSync(): void {
    if (this.state.userPreferences.syncSettings) {
      this.syncInterval = setInterval(() => {
        this.syncCollaborationState();
      }, 5000); // Sync every 5 seconds
    }
  }

  /**
   * Sync collaboration state
   */
  private async syncCollaborationState(): Promise<void> {
    // Implementation would depend on collaboration service
    // This is a placeholder for the sync logic
    try {
      // Emit sync event for collaboration module to handle
      this.emit('collaborationSync', {
        state: this.getCurrentViewerState(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [UnifiedStateManager] Collaboration sync failed:', error);
    }
  }

  /**
   * Register state migrations
   */
  private registerMigrations(): void {
    // Example migration from v1.0.0 to v1.1.0
    this.migrations.push({
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      migrations: [
        {
          path: 'userPreferences.theme',
          transform: (oldValue) => oldValue === 'default' ? 'dark' : oldValue
        },
        {
          path: 'application.features',
          transform: (oldValue) => ({ ...oldValue, newFeature: true }),
          condition: (state) => !state.application.features.newFeature
        }
      ]
    });
  }

  /**
   * Apply migrations to state
   */
  private applyMigrations(state: GlobalState, fromVersion: string): GlobalState {
    let migratedState = JSON.parse(JSON.stringify(state));
    
    for (const migration of this.migrations) {
      if (this.shouldApplyMigration(fromVersion, migration.fromVersion, migration.toVersion)) {
        for (const rule of migration.migrations) {
          if (!rule.condition || rule.condition(migratedState)) {
            const oldValue = this.getNestedValue(migratedState, rule.path);
            const newValue = rule.transform(oldValue);
            this.setNestedValue(migratedState, rule.path, newValue);
          }
        }
      }
    }
    
    return migratedState;
  }

  /**
   * Check if migration should be applied
   */
  private shouldApplyMigration(currentVersion: string, fromVersion: string, toVersion: string): boolean {
    // Simple version comparison - in production, use a proper semver library
    return currentVersion === fromVersion;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    const currentState = this.getCurrentViewerState();
    if (currentState) {
      currentState.session.lastActivity = new Date().toISOString();
      currentState.session.totalInteractions++;
    }
  }

  /**
   * Increment error count
   */
  private incrementErrorCount(): void {
    const currentState = this.getCurrentViewerState();
    if (currentState) {
      currentState.session.errorCount++;
    }
  }

  /**
   * Reset viewer state
   */
  public resetViewerState(modeId: string): void {
    this.state.viewerStates[modeId] = this.createDefaultViewerState();
    
    const event: StateChangeEvent = {
      type: 'viewer',
      path: `viewerStates.${modeId}`,
      oldValue: null,
      newValue: this.state.viewerStates[modeId],
      timestamp: new Date().toISOString(),
      source: 'reset'
    };

    this.emit('stateChange', event);
  }

  /**
   * Export state
   */
  public exportState(): any {
    return {
      state: this.state,
      snapshots: this.snapshots,
      version: this.version,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import state
   */
  public importState(importedData: any): boolean {
    try {
      const migratedState = this.applyMigrations(importedData.state, importedData.version);
      
      this.state = migratedState;
      this.snapshots = importedData.snapshots || [];
      
      this.emit('stateImported', importedData);
      console.log('📥 [UnifiedStateManager] State imported successfully');
      return true;
    } catch (error) {
      console.error('❌ [UnifiedStateManager] State import failed:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.removeAllListeners();
    console.log('🧹 [UnifiedStateManager] Cleaned up resources');
  }
}

// Singleton instance
let globalStateManager: UnifiedStateManager | null = null;

/**
 * Get global state manager instance
 */
export function getGlobalStateManager(): UnifiedStateManager {
  if (!globalStateManager) {
    globalStateManager = new UnifiedStateManager();
  }
  return globalStateManager;
}

/**
 * Reset global state manager
 */
export function resetGlobalStateManager(): void {
  if (globalStateManager) {
    globalStateManager.cleanup();
    globalStateManager = null;
  }
}

export { UnifiedStateManager };