/**
 * Cine Player Service
 * Service for managing cine playback with intelligent buffering and optimization
 */

import { CacheIntegrationService } from './cacheIntegrationService';
import { Study } from '../types';

export interface CinePlaybackState {
  isPlaying: boolean;
  currentSlice: number;
  totalSlices: number;
  frameRate: number;
  playDirection: 'forward' | 'backward';
  loopMode: 'none' | 'loop' | 'bounce';
  speed: number;
  bufferedSlices: Set<number>;
  preloadProgress: number;
}

export interface CinePlayerConfig {
  defaultFrameRate: number;
  bufferSize: number;
  preloadRadius: number;
  enableSmoothing: boolean;
  adaptiveBuffering: boolean;
  maxConcurrentLoads: number;
}

export interface CinePerformanceMetrics {
  actualFrameRate: number;
  droppedFrames: number;
  bufferHealth: number; // 0-1, percentage of buffer filled
  loadingLatency: number;
  smoothnessScore: number; // 0-1, how smooth the playback is
}

export interface CinePlaybackEvent {
  type: 'play' | 'pause' | 'stop' | 'slice_change' | 'buffer_update' | 'performance_update';
  timestamp: number;
  data?: any;
}

/**
 * Service for managing cine playback with intelligent buffering
 */
export class CinePlayerService {
  private cacheService: CacheIntegrationService;
  private config: CinePlayerConfig;
  private state: CinePlaybackState;
  private metrics: CinePerformanceMetrics;
  private eventListeners: Map<string, ((event: CinePlaybackEvent) => void)[]> = new Map();
  
  // Performance tracking
  private frameTimestamps: number[] = [];
  private lastFrameTime = 0;
  private droppedFrameCount = 0;
  private loadingStartTimes = new Map<number, number>();
  
  // Buffering management
  private bufferingQueue: number[] = [];
  private isBuffering = false;
  private bufferTargetReached = false;

  constructor(cacheService: CacheIntegrationService, config?: Partial<CinePlayerConfig>) {
    this.cacheService = cacheService;
    this.config = {
      defaultFrameRate: 10,
      bufferSize: 20,
      preloadRadius: 10,
      enableSmoothing: true,
      adaptiveBuffering: true,
      maxConcurrentLoads: 3,
      ...config
    };

    this.state = {
      isPlaying: false,
      currentSlice: 0,
      totalSlices: 0,
      frameRate: this.config.defaultFrameRate,
      playDirection: 'forward',
      loopMode: 'loop',
      speed: 1.0,
      bufferedSlices: new Set(),
      preloadProgress: 0
    };

    this.metrics = {
      actualFrameRate: 0,
      droppedFrames: 0,
      bufferHealth: 0,
      loadingLatency: 0,
      smoothnessScore: 1.0
    };
  }

  /**
   * Initialize cine player for a study
   */
  async initializeForStudy(study: Study, startSlice = 0): Promise<void> {
    this.state = {
      ...this.state,
      currentSlice: startSlice,
      totalSlices: study.image_urls?.length || 1,
      bufferedSlices: new Set(),
      preloadProgress: 0
    };

    // Reset metrics
    this.metrics = {
      actualFrameRate: 0,
      droppedFrames: 0,
      bufferHealth: 0,
      loadingLatency: 0,
      smoothnessScore: 1.0
    };

    // Start initial buffering
    await this.startBuffering(startSlice);
    
    this.emitEvent('buffer_update', { bufferHealth: this.metrics.bufferHealth });
  }

  /**
   * Start cine playback
   */
  async startPlayback(): Promise<void> {
    if (this.state.isPlaying) return;

    this.state.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.frameTimestamps = [];
    this.droppedFrameCount = 0;

    // Ensure we have enough buffered slices before starting
    if (!this.bufferTargetReached) {
      await this.ensureBufferHealth();
    }

    this.emitEvent('play', { 
      currentSlice: this.state.currentSlice,
      frameRate: this.state.frameRate 
    });
  }

