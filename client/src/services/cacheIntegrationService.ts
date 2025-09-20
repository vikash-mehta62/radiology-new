/**
 * Cache Integration Service
 * Integrates the Intelligent Cache Manager with DICOM loading and viewer operations
 */

import { IntelligentCacheManager, CacheStrategy } from './intelligentCacheManager';
import { Study } from '../types';

export interface CacheIntegrationConfig {
  cacheStrategy?: Partial<CacheStrategy>;
  enablePrefetching: boolean;
  prefetchRadius: number; // Number of slices to prefetch around current slice
  enableBackgroundLoading: boolean;
  loadingPriority: 'current' | 'sequential' | 'adaptive';
}

export interface LoadingProgress {
  studyId: string;
  totalSlices: number;
  loadedSlices: number;
  cachedSlices: number;
  currentSlice: number;
  isLoading: boolean;
  estimatedTimeRemaining?: number;
}

export interface CachePerformanceMetrics {
  averageLoadTime: number;
  cacheHitRate: number;
  prefetchEfficiency: number;
  memoryUtilization: number;
  networkSavings: number; // Percentage of requests served from cache
}

/**
 * Service that integrates intelligent caching with DICOM image loading
 */
export class CacheIntegrationService {
  private cacheManager: IntelligentCacheManager;
  private config: CacheIntegrationConfig;
  private loadingProgress = new Map<string, LoadingProgress>();
  private performanceMetrics = new Map<string, CachePerformanceMetrics>();
  private loadingQueue = new Map<string, Promise<ArrayBuffer>>();
  private backgroundLoadingActive = false;

  constructor(config?: Partial<CacheIntegrationConfig>) {
    this.config = {
      enablePrefetching: true,
      prefetchRadius: 5,
      enableBackgroundLoading: true,
      loadingPriority: 'adaptive',
      ...config
    };

    this.cacheManager = new IntelligentCacheManager(this.config.cacheStrategy);
  }

