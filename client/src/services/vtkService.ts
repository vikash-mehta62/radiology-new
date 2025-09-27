/**
 * VTK.js Service for Medical Imaging
 * Provides standardized 3D medical imaging capabilities using VTK.js
 * Replaces custom 3D implementation with industry-standard VTK.js
 */

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
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
import vtkImageProperty from '@kitware/vtk.js/Rendering/Core/ImageProperty';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';

export interface VTKRenderingOptions {
  enableVolumeRendering: boolean;
  enableMPR: boolean;
  enableSliceViewing: boolean;
  windowWidth: number;
  windowCenter: number;
  colormap?: string;
  opacity?: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface VTKVolumeData {
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  scalarData: ArrayLike<number>;
  scalarType: string;
  dataRange: [number, number];
}

export interface VTKSliceData {
  imageData: vtkImageData;
  orientation: 'axial' | 'sagittal' | 'coronal';
  sliceIndex: number;
}

export interface VTKMPRConfiguration {
  axialSlice: number;
  sagittalSlice: number;
  coronalSlice: number;
  crosshairEnabled: boolean;
  syncViewports: boolean;
}

export class VTKService {
  private renderWindow: vtkRenderWindow | null = null;
  private renderer: vtkRenderer | null = null;
  private interactor: vtkRenderWindowInteractor | null = null;
  private volume: vtkVolume | null = null;
  private volumeMapper: vtkVolumeMapper | null = null;
  private imageData: vtkImageData | null = null;
  private container: HTMLElement | null = null;
  private initialized = false;

  // MPR-related properties
  private axialSlice: vtkImageSlice | null = null;
  private sagittalSlice: vtkImageSlice | null = null;
  private coronalSlice: vtkImageSlice | null = null;
  private mprConfiguration: VTKMPRConfiguration = {
    axialSlice: 0,
    sagittalSlice: 0,
    coronalSlice: 0,
    crosshairEnabled: true,
    syncViewports: true
  };

  /**
   * Initialize VTK.js rendering context
   */
  public async initialize(container: HTMLElement): Promise<void> {
    try {
      console.log('🚀 [VTKService] Initializing VTK.js rendering context');
      
      this.container = container;
      
      // Create render window
      this.renderWindow = vtkRenderWindow.newInstance();
      this.renderer = vtkRenderer.newInstance();
      this.renderWindow.addRenderer(this.renderer);

      // Create interactor
      this.interactor = vtkRenderWindowInteractor.newInstance();
      this.interactor.setView(this.renderWindow.getViews()[0]);
      this.interactor.initialize();

      // Set interaction style for medical imaging
      const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
      this.interactor.setInteractorStyle(interactorStyle);

      // Set up the rendering context in the container
      const openglRenderWindow = this.renderWindow.getViews()[0];
      openglRenderWindow.setContainer(container);
      openglRenderWindow.setSize(container.clientWidth, container.clientHeight);

      // Set background color for medical imaging
      this.renderer.setBackground(0.0, 0.0, 0.0); // Black background

      this.initialized = true;
      console.log('✅ [VTKService] VTK.js initialization completed');
      
    } catch (error) {
      console.error('❌ [VTKService] Failed to initialize VTK.js:', error);
      throw new Error(`VTK.js initialization failed: ${error}`);
    }
  }

  /**
   * Load DICOM volume data for 3D rendering
   */
  public async loadVolumeData(volumeData: VTKVolumeData, options: VTKRenderingOptions): Promise<void> {
    if (!this.initialized || !this.renderer) {
      throw new Error('VTK.js not initialized. Call initialize() first.');
    }

    try {
      console.log('📦 [VTKService] Loading volume data:', volumeData.dimensions);

      // Create VTK image data
      this.imageData = vtkImageData.newInstance();
      this.imageData.setDimensions(volumeData.dimensions);
      this.imageData.setSpacing(volumeData.spacing);
      this.imageData.setOrigin(volumeData.origin);

      // Create scalar data array
      const dataArray = vtkDataArray.newInstance({
        name: 'scalars',
        values: volumeData.scalarData,
        numberOfComponents: 1
      });
      this.imageData.getPointData().setScalars(dataArray);

      if (options.enableVolumeRendering) {
        await this.setupVolumeRendering(options);
      }

      if (options.enableMPR) {
        await this.setupMPRRendering(options);
      }

      if (options.enableSliceViewing) {
        await this.setupSliceViewing(options);
      }

      // Render the scene
      this.render();
      
      console.log('✅ [VTKService] Volume data loaded successfully');
      
    } catch (error) {
      console.error('❌ [VTKService] Failed to load volume data:', error);
      throw error;
    }
  }

