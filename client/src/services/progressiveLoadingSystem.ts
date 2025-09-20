/**
 * Progressive Loading System
 * Multi-resolution image pyramid with quality-based loading and bandwidth adaptation
 */

export interface ImagePyramid {
  id: string;
  baseImageId: string;
  levels: PyramidLevel[];
  totalSize: number;
  format: 'jpeg' | 'webp' | 'avif' | 'raw';
  colorSpace: 'rgb' | 'grayscale' | 'yuv';
  metadata: {
    originalWidth: number;
    originalHeight: number;
    bitDepth: number;
    compressionRatio: number;
    generationTime: number;
  };
}

export interface PyramidLevel {
  level: number;
  width: number;
  height: number;
  quality: number; // 0-100
  size: number; // bytes
  url: string;
  loaded: boolean;
  loading: boolean;
  error?: string;
  loadTime?: number;
}

export interface LoadingStrategy {
  name: string;
  description: string;
  qualityProgression: number[]; // Quality levels to load in order
  adaptiveBandwidth: boolean;
  preloadDistance: number; // Number of slices to preload
  maxConcurrentLoads: number;
  priorityFunction: (distance: number, quality: number) => number;
}

export interface BandwidthProfile {
  name: string;
  downlink: number; // Mbps
  rtt: number; // ms
  effectiveType: string;
  strategy: LoadingStrategy;
  qualityThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface LoadingRequest {
  id: string;
  imageId: string;
  level: number;
  priority: number;
  timestamp: number;
  retryCount: number;
  abortController: AbortController;
}

export interface LoadingStatistics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageLoadTime: number;
  totalBytesLoaded: number;
  bandwidthUtilization: number;
  cacheHitRate: number;
  qualityDistribution: { [quality: number]: number };
}

export interface ProgressiveLoadingConfig {
  enableAdaptiveBandwidth: boolean;
  enablePredictiveLoading: boolean;
  maxCacheSize: number; // MB
  compressionQuality: number; // 0-100
  retryAttempts: number;
  retryDelay: number; // ms
  timeoutDuration: number; // ms
  enableBackgroundProcessing: boolean;
  workerPoolSize: number;
}

class ProgressiveLoadingSystem {
  private config: ProgressiveLoadingConfig;
  private imagePyramids: Map<string, ImagePyramid> = new Map();
  private loadingQueue: LoadingRequest[] = [];
  private activeRequests: Map<string, LoadingRequest> = new Map();
  private loadingStrategies: Map<string, LoadingStrategy> = new Map();
  private bandwidthProfiles: Map<string, BandwidthProfile> = new Map();
  private currentBandwidthProfile: BandwidthProfile | null = null;
  private statistics: LoadingStatistics;
  private workerPool: Worker[] = [];
  private cache: Map<string, ArrayBuffer> = new Map();
  private cacheSize: number = 0; // bytes

  // Network monitoring
  private networkMonitor: any = null;
  private bandwidthHistory: number[] = [];
  private latencyHistory: number[] = [];

  // Predefined loading strategies
  private predefinedStrategies: LoadingStrategy[] = [
    {
      name: 'ultra-fast',
      description: 'Prioritize speed over quality',
      qualityProgression: [25, 50, 75, 100],
      adaptiveBandwidth: true,
      preloadDistance: 2,
      maxConcurrentLoads: 8,
      priorityFunction: (distance: number, quality: number) => {
        return (1 / (distance + 1)) * (quality / 100) * 2;
      }
    },
    {
      name: 'balanced',
      description: 'Balance between speed and quality',
      qualityProgression: [50, 75, 100],
      adaptiveBandwidth: true,
      preloadDistance: 3,
      maxConcurrentLoads: 4,
      priorityFunction: (distance: number, quality: number) => {
        return (1 / (distance + 1)) * (quality / 100);
      }
    },
    {
      name: 'high-quality',
      description: 'Prioritize quality over speed',
      qualityProgression: [75, 100],
      adaptiveBandwidth: false,
      preloadDistance: 5,
      maxConcurrentLoads: 2,
      priorityFunction: (distance: number, quality: number) => {
        return (1 / (distance + 1)) * Math.pow(quality / 100, 2);
      }
    },
    {
      name: 'bandwidth-saver',
      description: 'Minimize bandwidth usage',
      qualityProgression: [25, 50],
      adaptiveBandwidth: true,
      preloadDistance: 1,
      maxConcurrentLoads: 2,
      priorityFunction: (distance: number, quality: number) => {
        return (1 / (distance + 1)) * (1 - quality / 100);
      }
    }
  ];

