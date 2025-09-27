/**
 * WebGPU Service for DICOM Viewer
 * Provides GPU acceleration for image processing and rendering
 */

// WebGPU Service for advanced GPU-accelerated image processing
// Note: Using 'any' types for WebGPU interfaces since they're not available in TypeScript by default

interface Navigator {
  gpu?: {
    requestAdapter(options?: any): Promise<any | null>; // GPUAdapter
  };
}

interface HTMLCanvasElement {
  getContext(contextId: 'webgpu'): any | null; // GPUCanvasContext
}

interface GPUAdapterInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

interface GPUSupportedLimits {
  maxTextureDimension1D: number;
  maxTextureDimension2D: number;
  maxTextureDimension3D: number;
  maxTextureArrayLayers: number;
  maxBindGroups: number;
  maxBindingsPerBindGroup: number;
  maxDynamicUniformBuffersPerPipelineLayout: number;
  maxDynamicStorageBuffersPerPipelineLayout: number;
  maxSampledTexturesPerShaderStage: number;
  maxSamplersPerShaderStage: number;
  maxStorageBuffersPerShaderStage: number;
  maxStorageTexturesPerShaderStage: number;
  maxUniformBuffersPerShaderStage: number;
  maxUniformBufferBindingSize: number;
  maxStorageBufferBindingSize: number;
  minUniformBufferOffsetAlignment: number;
  minStorageBufferOffsetAlignment: number;
  maxVertexBuffers: number;
  maxBufferSize: number;
  maxVertexAttributes: number;
  maxVertexBufferArrayStride: number;
  maxInterStageShaderComponents: number;
  maxInterStageShaderVariables: number;
  maxColorAttachments: number;
  maxColorAttachmentBytesPerSample: number;
  maxComputeWorkgroupStorageSize: number;
  maxComputeInvocationsPerWorkgroup: number;
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeWorkgroupSizeZ: number;
  maxComputeWorkgroupsPerDimension: number;
}

interface GPUSupportedFeatures extends Set<string> {
  // WebGPU features like 'depth-clip-control', 'timestamp-query', etc.
}

interface GPUTexture {
  width: number;
  height: number;
  depthOrArrayLayers: number;
  mipLevelCount: number;
  sampleCount: number;
  dimension: string;
  format: string;
  usage: number;
  
  createView(descriptor?: any): any; // GPUTextureView
  destroy(): void;
}

type GPUTextureFormat = string;
type GPUTextureUsageFlags = number;

interface GPUDevice {
  queue: any; // GPUQueue
  createTexture(descriptor: any): any; // GPUTexture
  createBuffer(descriptor: any): any;
  createShaderModule(descriptor: any): any; // GPUShaderModule
  createComputePipeline(descriptor: any): any; // GPUComputePipeline
  createRenderPipeline(descriptor: any): any; // GPURenderPipeline
  createBindGroup(descriptor: any): any;
  createBindGroupLayout(descriptor: any): any;
  createPipelineLayout(descriptor: any): any;
  createCommandEncoder(descriptor?: any): any;
  createSampler(descriptor?: any): any;
  
  destroy(): void;
  lost: Promise<any>;
  onuncapturederror: ((event: any) => void) | null;
}

interface GPUAdapter {
  requestDevice(descriptor?: any): Promise<any>; // GPUDevice
  info?: GPUAdapterInfo;
  limits?: GPUSupportedLimits;
  features?: GPUSupportedFeatures;
}

interface GPUQueue {
  submit(commandBuffers: any[]): void;
  writeBuffer(buffer: any, bufferOffset: number, data: ArrayBuffer | ArrayBufferView): void;
  writeTexture(destination: any, data: ArrayBuffer | ArrayBufferView, dataLayout: any, size: any): void;
  onSubmittedWorkDone(): Promise<void>;
}

// WebGPU constants (approximated)
declare const GPUTextureUsage: {
  COPY_SRC: number;
  COPY_DST: number;
  TEXTURE_BINDING: number;
  STORAGE_BINDING: number;
  RENDER_ATTACHMENT: number;
};

declare const GPUBufferUsage: {
  MAP_READ: number;
  MAP_WRITE: number;
  COPY_SRC: number;
  COPY_DST: number;
  INDEX: number;
  VERTEX: number;
  UNIFORM: number;
  STORAGE: number;
  INDIRECT: number;
  QUERY_RESOLVE: number;
};

interface GPUCanvasContext {
  canvas: HTMLCanvasElement;
  device: any; // GPUDevice
  format: string;
  usage: number;
  alphaMode: string;
  
  configure(configuration: any): void;
  unconfigure(): void;
  getCurrentTexture(): any; // GPUTexture
}

declare global {
  interface HTMLCanvasElement {
    getContext(contextId: 'webgpu'): any | null; // GPUCanvasContext
  }
}

interface GPUShaderModule {
  // Shader module interface
}

interface GPUComputePipeline {
  // Compute pipeline interface
}

interface GPURenderPipeline {
  // Render pipeline interface
}

export interface WebGPUCapabilities {
  isSupported: boolean;
  adapterInfo?: GPUAdapterInfo;
  limits?: GPUSupportedLimits;
  features?: GPUSupportedFeatures;
  maxTextureSize: number;
  maxBufferSize: number;
  maxComputeWorkgroupSize: number;
  supportsTimestampQuery: boolean;
  supportsDepthClipControl: boolean;
  supportsBGRA8UnormStorage: boolean;
  supportsFloat32Filterable: boolean;
  memoryHeaps: {
    device: number;
    host: number;
  };
}

export interface ImageProcessingOptions {
  brightness?: number;
  contrast?: number;
  gamma?: number;
  windowWidth?: number;
  windowCenter?: number;
  invert?: boolean;
  sharpen?: boolean;
  denoise?: boolean;
}

export interface GPUImageData {
  texture: any; // GPUTexture
  width: number;
  height: number;
  format: string; // GPUTextureFormat
  usage: number; // GPUTextureUsageFlags
}

class WebGPUService {
  private device: any | null = null; // GPUDevice
  private adapter: any | null = null; // GPUAdapter
  private queue: any | null = null; // GPUQueue
  private capabilities: WebGPUCapabilities | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;

  // Shader modules cache
  private shaderModules: Map<string, any> = new Map(); // GPUShaderModule
  
  // Compute pipelines cache
  private computePipelines: Map<string, any> = new Map(); // GPUComputePipeline

