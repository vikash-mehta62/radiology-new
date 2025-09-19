import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';

import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 280;
const mobileDrawerWidth = 260;
const tabletDrawerWidth = 240;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { mode, toggleTheme } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Auto-close mobile drawer when screen size changes
  React.useEffect(() => {
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

  if (!shouldShowSidebar) {
    return <Box>{children}</Box>;
  }

  return (
    <Box sx={{ display: 'flex' }}>
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
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          backdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(26, 29, 41, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2,
              display: { xs: 'block', md: 'none' },
              borderRadius: 2,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            {(isMobile && mobileOpen) || (!isMobile && desktopOpen) ? (
              <ChevronLeftIcon />
            ) : (
              <MenuIcon />
            )}
          </IconButton>
          
          <Typography 
            variant={isMobile ? 'h6' : 'h5'} 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Kiro-mini
          </Typography>
          
          {/* Mobile title */}
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'block', sm: 'none' }
            }}
          >
            Kiro
          </Typography>
          
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            sx={{
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
                transform: 'scale(1.1)',
              },
            }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
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