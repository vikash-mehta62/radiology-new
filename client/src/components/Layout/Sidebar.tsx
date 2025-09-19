import React from 'react';
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

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      badge: null,
    },
    {
      text: 'Patients',
      icon: <PersonIcon />,
      path: '/patients',
      badge: null,
    },
    {
      text: 'Studies',
      icon: <ViewListIcon />,
      path: '/studies',
      badge: '23',
    },
    {
      text: 'Folders',
      icon: <FolderIcon />,
      path: '/folders',
      badge: null,
    },
    {
      text: 'Reports',
      icon: <AssignmentIcon />,
      path: '/reports',
      badge: '5',
    },
    {
      text: 'Billing',
      icon: <ReceiptIcon />,
      path: '/billing',
      badge: null,
    },
  ];

  const secondaryItems = [
    {
      text: 'Monitoring',
      icon: <MonitoringIcon />,
      path: '/monitoring',
      badge: null,
    },
    {
      text: 'Error Demo',
      icon: <ErrorIcon />,
      path: '/error-demo',
      badge: null,
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      badge: null,
    },
  ];

  const handleItemClick = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  const handleLogout = () => {
    logout();
    onItemClick?.();
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(180deg, rgba(26, 29, 41, 0.95) 0%, rgba(26, 29, 41, 1) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 1) 100%)',
    }}>
      <Toolbar sx={{ 
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: 'transparent',
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Kiro-mini
        </Typography>
      </Toolbar>

      {/* User Profile Section */}
      <Box sx={{ 
        p: 3, 
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2,
          borderRadius: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}>
          <Avatar sx={{ 
            width: 48, 
            height: 48, 
            mr: 2, 
            background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
          }}>
            <PersonIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {user?.full_name || user?.username || 'Demo User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role || 'radiologist'}
            </Typography>
          </Box>
        </Box>
        {user?.specialty && (
          <Typography variant="caption" color="text.secondary">
            {user.specialty}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flexGrow: 1, px: 2, py: 1 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            px: 2, 
            py: 1, 
            fontWeight: 600, 
            color: 'text.secondary',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
          }}
        >
          MAIN MENU
        </Typography>
        <List sx={{ py: 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleItemClick(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  px: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.16),
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.8),
                    transform: 'translateX(4px)',
                  },
                }}
            >
               <ListItemIcon
                 sx={{
                   minWidth: 40,
                   color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                 }}
               >
                 {item.icon}
               </ListItemIcon>
               <ListItemText
                 primary={item.text}
                 primaryTypographyProps={{
                   fontSize: '0.875rem',
                   fontWeight: location.pathname === item.path ? 600 : 500,
                 }}
               />
               {item.badge && (
                 <Chip
                   label={item.badge}
                   size="small"
                   sx={{
                     height: 20,
                     fontSize: '0.75rem',
                     fontWeight: 600,
                     backgroundColor: theme.palette.primary.main,
                     color: theme.palette.primary.contrastText,
                     minWidth: 20,
                   }}
                 />
               )}
             </ListItemButton>
           </ListItem>
         ))}
       </List>

       {/* Secondary Navigation */}
       <Typography 
         variant="overline" 
         sx={{ 
           px: 4, 
           py: 1, 
           fontWeight: 600, 
           color: 'text.secondary',
           fontSize: '0.75rem',
           letterSpacing: '0.08em',
         }}
       >
         TOOLS
       </Typography>
       <List sx={{ px: 2, py: 0 }}>
         {secondaryItems.map((item) => (
           <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
             <ListItemButton
               selected={location.pathname === item.path}
               onClick={() => handleItemClick(item.path)}
               sx={{
                 borderRadius: 2,
                 minHeight: 44,
                 px: 2,
                 transition: 'all 0.2s ease-in-out',
                 '&.Mui-selected': {
                   backgroundColor: alpha(theme.palette.secondary.main, 0.12),
                   color: 'secondary.main',
                   '& .MuiListItemIcon-root': {
                     color: 'secondary.main',
                   },
                 },
                 '&:hover': {
                   backgroundColor: alpha(theme.palette.action.hover, 0.8),
                   transform: 'translateX(4px)',
                 },
               }}
             >
               <ListItemIcon
                 sx={{
                   minWidth: 36,
                   color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                 }}
               >
                 {item.icon}
               </ListItemIcon>
               <ListItemText
                 primary={item.text}
                 primaryTypographyProps={{
                   fontSize: '0.8125rem',
                   fontWeight: location.pathname === item.path ? 600 : 500,
                 }}
               />
             </ListItemButton>
           </ListItem>
         ))}
       </List>
     </Box>

     {/* Logout Button */}
     <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
       <ListItemButton
         onClick={handleLogout}
         sx={{
           borderRadius: 2,
           minHeight: 48,
           px: 2,
           color: 'error.main',
           '&:hover': {
             backgroundColor: alpha(theme.palette.error.main, 0.08),
           },
         }}
       >
         <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
           <LogoutIcon />
         </ListItemIcon>
         <ListItemText
           primary="Logout"
           primaryTypographyProps={{
             fontSize: '0.875rem',
             fontWeight: 500,
           }}
         />
       </ListItemButton>
     </Box>
    </Box>
  );
};

export default Sidebar;