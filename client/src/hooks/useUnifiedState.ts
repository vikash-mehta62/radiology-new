/**
 * React Hook for Unified State Management
 * Provides seamless integration with the UnifiedStateManager
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UnifiedStateManager, 
  GlobalState, 
  ViewerState, 
  StateChangeEvent,
  StateSnapshot,
  getGlobalStateManager 
} from '../services/unifiedStateManager';

export interface UseUnifiedStateOptions {
  autoSync?: boolean;
  persistOnChange?: boolean;
  enableSnapshots?: boolean;
  syncInterval?: number;
}

export interface UnifiedStateHookReturn {
  // State access
  globalState: GlobalState;
  currentViewerState: ViewerState | null;
  currentMode: string | null;
  
  // State management
  updateGlobalState: (path: string, value: any) => void;
  updateViewerState: (path: string, value: any) => void;
  switchMode: (modeId: string, preserveState?: boolean) => void;
  resetViewerState: (modeId?: string) => void;
  
  // Snapshots
  createSnapshot: (description?: string, tags?: string[]) => StateSnapshot;
  restoreSnapshot: (snapshotId: string) => boolean;
  getSnapshots: () => StateSnapshot[];
  clearSnapshots: () => void;
  
  // Persistence
  persistState: () => Promise<void>;
  exportState: () => any;
  importState: (data: any) => boolean;
  
  // Status
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
}

export function useUnifiedState(
  modeId?: string,
  options: UseUnifiedStateOptions = {}
): UnifiedStateHookReturn {
  const {
    autoSync = true,
    persistOnChange = true,
    enableSnapshots = true,
    syncInterval = 5000
  } = options;

  // State
  const [globalState, setGlobalState] = useState<GlobalState>({} as GlobalState);
  const [currentViewerState, setCurrentViewerState] = useState<ViewerState | null>(null);
  const [currentMode, setCurrentMode] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Refs
  const managerRef = useRef<UnifiedStateManager | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize state manager
  useEffect(() => {
    const initializeManager = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const manager = getGlobalStateManager();
        managerRef.current = manager;

        // Initialize if not already done
        if (!manager['isInitialized']) {
          await manager.initialize();
        }

        // Set up event listeners
        const handleStateChange = (event: StateChangeEvent) => {
          const state = manager.getState();
          setGlobalState(state);
          setCurrentMode(state.currentMode);
          
          if (state.currentMode) {
            const viewerState = manager.getViewerState(state.currentMode);
            setCurrentViewerState(viewerState);
          }
          
          setLastSync(new Date().toISOString());

          // Auto-persist if enabled
          if (persistOnChange) {
            manager.persistState().catch(console.error);
          }
        };

        const handleError = (error: Error) => {
          setError(error.message);
          console.error('🔴 [useUnifiedState] State manager error:', error);
        };

        const handleInitialized = (state: GlobalState) => {
          setGlobalState(state);
          setCurrentMode(state.currentMode);
          
          if (state.currentMode) {
            const viewerState = manager.getViewerState(state.currentMode);
            setCurrentViewerState(viewerState);
          }
          
          setIsInitialized(true);
          setIsLoading(false);
        };

        manager.on('stateChange', handleStateChange);
        manager.on('error', handleError);
        manager.on('initialized', handleInitialized);

        // If already initialized, update state immediately
        if (manager['isInitialized']) {
          const state = manager.getState();
          handleInitialized(state);
        }

        // Setup auto-sync if enabled
        if (autoSync && syncInterval > 0) {
          syncIntervalRef.current = setInterval(() => {
            const state = manager.getState();
            setGlobalState(state);
            setLastSync(new Date().toISOString());
          }, syncInterval);
        }

        // Cleanup function
        return () => {
          manager.off('stateChange', handleStateChange);
          manager.off('error', handleError);
          manager.off('initialized', handleInitialized);
          
          if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
          }
        };

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize state manager';
        setError(errorMessage);
        setIsLoading(false);
        console.error('❌ [useUnifiedState] Initialization failed:', err);
      }
    };

    initializeManager();
  }, [autoSync, persistOnChange, syncInterval]);

  // Switch to specific mode on mount if provided
  useEffect(() => {
    if (isInitialized && modeId && currentMode !== modeId) {
      switchMode(modeId);
    }
  }, [isInitialized, modeId, currentMode]);

  // State management functions
  const updateGlobalState = useCallback((path: string, value: any) => {
    if (!managerRef.current) return;
    managerRef.current.updateState(path, value, 'hook');
  }, []);

  const updateViewerState = useCallback((path: string, value: any) => {
    if (!managerRef.current || !currentMode) return;
    managerRef.current.updateViewerState(currentMode, path, value, 'hook');
  }, [currentMode]);

  const switchMode = useCallback((newModeId: string, preserveState = true) => {
    if (!managerRef.current) return;
    managerRef.current.switchMode(newModeId, preserveState);
  }, []);

  const resetViewerState = useCallback((targetModeId?: string) => {
    if (!managerRef.current) return;
    const modeToReset = targetModeId || currentMode;
    if (modeToReset) {
      managerRef.current.resetViewerState(modeToReset);
    }
  }, [currentMode]);

  // Snapshot functions
  const createSnapshot = useCallback((description?: string, tags: string[] = []) => {
    if (!managerRef.current) throw new Error('State manager not initialized');
    return managerRef.current.createSnapshot(description, tags);
  }, []);

  const restoreSnapshot = useCallback((snapshotId: string) => {
    if (!managerRef.current) return false;
    return managerRef.current.restoreSnapshot(snapshotId);
  }, []);

  const getSnapshots = useCallback(() => {
    if (!managerRef.current) return [];
    return managerRef.current.getSnapshots();
  }, []);

  const clearSnapshots = useCallback(() => {
    if (!managerRef.current) return;
    managerRef.current.clearSnapshots();
  }, []);

  // Persistence functions
  const persistState = useCallback(async () => {
    if (!managerRef.current) throw new Error('State manager not initialized');
    await managerRef.current.persistState();
  }, []);

  const exportState = useCallback(() => {
    if (!managerRef.current) return null;
    return managerRef.current.exportState();
  }, []);

  const importState = useCallback((data: any) => {
    if (!managerRef.current) return false;
    return managerRef.current.importState(data);
  }, []);

  return {
    // State access
    globalState,
    currentViewerState,
    currentMode,
    
    // State management
    updateGlobalState,
    updateViewerState,
    switchMode,
    resetViewerState,
    
    // Snapshots
    createSnapshot,
    restoreSnapshot,
    getSnapshots,
    clearSnapshots,
    
    // Persistence
    persistState,
    exportState,
    importState,
    
    // Status
    isInitialized,
    isLoading,
    error,
    lastSync
  };
}

/**
 * Hook for viewer-specific state management
 */
