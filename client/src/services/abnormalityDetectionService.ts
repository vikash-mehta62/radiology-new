/**
 * Abnormality Detection Service
 * Integrates AI-powered abnormality detection with DICOM viewers
 */

import { AIEnhancementModule, DetectionResult, AIAnalysisResult } from './aiEnhancementModule';
import { performanceMonitor } from './performanceMonitor';

export interface AbnormalityDetectionConfig {
  enableRealTimeDetection: boolean;
  confidenceThreshold: number;
  maxDetectionsPerImage: number;
  enableBatchProcessing: boolean;
  modelId: string;
  processingMode: 'gpu' | 'cpu' | 'auto';
}

export interface DetectionOverlay {
  id: string;
  imageId: string;
  detections: DetectionResult[];
  visible: boolean;
  style: {
    borderColor: string;
    borderWidth: number;
    labelColor: string;
    labelBackground: string;
    opacity: number;
  };
}

export interface DetectionSession {
  id: string;
  studyId: string;
  imageIds: string[];
  processedImages: number;
  totalImages: number;
  detections: Map<string, DetectionResult[]>;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Service for AI-powered abnormality detection in medical images
 */
export class AbnormalityDetectionService {
  private aiModule: AIEnhancementModule;
  private config: AbnormalityDetectionConfig;
  private detectionOverlays: Map<string, DetectionOverlay> = new Map();
  private activeSessions: Map<string, DetectionSession> = new Map();
  private detectionCallbacks: Map<string, (results: DetectionResult[]) => void> = new Map();

  constructor(config: Partial<AbnormalityDetectionConfig> = {}) {
    this.config = {
      enableRealTimeDetection: true,
      confidenceThreshold: 0.7,
      maxDetectionsPerImage: 10,
      enableBatchProcessing: true,
      modelId: 'abnormality-detection',
      processingMode: 'auto',
      ...config
    };

    this.aiModule = new AIEnhancementModule();
  }

  /**
   * Initialize the abnormality detection service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔍 [AbnormalityDetection] Initializing...');
      
      // AI module initializes itself in constructor
      
      // Load the abnormality detection model
      await this.aiModule.loadModel(this.config.modelId);
      
      console.log('🔍 [AbnormalityDetection] Initialized successfully');
    } catch (error) {
      console.error('🔍 [AbnormalityDetection] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Detect abnormalities in a single image
   */
  async detectAbnormalities(
    imageId: string,
    imageData: ImageData,
    onProgress?: (progress: number) => void
  ): Promise<DetectionResult[]> {
    const startTime = performance.now();

    try {
      if (onProgress) onProgress(0);

      // Preprocess image for AI model
      const preprocessedData = await this.preprocessImage(imageData);
      if (onProgress) onProgress(25);

      // Run AI inference
      const analysisResult = await this.aiModule.analyzeImage(
        preprocessedData,
        this.config.modelId
      );

      if (onProgress) onProgress(75);

      // Process detection results
      const detections = this.processDetectionResults(analysisResult, imageData);
      if (onProgress) onProgress(100);

      // Create detection overlay
      this.createDetectionOverlay(imageId, detections);

      // Record performance metrics
      const processingTime = performance.now() - startTime;
      // Performance monitoring would be recorded here if the method existed

      console.log(`🔍 [AbnormalityDetection] Found ${detections.length} potential abnormalities in ${processingTime.toFixed(2)}ms`);

      return detections;

    } catch (error) {
      console.error('🔍 [AbnormalityDetection] Detection failed:', error);
      throw error;
    }
  }

  /**
   * Process multiple images in batch
   */
  async detectAbnormalitiesBatch(
    studyId: string,
    imageData: Map<string, ImageData>,
    onProgress?: (session: DetectionSession) => void
  ): Promise<DetectionSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const imageIds = Array.from(imageData.keys());

    const session: DetectionSession = {
      id: sessionId,
      studyId,
      imageIds,
      processedImages: 0,
      totalImages: imageIds.length,
      detections: new Map(),
      startTime: performance.now(),
      status: 'processing'
    };

