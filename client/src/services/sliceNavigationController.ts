/**
 * Advanced Slice Navigation Controller
 * Provides smooth slice navigation with keyboard shortcuts, mouse wheel, and touch gestures
 */

export interface SliceNavigationConfig {
  totalSlices: number;
  currentSlice: number;
  enableKeyboard: boolean;
  enableMouseWheel: boolean;
  enableTouch: boolean;
  enableMomentum: boolean;
  animationDuration: number;
  wheelSensitivity: number;
  touchSensitivity: number;
  boundaryBehavior: 'stop' | 'wrap' | 'bounce';
}

export interface SliceNavigationState {
  currentSlice: number;
  targetSlice: number;
  isAnimating: boolean;
  velocity: number;
  lastUpdateTime: number;
  touchStartX: number;
  touchStartY: number;
  wheelAccumulator: number;
}

export interface NavigationEvent {
  type: 'slice_changed' | 'animation_start' | 'animation_end' | 'boundary_reached';
  currentSlice: number;
  previousSlice: number;
  direction: 'forward' | 'backward' | 'none';
  source: 'keyboard' | 'mouse' | 'touch' | 'programmatic';
  timestamp: number;
}

export interface TouchGesture {
  type: 'swipe' | 'pinch' | 'tap' | 'long_press';
  direction?: 'left' | 'right' | 'up' | 'down';
  velocity: number;
  distance: number;
  duration: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: 'next' | 'previous' | 'first' | 'last' | 'play_pause' | 'speed_up' | 'speed_down';
  description: string;
}

class SliceNavigationController {
  private config: SliceNavigationConfig;
  private state: SliceNavigationState;
  private element: HTMLElement | null = null;
  private animationFrame: number | null = null;
  private eventListeners: Map<string, EventListener[]> = new Map();
  private navigationCallbacks: ((event: NavigationEvent) => void)[] = [];
  
  // Default keyboard shortcuts
  private defaultShortcuts: KeyboardShortcut[] = [
    { key: 'ArrowLeft', modifiers: [], action: 'previous', description: 'Previous slice' },
    { key: 'ArrowRight', modifiers: [], action: 'next', description: 'Next slice' },
    { key: 'ArrowUp', modifiers: [], action: 'previous', description: 'Previous slice' },
    { key: 'ArrowDown', modifiers: [], action: 'next', description: 'Next slice' },
    { key: 'Home', modifiers: [], action: 'first', description: 'First slice' },
    { key: 'End', modifiers: [], action: 'last', description: 'Last slice' },
    { key: ' ', modifiers: [], action: 'play_pause', description: 'Play/Pause cine mode' },
    { key: 'PageUp', modifiers: [], action: 'previous', description: 'Previous slice (fast)' },
    { key: 'PageDown', modifiers: [], action: 'next', description: 'Next slice (fast)' },
    { key: '+', modifiers: [], action: 'speed_up', description: 'Increase playback speed' },
    { key: '-', modifiers: [], action: 'speed_down', description: 'Decrease playback speed' }
  ];

  constructor(config: Partial<SliceNavigationConfig> = {}) {
    this.config = {
      totalSlices: 1,
      currentSlice: 0,
      enableKeyboard: true,
      enableMouseWheel: true,
      enableTouch: true,
      enableMomentum: true,
      animationDuration: 200,
      wheelSensitivity: 1.0,
      touchSensitivity: 1.0,
      boundaryBehavior: 'stop',
      ...config
    };

    this.state = {
      currentSlice: this.config.currentSlice,
      targetSlice: this.config.currentSlice,
      isAnimating: false,
      velocity: 0,
      lastUpdateTime: 0,
      touchStartX: 0,
      touchStartY: 0,
      wheelAccumulator: 0
    };
  }

  /**
   * Initialize the navigation controller with a DOM element
   */
  public initialize(element: HTMLElement): void {
    this.element = element;
    this.setupEventListeners();
    console.log('🎮 [SliceNavigationController] Initialized with element:', element.tagName);
  }

