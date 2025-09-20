/**
 * State Management Panel
 * UI for managing unified state, snapshots, and migrations
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Alert, LinearProgress, Accordion,
  AccordionSummary, AccordionDetails, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Tooltip, Snackbar, FormControlLabel, Switch, Divider
} from '@mui/material';
import {
  Save, Restore, Download, Upload, Delete, ExpandMore,
  History, Settings, Sync, Warning, CheckCircle,
  Error as ErrorIcon, Info, Refresh, Backup
} from '@mui/icons-material';
import { 
  useUnifiedState, 
  useStateSnapshots, 
  useCollaborationSync 
} from '../../hooks/useUnifiedState';
import { 
  getGlobalMigrationService, 
  MigrationPlan, 
  MigrationResult 
} from '../../services/stateMigrationService';

interface StateManagementPanelProps {
  onClose?: () => void;
}

const StateManagementPanel: React.FC<StateManagementPanelProps> = ({ onClose }) => {
  const {
    globalState,
    persistState,
    exportState,
    importState,
    isInitialized,
    error: stateError,
    lastSync
  } = useUnifiedState();

  const {
    snapshots,
    createSnapshot,
    restoreSnapshot,
    clearSnapshots
  } = useStateSnapshots();

  const {
    isConnected,
    participants,
    joinSession,
    leaveSession
  } = useCollaborationSync();

  // Local state
  const [activeTab, setActiveTab] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportData, setExportData] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const [collaborationSessionId, setCollaborationSessionId] = useState('');

  const migrationService = getGlobalMigrationService();

  // Handle export
  const handleExport = () => {
    try {
      const data = exportState();
      setExportData(JSON.stringify(data, null, 2));
      setShowExportDialog(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export state' });
    }
  };

  // Handle import
  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      const success = importState(data);
      if (success) {
        setMessage({ type: 'success', text: 'State imported successfully' });
        setShowImportDialog(false);
        setImportData('');
      } else {
        setMessage({ type: 'error', text: 'Failed to import state' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid JSON format' });
    }
  };

  // Handle snapshot creation
  const handleCreateSnapshot = () => {
    try {
      createSnapshot(snapshotDescription || undefined);
      setMessage({ type: 'success', text: 'Snapshot created successfully' });
      setSnapshotDescription('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create snapshot' });
    }
  };

  // Handle snapshot restoration
  const handleRestoreSnapshot = (snapshotId: string) => {
    try {
      const success = restoreSnapshot(snapshotId);
      if (success) {
        setMessage({ type: 'success', text: 'Snapshot restored successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to restore snapshot' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to restore snapshot' });
    }
  };

  // Handle migration planning
  const handlePlanMigration = () => {
    const currentVersion = globalState.application?.version || '1.0.0';
    const targetVersion = '1.3.0'; // Example target version
    
    const plan = migrationService.getMigrationPlan(currentVersion, targetVersion);
    setMigrationPlan(plan);
    setShowMigrationDialog(true);
  };

  // Handle migration execution
  const handleExecuteMigration = async () => {
    if (!migrationPlan) return;

    setIsProcessing(true);
    try {
      const result = await migrationService.executeMigration(
        globalState,
        migrationPlan.fromVersion,
        migrationPlan.toVersion,
        { createBackup: true }
      );
      
      setMigrationResult(result);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Migration completed successfully' });
      } else {
        setMessage({ type: 'error', text: 'Migration failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Migration execution failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle persistence
  const handlePersist = async () => {
    try {
      await persistState();
      setMessage({ type: 'success', text: 'State persisted successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to persist state' });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Copied to clipboard' });
    });
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isInitialized) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress sx={{ flex: 1 }} />
            <Typography>Initializing state management...</Typography>
          </Box>
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
            <Typography variant="h6">State Management</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Auto-save enabled">
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Auto-save"
                />
              </Tooltip>
              {onClose && (
                <Button onClick={onClose} size="small">
                  Close
                </Button>
              )}
            </Box>
          </Box>
          
          {stateError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {stateError}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Chip
              icon={<Info />}
              label={`Version: ${globalState.application?.version || 'Unknown'}`}
              size="small"
            />
            <Chip
              icon={<Sync />}
              label={`Last Sync: ${lastSync ? formatTimestamp(lastSync) : 'Never'}`}
              size="small"
              color={lastSync ? 'success' : 'default'}
            />
            <Chip
              icon={isConnected ? <CheckCircle /> : <ErrorIcon />}
              label={`Collaboration: ${isConnected ? 'Connected' : 'Disconnected'}`}
              size="small"
              color={isConnected ? 'success' : 'default'}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Main Actions */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Save />}
            onClick={handlePersist}
          >
            Persist State
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export State
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setShowImportDialog(true)}
          >
            Import State
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Settings />}
            onClick={handlePlanMigration}
          >
            Migrate State
          </Button>
        </Grid>
      </Grid>

      {/* Snapshots Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">State Snapshots ({snapshots.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Snapshot description (optional)"
                  value={snapshotDescription}
                  onChange={(e) => setSnapshotDescription(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Backup />}
                  onClick={handleCreateSnapshot}
                >
                  Create Snapshot
                </Button>
              </Grid>
            </Grid>
          </Box>

          {snapshots.length > 0 ? (
            <List>
              {snapshots.slice(-10).reverse().map((snapshot) => (
                <ListItem key={snapshot.id} divider>
                  <ListItemText
                    primary={snapshot.metadata.description || `Snapshot ${snapshot.id.slice(-8)}`}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          Created: {formatTimestamp(snapshot.timestamp)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Version: {snapshot.version}
                        </Typography>
                        {snapshot.metadata.tags.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {snapshot.metadata.tags.map((tag) => (
                              <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Restore Snapshot">
                      <IconButton
                        edge="end"
                        onClick={() => handleRestoreSnapshot(snapshot.id)}
                      >
                        <Restore />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No snapshots available
            </Typography>
          )}

          {snapshots.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={clearSnapshots}
              >
                Clear All Snapshots
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Collaboration Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Collaboration ({participants.length} participants)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Session ID"
                value={collaborationSessionId}
                onChange={(e) => setCollaborationSessionId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              {isConnected ? (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={leaveSession}
                >
                  Leave Session
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => joinSession(collaborationSessionId)}
                  disabled={!collaborationSessionId}
                >
                  Join Session
                </Button>
              )}
            </Grid>
          </Grid>

          {participants.length > 0 && (
            <List>
              {participants.map((participant) => (
                <ListItem key={participant} divider>
                  <ListItemText
                    primary={participant}
                    secondary="Active participant"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Export State</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={20}
            fullWidth
            value={exportData}
            variant="outlined"
            InputProps={{
              readOnly: true,
              style: { fontFamily: 'monospace', fontSize: '12px' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(exportData)}>
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
        <DialogTitle>Import State</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={20}
            fullWidth
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            variant="outlined"
            placeholder="Paste state JSON here..."
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
            onClick={handleImport}
            disabled={!importData.trim()}
            variant="contained"
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Migration Dialog */}
      <Dialog
        open={showMigrationDialog}
        onClose={() => setShowMigrationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>State Migration</DialogTitle>
        <DialogContent>
          {migrationPlan && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Migration from {migrationPlan.fromVersion} to {migrationPlan.toVersion}
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Migration Plan
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Migrations: {migrationPlan.migrations.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Risk Level: {migrationPlan.riskLevel}
                  </Typography>
                </Grid>
              </Grid>

              {migrationPlan.migrations.length > 0 && (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Migration</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Required</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {migrationPlan.migrations.map((migration) => (
                        <TableRow key={migration.id}>
                          <TableCell>{migration.name}</TableCell>
                          <TableCell>{migration.priority}</TableCell>
                          <TableCell>
                            {migration.required ? (
                              <CheckCircle color="error" />
                            ) : (
                              <Info color="info" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {migrationResult && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity={migrationResult.success ? 'success' : 'error'}>
                    Migration {migrationResult.success ? 'completed' : 'failed'}
                  </Alert>
                  
                  {migrationResult.errors.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2">Errors:</Typography>
                      {migrationResult.errors.map((error, index) => (
                        <Typography key={index} variant="body2" color="error">
                          {error.migrationId}: {error.error}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {isProcessing && (
                <LinearProgress sx={{ mt: 2 }} />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMigrationDialog(false)}>
            Close
          </Button>
          {migrationPlan && migrationPlan.migrations.length > 0 && !migrationResult && (
            <Button
              onClick={handleExecuteMigration}
              disabled={isProcessing}
              variant="contained"
            >
              Execute Migration
            </Button>
          )}
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

export default StateManagementPanel;