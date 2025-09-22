import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

import Layout from './components/Layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/Common/LoadingScreen';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';
import { backgroundQueueProcessor } from './services/backgroundQueueProcessor';

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CleanDashboard = lazy(() => import('./pages/CleanDashboard'));
const CleanPatientList = lazy(() => import('./pages/CleanPatientList'));
const StudyList = lazy(() => import('./pages/StudyList'));
const StudyViewer = lazy(() => import('./pages/StudyViewer'));
const FolderManager = lazy(() => import('./pages/FolderManager'));
const ReportEditor = lazy(() => import('./pages/ReportEditor'));
const BillingDashboard = lazy(() => import('./pages/BillingDashboard'));
const MonitoringDashboard = lazy(() => import('./pages/MonitoringDashboard'));
const ErrorHandlingDemo = lazy(() => import('./pages/ErrorHandlingDemo'));
const Settings = lazy(() => import('./pages/Settings'));
const WorkflowTestPage = lazy(() => import('./pages/WorkflowTestPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DebugReports = lazy(() => import('./pages/DebugReports'));

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
            <Suspense fallback={<LoadingScreen />}>
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
            </Suspense>
            </Layout>
          </Box>
        </ThemeProvider>
      </ErrorBoundary>
  );
}

export default App;