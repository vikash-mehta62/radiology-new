/**
 * TypeScript interfaces and types for the refactored DICOM viewer architecture
 * 
 * This file contains all type definitions for:
 * - Viewer state management
 * - Service configurations
 * - Component props and refs
 * - Event handlers and callbacks
 */

import { DetectionResult } from '../../../services/aiEnhancementModule';
import { Annotation, AnnotationLayer, AnnotationGroup, AnnotationTemplate } from '../../../services/annotationSystem';
import { Navigation3DState } from './Navigation3DTypes';

// Core viewer state interface
export interface ViewerState {
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

// State update actions
export type ViewerStateAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STUDY_METADATA'; payload: Partial<Pick<ViewerState, 'studyType' | 'modality' | 'totalFrames'>> }
  | { type: 'SET_CURRENT_FRAME'; payload: number }
  | { type: 'SET_IMAGE_DATA'; payload: string[] }
  | { type: 'ADD_LOADED_IMAGE'; payload: { index: number; image: HTMLImageElement } }
  | { type: 'SET_LOADED_BATCH'; payload: number }
  | { type: 'SET_VIEWPORT'; payload: Partial<Pick<ViewerState, 'zoom' | 'pan' | 'rotation' | 'windowWidth' | 'windowCenter' | 'invert'>> }
  | { type: 'SET_UI_STATE'; payload: Partial<Pick<ViewerState, 'sidebarOpen' | 'toolbarExpanded' | 'fullscreen'>> }
  | { type: 'SET_ACTIVE_TOOL'; payload: string | null }
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'SET_AI_STATE'; payload: Partial<Pick<ViewerState, 'aiEnhancementEnabled' | 'aiDetectionResults' | 'aiProcessing'>> }
  | { type: 'SET_MPR_STATE'; payload: Partial<Pick<ViewerState, 'mprMode' | 'mprViewerMode' | 'volumeData' | 'crosshairPosition' | 'crosshairEnabled'>> }
  | { type: 'RESET_VIEW' }
  | { type: 'BATCH_UPDATE'; payload: Partial<ViewerState> };

// Default state factory
export const createDefaultViewerState = (): ViewerState => ({
  // Core state
  isLoading: false,
  error: null,

  // Study metadata
  studyType: 'single-frame',
  modality: 'CT',
  totalFrames: 0,
  currentFrame: 0,

  // Image data management
  imageData: [],
  loadedImages: [],
  loadedBatches: new Set(),
  batchSize: 10,
  isLoadingBatch: false,
  thumbnailData: null,
  currentQuality: 100,
  targetQuality: 100,

  // Viewport state
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  windowWidth: 1,
  windowCenter: 0.5,
  invert: false,

  // UI state
  sidebarOpen: true,
  toolbarExpanded: false,
  fullscreen: false,

  // Tools and annotations
  activeTool: null,
  measurements: [],

  // Performance metrics
  renderingMode: 'software',
  qualityLevel: 'high',
  cacheHit: false,
  processingTime: 0,
  networkProfile: 'unknown',
  memoryUsage: 0,

  // Annotation state
  annotations: [],
  annotationLayers: [],
  annotationGroups: [],
  annotationTemplates: [],
  activeAnnotationLayer: 'default',
  activeAnnotationGroup: undefined,
  annotationMode: false,
  selectedAnnotationTool: undefined,

  // 3D Navigation state
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

  // LOD control panel state
  lodPanelVisible: false,

  // Zoom level for LOD calculations
  zoomLevel: 1,

  // AI Enhancement state
  aiEnhancementEnabled: false,
  enhancedImageData: null,
  aiDetectionResults: [],
  aiProcessing: false,

  // Text annotation and drawing state
  textAnnotationMode: null,
  textAnnotationsEnabled: false,

  // MPR state
  mprMode: false,
  mprViewerMode: 'single',
  volumeData: null,
  crosshairPosition: { x: 0, y: 0, z: 0 },
  crosshairEnabled: false
});

