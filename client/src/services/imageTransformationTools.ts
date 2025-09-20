/**
 * Advanced Image Transformation Tools
 * Provides smooth zoom, pan, rotation with real-time feedback and gesture support
 */

import { performanceMonitor } from './performanceMonitor';

export interface TransformationState {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  centerX: number;
  centerY: number;
}

export interface TransformationLimits {
  minZoom: number;
  maxZoom: number;
  maxPan: number;
  snapToAngles: number[];
  snapThreshold: number;
  boundaryBehavior: 'clamp' | 'elastic' | 'infinite';
}

export interface GestureState {
  isActive: boolean;
  type: 'pan' | 'zoom' | 'rotate' | 'pinch' | 'none';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  scale: number;
  rotation: number;
  velocity: { x: number; y: number };
  timestamp: number;
}

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  fps: number;
}

export interface TransformationEvent {
  type: 'transform_start' | 'transform_update' | 'transform_end' | 'animation_complete';
  state: TransformationState;
  gesture?: GestureState;
  timestamp: number;
}

type TransformationCallback = (event: TransformationEvent) => void;

class ImageTransformationTools {
  private element: HTMLElement | null = null;
  private state: TransformationState;
  private limits: TransformationLimits;
  private animationConfig: AnimationConfig;
  
  // Gesture handling
  private gestureState: GestureState;
  private touchPoints: Touch[] = [];
  private lastTouchDistance: number = 0;
  private lastTouchAngle: number = 0;
  
  // Animation
  private animationFrame: number | null = null;
  private animationStartTime: number = 0;
  private animationStartState: TransformationState | null = null;
  private animationTargetState: TransformationState | null = null;
  
  // Momentum and inertia
  private momentumAnimation: number | null = null;
  private velocityTracker: { x: number; y: number; timestamp: number }[] = [];
  private momentumDecay: number = 0.95;
  private momentumThreshold: number = 0.1;
  
  // Event callbacks
  private callbacks: TransformationCallback[] = [];
  
  // Performance tracking
  private transformCount: number = 0;
  private lastTransformTime: number = 0;

  constructor(
    initialState: Partial<TransformationState> = {},
    limits: Partial<TransformationLimits> = {},
    animationConfig: Partial<AnimationConfig> = {}
  ) {
    this.state = {
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      centerX: 0.5,
      centerY: 0.5,
      ...initialState
    };

    this.limits = {
      minZoom: 0.1,
      maxZoom: 10.0,
      maxPan: 1000,
      snapToAngles: [0, 90, 180, 270],
      snapThreshold: 5, // degrees
      boundaryBehavior: 'clamp',
      ...limits
    };

    this.animationConfig = {
      duration: 300,
      easing: 'ease-out',
      fps: 60,
      ...animationConfig
    };

    this.gestureState = {
      isActive: false,
      type: 'none',
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      scale: 1,
      rotation: 0,
      velocity: { x: 0, y: 0 },
      timestamp: 0
    };

    console.log('🔄 [ImageTransformationTools] Initialized');
  }

  /**
   * Bind to DOM element for gesture handling
   */
  public bindToElement(element: HTMLElement): void {
    this.element = element;
    this.setupEventListeners();
    console.log('🔄 [ImageTransformationTools] Bound to element');
  }

  /**
   * Get current transformation state
   */
  public getState(): TransformationState {
    return { ...this.state };
  }

  /**
   * Set transformation state
   */
  public setState(newState: Partial<TransformationState>, animate: boolean = false): void {
    const targetState = { ...this.state, ...newState };
    
    if (animate) {
      this.animateToState(targetState);
    } else {
      this.updateState(targetState);
    }
  }

  /**
   * Zoom to specific level
   */
  public zoomTo(zoom: number, centerX?: number, centerY?: number, animate: boolean = true): void {
    const clampedZoom = this.clampZoom(zoom);
    const newState: Partial<TransformationState> = { zoom: clampedZoom };
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom to specific point
      const zoomRatio = clampedZoom / this.state.zoom;
      const offsetX = (centerX - this.state.centerX) * (1 - zoomRatio);
      const offsetY = (centerY - this.state.centerY) * (1 - zoomRatio);
      
      newState.panX = this.state.panX + offsetX * this.state.zoom;
      newState.panY = this.state.panY + offsetY * this.state.zoom;
    }
    
