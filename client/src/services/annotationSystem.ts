/**
 * Comprehensive Annotation System
 * Advanced annotation tools for medical imaging with layering, grouping, and standardized templates
 */

import { Point2D, Point3D } from './measurementTools';

export interface AnnotationStyle {
  color: string;
  fillColor?: string;
  opacity: number;
  lineWidth: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  dashPattern?: number[];
  arrowStyle?: 'none' | 'start' | 'end' | 'both';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffset?: { x: number; y: number };
}

export interface BaseAnnotation {
  id: string;
  type: 'text' | 'arrow' | 'circle' | 'rectangle' | 'ellipse' | 'polygon' | 'freehand' | 'ruler' | 'protractor';
  position: Point2D | Point3D;
  style: AnnotationStyle;
  layer: string;
  group?: string;
  visible: boolean;
  locked: boolean;
  timestamp: string;
  creator: string;
  lastModified: string;
  lastModifiedBy: string;
  metadata: {
    imageId: string;
    sliceIndex?: number;
    confidence?: number;
    validated: boolean;
    clinicalRelevance: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    [key: string]: any;
  };
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  maxWidth?: number;
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startPoint: Point2D | Point3D;
  endPoint: Point2D | Point3D;
  text?: string;
  arrowHeadSize: number;
  arrowHeadAngle: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'circle' | 'rectangle' | 'ellipse';
  width: number;
  height: number;
  rotation: number;
  filled: boolean;
}

export interface PolygonAnnotation extends BaseAnnotation {
  type: 'polygon';
  points: (Point2D | Point3D)[];
  closed: boolean;
  filled: boolean;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: (Point2D | Point3D)[];
  smoothed: boolean;
  pressure?: number[];
}

export interface RulerAnnotation extends BaseAnnotation {
  type: 'ruler';
  startPoint: Point2D | Point3D;
  endPoint: Point2D | Point3D;
  showTicks: boolean;
  tickInterval: number;
  unit: string;
  calibration: { pixelSpacing: { x: number; y: number } };
}

export interface ProtractorAnnotation extends BaseAnnotation {
  type: 'protractor';
  center: Point2D | Point3D;
  radius: number;
  startAngle: number;
  endAngle: number;
  showDegrees: boolean;
}

export type Annotation = TextAnnotation | ArrowAnnotation | ShapeAnnotation | PolygonAnnotation | 
                        FreehandAnnotation | RulerAnnotation | ProtractorAnnotation;

export interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  annotations: string[]; // annotation IDs
  color: string;
  description?: string;
  category: 'findings' | 'measurements' | 'notes' | 'teaching' | 'quality' | 'custom';
}

export interface AnnotationGroup {
  id: string;
  name: string;
  annotations: string[]; // annotation IDs
  color: string;
  description?: string;
  collapsed: boolean;
  locked: boolean;
}

export interface AnnotationTemplate {
  id: string;
  name: string;
  type: Annotation['type'];
  description: string;
  defaultStyle: AnnotationStyle;
  defaultText?: string;
  category: 'cardiac' | 'pulmonary' | 'skeletal' | 'abdominal' | 'neurological' | 'general';
  clinicalContext: string;
  requiredFields?: string[];
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    required?: boolean;
  };
}

export interface AnnotationSession {
  id: string;
  imageId: string;
  annotations: Annotation[];
  layers: AnnotationLayer[];
  groups: AnnotationGroup[];
  templates: AnnotationTemplate[];
  activeLayer: string;
  activeGroup?: string;
  startTime: string;
  endTime?: string;
  creator: string;
  status: 'active' | 'completed' | 'reviewed' | 'approved';
  version: number;
  history: AnnotationHistoryEntry[];
}

export interface AnnotationHistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'move' | 'style' | 'group' | 'layer';
  annotationId: string;
  timestamp: string;
  user: string;
  changes: any;
  previousState?: any;
}

class AnnotationSystem {
  private annotations: Map<string, Annotation> = new Map();
  private layers: Map<string, AnnotationLayer> = new Map();
  private groups: Map<string, AnnotationGroup> = new Map();
  private templates: Map<string, AnnotationTemplate> = new Map();
  private sessions: Map<string, AnnotationSession> = new Map();
  private activeSession: AnnotationSession | null = null;
  private history: AnnotationHistoryEntry[] = [];

  // Predefined annotation templates
  private predefinedTemplates: AnnotationTemplate[] = [
    {
      id: 'finding-arrow',
      name: 'Finding Arrow',
      type: 'arrow',
      description: 'Arrow pointing to a clinical finding',
      defaultStyle: {
        color: '#ff4757',
        opacity: 1,
        lineWidth: 2,
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'normal',
        arrowStyle: 'end'
      },
      category: 'general',
      clinicalContext: 'Highlight specific anatomical structures or pathological findings'
    },
    {
      id: 'measurement-text',
      name: 'Measurement Label',
      type: 'text',
      description: 'Text label for measurements',
      defaultStyle: {
        color: '#2ed573',
        opacity: 1,
        lineWidth: 1,
        fontSize: 10,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal'
      },
      defaultText: 'Measurement: ',
      category: 'general',
      clinicalContext: 'Label and describe measurement values'
    },
    {
      id: 'abnormality-circle',
      name: 'Abnormality Highlight',
      type: 'circle',
      description: 'Circle to highlight abnormal areas',
      defaultStyle: {
        color: '#ff6b6b',
        fillColor: 'rgba(255, 107, 107, 0.2)',
        opacity: 0.8,
        lineWidth: 2,
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal'
      },
      category: 'general',
      clinicalContext: 'Mark areas of concern or abnormal findings'
    },
    {
      id: 'cardiac-annotation',
      name: 'Cardiac Structure',
      type: 'polygon',
      description: 'Outline cardiac structures',
      defaultStyle: {
        color: '#ff3838',
        fillColor: 'rgba(255, 56, 56, 0.1)',
        opacity: 0.9,
        lineWidth: 2,
        fontSize: 11,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'normal'
      },
      category: 'cardiac',
      clinicalContext: 'Delineate cardiac chambers, vessels, and related structures'
    },
    {
      id: 'lung-lesion',
      name: 'Pulmonary Lesion',
      type: 'ellipse',
      description: 'Mark pulmonary lesions or nodules',
      defaultStyle: {
        color: '#3742fa',
        fillColor: 'rgba(55, 66, 250, 0.15)',
        opacity: 0.85,
        lineWidth: 2,
        fontSize: 10,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal'
      },
      category: 'pulmonary',
      clinicalContext: 'Identify and mark lung lesions, nodules, or masses'
    },
    {
      id: 'bone-fracture',
      name: 'Fracture Line',
      type: 'freehand',
      description: 'Draw fracture lines',
      defaultStyle: {
        color: '#ff9f43',
        opacity: 1,
        lineWidth: 3,
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'normal'
      },
      category: 'skeletal',
      clinicalContext: 'Trace fracture lines and bone discontinuities'
    }
  ];

  // Default layers
  private defaultLayers: Omit<AnnotationLayer, 'annotations'>[] = [
    {
      id: 'findings',
      name: 'Clinical Findings',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      color: '#ff4757',
      category: 'findings',
      description: 'Primary clinical findings and pathology'
    },
    {
      id: 'measurements',
      name: 'Measurements',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      color: '#2ed573',
      category: 'measurements',
      description: 'Measurement annotations and labels'
    },
    {
      id: 'notes',
      name: 'Notes & Comments',
      visible: true,
      locked: false,
      opacity: 0.9,
      blendMode: 'normal',
      color: '#3742fa',
      category: 'notes',
      description: 'General notes and comments'
    },
    {
      id: 'teaching',
      name: 'Teaching Points',
      visible: false,
      locked: false,
      opacity: 0.8,
      blendMode: 'normal',
      color: '#ff9f43',
      category: 'teaching',
      description: 'Educational annotations and teaching points'
    }
  ];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize annotation system
   */
  private initialize(): void {
    // Load predefined templates
    this.predefinedTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log('📝 [AnnotationSystem] Initialized with', this.templates.size, 'templates');
  }

