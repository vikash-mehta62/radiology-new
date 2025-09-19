import React, { useState } from 'react';
import {
  Card,
  CardProps,
  Box,
  useTheme,
  alpha,
  keyframes,
  SxProps,
  Theme,
} from '@mui/material';

// Float animation
const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-6px);
  }
`;

// Glow animation
const glowAnimation = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px rgba(25, 118, 210, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(25, 118, 210, 0.4), 0 0 30px rgba(25, 118, 210, 0.2);
  }
`;

// Shimmer animation
const shimmerAnimation = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

interface AnimatedCardProps extends Omit<CardProps, 'sx'> {
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'tilt' | 'float' | 'shimmer';
  glowColor?: string;
  animationDuration?: number;
  interactive?: boolean;
  borderGradient?: boolean;
  glassmorphism?: boolean;
  sx?: SxProps<Theme>;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  hoverEffect = 'lift',
  glowColor,
  animationDuration = 300,
  interactive = true,
  borderGradient = false,
  glassmorphism = false,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = () => {
    if (interactive) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setIsHovered(false);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (hoverEffect === 'tilt' && interactive) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePosition({ x, y });
    }
  };

  const getHoverStyles = (): SxProps<Theme> => {
    const baseTransition = `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    const effectiveGlowColor = glowColor || theme.palette.primary.main;

    switch (hoverEffect) {
      case 'lift':
        return {
          transition: baseTransition,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`,
          },
        };
      
      case 'glow':
        return {
          transition: baseTransition,
          '&:hover': {
            boxShadow: `0 0 20px ${alpha(effectiveGlowColor, 0.4)}, 0 0 40px ${alpha(effectiveGlowColor, 0.2)}`,
            transform: 'translateY(-2px)',
          },
        };
      
      case 'scale':
        return {
          transition: baseTransition,
          '&:hover': {
            transform: 'scale(1.03)',
            boxShadow: `0 8px 30px ${alpha(theme.palette.common.black, 0.12)}`,
          },
        };
      
      case 'tilt':
        const { x, y } = mousePosition;
        const rotateX = isHovered ? (y - 150) / 30 : 0;
        const rotateY = isHovered ? (x - 150) / 30 : 0;
        
        return {
          transition: baseTransition,
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: 'preserve-3d' as const,
          '&:hover': {
            boxShadow: `0 15px 35px ${alpha(theme.palette.common.black, 0.1)}`,
          },
        };
      
      case 'float':
        return {
          animation: isHovered ? `${floatAnimation} 2s ease-in-out infinite` : 'none',
          transition: baseTransition,
          '&:hover': {
            boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.1)}`,
          },
        };
      
      case 'shimmer':
        return {
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
            transition: 'left 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          },
        };
      
      default:
        return {
          transition: baseTransition,
        };
    }
  };

  const getGlassmorphismStyles = (): SxProps<Theme> => {
    if (!glassmorphism) return {};
    
    return {
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.05)} 100%)`
        : `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.25)} 0%, ${alpha(theme.palette.common.white, 0.1)} 100%)`,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    };
  };

  const getBorderGradientStyles = (): SxProps<Theme> => {
    if (!borderGradient) return {};
    
    return {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        padding: '2px',
        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        borderRadius: 'inherit',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        opacity: isHovered ? 1 : 0,
        transition: `opacity ${animationDuration}ms ease`,
      },
    };
  };

  return (
    <Card
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      sx={{
        borderRadius: 3,
        cursor: interactive ? 'pointer' : 'default',
        ...getHoverStyles(),
        ...getGlassmorphismStyles(),
        ...getBorderGradientStyles(),
        ...(sx as any),
      }}
    >
      {children}
    </Card>
  );
};

export default AnimatedCard;