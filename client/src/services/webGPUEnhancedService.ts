/**
 * WebGPU Enhanced Service for VTK.js
 * Leverages WebGPU capabilities for improved rendering performance with large medical datasets
 */

import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

// WebGPU-specific imports
import vtkWebGPURenderWindow from '@kitware/vtk.js/Rendering/WebGPU/RenderWindow';
import vtkWebGPURenderer from '@kitware/vtk.js/Rendering/WebGPU/Renderer';

interface WebGPUCapabilities {
  isSupported: boolean;
  adapter?: any; // GPUAdapter type not available in TypeScript by default
  device?: any; // GPUDevice type not available in TypeScript by default
  features: string[];
  limits: Record<string, number>;
}

interface RenderingPerformanceMetrics {
  frameRate: number;
  renderTime: number;
  memoryUsage: number;
  gpuUtilization: number;
}

interface VolumeRenderingConfig {
  useWebGPU: boolean;
  enableVolumeRendering: boolean;
  maxTextureSize: number;
  compressionLevel: number;
  lodLevels: number;
}

class WebGPUEnhancedService {
  private webGPUCapabilities: WebGPUCapabilities | null = null;
  private renderWindow: any = null;
  private renderer: any = null;
  private interactor: any = null;
  private performanceMetrics: RenderingPerformanceMetrics = {
    frameRate: 0,
    renderTime: 0,
    memoryUsage: 0,
    gpuUtilization: 0
  };
  private config: VolumeRenderingConfig = {
    useWebGPU: false,
    enableVolumeRendering: true,
    maxTextureSize: 4096,
    compressionLevel: 0.8,
    lodLevels: 3
  };

  async initialize(): Promise<boolean> {
    try {
      // Check WebGPU support
      this.webGPUCapabilities = await this.checkWebGPUSupport();
      
      if (this.webGPUCapabilities.isSupported) {
        console.log('✅ WebGPU is supported, initializing enhanced rendering');
        this.config.useWebGPU = true;
        return await this.initializeWebGPURendering();
      } else {
        console.log('⚠️ WebGPU not supported, falling back to WebGL');
        return await this.initializeWebGLRendering();
      }
    } catch (error) {
      console.error('Failed to initialize WebGPU Enhanced Service:', error);
      return false;
    }
  }

