/**
 * ITK-WASM Service for Advanced Medical Image Processing
 * Provides high-performance image processing capabilities using ITK-WASM
 */

import { readImage } from '@itk-wasm/image-io';
import { readImageDicomFileSeries } from '@itk-wasm/dicom';
import { readDicomTags, readDicomEncapsulatedPdf } from '@itk-wasm/dicom';

interface ImageProcessingOptions {
  normalize: boolean;
  resample: boolean;
  targetSpacing?: [number, number, number];
  outputType?: 'uint8' | 'uint16' | 'float32';
  smoothing?: boolean;
  smoothingIterations?: number;
}

interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  modality?: string;
  seriesDescription?: string;
  imagePosition?: [number, number, number];
  imageOrientation?: [number, number, number, number, number, number];
  pixelSpacing?: [number, number];
  sliceThickness?: number;
  windowCenter?: number;
  windowWidth?: number;
}

interface ProcessedImage {
  data: ArrayBuffer;
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  direction: number[];
  metadata: DicomMetadata;
}

class ITKWasmService {
  private initialized = false;
  private processingQueue: Map<string, Promise<ProcessedImage>> = new Map();

  async initialize(): Promise<boolean> {
    try {
      // ITK-WASM is ready to use after import
      this.initialized = true;
      console.log('✅ ITK-WASM Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize ITK-WASM Service:', error);
      return false;
    }
  }

  async processDicomSeries(
    files: File[],
    options: ImageProcessingOptions = { normalize: true, resample: false }
  ): Promise<ProcessedImage> {
    if (!this.initialized) {
      throw new Error('ITK-WASM Service not initialized');
    }

    const cacheKey = this.generateCacheKey(files, options);
    
    // Check if already processing
    if (this.processingQueue.has(cacheKey)) {
      return this.processingQueue.get(cacheKey)!;
    }

    const processingPromise = this.performDicomSeriesProcessing(files, options);
    this.processingQueue.set(cacheKey, processingPromise);

    try {
      const result = await processingPromise;
      this.processingQueue.delete(cacheKey);
      return result;
    } catch (error) {
      this.processingQueue.delete(cacheKey);
      throw error;
    }
  }

  private async performDicomSeriesProcessing(
    files: File[],
    options: ImageProcessingOptions
  ): Promise<ProcessedImage> {
    try {
      // Convert files to array buffers
      const fileBuffers = await Promise.all(
        files.map(file => file.arrayBuffer())
      );

      // Read DICOM series using ITK-WASM
      const { outputImage, webWorkerPool, sortedFilenames } = await readImageDicomFileSeries({
        inputImages: fileBuffers.map((buffer, index) => ({
          data: new Uint8Array(buffer),
          path: `image_${index}.dcm`
        }))
      });

      // Clean up web worker
        if (webWorkerPool) {
          webWorkerPool.terminateWorkers();
        }

      // Extract metadata from the first file
      const metadata = await this.extractDicomMetadata(files[0]);

      // Process the image based on options
      const processedImage = await this.applyImageProcessing(outputImage, options);

      return {
        data: processedImage.data.buffer,
        dimensions: processedImage.size as [number, number, number],
        spacing: processedImage.spacing as [number, number, number],
        origin: processedImage.origin as [number, number, number],
        direction: Array.from(processedImage.direction),
        metadata
      };
    } catch (error) {
      console.error('Failed to process DICOM series:', error);
      throw new Error(`DICOM series processing failed: ${error}`);
    }
  }

  async processSingleDicomFile(
    file: File,
    options: ImageProcessingOptions = { normalize: true, resample: false }
  ): Promise<ProcessedImage> {
    if (!this.initialized) {
      throw new Error('ITK-WASM Service not initialized');
    }

    try {
      const buffer = await file.arrayBuffer();
      
      // Read single DICOM file
      const { image, webWorker } = await readImage({
        data: new Uint8Array(buffer),
        path: file.name
      });

      // Clean up web worker
        if (webWorker) {
          webWorker.terminate();
        }

      // Extract metadata
      const metadata = await this.extractDicomMetadata(file);

      // Process the image
      const processedImage = await this.applyImageProcessing(image, options);

      return {
        data: processedImage.data.buffer,
        dimensions: processedImage.size as [number, number, number],
        spacing: processedImage.spacing as [number, number, number],
        origin: processedImage.origin as [number, number, number],
        direction: Array.from(processedImage.direction),
        metadata
      };
    } catch (error) {
      console.error('Failed to process single DICOM file:', error);
      throw new Error(`DICOM file processing failed: ${error}`);
    }
  }