    this.activeSessions.set(sessionId, session);

    try {
      for (const [imageId, data] of imageData.entries()) {
        try {
          const detections = await this.detectAbnormalities(imageId, data);
          session.detections.set(imageId, detections);
          session.processedImages++;

          if (onProgress) {
            onProgress({ ...session });
          }

        } catch (error) {
          console.warn(`🔍 [AbnormalityDetection] Failed to process image ${imageId}:`, error);
          session.processedImages++;
        }
      }

      session.status = 'completed';
      session.endTime = performance.now();

      console.log(`🔍 [AbnormalityDetection] Batch processing completed for study ${studyId}`);
      console.log(`🔍 [AbnormalityDetection] Processed ${session.processedImages}/${session.totalImages} images`);
      console.log(`🔍 [AbnormalityDetection] Total processing time: ${((session.endTime - session.startTime) / 1000).toFixed(2)}s`);

      return session;

    } catch (error) {
      session.status = 'failed';
      session.endTime = performance.now();
      console.error('🔍 [AbnormalityDetection] Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Get detection overlay for an image
   */
  getDetectionOverlay(imageId: string): DetectionOverlay | null {
    return this.detectionOverlays.get(imageId) || null;
  }

  /**
   * Toggle detection overlay visibility
   */
  toggleOverlayVisibility(imageId: string, visible?: boolean): boolean {
    const overlay = this.detectionOverlays.get(imageId);
    if (overlay) {
      overlay.visible = visible !== undefined ? visible : !overlay.visible;
      return overlay.visible;
    }
    return false;
  }

  /**
   * Update detection overlay style
   */
  updateOverlayStyle(imageId: string, style: Partial<DetectionOverlay['style']>): void {
    const overlay = this.detectionOverlays.get(imageId);
    if (overlay) {
      overlay.style = { ...overlay.style, ...style };
    }
  }

  /**
   * Get all detections for a study
   */
  getStudyDetections(studyId: string): Map<string, DetectionResult[]> {
    const session = Array.from(this.activeSessions.values())
      .find(s => s.studyId === studyId);
    
    return session?.detections || new Map();
  }

  /**
   * Export detection results
   */
  exportDetectionResults(sessionId: string, format: 'json' | 'csv' | 'dicom-sr'): string {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    switch (format) {
      case 'json':
        return this.exportAsJSON(session);
      case 'csv':
        return this.exportAsCSV(session);
      case 'dicom-sr':
        return this.exportAsDICOMSR(session);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AbnormalityDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔍 [AbnormalityDetection] Configuration updated');
  }

  /**
   * Get detection statistics
   */
  getDetectionStatistics(): {
    totalSessions: number;
    totalImagesProcessed: number;
    totalDetections: number;
    averageDetectionsPerImage: number;
    averageProcessingTime: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const totalSessions = sessions.length;
    const totalImagesProcessed = sessions.reduce((sum, s) => sum + s.processedImages, 0);
    const totalDetections = sessions.reduce((sum, s) => {
      return sum + Array.from(s.detections.values()).reduce((detSum, dets) => detSum + dets.length, 0);
    }, 0);

    return {
      totalSessions,
      totalImagesProcessed,
      totalDetections,
      averageDetectionsPerImage: totalImagesProcessed > 0 ? totalDetections / totalImagesProcessed : 0,
      averageProcessingTime: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.endTime || Date.now()) - s.startTime, 0) / sessions.length 
        : 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.detectionOverlays.clear();
    this.activeSessions.clear();
    this.detectionCallbacks.clear();
    // AI module cleanup would be called here if the method existed
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.cleanup();
  }

  // Private methods

  private async preprocessImage(imageData: ImageData): Promise<Float32Array> {
    // Convert ImageData to Float32Array for AI processing
    const { width, height, data } = imageData;
    const processedData = new Float32Array(width * height);

    // Convert RGBA to grayscale and normalize
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      
      // Convert to grayscale using luminance formula
      const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Normalize to [0, 1]
      processedData[i] = grayscale / 255.0;
    }

    return processedData;
  }

  private processDetectionResults(
    analysisResult: AIAnalysisResult,
    originalImage: ImageData
  ): DetectionResult[] {
    const detections: DetectionResult[] = [];

    for (const detection of analysisResult.detections) {
      // Filter by confidence threshold
      if (detection.confidence < this.config.confidenceThreshold) {
        continue;
      }

      // Scale bounding box to original image dimensions
      const scaledDetection: DetectionResult = {
        ...detection,
        boundingBox: {
          x: detection.boundingBox.x * originalImage.width,
          y: detection.boundingBox.y * originalImage.height,
          width: detection.boundingBox.width * originalImage.width,
          height: detection.boundingBox.height * originalImage.height
        }
      };

      detections.push(scaledDetection);

      // Limit number of detections
      if (detections.length >= this.config.maxDetectionsPerImage) {
        break;
      }
    }

    // Sort by confidence (highest first)
    detections.sort((a, b) => b.confidence - a.confidence);

    return detections;
  }

  private createDetectionOverlay(imageId: string, detections: DetectionResult[]): void {
    const overlay: DetectionOverlay = {
      id: `overlay-${imageId}`,
      imageId,
      detections,
      visible: true,
      style: {
        borderColor: '#ff0000',
        borderWidth: 2,
        labelColor: '#ffffff',
        labelBackground: '#ff0000',
        opacity: 0.8
      }
    };

    this.detectionOverlays.set(imageId, overlay);
  }

  private exportAsJSON(session: DetectionSession): string {
    const exportData = {
      sessionId: session.id,
      studyId: session.studyId,
      processingTime: session.endTime ? session.endTime - session.startTime : 0,
      totalImages: session.totalImages,
      processedImages: session.processedImages,
      detections: Object.fromEntries(session.detections),
      statistics: this.getDetectionStatistics(),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  private exportAsCSV(session: DetectionSession): string {
    const headers = [
      'ImageID',
      'DetectionID',
      'Class',
      'Confidence',
      'Severity',
      'BoundingBox_X',
      'BoundingBox_Y',
      'BoundingBox_Width',
      'BoundingBox_Height',
      'Description'
    ];

    const rows = [headers.join(',')];

    for (const [imageId, detections] of session.detections) {
      detections.forEach((detection, index) => {
        const row = [
          imageId,
          `${imageId}_${index}`,
          detection.class,
          detection.confidence.toFixed(3),
          detection.severity,
          detection.boundingBox.x.toFixed(1),
          detection.boundingBox.y.toFixed(1),
          detection.boundingBox.width.toFixed(1),
          detection.boundingBox.height.toFixed(1),
          `"${detection.description}"`
        ];
        rows.push(row.join(','));
      });
    }

    return rows.join('\n');
  }

  private exportAsDICOMSR(session: DetectionSession): string {
    // Simplified DICOM Structured Report export
    // In a real implementation, this would create a proper DICOM SR file
    const srData = {
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.88.11', // Basic Text SR
      StudyInstanceUID: session.studyId,
      SeriesInstanceUID: `${session.studyId}.${session.id}`,
      SOPInstanceUID: `${session.studyId}.${session.id}.1`,
      ContentDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      ContentTime: new Date().toISOString().split('T')[1].replace(/[:.]/g, '').substr(0, 6),
      DocumentTitle: 'AI Abnormality Detection Report',
      Content: Array.from(session.detections.entries()).map(([imageId, detections]) => ({
        ImageReference: imageId,
        Findings: detections.map(d => ({
          Finding: d.class,
          Confidence: d.confidence,
          Severity: d.severity,
          Location: d.boundingBox,
          Description: d.description
        }))
      }))
    };

    return JSON.stringify(srData, null, 2);
  }
}

// Export singleton instance
export const abnormalityDetectionService = new AbnormalityDetectionService();

export default AbnormalityDetectionService;