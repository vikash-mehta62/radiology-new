/**
 * Window/Level Diagnostics Service
 * Handles automatic preset application and troubleshooting for window/level issues
 * that commonly cause black screens in DICOM viewers
 */

export interface WindowLevelPreset {
  name: string;
  windowCenter: number;
  windowWidth: number;
  description: string;
  modalities: string[];
  bodyParts?: string[];
}

export interface WindowLevelDiagnostics {
  imageId: string;
  currentSettings: {
    windowCenter: number;
    windowWidth: number;
  };
  imageStats: {
    minPixelValue: number;
    maxPixelValue: number;
    meanPixelValue: number;
    standardDeviation: number;
  };
  recommendedPreset: WindowLevelPreset | null;
  issues: string[];
  autoApplied: boolean;
  timestamp: number;
}

export interface ImageMetadata {
  modality?: string;
  bodyPart?: string;
  studyDescription?: string;
  seriesDescription?: string;
  windowCenter?: number;
  windowWidth?: number;
  rescaleSlope?: number;
  rescaleIntercept?: number;
  photometricInterpretation?: string;
}

class WindowLevelDiagnosticsService {
  private presets: WindowLevelPreset[] = [
    // CT Presets
    {
      name: 'CT Soft Tissue',
      windowCenter: 40,
      windowWidth: 400,
      description: 'Standard soft tissue window for CT',
      modalities: ['CT'],
      bodyParts: ['CHEST', 'ABDOMEN', 'PELVIS']
    },
    {
      name: 'CT Lung',
      windowCenter: -600,
      windowWidth: 1600,
      description: 'Lung window for CT chest studies',
      modalities: ['CT'],
      bodyParts: ['CHEST', 'LUNG']
    },
    {
      name: 'CT Bone',
      windowCenter: 500,
      windowWidth: 2000,
      description: 'Bone window for CT studies',
      modalities: ['CT']
    },
    {
      name: 'CT Brain',
      windowCenter: 40,
      windowWidth: 80,
      description: 'Brain window for CT head studies',
      modalities: ['CT'],
      bodyParts: ['HEAD', 'BRAIN']
    },
    {
      name: 'CT Liver',
      windowCenter: 60,
      windowWidth: 160,
      description: 'Liver window for CT abdomen studies',
      modalities: ['CT'],
      bodyParts: ['ABDOMEN', 'LIVER']
    },
    
    // MR Presets
    {
      name: 'MR T1',
      windowCenter: 600,
      windowWidth: 1200,
      description: 'T1-weighted MR images',
      modalities: ['MR']
    },
    {
      name: 'MR T2',
      windowCenter: 1000,
      windowWidth: 2000,
      description: 'T2-weighted MR images',
      modalities: ['MR']
    },
    {
      name: 'MR FLAIR',
      windowCenter: 800,
      windowWidth: 1600,
      description: 'FLAIR MR images',
      modalities: ['MR']
    },
    
    // X-Ray Presets
    {
      name: 'X-Ray Chest',
      windowCenter: 2048,
      windowWidth: 4096,
      description: 'Chest X-ray window',
      modalities: ['CR', 'DX'],
      bodyParts: ['CHEST']
    },
    {
      name: 'X-Ray Bone',
      windowCenter: 2048,
      windowWidth: 2048,
      description: 'Bone X-ray window',
      modalities: ['CR', 'DX']
    },
    
    // Mammography Presets
    {
      name: 'Mammography',
      windowCenter: 2048,
      windowWidth: 4096,
      description: 'Standard mammography window',
      modalities: ['MG']
    },
    
    // Generic/Fallback Presets
    {
      name: 'Auto Full Range',
      windowCenter: 0, // Will be calculated
      windowWidth: 0, // Will be calculated
      description: 'Automatic full pixel range window',
      modalities: ['CT', 'MR', 'CR', 'DX', 'MG', 'US', 'XA']
    },
    {
      name: 'Generic High Contrast',
      windowCenter: 128,
      windowWidth: 256,
      description: 'Generic high contrast window',
      modalities: ['CT', 'MR', 'CR', 'DX', 'MG', 'US', 'XA']
    },
    {
      name: 'Generic Low Contrast',
      windowCenter: 512,
      windowWidth: 2048,
      description: 'Generic low contrast window',
      modalities: ['CT', 'MR', 'CR', 'DX', 'MG', 'US', 'XA']
    }
  ];

  private diagnosticsHistory: WindowLevelDiagnostics[] = [];
  private maxHistorySize = 100;

  /**
   * Analyze image and recommend appropriate window/level settings
   */
  async analyzeImage(
    imageId: string,
    pixelData: any,
    metadata: ImageMetadata,
    currentWindowCenter?: number,
    currentWindowWidth?: number
  ): Promise<WindowLevelDiagnostics> {
    console.log('🔍 [WindowLevelDiagnostics] Analyzing image:', imageId);

    const imageStats = this.calculateImageStatistics(pixelData, metadata);
    const currentSettings = {
      windowCenter: currentWindowCenter || metadata.windowCenter || 0,
      windowWidth: currentWindowWidth || metadata.windowWidth || 0
    };

    const issues = this.identifyWindowLevelIssues(currentSettings, imageStats, metadata);
    const recommendedPreset = this.recommendPreset(metadata, imageStats);

    const diagnostics: WindowLevelDiagnostics = {
      imageId,
      currentSettings,
      imageStats,
      recommendedPreset,
      issues,
      autoApplied: false,
      timestamp: Date.now()
    };

    // Add to history
    this.diagnosticsHistory.push(diagnostics);
    if (this.diagnosticsHistory.length > this.maxHistorySize) {
      this.diagnosticsHistory.shift();
    }

    console.log('📊 [WindowLevelDiagnostics] Analysis complete:', {
      issues: issues.length,
      recommendedPreset: recommendedPreset?.name,
      currentSettings
    });

    return diagnostics;
  }

  /**
   * Calculate comprehensive image statistics
   */
  private calculateImageStatistics(pixelData: any, metadata: ImageMetadata): WindowLevelDiagnostics['imageStats'] {
    if (!pixelData || !pixelData.length) {
      console.warn('⚠️ [WindowLevelDiagnostics] No pixel data available for statistics');
      return {
        minPixelValue: 0,
        maxPixelValue: 0,
        meanPixelValue: 0,
        standardDeviation: 0
      };
    }

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let sumSquares = 0;
    const length = pixelData.length;

    // Apply rescale slope and intercept if available
    const slope = metadata.rescaleSlope || 1;
    const intercept = metadata.rescaleIntercept || 0;

    for (let i = 0; i < length; i++) {
      let value = pixelData[i] * slope + intercept;
      
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
      sumSquares += value * value;
    }

    const mean = sum / length;
    const variance = (sumSquares / length) - (mean * mean);
    const standardDeviation = Math.sqrt(Math.max(0, variance));

    return {
      minPixelValue: min,
      maxPixelValue: max,
      meanPixelValue: mean,
      standardDeviation
    };
  }

  /**
   * Identify common window/level issues
   */
  private identifyWindowLevelIssues(
    currentSettings: { windowCenter: number; windowWidth: number },
    imageStats: WindowLevelDiagnostics['imageStats'],
    metadata: ImageMetadata
  ): string[] {
    const issues: string[] = [];

    // Check for zero or invalid window width
    if (currentSettings.windowWidth <= 0) {
      issues.push('Window width is zero or negative - image will appear black');
    }

    // Check for window center far outside pixel range
    const pixelRange = imageStats.maxPixelValue - imageStats.minPixelValue;
    const centerOutsideRange = currentSettings.windowCenter < imageStats.minPixelValue - pixelRange ||
                              currentSettings.windowCenter > imageStats.maxPixelValue + pixelRange;
    
    if (centerOutsideRange) {
      issues.push('Window center is far outside the pixel value range');
    }

    // Check for extremely narrow window
    if (currentSettings.windowWidth < pixelRange * 0.01) {
      issues.push('Window width is extremely narrow compared to pixel range');
    }

    // Check for extremely wide window
    if (currentSettings.windowWidth > pixelRange * 10) {
      issues.push('Window width is extremely wide - image may appear washed out');
    }

    // Check for inverted photometric interpretation issues
    if (metadata.photometricInterpretation === 'MONOCHROME1') {
      issues.push('MONOCHROME1 photometric interpretation - may need inverted display');
    }

    // Check for missing rescale parameters in CT
    if (metadata.modality === 'CT' && (!metadata.rescaleSlope || !metadata.rescaleIntercept)) {
      issues.push('Missing rescale slope/intercept for CT image - Hounsfield units may be incorrect');
    }

    // Check for default/placeholder values
    if (currentSettings.windowCenter === 0 && currentSettings.windowWidth === 0) {
      issues.push('Window/level settings are at default values (0/0) - likely not set properly');
    }

    return issues;
  }

  /**
   * Recommend appropriate preset based on metadata and image statistics
   */
  private recommendPreset(metadata: ImageMetadata, imageStats: WindowLevelDiagnostics['imageStats']): WindowLevelPreset | null {
    const modality = metadata.modality?.toUpperCase();
    const bodyPart = metadata.bodyPart?.toUpperCase();
    const studyDescription = metadata.studyDescription?.toUpperCase() || '';
    const seriesDescription = metadata.seriesDescription?.toUpperCase() || '';

    // First, try to find modality and body part specific presets
    let candidates = this.presets.filter(preset => 
      preset.modalities.includes(modality || '') &&
      (!preset.bodyParts || preset.bodyParts.some(part => 
        bodyPart?.includes(part) || 
        studyDescription.includes(part) || 
        seriesDescription.includes(part)
      ))
    );

    // If no specific match, try modality-only presets
    if (candidates.length === 0) {
      candidates = this.presets.filter(preset => 
        preset.modalities.includes(modality || '')
      );
    }

    // If still no match, use generic presets
    if (candidates.length === 0) {
      candidates = this.presets.filter(preset => 
        preset.name.includes('Generic') || preset.name.includes('Auto')
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    // Select the best candidate
    let bestPreset = candidates[0];

    // Special handling for "Auto Full Range" preset
    if (bestPreset.name === 'Auto Full Range') {
      const pixelRange = imageStats.maxPixelValue - imageStats.minPixelValue;
      bestPreset = {
        ...bestPreset,
        windowCenter: imageStats.minPixelValue + pixelRange / 2,
        windowWidth: pixelRange
      };
    }

    // For CT, prefer specific anatomical presets
    if (modality === 'CT') {
      if (bodyPart?.includes('CHEST') || studyDescription.includes('CHEST')) {
        const lungPreset = candidates.find(p => p.name.includes('Lung'));
        if (lungPreset) bestPreset = lungPreset;
      } else if (bodyPart?.includes('HEAD') || studyDescription.includes('HEAD') || studyDescription.includes('BRAIN')) {
        const brainPreset = candidates.find(p => p.name.includes('Brain'));
        if (brainPreset) bestPreset = brainPreset;
      } else if (bodyPart?.includes('ABDOMEN') || studyDescription.includes('ABDOMEN')) {
        const liverPreset = candidates.find(p => p.name.includes('Liver'));
        if (liverPreset) bestPreset = liverPreset;
      }
    }

    return bestPreset;
  }

  /**
   * Apply window/level preset to an image
   */
  async applyPreset(
    imageId: string,
    preset: WindowLevelPreset,
    element?: HTMLElement
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🎯 [WindowLevelDiagnostics] Applying preset "${preset.name}" to image:`, imageId);

      if (element && typeof (window as any).cornerstone !== 'undefined') {
        const cornerstone = (window as any).cornerstone;
        
        // Get current viewport
        const viewport = cornerstone.getViewport(element);
        
        // Apply new window/level settings
        viewport.voi = {
          windowCenter: preset.windowCenter,
          windowWidth: preset.windowWidth
        };
        
        // Update viewport
        cornerstone.setViewport(element, viewport);
        
        // Update diagnostics
        const diagnostics = this.diagnosticsHistory.find(d => d.imageId === imageId);
        if (diagnostics) {
          diagnostics.autoApplied = true;
          diagnostics.currentSettings = {
            windowCenter: preset.windowCenter,
            windowWidth: preset.windowWidth
          };
        }

        console.log(`✅ [WindowLevelDiagnostics] Successfully applied preset "${preset.name}"`);
        return { success: true };
      } else {
        console.warn('⚠️ [WindowLevelDiagnostics] Cornerstone not available or element not provided');
        return { success: false, error: 'Cornerstone not available or element not provided' };
      }
    } catch (error) {
      console.error('❌ [WindowLevelDiagnostics] Error applying preset:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Auto-apply recommended preset if current settings are problematic
   */
  async autoApplyRecommendedPreset(
    imageId: string,
    element?: HTMLElement
  ): Promise<{ applied: boolean; preset?: WindowLevelPreset; error?: string }> {
    const diagnostics = this.diagnosticsHistory.find(d => d.imageId === imageId);
    
    if (!diagnostics) {
      return { applied: false, error: 'No diagnostics found for image' };
    }

    // Only auto-apply if there are significant issues
    const criticalIssues = diagnostics.issues.filter(issue => 
      issue.includes('zero') || 
      issue.includes('black') || 
      issue.includes('default values') ||
      issue.includes('far outside')
    );

    if (criticalIssues.length === 0) {
      return { applied: false, error: 'No critical issues detected' };
    }

    if (!diagnostics.recommendedPreset) {
      return { applied: false, error: 'No recommended preset available' };
    }

    const result = await this.applyPreset(imageId, diagnostics.recommendedPreset, element);
    
    return {
      applied: result.success,
      preset: result.success ? diagnostics.recommendedPreset : undefined,
      error: result.error
    };
  }

  /**
   * Get available presets for a specific modality
   */
  getPresetsForModality(modality: string, bodyPart?: string): WindowLevelPreset[] {
    const modalityUpper = modality.toUpperCase();
    const bodyPartUpper = bodyPart?.toUpperCase();

    return this.presets.filter(preset => {
      const modalityMatch = preset.modalities.includes(modalityUpper);
      const bodyPartMatch = !preset.bodyParts || !bodyPartUpper || 
        preset.bodyParts.some(part => bodyPartUpper.includes(part));
      
      return modalityMatch && bodyPartMatch;
    });
  }

  /**
   * Add custom preset
   */
  addCustomPreset(preset: WindowLevelPreset): void {
    this.presets.push(preset);
    console.log(`➕ [WindowLevelDiagnostics] Added custom preset: ${preset.name}`);
  }

  /**
   * Get diagnostics history
   */
  getDiagnosticsHistory(imageId?: string): WindowLevelDiagnostics[] {
    if (imageId) {
      return this.diagnosticsHistory.filter(d => d.imageId === imageId);
    }
    return [...this.diagnosticsHistory];
  }

  /**
   * Clear diagnostics history
   */
  clearHistory(): void {
    this.diagnosticsHistory = [];
    console.log('🗑️ [WindowLevelDiagnostics] History cleared');
  }

  /**
   * Get summary of common issues
   */
  getIssueSummary(): { issue: string; count: number; percentage: number }[] {
    const issueMap = new Map<string, number>();
    const totalDiagnostics = this.diagnosticsHistory.length;

    this.diagnosticsHistory.forEach(diagnostics => {
      diagnostics.issues.forEach(issue => {
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      });
    });

    return Array.from(issueMap.entries())
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: totalDiagnostics > 0 ? (count / totalDiagnostics) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Test window/level settings with sample values
   */
  testWindowLevelSettings(
    windowCenter: number,
    windowWidth: number,
    imageStats: WindowLevelDiagnostics['imageStats']
  ): {
    visibility: 'good' | 'poor' | 'invisible';
    coverage: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Calculate visible pixel range
    const minVisible = windowCenter - windowWidth / 2;
    const maxVisible = windowCenter + windowWidth / 2;
    
    // Calculate coverage of actual pixel values
    const actualMin = imageStats.minPixelValue;
    const actualMax = imageStats.maxPixelValue;
    const actualRange = actualMax - actualMin;
    
    const visibleMin = Math.max(minVisible, actualMin);
    const visibleMax = Math.min(maxVisible, actualMax);
    const visibleRange = Math.max(0, visibleMax - visibleMin);
    
    const coverage = actualRange > 0 ? (visibleRange / actualRange) * 100 : 0;
    
    let visibility: 'good' | 'poor' | 'invisible' = 'good';
    
    if (coverage < 10) {
      visibility = 'invisible';
      recommendations.push('Window settings show less than 10% of pixel data');
    } else if (coverage < 50) {
      visibility = 'poor';
      recommendations.push('Window settings show less than 50% of pixel data');
    }
    
    if (windowWidth <= 0) {
      visibility = 'invisible';
      recommendations.push('Window width must be greater than 0');
    }
    
    if (windowCenter < actualMin - actualRange || windowCenter > actualMax + actualRange) {
      visibility = 'poor';
      recommendations.push('Window center is far from the actual pixel value range');
    }
    
    return {
      visibility,
      coverage,
      recommendations
    };
  }
}

export const windowLevelDiagnosticsService = new WindowLevelDiagnosticsService();
export default windowLevelDiagnosticsService;