/**
 * PerformanceMonitor - Isolated performance tracking and optimization
 * 
 * This component provides:
 * - Real-time performance monitoring
 * - Memory usage tracking
 * - Frame rate monitoring
 * - Automatic optimization suggestions
 * - Performance alerts and notifications
 */

import React, { useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha
} from '@mui/material';

// Icons
import {
  Speed,
  Memory,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  ExpandMore,
  ExpandLess,
  Tune
} from '@mui/icons-material';

// Types
import { 
  ViewerState, 
  PerformanceConfiguration,
  PerformanceMonitorProps 
} from '../types/ViewerTypes';

// Performance metrics interface
interface PerformanceMetrics {
  frameRate: number;
  averageFrameRate: number;
  memoryUsage: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  renderTime: number;
  averageRenderTime: number;
  gpuMemoryUsage?: number;
  cacheHitRate: number;
  networkLatency: number;
  qualityScore: number;
  optimizationScore: number;
  recommendations: string[];
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  frameRate: {
    excellent: 60,
    good: 45,
    acceptable: 30,
    poor: 15
  },
  renderTime: {
    excellent: 16, // 60fps
    good: 22,     // 45fps
    acceptable: 33, // 30fps
    poor: 66      // 15fps
  },
  memoryUsage: {
    low: 256,     // MB
    medium: 512,
    high: 1024,
    critical: 2048
  }
};