  // Predefined bandwidth profiles
  private predefinedBandwidthProfiles: BandwidthProfile[] = [
    {
      name: 'high-speed',
      downlink: 10, // 10+ Mbps
      rtt: 50,
      effectiveType: '4g',
      strategy: this.predefinedStrategies[2], // high-quality
      qualityThresholds: { low: 75, medium: 90, high: 100 }
    },
    {
      name: 'medium-speed',
      downlink: 5, // 5-10 Mbps
      rtt: 100,
      effectiveType: '4g',
      strategy: this.predefinedStrategies[1], // balanced
      qualityThresholds: { low: 50, medium: 75, high: 90 }
    },
    {
      name: 'low-speed',
      downlink: 1, // 1-5 Mbps
      rtt: 200,
      effectiveType: '3g',
      strategy: this.predefinedStrategies[0], // ultra-fast
      qualityThresholds: { low: 25, medium: 50, high: 75 }
    },
    {
      name: 'very-low-speed',
      downlink: 0.5, // <1 Mbps
      rtt: 500,
      effectiveType: '2g',
      strategy: this.predefinedStrategies[3], // bandwidth-saver
      qualityThresholds: { low: 25, medium: 25, high: 50 }
    }
  ];

  constructor(config: Partial<ProgressiveLoadingConfig> = {}) {
    this.config = {
      enableAdaptiveBandwidth: true,
      enablePredictiveLoading: true,
      maxCacheSize: 512, // 512 MB
      compressionQuality: 85,
      retryAttempts: 3,
      retryDelay: 1000,
      timeoutDuration: 30000,
      enableBackgroundProcessing: true,
      workerPoolSize: 4,
      ...config
    };

    this.statistics = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLoadTime: 0,
      totalBytesLoaded: 0,
      bandwidthUtilization: 0,
      cacheHitRate: 0,
      qualityDistribution: {}
    };

    this.initialize();
  }

  /**
   * Initialize progressive loading system
   */
  private async initialize(): Promise<void> {
    console.log('📈 [ProgressiveLoadingSystem] Initializing...');

    try {
      // Load predefined strategies and profiles
      this.predefinedStrategies.forEach(strategy => {
        this.loadingStrategies.set(strategy.name, strategy);
      });

      this.predefinedBandwidthProfiles.forEach(profile => {
        this.bandwidthProfiles.set(profile.name, profile);
      });

      // Detect current network conditions
      await this.detectNetworkConditions();

      // Initialize worker pool if background processing is enabled
      if (this.config.enableBackgroundProcessing) {
        this.initializeWorkerPool();
      }

      // Start network monitoring
      if (this.config.enableAdaptiveBandwidth) {
        this.startNetworkMonitoring();
      }

      console.log('📈 [ProgressiveLoadingSystem] Initialized successfully');
    } catch (error) {
      console.error('📈 [ProgressiveLoadingSystem] Initialization failed:', error);
    }
  }

  /**
   * Detect current network conditions
   */
  private async detectNetworkConditions(): Promise<void> {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    let downlink = 5; // Default 5 Mbps
    let rtt = 100; // Default 100ms
    let effectiveType = '4g';

    if (connection) {
      downlink = connection.downlink || 5;
      rtt = connection.rtt || 100;
      effectiveType = connection.effectiveType || '4g';
    }

    // Select appropriate bandwidth profile
    if (downlink >= 10) {
      this.currentBandwidthProfile = this.bandwidthProfiles.get('high-speed')!;
    } else if (downlink >= 5) {
      this.currentBandwidthProfile = this.bandwidthProfiles.get('medium-speed')!;
    } else if (downlink >= 1) {
      this.currentBandwidthProfile = this.bandwidthProfiles.get('low-speed')!;
    } else {
      this.currentBandwidthProfile = this.bandwidthProfiles.get('very-low-speed')!;
    }

    console.log('📈 [ProgressiveLoadingSystem] Network conditions detected:', {
      downlink,
      rtt,
      effectiveType,
      profile: this.currentBandwidthProfile.name
    });
  }

  /**
   * Initialize worker pool for background processing
   */
  private initializeWorkerPool(): void {
    for (let i = 0; i < this.config.workerPoolSize; i++) {
      try {
        const worker = new Worker('/workers/image-processor.js');
        worker.onmessage = (event) => {
          this.handleWorkerMessage(event);
        };
        worker.onerror = (error) => {
          console.error('📈 [ProgressiveLoadingSystem] Worker error:', error);
        };
        this.workerPool.push(worker);
      } catch (error) {
        console.warn('📈 [ProgressiveLoadingSystem] Failed to create worker:', error);
      }
    }

    console.log('📈 [ProgressiveLoadingSystem] Worker pool initialized with', this.workerPool.length, 'workers');
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, data, requestId } = event.data;

    switch (type) {
      case 'pyramid-generated':
        this.handlePyramidGenerated(data, requestId);
        break;
      case 'image-processed':
        this.handleImageProcessed(data, requestId);
        break;
      case 'error':
        console.error('📈 [ProgressiveLoadingSystem] Worker processing error:', data);
        break;
    }
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.detectNetworkConditions();
      });
    }

    // Periodic bandwidth measurement
    setInterval(() => {
      this.measureBandwidth();
    }, 30000); // Every 30 seconds
  }

  /**
   * Measure current bandwidth
   */
  private async measureBandwidth(): Promise<void> {
    try {
      const startTime = performance.now();
      const testSize = 100 * 1024; // 100KB test
      
      const response = await fetch(`/api/bandwidth-test?size=${testSize}`, {
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000; // seconds
        const bandwidth = (testSize * 8) / (1024 * 1024 * duration); // Mbps
        
        this.bandwidthHistory.push(bandwidth);
        if (this.bandwidthHistory.length > 10) {
          this.bandwidthHistory = this.bandwidthHistory.slice(-10);
        }

        // Update bandwidth profile if needed
        this.updateBandwidthProfile(bandwidth);
      }
    } catch (error) {
      console.warn('📈 [ProgressiveLoadingSystem] Bandwidth measurement failed:', error);
    }
  }

  /**
   * Update bandwidth profile based on measured bandwidth
   */
  private updateBandwidthProfile(bandwidth: number): void {
    let newProfile: BandwidthProfile | null = null;

    if (bandwidth >= 10) {
      newProfile = this.bandwidthProfiles.get('high-speed')!;
    } else if (bandwidth >= 5) {
      newProfile = this.bandwidthProfiles.get('medium-speed')!;
    } else if (bandwidth >= 1) {
      newProfile = this.bandwidthProfiles.get('low-speed')!;
    } else {
      newProfile = this.bandwidthProfiles.get('very-low-speed')!;
    }

    if (newProfile && newProfile !== this.currentBandwidthProfile) {
      this.currentBandwidthProfile = newProfile;
      console.log('📈 [ProgressiveLoadingSystem] Bandwidth profile updated to:', newProfile.name);
    }
  }

  /**
   * Generate image pyramid
   */
  public async generateImagePyramid(
    imageId: string,
    imageData: ArrayBuffer,
    originalWidth: number,
    originalHeight: number
  ): Promise<ImagePyramid> {
    const pyramid: ImagePyramid = {
      id: `pyramid-${imageId}`,
      baseImageId: imageId,
      levels: [],
      totalSize: 0,
      format: 'jpeg',
      colorSpace: 'grayscale',
      metadata: {
        originalWidth,
        originalHeight,
        bitDepth: 16,
        compressionRatio: 1,
        generationTime: 0
      }
    };

    const startTime = performance.now();

    // Generate different quality levels
    const qualityLevels = [25, 50, 75, 100];
    
    for (const quality of qualityLevels) {
      const level = await this.generatePyramidLevel(
        imageData,
        originalWidth,
        originalHeight,
        quality,
        qualityLevels.indexOf(quality)
      );
      
      pyramid.levels.push(level);
      pyramid.totalSize += level.size;
    }

    pyramid.metadata.generationTime = performance.now() - startTime;
    this.imagePyramids.set(pyramid.id, pyramid);

    console.log('📈 [ProgressiveLoadingSystem] Generated pyramid for image:', imageId, 'with', pyramid.levels.length, 'levels');

    return pyramid;
  }

  /**
   * Generate single pyramid level
   */
  private async generatePyramidLevel(
    imageData: ArrayBuffer,
    width: number,
    height: number,
    quality: number,
    level: number
  ): Promise<PyramidLevel> {
    // This would typically use a worker for processing
    // For now, we'll create a mock implementation
    
    const scaleFactor = Math.sqrt(quality / 100);
    const scaledWidth = Math.floor(width * scaleFactor);
    const scaledHeight = Math.floor(height * scaleFactor);
    const estimatedSize = Math.floor(imageData.byteLength * (quality / 100) * 0.5);

    return {
      level,
      width: scaledWidth,
      height: scaledHeight,
      quality,
      size: estimatedSize,
      url: `/api/pyramid/${level}/${quality}`, // Mock URL
      loaded: false,
      loading: false
    };
  }

  /**
   * Load image with progressive enhancement
   */
  public async loadImageProgressive(
    imageId: string,
    targetQuality: number = 100,
    onProgress?: (level: PyramidLevel) => void
  ): Promise<ArrayBuffer> {
    const pyramid = this.imagePyramids.get(`pyramid-${imageId}`);
    if (!pyramid) {
      throw new Error(`No pyramid found for image: ${imageId}`);
    }

    const strategy = this.currentBandwidthProfile?.strategy || this.loadingStrategies.get('balanced')!;
    
    // Determine which levels to load based on strategy
    const levelsToLoad = this.selectLevelsToLoad(pyramid, targetQuality, strategy);
    
    let finalData: ArrayBuffer | null = null;

    // Load levels progressively
    for (const level of levelsToLoad) {
      try {
        const data = await this.loadPyramidLevel(pyramid.id, level);
        finalData = data;
        
        if (onProgress) {
          onProgress(level);
        }

        // Stop if we've reached the target quality
        if (level.quality >= targetQuality) {
          break;
        }
      } catch (error) {
        console.warn('📈 [ProgressiveLoadingSystem] Failed to load level:', level.level, error);
      }
    }

    if (!finalData) {
      throw new Error('Failed to load any pyramid level');
    }

    return finalData;
  }

  /**
   * Select levels to load based on strategy
   */
  private selectLevelsToLoad(
    pyramid: ImagePyramid,
    targetQuality: number,
    strategy: LoadingStrategy
  ): PyramidLevel[] {
    const availableLevels = pyramid.levels.filter(level => level.quality <= targetQuality);
    const selectedLevels: PyramidLevel[] = [];

    // Select levels based on strategy progression
    for (const qualityThreshold of strategy.qualityProgression) {
      if (qualityThreshold > targetQuality) break;
      
      const level = availableLevels.find(l => l.quality >= qualityThreshold);
      if (level && !selectedLevels.includes(level)) {
        selectedLevels.push(level);
      }
    }

    // Ensure we have at least one level
    if (selectedLevels.length === 0 && availableLevels.length > 0) {
      selectedLevels.push(availableLevels[0]);
    }

    return selectedLevels.sort((a, b) => a.quality - b.quality);
  }

  /**
   * Load single pyramid level
   */
  private async loadPyramidLevel(pyramidId: string, level: PyramidLevel): Promise<ArrayBuffer> {
    const cacheKey = `${pyramidId}-${level.level}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.statistics.cacheHitRate = (this.statistics.cacheHitRate * this.statistics.totalRequests + 1) / (this.statistics.totalRequests + 1);
      return cached;
    }

    // Create loading request
    const request: LoadingRequest = {
      id: `${pyramidId}-${level.level}-${Date.now()}`,
      imageId: pyramidId,
      level: level.level,
      priority: this.calculatePriority(level),
      timestamp: Date.now(),
      retryCount: 0,
      abortController: new AbortController()
    };

    level.loading = true;
    this.statistics.totalRequests++;

    try {
      const startTime = performance.now();
      
      // Simulate network request
      const response = await fetch(level.url, {
        signal: request.abortController.signal,
        headers: {
          'Cache-Control': 'max-age=3600'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();
      const loadTime = performance.now() - startTime;

      // Update statistics
      this.statistics.completedRequests++;
      this.statistics.totalBytesLoaded += data.byteLength;
      this.statistics.averageLoadTime = (this.statistics.averageLoadTime * (this.statistics.completedRequests - 1) + loadTime) / this.statistics.completedRequests;
      this.statistics.qualityDistribution[level.quality] = (this.statistics.qualityDistribution[level.quality] || 0) + 1;

      // Cache the data
      this.addToCache(cacheKey, data);

      level.loaded = true;
      level.loading = false;
      level.loadTime = loadTime;

      console.log('📈 [ProgressiveLoadingSystem] Loaded level:', level.level, 'quality:', level.quality, 'time:', loadTime.toFixed(2), 'ms');

      return data;
    } catch (error) {
      level.loading = false;
      level.error = error instanceof Error ? error.message : 'Unknown error';
      this.statistics.failedRequests++;
      
      console.error('📈 [ProgressiveLoadingSystem] Failed to load level:', level.level, error);
      throw error;
    }
  }

  /**
   * Calculate loading priority
   */
  private calculatePriority(level: PyramidLevel): number {
    const strategy = this.currentBandwidthProfile?.strategy || this.loadingStrategies.get('balanced')!;
    return strategy.priorityFunction(0, level.quality); // Distance 0 for current image
  }

  /**
   * Add data to cache
   */
  private addToCache(key: string, data: ArrayBuffer): void {
    // Check if adding this would exceed cache size
    const dataSize = data.byteLength;
    const maxCacheBytes = this.config.maxCacheSize * 1024 * 1024;

    // Evict old entries if necessary
    while (this.cacheSize + dataSize > maxCacheBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      const oldData = this.cache.get(oldestKey);
      if (oldData) {
        this.cacheSize -= oldData.byteLength;
      }
      this.cache.delete(oldestKey);
    }

    // Add new data
    this.cache.set(key, data);
    this.cacheSize += dataSize;
  }

  /**
   * Preload images based on prediction
   */
  public async preloadImages(
    currentImageId: string,
    direction: 'forward' | 'backward' | 'both' = 'both',
    distance: number = 3
  ): Promise<void> {
    if (!this.config.enablePredictiveLoading) return;

    const strategy = this.currentBandwidthProfile?.strategy || this.loadingStrategies.get('balanced')!;
    const preloadDistance = Math.min(distance, strategy.preloadDistance);

    const imagesToPreload: string[] = [];

    // Determine which images to preload
    if (direction === 'forward' || direction === 'both') {
      for (let i = 1; i <= preloadDistance; i++) {
        imagesToPreload.push(`${currentImageId}-${i}`);
      }
    }

    if (direction === 'backward' || direction === 'both') {
      for (let i = 1; i <= preloadDistance; i++) {
        imagesToPreload.push(`${currentImageId}+${i}`);
      }
    }

    // Start preloading with lower priority
    for (const imageId of imagesToPreload) {
      const pyramid = this.imagePyramids.get(`pyramid-${imageId}`);
      if (pyramid) {
        // Preload only the lowest quality level
        const lowestQualityLevel = pyramid.levels[0];
        if (lowestQualityLevel && !lowestQualityLevel.loaded && !lowestQualityLevel.loading) {
          this.loadPyramidLevel(pyramid.id, lowestQualityLevel).catch(() => {
            // Ignore preload failures
          });
        }
      }
    }
  }

  /**

   * Handle pyramid generation completion
   */
  private handlePyramidGenerated(data: any, requestId: string): void {
    console.log('📈 [ProgressiveLoadingSystem] Pyramid generated:', requestId);
    // Handle pyramid generation completion
  }

  /**
   * Handle image processing completion
   */
  private handleImageProcessed(data: any, requestId: string): void {
    console.log('📈 [ProgressiveLoadingSystem] Image processed:', requestId);
    // Handle image processing completion
  }

  /**
   * Get loading statistics
   */
  public getStatistics(): LoadingStatistics {
    // Update bandwidth utilization
    const connection = (navigator as any).connection;
    if (connection && this.bandwidthHistory.length > 0) {
      const avgBandwidth = this.bandwidthHistory.reduce((sum, bw) => sum + bw, 0) / this.bandwidthHistory.length;
      this.statistics.bandwidthUtilization = Math.min(1, avgBandwidth / (connection.downlink || 5));
    }

    return { ...this.statistics };
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): {
    size: number;
    maxSize: number;
    utilization: number;
    entries: number;
    hitRate: number;
  } {
    const maxSizeBytes = this.config.maxCacheSize * 1024 * 1024;
    
    return {
      size: this.cacheSize,
      maxSize: maxSizeBytes,
      utilization: this.cacheSize / maxSizeBytes,
      entries: this.cache.size,
      hitRate: this.statistics.cacheHitRate
    };
  }

  /**
   * Get available loading strategies
   */
  public getLoadingStrategies(): LoadingStrategy[] {
    return Array.from(this.loadingStrategies.values());
  }

  /**
   * Set loading strategy
   */
  public setLoadingStrategy(strategyName: string): boolean {
    const strategy = this.loadingStrategies.get(strategyName);
    if (strategy && this.currentBandwidthProfile) {
      this.currentBandwidthProfile.strategy = strategy;
      console.log('📈 [ProgressiveLoadingSystem] Loading strategy changed to:', strategyName);
      return true;
    }
    return false;
  }

  /**
   * Get current bandwidth profile
   */
  public getCurrentBandwidthProfile(): BandwidthProfile | null {
    return this.currentBandwidthProfile;
  }

  /**
   * Get available bandwidth profiles
   */
  public getBandwidthProfiles(): BandwidthProfile[] {
    return Array.from(this.bandwidthProfiles.values());
  }

  /**
   * Set bandwidth profile manually
   */
  public setBandwidthProfile(profileName: string): boolean {
    const profile = this.bandwidthProfiles.get(profileName);
    if (profile) {
      this.currentBandwidthProfile = profile;
      console.log('📈 [ProgressiveLoadingSystem] Bandwidth profile changed to:', profileName);
      return true;
    }
    return false;
  }

  /**
   * Get image pyramid
   */
  public getImagePyramid(imageId: string): ImagePyramid | null {
    return this.imagePyramids.get(`pyramid-${imageId}`) || null;
  }

  /**
   * Check if image is cached
   */
  public isImageCached(imageId: string, quality: number): boolean {
    const pyramid = this.imagePyramids.get(`pyramid-${imageId}`);
    if (!pyramid) return false;

    const level = pyramid.levels.find(l => l.quality >= quality);
    if (!level) return false;

    const cacheKey = `${pyramid.id}-${level.level}`;
    return this.cache.has(cacheKey);
  }

  /**
   * Get optimal quality for current conditions
   */
  public getOptimalQuality(): number {
    if (!this.currentBandwidthProfile) return 75;

    const thresholds = this.currentBandwidthProfile.qualityThresholds;
    const avgBandwidth = this.bandwidthHistory.length > 0 ? 
      this.bandwidthHistory.reduce((sum, bw) => sum + bw, 0) / this.bandwidthHistory.length :
      this.currentBandwidthProfile.downlink;

    if (avgBandwidth >= 10) {
      return thresholds.high;
    } else if (avgBandwidth >= 5) {
      return thresholds.medium;
    } else {
      return thresholds.low;
    }
  }

  /**
   * Estimate load time for quality level
   */
  public estimateLoadTime(imageId: string, quality: number): number {
    const pyramid = this.imagePyramids.get(`pyramid-${imageId}`);
    if (!pyramid) return 0;

    const level = pyramid.levels.find(l => l.quality >= quality);
    if (!level) return 0;

    const avgBandwidth = this.bandwidthHistory.length > 0 ? 
      this.bandwidthHistory.reduce((sum, bw) => sum + bw, 0) / this.bandwidthHistory.length :
      (this.currentBandwidthProfile?.downlink || 5);

    // Estimate based on file size and bandwidth
    const estimatedTime = (level.size * 8) / (avgBandwidth * 1024 * 1024) * 1000; // ms
    
    // Add network latency
    const avgLatency = this.latencyHistory.length > 0 ?
      this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length :
      (this.currentBandwidthProfile?.rtt || 100);

    return estimatedTime + avgLatency;
  }

  /**
   * Cancel loading request
   */
  public cancelLoading(imageId: string): void {
    const activeRequest = Array.from(this.activeRequests.values())
      .find(req => req.imageId.includes(imageId));
    
    if (activeRequest) {
      activeRequest.abortController.abort();
      this.activeRequests.delete(activeRequest.id);
      console.log('📈 [ProgressiveLoadingSystem] Cancelled loading for:', imageId);
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheSize = 0;
    console.log('📈 [ProgressiveLoadingSystem] Cache cleared');
  }

  /**
   * Clear cache for specific image
   */
  public clearImageCache(imageId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(imageId)) {
        const data = this.cache.get(key);
        if (data) {
          this.cacheSize -= data.byteLength;
        }
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log('📈 [ProgressiveLoadingSystem] Cleared cache for image:', imageId);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ProgressiveLoadingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Adjust cache size if needed
    if (newConfig.maxCacheSize !== undefined) {
      const maxCacheBytes = newConfig.maxCacheSize * 1024 * 1024;
      while (this.cacheSize > maxCacheBytes && this.cache.size > 0) {
        const oldestKey = this.cache.keys().next().value;
        const oldData = this.cache.get(oldestKey);
        if (oldData) {
          this.cacheSize -= oldData.byteLength;
        }
        this.cache.delete(oldestKey);
      }
    }

    console.log('📈 [ProgressiveLoadingSystem] Configuration updated');
  }

  /**
   * Get configuration
   */
  public getConfig(): ProgressiveLoadingConfig {
    return { ...this.config };
  }

  /**
   * Get network history
   */
  public getNetworkHistory(): {
    bandwidth: number[];
    latency: number[];
    currentProfile: string;
  } {
    return {
      bandwidth: [...this.bandwidthHistory],
      latency: [...this.latencyHistory],
      currentProfile: this.currentBandwidthProfile?.name || 'unknown'
    };
  }

  /**
   * Force network condition detection
   */
  public async forceNetworkDetection(): Promise<void> {
    await this.detectNetworkConditions();
    await this.measureBandwidth();
  }

  /**
   * Get loading queue status
   */
  public getLoadingQueueStatus(): {
    queueLength: number;
    activeRequests: number;
    completedRequests: number;
    failedRequests: number;
  } {
    return {
      queueLength: this.loadingQueue.length,
      activeRequests: this.activeRequests.size,
      completedRequests: this.statistics.completedRequests,
      failedRequests: this.statistics.failedRequests
    };
  }

  /**
   * Create custom loading strategy
   */
  public createCustomStrategy(strategy: LoadingStrategy): void {
    this.loadingStrategies.set(strategy.name, strategy);
    console.log('📈 [ProgressiveLoadingSystem] Created custom strategy:', strategy.name);
  }

  /**
   * Remove loading strategy
   */
  public removeStrategy(strategyName: string): boolean {
    if (this.predefinedStrategies.some(s => s.name === strategyName)) {
      console.warn('📈 [ProgressiveLoadingSystem] Cannot remove predefined strategy:', strategyName);
      return false;
    }

    const removed = this.loadingStrategies.delete(strategyName);
    if (removed) {
      console.log('📈 [ProgressiveLoadingSystem] Removed strategy:', strategyName);
    }
    return removed;
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLoadTime: 0,
      totalBytesLoaded: 0,
      bandwidthUtilization: 0,
      cacheHitRate: 0,
      qualityDistribution: {}
    };
    console.log('📈 [ProgressiveLoadingSystem] Statistics reset');
  }

  /**
   * Export configuration and statistics
   */
  public exportData(): {
    config: ProgressiveLoadingConfig;
    statistics: LoadingStatistics;
    networkHistory: { bandwidth: number[]; latency: number[] };
    cacheStats: any;
  } {
    return {
      config: this.getConfig(),
      statistics: this.getStatistics(),
      networkHistory: {
        bandwidth: [...this.bandwidthHistory],
        latency: [...this.latencyHistory]
      },
      cacheStats: this.getCacheStatistics()
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Cancel all active requests
    this.activeRequests.forEach(request => {
      request.abortController.abort();
    });
    this.activeRequests.clear();

    // Terminate workers
    this.workerPool.forEach(worker => {
      worker.terminate();
    });
    this.workerPool = [];

    // Clear cache
    this.clearCache();

    // Clear data
    this.imagePyramids.clear();
    this.loadingQueue = [];
    this.bandwidthHistory = [];
    this.latencyHistory = [];

    console.log('📈 [ProgressiveLoadingSystem] Disposed');
  }
}

export { ProgressiveLoadingSystem };