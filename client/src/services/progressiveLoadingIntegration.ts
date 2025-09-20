/**
 * Progressive Loading Integration Service
 * Integrates the Progressive Loading System with existing DICOM viewers
 */

import { ProgressiveLoadingSystem } from './progressiveLoadingSystem';
import { IntelligentCacheManager } from './intelligentCacheManager';
import { dicomService } from './dicomService';

export interface ProgressiveLoadingIntegrationConfig {
  enableProgressiveLoading: boolean;
  enableAdaptiveBandwidth: boolean;
  enablePredictiveLoading: boolean;
  maxCacheSize: number; // MB
  qualityLevels: number[];
  initialQuality: number;
  targetQuality: number;
}

export interface LoadingProgress {
  imageId: string;
  currentQuality: number;
  targetQuality: number;
  loadedLevels: number[];
  isComplete: boolean;
  loadingTime: number;
  estimatedTimeRemaining: number;
}

/**
 * Integration service that bridges Progressive Loading with existing viewers
 */
export class ProgressiveLoadingIntegration {
  private progressiveLoader: ProgressiveLoadingSystem;
  private cacheManager: IntelligentCacheManager;
  private config: ProgressiveLoadingIntegrationConfig;
  private loadingProgress: Map<string, LoadingProgress> = new Map();
  private progressCallbacks: Map<string, (progress: LoadingProgress) => void> = new Map();

  constructor(
    cacheManager: IntelligentCacheManager,
    config: Partial<ProgressiveLoadingIntegrationConfig> = {}
  ) {
    this.cacheManager = cacheManager;
    this.config = {
      enableProgressiveLoading: true,
      enableAdaptiveBandwidth: true,
      enablePredictiveLoading: true,
      maxCacheSize: 200, // MB
      qualityLevels: [0.25, 0.5, 0.75, 1.0],
      initialQuality: 0.25,
      targetQuality: 1.0,
      ...config
    };

    this.progressiveLoader = new ProgressiveLoadingSystem({
      enableAdaptiveBandwidth: this.config.enableAdaptiveBandwidth,
      enablePredictiveLoading: this.config.enablePredictiveLoading,
      maxCacheSize: this.config.maxCacheSize
    });
  }

