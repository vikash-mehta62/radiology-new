/*
 * Enhanced Unified DICOM Viewer with Apple HIG principles and radiologist workflow optimization
 * Changes: Apple-style UI, enhanced accessibility, keyboard shortcuts, dark-mode optimization
 * Backward compatibility: All existing props and functionality preserved
 * TODO: Consider adding voice commands for hands-free operation
 * Smoke test: Open DICOM viewer -> use keyboard shortcuts (Space, Arrow keys) -> verify dark mode -> test accessibility
 */

// Enhanced Unified DICOM Viewer with WebGL rendering and performance optimizations
// This component provides a comprehensive DICOM viewing experience with:
// - Apple HIG-inspired interface design with medical imaging optimizations
// - WebGL-accelerated rendering with Canvas 2D fallback
// - Progressive loading for large datasets
// - Intelligent caching system
// - Performance monitoring and optimization
// - Adaptive quality based on network conditions
// - Batch loading for smooth navigation
// - Advanced viewport controls (zoom, pan, windowing)
// - Multi-touch support for mobile devices
// - Enhanced accessibility features with ARIA support
// - Real-time performance metrics
// - Memory usage optimization
// - Network-aware loading strategies
// - Radiologist-optimized keyboard shortcuts and quick actions

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Button,
  Alert, useMediaQuery, useTheme,
  CircularProgress, Snackbar, Chip, Badge, Stack,
  IconButton, Slider, FormControlLabel, Switch, Tooltip,
  Grid, Card, CardContent, Divider, ButtonGroup,
  LinearProgress, Select, MenuItem, FormControl,
  InputLabel, Accordion, AccordionSummary, AccordionDetails,
  Drawer
} from '@mui/material';
import {
  ZoomIn, ZoomOut, RotateLeft, RotateRight, RestartAlt,
  SkipNext, SkipPrevious, Speed, Cached, HighQuality,
  PlayArrow, Pause, Brightness6, Contrast, Settings,
  Fullscreen, FullscreenExit, Download, Info, Warning, Error as ErrorIcon,
  AutoAwesome, Psychology, Visibility, ExpandMore, Tune, SmartToy, Analytics,
  BrightnessMedium, FilterVintage, Healing, TextFields, Brush,
  Close as CloseIcon
} from '@mui/icons-material';

import type { Study } from '../../types';
import DicomOverlay from './components/DicomOverlay';
import DicomToolbar from './components/DicomToolbar';
import AnnotationTools, { Annotation as ToolsAnnotation } from './AnnotationTools';
import { AdvancedAnnotationPanel } from './AdvancedAnnotationPanel';
import { Navigation3DControls, Navigation3DState } from './Navigation3DControls';
import { AIEnhancementPanel } from './AIEnhancementPanel';
import { AutoMeasurementCADOverlay } from './AutoMeasurementCADOverlay';
import { TextAnnotationDrawingOverlay } from './TextAnnotationDrawingOverlay';
import MPRViewer from './MPRViewer';
import { lazyDicomService } from '../../services/dicomServiceLazy';
import { ProgressiveLoadingSystem } from '../../services/progressiveLoadingSystem';
import { IntelligentCacheManager } from '../../services/intelligentCacheManager';
import { PerformanceMonitor } from '../../services/performanceMonitor';
// Import AI enhancement services
import { AIEnhancementModule, AIProcessingOptions, AIProcessingResult, DetectionResult } from '../../services/aiEnhancementModule';
import { ImageEnhancementAlgorithms, EnhancementOptions, ContrastEnhancementOptions } from '../../services/imageEnhancementAlgorithms';
import { AbnormalityDetectionService } from '../../services/abnormalityDetectionService';
import { 
  Annotation, 
  AnnotationLayer, 
  AnnotationGroup, 
  AnnotationTemplate,
  AnnotationSystem 
} from '../../services/annotationSystem';
import { useImageProcessingWorker } from '../../hooks/useImageProcessingWorker';
import { PredictiveCacheService } from '../../services/predictiveCacheService';
import { LODRenderingService } from '../../services/lodRenderingService';
import { MemoryManager } from '../../services/memoryManager';
import { ShaderOptimizer } from '../../services/shaderOptimizer';
import { PerformanceTester } from '../../utils/performanceTester';
import { MemoryMonitor } from '../../utils/memoryMonitor';
import { LODControlPanel } from './LODControlPanel';

// Enhanced props interface with performance optimization options
interface UnifiedDicomViewerProps {
  study: Study;
  onError?: (error: string) => void;
  userRole?: 'radiologist' | 'technician' | 'referring_physician' | 'student';
  viewerMode?: 'diagnostic' | 'review' | 'comparison' | 'teaching';
  enableAdvancedTools?: boolean;
  enableCollaboration?: boolean;
  enableAI?: boolean;
  aiSettings?: {
    enableEnhancement: boolean;
    enableDetection: boolean;
    confidenceThreshold: number;
    autoProcess: boolean;
  };
  // Performance optimization props
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;
  enableCaching?: boolean;
  adaptiveQuality?: boolean;
  onAIResults?: (results: DetectionResult[]) => void;
}

interface ViewerState {
  // Core state
  isLoading: boolean;
  error: string | null;
  
  // Study metadata
  studyType: 'single-frame' | 'multi-frame' | 'volume' | 'series';
  modality: string;
  totalFrames: number;
  currentFrame: number;
  
  // Image data management
  imageData: string[]; // Store all slice image data
  loadedImages: HTMLImageElement[]; // Store loaded image objects
  loadedBatches: Set<number>; // Track which batches are loaded
  batchSize: number; // Number of slices per batch
  isLoadingBatch: boolean; // Track if currently loading a batch
  thumbnailData: string | null; // Quick preview
  currentQuality: number; // Current image quality (0-100)
  targetQuality: number; // Target quality for progressive loading
  
  // Viewport state
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  windowWidth: number;
  windowCenter: number;
  invert: boolean;
  
  // UI state
  sidebarOpen: boolean;
  toolbarExpanded: boolean;
  fullscreen: boolean;
  
  // Tools and annotations
  activeTool: string | null;
  measurements: any[];
  
  // Performance metrics
  renderingMode: 'software' | 'webgl' | 'gpu';
  qualityLevel: 'low' | 'medium' | 'high' | 'diagnostic';
  cacheHit: boolean;
  processingTime: number;
  networkProfile: string;
  memoryUsage: number;
  
  // Annotation state
  annotations: Annotation[];
  annotationLayers: AnnotationLayer[];
  annotationGroups: AnnotationGroup[];
  annotationTemplates: AnnotationTemplate[];
  activeAnnotationLayer: string;
  activeAnnotationGroup?: string;
  annotationMode: boolean;
  selectedAnnotationTool?: string;

  // 3D Navigation state
  navigation3D: Navigation3DState;
  
  // LOD control panel state
  lodPanelVisible: boolean;
  
  // Zoom level for LOD calculations
  zoomLevel: number;
  
  // AI Enhancement state
  aiEnhancementEnabled: boolean;
  enhancedImageData: ImageData | Float32Array | null;
  aiDetectionResults: DetectionResult[];
  aiProcessing: boolean;

  // Text annotation and drawing state
  textAnnotationMode: 'text' | 'drawing' | null;
  textAnnotationsEnabled: boolean;

  // MPR (Multi-Planar Reconstruction) state
  mprMode: boolean;
  mprViewerMode: 'single' | 'multi-plane';
  volumeData: any | null; // Will store volume data for MPR reconstruction
  crosshairPosition: { x: number; y: number; z: number };
  crosshairEnabled: boolean;
}

