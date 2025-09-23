const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const patientsRouter = require('./routes/patients');
const studiesRouter = require('./routes/studies');
const debugRouter = require('./routes/debug');
const uploadsRouter = require('./routes/uploads');
const dicomProcessingRoutes = require('./routes/dicomProcessing');
const reportsRouter = require('./routes/reports');
const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// Ensure required directories exist
const requiredDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'slices'),
    path.join(__dirname, 'cache', 'png')
];

requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/slices', express.static(path.join(__dirname, 'slices')));
app.use('/cache', express.static(path.join(__dirname, 'cache')));

// Routes - API routes with /api prefix
app.use('/patients', patientsRouter);
app.use('/studies', studiesRouter);
app.use('/debug', debugRouter);
app.use('/uploads', uploadsRouter);
app.use('/dicom', dicomProcessingRoutes);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    service: 'Kiro Radiology Backend'
  });
});

// Upload health check
app.get('/upload/health', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const uploadsExists = fs.existsSync(uploadsDir);
  
  res.json({
    status: 'OK',
    uploads_directory_exists: uploadsExists,
    uploads_directory_path: uploadsDir,
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'DICOM Processing API with MongoDB',
        version: '1.0.0',
        database: 'MongoDB'
    });
});

// Simple test page
app.get('/', (req, res) => {
    res.send(`
        <h1>DICOM Processing Server - MongoDB Backend</h1>
        <p>Server is running on port ${PORT}</p>
        <p>Upload DICOM files to /api/studies/upload</p>
        <p>Check health at /health</p>
    `);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kiro_radiology', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Upload health: http://localhost:${PORT}/upload/health`);
  console.log(`👥 Patients API: http://localhost:${PORT}/api/patients`);
  console.log(`🔬 Studies API: http://localhost:${PORT}/api/studies`);
});

module.exports = app;