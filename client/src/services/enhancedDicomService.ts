/**
 * Enhanced DICOM Service with backend processing integration
 * Provides optimized image loading, caching, and processing capabilities
 */

import { apiService } from './api';

export interface DicomMetadata {
  patient_id: string;
  patient_name: string;
  patient_birth_date: string;
  patient_sex: string;
  study_date: string;
  study_time: string;
  study_description: string;
  modality: string;
  rows: number;
  columns: number;
  pixel_spacing: number[];
  slice_thickness: string;
  window_center: number | null;
  window_width: number | null;
}

export interface ProcessedDicomResult {
  success: boolean;
  error?: string;
  metadata: DicomMetadata;
  image_data: string; // Base64 encoded image
  thumbnail: string; // Base64 encoded thumbnail
}

export interface CacheStats {
  memory_cache_items: number;
  disk_cache_items: number;
  disk_cache_size_mb: number;
  max_memory_items: number;
  max_disk_size_mb: number;
}

export type EnhancementType = 'clahe' | 'histogram_eq' | 'gamma' | 'adaptive_eq' | 'unsharp_mask';
export type FilterType = 'gaussian' | 'median' | 'bilateral' | 'edge_enhance';
export type OutputFormat = 'PNG' | 'JPEG' | 'TIFF' | 'BMP';

export class EnhancedDicomService {
  private baseUrl: string;
  private imageCache: Map<string, string> = new Map();
  private metadataCache: Map<string, DicomMetadata> = new Map();
  private thumbnailCache: Map<string, string> = new Map();

