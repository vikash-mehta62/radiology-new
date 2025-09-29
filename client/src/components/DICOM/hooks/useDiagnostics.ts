import { useState, useCallback, useRef, useEffect } from 'react';
import { gpuDiagnosticsService } from '../services/gpuDiagnosticsService';
import { cornerstoneDiagnosticsService } from '../services/cornerstoneDiagnosticsService';
import { windowLevelDiagnosticsService } from '../services/windowLevelDiagnosticsService';
import { dataFlowIntegrityService } from '../services/dataFlowIntegrityService';

export interface DiagnosticEvent {
  id: string;
  timestamp: Date;
  type: 'gpu' | 'cornerstone' | 'windowLevel' | 'dataFlow';
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
}

export interface DiagnosticState {
  enabled: boolean;
  panelOpen: boolean;
  gpuDiagnostics: any | null;
  cornerstoneDiagnostics: any | null;
  windowLevelDiagnostics: any | null;
  dataFlowDiagnostics: any | null;
  events: DiagnosticEvent[];
  history: DiagnosticEvent[];
  isRunning: boolean;
  lastRunTime: Date | null;
}

export interface DiagnosticActions {
  initialize: () => Promise<void>;
  runDiagnostics: () => Promise<void>;
  runGpuDiagnostics: () => Promise<void>;
  runCornerstoneDiagnostics: () => Promise<void>;
  runWindowLevelDiagnostics: (imageData?: any) => Promise<void>;
  runDataFlowDiagnostics: () => Promise<void>;
  addEvent: (event: Omit<DiagnosticEvent, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  togglePanel: () => void;
  setEnabled: (enabled: boolean) => void;
  exportDiagnosticReport: () => Promise<string>;
}

export interface UseDiagnosticsOptions {
  autoInitialize?: boolean;
  autoRunInterval?: number; // in milliseconds
  maxHistorySize?: number;
  onEvent?: (event: DiagnosticEvent) => void;
  onError?: (error: Error) => void;
}

export const useDiagnostics = (options: UseDiagnosticsOptions = {}): [DiagnosticState, DiagnosticActions] => {
  const {
    autoInitialize = true,
    autoRunInterval = 0, // 0 means no auto-run
    maxHistorySize = 1000,
    onEvent,
    onError
  } = options;

  const [state, setState] = useState<DiagnosticState>({
    enabled: true,
    panelOpen: false,
    gpuDiagnostics: null,
    cornerstoneDiagnostics: null,
    windowLevelDiagnostics: null,
    dataFlowDiagnostics: null,
    events: [],
    history: [],
    isRunning: false,
    lastRunTime: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventIdCounter = useRef(0);

  const generateEventId = useCallback(() => {
    return `event_${Date.now()}_${++eventIdCounter.current}`;
  }, []);

  const addEvent = useCallback((eventData: Omit<DiagnosticEvent, 'id' | 'timestamp'>) => {
    const event: DiagnosticEvent = {
      ...eventData,
      id: generateEventId(),
      timestamp: new Date()
    };

    setState(prev => {
      const newEvents = [...prev.events, event];
      const newHistory = [...prev.history, event];
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.splice(0, newHistory.length - maxHistorySize);
      }

      return {
        ...prev,
        events: newEvents,
        history: newHistory
      };
    });

    // Call external event handler
    if (onEvent) {
      onEvent(event);
    }
  }, [generateEventId, maxHistorySize, onEvent]);

  const handleError = useCallback((error: Error, context: string) => {
    console.error(`[Diagnostics] ${context}:`, error);
    
    addEvent({
      type: 'gpu', // Default type, could be made more specific
      level: 'error',
      message: `${context}: ${error.message}`,
      details: { error: error.stack }
    });

    if (onError) {
      onError(error);
    }
  }, [addEvent, onError]);

  const runGpuDiagnostics = useCallback(async () => {
    try {
      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Starting GPU diagnostics...'
      });

      const result = await gpuDiagnosticsService.runDiagnostics();
      
      setState(prev => ({ ...prev, gpuDiagnostics: result }));
      
      addEvent({
        type: 'gpu',
        level: result.status === 'healthy' ? 'info' : 'warning',
        message: `GPU diagnostics completed: ${result.status}`,
        details: result
      });
    } catch (error) {
      handleError(error as Error, 'GPU Diagnostics');
    }
  }, [addEvent, handleError]);

  const runCornerstoneDiagnostics = useCallback(async () => {
    try {
      addEvent({
        type: 'cornerstone',
        level: 'info',
        message: 'Starting Cornerstone diagnostics...'
      });

      const result = await cornerstoneDiagnosticsService.runDiagnostics();
      
      setState(prev => ({ ...prev, cornerstoneDiagnostics: result }));
      
      addEvent({
        type: 'cornerstone',
        level: result.status === 'healthy' ? 'info' : 'warning',
        message: `Cornerstone diagnostics completed: ${result.status}`,
        details: result
      });
    } catch (error) {
      handleError(error as Error, 'Cornerstone Diagnostics');
    }
  }, [addEvent, handleError]);

  const runWindowLevelDiagnostics = useCallback(async (imageData?: any) => {
    try {
      addEvent({
        type: 'windowLevel',
        level: 'info',
        message: 'Starting Window/Level diagnostics...'
      });

      const result = await windowLevelDiagnosticsService.runDiagnostics(imageData);
      
      setState(prev => ({ ...prev, windowLevelDiagnostics: result }));
      
      addEvent({
        type: 'windowLevel',
        level: result.status === 'healthy' ? 'info' : 'warning',
        message: `Window/Level diagnostics completed: ${result.status}`,
        details: result
      });
    } catch (error) {
      handleError(error as Error, 'Window/Level Diagnostics');
    }
  }, [addEvent, handleError]);

  const runDataFlowDiagnostics = useCallback(async () => {
    try {
      addEvent({
        type: 'dataFlow',
        level: 'info',
        message: 'Starting Data Flow diagnostics...'
      });

      const result = await dataFlowIntegrityService.runDiagnostics();
      
      setState(prev => ({ ...prev, dataFlowDiagnostics: result }));
      
      addEvent({
        type: 'dataFlow',
        level: result.status === 'healthy' ? 'info' : 'warning',
        message: `Data Flow diagnostics completed: ${result.status}`,
        details: result
      });
    } catch (error) {
      handleError(error as Error, 'Data Flow Diagnostics');
    }
  }, [addEvent, handleError]);

  const runDiagnostics = useCallback(async () => {
    if (state.isRunning) {
      return;
    }

    setState(prev => ({ ...prev, isRunning: true }));

    try {
      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Starting comprehensive diagnostic scan...'
      });

      // Run all diagnostics in parallel
      await Promise.all([
        runGpuDiagnostics(),
        runCornerstoneDiagnostics(),
        runDataFlowDiagnostics()
      ]);

      // Run window/level diagnostics if image data is available
      // This would need to be passed from the component
      await runWindowLevelDiagnostics();

      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        lastRunTime: new Date() 
      }));

      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Comprehensive diagnostic scan completed successfully'
      });
    } catch (error) {
      setState(prev => ({ ...prev, isRunning: false }));
      handleError(error as Error, 'Comprehensive Diagnostics');
    }
  }, [state.isRunning, addEvent, runGpuDiagnostics, runCornerstoneDiagnostics, runDataFlowDiagnostics, runWindowLevelDiagnostics, handleError]);

  const initialize = useCallback(async () => {
    try {
      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Initializing diagnostic services...'
      });

      // Initialize all diagnostic services
      await Promise.all([
        gpuDiagnosticsService.initialize(),
        cornerstoneDiagnosticsService.initialize(),
        windowLevelDiagnosticsService.initialize(),
        dataFlowIntegrityService.initialize()
      ]);

      // Set up event listeners for each service
      gpuDiagnosticsService.onEvent((event) => {
        addEvent({
          type: 'gpu',
          level: event.level,
          message: event.message,
          details: event.details
        });
      });

      cornerstoneDiagnosticsService.onEvent((event) => {
        addEvent({
          type: 'cornerstone',
          level: event.level,
          message: event.message,
          details: event.details
        });
      });

      dataFlowIntegrityService.onEvent((event) => {
        addEvent({
          type: 'dataFlow',
          level: event.level,
          message: event.message,
          details: event.details
        });
      });

      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Diagnostic services initialized successfully'
      });

      // Run initial diagnostics
      await runDiagnostics();
    } catch (error) {
      handleError(error as Error, 'Diagnostic Initialization');
    }
  }, [addEvent, runDiagnostics, handleError]);

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
    addEvent({
      type: 'gpu',
      level: 'info',
      message: 'Diagnostic history cleared'
    });
  }, [addEvent]);

  const togglePanel = useCallback(() => {
    setState(prev => ({ ...prev, panelOpen: !prev.panelOpen }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, enabled }));
    
    if (enabled) {
      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Diagnostics enabled'
      });
    } else {
      addEvent({
        type: 'gpu',
        level: 'info',
        message: 'Diagnostics disabled'
      });
    }
  }, [addEvent]);

  const exportDiagnosticReport = useCallback(async (): Promise<string> => {
    const report = {
      timestamp: new Date().toISOString(),
      diagnostics: {
        gpu: state.gpuDiagnostics,
        cornerstone: state.cornerstoneDiagnostics,
        windowLevel: state.windowLevelDiagnostics,
        dataFlow: state.dataFlowDiagnostics
      },
      events: state.events,
      history: state.history,
      summary: {
        totalEvents: state.events.length,
        errorCount: state.events.filter(e => e.level === 'error').length,
        warningCount: state.events.filter(e => e.level === 'warning').length,
        lastRunTime: state.lastRunTime
      }
    };

    return JSON.stringify(report, null, 2);
  }, [state]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }
  }, [autoInitialize, initialize]);

  // Set up auto-run interval
  useEffect(() => {
    if (autoRunInterval > 0 && state.enabled) {
      intervalRef.current = setInterval(() => {
        runDiagnostics();
      }, autoRunInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRunInterval, state.enabled, runDiagnostics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const actions: DiagnosticActions = {
    initialize,
    runDiagnostics,
    runGpuDiagnostics,
    runCornerstoneDiagnostics,
    runWindowLevelDiagnostics,
    runDataFlowDiagnostics,
    addEvent,
    clearHistory,
    togglePanel,
    setEnabled,
    exportDiagnosticReport
  };

  return [state, actions];
};

export default useDiagnostics;