import { Box, CircularProgress, Fab, LinearProgress, MenuItem, Snackbar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, FormControl, InputLabel, Select, FormControlLabel, Switch, Drawer, Typography } from '@mui/material';
import { Error as ErrorIcon, Settings, SmartToy, FullscreenExit, Fullscreen, BugReport } from '@mui/icons-material';
import ErrorBoundary from '../../components/ErrorBoundary';
import DicomToolbar from './components/DicomToolbar';
import DicomSidebar from './components/DicomSidebar';
import DicomOverlay from './components/DicomOverlay';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { normalizeError } from '../../utils/errorUtils';
import { enhancedDicomService } from '../../services/enhancedDicomService';
import { Cornerstone3DService } from '../../services/cornerstone3DService';
import { Cornerstone3DToolsService } from '../../services/cornerstone3DToolsService';
import { EnhancedVTKService } from '../../services/vtkEnhancedService';
import { dicomSecurityValidator } from '../../services/dicomSecurityValidator';
import { dicomSecurityAudit } from '../../services/dicomSecurityAudit';
import { initializeDiagnosticServices } from '../../services/Diagnostic';
import { GPUCapabilities } from '../../types/GPUCapabilities';
import ViewerCore from './core/ViewerCore';
import DiagnosticPanel from './DiagnosticPanel';
import { ViewerError } from '../../types/ViewerError';
import { EnhancedVTKConfig } from '../../types/VTK';
import { Study } from '../../types/Study';
import { forwardRef, useRef, useState, useEffect, useCallback, useMemo, Suspense, useImperativeHandle } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useAccessibility } from '../Accessibility/AccessibilityProvider';
import { useRadiologyDarkMode } from './RadiologyDarkMode';
// ServiceManager integration
import ServiceManager, { useServices, ServiceManagerConfig } from './core/ServiceManager';
import { AIEnhancementModule } from '../../services/aiEnhancementModule';
import { AbnormalityDetectionService } from '../../services/abnormalityDetectionService';

// Type definitions
export interface UnifiedDicomViewerProps {
  study?: Study;
  studyAnalysis?: any;
  userRole?: 'radiologist' | 'technician' | 'referring_physician' | 'student';
  viewerMode?: 'diagnostic' | 'review' | 'teaching';
  enableAdvancedTools?: boolean;
  enableCollaboration?: boolean;
  enableAI?: boolean;
  enableWebGPU?: boolean;
  enableWebGL2?: boolean;
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;
  enableCaching?: boolean;
  enableHTJ2K?: boolean;
  enableNVJPEG2000?: boolean;
  adaptiveQuality?: boolean;
  enableSecurity?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableAccessibility?: boolean;
  targetFrameRate?: number;
  maxMemoryUsage?: number;
  enableGPUAcceleration?: boolean;
  preferredRenderingMode?: 'auto' | 'webgl' | 'canvas';
  onStudyLoad?: (study: Study) => void;
  onError?: (error: string) => void;
  onPerformanceUpdate?: (metrics: any) => void;
  width?: number;
  height?: number;
}

export interface UnifiedDicomViewerRef {
  loadStudy: (study: Study) => Promise<void>;
  setLayout: (layout: string) => void;
  setActiveTool: (toolName: string) => void;
  exportImage: () => string | null;
  toggleFullscreen: () => void;
  getPerformanceMetrics: () => any;
  resetView: () => void;
  fitToWindow: () => void;
}

// Default state values for the viewer
const defaultViewerState = {
  isInitialized: false,
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: '',
  loadingStage: 'initializing' as const,
  currentStudy: null,
  currentSeries: null,
  currentImage: null,
  priorStudy: null,
  studyMetadata: null,
  layout: 'single' as const,
  activeViewport: 'main',
  viewports: {},
  synchronizedViewports: [],
  linkedViewports: [],
  activeTool: 'WindowLevel',
  toolSettings: {},
  availableTools: [],
  windowWidth: 400,
  windowCenter: 40,
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  invert: false,
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 1,
  playbackSpeed: 1,
  sidebarOpen: false,
  toolbarVisible: true,
  overlayVisible: true,
  fullscreen: false,
  settingsOpen: false,
  performanceMetrics: {
    frameRate: 0,
    renderTime: 0,
    memoryUsage: 0,
    gpuUtilization: 0,
    cacheHitRate: 0,
    networkLatency: 0,
    loadingTime: 0,
    processingTime: 0
  },
  memoryUsage: 0,
  renderingMode: 'software' as const,
  qualityLevel: 'diagnostic' as const,
  frameRate: 0,
  gpuCapabilities: null,
  securityValidated: false,
  securityEvents: [],
  aiProcessing: false,
  aiResults: [],
  abnormalityDetections: [],
  detectedAbnormalities: [],
  aiEnhancements: [],
  collaborationActive: false,
  collaborationSessionId: null,
  participants: [],
  highContrastMode: false,
  screenReaderMode: false,
  keyboardNavigation: false,
  error: null,
  warnings: [],
  diagnosticEnabled: true,
  diagnosticsPanelOpen: false,
  gpuDiagnostics: null,
  cornerstoneDiagnostics: null,
  windowLevelDiagnostics: null,
  dataFlowDiagnostics: null,
  diagnosticEvents: [],
  diagnosticHistory: []
};

