/**
 * Enhanced Viewer Manager
 * Central orchestrator for seamless mode switching with state preservation and feature integration
 */

import { ErrorHandler } from './errorHandler';
import { performanceMonitor, PerformanceMonitor } from './performanceMonitor';
import { AdaptivePerformanceSystem } from './adaptivePerformanceSystem';
import { ProgressiveLoadingSystem } from './progressiveLoadingSystem';
import { MemoryManagementSystem } from './memoryManagementSystem';
import { MeasurementTools } from './measurementTools';
import { AnnotationSystem } from './annotationSystem';
import { AIEnhancementModule } from './aiEnhancementModule';
import { CollaborationModule } from './collaborationModule';

export interface ViewerMode {
  id: string;
  name: string;
  description: string;
  component: string;
  capabilities: ViewerCapability[];
  requirements: ViewerRequirements;
  configuration: ViewerConfiguration;
  state: ViewerState;
  metadata: {
    version: string;
    author: string;
    lastModified: string;
    tags: string[];
  };
}

export interface ViewerCapability {
  id: string;
  name: string;
  type: 'core' | 'enhancement' | 'collaboration' | 'ai' | 'measurement' | 'annotation';
  enabled: boolean;
  available: boolean;
  configuration?: any;
  dependencies: string[];
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage: number;
    networkUsage: number;
  };
}

export interface ViewerRequirements {
  minCpuCores: number;
  minMemoryMB: number;
  minGpuMemoryMB: number;
  requiredWebGLVersion: number;
  requiredBrowserFeatures: string[];
  networkBandwidth: number; // Mbps
  supportedFormats: string[];
}

export interface ViewerConfiguration {
  rendering: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    enableGPUAcceleration: boolean;
    maxTextureSize: number;
    enableMipmaps: boolean;
    antialiasing: boolean;
  };
  interaction: {
    enableZoom: boolean;
    enablePan: boolean;
    enableRotation: boolean;
    enableMeasurements: boolean;
    enableAnnotations: boolean;
    touchGestures: boolean;
  };
  performance: {
    enableAdaptiveQuality: boolean;
    enableProgressiveLoading: boolean;
    enableMemoryOptimization: boolean;
    maxCacheSize: number;
    preloadDistance: number;
  };
  collaboration: {
    enableRealTimeSync: boolean;
    enableVoiceChat: boolean;
    enableVideoChat: boolean;
    enableScreenShare: boolean;
  };
  ai: {
    enableImageEnhancement: boolean;
    enableAbnormalityDetection: boolean;
    enableAutoMeasurements: boolean;
    confidenceThreshold: number;
  };
}

export interface ViewerState {
  currentImageId: string | null;
  currentSliceIndex: number;
  viewport: {
    zoom: number;
    pan: { x: number; y: number };
    rotation: number;
    windowLevel: { center: number; width: number };
  };
  measurements: string[]; // measurement IDs
  annotations: string[]; // annotation IDs
  tools: {
    activeTool: string | null;
    toolSettings: { [toolId: string]: any };
  };
  ui: {
    sidebarVisible: boolean;
    toolbarVisible: boolean;
    overlaysVisible: boolean;
    fullscreen: boolean;
  };
  session: {
    startTime: string;
    lastActivity: string;
    totalInteractions: number;
    errorCount: number;
  };
}

export interface ViewerTransition {
  fromMode: string;
  toMode: string;
  preserveState: boolean;
  migrationRules: StateMigrationRule[];
  validationRules: ValidationRule[];
  rollbackPlan: RollbackPlan;
}

export interface StateMigrationRule {
  sourceProperty: string;
  targetProperty: string;
  transformer?: (value: any) => any;
  condition?: (state: ViewerState) => boolean;
}

export interface ValidationRule {
  property: string;
  validator: (value: any) => boolean;
  errorMessage: string;
  severity: 'warning' | 'error';
}

export interface RollbackPlan {
  enabled: boolean;
  timeout: number; // ms
  checkpoints: StateCheckpoint[];
  autoRollback: boolean;
}

export interface StateCheckpoint {
  id: string;
  timestamp: string;
  mode: string;
  state: ViewerState;
  metadata: any;
}

export interface ViewerManagerConfig {
  enableStatePreservation: boolean;
  enableGracefulDegradation: boolean;
  enablePerformanceMonitoring: boolean;
  enableAutoOptimization: boolean;
  transitionTimeout: number;
  maxStateHistory: number;
  debugMode: boolean;
}

class EnhancedViewerManager {
  private config: ViewerManagerConfig;
  private viewerModes: Map<string, ViewerMode> = new Map();
  private currentMode: ViewerMode | null = null;
  private stateHistory: StateCheckpoint[] = [];
  private transitions: Map<string, ViewerTransition> = new Map();
  
  // Service integrations
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private adaptivePerformance: AdaptivePerformanceSystem;
  private progressiveLoading: ProgressiveLoadingSystem;
  private memoryManager: MemoryManagementSystem;
  private measurementTools: MeasurementTools;
  private annotationSystem: AnnotationSystem;
  private aiModule: AIEnhancementModule;
  private collaborationModule: CollaborationModule;

