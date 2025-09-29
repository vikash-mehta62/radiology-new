const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const Study = require('../models/Study');

const router = express.Router();

// Helper function to find DICOM file (reused from dicomProcessing.js)
const findDicomFile = async (patient_id, requestedFilename) => {
  try {
    const study = await Study.findOne({ patient_id });
    if (!study) {
      return { study: null, filePath: null, actualFilename: null };
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads', patient_id);
    
    // Try multiple filename variations
    const filenameVariations = [
      requestedFilename,
      '0002.DCM',
      '1234.DCM', 
      '0020.DCM',
      'image.dcm',
      'study.dcm'
    ];

    for (const filename of filenameVariations) {
      const filePath = path.join(uploadsDir, filename);
      try {
        await fs.access(filePath);
        return { study, filePath, actualFilename: filename };
      } catch (err) {
        continue;
      }
    }

    return { study, filePath: null, actualFilename: null };
  } catch (error) {
    console.error('Error finding DICOM file:', error);
    return { study: null, filePath: null, actualFilename: null };
  }
};

// Helper function to extract DICOM metadata using Python
const getDicomMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'utils', 'dicomHelper.py');
    const pythonProcess = spawn('python', [pythonScript, 'get_info', filePath]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse metadata: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Metadata extraction failed: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start metadata process: ${error.message}`));
    });
  });
};

// WADO-RS: Retrieve Study Metadata (Simplified pattern)
// GET /studies/{patientId}/instances/{filename}/metadata
router.get('/studies/:patientId/instances/:filename/metadata', async (req, res) => {
  try {
    const { patientId, filename } = req.params;
    
    console.log(`📋 [WADO-RS] Retrieving metadata for patient: ${patientId}, file: ${filename}`);
    
    // Get DICOM file path
    const { study, filePath } = await findDicomFile(patientId, filename);
    if (!filePath) {
      return res.status(404).json({
        error: 'DICOM file not found',
        patientId,
        filename
      });
    }

    // Extract DICOM metadata
    const metadata = await getDicomMetadata(filePath);
    
    console.log('📋 [WADO-RS] Metadata response:', JSON.stringify(metadata, null, 2));
    
    if (!metadata.success) {
      return res.status(500).json({
        error: 'Failed to extract DICOM metadata',
        details: metadata.error
      });
    }

    // Return simplified metadata for client-side processing
    const clientMetadata = {
      rows: metadata.info?.image_shape?.[1] || 512,
      columns: metadata.info?.image_shape?.[0] || 512,
      pixelSpacing: [1.0, 1.0], // Default pixel spacing
      windowCenter: 2048,
      windowWidth: 4096,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      minPixelValue: 0,
      maxPixelValue: 4095,
      photometricInterpretation: 'MONOCHROME2',
      modality: metadata.info?.modality || 'CT',
      patientName: metadata.info?.patient_name || '',
      patientId: metadata.info?.patient_id || patientId,
      totalSlices: metadata.info?.total_slices || 1,
      isMultiSlice: metadata.info?.is_multi_slice || false
    };

    res.setHeader('Content-Type', 'application/json');
    res.json(clientMetadata);
    
  } catch (error) {
    console.error('❌ [WADO-RS] Error retrieving metadata:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// WADO-RS: Retrieve Frame Data (Simplified pattern)
// GET /studies/{patientId}/instances/{filename}/frames/{frameNumber}
router.get('/studies/:patientId/instances/:filename/frames/:frameNumber', async (req, res) => {
  try {
    const { patientId, filename, frameNumber } = req.params;
    const frame = parseInt(frameNumber) - 1; // Convert to 0-based index
    
    console.log(`🖼️ [WADO-RS] Retrieving frame ${frameNumber} for patient: ${patientId}, file: ${filename}`);
    
    // Get DICOM file path
    const { study, filePath } = await findDicomFile(patientId, filename);
    if (!filePath) {
      return res.status(404).json({
        error: 'DICOM file not found',
        patientId,
        filename
      });
    }

    // Extract raw pixel data for the specific frame
    try {
      console.log('🔍 [WADO-RS] Calling extractFramePixelData with:', filePath, [frame]);
      const pixelData = await extractFramePixelData(filePath, [frame]);
      console.log('🔍 [WADO-RS] extractFramePixelData result:', pixelData ? 'defined' : 'undefined');
      console.log('🔍 [WADO-RS] pixelData.success:', pixelData?.success);
      console.log('🔍 [WADO-RS] pixelData.pixelData type:', typeof pixelData?.pixelData);
      
      if (!pixelData || !pixelData.success) {
        return res.status(500).json({
          error: 'Failed to extract frame pixel data',
          details: pixelData?.error || 'Unknown error'
        });
      }

      // Set appropriate headers for binary data
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', pixelData.pixelData?.length || 0);
      res.setHeader('X-Frame-Width', pixelData.metadata?.width || 512);
      res.setHeader('X-Frame-Height', pixelData.metadata?.height || 512);
      res.setHeader('X-Data-Type', pixelData.metadata?.data_type || 'uint16');
      
      // Send raw binary pixel data
      res.send(pixelData.pixelData || Buffer.alloc(0));
      
    } catch (extractError) {
      console.error('❌ [WADO-RS] Frame extraction error:', extractError);
      return res.status(500).json({
        error: 'Failed to extract frame pixel data',
        details: extractError.message
      });
    }
    
  } catch (error) {
    console.error('❌ [WADO-RS] Error retrieving frame data:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// WADO-RS: Retrieve Instance (Raw DICOM Data)
// GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}
router.get('/studies/:studyUID/series/:seriesUID/instances/:instanceUID', async (req, res) => {
  try {
    const { studyUID, seriesUID, instanceUID } = req.params;
    
    console.log(`🔬 [WADO-RS] Retrieving instance: ${instanceUID} from study: ${studyUID}`);
    
    // Find study by UID
    const study = await Study.findOne({ study_uid: studyUID });
    if (!study) {
      return res.status(404).json({
        error: 'Study not found',
        studyUID
      });
    }

    // Get DICOM file path
    const { filePath } = await findDicomFile(study.patient_id, study.filename || '0002.DCM');
    if (!filePath) {
      return res.status(404).json({
        error: 'DICOM file not found',
        studyUID,
        instanceUID
      });
    }

    // Read and serve raw DICOM file
    const dicomData = await fs.readFile(filePath);
    
    // Set WADO-RS compliant headers
    res.setHeader('Content-Type', 'application/dicom');
    res.setHeader('Content-Length', dicomData.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Study-UID', studyUID);
    res.setHeader('X-Series-UID', seriesUID);
    res.setHeader('X-Instance-UID', instanceUID);
    
    res.send(dicomData);
    
  } catch (error) {
    console.error('❌ [WADO-RS] Error retrieving instance:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// WADO-RS: Retrieve Frames (Raw Pixel Data)
// GET /studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/frames/{frameList}
router.get('/studies/:studyUID/series/:seriesUID/instances/:instanceUID/frames/:frameList', async (req, res) => {
  try {
    const { studyUID, seriesUID, instanceUID, frameList } = req.params;
    const frames = frameList.split(',').map(f => parseInt(f.trim()));
    
    console.log(`🖼️ [WADO-RS] Retrieving frames: ${frameList} from instance: ${instanceUID}`);
    
    // Find study by UID
    const study = await Study.findOne({ study_uid: studyUID });
    if (!study) {
      return res.status(404).json({
        error: 'Study not found',
        studyUID
      });
    }

    // Get DICOM file path
    const { filePath } = await findDicomFile(study.patient_id, study.filename || '0002.DCM');
    if (!filePath) {
      return res.status(404).json({
        error: 'DICOM file not found',
        studyUID,
        instanceUID
      });
    }

    // Extract raw pixel data for requested frames
    const frameData = await extractFramePixelData(filePath, frames);
    
    if (!frameData.success) {
      return res.status(500).json({
        error: 'Failed to extract frame data',
        details: frameData.error
      });
    }

    // Set WADO-RS compliant headers for pixel data
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Frame-Count', frames.length.toString());
    res.setHeader('X-Pixel-Data-Length', frameData.pixelData.length.toString());
    
    res.send(frameData.pixelData);
    
  } catch (error) {
    console.error('❌ [WADO-RS] Error retrieving frames:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Helper function to extract raw pixel data for frames
const extractFramePixelData = (filePath, frames) => {
  return new Promise((resolve, reject) => {
    console.log('🔍 [extractFramePixelData] Starting with:', filePath, frames);
    const pythonScript = path.join(__dirname, '..', 'utils', 'dicomHelper.py');
    const frameArgs = frames.join(',');
    const pythonProcess = spawn('python', [pythonScript, 'raw_frames', filePath, frameArgs]);
    
    let binaryData = Buffer.alloc(0);
    let errorOutput = '';
    let metadataOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      console.log('🔍 [extractFramePixelData] stdout data length:', data.length);
      binaryData = Buffer.concat([binaryData, data]);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('🔍 [extractFramePixelData] stderr output:', output);
      // Try to parse as JSON metadata first
      try {
        const metadata = JSON.parse(output);
        if (metadata.success) {
          metadataOutput = output;
        } else {
          errorOutput += output;
        }
      } catch (e) {
        errorOutput += output;
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log('🔍 [extractFramePixelData] Process closed with code:', code);
      console.log('🔍 [extractFramePixelData] Binary data length:', binaryData.length);
      console.log('🔍 [extractFramePixelData] Metadata output:', metadataOutput);
      console.log('🔍 [extractFramePixelData] Error output:', errorOutput);
      
      if (code === 0) {
        let metadata = {};
        if (metadataOutput) {
          try {
            metadata = JSON.parse(metadataOutput);
          } catch (e) {
            console.log('🔍 [extractFramePixelData] Failed to parse metadata:', e.message);
          }
        }
        
        const result = {
          success: true,
          pixelData: binaryData,
          metadata: metadata
        };
        console.log('🔍 [extractFramePixelData] Resolving with result:', {
          success: result.success,
          pixelDataLength: result.pixelData?.length,
          metadataKeys: Object.keys(result.metadata || {})
        });
        resolve(result);
      } else {
        console.log('🔍 [extractFramePixelData] Rejecting with error:', errorOutput);
        reject(new Error(`Frame extraction failed: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.log('🔍 [extractFramePixelData] Process error:', error.message);
      reject(new Error(`Failed to start frame extraction: ${error.message}`));
    });
  });
};

// WADO-RS: Search for Studies
// GET /studies?StudyInstanceUID={studyUID}
router.get('/studies', async (req, res) => {
  try {
    const { StudyInstanceUID, PatientID, StudyDate } = req.query;
    
    console.log(`🔍 [WADO-RS] Searching studies with filters:`, { StudyInstanceUID, PatientID, StudyDate });
    
    let query = {};
    if (StudyInstanceUID) query.study_uid = StudyInstanceUID;
    if (PatientID) query.patient_id = PatientID;
    if (StudyDate) query.study_date = StudyDate;
    
    const studies = await Study.find(query);
    
    const wadoStudies = studies.map(study => ({
      "0020000D": { "vr": "UI", "Value": [study.study_uid] }, // Study Instance UID
      "00100020": { "vr": "LO", "Value": [study.patient_id] }, // Patient ID
      "00100010": { "vr": "PN", "Value": [study.patient_name || ""] }, // Patient Name
      "00080020": { "vr": "DA", "Value": [study.study_date || ""] }, // Study Date
      "00080030": { "vr": "TM", "Value": [study.study_time || ""] }, // Study Time
      "00081030": { "vr": "LO", "Value": [study.study_description || ""] }, // Study Description
      "00080060": { "vr": "CS", "Value": [study.modality || "CT"] }, // Modality
      "00200010": { "vr": "SH", "Value": [study.study_id || "1"] } // Study ID
    }));
    
    res.setHeader('Content-Type', 'application/dicom+json');
    res.json(wadoStudies);
    
  } catch (error) {
    console.error('❌ [WADO-RS] Error searching studies:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;