import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

interface WorkflowTimerProps {
  startTime: Date;
  targetTime: number; // in seconds
  isCompleted?: boolean;
  onTimeUpdate?: (elapsed: number, remaining: number) => void;
}

const WorkflowTimer: React.FC<WorkflowTimerProps> = ({
  startTime,
  targetTime,
  isCompleted = false,
  onTimeUpdate,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsedSeconds = (now.getTime() - startTime.getTime()) / 1000;
      const remaining = Math.max(0, targetTime - elapsedSeconds);
      
      setElapsed(elapsedSeconds);
      setIsOvertime(elapsedSeconds > targetTime);
      
      onTimeUpdate?.(elapsedSeconds, remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, targetTime, isCompleted, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return Math.min((elapsed / targetTime) * 100, 100);
  };

  const getProgressColor = (): 'primary' | 'warning' | 'error' | 'success' => {
    if (isCompleted) return 'success';
    if (isOvertime) return 'error';
    if (elapsed > targetTime * 0.8) return 'warning';
    return 'primary';
  };

  const getStatusIcon = () => {
    if (isCompleted) return <CheckIcon color="success" />;
    if (isOvertime) return <WarningIcon color="error" />;
    return <TimerIcon color={elapsed > targetTime * 0.8 ? 'warning' : 'primary'} />;
  };

  const getStatusText = (): string => {
    if (isCompleted) return 'Completed';
    if (isOvertime) return 'Overtime';
    if (elapsed > targetTime * 0.8) return 'Running Late';
    return 'On Track';
  };

  const getStatusColor = (): 'success' | 'error' | 'warning' | 'primary' => {
    if (isCompleted) return 'success';
    if (isOvertime) return 'error';
    if (elapsed > targetTime * 0.8) return 'warning';
    return 'primary';
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {getStatusIcon()}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatTime(elapsed)} / {formatTime(targetTime)}
        </Typography>
        <Chip
          label={getStatusText()}
          size="small"
          color={getStatusColor()}
          variant={isCompleted ? 'filled' : 'outlined'}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={getProgressPercentage()}
          color={getProgressColor()}
          sx={{ 
            flexGrow: 1, 
            height: 6, 
            borderRadius: 3,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
            },
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {Math.round(getProgressPercentage())}%
        </Typography>
      </Box>

      {/* Performance Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <SpeedIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary">
          Target: 1-minute reporting
        </Typography>
        {isCompleted && (
          <Tooltip title={`Completed in ${formatTime(elapsed)}`}>
            <Chip
              label={elapsed <= targetTime ? 'Target Met' : 'Target Exceeded'}
              size="small"
              color={elapsed <= targetTime ? 'success' : 'warning'}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default WorkflowTimer;