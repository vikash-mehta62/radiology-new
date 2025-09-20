/**
 * Abnormality Detection System
 * AI-powered system for detecting medical abnormalities with confidence scoring and validation
 */

import { AIEnhancementModule, DetectionResult, AIAnalysisResult } from './aiEnhancementModule';
import { performanceMonitor } from './performanceMonitor';

export interface AbnormalityType {
  id: string;
  name: string;
  category: 'nodule' | 'mass' | 'calcification' | 'pneumothorax' | 'fracture' | 'lesion' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  icon: string;
  requiresUrgentAttention: boolean;
}

export interface DetectionConfiguration {
  modelId: string;
  confidenceThreshold: number;
  nmsThreshold: number; // Non-maximum suppression
  maxDetections: number;
  enabledAbnormalityTypes: string[];
  preprocessingOptions: {
    normalize: boolean;
    resize: boolean;
    targetSize: { width: number; height: number };
    windowLevel: { center: number; width: number };
    enhanceContrast: boolean;
  };
  postprocessingOptions: {
    filterOverlapping: boolean;
    groupNearbyDetections: boolean;
    minimumSize: number;
    maximumSize: number;
  };
}

export interface DetectionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  abnormalityType: AbnormalityType;
  metadata: {
    area: number;
    aspectRatio: number;
    centerPoint: { x: number; y: number };
    features: { [key: string]: number };
  };
}

export interface ValidationResult {
  detectionId: string;
  validated: boolean;
  validatedBy: string;
  validationTimestamp: string;
  confidence: number;
  notes: string;
  correctedBoundingBox?: DetectionBoundingBox;
  falsePositive: boolean;
}

export interface DetectionReport {
  imageId: string;
  timestamp: string;
  detections: DetectionBoundingBox[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  processingTime: number;
  modelVersion: string;
  configuration: DetectionConfiguration;
  validations: ValidationResult[];
  exportData: {
    dicomSR?: string; // DICOM Structured Report
    pdf?: Blob;
    csv?: string;
  };
}

export interface DetectionStatistics {
  totalDetections: number;
  detectionsByType: { [type: string]: number };
  averageConfidence: number;
  processingTime: number;
  falsePositiveRate: number;
  sensitivity: number;
  specificity: number;
}

class AbnormalityDetectionSystem {
  private aiModule: AIEnhancementModule;
  private abnormalityTypes: Map<string, AbnormalityType> = new Map();
  private detectionHistory: DetectionReport[] = [];
  private validationHistory: ValidationResult[] = [];

  // Predefined abnormality types
  private predefinedAbnormalityTypes: AbnormalityType[] = [
    {
      id: 'pulmonary-nodule',
      name: 'Pulmonary Nodule',
      category: 'nodule',
      description: 'Small round opacity in the lung parenchyma',
      severity: 'medium',
      color: '#ff6b6b',
      icon: 'circle',
      requiresUrgentAttention: false
    },
    {
      id: 'lung-mass',
      name: 'Lung Mass',
      category: 'mass',
      description: 'Large opacity greater than 3cm in diameter',
      severity: 'high',
      color: '#ff4757',
      icon: 'square',
      requiresUrgentAttention: true
    },
    {
      id: 'calcification',
      name: 'Calcification',
      category: 'calcification',
      description: 'Calcium deposits in tissue',
      severity: 'low',
      color: '#3742fa',
      icon: 'diamond',
      requiresUrgentAttention: false
    },
    {
      id: 'pneumothorax',
      name: 'Pneumothorax',
      category: 'pneumothorax',
      description: 'Collapsed lung with air in pleural space',
      severity: 'critical',
      color: '#ff3838',
      icon: 'triangle',
      requiresUrgentAttention: true
    },
    {
      id: 'rib-fracture',
      name: 'Rib Fracture',
      category: 'fracture',
      description: 'Break or crack in rib bone',
      severity: 'medium',
      color: '#ff9f43',
      icon: 'line',
      requiresUrgentAttention: false
    },
    {
      id: 'pleural-effusion',
      name: 'Pleural Effusion',
      category: 'lesion',
      description: 'Fluid accumulation in pleural space',
      severity: 'medium',
      color: '#00d2d3',
      icon: 'wave',
      requiresUrgentAttention: false
    }
  ];

  constructor(aiModule: AIEnhancementModule) {
    this.aiModule = aiModule;
    this.initialize();
  }

  /**
   * Initialize the detection system
   */
  private initialize(): void {
    // Load predefined abnormality types
    this.predefinedAbnormalityTypes.forEach(type => {
      this.abnormalityTypes.set(type.id, type);
    });

    console.log('🔍 [AbnormalityDetectionSystem] Initialized with', this.abnormalityTypes.size, 'abnormality types');
  }

  /**
   * Detect abnormalities in image
   */
  public async detectAbnormalities(
    imageData: ImageData | Float32Array,
    configuration: DetectionConfiguration,
    imageId: string = `image-${Date.now()}`
  ): Promise<DetectionReport> {
    const startTime = performance.now();

    try {
      console.log('🔍 [AbnormalityDetectionSystem] Starting detection for', imageId);

      // Preprocess image
      const preprocessedImage = await this.preprocessImage(imageData, configuration.preprocessingOptions);

      // Run AI analysis
      const analysisResult = await this.aiModule.analyzeImage(preprocessedImage, configuration.modelId);

      // Convert AI results to detection bounding boxes
      const detections = this.convertToDetectionBoundingBoxes(
        analysisResult.detections,
        configuration
      );

      // Apply post-processing
      const filteredDetections = this.postprocessDetections(detections, configuration.postprocessingOptions);

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(filteredDetections);

      // Generate recommendations
      const recommendations = this.generateRecommendations(filteredDetections, overallRisk);

      const processingTime = performance.now() - startTime;

      const report: DetectionReport = {
        imageId,
        timestamp: new Date().toISOString(),
        detections: filteredDetections,
        overallRisk,
        recommendations,
        processingTime,
        modelVersion: configuration.modelId,
        configuration,
        validations: [],
        exportData: {}
      };

      // Store in history
      this.detectionHistory.push(report);

      // Update performance monitoring
      // Performance monitoring would be recorded here if the method existed

      console.log('🔍 [AbnormalityDetectionSystem] Detection completed:', filteredDetections.length, 'abnormalities found');

      return report;

    } catch (error) {
      console.error('🔍 [AbnormalityDetectionSystem] Detection failed:', error);
      
      const processingTime = performance.now() - startTime;
      
      return {
        imageId,
        timestamp: new Date().toISOString(),
        detections: [],
        overallRisk: 'low',
        recommendations: ['Detection failed - manual review recommended'],
        processingTime,
        modelVersion: configuration.modelId,
        configuration,
        validations: [],
        exportData: {},
      };
    }
  }

  /**
   * Preprocess image for detection
   */
  private async preprocessImage(
    imageData: ImageData | Float32Array,
    options: DetectionConfiguration['preprocessingOptions']
  ): Promise<ImageData | Float32Array> {
    let processedImage = imageData;

    // Apply windowing for DICOM images
    if (options.windowLevel && imageData instanceof Float32Array) {
      processedImage = this.applyWindowing(imageData, options.windowLevel.center, options.windowLevel.width);
    }

    // Enhance contrast if requested
    if (options.enhanceContrast) {
      processedImage = await this.enhanceContrast(processedImage);
    }

    // Resize if needed
    if (options.resize && options.targetSize) {
      processedImage = this.resizeImage(processedImage, options.targetSize);
    }

    // Normalize
    if (options.normalize) {
      processedImage = this.normalizeImage(processedImage);
    }

    return processedImage;
  }

  /**
   * Apply windowing to DICOM data
   */
  private applyWindowing(data: Float32Array, center: number, width: number): Float32Array {
    const result = new Float32Array(data.length);
    const min = center - width / 2;
    const max = center + width / 2;
    const range = max - min;

    for (let i = 0; i < data.length; i++) {
      if (data[i] <= min) {
        result[i] = 0;
      } else if (data[i] >= max) {
        result[i] = 1;
      } else {
        result[i] = (data[i] - min) / range;
      }
    }

    return result;
  }

  /**
   * Enhance contrast
   */
  private async enhanceContrast(imageData: ImageData | Float32Array): Promise<ImageData | Float32Array> {
    // Simple gamma correction for contrast enhancement
    if (imageData instanceof ImageData) {
      const enhanced = new ImageData(imageData.width, imageData.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = Math.pow(imageData.data[i] / 255, 0.7) * 255;
        const g = Math.pow(imageData.data[i + 1] / 255, 0.7) * 255;
        const b = Math.pow(imageData.data[i + 2] / 255, 0.7) * 255;
        
        enhanced.data[i] = r;
        enhanced.data[i + 1] = g;
        enhanced.data[i + 2] = b;
        enhanced.data[i + 3] = imageData.data[i + 3];
      }
      return enhanced;
    } else {
      const enhanced = new Float32Array(imageData.length);
      for (let i = 0; i < imageData.length; i++) {
        enhanced[i] = Math.pow(imageData[i], 0.7);
      }
      return enhanced;
    }
  }

  /**
   * Resize image
   */
  private resizeImage(
    imageData: ImageData | Float32Array,
    targetSize: { width: number; height: number }
  ): ImageData | Float32Array {
    // Simplified resize - in practice, use proper interpolation
    if (imageData instanceof ImageData) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = targetSize.width;
      canvas.height = targetSize.height;
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      tempCtx.putImageData(imageData, 0, 0);
      
      ctx.drawImage(tempCanvas, 0, 0, targetSize.width, targetSize.height);
      return ctx.getImageData(0, 0, targetSize.width, targetSize.height);
    } else {
      // For Float32Array, return as-is (would need proper 2D resize implementation)
      return imageData;
    }
  }

  /**
   * Normalize image
   */
  private normalizeImage(imageData: ImageData | Float32Array): ImageData | Float32Array {
    if (imageData instanceof ImageData) {
      // Already normalized for ImageData
      return imageData;
    } else {
      const normalized = new Float32Array(imageData.length);
      let min = Infinity;
      let max = -Infinity;

      // Find min and max
      for (const value of imageData) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      // Normalize to [0, 1]
      const range = max - min;
      if (range > 0) {
        for (let i = 0; i < imageData.length; i++) {
          normalized[i] = (imageData[i] - min) / range;
        }
      } else {
        normalized.fill(0);
      }

      return normalized;
    }
  }

  /**
   * Convert AI detection results to bounding boxes
   */
  private convertToDetectionBoundingBoxes(
    detections: DetectionResult[],
    configuration: DetectionConfiguration
  ): DetectionBoundingBox[] {
    const boundingBoxes: DetectionBoundingBox[] = [];

    for (const detection of detections) {
      // Filter by confidence threshold
      if (detection.confidence < configuration.confidenceThreshold) {
        continue;
      }

      // Find matching abnormality type
      const abnormalityType = this.findAbnormalityTypeByClass(detection.class);
      if (!abnormalityType) {
        continue;
      }

      // Check if this abnormality type is enabled
      if (!configuration.enabledAbnormalityTypes.includes(abnormalityType.id)) {
        continue;
      }

      const boundingBox: DetectionBoundingBox = {
        x: detection.boundingBox.x,
        y: detection.boundingBox.y,
        width: detection.boundingBox.width,
        height: detection.boundingBox.height,
        confidence: detection.confidence,
        abnormalityType,
        metadata: {
          area: detection.boundingBox.width * detection.boundingBox.height,
          aspectRatio: detection.boundingBox.width / detection.boundingBox.height,
          centerPoint: {
            x: detection.boundingBox.x + detection.boundingBox.width / 2,
            y: detection.boundingBox.y + detection.boundingBox.height / 2
          },
          features: {
            // Additional features could be extracted here
            intensity: 0.5,
            texture: 0.3,
            shape: 0.7
          }
        }
      };

      boundingBoxes.push(boundingBox);
    }

    return boundingBoxes;
  }

  /**
   * Find abnormality type by class name
   */
  private findAbnormalityTypeByClass(className: string): AbnormalityType | null {
    for (const [id, type] of this.abnormalityTypes) {
      if (type.name.toLowerCase().includes(className.toLowerCase()) ||
          type.category === className.toLowerCase()) {
        return type;
      }
    }
    return null;
  }

  /**
   * Apply post-processing to detections
   */
  private postprocessDetections(
    detections: DetectionBoundingBox[],
    options: DetectionConfiguration['postprocessingOptions']
  ): DetectionBoundingBox[] {
    let processed = [...detections];

    // Filter by size
    processed = processed.filter(detection => {
      const area = detection.metadata.area;
      return area >= options.minimumSize && area <= options.maximumSize;
    });

    // Apply non-maximum suppression to remove overlapping detections
    if (options.filterOverlapping) {
      processed = this.applyNonMaximumSuppression(processed, 0.5);
    }

    // Group nearby detections
    if (options.groupNearbyDetections) {
      processed = this.groupNearbyDetections(processed, 50); // 50 pixel threshold
    }

    return processed;
  }

  /**
   * Apply Non-Maximum Suppression
   */
  private applyNonMaximumSuppression(
    detections: DetectionBoundingBox[],
    iouThreshold: number
  ): DetectionBoundingBox[] {
    // Sort by confidence (descending)
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    const kept: DetectionBoundingBox[] = [];

    for (const detection of sorted) {
      let shouldKeep = true;

      for (const keptDetection of kept) {
        const iou = this.calculateIoU(detection, keptDetection);
        if (iou > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }

      if (shouldKeep) {
        kept.push(detection);
      }
    }

    return kept;
  }

  /**
   * Calculate Intersection over Union (IoU)
   */
  private calculateIoU(box1: DetectionBoundingBox, box2: DetectionBoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 <= x1 || y2 <= y1) {
      return 0;
    }

    const intersection = (x2 - x1) * (y2 - y1);
    const union = box1.metadata.area + box2.metadata.area - intersection;

    return intersection / union;
  }

