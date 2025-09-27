/**
 * DICOM Overlay Component
 * DICOM-compliant overlay information display
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Study } from '../../../types';

interface DicomOverlayProps {
  study: Study;
  currentFrame: number;
  totalFrames: number;
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  modality: string;
}

const DicomOverlay: React.FC<DicomOverlayProps> = ({
  study,
  currentFrame,
  totalFrames,
  windowWidth,
  windowCenter,
  zoom,
  modality
}) => {
  // Return null if study is not available
  if (!study) {
    return null;
  }

  return (
    <>
      {/* Top Left - Patient Information */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          p: 1,
          borderRadius: 1,
          fontFamily: 'monospace'
        }}
      >
        <Typography variant="caption" display="block">
          {study.patient_info?.name || 'Unknown Patient'}
        </Typography>
        <Typography variant="caption" display="block">
          ID: {study.patient_id || 'Unknown'}
        </Typography>
        <Typography variant="caption" display="block">
          DOB: {study.patient_info?.date_of_birth || 'Unknown'}
        </Typography>
      </Box>

      {/* Top Right - Study Information */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          p: 1,
          borderRadius: 1,
          fontFamily: 'monospace',
          textAlign: 'right'
        }}
      >
        <Typography variant="caption" display="block">
          {modality || 'Unknown'}
        </Typography>
        <Typography variant="caption" display="block">
          {study.study_date || 'Unknown'}
        </Typography>
        <Typography variant="caption" display="block">
          {study.study_description}
        </Typography>
      </Box>

      {/* Bottom Left - Technical Information */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          p: 1,
          borderRadius: 1,
          fontFamily: 'monospace'
        }}
      >
        <Typography variant="caption" display="block">
          W: {Math.round(windowWidth)} L: {Math.round(windowCenter)}
        </Typography>
        <Typography variant="caption" display="block">
          Zoom: {Math.round(zoom * 100)}%
        </Typography>
        {Math.max(1, totalFrames) > 1 && (
          <Typography variant="caption" display="block">
            Frame: {currentFrame + 1}/{Math.max(1, totalFrames)}
          </Typography>
        )}
      </Box>

      {/* Bottom Right - Institution/Series */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          p: 1,
          borderRadius: 1,
          fontFamily: 'monospace',
          textAlign: 'right'
        }}
      >
        <Typography variant="caption" display="block">
          Series: {study.series_description || 'Unknown'}
        </Typography>
        <Typography variant="caption" display="block">
          Study UID: {study.study_uid.substring(0, 20)}...
        </Typography>
      </Box>
    </>
  );
};

export default DicomOverlay;