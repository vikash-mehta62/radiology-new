import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  CloudSync as CloudSyncIcon,
} from '@mui/icons-material';

import UploadQueueStatusDisplay from './UploadQueueStatusDisplay';
import { queueManagementService } from '../services/queueManagementService';
import { uploadQueuePersistence } from '../services/uploadQueuePersistence';
import { enhancedUploadService } from '../services/enhancedUploadService';

interface UploadQueueManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadRetry?: (uploadId: string) => void;
  onUploadCancel?: (uploadId: string) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`queue-tabpanel-${index}`}
      aria-labelledby={`queue-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const UploadQueueManagerDialog: React.FC<UploadQueueManagerDialogProps> = ({
  open,
  onClose,
  onUploadRetry,
  onUploadCancel,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [operationHistory, setOperationHistory] = useState<any[]>([]);
  const [queueStatus, setQueueStatus] = useState<any>(null);

  // Load additional data
  const loadAdditionalData = () => {
    try {
      const stats = uploadQueuePersistence.getStorageStats();
      const history = queueManagementService.getOperationHistory();
      const status = enhancedUploadService.getQueueStatus();
      
      setStorageStats(stats);
      setOperationHistory(history.slice(-20)); // Last 20 operations
      setQueueStatus(status);
    } catch (error) {
      console.error('Failed to load additional queue data:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadAdditionalData();
      
      if (autoRefresh) {
        const interval = setInterval(loadAdditionalData, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [open, autoRefresh]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRetryUpload = async (uploadId: string) => {
    try {
      // Try to retry through the queue management service
      await queueManagementService.retryFailedUploads();
      
      if (onUploadRetry) {
        onUploadRetry(uploadId);
      }
      
      loadAdditionalData();
    } catch (error) {
      console.error('Failed to retry upload:', error);
    }
  };

  const handleCancelUpload = async (uploadId: string) => {
    try {
      await enhancedUploadService.cancelUpload(uploadId);
      
      if (onUploadCancel) {
        onUploadCancel(uploadId);
      }
      
      loadAdditionalData();
    } catch (error) {
      console.error('Failed to cancel upload:', error);
    }
  };

  const handleExportQueue = () => {
    try {
      const exportData = uploadQueuePersistence.exportQueue();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upload-queue-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export queue:', error);
    }
  };

  const handleImportQueue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = e.target?.result as string;
        const success = uploadQueuePersistence.importQueue(importData);
        
        if (success) {
          console.log('Queue imported successfully');
          loadAdditionalData();
        } else {
          console.error('Failed to import queue');
        }
      } catch (error) {
        console.error('Failed to import queue:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleCleanupQueue = () => {
    uploadQueuePersistence.cleanup();
    loadAdditionalData();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Upload Queue Manager
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-refresh"
              sx={{ mr: 1 }}
            />
            <Tooltip title="Refresh data">
              <IconButton size="small" onClick={loadAdditionalData}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="queue manager tabs">
            <Tab label="Queue Status" icon={<CloudSyncIcon />} />
            <Tab label="Storage & Backups" icon={<StorageIcon />} />
            <Tab label="Activity History" icon={<TimelineIcon />} />
            <Tab label="Settings" icon={<SettingsIcon />} />
          </Tabs>
        </Box>

        <Box sx={{ px: 3 }}>
          {/* Queue Status Tab */}
          <TabPanel value={currentTab} index={0}>
            <UploadQueueStatusDisplay
              autoRefresh={autoRefresh}
              refreshInterval={5000}
              showControls={true}
              compact={false}
              onUploadRetry={handleRetryUpload}
              onUploadCancel={handleCancelUpload}
            />
          </TabPanel>

          {/* Storage & Backups Tab */}
          <TabPanel value={currentTab} index={1}>
            <Grid container spacing={3}>
              {/* Storage Statistics */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Storage Usage
                    </Typography>
                    
                    {storageStats && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Queue Data:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatBytes(storageStats.queueSize)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Backups:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatBytes(storageStats.backupsSize)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Total Used:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatBytes(storageStats.totalSize)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2">Usage:</Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: storageStats.usagePercentage > 80 ? 'error.main' : 'text.primary'
                            }}
                          >
                            {storageStats.usagePercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        {storageStats.usagePercentage > 80 && (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            Storage usage is high. Consider cleaning up old data.
                          </Alert>
                        )}
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleCleanupQueue}
                      >
                        Cleanup Old Data
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Backup Management */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Backup Management
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Export and import queue data for backup and recovery purposes.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                      <Button
                        variant="outlined"
                        onClick={handleExportQueue}
                        fullWidth
                      >
                        Export Queue Data
                      </Button>
                      
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportQueue}
                        style={{ display: 'none' }}
                        id="import-queue-input"
                      />
                      <label htmlFor="import-queue-input">
                        <Button
                          variant="outlined"
                          component="span"
                          fullWidth
                        >
                          Import Queue Data
                        </Button>
                      </label>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Activity History Tab */}
          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Queue Operations
            </Typography>
            
            {operationHistory.length > 0 ? (
              <Box>
                {operationHistory.map((operation, index) => (
                  <Box key={operation.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {operation.type.replace('_', ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(operation.timestamp)}
                      </Typography>
                    </Box>
                    
                    {operation.uploadId && (
                      <Typography variant="caption" color="text.secondary">
                        Upload ID: {operation.uploadId}
                      </Typography>
                    )}
                    
                    {operation.details && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Details: {JSON.stringify(operation.details, null, 2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">
                No recent operations recorded.
              </Alert>
            )}
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Queue Settings
            </Typography>
            
            {queueStatus && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        Current Status
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Processing:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {queueStatus.isProcessing ? 'Active' : 'Paused'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Total Items:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {queueStatus.totalItems}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Active Uploads:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {queueStatus.uploadingItems}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        Quick Actions
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            enhancedUploadService.clearCompletedUploads();
                            loadAdditionalData();
                          }}
                        >
                          Clear Completed Uploads
                        </Button>
                        
                        <Button
                          variant="outlined"
                          onClick={() => {
                            enhancedUploadService.resumeQueuedUploads();
                            loadAdditionalData();
                          }}
                        >
                          Resume All Queued Uploads
                        </Button>
                        
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => {
                            enhancedUploadService.clearAllUploads();
                            loadAdditionalData();
                          }}
                        >
                          Clear All Uploads
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadQueueManagerDialog;