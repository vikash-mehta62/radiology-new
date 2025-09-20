/**
 * WebGL-Based Rendering Engine
 * High-performance GPU-accelerated rendering for medical imaging
 */

import { performanceMonitor } from './performanceMonitor';

export interface RenderingConfig {
  canvas: HTMLCanvasElement;
  enableAntialiasing: boolean;
  enableDepthTest: boolean;
  enableBlending: boolean;
  maxTextureSize: number;
  adaptiveQuality: boolean;
  debugMode: boolean;
  colorSpace: 'srgb' | 'rec2020' | 'display-p3';
  pixelRatio: number;
}

export interface TextureConfig {
  width: number;
  height: number;
  format: 'RGBA' | 'RGB' | 'LUMINANCE' | 'LUMINANCE_ALPHA' | 'R16F' | 'R32F';
  type: 'UNSIGNED_BYTE' | 'UNSIGNED_SHORT' | 'FLOAT' | 'HALF_FLOAT';
  minFilter: 'NEAREST' | 'LINEAR' | 'NEAREST_MIPMAP_NEAREST' | 'LINEAR_MIPMAP_NEAREST' | 'NEAREST_MIPMAP_LINEAR' | 'LINEAR_MIPMAP_LINEAR';
  magFilter: 'NEAREST' | 'LINEAR';
  wrapS: 'CLAMP_TO_EDGE' | 'REPEAT' | 'MIRRORED_REPEAT';
  wrapT: 'CLAMP_TO_EDGE' | 'REPEAT' | 'MIRRORED_REPEAT';
  generateMipmaps: boolean;
}

export interface ShaderProgram {
  program: WebGLProgram;
  uniforms: { [key: string]: WebGLUniformLocation | null };
  attributes: { [key: string]: number };
}

export interface RenderingMetrics {
  frameTime: number;
  drawCalls: number;
  textureMemory: number;
  shaderCompileTime: number;
  canvasResizes: number;
  renderingErrors: string[];
}

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  gamma: number;
  windowCenter: number;
  windowWidth: number;
  invert: boolean;
  colormap: string;
}

class WebGLRenderingEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  private config: RenderingConfig;
  private shaderPrograms: Map<string, ShaderProgram> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();
  private framebuffers: Map<string, WebGLFramebuffer> = new Map();
  
  // Rendering state
  private currentProgram: ShaderProgram | null = null;
  private viewportTransform: ViewportTransform = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipX: false,
    flipY: false
  };
  private imageAdjustments: ImageAdjustments = {
    brightness: 0,
    contrast: 1,
    gamma: 1,
    windowCenter: 0.5,
    windowWidth: 1.0,
    invert: false,
    colormap: 'grayscale'
  };
  
  // Performance tracking
  private metrics: RenderingMetrics = {
    frameTime: 0,
    drawCalls: 0,
    textureMemory: 0,
    shaderCompileTime: 0,
    canvasResizes: 0,
    renderingErrors: []
  };
  
  // Geometry buffers
  private quadBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  
  // Animation frame tracking
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  constructor(config: Partial<RenderingConfig>) {
    this.config = {
      canvas: config.canvas!,
      enableAntialiasing: config.enableAntialiasing ?? true,
      enableDepthTest: config.enableDepthTest ?? false,
      enableBlending: config.enableBlending ?? true,
      maxTextureSize: config.maxTextureSize ?? 4096,
      adaptiveQuality: config.adaptiveQuality ?? true,
      debugMode: config.debugMode ?? false,
      colorSpace: config.colorSpace ?? 'srgb',
      pixelRatio: config.pixelRatio ?? (window.devicePixelRatio || 1)
    };
    
    this.canvas = this.config.canvas;
    this.initialize();
  }

  /**
   * Initialize WebGL context and resources
   */
  private initialize(): void {
    try {
      // Try WebGL2 first, fallback to WebGL1
      this.gl = this.canvas.getContext('webgl2', {
        antialias: this.config.enableAntialiasing,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      }) as WebGL2RenderingContext;

      if (!this.gl) {
        this.gl = this.canvas.getContext('webgl', {
          antialias: this.config.enableAntialiasing,
          alpha: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false
        }) as WebGLRenderingContext;
      }

      if (!this.gl) {
        throw new Error('WebGL not supported');
      }

      console.log('🎨 [WebGLRenderingEngine] Initialized with', this.gl.constructor.name);
      
      // Setup WebGL state
      this.setupWebGLState();
      
      // Create default shaders
      this.createDefaultShaders();
      
      // Create geometry buffers
      this.createGeometryBuffers();
      
      // Setup resize observer
      this.setupResizeObserver();
      
    } catch (error) {
      console.error('🎨 [WebGLRenderingEngine] Initialization failed:', error);
      this.metrics.renderingErrors.push(`Initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Setup initial WebGL state
   */
  private setupWebGLState(): void {
    if (!this.gl) return;

    // Enable/disable features based on config
    if (this.config.enableDepthTest) {
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);
    }

    if (this.config.enableBlending) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    // Set clear color
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Set viewport
    this.updateViewport();
  }

  /**
   * Create default shader programs
   */
  private createDefaultShaders(): void {
    // Basic image rendering shader
    const imageVertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        
        // Convert to clip space
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        
        v_texCoord = a_texCoord;
      }
    `;

    const imageFragmentShader = `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_gamma;
      uniform float u_windowCenter;
      uniform float u_windowWidth;
      uniform bool u_invert;
      uniform int u_colormap;
      
      varying vec2 v_texCoord;
      
      vec3 applyColormap(float value, int colormap) {
        if (colormap == 0) {
          // Grayscale
          return vec3(value);
        } else if (colormap == 1) {
          // Hot colormap
          float r = clamp(value * 3.0, 0.0, 1.0);
          float g = clamp(value * 3.0 - 1.0, 0.0, 1.0);
          float b = clamp(value * 3.0 - 2.0, 0.0, 1.0);
          return vec3(r, g, b);
        } else if (colormap == 2) {
          // Jet colormap (simplified)
          float r = clamp(1.5 - abs(4.0 * value - 3.0), 0.0, 1.0);
          float g = clamp(1.5 - abs(4.0 * value - 2.0), 0.0, 1.0);
          float b = clamp(1.5 - abs(4.0 * value - 1.0), 0.0, 1.0);
          return vec3(r, g, b);
        }
        return vec3(value);
      }
      
      void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        float intensity = texColor.r;
        
        // Apply windowing
        intensity = (intensity - u_windowCenter + u_windowWidth * 0.5) / u_windowWidth;
        intensity = clamp(intensity, 0.0, 1.0);
        
        // Apply brightness and contrast
        intensity = (intensity - 0.5) * u_contrast + 0.5 + u_brightness;
        intensity = clamp(intensity, 0.0, 1.0);
        
        // Apply gamma correction
        intensity = pow(intensity, 1.0 / u_gamma);
        
        // Apply inversion
        if (u_invert) {
          intensity = 1.0 - intensity;
        }
        
        // Apply colormap
        vec3 color = applyColormap(intensity, u_colormap);
        
        gl_FragColor = vec4(color, texColor.a);
      }
    `;

    this.createShaderProgram('image', imageVertexShader, imageFragmentShader);
  }

  /**
   * Create a shader program
   */
  public createShaderProgram(name: string, vertexSource: string, fragmentSource: string): ShaderProgram | null {
    if (!this.gl) return null;

    const startTime = performance.now();

    try {
      const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

      if (!vertexShader || !fragmentShader) {
        throw new Error('Failed to compile shaders');
      }

      const program = this.gl.createProgram();
      if (!program) {
        throw new Error('Failed to create shader program');
      }

      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        const error = this.gl.getProgramInfoLog(program);
        this.gl.deleteProgram(program);
        throw new Error(`Shader program linking failed: ${error}`);
      }

      // Get uniform and attribute locations
      const uniforms: { [key: string]: WebGLUniformLocation | null } = {};
      const attributes: { [key: string]: number } = {};

      const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < numUniforms; i++) {
        const uniformInfo = this.gl.getActiveUniform(program, i);
        if (uniformInfo) {
          uniforms[uniformInfo.name] = this.gl.getUniformLocation(program, uniformInfo.name);
        }
      }

      const numAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
      for (let i = 0; i < numAttributes; i++) {
        const attributeInfo = this.gl.getActiveAttrib(program, i);
        if (attributeInfo) {
          attributes[attributeInfo.name] = this.gl.getAttribLocation(program, attributeInfo.name);
        }
      }

      const shaderProgram: ShaderProgram = {
        program,
        uniforms,
        attributes
      };

      this.shaderPrograms.set(name, shaderProgram);

      // Clean up shaders
      this.gl.deleteShader(vertexShader);
      this.gl.deleteShader(fragmentShader);

      const compileTime = performance.now() - startTime;
      this.metrics.shaderCompileTime += compileTime;

      console.log(`🎨 [WebGLRenderingEngine] Created shader program '${name}' in ${compileTime.toFixed(2)}ms`);
      
      return shaderProgram;

    } catch (error) {
      console.error(`🎨 [WebGLRenderingEngine] Failed to create shader program '${name}':`, error);
      this.metrics.renderingErrors.push(`Shader compilation failed: ${error}`);
      return null;
    }
  }

  /**
   * Compile a shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }

    return shader;
  }

  /**
   * Create geometry buffers for quad rendering
   */
  private createGeometryBuffers(): void {
    if (!this.gl) return;

    // Create quad vertices (position + texture coordinates)
    const vertices = new Float32Array([
      // Position  // TexCoord
      -1.0, -1.0,  0.0, 0.0,
       1.0, -1.0,  1.0, 0.0,
       1.0,  1.0,  1.0, 1.0,
      -1.0,  1.0,  0.0, 1.0
    ]);

    this.quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Create indices
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
  }

  /**
   * Create a texture from image data
   */
  public createTexture(name: string, data: ArrayBufferView | ImageData | HTMLImageElement | HTMLCanvasElement, config: Partial<TextureConfig> = {}): WebGLTexture | null {
    if (!this.gl) return null;

    const textureConfig: TextureConfig = {
      width: config.width || 512,
      height: config.height || 512,
      format: config.format || 'RGBA',
      type: config.type || 'UNSIGNED_BYTE',
      minFilter: config.minFilter || 'LINEAR',
      magFilter: config.magFilter || 'LINEAR',
      wrapS: config.wrapS || 'CLAMP_TO_EDGE',
      wrapT: config.wrapT || 'CLAMP_TO_EDGE',
      generateMipmaps: config.generateMipmaps ?? false
    };

    try {
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create texture');
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      // Set texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl[textureConfig.minFilter]);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl[textureConfig.magFilter]);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl[textureConfig.wrapS]);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl[textureConfig.wrapT]);

      // Upload texture data
      const format = this.gl[textureConfig.format];
      const type = this.gl[textureConfig.type];

      if (data instanceof HTMLImageElement || data instanceof HTMLCanvasElement || data instanceof ImageData) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, format, format, type, data);
      } else {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, format, textureConfig.width, textureConfig.height, 0, format, type, data);
      }

      // Generate mipmaps if requested
      if (textureConfig.generateMipmaps) {
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
      }

      this.textures.set(name, texture);

      // Update texture memory usage
      const bytesPerPixel = this.getBytesPerPixel(textureConfig.format, textureConfig.type);
      const textureSize = textureConfig.width * textureConfig.height * bytesPerPixel;
      this.metrics.textureMemory += textureSize;

      console.log(`🎨 [WebGLRenderingEngine] Created texture '${name}' (${textureConfig.width}x${textureConfig.height}, ${this.formatBytes(textureSize)})`);

      return texture;

    } catch (error) {
      console.error(`🎨 [WebGLRenderingEngine] Failed to create texture '${name}':`, error);
      this.metrics.renderingErrors.push(`Texture creation failed: ${error}`);
      return null;
    }
  }

  /**
   * Render an image with current settings
   */
  public renderImage(textureName: string): void {
    if (!this.gl || !this.quadBuffer || !this.indexBuffer) return;

    const startTime = performance.now();

    try {
      const program = this.shaderPrograms.get('image');
      const texture = this.textures.get(textureName);

      if (!program || !texture) {
        throw new Error(`Missing shader program or texture: ${textureName}`);
      }

      // Use shader program
      this.gl.useProgram(program.program);
      this.currentProgram = program;

      // Clear canvas
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | (this.config.enableDepthTest ? this.gl.DEPTH_BUFFER_BIT : 0));

      // Bind texture
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.uniform1i(program.uniforms.u_texture, 0);

      // Set uniforms
      this.setTransformUniforms(program);
      this.setImageAdjustmentUniforms(program);

      // Setup vertex attributes
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
      
      const positionLocation = program.attributes.a_position;
      const texCoordLocation = program.attributes.a_texCoord;

      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 16, 0);

      this.gl.enableVertexAttribArray(texCoordLocation);
      this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 16, 8);

      // Draw
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);

      this.metrics.drawCalls++;

    } catch (error) {
      console.error('🎨 [WebGLRenderingEngine] Render failed:', error);
      this.metrics.renderingErrors.push(`Render failed: ${error}`);
    }

    const frameTime = performance.now() - startTime;
    this.metrics.frameTime = frameTime;
    this.lastFrameTime = performance.now();

    // Update performance monitor
    performanceMonitor.recordRenderingMetrics(this.metrics);
  }

  /**
   * Set transform uniforms
   */
  private setTransformUniforms(program: ShaderProgram): void {
    if (!this.gl) return;

    // Create transformation matrix
    const transform = this.createTransformMatrix();
    this.gl.uniformMatrix3fv(program.uniforms.u_transform, false, transform);
    this.gl.uniform2f(program.uniforms.u_resolution, this.canvas.width, this.canvas.height);
  }

  /**
   * Set image adjustment uniforms
   */
  private setImageAdjustmentUniforms(program: ShaderProgram): void {
    if (!this.gl) return;

    this.gl.uniform1f(program.uniforms.u_brightness, this.imageAdjustments.brightness);
    this.gl.uniform1f(program.uniforms.u_contrast, this.imageAdjustments.contrast);
    this.gl.uniform1f(program.uniforms.u_gamma, this.imageAdjustments.gamma);
    this.gl.uniform1f(program.uniforms.u_windowCenter, this.imageAdjustments.windowCenter);
    this.gl.uniform1f(program.uniforms.u_windowWidth, this.imageAdjustments.windowWidth);
    this.gl.uniform1i(program.uniforms.u_invert, this.imageAdjustments.invert ? 1 : 0);
    
    // Colormap mapping
    const colormapIndex = this.getColormapIndex(this.imageAdjustments.colormap);
    this.gl.uniform1i(program.uniforms.u_colormap, colormapIndex);
  }

  /**
   * Create transformation matrix
   */
  private createTransformMatrix(): Float32Array {
    const { zoom, panX, panY, rotation, flipX, flipY } = this.viewportTransform;
    
    // Create transformation matrix (3x3 for 2D transforms)
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const scaleX = zoom * (flipX ? -1 : 1);
    const scaleY = zoom * (flipY ? -1 : 1);
    
    return new Float32Array([
      scaleX * cos, scaleX * sin, panX,
      -scaleY * sin, scaleY * cos, panY,
      0, 0, 1
    ]);
  }

  /**
   * Update viewport transform
   */
  public setViewportTransform(transform: Partial<ViewportTransform>): void {
    this.viewportTransform = { ...this.viewportTransform, ...transform };
  }

  /**
   * Update image adjustments
   */
  public setImageAdjustments(adjustments: Partial<ImageAdjustments>): void {
    this.imageAdjustments = { ...this.imageAdjustments, ...adjustments };
  }

  /**
   * Update viewport size
   */
  private updateViewport(): void {
    if (!this.gl) return;

    const displayWidth = Math.floor(this.canvas.clientWidth * this.config.pixelRatio);
    const displayHeight = Math.floor(this.canvas.clientHeight * this.config.pixelRatio);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.metrics.canvasResizes++;
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Setup resize observer
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        this.updateViewport();
      });
      resizeObserver.observe(this.canvas);
    }
  }

  /**
   * Get bytes per pixel for format/type combination
   */
  private getBytesPerPixel(format: string, type: string): number {
    let components = 1;
    switch (format) {
      case 'RGBA': components = 4; break;
      case 'RGB': components = 3; break;
      case 'LUMINANCE_ALPHA': components = 2; break;
      case 'LUMINANCE': components = 1; break;
    }

    let bytesPerComponent = 1;
    switch (type) {
      case 'UNSIGNED_BYTE': bytesPerComponent = 1; break;
      case 'UNSIGNED_SHORT': bytesPerComponent = 2; break;
      case 'FLOAT': bytesPerComponent = 4; break;
      case 'HALF_FLOAT': bytesPerComponent = 2; break;
    }

    return components * bytesPerComponent;
  }

  /**
   * Get colormap index
   */
  private getColormapIndex(colormap: string): number {
    switch (colormap) {
      case 'grayscale': return 0;
      case 'hot': return 1;
      case 'jet': return 2;
      default: return 0;
    }
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get current rendering metrics
   */
  public getMetrics(): RenderingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      frameTime: 0,
      drawCalls: 0,
      textureMemory: 0,
      shaderCompileTime: 0,
      canvasResizes: 0,
      renderingErrors: []
    };
  }

  /**
   * Get WebGL context info
   */
  public getContextInfo(): any {
    if (!this.gl) return null;

    return {
      version: this.gl.getParameter(this.gl.VERSION),
      vendor: this.gl.getParameter(this.gl.VENDOR),
      renderer: this.gl.getParameter(this.gl.RENDERER),
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      maxViewportDims: this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS),
      maxVertexAttribs: this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: this.gl.getParameter(this.gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      extensions: this.gl.getSupportedExtensions()
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.gl) {
      // Delete textures
      this.textures.forEach(texture => {
        this.gl!.deleteTexture(texture);
      });
      this.textures.clear();

      // Delete shader programs
      this.shaderPrograms.forEach(program => {
        this.gl!.deleteProgram(program.program);
      });
      this.shaderPrograms.clear();

      // Delete buffers
      if (this.quadBuffer) {
        this.gl.deleteBuffer(this.quadBuffer);
      }
      if (this.indexBuffer) {
        this.gl.deleteBuffer(this.indexBuffer);
      }

      // Delete framebuffers
      this.framebuffers.forEach(framebuffer => {
        this.gl!.deleteFramebuffer(framebuffer);
      });
      this.framebuffers.clear();
    }

    console.log('🎨 [WebGLRenderingEngine] Destroyed');
  }
}

export { WebGLRenderingEngine };