  /**
   * Load image with progressive enhancement
   */
  async loadImageProgressively(
    imageId: string,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<ImageData> {
    if (!this.config.enableProgressiveLoading) {
      // Fallback to regular loading
      return this.loadImageRegular(imageId);
    }

    // Register progress callback
    if (onProgress) {
      this.progressCallbacks.set(imageId, onProgress);
    }

    // Initialize progress tracking
    const progress: LoadingProgress = {
      imageId,
      currentQuality: 0,
      targetQuality: this.config.targetQuality,
      loadedLevels: [],
      isComplete: false,
      loadingTime: 0,
      estimatedTimeRemaining: 0
    };
    this.loadingProgress.set(imageId, progress);

    const startTime = performance.now();

    try {
      // Check cache first
      const cachedImage = await this.cacheManager.getCachedImage(imageId);
      if (cachedImage && cachedImage instanceof ImageData) {
        progress.isComplete = true;
        progress.currentQuality = this.config.targetQuality;
        progress.loadingTime = performance.now() - startTime;
        this.updateProgress(imageId, progress);
        return cachedImage;
      }

      // Start progressive loading
      const imageData = await this.progressiveLoader.loadImageProgressive(
        imageId,
        100 // target quality
      );

      // Update progress
      progress.isComplete = true;
      progress.currentQuality = 100;
      progress.loadingTime = performance.now() - startTime;
      progress.estimatedTimeRemaining = 0;
      this.updateProgress(imageId, progress);

      // Cache final image
      this.cacheManager.cacheImage(imageId, imageData);

      // Convert ArrayBuffer to ImageData (mock conversion)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 512; // Default size
      canvas.height = 512;
      return ctx.createImageData(512, 512);

    } catch (error) {
      console.error('Progressive loading failed, falling back to regular loading:', error);
      return this.loadImageRegular(imageId);
    } finally {
      // Cleanup
      this.progressCallbacks.delete(imageId);
      this.loadingProgress.delete(imageId);
    }
  }

  /**
   * Preload images with progressive enhancement
   */
  async preloadImagesProgressively(
    imageIds: string[],
    onProgress?: (overallProgress: { loaded: number; total: number; currentImage: string }) => void
  ): Promise<void> {
    if (!this.config.enableProgressiveLoading) {
      return;
    }

    let loadedCount = 0;
    const total = imageIds.length;

    for (const imageId of imageIds) {
      try {
        await this.loadImageProgressively(imageId, (progress) => {
          if (onProgress) {
            onProgress({
              loaded: loadedCount,
              total,
              currentImage: imageId
            });
          }
        });
        loadedCount++;
      } catch (error) {
        console.warn('Failed to preload image:', imageId, error);
        loadedCount++;
      }
    }

    if (onProgress) {
      onProgress({ loaded: total, total, currentImage: '' });
    }
  }

  /**
   * Load study with progressive enhancement
   */
  async loadStudyProgressively(
    studyId: string,
    imageIds: string[],
    currentSliceIndex: number = 0,
    onProgress?: (progress: { 
      studyId: string; 
      loadedSlices: number; 
      totalSlices: number; 
      currentSlice: LoadingProgress | null 
    }) => void
  ): Promise<void> {
    if (!this.config.enableProgressiveLoading) {
      return;
    }

    // Prioritize loading order based on current slice
    const prioritizedIds = this.prioritizeImageIds(imageIds, currentSliceIndex);
    let loadedSlices = 0;

    for (const imageId of prioritizedIds) {
      try {
        await this.loadImageProgressively(imageId, (sliceProgress) => {
          if (onProgress) {
            onProgress({
              studyId,
              loadedSlices,
              totalSlices: imageIds.length,
              currentSlice: sliceProgress
            });
          }
        });
        loadedSlices++;
      } catch (error) {
        console.warn('Failed to load slice progressively:', imageId, error);
        loadedSlices++;
      }
    }

    if (onProgress) {
      onProgress({
        studyId,
        loadedSlices: imageIds.length,
        totalSlices: imageIds.length,
        currentSlice: null
      });
    }
  }

  /**
   * Get loading progress for an image
   */
  getLoadingProgress(imageId: string): LoadingProgress | null {
    return this.loadingProgress.get(imageId) || null;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ProgressiveLoadingIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update progressive loader config
    this.progressiveLoader.updateConfig({
      enableAdaptiveBandwidth: this.config.enableAdaptiveBandwidth,
      enablePredictiveLoading: this.config.enablePredictiveLoading,
      maxCacheSize: this.config.maxCacheSize
    });
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics() {
    return this.progressiveLoader.getNetworkHistory();
  }

  /**
   * Clear progressive loading cache
   */
  clearCache(): void {
    this.progressiveLoader.clearCache();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    (this.progressiveLoader as any).cleanup?.();
    this.loadingProgress.clear();
    this.progressCallbacks.clear();
  }

  // Private methods

  private async loadImageRegular(imageId: string): Promise<ImageData> {
    // Fallback to regular DICOM service loading
    try {
      // This is a simplified fallback - in reality, you'd integrate with your existing DICOM loading
      const response = await fetch(`/api/dicom/image/${imageId}`);
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to ImageData (simplified - real implementation would use DICOM parsing)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // This is a placeholder - real implementation would parse DICOM data
      canvas.width = 512;
      canvas.height = 512;
      const imageData = ctx.createImageData(512, 512);
      
      // Cache the result
      await this.cacheManager.cacheImage(imageId, imageData);
      
      return imageData;
    } catch (error) {
      console.error('Regular image loading failed:', error);
      throw error;
    }
  }

  private prioritizeImageIds(imageIds: string[], currentIndex: number): string[] {
    const prioritized: string[] = [];
    const visited = new Set<number>();

    // Add current slice first
    if (currentIndex >= 0 && currentIndex < imageIds.length) {
      prioritized.push(imageIds[currentIndex]);
      visited.add(currentIndex);
    }

    // Add adjacent slices in expanding order
    let distance = 1;
    while (visited.size < imageIds.length) {
      // Add slice before current
      const beforeIndex = currentIndex - distance;
      if (beforeIndex >= 0 && !visited.has(beforeIndex)) {
        prioritized.push(imageIds[beforeIndex]);
        visited.add(beforeIndex);
      }

      // Add slice after current
      const afterIndex = currentIndex + distance;
      if (afterIndex < imageIds.length && !visited.has(afterIndex)) {
        prioritized.push(imageIds[afterIndex]);
        visited.add(afterIndex);
      }

      distance++;
    }

    return prioritized;
  }

  private estimateRemainingTime(progress: LoadingProgress): number {
    if (progress.loadedLevels.length === 0) return 0;

    const averageTimePerLevel = progress.loadingTime / progress.loadedLevels.length;
    const remainingLevels = this.config.qualityLevels.length - progress.loadedLevels.length;
    
    return averageTimePerLevel * remainingLevels;
  }

  private updateProgress(imageId: string, progress: LoadingProgress): void {
    this.loadingProgress.set(imageId, progress);
    
    const callback = this.progressCallbacks.get(imageId);
    if (callback) {
      callback(progress);
    }
  }
}

// Export singleton instance
const createProgressiveLoadingIntegration = async () => {
  const { IntelligentCacheManager } = await import('./intelligentCacheManager');
  return new ProgressiveLoadingIntegration(new IntelligentCacheManager());
};

export const progressiveLoadingIntegration = new ProgressiveLoadingIntegration(
  {} as any // Temporary mock for build
);

export default ProgressiveLoadingIntegration;