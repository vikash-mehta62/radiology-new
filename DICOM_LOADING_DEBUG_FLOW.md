# DICOM Loading और VTK Integration Debug Flow

## Complete Flow: DICOM File से Slice Display तक

### 1. File Structure और Organization

```
server/uploads/
├── PAT001/
│   └── 0002.DCM
├── PAT_PALAK_57F5AE30/
│   ├── 0002.DCM
│   └── 1234.DCM
└── PAT_VIKASH_7F64CCAA/
    ├── 0002.DCM
    ├── 1a_Whole_Spine_T1_TSE_2steps.dcm
    └── 4K-2160x3840.dcm
```

### 2. Backend API Flow

#### Step 1: DICOM File Discovery
**Endpoint**: `/api/dicom/process/:patient_id/:filename`

**File Search Logic** (`findDicomFile` function):
```javascript
// Fallback filenames की priority order:
const possibleFilenames = [
  requestedFilename,    // User द्वारा requested filename
  '0002.DCM',          // Common DICOM filename
  '1234.DCM',          // Alternative common filename
  '0020.DCM',          // Another common pattern
  'image.dcm',         // Generic DICOM name
  'study.dcm'          // Study-level DICOM
];
```

#### Step 2: Python DICOM Processing
**Script**: `server/utils/dicomHelper.py`

**Key Functions**:
1. **Slice Detection**: `detect_slice_count(pixel_array, dicom_dataset)`
   - Multi-frame 3D: `[slices, height, width]`
   - Multi-frame 4D: `[time, slices, height, width]`
   - Single slice: `[height, width]`

2. **Format Conversion**: `convert_to_image(pixel_array, output_format='PNG')`
   - DICOM pixel data → PIL Image
   - Windowing और contrast adjustment
   - Base64 encoding for web transfer

3. **Metadata Extraction**:
   ```python
   metadata = {
       'total_slices': total_slices,
       'is_multi_slice': total_slices > 1,
       'slice_detection_method': detected_slices['detection_method'],
       'slice_type': slice_type,
       'auto_detected': True,
       'dimensions': [width, height, depth],
       'spacing': [pixel_spacing_x, pixel_spacing_y, slice_thickness],
       'window_width': window_width,
       'window_center': window_center
   }
   ```

### 3. Frontend Loading Flow

#### Step 1: DICOM Service Initialization
**File**: `client/src/services/dicomService.ts`

```typescript
// Cornerstone3D और tools initialization
await csRenderingInit();
await csToolsInit();

// DICOM image loader configuration
dicomImageLoader.init({
  maxWebWorkers: Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)),
});
```

#### Step 2: VTK DICOM Loader
**File**: `client/src/services/vtkDicomLoader.ts`

**Loading Process**:
1. **Auto-detection**: `/api/dicom/process/${patientId}/${fileName}?auto_detect=true`
2. **Slice Loading**: Multiple calls to `/api/dicom/process/${patientId}/${fileName}?frame=${sliceIndex}`
3. **Format Conversion**: Base64 image → Canvas → Pixel data → VTK volume

**Key Conversion Logic**:
```typescript
// Base64 image को pixel data में convert करना
private async extractPixelDataFromImage(base64ImageData: string, metadata: DicomMetadata): Promise<Int16Array> {
  // Image element create करना
  const img = new Image();
  img.src = base64ImageData;
  
  // Canvas पर draw करना
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // RGBA data को grayscale में convert करना
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgbaData = imageData.data;
  
  // Hounsfield units में conversion
  for (let i = 0; i < pixelData.length; i++) {
    const gray = 0.299 * R + 0.587 * G + 0.114 * B;
    let hounsfield = gray * metadata.rescaleSlope + metadata.rescaleIntercept;
    pixelData[i] = Math.max(-32768, Math.min(32767, hounsfield));
  }
}
```

#### Step 3: VTK Volume Creation
**File**: `client/src/services/vtkEnhancedService.ts`

```typescript
// VTK ImageData creation
const imageData = vtkImageData.newInstance();
imageData.setDimensions([width, height, depth]);
imageData.setSpacing([spacingX, spacingY, spacingZ]);
imageData.setOrigin([originX, originY, originZ]);

// Scalar data array
const dataArray = vtkDataArray.newInstance({
  name: 'scalars',
  values: scalarData, // Int16Array from DICOM
  numberOfComponents: 1
});
imageData.getPointData().setScalars(dataArray);
```

### 4. Unified DICOM Viewer Integration

#### Step 1: Service Selection
**File**: `client/src/components/DICOM/unifieddicomviewer.tsx`

```typescript
// VTK service availability check
const vtkSvc = vtkEnhancedService || vtkService;
if (vtkSvc && viewportEl) {
  // Single image के लिए
  if (!isVolume && typeof vtkSvc.renderImageInViewport === 'function') {
    await vtkSvc.renderImageInViewport(viewportEl, payload);
  }
  
  // Volume rendering के लिए
  if (isVolume && typeof vtkSvc.renderVolumeFromSlices === 'function') {
    await vtkSvc.renderVolumeFromSlices(viewportEl, { slices: slicesPayload });
  }
}
```

#### Step 2: Fallback Rendering
```typescript
// Canvas fallback अगर VTK fail हो जाए
if (firstImg.canvas instanceof HTMLCanvasElement) {
  const canvas = firstImg.canvas;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.objectFit = 'contain';
  containerRef.current?.appendChild(canvas);
}
```

### 5. Debug Points और Common Issues

#### Issue 1: "Unfiled" Format Matching
**Problem**: DICOM files में proper metadata नहीं है
**Solution**: 
- Fallback filename patterns use करें
- Auto-detection enable करें
- Metadata validation add करें

#### Issue 2: VTK Format Mismatch
**Problem**: DICOM pixel data VTK format के साथ compatible नहीं है
**Solution**:
- Proper data type conversion (Int16Array)
- Correct dimensions और spacing
- Hounsfield units conversion

#### Issue 3: Slice Display Issues
**Problem**: Slices properly display नहीं हो रहे
**Debug Steps**:
1. Backend API response check करें
2. Python script output verify करें
3. VTK volume data validate करें
4. Rendering pipeline debug करें

### 6. Testing और Debugging Commands

```bash
# Backend DICOM processing test
curl "http://localhost:5000/api/dicom/process/PAT001/0002.DCM?auto_detect=true"

# Specific slice request
curl "http://localhost:5000/api/dicom/process/PAT001/0002.DCM?frame=0"

# Python script direct test
python server/utils/dicomHelper.py extract_slices "path/to/file.dcm" PNG 0
```

### 7. Performance Optimization

1. **Progressive Loading**: Slices को batch में load करें
2. **Caching**: Processed slices को cache करें  
3. **WebWorkers**: Heavy processing को background में करें
4. **Memory Management**: Large volumes के लिए LOD (Level of Detail) use करें

### 8. Error Handling

```typescript
// Circuit breaker pattern
if (this.isCircuitBreakerOpen(imageId)) {
  throw new Error('Circuit breaker is open for this image');
}

// Fallback strategies
try {
  return await this.loadWithVTK(imageId, options);
} catch (vtkError) {
  console.warn('VTK loading failed, trying Cornerstone3D');
  return await this.loadWithCornerstone(imageId, options);
}
```

यह complete flow आपको DICOM files से actual slices display तक का पूरा process समझाता है।