/**
 * Predictive Cache Service
 * Implements intelligent caching based on user interaction patterns
 * Predicts which images/data will be needed next and preloads them
 */

export interface UserInteraction {
  type: 'frame_navigation' | 'zoom' | 'pan' | 'windowing' | 'tool_usage';
  timestamp: number;
  frameIndex?: number;
  direction?: 'next' | 'previous' | 'jump';
  zoomLevel?: number;
  panPosition?: { x: number; y: number };
  windowSettings?: { width: number; center: number };
  toolType?: string;
  sessionId: string;
}

export interface PredictionResult {
  frameIndex: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  estimatedAccessTime: number;
}

export interface CacheItem {
  key: string;
  data: any;
  size: number;
  lastAccessed: number;
  accessCount: number;
  priority: number;
  predicted: boolean;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  maxCacheSize: number;
  predictiveHits: number;
  evictions: number;
}

/**
 * Predictive Cache Service Configuration
 */
export interface PredictiveCacheConfig {
  maxCacheSize: number; // Maximum cache size in bytes
  maxItems: number; // Maximum number of cached items
  predictionWindow: number; // How many frames ahead to predict
  confidenceThreshold: number; // Minimum confidence for predictions
  learningRate: number; // How quickly to adapt to new patterns
  sessionTimeout: number; // Session timeout in milliseconds
}

/**
 * Navigation Pattern Analysis
 */
class NavigationPatternAnalyzer {
  private interactions: UserInteraction[] = [];
  private patterns: Map<string, number> = new Map();
  private sequencePatterns: Map<string, number> = new Map();

  addInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);
    
    // Keep only recent interactions (last 1000)
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }

    this.updatePatterns(interaction);
  }

  private updatePatterns(interaction: UserInteraction): void {
    // Update single action patterns
    const patternKey = `${interaction.type}_${interaction.direction || 'none'}`;
    this.patterns.set(patternKey, (this.patterns.get(patternKey) || 0) + 1);

    // Update sequence patterns (last 3 interactions)
    if (this.interactions.length >= 3) {
      const recentInteractions = this.interactions.slice(-3);
      const sequenceKey = recentInteractions
        .map(i => `${i.type}_${i.direction || 'none'}`)
        .join('->');
      
      this.sequencePatterns.set(sequenceKey, (this.sequencePatterns.get(sequenceKey) || 0) + 1);
    }
  }

  predictNextFrames(currentFrame: number, totalFrames: number): PredictionResult[] {
    const predictions: PredictionResult[] = [];
    
    // Analyze recent navigation patterns
    const recentInteractions = this.interactions.slice(-10);
    const navigationInteractions = recentInteractions.filter(i => i.type === 'frame_navigation');

    if (navigationInteractions.length === 0) {
      // No navigation history, predict sequential access
      return this.getSequentialPredictions(currentFrame, totalFrames);
    }

    // Calculate direction preferences
    const directionCounts = navigationInteractions.reduce((acc, interaction) => {
      const dir = interaction.direction || 'none';
      acc[dir] = (acc[dir] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalNavigation = navigationInteractions.length;
    
    // Predict based on direction preferences
    Object.entries(directionCounts).forEach(([direction, count]) => {
      const confidence = count / totalNavigation;
      
      if (confidence > 0.3) { // Only consider significant patterns
        const prediction = this.getPredictionForDirection(
          direction as any, 
          currentFrame, 
          totalFrames, 
          confidence
        );
        
        if (prediction) {
          predictions.push(prediction);
        }
      }
    });

    // Add sequential predictions with lower priority
    const sequentialPredictions = this.getSequentialPredictions(currentFrame, totalFrames)
      .map(p => ({ ...p, confidence: p.confidence * 0.5, priority: 'low' as const }));

    return [...predictions, ...sequentialPredictions]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 predictions
  }

  private getPredictionForDirection(
    direction: string, 
    currentFrame: number, 
    totalFrames: number, 
    confidence: number
  ): PredictionResult | null {
    let frameIndex: number;
    let priority: 'high' | 'medium' | 'low' = 'medium';

    switch (direction) {
      case 'next':
        frameIndex = Math.min(currentFrame + 1, totalFrames - 1);
        priority = confidence > 0.7 ? 'high' : 'medium';
        break;
      case 'previous':
        frameIndex = Math.max(currentFrame - 1, 0);
        priority = confidence > 0.7 ? 'high' : 'medium';
        break;
      case 'jump':
        // Predict common jump targets based on history
        frameIndex = this.predictJumpTarget(currentFrame, totalFrames);
        priority = 'low';
        break;
      default:
        return null;
    }

    if (frameIndex === currentFrame) return null;

    return {
      frameIndex,
      confidence,
      priority,
      estimatedAccessTime: Date.now() + (priority === 'high' ? 1000 : 3000)
    };
  }

  private getSequentialPredictions(currentFrame: number, totalFrames: number): PredictionResult[] {
    const predictions: PredictionResult[] = [];
    
    // Predict next few frames
    for (let i = 1; i <= 3; i++) {
      const nextFrame = currentFrame + i;
      if (nextFrame < totalFrames) {
        predictions.push({
          frameIndex: nextFrame,
          confidence: Math.max(0.3, 0.8 - (i * 0.2)),
          priority: i === 1 ? 'high' : 'medium',
          estimatedAccessTime: Date.now() + (i * 1000)
        });
      }
    }

    // Predict previous frames
    for (let i = 1; i <= 2; i++) {
      const prevFrame = currentFrame - i;
      if (prevFrame >= 0) {
        predictions.push({
          frameIndex: prevFrame,
          confidence: Math.max(0.2, 0.6 - (i * 0.2)),
          priority: 'low',
          estimatedAccessTime: Date.now() + (i * 2000)
        });
      }
    }

    return predictions;
  }

  private predictJumpTarget(currentFrame: number, totalFrames: number): number {
    // Analyze jump patterns from history
    const jumpInteractions = this.interactions.filter(i => 
      i.type === 'frame_navigation' && i.direction === 'jump'
    );

    if (jumpInteractions.length === 0) {
      // Default to middle of dataset
      return Math.floor(totalFrames / 2);
    }

    // Find most common jump targets relative to current position
    const relativeJumps = jumpInteractions
      .map(i => (i.frameIndex || 0) - currentFrame)
      .filter(jump => Math.abs(jump) > 1); // Only significant jumps

    if (relativeJumps.length === 0) {
      return Math.floor(totalFrames / 2);
    }

    // Calculate average jump distance
    const avgJump = relativeJumps.reduce((sum, jump) => sum + jump, 0) / relativeJumps.length;
    const targetFrame = Math.round(currentFrame + avgJump);

    return Math.max(0, Math.min(targetFrame, totalFrames - 1));
  }

  getPatternStats(): { patterns: Map<string, number>; sequences: Map<string, number> } {
    return {
      patterns: new Map(this.patterns),
      sequences: new Map(this.sequencePatterns)
    };
  }
}

/**
 * Predictive Cache Service
 */
export class PredictiveCacheService {
  private cache: Map<string, CacheItem> = new Map();
  private config: PredictiveCacheConfig;
  private patternAnalyzer: NavigationPatternAnalyzer;
  private stats: CacheStats;
  private currentCacheSize: number = 0;
  private sessionId: string;

  constructor(config: Partial<PredictiveCacheConfig> = {}) {
    this.config = {
      maxCacheSize: 500 * 1024 * 1024, // 500MB
      maxItems: 1000,
      predictionWindow: 5,
      confidenceThreshold: 0.3,
      learningRate: 0.1,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    this.patternAnalyzer = new NavigationPatternAnalyzer();
    this.sessionId = this.generateSessionId();
    
    this.stats = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      maxCacheSize: this.config.maxCacheSize,
      predictiveHits: 0,
      evictions: 0
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Record user interaction for pattern learning
   */
  recordInteraction(interaction: Omit<UserInteraction, 'sessionId'>): void {
    this.patternAnalyzer.addInteraction({
      ...interaction,
      sessionId: this.sessionId
    });
  }

  /**
   * Get item from cache
   */
  get(key: string): any | null {
    this.stats.totalRequests++;
    
    const item = this.cache.get(key);
    if (item) {
      // Cache hit
      item.lastAccessed = Date.now();
      item.accessCount++;
      this.stats.hitRate = this.calculateHitRate();
      
      if (item.predicted) {
        this.stats.predictiveHits++;
      }
      
      return item.data;
    }

    // Cache miss
    this.stats.missRate = this.calculateMissRate();
    return null;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: any, size: number, predicted: boolean = false): void {
    // Check if we need to evict items
    if (this.currentCacheSize + size > this.config.maxCacheSize || 
        this.cache.size >= this.config.maxItems) {
      this.evictItems(size);
    }

    const item: CacheItem = {
      key,
      data,
      size,
      lastAccessed: Date.now(),
      accessCount: 1,
      priority: predicted ? 0.5 : 1.0,
      predicted
    };

    // Remove existing item if present
    const existingItem = this.cache.get(key);
    if (existingItem) {
      this.currentCacheSize -= existingItem.size;
    }

    this.cache.set(key, item);
    this.currentCacheSize += size;
    this.updateStats();
  }

  /**
   * Predict and preload next items
   */
  async predictAndPreload(
    currentFrame: number, 
    totalFrames: number, 
    loadFunction: (frameIndex: number) => Promise<{ data: any; size: number }>
  ): Promise<void> {
    const predictions = this.patternAnalyzer.predictNextFrames(currentFrame, totalFrames);
    
    // Filter predictions by confidence threshold
    const validPredictions = predictions.filter(p => 
      p.confidence >= this.config.confidenceThreshold
    );

    // Preload predicted items
    const preloadPromises = validPredictions.map(async (prediction) => {
      const key = `frame_${prediction.frameIndex}`;
      
      // Skip if already cached
      if (this.cache.has(key)) return;

      try {
        const { data, size } = await loadFunction(prediction.frameIndex);
        this.set(key, data, size, true);
        
        console.log(`🔮 Preloaded frame ${prediction.frameIndex} (confidence: ${prediction.confidence.toFixed(2)})`);
      } catch (error) {
        console.warn(`Failed to preload frame ${prediction.frameIndex}:`, error);
      }
    });

    await Promise.all(preloadPromises);
  }

  /**
   * Evict items to make space
   */
  private evictItems(requiredSpace: number): void {
    const items = Array.from(this.cache.values());
    
    // Sort by priority (lower priority first), then by last accessed time
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.lastAccessed - b.lastAccessed;
    });

    let freedSpace = 0;
    const itemsToEvict: string[] = [];

    for (const item of items) {
      if (freedSpace >= requiredSpace && this.cache.size - itemsToEvict.length < this.config.maxItems) {
        break;
      }

      itemsToEvict.push(item.key);
      freedSpace += item.size;
    }

    // Remove evicted items
    for (const key of itemsToEvict) {
      const item = this.cache.get(key);
      if (item) {
        this.cache.delete(key);
        this.currentCacheSize -= item.size;
        this.stats.evictions++;
      }
    }

    console.log(`🗑️ Evicted ${itemsToEvict.length} items, freed ${freedSpace} bytes`);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    this.updateStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get pattern analysis results
   */
  getPatternAnalysis(): { patterns: Map<string, number>; sequences: Map<string, number> } {
    return this.patternAnalyzer.getPatternStats();
  }

  private calculateHitRate(): number {
    return this.stats.totalRequests > 0 ? 
      (this.stats.totalRequests - this.calculateMissCount()) / this.stats.totalRequests : 0;
  }

  private calculateMissRate(): number {
    return this.stats.totalRequests > 0 ? 
      this.calculateMissCount() / this.stats.totalRequests : 0;
  }

  private calculateMissCount(): number {
    return this.stats.totalRequests - this.cache.size;
  }

  private updateStats(): void {
    this.stats.cacheSize = this.currentCacheSize;
    this.stats.hitRate = this.calculateHitRate();
    this.stats.missRate = this.calculateMissRate();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 60000); // Run every minute
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      // Remove items not accessed for session timeout duration
      if (now - item.lastAccessed > this.config.sessionTimeout) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const item = this.cache.get(key);
      if (item) {
        this.cache.delete(key);
        this.currentCacheSize -= item.size;
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache items`);
      this.updateStats();
    }
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.clear();
  }
}