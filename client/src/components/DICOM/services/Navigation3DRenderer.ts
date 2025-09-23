/**
 * Navigation3D Renderer Service
 * Handles real-time 3D rendering updates based on navigation state changes
 */

import { Navigation3DState } from '../types/Navigation3DTypes';

export interface RenderingContext {
  canvas: HTMLCanvasElement;
  gl?: WebGLRenderingContext | WebGL2RenderingContext;
  ctx?: CanvasRenderingContext2D;
  imageData?: ImageData;
  width: number;
  height: number;
}

export interface RenderingOptions {
  enableWebGL: boolean;
  enableAntialiasing: boolean;
  enableShadows: boolean;
  quality: 'low' | 'medium' | 'high';
}

export class Navigation3DRenderer {
  private renderingContext: RenderingContext | null = null;
  private animationFrameId: number | null = null;
  private lastRenderTime = 0;
  private renderingOptions: RenderingOptions;

  constructor(options: Partial<RenderingOptions> = {}) {
    this.renderingOptions = {
      enableWebGL: true,
      enableAntialiasing: true,
      enableShadows: false,
      quality: 'medium',
      ...options
    };
  }

  /**
   * Initialize rendering context
   */
  initialize(canvas: HTMLCanvasElement): boolean {
    try {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
      let ctx: CanvasRenderingContext2D | null = null;

      if (this.renderingOptions.enableWebGL) {
        // Try WebGL2 first, then WebGL1
        gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
          // Configure WebGL
          gl.viewport(0, 0, width, height);
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.CULL_FACE);
          
          if (this.renderingOptions.enableAntialiasing) {
            gl.enable(gl.SAMPLE_COVERAGE);
          }
          
          console.log('✅ WebGL rendering context initialized');
        }
      }

