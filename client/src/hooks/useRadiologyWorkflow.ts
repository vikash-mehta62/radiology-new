import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from '../components/Accessibility/AccessibilityProvider';

// Hanging Protocol Types
export interface HangingProtocol {
  id: string;
  name: string;
  description: string;
  studyType: string[];
  bodyPart: string[];
  layout: {
    rows: number;
    columns: number;
    viewports: ViewportConfig[];
  };
  windowingPresets: WindowingPreset[];
  sortingRules: SortingRule[];
  displaySettings: DisplaySettings;
  isDefault?: boolean;
  isCustom?: boolean;
}

export interface ViewportConfig {
  id: string;
  row: number;
  column: number;
  seriesSelector: string; // e.g., "first", "last", "axial", "sagittal", "coronal"
  imageSelector: string; // e.g., "middle", "first", "last"
  windowingPreset?: string;
  zoom?: number;
  pan?: { x: number; y: number };
  rotation?: number;
  flip?: { horizontal: boolean; vertical: boolean };
}

export interface WindowingPreset {
  id: string;
  name: string;
  windowCenter: number;
  windowWidth: number;
  bodyPart?: string[];
  studyType?: string[];
  isDefault?: boolean;
}

export interface SortingRule {
  field: string; // e.g., "seriesNumber", "acquisitionTime", "sliceLocation"
  direction: 'asc' | 'desc';
  priority: number;
}

export interface DisplaySettings {
  showAnnotations: boolean;
  showMeasurements: boolean;
  showOverlays: boolean;
  interpolation: 'nearest' | 'linear' | 'cubic';
  colormap?: string;
  invertColors: boolean;
  smoothing: boolean;
}

// Batch Processing Types
export interface BatchOperation {
  id: string;
  name: string;
  type: 'windowing' | 'measurement' | 'annotation' | 'export' | 'analysis';
  parameters: Record<string, any>;
  targetStudies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: any[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Auto-windowing Types
export interface AutoWindowingRule {
  id: string;
  name: string;
  conditions: {
    bodyPart?: string[];
    studyType?: string[];
    seriesDescription?: string[];
    manufacturer?: string[];
  };
  windowingPreset: WindowingPreset;
  priority: number;
  isActive: boolean;
}

// Default Hanging Protocols
const DEFAULT_HANGING_PROTOCOLS: HangingProtocol[] = [
  {
    id: 'chest-ct-default',
    name: 'Chest CT - Standard',
    description: 'Standard chest CT hanging protocol with axial, coronal, and sagittal views',
    studyType: ['CT'],
    bodyPart: ['CHEST', 'THORAX'],
    layout: {
      rows: 2,
      columns: 2,
      viewports: [
        { id: 'axial', row: 0, column: 0, seriesSelector: 'axial', imageSelector: 'middle', windowingPreset: 'lung' },
        { id: 'coronal', row: 0, column: 1, seriesSelector: 'coronal', imageSelector: 'middle', windowingPreset: 'lung' },
        { id: 'sagittal', row: 1, column: 0, seriesSelector: 'sagittal', imageSelector: 'middle', windowingPreset: 'lung' },
        { id: 'axial-mediastinal', row: 1, column: 1, seriesSelector: 'axial', imageSelector: 'middle', windowingPreset: 'mediastinal' }
      ]
    },
    windowingPresets: [
      { id: 'lung', name: 'Lung Window', windowCenter: -600, windowWidth: 1600, bodyPart: ['CHEST'], isDefault: true },
      { id: 'mediastinal', name: 'Mediastinal Window', windowCenter: 50, windowWidth: 400, bodyPart: ['CHEST'] }
    ],
    sortingRules: [
      { field: 'seriesNumber', direction: 'asc', priority: 1 },
      { field: 'instanceNumber', direction: 'asc', priority: 2 }
    ],
    displaySettings: {
      showAnnotations: true,
      showMeasurements: true,
      showOverlays: true,
      interpolation: 'linear',
      invertColors: false,
      smoothing: true
    },
    isDefault: true
  },
  {
    id: 'brain-mri-default',
    name: 'Brain MRI - Standard',
    description: 'Standard brain MRI protocol with T1, T2, and FLAIR sequences',
    studyType: ['MR'],
    bodyPart: ['HEAD', 'BRAIN'],
    layout: {
      rows: 2,
      columns: 2,
      viewports: [
        { id: 't1-axial', row: 0, column: 0, seriesSelector: 'T1', imageSelector: 'middle' },
        { id: 't2-axial', row: 0, column: 1, seriesSelector: 'T2', imageSelector: 'middle' },
        { id: 'flair-axial', row: 1, column: 0, seriesSelector: 'FLAIR', imageSelector: 'middle' },
        { id: 'dwi-axial', row: 1, column: 1, seriesSelector: 'DWI', imageSelector: 'middle' }
      ]
    },
    windowingPresets: [
      { id: 'brain', name: 'Brain Window', windowCenter: 40, windowWidth: 80, bodyPart: ['HEAD'], isDefault: true }
    ],
    sortingRules: [
      { field: 'seriesNumber', direction: 'asc', priority: 1 },
      { field: 'instanceNumber', direction: 'asc', priority: 2 }
    ],
    displaySettings: {
      showAnnotations: true,
      showMeasurements: true,
      showOverlays: true,
      interpolation: 'linear',
      invertColors: false,
      smoothing: true
    },
    isDefault: true
  },
  {
    id: 'abdomen-ct-default',
    name: 'Abdomen CT - Standard',
    description: 'Standard abdominal CT protocol with arterial and portal venous phases',
    studyType: ['CT'],
    bodyPart: ['ABDOMEN'],
    layout: {
      rows: 2,
      columns: 2,
      viewports: [
        { id: 'arterial-axial', row: 0, column: 0, seriesSelector: 'arterial', imageSelector: 'middle', windowingPreset: 'abdomen' },
        { id: 'portal-axial', row: 0, column: 1, seriesSelector: 'portal', imageSelector: 'middle', windowingPreset: 'abdomen' },
        { id: 'arterial-coronal', row: 1, column: 0, seriesSelector: 'arterial', imageSelector: 'middle', windowingPreset: 'abdomen' },
        { id: 'portal-coronal', row: 1, column: 1, seriesSelector: 'portal', imageSelector: 'middle', windowingPreset: 'abdomen' }
      ]
    },
    windowingPresets: [
      { id: 'abdomen', name: 'Abdomen Window', windowCenter: 50, windowWidth: 400, bodyPart: ['ABDOMEN'], isDefault: true },
      { id: 'liver', name: 'Liver Window', windowCenter: 60, windowWidth: 160, bodyPart: ['ABDOMEN'] }
    ],
    sortingRules: [
      { field: 'seriesNumber', direction: 'asc', priority: 1 },
      { field: 'instanceNumber', direction: 'asc', priority: 2 }
    ],
    displaySettings: {
      showAnnotations: true,
      showMeasurements: true,
      showOverlays: true,
      interpolation: 'linear',
      invertColors: false,
      smoothing: true
    },
    isDefault: true
  }
];

// Default Windowing Presets
const DEFAULT_WINDOWING_PRESETS: WindowingPreset[] = [
  { id: 'lung', name: 'Lung', windowCenter: -600, windowWidth: 1600, bodyPart: ['CHEST'], isDefault: true },
  { id: 'mediastinal', name: 'Mediastinal', windowCenter: 50, windowWidth: 400, bodyPart: ['CHEST'] },
  { id: 'bone', name: 'Bone', windowCenter: 400, windowWidth: 1800 },
  { id: 'brain', name: 'Brain', windowCenter: 40, windowWidth: 80, bodyPart: ['HEAD'], isDefault: true },
  { id: 'abdomen', name: 'Abdomen', windowCenter: 50, windowWidth: 400, bodyPart: ['ABDOMEN'], isDefault: true },
  { id: 'liver', name: 'Liver', windowCenter: 60, windowWidth: 160, bodyPart: ['ABDOMEN'] },
  { id: 'soft-tissue', name: 'Soft Tissue', windowCenter: 50, windowWidth: 350 }
];

// Default Auto-windowing Rules
const DEFAULT_AUTO_WINDOWING_RULES: AutoWindowingRule[] = [
  {
    id: 'chest-ct-lung',
    name: 'Chest CT - Lung Window',
    conditions: { bodyPart: ['CHEST', 'THORAX'], studyType: ['CT'] },
    windowingPreset: DEFAULT_WINDOWING_PRESETS[0], // lung
    priority: 1,
    isActive: true
  },
  {
    id: 'brain-mri',
    name: 'Brain MRI - Standard',
    conditions: { bodyPart: ['HEAD', 'BRAIN'], studyType: ['MR'] },
    windowingPreset: DEFAULT_WINDOWING_PRESETS[3], // brain
    priority: 1,
    isActive: true
  },
  {
    id: 'abdomen-ct',
    name: 'Abdomen CT - Standard',
    conditions: { bodyPart: ['ABDOMEN'], studyType: ['CT'] },
    windowingPreset: DEFAULT_WINDOWING_PRESETS[4], // abdomen
    priority: 1,
    isActive: true
  }
];

export const useRadiologyWorkflow = () => {
  const { announceToScreenReader } = useAccessibility();
  
  // State management
  const [hangingProtocols, setHangingProtocols] = useState<HangingProtocol[]>(DEFAULT_HANGING_PROTOCOLS);
  const [windowingPresets, setWindowingPresets] = useState<WindowingPreset[]>(DEFAULT_WINDOWING_PRESETS);
  const [autoWindowingRules, setAutoWindowingRules] = useState<AutoWindowingRule[]>(DEFAULT_AUTO_WINDOWING_RULES);
  const [batchOperations, setBatchOperations] = useState<BatchOperation[]>([]);
  const [currentProtocol, setCurrentProtocol] = useState<HangingProtocol | null>(null);
  const [isAutoWindowingEnabled, setIsAutoWindowingEnabled] = useState(true);
  
  // Refs for performance
  const protocolCache = useRef<Map<string, HangingProtocol>>(new Map());
  const windowingCache = useRef<Map<string, WindowingPreset>>(new Map());

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedProtocols = localStorage.getItem('radiology-hanging-protocols');
        const savedPresets = localStorage.getItem('radiology-windowing-presets');
        const savedRules = localStorage.getItem('radiology-auto-windowing-rules');
        const savedAutoWindowing = localStorage.getItem('radiology-auto-windowing-enabled');

        if (savedProtocols) {
          const protocols = JSON.parse(savedProtocols);
          setHangingProtocols([...DEFAULT_HANGING_PROTOCOLS, ...protocols]);
        }

        if (savedPresets) {
          const presets = JSON.parse(savedPresets);
          setWindowingPresets([...DEFAULT_WINDOWING_PRESETS, ...presets]);
        }

        if (savedRules) {
          setAutoWindowingRules(JSON.parse(savedRules));
        }

        if (savedAutoWindowing !== null) {
          setIsAutoWindowingEnabled(JSON.parse(savedAutoWindowing));
        }
      } catch (error) {
        console.error('Failed to load radiology workflow preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    const customProtocols = hangingProtocols.filter(p => p.isCustom);
    localStorage.setItem('radiology-hanging-protocols', JSON.stringify(customProtocols));
  }, [hangingProtocols]);

  useEffect(() => {
    const customPresets = windowingPresets.filter(p => !DEFAULT_WINDOWING_PRESETS.find(d => d.id === p.id));
    localStorage.setItem('radiology-windowing-presets', JSON.stringify(customPresets));
  }, [windowingPresets]);

  useEffect(() => {
    localStorage.setItem('radiology-auto-windowing-rules', JSON.stringify(autoWindowingRules));
  }, [autoWindowingRules]);

  useEffect(() => {
    localStorage.setItem('radiology-auto-windowing-enabled', JSON.stringify(isAutoWindowingEnabled));
  }, [isAutoWindowingEnabled]);

  // Hanging Protocol Management
  const selectHangingProtocol = useCallback((studyType: string, bodyPart: string): HangingProtocol | null => {
    const cacheKey = `${studyType}-${bodyPart}`;
    
    if (protocolCache.current.has(cacheKey)) {
      return protocolCache.current.get(cacheKey)!;
    }

    // Find best matching protocol
    const matchingProtocols = hangingProtocols.filter(protocol => 
      protocol.studyType.some(type => type.toLowerCase() === studyType.toLowerCase()) &&
      protocol.bodyPart.some(part => part.toLowerCase() === bodyPart.toLowerCase())
    );

    const selectedProtocol = matchingProtocols.find(p => p.isDefault) || matchingProtocols[0] || null;
    
    if (selectedProtocol) {
      protocolCache.current.set(cacheKey, selectedProtocol);
      setCurrentProtocol(selectedProtocol);
      announceToScreenReader(`Applied hanging protocol: ${selectedProtocol.name}`);
    }

    return selectedProtocol;
  }, [hangingProtocols, announceToScreenReader]);

  const createCustomProtocol = useCallback((protocol: Omit<HangingProtocol, 'id' | 'isCustom'>) => {
    const newProtocol: HangingProtocol = {
      ...protocol,
      id: `custom-${Date.now()}`,
      isCustom: true
    };

    setHangingProtocols(prev => [...prev, newProtocol]);
    announceToScreenReader(`Created custom hanging protocol: ${newProtocol.name}`);
    return newProtocol;
  }, [announceToScreenReader]);

  const updateProtocol = useCallback((protocolId: string, updates: Partial<HangingProtocol>) => {
    setHangingProtocols(prev => 
      prev.map(protocol => 
        protocol.id === protocolId ? { ...protocol, ...updates } : protocol
      )
    );
    protocolCache.current.clear(); // Clear cache when protocols change
  }, []);

  const deleteProtocol = useCallback((protocolId: string) => {
    setHangingProtocols(prev => prev.filter(protocol => protocol.id !== protocolId));
    protocolCache.current.clear();
    announceToScreenReader('Hanging protocol deleted');
  }, [announceToScreenReader]);

  // Auto-windowing
  const getAutoWindowing = useCallback((studyType: string, bodyPart: string, seriesDescription?: string): WindowingPreset | null => {
    if (!isAutoWindowingEnabled) return null;

    const cacheKey = `${studyType}-${bodyPart}-${seriesDescription || ''}`;
    
    if (windowingCache.current.has(cacheKey)) {
      return windowingCache.current.get(cacheKey)!;
    }

    // Find matching auto-windowing rule
    const matchingRules = autoWindowingRules
      .filter(rule => rule.isActive)
      .filter(rule => {
        const studyMatch = !rule.conditions.studyType || 
          rule.conditions.studyType.some(type => type.toLowerCase() === studyType.toLowerCase());
        const bodyPartMatch = !rule.conditions.bodyPart || 
          rule.conditions.bodyPart.some(part => part.toLowerCase() === bodyPart.toLowerCase());
        const seriesMatch = !rule.conditions.seriesDescription || !seriesDescription ||
          rule.conditions.seriesDescription.some(desc => 
            seriesDescription.toLowerCase().includes(desc.toLowerCase())
          );
        
        return studyMatch && bodyPartMatch && seriesMatch;
      })
      .sort((a, b) => a.priority - b.priority);

    const selectedRule = matchingRules[0];
    const windowingPreset = selectedRule?.windowingPreset || null;
    
    if (windowingPreset) {
      windowingCache.current.set(cacheKey, windowingPreset);
    }

    return windowingPreset;
  }, [autoWindowingRules, isAutoWindowingEnabled]);

  const createAutoWindowingRule = useCallback((rule: Omit<AutoWindowingRule, 'id'>) => {
    const newRule: AutoWindowingRule = {
      ...rule,
      id: `rule-${Date.now()}`
    };

    setAutoWindowingRules(prev => [...prev, newRule]);
    windowingCache.current.clear();
    announceToScreenReader(`Created auto-windowing rule: ${newRule.name}`);
    return newRule;
  }, [announceToScreenReader]);

  // Batch Processing
  const createBatchOperation = useCallback((operation: Omit<BatchOperation, 'id' | 'status' | 'progress' | 'createdAt'>) => {
    const newOperation: BatchOperation = {
      ...operation,
      id: `batch-${Date.now()}`,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    setBatchOperations(prev => [...prev, newOperation]);
    announceToScreenReader(`Created batch operation: ${newOperation.name}`);
    return newOperation;
  }, [announceToScreenReader]);

  const executeBatchOperation = useCallback(async (operationId: string) => {
    setBatchOperations(prev => 
      prev.map(op => 
        op.id === operationId ? { ...op, status: 'running' as const, progress: 0 } : op
      )
    );

    try {
      const operation = batchOperations.find(op => op.id === operationId);
      if (!operation) throw new Error('Operation not found');

      announceToScreenReader(`Starting batch operation: ${operation.name}`);

      // Simulate batch processing with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setBatchOperations(prev => 
          prev.map(op => 
            op.id === operationId ? { ...op, progress: i } : op
          )
        );
      }

      setBatchOperations(prev => 
        prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'completed' as const, progress: 100, completedAt: new Date() }
            : op
        )
      );

      announceToScreenReader(`Batch operation completed: ${operation.name}`);
    } catch (error) {
      setBatchOperations(prev => 
        prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'failed' as const, error: error instanceof Error ? error.message : 'Unknown error' }
            : op
        )
      );
      announceToScreenReader('Batch operation failed');
    }
  }, [batchOperations, announceToScreenReader]);

  const cancelBatchOperation = useCallback((operationId: string) => {
    setBatchOperations(prev => prev.filter(op => op.id !== operationId));
    announceToScreenReader('Batch operation cancelled');
  }, [announceToScreenReader]);

  // Windowing Preset Management
  const createWindowingPreset = useCallback((preset: Omit<WindowingPreset, 'id'>) => {
    const newPreset: WindowingPreset = {
      ...preset,
      id: `preset-${Date.now()}`
    };

    setWindowingPresets(prev => [...prev, newPreset]);
    windowingCache.current.clear();
    announceToScreenReader(`Created windowing preset: ${newPreset.name}`);
    return newPreset;
  }, [announceToScreenReader]);

  const updateWindowingPreset = useCallback((presetId: string, updates: Partial<WindowingPreset>) => {
    setWindowingPresets(prev => 
      prev.map(preset => 
        preset.id === presetId ? { ...preset, ...updates } : preset
      )
    );
    windowingCache.current.clear();
  }, []);

  const deleteWindowingPreset = useCallback((presetId: string) => {
    setWindowingPresets(prev => prev.filter(preset => preset.id !== presetId));
    windowingCache.current.clear();
    announceToScreenReader('Windowing preset deleted');
  }, [announceToScreenReader]);

  // Utility functions
  const getProtocolsByStudyType = useCallback((studyType: string) => {
    return hangingProtocols.filter(protocol => 
      protocol.studyType.some(type => type.toLowerCase() === studyType.toLowerCase())
    );
  }, [hangingProtocols]);

  const getPresetsByBodyPart = useCallback((bodyPart: string) => {
    return windowingPresets.filter(preset => 
      !preset.bodyPart || preset.bodyPart.some(part => part.toLowerCase() === bodyPart.toLowerCase())
    );
  }, [windowingPresets]);

  return {
    // State
    hangingProtocols,
    windowingPresets,
    autoWindowingRules,
    batchOperations,
    currentProtocol,
    isAutoWindowingEnabled,

    // Hanging Protocol functions
    selectHangingProtocol,
    createCustomProtocol,
    updateProtocol,
    deleteProtocol,
    getProtocolsByStudyType,

    // Auto-windowing functions
    getAutoWindowing,
    createAutoWindowingRule,
    setIsAutoWindowingEnabled,

    // Batch processing functions
    createBatchOperation,
    executeBatchOperation,
    cancelBatchOperation,

    // Windowing preset functions
    createWindowingPreset,
    updateWindowingPreset,
    deleteWindowingPreset,
    getPresetsByBodyPart,

    // Utility functions
    clearCaches: () => {
      protocolCache.current.clear();
      windowingCache.current.clear();
    }
  };
};