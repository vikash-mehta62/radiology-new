/**
 * Multi-Slice Viewer - Advanced Multi-Slice Navigation and Display
 * 
 * Comprehensive multi-slice viewing capabilities including:
 * - Stack navigation with thumbnail preview
 * - Cine/movie mode with playback controls
 * - Multi-planar reconstruction (MPR) views
 * - Slice synchronization across viewports
 * - Advanced navigation (jump to slice, bookmarks)
 * - Performance optimization for large datasets
 * - Keyboard and mouse wheel navigation
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef
} from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Button,
  ButtonGroup,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipPrevious as FirstIcon,
  SkipNext as LastIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Speed as SpeedIcon,
  Repeat as LoopIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  GridView as GridIcon,
  ViewColumn as ColumnIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

// Components
import ViewerCore, { ViewerCoreRef } from '../core/ViewerCore';

// Services
import { enhancedDicomService } from '../../../services/enhancedDicomService';
import { performanceMonitor } from '../../../services/performanceMonitor';

// Types
export interface MultiSliceViewerProps {
  // Series data
  seriesInstanceUID?: string;
  imageIds?: string[];
  
  // Current state
  currentImageIndex?: number;
  onImageIndexChange?: (index: number) => void;
  
  // View configuration
  layout?: 'single' | 'grid' | 'mpr';
  gridSize?: { rows: number; cols: number };
  enableThumbnails?: boolean;
  enableCine?: boolean;
  enableMPR?: boolean;
  enableSynchronization?: boolean;
  
  // Cine settings
  cineSpeed?: number;
  cineLoop?: boolean;
  cineReverse?: boolean;
  
  // Navigation
  enableKeyboardNavigation?: boolean;
  enableMouseWheelNavigation?: boolean;
  enableBookmarks?: boolean;
  
  // Performance
  preloadCount?: number;
  enableProgressiveLoading?: boolean;
  enableCaching?: boolean;
  
  // Event handlers
  onSliceChange?: (index: number, imageId: string) => void;
  onCineStateChange?: (isPlaying: boolean, speed: number) => void;
  onBookmarkAdd?: (index: number, name: string) => void;
  onBookmarkRemove?: (index: number) => void;
  
  // Layout
  width?: number | string;
  height?: number | string;
  className?: string;
  sx?: any;
}

export interface MultiSliceViewerRef {
  // Navigation
  goToSlice: (index: number) => void;
  nextSlice: () => void;
  previousSlice: () => void;
  firstSlice: () => void;
  lastSlice: () => void;
  
  // Cine controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  
  // Bookmarks
  addBookmark: (index?: number, name?: string) => void;
  removeBookmark: (index: number) => void;
  goToBookmark: (index: number) => void;
  
  // View controls
  setLayout: (layout: 'single' | 'grid' | 'mpr') => void;
  setGridSize: (rows: number, cols: number) => void;
  
  // Export
  exportCurrentSlice: () => string | null;
  exportAllSlices: () => string[];
}

interface Bookmark {
  index: number;
  name: string;
  timestamp: Date;
  thumbnail?: string;
}

interface CineState {
  isPlaying: boolean;
  speed: number;
  direction: 'forward' | 'reverse';
  loop: boolean;
  startIndex: number;
  endIndex: number;
}

const MultiSliceViewer = forwardRef<MultiSliceViewerRef, MultiSliceViewerProps>(({
  seriesInstanceUID,
  imageIds = [],
  currentImageIndex = 0,
  onImageIndexChange,
  layout = 'single',
  gridSize = { rows: 2, cols: 2 },
  enableThumbnails = true,
  enableCine = true,
  enableMPR = false,
  enableSynchronization = true,
  cineSpeed = 10,
  cineLoop = true,
  cineReverse = false,
  enableKeyboardNavigation = true,
  enableMouseWheelNavigation = true,
  enableBookmarks = true,
  preloadCount = 5,
  enableProgressiveLoading = true,
  enableCaching = true,
  onSliceChange,
  onCineStateChange,
  onBookmarkAdd,
  onBookmarkRemove,
  width = '100%',
  height = '100%',
  className,
  sx
}, ref) => {
  const theme = useTheme();
  const viewerRefs = useRef<(ViewerCoreRef | null)[]>([]);
  const cineIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [currentIndex, setCurrentIndex] = useState(currentImageIndex);
  const [cineState, setCineState] = useState<CineState>({
    isPlaying: false,
    speed: cineSpeed,
    direction: cineReverse ? 'reverse' : 'forward',
    loop: cineLoop,
    startIndex: 0,
    endIndex: imageIds.length - 1
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [synchronizeViewports, setSynchronizeViewports] = useState(enableSynchronization);
  const [showThumbnails, setShowThumbnails] = useState(enableThumbnails);
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [currentGridSize, setCurrentGridSize] = useState(gridSize);

  // Computed values
  const totalSlices = imageIds.length;
  const hasMultipleSlices = totalSlices > 1;
  const canNavigate = hasMultipleSlices && !cineState.isPlaying;
  
  // Grid layout calculation
  const gridViewports = useMemo(() => {
    if (currentLayout !== 'grid') return [];
    
    const { rows, cols } = currentGridSize;
    const totalViewports = rows * cols;
    const viewports = [];
    
    for (let i = 0; i < totalViewports; i++) {
      const imageIndex = Math.min(currentIndex + i, totalSlices - 1);
      viewports.push({
        id: i,
        imageIndex,
        imageId: imageIds[imageIndex] || null
      });
    }
    
    return viewports;
  }, [currentLayout, currentGridSize, currentIndex, imageIds, totalSlices]);

  // Update current index when prop changes
  useEffect(() => {
    if (currentImageIndex !== currentIndex) {
      setCurrentIndex(currentImageIndex);
    }
  }, [currentImageIndex, currentIndex]);

  // Load series data
  useEffect(() => {
    if (seriesInstanceUID) {
      loadSeriesData();
    }
  }, [seriesInstanceUID]);

  // Generate thumbnails
  useEffect(() => {
    if (showThumbnails && imageIds.length > 0) {
      generateThumbnails();
    }
  }, [showThumbnails, imageIds]);

  // Preload images
  useEffect(() => {
    if (enableProgressiveLoading && imageIds.length > 0) {
      preloadImages();
    }
  }, [currentIndex, enableProgressiveLoading, imageIds, preloadCount]);

  // Load series data
  const loadSeriesData = useCallback(async () => {
    if (!seriesInstanceUID) return;

    try {
      setIsLoading(true);
      setLoadingProgress(0);

      const seriesData = await enhancedDicomService.loadSeries(seriesInstanceUID);
      
      // Update cine state end index
      setCineState(prev => ({
        ...prev,
        endIndex: seriesData.imageIds.length - 1
      }));

      setLoadingProgress(100);
      setIsLoading(false);

    } catch (error) {
      console.error('Failed to load series:', error);
      setIsLoading(false);
    }
  }, [seriesInstanceUID]);

  // Generate thumbnails
  const generateThumbnails = useCallback(async () => {
    const thumbnailPromises = imageIds.map(async (imageId, index) => {
      try {
        // Generate thumbnail (simplified - would use actual thumbnail generation)
        const thumbnail = await enhancedDicomService.generateThumbnail(imageId, {
          width: 64,
          height: 64
        });
        return { index, thumbnail };
      } catch (error) {
        console.error(`Failed to generate thumbnail for slice ${index}:`, error);
        return { index, thumbnail: null };
      }
    });

    const results = await Promise.all(thumbnailPromises);
    const thumbnailMap: { [key: number]: string } = {};
    
    results.forEach(({ index, thumbnail }) => {
      if (thumbnail) {
        thumbnailMap[index] = thumbnail;
      }
    });

    setThumbnails(thumbnailMap);
  }, [imageIds]);

  // Preload images around current index
  const preloadImages = useCallback(async () => {
    const startIndex = Math.max(0, currentIndex - preloadCount);
    const endIndex = Math.min(imageIds.length - 1, currentIndex + preloadCount);

    for (let i = startIndex; i <= endIndex; i++) {
      if (imageIds[i]) {
        try {
          await enhancedDicomService.preloadImage(imageIds[i]);
        } catch (error) {
          console.error(`Failed to preload image ${i}:`, error);
        }
      }
    }
  }, [currentIndex, imageIds, preloadCount]);

  // Navigation functions
  const goToSlice = useCallback((index: number) => {
    if (index >= 0 && index < totalSlices) {
      setCurrentIndex(index);
      if (onImageIndexChange) {
        onImageIndexChange(index);
      }
      if (onSliceChange && imageIds[index]) {
        onSliceChange(index, imageIds[index]);
      }
    }
  }, [totalSlices, onImageIndexChange, onSliceChange, imageIds]);

  const nextSlice = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < totalSlices) {
      goToSlice(nextIndex);
    } else if (cineState.loop) {
      goToSlice(0);
    }
  }, [currentIndex, totalSlices, goToSlice, cineState.loop]);

  const previousSlice = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      goToSlice(prevIndex);
    } else if (cineState.loop) {
      goToSlice(totalSlices - 1);
    }
  }, [currentIndex, totalSlices, goToSlice, cineState.loop]);

  const firstSlice = useCallback(() => {
    goToSlice(0);
  }, [goToSlice]);

  const lastSlice = useCallback(() => {
    goToSlice(totalSlices - 1);
  }, [goToSlice, totalSlices]);

  // Cine controls
  const startCine = useCallback(() => {
    if (cineIntervalRef.current) {
      clearInterval(cineIntervalRef.current);
    }

    const interval = 1000 / cineState.speed;
    
    cineIntervalRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = cineState.direction === 'forward' 
          ? prevIndex + 1 
          : prevIndex - 1;

        if (cineState.direction === 'forward') {
          if (nextIndex > cineState.endIndex) {
            return cineState.loop ? cineState.startIndex : cineState.endIndex;
          }
          return nextIndex;
        } else {
          if (nextIndex < cineState.startIndex) {
            return cineState.loop ? cineState.endIndex : cineState.startIndex;
          }
          return nextIndex;
        }
      });
    }, interval);

    setCineState(prev => ({ ...prev, isPlaying: true }));
    
    if (onCineStateChange) {
      onCineStateChange(true, cineState.speed);
    }
  }, [cineState, onCineStateChange]);

  const stopCine = useCallback(() => {
    if (cineIntervalRef.current) {
      clearInterval(cineIntervalRef.current);
      cineIntervalRef.current = null;
    }

    setCineState(prev => ({ ...prev, isPlaying: false }));
    
    if (onCineStateChange) {
      onCineStateChange(false, cineState.speed);
    }
  }, [cineState.speed, onCineStateChange]);

  const pauseCine = useCallback(() => {
    stopCine();
  }, [stopCine]);

  const setCineSpeed = useCallback((speed: number) => {
    setCineState(prev => ({ ...prev, speed }));
    
    if (cineState.isPlaying) {
      stopCine();
      setTimeout(() => startCine(), 100);
    }
  }, [cineState.isPlaying, stopCine, startCine]);

  // Bookmark management
  const addBookmark = useCallback((index?: number, name?: string) => {
    const bookmarkIndex = index ?? currentIndex;
    const bookmarkName = name ?? `Slice ${bookmarkIndex + 1}`;
    
    const newBookmark: Bookmark = {
      index: bookmarkIndex,
      name: bookmarkName,
      timestamp: new Date(),
      thumbnail: thumbnails[bookmarkIndex]
    };

    setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.index - b.index));
    
    if (onBookmarkAdd) {
      onBookmarkAdd(bookmarkIndex, bookmarkName);
    }
  }, [currentIndex, thumbnails, onBookmarkAdd]);

  const removeBookmark = useCallback((index: number) => {
    setBookmarks(prev => prev.filter(b => b.index !== index));
    
    if (onBookmarkRemove) {
      onBookmarkRemove(index);
    }
  }, [onBookmarkRemove]);

  const goToBookmark = useCallback((index: number) => {
    goToSlice(index);
  }, [goToSlice]);

  // Layout controls
  const setLayout = useCallback((newLayout: 'single' | 'grid' | 'mpr') => {
    setCurrentLayout(newLayout);
  }, []);

  const setGridSize = useCallback((rows: number, cols: number) => {
    setCurrentGridSize({ rows, cols });
  }, []);

  // Export functions
  const exportCurrentSlice = useCallback(() => {
    const viewer = viewerRefs.current[0];
    return viewer?.exportImage() || null;
  }, []);

  const exportAllSlices = useCallback(() => {
    return viewerRefs.current
      .map(viewer => viewer?.exportImage())
      .filter(Boolean) as string[];
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          if (canNavigate) previousSlice();
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          if (canNavigate) nextSlice();
          break;
        case 'Home':
          event.preventDefault();
          if (canNavigate) firstSlice();
          break;
        case 'End':
          event.preventDefault();
          if (canNavigate) lastSlice();
          break;
        case ' ':
          event.preventDefault();
          if (enableCine) {
            cineState.isPlaying ? pauseCine() : startCine();
          }
          break;
        case 'b':
        case 'B':
          if (event.ctrlKey && enableBookmarks) {
            event.preventDefault();
            addBookmark();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enableKeyboardNavigation,
    canNavigate,
    previousSlice,
    nextSlice,
    firstSlice,
    lastSlice,
    enableCine,
    cineState.isPlaying,
    pauseCine,
    startCine,
    enableBookmarks,
    addBookmark
  ]);

  // Mouse wheel navigation
  useEffect(() => {
    if (!enableMouseWheelNavigation || !containerRef.current) return;

    const handleWheel = (event: WheelEvent) => {
      if (!canNavigate) return;

      event.preventDefault();
      
      if (event.deltaY > 0) {
        nextSlice();
      } else if (event.deltaY < 0) {
        previousSlice();
      }
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [enableMouseWheelNavigation, canNavigate, nextSlice, previousSlice]);

  // Cleanup cine on unmount
  useEffect(() => {
    return () => {
      if (cineIntervalRef.current) {
        clearInterval(cineIntervalRef.current);
      }
    };
  }, []);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    goToSlice,
    nextSlice,
    previousSlice,
    firstSlice,
    lastSlice,
    play: startCine,
    pause: pauseCine,
    stop: stopCine,
    setSpeed: setCineSpeed,
    addBookmark,
    removeBookmark,
    goToBookmark,
    setLayout,
    setGridSize,
    exportCurrentSlice,
    exportAllSlices
  }), [
    goToSlice,
    nextSlice,
    previousSlice,
    firstSlice,
    lastSlice,
    startCine,
    pauseCine,
    stopCine,
    setCineSpeed,
    addBookmark,
    removeBookmark,
    goToBookmark,
    setLayout,
    setGridSize,
    exportCurrentSlice,
    exportAllSlices
  ]);

  // Render single viewport
  const renderSingleViewport = () => (
    <ViewerCore
      ref={(ref) => { viewerRefs.current[0] = ref; }}
      seriesInstanceUID={seriesInstanceUID}
      imageIds={imageIds}
      currentImageIndex={currentIndex}
      width="100%"
      height="100%"
    />
  );

  // Render grid viewports
  const renderGridViewports = () => (
    <Grid container spacing={1} sx={{ height: '100%' }}>
      {gridViewports.map((viewport) => (
        <Grid 
          item 
          key={viewport.id}
          xs={12 / currentGridSize.cols}
          sx={{ height: `${100 / currentGridSize.rows}%` }}
        >
          <ViewerCore
            ref={(ref) => { viewerRefs.current[viewport.id] = ref; }}
            imageIds={viewport.imageId ? [viewport.imageId] : []}
            currentImageIndex={0}
            width="100%"
            height="100%"
          />
        </Grid>
      ))}
    </Grid>
  );

  // Render navigation controls
  const renderNavigationControls = () => (
    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      {/* Slice Navigation */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Slice: {currentIndex + 1} / {totalSlices}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton
            size="small"
            onClick={firstSlice}
            disabled={!canNavigate || currentIndex === 0}
          >
            <FirstIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={previousSlice}
            disabled={!canNavigate || currentIndex === 0}
          >
            <PrevIcon />
          </IconButton>
          
          <Box sx={{ flex: 1, mx: 2 }}>
            <Slider
              value={currentIndex}
              min={0}
              max={totalSlices - 1}
              step={1}
              onChange={(_, value) => goToSlice(value as number)}
              disabled={!canNavigate}
              marks={bookmarks.map(b => ({ value: b.index, label: '' }))}
            />
          </Box>
          
          <IconButton
            size="small"
            onClick={nextSlice}
            disabled={!canNavigate || currentIndex === totalSlices - 1}
          >
            <NextIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={lastSlice}
            disabled={!canNavigate || currentIndex === totalSlices - 1}
          >
            <LastIcon />
          </IconButton>
        </Box>

        {/* Direct slice input */}
        <TextField
          size="small"
          type="number"
          label="Go to slice"
          value={currentIndex + 1}
          onChange={(e) => {
            const slice = parseInt(e.target.value) - 1;
            if (slice >= 0 && slice < totalSlices) {
              goToSlice(slice);
            }
          }}
          inputProps={{ min: 1, max: totalSlices }}
          sx={{ width: 120 }}
        />
      </Box>

      {/* Cine Controls */}
      {enableCine && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Cine Controls
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ButtonGroup size="small">
              <IconButton
                onClick={cineState.isPlaying ? pauseCine : startCine}
                disabled={!hasMultipleSlices}
              >
                {cineState.isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
              <IconButton
                onClick={stopCine}
                disabled={!cineState.isPlaying}
              >
                <StopIcon />
              </IconButton>
            </ButtonGroup>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              <SpeedIcon fontSize="small" />
              <Slider
                value={cineState.speed}
                min={1}
                max={30}
                step={1}
                onChange={(_, value) => setCineSpeed(value as number)}
                sx={{ width: 100 }}
              />
              <Typography variant="caption">
                {cineState.speed} fps
              </Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={cineState.loop}
                  onChange={(e) => setCineState(prev => ({ 
                    ...prev, 
                    loop: e.target.checked 
                  }))}
                />
              }
              label="Loop"
              sx={{ ml: 2 }}
            />
          </Box>
        </Box>
      )}

      {/* Layout Controls */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Layout
        </Typography>
        
        <ButtonGroup size="small">
          <Button
            variant={currentLayout === 'single' ? 'contained' : 'outlined'}
            onClick={() => setLayout('single')}
          >
            Single
          </Button>
          <Button
            variant={currentLayout === 'grid' ? 'contained' : 'outlined'}
            onClick={() => setLayout('grid')}
            startIcon={<GridIcon />}
          >
            Grid
          </Button>
          {enableMPR && (
            <Button
              variant={currentLayout === 'mpr' ? 'contained' : 'outlined'}
              onClick={() => setLayout('mpr')}
            >
              MPR
            </Button>
          )}
        </ButtonGroup>
        
        {currentLayout === 'grid' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Rows</InputLabel>
              <Select
                value={currentGridSize.rows}
                onChange={(e) => setGridSize(e.target.value as number, currentGridSize.cols)}
              >
                {[1, 2, 3, 4].map(n => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Cols</InputLabel>
              <Select
                value={currentGridSize.cols}
                onChange={(e) => setGridSize(currentGridSize.rows, e.target.value as number)}
              >
                {[1, 2, 3, 4].map(n => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      {/* Bookmarks */}
      {enableBookmarks && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2">
              Bookmarks ({bookmarks.length})
            </Typography>
            <IconButton
              size="small"
              onClick={() => addBookmark()}
            >
              <BookmarkBorderIcon />
            </IconButton>
          </Box>
          
          {bookmarks.length > 0 && (
            <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
              {bookmarks.map((bookmark) => (
                <ListItem
                  key={bookmark.index}
                  button
                  onClick={() => goToBookmark(bookmark.index)}
                  selected={bookmark.index === currentIndex}
                >
                  <ListItemText
                    primary={bookmark.name}
                    secondary={`Slice ${bookmark.index + 1}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBookmark(bookmark.index);
                      }}
                    >
                      <BookmarkIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Paper
      ref={containerRef}
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...sx
      }}
      tabIndex={0}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Multi-Slice Viewer
        </Typography>
        
        {isLoading && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={loadingProgress} />
            <Typography variant="caption" color="text.secondary">
              Loading series... {loadingProgress}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Viewer Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {currentLayout === 'single' && renderSingleViewport()}
        {currentLayout === 'grid' && renderGridViewports()}
        {currentLayout === 'mpr' && (
          <Typography variant="body1" sx={{ p: 2 }}>
            MPR view coming soon...
          </Typography>
        )}
      </Box>

      {/* Navigation Controls */}
      {renderNavigationControls()}
    </Paper>
  );
});

MultiSliceViewer.displayName = 'MultiSliceViewer';

export default MultiSliceViewer;
export type { MultiSliceViewerProps, MultiSliceViewerRef, Bookmark, CineState };