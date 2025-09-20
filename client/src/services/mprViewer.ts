/**
 * Multiplanar Reconstruction (MPR) Viewer
 * Provides real-time cross-sectional views with synchronized navigation
 */

import { performanceMonitor } from './performanceMonitor';

export interface MPRPlane {
  name: string;
  type: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  normal: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
}
  