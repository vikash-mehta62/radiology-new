const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudyController = require('../controllers/study.controller');

const router = express.Router();
const studyController = new StudyController();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for DICOM file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const uniqueName = `${baseName}_${timestamp}${extension}`;
        cb(null, uniqueName);
    }
});

// File filter to accept only DICOM files
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.dcm', '.dicom', '.DCM', '.DICOM'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension) || allowedExtensions.includes(fileExtension.toUpperCase())) {
        cb(null, true);
    } else {
        cb(new Error('Only DICOM files (.dcm, .dicom) are allowed'), false);
    }
};

// Configure multer with file size limit (100MB)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Routes

/**
 * POST /studies/upload
 * Upload and process a DICOM file
 */
router.post('/upload', upload.single('dicomFile'), async (req, res) => {
    try {
        await studyController.uploadDicom(req, res);
    } catch (error) {
        console.error('Route error in /upload:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * GET /studies/:id
 * Get study details by ID
 */
router.get('/:id', async (req, res) => {
    try {
        await studyController.getStudyById(req, res);
    } catch (error) {
        console.error('Route error in /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * GET /studies
 * Get all studies with pagination and filtering
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - status: Filter by status (processing, completed, failed)
 * - sortBy: Sort field (default: uploadDate)
 * - sortOrder: Sort order (asc, desc - default: desc)
 */
router.get('/', async (req, res) => {
    try {
        await studyController.getAllStudies(req, res);
    } catch (error) {
        console.error('Route error in /:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * GET /studies/stats/summary
 * Get studies statistics and summary
 */
router.get('/stats/summary', async (req, res) => {
    try {
        await studyController.getStudiesStats(req, res);
    } catch (error) {
        console.error('Route error in /stats/summary:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * DELETE /studies/:id
 * Delete a study and its associated files
 */
router.delete('/:id', async (req, res) => {
    try {
        await studyController.deleteStudy(req, res);
    } catch (error) {
        console.error('Route error in DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 100MB.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Unexpected file field. Use "dicomFile" as the field name.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${error.message}`
        });
    }
    
    if (error.message.includes('Only DICOM files')) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
    
    // Pass other errors to the next error handler
    next(error);
});

module.exports = router;