  private async extractDicomMetadata(file: File): Promise<DicomMetadata> {
    try {
      const buffer = await file.arrayBuffer();
      
      const { tags, webWorker } = await readDicomTags({
        data: new Uint8Array(buffer),
        path: file.name
      });

      // Clean up web worker
      webWorker.terminate();

      // Extract common DICOM tags
      const metadata: DicomMetadata = {
        patientName: tags['0010|0010']?.value,
        patientId: tags['0010|0020']?.value,
        studyDate: tags['0008|0020']?.value,
        modality: tags['0008|0060']?.value,
        seriesDescription: tags['0008|103e']?.value,
        windowCenter: tags['0028|1050'] ? parseFloat(tags['0028|1050'].value) : undefined,
        windowWidth: tags['0028|1051'] ? parseFloat(tags['0028|1051'].value) : undefined
      };

      // Parse image position and orientation
      if (tags['0020|0032']?.value) {
        const position = tags['0020|0032'].value.split('\\').map(parseFloat);
        metadata.imagePosition = position as [number, number, number];
      }

      if (tags['0020|0037']?.value) {
        const orientation = tags['0020|0037'].value.split('\\').map(parseFloat);
        metadata.imageOrientation = orientation as [number, number, number, number, number, number];
      }

      if (tags['0028|0030']?.value) {
        const spacing = tags['0028|0030'].value.split('\\').map(parseFloat);
        metadata.pixelSpacing = spacing as [number, number];
      }

      if (tags['0018|0050']?.value) {
        metadata.sliceThickness = parseFloat(tags['0018|0050'].value);
      }

      return metadata;
    } catch (error) {
      console.error('Failed to extract DICOM metadata:', error);
      return {};
    }
  }

  private async applyImageProcessing(image: any, options: ImageProcessingOptions): Promise<any> {
    let processedImage = image;

    try {
      // Apply normalization if requested
      if (options.normalize) {
        processedImage = await this.normalizeImage(processedImage);
      }

      // Apply resampling if requested
      if (options.resample && options.targetSpacing) {
        processedImage = await this.resampleImage(processedImage, options.targetSpacing);
      }

      // Apply smoothing if requested
      if (options.smoothing) {
        processedImage = await this.smoothImage(processedImage, options.smoothingIterations || 3);
      }

      // Convert output type if specified
      if (options.outputType) {
        processedImage = await this.convertImageType(processedImage, options.outputType);
      }

      return processedImage;
    } catch (error) {
      console.error('Failed to apply image processing:', error);
      throw error;
    }
  }

  private async normalizeImage(image: any): Promise<any> {
    // Normalize image intensity values to 0-1 range
    const data = image.data;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range > 0) {
      for (let i = 0; i < data.length; i++) {
        data[i] = (data[i] - min) / range;
      }
    }

    return image;
  }

  private async resampleImage(image: any, targetSpacing: [number, number, number]): Promise<any> {
    // This would typically use ITK-WASM resampling filters
    // For now, return the original image
    console.log('Resampling to spacing:', targetSpacing);
    return image;
  }

  private async smoothImage(image: any, iterations: number): Promise<any> {
    // This would typically use ITK-WASM smoothing filters
    // For now, return the original image
    console.log('Applying smoothing with iterations:', iterations);
    return image;
  }

  private async convertImageType(image: any, outputType: string): Promise<any> {
    // This would typically use ITK-WASM type conversion
    // For now, return the original image
    console.log('Converting to type:', outputType);
    return image;
  }

  async extractEncapsulatedPdf(file: File): Promise<Uint8Array | null> {
    try {
      const buffer = await file.arrayBuffer();
      
      const { pdfBinaryOutput, webWorker } = await readDicomEncapsulatedPdf({
        data: new Uint8Array(buffer),
        path: file.name
      });

      // Clean up web worker
      webWorker.terminate();

      return pdfBinaryOutput;
    } catch (error) {
      console.error('Failed to extract encapsulated PDF:', error);
      return null;
    }
  }

  private generateCacheKey(files: File[], options: ImageProcessingOptions): string {
    const fileHashes = files.map(f => `${f.name}_${f.size}_${f.lastModified}`).join('|');
    const optionsHash = JSON.stringify(options);
    return `${fileHashes}_${optionsHash}`;
  }

  getProcessingQueueSize(): number {
    return this.processingQueue.size;
  }

  clearProcessingQueue(): void {
    this.processingQueue.clear();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.clearProcessingQueue();
    this.initialized = false;
    console.log('✅ ITK-WASM Service disposed');
  }
}

export const itkWasmService = new ITKWasmService();
export default itkWasmService;