// Performance monitor implementation
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  state,
  onPerformanceUpdate,
  onMemoryPressure,
  configuration
}) => {
  const theme = useTheme();
  
  // State
  const [expanded, setExpanded] = React.useState(() => false);
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>(() => ({
    frameRate: 0,
    averageFrameRate: 0,
    memoryUsage: 0,
    memoryPressure: 'low',
    renderTime: 0,
    averageRenderTime: 0,
    cacheHitRate: 0,
    networkLatency: 0,
    qualityScore: 100,
    optimizationScore: 100,
    recommendations: []
  }));
  
  // Refs for tracking
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const renderTimesRef = useRef<number[]>([]);
  const memoryHistoryRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number>();
  
  // Performance observer
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  
  // Memory monitoring
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = memory.totalJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
      
      // Update memory history
      memoryHistoryRef.current.push(usedMB);
      if (memoryHistoryRef.current.length > 100) {
        memoryHistoryRef.current.shift();
      }
      
      // Determine memory pressure
      let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (usedMB > PERFORMANCE_THRESHOLDS.memoryUsage.critical) {
        pressure = 'critical';
      } else if (usedMB > PERFORMANCE_THRESHOLDS.memoryUsage.high) {
        pressure = 'high';
      } else if (usedMB > PERFORMANCE_THRESHOLDS.memoryUsage.medium) {
        pressure = 'medium';
      }
      
      return {
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        pressure,
        trend: memoryHistoryRef.current.length > 1 
          ? usedMB - memoryHistoryRef.current[memoryHistoryRef.current.length - 2]
          : 0
      };
    }
    
    return {
      used: state.memoryUsage || 0,
      total: 0,
      limit: 0,
      pressure: 'low' as const,
      trend: 0
    };
  }, [state.memoryUsage]);
  
  // Frame rate monitoring
  const monitorFrameRate = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      frameTimesRef.current.push(currentFPS);
      
      // Keep only last 60 frames for average calculation
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
      
      const averageFPS = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      
      lastFrameTimeRef.current = now;
      frameCountRef.current++;
      
      return {
        current: currentFPS,
        average: averageFPS
      };
    }
    
    return {
      current: 0,
      average: 0
    };
  }, []);
  
  // Render time monitoring
  const monitorRenderTime = useCallback(() => {
    const renderTime = state.processingTime || 0;
    
    if (renderTime > 0) {
      renderTimesRef.current.push(renderTime);
      
      // Keep only last 30 render times
      if (renderTimesRef.current.length > 30) {
        renderTimesRef.current.shift();
      }
      
      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      
      return {
        current: renderTime,
        average: averageRenderTime
      };
    }
    
    return {
      current: 0,
      average: 0
    };
  }, [state.processingTime]);
  
  // Generate performance recommendations
  const generateRecommendations = useCallback((currentMetrics: PerformanceMetrics): string[] => {
    const recommendations: string[] = [];
    
    // Frame rate recommendations
    if (currentMetrics.frameRate < PERFORMANCE_THRESHOLDS.frameRate.acceptable) {
      recommendations.push('Consider reducing image quality or enabling GPU acceleration');
    }
    
    // Memory recommendations
    if (currentMetrics.memoryPressure === 'high' || currentMetrics.memoryPressure === 'critical') {
      recommendations.push('High memory usage detected. Consider closing other applications');
    }
    
    // Render time recommendations
    if (currentMetrics.renderTime > PERFORMANCE_THRESHOLDS.renderTime.acceptable) {
      recommendations.push('Slow rendering detected. Try enabling WebGL or reducing viewport size');
    }
    
    // Cache recommendations
    if (currentMetrics.cacheHitRate < 0.8) {
      recommendations.push('Low cache hit rate. Consider enabling intelligent caching');
    }
    
    // Network recommendations
    if (currentMetrics.networkLatency > 1000) {
      recommendations.push('High network latency. Consider enabling progressive loading');
    }
    
    return recommendations;
  }, []);
  
  // Calculate quality score
  const calculateQualityScore = useCallback((currentMetrics: PerformanceMetrics): number => {
    if (!configuration) {
      return 50; // Default score when configuration is not available
    }
    
    let score = 100;
    
    // Frame rate impact (40% weight)
    const targetFrameRate = configuration.targetFrameRate || 60;
    const fpsRatio = Math.min(currentMetrics.frameRate / targetFrameRate, 1);
    score -= (1 - fpsRatio) * 40;
    
    // Memory impact (30% weight)
    const maxMemoryUsage = configuration.maxMemoryUsage || 1024;
    const memoryRatio = Math.min(currentMetrics.memoryUsage / maxMemoryUsage, 1);
    score -= memoryRatio * 30;
    
    // Render time impact (30% weight)
    const renderTimeRatio = Math.min(currentMetrics.renderTime / PERFORMANCE_THRESHOLDS.renderTime.acceptable, 1);
    score -= renderTimeRatio * 30;
    
    return Math.max(0, Math.round(score));
  }, [configuration]);
  
  // Update metrics
  const updateMetrics = useCallback(() => {
    const memory = monitorMemory();
    const frameRate = monitorFrameRate();
    const renderTime = monitorRenderTime();
    
    const newMetrics: PerformanceMetrics = {
      frameRate: frameRate.current,
      averageFrameRate: frameRate.average,
      memoryUsage: memory.used,
      memoryPressure: memory.pressure,
      renderTime: renderTime.current,
      averageRenderTime: renderTime.average,
      cacheHitRate: state.cacheHit ? 1 : 0,
      networkLatency: 0, // Would be provided by network service
      qualityScore: 0, // Will be calculated
      optimizationScore: 0, // Will be calculated
      recommendations: []
    };
    
    // Calculate scores
    newMetrics.qualityScore = calculateQualityScore(newMetrics);
    newMetrics.optimizationScore = Math.min(100, newMetrics.qualityScore + (newMetrics.cacheHitRate * 20));
    
    // Generate recommendations
    newMetrics.recommendations = generateRecommendations(newMetrics);
    
    startTransition(() => {
      setMetrics(newMetrics);
    });
    
    // Notify parent components
    onPerformanceUpdate(newMetrics);
    
    // Check for memory pressure changes
    if (memory.pressure !== metrics.memoryPressure) {
      onMemoryPressure(memory.pressure);
    }
    
    // Schedule next update
    animationFrameRef.current = requestAnimationFrame(updateMetrics);
  }, [
    monitorMemory,
    monitorFrameRate,
    monitorRenderTime,
    calculateQualityScore,
    generateRecommendations,
    onPerformanceUpdate,
    onMemoryPressure,
    state.cacheHit,
    metrics.memoryPressure
  ]);
  
  // Initialize performance monitoring
  useEffect(() => {
    // Start monitoring loop
    animationFrameRef.current = requestAnimationFrame(updateMetrics);
    
    // Initialize Performance Observer if available
    if ('PerformanceObserver' in window) {
      try {
        performanceObserverRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              // Handle custom performance measures
              console.log('Performance measure:', entry.name, entry.duration);
            }
          });
        });
        
        performanceObserverRef.current.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, [updateMetrics]);
  
  // Get performance status color
  const getStatusColor = useCallback((value: number, thresholds: any) => {
    if (value >= thresholds.excellent) return theme.palette.success.main;
    if (value >= thresholds.good) return theme.palette.info.main;
    if (value >= thresholds.acceptable) return theme.palette.warning.main;
    return theme.palette.error.main;
  }, [theme]);
  
  // Get memory pressure color
  const getMemoryPressureColor = useCallback((pressure: string) => {
    switch (pressure) {
      case 'low': return theme.palette.success.main;
      case 'medium': return theme.palette.info.main;
      case 'high': return theme.palette.warning.main;
      case 'critical': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  }, [theme]);
  
  // Render performance indicator
  const renderPerformanceIndicator = useCallback(() => {
    const qualityColor = getStatusColor(metrics.qualityScore, { excellent: 90, good: 75, acceptable: 60, poor: 0 });
    
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          zIndex: 1300,
          minWidth: expanded ? 320 : 'auto'
        }}
      >
        <Card
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: expanded ? 1 : 0 }}>
              <Speed sx={{ fontSize: 16, color: qualityColor }} />
              <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                Performance
              </Typography>
              <Chip
                label={`${metrics.qualityScore}%`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  backgroundColor: alpha(qualityColor, 0.1),
                  color: qualityColor,
                  border: `1px solid ${alpha(qualityColor, 0.3)}`
                }}
              />
              <IconButton
                size="small"
                onClick={() => startTransition(() => setExpanded(!expanded))}
                sx={{ p: 0.5 }}
              >
                {expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </IconButton>
            </Stack>
            
            {/* Expanded Details */}
            <Collapse in={expanded}>
              <Stack spacing={1}>
                {/* Frame Rate */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <TrendingUp sx={{ fontSize: 14, color: getStatusColor(metrics.frameRate, PERFORMANCE_THRESHOLDS.frameRate) }} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      Frame Rate
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {metrics.frameRate.toFixed(1)} fps
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((metrics.frameRate / configuration.targetFrameRate) * 100, 100)}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.grey[500], 0.2),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getStatusColor(metrics.frameRate, PERFORMANCE_THRESHOLDS.frameRate),
                        borderRadius: 2
                      }
                    }}
                  />
                </Box>
                
                {/* Memory Usage */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Memory sx={{ fontSize: 14, color: getMemoryPressureColor(metrics.memoryPressure) }} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      Memory
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {metrics.memoryUsage.toFixed(0)} MB
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((metrics.memoryUsage / configuration.maxMemoryUsage) * 100, 100)}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.grey[500], 0.2),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getMemoryPressureColor(metrics.memoryPressure),
                        borderRadius: 2
                      }
                    }}
                  />
                </Box>
                
                {/* Render Time */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Tune sx={{ fontSize: 14, color: getStatusColor(PERFORMANCE_THRESHOLDS.renderTime.excellent / Math.max(metrics.renderTime, 1), { excellent: 1, good: 0.8, acceptable: 0.6, poor: 0 }) }} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      Render Time
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {metrics.renderTime.toFixed(1)} ms
                    </Typography>
                  </Stack>
                </Box>
                
                {/* Recommendations */}
                {metrics.recommendations.length > 0 && (
                  <Box sx={{ mt: 1, p: 1, backgroundColor: alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Warning sx={{ fontSize: 14, color: theme.palette.warning.main, mt: 0.25 }} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                          Optimization Tips
                        </Typography>
                        {metrics.recommendations.slice(0, 2).map((rec, index) => (
                          <Typography key={index} variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                            • {rec}
                          </Typography>
                        ))}
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Collapse>
          </CardContent>
        </Card>
      </Box>
    );
  }, [
    expanded,
    metrics,
    theme,
    configuration,
    getStatusColor,
    getMemoryPressureColor
  ]);
  
  return renderPerformanceIndicator();
};

export default PerformanceMonitor;