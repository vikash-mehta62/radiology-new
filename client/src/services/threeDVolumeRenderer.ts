/**
 * 3D Volume Rendering Engine
 * Provides GPU-accelerated volume rendering with multiple visualization modes
 */

import { performanceMonitor } from './performanceMonitor';

export interface VolumeData {
  data: Uint8Array | Uint16Array | Float32Array;
  dimensions: { width: number; height: number; depth: number };
  spacing: { x: number; y: number; z: number };
  origin: { x: number; y: number; z: number };
  orientation: number[];
  dataType: 'uint8' | 'uint16' | 'float32';
  pixelRepresentation: number;
  rescaleSlope: number;
  rescaleIntercept: number;
}

export interface RenderingMode {
  name: string;
  type: 'volume' | 'mip' | 'surface' | 'isosurface';
  description: string;
  parameters: { [key: string]: any };
}

export interface VolumeRenderingConfig {
  canvas: HTMLCanvasElement;
  renderingMode: RenderingMode;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableLighting: boolean;
  enableShadows: boolean;
  enableAmbientOcclusion: boolean;
  rayStepSize: number;
  maxRaySteps: number;
  transferFunction: TransferFunction;
  clippingPlanes: ClippingPlane[];
}

export interface TransferFunction {
  opacity: { position: number; value: number }[];
  color: { position: number; r: number; g: number; b: number }[];
  windowCenter: number;
  windowWidth: number;
}

export interface ClippingPlane {
  normal: { x: number; y: number; z: number };
  distance: number;
  enabled: boolean;
}

export interface Camera3D {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov: number;
  near: number;
  far: number;
}

export interface Light3D {
  type: 'directional' | 'point' | 'ambient';
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  intensity: number;
  enabled: boolean;
}

export interface RenderingStats3D {
  frameTime: number;
  raysCast: number;
  samplesProcessed: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  renderingErrors: string[];
}

/**
 * Advanced 3D Volume Rendering Engine
 * GPU-accelerated volume rendering with multiple visualization modes
 */
class ThreeDVolumeRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  private config: VolumeRenderingConfig;
  
  // Volume data and textures
  private volumeData: VolumeData | null = null;
  private volumeTexture: WebGLTexture | null = null;
  private transferFunctionTexture: WebGLTexture | null = null;
  private noiseTexture: WebGLTexture | null = null;
  
  // Shader programs for different rendering modes
  private volumeRenderingProgram: WebGLProgram | null = null;
  private mipRenderingProgram: WebGLProgram | null = null;
  private surfaceRenderingProgram: WebGLProgram | null = null;
  private isosurfaceRenderingProgram: WebGLProgram | null = null;
  
  // Geometry buffers
  private cubeVertexBuffer: WebGLBuffer | null = null;
  private cubeIndexBuffer: WebGLBuffer | null = null;
  
  // Rendering state
  private camera: Camera3D;
  private lights: Light3D[] = [];
  private currentRenderingMode: RenderingMode;
  
  // Performance tracking
  private stats: RenderingStats3D = {
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
  
  // Predefined rendering modes
  private renderingModes: { [key: string]: RenderingMode } = {
    'volume': {
      name: 'Volume Rendering',
      type: 'volume',
      description: 'Direct volume rendering with opacity blending',
      parameters: {
        stepSize: 0.01,
        maxSteps: 500,
        enableEarlyTermination: true,
        enableJittering: true
      }
    },
    'mip': {
      name: 'Maximum Intensity Projection',
      type: 'mip',
      description: 'Shows maximum intensity along ray paths',
      parameters: {
        stepSize: 0.005,
        maxSteps: 1000,
        enableEarlyTermination: false,
        enableJittering: false
      }
    },
    'surface': {
      name: 'Surface Rendering',
      type: 'surface',
      description: 'Surface rendering with gradient-based shading',
      parameters: {
        stepSize: 0.005,
        maxSteps: 800,
        gradientThreshold: 0.1,
        enableShading: true
      }
    },
    'isosurface': {
      name: 'Isosurface Rendering',
      type: 'isosurface',
      description: 'Renders surfaces at specific intensity values',
      parameters: {
        isoValue: 0.5,
        stepSize: 0.002,
        maxSteps: 1200,
        enableShading: true
      }
    }
  };

  constructor(config: Partial<VolumeRenderingConfig>) {
    this.config = {
      canvas: config.canvas!,
      renderingMode: config.renderingMode || this.renderingModes['volume'],
      quality: config.quality || 'medium',
      enableLighting: config.enableLighting ?? true,
      enableShadows: config.enableShadows ?? false,
      enableAmbientOcclusion: config.enableAmbientOcclusion ?? false,
      rayStepSize: config.rayStepSize || 0.01,
      maxRaySteps: config.maxRaySteps || 500,
      transferFunction: config.transferFunction || this.createDefaultTransferFunction(),
      clippingPlanes: config.clippingPlanes || []
    };
    
    this.canvas = this.config.canvas;
    this.currentRenderingMode = this.config.renderingMode;
    
    // Initialize default camera
    this.camera = {
      position: { x: 0, y: 0, z: 2 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fov: 45,
      near: 0.1,
      far: 10
    };
    
    // Initialize default lighting
    this.setupDefaultLighting();
    
    this.initialize();
  }

  /**
   * Initialize WebGL context and resources
   */
  private initialize(): void {
    try {
      // Try WebGL2 first for better 3D texture support
      this.gl = this.canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      }) as WebGL2RenderingContext;

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

      console.log('🎯 [ThreeDVolumeRenderer] Initialized with', this.gl.constructor.name);
      
      // Check for required extensions
      this.checkWebGLExtensions();
      
      // Setup WebGL state
      this.setupWebGLState();
      
      // Create shaders for different rendering modes
      this.createShaderPrograms();
      
      // Create geometry
      this.createCubeGeometry();
      
      // Create noise texture for jittering
      this.createNoiseTexture();
      
    } catch (error) {
      console.error('🎯 [ThreeDVolumeRenderer] Initialization failed:', error);
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
      'OES_texture_3D',
      'WEBGL_depth_texture'
    ];

    requiredExtensions.forEach(ext => {
      if (!this.gl!.getExtension(ext)) {
        console.warn(`🎯 [ThreeDVolumeRenderer] Required extension ${ext} not available`);
      }
    });

    optionalExtensions.forEach(ext => {
      if (this.gl!.getExtension(ext)) {
        console.log(`🎯 [ThreeDVolumeRenderer] Optional extension ${ext} available`);
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
   * Create shader programs for different rendering modes
   */
  private createShaderPrograms(): void {
    if (!this.gl) return;

    // Volume rendering shader
    this.volumeRenderingProgram = this.createVolumeRenderingShader();
    
    // MIP rendering shader
    this.mipRenderingProgram = this.createMIPRenderingShader();
    
    // Surface rendering shader
    this.surfaceRenderingProgram = this.createSurfaceRenderingShader();
    
    // Isosurface rendering shader
    this.isosurfaceRenderingProgram = this.createIsosurfaceRenderingShader();
  }

  /**
   * Create volume rendering shader program
   */
  private createVolumeRenderingShader(): WebGLProgram | null {
    const vertexShaderSource = `
      attribute vec3 a_position;
      
      uniform mat4 u_modelViewMatrix;
      uniform mat4 u_projectionMatrix;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      void main() {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        
        // Calculate ray start and direction in volume space
        v_rayStart = (a_position + 1.0) * 0.5; // Convert from [-1,1] to [0,1]
        v_rayDirection = normalize(a_position);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D u_volumeTexture;
      uniform sampler2D u_transferFunction;
      uniform sampler2D u_noiseTexture;
      uniform vec3 u_volumeDimensions;
      uniform vec3 u_volumeSpacing;
      uniform vec3 u_cameraPosition;
      uniform float u_stepSize;
      uniform int u_maxSteps;
      uniform bool u_enableJittering;
      uniform bool u_enableEarlyTermination;
      uniform float u_time;
      
      // Lighting uniforms
      uniform vec3 u_lightDirection;
      uniform vec3 u_lightColor;
      uniform float u_ambientIntensity;
      uniform float u_diffuseIntensity;
      uniform float u_specularIntensity;
      uniform float u_shininess;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      // Sample volume at normalized coordinates
      float sampleVolume(vec3 pos) {
        if (pos.x < 0.0 || pos.x > 1.0 || 
            pos.y < 0.0 || pos.y > 1.0 || 
            pos.z < 0.0 || pos.z > 1.0) {
          return 0.0;
        }
        
        // For 3D texture sampling simulation using 2D texture
        // This is a simplified approach - in production use actual 3D textures
        vec2 texCoord = vec2(
          pos.x + floor(pos.z * u_volumeDimensions.z) / u_volumeDimensions.z,
          pos.y
        );
        return texture2D(u_volumeTexture, texCoord).r;
      }
      
      // Calculate gradient for lighting
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
      vec3 calculateLighting(vec3 normal, vec3 viewDir, vec3 color) {
        // Ambient
        vec3 ambient = u_ambientIntensity * color;
        
        // Diffuse
        float diff = max(dot(normal, u_lightDirection), 0.0);
        vec3 diffuse = u_diffuseIntensity * diff * u_lightColor * color;
        
        // Specular
        vec3 reflectDir = reflect(-u_lightDirection, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
        vec3 specular = u_specularIntensity * spec * u_lightColor;
        
        return ambient + diffuse + specular;
      }
      
      void main() {
        vec3 rayPos = v_rayStart;
        vec3 rayDir = normalize(v_rayDirection);
        
        // Jittering for noise reduction
        if (u_enableJittering) {
          vec2 noiseCoord = gl_FragCoord.xy / 64.0 + u_time * 0.01;
          float jitter = texture2D(u_noiseTexture, noiseCoord).r;
          rayPos += rayDir * jitter * u_stepSize;
        }
        
        vec4 color = vec4(0.0);
        float stepSize = u_stepSize;
        
        for (int i = 0; i < 1000; i++) {
          if (i >= u_maxSteps) break;
          
          float intensity = sampleVolume(rayPos);
          
          if (intensity > 0.01) {
            vec4 sample = applyTransferFunction(intensity);
            
            if (sample.a > 0.01) {
              // Calculate gradient for lighting
              vec3 gradient = calculateGradient(rayPos);
              
              if (length(gradient) > 0.05) {
                vec3 viewDir = normalize(u_cameraPosition - rayPos);
                sample.rgb = calculateLighting(gradient, viewDir, sample.rgb);
              }
              
              // Alpha blending
              sample.a *= stepSize * 100.0;
              color.rgb += sample.rgb * sample.a * (1.0 - color.a);
              color.a += sample.a * (1.0 - color.a);
              
              // Early ray termination
              if (u_enableEarlyTermination && color.a > 0.95) {
                break;
              }
            }
          }
          
          rayPos += rayDir * stepSize;
          
          if (rayPos.x < 0.0 || rayPos.x > 1.0 || 
              rayPos.y < 0.0 || rayPos.y > 1.0 || 
              rayPos.z < 0.0 || rayPos.z > 1.0) {
            break;
          }
        }
        
        gl_FragColor = color;
      }
    `;

    return this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Create MIP rendering shader program
   */
  private createMIPRenderingShader(): WebGLProgram | null {
    const vertexShaderSource = `
      attribute vec3 a_position;
      
      uniform mat4 u_modelViewMatrix;
      uniform mat4 u_projectionMatrix;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      void main() {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        v_rayStart = (a_position + 1.0) * 0.5;
        v_rayDirection = normalize(a_position);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D u_volumeTexture;
      uniform sampler2D u_transferFunction;
      uniform vec3 u_volumeDimensions;
      uniform float u_stepSize;
      uniform int u_maxSteps;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      float sampleVolume(vec3 pos) {
        if (pos.x < 0.0 || pos.x > 1.0 || 
            pos.y < 0.0 || pos.y > 1.0 || 
            pos.z < 0.0 || pos.z > 1.0) {
          return 0.0;
        }
        
        vec2 texCoord = vec2(
          pos.x + floor(pos.z * u_volumeDimensions.z) / u_volumeDimensions.z,
          pos.y
        );
        return texture2D(u_volumeTexture, texCoord).r;
      }
      
      void main() {
        vec3 rayPos = v_rayStart;
        vec3 rayDir = normalize(v_rayDirection);
        
        float maxIntensity = 0.0;
        
        for (int i = 0; i < 1000; i++) {
          if (i >= u_maxSteps) break;
          
          float intensity = sampleVolume(rayPos);
          maxIntensity = max(maxIntensity, intensity);
          
          rayPos += rayDir * u_stepSize;
          
          if (rayPos.x < 0.0 || rayPos.x > 1.0 || 
              rayPos.y < 0.0 || rayPos.y > 1.0 || 
              rayPos.z < 0.0 || rayPos.z > 1.0) {
            break;
          }
        }
        
        vec4 color = texture2D(u_transferFunction, vec2(maxIntensity, 0.5));
        gl_FragColor = vec4(color.rgb, 1.0);
      }
    `;

    return this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Create surface rendering shader program
   */
  private createSurfaceRenderingShader(): WebGLProgram | null {
    // Similar to volume rendering but with surface detection
    const vertexShaderSource = `
      attribute vec3 a_position;
      
      uniform mat4 u_modelViewMatrix;
      uniform mat4 u_projectionMatrix;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      void main() {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        v_rayStart = (a_position + 1.0) * 0.5;
        v_rayDirection = normalize(a_position);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D u_volumeTexture;
      uniform sampler2D u_transferFunction;
      uniform vec3 u_volumeDimensions;
      uniform float u_stepSize;
      uniform int u_maxSteps;
      uniform float u_gradientThreshold;
      uniform vec3 u_lightDirection;
      uniform vec3 u_lightColor;
      uniform float u_ambientIntensity;
      uniform float u_diffuseIntensity;
      uniform float u_specularIntensity;
      uniform float u_shininess;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      float sampleVolume(vec3 pos) {
        if (pos.x < 0.0 || pos.x > 1.0 || 
            pos.y < 0.0 || pos.y > 1.0 || 
            pos.z < 0.0 || pos.z > 1.0) {
          return 0.0;
        }
        
        vec2 texCoord = vec2(
          pos.x + floor(pos.z * u_volumeDimensions.z) / u_volumeDimensions.z,
          pos.y
        );
        return texture2D(u_volumeTexture, texCoord).r;
      }
      
      vec3 calculateGradient(vec3 pos) {
        float delta = 1.0 / max(u_volumeDimensions.x, max(u_volumeDimensions.y, u_volumeDimensions.z));
        
        float dx = sampleVolume(pos + vec3(delta, 0.0, 0.0)) - sampleVolume(pos - vec3(delta, 0.0, 0.0));
        float dy = sampleVolume(pos + vec3(0.0, delta, 0.0)) - sampleVolume(pos - vec3(0.0, delta, 0.0));
        float dz = sampleVolume(pos + vec3(0.0, 0.0, delta)) - sampleVolume(pos - vec3(0.0, 0.0, delta));
        
        return vec3(dx, dy, dz);
      }
      
      void main() {
        vec3 rayPos = v_rayStart;
        vec3 rayDir = normalize(v_rayDirection);
        
        for (int i = 0; i < 1000; i++) {
          if (i >= u_maxSteps) break;
          
          float intensity = sampleVolume(rayPos);
          vec3 gradient = calculateGradient(rayPos);
          float gradientMagnitude = length(gradient);
          
          if (intensity > 0.1 && gradientMagnitude > u_gradientThreshold) {
            // Surface detected
            vec3 normal = normalize(gradient);
            vec4 surfaceColor = texture2D(u_transferFunction, vec2(intensity, 0.5));
            
            // Calculate lighting
            vec3 ambient = u_ambientIntensity * surfaceColor.rgb;
            float diff = max(dot(normal, u_lightDirection), 0.0);
            vec3 diffuse = u_diffuseIntensity * diff * u_lightColor * surfaceColor.rgb;
            
            vec3 viewDir = normalize(-rayDir);
            vec3 reflectDir = reflect(-u_lightDirection, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
            vec3 specular = u_specularIntensity * spec * u_lightColor;
            
            vec3 finalColor = ambient + diffuse + specular;
            gl_FragColor = vec4(finalColor, 1.0);
            return;
          }
          
          rayPos += rayDir * u_stepSize;
          
          if (rayPos.x < 0.0 || rayPos.x > 1.0 || 
              rayPos.y < 0.0 || rayPos.y > 1.0 || 
              rayPos.z < 0.0 || rayPos.z > 1.0) {
            break;
          }
        }
        
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      }
    `;

    return this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Create isosurface rendering shader program
   */
  private createIsosurfaceRenderingShader(): WebGLProgram | null {
    const vertexShaderSource = `
      attribute vec3 a_position;
      
      uniform mat4 u_modelViewMatrix;
      uniform mat4 u_projectionMatrix;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      void main() {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
        v_rayStart = (a_position + 1.0) * 0.5;
        v_rayDirection = normalize(a_position);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D u_volumeTexture;
      uniform vec3 u_volumeDimensions;
      uniform float u_stepSize;
      uniform int u_maxSteps;
      uniform float u_isoValue;
      uniform vec3 u_lightDirection;
      uniform vec3 u_lightColor;
      uniform vec3 u_surfaceColor;
      uniform float u_ambientIntensity;
      uniform float u_diffuseIntensity;
      uniform float u_specularIntensity;
      uniform float u_shininess;
      
      varying vec3 v_rayStart;
      varying vec3 v_rayDirection;
      
      float sampleVolume(vec3 pos) {
        if (pos.x < 0.0 || pos.x > 1.0 || 
            pos.y < 0.0 || pos.y > 1.0 || 
            pos.z < 0.0 || pos.z > 1.0) {
          return 0.0;
        }
        
        vec2 texCoord = vec2(
          pos.x + floor(pos.z * u_volumeDimensions.z) / u_volumeDimensions.z,
          pos.y
        );
        return texture2D(u_volumeTexture, texCoord).r;
      }
      
      vec3 calculateGradient(vec3 pos) {
        float delta = 1.0 / max(u_volumeDimensions.x, max(u_volumeDimensions.y, u_volumeDimensions.z));
        
        float dx = sampleVolume(pos + vec3(delta, 0.0, 0.0)) - sampleVolume(pos - vec3(delta, 0.0, 0.0));
        float dy = sampleVolume(pos + vec3(0.0, delta, 0.0)) - sampleVolume(pos - vec3(0.0, delta, 0.0));
        float dz = sampleVolume(pos + vec3(0.0, 0.0, delta)) - sampleVolume(pos - vec3(0.0, 0.0, delta));
        
        return normalize(vec3(dx, dy, dz));
      }
      
      void main() {
        vec3 rayPos = v_rayStart;
        vec3 rayDir = normalize(v_rayDirection);
        
        float prevIntensity = sampleVolume(rayPos);
        
        for (int i = 0; i < 1000; i++) {
          if (i >= u_maxSteps) break;
          
          rayPos += rayDir * u_stepSize;
          float intensity = sampleVolume(rayPos);
          
          // Check for isosurface crossing
          if ((prevIntensity < u_isoValue && intensity >= u_isoValue) ||
              (prevIntensity > u_isoValue && intensity <= u_isoValue)) {
            
            // Interpolate exact surface position
            float t = (u_isoValue - prevIntensity) / (intensity - prevIntensity);
            vec3 surfacePos = rayPos - rayDir * u_stepSize * (1.0 - t);
            
            // Calculate surface normal
            vec3 normal = calculateGradient(surfacePos);
            
            // Calculate lighting
            vec3 ambient = u_ambientIntensity * u_surfaceColor;
            float diff = max(dot(normal, u_lightDirection), 0.0);
            vec3 diffuse = u_diffuseIntensity * diff * u_lightColor * u_surfaceColor;
            
            vec3 viewDir = normalize(-rayDir);
            vec3 reflectDir = reflect(-u_lightDirection, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
            vec3 specular = u_specularIntensity * spec * u_lightColor;
            
            vec3 finalColor = ambient + diffuse + specular;
            gl_FragColor = vec4(finalColor, 1.0);
            return;
          }
          
          prevIntensity = intensity;
          
          if (rayPos.x < 0.0 || rayPos.x > 1.0 || 
              rayPos.y < 0.0 || rayPos.y > 1.0 || 
              rayPos.z < 0.0 || rayPos.z > 1.0) {
            break;
          }
        }
        
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      }
    `;

    return this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
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
      console.error('🎯 [ThreeDVolumeRenderer] Shader program linking failed:', error);
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
      console.error('🎯 [ThreeDVolumeRenderer] Shader compilation failed:', error);
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create cube geometry for volume rendering
   */
  private createCubeGeometry(): void {
    if (!this.gl) return;

    // Cube vertices
    const vertices = new Float32Array([
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
      
      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,
      
      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,
      
      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,
      
      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,
      
      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0
    ]);

    this.cubeVertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Cube indices
    const indices = new Uint16Array([
      0,  1,  2,    0,  2,  3,    // front
      4,  5,  6,    4,  6,  7,    // back
      8,  9,  10,   8,  10, 11,   // top
      12, 13, 14,   12, 14, 15,   // bottom
      16, 17, 18,   16, 18, 19,   // right
      20, 21, 22,   20, 22, 23    // left
    ]);

    this.cubeIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
  }

  /**
   * Create noise texture for jittering
   */
  private createNoiseTexture(): void {
    if (!this.gl) return;

    const size = 64;
    const data = new Uint8Array(size * size);
    
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 255;
    }

    this.noiseTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, size, size, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, data);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
  }

  /**
   * Setup default lighting
   */
  private setupDefaultLighting(): void {
    this.lights = [
      {
        type: 'directional',
        position: { x: 1, y: 1, z: 1 },
        direction: { x: -1, y: -1, z: -1 },
        color: { r: 1, g: 1, b: 1 },
        intensity: 1.0,
        enabled: true
      },
      {
        type: 'ambient',
        position: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 0 },
        color: { r: 0.3, g: 0.3, b: 0.3 },
        intensity: 0.3,
        enabled: true
      }
    ];
  }

  /**
   * Create default transfer function
   */
  private createDefaultTransferFunction(): TransferFunction {
    return {
      opacity: [
        { position: 0.0, value: 0.0 },
        { position: 0.2, value: 0.0 },
        { position: 0.3, value: 0.1 },
        { position: 0.5, value: 0.3 },
        { position: 0.7, value: 0.6 },
        { position: 1.0, value: 0.9 }
      ],
      color: [
        { position: 0.0, r: 0.0, g: 0.0, b: 0.0 },
        { position: 0.2, r: 0.4, g: 0.2, b: 0.1 },
        { position: 0.5, r: 0.8, g: 0.6, b: 0.4 },
        { position: 0.8, r: 1.0, g: 0.9, b: 0.8 },
        { position: 1.0, r: 1.0, g: 1.0, b: 1.0 }
      ],
      windowCenter: 0.5,
      windowWidth: 1.0
    };
  }

  /**
   * Load volume data
   */
  public loadVolumeData(volumeData: VolumeData): void {
    this.volumeData = volumeData;
    this.createVolumeTexture();
    this.createTransferFunctionTexture();
    console.log('🎯 [ThreeDVolumeRenderer] Volume data loaded:', volumeData.dimensions);
  }

  /**
   * Create volume texture
   */
  private createVolumeTexture(): void {
    if (!this.gl || !this.volumeData) return;

    this.volumeTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.volumeTexture);

    // Convert volume data to texture format
    const { width, height, depth } = this.volumeData.dimensions;
    const textureWidth = width * Math.ceil(Math.sqrt(depth));
    const textureHeight = height * Math.ceil(Math.sqrt(depth));

    const normalizedData = new Float32Array(textureWidth * textureHeight);
    const range = this.volumeData.rescaleSlope * 65535 + this.volumeData.rescaleIntercept;

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
          
          // Apply rescale slope and intercept
          value = value * this.volumeData.rescaleSlope + this.volumeData.rescaleIntercept;
          normalizedData[textureIndex] = value / range;
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

    for (let i = 0; i < resolution; i++) {
      const value = i / (resolution - 1);
      
      // Interpolate opacity
      let alpha = 0;
      for (let j = 1; j < this.config.transferFunction.opacity.length; j++) {
        const prev = this.config.transferFunction.opacity[j - 1];
        const curr = this.config.transferFunction.opacity[j];
        
        if (value >= prev.position && value <= curr.position) {
          const t = (value - prev.position) / (curr.position - prev.position);
          alpha = prev.value + t * (curr.value - prev.value);
          break;
        }
      }
      
      // Interpolate color
      let r = 0, g = 0, b = 0;
      for (let j = 1; j < this.config.transferFunction.color.length; j++) {
        const prev = this.config.transferFunction.color[j - 1];
        const curr = this.config.transferFunction.color[j];
        
        if (value >= prev.position && value <= curr.position) {
          const t = (value - prev.position) / (curr.position - prev.position);
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
   * Set rendering mode
   */
  public setRenderingMode(mode: string): void {
    if (this.renderingModes[mode]) {
      this.currentRenderingMode = this.renderingModes[mode];
      console.log('🎯 [ThreeDVolumeRenderer] Rendering mode changed to:', mode);
    }
  }

  /**
   * Get available rendering modes
   */
  public getRenderingModes(): { [key: string]: RenderingMode } {
    return { ...this.renderingModes };
  }

  /**
   * Set camera parameters
   */
  public setCamera(camera: Partial<Camera3D>): void {
    this.camera = { ...this.camera, ...camera };
  }

  /**
   * Set transfer function
   */
  public setTransferFunction(transferFunction: TransferFunction): void {
    this.config.transferFunction = transferFunction;
    this.createTransferFunctionTexture();
  }

  /**
   * Update viewport
   */
  public updateViewport(): void {
    if (!this.gl) return;

    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render volume
   */
  public render(): void {
    if (!this.gl || !this.volumeData || !this.volumeTexture) {
      return;
    }

    const startTime = performance.now();

    try {
      // Update viewport
      this.updateViewport();

      // Clear canvas
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      // Select appropriate shader program
      let program: WebGLProgram | null = null;
      switch (this.currentRenderingMode.type) {
        case 'volume':
          program = this.volumeRenderingProgram;
          break;
        case 'mip':
          program = this.mipRenderingProgram;
          break;
        case 'surface':
          program = this.surfaceRenderingProgram;
          break;
        case 'isosurface':
          program = this.isosurfaceRenderingProgram;
          break;
      }

      if (!program) {
        throw new Error(`No shader program for rendering mode: ${this.currentRenderingMode.type}`);
      }

      // Use shader program
      this.gl.useProgram(program);

      // Set uniforms
      this.setUniforms(program);

      // Bind textures
      this.bindTextures(program);

      // Bind geometry
      this.bindGeometry(program);

      // Draw
      this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);

      // Update stats
      this.stats.frameTime = performance.now() - startTime;
      this.stats.raysCast = this.canvas.width * this.canvas.height;
      this.stats.samplesProcessed = this.stats.raysCast * this.config.maxRaySteps;

    } catch (error) {
      console.error('🎯 [ThreeDVolumeRenderer] Render error:', error);
      this.stats.renderingErrors.push(`Render error: ${error}`);
    }
  }

  /**
   * Set shader uniforms
   */
  private setUniforms(program: WebGLProgram): void {
    if (!this.gl || !this.volumeData) return;

    // Matrices
    const modelViewMatrix = this.createModelViewMatrix();
    const projectionMatrix = this.createProjectionMatrix();

    const modelViewLoc = this.gl.getUniformLocation(program, 'u_modelViewMatrix');
    const projectionLoc = this.gl.getUniformLocation(program, 'u_projectionMatrix');

    this.gl.uniformMatrix4fv(modelViewLoc, false, modelViewMatrix);
    this.gl.uniformMatrix4fv(projectionLoc, false, projectionMatrix);

    // Volume properties
    const volumeDimLoc = this.gl.getUniformLocation(program, 'u_volumeDimensions');
    const volumeSpacingLoc = this.gl.getUniformLocation(program, 'u_volumeSpacing');
    const cameraPosLoc = this.gl.getUniformLocation(program, 'u_cameraPosition');

    this.gl.uniform3f(volumeDimLoc, 
      this.volumeData.dimensions.width, 
      this.volumeData.dimensions.height, 
      this.volumeData.dimensions.depth
    );
    this.gl.uniform3f(volumeSpacingLoc, 
      this.volumeData.spacing.x, 
      this.volumeData.spacing.y, 
      this.volumeData.spacing.z
    );
    this.gl.uniform3f(cameraPosLoc, 
      this.camera.position.x, 
      this.camera.position.y, 
      this.camera.position.z
    );

    // Rendering parameters
    const stepSizeLoc = this.gl.getUniformLocation(program, 'u_stepSize');
    const maxStepsLoc = this.gl.getUniformLocation(program, 'u_maxSteps');

    this.gl.uniform1f(stepSizeLoc, this.config.rayStepSize);
    this.gl.uniform1i(maxStepsLoc, this.config.maxRaySteps);

    // Lighting
    if (this.config.enableLighting && this.lights.length > 0) {
      const mainLight = this.lights.find(light => light.type === 'directional' && light.enabled);
      if (mainLight) {
        const lightDirLoc = this.gl.getUniformLocation(program, 'u_lightDirection');
        const lightColorLoc = this.gl.getUniformLocation(program, 'u_lightColor');
        
        this.gl.uniform3f(lightDirLoc, 
          mainLight.direction.x, 
          mainLight.direction.y, 
          mainLight.direction.z
        );
        this.gl.uniform3f(lightColorLoc, 
          mainLight.color.r, 
          mainLight.color.g, 
          mainLight.color.b
        );
      }

      const ambientLight = this.lights.find(light => light.type === 'ambient' && light.enabled);
      if (ambientLight) {
        const ambientLoc = this.gl.getUniformLocation(program, 'u_ambientIntensity');
        this.gl.uniform1f(ambientLoc, ambientLight.intensity);
      }
    }

    // Mode-specific parameters
    if (this.currentRenderingMode.type === 'isosurface') {
      const isoValueLoc = this.gl.getUniformLocation(program, 'u_isoValue');
      this.gl.uniform1f(isoValueLoc, this.currentRenderingMode.parameters.isoValue || 0.5);
    }

    if (this.currentRenderingMode.type === 'surface') {
      const gradientThresholdLoc = this.gl.getUniformLocation(program, 'u_gradientThreshold');
      this.gl.uniform1f(gradientThresholdLoc, this.currentRenderingMode.parameters.gradientThreshold || 0.1);
    }

    // Time for animation effects
    const timeLoc = this.gl.getUniformLocation(program, 'u_time');
    if (timeLoc) {
      this.gl.uniform1f(timeLoc, performance.now() * 0.001);
    }
  }

  /**
   * Bind textures
   */
  private bindTextures(program: WebGLProgram): void {
    if (!this.gl) return;

    // Volume texture
    if (this.volumeTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.volumeTexture);
      const volumeTexLoc = this.gl.getUniformLocation(program, 'u_volumeTexture');
      this.gl.uniform1i(volumeTexLoc, 0);
    }

    // Transfer function texture
    if (this.transferFunctionTexture) {
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.transferFunctionTexture);
      const transferFuncLoc = this.gl.getUniformLocation(program, 'u_transferFunction');
      this.gl.uniform1i(transferFuncLoc, 1);
    }

    // Noise texture
    if (this.noiseTexture) {
      this.gl.activeTexture(this.gl.TEXTURE2);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
      const noiseTexLoc = this.gl.getUniformLocation(program, 'u_noiseTexture');
      this.gl.uniform1i(noiseTexLoc, 2);
    }
  }

  /**
   * Bind geometry
   */
  private bindGeometry(program: WebGLProgram): void {
    if (!this.gl || !this.cubeVertexBuffer || !this.cubeIndexBuffer) return;

    // Bind vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexBuffer);
    
    const positionLoc = this.gl.getAttribLocation(program, 'a_position');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 3, this.gl.FLOAT, false, 0, 0);

    // Bind index buffer
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
  }

  /**
   * Create model-view matrix
   */
  private createModelViewMatrix(): Float32Array {
    // Simple lookAt matrix implementation
    const { position, target, up } = this.camera;
    
    const forward = this.normalize([
      target.x - position.x,
      target.y - position.y,
      target.z - position.z
    ]);
    
    const right = this.normalize(this.cross(forward, [up.x, up.y, up.z]));
    const upVector = this.cross(right, forward);

    return new Float32Array([
      right[0], upVector[0], -forward[0], 0,
      right[1], upVector[1], -forward[1], 0,
      right[2], upVector[2], -forward[2], 0,
      -this.dot(right, [position.x, position.y, position.z]),
      -this.dot(upVector, [position.x, position.y, position.z]),
      this.dot(forward, [position.x, position.y, position.z]),
      1
    ]);
  }

  /**
   * Create projection matrix
   */
  private createProjectionMatrix(): Float32Array {
    const { fov, near, far } = this.camera;
    const aspect = this.canvas.width / this.canvas.height;
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov * Math.PI / 180);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  /**
   * Vector math utilities
   */
  private normalize(v: number[]): number[] {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return length > 0 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, 0];
  }

  private cross(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  private dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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
    console.log('🎯 [ThreeDVolumeRenderer] Started continuous rendering');
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
    
    console.log('🎯 [ThreeDVolumeRenderer] Stopped continuous rendering');
  }

  /**
   * Get rendering statistics
   */
  public getStats(): RenderingStats3D {
    return { ...this.stats };
  }

  /**
   * Resize canvas
   */
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.updateViewport();
  }

  /**
   * Cleanup resources
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
      
      if (this.noiseTexture) {
        this.gl.deleteTexture(this.noiseTexture);
        this.noiseTexture = null;
      }
      
      // Delete buffers
      if (this.cubeVertexBuffer) {
        this.gl.deleteBuffer(this.cubeVertexBuffer);
        this.cubeVertexBuffer = null;
      }
      
      if (this.cubeIndexBuffer) {
        this.gl.deleteBuffer(this.cubeIndexBuffer);
        this.cubeIndexBuffer = null;
      }
      
      // Delete programs
      if (this.volumeRenderingProgram) {
        this.gl.deleteProgram(this.volumeRenderingProgram);
        this.volumeRenderingProgram = null;
      }
      
      if (this.mipRenderingProgram) {
        this.gl.deleteProgram(this.mipRenderingProgram);
        this.mipRenderingProgram = null;
      }
      
      if (this.surfaceRenderingProgram) {
        this.gl.deleteProgram(this.surfaceRenderingProgram);
        this.surfaceRenderingProgram = null;
      }
      
      if (this.isosurfaceRenderingProgram) {
        this.gl.deleteProgram(this.isosurfaceRenderingProgram);
        this.isosurfaceRenderingProgram = null;
      }
    }
    
    console.log('🎯 [ThreeDVolumeRenderer] Resources disposed');
  }
}

export { ThreeDVolumeRenderer };