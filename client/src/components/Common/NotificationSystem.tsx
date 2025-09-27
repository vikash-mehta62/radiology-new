import React, { useEffect, useState, useCallback, useMemo, startTransition } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Slide,
  Stack,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudSync as SyncIcon,
  Psychology as AIIcon,
  Image as ImageIcon,
  Assignment as ReportIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../../contexts/WebSocketContext';
import {
  SystemNotificationMessage,
  StudyProcessingMessage,
  ImageLoadingMessage,
  AIProcessingMessage,
  WorkflowUpdateMessage,
} from '../../types';

interface Notification {
  id: string;
  type: 'system' | 'study' | 'image' | 'ai' | 'workflow';
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  progress?: number;
  autoDismiss?: boolean;
  dismissAfter?: number;
  actionUrl?: string;
  timestamp: number;
}

export function NotificationSystem() {
  // Initialize state with lazy initialization for React 19
  const [notifications, setNotifications] = useState<Notification[]>(() => []);
  
  const { 
    onSystemNotification, 
    onStudyProcessing, 
    onImageLoading, 
    onAIProcessing, 
    onWorkflowUpdate,
    connectionQuality,
    isConnected 
  } = useWebSocket();

  // Memoize notification handlers for React 19 performance
  const addNotification = useCallback((notification: Notification) => {
    startTransition(() => {
      setNotifications(prev => [...prev, notification]);
    });
  }, []);

  const updateNotification = useCallback((notification: Notification) => {
    startTransition(() => {
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notification.id);
        return [...filtered, notification];
      });
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    startTransition(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    });
  }, []);

  // Handle system notifications - React 19 optimized
  useEffect(() => {
    const unsubscribe = onSystemNotification((message: SystemNotificationMessage) => {
      const notification: Notification = {
        id: `system-${Date.now()}`,
        type: 'system',
        level: message.level,
        title: message.title,
        message: message.message,
        autoDismiss: message.auto_dismiss ?? true,
        dismissAfter: message.dismiss_after ?? 5000,
        actionUrl: message.action_url,
        timestamp: Date.now(),
      };
      
      addNotification(notification);
    });

    return unsubscribe;
  }, [onSystemNotification, addNotification]);

  // Handle study processing updates - React 19 optimized
  useEffect(() => {
    const unsubscribe = onStudyProcessing((message: StudyProcessingMessage) => {
      const notification: Notification = {
        id: `study-${message.study_uid}`,
        type: 'study',
        level: message.status === 'error' ? 'error' : 
               message.status === 'completed' ? 'success' : 'info',
        title: 'Study Processing',
        message: message.status === 'error' 
          ? `Error processing study: ${message.error_message}`
          : `Study ${message.study_uid.slice(-8)}: ${message.stage}`,
        progress: message.progress,
        autoDismiss: message.status === 'completed' || message.status === 'error',
        dismissAfter: message.status === 'completed' ? 3000 : 8000,
        timestamp: Date.now(),
      };
      
      updateNotification(notification);
    });

    return unsubscribe;
  }, [onStudyProcessing, updateNotification]);

  // Handle image loading updates - React 19 optimized
  useEffect(() => {
    const unsubscribe = onImageLoading((message: ImageLoadingMessage) => {
      if (message.progress < 100) {
        const notification: Notification = {
          id: `image-${message.study_uid}`,
          type: 'image',
          level: 'info',
          title: 'Loading Images',
          message: `Loading study images (${message.loaded_images}/${message.total_images})`,
          progress: message.progress,
          autoDismiss: false,
          timestamp: Date.now(),
        };
        
        updateNotification(notification);
      } else {
        // Remove loading notification when complete
        removeNotification(`image-${message.study_uid}`);
      }
    });

    return unsubscribe;
  }, [onImageLoading, updateNotification, removeNotification]);

  // Handle AI processing updates - React 19 optimized
  useEffect(() => {
    const unsubscribe = onAIProcessing((message: AIProcessingMessage) => {
      const notification: Notification = {
        id: `ai-${message.job_id}`,
        type: 'ai',
        level: message.status === 'failed' ? 'error' : 
               message.status === 'completed' ? 'success' : 'info',
        title: 'AI Processing',
        message: message.status === 'completed'
          ? `AI analysis complete (${Math.round((message.confidence_score || 0) * 100)}% confidence)`
          : message.status === 'failed'
          ? 'AI processing failed'
          : `AI analyzing study: ${message.stage}`,
        progress: message.progress,
        autoDismiss: message.status === 'completed' || message.status === 'failed',
        dismissAfter: 5000,
        timestamp: Date.now(),
      };
      
      updateNotification(notification);
    });

    return unsubscribe;
  }, [onAIProcessing, updateNotification]);

  // Handle workflow updates - React 19 optimized
  useEffect(() => {
    const unsubscribe = onWorkflowUpdate((message: WorkflowUpdateMessage) => {
      const notification: Notification = {
        id: `workflow-${message.workflow_id}`,
        type: 'workflow',
        level: message.status === 'error' ? 'error' : 
               !message.on_track ? 'warning' : 'info',
        title: 'Workflow Update',
        message: message.status === 'completed'
          ? 'Workflow completed successfully'
          : !message.on_track
          ? `Workflow behind schedule (${Math.round(message.elapsed_time / 60)}min elapsed)`
          : `Workflow on track (${message.status})`,
        autoDismiss: true,
        dismissAfter: message.status === 'completed' ? 3000 : 6000,
        timestamp: Date.now(),
      };
      
      updateNotification(notification);
    });

    return unsubscribe;
  }, [onWorkflowUpdate, updateNotification]);

  // Auto-dismiss notifications - React 19 optimized
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => {
        setNotifications(prev => 
          prev.filter(notification => {
            if (!notification.autoDismiss) return true;
            const age = Date.now() - notification.timestamp;
            return age < (notification.dismissAfter || 5000);
          })
        );
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Memoize dismiss handler for React 19 performance
  const dismissNotification = useCallback((id: string) => {
    removeNotification(id);
  }, [removeNotification]);

  // Memoize notification icon getter for React 19 performance
  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'study': return <SyncIcon />;
      case 'ai': return <AIIcon />;
      case 'image': return <ImageIcon />;
      case 'workflow': return <ReportIcon />;
      default: return null;
    }
  }, []);

  // Memoize connection alerts for React 19 performance
  const connectionAlerts = useMemo(() => {
    const alerts = [];
    
    if (!isConnected) {
      alerts.push(
        <Alert key="disconnected" severity="warning" sx={{ mb: 1 }}>
          <AlertTitle>Connection Lost</AlertTitle>
          Real-time updates unavailable
        </Alert>
      );
    }
    
    if (isConnected && connectionQuality === 'poor') {
      alerts.push(
        <Alert key="poor-connection" severity="info" sx={{ mb: 1 }}>
          <AlertTitle>Poor Connection</AlertTitle>
          Real-time updates may be delayed
        </Alert>
      );
    }
    
    return alerts;
  }, [isConnected, connectionQuality]);

  // Memoize notification items for React 19 performance
  const notificationItems = useMemo(() => {
    return notifications.map((notification) => (
      <Slide
        key={notification.id}
        direction="left"
        in={true}
        mountOnEnter
        unmountOnExit
      >
        <Alert
          severity={notification.level}
          action={
            <IconButton
              size="small"
              onClick={() => dismissNotification(notification.id)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          icon={getNotificationIcon(notification.type)}
          sx={{ width: '100%' }}
        >
          <AlertTitle>{notification.title}</AlertTitle>
          <Typography variant="body2">
            {notification.message}
          </Typography>
          
          {notification.progress !== undefined && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={notification.progress} 
                sx={{ mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(notification.progress)}% complete
              </Typography>
            </Box>
          )}
          
          {notification.type && (
            <Chip
              label={notification.type.toUpperCase()}
              size="small"
              sx={{ mt: 0.5 }}
            />
          )}
        </Alert>
      </Slide>
    ));
  }, [notifications, dismissNotification, getNotificationIcon]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 9999,
        maxWidth: 400,
        width: '100%',
      }}
    >
      {/* Connection Status */}
      {connectionAlerts}

      {/* Notifications Stack */}
      <Stack spacing={1}>
        {notificationItems}
      </Stack>
    </Box>
  );
}

export default React.memo(NotificationSystem);