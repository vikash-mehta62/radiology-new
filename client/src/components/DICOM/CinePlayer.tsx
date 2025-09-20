/**
 * Enhanced Cine Player Component
 * Provides professional medical imaging cine playback with variable speed controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlayArrow as Play, 
  Pause, 
  SkipPrevious as SkipBack, 
  SkipNext as SkipForward, 
  Replay as RotateCcw, 
  Settings,
  VolumeUp as Volume2,
  VolumeOff as VolumeX,
  Fullscreen as Maximize2,
  FullscreenExit as Minimize2
} from '@mui/icons-material';
import { useSliceNavigation } from '../../hooks/useSliceNavigation';
import { useIntelligentCache } from '../../hooks/useIntelligentCache';
import { performanceMonitor } from '../../services/performanceMonitor';

export interface CinePlayerConfig {
  frameRate: number;
  minFrameRate: number;
  maxFrameRate: number;
  autoPlay: boolean;
  loop: boolean;
  showControls: boolean;
  showFrameCounter: boolean;
  showTimeline: boolean;
  enableKeyboardShortcuts: boolean;
  enableMouseWheel: boolean;
  smoothPlayback: boolean;
  adaptiveFrameRate: boolean;
  preloadFrames: number;
}

export interface CinePlayerState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  frameRate: number;
  playbackDirection: 'forward' | 'backward';
  playbackMode: 'once' | 'loop' | 'bounce';
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  bufferedFrames: number[];
  loadingFrames: number[];
}

export interface CinePlayerProps {
  totalFrames: number;
  initialFrame?: number;
  config?: Partial<CinePlayerConfig>;
  onFrameChange?: (frameIndex: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onConfigChange?: (config: CinePlayerConfig) => void;
  frameLoader?: (frameIndex: number) => Promise<any>;
  className?: string;
  style?: React.CSSProperties;
}

const defaultConfig: CinePlayerConfig = {
  frameRate: 10,
  minFrameRate: 1,
  maxFrameRate: 60,
  autoPlay: false,
  loop: true,
  showControls: true,
  showFrameCounter: true,
  showTimeline: true,
  enableKeyboardShortcuts: true,
  enableMouseWheel: true,
  smoothPlayback: true,
  adaptiveFrameRate: true,
  preloadFrames: 5
};

export const CinePlayer: React.FC<CinePlayerProps> = ({
  totalFrames,
  initialFrame = 0,
  config: userConfig = {},
  onFrameChange,
  onPlayStateChange,
  onConfigChange,
  frameLoader,
  className = '',
  style = {}
}) => {
  const config = { ...defaultConfig, ...userConfig };
  
  // State management
  const [state, setState] = useState<CinePlayerState>({
    isPlaying: config.autoPlay,
    currentFrame: initialFrame,
    totalFrames,
    frameRate: config.frameRate,
    playbackDirection: 'forward',
    playbackMode: config.loop ? 'loop' : 'once',
    volume: 1.0,
    isMuted: false,
    isFullscreen: false,
    bufferedFrames: [],
    loadingFrames: []
  });

  // Refs for timers and intervals
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameTimeRef = useRef<number>(0);
  const performanceRef = useRef<{ frameCount: number; startTime: number }>({
    frameCount: 0,
    startTime: performance.now()
  });

  // Hooks
  const sliceNavigation = useSliceNavigation({
    totalSlices: totalFrames,
    currentSlice: initialFrame,
    enableKeyboard: config.enableKeyboardShortcuts,
    enableMouseWheel: config.enableMouseWheel,
    enableTouch: true,
    onSliceChange: (sliceIndex) => {
      setState(prev => ({ ...prev, currentFrame: sliceIndex }));
      onFrameChange?.(sliceIndex);
    }
  });

  const cacheManager = useIntelligentCache({
    enableAutoOptimization: true
  });

  // Playback control functions
  const play = useCallback(() => {
    if (state.isPlaying) return;

    setState(prev => ({ ...prev, isPlaying: true }));
    onPlayStateChange?.(true);

    const frameInterval = 1000 / state.frameRate;
    frameTimeRef.current = performance.now();
    performanceRef.current = { frameCount: 0, startTime: performance.now() };

    playbackIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const expectedFrameTime = frameTimeRef.current + frameInterval;
      
      // Adaptive frame rate adjustment
      if (config.adaptiveFrameRate) {
        const actualInterval = now - frameTimeRef.current;
        const targetInterval = 1000 / state.frameRate;
        
        if (actualInterval > targetInterval * 1.5) {
          // Running slow, reduce frame rate
          setState(prev => ({
            ...prev,
            frameRate: Math.max(config.minFrameRate, prev.frameRate * 0.9)
          }));
        } else if (actualInterval < targetInterval * 0.8) {
          // Running fast, can increase frame rate
          setState(prev => ({
            ...prev,
            frameRate: Math.min(config.maxFrameRate, prev.frameRate * 1.1)
          }));
        }
      }

      setState(prev => {
        let nextFrame = prev.currentFrame;
        
        if (prev.playbackDirection === 'forward') {
          nextFrame = prev.currentFrame + 1;
          
          if (nextFrame >= totalFrames) {
            switch (prev.playbackMode) {
              case 'once':
                // Stop at end
                if (playbackIntervalRef.current) {
                  clearInterval(playbackIntervalRef.current);
                  playbackIntervalRef.current = null;
                }
                onPlayStateChange?.(false);
                return { ...prev, isPlaying: false };
              case 'loop':
                nextFrame = 0;
                break;
              case 'bounce':
                nextFrame = totalFrames - 2;
                return { 
                  ...prev, 
                  currentFrame: nextFrame, 
                  playbackDirection: 'backward' 
                };
            }
          }
        } else {
          nextFrame = prev.currentFrame - 1;
          
          if (nextFrame < 0) {
            switch (prev.playbackMode) {
              case 'once':
                // Stop at beginning
                if (playbackIntervalRef.current) {
                  clearInterval(playbackIntervalRef.current);
                  playbackIntervalRef.current = null;
                }
                onPlayStateChange?.(false);
                return { ...prev, isPlaying: false };
              case 'loop':
                nextFrame = totalFrames - 1;
                break;
              case 'bounce':
                nextFrame = 1;
                return { 
                  ...prev, 
                  currentFrame: nextFrame, 
                  playbackDirection: 'forward' 
                };
            }
          }
        }

        // Update performance metrics
        performanceRef.current.frameCount++;
        const elapsed = now - performanceRef.current.startTime;
        if (elapsed > 1000) { // Update every second
          const actualFPS = performanceRef.current.frameCount / (elapsed / 1000);
          performanceMonitor.recordRenderingMetrics({
            frameTime: 1000 / actualFPS,
            drawCalls: 1,
            textureMemory: 0,
            shaderCompileTime: 0,
            canvasResizes: 0,
            renderingErrors: []
          });
          performanceRef.current = { frameCount: 0, startTime: now };
        }

        return { ...prev, currentFrame: nextFrame };
      });

      frameTimeRef.current = now;
    }, frameInterval);
  }, [state.isPlaying, state.frameRate, state.playbackDirection, state.playbackMode, totalFrames, config.adaptiveFrameRate, config.minFrameRate, config.maxFrameRate, onPlayStateChange]);

  const pause = useCallback(() => {
    if (!state.isPlaying) return;

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isPlaying: false }));
    onPlayStateChange?.(false);
  }, [state.isPlaying, onPlayStateChange]);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const stepForward = useCallback(() => {
    pause();
    const nextFrame = Math.min(state.currentFrame + 1, totalFrames - 1);
    setState(prev => ({ ...prev, currentFrame: nextFrame }));
    sliceNavigation.goToSlice(nextFrame);
  }, [state.currentFrame, totalFrames, pause, sliceNavigation]);

  const stepBackward = useCallback(() => {
    pause();
    const prevFrame = Math.max(state.currentFrame - 1, 0);
    setState(prev => ({ ...prev, currentFrame: prevFrame }));
    sliceNavigation.goToSlice(prevFrame);
  }, [state.currentFrame, pause, sliceNavigation]);

  const goToFrame = useCallback((frameIndex: number) => {
    const clampedFrame = Math.max(0, Math.min(frameIndex, totalFrames - 1));
    setState(prev => ({ ...prev, currentFrame: clampedFrame }));
    sliceNavigation.goToSlice(clampedFrame);
  }, [totalFrames, sliceNavigation]);

  const setFrameRate = useCallback((fps: number) => {
    const clampedFPS = Math.max(config.minFrameRate, Math.min(fps, config.maxFrameRate));
    setState(prev => ({ ...prev, frameRate: clampedFPS }));
    
    // Restart playback with new frame rate if currently playing
    if (state.isPlaying) {
      pause();
      setTimeout(play, 50); // Small delay to ensure clean restart
    }
  }, [config.minFrameRate, config.maxFrameRate, state.isPlaying, pause, play]);

  const setPlaybackMode = useCallback((mode: CinePlayerState['playbackMode']) => {
    setState(prev => ({ ...prev, playbackMode: mode }));
  }, []);

  const setPlaybackDirection = useCallback((direction: CinePlayerState['playbackDirection']) => {
    setState(prev => ({ ...prev, playbackDirection: direction }));
  }, []);

  const toggleMute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume, isMuted: clampedVolume === 0 }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  // Preload frames around current frame
  useEffect(() => {
    if (!frameLoader) return;

    const preloadFrames = async () => {
      const framesToPreload: number[] = [];
      
      // Preload frames around current frame
      for (let i = 1; i <= config.preloadFrames; i++) {
        const nextFrame = state.currentFrame + i;
        const prevFrame = state.currentFrame - i;
        
        if (nextFrame < totalFrames && !cacheManager.isSliceCached('current', nextFrame)) {
          framesToPreload.push(nextFrame);
        }
        
        if (prevFrame >= 0 && !cacheManager.isSliceCached('current', prevFrame)) {
          framesToPreload.push(prevFrame);
        }
      }

      // Load frames in parallel
      setState(prev => ({ 
        ...prev, 
        loadingFrames: [...prev.loadingFrames, ...framesToPreload] 
      }));

      const loadPromises = framesToPreload.map(async (frameIndex) => {
        try {
          const frameData = await frameLoader(frameIndex);
          // Cache the frame data using the loadSlice method
          await cacheManager.loadSlice('current', frameIndex, `frame_${frameIndex}`);
          
          setState(prev => ({
            ...prev,
            bufferedFrames: [...prev.bufferedFrames, frameIndex],
            loadingFrames: prev.loadingFrames.filter(f => f !== frameIndex)
          }));
        } catch (error) {
          console.error(`Failed to preload frame ${frameIndex}:`, error);
          setState(prev => ({
            ...prev,
            loadingFrames: prev.loadingFrames.filter(f => f !== frameIndex)
          }));
        }
      });

      await Promise.allSettled(loadPromises);
    };

    preloadFrames();
  }, [state.currentFrame, totalFrames, config.preloadFrames, frameLoader, cacheManager]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!config.enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'j':
          event.preventDefault();
          stepBackward();
          break;
        case 'l':
          event.preventDefault();
          stepForward();
          break;
        case 'Home':
          event.preventDefault();
          goToFrame(0);
          break;
        case 'End':
          event.preventDefault();
          goToFrame(totalFrames - 1);
          break;
        case 'r':
          event.preventDefault();
          setPlaybackDirection(state.playbackDirection === 'forward' ? 'backward' : 'forward');
          break;
        case 'm':
          event.preventDefault();
          toggleMute();
          break;
        case 'f':
          event.preventDefault();
          toggleFullscreen();
          break;
        case '+':
        case '=':
          event.preventDefault();
          setFrameRate(state.frameRate + 1);
          break;
        case '-':
          event.preventDefault();
          setFrameRate(state.frameRate - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    config.enableKeyboardShortcuts,
    togglePlayPause,
    stepBackward,
    stepForward,
    goToFrame,
    totalFrames,
    setPlaybackDirection,
    state.playbackDirection,
    toggleMute,
    toggleFullscreen,
    setFrameRate,
    state.frameRate
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  // Update slice navigation when current frame changes
  useEffect(() => {
    onFrameChange?.(state.currentFrame);
  }, [state.currentFrame, onFrameChange]);

  const formatTime = (frameIndex: number, fps: number) => {
    const seconds = frameIndex / fps;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const frames = frameIndex % fps;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalFrames > 0 ? (state.currentFrame / (totalFrames - 1)) * 100 : 0;

  return (
    <div 
      className={`cine-player ${state.isFullscreen ? 'fullscreen' : ''} ${className}`}
      style={style}
    >
      {config.showControls && (
        <div className="cine-controls">
          {/* Main playback controls */}
          <div className="playback-controls">
            <button
              onClick={stepBackward}
              className="control-button"
              title="Step Backward (J)"
              disabled={state.currentFrame === 0}
            >
              <SkipBack sx={{ fontSize: 20 }} />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="control-button play-pause"
              title={state.isPlaying ? "Pause (Space/K)" : "Play (Space/K)"}
            >
              {state.isPlaying ? <Pause sx={{ fontSize: 24 }} /> : <Play sx={{ fontSize: 24 }} />}
            </button>
            
            <button
              onClick={stepForward}
              className="control-button"
              title="Step Forward (L)"
              disabled={state.currentFrame === totalFrames - 1}
            >
              <SkipForward sx={{ fontSize: 20 }} />
            </button>
            
            <button
              onClick={() => setPlaybackDirection(state.playbackDirection === 'forward' ? 'backward' : 'forward')}
              className={`control-button ${state.playbackDirection === 'backward' ? 'active' : ''}`}
              title="Reverse Direction (R)"
            >
              <RotateCcw sx={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Frame rate control */}
          <div className="frame-rate-control">
            <label>FPS:</label>
            <input
              type="range"
              min={config.minFrameRate}
              max={config.maxFrameRate}
              value={state.frameRate}
              onChange={(e) => setFrameRate(Number(e.target.value))}
              className="fps-slider"
            />
            <span className="fps-value">{state.frameRate.toFixed(1)}</span>
          </div>

          {/* Playback mode selector */}
          <div className="playback-mode">
            <select
              value={state.playbackMode}
              onChange={(e) => setPlaybackMode(e.target.value as CinePlayerState['playbackMode'])}
              className="mode-selector"
            >
              <option value="once">Once</option>
              <option value="loop">Loop</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>

          {/* Volume control */}
          <div className="volume-control">
            <button
              onClick={toggleMute}
              className="control-button"
              title="Toggle Mute (M)"
            >
              {state.isMuted || state.volume === 0 ? <VolumeX sx={{ fontSize: 20 }} /> : <Volume2 sx={{ fontSize: 20 }} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={state.isMuted ? 0 : state.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="volume-slider"
            />
          </div>

          {/* Settings and fullscreen */}
          <div className="additional-controls">
            <button
              onClick={() => {/* Open settings modal */}}
              className="control-button"
              title="Settings"
            >
              <Settings sx={{ fontSize: 20 }} />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="control-button"
              title="Toggle Fullscreen (F)"
            >
              {state.isFullscreen ? <Minimize2 sx={{ fontSize: 20 }} /> : <Maximize2 sx={{ fontSize: 20 }} />}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {config.showTimeline && (
        <div className="timeline-container">
          <div className="timeline">
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={state.currentFrame}
              onChange={(e) => goToFrame(Number(e.target.value))}
              className="timeline-slider"
            />
            <div 
              className="timeline-progress" 
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Buffered frames indicator */}
            <div className="buffered-frames">
              {state.bufferedFrames.map(frameIndex => (
                <div
                  key={frameIndex}
                  className="buffered-frame"
                  style={{
                    left: `${(frameIndex / (totalFrames - 1)) * 100}%`,
                    width: `${100 / totalFrames}%`
                  }}
                />
              ))}
            </div>
            
            {/* Loading frames indicator */}
            <div className="loading-frames">
              {state.loadingFrames.map(frameIndex => (
                <div
                  key={frameIndex}
                  className="loading-frame"
                  style={{
                    left: `${(frameIndex / (totalFrames - 1)) * 100}%`,
                    width: `${100 / totalFrames}%`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Frame counter and time display */}
      {config.showFrameCounter && (
        <div className="frame-info">
          <span className="frame-counter">
            {state.currentFrame + 1} / {totalFrames}
          </span>
          <span className="time-display">
            {formatTime(state.currentFrame, state.frameRate)} / {formatTime(totalFrames - 1, state.frameRate)}
          </span>
          {state.loadingFrames.length > 0 && (
            <span className="loading-indicator">
              Loading {state.loadingFrames.length} frames...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CinePlayer;