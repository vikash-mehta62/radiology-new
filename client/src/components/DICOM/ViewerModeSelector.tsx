/**
 * Viewer Mode Selector Component
 * Provides UI for seamless viewer mode switching with state preservation
 */

import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, ButtonGroup,
  Chip, Grid, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemText,
  ListItemIcon, Switch, FormControlLabel, Divider, Tooltip,
  IconButton, Collapse, LinearProgress
} from '@mui/material';
import {
  ViewModule, Speed, AutoAwesome, Settings, ExpandMore,
  ExpandLess, Info, CheckCircle, Warning, Error as ErrorIcon,
  Memory, Computer, NetworkCheck, Memory as Gpu
} from '@mui/icons-material';
import { useViewerManager, useOptimalViewerMode, useViewerCapabilities } from '../../hooks/useViewerManager';

interface ViewerModeSelectorProps {
  onModeChange?: (modeId: string) => void;
  showCapabilities?: boolean;
  showSystemHealth?: boolean;
  compact?: boolean;
}

const ViewerModeSelector: React.FC<ViewerModeSelectorProps> = ({
  onModeChange,
  showCapabilities = true,
  showSystemHealth = false,
  compact = false
}) => {
  const {
    currentMode,
    availableModes,
    isLoading,
    error,
    switchMode,
    getSystemHealth
  } = useViewerManager();

  const { optimizeMode, isOptimizing, optimalMode } = useOptimalViewerMode();
  const { capabilities, toggleCapability } = useViewerCapabilities();

  const [showDetails, setShowDetails] = useState(false);
  const [showHealthDialog, setShowHealthDialog] = useState(false);
  const [expandedCapabilities, setExpandedCapabilities] = useState(false);

  const handleModeSwitch = async (modeId: string) => {
    const success = await switchMode(modeId, { preserveState: true });
    if (success && onModeChange) {
      onModeChange(modeId);
    }
  };

  const handleOptimize = async () => {
    await optimizeMode();
    if (onModeChange && optimalMode) {
      onModeChange(optimalMode.id);
    }
  };

  const getModeIcon = (modeId: string) => {
    switch (modeId) {
      case 'simple': return <ViewModule />;
      case 'multi-frame': return <Speed />;
      case 'comprehensive': return <AutoAwesome />;
      default: return <ViewModule />;
    }
  };

  const getCapabilityIcon = (type: string) => {
    switch (type) {
      case 'core': return <CheckCircle color="primary" />;
      case 'ai': return <AutoAwesome color="secondary" />;
      case 'collaboration': return <NetworkCheck color="info" />;
      case 'measurement': return <Settings color="action" />;
      case 'annotation': return <Settings color="action" />;
      default: return <Info />;
    }
  };

  const getPerformanceColor = (usage: number) => {
    if (usage < 0.3) return 'success';
    if (usage < 0.7) return 'warning';
    return 'error';
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ButtonGroup size="small" variant="outlined">
          {availableModes.map((mode) => (
            <Button
              key={mode.id}
              variant={currentMode?.id === mode.id ? 'contained' : 'outlined'}
              onClick={() => handleModeSwitch(mode.id)}
              disabled={isLoading}
              startIcon={getModeIcon(mode.id)}
            >
              {mode.name}
            </Button>
          ))}
        </ButtonGroup>
        
        {optimalMode && currentMode?.id !== optimalMode.id && (
          <Tooltip title={`Switch to optimal mode: ${optimalMode.name}`}>
            <IconButton
              size="small"
              color="primary"
              onClick={handleOptimize}
              disabled={isOptimizing}
            >
              <AutoAwesome />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Viewer Mode
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {showSystemHealth && (
              <IconButton
                size="small"
                onClick={() => setShowHealthDialog(true)}
                title="System Health"
              >
                <Info />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              title="Toggle Details"
            >
              {showDetails ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        {/* Current Mode Display */}
        {currentMode && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Mode
            </Typography>
            <Chip
              icon={getModeIcon(currentMode.id)}
              label={currentMode.name}
              color="primary"
              variant="filled"
              size="medium"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {currentMode.description}
            </Typography>
          </Box>
        )}

        {/* Mode Selection */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Available Modes
        </Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {availableModes.map((mode) => (
            <Grid item xs={12} sm={6} md={4} key={mode.id}>
              <Button
                fullWidth
                variant={currentMode?.id === mode.id ? 'contained' : 'outlined'}
                onClick={() => handleModeSwitch(mode.id)}
                disabled={isLoading}
                startIcon={getModeIcon(mode.id)}
                sx={{ 
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  height: 'auto',
                  py: 1
                }}
              >
                <Box>
                  <Typography variant="body2" component="div">
                    {mode.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {mode.capabilities.length} features
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Optimization Button */}
        {optimalMode && currentMode?.id !== optimalMode.id && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleOptimize}
              disabled={isOptimizing}
              startIcon={isOptimizing ? <CircularProgress size={16} /> : <AutoAwesome />}
              fullWidth
            >
              {isOptimizing ? 'Optimizing...' : `Switch to Optimal Mode: ${optimalMode.name}`}
            </Button>
          </Box>
        )}

        {/* Detailed Information */}
        <Collapse in={showDetails}>
          <Divider sx={{ my: 2 }} />
          
          {/* Capabilities */}
          {showCapabilities && capabilities.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Capabilities
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setExpandedCapabilities(!expandedCapabilities)}
                >
                  {expandedCapabilities ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Collapse in={expandedCapabilities}>
                <List dense>
                  {capabilities.map((capability) => (
                    <ListItem key={capability.id} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getCapabilityIcon(capability.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={capability.name}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={capability.type}
                              size="small"
                              variant="outlined"
                            />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip
                                icon={<Computer />}
                                label={`${(capability.performance.cpuUsage * 100).toFixed(0)}%`}
                                size="small"
                                color={getPerformanceColor(capability.performance.cpuUsage)}
                                variant="outlined"
                              />
                              <Chip
                                icon={<Memory />}
                                label={`${(capability.performance.memoryUsage * 100).toFixed(0)}%`}
                                size="small"
                                color={getPerformanceColor(capability.performance.memoryUsage)}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={capability.enabled}
                            onChange={() => toggleCapability(capability.id)}
                            disabled={!capability.available}
                            size="small"
                          />
                        }
                        label=""
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )}

          {/* Current Mode Details */}
          {currentMode && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Mode Requirements
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    CPU Cores: {currentMode.requirements.minCpuCores}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Memory: {currentMode.requirements.minMemoryMB}MB
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    WebGL: {currentMode.requirements.requiredWebGLVersion}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Network: {currentMode.requirements.networkBandwidth}Mbps
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Collapse>

        {/* System Health Dialog */}
        <Dialog
          open={showHealthDialog}
          onClose={() => setShowHealthDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>System Health</DialogTitle>
          <DialogContent>
            {getSystemHealth() && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                  {JSON.stringify(getSystemHealth(), null, 2)}
                </pre>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowHealthDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ViewerModeSelector;