      if (!gl) {
        // Fallback to 2D canvas
        ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = this.renderingOptions.enableAntialiasing;
          console.log('✅ 2D Canvas rendering context initialized (WebGL fallback)');
        }
      }

      if (!gl && !ctx) {
        console.error('❌ Failed to initialize rendering context');
        return false;
      }

      this.renderingContext = {
        canvas,
        gl: gl || undefined,
        ctx: ctx || undefined,
        width,
        height
      };

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Navigation3D renderer:', error);
      return false;
    }
  }

  /**
   * Update 3D rendering based on navigation state
   */
  updateRendering(navigationState: Navigation3DState, imageData?: ImageData): void {
    if (!this.renderingContext) {
      console.warn('⚠️ Rendering context not initialized');
      return;
    }

    // Cancel previous animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Schedule rendering update
    this.animationFrameId = requestAnimationFrame(() => {
      this.performRender(navigationState, imageData);
    });
  }

  /**
   * Perform the actual rendering
   */
  private performRender(navigationState: Navigation3DState, imageData?: ImageData): void {
    if (!this.renderingContext) return;

    const startTime = performance.now();
    const { canvas, gl, ctx } = this.renderingContext;

    try {
      if (gl) {
        this.renderWebGL(gl, navigationState, imageData);
      } else if (ctx) {
        this.render2D(ctx, navigationState, imageData);
      }

      // Handle animation
      if (navigationState.isAnimating) {
        this.handleAnimation(navigationState);
      }

      const renderTime = performance.now() - startTime;
      if (renderTime > 16) { // More than 60fps
        console.warn(`⚠️ Slow rendering: ${renderTime.toFixed(2)}ms`);
      }

    } catch (error) {
      console.error('❌ Rendering error:', error);
    }
  }

  /**
   * WebGL rendering implementation
   */
  private renderWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState, imageData?: ImageData): void {
    const { width, height } = this.renderingContext!;

    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Apply transformations based on navigation state
    this.applyTransformations(gl, navigationState);

    // Apply opacity settings
    this.applyOpacitySettings(gl, navigationState);

    // Apply clipping planes
    this.applyClippingPlanes(gl, navigationState);

    // Render based on rendering mode
    switch (navigationState.renderingMode) {
      case '3d':
        this.render3DVolume(gl, navigationState, imageData);
        break;
      case 'mpr':
        this.renderMPR(gl, navigationState, imageData);
        break;
      case 'volume':
        this.renderVolumeRendering(gl, navigationState, imageData);
        break;
      case 'surface':
        this.renderSurfaceRendering(gl, navigationState, imageData);
        break;
    }

    // Render overlays and annotations
    this.renderOverlays(gl, navigationState);
  }

  /**
   * 2D Canvas rendering implementation (fallback)
   */
  private render2D(ctx: CanvasRenderingContext2D, navigationState: Navigation3DState, imageData?: ImageData): void {
    const { width, height } = this.renderingContext!;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Save context for transformations
    ctx.save();

    // Apply transformations
    this.apply2DTransformations(ctx, navigationState, width, height);

    // Apply opacity
    ctx.globalAlpha = navigationState.opacity;

    // Render image data if available
    if (imageData) {
      this.render2DImage(ctx, navigationState, imageData);
    } else {
      // Render placeholder/demo content
      this.render2DPlaceholder(ctx, navigationState, width, height);
    }

    // Render slice indicators for MPR mode
    if (navigationState.renderingMode === 'mpr') {
      this.render2DSliceIndicators(ctx, navigationState, width, height);
    }

    // Restore context
    ctx.restore();

    // Render UI overlays
    this.render2DOverlays(ctx, navigationState, width, height);
  }

  /**
   * Apply 3D transformations based on navigation state
   */
  private applyTransformations(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState): void {
    // Convert degrees to radians
    const pitchRad = (navigationState.pitch * Math.PI) / 180;
    const yawRad = (navigationState.yaw * Math.PI) / 180;
    const rollRad = (navigationState.roll * Math.PI) / 180;

    // Create transformation matrices (simplified - in real implementation would use proper matrix library)
    // This is where you'd apply the actual 3D transformations to your WebGL scene
    
    console.log(`🔄 Applying 3D transformations: Pitch=${navigationState.pitch}°, Yaw=${navigationState.yaw}°, Roll=${navigationState.roll}°`);
  }

  /**
   * Apply 2D transformations for canvas fallback
   */
  private apply2DTransformations(ctx: CanvasRenderingContext2D, navigationState: Navigation3DState, width: number, height: number): void {
    // Translate to center
    ctx.translate(width / 2, height / 2);

    // Apply rotations (simplified 2D representation of 3D rotations)
    const totalRotation = navigationState.yaw + navigationState.roll; // Combine yaw and roll for 2D
    ctx.rotate((totalRotation * Math.PI) / 180);

    // Apply scaling based on pitch (simulate 3D perspective)
    const scaleY = Math.cos((navigationState.pitch * Math.PI) / 180);
    ctx.scale(1, Math.max(0.1, Math.abs(scaleY)));

    // Translate back
    ctx.translate(-width / 2, -height / 2);
  }

  /**
   * Apply opacity settings
   */
  private applyOpacitySettings(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState): void {
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Apply opacity values to shaders (simplified)
    console.log(`🎨 Applying opacity: Overall=${Math.round(navigationState.opacity * 100)}%, Volume=${Math.round(navigationState.volumeOpacity * 100)}%`);
  }

  /**
   * Apply clipping planes
   */
  private applyClippingPlanes(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState): void {
    // Configure clipping planes based on clipNear and clipFar values
    const nearPlane = navigationState.clipNear / 100;
    const farPlane = navigationState.clipFar / 100;
    
    console.log(`✂️ Applying clipping planes: Near=${navigationState.clipNear}%, Far=${navigationState.clipFar}%`);
  }

  /**
   * Render 3D volume
   */
  private render3DVolume(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState, imageData?: ImageData): void {
    // Implement 3D volume rendering
    console.log('🧊 Rendering 3D volume');
  }

  /**
   * Render MPR views
   */
  private renderMPR(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState, imageData?: ImageData): void {
    // Render multi-planar reconstruction based on slice positions
    console.log(`📊 Rendering MPR: Axial=${navigationState.axialSlice}, Sagittal=${navigationState.sagittalSlice}, Coronal=${navigationState.coronalSlice}`);
  }

  /**
   * Render volume rendering
   */
  private renderVolumeRendering(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState, imageData?: ImageData): void {
    // Implement volume rendering with opacity transfer functions
    console.log('🌊 Rendering volume with transfer functions');
  }

  /**
   * Render surface rendering
   */
  private renderSurfaceRendering(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState, imageData?: ImageData): void {
    // Implement surface rendering (isosurface extraction)
    console.log('🏔️ Rendering surface/isosurface');
  }

  /**
   * Render overlays and annotations
   */
  private renderOverlays(gl: WebGLRenderingContext | WebGL2RenderingContext, navigationState: Navigation3DState): void {
    // Render annotations, measurements, etc.
    if (navigationState.annotations.length > 0) {
      console.log(`📝 Rendering ${navigationState.annotations.length} annotations`);
    }
  }

  /**
   * Render 2D image (fallback)
   */
  private render2DImage(ctx: CanvasRenderingContext2D, navigationState: Navigation3DState, imageData: ImageData): void {
    const { width, height } = this.renderingContext!;
    
    // Scale and position image based on current slice
    const currentSlice = navigationState.axialSlice; // Use axial slice for 2D representation
    
    // Draw the image data
    ctx.putImageData(imageData, 0, 0);
    
    console.log(`🖼️ Rendering 2D image slice: ${currentSlice}`);
  }

  /**
   * Render 2D placeholder content
   */
  private render2DPlaceholder(ctx: CanvasRenderingContext2D, navigationState: Navigation3DState, width: number, height: number): void {
    // Draw a placeholder that responds to navigation state
    ctx.fillStyle = `rgba(100, 150, 200, ${navigationState.opacity})`;
    
    // Draw a rectangle that rotates and scales based on navigation
    const size = Math.min(width, height) * 0.6;
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    ctx.fillRect(x, y, size, size);
    
    // Draw slice indicators
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
    
    // Draw current preset name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${navigationState.currentPreset.toUpperCase()}`, width / 2, height - 20);
    
    // Draw rotation values
    ctx.font = '12px Arial';
    ctx.fillText(`P:${navigationState.pitch}° Y:${navigationState.yaw}° R:${navigationState.roll}°`, width / 2, height - 40);
  }

  /**
   * Render 2D slice indicators
   */
  private render2DSliceIndicators(ctx: CanvasRenderingContext2D, navigationState: Navigation3DState, width: number, height: number): void {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    
    // Draw slice position indicators
    const axialY = (navigationState.axialSlice / 100) * height;
    const sagittalX = (navigationState.sagittalSlice / 100) * width;
    
    // Axial slice line
    ctx.beginPath();
    ctx.moveTo(0, axialY);
    ctx.lineTo(width, axialY);
    ctx.stroke();
    
    // Sagittal slice line
    ctx.beginPath();
    ctx.moveTo(sagittalX, 0);
    ctx.lineTo(sagittalX, height);
    ctx.stroke();
  }

  /**
   * Render 2D overlays
   */
  private render2DOverlays(ctx: CanvasRenderingContext2D, navigationState: Navigation3DState, width: number, height: number): void {
    // Render rendering mode indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 120, 30);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Mode: ${navigationState.renderingMode.toUpperCase()}`, 15, 30);
    
    // Render animation indicator
    if (navigationState.isAnimating) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(width - 80, 10, 70, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ANIMATING', width - 45, 25);
    }
  }

  /**
   * Handle animation updates
   */
  private handleAnimation(navigationState: Navigation3DState): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastRenderTime;
    this.lastRenderTime = currentTime;

    // Calculate rotation increment based on animation speed
    const rotationIncrement = (navigationState.animationSpeed * deltaTime) / 100;

    // This would typically update the navigation state through a callback
    // For now, we'll just log the animation progress
    console.log(`🎬 Animation frame: speed=${navigationState.animationSpeed}x, delta=${deltaTime.toFixed(2)}ms`);

    // Schedule next frame if still animating
    if (navigationState.isAnimating) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.performRender(navigationState);
      });
    }
  }

  /**
   * Handle canvas resize
   */
  resize(width: number, height: number): void {
    if (!this.renderingContext) return;

    const { canvas, gl, ctx } = this.renderingContext;
    
    // Update canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Update rendering context
    this.renderingContext.width = width;
    this.renderingContext.height = height;
    
    if (gl) {
      gl.viewport(0, 0, width, height);
    }
    
    console.log(`📐 Canvas resized to ${width}x${height}`);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.renderingContext = null;
    console.log('🧹 Navigation3D renderer destroyed');
  }
}

// Export singleton instance
export const navigation3DRenderer = new Navigation3DRenderer();