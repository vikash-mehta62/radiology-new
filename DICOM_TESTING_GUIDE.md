# DICOM Viewer Testing Guide

## Overview
This guide provides step-by-step instructions for testing the DICOM viewer functionality with actual slice display and VTK integration.

## Backend API Testing (✅ Completed)

### 1. Backend Server Status
- **Server URL**: http://localhost:8000
- **Status**: ✅ Running successfully
- **DICOM Processing Endpoint**: `/dicom/process/{patient_id}/{filename}`

### 2. API Response Verification
```bash
# Test command used:
curl "http://localhost:8000/dicom/process/PAT001/0002.DCM?frame=0"

# Response: ✅ Success
- Returns base64 encoded PNG image data
- Includes DICOM metadata
- Response size: ~9MB (indicating successful image processing)
```

## Frontend Testing (🔄 In Progress)

### 1. Available DICOM Viewer Routes
- **Final DICOM Viewer Demo**: http://localhost:3000/final-dicom-viewer
- **Unified Viewer Test**: http://localhost:3000/unified-viewer-test
- **Study Viewer**: http://localhost:3000/studies/{study_id}

### 2. Frontend Server Status
- **Server URL**: http://localhost:3000
- **Status**: ✅ Running successfully
- **Proxy Setup**: ✅ Configured for /api routes → http://localhost:8000

## Testing Steps

### Step 1: Access DICOM Viewer
1. Open browser to: http://localhost:3000/final-dicom-viewer
2. This page provides the most comprehensive DICOM viewer demo

### Step 2: Test Sample Studies
The demo includes pre-configured sample studies:
- **CT Chest Study**: Multi-slice CT scan
- **MRI Brain Study**: Multi-frame MRI
- **X-Ray Study**: Single frame X-ray
- **Ultrasound Study**: Multi-frame ultrasound
- **Mammography Study**: Digital mammography

### Step 3: Verify VTK Integration
1. Load a multi-slice study (CT or MRI)
2. Check for:
   - ✅ Individual slice display
   - ✅ Volume rendering capabilities
   - ✅ MPR (Multi-Planar Reconstruction)
   - ✅ 3D visualization

### Step 4: Test Backend Integration
1. Select a study from the demo
2. Verify:
   - ✅ DICOM files are loaded from backend
   - ✅ Slices are processed and converted
   - ✅ VTK receives proper format data
   - ✅ Progressive loading works

## Debug Points

### 1. Backend Processing Flow
```
Patient Files → Python DICOM Processing → Base64 PNG → Frontend
└── Location: d:\radiology-new\server\uploads\{patient_id}\
└── Processing: dicomHelper.py extracts slices
└── Format: Base64 encoded PNG with metadata
```

### 2. Frontend VTK Integration
```
Base64 Data → Canvas Processing → Pixel Data → VTK Volume
└── Service: vtkDicomLoader.ts
└── Conversion: extractPixelDataFromImage()
└── VTK Format: Int16Array with proper dimensions
```

### 3. Common Issues & Solutions

#### Issue: "No slices displayed"
- **Check**: Backend API response
- **Verify**: DICOM files exist in uploads folder
- **Debug**: Browser console for loading errors

#### Issue: "VTK rendering fails"
- **Check**: GPU capabilities detection
- **Verify**: WebGL/WebGPU support
- **Fallback**: Canvas rendering should activate

#### Issue: "Format mismatch"
- **Check**: DICOM metadata extraction
- **Verify**: Pixel spacing and dimensions
- **Debug**: vtkDicomLoader conversion process

## Performance Monitoring

### 1. GPU Acceleration
- **WebGPU**: Preferred for modern GPUs
- **WebGL 2.0**: Fallback for older hardware
- **Canvas**: Final fallback for compatibility

### 2. Memory Management
- **Progressive Loading**: Loads slices in batches
- **Caching**: Intelligent image caching
- **Cleanup**: Automatic memory cleanup

### 3. Metrics to Monitor
- **FPS**: Frame rate during navigation
- **Memory Usage**: RAM consumption
- **Load Time**: Time to first slice display
- **GPU Utilization**: Graphics processing usage

## Test Results Template

```
## DICOM Viewer Test Results

### Backend API
- [ ] Server running on port 8000
- [ ] DICOM processing endpoint accessible
- [ ] Sample files processed successfully
- [ ] Metadata extraction working

### Frontend Viewer
- [ ] Viewer loads without errors
- [ ] Sample studies display correctly
- [ ] Slice navigation functional
- [ ] VTK integration working

### Performance
- [ ] GPU acceleration detected
- [ ] Smooth slice navigation
- [ ] Memory usage acceptable
- [ ] No console errors

### Issues Found
- Issue 1: [Description]
- Issue 2: [Description]

### Recommendations
- Recommendation 1: [Description]
- Recommendation 2: [Description]
```

## Next Steps

1. **Complete Frontend Testing**: Test actual slice display in browser
2. **Debug Format Matching**: Ensure VTK receives proper data format
3. **Performance Optimization**: Monitor and optimize rendering performance
4. **End-to-End Testing**: Test complete workflow from file upload to visualization

## Files to Monitor

### Backend
- `server/routes/dicomProcessing.js` - API endpoints
- `server/scripts/dicomHelper.py` - DICOM processing
- `server/uploads/{patient_id}/` - DICOM files

### Frontend
- `client/src/services/vtkDicomLoader.ts` - VTK integration
- `client/src/components/DICOM/unifieddicomviewer.tsx` - Main viewer
- `client/src/pages/FinalDicomViewerDemo.tsx` - Demo page

## Troubleshooting Commands

```bash
# Check backend logs
cd d:\radiology-new\server
npm start

# Check frontend logs
cd d:\radiology-new\client
npm start

# Test API directly
curl "http://localhost:8000/dicom/process/PAT001/0002.DCM?auto_detect=true"

# Check patient files
dir d:\radiology-new\server\uploads\PAT001\
```