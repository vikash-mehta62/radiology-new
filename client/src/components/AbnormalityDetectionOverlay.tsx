/**
 * Abnormality Detection Overlay Component
 * Displays AI-detected abnormalities over DICOM images
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  Badge
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Settings,
  Warning,
  Error,
  Info,
  CheckCircle
} from '@mui/icons-material';
import { DetectionOverlay } from '../services/abnormalityDetectionService';
import { DetectionResult } from '../services/aiEnhancementModule';

export interface AbnormalityDetectionOverlayProps {
  imageId: string;
  overlay: DetectionOverlay | null;
  containerRef: React.RefObject<HTMLElement>;
  onDetectionClick?: (detection: DetectionResult) => void;
  onOverlayToggle?: (visible: boolean) => void;
  onStyleChange?: (style: Partial<DetectionOverlay['style']>) => void;
  className?: string;
}

/**
 * Overlay component for displaying AI abnormality detections
 */
export const AbnormalityDetectionOverlay: React.FC<AbnormalityDetectionOverlayProps> = ({
  imageId,
  overlay,
  containerRef,
  onDetectionClick,
  onOverlayToggle,
  onStyleChange,
  className
}) => {
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update overlay position when container changes
  useEffect(() => {
    const updateOverlayPosition = () => {
      if (overlayRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const overlayElement = overlayRef.current;
        
        overlayElement.style.position = 'absolute';
        overlayElement.style.top = '0';
        overlayElement.style.left = '0';
        overlayElement.style.width = '100%';
        overlayElement.style.height = '100%';
        overlayElement.style.pointerEvents = 'none';
        overlayElement.style.zIndex = '10';
      }
    };

    updateOverlayPosition();
    
    // Update on resize
    const resizeObserver = new ResizeObserver(updateOverlayPosition);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  if (!overlay || !overlay.visible || overlay.detections.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity: DetectionResult['severity']) => {
    switch (severity) {
      case 'critical':
        return <Error color="error" fontSize="small" />;
      case 'high':
        return <Warning color="warning" fontSize="small" />;
      case 'medium':
        return <Info color="info" fontSize="small" />;
      case 'low':
        return <CheckCircle color="success" fontSize="small" />;
      default:
        return <Info color="info" fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: DetectionResult['severity']) => {
    switch (severity) {
      case 'critical':
        return '#f44336';
      case 'high':
        return '#ff9800';
      case 'medium':
        return '#2196f3';
      case 'low':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  };

  const handleDetectionClick = (detection: DetectionResult) => {
    if (onDetectionClick) {
      onDetectionClick(detection);
    }
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const handleVisibilityToggle = () => {
    if (onOverlayToggle) {
      onOverlayToggle(!overlay.visible);
    }
  };

  const handleOpacityChange = (_: Event, value: number | number[]) => {
    const opacity = Array.isArray(value) ? value[0] : value;
    if (onStyleChange) {
      onStyleChange({ opacity: opacity / 100 });
    }
  };

  const handleBorderWidthChange = (_: Event, value: number | number[]) => {
    const borderWidth = Array.isArray(value) ? value[0] : value;
    if (onStyleChange) {
      onStyleChange({ borderWidth });
    }
  };

  return (
    <>
      {/* Detection Overlays */}
      <div
        ref={overlayRef}
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {overlay.detections.map((detection, index) => {
          const detectionId = `${imageId}-detection-${index}`;
          const isHovered = hoveredDetection === detectionId;
          const severityColor = getSeverityColor(detection.severity);

          return (
            <div
              key={detectionId}
              style={{
                position: 'absolute',
                left: `${(detection.boundingBox.x / (containerRef.current?.clientWidth || 1)) * 100}%`,
                top: `${(detection.boundingBox.y / (containerRef.current?.clientHeight || 1)) * 100}%`,
                width: `${(detection.boundingBox.width / (containerRef.current?.clientWidth || 1)) * 100}%`,
                height: `${(detection.boundingBox.height / (containerRef.current?.clientHeight || 1)) * 100}%`,
                border: `${overlay.style.borderWidth}px solid ${severityColor}`,
                backgroundColor: isHovered ? `${severityColor}20` : 'transparent',
                opacity: overlay.style.opacity,
                pointerEvents: 'auto',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered ? `0 0 10px ${severityColor}` : 'none'
              }}
              onClick={() => handleDetectionClick(detection)}
              onMouseEnter={() => setHoveredDetection(detectionId)}
              onMouseLeave={() => setHoveredDetection(null)}
            >
              {/* Detection Label */}
              <div
                style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '0',
                  backgroundColor: severityColor,
                  color: overlay.style.labelColor,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  opacity: isHovered ? 1 : 0.8,
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {detection.class} ({(detection.confidence * 100).toFixed(0)}%)
              </div>

              {/* Severity Indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '50%',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {getSeverityIcon(detection.severity)}
              </div>

              {/* Detailed Tooltip on Hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-60px',
                    left: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    maxWidth: '200px',
                    zIndex: 20,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div><strong>{detection.class}</strong></div>
                  <div>Confidence: {(detection.confidence * 100).toFixed(1)}%</div>
                  <div>Severity: {detection.severity}</div>
                  {detection.description && (
                    <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.9 }}>
                      {detection.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Control Panel */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1,
          padding: '4px 8px',
          zIndex: 15
        }}
      >
        {/* Detection Count Badge */}
        <Badge
          badgeContent={overlay.detections.length}
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '10px',
              minWidth: '16px',
              height: '16px'
            }
          }}
        >
          <Chip
            icon={<Warning />}
            label="AI Detections"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }}
          />
        </Badge>

        {/* Visibility Toggle */}
        <Tooltip title={overlay.visible ? "Hide Detections" : "Show Detections"}>
          <IconButton
            size="small"
            onClick={handleVisibilityToggle}
            sx={{ color: 'white' }}
          >
            {overlay.visible ? <Visibility /> : <VisibilityOff />}
          </IconButton>
        </Tooltip>

        {/* Settings */}
        <Tooltip title="Detection Settings">
          <IconButton
            size="small"
            onClick={handleSettingsClick}
            sx={{ color: 'white' }}
          >
            <Settings />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: { minWidth: 250, p: 2 }
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Detection Overlay Settings
        </Typography>
        
        <Divider sx={{ my: 1 }} />

        <FormControlLabel
          control={
            <Switch
              checked={overlay.visible}
              onChange={handleVisibilityToggle}
              size="small"
            />
          }
          label="Show Detections"
          sx={{ mb: 2 }}
        />

        <Typography variant="body2" gutterBottom>
          Opacity: {Math.round(overlay.style.opacity * 100)}%
        </Typography>
        <Slider
          value={overlay.style.opacity * 100}
          min={10}
          max={100}
          step={10}
          onChange={handleOpacityChange}
          size="small"
          sx={{ mb: 2 }}
        />

        <Typography variant="body2" gutterBottom>
          Border Width: {overlay.style.borderWidth}px
        </Typography>
        <Slider
          value={overlay.style.borderWidth}
          min={1}
          max={5}
          step={1}
          onChange={handleBorderWidthChange}
          size="small"
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 1 }} />

        <Typography variant="caption" color="text.secondary">
          {overlay.detections.length} detection{overlay.detections.length !== 1 ? 's' : ''} found
        </Typography>
      </Menu>
    </>
  );
};

export default AbnormalityDetectionOverlay;