// Performance notification interface
interface PerformanceNotification {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const UnifiedDicomViewer: React.FC<UnifiedDicomViewerProps> = ({
  study,
  onError,
  userRole = 'radiologist',
  viewerMode = 'diagnostic',
  enableAdvancedTools = true,
  enableCollaboration = false,
  enableAI = false,
  aiSettings = {
    enableEnhancement: true,
    enableDetection: true,
    confidenceThreshold: 0.7,
    autoProcess: false
  },
  enableWebGL = true,
  enableProgressiveLoading = true,
  enableCaching = true,
  adaptiveQuality = true,
  onAIResults
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Refs for DOM elements and services
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const webglContextRef = useRef<WebGLRenderingContext | null>(null);
  
  // Service refs for performance optimization
  const progressiveLoaderRef = useRef<ProgressiveLoadingSystem | null>(null);
  const cacheManagerRef = useRef<IntelligentCacheManager | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const aiModuleRef = useRef<AIEnhancementModule | null>(null);
  const abnormalityDetectionRef = useRef<AbnormalityDetectionService | null>(null);
  const annotationSystemRef = useRef<AnnotationSystem | null>(null);
  const predictiveCacheRef = useRef<PredictiveCacheService | null>(null);
  const lodRenderingRef = useRef<LODRenderingService | null>(null);
  const memoryManagerRef = useRef<MemoryManager | null>(null);
  const shaderOptimizerRef = useRef<ShaderOptimizer | null>(null);
  const performanceTesterRef = useRef<PerformanceTester | null>(null);
  const memoryMonitorRef = useRef<MemoryMonitor | null>(null);
  const [state, setState] = useState<ViewerState>({
    isLoading: true,
    error: null,
    studyType: 'single-frame', // Will be updated based on actual DICOM data
    modality: study.modality || 'CT',
    totalFrames: 1, // Will be updated from DICOM metadata
    currentFrame: 0,
    imageData: [], // Store all slice image data
    loadedImages: [], // Store loaded image objects
    loadedBatches: new Set<number>(), // Track loaded batches
    batchSize: 10, // Load 10 slices at a time
    isLoadingBatch: false,
    thumbnailData: null,
    currentQuality: 50,
    targetQuality: 100,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    windowWidth: 3557, // Use proper DICOM windowing values
    windowCenter: 40,
    invert: false,
    sidebarOpen: !isMobile,
    toolbarExpanded: false,
    fullscreen: false,
    activeTool: null,
    measurements: [],
    renderingMode: enableWebGL ? 'webgl' : 'software',
    qualityLevel: 'diagnostic',
    cacheHit: false,
    processingTime: 0,
    networkProfile: 'unknown',
    memoryUsage: 0,
    
    // LOD control panel state
    lodPanelVisible: false,
    
    // Zoom level for LOD calculations
    zoomLevel: 1.0,
    
    // Annotation state
    annotations: [] as Annotation[],
    annotationLayers: [
      {
        id: 'default-layer',
        name: 'Default Layer',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        color: '#ff4757',
        category: 'findings',
        annotations: []
      }
    ],
    annotationGroups: [],
    annotationTemplates: [
      {
        id: 'finding-template',
        name: 'Finding',
        description: 'Mark a clinical finding',
        type: 'text',
        category: 'general',
        clinicalContext: 'Highlight specific anatomical structures or pathological findings',
        defaultStyle: {
          color: '#ff4757',
          lineWidth: 2,
          fontSize: 14,
          opacity: 1,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal'
        },
        defaultText: 'Clinical finding'
      },
      {
        id: 'measurement-template',
        name: 'Measurement',
        description: 'Add measurement annotation',
        type: 'ruler',
        category: 'general',
        clinicalContext: 'Measure distances, areas, and angles for diagnostic purposes',
        defaultStyle: {
          color: '#2ed573',
          lineWidth: 2,
          fontSize: 12,
          opacity: 1,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal'
        }
      }
    ],
    activeAnnotationLayer: 'default-layer',
    activeAnnotationGroup: undefined,
    annotationMode: false,
    selectedAnnotationTool: undefined,

    // 3D Navigation state
    navigation3D: {
      pitch: 0,
      yaw: 0,
      roll: 0,
      opacity: 1,
      volumeOpacity: 0.8,
      surfaceOpacity: 1,
      axialSlice: 0,
      sagittalSlice: 0,
      coronalSlice: 0,
      clipNear: 0,
      clipFar: 100,
      renderingMode: '3d',
      isAnimating: false,
      animationSpeed: 1,
      currentPreset: 'anterior'
    },

    // AI Enhancement state
    aiEnhancementEnabled: enableAI,
    enhancedImageData: null,
    aiDetectionResults: [],
    aiProcessing: false,

    // Text Annotation and Drawing state
    textAnnotationMode: null,
    textAnnotationsEnabled: enableAdvancedTools,

    // MPR (Multi-Planar Reconstruction) state
    mprMode: false,
    mprViewerMode: 'multi-plane',
    volumeData: null,
    crosshairPosition: { x: 256, y: 256, z: 0 }, // Default center position
    crosshairEnabled: true
  });

  // Performance notification state
  const [performanceNotification, setPerformanceNotification] = useState<PerformanceNotification>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Volume data generation for MPR
  const generateVolumeData = useCallback(async () => {
    if (!state.imageData || state.imageData.length < 2) {
      console.warn('Insufficient image data for volume generation');
      return null;
    }

    try {
      console.log('🔄 Generating volume data from image series...');
      
      // Create volume data structure from loaded images
      const firstImageElement = state.loadedImages[0];
      if (!firstImageElement) return null;

      const dimensions = {
        width: firstImageElement.naturalWidth || 512,
        height: firstImageElement.naturalHeight || 512,
        depth: state.imageData.length
      };

      // For now, create a simplified volume data structure
      // In a full implementation, this would extract actual pixel data from DICOM
      const volumeData = {
        dimensions,
        spacing: { x: 1.0, y: 1.0, z: 1.0 }, // Default spacing
        data: new Uint16Array(dimensions.width * dimensions.height * dimensions.depth),
        dataType: 'uint16' as const,
        minValue: 0,
        maxValue: 65535,
        imageIds: state.imageData.slice(0, dimensions.depth)
      };

      console.log('✅ Volume data generated:', volumeData.dimensions);
      return volumeData;
    } catch (error) {
      console.error('Failed to generate volume data:', error);
      return null;
    }
  }, [state.imageData, state.loadedImages]);

  // Initialize Web Worker for image processing
  const {
    isInitialized: workerInitialized,
    stats: workerStats,
    processWindowing,
    processImageEnhancement,
    calculateHistogram,
    compressImage,
    reduceNoise,
    detectEdges,
    processVolumeData,
    clearQueue: clearWorkerQueue
  } = useImageProcessingWorker();

  // Initialize performance services
  useEffect(() => {
    if (enableProgressiveLoading && !progressiveLoaderRef.current) {
      progressiveLoaderRef.current = new ProgressiveLoadingSystem({
        enableAdaptiveBandwidth: adaptiveQuality,
        enablePredictiveLoading: true,
        maxCacheSize: 200
      });
    }

    // Initialize shader optimizer
    if (!shaderOptimizerRef.current && webglContextRef.current) {
      shaderOptimizerRef.current = new ShaderOptimizer(webglContextRef.current as WebGL2RenderingContext, {
        enableTextureCompression: true,
        enableShaderCache: true,
        optimizationLevel: 'high',
        maxTextureSize: 4096,
        enableMipmaps: true
      });
      console.log('🎨 [UnifiedViewer] Shader optimizer initialized with advanced features');
    }

    // Initialize performance tester
    if (!performanceTesterRef.current) {
      performanceTesterRef.current = new PerformanceTester();
      console.log('🧪 [UnifiedViewer] Performance tester initialized');
    }

    // Initialize memory monitor
    if (!memoryMonitorRef.current) {
      memoryMonitorRef.current = new MemoryMonitor(memoryManagerRef.current, shaderOptimizerRef.current);
      memoryMonitorRef.current.startMonitoring(2000); // Monitor every 2 seconds
      console.log('🧠 [UnifiedViewer] Memory monitor initialized and started');
    }

    if (enableCaching && !cacheManagerRef.current) {
      cacheManagerRef.current = new IntelligentCacheManager({
        maxMemoryUsage: 500 * 1024 * 1024, // 500MB
        compressionEnabled: true,
        prefetchStrategy: 'adaptive'
      });
    }

    if (!performanceMonitorRef.current) {
      performanceMonitorRef.current = PerformanceMonitor.getInstance();
    }

    // Initialize annotation system
    if (!annotationSystemRef.current) {
      annotationSystemRef.current = new AnnotationSystem();
    }

    // Initialize AI enhancement module
    if (enableAI && !aiModuleRef.current) {
      aiModuleRef.current = new AIEnhancementModule();
    }

    // Initialize abnormality detection service
    if (enableAI && aiSettings.enableDetection && !abnormalityDetectionRef.current) {
      abnormalityDetectionRef.current = new AbnormalityDetectionService({
        confidenceThreshold: aiSettings.confidenceThreshold,
        enableRealTimeDetection: true
      });
    }

    // Initialize predictive cache service
    if (enableCaching && !predictiveCacheRef.current) {
      predictiveCacheRef.current = new PredictiveCacheService({
        maxCacheSize: 300 * 1024 * 1024, // 300MB for predictive cache
        maxItems: 500,
        predictionWindow: 5,
        confidenceThreshold: 0.3,
        learningRate: 0.1
      });
    }

    // Initialize LOD rendering service
    if (adaptiveQuality && !lodRenderingRef.current) {
      lodRenderingRef.current = new LODRenderingService({
        enableAdaptiveLOD: true,
        targetFrameRate: 60,
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB memory limit
        qualityThresholds: {
          excellent: 0.9,
          good: 0.7,
          acceptable: 0.5,
          poor: 0.3
        },
        zoomThresholds: {
          overview: 0.5,
          normal: 2.0,
          detail: 5.0,
          microscopic: 10.0
        }
      });
    }

    // Initialize memory manager
    if (!memoryManagerRef.current) {
      memoryManagerRef.current = new MemoryManager({
        maxTexturePoolSize: 100,
        maxTextureMemory: 256 * 1024 * 1024, // 256MB for textures
        gcThreshold: 0.8,
        criticalThreshold: 0.95,
        cleanupInterval: 30000,
        enableTexturePool: true,
        enableMemoryPressureMonitoring: true,
        enableGCHints: true
      });

      // Initialize texture pool when WebGL context is available
      if (webglContextRef.current) {
        memoryManagerRef.current.initializeTexturePool(webglContextRef.current as WebGL2RenderingContext);
      }

      // Set up memory pressure monitoring
      memoryManagerRef.current.onMemoryPressure((pressure) => {
        console.log(`🧠 [UnifiedViewer] Memory pressure: ${pressure}`);
        
        if (pressure === 'high' || pressure === 'critical') {
          // Trigger cache cleanup
          cacheManagerRef.current?.cleanup();
          
          // Force LOD to lower quality
          if (lodRenderingRef.current && pressure === 'critical') {
            setState(prev => ({ ...prev, currentQuality: 25 })); // Set to low quality (25%)
          }
          
          // Show performance notification
          setPerformanceNotification({
            open: true,
            message: pressure === 'critical' 
              ? 'Critical memory usage detected. Reducing quality to maintain performance.'
              : 'High memory usage detected. Optimizing performance.',
            severity: pressure === 'critical' ? 'error' : 'warning'
          });
        }
      });
    }

    return () => {
      // Cleanup services
      progressiveLoaderRef.current?.dispose();
      cacheManagerRef.current?.cleanup();
      performanceMonitorRef.current?.stopMonitoring();
      predictiveCacheRef.current?.dispose();
      lodRenderingRef.current?.dispose();
      memoryManagerRef.current?.dispose();
      shaderOptimizerRef.current?.dispose();
      memoryMonitorRef.current?.stopMonitoring();
    };
  }, [enableWebGL, enableProgressiveLoading, enableCaching, adaptiveQuality]);

  // Monitor performance and update state
  useEffect(() => {
    if (performanceMonitorRef.current) {
      const metricsCallback = (metrics: any) => {
        setState(prev => ({
          ...prev,
          processingTime: metrics.renderTime,
          memoryUsage: metrics.memoryUsage,
          networkProfile: metrics.networkSpeed ? `${metrics.networkSpeed}Mbps` : 'Unknown'
        }));
      };

      performanceMonitorRef.current.onMetricsUpdate(metricsCallback);

      return () => {
        performanceMonitorRef.current?.removeMetricsObserver(metricsCallback);
      };
    }
  }, []);
  
  // Calculate optimal batch size based on dataset characteristics
  const calculateOptimalBatchSize = useCallback((imageCount: number): number => {
    // For small datasets (≤10 slices), load all at once
    if (imageCount <= 10) return imageCount;
    
    // For medium datasets (11-50 slices), use moderate batching
    if (imageCount <= 50) return Math.min(10, Math.ceil(imageCount / 3));
    
    // For large datasets (51-100 slices), optimize for memory and performance
    if (imageCount <= 100) return Math.min(15, Math.ceil(imageCount / 5));
    
    // For very large datasets (>100 slices), use aggressive batching
    return Math.min(20, Math.ceil(imageCount / 8));
  }, []);

  // Determine study type and optimal rendering strategy
  const studyAnalysis = useMemo(() => {
    const imageCount = study.study_statistics?.instance_count || 1;
    const modality = study.modality || 'CT';
    
    let studyType: ViewerState['studyType'] = 'single-frame';
    if (imageCount > 100) {
      studyType = 'volume';
    } else if (imageCount > 1) {
      studyType = 'multi-frame';
    }
    
    // Determine recommended tools based on modality and user role
    const recommendedTools = [];
    if (modality === 'CT' || modality === 'MR') {
      recommendedTools.push('windowing', 'measurement', 'zoom');
    }
    if (userRole === 'radiologist') {
      recommendedTools.push('annotation', 'comparison', 'ai-analysis');
    }
    
    // Determine optimal rendering strategy
    let renderingStrategy: ViewerState['renderingMode'] = 'software';
    if (enableWebGL && imageCount > 10) {
      renderingStrategy = 'webgl';
    }
    if (imageCount > 500) {
      renderingStrategy = 'gpu'; // For very large datasets
    }
    
    return {
      studyType,
      imageCount,
      modality,
      recommendedTools,
      renderingStrategy,
      batchSize: calculateOptimalBatchSize(imageCount)
    };
  }, [study, userRole, calculateOptimalBatchSize]);

  // Initialize viewer when study changes
  useEffect(() => {
    initializeViewer();
  }, [study]);

  // Auto-display first frame when images are loaded
  useEffect(() => {
    if (state.imageData.length > 0 && !state.isLoading) {
      displaySlice(state.currentFrame);
    }
  }, [state.currentFrame, state.isLoading]);

  const initializeViewer = useCallback(async () => {
    console.log('🚀 [UnifiedViewer] Initializing viewer for study:', study.id);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      studyType: studyAnalysis.studyType,
      modality: studyAnalysis.modality,
      batchSize: studyAnalysis.batchSize,
      renderingMode: studyAnalysis.renderingStrategy
    }));

    try {
      // Initialize WebGL context if enabled
      if (enableWebGL && canvasRef.current) {
        const gl = canvasRef.current.getContext('webgl') || canvasRef.current.getContext('experimental-webgl');
        if (gl) {
          webglContextRef.current = gl as WebGLRenderingContext;
          console.log('✅ [UnifiedViewer] WebGL context initialized');
          
          // Initialize texture pool with WebGL context
          if (memoryManagerRef.current) {
            memoryManagerRef.current.initializeTexturePool(gl as WebGL2RenderingContext);
            console.log('🎯 [UnifiedViewer] Texture pool initialized with WebGL context');
          }
        } else {
          console.warn('⚠️ [UnifiedViewer] WebGL not supported, falling back to Canvas 2D');
          setState(prev => ({ ...prev, renderingMode: 'software' }));
        }
      }

      // Load initial batch of images and set up proper frame count
      await loadBatch(0);
      
      // For multi-frame studies, ensure we load enough batches to show all frames
      if (studyAnalysis.imageCount > state.batchSize) {
        console.log(`🔄 [UnifiedViewer] Multi-frame study detected: ${studyAnalysis.imageCount} frames, loading additional batches`);
        
        // Load the first few batches to ensure smooth navigation
        const initialBatchesToLoad = Math.min(3, Math.ceil(studyAnalysis.imageCount / state.batchSize));
        for (let i = 1; i < initialBatchesToLoad; i++) {
          setTimeout(() => loadBatch(i), i * 200); // Stagger loading to avoid overwhelming
        }
      }
      
      // Don't override totalFrames if it was already updated by dynamic slice detection
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        // Only update totalFrames if it hasn't been updated by dynamic detection
        ...(prev.totalFrames === 1 ? { totalFrames: studyAnalysis.imageCount } : {})
      }));

      console.log('✅ [UnifiedViewer] Viewer initialized successfully');
      
    } catch (error) {
      console.error('❌ [UnifiedViewer] Failed to initialize viewer:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize viewer'
      }));
      onError?.(error instanceof Error ? error.message : 'Failed to initialize viewer');
    }
  }, [study, studyAnalysis]);

  const loadImagesFromData = async (imageDataArray: string[]) => {
    console.log('📥 [UnifiedViewer] Loading images from data array, count:', imageDataArray.length);
    
    try {
      // Process images in batches to avoid overwhelming the browser
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < imageDataArray.length; i += batchSize) {
        batches.push(imageDataArray.slice(i, i + batchSize));
      }

      console.log(`📦 [UnifiedViewer] Processing ${batches.length} batches of ${batchSize} images each`);

      // Process batches sequentially to manage memory
      const allResults = [];
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [UnifiedViewer] Processing batch ${batchIndex + 1}/${batches.length}`);
        
        const batchPromises = batch.map(async (imageData, index) => {
          const globalIndex = batchIndex * batchSize + index;
          
          try {
            // Handle different image data formats
            let processedData = imageData;
            if (!imageData.startsWith('data:')) {
              processedData = `data:image/png;base64,${imageData}`;
            }
            
            return {
              index: globalIndex,
              data: processedData,
              success: true
            };
          } catch (error) {
            console.error(`❌ [UnifiedViewer] Failed to process image ${globalIndex}:`, error);
            return {
              index: globalIndex,
              data: null,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
        
        // Memory management for large datasets
        if (imageDataArray.length > 50) {
          // Clear processed batch data to free memory
          batch.length = 0;
          
          // Force garbage collection hint for large datasets
          if (batchIndex % 3 === 0 && typeof window !== 'undefined' && 'gc' in window) {
            try {
              (window as any).gc();
            } catch (e) {
              // Ignore if gc is not available
            }
          }
        }
        
        // Update progress
        const progress = ((batchIndex + 1) / batches.length) * 100;
        console.log(`📊 [UnifiedViewer] Progress: ${Math.round(progress)}%`);
      }

      // Update state with loaded images
      const successfulImages = allResults
        .filter(result => result.success && result.data)
        .map(result => result.data as string);

      setState(prev => ({
        ...prev,
        imageData: successfulImages,
        totalFrames: successfulImages.length,
        loadedBatches: new Set([0]), // Mark first batch as loaded
        isLoading: false
      }));

      // Generate volume data for MPR if we have multiple images
      if (successfulImages.length > 1) {
        try {
          const volumeData = await generateVolumeData();
          setState(prev => ({
            ...prev,
            volumeData
          }));
          console.log(`✅ [UnifiedViewer] Generated volume data for ${successfulImages.length} slices`);
        } catch (error) {
          console.warn('⚠️ [UnifiedViewer] Failed to generate volume data:', error);
        }
      }

      // Display first frame
      if (successfulImages.length > 0) {
        setTimeout(() => {
          displaySlice(0, successfulImages);
        }, 100);
      }

      console.log(`✅ [UnifiedViewer] Successfully loaded ${successfulImages.length}/${imageDataArray.length} images`);

      // Run performance tests if all services are initialized
      if (performanceTesterRef.current && 
          memoryManagerRef.current && 
          shaderOptimizerRef.current && 
          webglContextRef.current &&
          successfulImages.length > 0) {
        
        console.log('🧪 [UnifiedViewer] Running performance test suite...');
        
        try {
          const testResults = await performanceTesterRef.current.runFullTestSuite(
            memoryManagerRef.current,
            shaderOptimizerRef.current,
            webglContextRef.current as WebGL2RenderingContext,
            renderWithWebGL,
            successfulImages[0] // Use first image for testing
          );
          
          // Log detailed results
          console.log('🧪 [UnifiedViewer] Performance test results:', testResults);
          
          // Show performance notification if any tests failed
          const failedTests = testResults.filter(r => !r.passed);
          if (failedTests.length > 0) {
            setPerformanceNotification({
              open: true,
              message: `Performance tests: ${testResults.length - failedTests.length}/${testResults.length} passed`,
              severity: 'warning'
            });
          } else {
            setPerformanceNotification({
              open: true,
              message: `All performance tests passed! Optimizations working correctly.`,
              severity: 'success'
            });
          }
        } catch (error) {
          console.error('❌ [UnifiedViewer] Performance testing failed:', error);
        }
      }

      // Start memory monitoring validation after a delay
      setTimeout(() => {
        if (memoryMonitorRef.current) {
          console.log('🧠 [UnifiedViewer] Starting memory monitoring validation...');
          
          // Log initial memory summary
          memoryMonitorRef.current.logMemorySummary();
          
          // Set up periodic memory analysis
          const memoryAnalysisInterval = setInterval(() => {
            if (memoryMonitorRef.current) {
              const analysis = memoryMonitorRef.current.analyzeMemoryUsage();
              const pressure = memoryMonitorRef.current.getMemoryPressure();
              
              console.log(`🧠 [UnifiedViewer] Memory Analysis - Pressure: ${pressure}, Efficiency: ${(analysis.efficiency * 100).toFixed(1)}%`);
              
              // Show warning if memory issues detected
              if (analysis.memoryLeaks || pressure === 'high' || pressure === 'critical') {
                setPerformanceNotification({
                  open: true,
                  message: `Memory ${pressure} pressure detected. ${analysis.recommendations[0]}`,
                  severity: pressure === 'critical' ? 'error' : 'warning'
                });
              }
            }
          }, 30000); // Check every 30 seconds
          
          // Clean up interval after 5 minutes
          setTimeout(() => {
            clearInterval(memoryAnalysisInterval);
            if (memoryMonitorRef.current) {
              memoryMonitorRef.current.logMemorySummary();
              console.log('🧠 [UnifiedViewer] Memory monitoring validation completed');
            }
          }, 300000); // 5 minutes
        }
      }, 5000); // Start after 5 seconds

    } catch (error) {
      console.error('❌ [UnifiedViewer] Failed to load images from data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load images from data'
      }));
    }
  };

  const debugCurrentState = () => {
    console.log('🔍 [UnifiedViewer] Current state:', {
      isLoading: state.isLoading,
      error: state.error,
      totalFrames: state.totalFrames,
      currentFrame: state.currentFrame,
      imageDataLength: state.imageData.length,
      loadedBatches: Array.from(state.loadedBatches),
      batchSize: state.batchSize,
      renderingMode: state.renderingMode,
      zoom: state.zoom,
      canvasRef: !!canvasRef.current,
      webglContext: !!webglContextRef.current
    });
  };

  const displayTestPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('❌ [UnifiedViewer] Canvas not available for test pattern');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ [UnifiedViewer] 2D context not available');
      return;
    }

    // Set canvas size
    canvas.width = 512;
    canvas.height = 512;

    // Draw test pattern
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw text
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DICOM Viewer Test Pattern', canvas.width / 2, canvas.height / 2 - 80);
    ctx.fillText('Canvas is working', canvas.width / 2, canvas.height / 2 + 80);

    console.log('✅ [UnifiedViewer] Test pattern displayed');
  };

  // Enhanced adaptive preloading for multi-slice studies with intelligent batch management
  const preloadAdjacentBatches = useCallback((currentFrame: number) => {
    const currentBatch = Math.floor(currentFrame / state.batchSize);
    const totalBatches = Math.ceil(state.totalFrames / state.batchSize);

    // Adaptive preloading strategy based on study size and type
    let preloadDistance = 1;
    let preloadDelay = 500;
    let maxConcurrentLoads = 2;

    if (state.totalFrames >= 96) {
      // Large multi-slice studies (96+ slices) - aggressive preloading
      preloadDistance = 3;
      preloadDelay = 200;
      maxConcurrentLoads = 4;
      console.log('🎯 [UnifiedViewer] Using large study preloading strategy (96+ slices)');
    } else if (state.totalFrames >= 50) {
      // Medium multi-slice studies (50-95 slices) - moderate preloading
      preloadDistance = 2;
      preloadDelay = 300;
      maxConcurrentLoads = 3;
      console.log('🔄 [UnifiedViewer] Using medium study preloading strategy (50-95 slices)');
    } else if (state.totalFrames >= 20) {
      // Small multi-slice studies (20-49 slices) - conservative preloading
      preloadDistance = 2;
      preloadDelay = 400;
      maxConcurrentLoads = 2;
      console.log('📦 [UnifiedViewer] Using small study preloading strategy (20-49 slices)');
    } else {
      // Single or few slices - minimal preloading
      preloadDistance = 1;
      preloadDelay = 500;
      maxConcurrentLoads = 1;
      console.log('🔍 [UnifiedViewer] Using minimal preloading strategy (<20 slices)');
    }

    // Count currently loading batches to avoid overwhelming the system
    const loadingBatchCount = Array.from(state.loadedBatches.keys()).filter(
      batchIndex => state.isLoadingBatch
    ).length;

    if (loadingBatchCount >= maxConcurrentLoads) {
      console.log(`⏳ [UnifiedViewer] Skipping preload - already loading ${loadingBatchCount} batches (max: ${maxConcurrentLoads})`);
      return;
    }

    // Priority-based preloading: next batches first, then previous
    const preloadQueue = [];
    
    // Add next batches to queue (higher priority)
    for (let i = 1; i <= preloadDistance; i++) {
      const nextBatch = currentBatch + i;
      if (nextBatch < totalBatches && !state.loadedBatches.has(nextBatch)) {
        preloadQueue.push({ batch: nextBatch, priority: i, direction: 'next' });
      }
    }

    // Add previous batches to queue (lower priority)
    for (let i = 1; i <= preloadDistance; i++) {
      const prevBatch = currentBatch - i;
      if (prevBatch >= 0 && !state.loadedBatches.has(prevBatch)) {
        preloadQueue.push({ batch: prevBatch, priority: i + preloadDistance, direction: 'prev' });
      }
    }

    // Sort by priority and execute with staggered delays
    preloadQueue
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxConcurrentLoads - loadingBatchCount) // Respect concurrent load limit
      .forEach((item, index) => {
        const delay = (index + 1) * preloadDelay;
        console.log(`🔮 [UnifiedViewer] Queuing ${item.direction} batch ${item.batch} (priority: ${item.priority}, delay: ${delay}ms)`);
        setTimeout(() => {
          if (!state.loadedBatches.has(item.batch) && !state.isLoadingBatch) {
            loadBatch(item.batch);
          }
        }, delay);
      });

    // Memory management for large studies
    if (state.totalFrames >= 96 && state.loadedBatches.size > 10) {
      console.log('🧹 [UnifiedViewer] Large study detected - performing memory cleanup');
      cleanupDistantBatches(currentBatch, preloadDistance * 2);
    }
  }, [state.batchSize, state.totalFrames, state.loadedBatches, state.isLoadingBatch]);

  // Memory cleanup for large multi-slice studies
  const cleanupDistantBatches = useCallback((currentBatch: number, keepDistance: number) => {
    const batchesToRemove = [];
    
    state.loadedBatches.forEach((_, batchIndex) => {
      const distance = Math.abs(batchIndex - currentBatch);
      if (distance > keepDistance) {
        batchesToRemove.push(batchIndex);
      }
    });

    if (batchesToRemove.length > 0) {
      console.log(`🧹 [UnifiedViewer] Cleaning up ${batchesToRemove.length} distant batches:`, batchesToRemove);
      
      setState(prev => {
        const newLoadedBatches = new Set(prev.loadedBatches);
        const newImageData = [...prev.imageData];
        
        batchesToRemove.forEach(batchIndex => {
          newLoadedBatches.delete(batchIndex);
          
          // Clear image data for this batch
          const startFrame = batchIndex * prev.batchSize;
          const endFrame = Math.min(startFrame + prev.batchSize, prev.totalFrames);
          for (let i = startFrame; i < endFrame; i++) {
            newImageData[i] = null;
          }
        });

        return {
          ...prev,
          loadedBatches: newLoadedBatches,
          imageData: newImageData
        };
      });
    }
  }, [state.batchSize, state.totalFrames]);

  const loadBatch = async (batchIndex: number) => {
    // Check if batch is already loaded or currently loading
    if (state.loadedBatches.has(batchIndex) || state.isLoadingBatch) {
      console.log('📦 [UnifiedViewer] Batch', batchIndex, 'already loaded or loading');
      return;
    }

    console.log('📦 [UnifiedViewer] Loading batch', batchIndex);

    setState(prev => ({ ...prev, isLoadingBatch: true }));

    try {
      const urlSource = study.dicom_url || study.original_filename;
      const pathParts = urlSource.split('/');
      const filename = pathParts[pathParts.length - 1];
      const patientId = pathParts[pathParts.length - 2] || study.patient_id;

      // For the first batch, perform dynamic slice detection
      if (batchIndex === 0) {
        console.log('🔍 [UnifiedViewer] Performing dynamic slice detection for first batch');
        
        // Call the enhanced slice detection endpoint
        const detectionUrl = `http://localhost:8000/dicom/process/${patientId}/${filename}?output_format=PNG&auto_detect=true&t=${Date.now()}`;
        
        try {
          const detectionResponse = await fetch(detectionUrl);
          if (detectionResponse.ok) {
            const detectionResult = await detectionResponse.json();
            
            if (detectionResult.success && detectionResult.auto_detection_info) {
              const detectedSlices = detectionResult.auto_detection_info.total_slices;
              const detectionConfidence = detectionResult.auto_detection_info.confidence;
              
              console.log('🎯 [UnifiedViewer] Dynamic slice detection result:', {
                detectedSlices,
                detectionMethod: detectionResult.auto_detection_info.detection_method,
                sliceType: detectionResult.auto_detection_info.slice_type,
                confidence: detectionConfidence,
                pixelArrayShape: detectionResult.auto_detection_info.pixel_array_shape
              });
              
              // Update totalFrames if detection is confident and different from current
              if (detectionConfidence > 0.7 && detectedSlices !== state.totalFrames) {
                console.log(`🔄 [UnifiedViewer] Updating totalFrames from ${state.totalFrames} to ${detectedSlices} based on dynamic detection`);
                console.log('🔍 [DEBUG] Current state before update:', { 
                  totalFrames: state.totalFrames, 
                  studyType: state.studyType,
                  currentFrame: state.currentFrame 
                });
                
                setState(prev => {
                  const studyType: 'single-frame' | 'multi-frame' | 'volume' | 'series' = detectedSlices > 1 ? 'multi-frame' : 'single-frame';
                  const newState = { 
                    ...prev, 
                    totalFrames: detectedSlices,
                    studyType: studyType
                  };
                  console.log('🔍 [DEBUG] New state after update:', { 
                    totalFrames: newState.totalFrames, 
                    studyType: newState.studyType,
                    currentFrame: newState.currentFrame 
                  });
                  return newState;
                });
                
                // Force a re-render by updating a timestamp
                setTimeout(() => {
                  console.log('🔍 [DEBUG] State after timeout:', { 
                    totalFrames: state.totalFrames, 
                    studyType: state.studyType 
                  });
                }, 100);
                
                // Update study analysis for better batch sizing
                if (detectedSlices >= 96) {
                  console.log('🎯 [UnifiedViewer] Large multi-slice study detected (96+ slices), optimizing batch size');
                  setState(prev => ({ 
                    ...prev, 
                    batchSize: Math.min(16, Math.max(8, Math.ceil(detectedSlices / 12))) // Adaptive batch size for large studies
                  }));
                }
              }
            }
          }
        } catch (detectionError) {
          console.warn('⚠️ [UnifiedViewer] Dynamic slice detection failed, using fallback:', detectionError);
        }
      }

      const startFrame = batchIndex * state.batchSize;
      const endFrame = Math.min(startFrame + state.batchSize, state.totalFrames);

      console.log(`📦 [UnifiedViewer] Loading frames ${startFrame} to ${endFrame - 1}`);

      // Load frames in this batch
      const batchPromises = [];
      for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
        const convertUrl = `http://localhost:8000/dicom/convert/${patientId}/${filename}?slice=${frameIndex}&t=${Date.now()}`;
        batchPromises.push(
          fetch(convertUrl)
            .then(async response => {
              console.log(`🔍 [UnifiedViewer] Frame ${frameIndex} response:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const result = await response.json();
              console.log(`📄 [UnifiedViewer] Frame ${frameIndex} result:`, {
                success: result.success,
                hasImageUrl: !!result.png_url,
                imageUrl: result.png_url,
                metadata: result.metadata
              });

              if (!result.success || !result.png_url) {
                throw new Error(result.error || 'No image URL received');
              }

              // Convert PNG URL to base64 data URL for compatibility
              const imageResponse = await fetch(`http://localhost:8000${result.png_url}`);
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status}`);
              }
              
              const imageBlob = await imageResponse.blob();
              const imageDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(imageBlob);
              });

              return {
                frameIndex,
                imageData: imageDataUrl,
                metadata: result.metadata
              };
            })
            .catch(error => {
              console.error(`❌ [UnifiedViewer] Failed to load frame ${frameIndex}:`, error);
              return {
                frameIndex,
                imageData: null,
                error: error.message
              };
            })
        );
      }

      const batchResults = await Promise.all(batchPromises);
      console.log(`📦 [UnifiedViewer] Batch ${batchIndex} results:`, {
        total: batchResults.length,
        successful: batchResults.filter(r => r.imageData).length,
        failed: batchResults.filter(r => !r.imageData).length
      });

      // Log detailed batch results for debugging
      console.log(`🔍 [DEBUG] Detailed batch results for batch ${batchIndex}:`);
      batchResults.forEach((result, idx) => {
        console.log(`  Frame ${result.frameIndex}:`, {
          hasImageData: !!result.imageData,
          imageDataType: typeof result.imageData,
          imageDataLength: result.imageData?.length || 0,
          imageDataPrefix: result.imageData?.substring(0, 50) || 'null',
          error: result.error || 'none'
        });
      });

      // Update state with loaded images
      setState(prev => {
        const newImageData = [...prev.imageData];
        const newLoadedImages = [...prev.loadedImages];
        
        console.log(`🔍 [DEBUG] Before state update - imageData length: ${prev.imageData.length}`);
        
        batchResults.forEach(result => {
          if (result.imageData) {
            newImageData[result.frameIndex] = result.imageData;
            console.log(`✅ [DEBUG] Added imageData for frame ${result.frameIndex}, data length: ${result.imageData.length}`);
          } else {
            console.log(`❌ [DEBUG] No imageData for frame ${result.frameIndex}, error: ${result.error}`);
          }
        });

        console.log(`🔍 [DEBUG] After processing - newImageData length: ${newImageData.length}`);
        console.log(`🔍 [DEBUG] Frames with data:`, newImageData.map((data, idx) => ({ index: idx, hasData: !!data })).filter(f => f.hasData));

        const newState = {
          ...prev,
          imageData: newImageData,
          loadedImages: newLoadedImages,
          loadedBatches: new Set([...prev.loadedBatches, batchIndex]),
          isLoadingBatch: false
        };

        console.log(`🔍 [DEBUG] New state imageData length: ${newState.imageData.length}`);
        console.log(`🔍 [DEBUG] Loaded batches:`, Array.from(newState.loadedBatches));

        return newState;
      });

      console.log(`✅ [UnifiedViewer] Successfully loaded batch ${batchIndex}`);
      
      // Trigger displaySlice for the first frame if this is the first batch
      if (batchIndex === 0 && batchResults.some(r => r.imageData)) {
        console.log(`🎨 [DEBUG] Triggering displaySlice for frame 0 after loading first batch`);
        setTimeout(() => {
          displaySlice(0);
        }, 100);
      }

    } catch (error) {
      console.error(`❌ [UnifiedViewer] Failed to load batch ${batchIndex}:`, error);
      setState(prev => ({ 
        ...prev, 
        isLoadingBatch: false,
        error: error instanceof Error ? error.message : 'Failed to load batch'
      }));
    }
  };

  // Enhanced displaySlice function with WebGL rendering and Canvas 2D fallback
  const displaySlice = async (frameIndex: number, imageDataArray?: string[]) => {
    const startTime = performance.now();
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('❌ [UnifiedViewer] Canvas not available');
        return;
      }

      // Use provided imageDataArray or state imageData
      const imageData = imageDataArray || state.imageData;
      
      console.log(`🔍 [DEBUG] displaySlice called with frameIndex: ${frameIndex}`);
      console.log(`🔍 [DEBUG] imageData array length: ${imageData.length}`);
      console.log(`🔍 [DEBUG] imageData[${frameIndex}]:`, imageData[frameIndex]);
      
      if (!imageData[frameIndex]) {
        console.warn(`⚠️ [UnifiedViewer] No image data for frame ${frameIndex}`);
        console.log(`🔍 [DEBUG] Available frames in imageData:`, imageData.map((data, idx) => ({ index: idx, hasData: !!data, dataLength: data?.length || 0 })));
        return;
      }

      console.log(`🎨 [UnifiedViewer] Displaying frame ${frameIndex} using ${state.renderingMode} rendering`);
      console.log(`🔍 [DEBUG] Canvas dimensions: ${canvas.width}x${canvas.height}`);

      // Determine optimal LOD level based on zoom and dataset size
      let lodLevel = 4; // Default to highest quality
      if (lodRenderingRef.current && adaptiveQuality) {
        lodLevel = lodRenderingRef.current.getOptimalLOD(
          state.zoomLevel || 1.0,
          state.totalFrames || 1
        );
        console.log(`🎚️ [LOD] Using LOD level ${lodLevel} for frame ${frameIndex}`);
      }

      // Choose rendering method based on capabilities and preferences
      let renderSuccess = false;
      
      if (state.renderingMode === 'webgl' && webglContextRef.current) {
        renderSuccess = await renderWithWebGL(canvas, imageData[frameIndex], frameIndex, lodLevel);
      }
      
      if (!renderSuccess) {
        // Fallback to Canvas 2D rendering
        renderSuccess = await renderWithCanvas2D(canvas, imageData[frameIndex], frameIndex, lodLevel);
      }

      if (renderSuccess) {
        const renderTime = performance.now() - startTime;
        
        // Record performance metrics for LOD adaptation
        if (lodRenderingRef.current) {
          const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
          lodRenderingRef.current.recordPerformance(renderTime, memoryUsage);
        }
        
        // Update performance metrics
        setState(prev => ({
          ...prev,
          currentFrame: frameIndex,
          processingTime: renderTime,
          cacheHit: !!cacheManagerRef.current?.isCached(frameIndex.toString())
        }));

        // Preload adjacent batches for smooth navigation
        if (enableCaching) {
          preloadAdjacentBatches(frameIndex);
        }

        console.log(`✅ [UnifiedViewer] Frame ${frameIndex} rendered in ${Math.round(renderTime)}ms (LOD: ${lodLevel})`);
      }

    } catch (error) {
      console.error('❌ [UnifiedViewer] Failed to display slice:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to display slice'
      }));
    }
  };

  // WebGL rendering function
  const renderWithWebGL = async (canvas: HTMLCanvasElement, imageData: string, frameIndex: number, lodLevel: number = 4): Promise<boolean> => {
    const gl = webglContextRef.current;
    if (!gl) return false;

    try {
      // Load image
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageData;
      });

      // Apply LOD scaling if needed
      let processedImage = image;
      if (lodRenderingRef.current && lodLevel < 4) {
        // Create ImageData from the image for LOD processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(image, 0, 0);
          const imageDataObj = tempCtx.getImageData(0, 0, image.width, image.height);
          const lodImageData = lodRenderingRef.current.applyLOD(imageDataObj, lodLevel);
          
          // Create new image from LOD processed data
          const lodCanvas = document.createElement('canvas');
          lodCanvas.width = lodImageData.width;
          lodCanvas.height = lodImageData.height;
          const lodCtx = lodCanvas.getContext('2d');
          if (lodCtx) {
            lodCtx.putImageData(lodImageData, 0, 0);
            processedImage = new Image();
            await new Promise((resolve, reject) => {
              processedImage.onload = resolve;
              processedImage.onerror = reject;
              processedImage.src = lodCanvas.toDataURL();
            });
          }
        }
      }

      // Set canvas size based on processed image
      canvas.width = processedImage.width;
      canvas.height = processedImage.height;
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Get texture parameters based on LOD level
      const textureParams = lodRenderingRef.current?.getTextureParameters(lodLevel) || {
        maxSize: 4096,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        compression: false
      };

      // Try to get texture from pool, fallback to creating new one
      let texture: WebGLTexture | null = null;
      if (memoryManagerRef.current) {
        texture = memoryManagerRef.current.getTexture(processedImage.width, processedImage.height, gl.RGBA);
      }
      
      if (!texture) {
        texture = gl.createTexture();
      }
      
      if (!texture) {
        console.error('❌ [UnifiedViewer] Failed to create or get texture');
        return false;
      }

      // Apply texture optimization if shader optimizer is available
      if (shaderOptimizerRef.current) {
        const optimizedTexture = shaderOptimizerRef.current.createOptimizedTexture(processedImage, {
          generateMipmaps: true,
          anisotropicFiltering: true,
          compression: true
        });
        
        if (optimizedTexture) {
          texture = optimizedTexture;
        }
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, processedImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureParams.minFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureParams.magFilter);

      // Create shader program using optimizer if available
      let program: WebGLProgram | null = null;
      if (shaderOptimizerRef.current) {
        // Use optimized shader with compression support
        program = shaderOptimizerRef.current.createOptimizedShader('dicom-viewer');
      } else {
        // Fallback to basic shader
        program = createShaderProgram(gl);
      }
      
      if (!program) {
        // Return texture to pool if shader creation fails
        if (memoryManagerRef.current) {
          memoryManagerRef.current.returnTexture(texture);
        }
        return false;
      }

      gl.useProgram(program);

      // Set up vertex buffer
      const vertices = new Float32Array([
        -1, -1, 0, 1,
         1, -1, 1, 1,
        -1,  1, 0, 0,
         1,  1, 1, 0
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(program, 'position');
      const texCoordLocation = gl.getAttribLocation(program, 'texCoord');

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

      // Set uniforms
      const textureLocation = gl.getUniformLocation(program, 'texture');
      const windowWidthLocation = gl.getUniformLocation(program, 'windowWidth');
      const windowCenterLocation = gl.getUniformLocation(program, 'windowCenter');
      const zoomLocation = gl.getUniformLocation(program, 'zoom');
      const panLocation = gl.getUniformLocation(program, 'pan');
      const rotationLocation = gl.getUniformLocation(program, 'rotation');

      gl.uniform1i(textureLocation, 0);
      gl.uniform1f(windowWidthLocation, state.windowWidth);
      gl.uniform1f(windowCenterLocation, state.windowCenter);
      gl.uniform1f(zoomLocation, state.zoom);
      gl.uniform2f(panLocation, state.pan.x, state.pan.y);
      gl.uniform1f(rotationLocation, state.rotation);

      // Render
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Return texture to pool after rendering
      if (memoryManagerRef.current) {
        memoryManagerRef.current.returnTexture(texture);
      }

      return true;
    } catch (error) {
      console.error('❌ [UnifiedViewer] WebGL rendering failed:', error);
      return false;
    }
  };

  // Canvas 2D rendering function
  const renderWithCanvas2D = async (canvas: HTMLCanvasElement, imageData: string, frameIndex: number, lodLevel: number = 4): Promise<boolean> => {
    console.log(`🎨 [Canvas2D] Starting Canvas2D rendering for frame ${frameIndex}`);
    console.log(`🎨 [Canvas2D] Image data URL length: ${imageData.length}`);
    console.log(`🎨 [Canvas2D] Canvas dimensions: ${canvas.width}x${canvas.height}`);
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ [Canvas2D] Failed to get 2D context');
        return false;
      }

      console.log(`🎨 [Canvas2D] Got 2D context successfully`);

      // Load image
      const image = new Image();
      console.log(`🎨 [Canvas2D] Creating new Image object`);
      
      await new Promise((resolve, reject) => {
        image.onload = () => {
          console.log(`✅ [Canvas2D] Image loaded successfully: ${image.width}x${image.height}`);
          resolve(undefined);
        };
        image.onerror = (error) => {
          console.error('❌ [Canvas2D] Image load failed:', error);
          reject(error);
        };
        console.log(`🎨 [Canvas2D] Setting image src...`);
        image.src = imageData;
      });

      // Apply LOD scaling if needed
      let processedImage = image;
      let targetWidth = image.width;
      let targetHeight = image.height;
      
      if (lodRenderingRef.current && lodLevel < 4) {
        // Create ImageData from the image for LOD processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(image, 0, 0);
          const imageDataObj = tempCtx.getImageData(0, 0, image.width, image.height);
          const lodImageData = lodRenderingRef.current.applyLOD(imageDataObj, lodLevel);
          
          targetWidth = lodImageData.width;
          targetHeight = lodImageData.height;
          
          // Create new image from LOD processed data
          const lodCanvas = document.createElement('canvas');
          lodCanvas.width = targetWidth;
          lodCanvas.height = targetHeight;
          const lodCtx = lodCanvas.getContext('2d');
          if (lodCtx) {
            lodCtx.putImageData(lodImageData, 0, 0);
            processedImage = new Image();
            await new Promise((resolve, reject) => {
              processedImage.onload = resolve;
              processedImage.onerror = reject;
              processedImage.src = lodCanvas.toDataURL();
            });
          }
        }
      }

      // Set canvas size based on processed image
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      console.log(`🎨 [Canvas2D] Canvas resized to: ${canvas.width}x${canvas.height}`);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log(`🎨 [Canvas2D] Canvas cleared`);

      // Apply transformations
      ctx.save();
      console.log(`🎨 [Canvas2D] Applying transformations - zoom: ${state.zoom}, pan: ${state.pan.x},${state.pan.y}, rotation: ${state.rotation}`);
      
      // Apply zoom and pan
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX + state.pan.x, centerY + state.pan.y);
      ctx.scale(state.zoom, state.zoom);
      ctx.rotate(state.rotation * Math.PI / 180);
      ctx.translate(-centerX, -centerY);

      // Set image smoothing based on LOD level
      const lodInfo = lodRenderingRef.current?.getLODInfo(lodLevel);
      ctx.imageSmoothingEnabled = lodInfo?.quality !== 'ultra-low';
      ctx.imageSmoothingQuality = lodInfo?.quality === 'ultra-low' ? 'low' : 'high';

      // Draw processed image
      console.log(`🎨 [Canvas2D] Drawing image to canvas...`);
      ctx.drawImage(processedImage, 0, 0);
      console.log(`✅ [Canvas2D] Image drawn successfully`);

      // Apply windowing (simplified for Canvas 2D)
      if (state.windowWidth !== 3557 || state.windowCenter !== 40) {
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;
        
        const windowMin = state.windowCenter - state.windowWidth / 2;
        const windowMax = state.windowCenter + state.windowWidth / 2;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          let windowed = ((gray - windowMin) / (windowMax - windowMin)) * 255;
          windowed = Math.max(0, Math.min(255, windowed));
          
          data[i] = windowed;     // R
          data[i + 1] = windowed; // G
          data[i + 2] = windowed; // B
        }
        
        ctx.putImageData(imageDataObj, 0, 0);
      }

      ctx.restore();
      console.log(`✅ [Canvas2D] Canvas2D rendering completed successfully for frame ${frameIndex}`);
      return true;
    } catch (error) {
      console.error('❌ [UnifiedViewer] Canvas 2D rendering failed:', error);
      return false;
    }
  };

  // Create WebGL shader program
  const createShaderProgram = (gl: WebGLRenderingContext): WebGLProgram | null => {
    const vertexShaderSource = `
      attribute vec2 position;
      attribute vec2 texCoord;
      varying vec2 vTexCoord;
      uniform float zoom;
      uniform vec2 pan;
      uniform float rotation;
      
      void main() {
        vec2 pos = position;
        
        // Apply zoom
        pos *= zoom;
        
        // Apply rotation
        float cos_r = cos(rotation);
        float sin_r = sin(rotation);
        pos = vec2(pos.x * cos_r - pos.y * sin_r, pos.x * sin_r + pos.y * cos_r);
        
        // Apply pan
        pos += pan;
        
        gl_Position = vec4(pos, 0.0, 1.0);
        vTexCoord = texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D texture;
      uniform float windowWidth;
      uniform float windowCenter;
      varying vec2 vTexCoord;
      
      void main() {
        vec4 color = texture2D(texture, vTexCoord);
        float gray = (color.r + color.g + color.b) / 3.0;
        
        // Apply windowing
        float windowMin = windowCenter - windowWidth / 2.0;
        float windowMax = windowCenter + windowWidth / 2.0;
        float windowed = (gray - windowMin) / (windowMax - windowMin);
        windowed = clamp(windowed, 0.0, 1.0);
        
        gl_FragColor = vec4(windowed, windowed, windowed, 1.0);
      }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) return null;
    
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
      return null;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) return null;
    
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
      return null;
    }

    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking error:', gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  };

  // Viewport controls
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.1, Math.min(10, state.zoom + delta));
    setState(prev => ({ ...prev, zoom: newZoom }));
    
    // Re-render current frame with new zoom
    displaySlice(state.currentFrame);
  }, [state.zoom, state.currentFrame]);

  const handleRotate = useCallback((angle: number) => {
    const newRotation = (state.rotation + angle) % 360;
    setState(prev => ({ ...prev, rotation: newRotation }));
    
    // Re-render current frame with new rotation
    displaySlice(state.currentFrame);
  }, [state.rotation, state.currentFrame]);

  // Reset view to default state
  const resetView = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 },
      rotation: 0,
      windowWidth: 3557,
      windowCenter: 40,
      invert: false
    }));
    
    // Re-render current frame with reset view
    displaySlice(state.currentFrame);
  }, [state.currentFrame]);

  const handleWindowing = useCallback(async (windowWidth: number, windowCenter: number) => {
    setState(prev => ({ ...prev, windowWidth, windowCenter }));
    
    // Use Web Worker for windowing adjustment if available
    if (workerInitialized && canvasRef.current) {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Process windowing in Web Worker
          const result = await processWindowing(imageData, windowCenter, windowWidth, state.invert);
          
          if (result && result.processedImageData) {
            const processedImageData = new ImageData(
              result.processedImageData.data,
              result.processedImageData.width,
              result.processedImageData.height
            );
            ctx.putImageData(processedImageData, 0, 0);
          }
        }
      } catch (error) {
        console.warn('Web Worker windowing failed, falling back to main thread:', error);
        // Fallback to main thread processing
        displaySlice(state.currentFrame);
      }
    } else {
      // Fallback to main thread processing
      displaySlice(state.currentFrame);
    }
  }, [state.currentFrame, state.invert, workerInitialized, processWindowing]);

  const handleReset = useCallback(() => {
    resetView();
  }, [resetView]);

  // Navigation functions
  const navigateFrame = useCallback((direction: 'next' | 'previous' | 'first' | 'last' | number) => {
    let newFrame = state.currentFrame;
    let navigationDirection: 'next' | 'previous' | 'jump' = 'next';
    
    switch (direction) {
      case 'next':
        newFrame = Math.min(state.currentFrame + 1, state.totalFrames - 1);
        navigationDirection = 'next';
        break;
      case 'previous':
        newFrame = Math.max(state.currentFrame - 1, 0);
        navigationDirection = 'previous';
        break;
      case 'first':
        newFrame = 0;
        navigationDirection = 'jump';
        break;
      case 'last':
        newFrame = state.totalFrames - 1;
        navigationDirection = 'jump';
        break;
      default:
        if (typeof direction === 'number') {
          newFrame = Math.max(0, Math.min(direction, state.totalFrames - 1));
          navigationDirection = Math.abs(direction - state.currentFrame) > 1 ? 'jump' : 'next';
        }
    }
    
    // Record user interaction for predictive caching
    if (predictiveCacheRef.current) {
      predictiveCacheRef.current.recordInteraction({
        type: 'frame_navigation',
        timestamp: Date.now(),
        frameIndex: newFrame,
        direction: navigationDirection
      });
    }
    
    if (newFrame !== state.currentFrame) {
      // Check predictive cache first
      const cacheKey = `frame_${newFrame}`;
      let cachedData = null;
      
      if (predictiveCacheRef.current) {
        cachedData = predictiveCacheRef.current.get(cacheKey);
      }
      
      if (cachedData) {
        // Use cached data
        console.log(`🎯 [PredictiveCache] Cache hit for frame ${newFrame}`);
        setState(prev => ({ ...prev, currentFrame: newFrame }));
        displaySlice(newFrame);
        
        // Trigger predictive preloading
        if (predictiveCacheRef.current) {
          predictiveCacheRef.current.predictAndPreload(
            newFrame, 
            state.totalFrames, 
            async (frameIndex) => {
              // Load function for predictive cache
              const imageUrl = state.imageData[frameIndex];
              if (imageUrl) {
                return new Promise((resolve) => {
                  const img = new Image();
                  img.onload = () => resolve({ 
                    data: img, 
                    size: img.width * img.height * 4 // Estimate size
                  });
                  img.src = imageUrl;
                });
              }
              throw new Error(`No image data for frame ${frameIndex}`);
            }
          );
        }
        return;
      }
      
      // Check if we need to load a new batch
      const newBatch = Math.floor(newFrame / state.batchSize);
      const isLargeDataset = state.totalFrames > 50;
      
      if (!state.loadedBatches.has(newBatch)) {
        // Show loading indicator for large datasets
        if (isLargeDataset) {
          setState(prev => ({ ...prev, isLoading: true }));
        }
        
        console.log(`📦 [UnifiedViewer] Need to load batch ${newBatch} for frame ${newFrame}`);
        loadBatch(newBatch).then(() => {
          setState(prev => ({ 
            ...prev, 
            currentFrame: newFrame,
            isLoading: false
          }));
          displaySlice(newFrame);
          
          // Trigger intelligent preloading for large datasets
          if (isLargeDataset) {
            const preloadDelay = Math.max(100, 500 - (state.totalFrames * 2));
            setTimeout(() => preloadAdjacentBatches(newFrame), preloadDelay);
          }
        }).catch(() => {
          setState(prev => ({ ...prev, isLoading: false }));
        });
      } else {
        setState(prev => ({ ...prev, currentFrame: newFrame }));
        displaySlice(newFrame);
        
        // Still trigger preloading for smooth navigation in large datasets
        if (isLargeDataset) {
          setTimeout(() => preloadAdjacentBatches(newFrame), 200);
        }
      }
    }
  }, [state.currentFrame, state.totalFrames, state.imageData, state.batchSize, state.loadedBatches, loadBatch, displaySlice, preloadAdjacentBatches]);

  // Enhanced keyboard navigation with Apple HIG-inspired shortcuts for radiologists
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;
      
      switch (event.key) {
        // Navigation shortcuts (Apple HIG: Arrow keys for navigation)
        case 'ArrowLeft':
          event.preventDefault();
          navigateFrame('previous');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateFrame('next');
          break;
        case 'ArrowUp':
          if (event.shiftKey) {
            // Shift+Up: Jump 10 frames back
            event.preventDefault();
            const targetFrame = Math.max(0, state.currentFrame - 10);
            navigateFrame(targetFrame);
          } else {
            // Up: Increase window width (brightness)
            event.preventDefault();
            setState(prev => ({
              ...prev,
              windowWidth: Math.min(prev.windowWidth + 100, 4000)
            }));
          }
          break;
        case 'ArrowDown':
          if (event.shiftKey) {
            // Shift+Down: Jump 10 frames forward
            event.preventDefault();
            const targetFrame = Math.min(state.totalFrames - 1, state.currentFrame + 10);
            navigateFrame(targetFrame);
          } else {
            // Down: Decrease window width (brightness)
            event.preventDefault();
            setState(prev => ({
              ...prev,
              windowWidth: Math.max(prev.windowWidth - 100, 1)
            }));
          }
          break;
        case 'Home':
          event.preventDefault();
          navigateFrame('first');
          break;
        case 'End':
          event.preventDefault();
          navigateFrame('last');
          break;
        
        // Zoom shortcuts (Apple HIG: Cmd/Ctrl + Plus/Minus)
        case '=':
        case '+':
          if (cmdKey) {
            event.preventDefault();
            handleZoom(0.2);
          }
          break;
        case '-':
          if (cmdKey) {
            event.preventDefault();
            handleZoom(-0.2);
          }
          break;
        case '0':
          if (cmdKey) {
            event.preventDefault();
            handleReset();
          }
          break;
        
        // Tool shortcuts (Apple HIG: Single letter shortcuts)
        case ' ':
          // Spacebar: Toggle play/pause for cine mode
          event.preventDefault();
          // TODO: Implement cine play/pause
          break;
        case 'f':
        case 'F':
          if (!cmdKey) {
            event.preventDefault();
            setState(prev => ({ ...prev, fullscreen: !prev.fullscreen }));
          }
          break;
        case 'i':
        case 'I':
          if (!cmdKey) {
            event.preventDefault();
            setState(prev => ({ ...prev, invert: !prev.invert }));
          }
          break;
        case 'r':
        case 'R':
          if (cmdKey) {
            event.preventDefault();
            handleReset();
          } else {
            // R alone: Rotate 90 degrees
            event.preventDefault();
            setState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
          }
          break;
        case 'a':
        case 'A':
          if (!cmdKey) {
            event.preventDefault();
            setState(prev => ({ ...prev, annotationMode: !prev.annotationMode }));
          }
          break;
        case 'm':
        case 'M':
          if (!cmdKey) {
            event.preventDefault();
            setState(prev => ({ ...prev, activeTool: prev.activeTool === 'measure' ? null : 'measure' }));
          }
          break;
        case 't':
        case 'T':
          if (!cmdKey) {
            event.preventDefault();
            setState(prev => ({ ...prev, toolbarExpanded: !prev.toolbarExpanded }));
          }
          break;
        case 's':
        case 'S':
          if (!cmdKey) {
            event.preventDefault();
            setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
          }
          break;
        
        // Window/Level shortcuts (Apple HIG: Modifier + Arrow keys)
        case 'w':
        case 'W':
          if (!cmdKey) {
            event.preventDefault();
            // W: Window/Level tool
            setState(prev => ({ ...prev, activeTool: prev.activeTool === 'windowing' ? null : 'windowing' }));
          }
          break;
        case 'z':
        case 'Z':
          if (!cmdKey) {
            event.preventDefault();
            // Z: Zoom tool
            setState(prev => ({ ...prev, activeTool: prev.activeTool === 'zoom' ? null : 'zoom' }));
          }
          break;
        case 'p':
        case 'P':
          if (!cmdKey) {
            event.preventDefault();
            // P: Pan tool
            setState(prev => ({ ...prev, activeTool: prev.activeTool === 'pan' ? null : 'pan' }));
          }
          break;
        
        // Advanced shortcuts for radiologists
        case '1':
          if (!cmdKey) {
            event.preventDefault();
            // Preset 1: Lung window
            setState(prev => ({ ...prev, windowWidth: 1500, windowCenter: -600 }));
          }
          break;
        case '2':
          if (!cmdKey) {
            event.preventDefault();
            // Preset 2: Mediastinum window
            setState(prev => ({ ...prev, windowWidth: 350, windowCenter: 50 }));
          }
          break;
        case '3':
          if (!cmdKey) {
            event.preventDefault();
            // Preset 3: Bone window
            setState(prev => ({ ...prev, windowWidth: 1500, windowCenter: 300 }));
          }
          break;
        case '4':
          if (!cmdKey) {
            event.preventDefault();
            // Preset 4: Brain window
            setState(prev => ({ ...prev, windowWidth: 80, windowCenter: 40 }));
          }
          break;
        case '5':
          if (!cmdKey) {
            event.preventDefault();
            // Preset 5: Abdomen window
            setState(prev => ({ ...prev, windowWidth: 400, windowCenter: 50 }));
          }
          break;
        
        // Escape key: Cancel current action
        case 'Escape':
          event.preventDefault();
          setState(prev => ({
            ...prev,
            activeTool: null,
            annotationMode: false,
            fullscreen: false
          }));
          break;
      }
    };

    // Add ARIA live region for keyboard shortcuts feedback
    const announceShortcut = (message: string) => {
      const liveRegion = document.getElementById('dicom-viewer-announcements');
      if (liveRegion) {
        liveRegion.textContent = message;
        setTimeout(() => {
          liveRegion.textContent = '';
        }, 1000);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigateFrame, state.totalFrames, state.currentFrame, handleZoom, handleReset]);

  // Mouse wheel zoom and frame navigation
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        // Ctrl + Wheel: Zoom
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        handleZoom(delta);
      } else if (state.totalFrames > 1) {
        // Wheel without Ctrl: Frame navigation
        event.preventDefault();
        
        if (event.deltaY > 0) {
          // Scroll down: Next frame
          navigateFrame('next');
        } else {
          // Scroll up: Previous frame
          navigateFrame('previous');
        }
        
        console.log(`🖱️ [MouseWheel] Frame navigation: ${event.deltaY > 0 ? 'next' : 'previous'} (frame ${state.currentFrame + 1}/${state.totalFrames})`);
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel);
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleZoom, navigateFrame, state.totalFrames, state.currentFrame]);

  // Annotation event handlers
  const handleAnnotationCreate = useCallback((annotation: Omit<Annotation, 'id' | 'timestamp' | 'lastModified' | 'lastModifiedBy'>) => {
    const newAnnotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'current-user'
    };

    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, newAnnotation as Annotation]
    }));

    // Update layer annotations
    setState(prev => ({
      ...prev,
      annotationLayers: prev.annotationLayers.map(layer =>
        layer.id === annotation.layer
          ? { ...layer, annotations: [...layer.annotations, newAnnotation.id] }
          : layer
      )
    }));
  }, []);

  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(annotation =>
        annotation.id === id
          ? { ...annotation, ...updates, lastModified: new Date().toISOString(), lastModifiedBy: 'current-user' } as Annotation
          : annotation
      )
    }));
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setState(prev => {
      const annotation = prev.annotations.find(a => a.id === id);
      if (!annotation) return prev;

      return {
        ...prev,
        annotations: prev.annotations.filter(a => a.id !== id),
        annotationLayers: prev.annotationLayers.map(layer =>
          layer.id === annotation.layer
            ? { ...layer, annotations: layer.annotations.filter(aId => aId !== id) }
            : layer
        )
      };
    });
  }, []);

  const handleLayerCreate = useCallback((layer: Omit<AnnotationLayer, 'annotations'>) => {
    const newLayer = {
      ...layer,
      annotations: []
    };

    setState(prev => ({
      ...prev,
      annotationLayers: [...prev.annotationLayers, newLayer]
    }));
  }, []);

  const handleLayerUpdate = useCallback((id: string, updates: Partial<AnnotationLayer>) => {
    setState(prev => ({
      ...prev,
      annotationLayers: prev.annotationLayers.map(layer =>
        layer.id === id ? { ...layer, ...updates } : layer
      )
    }));
  }, []);

  const handleLayerDelete = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      annotationLayers: prev.annotationLayers.filter(layer => layer.id !== id),
      annotations: prev.annotations.filter(annotation => annotation.layer !== id),
      activeAnnotationLayer: prev.activeAnnotationLayer === id 
        ? prev.annotationLayers.find(l => l.id !== id)?.id || 'default-layer'
        : prev.activeAnnotationLayer
    }));
  }, []);

  const handleGroupCreate = useCallback((group: Omit<AnnotationGroup, 'annotations'>) => {
    const newGroup = {
      ...group,
      annotations: []
    };

    setState(prev => ({
      ...prev,
      annotationGroups: [...prev.annotationGroups, newGroup]
    }));
  }, []);

  const handleGroupUpdate = useCallback((id: string, updates: Partial<AnnotationGroup>) => {
    setState(prev => ({
      ...prev,
      annotationGroups: prev.annotationGroups.map(group =>
        group.id === id ? { ...group, ...updates } : group
      )
    }));
  }, []);

  const handleGroupDelete = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      annotationGroups: prev.annotationGroups.filter(group => group.id !== id),
      annotations: prev.annotations.map(annotation =>
        annotation.group === id ? { ...annotation, group: undefined } : annotation
      ),
      activeAnnotationGroup: prev.activeAnnotationGroup === id ? undefined : prev.activeAnnotationGroup
    }));
  }, []);

  const handleActiveLayerChange = useCallback((layerId: string) => {
    setState(prev => ({
      ...prev,
      activeAnnotationLayer: layerId
    }));
  }, []);

  const handleActiveGroupChange = useCallback((groupId?: string) => {
    setState(prev => ({
      ...prev,
      activeAnnotationGroup: groupId
    }));
  }, []);

  const handleAnnotationExport = useCallback((format: 'json' | 'dicom-sr' | 'pdf') => {
    const exportData = {
      annotations: state.annotations,
      layers: state.annotationLayers,
      groups: state.annotationGroups,
      metadata: {
        studyInstanceUID: study.study_uid,
        exportDate: new Date().toISOString(),
        format
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations-${study.study_uid}-${format}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.annotations, state.annotationLayers, state.annotationGroups, study.study_uid]);

  const handleAnnotationImport = useCallback((data: any) => {
    try {
      if (data.annotations && Array.isArray(data.annotations)) {
        setState(prev => ({
          ...prev,
          annotations: [...prev.annotations, ...data.annotations],
          annotationLayers: data.layers ? [...prev.annotationLayers, ...data.layers] : prev.annotationLayers,
          annotationGroups: data.groups ? [...prev.annotationGroups, ...data.groups] : prev.annotationGroups
        }));
      }
    } catch (error) {
      console.error('Failed to import annotations:', error);
      onError?.('Failed to import annotations');
    }
  }, [onError]);

  // AI Enhancement Handlers
  const handleAIEnhancement = useCallback(async (enhancedData: ImageData | Float32Array) => {
    setState(prev => ({
      ...prev,
      enhancedImageData: enhancedData,
      aiEnhancementEnabled: true,
      aiProcessing: false
    }));

    // Trigger re-render with enhanced image
    await displaySlice(state.currentFrame);
  }, [state.currentFrame]);

  const handleAIDetection = useCallback(async (results: DetectionResult[]) => {
    setState(prev => ({
      ...prev,
      aiDetectionResults: results,
      aiProcessing: false
    }));

    // Notify parent component of AI results
    if (onAIResults) {
      onAIResults(results);
    }
  }, [onAIResults]);

  const handleToggleAIEnhancement = useCallback(() => {
    setState(prev => ({
      ...prev,
      aiEnhancementEnabled: !prev.aiEnhancementEnabled
    }));
    
    // Re-render with or without enhancement
    displaySlice(state.currentFrame);
  }, []);

  // MPR handlers
  const handleMPRToggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      mprMode: !prev.mprMode
    }));
  }, []);

  const handleMPRViewerModeChange = useCallback((mode: 'single' | 'multi-plane') => {
    setState(prev => ({
      ...prev,
      mprViewerMode: mode
    }));
  }, []);

  // Crosshair synchronization handlers
  const handleCrosshairMove = useCallback((position: { x: number; y: number; z: number }) => {
    setState(prev => ({
      ...prev,
      crosshairPosition: position
    }));
  }, []);

  const handleCrosshairToggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      crosshairEnabled: !prev.crosshairEnabled
    }));
  }, []);

  // Render side panel content for both mobile drawer and desktop sidebar
  const renderSidePanelContent = () => (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* 3D Navigation Controls */}
      <Navigation3DControls
        state={state.navigation3D}
        onStateChange={(newState) => setState(prev => ({ ...prev, navigation3D: { ...prev.navigation3D, ...newState } }))}
        maxSlices={{
          axial: state.totalFrames,
          sagittal: state.totalFrames,
          coronal: state.totalFrames
        }}
        onReset={() => setState(prev => ({ 
          ...prev, 
          navigation3D: { 
            pitch: 0,
            yaw: 0,
            roll: 0,
            opacity: 1,
            volumeOpacity: 0.8,
            surfaceOpacity: 1,
            axialSlice: Math.floor(state.totalFrames / 2),
            sagittalSlice: Math.floor(state.totalFrames / 2),
            coronalSlice: Math.floor(state.totalFrames / 2),
            clipNear: 0.1,
            clipFar: 1000,
            renderingMode: '3d' as const,
            isAnimating: false,
            animationSpeed: 1,
            currentPreset: 'anterior'
          } 
        }))}
      />

      {/* AI Enhancement Panel */}
      {enableAI && (
        <AIEnhancementPanel
          imageData={state.enhancedImageData}
          onEnhancementApplied={(enhancedData) => setState(prev => ({ ...prev, enhancedImageData: enhancedData }))}
          onDetectionResults={(results) => setState(prev => ({ ...prev, aiDetectionResults: results }))}
          onError={(error) => setState(prev => ({ ...prev, error }))}
          aiModule={aiModuleRef.current!}
          enabled={state.aiEnhancementEnabled}
        />
      )}

      {/* Advanced Annotation Panel */}
      <AdvancedAnnotationPanel
        imageId={study.id}
        annotations={state.annotations}
        layers={state.annotationLayers}
        groups={state.annotationGroups}
        templates={state.annotationTemplates}
        activeLayer={state.activeAnnotationLayer}
        activeGroup={state.activeAnnotationGroup}
        onAnnotationCreate={(annotation) => {
          const newAnnotation = {
            ...annotation,
            id: `annotation-${Date.now()}`,
            timestamp: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            lastModifiedBy: 'current-user'
          } as Annotation;
          setState(prev => ({ ...prev, annotations: [...prev.annotations, newAnnotation] }));
        }}
        onAnnotationUpdate={(id, updates) => {
          setState(prev => ({
            ...prev,
            annotations: prev.annotations.map(ann => 
              ann.id === id ? { ...ann, ...updates, lastModified: new Date().toISOString(), lastModifiedBy: 'current-user' } as Annotation : ann
            )
          }));
        }}
        onAnnotationDelete={(id) => {
          setState(prev => ({
            ...prev,
            annotations: prev.annotations.filter(ann => ann.id !== id)
          }));
        }}
        onLayerCreate={(layer) => {
          const newLayer: AnnotationLayer = {
            ...layer,
            annotations: []
          };
          setState(prev => ({ ...prev, annotationLayers: [...prev.annotationLayers, newLayer] }));
        }}
        onLayerUpdate={(id, updates) => {
          setState(prev => ({
            ...prev,
            annotationLayers: prev.annotationLayers.map(layer => 
              layer.id === id ? { ...layer, ...updates } : layer
            )
          }));
        }}
        onLayerDelete={(id) => {
          setState(prev => ({
            ...prev,
            annotationLayers: prev.annotationLayers.filter(layer => layer.id !== id)
          }));
        }}
        onGroupCreate={(group) => {
          const newGroup: AnnotationGroup = {
            ...group,
            annotations: []
          };
          setState(prev => ({ ...prev, annotationGroups: [...prev.annotationGroups, newGroup] }));
        }}
        onGroupUpdate={(id, updates) => {
          setState(prev => ({
            ...prev,
            annotationGroups: prev.annotationGroups.map(group => 
              group.id === id ? { ...group, ...updates } : group
            )
          }));
        }}
        onGroupDelete={(id) => {
          setState(prev => ({
            ...prev,
            annotationGroups: prev.annotationGroups.filter(group => group.id !== id)
          }));
        }}
        onActiveLayerChange={(layerId) => setState(prev => ({ ...prev, activeAnnotationLayer: layerId }))}
        onActiveGroupChange={(groupId) => setState(prev => ({ ...prev, activeAnnotationGroup: groupId }))}
        onExport={(format) => {
          // Export functionality would be implemented here
          console.log(`Exporting annotations in ${format} format`);
        }}
        onImport={(data) => {
          // Import functionality would be implemented here
          console.log('Importing annotation data:', data);
        }}
        currentUser={{ id: 'current-user', name: 'Current User' }}
      />
    </Box>
  );

  const renderViewerContent = () => {
    if (state.isLoading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          gap: 3,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, rgba(28, 28, 30, 0.95) 0%, rgba(44, 44, 46, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(248, 248, 248, 0.95) 0%, rgba(242, 242, 247, 0.98) 100%)',
          borderRadius: 3,
          p: 4,
          backdropFilter: 'blur(20px) saturate(180%)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(84, 84, 88, 0.3)'
            : '1px solid rgba(198, 198, 200, 0.3)'
        }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress 
              size={isMobile ? 60 : 80} 
              thickness={3}
              sx={{ 
                color: theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 1)' : 'rgba(0, 122, 255, 1)',
                animationDuration: '1200ms',
                filter: theme.palette.mode === 'dark' 
                  ? 'drop-shadow(0 4px 12px rgba(10, 132, 255, 0.3))'
                  : 'drop-shadow(0 4px 12px rgba(0, 122, 255, 0.25))'
              }} 
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography 
                variant="caption" 
                component="div" 
                sx={{
                  color: theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 1)' : 'rgba(0, 122, 255, 1)',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  letterSpacing: '0.02em'
                }}
              >
                {Math.round((state.currentQuality || 0))}%
              </Typography>
            </Box>
          </Box>
          
          <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 400, textAlign: 'center' }}>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              sx={{
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(60, 60, 67, 0.95)',
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}
            >
              Loading DICOM Study
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(60, 60, 67, 0.7)',
                opacity: 0.9,
                lineHeight: 1.5,
                fontSize: isMobile ? '0.85rem' : '0.9rem'
              }}
            >
              {state.isLoadingBatch ? 
                `Loading batch ${Math.ceil((state.currentFrame + 1) / state.batchSize)} of ${Math.ceil(state.totalFrames / state.batchSize)}...` : 
                'Initializing advanced viewer components...'}
            </Typography>
            
            {/* Apple-style Progress indicator for batch loading */}
            {state.isLoadingBatch && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(state.loadedBatches.size / Math.ceil(state.totalFrames / state.batchSize)) * 100}
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(84, 84, 88, 0.3)' : 'rgba(198, 198, 200, 0.3)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(90deg, rgba(10, 132, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)'
                        : 'linear-gradient(90deg, rgba(0, 122, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)'
                    }
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 1.5, 
                    display: 'block',
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(60, 60, 67, 0.6)',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                >
                  {state.loadedBatches.size} of {Math.ceil(state.totalFrames / state.batchSize)} batches loaded
                </Typography>
              </Box>
            )}
            
            {/* Apple-style Study information preview */}
            <Card sx={{ 
              mt: 2, 
              p: 2.5, 
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(58, 58, 60, 0.8)'
                : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: theme.palette.mode === 'dark' 
                ? '1px solid rgba(84, 84, 88, 0.4)'
                : '1px solid rgba(198, 198, 200, 0.4)',
              borderRadius: 3,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" justifyContent="center">
                <Chip 
                  label={state.modality} 
                  size="small"
                  sx={{ 
                    fontWeight: 600,
                    background: theme.palette.mode === 'dark' 
                      ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(0, 122, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)',
                    color: 'white',
                    borderRadius: 2
                  }}
                />
                <Chip 
                  label={`${state.totalFrames} slices`} 
                  variant="outlined" 
                  size="small"
                  sx={{
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(142, 142, 147, 0.6)' : 'rgba(142, 142, 147, 0.5)',
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 67, 0.8)',
                    borderRadius: 2,
                    fontWeight: 500
                  }}
                />
                <Chip 
                  label={state.studyType} 
                  variant="outlined" 
                  size="small"
                  sx={{
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(142, 142, 147, 0.6)' : 'rgba(142, 142, 147, 0.5)',
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 67, 0.8)',
                    borderRadius: 2,
                    fontWeight: 500
                  }}
                />
              </Stack>
            </Card>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={{ 
        position: 'relative', 
        height: '100%', 
        overflow: 'hidden',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, rgba(28, 28, 30, 0.98) 0%, rgba(44, 44, 46, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(248, 248, 248, 0.98) 0%, rgba(242, 242, 247, 0.95) 100%)',
        borderRadius: 3,
        border: theme.palette.mode === 'dark' 
          ? '1px solid rgba(84, 84, 88, 0.2)'
          : '1px solid rgba(198, 198, 200, 0.2)',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
      }}>
        {/* Conditional rendering: MPR Viewer or Main Canvas */}
        {state.mprMode && state.volumeData ? (
          <Box
            sx={{
              height: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              '& .mpr-viewer-container': {
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(28, 28, 30, 0.95)'
                  : 'rgba(248, 248, 248, 0.95)',
                borderRadius: 3
              }
            }}
          >
            <MPRViewer
              study={study}
              imageIds={state.imageData}
              volumeData={state.volumeData}
              settings={{
                windowWidth: state.windowWidth,
                windowCenter: state.windowCenter,
                crosshairEnabled: state.crosshairEnabled,
                synchronizedScrolling: true,
                renderMode: 'volume',
                opacity: 1,
                threshold: 0.5
              }}
              onSettingsChange={(settings) => {
                setState(prev => ({
                  ...prev,
                  windowWidth: settings.windowWidth || prev.windowWidth,
                  windowCenter: settings.windowCenter || prev.windowCenter,
                  crosshairEnabled: settings.crosshairEnabled !== undefined ? settings.crosshairEnabled : prev.crosshairEnabled
                }));
              }}
              onError={onError}
              enableAdvanced3D={enableAdvancedTools}
              enableVolumeRendering={enableWebGL}
            />
          </Box>
        ) : (
          <>
            {/* Apple-style Main Canvas */}
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(28, 28, 30, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 248, 248, 0.8) 100%)',
                cursor: state.activeTool === 'pan' ? 'grab' : 
                       state.activeTool === 'zoom' ? 'zoom-in' : 
                       state.activeTool === 'windowing' ? 'crosshair' : 
                       state.activeTool ? 'crosshair' : 'default',
                transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                filter: theme.palette.mode === 'dark' 
                  ? 'contrast(1.05) brightness(1.02)'
                  : 'contrast(1.02) brightness(0.98)'
              }}
            />

            {/* Apple-style DICOM Overlay with enhanced typography */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 10,
                '& .dicom-overlay-text': {
                  fontFamily: theme.typography.fontFamily,
                  fontSize: isMobile ? '0.75rem' : '0.8rem',
                  fontWeight: 500,
                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(60, 60, 67, 0.9)',
                  textShadow: theme.palette.mode === 'dark' 
                    ? '0 1px 3px rgba(0, 0, 0, 0.8)'
                    : '0 1px 3px rgba(255, 255, 255, 0.8)',
                  letterSpacing: '0.01em',
                  lineHeight: 1.4
                },
                '& .dicom-overlay-corner': {
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, rgba(28, 28, 30, 0.8) 0%, rgba(44, 44, 46, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 248, 248, 0.6) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  borderRadius: 2,
                  padding: '8px 12px',
                  border: theme.palette.mode === 'dark' 
                    ? '1px solid rgba(84, 84, 88, 0.3)'
                    : '1px solid rgba(198, 198, 200, 0.3)'
                }
              }}
            >
              <DicomOverlay
                study={study}
                currentFrame={state.currentFrame}
                totalFrames={state.totalFrames}
                zoom={state.zoom}
                windowWidth={state.windowWidth}
                windowCenter={state.windowCenter}
                modality={state.modality}
              />
            </Box>
          </>
        )}

        {/* Apple-style Auto Measurement and CAD Detection Overlay */}
        {enableAI && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 15,
              '& .measurement-annotation': {
                fontFamily: theme.typography.fontFamily,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 1)' : 'rgba(0, 122, 255, 1)',
                textShadow: theme.palette.mode === 'dark' 
                  ? '0 1px 3px rgba(0, 0, 0, 0.8)'
                  : '0 1px 3px rgba(255, 255, 255, 0.8)',
                letterSpacing: '0.02em'
              },
              '& .cad-finding': {
                filter: theme.palette.mode === 'dark' 
                  ? 'drop-shadow(0 2px 8px rgba(255, 69, 58, 0.4))'
                  : 'drop-shadow(0 2px 8px rgba(255, 59, 48, 0.3))'
              }
            }}
          >
            <AutoMeasurementCADOverlay
              imageId={`${study.study_uid}_${state.currentFrame}`}
              containerRef={canvasRef}
              calibration={{
                pixelSpacing: { x: 1, y: 1 },
                sliceThickness: 1,
                imageOrientation: [1, 0, 0, 0, 1, 0],
                imagePosition: { x: 0, y: 0, z: 0 },
                rescaleSlope: 1,
                rescaleIntercept: 0
              }}
              detectionResults={state.aiDetectionResults}
              onDetectionClick={(detection) => {
                console.log('CAD detection result:', detection);
                if (onAIResults) {
                  onAIResults([detection]);
                }
              }}
              autoMeasureEnabled={aiSettings.enableDetection}
              cadOverlayEnabled={aiSettings.enableDetection}
            />
          </Box>
        )}

        {/* Apple-style Text Annotation and Drawing Overlay */}
        {state.textAnnotationsEnabled && (
          <TextAnnotationDrawingOverlay
            width={canvasRef.current?.width || 512}
            height={canvasRef.current?.height || 512}
            zoom={state.zoom}
            pan={state.pan}
            rotation={state.rotation}
            enabled={state.textAnnotationsEnabled}
            mode={state.textAnnotationMode}
            onModeChange={(mode) => setState(prev => ({ ...prev, textAnnotationMode: mode }))}
            onAnnotationAdd={(annotation) => {
              console.log('Text annotation created:', annotation);
              // Convert TextAnnotation to Annotation format
              const systemAnnotation = {
                id: annotation.id,
                type: 'text' as const,
                position: { x: annotation.position.x, y: annotation.position.y },
                text: annotation.text,
                maxWidth: 200,
                alignment: 'left' as const,
                verticalAlignment: 'top' as const,
                padding: { top: 4, right: 4, bottom: 4, left: 4 },
                style: {
                  color: annotation.color,
                  opacity: 1,
                  lineWidth: 1,
                  fontSize: annotation.fontSize,
                  fontFamily: 'Arial',
                  fontWeight: 'normal' as const,
                  fontStyle: 'normal' as const
                },
                layer: 'default',
                visible: true,
                locked: false,
                timestamp: new Date(annotation.timestamp).toISOString(),
                creator: 'user',
                lastModified: new Date(annotation.timestamp).toISOString(),
                lastModifiedBy: 'user',
                metadata: {
                  imageId: study.study_uid,
                  sliceIndex: state.currentFrame,
                  confidence: 1,
                  validated: false,
                  clinicalRelevance: 'medium' as const,
                  tags: []
                }
              } as Annotation;
              
              setState(prev => ({
                ...prev,
                annotations: [...prev.annotations, systemAnnotation]
              }));
            }}
            onDrawingAdd={(drawing) => {
              console.log('Drawing created:', drawing);
              // Convert DrawingPath to Annotation format
              const systemAnnotation = {
                id: drawing.id,
                type: 'freehand' as const,
                position: drawing.points[0] ? { x: drawing.points[0].x, y: drawing.points[0].y } : { x: 0, y: 0 },
                points: drawing.points.map(p => ({ x: p.x, y: p.y })),
                smoothed: false,
                style: {
                  color: drawing.color,
                  opacity: 1,
                  lineWidth: drawing.lineWidth,
                  fontSize: 12,
                  fontFamily: 'Arial',
                  fontWeight: 'normal' as const,
                  fontStyle: 'normal' as const
                },
                layer: 'default',
                visible: true,
                locked: false,
                timestamp: new Date(drawing.timestamp).toISOString(),
                creator: 'user',
                lastModified: new Date(drawing.timestamp).toISOString(),
                lastModifiedBy: 'user',
                metadata: {
                  imageId: study.study_uid,
                  sliceIndex: state.currentFrame,
                  confidence: 1,
                  validated: false,
                  clinicalRelevance: 'medium' as const,
                  tags: []
                }
              } as Annotation;
              
              setState(prev => ({
                ...prev,
                annotations: [...prev.annotations, systemAnnotation]
              }));
            }}
          />
        )}

        {/* Enhanced Performance Metrics */}
        {enableAdvancedTools && (
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: 'flex-end'
          }}>
            {/* Rendering Performance Badge */}
            <Chip
              icon={<Speed />}
              label={`${Math.round(state.processingTime)}ms`}
              size="small"
              color={state.processingTime < 50 ? 'success' : (state.processingTime < 100 ? 'warning' : 'error')}
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />
            
            {/* Cache Status Badge */}
            <Chip
              icon={<Cached />}
              label={state.cacheHit ? 'Cached' : 'Loading'}
              size="small"
              color={state.cacheHit ? 'success' : 'default'}
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />
            
            {/* Quality Level Badge */}
            <Chip
              icon={<HighQuality />}
              label={`Q:${state.currentQuality}%`}
              size="small"
              color={state.currentQuality >= 90 ? 'success' : (state.currentQuality >= 70 ? 'warning' : 'error')}
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />
            
            {/* Batch Loading Badge */}
            <Badge badgeContent={state.loadedBatches.size} color="primary">
              <Chip
                label="Batches"
                size="small"
                variant="outlined"
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </Badge>
          </Box>
        )}

        {/* Enhanced Navigation Controls */}
        <Box sx={{ 
          position: 'absolute', 
          bottom: 20, 
          left: '50%', 
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',
          borderRadius: 3,
          p: 2,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Tooltip title="First slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('first')}
                disabled={state.currentFrame === 0}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipPrevious />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Previous slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('previous')}
                disabled={state.currentFrame === 0}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipPrevious fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Enhanced frame counter with progress bar */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            minWidth: 120,
            mx: 2
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white', 
                fontWeight: 'bold',
                mb: 0.5
              }}
            >
              {state.currentFrame + 1} / {Math.max(1, state.totalFrames)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={((state.currentFrame + 1) / Math.max(1, state.totalFrames)) * 100}
              sx={{
                width: '100%',
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            />
          </Box>
          
          <Tooltip title="Next slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('next')}
                disabled={state.currentFrame === state.totalFrames - 1}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipNext fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Last slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('last')}
                disabled={state.currentFrame === state.totalFrames - 1}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipNext />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Enhanced Zoom and Tool Controls */}
        <Box sx={{ 
          position: 'absolute', 
          top: 20, 
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',
          borderRadius: 2,
          p: 1.5,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Tooltip title="Zoom in" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleZoom(0.1)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom out" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleZoom(-0.1)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          
          <Tooltip title="Rotate right" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleRotate(90)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <RotateRight />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Rotate left" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleRotate(-90)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <RotateLeft />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          
          <Tooltip title="Reset view" arrow placement="right">
            <IconButton
              size="small"
              onClick={handleReset}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <RestartAlt />
            </IconButton>
          </Tooltip>
          
          {/* Text Annotation and Drawing Tools */}
          {enableAdvancedTools && (
            <>
              <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              
              <Tooltip title="Text annotation" arrow placement="right">
                <IconButton
                  size="small"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    textAnnotationMode: prev.textAnnotationMode === 'text' ? null : 'text',
                    textAnnotationsEnabled: prev.textAnnotationMode !== 'text'
                  }))}
                  sx={{ 
                    color: state.textAnnotationMode === 'text' ? '#667eea' : 'white',
                    backgroundColor: state.textAnnotationMode === 'text' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    '&:hover': { 
                      backgroundColor: state.textAnnotationMode === 'text' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.1)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TextFields />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Drawing tool" arrow placement="right">
                <IconButton
                  size="small"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    textAnnotationMode: prev.textAnnotationMode === 'drawing' ? null : 'drawing',
                    textAnnotationsEnabled: prev.textAnnotationMode !== 'drawing'
                  }))}
                  sx={{ 
                    color: state.textAnnotationMode === 'drawing' ? '#667eea' : 'white',
                    backgroundColor: state.textAnnotationMode === 'drawing' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    '&:hover': { 
                      backgroundColor: state.textAnnotationMode === 'drawing' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.1)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Brush />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Frame Navigation Controls */}
        <Box sx={{ 
          position: 'absolute', 
          bottom: 20, 
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',
          borderRadius: 3,
          px: 3,
          py: 1.5,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Tooltip title="First slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('first')}
                disabled={state.currentFrame === 0}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipPrevious fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Previous slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('previous')}
                disabled={state.currentFrame === 0}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipPrevious fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Enhanced frame counter with progress bar */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            minWidth: 120,
            mx: 2
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white', 
                fontWeight: 'bold',
                mb: 0.5
              }}
            >
              {state.currentFrame + 1} / {Math.max(1, state.totalFrames)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={((state.currentFrame + 1) / Math.max(1, state.totalFrames)) * 100}
              sx={{
                width: '100%',
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            />
          </Box>
          
          <Tooltip title="Next slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('next')}
                disabled={state.currentFrame === state.totalFrames - 1}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipNext fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Last slice" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => navigateFrame('last')}
                disabled={state.currentFrame === state.totalFrames - 1}
                sx={{ 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SkipNext />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Enhanced Zoom and Tool Controls */}
        <Box sx={{ 
          position: 'absolute', 
          top: 20, 
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',
          borderRadius: 2,
          p: 1.5,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Tooltip title="Zoom in" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleZoom(0.1)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom out" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleZoom(-0.1)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          
          <Tooltip title="Rotate right" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleRotate(90)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <RotateRight />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Rotate left" arrow placement="right">
            <IconButton
              size="small"
              onClick={() => handleRotate(-90)}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <RotateLeft />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          
          <Tooltip title="Reset view" arrow placement="right">
            <IconButton
              size="small"
              onClick={handleReset}
              sx={{ 
                color: 'white',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <RestartAlt />
            </IconButton>
          </Tooltip>
          
          {/* Text Annotation and Drawing Tools */}
          {enableAdvancedTools && (
            <>
              <Divider sx={{ my: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              
              <Tooltip title="Text annotation" arrow placement="right">
                <IconButton
                  size="small"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    textAnnotationMode: prev.textAnnotationMode === 'text' ? null : 'text',
                    textAnnotationsEnabled: prev.textAnnotationMode !== 'text'
                  }))}
                  sx={{ 
                    color: state.textAnnotationMode === 'text' ? '#667eea' : 'white',
                    backgroundColor: state.textAnnotationMode === 'text' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    '&:hover': { 
                      backgroundColor: state.textAnnotationMode === 'text' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.1)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TextFields />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Drawing tool" arrow placement="right">
                <IconButton
                  size="small"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    textAnnotationMode: prev.textAnnotationMode === 'drawing' ? null : 'drawing',
                    textAnnotationsEnabled: prev.textAnnotationMode !== 'drawing'
                  }))}
                  sx={{ 
                    color: state.textAnnotationMode === 'drawing' ? '#667eea' : 'white',
                    backgroundColor: state.textAnnotationMode === 'drawing' ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    '&:hover': { 
                      backgroundColor: state.textAnnotationMode === 'drawing' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.1)',
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Brush />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Performance Notification */}
        <Snackbar
          open={performanceNotification.open}
          autoHideDuration={4000}
          onClose={() => setPerformanceNotification(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& .MuiSnackbar-root': {
              top: '80px !important' // Account for toolbar
            }
          }}
        >
          <Alert 
            severity={performanceNotification.severity} 
            onClose={() => setPerformanceNotification(prev => ({ ...prev, open: false }))}
            sx={{
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${
                performanceNotification.severity === 'success' ? theme.palette.success.light :
                performanceNotification.severity === 'error' ? theme.palette.error.light :
                performanceNotification.severity === 'warning' ? theme.palette.warning.light :
                theme.palette.info.light
              }`,
              '& .MuiAlert-icon': {
                fontSize: 24
              },
              '& .MuiAlert-message': {
                fontWeight: 500
              }
            }}
            icon={
              performanceNotification.severity === 'success' ? <Cached /> :
              performanceNotification.severity === 'error' ? <ErrorIcon /> :
              performanceNotification.severity === 'warning' ? <Warning /> :
              <Info />
            }
          >
            {performanceNotification.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  };

  // Render side panel content for mobile drawer and desktop sidebar
  // Error state
  if (state.error) {
    return (
      <Paper 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${theme.palette.grey[50]} 0%, ${theme.palette.grey[100]} 100%)`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255,0,0,0.2) 2px, transparent 0)',
            backgroundSize: '50px 50px'
          }}
        />
        
        <Box sx={{ textAlign: 'center', zIndex: 1, maxWidth: 600, px: 3 }}>
          {/* Error Icon with Animation */}
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              justifyContent: 'center',
              '& .error-icon': {
                fontSize: 80,
                color: theme.palette.error.main,
                animation: 'pulse 2s infinite',
                filter: 'drop-shadow(0 4px 8px rgba(244, 67, 54, 0.3))'
              },
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.05)', opacity: 0.8 },
                '100%': { transform: 'scale(1)', opacity: 1 }
              }
            }}
          >
            <ErrorIcon className="error-icon" />
          </Box>

          {/* Enhanced Error Alert */}
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(244, 67, 54, 0.15)',
              border: `1px solid ${theme.palette.error.light}`,
              '& .MuiAlert-icon': {
                fontSize: 28
              }
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Failed to Load DICOM Study
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
              {state.error}
            </Typography>
            
            {/* Error Details */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Study ID:</strong> {study.study_uid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Modality:</strong> {study.modality}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Time:</strong> {new Date().toLocaleString()}
              </Typography>
            </Box>
          </Alert>

          {/* Recovery Actions */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={1}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => {
                setState(prev => ({ ...prev, error: null, isLoading: true }));
                // Trigger reload
                window.location.reload();
              }}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <RestartAlt sx={{ mr: 1 }} />
              Retry Loading
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={() => {
                // Try alternative loading method
                setState(prev => ({ 
                  ...prev, 
                  error: null, 
                  isLoading: true,
                  renderingMode: prev.renderingMode === 'webgl' ? 'software' : 'webgl'
                }));
              }}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                '&:hover': {
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <Settings sx={{ mr: 1 }} />
              Try Alternative Mode
            </Button>
            
            <Button
              variant="text"
              color="info"
              size="large"
              onClick={() => {
                // Copy error details to clipboard
                navigator.clipboard.writeText(`Error: ${state.error}\nStudy: ${study.study_uid}\nTime: ${new Date().toISOString()}`);
                setPerformanceNotification({
                  open: true,
                  message: 'Error details copied to clipboard',
                  severity: 'info'
                });
              }}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                '&:hover': {
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <Info sx={{ mr: 1 }} />
              Copy Error Details
            </Button>
          </Stack>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontStyle: 'italic' }}>
            If the problem persists, please contact technical support with the error details above.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden',
        borderRadius: isMobile ? 1 : 2,
        boxShadow: isMobile ? 1 : 3
      }}
    >
      {/* Main Viewer */}
      <Box 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0, // Prevent flex item from overflowing
          minHeight: isMobile ? '60vh' : 'auto'
        }}
      >
        {/* Toolbar */}
        <DicomToolbar
          studyType={state.studyType}
          modality={state.modality}
          currentFrame={state.currentFrame}
          totalFrames={state.totalFrames}
          zoom={state.zoom}
          rotation={state.rotation}
          windowWidth={state.windowWidth}
          windowCenter={state.windowCenter}
          activeTool={state.activeTool}
          recommendedTools={['measurement', 'windowing']}
          onZoom={(delta) => setState(prev => ({ ...prev, zoom: Math.min(Math.max(prev.zoom + delta, 0.1), 10) }))}
          onRotate={(angle) => setState(prev => ({ ...prev, rotation: prev.rotation + angle }))}
          onWindowing={(width, center) => setState(prev => ({ ...prev, windowWidth: width, windowCenter: center }))}
          onReset={() => setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0 }))}
          onNavigateFrame={(direction) => {
            const newFrame = direction === 'next' ? Math.min(state.currentFrame + 1, state.totalFrames - 1) :
                           direction === 'previous' ? Math.max(state.currentFrame - 1, 0) :
                           direction === 'first' ? 0 : state.totalFrames - 1;
            setState(prev => ({ ...prev, currentFrame: newFrame }));
          }}
          onToolSelect={(tool) => setState(prev => ({ ...prev, activeTool: tool }))}
          onSidebarToggle={() => setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))}
          isMobile={isMobile}
          userRole={userRole}
          mprMode={state.mprMode}
          mprViewerMode={state.mprViewerMode}
          volumeDataAvailable={state.volumeData !== null}
          onMPRToggle={() => setState(prev => ({ ...prev, mprMode: !prev.mprMode }))}
          onMPRViewerModeChange={(mode) => setState(prev => ({ ...prev, mprViewerMode: mode }))}
        />
        
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'hidden',
            position: 'relative',
            minHeight: isMobile ? 300 : 400
          }}
        >
          {renderViewerContent()}
        </Box>

        {/* Apple HIG-Inspired Status Bar */}
        <Box
          sx={{
            height: isMobile ? 52 : 44,
            background: theme.palette.mode === 'dark' 
              ? `linear-gradient(180deg, rgba(28, 28, 30, 0.95) 0%, rgba(44, 44, 46, 0.98) 100%)`
              : `linear-gradient(180deg, rgba(248, 248, 248, 0.95) 0%, rgba(242, 242, 247, 0.98) 100%)`,
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 1.5 : 3,
            borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(84, 84, 88, 0.6)' : 'rgba(198, 198, 200, 0.6)'}`,
            backdropFilter: 'blur(20px) saturate(180%)',
            position: 'relative',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? 1 : 1.5,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 -1px 0 rgba(84, 84, 88, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : '0 -1px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(90deg, transparent 0%, rgba(10, 132, 255, 0.8) 50%, transparent 100%)`
                : `linear-gradient(90deg, transparent 0%, rgba(0, 122, 255, 0.6) 50%, transparent 100%)`,
              opacity: 0.8
            }
          }}
        >
          {/* Left Status Info - Apple HIG Style */}
          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            spacing={isMobile ? 0.5 : 1.5} 
            alignItems={isMobile ? 'flex-start' : 'center'}
            sx={{ minWidth: 0 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={state.modality}
                size="small"
                color="primary"
                variant="filled"
                sx={{
                  height: isMobile ? 22 : 26,
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  fontWeight: 600,
                  borderRadius: isMobile ? 2 : 2.5,
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 122, 255, 0.9) 0%, rgba(30, 144, 255, 0.8) 100%)',
                  color: 'white',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 2px 8px rgba(10, 132, 255, 0.3)'
                    : '0 2px 8px rgba(0, 122, 255, 0.25)',
                  '& .MuiChip-label': { 
                    px: isMobile ? 1 : 1.5,
                    fontWeight: 600,
                    letterSpacing: '0.02em'
                  }
                }}
              />
              {!isMobile && (
                <Box 
                  sx={{ 
                    width: 1, 
                    height: 16, 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(84, 84, 88, 0.6)' : 'rgba(198, 198, 200, 0.8)',
                    borderRadius: 0.5
                  }} 
                />
              )}
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 600, 
                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 67, 0.8)',
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em'
                }}
              >
                {state.studyType.replace('-', ' ').toUpperCase()}
              </Typography>
            </Stack>
            
            <Chip
              label={`${state.qualityLevel.charAt(0).toUpperCase() + state.qualityLevel.slice(1)} Quality`}
              size="small"
              variant="outlined"
              sx={{
                height: isMobile ? 22 : 26,
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: 500,
                borderRadius: isMobile ? 2 : 2.5,
                borderColor: state.qualityLevel === 'diagnostic' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(52, 199, 89, 0.8)' : 'rgba(52, 199, 89, 0.6)')
                  : state.qualityLevel === 'high' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 0.8)' : 'rgba(0, 122, 255, 0.6)')
                  : state.qualityLevel === 'medium' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(255, 159, 10, 0.8)' : 'rgba(255, 149, 0, 0.6)')
                  : (theme.palette.mode === 'dark' ? 'rgba(142, 142, 147, 0.8)' : 'rgba(142, 142, 147, 0.6)'),
                color: state.qualityLevel === 'diagnostic' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(52, 199, 89, 1)' : 'rgba(52, 199, 89, 0.9)')
                  : state.qualityLevel === 'high' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 1)' : 'rgba(0, 122, 255, 0.9)')
                  : state.qualityLevel === 'medium' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(255, 159, 10, 1)' : 'rgba(255, 149, 0, 0.9)')
                  : (theme.palette.mode === 'dark' ? 'rgba(142, 142, 147, 1)' : 'rgba(142, 142, 147, 0.9)'),
                '& .MuiChip-label': { 
                  px: isMobile ? 1 : 1.5,
                  fontWeight: 500,
                  letterSpacing: '0.01em'
                }
              }}
            />
          </Stack>

          {/* Center Spacer - Hidden on mobile */}
          {!isMobile && <Box sx={{ flex: 1 }} />}

          {/* Right Status Info - Apple HIG Style */}
          <Stack 
            direction="row" 
            spacing={isMobile ? 1 : 1.5} 
            alignItems="center"
            sx={{ 
              minWidth: 0,
              ml: isMobile ? 'auto' : 0
            }}
          >
            <Chip
              icon={
                state.renderingMode === 'webgl' ? <HighQuality sx={{ fontSize: isMobile ? 14 : 16 }} /> :
                state.renderingMode === 'gpu' ? <Speed sx={{ fontSize: isMobile ? 14 : 16 }} /> :
                <Cached sx={{ fontSize: isMobile ? 14 : 16 }} />
              }
              label={isMobile ? state.renderingMode.toUpperCase().slice(0, 3) : state.renderingMode.toUpperCase()}
              size="small"
              variant="outlined"
              sx={{
                height: isMobile ? 22 : 26,
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: 500,
                borderRadius: isMobile ? 2 : 2.5,
                borderColor: state.renderingMode === 'webgl' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(52, 199, 89, 0.8)' : 'rgba(52, 199, 89, 0.6)')
                  : (theme.palette.mode === 'dark' ? 'rgba(142, 142, 147, 0.6)' : 'rgba(142, 142, 147, 0.5)'),
                color: state.renderingMode === 'webgl' 
                  ? (theme.palette.mode === 'dark' ? 'rgba(52, 199, 89, 1)' : 'rgba(52, 199, 89, 0.9)')
                  : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 67, 0.8)'),
                '& .MuiChip-label': { 
                  px: isMobile ? 0.75 : 1,
                  fontWeight: 500,
                  letterSpacing: '0.01em'
                },
                '& .MuiChip-icon': { 
                  fontSize: isMobile ? 14 : 16,
                  color: 'inherit'
                }
              }}
            />
            
            {!isMobile && (
              <Box 
                sx={{ 
                  width: 1, 
                  height: 16, 
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(84, 84, 88, 0.6)' : 'rgba(198, 198, 200, 0.8)',
                  borderRadius: 0.5
                }} 
              />
            )}
            
            <Badge
              badgeContent={state.annotations.length}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: isMobile ? '0.6rem' : '0.65rem',
                  height: isMobile ? 16 : 18,
                  minWidth: isMobile ? 16 : 18,
                  borderRadius: 2,
                  fontWeight: 600,
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.9) 0%, rgba(255, 105, 97, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 59, 48, 0.9) 0%, rgba(255, 105, 97, 0.8) 100%)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 2px 6px rgba(255, 69, 58, 0.3)'
                    : '0 2px 6px rgba(255, 59, 48, 0.25)'
                }
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 500, 
                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 67, 0.8)',
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  letterSpacing: '0.01em'
                }}
              >
                {isMobile ? 'Ann' : 'Annotations'}
              </Typography>
            </Badge>
            
            {/* Memory Usage Indicator - Enhanced Apple Style */}
            {state.memoryUsage > 0 && !isMobile && (
              <>
                <Box 
                  sx={{ 
                    width: 1, 
                    height: 16, 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(84, 84, 88, 0.6)' : 'rgba(198, 198, 200, 0.8)',
                    borderRadius: 0.5
                  }} 
                />
                <Tooltip 
                  title={`Memory Usage: ${(state.memoryUsage / 1024 / 1024).toFixed(1)} MB`}
                  arrow
                  placement="top"
                  sx={{
                    '& .MuiTooltip-tooltip': {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(44, 44, 46, 0.95)' : 'rgba(0, 0, 0, 0.9)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }
                  }}
                >
                  <Chip
                    label={`${(state.memoryUsage / 1024 / 1024).toFixed(0)}MB`}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 26,
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      borderRadius: 2.5,
                      borderColor: state.memoryUsage > 500 * 1024 * 1024 
                        ? (theme.palette.mode === 'dark' ? 'rgba(255, 159, 10, 0.8)' : 'rgba(255, 149, 0, 0.6)')
                        : (theme.palette.mode === 'dark' ? 'rgba(142, 142, 147, 0.6)' : 'rgba(142, 142, 147, 0.5)'),
                      color: state.memoryUsage > 500 * 1024 * 1024 
                        ? (theme.palette.mode === 'dark' ? 'rgba(255, 159, 10, 1)' : 'rgba(255, 149, 0, 0.9)')
                        : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(60, 60, 67, 0.8)'),
                      '& .MuiChip-label': { 
                        px: 1.5,
                        fontWeight: 500,
                        letterSpacing: '0.01em'
                      }
                    }}
                  />
                </Tooltip>
              </>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Side Panel - Responsive behavior */}
      {enableAdvancedTools && (
        <>
          {isMobile ? (
            // Mobile: Drawer overlay
            <Drawer
              anchor="bottom"
              open={state.sidebarOpen}
              onClose={() => setState(prev => ({ ...prev, sidebarOpen: false }))}
              PaperProps={{
                sx: {
                  height: '70vh',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  overflow: 'hidden'
                }
              }}
            >
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Mobile Panel Header */}
                <Box 
                  sx={{ 
                    p: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Advanced Tools
                  </Typography>
                  <IconButton 
                    onClick={() => setState(prev => ({ ...prev, sidebarOpen: false }))}
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                
                {/* Mobile Panel Content */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {renderSidePanelContent()}
                </Box>
              </Box>
            </Drawer>
          ) : (
            // Desktop: Fixed side panel
            <Box 
              sx={{ 
                width: isTablet ? 300 : 350, 
                borderLeft: 1, 
                borderColor: 'divider', 
                display: 'flex', 
                flexDirection: 'column',
                minWidth: 0
              }}
            >
              {renderSidePanelContent()}
            </Box>
          )}
        </>
      )}

      {/* LOD Control Panel */}
      {adaptiveQuality && (
        <LODControlPanel
          lodService={lodRenderingRef.current}
          isVisible={state.lodPanelVisible}
          onToggle={() => setState(prev => ({ ...prev, lodPanelVisible: !prev.lodPanelVisible }))}
        />
      )}
    </Paper>
  );
};

export default UnifiedDicomViewer;
