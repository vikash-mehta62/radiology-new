/**
 * Navigation3D Types and State Management
 * Centralized type definitions and helper functions for 3D navigation
 */

export interface Navigation3DState {
  // Core state
  enabled: boolean;
  
  // Rotation values (degrees: -180 to 180)
  pitch: number;
  yaw: number;
  roll: number;
  
  // Opacity values (0-1 range)
  opacity: number;
  volumeOpacity: number;
  surfaceOpacity: number;
  
  // Slice positions (0-based indices)
  axialSlice: number;
  sagittalSlice: number;
  coronalSlice: number;
  
  // Clipping planes (percentage: 0-100)
  clipNear: number;
  clipFar: number;
  
  // Rendering settings
  renderingMode: '3d' | 'mpr' | 'volume' | 'surface';
  isAnimating: boolean;
  animationSpeed: number;
  currentPreset: string;
  
  // Always maintain these arrays - never undefined
  annotations: any[];
  layers: any[];
  groups: any[];
}

export interface ViewPreset {
  id: string;
  name: string;
  pitch: number;
  yaw: number;
  roll: number;
  description?: string;
}

export interface MaxSlices {
  axial: number;
  sagittal: number;
  coronal: number;
}

/**
 * Safe number casting from slider values (handles both number and number[] returns)
 */
export const safeNumberValue = (value: number | number[]): number => {
  return Array.isArray(value) ? value[0] : Number(value);
};

/**
 * Clamp value within range
 */
export const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Create complete Navigation3D state with all required keys
 * This ensures we never have partial state objects
 */
export const createCompleteNavigation3DState = (
  partial: Partial<Navigation3DState> = {},
  maxSlices: MaxSlices = { axial: 1, sagittal: 1, coronal: 1 }
): Navigation3DState => {
  const safeMaxSlices = {
    axial: Math.max(1, Math.floor(maxSlices.axial || 1)),
    sagittal: Math.max(1, Math.floor(maxSlices.sagittal || 1)),
    coronal: Math.max(1, Math.floor(maxSlices.coronal || 1))
  };

  return {
    // Core state
    enabled: Boolean(partial.enabled ?? false),
    
    // Rotation values (degrees)
    pitch: clampValue(Number(partial.pitch ?? 0), -180, 180),
    yaw: clampValue(Number(partial.yaw ?? 0), -180, 180),
    roll: clampValue(Number(partial.roll ?? 0), -180, 180),
    
    // Opacity values (0-1 range)
    opacity: clampValue(Number(partial.opacity ?? 1), 0, 1),
    volumeOpacity: clampValue(Number(partial.volumeOpacity ?? 0.8), 0, 1),
    surfaceOpacity: clampValue(Number(partial.surfaceOpacity ?? 1), 0, 1),
    
    // Slice positions (0-based indices with bounds checking)
    axialSlice: clampValue(
      Math.floor(Number(partial.axialSlice ?? Math.floor(safeMaxSlices.axial / 2))), 
      0, 
      safeMaxSlices.axial - 1
    ),
    sagittalSlice: clampValue(
      Math.floor(Number(partial.sagittalSlice ?? Math.floor(safeMaxSlices.sagittal / 2))), 
      0, 
      safeMaxSlices.sagittal - 1
    ),
    coronalSlice: clampValue(
      Math.floor(Number(partial.coronalSlice ?? Math.floor(safeMaxSlices.coronal / 2))), 
      0, 
      safeMaxSlices.coronal - 1
    ),
    
    // Clipping planes (percentage 0-100)
    clipNear: clampValue(Number(partial.clipNear ?? 0), 0, 100),
    clipFar: clampValue(Number(partial.clipFar ?? 100), 0, 100),
    
    // Rendering settings
    renderingMode: partial.renderingMode ?? '3d',
    isAnimating: Boolean(partial.isAnimating ?? false),
    animationSpeed: clampValue(Number(partial.animationSpeed ?? 1), 0.1, 3),
    currentPreset: partial.currentPreset ?? 'anterior',
    
    // Always maintain these arrays - never undefined
    annotations: Array.isArray(partial.annotations) ? [...partial.annotations] : [],
    layers: Array.isArray(partial.layers) ? [...partial.layers] : [],
    groups: Array.isArray(partial.groups) ? [...partial.groups] : []
  };
};

/**
 * Get default Navigation3D state
 */
export const getDefaultNavigation3DState = (maxSlices: MaxSlices = { axial: 1, sagittal: 1, coronal: 1 }): Navigation3DState => {
  return createCompleteNavigation3DState({}, maxSlices);
};

/**
 * View presets for common anatomical orientations
 */
export const VIEW_PRESETS: ViewPreset[] = [
  { id: 'anterior', name: 'Anterior', pitch: 0, yaw: 0, roll: 0, description: 'Front view' },
  { id: 'posterior', name: 'Posterior', pitch: 0, yaw: 180, roll: 0, description: 'Back view' },
  { id: 'left-lateral', name: 'Left Lateral', pitch: 0, yaw: -90, roll: 0, description: 'Left side view' },
  { id: 'right-lateral', name: 'Right Lateral', pitch: 0, yaw: 90, roll: 0, description: 'Right side view' },
  { id: 'superior', name: 'Superior', pitch: -90, yaw: 0, roll: 0, description: 'Top view' },
  { id: 'inferior', name: 'Inferior', pitch: 90, yaw: 0, roll: 0, description: 'Bottom view' },
  { id: 'oblique-1', name: 'Oblique 1', pitch: -30, yaw: 45, roll: 0, description: 'Oblique view 1' },
  { id: 'oblique-2', name: 'Oblique 2', pitch: 30, yaw: -45, roll: 0, description: 'Oblique view 2' }
];

/**
 * Apply view preset to navigation state
 */
export const applyViewPreset = (
  currentState: Navigation3DState,
  presetId: string,
  maxSlices: MaxSlices
): Navigation3DState => {
  const preset = VIEW_PRESETS.find(p => p.id === presetId);
  if (!preset) {
    console.warn(`Unknown preset: ${presetId}`);
    return currentState;
  }

  return createCompleteNavigation3DState({
    ...currentState,
    pitch: preset.pitch,
    yaw: preset.yaw,
    roll: preset.roll,
    currentPreset: presetId
  }, maxSlices);
};