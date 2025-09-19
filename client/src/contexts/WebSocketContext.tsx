import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  WebSocketMessage, 
  CodeSuggestionsMessage, 
  ValidationResultMessage,
  StudyProcessingMessage,
  ImageLoadingMessage,
  AIProcessingMessage,
  SystemNotificationMessage,
  WorkflowUpdateMessage,
  UserActivityMessage
} from '../types';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  sendMessage: (message: WebSocketMessage) => void;
  
  // Billing WebSocket methods (existing)
  onCodeSuggestions: (callback: (message: CodeSuggestionsMessage) => void) => () => void;
  onValidationResult: (callback: (message: ValidationResultMessage) => void) => () => void;
  requestCodeSuggestions: (findings: string, examType: string, requestId?: string) => void;
  validateCodes: (cptCodes: string[], icd10Codes: string[], examType: string, requestId?: string) => void;
  updateFindings: (findings: string, examType: string) => void;
  setExamType: (examType: string) => void;
  
  // New DICOM WebSocket methods
  onStudyProcessing: (callback: (message: StudyProcessingMessage) => void) => () => void;
  onImageLoading: (callback: (message: ImageLoadingMessage) => void) => () => void;
  onAIProcessing: (callback: (message: AIProcessingMessage) => void) => () => void;
  onSystemNotification: (callback: (message: SystemNotificationMessage) => void) => () => void;
  onWorkflowUpdate: (callback: (message: WorkflowUpdateMessage) => void) => () => void;
  onUserActivity: (callback: (message: UserActivityMessage) => void) => () => void;
  
  // DICOM-specific actions
  subscribeToStudy: (studyUid: string) => void;
  unsubscribeFromStudy: (studyUid: string) => void;
  requestImagePreload: (studyUid: string, seriesUid?: string) => void;
  reportUserActivity: (activity: string, studyUid?: string, reportId?: string) => void;
  requestAIProcessing: (studyUid: string, processingType: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongTime = useRef<number>(Date.now());
  const subscribedStudies = useRef<Set<string>>(new Set());

  // Event listeners
  const codeSuggestionsListeners = useRef<Set<(message: CodeSuggestionsMessage) => void>>(new Set());
  const validationResultListeners = useRef<Set<(message: ValidationResultMessage) => void>>(new Set());
  const studyProcessingListeners = useRef<Set<(message: StudyProcessingMessage) => void>>(new Set());
  const imageLoadingListeners = useRef<Set<(message: ImageLoadingMessage) => void>>(new Set());
  const aiProcessingListeners = useRef<Set<(message: AIProcessingMessage) => void>>(new Set());
  const systemNotificationListeners = useRef<Set<(message: SystemNotificationMessage) => void>>(new Set());
  const workflowUpdateListeners = useRef<Set<(message: WorkflowUpdateMessage) => void>>(new Set());
  const userActivityListeners = useRef<Set<(message: UserActivityMessage) => void>>(new Set());

  const connect = () => {
    if (!isAuthenticated || !user) return;

    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
      const ws = new WebSocket(`${wsUrl}/ws/dicom/${user.id}`);

      ws.onopen = () => {
        console.log('DICOM WebSocket connected');
        setIsConnected(true);
        setConnectionQuality('excellent');
        reconnectAttempts.current = 0;
        lastPongTime.current = Date.now();
        
        // Send initial subscription for user's studies
        ws.send(JSON.stringify({
          type: 'subscribe_user_studies',
          user_id: user.id
        }));
        
        // Start ping/pong for connection quality monitoring
        startPingPong(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('DICOM WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionQuality('disconnected');
        wsRef.current = null;
        stopPingPong();

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttempts.current);
        }
      };

      ws.onerror = (error) => {
        console.error('DICOM WebSocket error:', error);
        setConnectionQuality('poor');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating DICOM WebSocket connection:', error);
    }
  };

  const startPingPong = (ws: WebSocket) => {
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        // Check connection quality based on pong response time
        const timeSinceLastPong = Date.now() - lastPongTime.current;
        if (timeSinceLastPong > 10000) {
          setConnectionQuality('poor');
        } else if (timeSinceLastPong > 5000) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('excellent');
        }
      }
    }, 30000); // Ping every 30 seconds
  };

  const stopPingPong = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopPingPong();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User logout');
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionQuality('disconnected');
    subscribedStudies.current.clear();
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      // Existing billing messages
      case 'code_suggestions':
        codeSuggestionsListeners.current.forEach(listener => {
          listener(message as CodeSuggestionsMessage);
        });
        break;
      
      case 'validation_result':
        validationResultListeners.current.forEach(listener => {
          listener(message as ValidationResultMessage);
        });
        break;
      
      // New DICOM messages
      case 'study_processing':
        studyProcessingListeners.current.forEach(listener => {
          listener(message as StudyProcessingMessage);
        });
        break;
        
      case 'image_loading':
        imageLoadingListeners.current.forEach(listener => {
          listener(message as ImageLoadingMessage);
        });
        break;
        
      case 'ai_processing':
        aiProcessingListeners.current.forEach(listener => {
          listener(message as AIProcessingMessage);
        });
        break;
        
      case 'system_notification':
        systemNotificationListeners.current.forEach(listener => {
          listener(message as SystemNotificationMessage);
        });
        break;
        
      case 'workflow_update':
        workflowUpdateListeners.current.forEach(listener => {
          listener(message as WorkflowUpdateMessage);
        });
        break;
        
      case 'user_activity':
        userActivityListeners.current.forEach(listener => {
          listener(message as UserActivityMessage);
        });
        break;
      
      case 'connection_established':
        console.log('DICOM WebSocket connection established:', message);
        break;
      
      case 'pong':
        lastPongTime.current = Date.now();
        const latency = Date.now() - (message.timestamp || 0);
        if (latency < 100) {
          setConnectionQuality('excellent');
        } else if (latency < 300) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('poor');
        }
        break;
      
      case 'error':
        console.error('DICOM WebSocket error message:', message.message);
        break;
      
      default:
        console.log('Unknown DICOM WebSocket message type:', message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('DICOM WebSocket not connected, cannot send message:', message);
    }
  };

  // Existing billing methods
  const onCodeSuggestions = (callback: (message: CodeSuggestionsMessage) => void) => {
    codeSuggestionsListeners.current.add(callback);
    return () => {
      codeSuggestionsListeners.current.delete(callback);
    };
  };

  const onValidationResult = (callback: (message: ValidationResultMessage) => void) => {
    validationResultListeners.current.add(callback);
    return () => {
      validationResultListeners.current.delete(callback);
    };
  };

  const requestCodeSuggestions = (findings: string, examType: string, requestId?: string) => {
    sendMessage({
      type: 'get_suggestions',
      findings,
      exam_type: examType,
      request_id: requestId,
    });
  };

  const validateCodes = (
    cptCodes: string[],
    icd10Codes: string[],
    examType: string,
    requestId?: string
  ) => {
    sendMessage({
      type: 'validate_codes',
      cpt_codes: cptCodes,
      icd10_codes: icd10Codes,
      exam_type: examType,
      request_id: requestId,
    });
  };

  const updateFindings = (findings: string, examType: string) => {
    sendMessage({
      type: 'findings_update',
      findings,
      exam_type: examType,
    });
  };

  const setExamType = (examType: string) => {
    sendMessage({
      type: 'set_exam_type',
      exam_type: examType,
    });
  };

  // New DICOM methods
  const onStudyProcessing = (callback: (message: StudyProcessingMessage) => void) => {
    studyProcessingListeners.current.add(callback);
    return () => {
      studyProcessingListeners.current.delete(callback);
    };
  };

  const onImageLoading = (callback: (message: ImageLoadingMessage) => void) => {
    imageLoadingListeners.current.add(callback);
    return () => {
      imageLoadingListeners.current.delete(callback);
    };
  };

  const onAIProcessing = (callback: (message: AIProcessingMessage) => void) => {
    aiProcessingListeners.current.add(callback);
    return () => {
      aiProcessingListeners.current.delete(callback);
    };
  };

  const onSystemNotification = (callback: (message: SystemNotificationMessage) => void) => {
    systemNotificationListeners.current.add(callback);
    return () => {
      systemNotificationListeners.current.delete(callback);
    };
  };

  const onWorkflowUpdate = (callback: (message: WorkflowUpdateMessage) => void) => {
    workflowUpdateListeners.current.add(callback);
    return () => {
      workflowUpdateListeners.current.delete(callback);
    };
  };

  const onUserActivity = (callback: (message: UserActivityMessage) => void) => {
    userActivityListeners.current.add(callback);
    return () => {
      userActivityListeners.current.delete(callback);
    };
  };

  const subscribeToStudy = (studyUid: string) => {
    if (!subscribedStudies.current.has(studyUid)) {
      subscribedStudies.current.add(studyUid);
      sendMessage({
        type: 'subscribe_study',
        study_uid: studyUid,
      });
    }
  };

  const unsubscribeFromStudy = (studyUid: string) => {
    if (subscribedStudies.current.has(studyUid)) {
      subscribedStudies.current.delete(studyUid);
      sendMessage({
        type: 'unsubscribe_study',
        study_uid: studyUid,
      });
    }
  };

  const requestImagePreload = (studyUid: string, seriesUid?: string) => {
    sendMessage({
      type: 'request_preload',
      study_uid: studyUid,
      series_uid: seriesUid,
    });
  };

  const reportUserActivity = (activity: string, studyUid?: string, reportId?: string) => {
    sendMessage({
      type: 'user_activity',
      activity,
      study_uid: studyUid,
      report_id: reportId,
      timestamp: new Date().toISOString(),
    });
  };

  const requestAIProcessing = (studyUid: string, processingType: string) => {
    sendMessage({
      type: 'request_ai_processing',
      study_uid: studyUid,
      processing_type: processingType,
    });
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  const value: WebSocketContextType = {
    isConnected,
    connectionQuality,
    sendMessage,
    
    // Existing billing methods
    onCodeSuggestions,
    onValidationResult,
    requestCodeSuggestions,
    validateCodes,
    updateFindings,
    setExamType,
    
    // New DICOM methods
    onStudyProcessing,
    onImageLoading,
    onAIProcessing,
    onSystemNotification,
    onWorkflowUpdate,
    onUserActivity,
    subscribeToStudy,
    unsubscribeFromStudy,
    requestImagePreload,
    reportUserActivity,
    requestAIProcessing,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}