  // Event callbacks
  private onModeChangeCallback?: (fromMode: string | null, toMode: string) => void;
  private onStateChangeCallback?: (state: ViewerState) => void;
  private onErrorCallback?: (error: Error, context: string) => void;

  constructor(
    config: Partial<ViewerManagerConfig> = {},
    services: {
      errorHandler: ErrorHandler;
      performanceMonitor: PerformanceMonitor;
      adaptivePerformance: AdaptivePerformanceSystem;
      progressiveLoading: ProgressiveLoadingSystem;
      memoryManager: MemoryManagementSystem;
      measurementTools: MeasurementTools;
      annotationSystem: AnnotationSystem;
      aiModule: AIEnhancementModule;
      collaborationModule: CollaborationModule;
    }
  ) {
    this.config = {
      enableStatePreservation: true,
      enableGracefulDegradation: true,
      enablePerformanceMonitoring: true,
      enableAutoOptimization: true,
      transitionTimeout: 5000,
      maxStateHistory: 50,
      debugMode: false,
      ...config
    };

    // Initialize services
    this.errorHandler = services.errorHandler;
    this.performanceMonitor = services.performanceMonitor;
    this.adaptivePerformance = services.adaptivePerformance;
    this.progressiveLoading = services.progressiveLoading;
    this.memoryManager = services.memoryManager;
    this.measurementTools = services.measurementTools;
    this.annotationSystem = services.annotationSystem;
    this.aiModule = services.aiModule;
    this.collaborationModule = services.collaborationModule;

    this.initialize();
  }

