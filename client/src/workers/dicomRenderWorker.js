/**
 * Web Worker for client-side DICOM rendering and processing
 * Handles raw pixel data processing and canvas rendering operations
 */

// Worker message types
const MESSAGE_TYPES = {
    RENDER_RAW_PIXELS: 'RENDER_RAW_PIXELS',
    APPLY_WINDOWING: 'APPLY_WINDOWING',
    PROCESS_PIXEL_DATA: 'PROCESS_PIXEL_DATA',
    READY: 'READY'
};

// Worker state
let isReady = false;

/**
 * Apply windowing (window/level) to pixel data
 * @param {Uint16Array} pixelData - Raw pixel data
 * @param {number} windowCenter - Window center value
 * @param {number} windowWidth - Window width value
 * @returns {Uint8ClampedArray} - Processed pixel data for canvas
 */
function applyWindowing(pixelData, windowCenter, windowWidth) {
    const windowMin = windowCenter - windowWidth / 2;
    const windowMax = windowCenter + windowWidth / 2;
    const windowRange = windowMax - windowMin;
    
    const processedData = new Uint8ClampedArray(pixelData.length * 4); // RGBA
    
    for (let i = 0; i < pixelData.length; i++) {
        let value = pixelData[i];
        
        // Apply windowing
        if (value <= windowMin) {
            value = 0;
        } else if (value >= windowMax) {
            value = 255;
        } else {
            value = Math.round(((value - windowMin) / windowRange) * 255);
        }
        
        // Set RGBA values (grayscale)
        const pixelIndex = i * 4;
        processedData[pixelIndex] = value;     // R
        processedData[pixelIndex + 1] = value; // G
        processedData[pixelIndex + 2] = value; // B
        processedData[pixelIndex + 3] = 255;   // A (fully opaque)
    }
    
    return processedData;
}

/**
 * Process raw pixel data for canvas rendering
 * @param {ArrayBuffer} rawData - Raw pixel data from server
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} pixelFormat - Pixel format (e.g., 'uint16')
 * @param {number} windowCenter - Window center for display
 * @param {number} windowWidth - Window width for display
 * @returns {ImageData} - Processed image data for canvas
 */
function processPixelData(rawData, width, height, pixelFormat, windowCenter, windowWidth) {
    let pixelArray;
    
    // Convert raw data based on pixel format
    switch (pixelFormat) {
        case 'uint16':
            pixelArray = new Uint16Array(rawData);
            break;
        case 'uint8':
            pixelArray = new Uint8Array(rawData);
            break;
        case 'int16':
            pixelArray = new Int16Array(rawData);
            break;
        default:
            throw new Error(`Unsupported pixel format: ${pixelFormat}`);
    }
    
    // Apply windowing if specified
    let processedData;
    if (windowCenter !== null && windowWidth !== null) {
        processedData = applyWindowing(pixelArray, windowCenter, windowWidth);
    } else {
        // Auto-scale to 0-255 range
        const min = Math.min(...pixelArray);
        const max = Math.max(...pixelArray);
        const range = max - min;
        
        processedData = new Uint8ClampedArray(pixelArray.length * 4);
        
        for (let i = 0; i < pixelArray.length; i++) {
            const value = range > 0 ? Math.round(((pixelArray[i] - min) / range) * 255) : 0;
            const pixelIndex = i * 4;
            processedData[pixelIndex] = value;     // R
            processedData[pixelIndex + 1] = value; // G
            processedData[pixelIndex + 2] = value; // B
            processedData[pixelIndex + 3] = 255;   // A
        }
    }
    
    // Create ImageData object
    return new ImageData(processedData, width, height);
}

/**
 * Create a canvas and render the processed image data
 * @param {ImageData} imageData - Processed image data
 * @returns {ImageBitmap} - Rendered image bitmap
 */
async function renderToCanvas(imageData) {
    // Create an OffscreenCanvas in the worker
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    // Put the image data on the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to ImageBitmap for efficient transfer
    return await createImageBitmap(canvas);
}

// Message handler
/* eslint-disable no-restricted-globals */
onmessage = async function(e) {
    const { type, data, id } = e.data;
    
    try {
        switch (type) {
            case MESSAGE_TYPES.RENDER_RAW_PIXELS:
                const {
                    rawData,
                    width,
                    height,
                    pixelFormat,
                    windowCenter,
                    windowWidth
                } = data;
                
                // Process the raw pixel data
                const imageData = processPixelData(
                    rawData,
                    width,
                    height,
                    pixelFormat,
                    windowCenter,
                    windowWidth
                );
                
                // Render to canvas and create ImageBitmap
                const imageBitmap = await renderToCanvas(imageData);
                
                // Send the result back to main thread
                postMessage({
                    type: MESSAGE_TYPES.RENDER_RAW_PIXELS,
                    id,
                    success: true,
                    data: {
                        imageBitmap,
                        width,
                        height
                    }
                }, [imageBitmap]); // Transfer the ImageBitmap
                
                break;
                
            case MESSAGE_TYPES.APPLY_WINDOWING:
                const {
                    pixelData: windowingPixelData,
                    windowCenter: newWindowCenter,
                    windowWidth: newWindowWidth
                } = data;
                
                const windowedData = applyWindowing(
                    windowingPixelData,
                    newWindowCenter,
                    newWindowWidth
                );
                
                postMessage({
                    type: MESSAGE_TYPES.APPLY_WINDOWING,
                    id,
                    success: true,
                    data: windowedData
                });
                
                break;
                
            case MESSAGE_TYPES.PROCESS_PIXEL_DATA:
                const processedImageData = processPixelData(
                    data.rawData,
                    data.width,
                    data.height,
                    data.pixelFormat,
                    data.windowCenter,
                    data.windowWidth
                );
                
                postMessage({
                    type: MESSAGE_TYPES.PROCESS_PIXEL_DATA,
                    id,
                    success: true,
                    data: processedImageData
                });
                
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        // Send error back to main thread
        postMessage({
            type,
            id,
            success: false,
            error: error.message
        });
    }
};

// Initialize worker
isReady = true;
postMessage({
    type: MESSAGE_TYPES.READY,
    success: true,
    data: { ready: true }
});
/* eslint-enable no-restricted-globals */