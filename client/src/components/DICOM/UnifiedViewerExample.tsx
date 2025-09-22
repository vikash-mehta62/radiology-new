/**
 * Example: How to use the Unified DICOM Viewer
 * This replaces the need for multiple viewer components
 */

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import UnifiedDicomViewer from './UnifiedDicomViewer';
import type { Study } from '../../types';

interface UnifiedViewerExampleProps {
  study: Study;
  userRole?: 'radiologist' | 'technician' | 'referring_physician' | 'student';
}

const UnifiedViewerExample: React.FC<UnifiedViewerExampleProps> = ({
  study,
  userRole = 'radiologist'
}) => {
  const handleError = (error: string) => {
    console.error('DICOM Viewer Error:', error);
    // Handle error appropriately (show notification, log, etc.)
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Typography variant="h6">
          Medical Image Viewer - {study.modality} Study
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Patient: {study.patient_info?.name || study.patient_id} | 
          Study Date: {study.study_date} |
          User: {userRole}
        </Typography>
      </Paper>

      {/* Unified Viewer */}
      <Box sx={{ flex: 1 }}>
        {/* Current unified viewer implementation */}
        <UnifiedDicomViewer study={study} />
      </Box>
    </Box>
  );
};

// Example usage in different scenarios:

// 1. For Radiologists (Full Features)
export const RadiologistViewer: React.FC<{ study: Study }> = ({ study }) => (
  <UnifiedViewerExample
    study={study}
    userRole="radiologist"
  />
);

// 2. For Referring Physicians (Simplified)
export const ReferringPhysicianViewer: React.FC<{ study: Study }> = ({ study }) => (
  <UnifiedViewerExample
    study={study}
    userRole="referring_physician"
  />
);

// 3. For Students (Educational Mode)
export const StudentViewer: React.FC<{ study: Study }> = ({ study }) => (
  <UnifiedViewerExample
    study={study}
    userRole="student"
  />
);

export default UnifiedViewerExample;

/**
 * Migration Example: Replace existing viewer tabs
 * 
 * BEFORE (StudyViewer.tsx):
 * Multiple separate viewers were used for different purposes
 * 
 * AFTER (StudyViewer.tsx):
 * ```typescript
 * <UnifiedDicomViewer
 *   study={study}
 *   userRole={currentUser.role}
 *   viewerMode="diagnostic"
 *   enableAdvancedTools={true}
 *   enableCollaboration={true}
 *   enableAI={true}
 * />
 * ```
 * 
 * The unified viewer automatically:
 * - Detects if it's single-frame, multi-frame, or volume data
 * - Shows appropriate tools based on modality (CT, MRI, X-Ray, etc.)
 * - Adapts interface based on user role
 * - Optimizes rendering based on study size and device capabilities
 * - Provides consistent UX across all study types
 */