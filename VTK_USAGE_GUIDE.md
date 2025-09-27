# VTK.js Usage Guide for DICOM Viewer

## Overview
This guide demonstrates how to properly use VTK.js features in your radiology DICOM viewer for advanced 3D visualization and Multi-Planar Reconstruction (MPR).

## Current VTK.js Integration Status ✅

### Installed Components
- **VTK.js Library**: v34.12.0 (Latest stable version)
- **VTKVolumeRenderer**: 3D volume rendering component
- **VTKMPRViewer**: Multi-Planar Reconstruction viewer
- **vtkService**: Core VTK.js service layer
- **vtkDicomLoader**: DICOM to VTK data converter

### Backend Integration
- DICOM processing endpoint: `http://localhost:8000/dicom/process/{patient_id}/{filename}`
- Supports multiple output formats (PNG, DICOM, RAW)
- Auto-detection of DICOM metadata
- Slice extraction for volume rendering

## How to Use VTK.js Features Properly

### 1. Accessing VTK.js 3D Features

#### Step 1: Open a DICOM Study
```
Navigate to: http://localhost:3000/studies/{study_uid}
Example: http://localhost:3000/studies/63f79b62-ee15-45ef-bdde-507bd8f946fb
```

#### Step 2: Enable MPR Mode
1. Look for the **MPR** button in the toolbar
2. Click to toggle MPR mode ON
3. The viewer will switch from 2D canvas to VTK.js MPR viewer

#### Step 3: VTK.js Features Available
- **3D Volume Rendering**: Full volumetric visualization
- **Multi-Planar Reconstruction**: Axial, Sagittal, Coronal views
- **Interactive Controls**: Zoom, pan, rotate, windowing
- **Cross-sectional Views**: Synchronized slice navigation

### 2. VTK.js Component Architecture

```typescript
// Main VTK Components Structure
UnifiedDicomViewer
├── VTKMPRViewer (when MPR mode enabled)
│   ├── vtkService (core VTK.js operations)
│   ├── vtkDicomLoader (DICOM data conversion)
│   └── VTK.js rendering pipeline
└── Traditional 2D Canvas (default mode)
```

### 3. VTK.js Rendering Pipeline

#### Volume Rendering Process:
1. **Data Loading**: DICOM slices → VTK ImageData
2. **Volume Mapping**: 3D texture mapping
3. **Transfer Functions**: Opacity and color mapping
4. **Rendering**: WebGL-based volume rendering

#### MPR Process:
1. **Volume Data**: Load complete DICOM series
2. **Reslicing**: Generate orthogonal planes
3. **Synchronization**: Link all three views
4. **Interaction**: Real-time slice updates

### 4. Proper Usage Examples

#### Example 1: Basic 3D Volume Rendering
```typescript
// VTKVolumeRenderer usage
<VTKVolumeRenderer
  studyId="63f79b62-ee15-45ef-bdde-507bd8f946fb"
  seriesId="63f79b62-ee15-45ef-bdde-507bd8f946fb.1"
  width={800}
  height={600}
  renderingMode="volume"
  enableInteraction={true}
  onVolumeLoaded={(volumeInfo) => {
    console.log('Volume loaded:', volumeInfo);
  }}
/>
```

#### Example 2: MPR Viewer
```typescript
// VTKMPRViewer usage
<VTKMPRViewer
  studyId="63f79b62-ee15-45ef-bdde-507bd8f946fb"
  seriesId="63f79b62-ee15-45ef-bdde-507bd8f946fb.1"
  width={800}
  height={600}
  enableSynchronization={true}
  showCrosshairs={true}
  windowWidth={400}
  windowCenter={200}
/>
```

### 5. VTK.js Performance Optimization

#### Recommended Settings:
```typescript
// Volume Rendering Settings
const optimizedSettings = {
  sampleDistance: 1.0,        // Balance quality vs performance
  blendMode: 0,               // Composite blending
  interpolationType: 1,       // Linear interpolation
  shade: true,                // Enable shading
  ambient: 0.1,
  diffuse: 0.7,
  specular: 0.2
};

// MPR Settings
const mprSettings = {
  enableSynchronization: true,  // Sync all views
  showCrosshairs: true,        // Visual reference
  interpolation: 'linear'      // Smooth interpolation
};
```

