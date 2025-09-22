/**
 * Image Processing Web Worker
 * Handles DICOM image processing tasks in background thread
 */

// Worker message handler
self.onmessage = function(event) {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'processImage':
        processImage(data, id);
        break;
      case 'enhanceImage':
        enhanceImage(data, id);
        break;
      case 'applyFilter':
        applyFilter(data, id);
        break;
      default:
        self.postMessage({
          type: 'error',
          id: id,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: error.message
    });
  }
};

/**
 * Process DICOM image data
 */
function processImage(imageData, id) {
  try {
    // Basic image processing logic
    const { pixels, width, height, windowCenter, windowWidth } = imageData;
    
    if (!pixels || !width || !height) {
      throw new Error('Invalid image data provided');
    }
    
    // Apply windowing
    const processedPixels = applyWindowing(pixels, windowCenter, windowWidth);
    
    self.postMessage({
      type: 'imageProcessed',
      id: id,
      result: {
        pixels: processedPixels,
        width: width,
        height: height
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: error.message
    });
  }
}

/**
 * Enhance image with AI-like processing
 */
function enhanceImage(imageData, id) {
  try {
    const { pixels, width, height, enhancement } = imageData;
    
    // Apply enhancement based on type
    let enhancedPixels;
    switch (enhancement.type) {
      case 'sharpen':
        enhancedPixels = applySharpen(pixels, width, height, enhancement.strength);
        break;
      case 'denoise':
        enhancedPixels = applyDenoise(pixels, width, height, enhancement.strength);
        break;
      case 'contrast':
        enhancedPixels = applyContrast(pixels, enhancement.strength);
        break;
      default:
        enhancedPixels = pixels;
    }
    
    self.postMessage({
      type: 'imageEnhanced',
      id: id,
      result: {
        pixels: enhancedPixels,
        width: width,
        height: height
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: error.message
    });
  }
}

/**
 * Apply filter to image
 */
function applyFilter(imageData, id) {
  try {
    const { pixels, filter } = imageData;
    
    let filteredPixels;
    switch (filter.type) {
      case 'gaussian':
        filteredPixels = applyGaussianFilter(pixels, filter.radius);
        break;
      case 'median':
        filteredPixels = applyMedianFilter(pixels, filter.radius);
        break;
      default:
        filteredPixels = pixels;
    }
    
    self.postMessage({
      type: 'filterApplied',
      id: id,
      result: {
        pixels: filteredPixels
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: error.message
    });
  }
}

/**
 * Apply windowing to pixel data
 */
function applyWindowing(pixels, windowCenter, windowWidth) {
  if (!windowCenter || !windowWidth) {
    return pixels;
  }
  
  const windowMin = windowCenter - windowWidth / 2;
  const windowMax = windowCenter + windowWidth / 2;
  const windowRange = windowMax - windowMin;
  
  const processedPixels = new Uint8Array(pixels.length);
  
  for (let i = 0; i < pixels.length; i++) {
    let value = pixels[i];
    
    if (value <= windowMin) {
      processedPixels[i] = 0;
    } else if (value >= windowMax) {
      processedPixels[i] = 255;
    } else {
      processedPixels[i] = Math.round(((value - windowMin) / windowRange) * 255);
    }
  }
  
  return processedPixels;
}

/**
 * Apply sharpening filter
 */
function applySharpen(pixels, width, height, strength = 1.0) {
  const sharpened = new Float32Array(pixels.length);
  const kernel = [-1, -1, -1, -1, 8 + strength, -1, -1, -1, -1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          sum += pixels[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      sharpened[y * width + x] = Math.max(0, Math.min(255, sum));
    }
  }
  
  return new Uint8Array(sharpened);
}

/**
 * Apply denoising filter
 */
function applyDenoise(pixels, width, height, strength = 1.0) {
  const denoised = new Float32Array(pixels.length);
  const radius = Math.ceil(strength);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += pixels[ny * width + nx];
            count++;
          }
        }
      }
      
      denoised[y * width + x] = sum / count;
    }
  }
  
  return new Uint8Array(denoised);
}

/**
 * Apply contrast adjustment
 */
function applyContrast(pixels, strength = 1.0) {
  const adjusted = new Uint8Array(pixels.length);
  const factor = (259 * (strength * 255 + 255)) / (255 * (259 - strength * 255));
  
  for (let i = 0; i < pixels.length; i++) {
    adjusted[i] = Math.max(0, Math.min(255, factor * (pixels[i] - 128) + 128));
  }
  
  return adjusted;
}

/**
 * Apply Gaussian filter
 */
function applyGaussianFilter(pixels, radius = 1) {
  // Simple box blur approximation for Gaussian
  const blurred = new Float32Array(pixels.length);
  const size = radius * 2 + 1;
  
  for (let i = 0; i < pixels.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = -radius; j <= radius; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < pixels.length) {
        sum += pixels[idx];
        count++;
      }
    }
    
    blurred[i] = sum / count;
  }
  
  return new Uint8Array(blurred);
}

/**
 * Apply median filter
 */
function applyMedianFilter(pixels, radius = 1) {
  const filtered = new Uint8Array(pixels.length);
  const size = radius * 2 + 1;
  
  for (let i = 0; i < pixels.length; i++) {
    const values = [];
    
    for (let j = -radius; j <= radius; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < pixels.length) {
        values.push(pixels[idx]);
      }
    }
    
    values.sort((a, b) => a - b);
    filtered[i] = values[Math.floor(values.length / 2)];
  }
  
  return filtered;
}

// Worker ready message
self.postMessage({
  type: 'ready',
  message: 'Image processor worker initialized'
});