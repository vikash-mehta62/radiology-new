import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  useTheme,
  alpha,
  Fade,
  ButtonGroup,
  Button
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  Contrast as ContrastIcon,
  MotionPhotosOff as MotionIcon,
  TextFields as FontSizeIcon,
  Keyboard as KeyboardIcon,
  VolumeUp as VolumeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAccessibility } from './AccessibilityProvider';

interface AccessibilityToolbarProps {
  onShowKeyboardShortcuts?: () => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  onShowKeyboardShortcuts
}) => {
  const theme = useTheme();
  const {
    highContrast,
    reducedMotion,
    fontSize,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    announceToScreenReader
  } = useAccessibility();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    announceToScreenReader('Accessibility menu opened');
  };

  const handleClose = () => {
    setAnchorEl(null);
    announceToScreenReader('Accessibility menu closed');
  };

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
    announceToScreenReader(`Accessibility toolbar ${!expanded ? 'expanded' : 'collapsed'}`);
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    handleClose();
  };

  return (
    <>
      {/* Floating Accessibility Button */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: theme.zIndex.fab,
        }}
      >
        <Tooltip title="Accessibility Options (Alt+A)" placement="left">
          <IconButton
            onClick={expanded ? handleToggleExpanded : handleClick}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: 'white',
              width: 56,
              height: 56,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.5)}`,
              },
              transition: 'all 0.3s ease',
            }}
            aria-label="Open accessibility options"
          >
            {expanded ? <CloseIcon /> : <AccessibilityIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Expanded Toolbar */}
      <Fade in={expanded}>
        <Paper
          sx={{
            position: 'fixed',
            top: 90,
            right: 20,
            zIndex: theme.zIndex.fab - 1,
            p: 2,
            minWidth: 280,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
          }}
          role="dialog"
          aria-label="Accessibility settings"
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Accessibility Settings
          </Typography>

          {/* High Contrast Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={highContrast}
                onChange={toggleHighContrast}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ContrastIcon fontSize="small" />
                <Typography variant="body2">High Contrast</Typography>
              </Box>
            }
            sx={{ mb: 1, width: '100%' }}
          />

          {/* Reduced Motion Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={reducedMotion}
                onChange={toggleReducedMotion}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MotionIcon fontSize="small" />
                <Typography variant="body2">Reduce Motion</Typography>
              </Box>
            }
            sx={{ mb: 2, width: '100%' }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Font Size Controls */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontSizeIcon fontSize="small" />
              Font Size
            </Typography>
            <ButtonGroup size="small" fullWidth>
              <Button
                variant={fontSize === 'small' ? 'contained' : 'outlined'}
                onClick={() => handleFontSizeChange('small')}
                sx={{ fontSize: '0.75rem' }}
              >
                Small
              </Button>
              <Button
                variant={fontSize === 'medium' ? 'contained' : 'outlined'}
                onClick={() => handleFontSizeChange('medium')}
                sx={{ fontSize: '0.875rem' }}
              >
                Medium
              </Button>
              <Button
                variant={fontSize === 'large' ? 'contained' : 'outlined'}
                onClick={() => handleFontSizeChange('large')}
                sx={{ fontSize: '1rem' }}
              >
                Large
              </Button>
            </ButtonGroup>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Keyboard Shortcuts">
              <IconButton
                onClick={() => {
                  onShowKeyboardShortcuts?.();
                  setExpanded(false);
                }}
                sx={{
                  background: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
                aria-label="Show keyboard shortcuts"
              >
                <KeyboardIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Screen Reader Test">
              <IconButton
                onClick={() => {
                  announceToScreenReader('Screen reader is working correctly. All accessibility features are active.');
                }}
                sx={{
                  background: alpha(theme.palette.secondary.main, 0.1),
                  '&:hover': {
                    background: alpha(theme.palette.secondary.main, 0.2),
                  }
                }}
                aria-label="Test screen reader"
              >
                <VolumeIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Press Alt+A to toggle this menu
          </Typography>
        </Paper>
      </Fade>

      {/* Dropdown Menu (when not expanded) */}
      <Menu
        anchorEl={anchorEl}
        open={open && !expanded}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 200,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          }
        }}
      >
        <MenuItem onClick={handleToggleExpanded}>
          <AccessibilityIcon sx={{ mr: 2 }} />
          Open Accessibility Panel
        </MenuItem>
        <MenuItem onClick={toggleHighContrast}>
          <ContrastIcon sx={{ mr: 2 }} />
          {highContrast ? 'Disable' : 'Enable'} High Contrast
        </MenuItem>
        <MenuItem onClick={toggleReducedMotion}>
          <MotionIcon sx={{ mr: 2 }} />
          {reducedMotion ? 'Enable' : 'Disable'} Animations
        </MenuItem>
        {onShowKeyboardShortcuts && (
          <MenuItem onClick={() => { onShowKeyboardShortcuts(); handleClose(); }}>
            <KeyboardIcon sx={{ mr: 2 }} />
            Keyboard Shortcuts
          </MenuItem>
        )}
      </Menu>
    </>
  );
};