  /**
   * Initialize viewer manager
   */
  private async initialize(): Promise<void> {
    console.log('🎛️ [EnhancedViewerManager] Initializing...');

    try {
      // Register predefined viewer modes
      this.registerPredefinedModes();

      // Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Setup error handling
      this.setupErrorHandling();

      console.log('🎛️ [EnhancedViewerManager] Initialized successfully');
    } catch (error) {
      console.error('🎛️ [EnhancedViewerManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register predefined viewer modes
   */
  private registerPredefinedModes(): void {
    const predefinedModes: ViewerMode[] = [
      {
        id: 'simple',
        name: 'Simple Viewer',
        description: 'Basic DICOM viewing with essential features',
        component: 'UnifiedDicomViewer',
        capabilities: [
          {
            id: 'basic-rendering',
            name: 'Basic Rendering',
            type: 'core',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.2, memoryUsage: 0.1, gpuUsage: 0.1, networkUsage: 0.1 }
          },
          {
            id: 'zoom-pan',
            name: 'Zoom & Pan',
            type: 'core',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.1, memoryUsage: 0.05, gpuUsage: 0.05, networkUsage: 0 }
          }
        ],
        requirements: {
          minCpuCores: 1,
          minMemoryMB: 512,
          minGpuMemoryMB: 128,
          requiredWebGLVersion: 1,
          requiredBrowserFeatures: ['canvas', 'webgl'],
          networkBandwidth: 1,
          supportedFormats: ['dicom', 'jpeg', 'png']
        },
        configuration: {
          rendering: {
            quality: 'medium',
            enableGPUAcceleration: false,
            maxTextureSize: 1024,
            enableMipmaps: false,
            antialiasing: false
          },
          interaction: {
            enableZoom: true,
            enablePan: true,
            enableRotation: false,
            enableMeasurements: false,
            enableAnnotations: false,
            touchGestures: true
          },
          performance: {
            enableAdaptiveQuality: false,
            enableProgressiveLoading: false,
            enableMemoryOptimization: true,
            maxCacheSize: 128,
            preloadDistance: 1
          },
          collaboration: {
            enableRealTimeSync: false,
            enableVoiceChat: false,
            enableVideoChat: false,
            enableScreenShare: false
          },
          ai: {
            enableImageEnhancement: false,
            enableAbnormalityDetection: false,
            enableAutoMeasurements: false,
            confidenceThreshold: 0.8
          }
        },
        state: this.createDefaultState(),
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastModified: new Date().toISOString(),
          tags: ['basic', 'lightweight', 'mobile-friendly']
        }
      },
      {
        id: 'multi-frame',
        name: 'Multi-Frame Viewer',
        description: 'Enhanced viewer for multi-slice datasets with navigation',
        component: 'UnifiedDicomViewer',
        capabilities: [
          {
            id: 'multi-slice-navigation',
            name: 'Multi-Slice Navigation',
            type: 'core',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.3, memoryUsage: 0.2, gpuUsage: 0.15, networkUsage: 0.2 }
          },
          {
            id: 'cine-playback',
            name: 'Cine Playback',
            type: 'enhancement',
            enabled: true,
            available: true,
            dependencies: ['multi-slice-navigation'],
            performance: { cpuUsage: 0.2, memoryUsage: 0.1, gpuUsage: 0.1, networkUsage: 0.1 }
          },
          {
            id: 'progressive-loading',
            name: 'Progressive Loading',
            type: 'enhancement',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.1, memoryUsage: 0.15, gpuUsage: 0, networkUsage: 0.3 }
          }
        ],
        requirements: {
          minCpuCores: 2,
          minMemoryMB: 1024,
          minGpuMemoryMB: 256,
          requiredWebGLVersion: 1,
          requiredBrowserFeatures: ['canvas', 'webgl', 'webworkers'],
          networkBandwidth: 5,
          supportedFormats: ['dicom', 'jpeg', 'png', 'webp']
        },
        configuration: {
          rendering: {
            quality: 'high',
            enableGPUAcceleration: true,
            maxTextureSize: 2048,
            enableMipmaps: true,
            antialiasing: false
          },
          interaction: {
            enableZoom: true,
            enablePan: true,
            enableRotation: true,
            enableMeasurements: true,
            enableAnnotations: true,
            touchGestures: true
          },
          performance: {
            enableAdaptiveQuality: true,
            enableProgressiveLoading: true,
            enableMemoryOptimization: true,
            maxCacheSize: 512,
            preloadDistance: 3
          },
          collaboration: {
            enableRealTimeSync: false,
            enableVoiceChat: false,
            enableVideoChat: false,
            enableScreenShare: false
          },
          ai: {
            enableImageEnhancement: false,
            enableAbnormalityDetection: false,
            enableAutoMeasurements: false,
            confidenceThreshold: 0.8
          }
        },
        state: this.createDefaultState(),
        metadata: {
          version: '2.0.0',
          author: 'System',
          lastModified: new Date().toISOString(),
          tags: ['multi-frame', 'navigation', 'cine']
        }
      },
      {
        id: 'comprehensive',
        name: 'Comprehensive Viewer',
        description: 'Full-featured viewer with AI, collaboration, and advanced tools',
        component: 'UnifiedDicomViewer',
        capabilities: [
          {
            id: 'advanced-rendering',
            name: 'Advanced Rendering',
            type: 'core',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.4, memoryUsage: 0.3, gpuUsage: 0.4, networkUsage: 0.1 }
          },
          {
            id: 'ai-enhancement',
            name: 'AI Enhancement',
            type: 'ai',
            enabled: true,
            available: true,
            dependencies: ['advanced-rendering'],
            performance: { cpuUsage: 0.6, memoryUsage: 0.4, gpuUsage: 0.5, networkUsage: 0.2 }
          },
          {
            id: 'collaboration',
            name: 'Real-Time Collaboration',
            type: 'collaboration',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.2, memoryUsage: 0.2, gpuUsage: 0.1, networkUsage: 0.5 }
          },
          {
            id: 'advanced-measurements',
            name: 'Advanced Measurements',
            type: 'measurement',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.1, memoryUsage: 0.1, gpuUsage: 0.05, networkUsage: 0 }
          },
          {
            id: 'comprehensive-annotations',
            name: 'Comprehensive Annotations',
            type: 'annotation',
            enabled: true,
            available: true,
            dependencies: [],
            performance: { cpuUsage: 0.15, memoryUsage: 0.15, gpuUsage: 0.1, networkUsage: 0.1 }
          }
        ],
        requirements: {
          minCpuCores: 4,
          minMemoryMB: 4096,
          minGpuMemoryMB: 1024,
          requiredWebGLVersion: 2,
          requiredBrowserFeatures: ['canvas', 'webgl2', 'webworkers', 'webrtc', 'webassembly'],
          networkBandwidth: 10,
          supportedFormats: ['dicom', 'jpeg', 'png', 'webp', 'avif']
        },
        configuration: {
          rendering: {
            quality: 'ultra',
            enableGPUAcceleration: true,
            maxTextureSize: 4096,
            enableMipmaps: true,
            antialiasing: true
          },
          interaction: {
            enableZoom: true,
            enablePan: true,
            enableRotation: true,
            enableMeasurements: true,
            enableAnnotations: true,
            touchGestures: true
          },
          performance: {
            enableAdaptiveQuality: true,
            enableProgressiveLoading: true,
            enableMemoryOptimization: true,
            maxCacheSize: 2048,
            preloadDistance: 5
          },
          collaboration: {
            enableRealTimeSync: true,
            enableVoiceChat: true,
            enableVideoChat: true,
            enableScreenShare: true
          },
          ai: {
            enableImageEnhancement: true,
            enableAbnormalityDetection: true,
            enableAutoMeasurements: true,
            confidenceThreshold: 0.7
          }
        },
        state: this.createDefaultState(),
        metadata: {
          version: '3.0.0',
          author: 'System',
          lastModified: new Date().toISOString(),
          tags: ['comprehensive', 'ai', 'collaboration', 'professional']
        }
      }
    ];

    predefinedModes.forEach(mode => {
      this.viewerModes.set(mode.id, mode);
    });

    console.log('🎛️ [EnhancedViewerManager] Registered', predefinedModes.length, 'predefined modes');
  }

  /**
   * Create default viewer state
   */
  private createDefaultState(): ViewerState {
    return {
      currentImageId: null,
      currentSliceIndex: 0,
      viewport: {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        rotation: 0,
        windowLevel: { center: 128, width: 256 }
      },
      measurements: [],
      annotations: [],
      tools: {
        activeTool: null,
        toolSettings: {}
      },
      ui: {
        sidebarVisible: true,
        toolbarVisible: true,
        overlaysVisible: true,
        fullscreen: false
      },
      session: {
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalInteractions: 0,
        errorCount: 0
      }
    };
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Performance monitoring would be set up here if the methods existed
    console.log('Performance monitoring setup would happen here');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Error handling would be set up here if the method existed
    console.log('Error handling setup would happen here');
  }

  /**
   * Attempt graceful degradation on error
   */
  private async attemptGracefulDegradation(error: Error, context: any): Promise<void> {
    console.log('🎛️ [EnhancedViewerManager] Attempting graceful degradation...');

    try {
      // If current mode fails, try to switch to a simpler mode
      if (this.currentMode) {
        const fallbackMode = this.findFallbackMode(this.currentMode.id);
        if (fallbackMode) {
          await this.switchMode(fallbackMode.id, { preserveState: true, gracefulDegradation: true });
          console.log('🎛️ [EnhancedViewerManager] Gracefully degraded to:', fallbackMode.name);
        }
      }
    } catch (degradationError) {
      console.error('🎛️ [EnhancedViewerManager] Graceful degradation failed:', degradationError);
    }
  }

  /**
   * Find fallback mode for graceful degradation
   */
  private findFallbackMode(currentModeId: string): ViewerMode | null {
    const fallbackOrder = ['simple', 'multi-frame', 'comprehensive'];
    const currentIndex = fallbackOrder.indexOf(currentModeId);
    
    // Find a simpler mode
    for (let i = currentIndex - 1; i >= 0; i--) {
      const mode = this.viewerModes.get(fallbackOrder[i]);
      if (mode && this.checkModeAvailability(mode)) {
        return mode;
      }
    }
    
    return null;
  }

  /**
   * Switch viewer mode
   */
  public async switchMode(
    modeId: string, 
    options: { 
      preserveState?: boolean; 
      gracefulDegradation?: boolean;
      timeout?: number;
    } = {}
  ): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const targetMode = this.viewerModes.get(modeId);
      if (!targetMode) {
        throw new Error(`Viewer mode not found: ${modeId}`);
      }

      const fromModeId = this.currentMode?.id || null;
      
      console.log('🎛️ [EnhancedViewerManager] Switching mode from', fromModeId, 'to', modeId);

      // Check if mode is available
      if (!this.checkModeAvailability(targetMode)) {
        throw new Error(`Viewer mode not available: ${modeId}`);
      }

      // Create state checkpoint if preservation is enabled
      let checkpoint: StateCheckpoint | null = null;
      if (this.config.enableStatePreservation && this.currentMode) {
        checkpoint = this.createStateCheckpoint(this.currentMode);
      }

      // Prepare for transition
      const transition = this.getTransition(fromModeId, modeId);
      
      // Migrate state if needed
      let migratedState: ViewerState | null = null;
      if (options.preserveState && this.currentMode && transition) {
        migratedState = await this.migrateState(this.currentMode.state, targetMode, transition);
      }

      // Perform the mode switch
      const previousMode = this.currentMode;
      this.currentMode = targetMode;

      // Apply migrated state
      if (migratedState) {
        this.currentMode.state = migratedState;
      } else {
        this.currentMode.state = this.createDefaultState();
      }

      // Update performance metrics
      const switchTime = performance.now() - startTime;
      // Performance monitoring would be recorded here if the method existed

      // Notify callback
      if (this.onModeChangeCallback) {
        this.onModeChangeCallback(fromModeId, modeId);
      }

      console.log('🎛️ [EnhancedViewerManager] Mode switched successfully in', switchTime.toFixed(2), 'ms');
      return true;

    } catch (error) {
      console.error('🎛️ [EnhancedViewerManager] Mode switch failed:', error);
      this.errorHandler.handleError(error as Error, {});
      return false;
    }
  }

  /**
   
* Check if mode is available on current device
   */
  private checkModeAvailability(mode: ViewerMode): boolean {
    const startTime = performance.now();
    
    try {
      const deviceCapabilities = this.adaptivePerformance.getDeviceCapabilities();
      if (!deviceCapabilities) return false;

      const requirements = mode.requirements;

      // Check CPU requirements
      if (deviceCapabilities.cpu.cores < requirements.minCpuCores) {
        return false;
      }

      // Check memory requirements
      if (deviceCapabilities.memory.heapLimit < requirements.minMemoryMB * 1024 * 1024) {
        return false;
      }

      // Check WebGL version
      if (deviceCapabilities.gpu.webglVersion < requirements.requiredWebGLVersion) {
        return false;
      }

      // Check browser features
      for (const feature of requirements.requiredBrowserFeatures) {
        if (!deviceCapabilities.browser.features[feature as keyof typeof deviceCapabilities.browser.features]) {
          return false;
        }
      }

      // Check network bandwidth
      if (deviceCapabilities.network.downlink < requirements.networkBandwidth) {
        return false;
      }

      // Check capability dependencies
      for (const capability of mode.capabilities) {
        if (capability.enabled && !this.checkCapabilityAvailability(capability)) {
          return false;
        }
      }

      const checkTime = performance.now() - startTime;
      // Performance monitoring would be recorded here if the method existed

      return true;
    } catch (error) {
      console.error('🎛️ [EnhancedViewerManager] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Check if specific capability is available
   */
  private checkCapabilityAvailability(capability: ViewerCapability): boolean {
    // Check dependencies
    for (const depId of capability.dependencies) {
      const depCapability = this.findCapabilityInCurrentMode(depId);
      if (!depCapability || !depCapability.available) {
        return false;
      }
    }

    // Check type-specific availability
    switch (capability.type) {
      case 'ai':
        return this.aiModule !== null;
      case 'collaboration':
        return this.collaborationModule !== null;
      case 'measurement':
        return this.measurementTools !== null;
      case 'annotation':
        return this.annotationSystem !== null;
      default:
        return true;
    }
  }

  /**
   * Find capability in current mode
   */
  private findCapabilityInCurrentMode(capabilityId: string): ViewerCapability | null {
    if (!this.currentMode) return null;
    return this.currentMode.capabilities.find(cap => cap.id === capabilityId) || null;
  }

  /**
   * Get transition configuration
   */
  private getTransition(fromModeId: string | null, toModeId: string): ViewerTransition | null {
    const transitionKey = `${fromModeId || 'null'}-to-${toModeId}`;
    return this.transitions.get(transitionKey) || null;
  }

  /**
   * Migrate state between modes
   */
  private async migrateState(
    fromState: ViewerState,
    toMode: ViewerMode,
    transition: ViewerTransition
  ): Promise<ViewerState> {
    const startTime = performance.now();
    
    try {
      const migratedState: ViewerState = { ...this.createDefaultState() };

      // Apply migration rules
      for (const rule of transition.migrationRules) {
        if (rule.condition && !rule.condition(fromState)) {
          continue;
        }

        const sourceValue = this.getNestedProperty(fromState, rule.sourceProperty);
        if (sourceValue !== undefined) {
          const transformedValue = rule.transformer ? rule.transformer(sourceValue) : sourceValue;
          this.setNestedProperty(migratedState, rule.targetProperty, transformedValue);
        }
      }

      // Validate migrated state
      const validationErrors = this.validateState(migratedState, transition.validationRules);
      if (validationErrors.length > 0) {
        console.warn('🎛️ [EnhancedViewerManager] State validation warnings:', validationErrors);
      }

      const migrationTime = performance.now() - startTime;
      // Performance monitoring would be recorded here if the method existed

      console.log('🎛️ [EnhancedViewerManager] State migrated in', migrationTime.toFixed(2), 'ms');
      return migratedState;

    } catch (error) {
      console.error('🎛️ [EnhancedViewerManager] State migration failed:', error);
      return this.createDefaultState();
    }
  }

  /**
   * Get nested property value
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested property value
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Validate state against rules
   */
  private validateState(state: ViewerState, rules: ValidationRule[]): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = this.getNestedProperty(state, rule.property);
      if (!rule.validator(value)) {
        errors.push(`${rule.severity.toUpperCase()}: ${rule.errorMessage}`);
      }
    }

    return errors;
  }

  /**
   * Create state checkpoint
   */
  private createStateCheckpoint(mode: ViewerMode): StateCheckpoint {
    const checkpoint: StateCheckpoint = {
      id: `checkpoint-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode: mode.id,
      state: JSON.parse(JSON.stringify(mode.state)), // Deep copy
      metadata: {
        capabilities: mode.capabilities.map(cap => ({ id: cap.id, enabled: cap.enabled }))
      }
    };

    this.stateHistory.push(checkpoint);

    // Limit history size
    if (this.stateHistory.length > this.config.maxStateHistory) {
      this.stateHistory = this.stateHistory.slice(-this.config.maxStateHistory);
    }

    return checkpoint;
  }

  /**
   * Get current mode
   */
  public getCurrentMode(): ViewerMode | null {
    return this.currentMode;
  }

  /**
   * Get available modes
   */
  public getAvailableModes(): ViewerMode[] {
    return Array.from(this.viewerModes.values()).filter(mode => 
      this.checkModeAvailability(mode)
    );
  }

  /**
   * Get all modes
   */
  public getAllModes(): ViewerMode[] {
    return Array.from(this.viewerModes.values());
  }

  /**
   * Update current state
   */
  public updateState(updates: Partial<ViewerState>): void {
    if (!this.currentMode) return;

    // Deep merge updates
    this.currentMode.state = this.deepMerge(this.currentMode.state, updates);
    this.currentMode.state.session.lastActivity = new Date().toISOString();
    this.currentMode.state.session.totalInteractions++;

    // Notify callback
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.currentMode.state);
    }
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Register custom viewer mode
   */
  public registerMode(mode: ViewerMode): void {
    this.viewerModes.set(mode.id, mode);
    console.log('🎛️ [EnhancedViewerManager] Registered custom mode:', mode.name);
  }

  /**
   * Unregister viewer mode
   */
  public unregisterMode(modeId: string): boolean {
    const removed = this.viewerModes.delete(modeId);
    if (removed) {
      console.log('🎛️ [EnhancedViewerManager] Unregistered mode:', modeId);
    }
    return removed;
  }

  /**
   * Register mode transition
   */
  public registerTransition(transition: ViewerTransition): void {
    const key = `${transition.fromMode}-to-${transition.toMode}`;
    this.transitions.set(key, transition);
    console.log('🎛️ [EnhancedViewerManager] Registered transition:', key);
  }

  /**
   * Get mode by ID
   */
  public getMode(modeId: string): ViewerMode | null {
    return this.viewerModes.get(modeId) || null;
  }

  /**
   * Check if mode exists
   */
  public hasMode(modeId: string): boolean {
    return this.viewerModes.has(modeId);
  }

  /**
   * Get optimal mode for current device
   */
  public getOptimalMode(): ViewerMode | null {
    const availableModes = this.getAvailableModes();
    if (availableModes.length === 0) return null;

    // Score modes based on device capabilities and requirements
    const deviceCapabilities = this.adaptivePerformance.getDeviceCapabilities();
    if (!deviceCapabilities) return availableModes[0];

    let bestMode = availableModes[0];
    let bestScore = this.calculateModeScore(bestMode, deviceCapabilities);

    for (const mode of availableModes.slice(1)) {
      const score = this.calculateModeScore(mode, deviceCapabilities);
      if (score > bestScore) {
        bestMode = mode;
        bestScore = score;
      }
    }

    return bestMode;
  }

  /**
   * Calculate mode compatibility score
   */
  private calculateModeScore(mode: ViewerMode, deviceCapabilities: any): number {
    let score = 0;

    // Base score for meeting requirements
    score += 100;

    // Bonus for having extra capabilities
    const cpuRatio = deviceCapabilities.cpu.cores / mode.requirements.minCpuCores;
    const memoryRatio = (deviceCapabilities.memory.heapLimit / 1024 / 1024) / mode.requirements.minMemoryMB;
    const networkRatio = deviceCapabilities.network.downlink / mode.requirements.networkBandwidth;

    score += Math.min(cpuRatio * 20, 50);
    score += Math.min(memoryRatio * 20, 50);
    score += Math.min(networkRatio * 10, 25);

    // Penalty for high resource usage
    const totalPerformanceImpact = mode.capabilities.reduce((sum, cap) => {
      return sum + cap.performance.cpuUsage + cap.performance.memoryUsage + cap.performance.gpuUsage;
    }, 0);

    score -= totalPerformanceImpact * 10;

    return Math.max(score, 0);
  }

  /**
   * Enable capability in current mode
   */
  public enableCapability(capabilityId: string): boolean {
    if (!this.currentMode) return false;

    const capability = this.currentMode.capabilities.find(cap => cap.id === capabilityId);
    if (!capability) return false;

    if (!this.checkCapabilityAvailability(capability)) {
      console.warn('🎛️ [EnhancedViewerManager] Capability not available:', capabilityId);
      return false;
    }

    capability.enabled = true;
    console.log('🎛️ [EnhancedViewerManager] Enabled capability:', capabilityId);
    return true;
  }

  /**
   * Disable capability in current mode
   */
  public disableCapability(capabilityId: string): boolean {
    if (!this.currentMode) return false;

    const capability = this.currentMode.capabilities.find(cap => cap.id === capabilityId);
    if (!capability) return false;

    capability.enabled = false;
    console.log('🎛️ [EnhancedViewerManager] Disabled capability:', capabilityId);
    return true;
  }

  /**
   * Get enabled capabilities
   */
  public getEnabledCapabilities(): ViewerCapability[] {
    if (!this.currentMode) return [];
    return this.currentMode.capabilities.filter(cap => cap.enabled);
  }

  /**
   * Get available capabilities
   */
  public getAvailableCapabilities(): ViewerCapability[] {
    if (!this.currentMode) return [];
    return this.currentMode.capabilities.filter(cap => cap.available);
  }

  /**
   * Update mode configuration
   */
  public updateModeConfiguration(modeId: string, config: Partial<ViewerConfiguration>): boolean {
    const mode = this.viewerModes.get(modeId);
    if (!mode) return false;

    mode.configuration = this.deepMerge(mode.configuration, config);
    mode.metadata.lastModified = new Date().toISOString();

    console.log('🎛️ [EnhancedViewerManager] Updated configuration for mode:', modeId);
    return true;
  }

  /**
   * Reset mode to defaults
   */
  public resetMode(modeId: string): boolean {
    const mode = this.viewerModes.get(modeId);
    if (!mode) return false;

    mode.state = this.createDefaultState();
    console.log('🎛️ [EnhancedViewerManager] Reset mode:', modeId);
    return true;
  }

  /**
   * Get state history
   */
  public getStateHistory(): StateCheckpoint[] {
    return [...this.stateHistory];
  }

  /**
   * Restore from checkpoint
   */
  public async restoreFromCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = this.stateHistory.find(cp => cp.id === checkpointId);
    if (!checkpoint) return false;

    try {
      const mode = this.viewerModes.get(checkpoint.mode);
      if (!mode) return false;

      // Switch to the checkpoint's mode if different
      if (!this.currentMode || this.currentMode.id !== checkpoint.mode) {
        await this.switchMode(checkpoint.mode, { preserveState: false });
      }

      // Restore state
      if (this.currentMode) {
        this.currentMode.state = JSON.parse(JSON.stringify(checkpoint.state));
        console.log('🎛️ [EnhancedViewerManager] Restored from checkpoint:', checkpointId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('🎛️ [EnhancedViewerManager] Checkpoint restore failed:', error);
      return false;
    }
  }

  /**
   * Clear state history
   */
  public clearStateHistory(): void {
    this.stateHistory = [];
    console.log('🎛️ [EnhancedViewerManager] Cleared state history');
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): any {
    // Mock metrics since getMetrics doesn't exist
    return {};
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): any {
    return {
      currentMode: this.currentMode?.id || null,
      availableModes: this.getAvailableModes().length,
      totalModes: this.viewerModes.size,
      stateHistorySize: this.stateHistory.length,
      memoryUsage: 0, // Mock since getMemoryUsage doesn't exist
      performanceMetrics: {}, // Mock since getMetrics doesn't exist
      errorCount: this.currentMode?.state.session.errorCount || 0,
      uptime: this.currentMode ? 
        Date.now() - new Date(this.currentMode.state.session.startTime).getTime() : 0
    };
  }

  /**
   * Export configuration
   */
  public exportConfiguration(): any {
    return {
      modes: Array.from(this.viewerModes.entries()).map(([id, mode]) => ({
        ...mode,
        id
      })),
      transitions: Array.from(this.transitions.entries()).map(([key, transition]) => ({
        key,
        ...transition
      })),
      config: this.config,
      currentMode: this.currentMode?.id || null
    };
  }

  /**
   * Import configuration
   */
  public importConfiguration(config: any): boolean {
    try {
      // Clear existing configuration
      this.viewerModes.clear();
      this.transitions.clear();

      // Import modes
      if (config.modes) {
        config.modes.forEach((modeData: any) => {
          const { id, ...mode } = modeData;
          this.viewerModes.set(id, mode);
        });
      }

      // Import transitions
      if (config.transitions) {
        config.transitions.forEach((transitionData: any) => {
          const { key, ...transition } = transitionData;
          this.transitions.set(key, transition);
        });
      }

      // Update config
      if (config.config) {
        this.config = { ...this.config, ...config.config };
      }

      console.log('🎛️ [EnhancedViewerManager] Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('🎛️ [EnhancedViewerManager] Configuration import failed:', error);
      return false;
    }
  }

  /**
   * Set event callbacks
   */
  public setCallbacks(callbacks: {
    onModeChange?: (fromMode: string | null, toMode: string) => void;
    onStateChange?: (state: ViewerState) => void;
    onError?: (error: Error, context: string) => void;
  }): void {
    this.onModeChangeCallback = callbacks.onModeChange;
    this.onStateChangeCallback = callbacks.onStateChange;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stateHistory = [];
    this.currentMode = null;
    this.onModeChangeCallback = undefined;
    this.onStateChangeCallback = undefined;
    this.onErrorCallback = undefined;
    
    console.log('🎛️ [EnhancedViewerManager] Cleaned up resources');
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      config: this.config,
      currentMode: this.currentMode,
      availableModes: this.getAvailableModes().map(mode => ({
        id: mode.id,
        name: mode.name,
        capabilities: mode.capabilities.length,
        requirements: mode.requirements
      })),
      stateHistory: this.stateHistory.map(checkpoint => ({
        id: checkpoint.id,
        timestamp: checkpoint.timestamp,
        mode: checkpoint.mode
      })),
      systemHealth: this.getSystemHealth(),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }



  /**
   * Enable/disable capability
   */
  public toggleCapability(capabilityId: string, enabled: boolean): boolean {
    if (!this.currentMode) return false;

    const capability = this.currentMode.capabilities.find(cap => cap.id === capabilityId);
    if (!capability) return false;

    // Check if capability can be disabled (no dependents)
    if (!enabled) {
      const dependents = this.currentMode.capabilities.filter(cap => 
        cap.dependencies.includes(capabilityId) && cap.enabled
      );
      
      if (dependents.length > 0) {
        console.warn('🎛️ [EnhancedViewerManager] Cannot disable capability with active dependents:', capabilityId);
        return false;
      }
    }

    // Check if capability can be enabled (dependencies available)
    if (enabled) {
      for (const depId of capability.dependencies) {
        const dep = this.currentMode.capabilities.find(cap => cap.id === depId);
        if (!dep || !dep.enabled || !dep.available) {
          console.warn('🎛️ [EnhancedViewerManager] Cannot enable capability with missing dependencies:', capabilityId);
          return false;
        }
      }
    }

    capability.enabled = enabled;
    console.log('🎛️ [EnhancedViewerManager] Capability', capabilityId, enabled ? 'enabled' : 'disabled');
    return true;
  }

  /**
   * Restore state from checkpoint
   */
  public restoreState(checkpointId: string): boolean {
    const checkpoint = this.stateHistory.find(cp => cp.id === checkpointId);
    if (!checkpoint || !this.currentMode) return false;

    this.currentMode.state = JSON.parse(JSON.stringify(checkpoint.state));
    console.log('🎛️ [EnhancedViewerManager] State restored from checkpoint:', checkpointId);
    return true;
  }

  /**
   * Set event callbacks
   */
  public setModeChangeCallback(callback: (fromMode: string | null, toMode: string) => void): void {
    this.onModeChangeCallback = callback;
  }

  public setStateChangeCallback(callback: (state: ViewerState) => void): void {
    this.onStateChangeCallback = callback;
  }

  public setErrorCallback(callback: (error: Error, context: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    currentMode: string;
    capabilities: number;
    enabledCapabilities: number;
    memoryUsage: number;
    performanceScore: number;
  } {
    if (!this.currentMode) {
      return {
        currentMode: 'none',
        capabilities: 0,
        enabledCapabilities: 0,
        memoryUsage: 0,
        performanceScore: 0
      };
    }

    const enabledCapabilities = this.currentMode.capabilities.filter(cap => cap.enabled).length;
    const memoryStats = this.memoryManager.getStatistics();
    const performanceStats = this.adaptivePerformance.getPerformanceSummary();

    return {
      currentMode: this.currentMode.name,
      capabilities: this.currentMode.capabilities.length,
      enabledCapabilities,
      memoryUsage: memoryStats.heapUsed / (1024 * 1024), // MB
      performanceScore: this.calculatePerformanceScore()
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(): number {
    const deviceCaps = this.adaptivePerformance.getDeviceCapabilities();
    if (!deviceCaps) return 0;

    const cpuScore = this.getPerformanceScore(deviceCaps.cpu.performance);
    const gpuScore = this.getPerformanceScore(deviceCaps.gpu.performance);
    const memoryScore = this.getPerformanceScore(deviceCaps.memory.performance);
    const networkScore = this.getPerformanceScore(deviceCaps.network.performance);

    return Math.round((cpuScore + gpuScore + memoryScore + networkScore) / 4 * 25);
  }

  /**
   * Get numeric performance score
   */
  private getPerformanceScore(performance: 'low' | 'medium' | 'high' | 'ultra'): number {
    switch (performance) {
      case 'ultra': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }





  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clear state
    this.viewerModes.clear();
    this.transitions.clear();
    this.stateHistory = [];
    this.currentMode = null;

    console.log('🎛️ [EnhancedViewerManager] Disposed');
  }
}

/**
 * Factory function to create EnhancedViewerManager with all dependencies
 */
export async function createEnhancedViewerManager(
  config: Partial<ViewerManagerConfig> = {}
): Promise<EnhancedViewerManager> {
  // Import and initialize all required services
  const { ErrorHandler } = await import('./errorHandler');
  const { PerformanceMonitor } = await import('./performanceMonitor');
  const { AdaptivePerformanceSystem } = await import('./adaptivePerformanceSystem');
  const { ProgressiveLoadingSystem } = await import('./progressiveLoadingSystem');
  const { MemoryManagementSystem } = await import('./memoryManagementSystem');
  const { MeasurementTools } = await import('./measurementTools');
  const { AnnotationSystem } = await import('./annotationSystem');
  const { AIEnhancementModule } = await import('./aiEnhancementModule');
  const { CollaborationModule } = await import('./collaborationModule');

  // Initialize services
  const errorHandler = ErrorHandler.getInstance();
  const performanceMonitor = PerformanceMonitor.getInstance();
  const adaptivePerformance = new AdaptivePerformanceSystem();
  const progressiveLoading = new ProgressiveLoadingSystem();
  const memoryManager = new MemoryManagementSystem();
  const measurementTools = new MeasurementTools();
  const annotationSystem = new AnnotationSystem();
  const aiModule = new AIEnhancementModule();
  const collaborationModule = new CollaborationModule({});

  // Create and return the enhanced viewer manager
  return new EnhancedViewerManager(config, {
    errorHandler,
    performanceMonitor,
    adaptivePerformance,
    progressiveLoading,
    memoryManager,
    measurementTools,
    annotationSystem,
    aiModule,
    collaborationModule
  });
}

/**
 * Singleton instance for global access
 */
let globalViewerManager: EnhancedViewerManager | null = null;

/**
 * Get or create global viewer manager instance
 */
export async function getGlobalViewerManager(
  config: Partial<ViewerManagerConfig> = {}
): Promise<EnhancedViewerManager> {
  if (!globalViewerManager) {
    globalViewerManager = await createEnhancedViewerManager(config);
  }
  return globalViewerManager;
}

/**
 * Reset global viewer manager instance
 */
export function resetGlobalViewerManager(): void {
  if (globalViewerManager) {
    globalViewerManager.cleanup();
    globalViewerManager = null;
  }
}

// Export the main class
export { EnhancedViewerManager };

// Types are already exported when defined above