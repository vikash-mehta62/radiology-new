/*
 * Modernized Sidebar with Apple HIG principles
 * Changes: Enhanced visual hierarchy, improved accessibility, Apple-style navigation
 * Backward compatibility: All existing props and navigation preserved
 * TODO: Consider adding keyboard navigation for power users
 * Smoke test: Navigate through sidebar items -> verify active states and smooth transitions
 */

import React, { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Toolbar,
  Chip,
  alpha,
  useTheme,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ViewList as ViewListIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Folder as FolderIcon,
  MonitorHeart as MonitoringIcon,
  BugReport as ErrorIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  onItemClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();

  // Apple-style menu items with enhanced visual hierarchy
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      badge: null,
      description: 'Overview and quick actions',
    },
    {
      text: 'Patients',
      icon: <PersonIcon />,
      path: '/patients',
      badge: null,
      description: 'Patient management',
    },
    {
      text: 'Studies',
      icon: <ViewListIcon />,
      path: '/studies',
      badge: '23',
      description: 'DICOM studies and imaging',
    },
    {
      text: 'Folders',
      icon: <FolderIcon />,
      path: '/folders',
      badge: null,
      description: 'File organization',
    },
    {
      text: 'Reports',
      icon: <AssignmentIcon />,
      path: '/reports',
      badge: '5',
      description: 'Radiology reports',
    },
    {
      text: 'Billing',
      icon: <ReceiptIcon />,
      path: '/billing',
      badge: null,
      description: 'Financial management',
    },
  ];

  const secondaryItems = [
    {
      text: 'Monitoring',
      icon: <MonitoringIcon />,
      path: '/monitoring',
      badge: null,
      description: 'System health',
    },
    {
      text: 'Error Demo',
      icon: <ErrorIcon />,
      path: '/error-demo',
      badge: null,
      description: 'Error handling demo',
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      badge: null,
      description: 'Application preferences',
    },
  ];

  const handleItemClick = useCallback((path: string) => {
    navigate(path);
    onItemClick?.();
  }, [navigate, onItemClick]);

  const handleLogout = useCallback(() => {
    logout();
    onItemClick?.();
  }, [logout, onItemClick]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const index = parseInt(event.key) - 1;
        const allItems = [...menuItems, ...secondaryItems];
        if (allItems[index]) {
          handleItemClick(allItems[index].path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleItemClick, menuItems, secondaryItems]);

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(180deg, rgba(26, 29, 41, 0.95) 0%, rgba(26, 29, 41, 1) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 1) 100%)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Header with Apple-style branding */}
      <Toolbar sx={{ 
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: 'transparent',
        minHeight: '64px !important',
        px: 3,
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700,
            fontSize: '1.125rem',
            letterSpacing: '-0.01em',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #007AFF 30%, #5AC8FA 90%)'
              : 'linear-gradient(45deg, #0056CC 30%, #007AFF 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Radiology Suite
        </Typography>
      </Toolbar>

      {/* Enhanced User Profile Section */}
      <Box sx={{ 
        p: 3, 
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2.5,
          borderRadius: 3,
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.main, 0.08)
            : alpha(theme.palette.primary.main, 0.06),
          border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.12)}`,
          transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.primary.main, 0.08),
            transform: 'translateY(-1px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 122, 255, 0.15)'
              : '0 8px 32px rgba(0, 86, 204, 0.15)',
          },
        }}>
          <Avatar sx={{ 
            width: 48, 
            height: 48, 
            mr: 2.5, 
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #007AFF 30%, #5AC8FA 90%)'
              : 'linear-gradient(45deg, #0056CC 30%, #007AFF 90%)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0, 122, 255, 0.25)'
              : '0 4px 16px rgba(0, 86, 204, 0.25)',
            fontSize: '1.25rem',
          }}>
            <PersonIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600, 
                mb: 0.25,
                fontSize: '0.9375rem',
                lineHeight: 1.3,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.full_name || user?.username || 'Demo User'}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {user?.role || 'Radiologist'}
            </Typography>
            {user?.specialty && (
              <Typography 
                variant="caption" 
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontSize: '0.6875rem',
                  mt: 0.25,
                  opacity: 0.8,
                }}
              >
                {user.specialty}
              </Typography>
            )}
          </Box>
          {/* Online status indicator */}
          <Box sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            backgroundColor: '#34C759', // Apple green
            boxShadow: '0 0 0 2px rgba(52, 199, 89, 0.2)',
          }} />
        </Box>
      </Box>

      <Divider />

      {/* Main Navigation with Apple-style design */}
      <Box sx={{ flexGrow: 1, px: 2, py: 1 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            px: 2, 
            py: 1.5, 
            fontWeight: 600, 
            color: 'text.secondary',
            fontSize: '0.6875rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          Navigation
        </Typography>
        <List sx={{ py: 0 }}>
          {menuItems.map((item, index) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip 
                title={`${item.description} (Alt+${index + 1})`} 
                placement="right"
                arrow
                enterDelay={800}
              >
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleItemClick(item.path)}
                  sx={{
                    borderRadius: 2.5,
                    minHeight: 48,
                    px: 2.5,
                    py: 1.5,
                    transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      boxShadow: theme.palette.mode === 'dark'
                        ? `inset 3px 0 0 ${theme.palette.primary.main}, 0 2px 8px rgba(0, 122, 255, 0.15)`
                        : `inset 3px 0 0 ${theme.palette.primary.main}, 0 2px 8px rgba(0, 86, 204, 0.15)`,
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? alpha(theme.palette.primary.main, 0.18)
                          : alpha(theme.palette.primary.main, 0.16),
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                        transform: 'scale(1.1)',
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(90deg, rgba(0, 122, 255, 0.05) 0%, transparent 100%)'
                          : 'linear-gradient(90deg, rgba(0, 86, 204, 0.05) 0%, transparent 100%)',
                        pointerEvents: 'none',
                      },
                    },
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.action.hover, 0.08)
                        : alpha(theme.palette.action.hover, 0.06),
                      transform: 'translateX(4px)',
                      '& .MuiListItemIcon-root': {
                        transform: 'scale(1.05)',
                      },
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                      transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      lineHeight: 1.4,
                    }}
                  />
                  {item.badge && (
                    <Badge
                      badgeContent={item.badge}
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: theme.palette.mode === 'dark' ? '#FF453A' : '#FF3B30', // Apple red
                          color: 'white',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          minWidth: 18,
                          height: 18,
                          borderRadius: '9px',
                          boxShadow: '0 2px 4px rgba(255, 69, 58, 0.3)',
                        },
                      }}
                    >
                      <Box sx={{ width: 8 }} />
                    </Badge>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ 
          my: 2, 
          mx: 2,
          borderColor: alpha(theme.palette.divider, 0.08),
        }} />

        {/* Secondary Navigation */}
        <Typography 
          variant="overline" 
          sx={{ 
            px: 2, 
            py: 1, 
            fontWeight: 600, 
            color: 'text.secondary',
            fontSize: '0.6875rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          Tools
        </Typography>
        <List sx={{ py: 0 }}>
          {secondaryItems.map((item, index) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip 
                title={`${item.description} (Alt+${menuItems.length + index + 1})`} 
                placement="right"
                arrow
                enterDelay={800}
              >
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleItemClick(item.path)}
                  sx={{
                    borderRadius: 2.5,
                    minHeight: 44,
                    px: 2.5,
                    py: 1.25,
                    transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                    },
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.action.hover, 0.06)
                        : alpha(theme.palette.action.hover, 0.04),
                      transform: 'translateX(2px)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                      transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.8125rem',
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      lineHeight: 1.4,
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Enhanced Logout Section */}
      <Box sx={{ 
        p: 2, 
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.1) 100%)'
          : 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.02) 100%)',
      }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2.5,
            minHeight: 48,
            px: 2.5,
            py: 1.5,
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? alpha('#FF453A', 0.1) // Apple red with transparency
                : alpha('#FF3B30', 0.08),
              color: theme.palette.mode === 'dark' ? '#FF453A' : '#FF3B30',
              transform: 'translateX(2px)',
              '& .MuiListItemIcon-root': {
                color: theme.palette.mode === 'dark' ? '#FF453A' : '#FF3B30',
                transform: 'scale(1.05)',
              },
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.mode === 'dark' ? '#FF453A' : '#FF3B30'}`,
              outlineOffset: 2,
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            }}
          >
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
};

export default Sidebar;