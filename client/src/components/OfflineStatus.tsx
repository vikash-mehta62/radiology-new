import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Typography,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CloudOff,
  Cloud,
  Sync,
  Storage,
  Report,
  Timeline,
  Delete,
  Refresh
} from '@mui/icons-material';
import { OfflineCapabilities } from '../services/offlineService';

// Mock offline service if not available
const offlineService = {
  onOnlineStatusChange: (callback: (isOnline: boolean) => void) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
  getOfflineCapabilities: async (): Promise<OfflineCapabilities> => {
    return {
      isOnline: navigator.onLine,
      hasOfflineData: false,
      pendingSyncItems: 0,
      cacheSize: 0,
      maxCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
    };
  },
  syncPendingData: async () => {},
  clearCache: async () => {},
  retryFailedSync: async () => {}
};

const OfflineStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [capabilities, setCapabilities] = useState<OfflineCapabilities | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Listen for online status changes
    const unsubscribe = offlineService.onOnlineStatusChange(setIsOnline);
    
    // Load initial capabilities
    loadCapabilities();
    
    // Refresh capabilities periodically
    const interval = setInterval(loadCapabilities, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadCapabilities = async () => {
    try {
      const caps = await offlineService.getOfflineCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Failed to load offline capabilities:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    loadCapabilities(); // Refresh when opening
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Trigger manual sync
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('background-sync-reports');
          await (registration as any).sync.register('background-sync-measurements');
        }
      }
      
      // Wait a bit and refresh capabilities
      setTimeout(() => {
        loadCapabilities();
        setSyncing(false);
      }, 2000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncing(false);
    }
  };

  const handleClearOfflineData = async () => {
    try {
      await offlineService.clearCache();
      await loadCapabilities();
      handleClose();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    if (!isOnline) return 'error';
    if (capabilities?.pendingSyncItems && capabilities.pendingSyncItems > 0) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (capabilities?.pendingSyncItems && capabilities.pendingSyncItems > 0) {
      return `${capabilities.pendingSyncItems} pending`;
    }
    return 'Online';
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick} size="small">
        <Chip
          icon={isOnline ? <Cloud /> : <CloudOff />}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          variant={isOnline ? 'filled' : 'outlined'}
        />
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            Offline Status
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={isOnline ? <Cloud /> : <CloudOff />}
              label={isOnline ? 'Connected' : 'Offline Mode'}
              color={isOnline ? 'success' : 'error'}
              sx={{ mr: 1 }}
            />
            
            {capabilities?.hasOfflineData && (
              <Chip
                icon={<Storage />}
                label="Has Offline Data"
                color="info"
                variant="outlined"
              />
            )}
          </Box>
          
          {capabilities && (
            <>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Report fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Pending Sync Items"
                    secondary={`${capabilities.pendingSyncItems} items waiting to sync`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Storage fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cache Usage"
                    secondary={`${formatBytes(capabilities.cacheSize)} / ${formatBytes(capabilities.maxCacheSize)}`}
                  />
                </ListItem>
              </List>
              
              <Box sx={{ mt: 1, mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(capabilities.cacheSize / capabilities.maxCacheSize) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              startIcon={syncing ? <Sync className="animate-spin" /> : <Sync />}
              onClick={handleSync}
              disabled={syncing || !isOnline}
              size="small"
              variant="outlined"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            
            <Button
              startIcon={<Refresh />}
              onClick={loadCapabilities}
              size="small"
              variant="outlined"
            >
              Refresh
            </Button>
            
            <Button
              startIcon={<Delete />}
              onClick={handleClearOfflineData}
              size="small"
              variant="outlined"
              color="error"
            >
              Clear Cache
            </Button>
          </Box>
          
          {!isOnline && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="caption" color="warning.contrastText">
                📱 You're working offline. Changes will sync when connection is restored.
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default OfflineStatus;