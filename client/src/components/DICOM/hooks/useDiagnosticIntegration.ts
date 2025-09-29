import { useCallback, useEffect, useRef, useState } from 'react';
import { useDiagnostics } from './useDiagnostics';
import { usePerformanceDiagnostics } from './usePerformanceDiagnostics';
import type { 
  DiagnosticResult, 
  DiagnosticEvent, 
  DiagnosticState, 
  DiagnosticActions 
} from './useDiagnostics';
import type { 
  PerformanceMetrics, 
  PerformanceAlert, 
  PerformanceDiagnosticState, 
  PerformanceDiagnosticActions 
} from './usePerformanceDiagnostics';

export interface IntegratedDiagnosticState {
  // Core diagnostics
  diagnostics: DiagnosticState;
  performance: PerformanceDiagnosticState;
  
  // Integration state
  isInitialized: boolean;
  lastSync: Date | null;
  syncErrors: string[];
  
  // Unified alerts
  allAlerts: (DiagnosticEvent | PerformanceAlert)[];
  criticalIssues: number;
  warningIssues: number;
}

export interface IntegratedDiagnosticActions {
  // Core actions
  diagnostics: DiagnosticActions;
  performance: PerformanceDiagnosticActions;
  
  // Integration actions
  initializeAll: () => Promise<void>;
  runFullDiagnostics: () => Promise<void>;
  syncDiagnostics: () => void;
  clearAllAlerts: () => void;
  generateUnifiedReport: () => Promise<string>;
  exportAllData: () => Promise<Blob>;
  
  // Event handlers
  onDiagnosticUpdate: (callback: (state: IntegratedDiagnosticState) => void) => void;
  onCriticalAlert: (callback: (alert: DiagnosticEvent | PerformanceAlert) => void) => void;
}

export interface UseDiagnosticIntegrationOptions {
  autoInitialize?: boolean;
  autoStartPerformanceMonitoring?: boolean;
  syncInterval?: number; // milliseconds
  enableRealTimeAlerts?: boolean;
  performanceMonitoringInterval?: number;
  onStateChange?: (state: IntegratedDiagnosticState) => void;
  onCriticalIssue?: (issue: DiagnosticEvent | PerformanceAlert) => void;
  onError?: (error: Error) => void;
}

