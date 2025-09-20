/**
 * Image Enhancement Algorithms
 * Advanced image processing algorithms for medical imaging enhancement
 */

export interface EnhancementOptions {
  algorithm: 'clahe' | 'unsharp_mask' | 'bilateral_filter' | 'anisotropic_diffusion' | 'wiener_filter';
  parameters: {
    [key: string]: number;
  };
  preserveOriginal: boolean;
  iterations?: number;
}

export interface EnhancementResult {
  enhancedData: ImageData | Float32Array;
  originalData: ImageData | Float32Array;
  processingTime: number;
  algorithm: string;
  parameters: any;
  qualityMetrics: {
    snr: number;
    contrast: number;
    sharpness: number;
    entropy: number;
  };
}

export interface NoiseReductionOptions {
  method: 'gaussian' | 'median' | 'bilateral' | 'non_local_means' | 'total_variation';
  strength: number;
  preserveEdges: boolean;
  iterations: number;
}

export interface ContrastEnhancementOptions {
  method: 'histogram_equalization' | 'clahe' | 'gamma_correction' | 'sigmoid' | 'adaptive';
  clipLimit?: number;
  tileSize?: number;
  gamma?: number;
  alpha?: number;
  beta?: number;
}

class ImageEnhancementAlgorithms {
  /**
   * Contrast Limited Adaptive Histogram Equalization (CLAHE)
   */
  public static applyCLAHE(
    imageData: ImageData | Float32Array,
    clipLimit: number = 2.0,
    tileSize: number = 8
  ): ImageData | Float32Array {
    const startTime = performance.now();

    if (imageData instanceof ImageData) {
      return this.applyCLAHEToImageData(imageData, clipLimit, tileSize);
    } else {
      return this.applyCLAHEToFloatArray(imageData, clipLimit, tileSize);
    }
  }

  /**
   * Apply CLAHE to ImageData
   */
  private static applyCLAHEToImageData(
    imageData: ImageData,
    clipLimit: number,
    tileSize: number
  ): ImageData {
    const { width, height } = imageData;
    const result = new ImageData(width, height);
    
    // Convert to grayscale for processing
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
    }

    // Apply CLAHE to grayscale
    const enhanced = this.applyCLAHEToFloatArray(grayscale, clipLimit, tileSize);

