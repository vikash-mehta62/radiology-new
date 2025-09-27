/**
 * StateManager - Centralized state management for DICOM viewer
 * 
 * This component provides:
 * - Centralized state management with React Context
 * - Optimized state updates with batching
 * - Type-safe state operations
 * - Performance monitoring integration
 * - Undo/redo functionality
 * - State persistence capabilities
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useRef, 
  useEffect,
  useMemo,
  ReactNode,
  startTransition
} from 'react';
import { 
  ViewerState, 
  ViewerStateAction, 
  ViewerStateUpdater, 
  ViewerStateSelector,
  UseViewerStateReturn,
  createDefaultViewerState,
  ViewerError
} from '../types/ViewerTypes';
import { Annotation } from '../../../services/annotationSystem';
import { logger, LogCategory } from '../../../services/loggingService';

// State history for undo/redo functionality
interface StateHistory {
  past: ViewerState[];
  present: ViewerState;
  future: ViewerState[];
  maxHistorySize: number;
}

// State manager configuration
interface StateManagerConfig {
  enableHistory: boolean;
  maxHistorySize: number;
  enablePersistence: boolean;
  persistenceKey: string;
  enableBatching: boolean;
  batchTimeout: number;
  enablePerformanceTracking: boolean;
}

// Default configuration
const DEFAULT_CONFIG: StateManagerConfig = {
  enableHistory: true,
  maxHistorySize: 50,
  enablePersistence: false,
  persistenceKey: 'dicom-viewer-state',
  enableBatching: true,
  batchTimeout: 16, // ~60fps
  enablePerformanceTracking: true
};

// State reducer with comprehensive action handling
function viewerStateReducer(state: ViewerState, action: ViewerStateAction): ViewerState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_STUDY_METADATA':
      return { ...state, ...action.payload };
    
    case 'SET_CURRENT_FRAME':
      return { ...state, currentFrame: Math.max(0, Math.min(action.payload, state.totalFrames - 1)) };
    
    case 'SET_IMAGE_DATA':
      return { ...state, imageData: action.payload };
    
    case 'ADD_LOADED_IMAGE':
      const newLoadedImages = [...state.loadedImages];
      newLoadedImages[action.payload.index] = action.payload.image;
      return { ...state, loadedImages: newLoadedImages };
    
    case 'SET_LOADED_BATCH':
      const newLoadedBatches = new Set(state.loadedBatches);
      newLoadedBatches.add(action.payload);
      return { ...state, loadedBatches: newLoadedBatches };
    
    case 'SET_VIEWPORT':
      return { 
        ...state, 
        ...action.payload,
        // Ensure zoom stays within reasonable bounds
        zoom: action.payload.zoom ? Math.max(0.1, Math.min(action.payload.zoom, 20)) : state.zoom
      };
    
    case 'SET_UI_STATE':
      return { ...state, ...action.payload };
    
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };
    
    case 'SET_ANNOTATIONS':
      return { ...state, annotations: action.payload };
    
    case 'ADD_ANNOTATION':
      return { 
        ...state, 
        annotations: [...state.annotations, action.payload] 
      };
    
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map(annotation =>
          annotation.id === action.payload.id
            ? { ...annotation, ...action.payload.updates } as Annotation
            : annotation
        )
      };
    
    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter(annotation => annotation.id !== action.payload)
      };
    
    case 'SET_AI_STATE':
      return { ...state, ...action.payload };
    
    case 'SET_MPR_STATE':
      return { ...state, ...action.payload };
    
    case 'RESET_VIEW':
      return {
        ...state,
        zoom: 1,
        pan: { x: 0, y: 0 },
        rotation: 0,
        windowWidth: 1,
        windowCenter: 0.5,
        invert: false
      };
    
    case 'BATCH_UPDATE':
      return { ...state, ...action.payload };
    
    default:
      logger.warn(LogCategory.SYSTEM, 'Unknown action type', { actionType: (action as any).type });
      return state;
  }
}

// History reducer for undo/redo functionality
function historyReducer(history: StateHistory, action: { type: string; state?: ViewerState }): StateHistory {
  switch (action.type) {
    case 'PUSH':
      if (!action.state) return history;
      
      const newPast = [...history.past, history.present];
      if (newPast.length > history.maxHistorySize) {
        newPast.shift(); // Remove oldest state
      }
      
      return {
        ...history,
        past: newPast,
        present: action.state,
        future: [] // Clear future when new state is pushed
      };
    
    case 'UNDO':
      if (history.past.length === 0) return history;
      
      const previous = history.past[history.past.length - 1];
      const newPastForUndo = history.past.slice(0, -1);
      
      return {
        ...history,
        past: newPastForUndo,
        present: previous,
        future: [history.present, ...history.future]
      };
    
    case 'REDO':
      if (history.future.length === 0) return history;
      
      const next = history.future[0];
      const newFuture = history.future.slice(1);
      
      return {
        ...history,
        past: [...history.past, history.present],
        present: next,
        future: newFuture
      };
    
    case 'CLEAR':
      return {
        ...history,
        past: [],
        future: []
      };
    
    default:
      return history;
  }
}

// Context interfaces
interface StateManagerContextValue extends UseViewerStateReturn {
  // History management
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Batch operations
  batchUpdate: (updates: Partial<ViewerState>) => void;
  
  // Performance metrics
  performanceMetrics: {
    updateCount: number;
    averageUpdateTime: number;
    lastUpdateTime: number;
  };
  
  // Configuration
  config: StateManagerConfig;
  updateConfig: (newConfig: Partial<StateManagerConfig>) => void;
}

// Create context
const StateManagerContext = createContext<StateManagerContextValue | null>(null);

// Provider props
interface StateManagerProviderProps {
  children: ReactNode;
  initialState?: Partial<ViewerState>;
  config?: Partial<StateManagerConfig>;
  onStateChange?: (state: ViewerState) => void;
  onError?: (error: ViewerError) => void;
}

// State manager provider component
export const StateManagerProvider: React.FC<StateManagerProviderProps> = ({
  children,
  initialState = {},
  config: userConfig = {},
  onStateChange,
  onError
}) => {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...userConfig }), [userConfig]);
  
  // Initialize state with defaults and user overrides - React 19 optimization
  const [state, dispatch] = useReducer(
    viewerStateReducer,
    { ...createDefaultViewerState(), ...initialState }
  );
  
  // History management
  const [history, historyDispatch] = useReducer(
    historyReducer,
    {
      past: [],
      present: state,
      future: [],
      maxHistorySize: config.maxHistorySize
    }
  );
  
  // Performance tracking
  const performanceRef = useRef({
    updateCount: 0,
    totalUpdateTime: 0,
    lastUpdateTime: 0
  });
  
  // Batching state updates
  const batchedUpdatesRef = useRef<Partial<ViewerState>>({});
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update state with performance tracking - React 19 optimized
  const updateState = useCallback<ViewerStateUpdater>((updates) => {
    const startTime = performance.now();
    
    try {
      if (config.enableBatching) {
        // Batch updates for better performance
        Object.assign(batchedUpdatesRef.current, updates);
        
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }
        
        batchTimeoutRef.current = setTimeout(() => {
          const batchedUpdates = batchedUpdatesRef.current;
          batchedUpdatesRef.current = {};
          
          // Use startTransition for non-urgent state updates
          startTransition(() => {
            dispatch({ type: 'BATCH_UPDATE', payload: batchedUpdates });
            
            if (config.enableHistory) {
              historyDispatch({ type: 'PUSH', state: { ...state, ...batchedUpdates } });
            }
          });
        }, config.batchTimeout);
      } else {
        // Immediate update with startTransition
        startTransition(() => {
          dispatch({ type: 'BATCH_UPDATE', payload: updates });
          
          if (config.enableHistory) {
            historyDispatch({ type: 'PUSH', state: { ...state, ...updates } });
          }
        });
      }
      
      // Performance tracking
      if (config.enablePerformanceTracking) {
        const updateTime = performance.now() - startTime;
        performanceRef.current.updateCount++;
        performanceRef.current.totalUpdateTime += updateTime;
        performanceRef.current.lastUpdateTime = updateTime;
      }
      
    } catch (error) {
      const viewerError = new ViewerError(
        `State update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STATE_UPDATE_ERROR',
        'medium'
      );
      
      onError?.(viewerError);
      logger.error(LogCategory.SYSTEM, 'State update error', { error: error.message, stack: error.stack });
    }
  }, [state, config, onError]);
  
  // Batch update function - React 19 optimized
  const batchUpdate = useCallback((updates: Partial<ViewerState>) => {
    startTransition(() => {
      dispatch({ type: 'BATCH_UPDATE', payload: updates });
      
      if (config.enableHistory) {
        historyDispatch({ type: 'PUSH', state: { ...state, ...updates } });
      }
    });
  }, [state, config.enableHistory]);
  
  // Reset state - React 19 optimized
  const resetState = useCallback(() => {
    const defaultState = createDefaultViewerState();
    startTransition(() => {
      dispatch({ type: 'BATCH_UPDATE', payload: defaultState });
      
      if (config.enableHistory) {
        historyDispatch({ type: 'CLEAR' });
      }
    });
  }, [config.enableHistory]);
  
  // State selector - memoized for React 19
  const selectState = useCallback(<T,>(selector: ViewerStateSelector<T>): T => {
    return selector(state);
  }, [state]);
  
  // History operations - React 19 optimized
  const undo = useCallback(() => {
    if (history.past.length > 0) {
      startTransition(() => {
        historyDispatch({ type: 'UNDO' });
        dispatch({ type: 'BATCH_UPDATE', payload: history.past[history.past.length - 1] });
      });
    }
  }, [history.past]);
  
  const redo = useCallback(() => {
    if (history.future.length > 0) {
      startTransition(() => {
        historyDispatch({ type: 'REDO' });
        dispatch({ type: 'BATCH_UPDATE', payload: history.future[0] });
      });
    }
  }, [history.future]);
  
  const clearHistory = useCallback(() => {
    startTransition(() => {
      historyDispatch({ type: 'CLEAR' });
    });
  }, []);
  
  // Configuration update - React 19 optimized
  const [currentConfig, setCurrentConfig] = React.useState(() => config);
  const updateConfig = useCallback((newConfig: Partial<StateManagerConfig>) => {
    startTransition(() => {
      setCurrentConfig(prev => ({ ...prev, ...newConfig }));
    });
  }, []);
  
  // Performance metrics - memoized for React 19
  const performanceMetrics = useMemo(() => ({
    updateCount: performanceRef.current.updateCount,
    averageUpdateTime: performanceRef.current.updateCount > 0 
      ? performanceRef.current.totalUpdateTime / performanceRef.current.updateCount 
      : 0,
    lastUpdateTime: performanceRef.current.lastUpdateTime
  }), [performanceRef.current.updateCount, performanceRef.current.totalUpdateTime, performanceRef.current.lastUpdateTime]);
  
  // State change notification
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);
  
  // Persistence (if enabled) - React 19 optimized
  useEffect(() => {
    if (config.enablePersistence && typeof window !== 'undefined') {
      try {
        startTransition(() => {
          localStorage.setItem(config.persistenceKey, JSON.stringify(state));
        });
      } catch (error) {
        logger.warn(LogCategory.SYSTEM, 'Failed to persist state', { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, [state, config.enablePersistence, config.persistenceKey]);
  
  // Load persisted state on mount - React 19 optimized
  useEffect(() => {
    if (config.enablePersistence && typeof window !== 'undefined') {
      try {
        const persistedState = localStorage.getItem(config.persistenceKey);
        if (persistedState) {
          const parsed = JSON.parse(persistedState);
          startTransition(() => {
            dispatch({ type: 'BATCH_UPDATE', payload: parsed });
          });
        }
      } catch (error) {
        logger.warn(LogCategory.SYSTEM, 'Failed to load persisted state', { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, [config.enablePersistence, config.persistenceKey]);
  
  // Cleanup batched updates on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);
  
  // Memoize context value for React 19 performance
  const contextValue: StateManagerContextValue = useMemo(() => ({
    state,
    updateState,
    resetState,
    selectState,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    clearHistory,
    batchUpdate,
    performanceMetrics,
    config: currentConfig,
    updateConfig
  }), [
    state,
    updateState,
    resetState,
    selectState,
    history.past.length,
    history.future.length,
    undo,
    redo,
    clearHistory,
    batchUpdate,
    performanceMetrics,
    currentConfig,
    updateConfig
  ]);
  
  return (
    <StateManagerContext.Provider value={contextValue}>
      {children}
    </StateManagerContext.Provider>
  );
};

// Hook to use state manager
export const useViewerState = (): StateManagerContextValue => {
  const context = useContext(StateManagerContext);
  
  if (!context) {
    throw new ViewerError(
      'useViewerState must be used within a StateManagerProvider',
      'CONTEXT_ERROR',
      'high'
    );
  }
  
  return context;
};

// Specialized hooks for common operations
export const useViewerStateSelector = <T,>(selector: ViewerStateSelector<T>): T => {
  const { selectState } = useViewerState();
  return selectState(selector);
};

export const useViewerStateUpdater = (): ViewerStateUpdater => {
  const { updateState } = useViewerState();
  return updateState;
};

export const useViewerHistory = () => {
  const { canUndo, canRedo, undo, redo, clearHistory } = useViewerState();
  return { canUndo, canRedo, undo, redo, clearHistory };
};

export const useViewerPerformance = () => {
  const { performanceMetrics } = useViewerState();
  return performanceMetrics;
};

// Export types and utilities
export type { StateManagerConfig, StateManagerContextValue };
export { DEFAULT_CONFIG as DEFAULT_STATE_MANAGER_CONFIG };