  /**
   * Set up volume rendering with transfer functions
   */
  private async setupVolumeRendering(options: VTKRenderingOptions): Promise<void> {
    if (!this.imageData || !this.renderer) return;

    console.log('🎨 [VTKService] Setting up volume rendering');

    // Create volume mapper
    this.volumeMapper = vtkVolumeMapper.newInstance();
    this.volumeMapper.setInputData(this.imageData);

    // Create volume
    this.volume = vtkVolume.newInstance();
    this.volume.setMapper(this.volumeMapper);

    // Set up volume property with transfer functions
    const volumeProperty = vtkVolumeProperty.newInstance();
    
    // Create opacity transfer function
    const opacityFunction = vtkPiecewiseFunction.newInstance();
    this.setupOpacityFunction(opacityFunction, options);
    volumeProperty.setScalarOpacity(0, opacityFunction);

    // Create color transfer function
    const colorFunction = vtkColorTransferFunction.newInstance();
    this.setupColorFunction(colorFunction, options);
    volumeProperty.setRGBTransferFunction(0, colorFunction);

    // Set volume property
    this.volume.setProperty(volumeProperty);

    // Add volume to renderer
    this.renderer.addVolume(this.volume);
    
    console.log('✅ [VTKService] Volume rendering setup completed');
  }

  /**
   * Set up Multi-Planar Reconstruction (MPR)
   */
  private async setupMPRRendering(options: VTKRenderingOptions): Promise<void> {
    if (!this.imageData || !this.renderer) return;

    console.log('🔄 [VTKService] Setting up MPR rendering');

    // Create axial slice
    this.axialSlice = vtkImageSlice.newInstance();
    const axialMapper = vtkImageMapper.newInstance();
    axialMapper.setInputData(this.imageData);
    axialMapper.setSliceAtFocalPoint(true);
    axialMapper.setSlicingMode(2); // Z-axis (axial)
    this.axialSlice.setMapper(axialMapper);

    // Create sagittal slice
    this.sagittalSlice = vtkImageSlice.newInstance();
    const sagittalMapper = vtkImageMapper.newInstance();
    sagittalMapper.setInputData(this.imageData);
    sagittalMapper.setSliceAtFocalPoint(true);
    sagittalMapper.setSlicingMode(0); // X-axis (sagittal)
    this.sagittalSlice.setMapper(sagittalMapper);

    // Create coronal slice
    this.coronalSlice = vtkImageSlice.newInstance();
    const coronalMapper = vtkImageMapper.newInstance();
    coronalMapper.setInputData(this.imageData);
    coronalMapper.setSliceAtFocalPoint(true);
    coronalMapper.setSlicingMode(1); // Y-axis (coronal)
    this.coronalSlice.setMapper(coronalMapper);

    // Set up image properties for windowing
    [this.axialSlice, this.sagittalSlice, this.coronalSlice].forEach(slice => {
      const imageProperty = vtkImageProperty.newInstance();
      imageProperty.setColorWindow(options.windowWidth);
      imageProperty.setColorLevel(options.windowCenter);
      slice.setProperty(imageProperty);
    });

    console.log('✅ [VTKService] MPR rendering setup completed');
  }

  /**
   * Set up single slice viewing
   */
  private async setupSliceViewing(options: VTKRenderingOptions): Promise<void> {
    if (!this.imageData || !this.renderer) return;

    console.log('🖼️ [VTKService] Setting up slice viewing');

    // For now, show axial slice by default
    if (this.axialSlice) {
      this.renderer.addActor(this.axialSlice);
    }
  }

  /**
   * Set up opacity transfer function for volume rendering
   */
  private setupOpacityFunction(opacityFunction: vtkPiecewiseFunction, options: VTKRenderingOptions): void {
    // Default opacity function for CT data
    opacityFunction.addPoint(-1000, 0.0);
    opacityFunction.addPoint(-500, 0.0);
    opacityFunction.addPoint(-100, 0.1);
    opacityFunction.addPoint(100, 0.2);
    opacityFunction.addPoint(1000, 0.8);
    opacityFunction.addPoint(3000, 1.0);
  }

  /**
   * Set up color transfer function for volume rendering
   */
  private setupColorFunction(colorFunction: vtkColorTransferFunction, options: VTKRenderingOptions): void {
    // Default color function for CT data (grayscale)
    colorFunction.addRGBPoint(-1000, 0.0, 0.0, 0.0);
    colorFunction.addRGBPoint(-500, 0.2, 0.2, 0.2);
    colorFunction.addRGBPoint(0, 0.5, 0.5, 0.5);
    colorFunction.addRGBPoint(500, 0.8, 0.8, 0.8);
    colorFunction.addRGBPoint(1000, 1.0, 1.0, 1.0);
  }

  /**
   * Update windowing parameters
   */
  public updateWindowing(windowWidth: number, windowCenter: number): void {
    if (!this.initialized) return;

    console.log(`🎛️ [VTKService] Updating windowing: W=${windowWidth}, C=${windowCenter}`);

    // Update volume rendering if active
    if (this.volume) {
      const volumeProperty = this.volume.getProperty();
      // Update transfer functions based on new windowing
      const colorFunction = volumeProperty.getRGBTransferFunction(0);
      const opacityFunction = volumeProperty.getScalarOpacity(0);
      
      // Recalculate transfer functions
      this.updateTransferFunctions(colorFunction, opacityFunction, windowWidth, windowCenter);
    }

    // Update MPR slices if active
    [this.axialSlice, this.sagittalSlice, this.coronalSlice].forEach(slice => {
      if (slice) {
        const imageProperty = slice.getProperty();
        imageProperty.setColorWindow(windowWidth);
        imageProperty.setColorLevel(windowCenter);
      }
    });

    this.render();
  }

  /**
   * Update transfer functions based on windowing
   */
  private updateTransferFunctions(
    colorFunction: vtkColorTransferFunction,
    opacityFunction: vtkPiecewiseFunction,
    windowWidth: number,
    windowCenter: number
  ): void {
    const min = windowCenter - windowWidth / 2;
    const max = windowCenter + windowWidth / 2;

    // Clear existing points
    colorFunction.removeAllPoints();
    opacityFunction.removeAllPoints();

    // Add new points based on window/level
    colorFunction.addRGBPoint(min, 0.0, 0.0, 0.0);
    colorFunction.addRGBPoint(max, 1.0, 1.0, 1.0);

    opacityFunction.addPoint(min, 0.0);
    opacityFunction.addPoint(max, 1.0);
  }

  /**
   * Navigate to specific slice in MPR mode
   */
  public navigateToSlice(orientation: 'axial' | 'sagittal' | 'coronal', sliceIndex: number): void {
    if (!this.imageData) return;

    console.log(`🧭 [VTKService] Navigating to ${orientation} slice ${sliceIndex}`);

    const dimensions = this.imageData.getDimensions();
    let mapper: vtkImageMapper | null = null;
    let maxSlice = 0;

    switch (orientation) {
      case 'axial':
        mapper = this.axialSlice?.getMapper() as vtkImageMapper;
        maxSlice = dimensions[2] - 1;
        this.mprConfiguration.axialSlice = Math.max(0, Math.min(sliceIndex, maxSlice));
        break;
      case 'sagittal':
        mapper = this.sagittalSlice?.getMapper() as vtkImageMapper;
        maxSlice = dimensions[0] - 1;
        this.mprConfiguration.sagittalSlice = Math.max(0, Math.min(sliceIndex, maxSlice));
        break;
      case 'coronal':
        mapper = this.coronalSlice?.getMapper() as vtkImageMapper;
        maxSlice = dimensions[1] - 1;
        this.mprConfiguration.coronalSlice = Math.max(0, Math.min(sliceIndex, maxSlice));
        break;
    }

    if (mapper) {
      mapper.setSlice(Math.max(0, Math.min(sliceIndex, maxSlice)));
      this.render();
    }
  }

  /**
   * Reset camera to fit the data
   */
  public resetCamera(): void {
    if (this.renderer) {
      this.renderer.resetCamera();
      this.render();
    }
  }

  /**
   * Render the scene
   */
  public render(): void {
    if (this.renderWindow) {
      this.renderWindow.render();
    }
  }

  /**
   * Resize the render window
   */
  public resize(width: number, height: number): void {
    if (this.renderWindow && this.container) {
      const openglRenderWindow = this.renderWindow.getViews()[0];
      openglRenderWindow.setSize(width, height);
      this.render();
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    console.log('🧹 [VTKService] Disposing VTK.js resources');

    if (this.volume) {
      this.renderer?.removeVolume(this.volume);
      this.volume = null;
    }

    if (this.axialSlice) {
      this.renderer?.removeActor(this.axialSlice);
      this.axialSlice = null;
    }

    if (this.sagittalSlice) {
      this.renderer?.removeActor(this.sagittalSlice);
      this.sagittalSlice = null;
    }

    if (this.coronalSlice) {
      this.renderer?.removeActor(this.coronalSlice);
      this.coronalSlice = null;
    }

    if (this.interactor) {
      this.interactor.unbindEvents();
      this.interactor = null;
    }

    this.renderWindow = null;
    this.renderer = null;
    this.volumeMapper = null;
    this.imageData = null;
    this.container = null;
    this.initialized = false;

    console.log('✅ [VTKService] VTK.js resources disposed');
  }

  /**
   * Get current MPR configuration
   */
  public getMPRConfiguration(): VTKMPRConfiguration {
    return { ...this.mprConfiguration };
  }

  /**
   * Update MPR configuration
   */
  public updateMPRConfiguration(config: Partial<VTKMPRConfiguration>): void {
    this.mprConfiguration = { ...this.mprConfiguration, ...config };
    
    // Apply configuration changes
    if (config.axialSlice !== undefined) {
      this.navigateToSlice('axial', config.axialSlice);
    }
    if (config.sagittalSlice !== undefined) {
      this.navigateToSlice('sagittal', config.sagittalSlice);
    }
    if (config.coronalSlice !== undefined) {
      this.navigateToSlice('coronal', config.coronalSlice);
    }
  }

  /**
   * Check if VTK.js is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const vtkService = new VTKService();