  /**
   * Cleanup and remove event listeners
   */
  public destroy(): void {
    this.removeEventListeners();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.element = null;
    console.log('🎮 [SliceNavigationController] Destroyed');
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SliceNavigationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Clamp current slice to new bounds
    if (this.config.totalSlices !== oldConfig.totalSlices) {
      this.state.currentSlice = Math.min(this.state.currentSlice, this.config.totalSlices - 1);
      this.state.targetSlice = this.state.currentSlice;
    }

    console.log('🎮 [SliceNavigationController] Config updated:', newConfig);
  }

  /**
   * Navigate to a specific slice
   */
  public goToSlice(sliceIndex: number, animate: boolean = true, source: NavigationEvent['source'] = 'programmatic'): void {
    const previousSlice = this.state.currentSlice;
    const targetSlice = this.clampSliceIndex(sliceIndex);
    
    if (targetSlice === this.state.currentSlice && !this.state.isAnimating) {
      return; // No change needed
    }

    this.state.targetSlice = targetSlice;
    
    if (animate && this.config.animationDuration > 0) {
      this.startAnimation(source, previousSlice);
    } else {
      this.state.currentSlice = targetSlice;
      this.emitNavigationEvent('slice_changed', previousSlice, source);
    }
  }

  /**
   * Navigate to next slice
   */
  public nextSlice(animate: boolean = true, source: NavigationEvent['source'] = 'programmatic'): void {
    const nextIndex = this.getNextSliceIndex(this.state.currentSlice, 1);
    this.goToSlice(nextIndex, animate, source);
  }

  /**
   * Navigate to previous slice
   */
  public previousSlice(animate: boolean = true, source: NavigationEvent['source'] = 'programmatic'): void {
    const prevIndex = this.getNextSliceIndex(this.state.currentSlice, -1);
    this.goToSlice(prevIndex, animate, source);
  }

  /**
   * Navigate to first slice
   */
  public firstSlice(animate: boolean = true, source: NavigationEvent['source'] = 'programmatic'): void {
    this.goToSlice(0, animate, source);
  }

  /**
   * Navigate to last slice
   */
  public lastSlice(animate: boolean = true, source: NavigationEvent['source'] = 'programmatic'): void {
    this.goToSlice(this.config.totalSlices - 1, animate, source);
  }

  /**
   * Get current slice index
   */
  public getCurrentSlice(): number {
    return this.state.currentSlice;
  }

  /**
   * Get total number of slices
   */
  public getTotalSlices(): number {
    return this.config.totalSlices;
  }

  /**
   * Check if navigation is currently animating
   */
  public isAnimating(): boolean {
    return this.state.isAnimating;
  }

  /**
   * Get navigation progress (0-1) during animation
   */
  public getAnimationProgress(): number {
    if (!this.state.isAnimating) return 1;
    
    const distance = Math.abs(this.state.targetSlice - this.state.currentSlice);
    if (distance === 0) return 1;
    
    // This would be calculated based on animation timing
    return 0.5; // Placeholder
  }

  /**
   * Add navigation event listener
   */
  public onNavigationEvent(callback: (event: NavigationEvent) => void): void {
    this.navigationCallbacks.push(callback);
  }

  /**
   * Remove navigation event listener
   */
  public removeNavigationEventListener(callback: (event: NavigationEvent) => void): void {
    const index = this.navigationCallbacks.indexOf(callback);
    if (index > -1) {
      this.navigationCallbacks.splice(index, 1);
    }
  }

  /**
   * Get available keyboard shortcuts
   */
  public getKeyboardShortcuts(): KeyboardShortcut[] {
    return [...this.defaultShortcuts];
  }

  /**
   * Enable or disable specific navigation methods
   */
  public setNavigationEnabled(method: 'keyboard' | 'mouse' | 'touch', enabled: boolean): void {
    switch (method) {
      case 'keyboard':
        this.config.enableKeyboard = enabled;
        break;
      case 'mouse':
        this.config.enableMouseWheel = enabled;
        break;
      case 'touch':
        this.config.enableTouch = enabled;
        break;
    }
    
    // Re-setup event listeners
    if (this.element) {
      this.removeEventListeners();
      this.setupEventListeners();
    }
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.element) return;

    // Keyboard navigation
    if (this.config.enableKeyboard) {
      const keydownHandler = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', keydownHandler);
      this.addEventListenerToMap('keydown', keydownHandler);
    }

