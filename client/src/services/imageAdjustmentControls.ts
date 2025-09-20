/**
 * Real-Time Image Adjustment Controls
 * Provides brightness, contrast, windowing controls with live preview and histogram analysis
 */

import { performanceMonitor } from './performanceMonitor';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  gamma: number;
  windowCenter: number;
  windowWidth: number;
  invert: boolean;
  colormap: string;
  saturation: number;
  hue: number;
  exposure: number;
}

export interface WindowingPreset {
  name: string;
  windowCenter: number;
  windowWidth: number;
  description: string;
  anatomicalRegion: string;
}

export interface HistogramData {
  bins: number[];
  values: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  entropy: number;
  percentiles: { [key: number]: number };
}

export interface AdjustmentLimits {
  brightness: { min: number; max: number };
  contrast: { min: number; max: number };
  gamma: { min: number; max: number };
  windowCenter: { min: number; max: number };
  windowWidth: { min: number; max: number };
  saturation: { min: number; max: number };
  hue: { min: number; max: number };
  exposure: { min: number; max: number };
}

export interface AdjustmentEvent {
  type: 'adjustment_start' | 'adjustment_update' | 'adjustment_end' | 'preset_applied' | 'reset';
  adjustments: ImageAdjustments;
  changedProperty?: keyof ImageAdjustments;
  preset?: WindowingPreset;
  timestamp: number;
}

type AdjustmentCallback = (event: AdjustmentEvent) => void;

class ImageAdjustmentControls {
  private adjustments: ImageAdjustments;
  private limits: AdjustmentLimits;
  private callbacks: AdjustmentCallback[] = [];
  private histogramData: HistogramData | null = null;
  
  // Windowing presets for different anatomical regions
  private windowingPresets: WindowingPreset[] = [
    { name: 'Soft Tissue', windowCenter: 40, windowWidth: 400, description: 'General soft tissue visualization', anatomicalRegion: 'general' },
    { name: 'Lung', windowCenter: -600, windowWidth: 1600, description: 'Lung parenchyma and airways', anatomicalRegion: 'chest' },
    { name: 'Bone', windowCenter: 300, windowWidth: 1500, description: 'Bone and calcifications', anatomicalRegion: 'skeletal' },
    { name: 'Brain', windowCenter: 40, windowWidth: 80, description: 'Brain tissue differentiation', anatomicalRegion: 'neurological' },
    { name: 'Liver', windowCenter: 60, windowWidth: 160, description: 'Liver parenchyma', anatomicalRegion: 'abdominal' },
    { name: 'Mediastinum', windowCenter: 50, windowWidth: 350, description: 'Mediastinal structures', anatomicalRegion: 'chest' },
    { name: 'Abdomen', windowCenter: 60, windowWidth: 400, description: 'Abdominal organs', anatomicalRegion: 'abdominal' },
    { name: 'Angio', windowCenter: 300, windowWidth: 600, description: 'Vascular structures', anatomicalRegion: 'vascular' },
    { name: 'Spine', windowCenter: 50, windowWidth: 250, description: 'Spinal structures', anatomicalRegion: 'skeletal' },
    { name: 'Pelvis', windowCenter: 40, windowWidth: 400, description: 'Pelvic structures', anatomicalRegion: 'abdominal' }
  ];

  // Performance tracking
  private adjustmentCount: number = 0;
  private lastAdjustmentTime: number = 0;

  constructor(
    initialAdjustments: Partial<ImageAdjustments> = {},
    limits: Partial<AdjustmentLimits> = {}
  ) {
    this.adjustments = {
      brightness: 0,
      contrast: 1,
      gamma: 1,
      windowCenter: 0.5,
      windowWidth: 1.0,
      invert: false,
      colormap: 'grayscale',
      saturation: 1,
      hue: 0,
      exposure: 0,
      ...initialAdjustments
    };

    this.limits = {
      brightness: { min: -1, max: 1 },
      contrast: { min: 0.1, max: 5 },
      gamma: { min: 0.1, max: 3 },
      windowCenter: { min: -1000, max: 3000 },
      windowWidth: { min: 1, max: 4000 },
      saturation: { min: 0, max: 2 },
      hue: { min: -180, max: 180 },
      exposure: { min: -2, max: 2 },
      ...limits
    };

    console.log('🎨 [ImageAdjustmentControls] Initialized');
  }

