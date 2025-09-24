/**
 * Image Processing Web Worker
 * Handles intensive image processing operations in background thread
 * Maintains UI responsiveness during heavy computations
 */

// Worker state
let isInitialized = false;
let processingQueue = [];
let isProcessing = false;

// Performance tracking
let stats = {
  tasksProcessed: 0,
  averageProcessingTime: 0,
  totalProcessingTime: 0,
  errors: 0
};

/**
 * Initialize the worker
 */
function initialize() {
  if (isInitialized) return;

  // console.log('🔧 [ImageProcessingWorker] Initializing...');
  isInitialized = true;

  // Start processing queue
  processQueue();
}

/**
 * Process the task queue
 */
async function processQueue() {
  if (isProcessing || processingQueue.length === 0) {
    setTimeout(processQueue, 100); // Check again in 100ms
    return;
  }

  isProcessing = true;

  while (processingQueue.length > 0) {
    const task = processingQueue.shift();
    const startTime = performance.now();

    try {
      const result = await processTask(task);
      const processingTime = performance.now() - startTime;

      // Update stats
      stats.tasksProcessed++;
      stats.totalProcessingTime += processingTime;
      stats.averageProcessingTime = stats.totalProcessingTime / stats.tasksProcessed;

      // Send result back to main thread
      self.postMessage({
        type: 'taskComplete',
        taskId: task.id,
        result: result,
        processingTime: processingTime
      });

    } catch (error) {
      stats.errors++;
      // console.error('🔧 [ImageProcessingWorker] Task failed:', error);

      self.postMessage({
        type: 'taskError',
        taskId: task.id,
        error: error.message
      });
    }
  }

  isProcessing = false;
  setTimeout(processQueue, 100);
}

/**
 * Process individual task
 */
async function processTask(task) {
  switch (task.type) {
    case 'windowingAdjustment':
      return processWindowing(task.data);

    case 'imageEnhancement':
      return processImageEnhancement(task.data);

    case 'histogramCalculation':
      return calculateHistogram(task.data);

    case 'imageCompression':
      return compressImage(task.data);

    case 'noiseReduction':
      return reduceNoise(task.data);

    case 'edgeDetection':
      return detectEdges(task.data);

    case 'volumeRendering':
      return processVolumeData(task.data);

    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

/**
 * Process windowing adjustment
 */
function processWindowing(data) {
  const { imageData, windowCenter, windowWidth, invert } = data;
  const pixels = new Uint8ClampedArray(imageData.data);

  const windowMin = windowCenter - windowWidth / 2;
  const windowMax = windowCenter + windowWidth / 2;

  for (let i = 0; i < pixels.length; i += 4) {
    // Convert to grayscale
    const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

    // Apply windowing
    let windowed = ((gray - windowMin) / (windowMax - windowMin)) * 255;
    windowed = Math.max(0, Math.min(255, windowed));

    // Apply inversion if needed
    if (invert) {
      windowed = 255 - windowed;
    }

    pixels[i] = windowed;     // R
    pixels[i + 1] = windowed; // G
    pixels[i + 2] = windowed; // B
    // Alpha channel remains unchanged
  }

  return {
    processedImageData: {
      data: pixels,
      width: imageData.width,
      height: imageData.height
    }
  };
}

/**
 * Process image enhancement
 */
function processImageEnhancement(data) {
  const { imageData, brightness, contrast, gamma } = data;
  const pixels = new Uint8ClampedArray(imageData.data);

  for (let i = 0; i < pixels.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      let value = pixels[i + channel];

      // Apply brightness
      value += brightness;

      // Apply contrast
      value = ((value - 128) * contrast) + 128;

      // Apply gamma correction
      value = Math.pow(value / 255, 1 / gamma) * 255;

      // Clamp to valid range
      pixels[i + channel] = Math.max(0, Math.min(255, value));
    }
  }

  return {
    processedImageData: {
      data: pixels,
      width: imageData.width,
      height: imageData.height
    }
  };
}

/**
 * Calculate image histogram
 */
function calculateHistogram(data) {
  const { imageData, bins = 256 } = data;
  const pixels = imageData.data;
  const histogram = new Array(bins).fill(0);

  for (let i = 0; i < pixels.length; i += 4) {
    // Convert to grayscale
    const gray = Math.round((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
    const binIndex = Math.floor((gray / 255) * (bins - 1));
    histogram[binIndex]++;
  }

  // Calculate statistics
  const totalPixels = pixels.length / 4;
  const mean = histogram.reduce((sum, count, index) => sum + (index * count), 0) / totalPixels;
  const max = Math.max(...histogram);
  const min = Math.min(...histogram);

  return {
    histogram,
    statistics: {
      mean,
      max,
      min,
      totalPixels
    }
  };
}

/**
 * Compress image data
 */
function compressImage(data) {
  const { imageData, quality = 0.8, format = 'jpeg' } = data;

  // Create canvas for compression
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');

  // Put image data on canvas
  ctx.putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);

  // Convert to blob with compression
  return canvas.convertToBlob({
    type: `image/${format}`,
    quality: quality
  }).then(blob => {
    return blob.arrayBuffer().then(buffer => ({
      compressedData: buffer,
      originalSize: imageData.data.length,
      compressedSize: buffer.byteLength,
      compressionRatio: buffer.byteLength / imageData.data.length
    }));
  });
}

/**
 * Reduce image noise using simple averaging filter
 */
function reduceNoise(data) {
  const { imageData, filterSize = 3 } = data;
  const pixels = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(pixels.length);

  const halfFilter = Math.floor(filterSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        let count = 0;

        // Apply filter
        for (let fy = -halfFilter; fy <= halfFilter; fy++) {
          for (let fx = -halfFilter; fx <= halfFilter; fx++) {
            const ny = y + fy;
            const nx = x + fx;

            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const neighborIndex = (ny * width + nx) * 4;
              sum += pixels[neighborIndex + channel];
              count++;
            }
          }
        }

        output[pixelIndex + channel] = sum / count;
      }

      // Copy alpha channel
      output[pixelIndex + 3] = pixels[pixelIndex + 3];
    }
  }

  return {
    processedImageData: {
      data: output,
      width: imageData.width,
      height: imageData.height
    }
  };
}