### 6. WebGL Requirements

#### Browser Compatibility:
- **Chrome**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Partial support ⚠️
- **Edge**: Full support ✅

#### Hardware Requirements:
- **GPU**: WebGL 2.0 compatible
- **RAM**: Minimum 4GB for large volumes
- **CPU**: Modern multi-core processor

### 7. Troubleshooting Common Issues

#### Issue 1: VTK.js Not Loading
```javascript
// Check WebGL support
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
  console.error('WebGL 2.0 not supported');
}
```

#### Issue 2: Performance Issues
```javascript
// Reduce volume quality for better performance
const performanceSettings = {
  sampleDistance: 2.0,  // Increase for faster rendering
  dimensions: [256, 256, 128]  // Reduce resolution
};
```

#### Issue 3: Memory Issues
```javascript
// Cleanup VTK objects properly
useEffect(() => {
  return () => {
    if (vtkObjects) {
      vtkObjects.interactor?.delete();
      vtkObjects.renderWindow?.delete();
    }
  };
}, []);
```

### 8. Advanced VTK.js Features

#### Custom Transfer Functions:
```typescript
// Create custom opacity transfer function
const opacityFunction = vtkPiecewiseFunction.newInstance();
opacityFunction.addPoint(0, 0.0);
opacityFunction.addPoint(128, 0.5);
opacityFunction.addPoint(255, 1.0);

// Create custom color transfer function
const colorFunction = vtkColorTransferFunction.newInstance();
colorFunction.addRGBPoint(0, 0.0, 0.0, 0.0);
colorFunction.addRGBPoint(128, 0.5, 0.5, 0.5);
colorFunction.addRGBPoint(255, 1.0, 1.0, 1.0);
```

#### Volume Clipping:
```typescript
// Add clipping planes
const clipPlane = vtkPlane.newInstance();
clipPlane.setOrigin(0, 0, 0);
clipPlane.setNormal(1, 0, 0);
volumeMapper.addClippingPlane(clipPlane);
```

### 9. Integration with DICOM Metadata

#### Automatic Window/Level:
```typescript
// Use DICOM metadata for optimal display
const windowWidth = metadata.windowWidth || 400;
const windowCenter = metadata.windowCenter || 200;

// Apply to VTK volume property
volumeProperty.setScalarOpacityUnitDistance(
  Math.sqrt(spacing[0] * spacing[0] + spacing[1] * spacing[1] + spacing[2] * spacing[2])
);
```

### 10. Testing VTK.js Integration

#### Test Script Available:
```bash
# Run the integration test
node test-vtk-integration.js
```

#### Manual Testing Steps:
1. Open study viewer: `http://localhost:3000/studies/63f79b62-ee15-45ef-bdde-507bd8f946fb`
2. Click MPR button to enable VTK.js mode
3. Verify 3D rendering appears
4. Test interaction (zoom, pan, rotate)
5. Check browser console for errors

### 11. Current Study Data for Testing

#### Available Test Study:
- **Study UID**: `63f79b62-ee15-45ef-bdde-507bd8f946fb`
- **Patient ID**: `PAT_PALAK_57F5AE30`
- **DICOM File**: `5783.dcm`
- **Backend Status**: ✅ Working
- **VTK.js Status**: ✅ Ready

### 12. Next Steps for Advanced Usage

1. **Custom Rendering Modes**: Implement MIP, isosurface rendering
2. **Measurement Tools**: Add distance, angle, volume measurements
3. **Annotation System**: Overlay annotations on 3D views
4. **Export Features**: Save 3D renderings as images/videos
5. **Multi-Series Support**: Handle multiple DICOM series

## Conclusion

Your VTK.js integration is properly set up and ready for advanced 3D DICOM visualization. The MPR mode provides professional-grade multi-planar reconstruction capabilities, while the volume rendering offers high-quality 3D visualization suitable for medical imaging applications.

**Key Benefits:**
- ✅ Professional 3D medical imaging capabilities
- ✅ Real-time interactive visualization
- ✅ Multi-planar reconstruction (MPR)
- ✅ WebGL-accelerated performance
- ✅ DICOM metadata integration
- ✅ Cross-platform browser support

**Ready to Use:** Navigate to your study viewer and click the MPR button to experience the full VTK.js capabilities!