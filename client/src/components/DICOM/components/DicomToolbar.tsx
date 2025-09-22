/**
 * DICOM Toolbar Component
 * Industry-standard toolbar with adaptive tool selection
 */

import React from 'react';
import {
  Box, IconButton, Tooltip, ButtonGroup, Divider, Chip,
  Select, MenuItem, FormControl, Slider, Typography
} from '@mui/material';
import {
  ZoomIn, ZoomOut, RotateLeft, RotateRight, RestartAlt,
  PlayArrow, Pause, SkipNext, SkipPrevious, Fullscreen,
  Straighten, CropFree, ThreeDRotation, Settings, Menu,
  ViewInAr, ViewModule
} from '@mui/icons-material';

interface DicomToolbarProps {
  studyType: 'single-frame' | 'multi-frame' | 'volume' | 'series';
  modality: string;
  currentFrame: number;
  totalFrames: number;
  zoom: number;
  rotation: number;
  windowWidth: number;
  windowCenter: number;
  activeTool: string | null;
  recommendedTools: string[];
  onZoom: (delta: number) => void;
  onRotate: (angle: number) => void;
  onWindowing: (width: number, center: number) => void;
  onReset: () => void;
  onNavigateFrame: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  onToolSelect: (tool: string) => void;
  onSidebarToggle: () => void;
  isMobile: boolean;
  userRole: string;
  // MPR-related props
  mprMode?: boolean;
  mprViewerMode?: 'single' | 'multi-plane';
  volumeDataAvailable?: boolean;
  onMPRToggle?: () => void;
  onMPRViewerModeChange?: (mode: 'single' | 'multi-plane') => void;
}

const DicomToolbar: React.FC<DicomToolbarProps> = ({
  studyType,
  modality,
  currentFrame,
  totalFrames,
  zoom,
  rotation,
  windowWidth,
  windowCenter,
  activeTool,
  recommendedTools,
  onZoom,
  onRotate,
  onWindowing,
  onReset,
  onNavigateFrame,
  onToolSelect,
  onSidebarToggle,
  isMobile,
  userRole,
  // MPR props
  mprMode = false,
  mprViewerMode = 'single',
  volumeDataAvailable = false,
  onMPRToggle,
  onMPRViewerModeChange
}) => {
  const showFrameControls = studyType === 'multi-frame' || studyType === 'volume';
  const show3DControls = studyType === 'volume';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: 1
      }}
    >
      {/* Sidebar Toggle */}
      <IconButton onClick={onSidebarToggle} size="small">
        <Menu />
      </IconButton>

      <Divider orientation="vertical" flexItem />

      {/* Basic Controls */}
      <ButtonGroup size="small" variant="outlined">
        <Tooltip title="Zoom In">
          <IconButton onClick={() => onZoom(0.2)}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={() => onZoom(-0.2)}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Left">
          <IconButton onClick={() => onRotate(-90)}>
            <RotateLeft />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Right">
          <IconButton onClick={() => onRotate(90)}>
            <RotateRight />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset">
          <IconButton onClick={onReset}>
            <RestartAlt />
          </IconButton>
        </Tooltip>
      </ButtonGroup>

      {/* Frame Navigation */}
      {showFrameControls && (
        <>
          <Divider orientation="vertical" flexItem />
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="First Frame">
              <IconButton onClick={() => onNavigateFrame('first')}>
                <SkipPrevious />
              </IconButton>
            </Tooltip>
            <Tooltip title="Previous Frame">
              <IconButton onClick={() => onNavigateFrame('previous')}>
                <SkipNext style={{ transform: 'rotate(180deg)' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next Frame">
              <IconButton onClick={() => onNavigateFrame('next')}>
                <SkipNext />
              </IconButton>
            </Tooltip>
            <Tooltip title="Last Frame">
              <IconButton onClick={() => onNavigateFrame('last')}>
                <SkipNext />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
          
          <Chip
            label={`${currentFrame + 1} / ${totalFrames}`}
            size="small"
            variant="outlined"
          />
        </>
      )}

      {/* Measurement Tools */}
      {recommendedTools.includes('measurement') && userRole !== 'referring_physician' && (
        <>
          <Divider orientation="vertical" flexItem />
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Length Measurement">
              <IconButton
                onClick={() => onToolSelect('length')}
                color={activeTool === 'length' ? 'primary' : 'default'}
              >
                <Straighten />
              </IconButton>
            </Tooltip>
            <Tooltip title="Area Measurement">
              <IconButton
                onClick={() => onToolSelect('area')}
                color={activeTool === 'area' ? 'primary' : 'default'}
              >
                <CropFree />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </>
      )}

      {/* 3D Controls */}
      {show3DControls && (
        <>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="3D Rotation">
            <IconButton
              onClick={() => onToolSelect('3d-rotate')}
              color={activeTool === '3d-rotate' ? 'primary' : 'default'}
            >
              <ThreeDRotation />
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* MPR Controls */}
      {volumeDataAvailable && (
        <>
          <Divider orientation="vertical" flexItem />
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Toggle MPR Mode">
              <IconButton
                onClick={onMPRToggle}
                color={mprMode ? 'primary' : 'default'}
              >
                <ViewInAr />
              </IconButton>
            </Tooltip>
            {mprMode && (
              <Tooltip title="MPR View Mode">
                <IconButton
                  onClick={() => onMPRViewerModeChange?.(
                    mprViewerMode === 'single' ? 'multi-plane' : 'single'
                  )}
                  color="primary"
                >
                  <ViewModule />
                </IconButton>
              </Tooltip>
            )}
          </ButtonGroup>
          {mprMode && (
            <Chip
              label={mprViewerMode === 'single' ? 'Single MPR' : 'Multi-Plane'}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
        </>
      )}

      {/* Windowing Controls */}
      {!isMobile && (
        <>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
            <Typography variant="caption">W/L:</Typography>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" gutterBottom>
                Width: {Math.round(windowWidth)}
              </Typography>
              <Slider
                size="small"
                value={windowWidth}
                min={1}
                max={4000}
                onChange={(_, value) => onWindowing(value as number, windowCenter)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" gutterBottom>
                Center: {Math.round(windowCenter)}
              </Typography>
              <Slider
                size="small"
                value={windowCenter}
                min={-1000}
                max={3000}
                onChange={(_, value) => onWindowing(windowWidth, value as number)}
              />
            </Box>
          </Box>
        </>
      )}

      {/* Status Indicators */}
      <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
        <Chip label={modality} size="small" color="primary" />
        <Chip label={`${Math.round(zoom * 100)}%`} size="small" variant="outlined" />
        {rotation !== 0 && (
          <Chip label={`${rotation}°`} size="small" variant="outlined" />
        )}
      </Box>
    </Box>
  );
};

export default DicomToolbar;