// Event handler types
export interface ViewerEventHandlers {
  onStateChange: (updates: Partial<ViewerState>) => void;
  onError: (error: string) => void;
  onFrameChange: (frame: number) => void;
  onViewportChange: (viewport: Partial<Pick<ViewerState, 'zoom' | 'pan' | 'rotation'>>) => void;
  onWindowingChange: (windowing: { windowWidth: number; windowCenter: number }) => void;
  onToolChange: (tool: string | null) => void;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  onAIResults: (results: DetectionResult[]) => void;
  onPerformanceUpdate: (metrics: any) => void;
  onMemoryPressure: (pressure: 'low' | 'medium' | 'high' | 'critical') => void;
}

// Configuration interfaces
export interface ViewerConfiguration {
  userRole: 'radiologist' | 'technician' | 'referring_physician' | 'student';
  viewerMode: 'diagnostic' | 'review' | 'comparison' | 'teaching';
  enableAdvancedTools: boolean;
  enableCollaboration: boolean;
  enableAI: boolean;
  enableWebGL: boolean;
  enableProgressiveLoading: boolean;
  enableCaching: boolean;
  adaptiveQuality: boolean;
}

export interface AIConfiguration {
  enableEnhancement: boolean;
  enableDetection: boolean;
  confidenceThreshold: number;
  autoProcess: boolean;
}

export interface PerformanceConfiguration {
  targetFrameRate: number;
  maxMemoryUsage: number;
  enableGPUAcceleration: boolean;
  qualityThresholds: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
}

// Component prop interfaces
export interface ViewerCoreProps {
  state: ViewerState;
  onStateChange: (updates: Partial<ViewerState>) => void;
  onError?: (error: string) => void;
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;
  width?: number;
  height?: number;
}

export interface ToolbarManagerProps {
  state: ViewerState;
  onStateChange: (updates: Partial<ViewerState>) => void;
  configuration: ViewerConfiguration;
  onToolChange: (tool: string | null) => void;
  onViewportReset: () => void;
  onExport: () => void;
}

export interface PerformanceMonitorProps {
  state: ViewerState;
  onPerformanceUpdate: (metrics: any) => void;
  onMemoryPressure: (pressure: 'low' | 'medium' | 'high' | 'critical') => void;
  configuration: PerformanceConfiguration;
}

// Ref interfaces
export interface ViewerCoreRef {
  getCanvas: () => HTMLCanvasElement | null;
  getWebGLContext: () => WebGL2RenderingContext | null;
  render: () => void;
  resetView: () => void;
  fitToWindow: () => void;
  exportImage: () => string | null;
}

export interface ToolbarManagerRef {
  setActiveTool: (tool: string | null) => void;
  resetTools: () => void;
  getActiveTools: () => string[];
}

// Utility types
export type ViewerStateUpdater = (updates: Partial<ViewerState>) => void;
export type ViewerStateSelector<T> = (state: ViewerState) => T;

// Hook return types
export interface UseViewerStateReturn {
  state: ViewerState;
  updateState: ViewerStateUpdater;
  resetState: () => void;
  selectState: <T>(selector: ViewerStateSelector<T>) => T;
}

export interface UseViewerServicesReturn {
  services: any; // Will be properly typed when ServiceManager is integrated
  isInitialized: boolean;
  error: string | null;
  reinitialize: () => Promise<void>;
}

// Error types
export class ViewerError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'ViewerError';
  }
}

export class ServiceInitializationError extends ViewerError {
  constructor(serviceName: string, originalError: Error) {
    super(
      `Failed to initialize ${serviceName}: ${originalError.message}`,
      'SERVICE_INIT_ERROR',
      'high'
    );
  }
}

export class RenderingError extends ViewerError {
  constructor(message: string, renderingMode: string) {
    super(
      `Rendering failed in ${renderingMode} mode: ${message}`,
      'RENDERING_ERROR',
      'medium'
    );
  }
}