const UnifiedDicomViewer = forwardRef<UnifiedDicomViewerRef, UnifiedDicomViewerProps>(({
  study,
  studyAnalysis,
  userRole = 'radiologist',
  viewerMode = 'diagnostic',
  enableAdvancedTools = true,
  enableCollaboration = false,
  enableAI = true,
  enableWebGPU = true,
  enableWebGL2 = true,
  enableWebGL = true,
  enableProgressiveLoading = true,
  enableCaching = true,
  enableHTJ2K = true,
  enableNVJPEG2000 = true,
  adaptiveQuality = true,
  enableSecurity = true,
  enablePerformanceMonitoring = true,
  enableAccessibility = true,
  targetFrameRate = 60,
  maxMemoryUsage = 512,
  enableGPUAcceleration = true,
  preferredRenderingMode = 'auto',
  qualityPreset = 'diagnostic',
  aiConfidenceThreshold = 0.8,
  enableAIEnhancement = true,
  enableAbnormalityDetection = true,
  enableAutoWindowing = true,
  enableSmartMeasurements = true,
  defaultLayout = 'single',
  enableMultiViewport = true,
  enableSynchronization = true,
  enableLinking = true,
  enableRealTimeSync = false,
  enableAnnotationSharing = false,
  enableVoiceComments = false,
  enableAuditLogging = true,
  enableEncryption = true,
  enableWatermarking = false,
  onStudyLoad,
  onError,
  onStateChange,
  onPerformanceUpdate,
  onSecurityEvent,
  onCollaborationEvent,
  onGPUCapabilitiesDetected,
  width = '100%',
  height = '100vh',
  className,
  sx,
  theme = 'auto'
}, ref) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { announceToScreenReader } = useAccessibility();
  const { theme: radiologyTheme, preferences: radiologyPreferences, updatePreferences: updateRadiologyPreferences } = useRadiologyDarkMode();
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRefs = useRef<Record<string, HTMLDivElement>>({});
  const memoryMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const performanceMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const servicesRef = useRef<{
    cornerstone3D: Cornerstone3DService | null;
    cornerstone3DTools: Cornerstone3DToolsService | null;
    vtkEnhanced: typeof EnhancedVTKService | null;
    dicom: typeof enhancedDicomService | null;
  }>({
    cornerstone3D: null,
    cornerstone3DTools: null,
    vtkEnhanced: null,
    dicom: null
  });
  
  // State
  const [state, setState] = useState<UnifiedViewerState>({
    isInitialized: false,
    isLoading: false,
    loadingProgress: 0,
    loadingMessage: '',
    loadingStage: 'initializing',
    currentStudy: null,
    currentSeries: null,
    currentImage: null,
    priorStudy: null,
    studyMetadata: null,
    layout: defaultLayout,
    activeViewport: 'main',
    viewports: {},
    synchronizedViewports: [],
    linkedViewports: [],
    activeTool: 'WindowLevel',
    toolSettings: {},
    availableTools: [],
    aiAssistanceEnabled: enableAI,
    windowWidth: 400,
    windowCenter: 40,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    invert: false,
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 1,
    playbackSpeed: 1,
    sidebarOpen: false,
    toolbarVisible: true,
    overlayVisible: true,
    fullscreen: false,
    settingsOpen: false,
    performanceMetrics: {
      frameRate: 0,
      renderTime: 0,
      memoryUsage: 0,
      gpuUtilization: 0,
      cacheHitRate: 0,
      networkLatency: 0,
      loadingTime: 0,
      processingTime: 0
    },
    memoryUsage: 0,
    renderingMode: 'software',
    qualityLevel: 'diagnostic',
    frameRate: 0,
    gpuCapabilities: null,
    securityValidated: false,
    securityEvents: [],
    auditEnabled: enableAuditLogging,
    encryptionEnabled: enableEncryption,
    aiEnabled: enableAI,
    aiProcessing: false,
    aiResults: [],
    abnormalityDetections: [],
    detectedAbnormalities: [],
    autoWindowingActive: enableAutoWindowing,
    aiEnhancements: [],
    collaborationActive: false,
    collaborationSessionId: null,
    participants: [],
    accessibilityMode: enableAccessibility,
    highContrastMode: false,
    screenReaderMode: false,
    keyboardNavigation: false,
    error: null,
    warnings: [],
    
    // Diagnostic state
    diagnosticEnabled: true,
    diagnosticsPanelOpen: false,
    gpuDiagnostics: null,
    cornerstoneDiagnostics: null,
    windowLevelDiagnostics: null,
    dataFlowDiagnostics: null,
    diagnosticEvents: [],
    diagnosticHistory: []
  });
  
  // Additional state for studies data
  const [availableStudies, setAvailableStudies] = useState<Study[]>([]);
  const [selectedSeriesUIDs, setSelectedSeriesUIDs] = useState<string[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  
  // Memory pressure state
  const [memoryPressure, setMemoryPressure] = useState<'low' | 'medium' | 'high' | 'critical'>('low');

  // ServiceManager configuration
  const serviceManagerConfig: ServiceManagerConfig = useMemo(() => ({
    enableWebGL: enableWebGL,
    enableWebGPU: enableWebGPU,
    enableProgressiveLoading: enableProgressiveLoading,
    enableCaching: enableCaching,
    adaptiveQuality: adaptiveQuality,
    enableAI: enableAI,
    aiSettings: {
      enableEnhancement: enableAIEnhancement,
      enableDetection: enableAbnormalityDetection,
      confidenceThreshold: aiConfidenceThreshold,
      autoProcess: enableAutoWindowing
    },
    memoryLimits: {
      maxCacheSize: maxMemoryUsage * 1024 * 1024, // Convert MB to bytes
      maxTextureMemory: (maxMemoryUsage * 0.5) * 1024 * 1024, // 50% for textures
      maxPredictiveCache: (maxMemoryUsage * 0.3) * 1024 * 1024 // 30% for predictive cache
    }
  }), [
    enableWebGL,
    enableWebGPU,
    enableProgressiveLoading,
    enableCaching,
    adaptiveQuality,
    enableAI,
    enableAIEnhancement,
    enableAbnormalityDetection,
    aiConfidenceThreshold,
    enableAutoWindowing,
    maxMemoryUsage
  ]);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
    action?: React.ReactNode;
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // GPU capabilities detection
  const detectGPUCapabilities = useCallback(async (): Promise<GPUCapabilities> => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      let capabilities: GPUCapabilities = {
        webgpu: false,
        webgl2: false,
        webgl: false,
        vendor: 'unknown',
        model: 'Unknown',
        memory: 0,
        supportedFeatures: []
      };

      // Check WebGPU support
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            capabilities.webgpu = true;
            capabilities.supportedFeatures.push('webgpu');
          }
        } catch (error) {
          console.warn('WebGPU not available:', error);
        }
      }

      // Check WebGL support
      if (gl) {
        const isWebGL2 = gl instanceof WebGL2RenderingContext;
        capabilities.webgl2 = isWebGL2;
        capabilities.webgl = true;
        
        if (isWebGL2) {
          capabilities.supportedFeatures.push('webgl2');
        }
        capabilities.supportedFeatures.push('webgl');

        // Get GPU info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          
          capabilities.model = renderer || 'Unknown';
          
          if (vendor.toLowerCase().includes('nvidia')) {
            capabilities.vendor = 'nvidia';
          } else if (vendor.toLowerCase().includes('amd')) {
            capabilities.vendor = 'amd';
          } else if (vendor.toLowerCase().includes('intel')) {
            capabilities.vendor = 'intel';
          } else if (vendor.toLowerCase().includes('apple')) {
            capabilities.vendor = 'apple';
          }
        }

        // Estimate memory (rough approximation)
        const memoryInfo = gl.getExtension('WEBGL_memory_info_chromium');
        if (memoryInfo) {
          capabilities.memory = gl.getParameter(memoryInfo.GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_CHROMIUM) / 1024; // Convert to MB
        }
      }

      return capabilities;
    } catch (error) {
      console.error('Error detecting GPU capabilities:', error);
      return {
        webgpu: false,
        webgl2: false,
        webgl: false,
        vendor: 'unknown',
        model: 'Unknown',
        memory: 0,
        supportedFeatures: []
      };
    }
  }, []);

  // Memory availability check
  const checkMemoryAvailability = useCallback(() => {
    try {
      const memoryInfo = (performance as any).memory;
      
      if (memoryInfo) {
        const used = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
        const total = memoryInfo.totalJSHeapSize / (1024 * 1024); // MB
        const limit = memoryInfo.jsHeapSizeLimit / (1024 * 1024); // MB
        const available = limit - used;
        const usagePercentage = (used / limit) * 100;
        
        let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
        
        if (usagePercentage > 90) {
          pressure = 'critical';
        } else if (usagePercentage > 75) {
          pressure = 'high';
        } else if (usagePercentage > 50) {
          pressure = 'medium';
        }
        
        setMemoryPressure(pressure);
        
        return {
          used: Math.round(used),
          total: Math.round(total),
          available: Math.round(available),
          limit: Math.round(limit),
          usagePercentage: Math.round(usagePercentage),
          pressure
        };
      } else {
        // Fallback estimation
        const viewportCount = Object.keys(state.viewports).length;
        const estimatedUsage = viewportCount * 50; // 50MB per viewport
        const estimatedLimit = maxMemoryUsage;
        const available = estimatedLimit - estimatedUsage;
        const usagePercentage = (estimatedUsage / estimatedLimit) * 100;
        
        let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
        
        if (usagePercentage > 80) {
          pressure = 'critical';
        } else if (usagePercentage > 60) {
          pressure = 'high';
        } else if (usagePercentage > 40) {
          pressure = 'medium';
        }
        
        setMemoryPressure(pressure);
        
        return {
          used: estimatedUsage,
          total: estimatedLimit,
          available: Math.max(0, available),
          limit: estimatedLimit,
          usagePercentage: Math.round(usagePercentage),
          pressure
        };
      }
    } catch (error) {
      console.error('Error checking memory availability:', error);
      return {
        used: 100,
        total: maxMemoryUsage,
        available: maxMemoryUsage - 100,
        limit: maxMemoryUsage,
        usagePercentage: 20,
        pressure: 'low' as const
      };
    }
  }, [state.viewports, maxMemoryUsage]);

  // Memory cleanup function
  const performMemoryCleanup = useCallback(async () => {
    try {
      console.log('🧹 Performing memory cleanup...');
      
      // Clear unused viewports
      const unusedViewports = Object.keys(state.viewports).filter(
        viewportId => viewportId !== state.activeViewport
      );
      
      for (const viewportId of unusedViewports) {
        if (servicesRef.current.cornerstone3D) {
          await servicesRef.current.cornerstone3D.clearViewport(viewportId);
        }
      }
      
      // Clear service caches
      if (servicesRef.current.dicom) {
        await servicesRef.current.dicom.clearCache();
      }
      
      if (servicesRef.current.cornerstone3D) {
        await servicesRef.current.cornerstone3D.clearCache();
      }
      
      if (servicesRef.current.vtkEnhanced) {
        await servicesRef.current.vtkEnhanced.clearCache();
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Update memory metrics
      const memoryStatus = checkMemoryAvailability();
      setState(prev => ({
        ...prev,
        memoryUsage: memoryStatus.used,
        performanceMetrics: {
          ...prev.performanceMetrics,
          memoryUsage: memoryStatus.used
        }
      }));
      
      console.log('✅ Memory cleanup completed');
    } catch (error) {
      console.error('❌ Memory cleanup failed:', error);
    }
  }, [state.viewports, state.activeViewport, checkMemoryAvailability]);

  // Initialize services
  const initializeServices = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      loadingMessage: 'Initializing services...',
      loadingProgress: 0,
      loadingStage: 'initializing'
    }));

    try {
      // Detect GPU capabilities first
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Detecting GPU capabilities...',
        loadingProgress: 10
      }));
      
      const gpuCapabilities = await detectGPUCapabilities();
      setState(prev => ({ ...prev, gpuCapabilities }));
      
      if (onGPUCapabilitiesDetected) {
        onGPUCapabilitiesDetected(gpuCapabilities);
      }

      // Initialize Cornerstone3D Core Service
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Initializing Cornerstone3D...',
        loadingProgress: 20
      }));
      
      servicesRef.current.cornerstone3D = new Cornerstone3DService({
        gpuTier: enableGPUAcceleration ? 1 : 0,
        preferSizeOverAccuracy: qualityPreset === 'performance',
        useSharedArrayBuffer: true,
        strictZSpacingForVolumeViewport: true
      });
      
      await servicesRef.current.cornerstone3D.initialize();
      
      // Initialize Cornerstone3D Tools Service
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Initializing tools...',
        loadingProgress: 40
      }));
      
      servicesRef.current.cornerstone3DTools = new Cornerstone3DToolsService();
      await servicesRef.current.cornerstone3DTools.initialize();
      
      // Initialize VTK Enhanced Service with memory-optimized configuration
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Initializing VTK.js...',
        loadingProgress: 60
      }));
      
      // Calculate optimal memory limit based on study size and available memory
      const studyImageCount = study?.image_urls?.length || 1;
      const estimatedStudySize = studyImageCount * 2; // Rough estimate: 2MB per image
      const optimalMemoryLimit = Math.min(maxMemoryUsage, Math.max(128, estimatedStudySize * 1.5));
      
      const vtkConfig: EnhancedVTKConfig = {
        enableWebGPU: enableWebGPU && gpuCapabilities.webgpu,
        enableStreaming: enableProgressiveLoading,
        enableLOD: adaptiveQuality,
        enableVoxelManager: true,
        memoryLimit: optimalMemoryLimit,
        qualitySettings: qualityPreset === 'diagnostic' ? 'high' : qualityPreset,
        enableProgressiveLoading: enableProgressiveLoading,
        enableAdaptiveQuality: adaptiveQuality
      };
      
      servicesRef.current.vtkEnhanced = new EnhancedVTKService(vtkConfig);
      if (containerRef.current) {
        await servicesRef.current.vtkEnhanced.initialize(containerRef.current);
      }
      
      // Initialize DICOM Service
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Initializing DICOM service...',
        loadingProgress: 80
      }));
      
      servicesRef.current.dicom = enhancedDicomService;
      
      // Initialize diagnostic services
      setState(prev => ({ 
        ...prev, 
        loadingMessage: 'Initializing diagnostic services...',
        loadingProgress: 85
      }));
      
      await initializeDiagnosticServices();
      
      // Security validation
      if (enableSecurity) {
        setState(prev => ({ 
          ...prev, 
          loadingMessage: 'Validating security...',
          loadingProgress: 90
        }));
        
        const securityValid = await dicomSecurityValidator.validateEnvironment();
        setState(prev => ({ ...prev, securityValidated: securityValid }));
        
        if (enableAuditLogging) {
          await dicomSecurityAudit.logSecurityEvent({
            eventType: 'validation_success',
            severity: 'low',
            details: {
              message: 'Viewer initialization completed successfully',
              metadata: { 
                userRole,
                securityValidated: securityValid,
                initializationType: 'viewer_initialization'
              }
            }
          });
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isInitialized: true,
        loadingProgress: 100,
        loadingMessage: 'Initialization complete',
        loadingStage: 'complete'
      }));
      
      // Start performance monitoring
      if (enablePerformanceMonitoring) {
        startPerformanceMonitoring();
      }
      
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Service initialization failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [
    detectGPUCapabilities,
    enableGPUAcceleration,
    qualityPreset,
    enableWebGPU,
    enableProgressiveLoading,
    adaptiveQuality,
    maxMemoryUsage,
    enableSecurity,
    enableAuditLogging,
    enablePerformanceMonitoring,
    userRole,
    onGPUCapabilitiesDetected,
    onError
  ]);

  // Initialize diagnostic services
  const initializeDiagnosticServices = useCallback(async () => {
    try {
      console.log('🔧 Initializing diagnostic services...');
      
      // Initialize GPU diagnostics
      await gpuDiagnosticsService.initialize();
      const gpuDiagnostics = await gpuDiagnosticsService.runDiagnostics();
      
      // Initialize Cornerstone diagnostics
      await cornerstoneDiagnosticsService.initialize();
      const cornerstoneDiagnostics = await cornerstoneDiagnosticsService.getSystemDiagnostics();
      
      // Initialize Window/Level diagnostics
      await windowLevelDiagnosticsService.initialize();
      
      // Initialize Data Flow diagnostics
      await dataFlowIntegrityService.initialize();
      const dataFlowDiagnostics = await dataFlowIntegrityService.runFullCheck();
      
      // Update state with diagnostic results
      setState(prev => ({
        ...prev,
        gpuDiagnostics,
        cornerstoneDiagnostics,
        dataFlowDiagnostics,
        diagnosticEvents: [
          ...prev.diagnosticEvents,
          {
            timestamp: new Date().toISOString(),
            type: 'initialization',
            source: 'diagnostic-services',
            message: 'All diagnostic services initialized successfully',
            severity: 'info'
          }
        ]
      }));
      
      console.log('✅ Diagnostic services initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize diagnostic services:', error);
      const errorMessage = error instanceof Error ? error.message : 'Diagnostic services initialization failed';
      
      setState(prev => ({
        ...prev,
        diagnosticEvents: [
          ...prev.diagnosticEvents,
          {
            timestamp: new Date().toISOString(),
            type: 'error',
            source: 'diagnostic-services',
            message: errorMessage,
            severity: 'error'
          }
        ]
      }));
    }
  }, []);

  // Diagnostic event handlers
  const handleDiagnosticEvent = useCallback((event: any) => {
    setState(prev => ({
      ...prev,
      diagnosticEvents: [...prev.diagnosticEvents, event],
      diagnosticHistory: [...prev.diagnosticHistory, event]
    }));
  }, []);

  const runDiagnostics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, diagnosticsPanelOpen: true }));
      
      // Run all diagnostic checks
      const [gpuDiag, cornerstoneDiag, dataFlowDiag] = await Promise.all([
        gpuDiagnosticsService.runDiagnostics(),
        cornerstoneDiagnosticsService.getSystemDiagnostics(),
        dataFlowIntegrityService.runFullCheck()
      ]);
      
      // Run window/level diagnostics if image is loaded
      let windowLevelDiag = null;
      if (state.currentImage) {
        windowLevelDiag = await windowLevelDiagnosticsService.analyzeImage(state.currentImage);
      }
      
      setState(prev => ({
        ...prev,
        gpuDiagnostics: gpuDiag,
        cornerstoneDiagnostics: cornerstoneDiag,
        windowLevelDiagnostics: windowLevelDiag,
        dataFlowDiagnostics: dataFlowDiag,
        diagnosticEvents: [
          ...prev.diagnosticEvents,
          {
            timestamp: new Date().toISOString(),
            type: 'diagnostic-run',
            source: 'manual',
            message: 'Manual diagnostic check completed',
            severity: 'info'
          }
        ]
      }));
      
    } catch (error) {
      console.error('❌ Diagnostic check failed:', error);
      handleDiagnosticEvent({
        timestamp: new Date().toISOString(),
        type: 'error',
        source: 'diagnostic-run',
        message: error instanceof Error ? error.message : 'Diagnostic check failed',
        severity: 'error'
      });
    }
  }, [state.currentImage, handleDiagnosticEvent]);

  // Performance monitoring
  const startPerformanceMonitoring = useCallback(() => {
    if (performanceMonitorRef.current) {
      clearInterval(performanceMonitorRef.current);
    }

    performanceMonitorRef.current = setInterval(() => {
      const memoryStatus = checkMemoryAvailability();
      
      // Calculate FPS (simplified)
      const now = performance.now();
      const fps = Math.round(1000 / 16.67); // Approximate based on 60fps target
      
      const metrics: PerformanceMetrics = {
        fps,
        frameTime: 16.67,
        memoryUsage: memoryStatus.used,
        gpuUtilization: 0, // Would need WebGL extension for accurate measurement
        renderingMode: state.renderingMode,
        decodingTime: 0,
        loadingTime: 0,
        qualityLevel: state.qualityLevel
      };
      
      setState(prev => ({
        ...prev,
        performanceMetrics: metrics,
        memoryUsage: memoryStatus.used
      }));
      
      if (onPerformanceUpdate) {
        onPerformanceUpdate(metrics);
      }
      
      // Trigger cleanup if memory pressure is critical
      if (memoryStatus.pressure === 'critical') {
        console.warn('🚨 Critical memory pressure detected, triggering automatic cleanup');
        performMemoryCleanup();
      }
    }, 1000); // Update every second
  }, [checkMemoryAvailability, state.renderingMode, state.qualityLevel, onPerformanceUpdate, performMemoryCleanup]);

  // Load study with memory optimization
