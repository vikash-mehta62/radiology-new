/**
 * Curved Multiplanar Reconstruction (Curved MPR) Service
 * Provides advanced curved plane reconstruction for complex anatomical structures
 */

import { VolumeData } from './volumeRenderingEngine';

export interface CurvedPath {
  points: { x: number; y: number; z: number }[];
  thickness: number;
  resolution: number;
  name: string;
}

export interface CurvedMPRResult {
  imageData: ImageData;
  pathLength: number;
  samplingPoints: { x: number; y: number; z: number }[];
  normals: { x: number; y: number; z: number }[];
}

export interface CurvedMPROptions {
  interpolationMode: 'nearest' | 'linear' | 'cubic';
  outputWidth: number;
  outputHeight: number;
  thickness: number;
  smoothingFactor: number;
}

class CurvedMPRService {
  private volumeData: VolumeData | null = null;

  /**
   * Set volume data for curved MPR processing
   */
  public setVolumeData(volumeData: VolumeData): void {
    this.volumeData = volumeData;
  }

  /**
   * Sample volume data at specific coordinates with interpolation
   */
  private sampleVolume(x: number, y: number, z: number, interpolationMode: 'nearest' | 'linear' | 'cubic' = 'linear'): number {
    if (!this.volumeData) return 0;

    const { width, height, depth } = this.volumeData.dimensions;
    
    // Clamp coordinates
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    z = Math.max(0, Math.min(1, z));

    // Convert to voxel coordinates
    const vx = x * (width - 1);
    const vy = y * (height - 1);
    const vz = z * (depth - 1);

    if (interpolationMode === 'nearest') {
      return this.nearestNeighborSample(vx, vy, vz);
    } else if (interpolationMode === 'linear') {
      return this.trilinearSample(vx, vy, vz);
    } else {
      return this.tricubicSample(vx, vy, vz);
    }
  }

  /**
   * Nearest neighbor sampling
   */
  private nearestNeighborSample(vx: number, vy: number, vz: number): number {
    if (!this.volumeData) return 0;

    const { width, height } = this.volumeData.dimensions;
    const ix = Math.round(vx);
    const iy = Math.round(vy);
    const iz = Math.round(vz);
    
    const index = iz * width * height + iy * width + ix;
    
    if (this.volumeData.dataType === 'uint8') {
      return (this.volumeData.data as Uint8Array)[index] || 0;
    } else if (this.volumeData.dataType === 'uint16') {
      return (this.volumeData.data as Uint16Array)[index] || 0;
    } else {
      return (this.volumeData.data as Float32Array)[index] || 0;
    }
  }

  /**
   * Trilinear interpolation sampling
   */
  private trilinearSample(vx: number, vy: number, vz: number): number {
    if (!this.volumeData) return 0;

    const { width, height, depth } = this.volumeData.dimensions;
    
    const x0 = Math.floor(vx);
    const y0 = Math.floor(vy);
    const z0 = Math.floor(vz);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const z1 = Math.min(z0 + 1, depth - 1);

    const fx = vx - x0;
    const fy = vy - y0;
    const fz = vz - z0;

    // Sample 8 neighboring voxels
    const getValue = (ix: number, iy: number, iz: number): number => {
      const index = iz * width * height + iy * width + ix;
      if (this.volumeData!.dataType === 'uint8') {
        return (this.volumeData!.data as Uint8Array)[index] || 0;
      } else if (this.volumeData!.dataType === 'uint16') {
        return (this.volumeData!.data as Uint16Array)[index] || 0;
      } else {
        return (this.volumeData!.data as Float32Array)[index] || 0;
      }
    };

    const c000 = getValue(x0, y0, z0);
    const c001 = getValue(x0, y0, z1);
    const c010 = getValue(x0, y1, z0);
    const c011 = getValue(x0, y1, z1);
    const c100 = getValue(x1, y0, z0);
    const c101 = getValue(x1, y0, z1);
    const c110 = getValue(x1, y1, z0);
    const c111 = getValue(x1, y1, z1);

    // Trilinear interpolation
    const c00 = c000 * (1 - fx) + c100 * fx;
    const c01 = c001 * (1 - fx) + c101 * fx;
    const c10 = c010 * (1 - fx) + c110 * fx;
    const c11 = c011 * (1 - fx) + c111 * fx;

    const c0 = c00 * (1 - fy) + c10 * fy;
    const c1 = c01 * (1 - fy) + c11 * fy;

    return c0 * (1 - fz) + c1 * fz;
  }

  /**
   * Tricubic interpolation sampling (simplified version)
   */
  private tricubicSample(vx: number, vy: number, vz: number): number {
    // For simplicity, fall back to trilinear for now
    // A full tricubic implementation would require 64 sample points
    return this.trilinearSample(vx, vy, vz);
  }

