/**
 * Viewer Configuration Panel
 * Provides UI for managing viewer configurations and persistence
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid,
  TextField, Switch, FormControlLabel, Slider, Select,
  MenuItem, FormControl, InputLabel, Divider, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Chip, Accordion, AccordionSummary, AccordionDetails,
  Tooltip, Snackbar
} from '@mui/material';
import {
  Settings, Save, Restore, Download, Upload, Delete,
  ExpandMore, Info, CheckCircle, Warning, Error as ErrorIcon,
  Refresh, Tune, Speed, Memory, Computer, NetworkCheck
} from '@mui/icons-material';
import { useViewerManager } from '../../hooks/useViewerManager';

interface ViewerConfigurationPanelProps {
  onConfigChange?: (config: any) => void;
}

const ViewerConfigurationPanel: React.FC<ViewerConfigurationPanelProps> = ({
  onConfigChange
}) => {
  const {
    manager,
    currentMode,
    availableModes,
    exportConfiguration,
    importConfiguration,
    updateState,
    getSystemHealth
  } = useViewerManager();

  const [config, setConfig] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Load current configuration
  useEffect(() => {
    if (manager && currentMode) {
      const currentConfig = exportConfiguration();
      setConfig(currentConfig);
    }
  }, [manager, currentMode, exportConfiguration]);

  // Update system health periodically
  useEffect(() => {
    const updateHealth = () => {
      const health = getSystemHealth();
      setSystemHealth(health);
    };

    updateHealth();
    const interval = setInterval(updateHealth, 5000);
    return () => clearInterval(interval);
  }, [getSystemHealth]);

  const handleConfigUpdate = (path: string, value: any) => {
    if (!config) return;

    const newConfig = { ...config };
    const keys = path.split('.');
    let current = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);

    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const handleSaveConfiguration = () => {
    if (!config) return;

    try {
      localStorage.setItem('viewerManagerConfig', JSON.stringify(config));
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    }
  };

  const handleLoadConfiguration = () => {
    try {
      const saved = localStorage.getItem('viewerManagerConfig');
      if (saved) {
        const loadedConfig = JSON.parse(saved);
        const success = importConfiguration(loadedConfig);
        if (success) {
          setConfig(loadedConfig);
          setMessage({ type: 'success', text: 'Configuration loaded successfully' });
        } else {
          setMessage({ type: 'error', text: 'Failed to load configuration' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    }
  };

  const handleExportConfiguration = () => {
    const exportData = exportConfiguration();
    setExportText(JSON.stringify(exportData, null, 2));
    setShowExportDialog(true);
  };

  const handleImportConfiguration = () => {
    try {
      const importedConfig = JSON.parse(importText);
      const success = importConfiguration(importedConfig);
      if (success) {
        setConfig(importedConfig);
        setShowImportDialog(false);
        setImportText('');
        setMessage({ type: 'success', text: 'Configuration imported successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to import configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid configuration format' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Copied to clipboard' });
    });
  };

  if (!config || !currentMode) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading configuration...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2">
              Viewer Configuration
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<Save />}
                onClick={handleSaveConfiguration}
              >
                Save
              </Button>
              <Button
                size="small"
                startIcon={<Restore />}
                onClick={handleLoadConfiguration}
              >
                Load
              </Button>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={handleExportConfiguration}
              >
                Export
              </Button>
              <Button
                size="small"
                startIcon={<Upload />}
                onClick={() => setShowImportDialog(true)}
              >
                Import
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* System Health */}
      {systemHealth && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Memory color="primary" />
                  <Typography variant="body2">Memory</Typography>
                  <Typography variant="h6">
                    {Math.round(systemHealth.memoryUsage?.used / 1024 / 1024 || 0)}MB
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Speed color="secondary" />
                  <Typography variant="body2">Performance</Typography>
                  <Typography variant="h6">
                    {systemHealth.performanceMetrics?.averageFrameTime?.toFixed(1) || 0}ms
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircle color="success" />
                  <Typography variant="body2">Uptime</Typography>
                  <Typography variant="h6">
                    {Math.round((systemHealth.uptime || 0) / 1000 / 60)}m
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <ErrorIcon color="error" />
                  <Typography variant="body2">Errors</Typography>
                  <Typography variant="h6">
                    {systemHealth.errorCount || 0}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Mode Configuration */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Mode Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Rendering Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Rendering
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={currentMode.configuration.rendering.quality}
                  onChange={(e) => handleConfigUpdate('rendering.quality', e.target.value)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="ultra">Ultra</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.rendering.enableGPUAcceleration}
                    onChange={(e) => handleConfigUpdate('rendering.enableGPUAcceleration', e.target.checked)}
                  />
                }
                label="GPU Acceleration"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.rendering.antialiasing}
                    onChange={(e) => handleConfigUpdate('rendering.antialiasing', e.target.checked)}
                  />
                }
                label="Antialiasing"
              />

              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Max Texture Size</Typography>
                <Slider
                  value={currentMode.configuration.rendering.maxTextureSize}
                  onChange={(_, value) => handleConfigUpdate('rendering.maxTextureSize', value)}
                  min={512}
                  max={4096}
                  step={512}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>

            {/* Performance Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Performance
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.performance.enableAdaptiveQuality}
                    onChange={(e) => handleConfigUpdate('performance.enableAdaptiveQuality', e.target.checked)}
                  />
                }
                label="Adaptive Quality"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.performance.enableProgressiveLoading}
                    onChange={(e) => handleConfigUpdate('performance.enableProgressiveLoading', e.target.checked)}
                  />
                }
                label="Progressive Loading"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.performance.enableMemoryOptimization}
                    onChange={(e) => handleConfigUpdate('performance.enableMemoryOptimization', e.target.checked)}
                  />
                }
                label="Memory Optimization"
              />

              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Cache Size (MB)</Typography>
                <Slider
                  value={currentMode.configuration.performance.maxCacheSize}
                  onChange={(_, value) => handleConfigUpdate('performance.maxCacheSize', value)}
                  min={64}
                  max={2048}
                  step={64}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Preload Distance</Typography>
                <Slider
                  value={currentMode.configuration.performance.preloadDistance}
                  onChange={(_, value) => handleConfigUpdate('performance.preloadDistance', value)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>

            {/* Interaction Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Interaction
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.interaction.enableZoom}
                    onChange={(e) => handleConfigUpdate('interaction.enableZoom', e.target.checked)}
                  />
                }
                label="Zoom"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.interaction.enablePan}
                    onChange={(e) => handleConfigUpdate('interaction.enablePan', e.target.checked)}
                  />
                }
                label="Pan"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.interaction.enableRotation}
                    onChange={(e) => handleConfigUpdate('interaction.enableRotation', e.target.checked)}
                  />
                }
                label="Rotation"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.interaction.enableMeasurements}
                    onChange={(e) => handleConfigUpdate('interaction.enableMeasurements', e.target.checked)}
                  />
                }
                label="Measurements"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.interaction.enableAnnotations}
                    onChange={(e) => handleConfigUpdate('interaction.enableAnnotations', e.target.checked)}
                  />
                }
                label="Annotations"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.interaction.touchGestures}
                    onChange={(e) => handleConfigUpdate('interaction.touchGestures', e.target.checked)}
                  />
                }
                label="Touch Gestures"
              />
            </Grid>

            {/* AI Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                AI Features
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.ai.enableImageEnhancement}
                    onChange={(e) => handleConfigUpdate('ai.enableImageEnhancement', e.target.checked)}
                  />
                }
                label="Image Enhancement"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.ai.enableAbnormalityDetection}
                    onChange={(e) => handleConfigUpdate('ai.enableAbnormalityDetection', e.target.checked)}
                  />
                }
                label="Abnormality Detection"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={currentMode.configuration.ai.enableAutoMeasurements}
                    onChange={(e) => handleConfigUpdate('ai.enableAutoMeasurements', e.target.checked)}
                  />
                }
                label="Auto Measurements"
              />

              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Confidence Threshold</Typography>
                <Slider
                  value={currentMode.configuration.ai.confidenceThreshold}
                  onChange={(_, value) => handleConfigUpdate('ai.confidenceThreshold', value)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Export Configuration</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={20}
            fullWidth
            value={exportText}
            variant="outlined"
            InputProps={{
              readOnly: true,
              style: { fontFamily: 'monospace', fontSize: '12px' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(exportText)}>
            Copy to Clipboard
          </Button>
          <Button onClick={() => setShowExportDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Configuration</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={20}
            fullWidth
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            variant="outlined"
            placeholder="Paste configuration JSON here..."
            InputProps={{
              style: { fontFamily: 'monospace', fontSize: '12px' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImportConfiguration}
            disabled={!importText.trim()}
            variant="contained"
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Snackbar */}
      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        message={message?.text}
      />
    </Box>
  );
};

export default ViewerConfigurationPanel;