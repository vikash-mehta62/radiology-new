const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Study = require('../models/study.model');

class StudyController {
    constructor() {
        // No need to initialize database connection here as it's handled by mongoose
    }

    // Upload and process DICOM file
    async uploadDicom(req, res) {
        try {
            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No DICOM file uploaded'
                });
            }

            const uploadedFile = req.file;
            const filePath = uploadedFile.path;
            const originalFileName = uploadedFile.originalname;
            const fileSize = uploadedFile.size;

            console.log(`Processing DICOM file: ${originalFileName}`);
            console.log(`File path: ${filePath}`);
            console.log(`File size: ${fileSize} bytes`);

            // Validate file extension
            const fileExtension = path.extname(originalFileName).toLowerCase();
            if (!['.dcm', '.dicom', '.DCM', '.DICOM'].includes(fileExtension)) {
                // Clean up uploaded file
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid file format. Only .dcm and .dicom files are supported'
                });
            }

            // Create study record in MongoDB with initial status
            const studyData = {
                filePath: filePath,
                originalFileName: originalFileName,
                fileSize: fileSize,
                status: 'processing'
            };

            const study = new Study(studyData);
            const savedStudy = await study.save();

            console.log(`Created study record with ID: ${savedStudy._id}`);

            // Call Python helper script to process DICOM
            const processingResult = await this.processDicomWithPython(filePath);

            if (!processingResult.success) {
                // Mark study as failed and clean up uploaded file
                await savedStudy.markAsFailed(processingResult.error || 'DICOM processing failed');
                
                try {
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    console.error('Error cleaning up file:', cleanupError);
                }

                return res.status(500).json({
                    success: false,
                    error: processingResult.error || 'DICOM processing failed',
                    studyId: savedStudy._id,
                    details: processingResult
                });
            }

            // Update study with processing results
            await savedStudy.markAsCompleted(
                processingResult.slice_count || 0,
                processingResult.slices || []
            );

            // Update metadata if available
            if (processingResult.metadata) {
                savedStudy.metadata = processingResult.metadata;
                await savedStudy.save();
            }

            // Return success response
            res.status(201).json({
                success: true,
                message: `DICOM file processed successfully. Generated ${processingResult.slice_count} slices.`,
                study: {
                    id: savedStudy._id,
                    filePath: savedStudy.filePath,
                    originalFileName: savedStudy.originalFileName,
                    sliceCount: savedStudy.sliceCount,
                    slices: savedStudy.slices,
                    fileSize: savedStudy.fileSize,
                    formattedFileSize: savedStudy.formattedFileSize,
                    status: savedStudy.status,
                    uploadDate: savedStudy.uploadDate,
                    processedDate: savedStudy.processedDate
                },
                processing: {
                    slice_count: processingResult.slice_count,
                    metadata: processingResult.metadata || {}
                }
            });

        } catch (error) {
            console.error('Error in uploadDicom:', error);
            
            // Clean up uploaded file on error
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('Error cleaning up file:', cleanupError);
                }
            }

            res.status(500).json({
                success: false,
                error: 'Internal server error during DICOM upload',
                details: error.message
            });
        }
    }

    // Get study by ID
    async getStudyById(req, res) {
        try {
            const studyId = req.params.id;

            // Validate study ID format (UUID or MongoDB ObjectId)
            const isValidObjectId = studyId.match(/^[0-9a-fA-F]{24}$/);
            const isValidUUID = studyId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i);
            
            if (!isValidObjectId && !isValidUUID) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid study ID format - must be UUID or MongoDB ObjectId'
                });
            }

            const study = await Study.findById(studyId);

            if (!study) {
                return res.status(404).json({
                    success: false,
                    error: 'Study not found'
                });
            }

            // Check if original DICOM file still exists
            const fileExists = fs.existsSync(study.filePath);

            res.json({
                success: true,
                study: {
                    id: study._id,
                    filePath: study.filePath,
                    originalFileName: study.originalFileName,
                    sliceCount: study.sliceCount,
                    slices: study.slices,
                    fileSize: study.fileSize,
                    formattedFileSize: study.formattedFileSize,
                    uploadDate: study.uploadDate,
                    processedDate: study.processedDate,
                    status: study.status,
                    metadata: study.metadata,
                    fileExists: fileExists,
                    createdAt: study.createdAt,
                    updatedAt: study.updatedAt
                }
            });

        } catch (error) {
            console.error('Error in getStudyById:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching study',
                details: error.message
            });
        }
    }

    // Get all studies with pagination and filtering
    async getAllStudies(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const sortBy = req.query.sortBy || 'uploadDate';
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

            const skip = (page - 1) * limit;

            // Build query filter
            const filter = {};
            if (status) {
                filter.status = status;
            }

            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder;

            // Execute query with pagination
            const [studies, totalCount] = await Promise.all([
                Study.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(), // Use lean() for better performance
                Study.countDocuments(filter)
            ]);

            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            res.json({
                success: true,
                studies: studies,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: limit,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage
                },
                filter: filter,
                sort: { [sortBy]: sortOrder }
            });

        } catch (error) {
            console.error('Error in getAllStudies:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching studies',
                details: error.message
            });
        }
    }

    // Get studies statistics
    async getStudiesStats(req, res) {
        try {
            const stats = await Study.getStats();
            const recentStudies = await Study.findRecent(5);

            // Calculate total file size
            const totalSizeResult = await Study.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSize: { $sum: '$fileSize' },
                        avgSize: { $avg: '$fileSize' }
                    }
                }
            ]);

            const totalSize = totalSizeResult.length > 0 ? totalSizeResult[0].totalSize : 0;
            const avgSize = totalSizeResult.length > 0 ? totalSizeResult[0].avgSize : 0;

            res.json({
                success: true,
                stats: {
                    byStatus: stats,
                    totalSize: totalSize,
                    averageSize: Math.round(avgSize),
                    recentStudies: recentStudies
                }
            });

        } catch (error) {
            console.error('Error in getStudiesStats:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching statistics',
                details: error.message
            });
        }
    }

    // Delete study
    async deleteStudy(req, res) {
        try {
            const studyId = req.params.id;

            // Validate study ID format (UUID or MongoDB ObjectId)
            const isValidObjectId = studyId.match(/^[0-9a-fA-F]{24}$/);
            const isValidUUID = studyId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i);
            
            if (!isValidObjectId && !isValidUUID) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid study ID format - must be UUID or MongoDB ObjectId'
                });
            }

            // Find and delete study
            const study = await Study.findByIdAndDelete(studyId);

            if (!study) {
                return res.status(404).json({
                    success: false,
                    error: 'Study not found'
                });
            }

            // Clean up files
            try {
                // Delete original DICOM file
                if (fs.existsSync(study.filePath)) {
                    fs.unlinkSync(study.filePath);
                    console.log(`Deleted DICOM file: ${study.filePath}`);
                }

                // Delete slice images
                if (study.slices && Array.isArray(study.slices)) {
                    study.slices.forEach(slicePath => {
                        const fullSlicePath = path.join(__dirname, '..', slicePath);
                        if (fs.existsSync(fullSlicePath)) {
                            fs.unlinkSync(fullSlicePath);
                            console.log(`Deleted slice: ${fullSlicePath}`);
                        }
                    });
                }
            } catch (fileError) {
                console.error('Error cleaning up files:', fileError);
            }

            res.json({
                success: true,
                message: 'Study deleted successfully',
                deletedStudy: {
                    id: study._id,
                    originalFileName: study.originalFileName,
                    sliceCount: study.sliceCount
                }
            });

        } catch (error) {
            console.error('Error in deleteStudy:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while deleting study',
                details: error.message
            });
        }
    }

    // Process DICOM file using Python helper script
    processDicomWithPython(dicomFilePath) {
        return new Promise((resolve, reject) => {
            const pythonScript = path.join(__dirname, '..', '..', 'dicom_helper.py');
            const outputDir = path.join(__dirname, '..', 'slices');

            // Ensure slices directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            console.log(`Calling Python script: ${pythonScript}`);
            console.log(`DICOM file: ${dicomFilePath}`);
            console.log(`Output directory: ${outputDir}`);

            // Spawn Python process
            const pythonProcess = spawn('python', [pythonScript, dicomFilePath, '--output-dir', outputDir]);

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code: ${code}`);
                
                if (stderr) {
                    console.error('Python stderr:', stderr);
                }

                if (code === 0) {
                    try {
                        // Parse JSON output from Python script
                        const result = JSON.parse(stdout.trim());
                        console.log('Python processing result:', result);
                        resolve(result);
                    } catch (parseError) {
                        console.error('Error parsing Python output:', parseError);
                        console.error('Raw stdout:', stdout);
                        resolve({
                            success: false,
                            error: 'Failed to parse Python script output',
                            raw_output: stdout,
                            stderr: stderr
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        error: `Python script failed with exit code ${code}`,
                        stderr: stderr,
                        stdout: stdout
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('Error spawning Python process:', error);
                resolve({
                    success: false,
                    error: `Failed to execute Python script: ${error.message}`
                });
            });
        });
    }
}

module.exports = StudyController;