  /**
   * Initialize WebGPU
   */
  async initialize(): Promise<boolean> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<boolean> {
    try {
      // Check WebGPU support
      if (!(navigator as any).gpu) {
        console.warn('WebGPU not supported in this browser');
        this.capabilities = {
          isSupported: false,
          maxTextureSize: 0,
          maxBufferSize: 0,
          maxComputeWorkgroupSize: 0,
          supportsTimestampQuery: false,
          supportsDepthClipControl: false,
          supportsBGRA8UnormStorage: false,
          supportsFloat32Filterable: false,
          memoryHeaps: {
            device: 0,
            host: 0
          }
        };
        return false;
      }

      // Request adapter
      this.adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        console.warn('WebGPU adapter not available');
        this.capabilities = {
          isSupported: false,
          maxTextureSize: 0,
          maxBufferSize: 0,
          maxComputeWorkgroupSize: 0,
          supportsTimestampQuery: false,
          supportsDepthClipControl: false,
          supportsBGRA8UnormStorage: false,
          supportsFloat32Filterable: false,
          memoryHeaps: {
            device: 0,
            host: 0
          }
        };
        return false;
      }

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {}
      });

      if (!this.device) {
        console.warn('WebGPU device not available');
        return false;
      }

      this.queue = this.device.queue;

      // Get capabilities
      const adapterInfo = this.adapter.info;
      const limits = this.adapter.limits;
      const features = this.adapter.features;

      this.capabilities = {
        isSupported: true,
        adapterInfo,
        limits,
        features,
        maxTextureSize: limits.maxTextureDimension2D,
        maxBufferSize: limits.maxBufferSize,
        maxComputeWorkgroupSize: limits.maxComputeWorkgroupSizeX,
        supportsTimestampQuery: features.has('timestamp-query'),
        supportsDepthClipControl: features.has('depth-clip-control'),
        supportsBGRA8UnormStorage: features.has('bgra8unorm-storage'),
        supportsFloat32Filterable: features.has('float32-filterable'),
        memoryHeaps: {
          device: 0, // Default values as these are not directly available
          host: 0
        }
      };

      // Set up error handling
      this.device.addEventListener('uncapturederror', (event) => {
        console.error('WebGPU uncaptured error:', event.error);
      });

      this.isInitialized = true;
      console.log('WebGPU initialized successfully', this.capabilities);
      
      return true;

    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      this.capabilities = {
        isSupported: false,
        maxTextureSize: 0,
        maxBufferSize: 0,
        maxComputeWorkgroupSize: 0,
        supportsTimestampQuery: false,
        supportsDepthClipControl: false,
        supportsBGRA8UnormStorage: false,
        supportsFloat32Filterable: false,
        memoryHeaps: {
          device: 0,
          host: 0
        }
      };
      return false;
    }
  }

  /**
   * Get WebGPU capabilities
   */
  getCapabilities(): WebGPUCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if WebGPU is available and initialized
   */
  isAvailable(): boolean {
    return this.isInitialized && this.device !== null;
  }

  /**
   * Create texture from image data
   */
  async createImageTexture(
    imageData: ImageData | HTMLImageElement | HTMLCanvasElement,
    usage: number = (GPUTextureUsage as any).TEXTURE_BINDING | (GPUTextureUsage as any).COPY_DST
  ): Promise<any | null> { // GPUImageData
    if (!this.isAvailable() || !this.device || !this.queue) {
      return null;
    }

    try {
      if (imageData instanceof ImageData) {
        return this.createTextureFromImageData(imageData, usage);
      } else if (imageData instanceof HTMLImageElement || imageData instanceof HTMLCanvasElement) {
        // Convert HTMLImageElement or HTMLCanvasElement to ImageData
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = imageData instanceof HTMLImageElement ? imageData.naturalWidth : imageData.width;
        canvas.height = imageData instanceof HTMLImageElement ? imageData.naturalHeight : imageData.height;
        
        ctx.drawImage(imageData, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        return this.createTextureFromImageData(imgData, usage);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create texture from image:', error);
      return null;
    }
  }

  /**
   * Create texture from ImageData specifically
   */
  async createTextureFromImageData(
    imageData: ImageData,
    usage: number = (GPUTextureUsage as any).TEXTURE_BINDING | (GPUTextureUsage as any).COPY_DST
  ): Promise<any | null> { // GPUImageData
    if (!this.isAvailable() || !this.device || !this.queue) {
      return null;
    }

    try {
      const texture = this.device.createTexture({
        size: [imageData.width, imageData.height, 1],
        format: 'rgba8unorm',
        usage
      });

      // Copy image data to texture
      this.queue.writeTexture(
        { texture },
        imageData.data,
        { bytesPerRow: imageData.width * 4 },
        [imageData.width, imageData.height, 1]
      );

      return {
        texture,
        width: imageData.width,
        height: imageData.height,
        format: 'rgba8unorm',
        usage
      };

    } catch (error) {
      console.error('Failed to create texture from image data:', error);
      return null;
    }
  }

  /**
   * Create texture from DICOM pixel data
   */
  async createTextureFromDicomData(
    pixelData: ArrayBuffer,
    width: number,
    height: number,
    bitsPerPixel: number = 16
  ): Promise<any | null> { // GPUImageData
    if (!this.isAvailable() || !this.device || !this.queue) {
      return null;
    }

    try {
      // Determine format based on bits per pixel
      let format: GPUTextureFormat;
      let bytesPerPixel: number;

      if (bitsPerPixel <= 8) {
        format = 'r8unorm';
        bytesPerPixel = 1;
      } else if (bitsPerPixel <= 16) {
        format = 'r16uint';
        bytesPerPixel = 2;
      } else {
        format = 'rgba8unorm';
        bytesPerPixel = 4;
      }

      const texture = this.device.createTexture({
        size: [width, height, 1],
        format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING
      });

      // Copy pixel data to texture
      this.queue.writeTexture(
        { texture },
        pixelData,
        { bytesPerRow: width * bytesPerPixel },
        [width, height, 1]
      );

      return {
        texture,
        width,
        height,
        format,
        usage: texture.usage
      };

    } catch (error) {
      console.error('Failed to create texture from DICOM data:', error);
      return null;
    }
  }

  /**
   * Apply image processing using compute shaders
   */
  async processImage(
    inputTexture: any, // GPUImageData
    options: ImageProcessingOptions
  ): Promise<any | null> { // GPUImageData
    if (!this.isAvailable() || !this.device || !this.queue) {
      return null;
    }

    try {
      // Create output texture
      const outputTexture = this.device.createTexture({
        size: [inputTexture.width, inputTexture.height, 1],
        format: inputTexture.format,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
      });

      // Get or create compute pipeline
      const pipeline = await this.getImageProcessingPipeline(inputTexture.format);
      if (!pipeline) {
        return null;
      }

      // Create uniform buffer for processing parameters
      const uniformBuffer = this.device.createBuffer({
        size: 64, // Enough for processing parameters
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      // Write processing parameters
      const params = new Float32Array([
        options.brightness || 0,
        options.contrast || 1,
        options.gamma || 1,
        options.windowWidth || 400,
        options.windowCenter || 200,
        options.invert ? 1 : 0,
        options.sharpen ? 1 : 0,
        options.denoise ? 1 : 0
      ]);

      this.queue.writeBuffer(uniformBuffer, 0, params);

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: inputTexture.texture.createView()
          },
          {
            binding: 1,
            resource: outputTexture.createView()
          },
          {
            binding: 2,
            resource: { buffer: uniformBuffer }
          }
        ]
      });

      // Create command encoder
      const commandEncoder = this.device.createCommandEncoder();
      const computePass = commandEncoder.beginComputePass();

      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);

      // Dispatch compute shader
      const workgroupSizeX = 8;
      const workgroupSizeY = 8;
      const dispatchX = Math.ceil(inputTexture.width / workgroupSizeX);
      const dispatchY = Math.ceil(inputTexture.height / workgroupSizeY);

      computePass.dispatchWorkgroups(dispatchX, dispatchY);
      computePass.end();

      // Submit commands
      this.queue.submit([commandEncoder.finish()]);

      // Clean up
      uniformBuffer.destroy();

      return {
        texture: outputTexture,
        width: inputTexture.width,
        height: inputTexture.height,
        format: inputTexture.format,
        usage: outputTexture.usage
      };

    } catch (error) {
      console.error('Failed to process image:', error);
      return null;
    }
  }

  /**
   * Get or create image processing compute pipeline
   */
  private async getImageProcessingPipeline(format: string): Promise<any | null> { // GPUComputePipeline
    const pipelineKey = `image_processing_${format}`;
    
    if (this.computePipelines.has(pipelineKey)) {
      return this.computePipelines.get(pipelineKey)!;
    }

    if (!this.device) return null;

    try {
      // Create shader module if not exists
      const shaderKey = 'image_processing';
      let shaderModule = this.shaderModules.get(shaderKey);

      if (!shaderModule) {
        const shaderCode = this.getImageProcessingShaderCode();
        shaderModule = this.device.createShaderModule({
          code: shaderCode
        });
        this.shaderModules.set(shaderKey, shaderModule);
      }

      // Create compute pipeline
      const pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main'
        }
      });

      this.computePipelines.set(pipelineKey, pipeline);
      return pipeline;

    } catch (error) {
      console.error('Failed to create image processing pipeline:', error);
      return null;
    }
  }

  /**
   * Get image processing shader code
   */
  private getImageProcessingShaderCode(): string {
    return `
      struct ProcessingParams {
        brightness: f32,
        contrast: f32,
        gamma: f32,
        windowWidth: f32,
        windowCenter: f32,
        invert: f32,
        sharpen: f32,
        denoise: f32,
      }

      @group(0) @binding(0) var inputTexture: texture_2d<f32>;
      @group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
      @group(0) @binding(2) var<uniform> params: ProcessingParams;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let coords = vec2<i32>(global_id.xy);
        let dimensions = textureDimensions(inputTexture);
        
        if (coords.x >= i32(dimensions.x) || coords.y >= i32(dimensions.y)) {
          return;
        }

        var color = textureLoad(inputTexture, coords, 0);
        
        // Apply brightness
        color = color + vec4<f32>(params.brightness, params.brightness, params.brightness, 0.0);
        
        // Apply contrast
        color = (color - 0.5) * params.contrast + 0.5;
        
        // Apply gamma correction
        color = pow(color, vec4<f32>(1.0 / params.gamma));
        
        // Apply window/level
        let windowMin = params.windowCenter - params.windowWidth * 0.5;
        let windowMax = params.windowCenter + params.windowWidth * 0.5;
        color = (color - windowMin) / (windowMax - windowMin);
        
        // Apply inversion
        if (params.invert > 0.5) {
          color = 1.0 - color;
        }
        
        // Clamp values
        color = clamp(color, vec4<f32>(0.0), vec4<f32>(1.0));
        
        textureStore(outputTexture, coords, color);
      }
    `;
  }

  /**
   * Copy texture to canvas for display
   */
  async copyTextureToCanvas(
    texture: any, // GPUImageData
    canvas: HTMLCanvasElement
  ): Promise<boolean> {
    if (!this.isAvailable() || !this.device || !this.queue) {
      return false;
    }

    try {
      const context = canvas.getContext('webgpu');
      if (!context) {
        console.error('WebGPU context not available on canvas');
        return false;
      }

      // Configure canvas
      const canvasFormat = (navigator as any).gpu.getPreferredCanvasFormat();
      context.configure({
        device: this.device,
        format: canvasFormat
      });

      // Create render pipeline for copying texture to canvas
      const pipeline = await this.getRenderPipeline(canvasFormat);
      if (!pipeline) {
        return false;
      }

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: texture.texture.createView()
          }
        ]
      });

      // Create command encoder
      const commandEncoder = this.device.createCommandEncoder();
      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store'
          }
        ]
      });

      renderPass.setPipeline(pipeline);
      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(6); // Full-screen quad
      renderPass.end();

      this.queue.submit([commandEncoder.finish()]);
      return true;

    } catch (error) {
      console.error('Failed to copy texture to canvas:', error);
      return false;
    }
  }

  /**
   * Get or create render pipeline for canvas display
   */
  private async getRenderPipeline(format: string): Promise<any | null> { // GPURenderPipeline
    const pipelineKey = `render_${format}`;
    
    if (this.computePipelines.has(pipelineKey)) {
      return this.computePipelines.get(pipelineKey) as GPURenderPipeline;
    }

    if (!this.device) return null;

    try {
      const shaderCode = `
        @vertex
        fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
          var pos = array<vec2<f32>, 6>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>( 1.0, -1.0),
            vec2<f32>(-1.0,  1.0),
            vec2<f32>( 1.0, -1.0),
            vec2<f32>( 1.0,  1.0),
            vec2<f32>(-1.0,  1.0)
          );
          return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        }

        @group(0) @binding(0) var inputTexture: texture_2d<f32>;

        @fragment
        fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
          let coords = vec2<i32>(fragCoord.xy);
          return textureLoad(inputTexture, coords, 0);
        }
      `;

      const shaderModule = this.device.createShaderModule({ code: shaderCode });

      const pipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main'
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      });

      this.computePipelines.set(pipelineKey, pipeline as any);
      return pipeline;

    } catch (error) {
      console.error('Failed to create render pipeline:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Destroy shader modules
    this.shaderModules.clear();
    
    // Clear pipelines
    this.computePipelines.clear();

    // Destroy device
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }

    this.adapter = null;
    this.queue = null;
    this.capabilities = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

// Create singleton instance
export const webGPUService = new WebGPUService();

export default webGPUService;