  /**
   * Calculate path length and create uniform sampling points
   */
  private createUniformPath(points: { x: number; y: number; z: number }[], resolution: number): {
    samplingPoints: { x: number; y: number; z: number }[];
    pathLength: number;
  } {
    if (points.length < 2) {
      return { samplingPoints: [], pathLength: 0 };
    }

    // Calculate cumulative distances
    const distances: number[] = [0];
    let totalLength = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dz = points[i].z - points[i - 1].z;
      const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalLength += segmentLength;
      distances.push(totalLength);
    }

    // Create uniform sampling points
    const samplingPoints: { x: number; y: number; z: number }[] = [];
    const stepSize = totalLength / (resolution - 1);

    for (let i = 0; i < resolution; i++) {
      const targetDistance = i * stepSize;
      
      // Find the segment containing this distance
      let segmentIndex = 0;
      for (let j = 1; j < distances.length; j++) {
        if (distances[j] >= targetDistance) {
          segmentIndex = j - 1;
          break;
        }
      }

      if (segmentIndex >= points.length - 1) {
        samplingPoints.push({ ...points[points.length - 1] });
        continue;
      }

      // Interpolate within the segment
      const segmentStart = distances[segmentIndex];
      const segmentEnd = distances[segmentIndex + 1];
      const segmentLength = segmentEnd - segmentStart;
      
      if (segmentLength === 0) {
        samplingPoints.push({ ...points[segmentIndex] });
        continue;
      }

      const t = (targetDistance - segmentStart) / segmentLength;
      const p1 = points[segmentIndex];
      const p2 = points[segmentIndex + 1];

      samplingPoints.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
        z: p1.z + t * (p2.z - p1.z)
      });
    }

    return { samplingPoints, pathLength: totalLength };
  }

  /**
   * Calculate normal vectors for each point along the path
   */
  private calculateNormals(samplingPoints: { x: number; y: number; z: number }[]): { x: number; y: number; z: number }[] {
    const normals: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < samplingPoints.length; i++) {
      let tangent: { x: number; y: number; z: number };

      if (i === 0) {
        // First point: use forward difference
        tangent = {
          x: samplingPoints[1].x - samplingPoints[0].x,
          y: samplingPoints[1].y - samplingPoints[0].y,
          z: samplingPoints[1].z - samplingPoints[0].z
        };
      } else if (i === samplingPoints.length - 1) {
        // Last point: use backward difference
        tangent = {
          x: samplingPoints[i].x - samplingPoints[i - 1].x,
          y: samplingPoints[i].y - samplingPoints[i - 1].y,
          z: samplingPoints[i].z - samplingPoints[i - 1].z
        };
      } else {
        // Middle points: use central difference
        tangent = {
          x: samplingPoints[i + 1].x - samplingPoints[i - 1].x,
          y: samplingPoints[i + 1].y - samplingPoints[i - 1].y,
          z: samplingPoints[i + 1].z - samplingPoints[i - 1].z
        };
      }

      // Normalize tangent
      const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z);
      if (length > 0) {
        tangent.x /= length;
        tangent.y /= length;
        tangent.z /= length;
      }

      // Calculate normal (perpendicular to tangent)
      // Use a reference vector to create a consistent normal
      let normal: { x: number; y: number; z: number };
      
      if (Math.abs(tangent.z) < 0.9) {
        // Cross product with Z-axis
        normal = {
          x: tangent.y,
          y: -tangent.x,
          z: 0
        };
      } else {
        // Cross product with X-axis
        normal = {
          x: 0,
          y: tangent.z,
          z: -tangent.y
        };
      }

      // Normalize normal
      const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (normalLength > 0) {
        normal.x /= normalLength;
        normal.y /= normalLength;
        normal.z /= normalLength;
      }

      normals.push(normal);
    }

    return normals;
  }

  /**
   * Generate curved MPR reconstruction
   */
  public generateCurvedMPR(curvedPath: CurvedPath, options: CurvedMPROptions): CurvedMPRResult {
    if (!this.volumeData) {
      throw new Error('Volume data not set');
    }

    const { samplingPoints, pathLength } = this.createUniformPath(curvedPath.points, options.outputWidth);
    const normals = this.calculateNormals(samplingPoints);

    // Create output image
    const imageData = new ImageData(options.outputWidth, options.outputHeight);
    const data = imageData.data;

    // Generate curved MPR
    for (let x = 0; x < options.outputWidth; x++) {
      if (x >= samplingPoints.length) break;

      const centerPoint = samplingPoints[x];
      const normal = normals[x];
      
      // Calculate binormal (perpendicular to both tangent and normal)
      let tangent: { x: number; y: number; z: number };
      if (x < samplingPoints.length - 1) {
        tangent = {
          x: samplingPoints[x + 1].x - centerPoint.x,
          y: samplingPoints[x + 1].y - centerPoint.y,
          z: samplingPoints[x + 1].z - centerPoint.z
        };
      } else {
        tangent = {
          x: centerPoint.x - samplingPoints[x - 1].x,
          y: centerPoint.y - samplingPoints[x - 1].y,
          z: centerPoint.z - samplingPoints[x - 1].z
        };
      }

      // Normalize tangent
      const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z);
      if (tangentLength > 0) {
        tangent.x /= tangentLength;
        tangent.y /= tangentLength;
        tangent.z /= tangentLength;
      }

      // Calculate binormal (cross product of tangent and normal)
      const binormal = {
        x: tangent.y * normal.z - tangent.z * normal.y,
        y: tangent.z * normal.x - tangent.x * normal.z,
        z: tangent.x * normal.y - tangent.y * normal.x
      };

      // Sample along the thickness direction
      for (let y = 0; y < options.outputHeight; y++) {
        // Convert y coordinate to thickness offset [-thickness/2, thickness/2]
        const thicknessOffset = ((y / (options.outputHeight - 1)) - 0.5) * options.thickness;
        
        // Calculate sampling position
        const samplePos = {
          x: centerPoint.x + thicknessOffset * binormal.x,
          y: centerPoint.y + thicknessOffset * binormal.y,
          z: centerPoint.z + thicknessOffset * binormal.z
        };

        // Sample volume
        const value = this.sampleVolume(samplePos.x, samplePos.y, samplePos.z, options.interpolationMode);
        
        // Normalize value to [0, 255]
        const normalizedValue = Math.floor(
          ((value - this.volumeData.minValue) / (this.volumeData.maxValue - this.volumeData.minValue)) * 255
        );
        
        const pixelIndex = (y * options.outputWidth + x) * 4;
        data[pixelIndex] = normalizedValue;     // R
        data[pixelIndex + 1] = normalizedValue; // G
        data[pixelIndex + 2] = normalizedValue; // B
        data[pixelIndex + 3] = 255;             // A
      }
    }

    return {
      imageData,
      pathLength,
      samplingPoints,
      normals
    };
  }

  /**
   * Create a curved path from control points using spline interpolation
   */
  public createSplinePath(controlPoints: { x: number; y: number; z: number }[], resolution: number): { x: number; y: number; z: number }[] {
    if (controlPoints.length < 2) {
      return controlPoints;
    }

    const splinePoints: { x: number; y: number; z: number }[] = [];

    // Simple Catmull-Rom spline interpolation
    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1);
      const segmentLength = 1 / (controlPoints.length - 1);
      const segmentIndex = Math.floor(t / segmentLength);
      const localT = (t - segmentIndex * segmentLength) / segmentLength;

      if (segmentIndex >= controlPoints.length - 1) {
        splinePoints.push({ ...controlPoints[controlPoints.length - 1] });
        continue;
      }

      // Get control points for Catmull-Rom spline
      const p0 = controlPoints[Math.max(0, segmentIndex - 1)];
      const p1 = controlPoints[segmentIndex];
      const p2 = controlPoints[Math.min(controlPoints.length - 1, segmentIndex + 1)];
      const p3 = controlPoints[Math.min(controlPoints.length - 1, segmentIndex + 2)];

      // Catmull-Rom spline interpolation
      const t2 = localT * localT;
      const t3 = t2 * localT;

      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * localT +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * localT +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      const z = 0.5 * (
        (2 * p1.z) +
        (-p0.z + p2.z) * localT +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
      );

      splinePoints.push({ x, y, z });
    }

    return splinePoints;
  }

  /**
   * Smooth a path using moving average
   */
  public smoothPath(points: { x: number; y: number; z: number }[], smoothingFactor: number): { x: number; y: number; z: number }[] {
    if (smoothingFactor <= 0 || points.length < 3) {
      return points;
    }

    const smoothedPoints: { x: number; y: number; z: number }[] = [];
    const windowSize = Math.min(Math.floor(smoothingFactor * points.length), points.length);

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(points.length, i + Math.ceil(windowSize / 2));
      
      let sumX = 0, sumY = 0, sumZ = 0;
      let count = 0;

      for (let j = start; j < end; j++) {
        sumX += points[j].x;
        sumY += points[j].y;
        sumZ += points[j].z;
        count++;
      }

      smoothedPoints.push({
        x: sumX / count,
        y: sumY / count,
        z: sumZ / count
      });
    }

    return smoothedPoints;
  }
}

export { CurvedMPRService };