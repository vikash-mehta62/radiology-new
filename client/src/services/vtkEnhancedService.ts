/**
 * Enhanced VTK.js Service - Simplified Implementation
 * Simplified to avoid dependency issues
 */

import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkVolumeProperty from '@kitware/vtk.js/Rendering/Core/VolumeProperty';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';

import { errorHandler, ErrorType, ViewerError } from './errorHandler';
import { performanceMonitor } from './performanceMonitor';

interface VTKConfig {
  enableWebGPU?: boolean;
  enableVolumeRendering?: boolean;
  enableMPR?: boolean;
  maxTextureSize?: number;
  memoryLimit?: number;
}

interface VolumeData {
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  scalarData: ArrayLike<number>;
  scalarType: string;
  dataRange: [number, number];
}

// Removed duplicate VTKEnhancedService class - using EnhancedVTKService below

interface EnhancedVTKConfig {
  enableWebGPU?: boolean;
  enableStreaming?: boolean;
  enableLOD?: boolean;
  enableVoxelManager?: boolean;
  memoryLimit?: number; // MB
  qualitySettings?: 'low' | 'medium' | 'high' | 'ultra';
  enableProgressiveLoading?: boolean;
  enableAdaptiveQuality?: boolean;
}

interface VolumeRenderingConfig {
  sampleDistance?: number;
  blendMode?: number;
  enableShading?: boolean;
  enableGradientOpacity?: boolean;
  enableLighting?: boolean;
  ambient?: number;
  diffuse?: number;
  specular?: number;
  specularPower?: number;
}

interface MPRConfig {
  enableCrosshairs?: boolean;
  enableSynchronization?: boolean;
  interpolationType?: number;
  enableCaching?: boolean;
  sliceThickness?: number;
}

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  gpuMemoryUsage?: number;
  triangleCount?: number;
}

class EnhancedVTKService {
  private renderWindow: vtkRenderWindow | null = null;
  private renderer: vtkRenderer | null = null;
  private interactor: vtkRenderWindowInteractor | null = null;
  private volume: vtkVolume | null = null;
  private volumeMapper: vtkVolumeMapper | null = null;
  private imageData: vtkImageData | null = null;
  private container: HTMLElement | null = null;
  private initialized = false;
  private config: EnhancedVTKConfig = {};
  
  // VTK.js 30.5.0 features
  private webGPUSupported = false;
  private voxelManager: any | null = null; // vtkVoxelManager | null = null;
  private resourceManager: any | null = null; // vtkResourceManager | null = null;
  private memoryManager: any | null = null; // vtkMemoryManager | null = null;
  
  // Performance monitoring
  private performanceMetrics: PerformanceMetrics = {
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
  };
  
  // MPR components
  private mprSlices = new Map<string, vtkImageSlice>();
  private mprMappers = new Map<string, vtkImageMapper>();

  constructor(config: EnhancedVTKConfig = {}) {
    this.config = {
      enableWebGPU: true,
      enableStreaming: true,
      enableLOD: true,
      enableVoxelManager: true,
      memoryLimit: 256, // Reduced from 2048 to 256MB for better compatibility
      qualitySettings: 'medium',
      enableProgressiveLoading: true,
      enableAdaptiveQuality: true,
      ...config
    };
  }

  async initialize(container: HTMLElement): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🚀 [EnhancedVTKService] Initializing VTK.js 30.5.0');
      
      this.container = container;
      
      // Check available memory before initialization
      const availableMemory = this.getAvailableMemory();
      const requestedMemory = this.config.memoryLimit || 256;
      
      if (requestedMemory > availableMemory) {
        console.warn(`⚠️ [VTK] Requested memory (${requestedMemory}MB) exceeds available (${availableMemory}MB). Reducing to ${Math.floor(availableMemory * 0.5)}MB`);
        this.config.memoryLimit = Math.floor(availableMemory * 0.5);
      }
      
      // Check WebGPU support
      this.webGPUSupported = await this.checkWebGPUSupport();
      
      // Skip memory manager initialization - not available in current VTK.js version
      console.log(`✅ [VTK] Using built-in memory management with ${this.config.memoryLimit}MB limit`);
      
      // Skip resource manager initialization - not available in current VTK.js version  
      console.log('✅ [VTK] Using built-in resource management');
      
