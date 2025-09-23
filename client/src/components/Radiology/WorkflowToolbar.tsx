import React, { useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Badge,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  LinearProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  ViewModule as ProtocolIcon,
  Tune as WindowingIcon,
  PlaylistPlay as BatchIcon,
  Settings as SettingsIcon,
  AutoMode as AutoIcon,
  Speed as QuickIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { useRadiologyWorkflow, HangingProtocol, WindowingPreset, BatchOperation } from '../../hooks/useRadiologyWorkflow';
import { useAccessibility } from '../Accessibility/AccessibilityProvider';

interface WorkflowToolbarProps {
  studyType?: string;
  bodyPart?: string;
  onProtocolApplied?: (protocol: HangingProtocol) => void;
  onWindowingApplied?: (preset: WindowingPreset) => void;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  studyType = 'CT',
  bodyPart = 'CHEST',
  onProtocolApplied,
  onWindowingApplied
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  const {
    hangingProtocols,
    windowingPresets,
    batchOperations,
    selectHangingProtocol,
    getAutoWindowing,
    createBatchOperation,
    executeBatchOperation,
    cancelBatchOperation,
    getProtocolsByStudyType,
    getPresetsByBodyPart
  } = useRadiologyWorkflow();

  // Menu states
  const [protocolMenuAnchor, setProtocolMenuAnchor] = useState<null | HTMLElement>(null);
  const [windowingMenuAnchor, setWindowingMenuAnchor] = useState<null | HTMLElement>(null);
  const [batchMenuAnchor, setBatchMenuAnchor] = useState<null | HTMLElement>(null);

  // Dialog states
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchType, setBatchType] = useState<'windowing' | 'measurement' | 'annotation' | 'export' | 'analysis'>('windowing');
  const [batchName, setBatchName] = useState('');
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);

  // Get relevant protocols and presets
  const relevantProtocols = getProtocolsByStudyType(studyType);
  const relevantPresets = getPresetsByBodyPart(bodyPart);

  // Handle protocol selection
  const handleProtocolSelect = (protocolId: string) => {
    const protocol = hangingProtocols.find(p => p.id === protocolId);
    if (protocol) {
      onProtocolApplied?.(protocol);
      announceToScreenReader(`Applied hanging protocol: ${protocol.name}`);
    }
    setProtocolMenuAnchor(null);
  };

  // Handle auto protocol selection
  const handleAutoProtocol = () => {
    const protocol = selectHangingProtocol(studyType, bodyPart);
    if (protocol) {
      onProtocolApplied?.(protocol);
    }
    setProtocolMenuAnchor(null);
  };

  // Handle windowing selection
  const handleWindowingSelect = (presetId: string) => {
    const preset = windowingPresets.find(p => p.id === presetId);
    if (preset) {
      onWindowingApplied?.(preset);
      announceToScreenReader(`Applied windowing preset: ${preset.name}`);
    }
    setWindowingMenuAnchor(null);
  };

  // Handle auto windowing
  const handleAutoWindowing = () => {
    const preset = getAutoWindowing(studyType, bodyPart);
    if (preset) {
      onWindowingApplied?.(preset);
    }
    setWindowingMenuAnchor(null);
  };

  // Handle batch operation creation
  const handleCreateBatch = () => {
    if (!batchName.trim()) return;

    const operation = createBatchOperation({
      name: batchName,
      type: batchType,
      parameters: {},
      targetStudies: selectedStudies
    });

    setShowBatchDialog(false);
    setBatchName('');
    setSelectedStudies([]);
    announceToScreenReader(`Created batch operation: ${operation.name}`);
  };

  // Handle batch execution
  const handleExecuteBatch = (operationId: string) => {
    executeBatchOperation(operationId);
    setBatchMenuAnchor(null);
  };

  // Handle batch cancellation
  const handleCancelBatch = (operationId: string) => {
    cancelBatchOperation(operationId);
    setBatchMenuAnchor(null);
  };

  // Get batch operation status icon
  const getBatchStatusIcon = (status: BatchOperation['status']) => {
    switch (status) {
      case 'pending': return <PendingIcon color="warning" />;
      case 'running': return <PlayIcon color="info" />;
      case 'completed': return <CompleteIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <PendingIcon />;
    }
  };

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.05)}`
        }}
      >
        {/* Hanging Protocols */}
        <Tooltip title="Hanging Protocols">
          <IconButton
            onClick={(e) => setProtocolMenuAnchor(e.currentTarget)}
            sx={{
              background: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.2),
              }
            }}
          >
            <Badge badgeContent={relevantProtocols.length} color="primary" max={99}>
              <ProtocolIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Windowing Presets */}
        <Tooltip title="Windowing Presets">
          <IconButton
            onClick={(e) => setWindowingMenuAnchor(e.currentTarget)}
            sx={{
              background: alpha(theme.palette.secondary.main, 0.1),
              '&:hover': {
                background: alpha(theme.palette.secondary.main, 0.2),
              }
            }}
          >
            <Badge badgeContent={relevantPresets.length} color="secondary" max={99}>
              <WindowingIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Batch Operations */}
        <Tooltip title="Batch Operations">
          <IconButton
            onClick={(e) => setBatchMenuAnchor(e.currentTarget)}
            sx={{
              background: alpha(theme.palette.info.main, 0.1),
              '&:hover': {
                background: alpha(theme.palette.info.main, 0.2),
              }
            }}
          >
            <Badge badgeContent={batchOperations.length} color="info" max={99}>
              <BatchIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        {/* Quick Actions */}
        <Chip
          icon={<QuickIcon />}
          label={`${studyType} • ${bodyPart}`}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: 1,
            background: alpha(theme.palette.success.main, 0.1),
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
          }}
        />
      </Paper>

      {/* Hanging Protocols Menu */}
      <Menu
        anchorEl={protocolMenuAnchor}
        open={Boolean(protocolMenuAnchor)}
        onClose={() => setProtocolMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 320,
            borderRadius: 2,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`
          }
        }}
      >
        <MenuItem onClick={handleAutoProtocol}>
          <ListItemIcon>
            <AutoIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Auto Select Protocol"
            secondary={`Best match for ${studyType} ${bodyPart}`}
          />
        </MenuItem>
        <Divider />
        {relevantProtocols.map((protocol) => (
          <MenuItem key={protocol.id} onClick={() => handleProtocolSelect(protocol.id)}>
            <ListItemIcon>
              <ViewIcon />
            </ListItemIcon>
            <ListItemText 
              primary={protocol.name}
              secondary={protocol.description}
            />
            {protocol.isDefault && (
              <Chip label="Default" size="small" color="primary" variant="outlined" />
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Windowing Presets Menu */}
      <Menu
        anchorEl={windowingMenuAnchor}
        open={Boolean(windowingMenuAnchor)}
        onClose={() => setWindowingMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 280,
            borderRadius: 2,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`
          }
        }}
      >
        <MenuItem onClick={handleAutoWindowing}>
          <ListItemIcon>
            <AutoIcon color="secondary" />
          </ListItemIcon>
          <ListItemText 
            primary="Auto Windowing"
            secondary={`Smart preset for ${studyType} ${bodyPart}`}
          />
        </MenuItem>
        <Divider />
        {relevantPresets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handleWindowingSelect(preset.id)}>
            <ListItemIcon>
              <WindowingIcon />
            </ListItemIcon>
            <ListItemText 
              primary={preset.name}
              secondary={`WC: ${preset.windowCenter}, WW: ${preset.windowWidth}`}
            />
            {preset.isDefault && (
              <Chip label="Default" size="small" color="secondary" variant="outlined" />
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Batch Operations Menu */}
      <Menu
        anchorEl={batchMenuAnchor}
        open={Boolean(batchMenuAnchor)}
        onClose={() => setBatchMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 350,
            borderRadius: 2,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`
          }
        }}
      >
        <MenuItem onClick={() => setShowBatchDialog(true)}>
          <ListItemIcon>
            <AddIcon color="info" />
          </ListItemIcon>
          <ListItemText primary="Create New Batch Operation" />
        </MenuItem>
        <Divider />
        {batchOperations.map((operation) => (
          <MenuItem key={operation.id}>
            <ListItemIcon>
              {getBatchStatusIcon(operation.status)}
            </ListItemIcon>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {operation.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {operation.type} • {operation.targetStudies.length} studies
              </Typography>
              {operation.status === 'running' && (
                <LinearProgress 
                  variant="determinate" 
                  value={operation.progress} 
                  sx={{ mt: 0.5, height: 4 }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {operation.status === 'pending' && (
                <IconButton 
                  size="small" 
                  onClick={() => handleExecuteBatch(operation.id)}
                  color="success"
                >
                  <PlayIcon fontSize="small" />
                </IconButton>
              )}
              {(operation.status === 'pending' || operation.status === 'running') && (
                <IconButton 
                  size="small" 
                  onClick={() => handleCancelBatch(operation.id)}
                  color="error"
                >
                  <StopIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Batch Operation Creation Dialog */}
      <Dialog
        open={showBatchDialog}
        onClose={() => setShowBatchDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Batch Operation</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Operation Name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g., Batch Windowing for Chest CT"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Operation Type</InputLabel>
                <Select
                  value={batchType}
                  onChange={(e) => setBatchType(e.target.value as any)}
                  label="Operation Type"
                >
                  <MenuItem value="windowing">Windowing</MenuItem>
                  <MenuItem value="measurement">Measurement</MenuItem>
                  <MenuItem value="annotation">Annotation</MenuItem>
                  <MenuItem value="export">Export</MenuItem>
                  <MenuItem value="analysis">Analysis</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                This batch operation will be applied to all selected studies. 
                You can monitor progress from the batch operations menu.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBatchDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateBatch}
            disabled={!batchName.trim()}
          >
            Create Operation
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkflowToolbar;