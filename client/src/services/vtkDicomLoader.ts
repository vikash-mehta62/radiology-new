/**
 * VTK.js DICOM Data Loader
 * Converts DICOM data to VTK.js compatible format for 3D rendering
 */

import { VTKVolumeData } from './vtkService';

export interface DicomMetadata {
  patientId: string;
  studyId: string;
  seriesId: string;
  modality: string;
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  windowWidth: number;
  windowCenter: number;
  pixelRepresentation: number;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  rescaleIntercept: number;
  rescaleSlope: number;
}

export interface DicomSliceData {
  imageData: string; // Base64 encoded image data
  sliceIndex: number;
  pixelData?: ArrayBuffer;
  metadata: DicomMetadata;
}

export class VTKDicomLoader {
  private loadedSlices: Map<number, DicomSliceData> = new Map();
  private metadata: DicomMetadata | null = null;

  /**
   * Load DICOM slices from the backend API
   */
  public async loadDicomSeries(
    patientId: string,
    fileName: string,
    totalSlices: number
  ): Promise<VTKVolumeData> {
    console.log(`📥 [VTKDicomLoader] Loading DICOM series: ${patientId}/${fileName} (${totalSlices} slices)`);

    try {
      // Load all slices
      const slicePromises: Promise<DicomSliceData>[] = [];
      
      for (let i = 0; i < totalSlices; i++) {
        slicePromises.push(this.loadDicomSlice(patientId, fileName, i));
      }

      const slices = await Promise.all(slicePromises);
      
      // Store loaded slices
      slices.forEach(slice => {
        this.loadedSlices.set(slice.sliceIndex, slice);
      });

      // Extract metadata from first slice
      if (slices.length > 0) {
        this.metadata = slices[0].metadata;
      }

      // Convert to VTK volume data
      const volumeData = await this.convertToVTKVolumeData(slices);
      
      console.log('✅ [VTKDicomLoader] DICOM series loaded successfully');
      return volumeData;
      
    } catch (error) {
      console.error('❌ [VTKDicomLoader] Failed to load DICOM series:', error);
      throw error;
    }
  }