    // Convert back to RGBA
    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(enhanced[i] * 255);
      result.data[i * 4] = value;     // R
      result.data[i * 4 + 1] = value; // G
      result.data[i * 4 + 2] = value; // B
      result.data[i * 4 + 3] = imageData.data[i * 4 + 3]; // A (preserve alpha)
    }

    return result;
  }

  /**
   * Apply CLAHE to Float32Array
   */
  private static applyCLAHEToFloatArray(
    data: Float32Array,
    clipLimit: number,
    tileSize: number
  ): Float32Array {
    const size = Math.sqrt(data.length);
    const result = new Float32Array(data.length);
    
    const tilesX = Math.ceil(size / tileSize);
    const tilesY = Math.ceil(size / tileSize);

    // Process each tile
    for (let tileY = 0; tileY < tilesY; tileY++) {
      for (let tileX = 0; tileX < tilesX; tileX++) {
        const startX = tileX * tileSize;
        const startY = tileY * tileSize;
        const endX = Math.min(startX + tileSize, size);
        const endY = Math.min(startY + tileSize, size);

        // Extract tile data
        const tileData: number[] = [];
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            tileData.push(data[y * size + x]);
          }
        }

        // Calculate histogram
        const histogram = this.calculateHistogram(tileData, 256);
        
        // Apply clipping
        const clippedHistogram = this.clipHistogram(histogram, clipLimit);
        
        // Calculate CDF
        const cdf = this.calculateCDF(clippedHistogram);
        
        // Apply equalization to tile
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const index = y * size + x;
            const value = data[index];
            const bin = Math.floor(value * 255);
            result[index] = cdf[bin];
          }
        }
      }
    }

    return result;
  }

  /**
   * Calculate histogram
   */
  private static calculateHistogram(data: number[], bins: number): number[] {
    const histogram = new Array(bins).fill(0);
    
    for (const value of data) {
      const bin = Math.floor(Math.max(0, Math.min(bins - 1, value * bins)));
      histogram[bin]++;
    }

    return histogram;
  }

  /**
   * Clip histogram
   */
  private static clipHistogram(histogram: number[], clipLimit: number): number[] {
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
    const clipThreshold = (clipLimit * totalPixels) / histogram.length;
    
    const clipped = [...histogram];
    let excess = 0;

    // Clip histogram
    for (let i = 0; i < clipped.length; i++) {
      if (clipped[i] > clipThreshold) {
        excess += clipped[i] - clipThreshold;
        clipped[i] = clipThreshold;
      }
    }

    // Redistribute excess
    const redistributeAmount = excess / clipped.length;
    for (let i = 0; i < clipped.length; i++) {
      clipped[i] += redistributeAmount;
    }

    return clipped;
  }

  /**
   * Calculate Cumulative Distribution Function
   */
  private static calculateCDF(histogram: number[]): number[] {
    const cdf = new Array(histogram.length);
    const total = histogram.reduce((sum, count) => sum + count, 0);
    
    let cumulative = 0;
    for (let i = 0; i < histogram.length; i++) {
      cumulative += histogram[i];
      cdf[i] = cumulative / total;
    }

    return cdf;
  }

  /**
   * Unsharp Masking for edge enhancement
   */
  public static applyUnsharpMask(
    imageData: ImageData | Float32Array,
    amount: number = 1.5,
    radius: number = 1.0,
    threshold: number = 0.0
  ): ImageData | Float32Array {
    if (imageData instanceof ImageData) {
      return this.applyUnsharpMaskToImageData(imageData, amount, radius, threshold);
    } else {
      return this.applyUnsharpMaskToFloatArray(imageData, amount, radius, threshold);
    }
  }

  /**
   * Apply unsharp mask to ImageData
   */
  private static applyUnsharpMaskToImageData(
    imageData: ImageData,
    amount: number,
    radius: number,
    threshold: number
  ): ImageData {
    const { width, height } = imageData;
    const result = new ImageData(width, height);
    
    // Convert to grayscale
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
    }

    // Apply unsharp mask
    const enhanced = this.applyUnsharpMaskToFloatArray(grayscale, amount, radius, threshold);

    // Convert back to RGBA
    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(Math.max(0, Math.min(1, enhanced[i])) * 255);
      result.data[i * 4] = value;
      result.data[i * 4 + 1] = value;
      result.data[i * 4 + 2] = value;
      result.data[i * 4 + 3] = imageData.data[i * 4 + 3];
    }

    return result;
  }

  /**
   * Apply unsharp mask to Float32Array
   */
  private static applyUnsharpMaskToFloatArray(
    data: Float32Array,
    amount: number,
    radius: number,
    threshold: number
  ): Float32Array {
    const size = Math.sqrt(data.length);
    
    // Create Gaussian blur
    const blurred = this.applyGaussianBlur(data, radius);
    
    // Calculate unsharp mask
    const result = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const difference = data[i] - blurred[i];
      if (Math.abs(difference) > threshold) {
        result[i] = data[i] + amount * difference;
      } else {
        result[i] = data[i];
      }
    }

    return result;
  }

  /**
   * Apply Gaussian blur
   */
  private static applyGaussianBlur(data: Float32Array, radius: number): Float32Array {
    const size = Math.sqrt(data.length);
    const result = new Float32Array(data.length);
    
    // Create Gaussian kernel
    const kernelSize = Math.ceil(radius * 3) * 2 + 1;
    const kernel = this.createGaussianKernel(kernelSize, radius);
    const halfKernel = Math.floor(kernelSize / 2);

    // Apply horizontal blur
    const temp = new Float32Array(data.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let k = 0; k < kernelSize; k++) {
          const sampleX = x + k - halfKernel;
          if (sampleX >= 0 && sampleX < size) {
            const weight = kernel[k];
            sum += data[y * size + sampleX] * weight;
            weightSum += weight;
          }
        }
        
        temp[y * size + x] = weightSum > 0 ? sum / weightSum : data[y * size + x];
      }
    }

    // Apply vertical blur
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let k = 0; k < kernelSize; k++) {
          const sampleY = y + k - halfKernel;
          if (sampleY >= 0 && sampleY < size) {
            const weight = kernel[k];
            sum += temp[sampleY * size + x] * weight;
            weightSum += weight;
          }
        }
        
        result[y * size + x] = weightSum > 0 ? sum / weightSum : temp[y * size + x];
      }
    }

    return result;
  }

  /**
   * Create Gaussian kernel
   */
  private static createGaussianKernel(size: number, sigma: number): number[] {
    const kernel = new Array(size);
    const center = Math.floor(size / 2);
    const twoSigmaSquared = 2 * sigma * sigma;
    
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / twoSigmaSquared);
      sum += kernel[i];
    }
    
    // Normalize kernel
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  }

  /**
   * Bilateral filter for noise reduction while preserving edges
   */
  public static applyBilateralFilter(
    imageData: ImageData | Float32Array,
    spatialSigma: number = 2.0,
    intensitySigma: number = 0.1,
    kernelSize: number = 5
  ): ImageData | Float32Array {
    if (imageData instanceof ImageData) {
      return this.applyBilateralFilterToImageData(imageData, spatialSigma, intensitySigma, kernelSize);
    } else {
      return this.applyBilateralFilterToFloatArray(imageData, spatialSigma, intensitySigma, kernelSize);
    }
  }

  /**
   * Apply bilateral filter to Float32Array
   */
  private static applyBilateralFilterToFloatArray(
    data: Float32Array,
    spatialSigma: number,
    intensitySigma: number,
    kernelSize: number
  ): Float32Array {
    const size = Math.sqrt(data.length);
    const result = new Float32Array(data.length);
    const halfKernel = Math.floor(kernelSize / 2);
    
    const twoSpatialSigmaSquared = 2 * spatialSigma * spatialSigma;
    const twoIntensitySigmaSquared = 2 * intensitySigma * intensitySigma;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const centerIndex = y * size + x;
        const centerValue = data[centerIndex];
        
        let weightedSum = 0;
        let weightSum = 0;

        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const sampleX = x + kx;
            const sampleY = y + ky;
            
            if (sampleX >= 0 && sampleX < size && sampleY >= 0 && sampleY < size) {
              const sampleIndex = sampleY * size + sampleX;
              const sampleValue = data[sampleIndex];
              
              // Spatial weight
              const spatialDistance = kx * kx + ky * ky;
              const spatialWeight = Math.exp(-spatialDistance / twoSpatialSigmaSquared);
              
              // Intensity weight
              const intensityDistance = (centerValue - sampleValue) * (centerValue - sampleValue);
              const intensityWeight = Math.exp(-intensityDistance / twoIntensitySigmaSquared);
              
              const weight = spatialWeight * intensityWeight;
              weightedSum += sampleValue * weight;
              weightSum += weight;
            }
          }
        }
        
        result[centerIndex] = weightSum > 0 ? weightedSum / weightSum : centerValue;
      }
    }

    return result;
  }

  /**
   * Apply bilateral filter to ImageData
   */
  private static applyBilateralFilterToImageData(
    imageData: ImageData,
    spatialSigma: number,
    intensitySigma: number,
    kernelSize: number
  ): ImageData {
    const { width, height } = imageData;
    const result = new ImageData(width, height);
    
    // Convert to grayscale
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
    }

    // Apply bilateral filter
    const filtered = this.applyBilateralFilterToFloatArray(grayscale, spatialSigma, intensitySigma, kernelSize);

    // Convert back to RGBA
    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(Math.max(0, Math.min(1, filtered[i])) * 255);
      result.data[i * 4] = value;
      result.data[i * 4 + 1] = value;
      result.data[i * 4 + 2] = value;
      result.data[i * 4 + 3] = imageData.data[i * 4 + 3];
    }

    return result;
  }

  /**
   * Anisotropic diffusion for edge-preserving smoothing
   */
  public static applyAnisotropicDiffusion(
    imageData: ImageData | Float32Array,
    iterations: number = 10,
    kappa: number = 30,
    lambda: number = 0.25
  ): ImageData | Float32Array {
    if (imageData instanceof ImageData) {
      return this.applyAnisotropicDiffusionToImageData(imageData, iterations, kappa, lambda);
    } else {
      return this.applyAnisotropicDiffusionToFloatArray(imageData, iterations, kappa, lambda);
    }
  }

  /**
   * Apply anisotropic diffusion to Float32Array
   */
  private static applyAnisotropicDiffusionToFloatArray(
    data: Float32Array,
    iterations: number,
    kappa: number,
    lambda: number
  ): Float32Array {
    const size = Math.sqrt(data.length);
    let current = new Float32Array(data);
    let next = new Float32Array(data.length);

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const index = y * size + x;
          const center = current[index];
          
          // Calculate gradients
          const north = current[(y - 1) * size + x] - center;
          const south = current[(y + 1) * size + x] - center;
          const east = current[y * size + (x + 1)] - center;
          const west = current[y * size + (x - 1)] - center;
          
          // Calculate diffusion coefficients
          const cNorth = this.diffusionCoefficient(north, kappa);
          const cSouth = this.diffusionCoefficient(south, kappa);
          const cEast = this.diffusionCoefficient(east, kappa);
          const cWest = this.diffusionCoefficient(west, kappa);
          
          // Update pixel
          next[index] = center + lambda * (
            cNorth * north + cSouth * south + cEast * east + cWest * west
          );
        }
      }
      
      // Swap arrays
      [current, next] = [next, current];
    }

    return current;
  }

  /**
   * Calculate diffusion coefficient
   */
  private static diffusionCoefficient(gradient: number, kappa: number): number {
    // Perona-Malik diffusion coefficient
    return Math.exp(-(gradient / kappa) * (gradient / kappa));
  }

  /**
   * Apply anisotropic diffusion to ImageData
   */
  private static applyAnisotropicDiffusionToImageData(
    imageData: ImageData,
    iterations: number,
    kappa: number,
    lambda: number
  ): ImageData {
    const { width, height } = imageData;
    const result = new ImageData(width, height);
    
    // Convert to grayscale
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
    }

    // Apply anisotropic diffusion
    const diffused = this.applyAnisotropicDiffusionToFloatArray(grayscale, iterations, kappa, lambda);

    // Convert back to RGBA
    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(Math.max(0, Math.min(1, diffused[i])) * 255);
      result.data[i * 4] = value;
      result.data[i * 4 + 1] = value;
      result.data[i * 4 + 2] = value;
      result.data[i * 4 + 3] = imageData.data[i * 4 + 3];
    }

    return result;
  }

  /**

   * Calculate image quality metrics
   */
  public static calculateQualityMetrics(
    original: ImageData | Float32Array,
    enhanced: ImageData | Float32Array
  ): {
    snr: number;
    contrast: number;
    sharpness: number;
    entropy: number;
  } {
    // Convert to Float32Array if needed
    const originalData = this.toFloatArray(original);
    const enhancedData = this.toFloatArray(enhanced);

    return {
      snr: this.calculateSNR(originalData, enhancedData),
      contrast: this.calculateContrast(enhancedData),
      sharpness: this.calculateSharpness(enhancedData),
      entropy: this.calculateEntropy(enhancedData)
    };
  }

  /**
   * Convert ImageData or Float32Array to Float32Array
   */
  private static toFloatArray(data: ImageData | Float32Array): Float32Array {
    if (data instanceof ImageData) {
      const { width, height } = data;
      const result = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = data.data[i * 4];
        const g = data.data[i * 4 + 1];
        const b = data.data[i * 4 + 2];
        result[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
      }
      return result;
    }
    return data;
  }

  /**
   * Calculate Signal-to-Noise Ratio
   */
  private static calculateSNR(original: Float32Array, enhanced: Float32Array): number {
    let signalPower = 0;
    let noisePower = 0;

    for (let i = 0; i < original.length; i++) {
      signalPower += enhanced[i] * enhanced[i];
      const noise = enhanced[i] - original[i];
      noisePower += noise * noise;
    }

    if (noisePower === 0) return Infinity;
    return 10 * Math.log10(signalPower / noisePower);
  }

  /**
   * Calculate contrast using RMS contrast
   */
  private static calculateContrast(data: Float32Array): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + (val - mean) * (val - mean), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate sharpness using gradient magnitude
   */
  private static calculateSharpness(data: Float32Array): number {
    const size = Math.sqrt(data.length);
    let totalGradient = 0;
    let count = 0;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const center = data[y * size + x];
        const dx = data[y * size + (x + 1)] - data[y * size + (x - 1)];
        const dy = data[(y + 1) * size + x] - data[(y - 1) * size + x];
        const gradient = Math.sqrt(dx * dx + dy * dy);
        totalGradient += gradient;
        count++;
      }
    }

    return count > 0 ? totalGradient / count : 0;
  }

  /**
   * Calculate entropy
   */
  private static calculateEntropy(data: Float32Array): number {
    const histogram = this.calculateHistogram(Array.from(data), 256);
    const total = data.length;
    let entropy = 0;

    for (const count of histogram) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Comprehensive enhancement pipeline
   */
  public static enhanceImage(
    imageData: ImageData | Float32Array,
    options: EnhancementOptions
  ): EnhancementResult {
    const startTime = performance.now();
    const originalData = options.preserveOriginal ? 
      (imageData instanceof ImageData ? 
        new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height) : 
        new Float32Array(imageData)) : 
      imageData;

    let enhancedData: ImageData | Float32Array;

    switch (options.algorithm) {
      case 'clahe':
        enhancedData = this.applyCLAHE(
          imageData,
          options.parameters.clipLimit || 2.0,
          options.parameters.tileSize || 8
        );
        break;

      case 'unsharp_mask':
        enhancedData = this.applyUnsharpMask(
          imageData,
          options.parameters.amount || 1.5,
          options.parameters.radius || 1.0,
          options.parameters.threshold || 0.0
        );
        break;

      case 'bilateral_filter':
        enhancedData = this.applyBilateralFilter(
          imageData,
          options.parameters.spatialSigma || 2.0,
          options.parameters.intensitySigma || 0.1,
          options.parameters.kernelSize || 5
        );
        break;

      case 'anisotropic_diffusion':
        enhancedData = this.applyAnisotropicDiffusion(
          imageData,
          options.iterations || 10,
          options.parameters.kappa || 30,
          options.parameters.lambda || 0.25
        );
        break;

      case 'wiener_filter':
        enhancedData = this.applyWienerFilter(
          imageData,
          options.parameters.noiseVariance || 0.01
        );
        break;

      default:
        enhancedData = imageData;
        break;
    }

    const processingTime = performance.now() - startTime;
    const qualityMetrics = this.calculateQualityMetrics(originalData, enhancedData);

    return {
      enhancedData,
      originalData,
      processingTime,
      algorithm: options.algorithm,
      parameters: options.parameters,
      qualityMetrics
    };
  }

  /**
   * Wiener filter for noise reduction
   */
  public static applyWienerFilter(
    imageData: ImageData | Float32Array,
    noiseVariance: number = 0.01
  ): ImageData | Float32Array {
    if (imageData instanceof ImageData) {
      return this.applyWienerFilterToImageData(imageData, noiseVariance);
    } else {
      return this.applyWienerFilterToFloatArray(imageData, noiseVariance);
    }
  }

  /**
   * Apply Wiener filter to Float32Array
   */
  private static applyWienerFilterToFloatArray(
    data: Float32Array,
    noiseVariance: number
  ): Float32Array {
    const size = Math.sqrt(data.length);
    
    // Simple implementation using local statistics
    const result = new Float32Array(data.length);
    const windowSize = 3;
    const halfWindow = Math.floor(windowSize / 2);

    for (let y = halfWindow; y < size - halfWindow; y++) {
      for (let x = halfWindow; x < size - halfWindow; x++) {
        const centerIndex = y * size + x;
        
        // Calculate local mean and variance
        let sum = 0;
        let sumSquared = 0;
        let count = 0;

        for (let wy = -halfWindow; wy <= halfWindow; wy++) {
          for (let wx = -halfWindow; wx <= halfWindow; wx++) {
            const sampleIndex = (y + wy) * size + (x + wx);
            const value = data[sampleIndex];
            sum += value;
            sumSquared += value * value;
            count++;
          }
        }

        const localMean = sum / count;
        const localVariance = (sumSquared / count) - (localMean * localMean);
        
        // Wiener filter formula
        const wienerGain = Math.max(0, localVariance - noiseVariance) / Math.max(localVariance, noiseVariance);
        result[centerIndex] = localMean + wienerGain * (data[centerIndex] - localMean);
      }
    }

    // Copy border pixels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (y < halfWindow || y >= size - halfWindow || x < halfWindow || x >= size - halfWindow) {
          result[y * size + x] = data[y * size + x];
        }
      }
    }

    return result;
  }

  /**
   * Apply Wiener filter to ImageData
   */
  private static applyWienerFilterToImageData(
    imageData: ImageData,
    noiseVariance: number
  ): ImageData {
    const { width, height } = imageData;
    const result = new ImageData(width, height);
    
    // Convert to grayscale
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
    }

    // Apply Wiener filter
    const filtered = this.applyWienerFilterToFloatArray(grayscale, noiseVariance);

    // Convert back to RGBA
    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(Math.max(0, Math.min(1, filtered[i])) * 255);
      result.data[i * 4] = value;
      result.data[i * 4 + 1] = value;
      result.data[i * 4 + 2] = value;
      result.data[i * 4 + 3] = imageData.data[i * 4 + 3];
    }

    return result;
  }

  /**
   * Adaptive histogram equalization
   */
  public static applyAdaptiveHistogramEqualization(
    imageData: ImageData | Float32Array,
    windowSize: number = 64
  ): ImageData | Float32Array {
    if (imageData instanceof ImageData) {
      return this.applyAdaptiveHistogramEqualizationToImageData(imageData, windowSize);
    } else {
      return this.applyAdaptiveHistogramEqualizationToFloatArray(imageData, windowSize);
    }
  }

  /**
   * Apply adaptive histogram equalization to Float32Array
   */
  private static applyAdaptiveHistogramEqualizationToFloatArray(
    data: Float32Array,
    windowSize: number
  ): Float32Array {
    const size = Math.sqrt(data.length);
    const result = new Float32Array(data.length);
    const halfWindow = Math.floor(windowSize / 2);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Define adaptive window
        const startY = Math.max(0, y - halfWindow);
        const endY = Math.min(size, y + halfWindow + 1);
        const startX = Math.max(0, x - halfWindow);
        const endX = Math.min(size, x + halfWindow + 1);

        // Extract window data
        const windowData: number[] = [];
        for (let wy = startY; wy < endY; wy++) {
          for (let wx = startX; wx < endX; wx++) {
            windowData.push(data[wy * size + wx]);
          }
        }

        // Calculate histogram and CDF for window
        const histogram = this.calculateHistogram(windowData, 256);
        const cdf = this.calculateCDF(histogram);

        // Apply equalization
        const value = data[y * size + x];
        const bin = Math.floor(value * 255);
        result[y * size + x] = cdf[bin];
      }
    }

    return result;
  }

  /**
   * Apply adaptive histogram equalization to ImageData
   */
  private static applyAdaptiveHistogramEqualizationToImageData(
    imageData: ImageData,
    windowSize: number
  ): ImageData {
    const { width, height } = imageData;
    const result = new ImageData(width, height);
    
    // Convert to grayscale
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
    }

    // Apply adaptive histogram equalization
    const equalized = this.applyAdaptiveHistogramEqualizationToFloatArray(grayscale, windowSize);

    // Convert back to RGBA
    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(Math.max(0, Math.min(1, equalized[i])) * 255);
      result.data[i * 4] = value;
      result.data[i * 4 + 1] = value;
      result.data[i * 4 + 2] = value;
      result.data[i * 4 + 3] = imageData.data[i * 4 + 3];
    }

    return result;
  }

  /**
   * Create before/after comparison
   */
  public static createBeforeAfterComparison(
    original: ImageData,
    enhanced: ImageData
  ): ImageData {
    const { width, height } = original;
    const comparison = new ImageData(width * 2, height);

    // Copy original to left half
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        const dstIndex = (y * (width * 2) + x) * 4;
        
        comparison.data[dstIndex] = original.data[srcIndex];
        comparison.data[dstIndex + 1] = original.data[srcIndex + 1];
        comparison.data[dstIndex + 2] = original.data[srcIndex + 2];
        comparison.data[dstIndex + 3] = original.data[srcIndex + 3];
      }
    }

    // Copy enhanced to right half
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        const dstIndex = (y * (width * 2) + (x + width)) * 4;
        
        comparison.data[dstIndex] = enhanced.data[srcIndex];
        comparison.data[dstIndex + 1] = enhanced.data[srcIndex + 1];
        comparison.data[dstIndex + 2] = enhanced.data[srcIndex + 2];
        comparison.data[dstIndex + 3] = enhanced.data[srcIndex + 3];
      }
    }

    // Add dividing line
    const lineX = width;
    for (let y = 0; y < height; y++) {
      const lineIndex = (y * (width * 2) + lineX) * 4;
      comparison.data[lineIndex] = 255;     // R
      comparison.data[lineIndex + 1] = 255; // G
      comparison.data[lineIndex + 2] = 255; // B
      comparison.data[lineIndex + 3] = 255; // A
    }

    return comparison;
  }

  /**
   * Batch enhance multiple images
   */
  public static async batchEnhance(
    images: (ImageData | Float32Array)[],
    options: EnhancementOptions
  ): Promise<EnhancementResult[]> {
    const results: EnhancementResult[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const result = this.enhanceImage(images[i], options);
      results.push(result);
      
      // Add small delay to prevent blocking
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }
}

export { ImageEnhancementAlgorithms };