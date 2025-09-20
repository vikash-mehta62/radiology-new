/**
 * Advanced Measurement Tools
 * Comprehensive measurement system for medical imaging with calibration and real-world accuracy
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ImageCalibration {
  pixelSpacing: { x: number; y: number }; // mm per pixel
  sliceThickness: number; // mm
  imageOrientation: number[]; // DICOM image orientation
  imagePosition: Point3D; // DICOM image position
  rescaleSlope: number;
  rescaleIntercept: number;
}

export interface MeasurementPoint {
  id: string;
  position: Point2D | Point3D;
  timestamp: string;
  label?: string;
  metadata?: { [key: string]: any };
}

export interface BaseMeasurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'volume' | 'ellipse' | 'rectangle' | 'polygon' | 'spline';
  points: MeasurementPoint[];
  value: number;
  unit: string;
  label: string;
  description?: string;
  timestamp: string;
  calibration: ImageCalibration;
  style: {
    color: string;
    lineWidth: number;
    fontSize: number;
    showLabel: boolean;
    showValue: boolean;
    dashPattern?: number[];
  };
  metadata: {
    accuracy: number;
    confidence: number;
    imageId: string;
    sliceIndex?: number;
    creator: string;
    validated: boolean;
    [key: string]: any;
  };
}

export interface DistanceMeasurement extends BaseMeasurement {
  type: 'distance';
  startPoint: MeasurementPoint;
  endPoint: MeasurementPoint;
}

export interface AreaMeasurement extends BaseMeasurement {
  type: 'area' | 'ellipse' | 'rectangle' | 'polygon';
  perimeter: number;
  centroid: Point2D | Point3D;
}

export interface AngleMeasurement extends BaseMeasurement {
  type: 'angle';
  vertex: MeasurementPoint;
  arm1: MeasurementPoint;
  arm2: MeasurementPoint;
  angleType: 'acute' | 'obtuse' | 'right' | 'straight' | 'reflex';
}

export interface VolumeMeasurement extends BaseMeasurement {
  type: 'volume';
  slices: number[];
  boundingBox: {
    min: Point3D;
    max: Point3D;
  };
  surfaceArea: number;
}

export type Measurement = DistanceMeasurement | AreaMeasurement | AngleMeasurement | VolumeMeasurement;

export interface MeasurementTemplate {
  id: string;
  name: string;
  type: Measurement['type'];
  description: string;
  defaultStyle: BaseMeasurement['style'];
  requiredPoints: number;
  category: 'cardiac' | 'pulmonary' | 'skeletal' | 'abdominal' | 'neurological' | 'general';
  clinicalSignificance: string;
  normalRanges?: {
    min: number;
    max: number;
    unit: string;
    ageGroup?: string;
    gender?: 'male' | 'female' | 'all';
  }[];
}

export interface MeasurementSession {
  id: string;
  imageId: string;
  measurements: Measurement[];
  templates: MeasurementTemplate[];
  calibration: ImageCalibration;
  startTime: string;
  endTime?: string;
  creator: string;
  status: 'active' | 'completed' | 'validated';
}

class MeasurementTools {
  private measurements: Map<string, Measurement> = new Map();
  private templates: Map<string, MeasurementTemplate> = new Map();
  private sessions: Map<string, MeasurementSession> = new Map();
  private activeSession: MeasurementSession | null = null;

  // Predefined measurement templates
  private predefinedTemplates: MeasurementTemplate[] = [
    {
      id: 'cardiac-chamber-diameter',
      name: 'Cardiac Chamber Diameter',
      type: 'distance',
      description: 'Measurement of cardiac chamber diameter',
      defaultStyle: {
        color: '#ff4757',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      requiredPoints: 2,
      category: 'cardiac',
      clinicalSignificance: 'Assessment of cardiac chamber size and function',
      normalRanges: [
        { min: 35, max: 55, unit: 'mm', ageGroup: 'adult', gender: 'all' }
      ]
    },
    {
      id: 'lung-nodule-diameter',
      name: 'Lung Nodule Diameter',
      type: 'distance',
      description: 'Measurement of pulmonary nodule diameter',
      defaultStyle: {
        color: '#3742fa',
        lineWidth: 2,
        fontSize: 10,
        showLabel: true,
        showValue: true
      },
      requiredPoints: 2,
      category: 'pulmonary',
      clinicalSignificance: 'Nodule size assessment for malignancy risk stratification',
      normalRanges: [
        { min: 0, max: 8, unit: 'mm', ageGroup: 'adult', gender: 'all' }
      ]
    },
    {
      id: 'bone-density-area',
      name: 'Bone Density Area',
      type: 'area',
      description: 'Area measurement for bone density analysis',
      defaultStyle: {
        color: '#2ed573',
        lineWidth: 1,
        fontSize: 10,
        showLabel: true,
        showValue: true
      },
      requiredPoints: 3,
      category: 'skeletal',
      clinicalSignificance: 'Bone density assessment for osteoporosis screening'
    },
    {
      id: 'liver-volume',
      name: 'Liver Volume',
      type: 'volume',
      description: '3D liver volume measurement',
      defaultStyle: {
        color: '#ff6348',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      requiredPoints: 4,
      category: 'abdominal',
      clinicalSignificance: 'Liver size assessment for hepatomegaly evaluation',
      normalRanges: [
        { min: 1200, max: 1800, unit: 'cm³', ageGroup: 'adult', gender: 'all' }
      ]
    },
    {
      id: 'cobb-angle',
      name: 'Cobb Angle',
      type: 'angle',
      description: 'Spinal curvature measurement',
      defaultStyle: {
        color: '#ff9f43',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      requiredPoints: 3,
      category: 'skeletal',
      clinicalSignificance: 'Scoliosis severity assessment',
      normalRanges: [
        { min: 0, max: 10, unit: '°', ageGroup: 'all', gender: 'all' }
      ]
    }
  ];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize measurement tools
   */
  private initialize(): void {
    // Load predefined templates
    this.predefinedTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log('📏 [MeasurementTools] Initialized with', this.templates.size, 'templates');
  }

  /**
   * Create new measurement session
   */
  public createSession(imageId: string, calibration: ImageCalibration, creator: string = 'user'): MeasurementSession {
    const session: MeasurementSession = {
      id: `session-${Date.now()}`,
      imageId,
      measurements: [],
      templates: Array.from(this.templates.values()),
      calibration,
      startTime: new Date().toISOString(),
      creator,
      status: 'active'
    };

    this.sessions.set(session.id, session);
    this.activeSession = session;

    console.log('📏 [MeasurementTools] Created new session:', session.id);
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
  public getActiveSession(): MeasurementSession | null {
    return this.activeSession;
  }

  /**
   * Create distance measurement
   */
  public createDistanceMeasurement(
    startPoint: Point2D | Point3D,
    endPoint: Point2D | Point3D,
    templateId?: string,
    label?: string
  ): DistanceMeasurement {
    if (!this.activeSession) {
      throw new Error('No active measurement session');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const id = `measurement-${Date.now()}`;

    const startMeasurementPoint: MeasurementPoint = {
      id: `${id}-start`,
      position: startPoint,
      timestamp: new Date().toISOString(),
      label: 'Start'
    };

    const endMeasurementPoint: MeasurementPoint = {
      id: `${id}-end`,
      position: endPoint,
      timestamp: new Date().toISOString(),
      label: 'End'
    };

    // Calculate distance
    const distance = this.calculateDistance(startPoint, endPoint, this.activeSession.calibration);

    const measurement: DistanceMeasurement = {
      id,
      type: 'distance',
      points: [startMeasurementPoint, endMeasurementPoint],
      startPoint: startMeasurementPoint,
      endPoint: endMeasurementPoint,
      value: distance,
      unit: 'mm',
      label: label || template?.name || 'Distance',
      description: template?.description,
      timestamp: new Date().toISOString(),
      calibration: this.activeSession.calibration,
      style: template?.defaultStyle || {
        color: '#007bff',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      metadata: {
        accuracy: this.calculateAccuracy(distance, 'distance'),
        confidence: 0.95,
        imageId: this.activeSession.imageId,
        creator: this.activeSession.creator,
        validated: false,
        templateId
      }
    };

    this.measurements.set(id, measurement);
    this.activeSession.measurements.push(measurement);

    console.log('📏 [MeasurementTools] Created distance measurement:', distance.toFixed(2), 'mm');
    return measurement;
  }

  /**
   * Create area measurement
   */
  public createAreaMeasurement(
    points: (Point2D | Point3D)[],
    measurementType: 'area' | 'ellipse' | 'rectangle' | 'polygon' = 'polygon',
    templateId?: string,
    label?: string
  ): AreaMeasurement {
    if (!this.activeSession) {
      throw new Error('No active measurement session');
    }

    if (points.length < 3) {
      throw new Error('Area measurement requires at least 3 points');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const id = `measurement-${Date.now()}`;

    const measurementPoints: MeasurementPoint[] = points.map((point, index) => ({
      id: `${id}-point-${index}`,
      position: point,
      timestamp: new Date().toISOString(),
      label: `Point ${index + 1}`
    }));

    // Calculate area and perimeter
    const area = this.calculateArea(points, this.activeSession.calibration);
    const perimeter = this.calculatePerimeter(points, this.activeSession.calibration);
    const centroid = this.calculateCentroid(points);

    const measurement: AreaMeasurement = {
      id,
      type: measurementType,
      points: measurementPoints,
      value: area,
      unit: 'mm²',
      perimeter,
      centroid,
      label: label || template?.name || 'Area',
      description: template?.description,
      timestamp: new Date().toISOString(),
      calibration: this.activeSession.calibration,
      style: template?.defaultStyle || {
        color: '#28a745',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      metadata: {
        accuracy: this.calculateAccuracy(area, 'area'),
        confidence: 0.90,
        imageId: this.activeSession.imageId,
        creator: this.activeSession.creator,
        validated: false,
        templateId
      }
    };

    this.measurements.set(id, measurement);
    this.activeSession.measurements.push(measurement);

    console.log('📏 [MeasurementTools] Created area measurement:', area.toFixed(2), 'mm²');
    return measurement;
  }

  /**
   * Create angle measurement
   */
  public createAngleMeasurement(
    vertex: Point2D | Point3D,
    arm1: Point2D | Point3D,
    arm2: Point2D | Point3D,
    templateId?: string,
    label?: string
  ): AngleMeasurement {
    if (!this.activeSession) {
      throw new Error('No active measurement session');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const id = `measurement-${Date.now()}`;

    const vertexPoint: MeasurementPoint = {
      id: `${id}-vertex`,
      position: vertex,
      timestamp: new Date().toISOString(),
      label: 'Vertex'
    };

    const arm1Point: MeasurementPoint = {
      id: `${id}-arm1`,
      position: arm1,
      timestamp: new Date().toISOString(),
      label: 'Arm 1'
    };

    const arm2Point: MeasurementPoint = {
      id: `${id}-arm2`,
      position: arm2,
      timestamp: new Date().toISOString(),
      label: 'Arm 2'
    };

    // Calculate angle
    const angle = this.calculateAngle(vertex, arm1, arm2);
    const angleType = this.classifyAngle(angle);

    const measurement: AngleMeasurement = {
      id,
      type: 'angle',
      points: [vertexPoint, arm1Point, arm2Point],
      vertex: vertexPoint,
      arm1: arm1Point,
      arm2: arm2Point,
      value: angle,
      unit: '°',
      angleType,
      label: label || template?.name || 'Angle',
      description: template?.description,
      timestamp: new Date().toISOString(),
      calibration: this.activeSession.calibration,
      style: template?.defaultStyle || {
        color: '#ffc107',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      metadata: {
        accuracy: this.calculateAccuracy(angle, 'angle'),
        confidence: 0.92,
        imageId: this.activeSession.imageId,
        creator: this.activeSession.creator,
        validated: false,
        templateId
      }
    };

    this.measurements.set(id, measurement);
    this.activeSession.measurements.push(measurement);

    console.log('📏 [MeasurementTools] Created angle measurement:', angle.toFixed(1), '°');
    return measurement;
  }

  /**
   * Create volume measurement
   */
  public createVolumeMeasurement(
    contours: (Point2D | Point3D)[][],
    sliceIndices: number[],
    templateId?: string,
    label?: string
  ): VolumeMeasurement {
    if (!this.activeSession) {
      throw new Error('No active measurement session');
    }

    if (contours.length !== sliceIndices.length) {
      throw new Error('Number of contours must match number of slice indices');
    }

    const template = templateId ? this.templates.get(templateId) : null;
    const id = `measurement-${Date.now()}`;

    // Flatten all contour points
    const allPoints = contours.flat();
    const measurementPoints: MeasurementPoint[] = allPoints.map((point, index) => ({
      id: `${id}-point-${index}`,
      position: point,
      timestamp: new Date().toISOString(),
      label: `Contour Point ${index + 1}`
    }));

    // Calculate volume using slice-based integration
    const volume = this.calculateVolume(contours, sliceIndices, this.activeSession.calibration);
    const surfaceArea = this.calculateSurfaceArea(contours, sliceIndices, this.activeSession.calibration);
    const boundingBox = this.calculateBoundingBox(allPoints);

    const measurement: VolumeMeasurement = {
      id,
      type: 'volume',
      points: measurementPoints,
      value: volume,
      unit: 'mm³',
      slices: sliceIndices,
      boundingBox,
      surfaceArea,
      label: label || template?.name || 'Volume',
      description: template?.description,
      timestamp: new Date().toISOString(),
      calibration: this.activeSession.calibration,
      style: template?.defaultStyle || {
        color: '#dc3545',
        lineWidth: 2,
        fontSize: 12,
        showLabel: true,
        showValue: true
      },
      metadata: {
        accuracy: this.calculateAccuracy(volume, 'volume'),
        confidence: 0.88,
        imageId: this.activeSession.imageId,
        creator: this.activeSession.creator,
        validated: false,
        templateId,
        sliceCount: sliceIndices.length
      }
    };

    this.measurements.set(id, measurement);
    this.activeSession.measurements.push(measurement);

    console.log('📏 [MeasurementTools] Created volume measurement:', (volume / 1000).toFixed(2), 'cm³');
    return measurement;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    point1: Point2D | Point3D,
    point2: Point2D | Point3D,
    calibration: ImageCalibration
  ): number {
    const dx = (point2.x - point1.x) * calibration.pixelSpacing.x;
    const dy = (point2.y - point1.y) * calibration.pixelSpacing.y;
    
    if ('z' in point1 && 'z' in point2) {
      const dz = (point2.z - point1.z) * calibration.sliceThickness;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate area of polygon
   */
  private calculateArea(points: (Point2D | Point3D)[], calibration: ImageCalibration): number {
    if (points.length < 3) return 0;

    // Convert to 2D if needed and apply calibration
    const calibratedPoints = points.map(p => ({
      x: p.x * calibration.pixelSpacing.x,
      y: p.y * calibration.pixelSpacing.y
    }));

    // Shoelace formula
    let area = 0;
    const n = calibratedPoints.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += calibratedPoints[i].x * calibratedPoints[j].y;
      area -= calibratedPoints[j].x * calibratedPoints[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  /**
   * Calculate perimeter of polygon
   */
  private calculatePerimeter(points: (Point2D | Point3D)[], calibration: ImageCalibration): number {
    if (points.length < 2) return 0;

    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const nextIndex = (i + 1) % points.length;
      perimeter += this.calculateDistance(points[i], points[nextIndex], calibration);
    }
    
    return perimeter;
  }

  /**
   * Calculate centroid of polygon
   */
  private calculateCentroid(points: (Point2D | Point3D)[]): Point2D | Point3D {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0 };

    let sumX = 0, sumY = 0, sumZ = 0;
    let hasZ = false;

    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
      if ('z' in point) {
        sumZ += point.z;
        hasZ = true;
      }
    }

    if (hasZ) {
      return { x: sumX / n, y: sumY / n, z: sumZ / n };
    } else {
      return { x: sumX / n, y: sumY / n };
    }
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(
    vertex: Point2D | Point3D,
    arm1: Point2D | Point3D,
    arm2: Point2D | Point3D
  ): number {
    // Create vectors from vertex to each arm
    const v1 = {
      x: arm1.x - vertex.x,
      y: arm1.y - vertex.y,
      z: ('z' in arm1 && 'z' in vertex) ? arm1.z - vertex.z : 0
    };

    const v2 = {
      x: arm2.x - vertex.x,
      y: arm2.y - vertex.y,
      z: ('z' in arm2 && 'z' in vertex) ? arm2.z - vertex.z : 0
    };

    // Calculate dot product
    const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

    // Calculate magnitudes
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

    if (mag1 === 0 || mag2 === 0) return 0;

    // Calculate angle in radians, then convert to degrees
    const cosAngle = dotProduct / (mag1 * mag2);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    return angleRad * (180 / Math.PI);
  }

  /**
   * Classify angle type
   */
  private classifyAngle(angle: number): AngleMeasurement['angleType'] {
    if (angle < 90) return 'acute';
    if (angle === 90) return 'right';
    if (angle < 180) return 'obtuse';
    if (angle === 180) return 'straight';
    return 'reflex';
  }

  /**
   * Calculate volume using slice-based integration
   */
  private calculateVolume(
    contours: (Point2D | Point3D)[][],
    sliceIndices: number[],
    calibration: ImageCalibration
  ): number {
    let totalVolume = 0;

    for (let i = 0; i < contours.length; i++) {
      const area = this.calculateArea(contours[i], calibration);
      totalVolume += area * calibration.sliceThickness;
    }

    return totalVolume;
  }

  /**
   * Calculate surface area (simplified)
   */
  private calculateSurfaceArea(
    contours: (Point2D | Point3D)[][],
    sliceIndices: number[],
    calibration: ImageCalibration
  ): number {
    let totalSurfaceArea = 0;

    // Calculate lateral surface area
    for (let i = 0; i < contours.length - 1; i++) {
      const perimeter1 = this.calculatePerimeter(contours[i], calibration);
      const perimeter2 = this.calculatePerimeter(contours[i + 1], calibration);
      const avgPerimeter = (perimeter1 + perimeter2) / 2;
      totalSurfaceArea += avgPerimeter * calibration.sliceThickness;
    }

    // Add top and bottom areas
    if (contours.length > 0) {
      totalSurfaceArea += this.calculateArea(contours[0], calibration);
      totalSurfaceArea += this.calculateArea(contours[contours.length - 1], calibration);
    }

    return totalSurfaceArea;
  }

  /**
   * Calculate bounding box
   */
  private calculateBoundingBox(points: (Point2D | Point3D)[]): { min: Point3D; max: Point3D } {
    if (points.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      
      if ('z' in point) {
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
      }
    }

    return {
      min: { x: minX, y: minY, z: minZ === Infinity ? 0 : minZ },
      max: { x: maxX, y: maxY, z: maxZ === -Infinity ? 0 : maxZ }
    };
  }

  /**
   * Calculate measurement accuracy
   */
  private calculateAccuracy(value: number, type: string): number {
    // Simplified accuracy calculation based on measurement type and value
    switch (type) {
      case 'distance':
        return value > 10 ? 0.95 : 0.85; // Higher accuracy for larger distances
      case 'area':
        return value > 100 ? 0.90 : 0.80;
      case 'angle':
        return 0.92; // Angles generally have good accuracy
      case 'volume':
        return value > 1000 ? 0.85 : 0.75; // Volume measurements are less accurate
      default:
        return 0.80;
    }
  }

  /**
   * Update measurement
   */
  public updateMeasurement(measurementId: string, updates: Partial<Measurement>): boolean {
    const measurement = this.measurements.get(measurementId);
    if (!measurement) return false;

    // Update measurement properties
    Object.assign(measurement, updates);

    // Recalculate value if points changed
    if (updates.points) {
      switch (measurement.type) {
        case 'distance':
          const distMeasurement = measurement as DistanceMeasurement;
          if (distMeasurement.points.length >= 2) {
            measurement.value = this.calculateDistance(
              distMeasurement.points[0].position,
              distMeasurement.points[1].position,
              measurement.calibration
            );
          }
          break;
        case 'area':
        case 'polygon':
        case 'ellipse':
        case 'rectangle':
          if (measurement.points.length >= 3) {
            measurement.value = this.calculateArea(
              measurement.points.map(p => p.position),
              measurement.calibration
            );
          }
          break;
        case 'angle':
          const angleMeasurement = measurement as AngleMeasurement;
          if (angleMeasurement.points.length >= 3) {
            measurement.value = this.calculateAngle(
              angleMeasurement.points[0].position,
              angleMeasurement.points[1].position,
              angleMeasurement.points[2].position
            );
          }
          break;
      }
    }

    console.log('📏 [MeasurementTools] Updated measurement:', measurementId);
    return true;
  }

  /**
   * Delete measurement
   */
  public deleteMeasurement(measurementId: string): boolean {
    const measurement = this.measurements.get(measurementId);
    if (!measurement) return false;

    this.measurements.delete(measurementId);

    // Remove from active session
    if (this.activeSession) {
      this.activeSession.measurements = this.activeSession.measurements.filter(
        m => m.id !== measurementId
      );
    }

    console.log('📏 [MeasurementTools] Deleted measurement:', measurementId);
    return true;
  }

  /**
   * Get measurement by ID
   */
  public getMeasurement(measurementId: string): Measurement | null {
    return this.measurements.get(measurementId) || null;
  }

  /**
   * Get all measurements
   */
  public getAllMeasurements(): Measurement[] {
    return Array.from(this.measurements.values());
  }

  /**
   * Get measurements by type
   */
  public getMeasurementsByType(type: Measurement['type']): Measurement[] {
    return Array.from(this.measurements.values()).filter(m => m.type === type);
  }

  /**
   * Get measurements by session
   */
  public getMeasurementsBySession(sessionId: string): Measurement[] {
    const session = this.sessions.get(sessionId);
    return session ? session.measurements : [];
  }

  /**
   * Validate measurement against normal ranges
   */
  public validateMeasurement(measurementId: string): {
    isNormal: boolean;
    normalRange?: { min: number; max: number; unit: string };
    deviation?: number;
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
  } {
    const measurement = this.measurements.get(measurementId);
    if (!measurement || !measurement.metadata.templateId) {
      return { isNormal: true, severity: 'normal' };
    }

    const template = this.templates.get(measurement.metadata.templateId);
    if (!template || !template.normalRanges) {
      return { isNormal: true, severity: 'normal' };
    }

    // Find appropriate normal range (simplified - would need age/gender matching)
    const normalRange = template.normalRanges[0];
    const value = measurement.value;
    
    const isNormal = value >= normalRange.min && value <= normalRange.max;
    
    let deviation = 0;
    let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
    
    if (!isNormal) {
      if (value < normalRange.min) {
        deviation = ((normalRange.min - value) / normalRange.min) * 100;
      } else {
        deviation = ((value - normalRange.max) / normalRange.max) * 100;
      }
      
      if (deviation < 20) severity = 'mild';
      else if (deviation < 50) severity = 'moderate';
      else severity = 'severe';
    }

    return {
      isNormal,
      normalRange,
      deviation,
      severity
    };
  }

  /**
   * Create measurement template
   */
  public createTemplate(template: MeasurementTemplate): void {
    this.templates.set(template.id, template);
    console.log('📏 [MeasurementTools] Created template:', template.name);
  }

  /**
   * Get all templates
   */
  public getTemplates(): MeasurementTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  public getTemplatesByCategory(category: MeasurementTemplate['category']): MeasurementTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Complete measurement session
   */
  public completeSession(sessionId?: string): boolean {
    const session = sessionId ? this.sessions.get(sessionId) : this.activeSession;
    if (!session) return false;

    session.status = 'completed';
    session.endTime = new Date().toISOString();

    if (session === this.activeSession) {
      this.activeSession = null;
    }

    console.log('📏 [MeasurementTools] Completed session:', session.id);
    return true;
  }

  /**
   * Export measurements to CSV
   */
  public exportToCSV(sessionId?: string): string {
    const measurements = sessionId ? 
      this.getMeasurementsBySession(sessionId) : 
      this.getAllMeasurements();

    const headers = [
      'ID',
      'Type',
      'Label',
      'Value',
      'Unit',
      'Accuracy',
      'Confidence',
      'Timestamp',
      'Creator',
      'Validated',
      'Image ID'
    ];

    const rows = measurements.map(m => [
      m.id,
      m.type,
      m.label,
      m.value.toFixed(3),
      m.unit,
      m.metadata.accuracy.toFixed(3),
      m.metadata.confidence.toFixed(3),
      m.timestamp,
      m.metadata.creator,
      m.metadata.validated.toString(),
      m.metadata.imageId
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Export measurements to JSON
   */
  public exportToJSON(sessionId?: string): string {
    const session = sessionId ? this.sessions.get(sessionId) : this.activeSession;
    if (!session) {
      return JSON.stringify({ measurements: this.getAllMeasurements() }, null, 2);
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Import measurements from JSON
   */
  public importFromJSON(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.measurements) {
        // Import individual measurements
        data.measurements.forEach((measurement: Measurement) => {
          this.measurements.set(measurement.id, measurement);
        });
      } else if (data.id && data.measurements) {
        // Import session
        this.sessions.set(data.id, data);
      }

      console.log('📏 [MeasurementTools] Imported measurements from JSON');
      return true;
    } catch (error) {
      console.error('📏 [MeasurementTools] Import failed:', error);
      return false;
    }
  }

  /**
   * Calculate measurement statistics
   */
  public getStatistics(sessionId?: string): {
    totalMeasurements: number;
    measurementsByType: { [type: string]: number };
    averageAccuracy: number;
    averageConfidence: number;
    validatedCount: number;
    abnormalCount: number;
  } {
    const measurements = sessionId ? 
      this.getMeasurementsBySession(sessionId) : 
      this.getAllMeasurements();

    const measurementsByType: { [type: string]: number } = {};
    let totalAccuracy = 0;
    let totalConfidence = 0;
    let validatedCount = 0;
    let abnormalCount = 0;

    for (const measurement of measurements) {
      measurementsByType[measurement.type] = (measurementsByType[measurement.type] || 0) + 1;
      totalAccuracy += measurement.metadata.accuracy;
      totalConfidence += measurement.metadata.confidence;
      
      if (measurement.metadata.validated) {
        validatedCount++;
      }

      const validation = this.validateMeasurement(measurement.id);
      if (!validation.isNormal) {
        abnormalCount++;
      }
    }

    return {
      totalMeasurements: measurements.length,
      measurementsByType,
      averageAccuracy: measurements.length > 0 ? totalAccuracy / measurements.length : 0,
      averageConfidence: measurements.length > 0 ? totalConfidence / measurements.length : 0,
      validatedCount,
      abnormalCount
    };
  }

  /**
   * Clear all measurements
   */
  public clearAll(): void {
    this.measurements.clear();
    this.sessions.clear();
    this.activeSession = null;
    console.log('📏 [MeasurementTools] Cleared all measurements and sessions');
  }
}

export { MeasurementTools };