import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  LinearProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Switch,
  FormControlLabel,
  Badge,
  Tab,
  Tabs,
  TabPanel
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Download,
  Close,
  Memory,
  Speed,
  Visibility,
  NetworkCheck,
  BugReport,
  Timeline,
  Assessment
} from '@mui/icons-material';

interface DiagnosticPanelProps {
  open: boolean;
  onClose: () => void;
  diagnosticsEnabled: boolean;
  onToggleDiagnostics: (enabled: boolean) => void;
  gpuDiagnostics: any;
  cornerstoneDiagnostics: any;
  windowLevelDiagnostics: any;
  dataFlowDiagnostics: any;
  diagnosticEvents: any[];
  diagnosticHistory: any[];
  onRunDiagnostics: () => void;
  onClearHistory: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`diagnostic-tabpanel-${index}`}
      aria-labelledby={`diagnostic-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  open,
  onClose,
  diagnosticsEnabled,
  onToggleDiagnostics,
  gpuDiagnostics,
  cornerstoneDiagnostics,
  windowLevelDiagnostics,
  dataFlowDiagnostics,
  diagnosticEvents,
  diagnosticHistory,
  onRunDiagnostics,
  onClearHistory
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(['gpu']);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions(prev => 
      isExpanded 
        ? [...prev, panel]
        : prev.filter(p => p !== panel)
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'info': return <Info color="info" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Info />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'success': return 'success';
      default: return 'default';
    }
  };

  const diagnosticSummary = useMemo(() => {
    const issues = {
      critical: 0,
      warning: 0,
      info: 0
    };

    // Count issues from all diagnostic sources
    [gpuDiagnostics, cornerstoneDiagnostics, windowLevelDiagnostics, dataFlowDiagnostics].forEach(diag => {
      if (diag?.issues) {
        diag.issues.forEach((issue: any) => {
          if (issue.severity === 'error' || issue.severity === 'critical') {
            issues.critical++;
          } else if (issue.severity === 'warning') {
            issues.warning++;
          } else {
            issues.info++;
          }
        });
      }
    });

    return issues;
  }, [gpuDiagnostics, cornerstoneDiagnostics, windowLevelDiagnostics, dataFlowDiagnostics]);

  const recentEvents = useMemo(() => {
    return diagnosticEvents
      .slice(-10)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [diagnosticEvents]);

  const exportDiagnostics = useCallback(() => {
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      summary: diagnosticSummary,
      gpu: gpuDiagnostics,
      cornerstone: cornerstoneDiagnostics,
      windowLevel: windowLevelDiagnostics,
      dataFlow: dataFlowDiagnostics,
      events: diagnosticEvents,
      history: diagnosticHistory
    };

    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dicom-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [diagnosticSummary, gpuDiagnostics, cornerstoneDiagnostics, windowLevelDiagnostics, dataFlowDiagnostics, diagnosticEvents, diagnosticHistory]);

  if (!open) return null;

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '600px',
        height: '100vh',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BugReport color="primary" />
          <Typography variant="h6">DICOM Diagnostics</Typography>
          <Badge badgeContent={diagnosticSummary.critical} color="error">
            <Badge badgeContent={diagnosticSummary.warning} color="warning">
              <Assessment />
            </Badge>
          </Badge>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={diagnosticsEnabled}
                onChange={(e) => onToggleDiagnostics(e.target.checked)}
                size="small"
              />
            }
            label="Enable"
          />
          <Tooltip title="Run Diagnostics">
            <IconButton onClick={onRunDiagnostics} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Report">
            <IconButton onClick={exportDiagnostics} size="small">
              <Download />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Error color="error" fontSize="small" />
                  <Typography variant="body2" color="error">Critical</Typography>
                </Box>
                <Typography variant="h6">{diagnosticSummary.critical}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning color="warning" fontSize="small" />
                  <Typography variant="body2" color="warning.main">Warnings</Typography>
                </Box>
                <Typography variant="h6">{diagnosticSummary.warning}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info color="info" fontSize="small" />
                  <Typography variant="body2" color="info.main">Info</Typography>
                </Box>
                <Typography variant="h6">{diagnosticSummary.info}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" icon={<Assessment />} />
          <Tab label="GPU" icon={<Memory />} />
          <Tab label="Rendering" icon={<Visibility />} />
          <Tab label="Window/Level" icon={<Speed />} />
          <Tab label="Data Flow" icon={<NetworkCheck />} />
          <Tab label="Events" icon={<Timeline />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Overview Tab */}
        <CustomTabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Recent Events */}
            <Card>
              <CardHeader title="Recent Events" />
              <CardContent>
                <List dense>
                  {recentEvents.map((event, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getSeverityIcon(event.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={event.message}
                        secondary={`${event.source} • ${new Date(event.timestamp).toLocaleTimeString()}`}
                      />
                    </ListItem>
                  ))}
                  {recentEvents.length === 0 && (
                    <ListItem>
                      <ListItemText primary="No recent events" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader title="Quick Actions" />
              <CardContent>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small" onClick={onRunDiagnostics}>
                    Run Full Diagnostics
                  </Button>
                  <Button variant="outlined" size="small" onClick={onClearHistory}>
                    Clear History
                  </Button>
                  <Button variant="outlined" size="small" onClick={exportDiagnostics}>
                    Export Report
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </CustomTabPanel>

        {/* GPU Tab */}
        <CustomTabPanel value={tabValue} index={1}>
          {gpuDiagnostics ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity={gpuDiagnostics.webglSupported ? 'success' : 'error'}>
                <AlertTitle>WebGL Support</AlertTitle>
                {gpuDiagnostics.webglSupported ? 'WebGL is supported' : 'WebGL is not supported'}
              </Alert>
              
              <Card>
                <CardHeader title="GPU Information" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Renderer</Typography>
                      <Typography variant="body1">{gpuDiagnostics.renderer || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Vendor</Typography>
                      <Typography variant="body1">{gpuDiagnostics.vendor || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">WebGL Version</Typography>
                      <Typography variant="body1">{gpuDiagnostics.webglVersion || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Max Texture Size</Typography>
                      <Typography variant="body1">{gpuDiagnostics.maxTextureSize || 'Unknown'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {gpuDiagnostics.issues && gpuDiagnostics.issues.length > 0 && (
                <Card>
                  <CardHeader title="Issues" />
                  <CardContent>
                    <List>
                      {gpuDiagnostics.issues.map((issue: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getSeverityIcon(issue.severity)}
                          </ListItemIcon>
                          <ListItemText
                            primary={issue.message}
                            secondary={issue.recommendation}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Alert severity="info">No GPU diagnostics available. Run diagnostics to see results.</Alert>
          )}
        </CustomTabPanel>

        {/* Rendering Tab */}
        <CustomTabPanel value={tabValue} index={2}>
          {cornerstoneDiagnostics ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity={cornerstoneDiagnostics.initialized ? 'success' : 'error'}>
                <AlertTitle>Cornerstone3D Status</AlertTitle>
                {cornerstoneDiagnostics.initialized ? 'Cornerstone3D is initialized' : 'Cornerstone3D is not initialized'}
              </Alert>

              <Card>
                <CardHeader title="System Information" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Version</Typography>
                      <Typography variant="body1">{cornerstoneDiagnostics.version || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Active Viewports</Typography>
                      <Typography variant="body1">{cornerstoneDiagnostics.activeViewports || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Memory Usage</Typography>
                      <Typography variant="body1">{cornerstoneDiagnostics.memoryUsage || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Rendering Mode</Typography>
                      <Typography variant="body1">{cornerstoneDiagnostics.renderingMode || 'Unknown'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {cornerstoneDiagnostics.issues && cornerstoneDiagnostics.issues.length > 0 && (
                <Card>
                  <CardHeader title="Issues" />
                  <CardContent>
                    <List>
                      {cornerstoneDiagnostics.issues.map((issue: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getSeverityIcon(issue.severity)}
                          </ListItemIcon>
                          <ListItemText
                            primary={issue.message}
                            secondary={issue.recommendation}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Alert severity="info">No rendering diagnostics available. Run diagnostics to see results.</Alert>
          )}
        </CustomTabPanel>

        {/* Window/Level Tab */}
        <CustomTabPanel value={tabValue} index={3}>
          {windowLevelDiagnostics ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card>
                <CardHeader title="Current Settings" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Window Width</Typography>
                      <Typography variant="body1">{windowLevelDiagnostics.windowWidth || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Window Center</Typography>
                      <Typography variant="body1">{windowLevelDiagnostics.windowCenter || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Min Pixel Value</Typography>
                      <Typography variant="body1">{windowLevelDiagnostics.minPixelValue || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Max Pixel Value</Typography>
                      <Typography variant="body1">{windowLevelDiagnostics.maxPixelValue || 'Unknown'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {windowLevelDiagnostics.recommendations && windowLevelDiagnostics.recommendations.length > 0 && (
                <Card>
                  <CardHeader title="Recommendations" />
                  <CardContent>
                    <List>
                      {windowLevelDiagnostics.recommendations.map((rec: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Info color="info" />
                          </ListItemIcon>
                          <ListItemText
                            primary={rec.preset}
                            secondary={`W: ${rec.windowWidth}, C: ${rec.windowCenter}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Alert severity="info">No window/level diagnostics available. Load an image and run diagnostics to see results.</Alert>
          )}
        </CustomTabPanel>

        {/* Data Flow Tab */}
        <CustomTabPanel value={tabValue} index={4}>
          {dataFlowDiagnostics ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity={dataFlowDiagnostics.overallStatus === 'healthy' ? 'success' : 'error'}>
                <AlertTitle>Data Flow Status</AlertTitle>
                {dataFlowDiagnostics.overallStatus === 'healthy' ? 'All systems operational' : 'Issues detected'}
              </Alert>

              {dataFlowDiagnostics.checks && dataFlowDiagnostics.checks.map((check: any, index: number) => (
                <Card key={index}>
                  <CardHeader 
                    title={check.name}
                    action={
                      <Chip 
                        label={check.status} 
                        color={getSeverityColor(check.status === 'passed' ? 'success' : 'error')}
                        size="small"
                      />
                    }
                  />
                  <CardContent>
                    <Typography variant="body2">{check.message}</Typography>
                    {check.details && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Details: {JSON.stringify(check.details, null, 2)}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Alert severity="info">No data flow diagnostics available. Run diagnostics to see results.</Alert>
          )}
        </CustomTabPanel>

        {/* Events Tab */}
        <CustomTabPanel value={tabValue} index={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Diagnostic Events</Typography>
              <Button variant="outlined" size="small" onClick={onClearHistory}>
                Clear History
              </Button>
            </Box>
            
            <List>
              {diagnosticEvents.map((event, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    {getSeverityIcon(event.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={event.message}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {event.source} • {new Date(event.timestamp).toLocaleString()}
                        </Typography>
                        {event.details && (
                          <Typography variant="caption" color="textSecondary">
                            {JSON.stringify(event.details)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {diagnosticEvents.length === 0 && (
                <ListItem>
                  <ListItemText primary="No diagnostic events recorded" />
                </ListItem>
              )}
            </List>
          </Box>
        </CustomTabPanel>
      </Box>
    </Paper>
  );
};

export default DiagnosticPanel;