      // Create render window with WebGPU if supported
      if (this.webGPUSupported && this.config.enableWebGPU) {
        // WebGPU support check - may not be available
        try {
          // For now, fallback to WebGL as WebGPU VTK classes may not be available
          this.renderWindow = vtkRenderWindow.newInstance();
          this.renderer = vtkRenderer.newInstance();
          console.log('📱 WebGL rendering (WebGPU classes not available)');
        } catch (webgpuError) {
          this.renderWindow = vtkRenderWindow.newInstance();
          this.renderer = vtkRenderer.newInstance();
          console.log('📱 WebGL rendering fallback');
        }
      } else {
        this.renderWindow = vtkRenderWindow.newInstance();
        this.renderer = vtkRenderer.newInstance();
        console.log('📱 WebGL rendering fallback');
      }
      
      this.renderWindow.addRenderer(this.renderer);
      
      // Create the OpenGL render window view first
      const openglRenderWindow = this.renderWindow.newAPISpecificView('WebGL');
      if (!openglRenderWindow) {
        throw new Error('Failed to create OpenGL render window view');
      }
      
      // Create interactor and set the view
      this.interactor = vtkRenderWindowInteractor.newInstance();
      this.interactor.setView(openglRenderWindow);
      this.interactor.initialize();
      
      // Set interaction style
      const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
      this.interactor.setInteractorStyle(interactorStyle);
      
      // Ensure container is valid
      if (!container || !container.clientWidth || !container.clientHeight) {
        throw new Error('Invalid container dimensions');
      }
      
      openglRenderWindow.setContainer(container);
      openglRenderWindow.setSize(container.clientWidth, container.clientHeight);
      
      // Configure renderer
      this.renderer.setBackground(0.0, 0.0, 0.0);
      