export function useViewerState(modeId: string) {
  const {
    currentViewerState,
    updateViewerState,
    resetViewerState,
    switchMode,
    isInitialized
  } = useUnifiedState(modeId);

  // Ensure we're in the correct mode
  useEffect(() => {
    if (isInitialized) {
      switchMode(modeId);
    }
  }, [isInitialized, modeId, switchMode]);

  return {
    viewerState: currentViewerState,
    updateState: updateViewerState,
    resetState: () => resetViewerState(modeId),
    isReady: isInitialized && currentViewerState !== null
  };
}

/**
 * Hook for global application state
 */
export function useGlobalState() {
  const {
    globalState,
    updateGlobalState,
    persistState,
    exportState,
    importState,
    isInitialized
  } = useUnifiedState();

  return {
    state: globalState,
    updateState: updateGlobalState,
    persistState,
    exportState,
    importState,
    isReady: isInitialized
  };
}

/**
 * Hook for state snapshots management
 */
export function useStateSnapshots() {
  const {
    createSnapshot,
    restoreSnapshot,
    getSnapshots,
    clearSnapshots,
    isInitialized
  } = useUnifiedState();

  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);

  // Update snapshots list
  useEffect(() => {
    if (isInitialized) {
      const updateSnapshots = () => {
        setSnapshots(getSnapshots());
      };

      updateSnapshots();
      
      // Update every 5 seconds
      const interval = setInterval(updateSnapshots, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, getSnapshots]);

  return {
    snapshots,
    createSnapshot,
    restoreSnapshot,
    clearSnapshots,
    isReady: isInitialized
  };
}

/**
 * Hook for collaboration state synchronization
 */
export function useCollaborationSync() {
  const { globalState, updateGlobalState, lastSync } = useUnifiedState();
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (globalState.collaboration) {
      setIsConnected(globalState.collaboration.connectionStatus === 'connected');
      setParticipants(Object.keys(globalState.collaboration.activeSessions));
    }
  }, [globalState.collaboration]);

  const joinSession = useCallback((sessionId: string) => {
    updateGlobalState('collaboration.connectionStatus', 'connecting');
    // Implementation would connect to collaboration service
  }, [updateGlobalState]);

  const leaveSession = useCallback(() => {
    updateGlobalState('collaboration.connectionStatus', 'disconnected');
    updateGlobalState('collaboration.activeSessions', {});
  }, [updateGlobalState]);

  return {
    isConnected,
    participants,
    lastSync,
    joinSession,
    leaveSession
  };
}