const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const Study = require('../models/Study');

const router = express.Router();

// Helper function to call Python DICOM processor for PNG conversion
const convertDicomToPng = (filePath, outputDir, sliceIndex = 0) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'utils', 'dicomHelper.py');
    console.log(`Converting DICOM to PNG: ${filePath}`);
    
    const pythonProcess = spawn('python', [pythonScript, 'convert_to_png', filePath, outputDir, sliceIndex.toString()]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`PNG conversion process closed with code: ${code}`);
      
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse PNG conversion output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`PNG conversion failed with code ${code}: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start PNG conversion process: ${error.message}`));
    });
  });
};

// Helper function to call Python DICOM processor for slice extraction
const extractDicomSlices = (filePath, outputFormat = 'PNG', maxSlices = 10) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'utils', 'dicomHelper.py');
    console.log(`Starting Python process with script: ${pythonScript}`);
    console.log(`File path: ${filePath}`);
    
    // Fix: Properly handle maxSlices argument - send '0' for unlimited slices
    const maxSlicesArg = (typeof maxSlices === 'number' && maxSlices > 0) ? String(maxSlices) : '0';
    console.log(`Args: extract_slices, ${filePath}, ${outputFormat}, ${maxSlicesArg} (original maxSlices: ${maxSlices})`);
    
    const pythonProcess = spawn('python', [pythonScript, 'extract_slices', filePath, outputFormat, maxSlicesArg]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`STDOUT chunk received: ${data.toString().length} bytes`);
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.log(`STDERR chunk: ${data.toString()}`);
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Python process closed with code: ${code}`);
      console.log(`Output length: ${output.length}`);
      console.log(`Error output: ${errorOutput}`);
      console.log(`First 500 chars of output: ${output.substring(0, 500)}`);
      
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          console.log(`Parsed result - success: ${result.success}, slices count: ${result.slices ? result.slices.length : 'undefined'}`);
          resolve(result);
        } catch (parseError) {
          console.log(`Parse error: ${parseError.message}`);
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.log(`Python process error: ${error.message}`);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

// Helper function to find DICOM file with fallback filenames
const findDicomFile = async (patient_id, requestedFilename) => {
  const fs = require('fs');
  
  // Try different filename variations
  const possibleFilenames = [
    requestedFilename,
    '0002.DCM',
    '1234.DCM', 
    '0020.DCM',
    'image.dcm',
    'study.dcm'
  ];
  
  let study = null;
  
  try {
    // First try to find study by original filename
    study = await Study.findOne({ 
      patient_id: patient_id,
      original_filename: requestedFilename 
    });
    
    // If not found, try to find any study for this patient
    if (!study) {
      study = await Study.findOne({ patient_id: patient_id });
    }
  } catch (dbError) {
    console.log(`Database not available, proceeding with file-based lookup: ${dbError.message}`);
  }
  
  // Try each possible filename
  for (const filename of possibleFilenames) {
    const filePath = path.join(__dirname, '..', 'uploads', patient_id, filename);
    console.log(`Checking file path: ${filePath}`);
    console.log(`__dirname: ${__dirname}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`Found DICOM file: ${filePath}`);
      
      // Create a mock study object if database is not available
      if (!study) {
        study = {
          patient_id: patient_id,
          original_filename: filename,
          study_uid: `mock-study-${patient_id}`,
          created_at: new Date()
        };
      }
      
      return { study, filePath, actualFilename: filename };
    }
  }
  
  return { study: null, filePath: null, actualFilename: null };
};

// GET /api/dicom/process/:patient_id/:filename - Extract DICOM slices with enhanced auto-detection
router.get('/process/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    const { output_format = 'PNG', max_slices = 10, frame = 0, auto_detect = false } = req.query;
    
    console.log(`📥 [DICOM Processing] Processing request:`, {
      patient_id,
      filename,
      output_format,
      frame: parseInt(frame),
      auto_detect: auto_detect === 'true'
    });
    
    // Find the DICOM file with fallback mechanism
    const { study, filePath, actualFilename } = await findDicomFile(patient_id, filename);
    
    if (!filePath) {
      return res.status(404).json({ 
        success: false,
        error: `DICOM file not found for patient ${patient_id}. Tried filenames: ${filename}, 0002.DCM, 1234.DCM, 0020.DCM, image.dcm, study.dcm`
      });
    }
    
    console.log(`📂 [DICOM Processing] Found DICOM file at: ${filePath} (requested: ${filename}, actual: ${actualFilename})`);
    
    try {
      // Enhanced slice extraction with auto-detection
      const extractionSlices = auto_detect === 'true' ? null : parseInt(max_slices);
      const result = await extractDicomSlices(filePath, output_format, extractionSlices);
      
      console.log(`📊 [DICOM Processing] Python helper result:`, {
        success: result.success,
        hasSlices: result.slices ? result.slices.length : 0,
        hasAutoDetection: !!result.auto_detection_info,
        totalSlicesExtracted: result.total_slices_extracted
      });
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to process DICOM file'
        });
      }
      
      // Handle frame-specific requests
      const frameIndex = parseInt(frame);
      if (frame !== undefined && frame !== '' && result.slices && result.slices.length > 0) {
        if (frameIndex >= 0 && frameIndex < result.slices.length) {
          return res.json({
            success: true,
            image_data: result.slices[frameIndex].image_data,
            format: result.slices[frameIndex].format,
            slice_number: result.slices[frameIndex].slice_number,
            metadata: result.metadata,
            total_slices: result.total_slices_extracted,
            frame_index: frameIndex,
            auto_detection_info: result.auto_detection_info || null,
            all_slices: result.slices // Include all slices data
          });
        } else if (frameIndex === 0 || auto_detect === 'true') {
          // Return first frame with full detection info for auto-detection requests
          const frameData = result.slices[0];
          return res.json({
            success: true,
            image_data: frameData.image_data,
            format: frameData.format,
            slice_number: frameData.slice_number,
            metadata: result.metadata,
            total_slices: result.total_slices_extracted,
            frame_index: 0,
            auto_detection_info: result.auto_detection_info || null,
            all_slices: result.slices
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Frame index out of range',
            message: `Requested frame ${frameIndex} but only ${result.slices.length} frames available`
          });
        }
      }
      
      // Return all slices
      res.json({
        success: result.success,
        metadata: result.metadata,
        slices: result.slices,
        total_slices_extracted: result.total_slices_extracted,
        total_slices_available: result.metadata.total_slices,
        auto_detection_info: result.auto_detection_info || null
      });
      
    } catch (processingError) {
      console.error('❌ [DICOM Processing] Error processing DICOM:', processingError);
      res.status(500).json({
        success: false,
        error: 'Failed to process DICOM file',
        details: processingError.message
      });
    }
    
  } catch (error) {
    console.error('❌ [DICOM Processing] Error in DICOM processing endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/dicom/info/:patient_id/:filename - Get DICOM metadata
router.get('/info/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    
    // Find the DICOM file with fallback mechanism
    const { study, filePath, actualFilename } = await findDicomFile(patient_id, filename);
    
    if (!study) {
      return res.status(404).json({ 
        success: false,
        error: `Study not found for patient ${patient_id}. Tried filenames: ${filename}, 0002.DCM, 1234.DCM, 0020.DCM, image.dcm, study.dcm`
      });
    }
    
    // Return stored metadata
    res.json({
      success: true,
      metadata: study.dicom_metadata,
      study_info: {
        study_uid: study.study_uid,
        patient_id: study.patient_id,
        patient_name: study.patient_name,
        study_date: study.study_date,
        modality: study.modality,
        study_description: study.study_description,
        has_pixel_data: study.has_pixel_data,
        total_slices: study.total_slices,
        is_multi_slice: study.is_multi_slice,
        processing_status: study.processing_status
      }
    });
    
  } catch (error) {
    console.error('Error getting DICOM info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/dicom/png/:patient_id/:filename - Convert DICOM to PNG and serve
// New /convert route for per-frame PNG caching with JSON response
router.get('/convert/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    const sliceIndex = parseInt(req.query.slice) || 0;
    
    // Find the DICOM file with fallback mechanism
    const { study, filePath, actualFilename } = await findDicomFile(patient_id, filename);
    
    if (!study) {
      return res.status(404).json({ 
        success: false,
        error: `Study not found for patient ${patient_id}. Tried filenames: ${filename}, 0002.DCM, 1234.DCM, 0020.DCM, image.dcm, study.dcm`
      });
    }

    // Create PNG cache directory
    const pngCacheDir = path.join(__dirname, '..', 'cache', 'png');
    
    // Convert DICOM to PNG
    const result = await convertDicomToPng(filePath, pngCacheDir, sliceIndex);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to convert DICOM to PNG',
        details: result.error
      });
    }

    // Return JSON response with PNG URL instead of serving file directly
    const pngFilename = path.basename(result.png_path);
    const pngUrl = `/cache/png/${pngFilename}`;
    
    res.json({
      success: true,
      png_url: pngUrl,
      png_path: result.png_path,
      cached: result.cached || false,
      slice_index: sliceIndex,
      processing_time: result.processing_time || 0,
      metadata: result.metadata || {}
    });
    
  } catch (error) {
    console.error('Error in PNG conversion endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Extract raw pixel data from DICOM file for client-side rendering
 */
async function extractRawPixelData(dicomFilePath, frame = 0, windowCenter = null, windowWidth = null) {
  return new Promise((resolve, reject) => {
    console.log(`🔬 [extractRawPixelData] Processing: ${dicomFilePath}, frame: ${frame}`);

    // Prepare arguments for Python script
    const args = [
      path.join(__dirname, '../python/dicomHelper.py'),
      dicomFilePath,
      '--mode', 'raw_pixels',
      '--frame', frame.toString()
    ];

    // Add windowing parameters if provided
    if (windowCenter !== null && windowWidth !== null) {
      args.push('--window-center', windowCenter.toString());
      args.push('--window-width', windowWidth.toString());
    }

    console.log(`🐍 [extractRawPixelData] Python command: python ${args.join(' ')}`);

    const pythonProcess = spawn('python', args);
    
    let stdoutData = Buffer.alloc(0);
    let stderrData = '';
    let metadataReceived = false;
    let metadata = {};

    pythonProcess.stdout.on('data', (data) => {
      if (!metadataReceived) {
        // First chunk should contain JSON metadata followed by binary data
        const dataStr = data.toString();
        const metadataEndIndex = dataStr.indexOf('\n---PIXEL_DATA_START---\n');
        
        if (metadataEndIndex !== -1) {
          try {
            const metadataStr = dataStr.substring(0, metadataEndIndex);
            metadata = JSON.parse(metadataStr);
            metadataReceived = true;
            
            // Extract binary data after metadata
            const binaryStartIndex = metadataEndIndex + '\n---PIXEL_DATA_START---\n'.length;
            const binaryData = data.slice(Buffer.byteLength(dataStr.substring(0, binaryStartIndex)));
            stdoutData = Buffer.concat([stdoutData, binaryData]);
            
            console.log(`📊 [extractRawPixelData] Metadata received: ${metadata.width}x${metadata.height}, ${metadata.pixel_format}`);
          } catch (error) {
            console.error('❌ [extractRawPixelData] Failed to parse metadata:', error);
          }
        } else {
          // Still waiting for complete metadata
          stdoutData = Buffer.concat([stdoutData, data]);
        }
      } else {
        // Accumulate binary pixel data
        stdoutData = Buffer.concat([stdoutData, data]);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ [extractRawPixelData] Python process failed with code ${code}`);
        console.error(`❌ [extractRawPixelData] stderr: ${stderrData}`);
        resolve({
          success: false,
          error: `Python process failed: ${stderrData}`
        });
        return;
      }

      if (!metadataReceived) {
        console.error('❌ [extractRawPixelData] No metadata received from Python process');
        resolve({
          success: false,
          error: 'No metadata received from Python process'
        });
        return;
      }

      console.log(`✅ [extractRawPixelData] Successfully extracted ${stdoutData.length} bytes of pixel data`);

      resolve({
        success: true,
        buffer: stdoutData,
        width: metadata.width,
        height: metadata.height,
        pixelFormat: metadata.pixel_format,
        bitsAllocated: metadata.bits_allocated,
        photometricInterpretation: metadata.photometric_interpretation,
        windowCenter: metadata.window_center,
        windowWidth: metadata.window_width
      });
    });

    pythonProcess.on('error', (error) => {
      console.error('❌ [extractRawPixelData] Python process error:', error);
      resolve({
        success: false,
        error: `Python process error: ${error.message}`
      });
    });
  });
}

// Raw pixel data endpoint for client-side rendering (performance optimization)
router.get('/pixels/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    const frame = parseInt(req.query.frame) || 0;
    const windowCenter = parseFloat(req.query.windowCenter) || null;
    const windowWidth = parseFloat(req.query.windowWidth) || null;

    console.log(`🔬 [DICOM Pixels] Processing raw pixel data for ${patient_id}/${filename}, frame: ${frame}`);

    // Find the DICOM file
    const { study, filePath, actualFilename } = await findDicomFile(patient_id, filename);
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: `DICOM file not found: ${patient_id}/${filename}`
      });
    }

    console.log(`📁 [DICOM Pixels] Found DICOM file: ${filePath}`);

    // Extract raw pixel data using Python helper
    const pixelData = await extractRawPixelData(filePath, frame, windowCenter, windowWidth);
    
    if (!pixelData.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to extract pixel data',
        error: pixelData.error
      });
    }

    // Set headers for binary data transfer
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': pixelData.buffer.length,
      'X-Image-Width': pixelData.width.toString(),
      'X-Image-Height': pixelData.height.toString(),
      'X-Pixel-Format': pixelData.pixelFormat || 'uint16',
      'X-Window-Center': pixelData.windowCenter?.toString() || 'auto',
      'X-Window-Width': pixelData.windowWidth?.toString() || 'auto',
      'X-Bits-Allocated': pixelData.bitsAllocated?.toString() || '16',
      'X-Photometric-Interpretation': pixelData.photometricInterpretation || 'MONOCHROME2',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Expose-Headers': 'X-Image-Width, X-Image-Height, X-Pixel-Format, X-Window-Center, X-Window-Width, X-Bits-Allocated, X-Photometric-Interpretation'
    });

    console.log(`✅ [DICOM Pixels] Sending raw pixel data: ${pixelData.width}x${pixelData.height}, ${pixelData.buffer.length} bytes`);

    // Send raw pixel data as binary
    res.send(pixelData.buffer);

  } catch (error) {
    console.error('❌ [DICOM Pixels] Error processing pixel data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error processing pixel data',
      error: error.message
    });
  }
});

router.get('/png/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    const sliceIndex = parseInt(req.query.slice) || 0;
    const frame = parseInt(req.query.frame) || sliceIndex; // Support both slice and frame parameters
    
    // Find the DICOM file with fallback mechanism
    const { study, filePath, actualFilename } = await findDicomFile(patient_id, filename);
    
    if (!study) {
      return res.status(404).json({ 
        success: false,
        error: `Study not found for patient ${patient_id}. Tried filenames: ${filename}, 0002.DCM, 1234.DCM, 0020.DCM, image.dcm, study.dcm`
      });
    }

    // Create PNG cache directory
    const pngCacheDir = path.join(__dirname, '..', 'cache', 'png');
    
    // Convert DICOM to PNG with optimized caching
    const result = await convertDicomToPng(filePath, pngCacheDir, frame);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to convert DICOM to PNG',
        details: result.error
      });
    }

    // Serve the PNG file directly with optimized headers
    const pngPath = result.png_path;
    
    // Performance-optimized headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // Aggressive caching
    res.setHeader('X-Cached', result.cached ? 'true' : 'false');
    res.setHeader('X-Frame-Index', frame.toString());
    res.setHeader('X-Patient-ID', patient_id);
    res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests for better performance
    
    // Add ETag for better caching
    const fs = require('fs');
    const stats = fs.statSync(pngPath);
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    // Send the PNG file with error handling
    res.sendFile(path.resolve(pngPath), {
      maxAge: 86400000, // 24 hours in milliseconds
      immutable: true,
      lastModified: false // We use ETag instead
    }, (err) => {
      if (err) {
        console.error('Error serving PNG file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to serve PNG file'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error in PNG conversion endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;