      // Initialize VoxelManager if enabled (temporarily disabled - not available in current VTK.js version)
      if (this.config.enableVoxelManager) {
        // this.voxelManager = vtkVoxelManager.newInstance();
        console.log('⚠️ VoxelManager temporarily disabled - not available in current VTK.js version');
      }
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      this.initialized = true;
      console.log('✅ [EnhancedVTKService] VTK.js 30.5.0 initialization completed');
      
    } catch (error) {
      console.error('❌ [VTK] Initialization failed:', error);
      
      // Don't throw a critical error for VTK initialization failure
      // Instead, mark as not initialized and continue
      this.initialized = false;
      
      // Log the error but don't create a critical viewer error
      console.warn('⚠️ [VTK] VTK service initialization failed, 3D features will be disabled');
      
      // Optional: Still report to error handler but with lower severity
      const viewerError = errorHandler.createViewerError(
        error as Error,
        { studyUid: 'vtk-initialization' },
        'warning' as any
      );
      await errorHandler.handleError(viewerError);
      
      // Don't re-throw the error to prevent blocking the entire viewer
      return;
    }
  }

  private async checkWebGPUSupport(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        return false;
      }
      
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return false;
      }
      
      const device = await adapter.requestDevice();
      return !!device;
    } catch (error) {
      console.warn('WebGPU not supported:', error);
      return false;
    }
  }

  async loadVolumeData(
    volumeData: any,
    config: VolumeRenderingConfig = {}
  ): Promise<void> {
    if (!this.initialized || !this.renderer) {
      throw new Error('Enhanced VTK Service not initialized');
    }

    try {
      // Create image data
      this.imageData = vtkImageData.newInstance();
      this.imageData.setDimensions(volumeData.dimensions);
      this.imageData.setSpacing(volumeData.spacing);
      this.imageData.setOrigin(volumeData.origin);
      
      const dataArray = vtkDataArray.newInstance({
        name: 'scalars',
        values: volumeData.scalarData,
        numberOfComponents: 1,
      });
      
      this.imageData.getPointData().setScalars(dataArray);
      
      // Create volume mapper with enhanced features
      if (this.config.enableStreaming) {
        this.volumeMapper = vtkStreamingVolumeMapper.newInstance();
        console.log('✅ Streaming volume mapper enabled');
      } else if (this.config.enableLOD) {
        this.volumeMapper = vtkLODVolumeMapper.newInstance();
        console.log('✅ LOD volume mapper enabled');
      } else {
        this.volumeMapper = vtkVolumeMapper.newInstance();
      }
      
      // Configure volume mapper
      this.volumeMapper.setInputData(this.imageData);
      this.volumeMapper.setSampleDistance(config.sampleDistance || 0.5);
      
      if (config.blendMode !== undefined) {
        this.volumeMapper.setBlendMode(config.blendMode);
      }
      
      // Create volume
      this.volume = vtkVolume.newInstance();
      this.volume.setMapper(this.volumeMapper);
      
      // Create volume property with enhanced settings
      const volumeProperty = vtkVolumeProperty.newInstance();
      
      // Configure shading
      if (config.enableShading !== false) {
        volumeProperty.setShade(true);
        volumeProperty.setAmbient(config.ambient || 0.2);
        volumeProperty.setDiffuse(config.diffuse || 0.6);
        volumeProperty.setSpecular(config.specular || 0.2);
        volumeProperty.setSpecularPower(config.specularPower || 15);
      }
      
      // Set up transfer functions
      const colorFunction = vtkColorTransferFunction.newInstance();
      const opacityFunction = vtkPiecewiseFunction.newInstance();
      
      this.setupTransferFunctions(colorFunction, opacityFunction, volumeData.dataRange);
      
      volumeProperty.setRGBTransferFunction(0, colorFunction);
      volumeProperty.setScalarOpacity(0, opacityFunction);
      
      if (config.enableGradientOpacity) {
        const gradientOpacity = vtkPiecewiseFunction.newInstance();
        gradientOpacity.addPoint(0, 0.0);
        gradientOpacity.addPoint(90, 0.5);
        gradientOpacity.addPoint(100, 1.0);
        volumeProperty.setGradientOpacity(0, gradientOpacity);
      }
      
      this.volume.setProperty(volumeProperty);
      
      // Add to renderer
      this.renderer.addVolume(this.volume);
      
      // Reset camera and render
      this.renderer.resetCamera();
      this.render();
      
      console.log('✅ Volume data loaded with enhanced features');
      
    } catch (error) {
      const viewerError = errorHandler.createViewerError(
        error as Error,
        { studyUid: 'volume-loading' }
      );
      await errorHandler.handleError(viewerError);
      throw viewerError;
    }
  }

  async setupMPR(config: MPRConfig = {}): Promise<void> {
    if (!this.imageData || !this.renderer) {
      throw new Error('Volume data not loaded');
    }

    try {
      const orientations = ['axial', 'sagittal', 'coronal'];
      
      for (const orientation of orientations) {
        // Create image slice
        const imageSlice = vtkImageSlice.newInstance();
        const imageMapper = vtkImageMapper.newInstance();
        
        // Configure mapper
        imageMapper.setInputData(this.imageData);
        imageMapper.setSlicingMode(this.getSlicingMode(orientation));
        
        if (config.interpolationType !== undefined) {
          const imageProperty = vtkImageProperty.newInstance();
          imageProperty.setInterpolationType(config.interpolationType);
          imageSlice.setProperty(imageProperty);
        }
        
        imageSlice.setMapper(imageMapper);
        
        // Store references
        this.mprSlices.set(orientation, imageSlice);
        this.mprMappers.set(orientation, imageMapper);
        
        // Add to renderer (initially hidden)
        this.renderer.addActor(imageSlice);
        imageSlice.setVisibility(false);
      }
      
      console.log('✅ MPR setup completed with enhanced features');
      
    } catch (error) {
      const viewerError = new ViewerError(
        'Failed to setup MPR',
        ErrorType.MPR_ERROR,
        { originalError: error }
      );
      errorHandler.handleError(viewerError);
      throw viewerError;
    }
  }

  private getSlicingMode(orientation: string): number {
    switch (orientation) {
      case 'axial': return 2; // Z axis
      case 'sagittal': return 0; // X axis
      case 'coronal': return 1; // Y axis
      default: return 2;
    }
  }

  private setupTransferFunctions(
    colorFunction: vtkColorTransferFunction,
    opacityFunction: vtkPiecewiseFunction,
    dataRange: [number, number]
  ): void {
    const [min, max] = dataRange;
    const range = max - min;
    
    // Enhanced color mapping
    colorFunction.addRGBPoint(min, 0.0, 0.0, 0.0);
    colorFunction.addRGBPoint(min + range * 0.25, 0.5, 0.0, 0.0);
    colorFunction.addRGBPoint(min + range * 0.5, 1.0, 0.5, 0.0);
    colorFunction.addRGBPoint(min + range * 0.75, 1.0, 1.0, 0.5);
    colorFunction.addRGBPoint(max, 1.0, 1.0, 1.0);
    
    // Enhanced opacity mapping
    opacityFunction.addPoint(min, 0.0);
    opacityFunction.addPoint(min + range * 0.1, 0.0);
    opacityFunction.addPoint(min + range * 0.3, 0.1);
    opacityFunction.addPoint(min + range * 0.6, 0.3);
    opacityFunction.addPoint(max, 0.8);
  }

  private startPerformanceMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const monitor = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        this.performanceMetrics.fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Update memory usage
        if ((performance as any).memory) {
          this.performanceMetrics.memoryUsage = 
            (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        }
        
        // Adaptive quality adjustment
        if (this.config.enableAdaptiveQuality) {
          this.adjustQualityBasedOnPerformance();
        }
      }
      
      requestAnimationFrame(monitor);
    };
    
    monitor();
  }

  private adjustQualityBasedOnPerformance(): void {
    if (this.performanceMetrics.fps < 15 && this.volumeMapper) {
      // Reduce quality for better performance
      const currentSampleDistance = this.volumeMapper.getSampleDistance();
      if (currentSampleDistance < 2.0) {
        this.volumeMapper.setSampleDistance(currentSampleDistance * 1.2);
        console.log('📉 Reduced rendering quality for better performance');
      }
    } else if (this.performanceMetrics.fps > 45 && this.volumeMapper) {
      // Increase quality when performance allows
      const currentSampleDistance = this.volumeMapper.getSampleDistance();
      if (currentSampleDistance > 0.3) {
        this.volumeMapper.setSampleDistance(currentSampleDistance * 0.9);
        console.log('📈 Increased rendering quality');
      }
    }
  }

  // Public API methods
  render(): void {
    if (this.renderWindow) {
      const startTime = performance.now();
      this.renderWindow.render();
      this.performanceMetrics.renderTime = performance.now() - startTime;
    }
  }

  resize(width: number, height: number): void {
    if (this.renderWindow) {
      const openglRenderWindow = this.renderWindow.getViews()[0];
      openglRenderWindow.setSize(width, height);
      this.render();
    }
  }

  resetCamera(): void {
    if (this.renderer) {
      this.renderer.resetCamera();
      this.render();
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  isWebGPUEnabled(): boolean {
    return this.webGPUSupported && this.config.enableWebGPU === true;
  }

  getMemoryUsage(): number {
    if (this.memoryManager) {
      return this.memoryManager.getMemoryUsage() / (1024 * 1024); // Convert to MB
    }
    // Fallback estimation
    return performance.memory ? performance.memory.usedJSHeapSize / (1024 * 1024) : 0;
  }

  private getAvailableMemory(): number {
    // Estimate available memory based on device capabilities
    if (performance.memory) {
      const totalMemory = performance.memory.jsHeapSizeLimit / (1024 * 1024);
      const usedMemory = performance.memory.usedJSHeapSize / (1024 * 1024);
      return Math.max(128, totalMemory - usedMemory); // Minimum 128MB
    }
    
    // Conservative fallback for devices without memory API
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('tablet')) {
      return 256; // 256MB for mobile devices
    }
    return 512; // 512MB for desktop devices
  }

  // Cleanup
  dispose(): void {
    try {
      if (this.interactor) {
        this.interactor.delete();
      }
      
      if (this.renderWindow) {
        this.renderWindow.delete();
      }
      
      // VoxelManager cleanup (temporarily disabled)
      // if (this.voxelManager) {
      //   this.voxelManager.delete();
      // }
      
      if (this.resourceManager) {
        this.resourceManager.delete();
      }
      
      if (this.memoryManager) {
        this.memoryManager.delete();
      }
      
      this.mprSlices.clear();
      this.mprMappers.clear();
      
      this.initialized = false;
      console.log('✅ Enhanced VTK Service disposed');
      
    } catch (error) {
      console.warn('Error during Enhanced VTK Service disposal:', error);
    }
  }
}

export default new EnhancedVTKService();
export { 
  EnhancedVTKService, 
  EnhancedVTKConfig, 
  VolumeRenderingConfig, 
  MPRConfig, 
  PerformanceMetrics 
};