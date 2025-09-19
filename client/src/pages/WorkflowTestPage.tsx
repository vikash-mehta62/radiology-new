import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import WorkflowDashboard from '../components/Workflow/WorkflowDashboard';

interface TestStudy {
  study_uid: string;
  patient_id: string;
  exam_type: string;
  priority: string;
  status: string;
  arrival_time: string;
  assigned_radiologist?: string;
}

interface TestResults {
  total_studies: number;
  assigned_studies: number;
  processing_time: number;
  automation_success_rate: number;
  notifications_sent: number;
}

export const WorkflowTestPage: React.FC = () => {
  const [testStudies, setTestStudies] = useState<TestStudy[]>([]);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState('workflow_assignment');
  const [testDuration, setTestDuration] = useState(60);
  const [testProgress, setTestProgress] = useState(0);
  const [selectedTestType, setSelectedTestType] = useState('basic');
  const [studyCount, setStudyCount] = useState(10);
  const [alerts, setAlerts] = useState<string[]>([]);

  const generateSampleStudies = (count: number): TestStudy[] => {
    const examTypes = ['chest_ct', 'brain_mri', 'abdomen_ct', 'spine_mri', 'cardiac_ct'];
    const priorities = ['stat', 'urgent', 'routine'];
    const studies: TestStudy[] = [];

    for (let i = 1; i <= count; i++) {
      studies.push({
        study_uid: `TEST_${Date.now()}_${i}`,
        patient_id: `PAT${String(i).padStart(3, '0')}`,
        exam_type: examTypes[Math.floor(Math.random() * examTypes.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: 'unassigned',
        arrival_time: new Date(Date.now() - Math.random() * 3600000).toISOString()
      });
    }

    return studies;
  };

  const runWorkflowTest = async () => {
    setIsRunning(true);
    setTestProgress(0);
    setAlerts([]);
    
    try {
      // Generate sample studies
      const studies = generateSampleStudies(studyCount);
      setTestStudies(studies);
      setTestProgress(20);
      
      addAlert('Generated sample studies');
      
      // Start automation engine
      const startResponse = await fetch('/api/workflow/automation/start', {
        method: 'POST'
      });
      
      if (startResponse.ok) {
        addAlert('Automation engine started');
        setTestProgress(40);
      }
      
      // Process each study
      let assignedCount = 0;
      const startTime = Date.now();
      
      for (let i = 0; i < studies.length; i++) {
        const study = studies[i];
        
        // Submit study for processing
        const processResponse = await fetch('/api/workflow/studies/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            study_uid: study.study_uid,
            patient_id: study.patient_id,
            exam_type: study.exam_type,
            priority: study.priority
          })
        });
        
        if (processResponse.ok) {
          // Try to assign study
          const assignResponse = await fetch(`/api/workflow/studies/${study.study_uid}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            study.assigned_radiologist = assignData.assigned_radiologist;
            study.status = 'assigned';
            assignedCount++;
          }
        }
        
        setTestProgress(40 + (i + 1) / studies.length * 40);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for demo
      }
      
      const processingTime = Date.now() - startTime;
      
      // Calculate results
      const results: TestResults = {
        total_studies: studies.length,
        assigned_studies: assignedCount,
        processing_time: processingTime,
        automation_success_rate: (assignedCount / studies.length) * 100,
        notifications_sent: Math.floor(assignedCount * 0.8) // Mock notification count
      };
      
      setTestResults(results);
      setTestProgress(100);
      addAlert(`Test completed: ${assignedCount}/${studies.length} studies assigned`);
      
    } catch (error) {
      console.error('Test error:', error);
      addAlert(`Test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  const addAlert = (message: string) => {
    setAlerts(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const clearTest = () => {
    setTestStudies([]);
    setTestResults(null);
    setTestProgress(0);
    setAlerts([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workflow Automation Testing
      </Typography>
      
      <Grid container spacing={3}>
        {/* Test Configuration */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Configuration
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Test Type</InputLabel>
                <Select
                  value={selectedTestType}
                  onChange={(e) => setSelectedTestType(e.target.value)}
                  disabled={isRunning}
                >
                  <MenuItem value="basic">Basic Assignment</MenuItem>
                  <MenuItem value="priority">Priority Routing</MenuItem>
                  <MenuItem value="subspecialty">Subspecialty Matching</MenuItem>
                  <MenuItem value="load">Load Testing</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Number of Studies"
                type="number"
                value={studyCount}
                onChange={(e) => setStudyCount(parseInt(e.target.value) || 10)}
                disabled={isRunning}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={runWorkflowTest}
                  disabled={isRunning}
                  fullWidth
                >
                  {isRunning ? 'Running...' : 'Start Test'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={clearTest}
                  disabled={isRunning}
                >
                  Clear
                </Button>
              </Box>
              
              {isRunning && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Progress: {Math.round(testProgress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={testProgress} />
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Test Results */}
          {testResults && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Results
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Total Studies:</Typography>
                    <Chip label={testResults.total_studies} size="small" />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Assigned:</Typography>
                    <Chip 
                      label={testResults.assigned_studies} 
                      color="success" 
                      size="small" 
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Success Rate:</Typography>
                    <Chip 
                      label={`${testResults.automation_success_rate.toFixed(1)}%`}
                      color={testResults.automation_success_rate > 80 ? 'success' : 'warning'}
                      size="small" 
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Processing Time:</Typography>
                    <Chip 
                      label={`${testResults.processing_time}ms`}
                      size="small" 
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Notifications:</Typography>
                    <Chip 
                      label={testResults.notifications_sent}
                      color="info"
                      size="small" 
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
        
        {/* Test Studies Table */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sample Studies ({testStudies.length})
              </Typography>
              
              {testStudies.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Study UID</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Exam Type</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Assigned To</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testStudies.map((study) => (
                        <TableRow key={study.study_uid}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {study.study_uid.substring(0, 20)}...
                            </Typography>
                          </TableCell>
                          <TableCell>{study.patient_id}</TableCell>
                          <TableCell>{study.exam_type}</TableCell>
                          <TableCell>
                            <Chip 
                              label={study.priority}
                              color={
                                study.priority === 'stat' ? 'error' :
                                study.priority === 'urgent' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={study.status}
                              color={study.status === 'assigned' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {study.assigned_radiologist || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No test studies generated yet. Click "Start Test" to begin.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Test Alerts */}
        {alerts.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Log
                </Typography>
                
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {alerts.map((alert, index) => (
                    <Typography 
                      key={index} 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        mb: 0.5
                      }}
                    >
                      {alert}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* Workflow Dashboard */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" gutterBottom>
            Live Workflow Dashboard
          </Typography>
          <WorkflowDashboard />
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkflowTestPage;