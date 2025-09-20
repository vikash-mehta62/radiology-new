/**
 * React Hook for Enhanced Viewer Manager
 * Provides seamless integration with React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  EnhancedViewerManager, 
  ViewerMode, 
  ViewerState, 
  ViewerManagerConfig,
  getGlobalViewerManager 
} from '../services/enhancedViewerManager';

export interface UseViewerManagerOptions {
  config?: Partial<ViewerManagerConfig>;
  autoInitialize?: boolean;
  enableStateSync?: boolean;
}

export interface ViewerManagerHookReturn {
  // Manager instance
  manager: EnhancedViewerManager | null;
  
  // Current state
  currentMode: ViewerMode | null;
  currentState: ViewerState | null;
  availableModes: ViewerMode[];
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  switchMode: (modeId: string, options?: { preserveState?: boolean }) => Promise<boolean>;
  updateState: (updates: Partial<ViewerState>) => void;
  resetMode: (modeId?: string) => boolean;
  enableCapability: (capabilityId: string) => boolean;
  disableCapability: (capabilityId: string) => boolean;
  
  // Utilities
  getOptimalMode: () => ViewerMode | null;
  getSystemHealth: () => any;
  exportConfiguration: () => any;
  importConfiguration: (config: any) => boolean;
}

export function useViewerManager(
  options: UseViewerManagerOptions = {}
): ViewerManagerHookReturn {
  const {
    config = {},
    autoInitialize = true,
    enableStateSync = true
  } = options;

  // State
  const [manager, setManager] = useState<EnhancedViewerManager | null>(null);
  const [currentMode, setCurrentMode] = useState<ViewerMode | null>(null);
  const [currentState, setCurrentState] = useState<ViewerState | null>(null);
  const [availableModes, setAvailableModes] = useState<ViewerMode[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for stable callbacks
  const managerRef = useRef<EnhancedViewerManager | null>(null);

  // Initialize manager
  const initializeManager = useCallback(async () => {
    if (managerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const newManager = await getGlobalViewerManager(config);
      
      // Set up event callbacks
      newManager.setCallbacks({
        onModeChange: (fromMode, toMode) => {
          console.log('🎛️ [useViewerManager] Mode changed:', fromMode, '->', toMode);
          const mode = newManager.getCurrentMode();
          setCurrentMode(mode);
          if (mode && enableStateSync) {
            setCurrentState(mode.state);
          }
        },
        onStateChange: (state) => {
          if (enableStateSync) {
            setCurrentState({ ...state });
          }
        },
        onError: (error, context) => {
          console.error('🎛️ [useViewerManager] Error:', error, context);
          setError(error.message);
        }
      });

      // Update state
      setManager(newManager);
      managerRef.current = newManager;
      setCurrentMode(newManager.getCurrentMode());
      setAvailableModes(newManager.getAvailableModes());
      
      if (newManager.getCurrentMode() && enableStateSync) {
        setCurrentState(newManager.getCurrentMode()!.state);
      }

      setIsInitialized(true);
      console.log('🎛️ [useViewerManager] Manager initialized successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize viewer manager';
      setError(errorMessage);
      console.error('🎛️ [useViewerManager] Initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config, enableStateSync]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !managerRef.current) {
      initializeManager();
    }
  }, [autoInitialize, initializeManager]);

  // Update available modes when manager changes
  useEffect(() => {
    if (manager) {
      const updateAvailableModes = () => {
        setAvailableModes(manager.getAvailableModes());
      };

      // Update immediately
      updateAvailableModes();

      // Set up periodic updates (device capabilities might change)
      const interval = setInterval(updateAvailableModes, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [manager]);

  // Actions
  const switchMode = useCallback(async (
    modeId: string, 
    options: { preserveState?: boolean } = {}
  ): Promise<boolean> => {
    if (!manager) {
      setError('Manager not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await manager.switchMode(modeId, options);
      if (success) {
        const mode = manager.getCurrentMode();
        setCurrentMode(mode);
        if (mode && enableStateSync) {
          setCurrentState(mode.state);
        }
        setAvailableModes(manager.getAvailableModes());
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch mode';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [manager, enableStateSync]);

  const updateState = useCallback((updates: Partial<ViewerState>) => {
    if (!manager) return;
    
    manager.updateState(updates);
    if (enableStateSync) {
      const mode = manager.getCurrentMode();
      if (mode) {
        setCurrentState(mode.state);
      }
    }
  }, [manager, enableStateSync]);

  const resetMode = useCallback((modeId?: string) => {
    if (!manager) return false;
    
    const targetModeId = modeId || currentMode?.id;
    if (!targetModeId) return false;

    const success = manager.resetMode(targetModeId);
    if (success && enableStateSync) {
      const mode = manager.getCurrentMode();
      if (mode) {
        setCurrentState(mode.state);
      }
    }
    return success;
  }, [manager, currentMode, enableStateSync]);

  const enableCapability = useCallback((capabilityId: string) => {
    if (!manager) return false;
    return manager.enableCapability(capabilityId);
  }, [manager]);

  const disableCapability = useCallback((capabilityId: string) => {
    if (!manager) return false;
    return manager.disableCapability(capabilityId);
  }, [manager]);

  // Utilities
  const getOptimalMode = useCallback(() => {
    if (!manager) return null;
    return manager.getOptimalMode();
  }, [manager]);

  const getSystemHealth = useCallback(() => {
    if (!manager) return null;
    return manager.getSystemHealth();
  }, [manager]);

  const exportConfiguration = useCallback(() => {
    if (!manager) return null;
    return manager.exportConfiguration();
  }, [manager]);

  const importConfiguration = useCallback((config: any) => {
    if (!manager) return false;
    const success = manager.importConfiguration(config);
    if (success) {
      setAvailableModes(manager.getAvailableModes());
      const mode = manager.getCurrentMode();
      setCurrentMode(mode);
      if (mode && enableStateSync) {
        setCurrentState(mode.state);
      }
    }
    return success;
  }, [manager, enableStateSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't cleanup the global manager here as it might be used by other components
      // The global manager will be cleaned up when the app unmounts
    };
  }, []);

  return {
    // Manager instance
    manager,
    
    // Current state
    currentMode,
    currentState,
    availableModes,
    isInitialized,
    isLoading,
    error,
    
    // Actions
    switchMode,
    updateState,
    resetMode,
    enableCapability,
    disableCapability,
    
    // Utilities
    getOptimalMode,
    getSystemHealth,
    exportConfiguration,
    importConfiguration
  };
}

/**
 * Hook for viewer mode selection with automatic optimization
 */
