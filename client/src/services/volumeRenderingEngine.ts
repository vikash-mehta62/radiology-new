/**
 * 3D Volume Rendering Engine
 * Advanced GPU-accelerated volume rendering for medical imaging with ray casting and transfer functions
 */

import { performanceMonitor } from './performanceMonitor';

export interface VolumeData {
  data: Uint8Array | Uint16Array | Float32Array;
  dimensions: { width: number; height: number; depth: number };
  spacing: { x: number; y: number; z: number };
  origin: { x: number; y: number; z: number };
  orientation: number[]; // 3x3 matrix
  dataType: 'uint8' | 'uint16' | 'float32';
  minValue: number;
  maxValue: number;
}

export interface TransferFunction {
  opacity: { value: number; alpha: number }[];
  color: { value: number; r: number; g: number; b: number }[];
  name: string;
  presetType: 'ct' | 'mri' | 'pet' | 'custom';
}

export interface RenderingParameters {
  stepSize: number;
  maxSteps: number;
  ambientLight: number;
  diffuseLight: number;
  specularLight: number;
  shininess: number;
  gradientThreshold: number;
  enableShading: boolean;
  enableJittering: boolean;
  enableEarlyRayTermination: boolean;
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}

export interface Camera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov: number;
  near: number;
  far: number;
}

export interface VolumeRenderingConfig {
  canvas: HTMLCanvasElement;
  enableWebGL2: boolean;
  enableFloatTextures: boolean;
  maxTextureSize: number;
  adaptiveQuality: boolean;
  debugMode: boolean;
}

export interface RenderingStats {
  frameTime: number;
  raysCast: number;
  samplesProcessed: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  renderingErrors: string[];
}

class VolumeRenderingEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  private config: VolumeRenderingConfig;
  
  // Volume data and textures
  private volumeData: VolumeData | null = null;
  private volumeTexture: WebGLTexture | null = null;
  private transferFunctionTexture: WebGLTexture | null = null;
  
  // Shaders and programs
  private raycastingProgram: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  
  // Rendering state
  private camera: Camera;
  private transferFunction: TransferFunction;
  private renderingParams: RenderingParameters;
  
  // Performance tracking
  private stats: RenderingStats = {
    frameTime: 0,
    raysCast: 0,
    samplesProcessed: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0,
    renderingErrors: []
  };
  
  // Animation and interaction
  private animationFrame: number | null = null;
  private isRendering: boolean = false;
  
  // Predefined transfer functions
  private transferFunctionPresets: { [key: string]: TransferFunction } = {
    'ct-bone': {
      name: 'CT Bone',
      presetType: 'ct',
      opacity: [
        { value: 0.0, alpha: 0.0 },
        { value: 0.2, alpha: 0.0 },
        { value: 0.3, alpha: 0.1 },
        { value: 0.5, alpha: 0.3 },
        { value: 0.7, alpha: 0.6 },
        { value: 1.0, alpha: 0.9 }
      ],
      color: [
        { value: 0.0, r: 0.0, g: 0.0, b: 0.0 },
        { value: 0.2, r: 0.4, g: 0.2, b: 0.1 },
        { value: 0.5, r: 0.8, g: 0.6, b: 0.4 },
        { value: 0.8, r: 1.0, g: 0.9, b: 0.8 },
        { value: 1.0, r: 1.0, g: 1.0, b: 1.0 }
      ]
    },
    'ct-soft-tissue': {
      name: 'CT Soft Tissue',
      presetType: 'ct',
      opacity: [
        { value: 0.0, alpha: 0.0 },
        { value: 0.1, alpha: 0.0 },
        { value: 0.2, alpha: 0.2 },
        { value: 0.4, alpha: 0.4 },
        { value: 0.6, alpha: 0.6 },
        { value: 1.0, alpha: 0.8 }
      ],
      color: [
        { value: 0.0, r: 0.0, g: 0.0, b: 0.0 },
        { value: 0.2, r: 0.6, g: 0.3, b: 0.2 },
        { value: 0.5, r: 0.8, g: 0.5, b: 0.3 },
        { value: 0.8, r: 1.0, g: 0.7, b: 0.5 },
        { value: 1.0, r: 1.0, g: 0.9, b: 0.7 }
      ]
    },
    'mri-brain': {
      name: 'MRI Brain',
      presetType: 'mri',
      opacity: [
        { value: 0.0, alpha: 0.0 },
        { value: 0.15, alpha: 0.0 },
        { value: 0.25, alpha: 0.3 },
        { value: 0.5, alpha: 0.5 },
        { value: 0.75, alpha: 0.7 },
        { value: 1.0, alpha: 0.9 }
      ],
      color: [
        { value: 0.0, r: 0.0, g: 0.0, b: 0.0 },
        { value: 0.2, r: 0.2, g: 0.2, b: 0.4 },
        { value: 0.4, r: 0.4, g: 0.4, b: 0.6 },
        { value: 0.6, r: 0.6, g: 0.6, b: 0.8 },
        { value: 0.8, r: 0.8, g: 0.8, b: 1.0 },
        { value: 1.0, r: 1.0, g: 1.0, b: 1.0 }
      ]
    }
  };

  constructor(config: Partial<VolumeRenderingConfig>) {
    this.config = {
      canvas: config.canvas!,
      enableWebGL2: config.enableWebGL2 ?? true,
      enableFloatTextures: config.enableFloatTextures ?? true,
      maxTextureSize: config.maxTextureSize ?? 2048,
      adaptiveQuality: config.adaptiveQuality ?? true,
      debugMode: config.debugMode ?? false
    };
    
    this.canvas = this.config.canvas;
    
    // Initialize default camera
    this.camera = {
      position: { x: 0, y: 0, z: 2 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fov: 45,
      near: 0.1,
      far: 10
    };
    
    // Initialize default transfer function
    this.transferFunction = this.transferFunctionPresets['ct-bone'];
    
    // Initialize default rendering parameters
    this.renderingParams = {
      stepSize: 0.01,
      maxSteps: 500,
      ambientLight: 0.3,
      diffuseLight: 0.7,
      specularLight: 0.5,
      shininess: 32,
      gradientThreshold: 0.05,
      enableShading: true,
      enableJittering: true,
      enableEarlyRayTermination: true,
      qualityLevel: 'medium'
    };
    
    this.initialize();
  }

  /**
   * Initialize WebGL context and resources
   */
  private initialize(): void {
    try {
      // Try WebGL2 first if enabled
      if (this.config.enableWebGL2) {
        this.gl = this.canvas.getContext('webgl2', {
          antialias: false,
          alpha: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance'
        }) as WebGL2RenderingContext;
      }

      // Fallback to WebGL1
      if (!this.gl) {
        this.gl = this.canvas.getContext('webgl', {
          antialias: false,
          alpha: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false
        }) as WebGLRenderingContext;
      }

      if (!this.gl) {
        throw new Error('WebGL not supported');
      }

      console.log('🎯 [VolumeRenderingEngine] Initialized with', this.gl.constructor.name);
      
      // Check for required extensions
      this.checkWebGLExtensions();
      
      // Setup WebGL state
      this.setupWebGLState();
      
      // Create shaders
      this.createShaders();
      
      // Create geometry
      this.createGeometry();
      
    } catch (error) {
      console.error('🎯 [VolumeRenderingEngine] Initialization failed:', error);
      this.stats.renderingErrors.push(`Initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Check for required WebGL extensions
   */
  private checkWebGLExtensions(): void {
    if (!this.gl) return;

    const requiredExtensions = [
      'OES_texture_float',
      'OES_texture_float_linear'
    ];

    const optionalExtensions = [
      'EXT_color_buffer_float',
      'WEBGL_color_buffer_float',
      'OES_texture_half_float',
      'OES_texture_half_float_linear'
    ];

    requiredExtensions.forEach(ext => {
      if (!this.gl!.getExtension(ext)) {
        console.warn(`🎯 [VolumeRenderingEngine] Required extension ${ext} not available`);
      }
    });

    optionalExtensions.forEach(ext => {
      if (this.gl!.getExtension(ext)) {
        console.log(`🎯 [VolumeRenderingEngine] Optional extension ${ext} available`);
      }
    });
  }

  /**
   * Setup initial WebGL state
   */
  private setupWebGLState(): void {
    if (!this.gl) return;

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    this.updateViewport();
  }

  /**
   * Create volume rendering shaders
   */
  private createShaders(): void {
    if (!this.gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D u_volumeTexture;
      uniform sampler2D u_transferFunction;
      uniform vec3 u_volumeDimensions;
      uniform vec3 u_volumeSpacing;
      uniform mat4 u_modelViewMatrix;
      uniform mat4 u_projectionMatrix;
      uniform mat4 u_inverseModelViewMatrix;
      uniform mat4 u_inverseProjectionMatrix;
      uniform vec3 u_cameraPosition;
      uniform float u_stepSize;
      uniform int u_maxSteps;
      uniform float u_ambientLight;
      uniform float u_diffuseLight;
      uniform float u_specularLight;
      uniform float u_shininess;
      uniform float u_gradientThreshold;
      uniform bool u_enableShading;
      uniform bool u_enableJittering;
      uniform bool u_enableEarlyTermination;
      
      varying vec2 v_texCoord;
      
      // Random function for jittering
      float random(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      // Sample volume at normalized coordinates
      float sampleVolume(vec3 pos) {
        if (pos.x < 0.0 || pos.x > 1.0 || 
            pos.y < 0.0 || pos.y > 1.0 || 
            pos.z < 0.0 || pos.z > 1.0) {
          return 0.0;
        }
        
        // For 3D texture sampling, we need to implement manual trilinear interpolation
        // This is a simplified version - in practice, you'd use 3D textures
        vec2 texCoord = vec2(pos.x + pos.z * u_volumeDimensions.x / u_volumeDimensions.z, pos.y);
        return texture2D(u_volumeTexture, texCoord).r;
      }
      
      // Calculate gradient for shading
      vec3 calculateGradient(vec3 pos) {
        float delta = 1.0 / max(u_volumeDimensions.x, max(u_volumeDimensions.y, u_volumeDimensions.z));
        
        float dx = sampleVolume(pos + vec3(delta, 0.0, 0.0)) - sampleVolume(pos - vec3(delta, 0.0, 0.0));
        float dy = sampleVolume(pos + vec3(0.0, delta, 0.0)) - sampleVolume(pos - vec3(0.0, delta, 0.0));
        float dz = sampleVolume(pos + vec3(0.0, 0.0, delta)) - sampleVolume(pos - vec3(0.0, 0.0, delta));
        
        return normalize(vec3(dx, dy, dz));
      }
      
      // Apply transfer function
      vec4 applyTransferFunction(float intensity) {
        return texture2D(u_transferFunction, vec2(intensity, 0.5));
      }
      
      // Calculate lighting
      vec3 calculateLighting(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 color) {
        if (!u_enableShading) {
          return color;
        }
        
        // Ambient
        vec3 ambient = u_ambientLight * color;
        
        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = u_diffuseLight * diff * color;
        
        // Specular
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
        vec3 specular = u_specularLight * spec * vec3(1.0);
        
        return ambient + diffuse + specular;
      }
      
      void main() {
        // Ray setup
        vec4 rayStart = u_inverseModelViewMatrix * u_inverseProjectionMatrix * vec4((v_texCoord - 0.5) * 2.0, -1.0, 1.0);
        vec4 rayEnd = u_inverseModelViewMatrix * u_inverseProjectionMatrix * vec4((v_texCoord - 0.5) * 2.0, 1.0, 1.0);
        
        rayStart.xyz /= rayStart.w;
        rayEnd.xyz /= rayEnd.w;
        
        vec3 rayDir = normalize(rayEnd.xyz - rayStart.xyz);
        vec3 rayPos = rayStart.xyz;
        
        // Transform to volume space [0,1]
        rayPos = (rayPos + 1.0) * 0.5;
        
        // Jittering for noise reduction
        float jitter = u_enableJittering ? random(v_texCoord) * u_stepSize : 0.0;
        rayPos += rayDir * jitter;
        
        // Ray marching
        vec4 color = vec4(0.0);
        float stepSize = u_stepSize;
        
        for (int i = 0; i < 1000; i++) { // Use constant for WebGL1 compatibility
          if (i >= u_maxSteps) break;
          
          // Sample volume
          float intensity = sampleVolume(rayPos);
          
          if (intensity > 0.01) { // Skip empty space
            // Apply transfer function
            vec4 sample = applyTransferFunction(intensity);
            
            if (sample.a > 0.01) {
              // Calculate gradient for shading
              vec3 gradient = calculateGradient(rayPos);
              
              if (length(gradient) > u_gradientThreshold) {
                // Apply lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                vec3 viewDir = normalize(u_cameraPosition - rayPos);
                
                sample.rgb = calculateLighting(gradient, viewDir, lightDir, sample.rgb);
              }
              
              // Alpha blending
              sample.a *= stepSize * 100.0; // Adjust for step size
              color.rgb += sample.rgb * sample.a * (1.0 - color.a);
              color.a += sample.a * (1.0 - color.a);
              
              // Early ray termination
              if (u_enableEarlyTermination && color.a > 0.95) {
                break;
              }
            }
          }
          
          // Advance ray
          rayPos += rayDir * stepSize;
          
          // Check bounds
          if (rayPos.x < 0.0 || rayPos.x > 1.0 || 
              rayPos.y < 0.0 || rayPos.y > 1.0 || 
              rayPos.z < 0.0 || rayPos.z > 1.0) {
            break;
          }
        }
        
        gl_FragColor = color;
      }
    `;

    this.raycastingProgram = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Create shader program
   */
  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      console.error('🎯 [VolumeRenderingEngine] Shader program linking failed:', error);
      this.gl.deleteProgram(program);
      return null;
    }

    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    return program;
  }

  /**
   * Compile shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      console.error('🎯 [VolumeRenderingEngine] Shader compilation failed:', error);
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create geometry for full-screen quad
   */
  private createGeometry(): void {
    if (!this.gl) return;

    // Full-screen quad vertices
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
       1.0,  1.0,
      -1.0,  1.0
    ]);

    this.quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Indices
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
  }

  /**
   * Load volume data
   */
  public loadVolumeData(volumeData: VolumeData): void {
    this.volumeData = volumeData;
    this.createVolumeTexture();
    console.log('🎯 [VolumeRenderingEngine] Volume data loaded:', volumeData.dimensions);
  }

  /**
   * Create 3D volume texture (simplified as 2D texture array for WebGL1 compatibility)
   */
  private createVolumeTexture(): void {
    if (!this.gl || !this.volumeData) return;

    this.volumeTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.volumeTexture);

    // For simplicity, we'll create a 2D texture representation
    // In a full implementation, you'd use 3D textures or texture arrays
    const { width, height, depth } = this.volumeData.dimensions;
    const textureWidth = width * Math.ceil(Math.sqrt(depth));
    const textureHeight = height * Math.ceil(Math.sqrt(depth));

    // Convert volume data to normalized float values
    const normalizedData = new Float32Array(textureWidth * textureHeight);
    const range = this.volumeData.maxValue - this.volumeData.minValue;

    for (let z = 0; z < depth; z++) {
      const sliceOffsetX = (z % Math.ceil(Math.sqrt(depth))) * width;
      const sliceOffsetY = Math.floor(z / Math.ceil(Math.sqrt(depth))) * height;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const volumeIndex = z * width * height + y * width + x;
          const textureIndex = (sliceOffsetY + y) * textureWidth + (sliceOffsetX + x);
          
          let value = 0;
          if (this.volumeData.dataType === 'uint8') {
            value = (this.volumeData.data as Uint8Array)[volumeIndex];
          } else if (this.volumeData.dataType === 'uint16') {
            value = (this.volumeData.data as Uint16Array)[volumeIndex];
          } else {
            value = (this.volumeData.data as Float32Array)[volumeIndex];
          }
          
          normalizedData[textureIndex] = (value - this.volumeData.minValue) / range;
        }
      }
    }

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      textureWidth,
      textureHeight,
      0,
      this.gl.LUMINANCE,
      this.gl.FLOAT,
      normalizedData
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  /**
   * Create transfer function texture
   */
  private createTransferFunctionTexture(): void {
    if (!this.gl) return;

    const resolution = 256;
    const data = new Float32Array(resolution * 4); // RGBA

    // Interpolate transfer function
    for (let i = 0; i < resolution; i++) {
      const value = i / (resolution - 1);
      
      // Interpolate opacity
      let alpha = 0;
      for (let j = 1; j < this.transferFunction.opacity.length; j++) {
        const prev = this.transferFunction.opacity[j - 1];
        const curr = this.transferFunction.opacity[j];
        
        if (value >= prev.value && value <= curr.value) {
          const t = (value - prev.value) / (curr.value - prev.value);
          alpha = prev.alpha + t * (curr.alpha - prev.alpha);
          break;
        }
      }
      
      // Interpolate color
      let r = 0, g = 0, b = 0;
      for (let j = 1; j < this.transferFunction.color.length; j++) {
        const prev = this.transferFunction.color[j - 1];
        const curr = this.transferFunction.color[j];
        
        if (value >= prev.value && value <= curr.value) {
          const t = (value - prev.value) / (curr.value - prev.value);
          r = prev.r + t * (curr.r - prev.r);
          g = prev.g + t * (curr.g - prev.g);
          b = prev.b + t * (curr.b - prev.b);
          break;
        }
      }
      
      data[i * 4 + 0] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = alpha;
    }

    this.transferFunctionTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.transferFunctionTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      resolution,
      1,
      0,
      this.gl.RGBA,
      this.gl.FLOAT,
      data
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  /**
   * Update viewport
   */
  private updateViewport(): void {
    if (!this.gl) return;
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Create matrix utilities
   */
  private createMatrix4(): Float32Array {
    return new Float32Array(16);
  }

  private identityMatrix4(out: Float32Array): Float32Array {
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  }

  private perspectiveMatrix4(out: Float32Array, fovy: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }

  private lookAtMatrix4(out: Float32Array, eye: {x: number, y: number, z: number}, 
                       center: {x: number, y: number, z: number}, up: {x: number, y: number, z: number}): Float32Array {
    const eyex = eye.x, eyey = eye.y, eyez = eye.z;
    const upx = up.x, upy = up.y, upz = up.z;
    const centerx = center.x, centery = center.y, centerz = center.z;

    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
      return this.identityMatrix4(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
  }

  private invertMatrix4(out: Float32Array, a: Float32Array): Float32Array | null {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
      return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
  } 
 /**
   * Render the volume
   */
  public render(): void {
    if (!this.gl || !this.raycastingProgram || !this.volumeData || !this.volumeTexture) {
      return;
    }

    const startTime = performance.now();

    try {
      // Clear the canvas
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      // Use the raycasting program
      this.gl.useProgram(this.raycastingProgram);

      // Create matrices
      const projectionMatrix = this.createMatrix4();
      const modelViewMatrix = this.createMatrix4();
      const inverseProjectionMatrix = this.createMatrix4();
      const inverseModelViewMatrix = this.createMatrix4();

      // Setup projection matrix
      const aspect = this.canvas.width / this.canvas.height;
      this.perspectiveMatrix4(projectionMatrix, this.camera.fov * Math.PI / 180, aspect, this.camera.near, this.camera.far);

      // Setup model-view matrix
      this.lookAtMatrix4(modelViewMatrix, this.camera.position, this.camera.target, this.camera.up);

      // Calculate inverse matrices
      this.invertMatrix4(inverseProjectionMatrix, projectionMatrix);
      this.invertMatrix4(inverseModelViewMatrix, modelViewMatrix);

      // Set uniforms
      const volumeTextureLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_volumeTexture');
      const transferFunctionLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_transferFunction');
      const volumeDimensionsLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_volumeDimensions');
      const volumeSpacingLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_volumeSpacing');
      const modelViewMatrixLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_modelViewMatrix');
      const projectionMatrixLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_projectionMatrix');
      const inverseModelViewMatrixLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_inverseModelViewMatrix');
      const inverseProjectionMatrixLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_inverseProjectionMatrix');
      const cameraPositionLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_cameraPosition');
      const stepSizeLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_stepSize');
      const maxStepsLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_maxSteps');
      const ambientLightLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_ambientLight');
      const diffuseLightLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_diffuseLight');
      const specularLightLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_specularLight');
      const shininessLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_shininess');
      const gradientThresholdLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_gradientThreshold');
      const enableShadingLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_enableShading');
      const enableJitteringLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_enableJittering');
      const enableEarlyTerminationLocation = this.gl.getUniformLocation(this.raycastingProgram, 'u_enableEarlyTermination');

      // Bind textures
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.volumeTexture);
      this.gl.uniform1i(volumeTextureLocation, 0);

      if (!this.transferFunctionTexture) {
        this.createTransferFunctionTexture();
      }
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.transferFunctionTexture);
      this.gl.uniform1i(transferFunctionLocation, 1);

      // Set uniforms
      this.gl.uniform3f(volumeDimensionsLocation, 
        this.volumeData.dimensions.width, 
        this.volumeData.dimensions.height, 
        this.volumeData.dimensions.depth
      );
      this.gl.uniform3f(volumeSpacingLocation, 
        this.volumeData.spacing.x, 
        this.volumeData.spacing.y, 
        this.volumeData.spacing.z
      );
      this.gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
      this.gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
      this.gl.uniformMatrix4fv(inverseModelViewMatrixLocation, false, inverseModelViewMatrix);
      this.gl.uniformMatrix4fv(inverseProjectionMatrixLocation, false, inverseProjectionMatrix);
      this.gl.uniform3f(cameraPositionLocation, this.camera.position.x, this.camera.position.y, this.camera.position.z);
      this.gl.uniform1f(stepSizeLocation, this.renderingParams.stepSize);
      this.gl.uniform1i(maxStepsLocation, this.renderingParams.maxSteps);
      this.gl.uniform1f(ambientLightLocation, this.renderingParams.ambientLight);
      this.gl.uniform1f(diffuseLightLocation, this.renderingParams.diffuseLight);
      this.gl.uniform1f(specularLightLocation, this.renderingParams.specularLight);
      this.gl.uniform1f(shininessLocation, this.renderingParams.shininess);
      this.gl.uniform1f(gradientThresholdLocation, this.renderingParams.gradientThreshold);
      this.gl.uniform1i(enableShadingLocation, this.renderingParams.enableShading ? 1 : 0);
      this.gl.uniform1i(enableJitteringLocation, this.renderingParams.enableJittering ? 1 : 0);
      this.gl.uniform1i(enableEarlyTerminationLocation, this.renderingParams.enableEarlyRayTermination ? 1 : 0);

      // Bind geometry
      const positionLocation = this.gl.getAttribLocation(this.raycastingProgram, 'a_position');
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

      // Draw
      this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

      // Update stats
      this.stats.frameTime = performance.now() - startTime;
      this.stats.raysCast = this.canvas.width * this.canvas.height;
      this.stats.samplesProcessed = this.stats.raysCast * this.renderingParams.maxSteps;

    } catch (error) {
      console.error('🎯 [VolumeRenderingEngine] Render error:', error);
      this.stats.renderingErrors.push(`Render error: ${error}`);
    }
  }

  /**
   * Start continuous rendering
   */
  public startRendering(): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    
    const renderLoop = () => {
      if (!this.isRendering) return;
      
      this.render();
      this.animationFrame = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    console.log('🎯 [VolumeRenderingEngine] Started continuous rendering');
  }

  /**
   * Stop continuous rendering
   */
  public stopRendering(): void {
    this.isRendering = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    console.log('🎯 [VolumeRenderingEngine] Stopped continuous rendering');
  }

  /**
   * Set camera parameters
   */
  public setCamera(camera: Partial<Camera>): void {
    this.camera = { ...this.camera, ...camera };
  }

  /**
   * Set transfer function
   */
  public setTransferFunction(transferFunction: TransferFunction): void {
    this.transferFunction = transferFunction;
    
    // Recreate transfer function texture
    if (this.transferFunctionTexture) {
      this.gl?.deleteTexture(this.transferFunctionTexture);
      this.transferFunctionTexture = null;
    }
    
    this.createTransferFunctionTexture();
  }

  /**
   * Set transfer function preset
   */
  public setTransferFunctionPreset(presetName: string): void {
    const preset = this.transferFunctionPresets[presetName];
    if (preset) {
      this.setTransferFunction(preset);
    }
  }

  /**
   * Get available transfer function presets
   */
  public getTransferFunctionPresets(): string[] {
    return Object.keys(this.transferFunctionPresets);
  }

  /**
   * Set rendering parameters
   */
  public setRenderingParameters(params: Partial<RenderingParameters>): void {
    this.renderingParams = { ...this.renderingParams, ...params };
    
    // Adjust parameters based on quality level
    if (params.qualityLevel) {
      switch (params.qualityLevel) {
        case 'low':
          this.renderingParams.stepSize = 0.02;
          this.renderingParams.maxSteps = 250;
          break;
        case 'medium':
          this.renderingParams.stepSize = 0.01;
          this.renderingParams.maxSteps = 500;
          break;
        case 'high':
          this.renderingParams.stepSize = 0.005;
          this.renderingParams.maxSteps = 750;
          break;
        case 'ultra':
          this.renderingParams.stepSize = 0.002;
          this.renderingParams.maxSteps = 1000;
          break;
      }
    }
  }

  /**
   * Get rendering statistics
   */
  public getStats(): RenderingStats {
    return { ...this.stats };
  }

  /**
   * Resize canvas and update viewport
   */
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.updateViewport();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.stopRendering();
    
    if (this.gl) {
      // Delete textures
      if (this.volumeTexture) {
        this.gl.deleteTexture(this.volumeTexture);
        this.volumeTexture = null;
      }
      
      if (this.transferFunctionTexture) {
        this.gl.deleteTexture(this.transferFunctionTexture);
        this.transferFunctionTexture = null;
      }
      
      // Delete buffers
      if (this.quadBuffer) {
        this.gl.deleteBuffer(this.quadBuffer);
        this.quadBuffer = null;
      }
      
      if (this.indexBuffer) {
        this.gl.deleteBuffer(this.indexBuffer);
        this.indexBuffer = null;
      }
      
      // Delete program
      if (this.raycastingProgram) {
        this.gl.deleteProgram(this.raycastingProgram);
        this.raycastingProgram = null;
      }
    }
    
    this.volumeData = null;
    console.log('🎯 [VolumeRenderingEngine] Resources disposed');
  }
}

export { VolumeRenderingEngine };