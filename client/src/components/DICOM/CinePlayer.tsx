import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Slider,
  FormControlLabel,
  Switch,
  Tooltip,
  ButtonGroup
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  Repeat as LoopIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

interface CinePlayerProps {
  imageIds: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying?: boolean;
  fps?: number;
  loop?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSettingsChange?: (settings: { fps: number; loop: boolean }) => void;
}

const CinePlayer: React.FC<CinePlayerProps> = ({
  imageIds,
  currentIndex,
  onIndexChange,
  isPlaying = false,
  fps = 10,
  loop = true,
  onPlayStateChange,
  onSettingsChange
}) => {
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [localFps, setLocalFps] = useState(fps);
  const [localLoop, setLocalLoop] = useState(loop);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (localIsPlaying && imageIds.length > 1) {
      intervalRef.current = setInterval(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= imageIds.length) {
          if (localLoop) {
            onIndexChange(0);
          } else {
            setLocalIsPlaying(false);
            onPlayStateChange?.(false);
          }
        } else {
          onIndexChange(nextIndex);
        }
      }, 1000 / localFps);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [localIsPlaying, localFps, localLoop, imageIds.length, onIndexChange, onPlayStateChange]);

  const handlePlayPause = () => {
    const newPlayState = !localIsPlaying;
    setLocalIsPlaying(newPlayState);
    onPlayStateChange?.(newPlayState);
  };

  const handleStop = () => {
    setLocalIsPlaying(false);
    onPlayStateChange?.(false);
    onIndexChange(0);
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex - 1;
    onIndexChange(prevIndex < 0 ? imageIds.length - 1 : prevIndex);
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    onIndexChange(nextIndex >= imageIds.length ? 0 : nextIndex);
  };

  const handleFpsChange = (newFps: number) => {
    setLocalFps(newFps);
    onSettingsChange?.({ fps: newFps, loop: localLoop });
  };

  const handleLoopChange = (newLoop: boolean) => {
    setLocalLoop(newLoop);
    onSettingsChange?.({ fps: localFps, loop: newLoop });
  };

  if (imageIds.length <= 1) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Cine mode requires multiple images
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cine Player
        </Typography>
        
        {/* Playback Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ButtonGroup variant="outlined" size="small">
            <Tooltip title="Previous Frame">
              <IconButton onClick={handlePrevious}>
                <PrevIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={localIsPlaying ? "Pause" : "Play"}>
              <IconButton onClick={handlePlayPause}>
                {localIsPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Stop">
              <IconButton onClick={handleStop}>
                <StopIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Next Frame">
              <IconButton onClick={handleNext}>
                <NextIcon />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Box>

        {/* Frame Slider */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Frame: {currentIndex + 1} / {imageIds.length}
          </Typography>
          <Slider
            value={currentIndex}
            onChange={(_, value) => onIndexChange(value as number)}
            min={0}
            max={imageIds.length - 1}
            step={1}
            marks
            valueLabelDisplay="auto"
            size="small"
          />
        </Box>

        {/* Speed Control */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <SpeedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Speed: {localFps} FPS
          </Typography>
          <Slider
            value={localFps}
            onChange={(_, value) => handleFpsChange(value as number)}
            min={1}
            max={30}
            step={1}
            valueLabelDisplay="auto"
            size="small"
          />
        </Box>

        {/* Loop Control */}
        <FormControlLabel
          control={
            <Switch
              checked={localLoop}
              onChange={(e) => handleLoopChange(e.target.checked)}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LoopIcon sx={{ mr: 1 }} />
              Loop
            </Box>
          }
        />
      </CardContent>
    </Card>
  );
};

export default CinePlayer;