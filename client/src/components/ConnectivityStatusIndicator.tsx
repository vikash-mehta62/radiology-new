import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  NetworkCheck as NetworkCheckIcon,
} from '@mui/icons-material';

import { preUploadValidator } from '../services/preUploadValidator';
import { apiService } from '../services/api';

interface ConnectivityStatusIndicatorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  onStatusChange?: (status: ConnectivityStatus) => void;
}

interface ConnectivityStatus {
  isConnected: boolean;
  latency: number;
  message: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  lastChecked: Date;
  details?: {
    backendHealth: boolean;
    uploadService: boolean;
    corsEnabled: boolean;
    serverVersion?: string;
  };
}

const ConnectivityStatusIndicator: React.FC<ConnectivityStatusIndicatorProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  showDetails = true,
  onStatusChange
}) => {
  const [status, setStatus] = useState<ConnectivityStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const checkConnectivity = async () => {
    setIsChecking(true);
    
    try {
      // Quick connectivity check
      const quickCheck = await preUploadValidator.quickConnectivityCheck();
      
      // Detailed health check if connected
      let details = undefined;
      if (quickCheck.isConnected) {
        try {
          const healthResponse = await apiService.healthCheck();
          const uploadHealthResponse = await apiService.uploadHealthCheck();
          
          details = {
            backendHealth: true,
            uploadService: true,
            corsEnabled: true,
            serverVersion: healthResponse.version
          };
        } catch (error) {
          details = {
            backendHealth: quickCheck.isConnected,
            uploadService: false,
            corsEnabled: quickCheck.isConnected
          };
        }
      }

      const quality = getConnectionQuality(quickCheck.isConnected, quickCheck.latency);
      
      const newStatus: ConnectivityStatus = {
        isConnected: quickCheck.isConnected,
        latency: quickCheck.latency,
        message: quickCheck.message,
        quality,
        lastChecked: new Date(),
        details
      };

      setStatus(newStatus);
      
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

    } catch (error) {
      const errorStatus: ConnectivityStatus = {
        isConnected: false,
        latency: 0,
        message: 'Connectivity check failed',
        quality: 'disconnected',
        lastChecked: new Date()
      };

      setStatus(errorStatus);
      
      if (onStatusChange) {
        onStatusChange(errorStatus);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const getConnectionQuality = (isConnected: boolean, latency: number): ConnectivityStatus['quality'] => {
    if (!isConnected) return 'disconnected';
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'fair';
    return 'poor';
  };

  const getQualityColor = (quality: ConnectivityStatus['quality']) => {
    switch (quality) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'success';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'warning';
      case 'disconnected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getQualityIcon = (quality: ConnectivityStatus['quality']) => {
    switch (quality) {
      case 'excellent':
      case 'good':
        return <WifiIcon />;
      case 'fair':
      case 'poor':
        return <SpeedIcon />;
      case 'disconnected':
        return <WifiOffIcon />;
      default:
        return <NetworkCheckIcon />;
    }
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Auto-refresh
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(checkConnectivity, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showDetails) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = (event: React.MouseEvent) => {
    event.stopPropagation();
    checkConnectivity();
  };

  if (!status) {
    return (
      <Chip
        icon={<NetworkCheckIcon />}
        label="Checking..."
        size="small"
        variant="outlined"
      />
    );
  }

  const open = Boolean(anchorEl);

  return (
    <>
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title={`${status.message} (Click for details)`}>
          <Chip
            icon={getQualityIcon(status.quality)}
            label={
              <Box display="flex" alignItems="center" gap={0.5}>
                <span>{status.quality}</span>
                {status.isConnected && (
                  <Typography variant="caption" component="span">
                    ({status.latency}ms)
                  </Typography>
                )}
              </Box>
            }
            color={getQualityColor(status.quality) as any}
            size="small"
            onClick={handleClick}
            sx={{ cursor: showDetails ? 'pointer' : 'default' }}
          />
        </Tooltip>

        <Tooltip title="Refresh connectivity status">
          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={isChecking}
          >
            <RefreshIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        {isChecking && (
          <Box sx={{ width: 20 }}>
            <LinearProgress sx={{ height: 4 }} />
          </Box>
        )}
      </Box>

      {/* Details Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Card sx={{ minWidth: 300, maxWidth: 400 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <NetworkCheckIcon />
                Connectivity Status
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  checkConnectivity();
                  handleClose();
                }}
                disabled={isChecking}
              >
                Refresh
              </Button>
            </Box>

            {/* Connection Overview */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Connection Quality
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                {getQualityIcon(status.quality)}
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {status.quality}
                </Typography>
                <Chip
                  label={`${status.latency}ms`}
                  size="small"
                  color={getQualityColor(status.quality) as any}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {status.message}
              </Typography>
            </Box>

            {/* Service Status */}
            {status.details && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Service Status
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(status.details.backendHealth)}
                    </ListItemIcon>
                    <ListItemText
                      primary="Backend Server"
                      secondary={status.details.backendHealth ? 'Connected' : 'Disconnected'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(status.details.uploadService)}
                    </ListItemIcon>
                    <ListItemText
                      primary="Upload Service"
                      secondary={status.details.uploadService ? 'Available' : 'Unavailable'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(status.details.corsEnabled)}
                    </ListItemIcon>
                    <ListItemText
                      primary="CORS Configuration"
                      secondary={status.details.corsEnabled ? 'Enabled' : 'Blocked'}
                    />
                  </ListItem>

                  {status.details.serverVersion && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Server Version"
                        secondary={status.details.serverVersion}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {/* Performance Indicators */}
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Performance Indicators
              </Typography>
              
              <Box mb={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Latency</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {status.latency}ms
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, 100 - (status.latency / 10)))}
                  color={status.latency < 200 ? 'success' : status.latency < 500 ? 'warning' : 'error'}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>

              <Typography variant="caption" color="text.secondary">
                Last checked: {status.lastChecked.toLocaleTimeString()}
              </Typography>
            </Box>

            {/* Recommendations */}
            {(status.quality === 'poor' || status.quality === 'fair' || status.quality === 'disconnected') && (
              <Box>
                <Typography variant="subtitle2" gutterBottom color="warning.main">
                  <WarningIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Recommendations
                </Typography>
                <List dense>
                  {status.quality === 'disconnected' && (
                    <ListItem>
                      <ListItemText
                        primary="Check your internet connection"
                        secondary="Ensure you're connected to the internet and the server is accessible"
                      />
                    </ListItem>
                  )}
                  {(status.quality === 'poor' || status.quality === 'fair') && (
                    <ListItem>
                      <ListItemText
                        primary="Improve connection quality"
                        secondary="Consider using a wired connection or moving closer to your WiFi router"
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Popover>
    </>
  );
};

export default ConnectivityStatusIndicator;