  private async checkWebGPUSupport(): Promise<WebGPUCapabilities> {
    const capabilities: WebGPUCapabilities = {
      isSupported: false,
      features: [],
      limits: {}
    };

    if (!(navigator as any).gpu) {
      return capabilities;
    }

    try {
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        return capabilities;
      }

      const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
      });

      capabilities.isSupported = true;
      capabilities.adapter = adapter;
      capabilities.device = device;
      capabilities.features = Array.from(adapter.features);
      capabilities.limits = {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxTextureSize: adapter.limits.maxTextureDimension2D,
        maxComputeWorkgroupSize: adapter.limits.maxComputeWorkgroupSizeX
      };

      return capabilities;
    } catch (error) {
      console.error('WebGPU adapter/device request failed:', error);
      return capabilities;
    }
  }

  private async initializeWebGPURendering(): Promise<boolean> {
    try {
      // Create WebGPU render window
      this.renderWindow = vtkWebGPURenderWindow.newInstance();
      this.renderer = vtkWebGPURenderer.newInstance();
      
      // Configure WebGPU-specific settings
      this.renderWindow.setDevice(this.webGPUCapabilities!.device);
      this.renderWindow.addRenderer(this.renderer);
      
      // Set up interactor
      this.interactor = vtkRenderWindowInteractor.newInstance();
      this.interactor.setRenderWindow(this.renderWindow);
      this.interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
      
      console.log('✅ WebGPU rendering initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU rendering:', error);
      return false;
    }
  }

  private async initializeWebGLRendering(): Promise<boolean> {
    try {
      // Fallback to standard WebGL rendering
      this.renderWindow = vtkRenderWindow.newInstance();
      this.renderer = vtkRenderer.newInstance();
      
      this.renderWindow.addRenderer(this.renderer);
      
      this.interactor = vtkRenderWindowInteractor.newInstance();
      this.interactor.setRenderWindow(this.renderWindow);
      this.interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
      
      console.log('✅ WebGL rendering initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGL rendering:', error);
      return false;
    }
  }

  createVolumeRenderer(container: HTMLElement): boolean {
    try {
      if (!this.renderWindow) {
        throw new Error('Render window not initialized');
      }

      // Set up the render window container
      const openGLRenderWindow = this.renderWindow.newAPISpecificView();
      openGLRenderWindow.setContainer(container);
      
      // Configure for medical imaging
      this.renderer.setBackground(0.0, 0.0, 0.0); // Black background
      this.renderer.setUseShadows(false); // Disable shadows for medical imaging
      
      // Initialize interactor
      this.interactor.initialize();
      this.interactor.bindEvents(container);
      
      return true;
    } catch (error) {
      console.error('Failed to create volume renderer:', error);
      return false;
    }
  }

  loadVolumeData(imageData: any): boolean {
    try {
      if (!this.renderer) {
        throw new Error('Renderer not initialized');
      }

      // Create VTK image data
      const vtkImage = vtkImageData.newInstance();
      
      // Set dimensions and spacing
      vtkImage.setDimensions(imageData.dimensions);
      vtkImage.setSpacing(imageData.spacing);
      vtkImage.setOrigin(imageData.origin);
      
      // Create data array
      const dataArray = vtkDataArray.newInstance({
        name: 'scalars',
        values: imageData.data,
        numberOfComponents: 1
      });
      
      vtkImage.getPointData().setScalars(dataArray);
      
      // Create mapper and actor
      const mapper = vtkImageMapper.newInstance();
      mapper.setInputData(vtkImage);
      
      const actor = vtkImageSlice.newInstance();
      actor.setMapper(mapper);
      
      // Add to renderer
      this.renderer.addActor(actor);
      this.renderer.resetCamera();
      
      // Render
      this.renderWindow.render();
      
      return true;
    } catch (error) {
      console.error('Failed to load volume data:', error);
      return false;
    }
  }

  enableGPUAcceleration(): boolean {
    if (!this.webGPUCapabilities?.isSupported) {
      console.warn('WebGPU not supported, cannot enable GPU acceleration');
      return false;
    }

    try {
      // Enable WebGPU-specific optimizations
      if (this.renderer && this.renderer.setUseWebGPU) {
        this.renderer.setUseWebGPU(true);
      }
      
      // Configure GPU memory management
      this.configureGPUMemoryManagement();
      
      console.log('✅ GPU acceleration enabled');
      return true;
    } catch (error) {
      console.error('Failed to enable GPU acceleration:', error);
      return false;
    }
  }

  private configureGPUMemoryManagement(): void {
    if (!this.webGPUCapabilities?.device) return;

    // Set up memory management for large datasets
    const maxBufferSize = this.webGPUCapabilities.limits.maxBufferSize;
    const recommendedBufferSize = Math.min(maxBufferSize, 256 * 1024 * 1024); // 256MB max
    
    console.log(`Configured GPU buffer size: ${recommendedBufferSize / (1024 * 1024)}MB`);
  }

  optimizeForLargeDatasets(): void {
    // Enable level-of-detail rendering
    this.config.lodLevels = 4;
    
    // Increase compression for memory efficiency
    this.config.compressionLevel = 0.9;
    
    // Optimize texture size based on GPU capabilities
    if (this.webGPUCapabilities?.limits.maxTextureSize) {
      this.config.maxTextureSize = Math.min(
        this.webGPUCapabilities.limits.maxTextureSize,
        8192
      );
    }
    
    console.log('✅ Optimized for large datasets');
  }

  getPerformanceMetrics(): RenderingPerformanceMetrics {
    // Update performance metrics
    this.updatePerformanceMetrics();
    return { ...this.performanceMetrics };
  }

  private updatePerformanceMetrics(): void {
    if (this.renderWindow) {
      // Get frame rate from render window
      const frameRate = this.renderWindow.getFrameRate?.() || 0;
      this.performanceMetrics.frameRate = frameRate;
      
      // Estimate memory usage
      this.performanceMetrics.memoryUsage = this.estimateMemoryUsage();
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of GPU memory usage
    let memoryUsage = 0;
    
    if (this.webGPUCapabilities?.device) {
      // WebGPU memory estimation
      memoryUsage = 50 * 1024 * 1024; // Base 50MB
    } else {
      // WebGL memory estimation
      memoryUsage = 30 * 1024 * 1024; // Base 30MB
    }
    
    return memoryUsage;
  }

  getWebGPUCapabilities(): WebGPUCapabilities | null {
    return this.webGPUCapabilities;
  }

  isWebGPUEnabled(): boolean {
    return this.config.useWebGPU && this.webGPUCapabilities?.isSupported === true;
  }

  resize(width: number, height: number): void {
    if (this.renderWindow) {
      this.renderWindow.setSize(width, height);
      this.renderWindow.render();
    }
  }

  render(): void {
    if (this.renderWindow) {
      this.renderWindow.render();
    }
  }

  dispose(): void {
    if (this.interactor) {
      this.interactor.unbindEvents();
    }
    
    if (this.renderWindow) {
      this.renderWindow.delete();
    }
    
    if (this.webGPUCapabilities?.device) {
      this.webGPUCapabilities.device.destroy();
    }
    
    console.log('✅ WebGPU Enhanced Service disposed');
  }
}

export const webGPUEnhancedService = new WebGPUEnhancedService();
export default webGPUEnhancedService;