const loadStudyWithMemoryOptimization = useCallback(async (studyData: Study) => {
  try {
    // Defensive validation
    if (!studyData || typeof studyData !== 'object') {
      const msg = 'Study data is missing or invalid';
      console.error(msg, studyData);
      setState(prev => ({ ...prev, error: msg, isLoading: false }));
      onError?.(msg);
      throw new Error(msg);
    }

    const studyUid = (studyData as any).study_uid || (studyData as any).studyInstanceUID;
    if (!studyUid) {
      const msg = 'Study missing unique identifier (study_uid/studyInstanceUID)';
      console.error(msg, studyData);
      setState(prev => ({ ...prev, error: msg, isLoading: false }));
      onError?.(msg);
      throw new Error(msg);
    }

    console.log('📊 Loading study with data:', {
      study_uid: studyUid,
      patient_id: studyData.patient_id,
      modality: studyData.modality,
      hasImageUrls: !!studyData.image_urls,
      imageUrlsCount: studyData.image_urls?.length || 0
    });

    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingProgress: 0,
      loadingMessage: 'Loading study...',
      loadingStage: 'loading'
    }));

    // Memory check + cleanup
    const memoryStatus = checkMemoryAvailability();
    if (memoryStatus.pressure === 'critical') {
      console.warn('⚠️ Critical memory pressure detected, performing cleanup...');
      await performMemoryCleanup();
      const updatedMemoryStatus = checkMemoryAvailability();
      if (updatedMemoryStatus.pressure === 'critical') {
        const errMsg = 'Insufficient memory available for study loading. Please close other applications and try again.';
        setState(prev => ({ ...prev, isLoading: false, error: errMsg }));
        onError?.(errMsg);
        throw new Error(errMsg);
      }
    }

    const loadOptions = {
      enableProgressiveLoading,
      maxMemoryUsage: Math.max(64, Math.floor(memoryStatus.available * 0.8)),
      enableCompression: true,
      qualityLevel: memoryStatus.pressure === 'high' ? 'medium' : 'high'
    };

    console.log('📊 Loading study with memory optimization:', loadOptions);

    setState(prev => ({
      ...prev,
      loadingMessage: 'Processing DICOM data...',
      loadingProgress: 50,
      loadingStage: 'decoding'
    }));

    // Defensive progress callback
    const safeProgressCb = (progress?: any) => {
      try {
        if (!progress) return;
        const loaded = typeof progress.loaded === 'number' ? progress.loaded : undefined;
        const total = typeof progress.total === 'number' ? progress.total : undefined;
        const percentage = typeof progress.percentage === 'number'
          ? progress.percentage
          : (typeof loaded === 'number' && typeof total === 'number' && total > 0)
            ? Math.round((loaded / total) * 100)
            : undefined;

        setState(prev => ({
          ...prev,
          loadingProgress: (percentage ?? prev.loadingProgress),
          loadingMessage: typeof progress.message === 'string'
            ? progress.message
            : (typeof loaded === 'number' && typeof total === 'number'
              ? `Loading images... ${loaded}/${total}`
              : prev.loadingMessage)
        }));
      } catch (err) {
        console.warn('safeProgressCb failed:', err);
      }
    };

    // Call service - normalized handling for returned RecoveryResult-style objects
    let loadResult: any = null;
    try {
      if (!enhancedDicomService || typeof enhancedDicomService.loadStudy !== 'function') {
        const msg = 'DICOM service not available or loadStudy not implemented';
        console.error(msg);
        throw new Error(msg);
      }
      loadResult = await enhancedDicomService.loadStudy(studyData, safeProgressCb, loadOptions);
    } catch (serviceError) {
      const norm = normalizeError(serviceError);
      console.warn('enhancedDicomService.loadStudy threw:', norm.message);
      throw new Error(norm.message);
    }

    // Handle RecoveryResult pattern { success: boolean, ... }
    if (loadResult && typeof loadResult === 'object' && 'success' in loadResult) {
      if (loadResult.success) {
        console.info('enhancedDicomService.loadStudy returned recovery SUCCESS:', loadResult.message ?? loadResult);
        setState(prev => ({
          ...prev,
          currentStudy: studyData,
          isLoading: false,
          loadingProgress: 100,
          loadingMessage: loadResult.message || 'Study loaded (recovery path)',
          loadingStage: 'complete'
        }));
        onStudyLoad?.(studyData);
        return loadResult;
      } else {
        const errMsg = loadResult.message || 'Study load failed (service recovery failure)';
        console.error('enhancedDicomService returned failure object:', loadResult);
        setState(prev => ({ ...prev, isLoading: false, error: errMsg }));
        onError?.(errMsg);
        throw new Error(errMsg);
      }
    }

    // ---- Normal success path (service returned images/payload) ----
    setState(prev => ({
      ...prev,
      loadingMessage: 'Rendering images...',
      loadingProgress: 80,
      loadingStage: 'rendering'
    }));

    console.log('[SERRVICELOAD ] loadResult (raw):', loadResult);

    // Extract images array (support many response shapes)
    const imagesArr: any[] = (() => {
      if (!loadResult) return [];
      if (Array.isArray(loadResult)) return loadResult;
      if (loadResult.images && Array.isArray(loadResult.images)) return loadResult.images;
      if (loadResult.image) return [loadResult.image];
      if (loadResult.imageId || loadResult.meta || loadResult.getPixelData) return [loadResult];
      return [];
    })();

    console.log('[SERRVICELOAD ] extracted imagesArr length:', imagesArr.length);

    if (imagesArr.length === 0) {
      console.warn('[SERRVICELOAD ] No images returned by service; marking failure');
      const errMsg = 'No images produced by loader';
      setState(prev => ({ ...prev, isLoading: false, error: errMsg }));
      onError?.(errMsg);
      throw new Error(errMsg);
    }

    // Use the first image for immediate display (viewer can handle multi-frame later)
    const firstImg = imagesArr[0];

    // Convert images to HTMLImageElements for ViewerCore compatibility
    const loadedImageElements: HTMLImageElement[] = [];
    for (let i = 0; i < imagesArr.length; i++) {
      const img = imagesArr[i];
      if (img.htmlImage instanceof HTMLImageElement) {
        loadedImageElements.push(img.htmlImage);
      } else if (img.image instanceof HTMLImageElement) {
        loadedImageElements.push(img.image);
      } else if (img.canvas instanceof HTMLCanvasElement) {
        // Convert canvas to image element
        const imgElement = new Image();
        imgElement.src = img.canvas.toDataURL();
        loadedImageElements.push(imgElement);
      } else if (typeof img.getPixelData === 'function' || img.pixelData instanceof Uint8Array) {
        // Create image element from pixel data
        const canvas = document.createElement('canvas');
        const rows = img.rows || img.height || img.meta?.Rows || 512;
        const cols = img.columns || img.width || img.meta?.Columns || 512;
        canvas.width = cols;
        canvas.height = rows;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          const pixelData = typeof img.getPixelData === 'function' ? img.getPixelData() : img.pixelData;
          const imageData = ctx.createImageData(cols, rows);
          
          // Convert grayscale to RGBA
          for (let j = 0, k = 0; j < pixelData.length && k < imageData.data.length; j++, k += 4) {
            const v = pixelData[j];
            imageData.data[k] = v;
            imageData.data[k + 1] = v;
            imageData.data[k + 2] = v;
            imageData.data[k + 3] = 255;
          }
          ctx.putImageData(imageData, 0, 0);
          
          const imgElement = new Image();
          imgElement.src = canvas.toDataURL();
          loadedImageElements.push(imgElement);
        }
      }
    }

    console.log('[SERRVICELOAD ] converted', loadedImageElements.length, 'images for ViewerCore');

    // Update state with loaded images for ViewerCore
    setState(prev => ({
      ...prev,
      loadedImages: loadedImageElements,
      totalFrames: loadedImageElements.length,
      currentFrame: 0
    }));

    // Remove previous fallback canvas if present
    try {
      const existing = containerRef.current?.querySelector('#dicom-fallback-canvas') as HTMLElement | null;
      if (existing && existing.parentElement) {
        existing.parentElement.removeChild(existing);
        console.log('[SERRVICELOAD ] removed existing fallback canvas');
      }
    } catch (remErr) {
      console.warn('[SERRVICELOAD ] remove fallback canvas failed:', remErr);
    }

    // --- VTK.js rendering path (replaces Cornerstone usage) ---
    const vtkSvc = servicesRef.current?.vtkEnhanced;
    const viewportEl = (viewportRefs.current && viewportRefs.current[state.activeViewport]) || containerRef.current;
    const logImageMeta = (img: any) => {
      try {
        const meta = {
          imageId: img.imageId || img.meta?.imageId || '(no-id)',
          rows: img.rows || img.meta?.Rows || img.height,
          columns: img.columns || img.meta?.Columns || img.width,
          bitsAllocated: img.bitsAllocated || img.meta?.BitsAllocated,
          samplesPerPixel: img.samplesPerPixel || img.meta?.SamplesPerPixel,
          transferSyntax: img.transferSyntax || img.meta?.TransferSyntaxUID || '(unknown)',
          sizeBytes: img.sizeInBytes || img.byteLength || (img.pixelData ? img.pixelData.length : undefined)
        };
        console.log('[SERRVICELOAD ] image metadata:', meta);
      } catch (e) {
        console.warn('[SERRVICELOAD ] failed to log image meta', e);
      }
    };

    logImageMeta(firstImg);

    // Try VTK render for 2D image first
    if (vtkSvc && viewportEl) {
      try {
        console.log('[SERRVICELOAD ] Attempting VTK rendering path (2D/volume) using EnhancedVTKService');

        // If image has pixel buffer (2D single slice)
        const hasPixelBuffer = typeof firstImg.getPixelData === 'function' || firstImg.pixelData instanceof Uint8Array || firstImg.pixelBuffer instanceof ArrayBuffer;
        // If server returned multiple slices (imagesArr length > 1) we attempt volume render
        const isVolume = imagesArr.length > 1;

        // If VTK exposes 'renderImageInViewport' for 2D and 'renderVolumeFromSlices' for volume, use them.
        if (!isVolume && hasPixelBuffer && typeof vtkSvc.renderImageInViewport === 'function') {
          // Build payload
          const pixelData = typeof firstImg.getPixelData === 'function'
            ? firstImg.getPixelData()
            : (firstImg.pixelData instanceof Uint8Array ? firstImg.pixelData : new Uint8Array(firstImg.pixelBuffer || 0));

          const payload = {
            pixelData,
            rows: firstImg.rows || firstImg.height || firstImg.meta?.Rows,
            columns: firstImg.columns || firstImg.width || firstImg.meta?.Columns,
            bitsAllocated: firstImg.bitsAllocated || firstImg.meta?.BitsAllocated || 8,
            samplesPerPixel: firstImg.samplesPerPixel || firstImg.meta?.SamplesPerPixel || 1,
            photometricInterpretation: firstImg.photometricInterpretation || firstImg.meta?.PhotometricInterpretation,
            spacing: firstImg.pixelSpacing || firstImg.meta?.PixelSpacing || [1, 1],
            windowCenter: firstImg.windowCenter || firstImg.meta?.WindowCenter,
            windowWidth: firstImg.windowWidth || firstImg.meta?.WindowWidth,
            imageId: firstImg.imageId || ''
          };

          console.log('[SERRVICELOAD ] calling vtkSvc.renderImageInViewport with payload keys:', Object.keys(payload));
          await vtkSvc.renderImageInViewport(viewportEl, payload);
          console.log('[SERRVICELOAD ] vtkSvc.renderImageInViewport succeeded for', payload.imageId || '(no-id)');

          setState(prev => ({
            ...prev,
            currentStudy: studyData,
            currentImage: firstImg,
            isLoading: false,
            loadingProgress: 100,
            loadingMessage: 'Study loaded (VTK 2D display)',
            loadingStage: 'complete'
          }));
          onStudyLoad?.(studyData);
          return loadResult;
        }

        // If it's a volume (multiple slices) and service supports volume rendering
        if (isVolume && typeof vtkSvc.renderVolumeFromSlices === 'function') {
          console.log('[SERRVICELOAD ] preparing slices payload for VTK volume renderer (slices count:', imagesArr.length, ')');

          const slicesPayload = await Promise.all(imagesArr.map(async (slice: any, idx: number) => {
            // normalize pixel buffer for slice
            const slicePixelData = typeof slice.getPixelData === 'function'
              ? slice.getPixelData()
              : (slice.pixelData instanceof Uint8Array ? slice.pixelData : new Uint8Array(slice.pixelBuffer || 0));

            return {
              index: idx,
              pixelData: slicePixelData,
              rows: slice.rows || slice.height || slice.meta?.Rows,
              columns: slice.columns || slice.width || slice.meta?.Columns,
              spacingBetweenSlices: slice.sliceThickness || slice.meta?.SliceThickness || 1,
              spacing: slice.pixelSpacing || slice.meta?.PixelSpacing || [1, 1],
              imageId: slice.imageId || slice.meta?.SOPInstanceUID || `slice_${idx}`
            };
          }));

          console.log('[SERRVICELOAD ] calling vtkSvc.renderVolumeFromSlices with', slicesPayload.length, 'slices');
          await vtkSvc.renderVolumeFromSlices(viewportEl, { slices: slicesPayload, quality: loadOptions.qualityLevel });

          console.log('[SERRVICELOAD ] vtkSvc.renderVolumeFromSlices succeeded for study', studyUid);
          setState(prev => ({
            ...prev,
            currentStudy: studyData,
            currentImage: { volumeRendered: true, sliceCount: slicesPayload.length },
            isLoading: false,
            loadingProgress: 100,
            loadingMessage: 'Study loaded (VTK volume rendering)',
            loadingStage: 'complete'
          }));
          onStudyLoad?.(studyData);
          return loadResult;
        }

        // If VTK doesn't support the desired method, fall through to canvas fallback
        console.warn('[SERRVICELOAD ] VTK service present but required render method not found (renderImageInViewport/renderVolumeFromSlices). Falling back to canvas rendering.');
      } catch (vtkErr) {
        console.error('[SERRVICELOAD ] VTK rendering failed, falling back to canvas drawing:', vtkErr);
      }
    } else {
      console.log('[SERRVICELOAD ] VTK service or viewport element not available; skipping VTK rendering');
    }

    // 2) Fallback: draw pixel buffer / canvas / HTMLImage (same as previous fallback)
    try {
      // If service returned an actual canvas element
      if (firstImg.canvas instanceof HTMLCanvasElement) {
        const canvas = firstImg.canvas as HTMLCanvasElement;
        canvas.id = 'dicom-fallback-canvas';
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        canvas.style.zIndex = '999';
        containerRef.current?.appendChild(canvas);
        console.log('[SERRVICELOAD ] appended provided canvas into containerRef for', firstImg.imageId || '');
      }
      // HTMLImage fallback
      else if (firstImg.htmlImage instanceof HTMLImageElement || firstImg.image instanceof HTMLImageElement) {
        const imgEl = (firstImg.htmlImage || firstImg.image) as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.id = 'dicom-fallback-canvas';
        canvas.width = imgEl.naturalWidth || imgEl.width || 512;
        canvas.height = imgEl.naturalHeight || imgEl.height || 512;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '999';
        containerRef.current?.appendChild(canvas);
        console.log('[SERRVICELOAD ] drew htmlImage into fallback canvas for', firstImg.imageId || '');
      }
      // Pixel buffer fallback
      else if (typeof firstImg.getPixelData === 'function' || firstImg.pixelData instanceof Uint8Array || firstImg.pixelBuffer instanceof ArrayBuffer) {
        const pixelData = typeof firstImg.getPixelData === 'function'
          ? firstImg.getPixelData()
          : (firstImg.pixelData instanceof Uint8Array ? firstImg.pixelData : new Uint8Array(firstImg.pixelBuffer || 0));

        const rows = firstImg.rows || firstImg.height || firstImg.meta?.Rows || firstImg.meta?.rows;
        const cols = firstImg.columns || firstImg.width || firstImg.meta?.Columns || firstImg.meta?.columns;
        if (!rows || !cols) {
          console.warn('[SERRVICELOAD ] pixel buffer present but missing rows/columns metadata:', { rows, cols });
          throw new Error('Missing image dimensions to draw pixel buffer');
        }

        // Create canvas and ImageData (assume grayscale 8-bit for simplicity)
        const canvas = document.createElement('canvas');
        canvas.id = 'dicom-fallback-canvas';
        canvas.width = cols;
        canvas.height = rows;
        const ctx = canvas.getContext('2d');
        const imageData = ctx?.createImageData(cols, rows);
        if (!imageData) throw new Error('Failed to create ImageData');

        // Map grayscale -> RGBA
        for (let i = 0, j = 0; i < pixelData.length && j < imageData.data.length; i++, j += 4) {
          const v = pixelData[i];
          imageData.data[j] = v;
          imageData.data[j + 1] = v;
          imageData.data[j + 2] = v;
          imageData.data[j + 3] = 255;
        }
        ctx?.putImageData(imageData, 0, 0);

        // Style and append
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '999';
        canvas.style.objectFit = 'contain';
        containerRef.current?.appendChild(canvas);
        console.log('[SERRVICELOAD ] drew pixel buffer into fallback canvas for', firstImg.imageId || '');
      } else {
        console.warn('[SERRVICELOAD ] first image is not renderable by fallback methods. Inspect:', firstImg);
        throw new Error('No suitable rendering representation found in image object');
      }

      // Update viewer state so overlay/metadata/UI knows which image is active
      setState(prev => ({
        ...prev,
        currentStudy: studyData,
        currentImage: firstImg,
        isLoading: false,
        loadingProgress: 100,
        loadingMessage: 'Study loaded successfully (fallback)',
        loadingStage: 'complete'
      }));

      onStudyLoad?.(studyData);
      console.log('[SERRVICELOAD ] display fallback complete for study', studyUid);
      return loadResult;
    } catch (renderErr) {
      console.error('[SERRVICELOAD ] fallback rendering failed:', renderErr);
      const msg = 'Failed to render image in viewer';
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
      onError?.(renderErr instanceof Error ? renderErr : String(renderErr));
      throw renderErr;
    }
  } catch (error) {
    const norm = normalizeError(error);
    console.error('❌ Failed to load study with memory optimization:', norm.message, norm.stack || error);
    const errorMessage = norm.message || 'Failed to load study';
    setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    try { onError?.(errorMessage); } catch (e) { console.error('onError handler threw:', e); }
    // rethrow normalized Error so callers can react (viewer already handles it)
    throw new Error(errorMessage);
  }
}, [checkMemoryAvailability, performMemoryCleanup, enableProgressiveLoading, onStudyLoad, onError]);



  // Expose ref methods
  useImperativeHandle(ref, () => ({
    // Viewer control
    loadStudy: loadStudyWithMemoryOptimization,
    resetView: () => {
      setState(prev => ({
        ...prev,
        zoom: 1,
        pan: { x: 0, y: 0 },
        rotation: 0,
        windowWidth: 400,
        windowCenter: 40
      }));
    },
    fitToWindow: () => {
      // Implementation would depend on the active viewport
      console.log('Fitting to window...');
    },
    
    // Layout control
    setLayout: (layout: string) => {
      setState(prev => ({ ...prev, layout, previousLayout: prev.layout }));
    },
    toggleFullscreen: () => {
      setState(prev => ({ ...prev, fullscreen: !prev.fullscreen }));
    },
    synchronizeViewports: (enable: boolean) => {
      if (enable) {
        const allViewports = Object.keys(state.viewports);
        setState(prev => ({ ...prev, synchronizedViewports: allViewports }));
      } else {
        setState(prev => ({ ...prev, synchronizedViewports: [] }));
      }
    },
    linkViewports: (viewportIds: string[]) => {
      setState(prev => ({ ...prev, linkedViewports: viewportIds }));
    },
    
    // Tool control
    setActiveTool: (toolName: string) => {
      setState(prev => ({ ...prev, activeTool: toolName }));
    },
    getActiveTool: () => state.activeTool,
    enableTool: (toolName: string) => {
      setState(prev => ({
        ...prev,
        availableTools: [...prev.availableTools.filter(t => t !== toolName), toolName]
      }));
    },
    disableTool: (toolName: string) => {
      setState(prev => ({
        ...prev,
        availableTools: prev.availableTools.filter(t => t !== toolName)
      }));
    },
    enableAIAssistance: (enabled: boolean) => {
      setState(prev => ({ ...prev, aiAssistanceEnabled: enabled }));
    },
    
    // Export functions
    exportImage: async (format = 'png') => {
      // Implementation would depend on the active viewport
      return new Promise<string>((resolve) => {
        resolve('data:image/png;base64,');
      });
    },
    exportReport: async () => {
      return {
        studyId: state.currentStudy?.studyInstanceUID,
        measurements: [],
        annotations: [],
        timestamp: new Date()
      };
    },
    exportMeasurements: async () => {
      return [];
    },
    
    // Performance
    getPerformanceMetrics: () => state.performanceMetrics,
    optimizePerformance: () => {
      performMemoryCleanup();
    },
    clearCache: async () => {
      await performMemoryCleanup();
    },
    setQualityLevel: (level) => {
      setState(prev => ({ ...prev, qualityLevel: level }));
    },
    
    // Security
    validateSecurity: async () => {
      if (enableSecurity) {
        const isValid = await dicomSecurityValidator.validateEnvironment();
        setState(prev => ({ ...prev, securityValidated: isValid }));
        return isValid;
      }
      return true;
    },
    generateAuditReport: async () => {
      if (enableAuditLogging) {
        return await dicomSecurityAudit.generateReport();
      }
      return null;
    },
    
    // Collaboration
    startCollaborationSession: async () => {
      const sessionId = `session_${Date.now()}`;
      setState(prev => ({
        ...prev,
        collaborationActive: true,
        collaborationSessionId: sessionId
      }));
      return sessionId;
    },
    joinCollaborationSession: async (sessionId: string) => {
      setState(prev => ({
        ...prev,
        collaborationActive: true,
        collaborationSessionId: sessionId
      }));
    },
    leaveCollaborationSession: () => {
      setState(prev => ({
        ...prev,
        collaborationActive: false,
        collaborationSessionId: null,
        participants: []
      }));
    },
    
    // GPU capabilities
    getGPUCapabilities: () => state.gpuCapabilities || {
      webgpu: false,
      webgl2: false,
      webgl: false,
      vendor: 'unknown',
      model: 'Unknown',
      memory: 0,
      supportedFeatures: []
    },
    switchRenderingMode: (mode) => {
      setState(prev => ({ ...prev, renderingMode: mode }));
    }
  }), [
    loadStudyWithMemoryOptimization,
    state,
    performMemoryCleanup,
    enableSecurity,
    enableAuditLogging
  ]);

  // Initialize on mount
  useEffect(() => {
    initializeServices();
    
    return () => {
      // Cleanup on unmount
      if (memoryMonitorRef.current) {
        clearInterval(memoryMonitorRef.current);
      }
      if (performanceMonitorRef.current) {
        clearInterval(performanceMonitorRef.current);
      }
    };
  }, []); // Remove initializeServices from dependencies to prevent infinite loop

  // Load study when prop changes
  useEffect(() => {
    if (study && state.isInitialized) {
      loadStudyWithMemoryOptimization(study);
    }
  }, [study?.studyInstanceUID, state.isInitialized]); // Use study ID instead of entire study object

  // State change callback - memoize to prevent infinite calls
  const stateChangeCallback = useCallback(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [onStateChange, state.isLoading, state.error, state.loadingProgress, state.currentImageIndex]);

  useEffect(() => {
    stateChangeCallback();
  }, [stateChangeCallback]);

  // Render loading state
  if (state.isLoading || !state.isInitialized) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          ...sx
        }}
        className={className}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {state.loadingMessage}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={state.loadingProgress}
          sx={{ width: '60%', mb: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {state.loadingProgress}% complete
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
          ...sx
        }}
        className={className}
      >
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Error Loading Viewer
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 2 }}>
          {typeof state.error === 'string' ? state.error : state.error.message || 'An unknown error occurred'}
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setState(prev => ({ ...prev, error: null }));
            initializeServices();
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Main viewer render
  return (
    <ServiceManager config={serviceManagerConfig}>
      <ErrorBoundary>
        <Box
          ref={containerRef}
          sx={{
            width,
            height,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
            position: 'relative',
            overflow: 'hidden',
          ...sx
        }}
        className={className}
      >
        {/* Toolbar */}
        {state.toolbarVisible && (
          <Suspense fallback={<LinearProgress />}>
            <DicomToolbar
              activeTool={state.activeTool}
              onToolChange={(tool) => setState(prev => ({ ...prev, activeTool: tool }))}
              onLayoutChange={(layout) => setState(prev => ({ ...prev, layout }))}
              onToggleFullscreen={() => setState(prev => ({ ...prev, fullscreen: !prev.fullscreen }))}
              enableAI={enableAI}
              aiAssistanceEnabled={state.aiAssistanceEnabled}
              onToggleAI={(enabled) => setState(prev => ({ ...prev, aiAssistanceEnabled: enabled }))}
              totalFrames={state.totalFrames}
              currentFrame={state.currentFrame}
              onNavigateFrame={(direction) => {
                let newFrame = state.currentFrame;
                switch (direction) {
                  case 'next':
                    newFrame = Math.min(state.currentFrame + 1, state.totalFrames - 1);
                    break;
                  case 'previous':
                    newFrame = Math.max(state.currentFrame - 1, 0);
                    break;
                  case 'first':
                    newFrame = 0;
                    break;
                  case 'last':
                    newFrame = state.totalFrames - 1;
                    break;
                }
                setState(prev => ({ ...prev, currentFrame: newFrame }));
              }}
            />
          </Suspense>
        )}

        {/* Main content area */}
        <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
          {/* Sidebar */}
          <Drawer
            variant="persistent"
            anchor="left"
            open={state.sidebarOpen}
            sx={{
              width: state.sidebarOpen ? 300 : 0,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: 300,
                boxSizing: 'border-box',
                position: 'relative',
                height: '100%'
              }
            }}
          >
            <Suspense fallback={<CircularProgress />}>
              <DicomSidebar
                study={state.currentStudy}
                onSeriesSelect={(series) => setState(prev => ({ ...prev, currentSeries: series }))}
                onImageSelect={(image) => setState(prev => ({ ...prev, currentImage: image }))}
              />
            </Suspense>
          </Drawer>

          {/* Viewer area */}
          <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <Suspense fallback={<CircularProgress />}>
              <ViewerCore
                state={{
                  isLoading: state.isLoading,
                  error: state.error,
                  studyType: 'single-frame',
                  modality: 'CT',
                  totalFrames: state.totalFrames,
                  currentFrame: state.currentFrame,
                  imageData: [],
                  loadedImages: state.loadedImages,
                  loadedBatches: new Set(),
                  batchSize: 10,
                  isLoadingBatch: false,
                  thumbnailData: null,
                  currentQuality: 100,
                  targetQuality: 100,
                  zoom: state.zoom,
                  pan: state.pan,
                  rotation: state.rotation,
                  windowWidth: state.windowWidth,
                  windowCenter: state.windowCenter,
                  invert: state.invert,
                  sidebarOpen: state.sidebarOpen,
                  toolbarExpanded: state.toolbarVisible,
                  fullscreen: state.fullscreen,
                  activeTool: state.activeTool,
                  measurements: [],
                  renderingMode: state.renderingMode,
                  qualityLevel: state.qualityLevel,
                  cacheHit: false,
                  processingTime: 0,
                  networkProfile: 'unknown',
                  memoryUsage: state.memoryUsage,
                  annotations: [],
                  annotationLayers: [],
                  annotationGroups: [],
                  annotationTemplates: [],
                  activeAnnotationLayer: 'default',
                  activeAnnotationGroup: undefined,
                  annotationMode: false,
                  selectedAnnotationTool: undefined,
                  navigation3D: {
                    enabled: false,
                    pitch: 0,
                    yaw: 0,
                    roll: 0,
                    opacity: 1,
                    volumeOpacity: 1,
                    surfaceOpacity: 1,
                    axialSlice: 0,
                    sagittalSlice: 0,
                    coronalSlice: 0,
                    clipNear: 0,
                    clipFar: 100,
                    renderingMode: '3d' as const,
                    isAnimating: false,
                    animationSpeed: 1,
                    currentPreset: 'anterior',
                    annotations: [],
                    layers: [],
                    groups: []
                  },
                  lodPanelVisible: false,
                  zoomLevel: state.zoom,
                  aiEnhancementEnabled: state.aiEnabled,
                  enhancedImageData: null,
                  aiDetectionResults: state.aiResults,
                  aiProcessing: state.aiProcessing,
                  textAnnotationMode: null,
                  textAnnotationsEnabled: false,
                  mprMode: false,
                  mprViewerMode: 'single',
                  volumeData: null,
                  crosshairPosition: { x: 0, y: 0, z: 0 },
                  crosshairEnabled: false
                }}
                onStateChange={(updates) => {
                  setState(prev => ({
                    ...prev,
                    zoom: updates.zoom ?? prev.zoom,
                    pan: updates.pan ?? prev.pan,
                    rotation: updates.rotation ?? prev.rotation,
                    windowWidth: updates.windowWidth ?? prev.windowWidth,
                    windowCenter: updates.windowCenter ?? prev.windowCenter,
                    invert: updates.invert ?? prev.invert,
                    activeTool: updates.activeTool ?? prev.activeTool,
                    currentFrame: updates.currentFrame ?? prev.currentFrame
                  }));
                }}
                onError={(error) => setState(prev => ({ ...prev, error }))}
                enableWebGL={enableWebGL}
                enableProgressiveLoading={enableProgressiveLoading}
              />
            </Suspense>

            {/* Overlay */}
            {state.overlayVisible && (
              <Suspense fallback={null}>
                <DicomOverlay
                  study={state.currentStudy}
                  currentImage={state.currentImage}
                  windowWidth={state.windowWidth}
                  windowCenter={state.windowCenter}
                  zoom={state.zoom}
                  position="top-left"
                />
              </Suspense>
            )}

            {/* Performance monitor */}
            {enablePerformanceMonitoring && (
              <Suspense fallback={null}>
                <PerformanceMonitor
                  state={{
                    isLoading: state.isLoading,
                    error: state.error,
                    studyType: 'single-frame',
                    modality: 'CT',
                    totalFrames: state.totalFrames,
                    currentFrame: state.currentFrame,
                    imageData: [],
                    loadedImages: [],
                    loadedBatches: new Set(),
                    batchSize: 10,
                    isLoadingBatch: false,
                    thumbnailData: null,
                    currentQuality: 100,
                    targetQuality: 100,
                    zoom: state.zoom,
                    pan: state.pan,
                    rotation: state.rotation,
                    windowWidth: state.windowWidth,
                    windowCenter: state.windowCenter,
                    invert: state.invert,
                    sidebarOpen: state.sidebarOpen,
                    toolbarExpanded: state.toolbarVisible,
                    fullscreen: state.fullscreen,
                    activeTool: state.activeTool,
                    measurements: [],
                    renderingMode: state.renderingMode,
                    qualityLevel: state.qualityLevel,
                    cacheHit: false,
                    processingTime: 0,
                    networkProfile: 'unknown',
                    memoryUsage: state.memoryUsage,
                    annotations: [],
                    annotationLayers: [],
                    annotationGroups: [],
                    annotationTemplates: [],
                    activeAnnotationLayer: 'default',
                    activeAnnotationGroup: undefined,
                    annotationMode: false,
                    selectedAnnotationTool: undefined,
                    navigation3D: {
                      enabled: false,
                      pitch: 0,
                      yaw: 0,
                      roll: 0,
                      opacity: 1,
                      volumeOpacity: 1,
                      surfaceOpacity: 1,
                      axialSlice: 0,
                      sagittalSlice: 0,
                      coronalSlice: 0,
                      clipNear: 0,
                      clipFar: 100,
                      renderingMode: '3d' as const,
                      isAnimating: false,
                      animationSpeed: 1,
                      currentPreset: 'anterior',
                      annotations: [],
                      layers: [],
                      groups: []
                    },
                    lodPanelVisible: false,
                    zoomLevel: state.zoom,
                    aiEnhancementEnabled: state.aiEnabled,
                    enhancedImageData: null,
                    aiDetectionResults: state.aiResults,
                    aiProcessing: state.aiProcessing,
                    textAnnotationMode: null,
                    textAnnotationsEnabled: false,
                    mprMode: false,
                    mprViewerMode: 'single',
                    volumeData: null,
                    crosshairPosition: { x: 0, y: 0, z: 0 },
                    crosshairEnabled: false
                  }}
                  onPerformanceUpdate={(metrics) => {
                    setState(prev => ({ ...prev, performanceMetrics: metrics }));
                    onPerformanceUpdate?.(metrics);
                  }}
                  onMemoryPressure={(pressure) => {
                    console.log('Memory pressure:', pressure);
                  }}
                  configuration={{
                    targetFrameRate: targetFrameRate,
                    maxMemoryUsage: maxMemoryUsage,
                    enableGPUAcceleration: enableGPUAcceleration,
                    qualityThresholds: {
                      excellent: 90,
                      good: 70,
                      acceptable: 50,
                      poor: 30
                    }
                  }}
                />
              </Suspense>
            )}

            {/* Floating action buttons */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              {/* Diagnostics Button */}
              <Tooltip title={state.diagnosticsPanelOpen ? "Close Diagnostics" : "Open Diagnostics"}>
                <Fab
                  size="small"
                  color={state.diagnosticsPanelOpen ? "secondary" : "default"}
                  onClick={() => setState(prev => ({ ...prev, diagnosticsPanelOpen: !prev.diagnosticsPanelOpen }))}
                  sx={{ 
                    bgcolor: state.diagnosticsPanelOpen ? 'secondary.main' : 'background.paper',
                    '&:hover': {
                      bgcolor: state.diagnosticsPanelOpen ? 'secondary.dark' : 'action.hover'
                    }
                  }}
                >
                  <BugReport />
                </Fab>
              </Tooltip>

              {/* Settings Button */}
              <Tooltip title="Settings">
                <Fab
                  size="small"
                  onClick={() => setState(prev => ({ ...prev, settingsOpen: !prev.settingsOpen }))}
                >
                  <Settings />
                </Fab>
              </Tooltip>

              {/* AI assistance toggle */}
              {enableAI && (
                <Tooltip title={state.aiAssistanceEnabled ? "Disable AI" : "Enable AI"}>
                  <Fab
                    size="small"
                    color={state.aiAssistanceEnabled ? "primary" : "default"}
                    onClick={() => setState(prev => ({ ...prev, aiAssistanceEnabled: !prev.aiAssistanceEnabled }))}
                  >
                    <SmartToy />
                  </Fab>
                </Tooltip>
              )}

              {/* Fullscreen toggle */}
              <Tooltip title={state.fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                <Fab
                  size="small"
                  onClick={() => setState(prev => ({ ...prev, fullscreen: !prev.fullscreen }))}
                >
                  {state.fullscreen ? <FullscreenExit /> : <Fullscreen />}
                </Fab>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Settings dialog */}
        <Dialog
          open={state.settingsOpen}
          onClose={() => setState(prev => ({ ...prev, settingsOpen: false }))}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Viewer Settings</DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Quality Preset</InputLabel>
                  <Select
                    value={qualityPreset}
                    onChange={(e) => {
                      // Handle quality preset change
                      console.log('Quality preset changed:', e.target.value);
                    }}
                  >
                    <MenuItem value="diagnostic">Diagnostic</MenuItem>
                    <MenuItem value="preview">Preview</MenuItem>
                    <MenuItem value="high">High Quality</MenuItem>
                    <MenuItem value="ultra">Ultra Quality</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Rendering Mode</InputLabel>
                  <Select
                    value={preferredRenderingMode}
                    onChange={(e) => {
                      // Handle rendering mode change
                      console.log('Rendering mode changed:', e.target.value);
                    }}
                  >
                    <MenuItem value="auto">Auto</MenuItem>
                    <MenuItem value="webgpu">WebGPU</MenuItem>
                    <MenuItem value="webgl2">WebGL 2</MenuItem>
                    <MenuItem value="webgl">WebGL</MenuItem>
                    <MenuItem value="software">Software</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableAI}
                      onChange={(e) => {
                        // Handle AI toggle
                        console.log('AI enabled:', e.target.checked);
                      }}
                    />
                  }
                  label="Enable AI Enhancement"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setState(prev => ({ ...prev, settingsOpen: false }))}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diagnostic Panel */}
        {state.diagnosticsPanelOpen && (
          <Suspense fallback={<CircularProgress />}>
            <DiagnosticPanel
              open={state.diagnosticsPanelOpen}
              onClose={() => setState(prev => ({ ...prev, diagnosticsPanelOpen: false }))}
              diagnosticsEnabled={true}
              onToggleDiagnostics={(enabled) => console.log('Diagnostics toggled:', enabled)}
              gpuDiagnostics={state.gpuDiagnostics}
              cornerstoneDiagnostics={state.cornerstoneDiagnostics}
              windowLevelDiagnostics={state.windowLevelDiagnostics}
              dataFlowDiagnostics={state.dataFlowDiagnostics}
              diagnosticEvents={state.diagnosticEvents || []}
              diagnosticHistory={state.diagnosticHistory || []}
              onRunDiagnostics={() => console.log('Run diagnostics')}
              onClearHistory={() => console.log('Clear history')}
            />
          </Suspense>
        )}

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          message={notification.message}
          action={notification.action}
        />
      </Box>
      </ErrorBoundary>
    </ServiceManager>
  );
});

UnifiedDicomViewer.displayName = 'UnifiedDicomViewer';

export default UnifiedDicomViewer;