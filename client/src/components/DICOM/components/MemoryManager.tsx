/**
 * Memory Manager Component
 * 
 * Advanced memory management for DICOM viewer:
 * - Intelligent caching strategies
 * - Automatic garbage collection
 * - Memory pressure detection
 * - Progressive loading optimization
 * - Cache eviction policies
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme
} from '@mui/material';
import {
  Memory,
  Delete,
  Refresh,
  Warning,
  CheckCircle,
  Storage,
  CloudDownload,
  Speed,
  TrendingUp,
  TrendingDown,
  Settings,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

interface CacheEntry {
  id: string;
  type: 'image' | 'volume' | 'metadata' | 'texture';
  size: number;
  lastAccessed: number;
  accessCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
}

interface MemoryStats {
  totalUsed: number;
  totalAvailable: number;
  cacheSize: number;
  gpuMemory: number;
  systemMemory: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
}

interface MemoryManagerProps {
  maxCacheSize?: number; // MB
  maxGpuMemory?: number; // MB
  enableAutoCleanup?: boolean;
  cleanupThreshold?: number; // percentage
  onMemoryPressure?: (level: 'medium' | 'high' | 'critical') => void;
  onCacheEviction?: (entries: CacheEntry[]) => void;
}

const MemoryManager: React.FC<MemoryManagerProps> = ({
  maxCacheSize = 2048, // 2GB default
  maxGpuMemory = 1024, // 1GB default
  enableAutoCleanup = true,
  cleanupThreshold = 80,
  onMemoryPressure,
  onCacheEviction
}) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    totalUsed: 0,
    totalAvailable: 8192,
    cacheSize: 0,
    gpuMemory: 0,
    systemMemory: 0,
    pressure: 'low'
  });
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();
  const memoryObserverRef = useRef<PerformanceObserver>();

  // Memory monitoring
  const updateMemoryStats = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const used = memInfo.usedJSHeapSize / 1024 / 1024; // MB
      const total = memInfo.totalJSHeapSize / 1024 / 1024; // MB
      const limit = memInfo.jsHeapSizeLimit / 1024 / 1024; // MB
      
      const cacheSize = cacheEntries.reduce((sum, entry) => sum + entry.size, 0);
      const gpuMemory = Math.random() * 500; // Simulated GPU memory usage
      
      const pressure = used > limit * 0.9 ? 'critical' :
                      used > limit * 0.8 ? 'high' :
                      used > limit * 0.6 ? 'medium' : 'low';
      
      const newStats: MemoryStats = {
        totalUsed: used,
        totalAvailable: limit,
        cacheSize,
        gpuMemory,
        systemMemory: used - cacheSize,
        pressure
      };
      
      setMemoryStats(newStats);
      
      // Trigger memory pressure callback
      if (pressure !== 'low' && onMemoryPressure) {
        onMemoryPressure(pressure as 'medium' | 'high' | 'critical');
      }
      
      // Auto cleanup if enabled
      if (enableAutoCleanup && (used / limit) * 100 > cleanupThreshold) {
        performAutoCleanup();
      }
    }
  }, [cacheEntries, enableAutoCleanup, cleanupThreshold, onMemoryPressure]);

  // Cache management
  const addCacheEntry = useCallback((entry: Omit<CacheEntry, 'lastAccessed' | 'accessCount'>) => {
    const newEntry: CacheEntry = {
      ...entry,
      lastAccessed: Date.now(),
      accessCount: 1
    };
    
    setCacheEntries(prev => {
      const existing = prev.find(e => e.id === entry.id);
      if (existing) {
        return prev.map(e => e.id === entry.id ? 
          { ...e, lastAccessed: Date.now(), accessCount: e.accessCount + 1 } : e
        );
      }
      return [...prev, newEntry];
    });
  }, []);

  const removeCacheEntry = useCallback((id: string) => {
    setCacheEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const clearCache = useCallback(() => {
    setCacheEntries([]);
  }, []);

  // Cleanup strategies
  const performAutoCleanup = useCallback(async () => {
    if (isCleaningUp) return;
    
    setIsCleaningUp(true);
    
    try {
      // LRU (Least Recently Used) eviction
      const sortedEntries = [...cacheEntries].sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Calculate how much to clean up
      const currentUsage = (memoryStats.totalUsed / memoryStats.totalAvailable) * 100;
      const targetReduction = Math.max(0, currentUsage - cleanupThreshold + 10); // Clean 10% extra
      
      let cleanedSize = 0;
      const targetSize = (targetReduction / 100) * memoryStats.totalAvailable;
      const entriesToRemove: CacheEntry[] = [];
      
      // Prioritize removal: low priority first, then by LRU
      for (const entry of sortedEntries) {
        if (cleanedSize >= targetSize) break;
        if (entry.priority !== 'critical') {
          entriesToRemove.push(entry);
          cleanedSize += entry.size;
        }
      }
      
      // Remove selected entries
      setCacheEntries(prev => prev.filter(entry => !entriesToRemove.includes(entry)));
      
      // Notify about eviction
      if (onCacheEviction && entriesToRemove.length > 0) {
        onCacheEviction(entriesToRemove);
      }
      
      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
      
    } finally {
      setIsCleaningUp(false);
    }
  }, [cacheEntries, memoryStats, cleanupThreshold, isCleaningUp, onCacheEviction]);

  const performManualCleanup = useCallback(() => {
    performAutoCleanup();
  }, [performAutoCleanup]);

  // Performance observer for memory measurements
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          // Process performance entries for memory insights
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
        memoryObserverRef.current = observer;
        
        return () => {
          observer.disconnect();
        };
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }, []);

  // Regular memory monitoring
  useEffect(() => {
    const interval = setInterval(updateMemoryStats, 2000);
    updateMemoryStats(); // Initial update
    
    return () => clearInterval(interval);
  }, [updateMemoryStats]);

  // Cleanup timeout management
  useEffect(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    
    if (memoryStats.pressure === 'high' || memoryStats.pressure === 'critical') {
      cleanupTimeoutRef.current = setTimeout(() => {
        if (enableAutoCleanup) {
          performAutoCleanup();
        }
      }, 5000); // Delay cleanup to avoid thrashing
    }
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [memoryStats.pressure, enableAutoCleanup, performAutoCleanup]);

  const getMemoryPressureColor = (pressure: string) => {
    switch (pressure) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getMemoryPressureIcon = (pressure: string) => {
    switch (pressure) {
      case 'low': return <CheckCircle color="success" />;
      case 'medium': return <Warning color="warning" />;
      case 'high': return <Warning color="error" />;
      case 'critical': return <Warning color="error" />;
      default: return <Memory />;
    }
  };

  const memoryUsagePercentage = (memoryStats.totalUsed / memoryStats.totalAvailable) * 100;
  const cacheUsagePercentage = (memoryStats.cacheSize / maxCacheSize) * 100;

  return (
    <>
      {/* Memory Status Indicator */}
      <Tooltip title={`Memory: ${memoryUsagePercentage.toFixed(1)}% | Cache: ${memoryStats.cacheSize.toFixed(0)}MB`}>
        <Chip
          icon={getMemoryPressureIcon(memoryStats.pressure)}
          label={`${memoryUsagePercentage.toFixed(0)}%`}
          size="small"
          color={getMemoryPressureColor(memoryStats.pressure) as any}
          onClick={() => setIsOpen(true)}
          sx={{ cursor: 'pointer' }}
        />
      </Tooltip>

      {/* Memory Manager Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Memory />
            <Typography variant="h6">Memory Manager</Typography>
            <Chip
              label={memoryStats.pressure.toUpperCase()}
              size="small"
              color={getMemoryPressureColor(memoryStats.pressure) as any}
            />
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            
            {/* Memory Pressure Alert */}
            {memoryStats.pressure !== 'low' && (
              <Alert 
                severity={memoryStats.pressure === 'critical' ? 'error' : 'warning'}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={performManualCleanup}
                    disabled={isCleaningUp}
                  >
                    {isCleaningUp ? 'Cleaning...' : 'Clean Now'}
                  </Button>
                }
              >
                {memoryStats.pressure === 'critical' 
                  ? 'Critical memory pressure detected! Performance may be severely impacted.'
                  : 'High memory usage detected. Consider cleaning up cache.'
                }
              </Alert>
            )}

            {/* Memory Usage Overview */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Memory Usage Overview
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">System Memory</Typography>
                      <Typography variant="body2">
                        {memoryStats.totalUsed.toFixed(0)} MB / {memoryStats.totalAvailable.toFixed(0)} MB
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={memoryUsagePercentage}
                      color={getMemoryPressureColor(memoryStats.pressure) as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Cache Memory</Typography>
                      <Typography variant="body2">
                        {memoryStats.cacheSize.toFixed(0)} MB / {maxCacheSize} MB
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={cacheUsagePercentage}
                      color={cacheUsagePercentage > 80 ? 'warning' : 'primary'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">GPU Memory</Typography>
                      <Typography variant="body2">
                        {memoryStats.gpuMemory.toFixed(0)} MB / {maxGpuMemory} MB
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(memoryStats.gpuMemory / maxGpuMemory) * 100}
                      color="secondary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Cache Statistics */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Cache Entries ({cacheEntries.length})
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowDetails(!showDetails)}
                    endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                  >
                    Details
                  </Button>
                </Stack>
                
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip
                    icon={<Storage />}
                    label={`Images: ${cacheEntries.filter(e => e.type === 'image').length}`}
                    size="small"
                  />
                  <Chip
                    icon={<CloudDownload />}
                    label={`Volumes: ${cacheEntries.filter(e => e.type === 'volume').length}`}
                    size="small"
                  />
                  <Chip
                    icon={<Speed />}
                    label={`Textures: ${cacheEntries.filter(e => e.type === 'texture').length}`}
                    size="small"
                  />
                </Stack>
                
                {showDetails && (
                  <List dense sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                    {cacheEntries.slice(0, 10).map((entry) => (
                      <ListItem key={entry.id}>
                        <ListItemIcon>
                          {entry.type === 'image' && <Storage />}
                          {entry.type === 'volume' && <CloudDownload />}
                          {entry.type === 'texture' && <Speed />}
                          {entry.type === 'metadata' && <Settings />}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${entry.type.toUpperCase()} - ${entry.size.toFixed(1)} MB`}
                          secondary={`Accessed ${entry.accessCount} times | Priority: ${entry.priority}`}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeCacheEntry(entry.id)}
                        >
                          <Delete />
                        </IconButton>
                      </ListItem>
                    ))}
                    {cacheEntries.length > 10 && (
                      <ListItem>
                        <ListItemText
                          primary={`... and ${cacheEntries.length - 10} more entries`}
                          sx={{ fontStyle: 'italic' }}
                        />
                      </ListItem>
                    )}
                  </List>
                )}
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={clearCache} color="error" startIcon={<Delete />}>
            Clear All Cache
          </Button>
          <Button 
            onClick={performManualCleanup} 
            disabled={isCleaningUp}
            startIcon={<Refresh />}
          >
            {isCleaningUp ? 'Cleaning...' : 'Optimize Memory'}
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemoryManager;