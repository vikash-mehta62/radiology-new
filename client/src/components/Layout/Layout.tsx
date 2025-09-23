/*
 * Layout Component - Apple HIG-inspired design with dark-mode-first approach
 * Changes: Enhanced with Apple design principles, improved accessibility, keyboard navigation
 * Backward compatibility: All existing props and functionality preserved
 * TODO: Add gesture support for iPad/tablet users in reading rooms
 * Smoke test: Open app -> verify dark mode by default -> test sidebar toggle -> verify responsive behavior
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Backdrop,
  SwipeableDrawer,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

// Apple HIG-inspired spacing and dimensions
const drawerWidth = 280;
const mobileDrawerWidth = 320; // Increased for better touch targets
const tabletDrawerWidth = 280;
const appBarHeight = 64; // Apple's standard navigation bar height

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { mode, toggleTheme } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const { isAuthenticated } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  // Keyboard shortcuts for radiologist workflow efficiency
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    // Cmd/Ctrl + B to toggle sidebar (common in Apple apps)
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
      event.preventDefault();
      handleDrawerToggle();
    }
    // Cmd/Ctrl + Shift + D to toggle dark mode
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      toggleTheme();
    }
  }, []);

  // Register keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [handleKeyboardShortcuts]);

  // Auto-close mobile drawer when screen size changes
  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [isMobile, mobileOpen]);

  // For development, bypass authentication check
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldShowSidebar = isDevelopment ? true : isAuthenticated;

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  // Handle swipe gestures for mobile
  const handleSwipeOpen = () => {
    if (isMobile) {
      setMobileOpen(true);
    }
  };

  const handleSwipeClose = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  if (!shouldShowSidebar) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Apple HIG-inspired App Bar with glassmorphism effect */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: {
            xs: '100%',
            md: desktopOpen ? `calc(100% - ${isMobile ? 0 : isTablet ? tabletDrawerWidth : drawerWidth}px)` : '100%',
          },
          ml: {
            xs: 0,
            md: desktopOpen ? `${isMobile ? 0 : isTablet ? tabletDrawerWidth : drawerWidth}px` : 0,
          },
          height: appBarHeight,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
          // Apple-style glassmorphism
          backdropFilter: 'blur(20px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(28, 28, 30, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar 
          sx={{ 
            minHeight: appBarHeight,
            px: { xs: 2, sm: 3 },
            gap: 1,
          }}
        >
          {/* Hamburger/Close button with Apple-style animation */}
          <Tooltip title={`${(isMobile && mobileOpen) || (!isMobile && desktopOpen) ? 'Close' : 'Open'} sidebar (⌘B)`}>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 1,
                borderRadius: 2,
                width: 44,
                height: 44,
                transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(0, 0, 0, 0.04)',
                  transform: 'scale(1.05)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Fade in={!((isMobile && mobileOpen) || (!isMobile && desktopOpen))} timeout={200}>
                <MenuIcon />
              </Fade>
              <Fade in={(isMobile && mobileOpen) || (!isMobile && desktopOpen)} timeout={200}>
                <ChevronLeftIcon sx={{ position: 'absolute' }} />
              </Fade>
            </IconButton>
          </Tooltip>
          
          {/* App title with Apple-inspired typography */}
          <Typography 
            variant="h5"
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
              letterSpacing: '-0.01em',
              color: theme.palette.text.primary,
              display: { xs: 'none', sm: 'block' },
              // Apple-style gradient for brand recognition
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(45deg, #007AFF 30%, #5AC8FA 90%)'
                : 'linear-gradient(45deg, #0056CC 30%, #007AFF 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Radiology Viewer
          </Typography>
          
          {/* Mobile title (shorter) */}
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              display: { xs: 'block', sm: 'none' },
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(45deg, #007AFF 30%, #5AC8FA 90%)'
                : 'linear-gradient(45deg, #0056CC 30%, #007AFF 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Radiology
          </Typography>
          
          {/* Theme toggle with Apple-style animation */}
          <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode (⌘⇧D)`}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
              sx={{
                borderRadius: 2,
                width: 44,
                height: 44,
                transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(0, 0, 0, 0.04)',
                  transform: 'scale(1.05) rotate(15deg)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Fade in={mode === 'dark'} timeout={300}>
                <LightModeIcon sx={{ position: 'absolute' }} />
              </Fade>
              <Fade in={mode === 'light'} timeout={300}>
                <DarkModeIcon sx={{ position: 'absolute' }} />
              </Fade>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: desktopOpen ? drawerWidth : 0 },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile drawer */}
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          onOpen={() => setMobileOpen(true)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: isMobile ? mobileDrawerWidth : tabletDrawerWidth,
              background: theme.palette.mode === 'dark' 
                ? 'linear-gradient(180deg, rgba(18, 18, 18, 0.95) 0%, rgba(26, 29, 41, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Sidebar onItemClick={() => setMobileOpen(false)} />
        </SwipeableDrawer>

        {/* Desktop drawer */}
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: isTablet ? tabletDrawerWidth : drawerWidth,
              background: theme.palette.mode === 'dark' 
                ? 'linear-gradient(180deg, rgba(18, 18, 18, 0.95) 0%, rgba(26, 29, 41, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Sidebar />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { 
            xs: '100%',
            md: desktopOpen 
              ? `calc(100% - ${isTablet ? tabletDrawerWidth : drawerWidth}px)` 
              : '100%'
          },
          mt: '64px', // AppBar height
          minHeight: '100vh',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Fade in timeout={800}>
          <Box sx={{ 
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
            {children}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
};

export default Layout;