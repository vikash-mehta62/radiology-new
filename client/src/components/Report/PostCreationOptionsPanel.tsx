import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  TextField,
  Chip,
  Paper,
  Grid,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Email as EmailIcon,
  PictureAsPdf as PdfIcon,
  Notifications as NotifyIcon,
  PersonAdd as AddPersonIcon,
  Delete as DeleteIcon,
  Schedule as AutoSaveIcon
} from '@mui/icons-material';
import { ReportPostCreationOptions } from '../../services/enhancedReportService';

interface PostCreationOptionsPanelProps {
  options: ReportPostCreationOptions;
  onOptionsChange: (option: keyof ReportPostCreationOptions, value: boolean | string[]) => void;
  lastSaved?: Date | null;
  autoSaveEnabled: boolean;
  onAutoSaveToggle: (enabled: boolean) => void;
}

const PostCreationOptionsPanel: React.FC<PostCreationOptionsPanelProps> = ({
  options,
  onOptionsChange,
  lastSaved,
  autoSaveEnabled,
  onAutoSaveToggle
}) => {
  const [newRecipient, setNewRecipient] = React.useState('');

  const handleAddRecipient = () => {
    if (newRecipient.trim() && !options.recipients?.includes(newRecipient.trim())) {
      const updatedRecipients = [...(options.recipients || []), newRecipient.trim()];
      onOptionsChange('recipients', updatedRecipients);
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (recipient: string) => {
    const updatedRecipients = (options.recipients || []).filter(r => r !== recipient);
    onOptionsChange('recipients', updatedRecipients);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddRecipient();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Post-Creation Options
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure what happens after the report is created. These options help streamline your workflow.
      </Alert>

      {/* Auto-Save Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <AutoSaveIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Auto-Save Settings
          </Typography>
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={autoSaveEnabled}
              onChange={(e) => onAutoSaveToggle(e.target.checked)}
              color="primary"
            />
          }
          label="Enable auto-save (every 30 seconds)"
        />
        
        {lastSaved && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Last saved: {lastSaved.toLocaleTimeString()}
          </Typography>
        )}
      </Paper>

      {/* Core Actions */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <SaveIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Core Actions
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.addToPatientRecord}
                  onChange={(e) => onOptionsChange('addToPatientRecord', e.target.checked)}
                  color="primary"
                />
              }
              label="Add to Patient Record"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.exportToPDF}
                  onChange={(e) => onOptionsChange('exportToPDF', e.target.checked)}
                  color="primary"
                />
              }
              label="Export to PDF"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Communication Options */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Communication Options
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.sendToPhysician}
                  onChange={(e) => onOptionsChange('sendToPhysician', e.target.checked)}
                  color="primary"
                />
              }
              label="Send to Physician"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.sendToPatient}
                  onChange={(e) => onOptionsChange('sendToPatient', e.target.checked)}
                  color="primary"
                />
              }
              label="Send to Patient"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.sendToReferringDoctor}
                  onChange={(e) => onOptionsChange('sendToReferringDoctor', e.target.checked)}
                  color="primary"
                />
              }
              label="Send to Referring Doctor"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.notifyStakeholders}
                  onChange={(e) => onOptionsChange('notifyStakeholders', e.target.checked)}
                  color="primary"
                />
              }
              label="Notify Stakeholders"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Recipients Management */}
      {(options.sendToPhysician || options.sendToPatient || options.sendToReferringDoctor || options.notifyStakeholders) && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <AddPersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Recipients
            </Typography>
          </Box>
          
          <Box display="flex" gap={1} mb={2}>
            <TextField
              size="small"
              placeholder="Enter email address"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ flexGrow: 1 }}
            />
            <IconButton 
              onClick={handleAddRecipient}
              color="primary"
              disabled={!newRecipient.trim()}
            >
              <AddPersonIcon />
            </IconButton>
          </Box>
          
          {options.recipients && options.recipients.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Recipients ({options.recipients.length}):
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {options.recipients.map((recipient, index) => (
                  <Chip
                    key={index}
                    label={recipient}
                    onDelete={() => handleRemoveRecipient(recipient)}
                    deleteIcon={<DeleteIcon />}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Summary */}
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Summary of Selected Actions:
        </Typography>
        <List dense>
          {options.addToPatientRecord && (
            <ListItem>
              <ListItemIcon><SaveIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Report will be added to patient record" />
            </ListItem>
          )}
          {options.exportToPDF && (
            <ListItem>
              <ListItemIcon><PdfIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Report will be exported as PDF" />
            </ListItem>
          )}
          {(options.sendToPhysician || options.sendToPatient || options.sendToReferringDoctor) && (
            <ListItem>
              <ListItemIcon><EmailIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={`Report will be sent to ${options.recipients?.length || 0} recipients`} />
            </ListItem>
          )}
          {options.notifyStakeholders && (
            <ListItem>
              <ListItemIcon><NotifyIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Stakeholders will be notified" />
            </ListItem>
          )}
          {autoSaveEnabled && (
            <ListItem>
              <ListItemIcon><AutoSaveIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Auto-save is enabled" />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default PostCreationOptionsPanel;