  /**
   * Create new annotation session
   */
  public createSession(imageId: string, creator: string = 'user'): AnnotationSession {
    const session: AnnotationSession = {
      id: `session-${Date.now()}`,
      imageId,
      annotations: [],
      layers: this.defaultLayers.map(layer => ({ ...layer, annotations: [] })),
      groups: [],
      templates: Array.from(this.templates.values()),
      activeLayer: 'findings',
      startTime: new Date().toISOString(),
      creator,
      status: 'active',
      version: 1,
      history: []
    };

    // Create layer objects
    session.layers.forEach(layer => {
      this.layers.set(layer.id, layer);
    });

    this.sessions.set(session.id, session);
    this.activeSession = session;

    console.log('📝 [AnnotationSystem] Created new session:', session.id);
    return session;
  }

  /**
   * Set active session
   */
  public setActiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.activeSession = session;
      return true;
    }
    return false;
  }

  /**
   * Get active session
   */
  public getActiveSession(): AnnotationSession | null {
    return this.activeSession;
  }

  /**
   * Create text annotation
   */
  public createTextAnnotation(
    position: Point2D | Point3D,
    text: string,
    templateId?: string,
    layerId?: string
  ): TextAnnotation {
    if (!this.activeSession) {
      throw new Error('No active annotation session');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const layer = layerId || this.activeSession.activeLayer;
    const id = `annotation-${Date.now()}`;

    const annotation: TextAnnotation = {
      id,
      type: 'text',
      position,
      text,
      maxWidth: 200,
      alignment: 'left',
      verticalAlignment: 'top',
      padding: { top: 4, right: 8, bottom: 4, left: 8 },
      style: template?.defaultStyle || this.getDefaultStyle(),
      layer,
      visible: true,
      locked: false,
      timestamp: new Date().toISOString(),
      creator: this.activeSession.creator,
      lastModified: new Date().toISOString(),
      lastModifiedBy: this.activeSession.creator,
      metadata: {
        imageId: this.activeSession.imageId,
        validated: false,
        clinicalRelevance: 'medium',
        tags: [],
        templateId
      }
    };

    this.annotations.set(id, annotation);
    this.activeSession.annotations.push(annotation);
    this.addToLayer(id, layer);
    this.addToHistory('create', id, annotation);

    console.log('📝 [AnnotationSystem] Created text annotation:', text);
    return annotation;
  }

  /**
   * Create arrow annotation
   */
  public createArrowAnnotation(
    startPoint: Point2D | Point3D,
    endPoint: Point2D | Point3D,
    text?: string,
    templateId?: string,
    layerId?: string
  ): ArrowAnnotation {
    if (!this.activeSession) {
      throw new Error('No active annotation session');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const layer = layerId || this.activeSession.activeLayer;
    const id = `annotation-${Date.now()}`;

    const annotation: ArrowAnnotation = {
      id,
      type: 'arrow',
      position: startPoint,
      startPoint,
      endPoint,
      text,
      arrowHeadSize: 10,
      arrowHeadAngle: 30,
      style: template?.defaultStyle || this.getDefaultStyle(),
      layer,
      visible: true,
      locked: false,
      timestamp: new Date().toISOString(),
      creator: this.activeSession.creator,
      lastModified: new Date().toISOString(),
      lastModifiedBy: this.activeSession.creator,
      metadata: {
        imageId: this.activeSession.imageId,
        validated: false,
        clinicalRelevance: 'high',
        tags: [],
        templateId
      }
    };

    this.annotations.set(id, annotation);
    this.activeSession.annotations.push(annotation);
    this.addToLayer(id, layer);
    this.addToHistory('create', id, annotation);

    console.log('📝 [AnnotationSystem] Created arrow annotation');
    return annotation;
  }

  /**
   * Create shape annotation
   */
  public createShapeAnnotation(
    position: Point2D | Point3D,
    width: number,
    height: number,
    shapeType: 'circle' | 'rectangle' | 'ellipse',
    templateId?: string,
    layerId?: string
  ): ShapeAnnotation {
    if (!this.activeSession) {
      throw new Error('No active annotation session');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const layer = layerId || this.activeSession.activeLayer;
    const id = `annotation-${Date.now()}`;

    const annotation: ShapeAnnotation = {
      id,
      type: shapeType,
      position,
      width,
      height,
      rotation: 0,
      filled: false,
      style: template?.defaultStyle || this.getDefaultStyle(),
      layer,
      visible: true,
      locked: false,
      timestamp: new Date().toISOString(),
      creator: this.activeSession.creator,
      lastModified: new Date().toISOString(),
      lastModifiedBy: this.activeSession.creator,
      metadata: {
        imageId: this.activeSession.imageId,
        validated: false,
        clinicalRelevance: 'medium',
        tags: [],
        templateId
      }
    };

    this.annotations.set(id, annotation);
    this.activeSession.annotations.push(annotation);
    this.addToLayer(id, layer);
    this.addToHistory('create', id, annotation);

    console.log('📝 [AnnotationSystem] Created shape annotation:', shapeType);
    return annotation;
  }

  /**
   * Create polygon annotation
   */
  public createPolygonAnnotation(
    points: (Point2D | Point3D)[],
    closed: boolean = true,
    filled: boolean = false,
    templateId?: string,
    layerId?: string
  ): PolygonAnnotation {
    if (!this.activeSession) {
      throw new Error('No active annotation session');
    }

    if (points.length < 2) {
      throw new Error('Polygon requires at least 2 points');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const layer = layerId || this.activeSession.activeLayer;
    const id = `annotation-${Date.now()}`;

    const annotation: PolygonAnnotation = {
      id,
      type: 'polygon',
      position: points[0],
      points,
      closed,
      filled,
      style: template?.defaultStyle || this.getDefaultStyle(),
      layer,
      visible: true,
      locked: false,
      timestamp: new Date().toISOString(),
      creator: this.activeSession.creator,
      lastModified: new Date().toISOString(),
      lastModifiedBy: this.activeSession.creator,
      metadata: {
        imageId: this.activeSession.imageId,
        validated: false,
        clinicalRelevance: 'high',
        tags: [],
        templateId,
        pointCount: points.length
      }
    };

    this.annotations.set(id, annotation);
    this.activeSession.annotations.push(annotation);
    this.addToLayer(id, layer);
    this.addToHistory('create', id, annotation);

    console.log('📝 [AnnotationSystem] Created polygon annotation with', points.length, 'points');
    return annotation;
  }

  /**
   * Create freehand annotation
   */
  public createFreehandAnnotation(
    points: (Point2D | Point3D)[],
    pressure?: number[],
    templateId?: string,
    layerId?: string
  ): FreehandAnnotation {
    if (!this.activeSession) {
      throw new Error('No active annotation session');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const layer = layerId || this.activeSession.activeLayer;
    const id = `annotation-${Date.now()}`;

    const annotation: FreehandAnnotation = {
      id,
      type: 'freehand',
      position: points[0],
      points,
      smoothed: false,
      pressure,
      style: template?.defaultStyle || this.getDefaultStyle(),
      layer,
      visible: true,
      locked: false,
      timestamp: new Date().toISOString(),
      creator: this.activeSession.creator,
      lastModified: new Date().toISOString(),
      lastModifiedBy: this.activeSession.creator,
      metadata: {
        imageId: this.activeSession.imageId,
        validated: false,
        clinicalRelevance: 'medium',
        tags: [],
        templateId,
        pointCount: points.length
      }
    };

    this.annotations.set(id, annotation);
    this.activeSession.annotations.push(annotation);
    this.addToLayer(id, layer);
    this.addToHistory('create', id, annotation);

    console.log('📝 [AnnotationSystem] Created freehand annotation with', points.length, 'points');
    return annotation;
  }

  /**
   
* Get default annotation style
   */
  private getDefaultStyle(): AnnotationStyle {
    return {
      color: '#007bff',
      opacity: 1,
      lineWidth: 2,
      fontSize: 12,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal'
    };
  }

  /**
   * Add annotation to layer
   */
  private addToLayer(annotationId: string, layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.annotations.push(annotationId);
    }
  }

  /**
   * Add entry to history
   */
  private addToHistory(
    action: AnnotationHistoryEntry['action'],
    annotationId: string,
    changes: any,
    previousState?: any
  ): void {
    const entry: AnnotationHistoryEntry = {
      id: `history-${Date.now()}`,
      action,
      annotationId,
      timestamp: new Date().toISOString(),
      user: this.activeSession?.creator || 'unknown',
      changes,
      previousState
    };

    this.history.push(entry);
    if (this.activeSession) {
      this.activeSession.history.push(entry);
    }
  }

  /**
   * Update annotation
   */
  public updateAnnotation(annotationId: string, updates: Partial<Annotation>): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || annotation.locked) return false;

    const previousState = { ...annotation };
    
    // Update annotation properties
    Object.assign(annotation, updates);
    annotation.lastModified = new Date().toISOString();
    annotation.lastModifiedBy = this.activeSession?.creator || 'unknown';

    this.addToHistory('update', annotationId, updates, previousState);

    console.log('📝 [AnnotationSystem] Updated annotation:', annotationId);
    return true;
  }

  /**
   * Delete annotation
   */
  public deleteAnnotation(annotationId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || annotation.locked) return false;

    // Remove from annotations map
    this.annotations.delete(annotationId);

    // Remove from active session
    if (this.activeSession) {
      this.activeSession.annotations = this.activeSession.annotations.filter(
        a => a.id !== annotationId
      );
    }

    // Remove from layer
    const layer = this.layers.get(annotation.layer);
    if (layer) {
      layer.annotations = layer.annotations.filter(id => id !== annotationId);
    }

    // Remove from group if exists
    if (annotation.group) {
      const group = this.groups.get(annotation.group);
      if (group) {
        group.annotations = group.annotations.filter(id => id !== annotationId);
      }
    }

    this.addToHistory('delete', annotationId, annotation);

    console.log('📝 [AnnotationSystem] Deleted annotation:', annotationId);
    return true;
  }

  /**
   * Move annotation to different layer
   */
  public moveToLayer(annotationId: string, targetLayerId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return false;

    const currentLayer = this.layers.get(annotation.layer);
    const targetLayer = this.layers.get(targetLayerId);
    
    if (!targetLayer) return false;

    // Remove from current layer
    if (currentLayer) {
      currentLayer.annotations = currentLayer.annotations.filter(id => id !== annotationId);
    }

    // Add to target layer
    targetLayer.annotations.push(annotationId);
    annotation.layer = targetLayerId;

    this.addToHistory('move', annotationId, { layer: targetLayerId });

    console.log('📝 [AnnotationSystem] Moved annotation to layer:', targetLayerId);
    return true;
  }

  /**
   * Create annotation group
   */
  public createGroup(name: string, annotationIds: string[], color: string = '#666666'): AnnotationGroup {
    const group: AnnotationGroup = {
      id: `group-${Date.now()}`,
      name,
      annotations: annotationIds,
      color,
      collapsed: false,
      locked: false
    };

    this.groups.set(group.id, group);

    // Update annotations to reference the group
    annotationIds.forEach(id => {
      const annotation = this.annotations.get(id);
      if (annotation) {
        annotation.group = group.id;
      }
    });

    // Add to active session
    if (this.activeSession) {
      this.activeSession.groups.push(group);
    }

    console.log('📝 [AnnotationSystem] Created group:', name, 'with', annotationIds.length, 'annotations');
    return group;
  }

  /**
   * Add annotation to group
   */
  public addToGroup(annotationId: string, groupId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    const group = this.groups.get(groupId);
    
    if (!annotation || !group) return false;

    // Remove from current group if exists
    if (annotation.group) {
      this.removeFromGroup(annotationId, annotation.group);
    }

    // Add to new group
    group.annotations.push(annotationId);
    annotation.group = groupId;

    this.addToHistory('group', annotationId, { group: groupId });

    console.log('📝 [AnnotationSystem] Added annotation to group:', groupId);
    return true;
  }

  /**
   * Remove annotation from group
   */
  public removeFromGroup(annotationId: string, groupId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    const group = this.groups.get(groupId);
    
    if (!annotation || !group) return false;

    group.annotations = group.annotations.filter(id => id !== annotationId);
    annotation.group = undefined;

    this.addToHistory('group', annotationId, { group: null });

    console.log('📝 [AnnotationSystem] Removed annotation from group:', groupId);
    return true;
  }

  /**
   * Create annotation layer
   */
  public createLayer(
    name: string,
    category: AnnotationLayer['category'] = 'custom',
    color: string = '#666666'
  ): AnnotationLayer {
    const layer: AnnotationLayer = {
      id: `layer-${Date.now()}`,
      name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      annotations: [],
      color,
      category
    };

    this.layers.set(layer.id, layer);

    // Add to active session
    if (this.activeSession) {
      this.activeSession.layers.push(layer);
    }

    console.log('📝 [AnnotationSystem] Created layer:', name);
    return layer;
  }

  /**
   * Update layer properties
   */
  public updateLayer(layerId: string, updates: Partial<AnnotationLayer>): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    Object.assign(layer, updates);

    console.log('📝 [AnnotationSystem] Updated layer:', layerId);
    return true;
  }

  /**
   * Delete layer
   */
  public deleteLayer(layerId: string, moveAnnotationsTo?: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    // Move annotations to another layer or delete them
    if (moveAnnotationsTo) {
      layer.annotations.forEach(annotationId => {
        this.moveToLayer(annotationId, moveAnnotationsTo);
      });
    } else {
      // Delete all annotations in the layer
      layer.annotations.forEach(annotationId => {
        this.deleteAnnotation(annotationId);
      });
    }

    this.layers.delete(layerId);

    // Remove from active session
    if (this.activeSession) {
      this.activeSession.layers = this.activeSession.layers.filter(l => l.id !== layerId);
    }

    console.log('📝 [AnnotationSystem] Deleted layer:', layerId);
    return true;
  }

  /**
   * Get annotation by ID
   */
  public getAnnotation(annotationId: string): Annotation | null {
    return this.annotations.get(annotationId) || null;
  }

  /**
   * Get all annotations
   */
  public getAllAnnotations(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Get annotations by type
   */
  public getAnnotationsByType(type: Annotation['type']): Annotation[] {
    return Array.from(this.annotations.values()).filter(a => a.type === type);
  }

  /**
   * Get annotations by layer
   */
  public getAnnotationsByLayer(layerId: string): Annotation[] {
    const layer = this.layers.get(layerId);
    if (!layer) return [];

    return layer.annotations.map(id => this.annotations.get(id)).filter(Boolean) as Annotation[];
  }

  /**
   * Get annotations by group
   */
  public getAnnotationsByGroup(groupId: string): Annotation[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    return group.annotations.map(id => this.annotations.get(id)).filter(Boolean) as Annotation[];
  }

  /**
   * Search annotations
   */
  public searchAnnotations(query: string): Annotation[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.annotations.values()).filter(annotation => {
      // Search in text content
      if (annotation.type === 'text') {
        const textAnnotation = annotation as TextAnnotation;
        if (textAnnotation.text.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }

      // Search in arrow text
      if (annotation.type === 'arrow') {
        const arrowAnnotation = annotation as ArrowAnnotation;
        if (arrowAnnotation.text?.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }

      // Search in metadata tags
      if (annotation.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // Search in creator name
      if (annotation.creator.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Filter annotations by criteria
   */
  public filterAnnotations(criteria: {
    type?: Annotation['type'];
    layer?: string;
    group?: string;
    creator?: string;
    clinicalRelevance?: 'low' | 'medium' | 'high' | 'critical';
    validated?: boolean;
    dateRange?: { start: string; end: string };
  }): Annotation[] {
    return Array.from(this.annotations.values()).filter(annotation => {
      if (criteria.type && annotation.type !== criteria.type) return false;
      if (criteria.layer && annotation.layer !== criteria.layer) return false;
      if (criteria.group && annotation.group !== criteria.group) return false;
      if (criteria.creator && annotation.creator !== criteria.creator) return false;
      if (criteria.clinicalRelevance && annotation.metadata.clinicalRelevance !== criteria.clinicalRelevance) return false;
      if (criteria.validated !== undefined && annotation.metadata.validated !== criteria.validated) return false;
      
      if (criteria.dateRange) {
        const annotationDate = new Date(annotation.timestamp);
        const startDate = new Date(criteria.dateRange.start);
        const endDate = new Date(criteria.dateRange.end);
        if (annotationDate < startDate || annotationDate > endDate) return false;
      }

      return true;
    });
  }

  /**
   * Validate annotation
   */
  public validateAnnotation(annotationId: string, validator: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return false;

    annotation.metadata.validated = true;
    annotation.lastModified = new Date().toISOString();
    annotation.lastModifiedBy = validator;

    this.addToHistory('update', annotationId, { validated: true });

    console.log('📝 [AnnotationSystem] Validated annotation:', annotationId);
    return true;
  }

  /**
   * Smooth freehand annotation
   */
  public smoothFreehandAnnotation(annotationId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || annotation.type !== 'freehand') return false;

    const freehandAnnotation = annotation as FreehandAnnotation;
    if (freehandAnnotation.smoothed) return true;

    // Apply simple smoothing algorithm
    const smoothedPoints = this.applySmoothingFilter(freehandAnnotation.points);
    freehandAnnotation.points = smoothedPoints;
    freehandAnnotation.smoothed = true;

    this.addToHistory('update', annotationId, { smoothed: true });

    console.log('📝 [AnnotationSystem] Smoothed freehand annotation:', annotationId);
    return true;
  }

  /**
   * Apply smoothing filter to points
   */
  private applySmoothingFilter(points: (Point2D | Point3D)[]): (Point2D | Point3D)[] {
    if (points.length < 3) return points;

    const smoothed: (Point2D | Point3D)[] = [points[0]]; // Keep first point

    // Apply simple moving average
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const smoothedPoint: Point2D | Point3D = {
        x: (prev.x + curr.x + next.x) / 3,
        y: (prev.y + curr.y + next.y) / 3
      };

      if ('z' in curr && 'z' in prev && 'z' in next) {
        (smoothedPoint as Point3D).z = (prev.z + curr.z + next.z) / 3;
      }

      smoothed.push(smoothedPoint);
    }

    smoothed.push(points[points.length - 1]); // Keep last point
    return smoothed;
  }

  /**
   * Export annotations to JSON
   */
  public exportToJSON(sessionId?: string): string {
    const session = sessionId ? this.sessions.get(sessionId) : this.activeSession;
    if (!session) {
      return JSON.stringify({
        annotations: this.getAllAnnotations(),
        layers: Array.from(this.layers.values()),
        groups: Array.from(this.groups.values())
      }, null, 2);
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Export annotations to CSV
   */
  public exportToCSV(sessionId?: string): string {
    const annotations = sessionId ? 
      this.sessions.get(sessionId)?.annotations || [] : 
      this.getAllAnnotations();

    const headers = [
      'ID',
      'Type',
      'Text/Description',
      'X',
      'Y',
      'Z',
      'Layer',
      'Group',
      'Creator',
      'Timestamp',
      'Validated',
      'Clinical Relevance',
      'Tags'
    ];

    const rows = annotations.map(annotation => {
      let text = '';
      if (annotation.type === 'text') {
        text = (annotation as TextAnnotation).text;
      } else if (annotation.type === 'arrow') {
        text = (annotation as ArrowAnnotation).text || '';
      }

      return [
        annotation.id,
        annotation.type,
        text,
        annotation.position.x.toString(),
        annotation.position.y.toString(),
        ('z' in annotation.position) ? annotation.position.z.toString() : '',
        annotation.layer,
        annotation.group || '',
        annotation.creator,
        annotation.timestamp,
        annotation.metadata.validated.toString(),
        annotation.metadata.clinicalRelevance,
        annotation.metadata.tags.join(';')
      ];
    });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Import annotations from JSON
   */
  public importFromJSON(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.annotations) {
        // Import individual annotations
        data.annotations.forEach((annotation: Annotation) => {
          this.annotations.set(annotation.id, annotation);
        });
      }

      if (data.layers) {
        data.layers.forEach((layer: AnnotationLayer) => {
          this.layers.set(layer.id, layer);
        });
      }

      if (data.groups) {
        data.groups.forEach((group: AnnotationGroup) => {
          this.groups.set(group.id, group);
        });
      }

      if (data.id && data.annotations) {
        // Import session
        this.sessions.set(data.id, data);
      }

      console.log('📝 [AnnotationSystem] Imported annotations from JSON');
      return true;
    } catch (error) {
      console.error('📝 [AnnotationSystem] Import failed:', error);
      return false;
    }
  }

  /**
   * Create annotation template
   */
  public createTemplate(template: AnnotationTemplate): void {
    this.templates.set(template.id, template);
    console.log('📝 [AnnotationSystem] Created template:', template.name);
  }

  /**
   * Get all templates
   */
  public getTemplates(): AnnotationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  public getTemplatesByCategory(category: AnnotationTemplate['category']): AnnotationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get annotation statistics
   */
  public getStatistics(sessionId?: string): {
    totalAnnotations: number;
    annotationsByType: { [type: string]: number };
    annotationsByLayer: { [layer: string]: number };
    validatedCount: number;
    criticalCount: number;
    averageAnnotationsPerImage: number;
  } {
    const annotations = sessionId ? 
      this.sessions.get(sessionId)?.annotations || [] : 
      this.getAllAnnotations();

    const annotationsByType: { [type: string]: number } = {};
    const annotationsByLayer: { [layer: string]: number } = {};
    let validatedCount = 0;
    let criticalCount = 0;

    for (const annotation of annotations) {
      annotationsByType[annotation.type] = (annotationsByType[annotation.type] || 0) + 1;
      annotationsByLayer[annotation.layer] = (annotationsByLayer[annotation.layer] || 0) + 1;
      
      if (annotation.metadata.validated) {
        validatedCount++;
      }
      
      if (annotation.metadata.clinicalRelevance === 'critical') {
        criticalCount++;
      }
    }

    const uniqueImages = new Set(annotations.map(a => a.metadata.imageId)).size;

    return {
      totalAnnotations: annotations.length,
      annotationsByType,
      annotationsByLayer,
      validatedCount,
      criticalCount,
      averageAnnotationsPerImage: uniqueImages > 0 ? annotations.length / uniqueImages : 0
    };
  }

  /**
   * Complete annotation session
   */
  public completeSession(sessionId?: string): boolean {
    const session = sessionId ? this.sessions.get(sessionId) : this.activeSession;
    if (!session) return false;

    session.status = 'completed';
    session.endTime = new Date().toISOString();

    if (session === this.activeSession) {
      this.activeSession = null;
    }

    console.log('📝 [AnnotationSystem] Completed session:', session.id);
    return true;
  }

  /**
   * Clear all annotations
   */
  public clearAll(): void {
    this.annotations.clear();
    this.layers.clear();
    this.groups.clear();
    this.sessions.clear();
    this.activeSession = null;
    this.history = [];
    console.log('📝 [AnnotationSystem] Cleared all annotations and sessions');
  }

  /**
   * Get annotation history
   */
  public getHistory(sessionId?: string): AnnotationHistoryEntry[] {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      return session ? session.history : [];
    }
    return this.history;
  }

  /**
   * Undo last action
   */
  public undo(): boolean {
    const lastEntry = this.history[this.history.length - 1];
    if (!lastEntry) return false;

    // Implement undo logic based on action type
    switch (lastEntry.action) {
      case 'create':
        this.deleteAnnotation(lastEntry.annotationId);
        break;
      case 'delete':
        // Restore deleted annotation
        if (lastEntry.changes) {
          this.annotations.set(lastEntry.annotationId, lastEntry.changes);
        }
        break;
      case 'update':
        // Restore previous state
        if (lastEntry.previousState) {
          this.annotations.set(lastEntry.annotationId, lastEntry.previousState);
        }
        break;
    }

    // Remove the undone entry from history
    this.history.pop();
    
    console.log('📝 [AnnotationSystem] Undid action:', lastEntry.action);
    return true;
  }

  /**
   * Dispose of the annotation system
   */
  public dispose(): void {
    // Clear all data structures
    this.annotations.clear();
    this.layers.clear();
    this.groups.clear();
    this.templates.clear();
    this.sessions.clear();
    this.history = [];
    this.activeSession = null;
    
    console.log('🧹 [AnnotationSystem] Disposed');
  }
}

export { AnnotationSystem };