export function useOptimalViewerMode() {
  const { manager, getOptimalMode, switchMode, currentMode, isInitialized } = useViewerManager();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeMode = useCallback(async () => {
    if (!manager || !isInitialized) return false;

    setIsOptimizing(true);
    try {
      const optimalMode = getOptimalMode();
      if (optimalMode && (!currentMode || currentMode.id !== optimalMode.id)) {
        const success = await switchMode(optimalMode.id, { preserveState: true });
        console.log('🎛️ [useOptimalViewerMode] Optimized to mode:', optimalMode.name);
        return success;
      }
      return true;
    } finally {
      setIsOptimizing(false);
    }
  }, [manager, isInitialized, getOptimalMode, currentMode, switchMode]);

  // Auto-optimize on initialization
  useEffect(() => {
    if (isInitialized && !currentMode) {
      optimizeMode();
    }
  }, [isInitialized, currentMode, optimizeMode]);

  return {
    optimizeMode,
    isOptimizing,
    optimalMode: getOptimalMode()
  };
}

/**
 * Hook for viewer capability management
 */
export function useViewerCapabilities() {
  const { manager, currentMode } = useViewerManager();
  const [capabilities, setCapabilities] = useState<any[]>([]);

  useEffect(() => {
    if (manager && currentMode) {
      setCapabilities([
        ...manager.getEnabledCapabilities(),
        ...manager.getAvailableCapabilities().filter(cap => !cap.enabled)
      ]);
    }
  }, [manager, currentMode]);

  const toggleCapability = useCallback((capabilityId: string) => {
    if (!manager) return false;

    const capability = capabilities.find(cap => cap.id === capabilityId);
    if (!capability) return false;

    if (capability.enabled) {
      return manager.disableCapability(capabilityId);
    } else {
      return manager.enableCapability(capabilityId);
    }
  }, [manager, capabilities]);

  return {
    capabilities,
    enabledCapabilities: capabilities.filter(cap => cap.enabled),
    availableCapabilities: capabilities.filter(cap => cap.available),
    toggleCapability
  };
}