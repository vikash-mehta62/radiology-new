# Module Interactions Guide

## Overview
This document details how each module in the radiology DICOM viewer system interacts with others, providing a comprehensive understanding of the system architecture and data flow.

## Frontend Module Interactions

### 1. React Router & Navigation
- **Interacts with**: All page components, Authentication Context
- **Purpose**: Manages client-side routing and navigation
- **Key Interactions**:
  - Routes `/studies/:studyId` to StudyViewer component
  - Protects routes through AuthContext
  - Lazy loads components for performance

### 2. StudyViewer Component
- **Interacts with**: UnifiedDicomViewer, VTKMPRViewer, Backend APIs
- **Purpose**: Main container for DICOM study visualization
- **Key Interactions**:
  - Fetches study metadata from `/api/studies/:id`
  - Passes DICOM data to UnifiedDicomViewer
  - Manages toolbar state and MPR mode activation

### 3. UnifiedDicomViewer Component
- **Interacts with**: Backend DICOM API, VTK.js, Cornerstone.js
- **Purpose**: Core DICOM image rendering and manipulation
- **Key Interactions**:
  - Requests DICOM processing via `/api/dicom/process/:patientId/:filename`
  - Converts backend `image_data` to displayable format
  - Integrates with VTK.js for 3D rendering
  - Uses Cornerstone.js for 2D image display

### 4. VTKMPRViewer Component
- **Interacts with**: VTK.js library, vtkDicomLoader, UnifiedDicomViewer
- **Purpose**: 3D multi-planar reconstruction visualization
- **Key Interactions**:
  - Receives DICOM volume data from vtkDicomLoader
  - Creates 3D rendering pipeline using VTK.js
  - Provides interactive 3D controls (zoom, pan, rotate)
  - Communicates viewport changes back to parent components

### 5. vtkDicomLoader Service
- **Interacts with**: Backend DICOM API, VTK.js, File System
- **Purpose**: Loads and processes DICOM data for VTK.js
- **Key Interactions**:
  - Fetches DICOM files from backend storage
  - Converts DICOM data to VTK.js compatible format
  - Manages volume data caching
  - Handles DICOM metadata extraction

## Backend Module Interactions

### 6. Express Server (server.js)
- **Interacts with**: All route handlers, Middleware, Database
- **Purpose**: Main application server and request router
- **Key Interactions**:
  - Routes requests to appropriate handlers
  - Applies CORS and security middleware
  - Serves static files from uploads directory
  - Manages database connections

### 7. DICOM Processing Route (/api/dicom/*)
- **Interacts with**: File System, DICOM Libraries, Frontend
- **Purpose**: Processes DICOM files and returns image data
- **Key Interactions**:
  - Reads DICOM files from storage (`uploads/dicom/`)
  - Uses DICOM processing libraries (pydicom, dcm2niix)
  - Returns processed image data as base64 or binary
  - Handles frame extraction and format conversion

### 8. Studies Route (/api/studies/*)
- **Interacts with**: MongoDB, File System, Frontend
- **Purpose**: Manages study metadata and file associations
- **Key Interactions**:
  - Queries MongoDB for study information
  - Associates DICOM files with study records
  - Returns study metadata including file paths
  - Manages patient and study relationships

### 9. File Storage System
- **Interacts with**: Upload handlers, DICOM processing, Frontend
- **Purpose**: Stores and manages DICOM files
- **Key Interactions**:
  - Organizes files by patient ID and study
  - Provides file access to processing routes
  - Maintains file integrity and metadata
  - Supports concurrent file access

## Database Interactions

### 10. MongoDB Collections
- **Interacts with**: Backend routes, Data models
- **Purpose**: Persistent data storage
- **Key Collections**:
  - `studies`: Study metadata and file references
  - `patients`: Patient information and demographics
  - `reports`: Radiology reports and annotations
  - `audit`: System activity and access logs

## External Library Interactions

### 11. VTK.js Integration
- **Interacts with**: Frontend components, WebGL, Browser APIs
- **Purpose**: 3D visualization and medical imaging
- **Key Features**:
  - WebGL-based rendering pipeline
  - Volume rendering and MPR
  - Interactive 3D manipulation
  - Real-time image processing

### 12. Cornerstone.js Integration
- **Interacts with**: DICOM data, Canvas API, Frontend
- **Purpose**: 2D medical image display
- **Key Features**:
  - DICOM image rendering
  - Windowing and leveling
  - Measurement tools
  - Image manipulation

## Data Flow Interactions

### Upload to Visualization Flow:
1. **File Upload** → Express server → File system storage
2. **Metadata Extraction** → DICOM processing → MongoDB storage
3. **Study Request** → Frontend → Studies API → Database query
4. **Image Request** → UnifiedDicomViewer → DICOM API → File processing
5. **3D Activation** → VTKMPRViewer → vtkDicomLoader → VTK.js rendering

### Real-time Interactions:
- **WebSocket**: Real-time updates between frontend and backend
- **React Query**: Caching and synchronization of API data
- **Context Providers**: State management across components
- **Event Handlers**: User interaction processing

## Security and Performance Interactions

### Authentication Flow:
- **AuthContext** ↔ **Backend Auth API** ↔ **JWT Tokens**
- **Route Protection** ↔ **User Permissions** ↔ **Database Roles**

### Performance Optimizations:
- **Lazy Loading**: Components loaded on demand
- **Image Caching**: Processed images cached in browser
- **Database Indexing**: Optimized queries for studies and patients
- **File Streaming**: Large DICOM files streamed efficiently

## Error Handling Interactions

### Frontend Error Handling:
- **Component Error Boundaries** → **User Notifications**
- **API Error Responses** → **Retry Logic** → **Fallback UI**

### Backend Error Handling:
- **Route Error Middleware** → **Logging** → **Client Error Responses**
- **File Processing Errors** → **Graceful Degradation** → **Alternative Formats**

## Monitoring and Logging

### System Monitoring:
- **Request Logging** → **Performance Metrics** → **Health Checks**
- **Error Tracking** → **Alert Systems** → **Diagnostic Tools**

This comprehensive interaction guide shows how each module works together to create a seamless DICOM viewing and 3D visualization experience.