export const useDiagnosticIntegration = (
  options: UseDiagnosticIntegrationOptions = {}
): [IntegratedDiagnosticState, IntegratedDiagnosticActions] => {
  const {
    autoInitialize = true,
    autoStartPerformanceMonitoring = true,
    syncInterval = 5000, // 5 seconds
    enableRealTimeAlerts = true,
    performanceMonitoringInterval = 1000,
    onStateChange,
    onCriticalIssue,
    onError
  } = options;

  // Initialize diagnostic hooks
  const [diagnosticState, diagnosticActions] = useDiagnostics({
    autoInitialize: false, // We'll handle initialization manually
    autoRun: false
  });

  const [performanceState, performanceActions] = usePerformanceDiagnostics({
    monitoringInterval: performanceMonitoringInterval,
    onAlert: (alert) => {
      if (enableRealTimeAlerts && onCriticalIssue && alert.level === 'critical') {
        onCriticalIssue(alert);
      }
    }
  });

  // Integration state
  const [integrationState, setIntegrationState] = useState({
    isInitialized: false,
    lastSync: null as Date | null,
    syncErrors: [] as string[]
  });

  // Refs for callbacks and intervals
  const stateChangeCallbackRef = useRef<((state: IntegratedDiagnosticState) => void) | null>(null);
  const criticalAlertCallbackRef = useRef<((alert: DiagnosticEvent | PerformanceAlert) => void) | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate unified state
  const unifiedState: IntegratedDiagnosticState = {
    diagnostics: diagnosticState,
    performance: performanceState,
    ...integrationState,
    allAlerts: [
      ...diagnosticState.events,
      ...performanceState.alerts
    ].sort((a, b) => {
      const aTime = 'timestamp' in a ? a.timestamp : a.createdAt;
      const bTime = 'timestamp' in b ? b.timestamp : b.createdAt;
      return bTime.getTime() - aTime.getTime();
    }),
    criticalIssues: [
      ...diagnosticState.events.filter(e => e.severity === 'error'),
      ...performanceState.alerts.filter(a => a.level === 'critical')
    ].length,
    warningIssues: [
      ...diagnosticState.events.filter(e => e.severity === 'warning'),
      ...performanceState.alerts.filter(a => a.level === 'warning')
    ].length
  };

  // Initialize all diagnostic services
  const initializeAll = useCallback(async () => {
    try {
      setIntegrationState(prev => ({ ...prev, syncErrors: [] }));
      
      // Initialize core diagnostics
      await diagnosticActions.initialize();
      
      // Start performance monitoring if enabled
      if (autoStartPerformanceMonitoring) {
        performanceActions.startMonitoring();
      }
      
      setIntegrationState(prev => ({ 
        ...prev, 
        isInitialized: true,
        lastSync: new Date()
      }));
      
      console.log('[Diagnostic Integration] All services initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setIntegrationState(prev => ({ 
        ...prev, 
        syncErrors: [...prev.syncErrors, errorMessage]
      }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
      
      console.error('[Diagnostic Integration] Initialization failed:', error);
    }
  }, [diagnosticActions, performanceActions, autoStartPerformanceMonitoring, onError]);

  // Run comprehensive diagnostics
  const runFullDiagnostics = useCallback(async () => {
    try {
      // Run core diagnostics
      await diagnosticActions.runDiagnostics();
      
      // Collect current performance metrics
      const currentTime = performance.now();
      performanceActions.updateMetrics({
        fps: 60, // This would be calculated from actual frame timing
        renderTime: currentTime % 100, // Placeholder - would be actual render time
        loadTime: currentTime % 1000 // Placeholder - would be actual load time
      });
      
      setIntegrationState(prev => ({ 
        ...prev, 
        lastSync: new Date(),
        syncErrors: []
      }));
      
      console.log('[Diagnostic Integration] Full diagnostics completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Diagnostic run failed';
      setIntegrationState(prev => ({ 
        ...prev, 
        syncErrors: [...prev.syncErrors, errorMessage]
      }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
      
      console.error('[Diagnostic Integration] Full diagnostics failed:', error);
    }
  }, [diagnosticActions, performanceActions, onError]);

  // Sync diagnostics data
  const syncDiagnostics = useCallback(() => {
    try {
      // This could involve syncing with external services, 
      // validating data consistency, etc.
      setIntegrationState(prev => ({ 
        ...prev, 
        lastSync: new Date(),
        syncErrors: []
      }));
      
      // Trigger state change callback
      if (stateChangeCallbackRef.current) {
        stateChangeCallbackRef.current(unifiedState);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setIntegrationState(prev => ({ 
        ...prev, 
        syncErrors: [...prev.syncErrors, errorMessage]
      }));
      
      console.error('[Diagnostic Integration] Sync failed:', error);
    }
  }, [unifiedState]);

  // Clear all alerts and events
  const clearAllAlerts = useCallback(() => {
    diagnosticActions.clearHistory();
    performanceActions.clearAlerts();
    
    setIntegrationState(prev => ({ 
      ...prev, 
      lastSync: new Date()
    }));
  }, [diagnosticActions, performanceActions]);

  // Generate unified report
  const generateUnifiedReport = useCallback(async (): Promise<string> => {
    try {
      const diagnosticReport = diagnosticActions.generateReport();
      const performanceReport = performanceActions.generateReport();
      
      const unifiedReport = {
        timestamp: new Date().toISOString(),
        summary: {
          totalIssues: unifiedState.criticalIssues + unifiedState.warningIssues,
          criticalIssues: unifiedState.criticalIssues,
          warningIssues: unifiedState.warningIssues,
          lastSync: integrationState.lastSync?.toISOString(),
          syncErrors: integrationState.syncErrors
        },
        diagnostics: JSON.parse(diagnosticReport),
        performance: JSON.parse(performanceReport),
        integration: {
          isInitialized: integrationState.isInitialized,
          syncErrors: integrationState.syncErrors,
          totalAlerts: unifiedState.allAlerts.length
        }
      };
      
      return JSON.stringify(unifiedReport, null, 2);
    } catch (error) {
      console.error('[Diagnostic Integration] Report generation failed:', error);
      throw error;
    }
  }, [diagnosticActions, performanceActions, unifiedState, integrationState]);

  // Export all diagnostic data
  const exportAllData = useCallback(async (): Promise<Blob> => {
    try {
      const report = await generateUnifiedReport();
      const performanceMetrics = await performanceActions.exportMetrics();
      
      // Create a comprehensive export
      const exportData = {
        report: JSON.parse(report),
        performanceMetrics: await performanceMetrics.text(),
        exportTimestamp: new Date().toISOString()
      };
      
      return new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
    } catch (error) {
      console.error('[Diagnostic Integration] Export failed:', error);
      throw error;
    }
  }, [generateUnifiedReport, performanceActions]);

  // Event handler registration
  const onDiagnosticUpdate = useCallback((callback: (state: IntegratedDiagnosticState) => void) => {
    stateChangeCallbackRef.current = callback;
  }, []);

  const onCriticalAlert = useCallback((callback: (alert: DiagnosticEvent | PerformanceAlert) => void) => {
    criticalAlertCallbackRef.current = callback;
  }, []);

  // Auto-initialization effect
  useEffect(() => {
    if (autoInitialize && !integrationState.isInitialized) {
      initializeAll();
    }
  }, [autoInitialize, integrationState.isInitialized, initializeAll]);

  // Sync interval effect
  useEffect(() => {
    if (syncInterval > 0 && integrationState.isInitialized) {
      syncIntervalRef.current = setInterval(syncDiagnostics, syncInterval);
      
      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    }
  }, [syncInterval, integrationState.isInitialized, syncDiagnostics]);

  // State change notification effect
  useEffect(() => {
    if (onStateChange) {
      onStateChange(unifiedState);
    }
  }, [unifiedState, onStateChange]);

  // Critical alert monitoring effect
  useEffect(() => {
    const recentCriticalAlerts = unifiedState.allAlerts.filter(alert => {
      const alertTime = 'timestamp' in alert ? alert.timestamp : alert.createdAt;
      const timeDiff = Date.now() - alertTime.getTime();
      const isCritical = 'level' in alert ? alert.level === 'critical' : alert.severity === 'error';
      return isCritical && timeDiff < 1000; // Within last second
    });

    if (recentCriticalAlerts.length > 0 && criticalAlertCallbackRef.current) {
      recentCriticalAlerts.forEach(alert => {
        if (criticalAlertCallbackRef.current) {
          criticalAlertCallbackRef.current(alert);
        }
      });
    }
  }, [unifiedState.allAlerts]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      // Stop performance monitoring
      if (performanceState.isMonitoring) {
        performanceActions.stopMonitoring();
      }
    };
  }, [performanceState.isMonitoring, performanceActions]);

  const actions: IntegratedDiagnosticActions = {
    diagnostics: diagnosticActions,
    performance: performanceActions,
    initializeAll,
    runFullDiagnostics,
    syncDiagnostics,
    clearAllAlerts,
    generateUnifiedReport,
    exportAllData,
    onDiagnosticUpdate,
    onCriticalAlert
  };

  return [unifiedState, actions];
};

export default useDiagnosticIntegration;