  constructor(baseUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get DICOM metadata without processing the image
   */
  async getDicomMetadata(patientId: string, filename: string): Promise<DicomMetadata> {
    const cacheKey = `${patientId}/${filename}`;
    
    // Check cache first
    if (this.metadataCache.has(cacheKey)) {
      return this.metadataCache.get(cacheKey)!;
    }

    try {
      const response = await apiService.get(`/dicom/metadata/${patientId}/${filename}`);
      
      if (response.data.success) {
        const metadata = response.data.metadata;
        this.metadataCache.set(cacheKey, metadata);
        return metadata;
      } else {
        throw new Error('Failed to get DICOM metadata');
      }
    } catch (error) {
      console.error('Error getting DICOM metadata:', error);
      throw error;
    }
  }

  /**
   * Process DICOM file with enhancements and get optimized image
   */
  async processDicomFile(
    patientId: string,
    filename: string,
    options: {
      enhancement?: EnhancementType;
      filter?: FilterType;
      outputFormat?: OutputFormat;
      width?: number;
      height?: number;
      useCache?: boolean;
    } = {}
  ): Promise<ProcessedDicomResult> {
    const {
      enhancement,
      filter: filterType,
      outputFormat = 'PNG',
      width,
      height,
      useCache = true
    } = options;

    const cacheKey = `${patientId}/${filename}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (useCache && this.imageCache.has(cacheKey)) {
      const cachedImage = this.imageCache.get(cacheKey)!;
      const metadata = await this.getDicomMetadata(patientId, filename);
      
      return {
        success: true,
        metadata,
        image_data: cachedImage,
        thumbnail: this.thumbnailCache.get(`${patientId}/${filename}`) || ''
      };
    }

    try {
      const params = new URLSearchParams();
      if (enhancement) params.append('enhancement', enhancement);
      if (filterType) params.append('filter_type', filterType);
      if (outputFormat) params.append('output_format', outputFormat);
      if (width) params.append('width', width.toString());
      if (height) params.append('height', height.toString());
      if (useCache !== undefined) params.append('use_cache', useCache.toString());

      const response = await apiService.get(
        `/dicom/process/${patientId}/${filename}?${params.toString()}`
      );

      if (response.data.success) {
        const result = response.data as ProcessedDicomResult;
        
        // Cache the results
        if (useCache) {
          this.imageCache.set(cacheKey, result.image_data);
          this.metadataCache.set(`${patientId}/${filename}`, result.metadata);
          if (result.thumbnail) {
            this.thumbnailCache.set(`${patientId}/${filename}`, result.thumbnail);
          }
        }
        
        return result;
      } else {
        throw new Error(response.data.error || 'Failed to process DICOM file');
      }
    } catch (error) {
      console.error('Error processing DICOM file:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail for DICOM file
   */
  async getDicomThumbnail(
    patientId: string,
    filename: string,
    size: number = 256
  ): Promise<string> {
    const cacheKey = `${patientId}/${filename}_thumb_${size}`;
    
    // Check cache first
    if (this.thumbnailCache.has(cacheKey)) {
      return this.thumbnailCache.get(cacheKey)!;
    }

    try {
      const response = await apiService.get(
        `/dicom/thumbnail/${patientId}/${filename}?size=${size}`
      );

      if (response.data.success) {
        const thumbnail = response.data.thumbnail;
        this.thumbnailCache.set(cacheKey, thumbnail);
        return thumbnail;
      } else {
        throw new Error('Failed to get DICOM thumbnail');
      }
    } catch (error) {
      console.error('Error getting DICOM thumbnail:', error);
      throw error;
    }
  }

  /**
   * Convert DICOM to standard image format and download
   */
  async convertAndDownload(
    patientId: string,
    filename: string,
    format: OutputFormat = 'PNG',
    enhancement?: EnhancementType
  ): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (enhancement) params.append('enhancement', enhancement);

      const response = await fetch(
        `${this.baseUrl}/dicom/convert/${patientId}/${filename}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to convert DICOM file');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.split('.')[0]}.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting and downloading DICOM file:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const response = await apiService.get('/cache/stats');
      
      if (response.data.success) {
        return response.data.cache_stats;
      } else {
        throw new Error('Failed to get cache stats');
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  async clearCache(filePath?: string): Promise<void> {
    try {
      const params = filePath ? `?file_path=${encodeURIComponent(filePath)}` : '';
      const response = await apiService.delete(`/cache/clear${params}`);
      
      if (response.data.success) {
        // Clear local caches too
        if (filePath) {
          // Clear specific file from local cache
          const keys = Array.from(this.imageCache.keys()).filter(key => key.includes(filePath));
          keys.forEach(key => {
            this.imageCache.delete(key);
            this.metadataCache.delete(key.split('_')[0]);
            this.thumbnailCache.delete(key.split('_')[0]);
          });
        } else {
          // Clear all local caches
          this.imageCache.clear();
          this.metadataCache.clear();
          this.thumbnailCache.clear();
        }
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Preload DICOM image with optimizations
   */
  async preloadDicomImage(
    patientId: string,
    filename: string,
    options: {
      enhancement?: EnhancementType;
      thumbnailOnly?: boolean;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ): Promise<void> {
    const { enhancement, thumbnailOnly = false, priority = 'normal' } = options;

    try {
      if (thumbnailOnly) {
        await this.getDicomThumbnail(patientId, filename);
      } else {
        await this.processDicomFile(patientId, filename, {
          enhancement,
          outputFormat: 'PNG',
          useCache: true
        });
      }
    } catch (error) {
      console.warn(`Failed to preload DICOM image ${patientId}/${filename}:`, error);
      // Don't throw error for preloading failures
    }
  }

  /**
   * Batch preload multiple DICOM images
   */
  async batchPreloadImages(
    images: Array<{ patientId: string; filename: string; options?: any }>,
    concurrency: number = 3
  ): Promise<void> {
    const chunks = [];
    for (let i = 0; i < images.length; i += concurrency) {
      chunks.push(images.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(({ patientId, filename, options }) =>
          this.preloadDicomImage(patientId, filename, options)
        )
      );
    }
  }

  /**
   * Get optimized image URL for display
   */
  getOptimizedImageUrl(
    patientId: string,
    filename: string,
    options: {
      enhancement?: EnhancementType;
      filter?: FilterType;
      width?: number;
      height?: number;
    } = {}
  ): string {
    const params = new URLSearchParams();
    if (options.enhancement) params.append('enhancement', options.enhancement);
    if (options.filter) params.append('filter_type', options.filter);
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());

    return `${this.baseUrl}/dicom/process/${patientId}/${filename}?${params.toString()}`;
  }

  /**
   * Create data URL from base64 image data
   */
  createImageDataUrl(base64Data: string, format: OutputFormat = 'PNG'): string {
    const mimeType = format === 'JPEG' ? 'image/jpeg' : `image/${format.toLowerCase()}`;
    return `data:${mimeType};base64,${base64Data}`;
  }

  /**
   * Get local cache size
   */
  getLocalCacheSize(): {
    imageCache: number;
    metadataCache: number;
    thumbnailCache: number;
  } {
    return {
      imageCache: this.imageCache.size,
      metadataCache: this.metadataCache.size,
      thumbnailCache: this.thumbnailCache.size
    };
  }

  /**
   * Clear local cache
   */
  clearLocalCache(): void {
    this.imageCache.clear();
    this.metadataCache.clear();
    this.thumbnailCache.clear();
  }
}

// Export singleton instance
export const enhancedDicomService = new EnhancedDicomService();