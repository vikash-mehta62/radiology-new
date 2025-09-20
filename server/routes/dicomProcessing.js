const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const Study = require('../models/Study');

const router = express.Router();

// Helper function to call Python DICOM processor for slice extraction
const extractDicomSlices = (filePath, outputFormat = 'PNG', maxSlices = 10) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'utils', 'dicomHelper.py');
    console.log(`Starting Python process with script: ${pythonScript}`);
    console.log(`File path: ${filePath}`);
    console.log(`Args: extract_slices, ${filePath}, ${outputFormat}, ${maxSlices}`);
    
    const pythonProcess = spawn('python', [pythonScript, 'extract_slices', filePath, outputFormat, maxSlices.toString()]);
    
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

// GET /api/dicom/process/:patient_id/:filename - Extract DICOM slices
router.get('/process/:patient_id/:filename', async (req, res) => {
  try {
    const { patient_id, filename } = req.params;
    const { output_format = 'PNG', max_slices = 10, frame = 0 } = req.query;
    console.log(req.body)
    // Find the study
    const study = await Study.findOne({ 
      patient_id: patient_id,
      original_filename: filename 
    });
    
    if (!study) {
      return res.status(404).json({ 
        success: false,
        error: 'Study not found' 
      });
    }
    
    // Construct file path
    const filePath = path.join(__dirname, '..', 'uploads', patient_id, filename);
    
    try {
      // Extract slices using Python helper
      const result = await extractDicomSlices(filePath, output_format, parseInt(max_slices));
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to process DICOM file'
        });
      }
      
      // If requesting a specific frame, return only that frame
      if (frame !== undefined && frame !== '' && result.slices && result.slices.length > 0) {
        const frameIndex = parseInt(frame);
        if (frameIndex >= 0 && frameIndex < result.slices.length) {
          return res.json({
            success: true,
            image_data: result.slices[frameIndex].image_data,
            format: result.slices[frameIndex].format,
            slice_number: result.slices[frameIndex].slice_number,
            metadata: result.metadata,
            total_slices: result.total_slices_extracted,
            all_slices: result.slices // Include all slices data
          });
        }
      }
      
      // Return all slices
      res.json({
        success: result.success,
        metadata: result.metadata,
        slices: result.slices,
        total_slices_extracted: result.total_slices_extracted,
        total_slices_available: result.metadata.total_slices
      });
      
    } catch (processingError) {
      console.error('DICOM processing error:', processingError);
      res.status(500).json({
        success: false,
        error: 'Failed to process DICOM file',
        details: processingError.message
      });
    }
    
  } catch (error) {
    console.error('Error in DICOM processing endpoint:', error);
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
    
    // Find the study
    const study = await Study.findOne({ 
      patient_id: patient_id,
      original_filename: filename 
    });
    
    if (!study) {
      return res.status(404).json({ 
        success: false,
        error: 'Study not found' 
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

module.exports = router;