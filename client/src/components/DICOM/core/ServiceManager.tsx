/**
 * ServiceManager - Manages all DICOM viewer services
 * 
 * This component handles:
 * - Service initialization and configuration
 * - Service lifecycle management
 * - Service dependency injection
 * - Performance monitoring
 * - Memory management
 * - Cache management
 * - AI services
 * 
 * Extracted from UnifiedDicomViewer for better separation of concerns
 */

import React, { useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { ProgressiveLoadingSystem } from '../../../services/progressiveLoadingSystem';
import { IntelligentCacheManager } from '../../../services/intelligentCacheManager';
import { PerformanceMonitor } from '../../../services/performanceMonitor';
import { AIEnhancementModule } from '../../../services/aiEnhancementModule';
import { AbnormalityDetectionService } from '../../../services/abnormalityDetectionService';
import { AnnotationSystem } from '../../../services/annotationSystem';
import { PredictiveCacheService } from '../../../services/predictiveCacheService';
import { LODRenderingService } from '../../../services/lodRenderingService';
import { MemoryManager } from '../../../services/memoryManager';
import { ShaderOptimizer } from '../../../services/shaderOptimizer';
import { MemoryMonitor } from '../../../utils/memoryMonitor';

export interface ServiceManagerConfig {
  enableWebGL?: boolean;
  enableProgressiveLoading?: boolean;
  enableCaching?: boolean;
  adaptiveQuality?: boolean;
  enableAI?: boolean;
  aiSettings?: {
    enableEnhancement: boolean;
    enableDetection: boolean;
    confidenceThreshold: number;
    autoProcess: boolean;
  };
  memoryLimits?: {
    maxCacheSize: number;
    maxTextureMemory: number;
    maxPredictiveCache: number;
  };
}

export interface ServiceManagerServices {
  progressiveLoader: ProgressiveLoadingSystem | null;
  cacheManager: IntelligentCacheManager | null;
  performanceMonitor: PerformanceMonitor | null;
  aiModule: AIEnhancementModule | null;
  abnormalityDetection: AbnormalityDetectionService | null;
  annotationSystem: AnnotationSystem | null;
  predictiveCache: PredictiveCacheService | null;
  lodRendering: LODRenderingService | null;
  memoryManager: MemoryManager | null;
  shaderOptimizer: ShaderOptimizer | null;
  memoryMonitor: MemoryMonitor | null;
}

export interface ServiceManagerContextType {
  services: ServiceManagerServices;
  isInitialized: boolean;
  initializationProgress: number;
  error: string | null;
  reinitialize: () => Promise<void>;
  cleanup: () => void;
}

const ServiceManagerContext = createContext<ServiceManagerContextType | null>(null);

export const useServices = () => {
  const context = useContext(ServiceManagerContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceManager');
  }
  return context;
};

interface ServiceManagerProps {
  config: ServiceManagerConfig;
  webglContext?: WebGL2RenderingContext | null;
  onError?: (error: string) => void;
  onMemoryPressure?: (pressure: 'low' | 'medium' | 'high' | 'critical') => void;
  children: React.ReactNode;
}

const ServiceManager: React.FC<ServiceManagerProps> = ({
  config,
  webglContext,
  onError,
  onMemoryPressure,
  children
}) => {
  const servicesRef = useRef<ServiceManagerServices>({
    progressiveLoader: null,
    cacheManager: null,
    performanceMonitor: null,
    aiModule: null,
    abnormalityDetection: null,
    annotationSystem: null,
    predictiveCache: null,
    lodRendering: null,
    memoryManager: null,
    shaderOptimizer: null,
    memoryMonitor: null
  });

  const [isInitialized, setIsInitialized] = React.useState(false);
  const [initializationProgress, setInitializationProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const defaultMemoryLimits = {
    maxCacheSize: 500 * 1024 * 1024, // 500MB
    maxTextureMemory: 256 * 1024 * 1024, // 256MB
    maxPredictiveCache: 300 * 1024 * 1024 // 300MB
  };

  const memoryLimits = { ...defaultMemoryLimits, ...config.memoryLimits };

  const initializeServices = useCallback(async () => {
    try {
      setError(null);
      setInitializationProgress(0);
      
      const services = servicesRef.current;
      const totalServices = Object.keys(services).length;
      let completedServices = 0;

      const updateProgress = () => {
        completedServices++;
        setInitializationProgress((completedServices / totalServices) * 100);
      };

      console.log('🚀 [ServiceManager] Starting service initialization...');

      // Initialize Memory Manager first (other services depend on it)
      if (!services.memoryManager) {
        services.memoryManager = new MemoryManager({
          maxTexturePoolSize: 100,
          maxTextureMemory: memoryLimits.maxTextureMemory,
          gcThreshold: 0.8,
          criticalThreshold: 0.95,
          cleanupInterval: 30000,
          enableTexturePool: true,
          enableMemoryPressureMonitoring: true,
          enableGCHints: true
        });

        // Initialize texture pool if WebGL context is available
        if (webglContext) {
          services.memoryManager.initializeTexturePool(webglContext);
        }

        // Set up memory pressure monitoring
        services.memoryManager.onMemoryPressure((pressure) => {
          console.log(`🧠 [ServiceManager] Memory pressure: ${pressure}`);
          if (onMemoryPressure) {
            onMemoryPressure(pressure);
          }

          if (pressure === 'high' || pressure === 'critical') {
            // Trigger cache cleanup
            services.cacheManager?.cleanup();
            services.predictiveCache?.cleanup();
          }
        });

        console.log('✅ [ServiceManager] Memory Manager initialized');
      }
      updateProgress();

      // Initialize Shader Optimizer
      if (config.enableWebGL && webglContext && !services.shaderOptimizer) {
        services.shaderOptimizer = new ShaderOptimizer(webglContext, {
          enableTextureCompression: true,
          enableShaderCache: true,
          optimizationLevel: 'high',
          maxTextureSize: 4096,
          enableMipmaps: true
        });
        console.log('✅ [ServiceManager] Shader Optimizer initialized');
      }
      updateProgress();

      // Initialize Memory Monitor
      if (!services.memoryMonitor) {
        services.memoryMonitor = new MemoryMonitor(
          services.memoryManager,
          services.shaderOptimizer
        );
        services.memoryMonitor.startMonitoring(2000); // Monitor every 2 seconds
        console.log('✅ [ServiceManager] Memory Monitor initialized');
      }
      updateProgress();

      // Initialize Progressive Loading System
      if (config.enableProgressiveLoading && !services.progressiveLoader) {
        services.progressiveLoader = new ProgressiveLoadingSystem({
          enableAdaptiveBandwidth: config.adaptiveQuality,
          enablePredictiveLoading: true,
          maxCacheSize: 200
        });
        console.log('✅ [ServiceManager] Progressive Loading System initialized');
      }
      updateProgress();

      // Initialize Cache Manager
      if (config.enableCaching && !services.cacheManager) {
        services.cacheManager = new IntelligentCacheManager({
          maxMemoryUsage: memoryLimits.maxCacheSize,
          compressionEnabled: true,
          prefetchStrategy: 'adaptive'
        });
        console.log('✅ [ServiceManager] Cache Manager initialized');
      }
      updateProgress();

      // Initialize Performance Monitor
      if (!services.performanceMonitor) {
        services.performanceMonitor = PerformanceMonitor.getInstance();
        console.log('✅ [ServiceManager] Performance Monitor initialized');
      }
      updateProgress();

      // Initialize Annotation System
      if (!services.annotationSystem) {
        services.annotationSystem = new AnnotationSystem();
        console.log('✅ [ServiceManager] Annotation System initialized');
      }
      updateProgress();

      // Initialize AI Enhancement Module
      if (config.enableAI && config.aiSettings?.enableEnhancement && !services.aiModule) {
        services.aiModule = new AIEnhancementModule();
        console.log('✅ [ServiceManager] AI Enhancement Module initialized');
      }
      updateProgress();

      // Initialize Abnormality Detection Service
      if (config.enableAI && config.aiSettings?.enableDetection && !services.abnormalityDetection) {
        services.abnormalityDetection = new AbnormalityDetectionService({
          confidenceThreshold: config.aiSettings.confidenceThreshold,
          enableRealTimeDetection: true
        });
        console.log('✅ [ServiceManager] Abnormality Detection Service initialized');
      }
      updateProgress();

      // Initialize Predictive Cache Service
      if (config.enableCaching && !services.predictiveCache) {
        services.predictiveCache = new PredictiveCacheService({
          maxCacheSize: memoryLimits.maxPredictiveCache,
          maxItems: 500,
          predictionWindow: 5,
          confidenceThreshold: 0.3,
          learningRate: 0.1
        });
        console.log('✅ [ServiceManager] Predictive Cache Service initialized');
      }
      updateProgress();

      // Initialize LOD Rendering Service
      if (config.adaptiveQuality && !services.lodRendering) {
        services.lodRendering = new LODRenderingService({
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
        console.log('✅ [ServiceManager] LOD Rendering Service initialized');
      }
      updateProgress();

      setIsInitialized(true);
      setInitializationProgress(100);
      console.log('🎉 [ServiceManager] All services initialized successfully');

    } catch (error) {
      const errorMessage = `Service initialization failed: ${error.message}`;
      console.error('❌ [ServiceManager]', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [config, webglContext, memoryLimits, onError, onMemoryPressure]);

  const cleanup = useCallback(() => {
    console.log('🧹 [ServiceManager] Cleaning up services...');
    
    const services = servicesRef.current;
    
    // Cleanup in reverse order of initialization
    services.lodRendering?.dispose();
    services.predictiveCache?.dispose();
    services.abnormalityDetection?.dispose();
    services.aiModule?.dispose();
    services.annotationSystem?.dispose();
    services.performanceMonitor?.stopMonitoring();
    services.cacheManager?.cleanup();
    services.progressiveLoader?.dispose();
    services.memoryMonitor?.stopMonitoring();
    services.shaderOptimizer?.dispose();
    services.memoryManager?.dispose();

    // Reset all services
    Object.keys(services).forEach(key => {
      (services as any)[key] = null;
    });

    setIsInitialized(false);
    setInitializationProgress(0);
    console.log('✅ [ServiceManager] Cleanup completed');
  }, []);

  const reinitialize = useCallback(async () => {
    cleanup();
    await initializeServices();
  }, [cleanup, initializeServices]);

  // Initialize services on mount and config changes
  useEffect(() => {
    initializeServices();
    
    return cleanup;
  }, [initializeServices, cleanup]);

  // Update WebGL context for shader optimizer
  useEffect(() => {
    if (webglContext && servicesRef.current.shaderOptimizer) {
      // Reinitialize shader optimizer with new context
      servicesRef.current.shaderOptimizer.dispose();
      servicesRef.current.shaderOptimizer = new ShaderOptimizer(webglContext, {
        enableTextureCompression: true,
        enableShaderCache: true,
        optimizationLevel: 'high',
        maxTextureSize: 4096,
        enableMipmaps: true
      });
      console.log('🔄 [ServiceManager] Shader Optimizer updated with new WebGL context');
    }
  }, [webglContext]);

  const contextValue: ServiceManagerContextType = {
    services: servicesRef.current,
    isInitialized,
    initializationProgress,
    error,
    reinitialize,
    cleanup
  };

  return (
    <ServiceManagerContext.Provider value={contextValue}>
      {children}
    </ServiceManagerContext.Provider>
  );
};

export default ServiceManager;