import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

import Layout from './components/Layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import CleanDashboard from './pages/CleanDashboard';
import CleanPatientList from './pages/CleanPatientList';
import StudyList from './pages/StudyList';
import StudyViewer from './pages/StudyViewer';
import FolderManager from './pages/FolderManager';
import ReportEditor from './pages/ReportEditor';
import BillingDashboard from './pages/BillingDashboard';
import MonitoringDashboard from './pages/MonitoringDashboard';
import ErrorHandlingDemo from './pages/ErrorHandlingDemo';
import Settings from './pages/Settings';
import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/Common/LoadingScreen';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';
import WorkflowTestPage from './pages/WorkflowTestPage';
import LoginPage from './pages/LoginPage';
// Quarantined component - moved to quarantine folder
// import DicomTest from './components/DICOM/DicomTest';
import DebugReports from './pages/DebugReports';
import { backgroundQueueProcessor } from './services/backgroundQueueProcessor';

// Theme is now handled by ThemeProvider context

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // For development, bypass authentication
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldAuthenticate = isDevelopment ? true : isAuthenticated;

  // Initialize background queue processor
  useEffect(() => {
    // Background processor is automatically initialized when imported
    // It will start monitoring connectivity and processing queued uploads
    console.log('🚀 App initialized with background queue processor');
    
    // Cleanup on unmount
    return () => {
      backgroundQueueProcessor.destroy();
    };
  }, []);

  if (isLoading && !isDevelopment) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Layout>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    shouldAuthenticate ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/dashboard"
                  element={
                    shouldAuthenticate ? (
                      <CleanDashboard />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/dashboard-old"
                  element={
                    shouldAuthenticate ? (
                      <Dashboard />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/patients"
                  element={
                    shouldAuthenticate ? (
                      <CleanPatientList />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/studies"
                  element={
                    shouldAuthenticate ? (
                      <StudyList />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/folders"
                  element={
                    shouldAuthenticate ? (
                      <FolderManager />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/studies/:studyUid"
                  element={
                    shouldAuthenticate ? (
                      <StudyViewer />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/reports/:reportId"
                  element={
                    shouldAuthenticate ? (
                      <ReportEditor />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/billing"
                  element={
                    shouldAuthenticate ? (
                      <BillingDashboard />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/settings"
                  element={
                    shouldAuthenticate ? (
                      <Settings />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/monitoring"
                  element={
                    shouldAuthenticate ? (
                      <MonitoringDashboard />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route
                  path="/error-demo"
                  element={
                    shouldAuthenticate ? (
                      <ErrorHandlingDemo />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                
                <Route path="/workflow-test" element={<WorkflowTestPage />} />
                
                {/* Quarantined routes - DicomTest moved to quarantine */}
                {/* <Route path="/test" element={<DicomTest />} /> */}
                
                {/* <Route path="/dicom-test" element={<DicomTest />} /> */}
                
                <Route path="/debug-reports" element={<DebugReports />} />
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </Box>
        </ThemeProvider>
      </ErrorBoundary>
  );
}

export default App;