  /**
   * Get current adjustments
   */
  public getAdjustments(): ImageAdjustments {
    return { ...this.adjustments };
  }

  /**
   * Set brightness (-1 to 1)
   */
  public setBrightness(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.brightness);
    this.adjustments.brightness = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'brightness');
    }
  }

  /**
   * Set contrast (0.1 to 5)
   */
  public setContrast(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.contrast);
    this.adjustments.contrast = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'contrast');
    }
  }

  /**
   * Set gamma (0.1 to 3)
   */
  public setGamma(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.gamma);
    this.adjustments.gamma = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'gamma');
    }
  }

  /**
   * Set window center for medical imaging
   */
  public setWindowCenter(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.windowCenter);
    this.adjustments.windowCenter = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'windowCenter');
    }
  }

  /**
   * Set window width for medical imaging
   */
  public setWindowWidth(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.windowWidth);
    this.adjustments.windowWidth = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'windowWidth');
    }
  }

  /**
   * Set windowing (center and width together)
   */
  public setWindowing(center: number, width: number, emitEvent: boolean = true): void {
    this.setWindowCenter(center, false);
    this.setWindowWidth(width, false);
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update');
    }
  }

  /**
   * Set saturation (0 to 2)
   */
  public setSaturation(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.saturation);
    this.adjustments.saturation = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'saturation');
    }
  }

  /**
   * Set hue (-180 to 180 degrees)
   */
  public setHue(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.hue);
    this.adjustments.hue = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'hue');
    }
  }

  /**
   * Set exposure (-2 to 2 stops)
   */
  public setExposure(value: number, emitEvent: boolean = true): void {
    const clampedValue = this.clampValue(value, this.limits.exposure);
    this.adjustments.exposure = clampedValue;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'exposure');
    }
  }

  /**
   * Toggle invert
   */
  public toggleInvert(emitEvent: boolean = true): void {
    this.adjustments.invert = !this.adjustments.invert;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'invert');
    }
  }

  /**
   * Set colormap
   */
  public setColormap(colormap: string, emitEvent: boolean = true): void {
    this.adjustments.colormap = colormap;
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update', 'colormap');
    }
  }

  /**
   * Apply windowing preset
   */
  public applyWindowingPreset(presetName: string, emitEvent: boolean = true): boolean {
    const preset = this.windowingPresets.find(p => p.name === presetName);
    if (!preset) {
      console.warn(`🎨 [ImageAdjustmentControls] Preset '${presetName}' not found`);
      return false;
    }

    this.setWindowing(preset.windowCenter, preset.windowWidth, false);
    
    if (emitEvent) {
      this.emitAdjustmentEvent('preset_applied', undefined, preset);
    }

    console.log(`🎨 [ImageAdjustmentControls] Applied preset: ${preset.name}`);
    return true;
  }

  /**
   * Get available windowing presets
   */
  public getWindowingPresets(): WindowingPreset[] {
    return [...this.windowingPresets];
  }

  /**
   * Get presets by anatomical region
   */
  public getPresetsByRegion(region: string): WindowingPreset[] {
    return this.windowingPresets.filter(preset => preset.anatomicalRegion === region);
  }

  /**
   * Add custom windowing preset
   */
  public addWindowingPreset(preset: WindowingPreset): void {
    // Check if preset with same name exists
    const existingIndex = this.windowingPresets.findIndex(p => p.name === preset.name);
    if (existingIndex >= 0) {
      this.windowingPresets[existingIndex] = preset;
    } else {
      this.windowingPresets.push(preset);
    }
    
    console.log(`🎨 [ImageAdjustmentControls] Added preset: ${preset.name}`);
  }

  /**
   * Reset all adjustments to default
   */
  public reset(emitEvent: boolean = true): void {
    this.adjustments = {
      brightness: 0,
      contrast: 1,
      gamma: 1,
      windowCenter: 0.5,
      windowWidth: 1.0,
      invert: false,
      colormap: 'grayscale',
      saturation: 1,
      hue: 0,
      exposure: 0
    };
    
    if (emitEvent) {
      this.emitAdjustmentEvent('reset');
    }
  }

  /**
   * Set multiple adjustments at once
   */
  public setAdjustments(adjustments: Partial<ImageAdjustments>, emitEvent: boolean = true): void {
    Object.keys(adjustments).forEach(key => {
      const property = key as keyof ImageAdjustments;
      const value = adjustments[property];
      
      if (value !== undefined) {
        switch (property) {
          case 'brightness':
            this.setBrightness(value as number, false);
            break;
          case 'contrast':
            this.setContrast(value as number, false);
            break;
          case 'gamma':
            this.setGamma(value as number, false);
            break;
          case 'windowCenter':
            this.setWindowCenter(value as number, false);
            break;
          case 'windowWidth':
            this.setWindowWidth(value as number, false);
            break;
          case 'saturation':
            this.setSaturation(value as number, false);
            break;
          case 'hue':
            this.setHue(value as number, false);
            break;
          case 'exposure':
            this.setExposure(value as number, false);
            break;
          case 'invert':
            this.adjustments.invert = value as boolean;
            break;
          case 'colormap':
            this.adjustments.colormap = value as string;
            break;
        }
      }
    });
    
    if (emitEvent) {
      this.emitAdjustmentEvent('adjustment_update');
    }
  }

  /**
   * Calculate histogram from image data
   */
  public calculateHistogram(imageData: Uint8Array | Uint16Array | Float32Array, bins: number = 256): HistogramData {
    const startTime = performance.now();
    
    // Initialize histogram
    const histogram = new Array(bins).fill(0);
    const dataLength = imageData.length;
    
    // Find min and max values
    let min = imageData[0];
    let max = imageData[0];
    let sum = 0;
    
    for (let i = 0; i < dataLength; i++) {
      const value = imageData[i];
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }
    
    const range = max - min;
    const binSize = range / bins;
    const mean = sum / dataLength;
    
    // Calculate histogram and variance for standard deviation
    let sumSquaredDiff = 0;
    const sortedValues: number[] = [];
    
    for (let i = 0; i < dataLength; i++) {
      const value = imageData[i];
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex]++;
      
      const diff = value - mean;
      sumSquaredDiff += diff * diff;
      
      // Collect values for median calculation (sample for performance)
      if (i % Math.max(1, Math.floor(dataLength / 10000)) === 0) {
        sortedValues.push(value);
      }
    }
    
    // Calculate statistics
    sortedValues.sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const standardDeviation = Math.sqrt(sumSquaredDiff / dataLength);
    
    // Calculate entropy
    let entropy = 0;
    for (let i = 0; i < bins; i++) {
      if (histogram[i] > 0) {
        const probability = histogram[i] / dataLength;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    // Calculate percentiles
    const percentiles: { [key: number]: number } = {};
    [1, 5, 10, 25, 50, 75, 90, 95, 99].forEach(percentile => {
      const index = Math.floor((percentile / 100) * (sortedValues.length - 1));
      percentiles[percentile] = sortedValues[index];
    });
    
    this.histogramData = {
      bins: Array.from({ length: bins }, (_, i) => min + (i * binSize)),
      values: histogram,
      min,
      max,
      mean,
      median,
      standardDeviation,
      entropy,
      percentiles
    };
    
    const calculationTime = performance.now() - startTime;
    console.log(`🎨 [ImageAdjustmentControls] Calculated histogram in ${calculationTime.toFixed(2)}ms`);
    
    return this.histogramData;
  }

  /**
   * Get current histogram data
   */
  public getHistogramData(): HistogramData | null {
    return this.histogramData ? { ...this.histogramData } : null;
  }

  /**
   * Auto-adjust levels based on histogram
   */
  public autoAdjustLevels(percentileLow: number = 1, percentileHigh: number = 99): void {
    if (!this.histogramData) {
      console.warn('🎨 [ImageAdjustmentControls] No histogram data available for auto-adjustment');
      return;
    }

    const lowValue = this.histogramData.percentiles[percentileLow];
    const highValue = this.histogramData.percentiles[percentileHigh];
    
    if (lowValue !== undefined && highValue !== undefined) {
      const range = highValue - lowValue;
      const center = (lowValue + highValue) / 2;
      
      this.setWindowing(center, range, true);
      console.log(`🎨 [ImageAdjustmentControls] Auto-adjusted levels: center=${center.toFixed(1)}, width=${range.toFixed(1)}`);
    }
  }

  /**
   * Get adjustment limits
   */
  public getLimits(): AdjustmentLimits {
    return { ...this.limits };
  }

  /**
   * Update adjustment limits
   */
  public updateLimits(newLimits: Partial<AdjustmentLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    
    // Re-clamp current values to new limits
    this.adjustments.brightness = this.clampValue(this.adjustments.brightness, this.limits.brightness);
    this.adjustments.contrast = this.clampValue(this.adjustments.contrast, this.limits.contrast);
    this.adjustments.gamma = this.clampValue(this.adjustments.gamma, this.limits.gamma);
    this.adjustments.windowCenter = this.clampValue(this.adjustments.windowCenter, this.limits.windowCenter);
    this.adjustments.windowWidth = this.clampValue(this.adjustments.windowWidth, this.limits.windowWidth);
    this.adjustments.saturation = this.clampValue(this.adjustments.saturation, this.limits.saturation);
    this.adjustments.hue = this.clampValue(this.adjustments.hue, this.limits.hue);
    this.adjustments.exposure = this.clampValue(this.adjustments.exposure, this.limits.exposure);
  }

  /**
   * Add adjustment event listener
   */
  public onAdjustment(callback: AdjustmentCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove adjustment event listener
   */
  public removeAdjustmentListener(callback: AdjustmentCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Get available colormaps
   */
  public getAvailableColormaps(): string[] {
    return [
      'grayscale',
      'hot',
      'jet',
      'cool',
      'spring',
      'summer',
      'autumn',
      'winter',
      'bone',
      'copper',
      'pink',
      'lines',
      'hsv',
      'rainbow'
    ];
  }

  /**
   * Export current settings
   */
  public exportSettings(): string {
    const settings = {
      adjustments: this.adjustments,
      customPresets: this.windowingPresets.filter(p => 
        !['Soft Tissue', 'Lung', 'Bone', 'Brain', 'Liver', 'Mediastinum', 'Abdomen', 'Angio', 'Spine', 'Pelvis'].includes(p.name)
      )
    };
    
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings
   */
  public importSettings(settingsJson: string): boolean {
    try {
      const settings = JSON.parse(settingsJson);
      
      if (settings.adjustments) {
        this.setAdjustments(settings.adjustments, true);
      }
      
      if (settings.customPresets && Array.isArray(settings.customPresets)) {
        settings.customPresets.forEach((preset: WindowingPreset) => {
          this.addWindowingPreset(preset);
        });
      }
      
      console.log('🎨 [ImageAdjustmentControls] Settings imported successfully');
      return true;
    } catch (error) {
      console.error('🎨 [ImageAdjustmentControls] Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.callbacks = [];
    this.histogramData = null;
    console.log('🎨 [ImageAdjustmentControls] Destroyed');
  }

  // Private methods

  private clampValue(value: number, limits: { min: number; max: number }): number {
    return Math.max(limits.min, Math.min(limits.max, value));
  }

  private emitAdjustmentEvent(
    type: AdjustmentEvent['type'], 
    changedProperty?: keyof ImageAdjustments,
    preset?: WindowingPreset
  ): void {
    const event: AdjustmentEvent = {
      type,
      adjustments: { ...this.adjustments },
      changedProperty,
      preset,
      timestamp: performance.now()
    };

    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in adjustment callback:', error);
      }
    });

    // Track performance
    this.adjustmentCount++;
    this.lastAdjustmentTime = performance.now();
    
    // Update performance monitor
    performanceMonitor.recordRenderingMetrics({
      frameTime: performance.now() - this.lastAdjustmentTime,
      drawCalls: 1,
      textureMemory: 0,
      shaderCompileTime: 0,
      canvasResizes: 0,
      renderingErrors: []
    });
  }
}

export { ImageAdjustmentControls };