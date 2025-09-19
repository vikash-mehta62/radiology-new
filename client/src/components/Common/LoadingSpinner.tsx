import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Fade,
  useTheme,
  alpha,
  keyframes,
} from '@mui/material';

// Pulse animation for the loading container
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// Shimmer animation for skeleton loading
const shimmerAnimation = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  variant?: 'circular' | 'skeleton' | 'dots';
  fullScreen?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Loading...',
  variant = 'circular',
  fullScreen = false,
  color = 'primary'
}) => {
  const theme = useTheme();
  
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56
  };
  
  const containerStyles = fullScreen ? {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(theme.palette.background.default, 0.8),
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
  } : {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
  };

  const renderCircularLoader = () => (
    <Fade in timeout={300}>
      <Box
        sx={{
          ...containerStyles,
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${pulseAnimation} 2s ease-in-out infinite`,
          }}
        >
          <CircularProgress
            size={sizeMap[size]}
            thickness={4}
            sx={{
              color: theme.palette[color].main,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: sizeMap[size] + 16,
              height: sizeMap[size] + 16,
              borderRadius: '50%',
              border: `2px solid ${alpha(theme.palette[color].main, 0.1)}`,
              animation: `${pulseAnimation} 2s ease-in-out infinite reverse`,
            }}
          />
        </Box>
        {message && (
          <Typography
            variant={size === 'small' ? 'body2' : 'h6'}
            color="text.secondary"
            sx={{
              fontWeight: 500,
              textAlign: 'center',
              animation: `${pulseAnimation} 2s ease-in-out infinite`,
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );

  const renderSkeletonLoader = () => (
    <Box sx={containerStyles}>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {[...Array(3)].map((_, index) => (
          <Box
            key={index}
            sx={{
              height: size === 'small' ? 20 : size === 'medium' ? 24 : 32,
              backgroundColor: alpha(theme.palette.text.primary, 0.1),
              borderRadius: 1,
              mb: 1,
              background: `linear-gradient(90deg, ${alpha(theme.palette.text.primary, 0.1)} 0%, ${alpha(theme.palette.text.primary, 0.2)} 50%, ${alpha(theme.palette.text.primary, 0.1)} 100%)`,
              backgroundSize: '200px 100%',
              animation: `${shimmerAnimation} 1.5s ease-in-out infinite`,
            }}
          />
        ))}
      </Box>
    </Box>
  );

  const renderDotsLoader = () => (
    <Fade in timeout={300}>
      <Box
        sx={{
          ...containerStyles,
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[...Array(3)].map((_, index) => (
            <Box
              key={index}
              sx={{
                width: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
                height: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
                borderRadius: '50%',
                backgroundColor: theme.palette[color].main,
                animation: `${pulseAnimation} 1.4s ease-in-out infinite`,
                animationDelay: `${index * 0.2}s`,
              }}
            />
          ))}
        </Box>
        {message && (
          <Typography
            variant={size === 'small' ? 'body2' : 'h6'}
            color="text.secondary"
            sx={{
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );

  switch (variant) {
    case 'skeleton':
      return renderSkeletonLoader();
    case 'dots':
      return renderDotsLoader();
    default:
      return renderCircularLoader();
  }
};

export default LoadingSpinner;