  /**
   * Pause cine playback
   */
  pausePlayback(): void {
    if (!this.state.isPlaying) return;

    this.state.isPlaying = false;
    this.updatePerformanceMetrics();
    
    this.emitEvent('pause', { 
      currentSlice: this.state.currentSlice,
      metrics: this.metrics 
    });
  }

  /**
   * Stop cine playback and reset to first slice
   */
  stopPlayback(): void {
    this.state.isPlaying = false;
    this.state.currentSlice = 0;
    this.updatePerformanceMetrics();
    
    this.emitEvent('stop', { metrics: this.metrics });
  }

  /**
   * Navigate to next frame in cine sequence
   */
  async nextFrame(): Promise<boolean> {
    const nextSlice = this.calculateNextSlice();
    
    if (nextSlice === null) {
      // End of sequence reached
      if (this.state.loopMode === 'none') {
        this.pausePlayback();
        return false;
      }
    }

    return this.goToSlice(nextSlice!);
  }

  /**
   * Navigate to specific slice
   */
  async goToSlice(sliceIndex: number): Promise<boolean> {
    if (sliceIndex < 0 || sliceIndex >= this.state.totalSlices) {
      return false;
    }

    const frameStartTime = performance.now();
    
    // Check if slice is buffered
    if (!this.state.bufferedSlices.has(sliceIndex)) {
      // Slice not buffered, this might cause a dropped frame
      this.droppedFrameCount++;
      
      // Try to load it immediately
      try {
        await this.loadSlice(sliceIndex);
      } catch (error) {
        console.warn(`Failed to load slice ${sliceIndex}:`, error);
        return false;
      }
    }

    const previousSlice = this.state.currentSlice;
    this.state.currentSlice = sliceIndex;

    // Update performance metrics
    const frameTime = performance.now() - frameStartTime;
    this.recordFrameTime(frameTime);

    // Trigger adaptive buffering around new position
    if (this.config.adaptiveBuffering) {
      this.adaptiveBuffering(sliceIndex);
    }

    this.emitEvent('slice_change', {
      previousSlice,
      currentSlice: sliceIndex,
      frameTime,
      isBuffered: this.state.bufferedSlices.has(sliceIndex)
    });

    return true;
  }

  /**
   * Update frame rate
   */
  setFrameRate(frameRate: number): void {
    this.state.frameRate = Math.max(1, Math.min(60, frameRate));
    
    // Adjust buffering strategy based on frame rate
    if (this.config.adaptiveBuffering) {
      this.adjustBufferSize();
    }
  }