  /**
   * Load a single DICOM slice from the backend
   */
  private async loadDicomSlice(
    patientId: string,
    fileName: string,
    sliceIndex: number
  ): Promise<DicomSliceData> {
    const url = `/api/dicom/process/${patientId}/${fileName}?frame=${sliceIndex}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load slice ${sliceIndex}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Backend error loading slice ${sliceIndex}: ${data.error || 'Unknown error'}`);
      }

      // Extract metadata from the response
      const metadata: DicomMetadata = {
        patientId,
        studyId: data.metadata?.StudyInstanceUID || '',
        seriesId: data.metadata?.SeriesInstanceUID || '',
        modality: data.metadata?.Modality || 'CT',
        dimensions: [
          data.metadata?.Columns || 512,
          data.metadata?.Rows || 512,
          data.total_slices || 1
        ],
        spacing: [
          parseFloat(data.metadata?.PixelSpacing?.[0]) || 1.0,
          parseFloat(data.metadata?.PixelSpacing?.[1]) || 1.0,
          parseFloat(data.metadata?.SliceThickness) || 1.0
        ],
        origin: [0, 0, 0], // Will be calculated from ImagePositionPatient if available
        windowWidth: parseFloat(data.metadata?.WindowWidth) || 400,
        windowCenter: parseFloat(data.metadata?.WindowCenter) || 40,
        pixelRepresentation: parseInt(data.metadata?.PixelRepresentation) || 0,
        bitsAllocated: parseInt(data.metadata?.BitsAllocated) || 16,
        bitsStored: parseInt(data.metadata?.BitsStored) || 16,
        highBit: parseInt(data.metadata?.HighBit) || 15,
        rescaleIntercept: parseFloat(data.metadata?.RescaleIntercept) || 0,
        rescaleSlope: parseFloat(data.metadata?.RescaleSlope) || 1
      };

      return {
        imageData: data.image_data,
        sliceIndex,
        metadata
      };
      
    } catch (error) {
      console.error(`❌ [VTKDicomLoader] Failed to load slice ${sliceIndex}:`, error);
      throw error;
    }
  }

  /**
   * Convert DICOM slices to VTK volume data
   */
  private async convertToVTKVolumeData(slices: DicomSliceData[]): Promise<VTKVolumeData> {
    if (slices.length === 0 || !this.metadata) {
      throw new Error('No DICOM slices loaded or metadata missing');
    }

    console.log('🔄 [VTKDicomLoader] Converting DICOM slices to VTK volume data');

    const metadata = this.metadata;
    const dimensions: [number, number, number] = [
      metadata.dimensions[0], // width
      metadata.dimensions[1], // height
      slices.length // depth (number of slices)
    ];

    // Calculate total number of voxels
    const totalVoxels = dimensions[0] * dimensions[1] * dimensions[2];
    
    // Create typed array for scalar data
    const scalarData = new Int16Array(totalVoxels);

    // Process each slice
    for (let sliceIndex = 0; sliceIndex < slices.length; sliceIndex++) {
      const slice = slices[sliceIndex];
      
      try {
        // Convert base64 image data to pixel values
        const pixelData = await this.extractPixelDataFromImage(slice.imageData, metadata);
        
        // Copy pixel data to the volume array
        const sliceOffset = sliceIndex * dimensions[0] * dimensions[1];
        scalarData.set(pixelData, sliceOffset);
        
      } catch (error) {
        console.warn(`⚠️ [VTKDicomLoader] Failed to process slice ${sliceIndex}:`, error);
        // Fill with zeros for missing slices
        const sliceOffset = sliceIndex * dimensions[0] * dimensions[1];
        const sliceSize = dimensions[0] * dimensions[1];
        scalarData.fill(0, sliceOffset, sliceOffset + sliceSize);
      }
    }

    // Calculate data range from scalar data
    let minValue = Number.MAX_VALUE;
    let maxValue = Number.MIN_VALUE;
    
    for (let i = 0; i < scalarData.length; i++) {
      const value = scalarData[i];
      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    }

    const volumeData: VTKVolumeData = {
      dimensions,
      spacing: metadata.spacing,
      origin: metadata.origin,
      scalarData,
      scalarType: 'Int16Array',
      dataRange: [minValue, maxValue]
    };

    console.log('✅ [VTKDicomLoader] VTK volume data conversion completed');
    console.log(`📊 [VTKDicomLoader] Volume dimensions: ${dimensions.join('x')}`);
    console.log(`📏 [VTKDicomLoader] Volume spacing: ${metadata.spacing.join('x')}`);
    
    return volumeData;
  }

  /**
   * Extract pixel data from base64 image data
   */
  private async extractPixelDataFromImage(
    base64ImageData: string,
    metadata: DicomMetadata
  ): Promise<Int16Array> {
    return new Promise((resolve, reject) => {
      // Create an image element to decode the base64 data
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create canvas to extract pixel data
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = metadata.dimensions[0];
          canvas.height = metadata.dimensions[1];
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const rgbaData = imageData.data;
          
          // Convert RGBA to grayscale and apply DICOM transformations
          const pixelData = new Int16Array(canvas.width * canvas.height);
          
          for (let i = 0; i < pixelData.length; i++) {
            const rgbaIndex = i * 4;
            
            // Convert to grayscale (using luminance formula)
            const gray = Math.round(
              0.299 * rgbaData[rgbaIndex] +     // R
              0.587 * rgbaData[rgbaIndex + 1] + // G
              0.114 * rgbaData[rgbaIndex + 2]   // B
            );
            
            // Apply DICOM rescale slope and intercept
            let hounsfield = gray * metadata.rescaleSlope + metadata.rescaleIntercept;
            
            // Clamp to valid range for Int16
            hounsfield = Math.max(-32768, Math.min(32767, hounsfield));
            
            pixelData[i] = hounsfield;
          }
          
          resolve(pixelData);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image data'));
      };
      
      // Set image source
      img.src = base64ImageData.startsWith('data:') ? base64ImageData : `data:image/png;base64,${base64ImageData}`;
    });
  }

  /**
   * Get loaded DICOM metadata
   */
  public getMetadata(): DicomMetadata | null {
    return this.metadata;
  }

  /**
   * Get loaded slice data
   */
  public getSliceData(sliceIndex: number): DicomSliceData | undefined {
    return this.loadedSlices.get(sliceIndex);
  }

  /**
   * Clear loaded data
   */
  public clear(): void {
    this.loadedSlices.clear();
    this.metadata = null;
  }

  /**
   * Load DICOM data with auto-detection
   */
  public async loadDicomWithAutoDetection(
    patientId: string,
    fileName: string
  ): Promise<VTKVolumeData> {
    console.log(`🔍 [VTKDicomLoader] Auto-detecting DICOM slices for ${patientId}/${fileName}`);

    try {
      // First, call the auto-detection endpoint
      const url = `/api/dicom/process/${patientId}/${fileName}?auto_detect=true`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Auto-detection failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Backend error during auto-detection: ${data.error || 'Unknown error'}`);
      }

      const totalSlices = data.total_slices || data.auto_detection_info?.total_slices || 1;
      
      console.log(`📊 [VTKDicomLoader] Auto-detected ${totalSlices} slices`);
      
      // Load the full series
      return await this.loadDicomSeries(patientId, fileName, totalSlices);
      
    } catch (error) {
      console.error('❌ [VTKDicomLoader] Auto-detection failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const vtkDicomLoader = new VTKDicomLoader();