  /**
   * Group nearby detections
   */
  private groupNearbyDetections(
    detections: DetectionBoundingBox[],
    distanceThreshold: number
  ): DetectionBoundingBox[] {
    const groups: DetectionBoundingBox[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < detections.length; i++) {
      if (processed.has(i)) continue;

      const group = [detections[i]];
      processed.add(i);

      for (let j = i + 1; j < detections.length; j++) {
        if (processed.has(j)) continue;

        const distance = this.calculateDistance(
          detections[i].metadata.centerPoint,
          detections[j].metadata.centerPoint
        );

        if (distance < distanceThreshold) {
          group.push(detections[j]);
          processed.add(j);
        }
      }

      groups.push(group);
    }

    // For each group, keep the detection with highest confidence
    return groups.map(group => 
      group.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
    );
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(detections: DetectionBoundingBox[]): 'low' | 'medium' | 'high' | 'critical' {
    if (detections.length === 0) {
      return 'low';
    }

    // Check for critical abnormalities
    const hasCritical = detections.some(d => d.abnormalityType.severity === 'critical');
    if (hasCritical) {
      return 'critical';
    }

    // Check for high severity abnormalities
    const hasHigh = detections.some(d => d.abnormalityType.severity === 'high');
    if (hasHigh) {
      return 'high';
    }

    // Check for multiple medium severity abnormalities
    const mediumCount = detections.filter(d => d.abnormalityType.severity === 'medium').length;
    if (mediumCount >= 3) {
      return 'high';
    } else if (mediumCount >= 1) {
      return 'medium';
    }

    return 'low';
  }

  /**

   * Generate recommendations based on detections
   */
  private generateRecommendations(
    detections: DetectionBoundingBox[],
    overallRisk: 'low' | 'medium' | 'high' | 'critical'
  ): string[] {
    const recommendations: string[] = [];

    if (detections.length === 0) {
      recommendations.push('No abnormalities detected in current analysis');
      recommendations.push('Continue routine monitoring as per clinical protocol');
      return recommendations;
    }

    // Risk-based recommendations
    switch (overallRisk) {
      case 'critical':
        recommendations.push('URGENT: Critical abnormalities detected - immediate clinical attention required');
        recommendations.push('Contact radiologist and referring physician immediately');
        break;
      case 'high':
        recommendations.push('High-priority findings detected - expedited review recommended');
        recommendations.push('Schedule follow-up within 24-48 hours');
        break;
      case 'medium':
        recommendations.push('Moderate findings detected - clinical correlation recommended');
        recommendations.push('Schedule follow-up within 1-2 weeks');
        break;
      case 'low':
        recommendations.push('Low-priority findings detected - routine follow-up appropriate');
        break;
    }

    // Specific abnormality recommendations
    const abnormalityTypes = new Set(detections.map(d => d.abnormalityType.id));
    
    for (const typeId of abnormalityTypes) {
      const type = this.abnormalityTypes.get(typeId);
      if (!type) continue;

      const count = detections.filter(d => d.abnormalityType.id === typeId).length;
      
      switch (typeId) {
        case 'pulmonary-nodule':
          if (count === 1) {
            recommendations.push('Single pulmonary nodule detected - consider CT follow-up in 3-6 months');
          } else {
            recommendations.push(`Multiple pulmonary nodules detected (${count}) - consider malignancy workup`);
          }
          break;
        case 'lung-mass':
          recommendations.push('Lung mass detected - urgent oncology consultation recommended');
          recommendations.push('Consider tissue sampling and staging studies');
          break;
        case 'pneumothorax':
          recommendations.push('Pneumothorax detected - assess for tension pneumothorax');
          recommendations.push('Consider chest tube placement if clinically indicated');
          break;
        case 'rib-fracture':
          recommendations.push('Rib fracture detected - assess for underlying injury');
          recommendations.push('Pain management and respiratory support as needed');
          break;
        case 'pleural-effusion':
          recommendations.push('Pleural effusion detected - consider thoracentesis if symptomatic');
          recommendations.push('Investigate underlying cause');
          break;
      }
    }

    // General recommendations
    recommendations.push('Correlate findings with clinical history and physical examination');
    recommendations.push('Consider additional imaging modalities if clinically indicated');

    return recommendations;
  }

  /**
   * Validate detection result
   */
  public validateDetection(
    detectionId: string,
    imageId: string,
    validation: Omit<ValidationResult, 'detectionId'>
  ): boolean {
    try {
      const report = this.detectionHistory.find(r => r.imageId === imageId);
      if (!report) {
        console.error('🔍 [AbnormalityDetectionSystem] Report not found for validation');
        return false;
      }

      const validationResult: ValidationResult = {
        detectionId,
        ...validation
      };

      report.validations.push(validationResult);
      this.validationHistory.push(validationResult);

      console.log('🔍 [AbnormalityDetectionSystem] Detection validated:', detectionId);
      return true;
    } catch (error) {
      console.error('🔍 [AbnormalityDetectionSystem] Validation failed:', error);
      return false;
    }
  }

  /**
   * Export detection results to DICOM SR
   */
  public async exportToDICOMSR(report: DetectionReport): Promise<string> {
    // Simplified DICOM SR export - in practice, use proper DICOM library
    const sr = {
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.88.11', // Basic Text SR
      StudyInstanceUID: `1.2.840.10008.${Date.now()}`,
      SeriesInstanceUID: `1.2.840.10008.${Date.now()}.1`,
      SOPInstanceUID: `1.2.840.10008.${Date.now()}.1.1`,
      ContentDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      ContentTime: new Date().toISOString().split('T')[1].replace(/[:.]/g, '').substring(0, 6),
      DocumentTitle: 'AI Abnormality Detection Report',
      Content: {
        findings: report.detections.map(detection => ({
          type: detection.abnormalityType.name,
          location: {
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height
          },
          confidence: detection.confidence,
          severity: detection.abnormalityType.severity
        })),
        recommendations: report.recommendations,
        overallRisk: report.overallRisk
      }
    };

    return JSON.stringify(sr, null, 2);
  }

  /**
   * Export detection results to PDF
   */
  public async exportToPDF(report: DetectionReport): Promise<Blob> {
    // Simplified PDF export - in practice, use proper PDF library like jsPDF
    const pdfContent = `
AI Abnormality Detection Report
Generated: ${report.timestamp}
Image ID: ${report.imageId}

FINDINGS:
${report.detections.map(d => 
  `- ${d.abnormalityType.name}: Confidence ${(d.confidence * 100).toFixed(1)}%
    Location: (${d.x}, ${d.y}) Size: ${d.width}x${d.height}
    Severity: ${d.abnormalityType.severity.toUpperCase()}`
).join('\n')}

OVERALL RISK: ${report.overallRisk.toUpperCase()}

RECOMMENDATIONS:
${report.recommendations.map(r => `- ${r}`).join('\n')}

Processing Time: ${report.processingTime.toFixed(2)}ms
Model Version: ${report.modelVersion}
    `;

    return new Blob([pdfContent], { type: 'text/plain' });
  }

  /**
   * Export detection results to CSV
   */
  public exportToCSV(reports: DetectionReport[]): string {
    const headers = [
      'Image ID',
      'Timestamp',
      'Abnormality Type',
      'X',
      'Y',
      'Width',
      'Height',
      'Confidence',
      'Severity',
      'Overall Risk',
      'Processing Time'
    ];

    const rows = reports.flatMap(report =>
      report.detections.map(detection => [
        report.imageId,
        report.timestamp,
        detection.abnormalityType.name,
        detection.x.toString(),
        detection.y.toString(),
        detection.width.toString(),
        detection.height.toString(),
        detection.confidence.toFixed(3),
        detection.abnormalityType.severity,
        report.overallRisk,
        report.processingTime.toFixed(2)
      ])
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get detection statistics
   */
  public getDetectionStatistics(): DetectionStatistics {
    const allDetections = this.detectionHistory.flatMap(r => r.detections);
    const validations = this.validationHistory;

    const detectionsByType: { [type: string]: number } = {};
    let totalConfidence = 0;
    let totalProcessingTime = 0;

    for (const detection of allDetections) {
      const typeName = detection.abnormalityType.name;
      detectionsByType[typeName] = (detectionsByType[typeName] || 0) + 1;
      totalConfidence += detection.confidence;
    }

    for (const report of this.detectionHistory) {
      totalProcessingTime += report.processingTime;
    }

    const validatedDetections = validations.filter(v => v.validated);
    const falsePositives = validations.filter(v => v.falsePositive);

    return {
      totalDetections: allDetections.length,
      detectionsByType,
      averageConfidence: allDetections.length > 0 ? totalConfidence / allDetections.length : 0,
      processingTime: this.detectionHistory.length > 0 ? totalProcessingTime / this.detectionHistory.length : 0,
      falsePositiveRate: validations.length > 0 ? falsePositives.length / validations.length : 0,
      sensitivity: validatedDetections.length > 0 ? validatedDetections.filter(v => !v.falsePositive).length / validatedDetections.length : 0,
      specificity: validatedDetections.length > 0 ? validatedDetections.filter(v => v.falsePositive).length / validatedDetections.length : 0
    };
  }

  /**
   * Get detection history
   */
  public getDetectionHistory(): DetectionReport[] {
    return [...this.detectionHistory];
  }

  /**
   * Get validation history
   */
  public getValidationHistory(): ValidationResult[] {
    return [...this.validationHistory];
  }

  /**
   * Clear detection history
   */
  public clearHistory(): void {
    this.detectionHistory = [];
    this.validationHistory = [];
    console.log('🔍 [AbnormalityDetectionSystem] History cleared');
  }

  /**
   * Add custom abnormality type
   */
  public addAbnormalityType(abnormalityType: AbnormalityType): void {
    this.abnormalityTypes.set(abnormalityType.id, abnormalityType);
    console.log('🔍 [AbnormalityDetectionSystem] Added abnormality type:', abnormalityType.name);
  }

  /**
   * Remove abnormality type
   */
  public removeAbnormalityType(typeId: string): boolean {
    const removed = this.abnormalityTypes.delete(typeId);
    if (removed) {
      console.log('🔍 [AbnormalityDetectionSystem] Removed abnormality type:', typeId);
    }
    return removed;
  }

  /**
   * Get all abnormality types
   */
  public getAbnormalityTypes(): AbnormalityType[] {
    return Array.from(this.abnormalityTypes.values());
  }

  /**
   * Get abnormality type by ID
   */
  public getAbnormalityType(typeId: string): AbnormalityType | null {
    return this.abnormalityTypes.get(typeId) || null;
  }

  /**
   * Create default detection configuration
   */
  public createDefaultConfiguration(): DetectionConfiguration {
    return {
      modelId: 'abnormality-detection',
      confidenceThreshold: 0.5,
      nmsThreshold: 0.5,
      maxDetections: 50,
      enabledAbnormalityTypes: Array.from(this.abnormalityTypes.keys()),
      preprocessingOptions: {
        normalize: true,
        resize: true,
        targetSize: { width: 224, height: 224 },
        windowLevel: { center: 40, width: 400 },
        enhanceContrast: true
      },
      postprocessingOptions: {
        filterOverlapping: true,
        groupNearbyDetections: true,
        minimumSize: 100,
        maximumSize: 10000
      }
    };
  }

  /**
   * Batch process multiple images
   */
  public async batchDetect(
    images: { id: string; data: ImageData | Float32Array }[],
    configuration: DetectionConfiguration
  ): Promise<DetectionReport[]> {
    const reports: DetectionReport[] = [];

    for (let i = 0; i < images.length; i++) {
      const { id, data } = images[i];
      const report = await this.detectAbnormalities(data, configuration, id);
      reports.push(report);

      // Add small delay to prevent blocking
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return reports;
  }

  /**
   * Generate summary report for multiple detections
   */
  public generateSummaryReport(reports: DetectionReport[]): {
    totalImages: number;
    totalDetections: number;
    riskDistribution: { [risk: string]: number };
    mostCommonAbnormalities: { type: string; count: number }[];
    averageProcessingTime: number;
    recommendations: string[];
  } {
    const totalImages = reports.length;
    const totalDetections = reports.reduce((sum, r) => sum + r.detections.length, 0);
    
    const riskDistribution: { [risk: string]: number } = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const abnormalityCount: { [type: string]: number } = {};
    let totalProcessingTime = 0;

    for (const report of reports) {
      riskDistribution[report.overallRisk]++;
      totalProcessingTime += report.processingTime;

      for (const detection of report.detections) {
        const typeName = detection.abnormalityType.name;
        abnormalityCount[typeName] = (abnormalityCount[typeName] || 0) + 1;
      }
    }

    const mostCommonAbnormalities = Object.entries(abnormalityCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recommendations: string[] = [];
    
    if (riskDistribution.critical > 0) {
      recommendations.push(`${riskDistribution.critical} images with critical findings require immediate attention`);
    }
    
    if (riskDistribution.high > 0) {
      recommendations.push(`${riskDistribution.high} images with high-priority findings need expedited review`);
    }
    
    if (totalDetections === 0) {
      recommendations.push('No abnormalities detected across all images');
    } else {
      recommendations.push(`${totalDetections} total abnormalities detected across ${totalImages} images`);
    }

    return {
      totalImages,
      totalDetections,
      riskDistribution,
      mostCommonAbnormalities,
      averageProcessingTime: totalProcessingTime / totalImages,
      recommendations
    };
  }
}

export { AbnormalityDetectionSystem };