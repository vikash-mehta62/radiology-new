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
  
  // First try to find study by original filename
  let study = await Study.findOne({ 
    patient_id: patient_id,
    original_filename: requestedFilename 
  });
  
  // If not found, try to find any study for this patient
  if (!study) {
    study = await Study.findOne({ patient_id: patient_id });
  }
  
  // Try each possible filename
  for (const filename of possibleFilenames) {
    const filePath = path.join(__dirname, '..', 'uploads', patient_id, filename);
    if (fs.existsSync(filePath)) {
      console.log(`Found DICOM file: ${filePath}`);
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

router.get('/png/:patient_id/:filename', async (req, res) => {
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

    // Serve the PNG file directly
    const pngPath = result.png_path;
    
    // Set appropriate headers for PNG serving
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('X-Cached', result.cached ? 'true' : 'false');
    
    // Send the PNG file
    res.sendFile(path.resolve(pngPath), (err) => {
      if (err) {
        console.error('Error serving PNG file:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to serve PNG file'
        });
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