  /**
   * Load a DICOM slice with intelligent caching
   */
  async loadSlice(studyId: string, sliceIndex: number, imageUrl: string): Promise<ArrayBuffer> {
    const cacheKey = this.generateCacheKey(studyId, sliceIndex);
    const startTime = performance.now();

    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.getCachedImage(cacheKey);
      if (cachedData instanceof ArrayBuffer) {
        this.recordCacheHit(studyId, performance.now() - startTime);
        return cachedData;
      }

      // Not in cache, load from network
      const imageData = await this.loadFromNetwork(imageUrl, cacheKey);
      
      // Cache the loaded data
      await this.cacheManager.cacheImage(cacheKey, imageData, {
        studyId,
        sliceIndex,
        imageType: 'dicom-slice'
      });

      // Update loading progress
      this.updateLoadingProgress(studyId, sliceIndex);

      // Trigger prefetching if enabled
      if (this.config.enablePrefetching) {
        this.triggerPrefetching(studyId, sliceIndex);
      }

      this.recordCacheMiss(studyId, performance.now() - startTime);
      return imageData;

    } catch (error) {
      console.error(`Failed to load slice ${sliceIndex} for study ${studyId}:`, error);
      throw error;
    }
  }

  /**
   * Preload an entire study with intelligent prioritization
   */
  async preloadStudy(study: Study, currentSlice = 0): Promise<void> {
    const studyId = study.study_uid;
    
    // Initialize loading progress
    this.loadingProgress.set(studyId, {
      studyId,
      totalSlices: study.image_urls?.length || 1,
      loadedSlices: 0,
      cachedSlices: 0,
      currentSlice,
      isLoading: true
    });

    try {
      // Start prefetching the entire study
      await this.cacheManager.prefetchStudy(studyId, study.image_urls?.length || 1, currentSlice);

      // If background loading is enabled, start loading slices
      if (this.config.enableBackgroundLoading) {
        this.startBackgroundLoading(study, currentSlice);
      }

    } catch (error) {
      console.error(`Failed to preload study ${studyId}:`, error);
      this.updateLoadingProgress(studyId, currentSlice, false);
      throw error;
    }
  }

  /**
   * Get loading progress for a study
   */
  getLoadingProgress(studyId: string): LoadingProgress | null {
    return this.loadingProgress.get(studyId) || null;
  }

  /**
   * Get cache performance metrics for a study
   */
  getPerformanceMetrics(studyId: string): CachePerformanceMetrics | null {
    return this.performanceMetrics.get(studyId) || null;
  }

  /**
   * Update cache strategy
   */
  updateCacheStrategy(strategy: Partial<CacheStrategy>): void {
    this.cacheManager.setCacheStrategy(strategy);
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStatistics() {
    return this.cacheManager.getCacheStatistics();
  }

  /**
   * Clear cache for a specific study
   */
  clearStudyCache(studyId: string): void {
    this.cacheManager.clearCache((entry) => entry.metadata?.studyId === studyId);
    this.loadingProgress.delete(studyId);
    this.performanceMetrics.delete(studyId);
  }

  /**
   * Clear all cache data
   */
  clearAllCache(): void {
    this.cacheManager.clearCache();
    this.loadingProgress.clear();
    this.performanceMetrics.clear();
    this.loadingQueue.clear();
  }

  /**
   * Check if a slice is cached
   */
  isSliceCached(studyId: string, sliceIndex: number): boolean {
    const cacheKey = this.generateCacheKey(studyId, sliceIndex);
    return this.cacheManager.isCached(cacheKey);
  }

  /**
   * Get cached slices for a study
   */
  getCachedSlices(studyId: string): number[] {
    const pattern = new RegExp(`^${studyId}-slice-(\\d+)$`);
    const keys = this.cacheManager.getCacheKeys(pattern);
    
    return keys
      .map(key => {
        const match = key.match(pattern);
        return match ? parseInt(match[1], 10) : -1;
      })
      .filter(index => index >= 0)
      .sort((a, b) => a - b);
  }

  /**
   * Optimize cache for current viewing session
   */
  async optimizeForCurrentSession(studyId: string, currentSlice: number, viewingPattern?: 'sequential' | 'random' | 'focused'): Promise<void> {
    const pattern = viewingPattern || 'sequential';
    
    // Adjust cache strategy based on viewing pattern
    const optimizedStrategy: Partial<CacheStrategy> = {};
    
    switch (pattern) {
      case 'sequential':
        optimizedStrategy.prefetchCount = 15;
        optimizedStrategy.prefetchStrategy = 'sequential';
        break;
        
      case 'random':
        optimizedStrategy.prefetchCount = 5;
        optimizedStrategy.prefetchStrategy = 'adaptive';
        break;
        
      case 'focused':
        optimizedStrategy.prefetchCount = 8;
        optimizedStrategy.prefetchStrategy = 'predictive';
        break;
    }
    
    this.cacheManager.setCacheStrategy(optimizedStrategy);
    
    // Trigger prefetching around current slice
    await this.cacheManager.prefetchSlices(currentSlice, studyId);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.backgroundLoadingActive = false;
    this.cacheManager.cleanup();
    this.loadingProgress.clear();
    this.performanceMetrics.clear();
    this.loadingQueue.clear();
  }

  // Private methods

  private generateCacheKey(studyId: string, sliceIndex: number): string {
    return `${studyId}-slice-${sliceIndex}`;
  }

  private async loadFromNetwork(imageUrl: string, cacheKey: string): Promise<ArrayBuffer> {
    // Check if already loading to avoid duplicate requests
    if (this.loadingQueue.has(cacheKey)) {
      return this.loadingQueue.get(cacheKey)!;
    }

    const loadingPromise = this.performNetworkLoad(imageUrl);
    this.loadingQueue.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingQueue.delete(cacheKey);
    }
  }

  private async performNetworkLoad(imageUrl: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.arrayBuffer();
      
    } catch (error) {
      console.error('Network load failed:', error);
      throw error;
    }
  }

  private updateLoadingProgress(studyId: string, currentSlice: number, isLoading = true): void {
    const progress = this.loadingProgress.get(studyId);
    if (!progress) return;

    const cachedSlices = this.getCachedSlices(studyId);
    
    progress.currentSlice = currentSlice;
    progress.cachedSlices = cachedSlices.length;
    progress.isLoading = isLoading;

    // Estimate time remaining based on loading rate
    if (progress.cachedSlices > 0 && isLoading) {
      const loadingRate = progress.cachedSlices / ((Date.now() - (progress as any).startTime || Date.now()) / 1000);
      const remainingSlices = progress.totalSlices - progress.cachedSlices;
      progress.estimatedTimeRemaining = remainingSlices / loadingRate;
    }

    this.loadingProgress.set(studyId, progress);
  }

  private triggerPrefetching(studyId: string, currentSlice: number): void {
    // Use a small delay to avoid blocking the main thread
    setTimeout(() => {
      this.cacheManager.prefetchSlices(currentSlice, studyId);
    }, 10);
  }

  private startBackgroundLoading(study: Study, currentSlice: number): void {
    if (this.backgroundLoadingActive) return;
    
    this.backgroundLoadingActive = true;
    
    // Background loading with priority queue
    this.processBackgroundLoading(study, currentSlice);
  }

  private async processBackgroundLoading(study: Study, startSlice: number): Promise<void> {
    const studyId = study.study_uid;
    const totalSlices = study.image_urls?.length || 1;
    
    // Create priority queue based on distance from current slice
    const loadingQueue: Array<{ sliceIndex: number; priority: number }> = [];
    
    for (let i = 0; i < totalSlices; i++) {
      if (!this.isSliceCached(studyId, i)) {
        const distance = Math.abs(i - startSlice);
        const priority = Math.max(0, 100 - distance); // Closer slices have higher priority
        loadingQueue.push({ sliceIndex: i, priority });
      }
    }

    // Sort by priority (higher priority first)
    loadingQueue.sort((a, b) => b.priority - a.priority);

    // Load slices in batches to avoid overwhelming the network
    const batchSize = 3;
    
    for (let i = 0; i < loadingQueue.length && this.backgroundLoadingActive; i += batchSize) {
      const batch = loadingQueue.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ sliceIndex }) => {
        try {
          const imageUrl = study.image_urls?.[sliceIndex];
          if (imageUrl && !this.isSliceCached(studyId, sliceIndex)) {
            await this.loadSlice(studyId, sliceIndex, imageUrl);
          }
        } catch (error) {
          console.warn(`Background loading failed for slice ${sliceIndex}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark loading as complete
    this.updateLoadingProgress(studyId, startSlice, false);
  }

  private recordCacheHit(studyId: string, loadTime: number): void {
    this.updatePerformanceMetrics(studyId, { loadTime, wasHit: true });
  }

  private recordCacheMiss(studyId: string, loadTime: number): void {
    this.updatePerformanceMetrics(studyId, { loadTime, wasHit: false });
  }

  private updatePerformanceMetrics(studyId: string, data: { loadTime: number; wasHit: boolean }): void {
    let metrics = this.performanceMetrics.get(studyId);
    
    if (!metrics) {
      metrics = {
        averageLoadTime: 0,
        cacheHitRate: 0,
        prefetchEfficiency: 0,
        memoryUtilization: 0,
        networkSavings: 0
      };
    }

    // Update metrics (simplified calculation)
    const alpha = 0.1; // Smoothing factor for exponential moving average
    metrics.averageLoadTime = metrics.averageLoadTime * (1 - alpha) + data.loadTime * alpha;
    
    // Update hit rate (simplified)
    if (data.wasHit) {
      metrics.cacheHitRate = Math.min(1, metrics.cacheHitRate + 0.01);
      metrics.networkSavings = Math.min(100, metrics.networkSavings + 1);
    } else {
      metrics.cacheHitRate = Math.max(0, metrics.cacheHitRate - 0.005);
    }

    // Update memory utilization from cache statistics
    const cacheStats = this.cacheManager.getCacheStatistics();
    metrics.memoryUtilization = cacheStats.memoryUsage.percentage;

    this.performanceMetrics.set(studyId, metrics);
  }
}

export default CacheIntegrationService;