  /**
   * Update playback speed
   */
  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.1, Math.min(5.0, speed));
  }

  /**
   * Set play direction
   */
  setPlayDirection(direction: 'forward' | 'backward'): void {
    this.state.playDirection = direction;
    
    // Adjust buffering for new direction
    this.adaptiveBuffering(this.state.currentSlice);
  }

  /**
   * Set loop mode
   */
  setLoopMode(loopMode: 'none' | 'loop' | 'bounce'): void {
    this.state.loopMode = loopMode;
  }

  /**
   * Get current playback state
   */
  getState(): CinePlaybackState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): CinePerformanceMetrics {
    this.updatePerformanceMetrics();
    return { ...this.metrics };
  }

  /**
   * Check if slice is buffered
   */
  isSliceBuffered(sliceIndex: number): boolean {
    return this.state.bufferedSlices.has(sliceIndex);
  }

  /**
   * Get buffer status around current slice
   */
  getBufferStatus(): { buffered: number[]; missing: number[] } {
    const radius = this.config.preloadRadius;
    const start = Math.max(0, this.state.currentSlice - radius);
    const end = Math.min(this.state.totalSlices - 1, this.state.currentSlice + radius);
    
    const buffered: number[] = [];
    const missing: number[] = [];
    
    for (let i = start; i <= end; i++) {
      if (this.state.bufferedSlices.has(i)) {
        buffered.push(i);
      } else {
        missing.push(i);
      }
    }
    
    return { buffered, missing };
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: (event: CinePlaybackEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: (event: CinePlaybackEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.state.isPlaying = false;
    this.state.bufferedSlices.clear();
    this.bufferingQueue = [];
    this.eventListeners.clear();
    this.frameTimestamps = [];
    this.loadingStartTimes.clear();
  }

  // Private methods

  private async startBuffering(centerSlice: number): Promise<void> {
    this.isBuffering = true;
    this.bufferTargetReached = false;
    
    // Calculate slices to buffer around center slice
    const slicesToBuffer = this.calculateBufferSlices(centerSlice);
    
    // Load slices in priority order
    const loadPromises: Promise<void>[] = [];
    let concurrentLoads = 0;
    
    for (const sliceIndex of slicesToBuffer) {
      if (concurrentLoads >= this.config.maxConcurrentLoads) {
        await Promise.race(loadPromises);
        concurrentLoads--;
      }
      
      const loadPromise = this.loadSlice(sliceIndex).then(() => {
        concurrentLoads--;
        this.updateBufferHealth();
      });
      
      loadPromises.push(loadPromise);
      concurrentLoads++;
    }
    
    // Wait for all loads to complete
    await Promise.all(loadPromises);
    
    this.isBuffering = false;
    this.bufferTargetReached = true;
    this.updateBufferHealth();
  }

  private calculateBufferSlices(centerSlice: number): number[] {
    const radius = this.config.preloadRadius;
    const slices: number[] = [];
    
    // Add center slice first (highest priority)
    slices.push(centerSlice);
    
    // Add slices in expanding radius, prioritizing play direction
    for (let r = 1; r <= radius; r++) {
      if (this.state.playDirection === 'forward') {
        // Prioritize forward direction
        const forward = centerSlice + r;
        const backward = centerSlice - r;
        
        if (forward < this.state.totalSlices) slices.push(forward);
        if (backward >= 0) slices.push(backward);
      } else {
        // Prioritize backward direction
        const backward = centerSlice - r;
        const forward = centerSlice + r;
        
        if (backward >= 0) slices.push(backward);
        if (forward < this.state.totalSlices) slices.push(forward);
      }
    }
    
    return slices.filter(slice => !this.state.bufferedSlices.has(slice));
  }

  private async loadSlice(sliceIndex: number): Promise<void> {
    if (this.state.bufferedSlices.has(sliceIndex)) {
      return; // Already loaded
    }
    
    const loadStartTime = performance.now();
    this.loadingStartTimes.set(sliceIndex, loadStartTime);
    
    try {
      // This would typically load from the cache service
      // For now, we'll simulate the loading
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate load time
      
      this.state.bufferedSlices.add(sliceIndex);
      
      const loadTime = performance.now() - loadStartTime;
      this.updateLoadingLatency(loadTime);
      
    } catch (error) {
      console.error(`Failed to load slice ${sliceIndex}:`, error);
      throw error;
    } finally {
      this.loadingStartTimes.delete(sliceIndex);
    }
  }

  private calculateNextSlice(): number | null {
    let nextSlice: number;
    
    if (this.state.playDirection === 'forward') {
      nextSlice = this.state.currentSlice + 1;
      
      if (nextSlice >= this.state.totalSlices) {
        switch (this.state.loopMode) {
          case 'loop':
            return 0;
          case 'bounce':
            this.state.playDirection = 'backward';
            return this.state.totalSlices - 2;
          case 'none':
          default:
            return null;
        }
      }
    } else {
      nextSlice = this.state.currentSlice - 1;
      
      if (nextSlice < 0) {
        switch (this.state.loopMode) {
          case 'loop':
            return this.state.totalSlices - 1;
          case 'bounce':
            this.state.playDirection = 'forward';
            return 1;
          case 'none':
          default:
            return null;
        }
      }
    }
    
    return nextSlice;
  }

  private adaptiveBuffering(currentSlice: number): void {
    if (!this.config.adaptiveBuffering || this.isBuffering) return;
    
    // Check buffer health around current position
    const { missing } = this.getBufferStatus();
    
    if (missing.length > this.config.bufferSize * 0.3) {
      // Buffer health is low, start background buffering
      this.backgroundBuffer(currentSlice);
    }
  }

  private async backgroundBuffer(centerSlice: number): Promise<void> {
    const slicesToBuffer = this.calculateBufferSlices(centerSlice)
      .slice(0, this.config.maxConcurrentLoads);
    
    const loadPromises = slicesToBuffer.map(slice => 
      this.loadSlice(slice).catch(error => 
        console.warn(`Background buffer failed for slice ${slice}:`, error)
      )
    );
    
    Promise.all(loadPromises).then(() => {
      this.updateBufferHealth();
    });
  }

  private adjustBufferSize(): void {
    // Adjust buffer size based on frame rate
    const baseSize = this.config.bufferSize;
    const frameRateMultiplier = Math.max(0.5, Math.min(2.0, this.state.frameRate / 10));
    
    this.config.preloadRadius = Math.round(baseSize * frameRateMultiplier);
  }

  private async ensureBufferHealth(): Promise<void> {
    const { missing } = this.getBufferStatus();
    
    if (missing.length > 0) {
      // Load missing slices with priority on immediate neighbors
      const prioritySlices = missing
        .sort((a, b) => Math.abs(a - this.state.currentSlice) - Math.abs(b - this.state.currentSlice))
        .slice(0, this.config.maxConcurrentLoads);
      
      await Promise.all(prioritySlices.map(slice => this.loadSlice(slice)));
    }
  }

  private recordFrameTime(frameTime: number): void {
    this.frameTimestamps.push(performance.now());
    
    // Keep only recent frame times for accurate FPS calculation
    const maxFrames = 60; // Keep last 60 frames
    if (this.frameTimestamps.length > maxFrames) {
      this.frameTimestamps = this.frameTimestamps.slice(-maxFrames);
    }
    
    // Update metrics periodically
    if (this.frameTimestamps.length % 10 === 0) {
      this.updatePerformanceMetrics();
      this.emitEvent('performance_update', { metrics: this.metrics });
    }
  }

  private updatePerformanceMetrics(): void {
    // Calculate actual frame rate
    if (this.frameTimestamps.length >= 2) {
      const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
      this.metrics.actualFrameRate = ((this.frameTimestamps.length - 1) / timeSpan) * 1000;
    }
    
    // Update dropped frames
    this.metrics.droppedFrames = this.droppedFrameCount;
    
    // Update buffer health
    this.updateBufferHealth();
    
    // Calculate smoothness score
    this.calculateSmoothnessScore();
  }

  private updateBufferHealth(): void {
    const { buffered } = this.getBufferStatus();
    const targetBufferSize = this.config.preloadRadius * 2 + 1;
    this.metrics.bufferHealth = Math.min(1.0, buffered.length / targetBufferSize);
    
    this.state.preloadProgress = this.metrics.bufferHealth * 100;
  }

  private updateLoadingLatency(loadTime: number): void {
    // Exponential moving average
    const alpha = 0.1;
    this.metrics.loadingLatency = this.metrics.loadingLatency * (1 - alpha) + loadTime * alpha;
  }

  private calculateSmoothnessScore(): void {
    if (this.frameTimestamps.length < 10) {
      this.metrics.smoothnessScore = 1.0;
      return;
    }
    
    // Calculate frame time variance
    const frameTimes: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      frameTimes.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }
    
    const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    const variance = frameTimes.reduce((sum, time) => sum + Math.pow(time - avgFrameTime, 2), 0) / frameTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Smoothness score based on frame time consistency
    const coefficientOfVariation = standardDeviation / avgFrameTime;
    this.metrics.smoothnessScore = Math.max(0, 1 - coefficientOfVariation * 2);
  }

  private emitEvent(type: CinePlaybackEvent['type'], data?: any): void {
    const event: CinePlaybackEvent = {
      type,
      timestamp: performance.now(),
      data
    };
    
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in cine player event listener:', error);
        }
      });
    }
  }
}

export default CinePlayerService;