    this.setState(newState, animate);
  }

  /**
   * Zoom by delta (relative zoom)
   */
  public zoomBy(delta: number, centerX?: number, centerY?: number, animate: boolean = false): void {
    const newZoom = this.state.zoom * (1 + delta);
    this.zoomTo(newZoom, centerX, centerY, animate);
  }

  /**
   * Pan to specific position
   */
  public panTo(x: number, y: number, animate: boolean = true): void {
    const clampedX = this.clampPan(x);
    const clampedY = this.clampPan(y);
    
    this.setState({ panX: clampedX, panY: clampedY }, animate);
  }

  /**
   * Pan by delta (relative pan)
   */
  public panBy(deltaX: number, deltaY: number, animate: boolean = false): void {
    const newX = this.state.panX + deltaX;
    const newY = this.state.panY + deltaY;
    this.panTo(newX, newY, animate);
  }

  /**
   * Rotate to specific angle
   */
  public rotateTo(angle: number, animate: boolean = true): void {
    let normalizedAngle = angle % 360;
    if (normalizedAngle < 0) normalizedAngle += 360;
    
    // Check for snap to angles
    const snappedAngle = this.snapToAngle(normalizedAngle);
    
    this.setState({ rotation: snappedAngle }, animate);
  }

  /**
   * Rotate by delta (relative rotation)
   */
  public rotateBy(delta: number, animate: boolean = false): void {
    const newAngle = this.state.rotation + delta;
    this.rotateTo(newAngle, animate);
  }

  /**
   * Flip horizontally
   */
  public flipHorizontal(animate: boolean = true): void {
    this.setState({ flipX: !this.state.flipX }, animate);
  }

  /**
   * Flip vertically
   */
  public flipVertical(animate: boolean = true): void {
    this.setState({ flipY: !this.state.flipY }, animate);
  }

  /**
   * Reset to default state
   */
  public reset(animate: boolean = true): void {
    const defaultState: TransformationState = {
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      centerX: 0.5,
      centerY: 0.5
    };
    
    this.setState(defaultState, animate);
  }

  /**
   * Fit to container
   */
  public fitToContainer(containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number, animate: boolean = true): void {
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const newState: TransformationState = {
      zoom: scale,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      centerX: 0.5,
      centerY: 0.5
    };
    
    this.setState(newState, animate);
  }

  /**
   * Add transformation event listener
   */
  public onTransformation(callback: TransformationCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove transformation event listener
   */
  public removeTransformationListener(callback: TransformationCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Update transformation limits
   */
  public updateLimits(newLimits: Partial<TransformationLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    
    // Re-validate current state against new limits
    const clampedState = this.clampState(this.state);
    if (JSON.stringify(clampedState) !== JSON.stringify(this.state)) {
      this.updateState(clampedState);
    }
  }

  /**
   * Start momentum animation
   */
  public startMomentum(velocityX: number, velocityY: number): void {
    if (Math.abs(velocityX) < this.momentumThreshold && Math.abs(velocityY) < this.momentumThreshold) {
      return;
    }

    this.stopMomentum();
    
    const animate = () => {
      if (Math.abs(velocityX) < this.momentumThreshold && Math.abs(velocityY) < this.momentumThreshold) {
        this.stopMomentum();
        return;
      }

      this.panBy(velocityX, velocityY, false);
      
      velocityX *= this.momentumDecay;
      velocityY *= this.momentumDecay;
      
      this.momentumAnimation = requestAnimationFrame(animate);
    };
    
    this.momentumAnimation = requestAnimationFrame(animate);
  }

  /**
   * Stop momentum animation
   */
  public stopMomentum(): void {
    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
      this.momentumAnimation = null;
    }
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    this.removeEventListeners();
    this.stopAnimation();
    this.stopMomentum();
    this.callbacks = [];
    console.log('🔄 [ImageTransformationTools] Destroyed');
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.element) return;

    // Mouse events
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });

    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown);

    // Prevent context menu
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private removeEventListeners(): void {
    if (!this.element) return;

    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return; // Only left mouse button

    this.gestureState = {
      isActive: true,
      type: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      scale: 1,
      rotation: 0,
      velocity: { x: 0, y: 0 },
      timestamp: performance.now()
    };

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);

    this.emitTransformationEvent('transform_start');
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.gestureState.isActive) return;

    const deltaX = event.clientX - this.gestureState.currentX;
    const deltaY = event.clientY - this.gestureState.currentY;

    this.gestureState.currentX = event.clientX;
    this.gestureState.currentY = event.clientY;
    this.gestureState.deltaX = event.clientX - this.gestureState.startX;
    this.gestureState.deltaY = event.clientY - this.gestureState.startY;

    // Track velocity
    this.trackVelocity(deltaX, deltaY);

    // Apply pan transformation
    this.panBy(deltaX / this.state.zoom, deltaY / this.state.zoom, false);

    this.emitTransformationEvent('transform_update');
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (!this.gestureState.isActive) return;

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    // Start momentum if there's sufficient velocity
    const velocity = this.getAverageVelocity();
    if (Math.abs(velocity.x) > this.momentumThreshold || Math.abs(velocity.y) > this.momentumThreshold) {
      this.startMomentum(velocity.x / this.state.zoom, velocity.y / this.state.zoom);
    }

    this.gestureState.isActive = false;
    this.emitTransformationEvent('transform_end');
  };

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const rect = this.element!.getBoundingClientRect();
    const centerX = (event.clientX - rect.left) / rect.width;
    const centerY = (event.clientY - rect.top) / rect.height;

    const zoomDelta = -event.deltaY * 0.001;
    this.zoomBy(zoomDelta, centerX, centerY, false);
  };

  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    
    this.touchPoints = Array.from(event.touches);
    
    if (this.touchPoints.length === 1) {
      // Single touch - pan
      const touch = this.touchPoints[0];
      this.gestureState = {
        isActive: true,
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        scale: 1,
        rotation: 0,
        velocity: { x: 0, y: 0 },
        timestamp: performance.now()
      };
    } else if (this.touchPoints.length === 2) {
      // Two touches - pinch/zoom/rotate
      const touch1 = this.touchPoints[0];
      const touch2 = this.touchPoints[1];
      
      this.lastTouchDistance = this.getTouchDistance(touch1, touch2);
      this.lastTouchAngle = this.getTouchAngle(touch1, touch2);
      
      this.gestureState = {
        isActive: true,
        type: 'pinch',
        startX: (touch1.clientX + touch2.clientX) / 2,
        startY: (touch1.clientY + touch2.clientY) / 2,
        currentX: (touch1.clientX + touch2.clientX) / 2,
        currentY: (touch1.clientY + touch2.clientY) / 2,
        deltaX: 0,
        deltaY: 0,
        scale: 1,
        rotation: 0,
        velocity: { x: 0, y: 0 },
        timestamp: performance.now()
      };
    }

    this.emitTransformationEvent('transform_start');
  };

  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    
    if (!this.gestureState.isActive) return;

    this.touchPoints = Array.from(event.touches);

    if (this.touchPoints.length === 1 && this.gestureState.type === 'pan') {
      // Single touch pan
      const touch = this.touchPoints[0];
      const deltaX = touch.clientX - this.gestureState.currentX;
      const deltaY = touch.clientY - this.gestureState.currentY;

      this.gestureState.currentX = touch.clientX;
      this.gestureState.currentY = touch.clientY;
      this.gestureState.deltaX = touch.clientX - this.gestureState.startX;
      this.gestureState.deltaY = touch.clientY - this.gestureState.startY;

      this.trackVelocity(deltaX, deltaY);
      this.panBy(deltaX / this.state.zoom, deltaY / this.state.zoom, false);

    } else if (this.touchPoints.length === 2 && this.gestureState.type === 'pinch') {
      // Two touch pinch/zoom/rotate
      const touch1 = this.touchPoints[0];
      const touch2 = this.touchPoints[1];
      
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const currentAngle = this.getTouchAngle(touch1, touch2);
      
      // Calculate zoom
      const scaleChange = currentDistance / this.lastTouchDistance;
      if (isFinite(scaleChange) && scaleChange > 0) {
        const rect = this.element!.getBoundingClientRect();
        const centerX = ((touch1.clientX + touch2.clientX) / 2 - rect.left) / rect.width;
        const centerY = ((touch1.clientY + touch2.clientY) / 2 - rect.top) / rect.height;
        
        this.zoomBy(scaleChange - 1, centerX, centerY, false);
      }
      
      // Calculate rotation
      const rotationChange = currentAngle - this.lastTouchAngle;
      if (isFinite(rotationChange)) {
        this.rotateBy(rotationChange * (180 / Math.PI), false);
      }
      
      this.lastTouchDistance = currentDistance;
      this.lastTouchAngle = currentAngle;
    }

    this.emitTransformationEvent('transform_update');
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    this.touchPoints = Array.from(event.touches);

    if (this.touchPoints.length === 0) {
      // All touches ended
      if (this.gestureState.type === 'pan') {
        const velocity = this.getAverageVelocity();
        if (Math.abs(velocity.x) > this.momentumThreshold || Math.abs(velocity.y) > this.momentumThreshold) {
          this.startMomentum(velocity.x / this.state.zoom, velocity.y / this.state.zoom);
        }
      }

      this.gestureState.isActive = false;
      this.emitTransformationEvent('transform_end');
    } else if (this.touchPoints.length === 1 && this.gestureState.type === 'pinch') {
      // Switch from pinch to pan
      const touch = this.touchPoints[0];
      this.gestureState.type = 'pan';
      this.gestureState.startX = touch.clientX;
      this.gestureState.startY = touch.clientY;
      this.gestureState.currentX = touch.clientX;
      this.gestureState.currentY = touch.clientY;
    }
  };

  private handleTouchCancel = (event: TouchEvent): void => {
    this.gestureState.isActive = false;
    this.touchPoints = [];
    this.emitTransformationEvent('transform_end');
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.element || document.activeElement !== this.element) return;

    let handled = false;

    switch (event.key) {
      case '+':
      case '=':
        this.zoomBy(0.1, 0.5, 0.5, true);
        handled = true;
        break;
      case '-':
        this.zoomBy(-0.1, 0.5, 0.5, true);
        handled = true;
        break;
      case '0':
        this.reset(true);
        handled = true;
        break;
      case 'r':
      case 'R':
        this.rotateBy(90, true);
        handled = true;
        break;
      case 'h':
      case 'H':
        this.flipHorizontal(true);
        handled = true;
        break;
      case 'v':
      case 'V':
        this.flipVertical(true);
        handled = true;
        break;
      case 'ArrowUp':
        this.panBy(0, -20, false);
        handled = true;
        break;
      case 'ArrowDown':
        this.panBy(0, 20, false);
        handled = true;
        break;
      case 'ArrowLeft':
        this.panBy(-20, 0, false);
        handled = true;
        break;
      case 'ArrowRight':
        this.panBy(20, 0, false);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchAngle(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx);
  }

  private trackVelocity(deltaX: number, deltaY: number): void {
    const now = performance.now();
    this.velocityTracker.push({ x: deltaX, y: deltaY, timestamp: now });

    // Keep only recent velocity samples (last 100ms)
    this.velocityTracker = this.velocityTracker.filter(
      sample => now - sample.timestamp < 100
    );
  }

  private getAverageVelocity(): { x: number; y: number } {
    if (this.velocityTracker.length === 0) {
      return { x: 0, y: 0 };
    }

    const totalX = this.velocityTracker.reduce((sum, sample) => sum + sample.x, 0);
    const totalY = this.velocityTracker.reduce((sum, sample) => sum + sample.y, 0);

    return {
      x: totalX / this.velocityTracker.length,
      y: totalY / this.velocityTracker.length
    };
  }

  private updateState(newState: TransformationState): void {
    const clampedState = this.clampState(newState);
    this.state = clampedState;
    
    // Track performance
    this.transformCount++;
    this.lastTransformTime = performance.now();
    
    // Update performance monitor
    performanceMonitor.recordRenderingMetrics({
      frameTime: performance.now() - this.lastTransformTime,
      drawCalls: 1,
      textureMemory: 0,
      shaderCompileTime: 0,
      canvasResizes: 0,
      renderingErrors: []
    });
  }

  private clampState(state: TransformationState): TransformationState {
    return {
      ...state,
      zoom: this.clampZoom(state.zoom),
      panX: this.clampPan(state.panX),
      panY: this.clampPan(state.panY),
      rotation: this.snapToAngle(state.rotation % 360)
    };
  }

  private clampZoom(zoom: number): number {
    return Math.max(this.limits.minZoom, Math.min(this.limits.maxZoom, zoom));
  }

  private clampPan(pan: number): number {
    if (this.limits.boundaryBehavior === 'infinite') {
      return pan;
    }
    return Math.max(-this.limits.maxPan, Math.min(this.limits.maxPan, pan));
  }

  private snapToAngle(angle: number): number {
    for (const snapAngle of this.limits.snapToAngles) {
      const diff = Math.abs(angle - snapAngle);
      if (diff <= this.limits.snapThreshold || diff >= (360 - this.limits.snapThreshold)) {
        return snapAngle;
      }
    }
    return angle;
  }

  private animateToState(targetState: TransformationState): void {
    this.stopAnimation();
    
    this.animationStartTime = performance.now();
    this.animationStartState = { ...this.state };
    this.animationTargetState = this.clampState(targetState);
    
    this.animateFrame();
  }

  private animateFrame = (): void => {
    const now = performance.now();
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationConfig.duration, 1);
    
    const easedProgress = this.applyEasing(progress);
    
    if (this.animationStartState && this.animationTargetState) {
      const interpolatedState = this.interpolateStates(
        this.animationStartState,
        this.animationTargetState,
        easedProgress
      );
      
      this.updateState(interpolatedState);
      this.emitTransformationEvent('transform_update');
    }
    
    if (progress < 1) {
      this.animationFrame = requestAnimationFrame(this.animateFrame);
    } else {
      this.stopAnimation();
      this.emitTransformationEvent('animation_complete');
    }
  };

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.animationStartState = null;
    this.animationTargetState = null;
  }

  private applyEasing(t: number): number {
    switch (this.animationConfig.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - Math.pow(1 - t, 2);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'bounce':
        if (t < 1 / 2.75) {
          return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
          return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
      default:
        return t;
    }
  }

  private interpolateStates(
    start: TransformationState,
    end: TransformationState,
    progress: number
  ): TransformationState {
    return {
      zoom: start.zoom + (end.zoom - start.zoom) * progress,
      panX: start.panX + (end.panX - start.panX) * progress,
      panY: start.panY + (end.panY - start.panY) * progress,
      rotation: start.rotation + (end.rotation - start.rotation) * progress,
      flipX: progress < 0.5 ? start.flipX : end.flipX,
      flipY: progress < 0.5 ? start.flipY : end.flipY,
      centerX: start.centerX + (end.centerX - start.centerX) * progress,
      centerY: start.centerY + (end.centerY - start.centerY) * progress
    };
  }

  private emitTransformationEvent(type: TransformationEvent['type']): void {
    const event: TransformationEvent = {
      type,
      state: { ...this.state },
      gesture: this.gestureState.isActive ? { ...this.gestureState } : undefined,
      timestamp: performance.now()
    };

    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in transformation callback:', error);
      }
    });
  }
}

export { ImageTransformationTools };