    // Mouse wheel navigation
    if (this.config.enableMouseWheel) {
      const wheelHandler = this.handleWheel.bind(this);
      this.element.addEventListener('wheel', wheelHandler, { passive: false });
      this.addEventListenerToMap('wheel', wheelHandler);
    }

    // Touch navigation
    if (this.config.enableTouch) {
      const touchStartHandler = this.handleTouchStart.bind(this);
      const touchMoveHandler = this.handleTouchMove.bind(this);
      const touchEndHandler = this.handleTouchEnd.bind(this);
      
      this.element.addEventListener('touchstart', touchStartHandler, { passive: false });
      this.element.addEventListener('touchmove', touchMoveHandler, { passive: false });
      this.element.addEventListener('touchend', touchEndHandler, { passive: false });
      
      this.addEventListenerToMap('touchstart', touchStartHandler);
      this.addEventListenerToMap('touchmove', touchMoveHandler);
      this.addEventListenerToMap('touchend', touchEndHandler);
    }

    // Focus management
    if (this.element.tabIndex < 0) {
      this.element.tabIndex = 0;
    }
  }

  private removeEventListeners(): void {
    this.eventListeners.forEach((listeners, eventType) => {
      listeners.forEach(listener => {
        if (eventType === 'keydown') {
          document.removeEventListener(eventType, listener);
        } else if (this.element) {
          this.element.removeEventListener(eventType, listener);
        }
      });
    });
    this.eventListeners.clear();
  }

  private addEventListenerToMap(eventType: string, listener: EventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.config.enableKeyboard || !this.element) return;

    // Check if the element or its descendants have focus
    if (!this.element.contains(document.activeElement)) return;

    const shortcut = this.findMatchingShortcut(event);
    if (!shortcut) return;

    event.preventDefault();
    this.executeShortcutAction(shortcut.action, 'keyboard');
  }

  private handleWheel(event: WheelEvent): void {
    if (!this.config.enableMouseWheel) return;

    event.preventDefault();

    // Accumulate wheel delta for smoother navigation
    this.state.wheelAccumulator += event.deltaY * this.config.wheelSensitivity;

    // Threshold for slice change (adjust based on sensitivity)
    const threshold = 100;
    
    if (Math.abs(this.state.wheelAccumulator) >= threshold) {
      const direction = this.state.wheelAccumulator > 0 ? 1 : -1;
      const steps = Math.floor(Math.abs(this.state.wheelAccumulator) / threshold);
      
      for (let i = 0; i < steps; i++) {
        if (direction > 0) {
          this.nextSlice(true, 'mouse');
        } else {
          this.previousSlice(true, 'mouse');
        }
      }
      
      this.state.wheelAccumulator = this.state.wheelAccumulator % threshold;
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.config.enableTouch || event.touches.length !== 1) return;

    const touch = event.touches[0];
    this.state.touchStartX = touch.clientX;
    this.state.touchStartY = touch.clientY;
    this.state.lastUpdateTime = Date.now();
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.config.enableTouch || event.touches.length !== 1) return;
    
    // Prevent default scrolling behavior
    event.preventDefault();
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.config.enableTouch || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.state.touchStartX;
    const deltaY = touch.clientY - this.state.touchStartY;
    const duration = Date.now() - this.state.lastUpdateTime;
    
    const gesture = this.analyzeGesture(deltaX, deltaY, duration);
    
    if (gesture.type === 'swipe') {
      this.handleSwipeGesture(gesture);
    }
  }

  private analyzeGesture(deltaX: number, deltaY: number, duration: number): TouchGesture {
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;
    
    // Determine gesture type
    if (distance < 10) {
      return {
        type: 'tap',
        velocity,
        distance,
        duration,
        startPoint: { x: this.state.touchStartX, y: this.state.touchStartY },
        endPoint: { x: this.state.touchStartX + deltaX, y: this.state.touchStartY + deltaY }
      };
    }
    
    // Determine swipe direction
    let direction: TouchGesture['direction'];
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    return {
      type: 'swipe',
      direction,
      velocity,
      distance,
      duration,
      startPoint: { x: this.state.touchStartX, y: this.state.touchStartY },
      endPoint: { x: this.state.touchStartX + deltaX, y: this.state.touchStartY + deltaY }
    };
  }

  private handleSwipeGesture(gesture: TouchGesture): void {
    const minSwipeDistance = 50 * this.config.touchSensitivity;
    
    if (gesture.distance < minSwipeDistance) return;

    switch (gesture.direction) {
      case 'left':
      case 'up':
        this.nextSlice(true, 'touch');
        break;
      case 'right':
      case 'down':
        this.previousSlice(true, 'touch');
        break;
    }
  }

  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    return this.defaultShortcuts.find(shortcut => {
      if (shortcut.key !== event.key) return false;
      
      // Check modifiers
      const hasCtrl = shortcut.modifiers.includes('ctrl') === event.ctrlKey;
      const hasShift = shortcut.modifiers.includes('shift') === event.shiftKey;
      const hasAlt = shortcut.modifiers.includes('alt') === event.altKey;
      
      return hasCtrl && hasShift && hasAlt;
    }) || null;
  }

  private executeShortcutAction(action: KeyboardShortcut['action'], source: NavigationEvent['source']): void {
    switch (action) {
      case 'next':
        this.nextSlice(true, source);
        break;
      case 'previous':
        this.previousSlice(true, source);
        break;
      case 'first':
        this.firstSlice(true, source);
        break;
      case 'last':
        this.lastSlice(true, source);
        break;
      case 'play_pause':
        // This would be handled by the parent component
        this.emitNavigationEvent('slice_changed', this.state.currentSlice, source);
        break;
      case 'speed_up':
      case 'speed_down':
        // These would be handled by the parent component
        this.emitNavigationEvent('slice_changed', this.state.currentSlice, source);
        break;
    }
  }

  private startAnimation(source: NavigationEvent['source'], previousSlice: number): void {
    if (this.state.isAnimating) {
      // Cancel current animation
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
    }

    this.state.isAnimating = true;
    this.state.lastUpdateTime = Date.now();
    
    this.emitNavigationEvent('animation_start', previousSlice, source);
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - this.state.lastUpdateTime;
      const progress = Math.min(elapsed / this.config.animationDuration, 1);
      
      // Smooth easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const startSlice = previousSlice;
      const endSlice = this.state.targetSlice;
      const currentSlice = startSlice + (endSlice - startSlice) * easedProgress;
      
      this.state.currentSlice = Math.round(currentSlice);
      
      if (progress >= 1) {
        // Animation complete
        this.state.currentSlice = this.state.targetSlice;
        this.state.isAnimating = false;
        this.animationFrame = null;
        
        this.emitNavigationEvent('animation_end', previousSlice, source);
        this.emitNavigationEvent('slice_changed', previousSlice, source);
      } else {
        // Continue animation
        this.animationFrame = requestAnimationFrame(animate);
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  private clampSliceIndex(index: number): number {
    if (this.config.totalSlices <= 1) return 0;
    
    switch (this.config.boundaryBehavior) {
      case 'wrap':
        return ((index % this.config.totalSlices) + this.config.totalSlices) % this.config.totalSlices;
      case 'bounce':
        // Simple bounce - reverse direction at boundaries
        if (index < 0) return 0;
        if (index >= this.config.totalSlices) return this.config.totalSlices - 1;
        return index;
      case 'stop':
      default:
        return Math.max(0, Math.min(index, this.config.totalSlices - 1));
    }
  }

  private getNextSliceIndex(currentIndex: number, direction: number): number {
    const nextIndex = currentIndex + direction;
    
    if (this.config.boundaryBehavior === 'stop') {
      if (nextIndex < 0 || nextIndex >= this.config.totalSlices) {
        this.emitNavigationEvent('boundary_reached', currentIndex, 'programmatic');
        return currentIndex; // Stay at current slice
      }
    }
    
    return this.clampSliceIndex(nextIndex);
  }

  private emitNavigationEvent(
    type: NavigationEvent['type'],
    previousSlice: number,
    source: NavigationEvent['source']
  ): void {
    const direction: NavigationEvent['direction'] = 
      this.state.currentSlice > previousSlice ? 'forward' :
      this.state.currentSlice < previousSlice ? 'backward' : 'none';

    const event: NavigationEvent = {
      type,
      currentSlice: this.state.currentSlice,
      previousSlice,
      direction,
      source,
      timestamp: Date.now()
    };

    this.navigationCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in navigation callback:', error);
      }
    });
  }
}

export { SliceNavigationController };