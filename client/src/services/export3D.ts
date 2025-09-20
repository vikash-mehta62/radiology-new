/**
 * 3D Export Service
 * Handles exporting 3D visualizations in various formats
 */

import { VolumeData } from './volumeRenderingEngine';
import { MeasurementTool, ClippingPlane } from '../components/Interactive3DControls';

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'obj';
  resolution?: { width: number; height: number };
  quality?: number; // 0-1 for JPEG
  includeAnnotations?: boolean;
  includeMeasurements?: boolean;
  includeMetadata?: boolean;
}

export interface ExportMetadata {
  timestamp: string;
  volumeDimensions: { width: number; height: number; depth: number };
  volumeSpacing: { x: number; y: number; z: number };
  renderingSettings: any;
  measurements: MeasurementTool[];
  clippingPlanes: ClippingPlane[];
}

class Export3DService {
  /**
   * Export canvas as image
   */
  public async exportImage(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const { format, quality = 0.9 } = options;
        
        if (format === 'png') {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          }, 'image/png');
        } else if (format === 'jpg') {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create JPEG blob'));
            }
          }, 'image/jpeg', quality);
        } else {
          reject(new Error(`Unsupported image format: ${format}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export as PDF report
   */
  public async exportPDF(
    canvas: HTMLCanvasElement,
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<Blob> {
    // This is a simplified PDF export - in practice, you'd use a library like jsPDF
    const imageBlob = await this.exportImage(canvas, { ...options, format: 'png' });
    
    // Create a simple PDF-like structure (this is just a placeholder)
    // In a real implementation, you'd use jsPDF or similar library
    const pdfContent = this.createPDFContent(imageBlob, metadata, options);
    
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Export 3D model as OBJ
   */
  public async export3DModel(
    volumeData: VolumeData,
    clippingPlanes: ClippingPlane[],
    options: ExportOptions
  ): Promise<Blob> {
    const objContent = this.generateOBJContent(volumeData, clippingPlanes);
    return new Blob([objContent], { type: 'text/plain' });
  }

  /**
   * Create PDF content (simplified)
   */
  private createPDFContent(imageBlob: Blob, metadata: ExportMetadata, options: ExportOptions): string {
    // This is a placeholder - use a proper PDF library in production
    const content = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(3D Medical Imaging Export) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF
    `;
    
    return content;
  }

  /**
   * Generate OBJ file content from volume data
   */
  private generateOBJContent(volumeData: VolumeData, clippingPlanes: ClippingPlane[]): string {
    const { width, height, depth } = volumeData.dimensions;
    const { x: sx, y: sy, z: sz } = volumeData.spacing;
    
    let objContent = '# 3D Medical Volume Export\n';
    objContent += `# Generated on ${new Date().toISOString()}\n`;
    objContent += `# Volume dimensions: ${width}x${height}x${depth}\n`;
    objContent += `# Spacing: ${sx}x${sy}x${sz}\n\n`;

    // Generate vertices using marching cubes algorithm (simplified)
    const vertices: { x: number; y: number; z: number }[] = [];
    const faces: number[][] = [];
    
    const threshold = (volumeData.minValue + volumeData.maxValue) / 2;
    
    // Simplified isosurface extraction
    for (let z = 0; z < depth - 1; z++) {
      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
          // Sample 8 corners of the cube
          const values = [
            this.getVoxelValue(volumeData, x, y, z),
            this.getVoxelValue(volumeData, x + 1, y, z),
            this.getVoxelValue(volumeData, x + 1, y + 1, z),
            this.getVoxelValue(volumeData, x, y + 1, z),
            this.getVoxelValue(volumeData, x, y, z + 1),
            this.getVoxelValue(volumeData, x + 1, y, z + 1),
            this.getVoxelValue(volumeData, x + 1, y + 1, z + 1),
            this.getVoxelValue(volumeData, x, y + 1, z + 1)
          ];

          // Check if surface passes through this cube
          const hasPositive = values.some(v => v > threshold);
          const hasNegative = values.some(v => v <= threshold);
          
          if (hasPositive && hasNegative) {
            // Add vertices for this cube (simplified - just add cube corners)
            const baseIndex = vertices.length;
            
            vertices.push(
              { x: x * sx, y: y * sy, z: z * sz },
              { x: (x + 1) * sx, y: y * sy, z: z * sz },
              { x: (x + 1) * sx, y: (y + 1) * sy, z: z * sz },
              { x: x * sx, y: (y + 1) * sy, z: z * sz },
              { x: x * sx, y: y * sy, z: (z + 1) * sz },
              { x: (x + 1) * sx, y: y * sy, z: (z + 1) * sz },
              { x: (x + 1) * sx, y: (y + 1) * sy, z: (z + 1) * sz },
              { x: x * sx, y: (y + 1) * sy, z: (z + 1) * sz }
            );

            // Add faces (simplified cube faces)
            faces.push(
              [baseIndex + 1, baseIndex + 2, baseIndex + 3, baseIndex + 4], // bottom
              [baseIndex + 5, baseIndex + 8, baseIndex + 7, baseIndex + 6], // top
              [baseIndex + 1, baseIndex + 5, baseIndex + 6, baseIndex + 2], // front
              [baseIndex + 3, baseIndex + 7, baseIndex + 8, baseIndex + 4], // back
              [baseIndex + 2, baseIndex + 6, baseIndex + 7, baseIndex + 3], // right
              [baseIndex + 4, baseIndex + 8, baseIndex + 5, baseIndex + 1]  // left
            );
          }
        }
      }
    }

    // Write vertices
    vertices.forEach(vertex => {
      objContent += `v ${vertex.x.toFixed(6)} ${vertex.y.toFixed(6)} ${vertex.z.toFixed(6)}\n`;
    });

    objContent += '\n';

    // Write faces
    faces.forEach(face => {
      objContent += `f ${face.join(' ')}\n`;
    });

    return objContent;
  }

  /**
   * Get voxel value at specific coordinates
   */
  private getVoxelValue(volumeData: VolumeData, x: number, y: number, z: number): number {
    const { width, height, depth } = volumeData.dimensions;
    
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) {
      return 0;
    }

    const index = z * width * height + y * width + x;
    
    if (volumeData.dataType === 'uint8') {
      return (volumeData.data as Uint8Array)[index] || 0;
    } else if (volumeData.dataType === 'uint16') {
      return (volumeData.data as Uint16Array)[index] || 0;
    } else {
      return (volumeData.data as Float32Array)[index] || 0;
    }
  }

  /**
   * Download blob as file
   */
  public downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get appropriate filename for export
   */
  public getExportFilename(format: string, prefix: string = '3d-export'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${timestamp}.${format}`;
  }

  /**
   * Export with automatic filename and download
   */
  public async exportAndDownload(
    canvas: HTMLCanvasElement,
    volumeData: VolumeData | null,
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    try {
      let blob: Blob;
      let filename: string;

      switch (options.format) {
        case 'png':
        case 'jpg':
          blob = await this.exportImage(canvas, options);
          filename = this.getExportFilename(options.format, 'volume-render');
          break;
          
        case 'pdf':
          blob = await this.exportPDF(canvas, metadata, options);
          filename = this.getExportFilename('pdf', 'volume-report');
          break;
          
        case 'obj':
          if (!volumeData) {
            throw new Error('Volume data required for 3D model export');
          }
          blob = await this.export3DModel(volumeData, metadata.clippingPlanes, options);
          filename = this.getExportFilename('obj', 'volume-model');
          break;
          
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      this.downloadBlob(blob, filename);
      console.log(`🎯 [Export3DService] Successfully exported ${options.format.toUpperCase()}: ${filename}`);
      
    } catch (error) {
      console.error('🎯 [Export3DService] Export failed:', error);
      throw error;
    }
  }

  /**
   * Create export metadata from current state
   */
  public createExportMetadata(
    volumeData: VolumeData | null,
    measurements: MeasurementTool[],
    clippingPlanes: ClippingPlane[],
    renderingSettings: any
  ): ExportMetadata {
    return {
      timestamp: new Date().toISOString(),
      volumeDimensions: volumeData?.dimensions || { width: 0, height: 0, depth: 0 },
      volumeSpacing: volumeData?.spacing || { x: 1, y: 1, z: 1 },
      renderingSettings,
      measurements,
      clippingPlanes
    };
  }
}

export { Export3DService };