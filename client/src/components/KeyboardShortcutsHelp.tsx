import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Keyboard as KeyboardIcon,
  Navigation as NavigationIcon,
  TouchApp as ActionsIcon,
  Visibility as ViewerIcon,
  Work as WorkflowIcon
} from '@mui/icons-material';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose
}) => {
  const theme = useTheme();
  const { getShortcutsByCategory, formatShortcut } = useKeyboardShortcuts();

  const categoryIcons = {
    navigation: <NavigationIcon />,
    actions: <ActionsIcon />,
    viewer: <ViewerIcon />,
    workflow: <WorkflowIcon />
  };

  const categoryTitles = {
    navigation: 'Navigation',
    actions: 'Quick Actions',
    viewer: 'Image Viewer',
    workflow: 'Workflow'
  };

  const categories = ['navigation', 'actions', 'viewer', 'workflow'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.15)}`,
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <KeyboardIcon 
            sx={{ 
              color: theme.palette.primary.main,
              fontSize: 28
            }} 
          />
          <Typography variant="h5" fontWeight={600}>
            Keyboard Shortcuts
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.action.hover, 0.1),
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 3, fontStyle: 'italic' }}
        >
          Boost your radiology workflow with these keyboard shortcuts designed for medical professionals
        </Typography>

        {categories.map((category, index) => {
          const shortcuts = getShortcutsByCategory(category);
          if (shortcuts.length === 0) return null;

          return (
            <Box key={category} sx={{ mb: index < categories.length - 1 ? 4 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                    color: theme.palette.primary.main
                  }}
                >
                  {categoryIcons[category as keyof typeof categoryIcons]}
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  {categoryTitles[category as keyof typeof categoryTitles]}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {shortcuts.map((shortcut, shortcutIndex) => (
                  <Box
                    key={shortcutIndex}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 2,
                      background: alpha(theme.palette.background.paper, 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      '&:hover': {
                        background: alpha(theme.palette.action.hover, 0.05),
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {shortcut.description}
                    </Typography>
                    <Chip
                      label={formatShortcut(shortcut)}
                      size="small"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.8)} 0%, ${alpha(theme.palette.grey[200], 0.6)} 100%)`,
                        color: theme.palette.text.primary,
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(theme.palette.grey[200], 0.8)} 0%, ${alpha(theme.palette.grey[300], 0.6)} 100%)`,
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>

              {index < categories.length - 1 && (
                <Divider sx={{ mt: 3, opacity: 0.3 }} />
              )}
            </Box>
          );
        })}

        <Box
          sx={{
            mt: 4,
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}
        >
          <Typography variant="body2" color="info.main" fontWeight={500}>
            💡 Pro Tip: These shortcuts are designed to work seamlessly with your radiology workflow. 
            They won't interfere when you're typing in input fields or text areas.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          pt: 0,
          justifyContent: 'center'
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;