/**
 * Detect edges using Sobel operator
 */
function detectEdges(data) {
  const { imageData, threshold = 100 } = data;
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(pixels.length);

  // Sobel kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      // Apply Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
          const gray = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / 3;

          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const edgeValue = magnitude > threshold ? 255 : 0;

      const outputIndex = (y * width + x) * 4;
      output[outputIndex] = edgeValue;     // R
      output[outputIndex + 1] = edgeValue; // G
      output[outputIndex + 2] = edgeValue; // B
      output[outputIndex + 3] = 255;       // A
    }
  }

  return {
    processedImageData: {
      data: output,
      width: imageData.width,
      height: imageData.height
    }
  };
}

/**
 * Process volume data for 3D rendering
 */
function processVolumeData(data) {
  const { volumeData, transferFunction, renderingParams } = data;

  // This is a simplified volume processing
  // In a real implementation, this would handle complex 3D operations
  const processedVolume = {
    dimensions: volumeData.dimensions,
    spacing: volumeData.spacing,
    processedData: new Float32Array(volumeData.data.length)
  };

  // Apply transfer function
  for (let i = 0; i < volumeData.data.length; i++) {
    const value = volumeData.data[i];
    const normalizedValue = (value - volumeData.minValue) / (volumeData.maxValue - volumeData.minValue);

    // Apply transfer function (simplified)
    processedVolume.processedData[i] = normalizedValue * transferFunction.opacity;
  }

  return {
    processedVolume,
    renderingTime: performance.now()
  };
}

/**
 * Handle messages from main thread
 */
self.onmessage = function (event) {
  const { type, data } = event.data;

  switch (type) {
    case 'initialize':
      initialize();
      self.postMessage({ type: 'initialized' });
      break;

    case 'addTask':
      processingQueue.push(data);
      if (!isProcessing) {
        processQueue();
      }
      break;

    case 'getStats':
      self.postMessage({
        type: 'stats',
        stats: {
          ...stats,
          queueLength: processingQueue.length,
          isProcessing
        }
      });
      break;

    case 'clearQueue':
      processingQueue = [];
      self.postMessage({ type: 'queueCleared' });
      break;

    default:
    // console.warn('🔧 [ImageProcessingWorker] Unknown message type:', type);
  }
};

// Handle errors
self.onerror = function (error) {
  // console.error('🔧 [ImageProcessingWorker] Worker error:', error);
  self.postMessage({
    type: 'workerError',
    error: error.message
  });
};

// console.log('🔧 [ImageProcessingWorker] Worker script loaded');