import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assessment as AuditIcon,
  Settings as GeneralIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';

import AuditLogViewer from '../components/Audit/AuditLogViewer';
import ComplianceDashboard from '../components/Audit/ComplianceDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [auditSettings, setAuditSettings] = useState({
    enableAuditLogging: true,
    logUserActions: true,
    logSystemEvents: true,
    retentionDays: 2555, // 7 years for HIPAA compliance
    enableRealTimeAlerts: true,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAuditSettingChange = (setting: string, value: boolean | number) => {
    setAuditSettings(prev => ({ ...prev, [setting]: value }));
  };

  const saveSettings = () => {
    // In a real implementation, this would save to the backend
    console.log('Saving settings:', auditSettings);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings & Compliance
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="settings tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<GeneralIcon />}
            label="General"
            id="settings-tab-0"
            aria-controls="settings-tabpanel-0"
          />
          <Tab
            icon={<SecurityIcon />}
            label="HIPAA Compliance"
            id="settings-tab-1"
            aria-controls="settings-tabpanel-1"
          />
          <Tab
            icon={<AuditIcon />}
            label="Audit Logs"
            id="settings-tab-2"
            aria-controls="settings-tabpanel-2"
          />
          <Tab
            icon={<NotificationIcon />}
            label="Notifications"
            id="settings-tab-3"
            aria-controls="settings-tabpanel-3"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* General Settings */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Application Settings
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Enable AI Assistance"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Real-time Billing Validation"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Auto-save Reports"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Dark Mode"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Version:</strong> Kiro-mini v1.0.0
                    </Typography>
                    <Typography variant="body2">
                      <strong>Environment:</strong> Development
                    </Typography>
                    <Typography variant="body2">
                      <strong>Database:</strong> MYSQL
                    </Typography>
                    <Typography variant="body2">
                      <strong>DICOM Server:</strong> Orthanc
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* HIPAA Compliance */}
          <ComplianceDashboard />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Audit Logs */}
          <AuditLogViewer />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Notifications */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Audit Settings
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    These settings control HIPAA-compliant audit logging. Changes require administrator approval.
                  </Alert>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={auditSettings.enableAuditLogging}
                          onChange={(e) => handleAuditSettingChange('enableAuditLogging', e.target.checked)}
                        />
                      }
                      label="Enable Audit Logging"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={auditSettings.logUserActions}
                          onChange={(e) => handleAuditSettingChange('logUserActions', e.target.checked)}
                        />
                      }
                      label="Log User Actions"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={auditSettings.logSystemEvents}
                          onChange={(e) => handleAuditSettingChange('logSystemEvents', e.target.checked)}
                        />
                      }
                      label="Log System Events"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={auditSettings.enableRealTimeAlerts}
                          onChange={(e) => handleAuditSettingChange('enableRealTimeAlerts', e.target.checked)}
                        />
                      }
                      label="Enable Real-time Alerts"
                    />
                    
                    <TextField
                      label="Retention Period (Days)"
                      type="number"
                      value={auditSettings.retentionDays}
                      onChange={(e) => handleAuditSettingChange('retentionDays', parseInt(e.target.value))}
                      helperText="HIPAA requires 7 years (2555 days) minimum retention"
                      size="small"
                    />
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Button
                    variant="contained"
                    onClick={saveSettings}
                    color="primary"
                  >
                    Save Audit Settings
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Status
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>HIPAA Compliance:</strong> Active
                      </Typography>
                    </Alert>
                    
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Audit Logging:</strong> Enabled
                      </Typography>
                    </Alert>
                    
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Data Encryption:</strong> Active
                      </Typography>
                    </Alert>
                    
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Last Compliance Check:</strong> {new Date().toLocaleDateString()}
                      </Typography>
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Settings;