import { useEffect, lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, Fab, Tooltip } from '@mui/material';
import { Keyboard as KeyboardIcon } from '@mui/icons-material';

import Layout from './components/Layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/Common/LoadingScreen';
import ErrorBoundary from './components/ErrorHandling/ErrorBoundary';
import { backgroundQueueProcessor } from './services/backgroundQueueProcessor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { AccessibilityProvider } from './components/Accessibility/AccessibilityProvider';
import { AccessibilityToolbar } from './components/Accessibility/AccessibilityToolbar';
import './styles/accessibility.css';

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CleanDashboard = lazy(() => import('./pages/CleanDashboard'));
const CleanPatientList = lazy(() => import('./pages/CleanPatientList'));
const StudyList = lazy(() => import('./pages/StudyList'));
const StudyViewer = lazy(() => import('./pages/StudyViewer'));
const FolderManager = lazy(() => import('./pages/FolderManager'));
const ReportEditor = lazy(() => import('./pages/ReportEditor'));
const BillingDashboard = lazy(() => import('./pages/BillingDashboard'));
const NestedFolderManager = lazy(() => import('./pages/NestedFolderManager'));

const MonitoringDashboard = lazy(() => import('./pages/MonitoringDashboard'));
const ErrorHandlingDemo = lazy(() => import('./pages/ErrorHandlingDemo'));
const Settings = lazy(() => import('./pages/Settings'));
const WorkflowTestPage = lazy(() => import('./pages/WorkflowTestPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DebugReports = lazy(() => import('./pages/DebugReports'));
const Reports = lazy(() => import('./pages/Reports'));

// Theme is now handled by ThemeProvider context

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // For development, bypass authentication
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldAuthenticate = isDevelopment ? true : isAuthenticated;

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '?',
        shiftKey: true,
        action: () => setShowShortcutsHelp(true),
        description: 'Show Keyboard Shortcuts',
        category: 'actions'
      }
    ]
  });

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
      <AccessibilityProvider>
        <ThemeProvider>
          <CssBaseline />
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {isLoading ? (
              <LoadingScreen />
            ) : (
              <>
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
                    path="/folder"
                    element={
                      shouldAuthenticate ? (
                        <NestedFolderManager />
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
                    path="/reports"
                    element={
                      shouldAuthenticate ? (
                        <Reports />
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
            
            {/* Accessibility Toolbar */}
            <AccessibilityToolbar />
            
            {/* Keyboard Shortcuts Help Dialog */}
            <KeyboardShortcutsHelp
              open={showShortcutsHelp}
              onClose={() => setShowShortcutsHelp(false)}
            />
            
            {/* Floating Action Button for Keyboard Shortcuts */}
            {shouldAuthenticate && (
              <Tooltip title="Keyboard Shortcuts (Shift + ?)" placement="left">
                <Fab
                  color="primary"
                  onClick={() => setShowShortcutsHelp(true)}
                  sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      transform: 'scale(1.05)',
                      boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <KeyboardIcon />
                </Fab>
              </Tooltip>
            )}
                </>
              )}
          </Box>
        </ThemeProvider>
      </AccessibilityProvider>
      </ErrorBoundary>
  );
}

export default App;