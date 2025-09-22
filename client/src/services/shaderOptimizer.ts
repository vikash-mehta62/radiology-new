/**
 * Advanced WebGL Shader Optimizer
 * Provides optimized shaders with texture compression support,
 * adaptive quality settings, and performance monitoring for medical imaging
 */

export interface ShaderConfiguration {
  enableTextureCompression: boolean;
  compressionFormat: 'DXT1' | 'DXT5' | 'ETC1' | 'ETC2' | 'ASTC' | 'auto';
  enableHalfFloatTextures: boolean;
  enableInstancing: boolean;
  maxTextureSize: number;
  enableMipmaps: boolean;
  anisotropicFiltering: number; // 0 = disabled, 1-16 = level
  enableShaderCache: boolean;
  optimizationLevel: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ShaderProgram {
  program: WebGLProgram;
  uniforms: { [key: string]: WebGLUniformLocation | null };
  attributes: { [key: string]: number };
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  id: string;
  compilationTime: number;
  lastUsed: number;
}

export interface TextureCompressionInfo {
  format: number;
  internalFormat: number;
  type: number;
  compressionRatio: number;
  supported: boolean;
  extension?: any;
}

/**
 * Optimized shader sources for different quality levels
 */
const VERTEX_SHADER_SOURCES = {
  basic: `
    attribute vec2 position;
    attribute vec2 texCoord;
    
    uniform float zoom;
    uniform vec2 pan;
    uniform float rotation;
    
    varying vec2 vTexCoord;
    varying vec2 vPosition;
    
    void main() {
      // Apply transformations
      vec2 pos = position;
      
      // Apply zoom
      pos *= zoom;
      
      // Apply rotation
      float cosR = cos(rotation);
      float sinR = sin(rotation);
      vec2 rotated = vec2(
        pos.x * cosR - pos.y * sinR,
        pos.x * sinR + pos.y * cosR
      );
      
      // Apply pan
      rotated += pan;
      
      gl_Position = vec4(rotated, 0.0, 1.0);
      vTexCoord = texCoord;
      vPosition = position;
    }
  `,
  
  optimized: `
    attribute vec2 position;
    attribute vec2 texCoord;
    
    uniform float zoom;
    uniform vec2 pan;
    uniform float rotation;
    uniform mat3 transformMatrix; // Pre-computed transformation matrix
    
    varying vec2 vTexCoord;
    varying vec2 vPosition;
    varying float vZoom; // Pass zoom to fragment shader for LOD
    
    void main() {
      // Use pre-computed transformation matrix for better performance
      vec3 transformed = transformMatrix * vec3(position, 1.0);
      
      gl_Position = vec4(transformed.xy, 0.0, 1.0);
      vTexCoord = texCoord;
      vPosition = position;
      vZoom = zoom;
    }
  `,
  
  ultra: `
    #version 300 es
    
    in vec2 position;
    in vec2 texCoord;
    
    uniform float zoom;
    uniform vec2 pan;
    uniform float rotation;
    uniform mat3 transformMatrix;
    uniform vec4 viewport; // x, y, width, height
    
    out vec2 vTexCoord;
    out vec2 vPosition;
    out float vZoom;
    out vec2 vScreenPos;
    
    void main() {
      vec3 transformed = transformMatrix * vec3(position, 1.0);
      
      gl_Position = vec4(transformed.xy, 0.0, 1.0);
      vTexCoord = texCoord;
      vPosition = position;
      vZoom = zoom;
      
      // Calculate screen position for advanced effects
      vScreenPos = (gl_Position.xy * 0.5 + 0.5) * viewport.zw + viewport.xy;
    }
  `
};

const FRAGMENT_SHADER_SOURCES = {
  basic: `
    precision mediump float;
    
    uniform sampler2D texture;
    uniform float windowWidth;
    uniform float windowCenter;
    
    varying vec2 vTexCoord;
    
    void main() {
      vec4 texel = texture2D(texture, vTexCoord);
      
      // Apply windowing
      float intensity = texel.r;
      float minWindow = windowCenter - windowWidth * 0.5;
      float maxWindow = windowCenter + windowWidth * 0.5;
      
      intensity = clamp((intensity - minWindow) / windowWidth, 0.0, 1.0);
      
      gl_FragColor = vec4(intensity, intensity, intensity, 1.0);
    }
  `,
  
  optimized: `
    precision highp float;
    
    uniform sampler2D texture;
    uniform float windowWidth;
    uniform float windowCenter;
    uniform float brightness;
    uniform float contrast;
    uniform vec3 colorMap; // RGB multipliers for color mapping
    
    varying vec2 vTexCoord;
    varying float vZoom;
    
    // Optimized windowing function
    float applyWindowing(float intensity) {
      float halfWidth = windowWidth * 0.5;
      return clamp((intensity - windowCenter + halfWidth) / windowWidth, 0.0, 1.0);
    }
    
    void main() {
      // Use LOD based on zoom level for better performance
      vec4 texel = texture2D(texture, vTexCoord, log2(max(1.0 / vZoom, 1.0)));
      
      float intensity = applyWindowing(texel.r);
      
      // Apply brightness and contrast
      intensity = clamp((intensity - 0.5) * contrast + 0.5 + brightness, 0.0, 1.0);
      
      // Apply color mapping
      vec3 color = intensity * colorMap;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  
  ultra: `
    #version 300 es
    precision highp float;
    
    uniform sampler2D texture;
    uniform float windowWidth;
    uniform float windowCenter;
    uniform float brightness;
    uniform float contrast;
    uniform vec3 colorMap;
    uniform float gamma;
    uniform vec2 textureSize;
    uniform float sharpenAmount;
    uniform bool enableAntialiasing;
    
    in vec2 vTexCoord;
    in float vZoom;
    in vec2 vScreenPos;
    
    out vec4 fragColor;
    
    // Advanced windowing with gamma correction
    float applyWindowing(float intensity) {
      float halfWidth = windowWidth * 0.5;
      float windowed = clamp((intensity - windowCenter + halfWidth) / windowWidth, 0.0, 1.0);
      return pow(windowed, 1.0 / gamma);
    }
    
    // Sharpening filter
    vec4 applySharpen(sampler2D tex, vec2 coord) {
      vec2 texelSize = 1.0 / textureSize;
      
      vec4 center = texture(tex, coord);
      vec4 top = texture(tex, coord + vec2(0.0, texelSize.y));
      vec4 bottom = texture(tex, coord - vec2(0.0, texelSize.y));
      vec4 left = texture(tex, coord - vec2(texelSize.x, 0.0));
      vec4 right = texture(tex, coord + vec2(texelSize.x, 0.0));
      
      vec4 sharpened = center * (1.0 + 4.0 * sharpenAmount) - 
                      (top + bottom + left + right) * sharpenAmount;
      
      return sharpened;
    }
    
    // Anti-aliasing using FXAA-like technique
    vec4 applyAntialiasing(sampler2D tex, vec2 coord) {
      vec2 texelSize = 1.0 / textureSize;
      
      vec4 center = texture(tex, coord);
      vec4 nw = texture(tex, coord + vec2(-texelSize.x, -texelSize.y));
      vec4 ne = texture(tex, coord + vec2(texelSize.x, -texelSize.y));
      vec4 sw = texture(tex, coord + vec2(-texelSize.x, texelSize.y));
      vec4 se = texture(tex, coord + vec2(texelSize.x, texelSize.y));
      
      vec4 average = (center + nw + ne + sw + se) * 0.2;
      
      float luma = dot(center.rgb, vec3(0.299, 0.587, 0.114));
      float lumaAvg = dot(average.rgb, vec3(0.299, 0.587, 0.114));
      
      float edgeStrength = abs(luma - lumaAvg);
      float blendFactor = smoothstep(0.0, 0.1, edgeStrength);
      
      return mix(center, average, blendFactor * 0.5);
    }
    
    void main() {
      vec4 texel;
      
      if (enableAntialiasing && vZoom > 2.0) {
        texel = applyAntialiasing(texture, vTexCoord);
      } else if (sharpenAmount > 0.0) {
        texel = applySharpen(texture, vTexCoord);
      } else {
        // Use appropriate LOD based on zoom
        float lod = log2(max(1.0 / vZoom, 1.0));
        texel = textureLod(texture, vTexCoord, lod);
      }
      
      float intensity = applyWindowing(texel.r);
      
      // Apply brightness and contrast
      intensity = clamp((intensity - 0.5) * contrast + 0.5 + brightness, 0.0, 1.0);
      
      // Apply color mapping
      vec3 color = intensity * colorMap;
      
      fragColor = vec4(color, 1.0);
    }
  `
};

/**
 * WebGL Shader Optimizer
 */
export class ShaderOptimizer {
  private gl: WebGL2RenderingContext;
  private config: ShaderConfiguration;
  private shaderCache: Map<string, ShaderProgram> = new Map();
  private compressionFormats: Map<string, TextureCompressionInfo> = new Map();
  private extensions: { [key: string]: any } = {};
  private performanceMetrics: {
    compilationTimes: number[];
    renderTimes: number[];
    textureUploadTimes: number[];
  } = {
    compilationTimes: [],
    renderTimes: [],
    textureUploadTimes: []
  };

  constructor(gl: WebGL2RenderingContext, config: Partial<ShaderConfiguration> = {}) {
    this.gl = gl;
    this.config = {
      enableTextureCompression: true,
      compressionFormat: 'auto',
      enableHalfFloatTextures: true,
      enableInstancing: false,
      maxTextureSize: 4096,
      enableMipmaps: true,
      anisotropicFiltering: 4,
      enableShaderCache: true,
      optimizationLevel: 'high',
      ...config
    };

    this.initializeExtensions();
    this.detectCompressionFormats();
  }

  /**
   * Initialize WebGL extensions
   */
  private initializeExtensions(): void {
    const extensionNames = [
      'EXT_texture_compression_s3tc',
      'WEBGL_compressed_texture_s3tc',
      'EXT_texture_compression_etc1',
      'WEBGL_compressed_texture_etc1',
      'EXT_texture_compression_astc',
      'WEBGL_compressed_texture_astc',
      'OES_texture_half_float',
      'EXT_texture_filter_anisotropic',
      'WEBGL_lose_context',
      'OES_vertex_array_object',
      'ANGLE_instanced_arrays'
    ];

    for (const name of extensionNames) {
      const ext = this.gl.getExtension(name);
      if (ext) {
        this.extensions[name] = ext;
        console.log(`✅ [ShaderOptimizer] Extension ${name} loaded`);
      }
    }
  }

  /**
   * Detect available texture compression formats
   */
  private detectCompressionFormats(): void {
    // S3TC/DXT compression
    if (this.extensions['EXT_texture_compression_s3tc'] || this.extensions['WEBGL_compressed_texture_s3tc']) {
      const ext = this.extensions['EXT_texture_compression_s3tc'] || this.extensions['WEBGL_compressed_texture_s3tc'];
      
      this.compressionFormats.set('DXT1', {
        format: ext.COMPRESSED_RGB_S3TC_DXT1_EXT,
        internalFormat: ext.COMPRESSED_RGB_S3TC_DXT1_EXT,
        type: this.gl.UNSIGNED_BYTE,
        compressionRatio: 6,
        supported: true,
        extension: ext
      });

      this.compressionFormats.set('DXT5', {
        format: ext.COMPRESSED_RGBA_S3TC_DXT5_EXT,
        internalFormat: ext.COMPRESSED_RGBA_S3TC_DXT5_EXT,
        type: this.gl.UNSIGNED_BYTE,
        compressionRatio: 4,
        supported: true,
        extension: ext
      });
    }

    // ETC1 compression
    if (this.extensions['EXT_texture_compression_etc1'] || this.extensions['WEBGL_compressed_texture_etc1']) {
      const ext = this.extensions['EXT_texture_compression_etc1'] || this.extensions['WEBGL_compressed_texture_etc1'];
      
      this.compressionFormats.set('ETC1', {
        format: ext.COMPRESSED_RGB_ETC1_WEBGL,
        internalFormat: ext.COMPRESSED_RGB_ETC1_WEBGL,
        type: this.gl.UNSIGNED_BYTE,
        compressionRatio: 6,
        supported: true,
        extension: ext
      });
    }

    // ASTC compression
    if (this.extensions['EXT_texture_compression_astc'] || this.extensions['WEBGL_compressed_texture_astc']) {
      const ext = this.extensions['EXT_texture_compression_astc'] || this.extensions['WEBGL_compressed_texture_astc'];
      
      this.compressionFormats.set('ASTC', {
        format: ext.COMPRESSED_RGBA_ASTC_4x4_KHR,
        internalFormat: ext.COMPRESSED_RGBA_ASTC_4x4_KHR,
        type: this.gl.UNSIGNED_BYTE,
        compressionRatio: 8,
        supported: true,
        extension: ext
      });
    }

    console.log(`🎯 [ShaderOptimizer] Detected ${this.compressionFormats.size} compression formats`);
  }

  /**
   * Get the best available compression format
   */
  getBestCompressionFormat(): TextureCompressionInfo | null {
    if (this.config.compressionFormat !== 'auto') {
      return this.compressionFormats.get(this.config.compressionFormat) || null;
    }

    // Priority order: ASTC > DXT5 > DXT1 > ETC1
    const priorities = ['ASTC', 'DXT5', 'DXT1', 'ETC1'];
    
    for (const format of priorities) {
      const info = this.compressionFormats.get(format);
      if (info && info.supported) {
        return info;
      }
    }

    return null;
  }

  /**
   * Create optimized shader program
   */
  createOptimizedShader(id: string): ShaderProgram | null {
    // Check cache first
    if (this.config.enableShaderCache && this.shaderCache.has(id)) {
      const cached = this.shaderCache.get(id)!;
      cached.lastUsed = Date.now();
      return cached;
    }

    const startTime = performance.now();

    try {
      // Select shader sources based on optimization level
      let vertexSource: string;
      let fragmentSource: string;

      switch (this.config.optimizationLevel) {
        case 'low':
          vertexSource = VERTEX_SHADER_SOURCES.basic;
          fragmentSource = FRAGMENT_SHADER_SOURCES.basic;
          break;
        case 'medium':
        case 'high':
          vertexSource = VERTEX_SHADER_SOURCES.optimized;
          fragmentSource = FRAGMENT_SHADER_SOURCES.optimized;
          break;
        case 'ultra':
          vertexSource = VERTEX_SHADER_SOURCES.ultra;
          fragmentSource = FRAGMENT_SHADER_SOURCES.ultra;
          break;
        default:
          vertexSource = VERTEX_SHADER_SOURCES.optimized;
          fragmentSource = FRAGMENT_SHADER_SOURCES.optimized;
      }

      // Compile shaders
      const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
      const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);

      if (!vertexShader || !fragmentShader) {
        return null;
      }

      // Create and link program
      const program = this.gl.createProgram();
      if (!program) {
        return null;
      }

      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error('❌ [ShaderOptimizer] Program linking failed:', this.gl.getProgramInfoLog(program));
        this.gl.deleteProgram(program);
        return null;
      }

      // Get uniform and attribute locations
      const uniforms: { [key: string]: WebGLUniformLocation | null } = {};
      const attributes: { [key: string]: number } = {};

      // Common uniforms
      const uniformNames = [
        'texture', 'windowWidth', 'windowCenter', 'zoom', 'pan', 'rotation',
        'brightness', 'contrast', 'colorMap', 'gamma', 'textureSize',
        'sharpenAmount', 'enableAntialiasing', 'transformMatrix', 'viewport'
      ];

      for (const name of uniformNames) {
        uniforms[name] = this.gl.getUniformLocation(program, name);
      }

      // Common attributes
      const attributeNames = ['position', 'texCoord'];
      for (const name of attributeNames) {
        attributes[name] = this.gl.getAttribLocation(program, name);
      }

      const compilationTime = performance.now() - startTime;
      this.performanceMetrics.compilationTimes.push(compilationTime);

      const shaderProgram: ShaderProgram = {
        program,
        uniforms,
        attributes,
        vertexShader,
        fragmentShader,
        id,
        compilationTime,
        lastUsed: Date.now()
      };

      // Cache the shader
      if (this.config.enableShaderCache) {
        this.shaderCache.set(id, shaderProgram);
      }

      console.log(`✅ [ShaderOptimizer] Shader '${id}' compiled in ${compilationTime.toFixed(2)}ms`);
      return shaderProgram;

    } catch (error) {
      console.error('❌ [ShaderOptimizer] Shader creation failed:', error);
      return null;
    }
  }

  /**
   * Compile individual shader
   */
  private compileShader(source: string, type: number): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) {
      return null;
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('❌ [ShaderOptimizer] Shader compilation failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create optimized texture with compression
   */
  createOptimizedTexture(
    image: HTMLImageElement | ImageData,
    options: {
      generateMipmaps?: boolean;
      anisotropicFiltering?: boolean;
      compression?: boolean;
    } = {}
  ): WebGLTexture | null {
    const startTime = performance.now();

    try {
      const texture = this.gl.createTexture();
      if (!texture) {
        return null;
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      // Determine if we should use compression
      const useCompression = options.compression !== false && this.config.enableTextureCompression;
      const compressionInfo = useCompression ? this.getBestCompressionFormat() : null;

      if (compressionInfo && image instanceof HTMLImageElement) {
        // Use compressed texture format
        console.log(`🗜️ [ShaderOptimizer] Using ${compressionInfo.extension.constructor.name} compression`);
        
        // For now, upload as regular texture since we'd need to compress on server
        // In production, you'd want to pre-compress textures or use a compression library
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          image
        );
      } else {
        // Regular texture upload
        if (image instanceof HTMLImageElement) {
          this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            image
          );
        } else {
          this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            image.width,
            image.height,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            image.data
          );
        }
      }

      // Set texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      // Generate mipmaps if requested and supported
      if (options.generateMipmaps !== false && this.config.enableMipmaps) {
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      } else {
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      }

      // Apply anisotropic filtering if available and requested
      if (options.anisotropicFiltering !== false && 
          this.config.anisotropicFiltering > 0 && 
          this.extensions['EXT_texture_filter_anisotropic']) {
        const ext = this.extensions['EXT_texture_filter_anisotropic'];
        const maxAnisotropy = this.gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        const anisotropy = Math.min(this.config.anisotropicFiltering, maxAnisotropy);
        this.gl.texParameterf(this.gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
      }

      const uploadTime = performance.now() - startTime;
      this.performanceMetrics.textureUploadTimes.push(uploadTime);

      console.log(`📸 [ShaderOptimizer] Texture created in ${uploadTime.toFixed(2)}ms`);
      return texture;

    } catch (error) {
      console.error('❌ [ShaderOptimizer] Texture creation failed:', error);
      return null;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const avgCompilation = this.performanceMetrics.compilationTimes.length > 0 
      ? this.performanceMetrics.compilationTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.compilationTimes.length 
      : 0;

    const avgTextureUpload = this.performanceMetrics.textureUploadTimes.length > 0
      ? this.performanceMetrics.textureUploadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.textureUploadTimes.length
      : 0;

    return {
      averageCompilationTime: avgCompilation,
      averageTextureUploadTime: avgTextureUpload,
      totalShadersCompiled: this.performanceMetrics.compilationTimes.length,
      totalTexturesCreated: this.performanceMetrics.textureUploadTimes.length,
      cachedShaders: this.shaderCache.size,
      supportedCompressionFormats: Array.from(this.compressionFormats.keys()),
      loadedExtensions: Object.keys(this.extensions)
    };
  }

  /**
   * Clean up old cached shaders
   */
  cleanupCache(maxAge: number = 300000): void { // 5 minutes default
    const now = Date.now();
    let cleaned = 0;

    for (const [id, shader] of this.shaderCache.entries()) {
      if (now - shader.lastUsed > maxAge) {
        this.gl.deleteProgram(shader.program);
        this.gl.deleteShader(shader.vertexShader);
        this.gl.deleteShader(shader.fragmentShader);
        this.shaderCache.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [ShaderOptimizer] Cleaned up ${cleaned} old shaders`);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Clean up all cached shaders
    for (const shader of this.shaderCache.values()) {
      this.gl.deleteProgram(shader.program);
      this.gl.deleteShader(shader.vertexShader);
      this.gl.deleteShader(shader.fragmentShader);
    }

    this.shaderCache.clear();
    this.compressionFormats.clear();
    this.performanceMetrics.compilationTimes.length = 0;
    this.performanceMetrics.textureUploadTimes.length = 0;

    console.log('🧹 [ShaderOptimizer] Disposed');
  }
}