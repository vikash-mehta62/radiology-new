import React, { useState } from 'react';
import {
  Button,
  ButtonProps,
  CircularProgress,
  Box,
  useTheme,
  alpha,
  keyframes,
  SxProps,
  Theme,
} from '@mui/material';

// Ripple animation
const rippleAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

// Pulse animation for loading state
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

// Shake animation for error state
const shakeAnimation = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
`;

interface AnimatedButtonProps extends Omit<ButtonProps, 'color' | 'sx'> {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  rippleEffect?: boolean;
  glowEffect?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
  animationType?: 'bounce' | 'slide' | 'fade' | 'scale';
  sx?: SxProps<Theme>;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  loading = false,
  success = false,
  error = false,
  rippleEffect = true,
  glowEffect = false,
  color = 'primary',
  animationType = 'scale',
  disabled,
  onClick,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;

    // Create ripple effect
    if (rippleEffect) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newRipple = { id: Date.now(), x, y };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }

    // Trigger press animation
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    if (onClick) {
      onClick(event);
    }
  };

  const getAnimationStyles = (): SxProps<Theme> => {
    const baseTransition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    switch (animationType) {
      case 'bounce':
        return {
          transition: baseTransition,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 25px ${alpha(theme.palette[color].main, 0.3)}`,
          },
          '&:active': {
            transform: 'translateY(0px) scale(0.98)',
          },
        };
      case 'slide':
        return {
          transition: baseTransition,
          '&:hover': {
            transform: 'translateX(4px)',
            boxShadow: `0 4px 20px ${alpha(theme.palette[color].main, 0.3)}`,
          },
          '&:active': {
            transform: 'translateX(2px) scale(0.98)',
          },
        };
      case 'fade':
        return {
          transition: baseTransition,
          '&:hover': {
            opacity: 0.9,
            boxShadow: `0 4px 20px ${alpha(theme.palette[color].main, 0.3)}`,
          },
          '&:active': {
            opacity: 0.8,
          },
        };
      default: // scale
        return {
          transition: baseTransition,
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: `0 8px 25px ${alpha(theme.palette[color].main, 0.3)}`,
          },
        };
    }
  };

  const getStateStyles = (): SxProps<Theme> => {
    if (loading) {
      return {
        animation: `${pulseAnimation} 2s infinite`,
        cursor: 'not-allowed',
      };
    }
    if (error) {
      return {
        animation: `${shakeAnimation} 0.5s ease-in-out`,
        backgroundColor: theme.palette.error.main,
        '&:hover': {
          backgroundColor: theme.palette.error.dark,
        },
      };
    }
    if (success) {
      return {
        backgroundColor: theme.palette.success.main,
        '&:hover': {
          backgroundColor: theme.palette.success.dark,
        },
      };
    }
    return {};
  };

  const getGlowStyles = (): SxProps<Theme> => {
    if (!glowEffect) return {};
    
    return {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 'inherit',
        padding: '2px',
        background: `linear-gradient(45deg, ${theme.palette[color].main}, ${theme.palette[color].dark})`,
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        opacity: 0,
        transition: 'opacity 0.3s ease',
      },
      '&:hover::before': {
        opacity: 1,
      },
    };
  };

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      onClick={handleClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: 600,
        minHeight: 44,
        ...getAnimationStyles(),
        ...getStateStyles(),
        ...getGlowStyles(),
        ...(sx as any),
      }}
    >
      {/* Ripple effects */}
      {rippleEffect && ripples.map((ripple) => (
        <Box
          key={ripple.id}
          sx={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.common.white, 0.6),
            transform: 'translate(-50%, -50%)',
            animation: `${rippleAnimation} 0.6s linear`,
            pointerEvents: 'none',
          }}
        />
      ))}
      
      {/* Button content */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          transition: 'all 0.3s ease',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading && (
          <CircularProgress
            size={16}
            sx={{
              color: 'inherit',
            }}
          />
        )}
        {children}
      </Box>
    </Button>
  );
};

export default AnimatedButton;