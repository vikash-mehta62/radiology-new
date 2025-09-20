/**
 * Measurement and Annotation Persistence System
 * Handles data persistence across viewer sessions with export/import capabilities and version control
 */

import { Measurement, MeasurementSession, MeasurementTools } from './measurementTools';
import { Annotation, AnnotationSession, AnnotationSystem } from './annotationSystem';

export interface PersistenceConfig {
  storageType: 'localStorage' | 'indexedDB' | 'server' | 'hybrid';
  autoSave: boolean;
  autoSaveInterval: number; // milliseconds
  maxVersions: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  serverEndpoint?: string;
  apiKey?: string;
}

export interface StorageMetadata {
  id: string;
  type: 'measurement' | 'annotation' | 'combined';
  imageId: string;
  studyId?: string;
  seriesId?: string;
  patientId?: string;
  creator: string;
  createdAt: string;
  lastModified: string;
  version: number;
  size: number; // bytes
  checksum: string;
  tags: string[];
  description?: string;
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'xml' | 'dicom-sr' | 'pdf' | 'excel';
  includeMetadata: boolean;
  includeHistory: boolean;
  includeValidation: boolean;
  compression: 'none' | 'gzip' | 'zip';
  encryption: 'none' | 'aes256';
}

export interface ImportResult {
  success: boolean;
  imported: {
    measurements: number;
    annotations: number;
    sessions: number;
  };
  errors: string[];
  warnings: string[];
  duplicates: string[];
}

export interface SyncStatus {
  lastSync: string;
  pendingChanges: number;
  conflicts: number;
  status: 'synced' | 'pending' | 'error' | 'offline';
}

export interface BackupInfo {
  id: string;
  timestamp: string;
  size: number;
  itemCount: number;
  type: 'manual' | 'automatic';
  description?: string;
}

class MeasurementAnnotationPersistence {
  private config: PersistenceConfig;
  private measurementTools: MeasurementTools;
  private annotationSystem: AnnotationSystem;
  private autoSaveTimer: number | null = null;
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;

  // Storage keys
  private readonly STORAGE_KEYS = {
    measurements: 'medical-viewer-measurements',
    annotations: 'medical-viewer-annotations',
    sessions: 'medical-viewer-sessions',
    metadata: 'medical-viewer-metadata',
    config: 'medical-viewer-config',
    backups: 'medical-viewer-backups'
  };

  constructor(
    measurementTools: MeasurementTools,
    annotationSystem: AnnotationSystem,
    config: Partial<PersistenceConfig> = {}
  ) {
    this.measurementTools = measurementTools;
    this.annotationSystem = annotationSystem;
    
    this.config = {
      storageType: 'hybrid',
      autoSave: true,
      autoSaveInterval: 30000, // 30 seconds
      maxVersions: 10,
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize persistence system
   */
  private async initialize(): Promise<void> {
    try {
      console.log('💾 [MeasurementAnnotationPersistence] Initializing...');

      // Initialize storage based on configuration
      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          await this.initializeIndexedDB();
          break;
        case 'localStorage':
          this.initializeLocalStorage();
          break;
        case 'server':
          await this.initializeServerStorage();
          break;
      }

      // Setup auto-save if enabled
      if (this.config.autoSave) {
        this.startAutoSave();
      }

      // Load existing data
      await this.loadExistingData();

      this.isInitialized = true;
      console.log('💾 [MeasurementAnnotationPersistence] Initialized successfully');

    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MedicalViewerDB', 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('💾 [MeasurementAnnotationPersistence] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('measurements')) {
          const measurementStore = db.createObjectStore('measurements', { keyPath: 'id' });
          measurementStore.createIndex('imageId', 'imageId', { unique: false });
          measurementStore.createIndex('creator', 'creator', { unique: false });
          measurementStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('annotations')) {
          const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotationStore.createIndex('imageId', 'imageId', { unique: false });
          annotationStore.createIndex('creator', 'creator', { unique: false });
          annotationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('imageId', 'imageId', { unique: false });
          sessionStore.createIndex('creator', 'creator', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
          backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Initialize localStorage
   */
  private initializeLocalStorage(): void {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      throw new Error('localStorage not supported');
    }
    console.log('💾 [MeasurementAnnotationPersistence] localStorage initialized');
  }

  /**
   * Initialize server storage
   */
  private async initializeServerStorage(): Promise<void> {
    if (!this.config.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    try {
      const response = await fetch(`${this.config.serverEndpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Server storage not available');
      }

      console.log('💾 [MeasurementAnnotationPersistence] Server storage initialized');
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Server storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = window.setInterval(() => {
      this.autoSaveData();
    }, this.config.autoSaveInterval);

    console.log('💾 [MeasurementAnnotationPersistence] Auto-save started');
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Auto-save current data
   */
  private async autoSaveData(): Promise<void> {
    try {
      const measurementSession = this.measurementTools.getActiveSession();
      const annotationSession = this.annotationSystem.getActiveSession();

      if (measurementSession) {
        await this.saveMeasurementSession(measurementSession);
      }

      if (annotationSession) {
        await this.saveAnnotationSession(annotationSession);
      }

      console.log('💾 [MeasurementAnnotationPersistence] Auto-save completed');
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Auto-save failed:', error);
    }
  }

  /**
   * Load existing data
   */
  private async loadExistingData(): Promise<void> {
    try {
      // Load measurement sessions
      const measurementSessions = await this.loadMeasurementSessions();
      console.log('💾 [MeasurementAnnotationPersistence] Loaded', measurementSessions.length, 'measurement sessions');

      // Load annotation sessions
      const annotationSessions = await this.loadAnnotationSessions();
      console.log('💾 [MeasurementAnnotationPersistence] Loaded', annotationSessions.length, 'annotation sessions');

    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to load existing data:', error);
    }
  }

  /**
   * Save measurement session
   */
  public async saveMeasurementSession(session: MeasurementSession): Promise<boolean> {
    try {
      const data = {
        ...session,
        lastSaved: new Date().toISOString()
      };

      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          await this.saveToIndexedDB('sessions', data);
          break;
        case 'localStorage':
          this.saveToLocalStorage(`${this.STORAGE_KEYS.sessions}-${session.id}`, data);
          break;
        case 'server':
          await this.saveToServer('measurement-sessions', data);
          break;
      }

      // Save individual measurements
      for (const measurement of session.measurements) {
        await this.saveMeasurement(measurement);
      }

      console.log('💾 [MeasurementAnnotationPersistence] Saved measurement session:', session.id);
      return true;
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to save measurement session:', error);
      return false;
    }
  }

  /**
   * Save annotation session
   */
  public async saveAnnotationSession(session: AnnotationSession): Promise<boolean> {
    try {
      const data = {
        ...session,
        lastSaved: new Date().toISOString()
      };

      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          await this.saveToIndexedDB('sessions', data);
          break;
        case 'localStorage':
          this.saveToLocalStorage(`${this.STORAGE_KEYS.sessions}-${session.id}`, data);
          break;
        case 'server':
          await this.saveToServer('annotation-sessions', data);
          break;
      }

      // Save individual annotations
      for (const annotation of session.annotations) {
        await this.saveAnnotation(annotation);
      }

      console.log('💾 [MeasurementAnnotationPersistence] Saved annotation session:', session.id);
      return true;
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to save annotation session:', error);
      return false;
    }
  }

  /**
   * Save measurement
   */
  public async saveMeasurement(measurement: Measurement): Promise<boolean> {
    try {
      const data = {
        ...measurement,
        lastSaved: new Date().toISOString()
      };

      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          await this.saveToIndexedDB('measurements', data);
          break;
        case 'localStorage':
          this.saveToLocalStorage(`${this.STORAGE_KEYS.measurements}-${measurement.id}`, data);
          break;
        case 'server':
          await this.saveToServer('measurements', data);
          break;
      }

      return true;
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to save measurement:', error);
      return false;
    }
  }

  /**
   * Save annotation
   */
  public async saveAnnotation(annotation: Annotation): Promise<boolean> {
    try {
      const data = {
        ...annotation,
        lastSaved: new Date().toISOString()
      };

      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          await this.saveToIndexedDB('annotations', data);
          break;
        case 'localStorage':
          this.saveToLocalStorage(`${this.STORAGE_KEYS.annotations}-${annotation.id}`, data);
          break;
        case 'server':
          await this.saveToServer('annotations', data);
          break;
      }

      return true;
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to save annotation:', error);
      return false;
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save to IndexedDB'));
    });
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(key: string, data: any): void {
    try {
      const serialized = JSON.stringify(data);
      const compressed = this.config.compressionEnabled ? this.compress(serialized) : serialized;
      localStorage.setItem(key, compressed);
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  }

  /**
   * Save to server
   */
  private async saveToServer(endpoint: string, data: any): Promise<void> {
    if (!this.config.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    const response = await fetch(`${this.config.serverEndpoint}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Server save failed: ${response.statusText}`);
    }
  }

  /**
   * Load measurement sessions
   */
  public async loadMeasurementSessions(): Promise<MeasurementSession[]> {
    try {
      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          return await this.loadFromIndexedDB('sessions', 'measurement');
        case 'localStorage':
          return this.loadFromLocalStorage(this.STORAGE_KEYS.sessions, 'measurement');
        case 'server':
          return await this.loadFromServer('measurement-sessions');
        default:
          return [];
      }
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to load measurement sessions:', error);
      return [];
    }
  }

  /**
   * Load annotation sessions
   */
  public async loadAnnotationSessions(): Promise<AnnotationSession[]> {
    try {
      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          return await this.loadFromIndexedDB('sessions', 'annotation');
        case 'localStorage':
          return this.loadFromLocalStorage(this.STORAGE_KEYS.sessions, 'annotation');
        case 'server':
          return await this.loadFromServer('annotation-sessions');
        default:
          return [];
      }
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to load annotation sessions:', error);
      return [];
    }
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(storeName: string, type?: string): Promise<any[]> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result;
        if (type) {
          results = results.filter((item: any) => item.type === type);
        }
        resolve(results);
      };
      request.onerror = () => reject(new Error('Failed to load from IndexedDB'));
    });
  }

  /**
   * Load from localStorage
   */
  private loadFromLocalStorage(keyPrefix: string, type?: string): any[] {
    const results: any[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(keyPrefix)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const decompressed = this.config.compressionEnabled ? this.decompress(data) : data;
            const parsed = JSON.parse(decompressed);
            
            if (!type || parsed.type === type) {
              results.push(parsed);
            }
          }
        } catch (error) {
          console.warn('💾 [MeasurementAnnotationPersistence] Failed to parse stored data:', key);
        }
      }
    }
    
    return results;
  }

  /**
   * Load from server
   */
  private async loadFromServer(endpoint: string): Promise<any[]> {
    if (!this.config.serverEndpoint) {
      throw new Error('Server endpoint not configured');
    }

    const response = await fetch(`${this.config.serverEndpoint}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Server load failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**

   * Export data in specified format
   */
  public async exportData(
    format: ExportFormat,
    sessionIds?: string[],
    filename?: string
  ): Promise<Blob> {
    try {
      let data: any;
      
      if (sessionIds) {
        // Export specific sessions
        const measurementSessions = await Promise.all(
          sessionIds.map(id => this.loadMeasurementSession(id))
        );
        const annotationSessions = await Promise.all(
          sessionIds.map(id => this.loadAnnotationSession(id))
        );
        
        data = {
          measurementSessions: measurementSessions.filter(Boolean),
          annotationSessions: annotationSessions.filter(Boolean)
        };
      } else {
        // Export all data
        data = {
          measurementSessions: await this.loadMeasurementSessions(),
          annotationSessions: await this.loadAnnotationSessions()
        };
      }

      // Add metadata if requested
      if (format.includeMetadata) {
        data.metadata = {
          exportDate: new Date().toISOString(),
          version: '1.0',
          format: format.format,
          totalMeasurements: data.measurementSessions.reduce((sum: number, session: any) => 
            sum + (session?.measurements?.length || 0), 0),
          totalAnnotations: data.annotationSessions.reduce((sum: number, session: any) => 
            sum + (session?.annotations?.length || 0), 0)
        };
      }

      // Convert to requested format
      let content: string;
      let mimeType: string;

      switch (format.format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          break;
        case 'csv':
          content = this.convertToCSV(data);
          mimeType = 'text/csv';
          break;
        case 'xml':
          content = this.convertToXML(data);
          mimeType = 'application/xml';
          break;
        case 'dicom-sr':
          content = this.convertToDICOMSR(data);
          mimeType = 'application/dicom';
          break;
        case 'pdf':
          return await this.convertToPDF(data);
        case 'excel':
          return await this.convertToExcel(data);
        default:
          throw new Error(`Unsupported export format: ${format.format}`);
      }

      // Apply compression if requested
      if (format.compression !== 'none') {
        content = this.compress(content);
        mimeType = 'application/octet-stream';
      }

      // Apply encryption if requested
      if (format.encryption !== 'none') {
        content = await this.encrypt(content);
        mimeType = 'application/octet-stream';
      }

      return new Blob([content], { type: mimeType });

    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Export failed:', error);
      throw error;
    }
  }

  /**
   * Import data from file
   */
  public async importData(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { measurements: 0, annotations: 0, sessions: 0 },
      errors: [],
      warnings: [],
      duplicates: []
    };

    try {
      let content = await this.readFileContent(file);
      
      // Detect and handle compression/encryption
      if (this.isCompressed(content)) {
        content = this.decompress(content);
      }
      
      if (this.isEncrypted(content)) {
        content = await this.decrypt(content);
      }

      // Parse content based on file type
      let data: any;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      switch (fileExtension) {
        case 'json':
          data = JSON.parse(content);
          break;
        case 'csv':
          data = this.parseCSV(content);
          break;
        case 'xml':
          data = this.parseXML(content);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      // Import measurement sessions
      if (data.measurementSessions) {
        for (const session of data.measurementSessions) {
          try {
            // Check for duplicates
            const existing = await this.loadMeasurementSession(session.id);
            if (existing) {
              result.duplicates.push(`Measurement session: ${session.id}`);
              continue;
            }

            await this.saveMeasurementSession(session);
            result.imported.sessions++;
            result.imported.measurements += session.measurements?.length || 0;
          } catch (error) {
            result.errors.push(`Failed to import measurement session ${session.id}: ${error}`);
          }
        }
      }

      // Import annotation sessions
      if (data.annotationSessions) {
        for (const session of data.annotationSessions) {
          try {
            // Check for duplicates
            const existing = await this.loadAnnotationSession(session.id);
            if (existing) {
              result.duplicates.push(`Annotation session: ${session.id}`);
              continue;
            }

            await this.saveAnnotationSession(session);
            result.imported.sessions++;
            result.imported.annotations += session.annotations?.length || 0;
          } catch (error) {
            result.errors.push(`Failed to import annotation session ${session.id}: ${error}`);
          }
        }
      }

      result.success = result.errors.length === 0;
      console.log('💾 [MeasurementAnnotationPersistence] Import completed:', result);

    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      console.error('💾 [MeasurementAnnotationPersistence] Import failed:', error);
    }

    return result;
  }

  /**
   * Create backup
   */
  public async createBackup(description?: string): Promise<BackupInfo> {
    try {
      const backupId = `backup-${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Collect all data
      const data = {
        measurementSessions: await this.loadMeasurementSessions(),
        annotationSessions: await this.loadAnnotationSessions(),
        metadata: {
          backupId,
          timestamp,
          version: '1.0'
        }
      };

      const content = JSON.stringify(data);
      const compressed = this.compress(content);

      // Save backup
      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp,
        size: compressed.length,
        itemCount: data.measurementSessions.length + data.annotationSessions.length,
        type: 'manual',
        description
      };

      await this.saveToIndexedDB('backups', {
        ...backupInfo,
        data: compressed
      });

      console.log('💾 [MeasurementAnnotationPersistence] Backup created:', backupId);
      return backupInfo;

    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      if (!this.db) throw new Error('IndexedDB not initialized');

      const backup = await this.loadFromIndexedDB('backups');
      const backupData = backup.find((b: any) => b.id === backupId);
      
      if (!backupData) {
        throw new Error('Backup not found');
      }

      const decompressed = this.decompress(backupData.data);
      const data = JSON.parse(decompressed);

      // Clear existing data
      await this.clearAllData();

      // Restore measurement sessions
      for (const session of data.measurementSessions) {
        await this.saveMeasurementSession(session);
      }

      // Restore annotation sessions
      for (const session of data.annotationSessions) {
        await this.saveAnnotationSession(session);
      }

      console.log('💾 [MeasurementAnnotationPersistence] Restored from backup:', backupId);
      return true;

    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Restore failed:', error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): SyncStatus {
    // Simplified sync status - would be more complex in real implementation
    return {
      lastSync: localStorage.getItem('last-sync') || 'never',
      pendingChanges: 0,
      conflicts: 0,
      status: 'synced'
    };
  }

  /**
   * Sync with server
   */
  public async syncWithServer(): Promise<boolean> {
    if (this.config.storageType !== 'server' && this.config.storageType !== 'hybrid') {
      return false;
    }

    try {
      // Get local changes since last sync
      const lastSync = localStorage.getItem('last-sync');
      const localChanges = await this.getChangesSince(lastSync);

      // Push local changes to server
      if (localChanges.length > 0) {
        await this.pushChangesToServer(localChanges);
      }

      // Pull server changes
      const serverChanges = await this.pullChangesFromServer(lastSync);
      if (serverChanges.length > 0) {
        await this.applyServerChanges(serverChanges);
      }

      // Update last sync timestamp
      localStorage.setItem('last-sync', new Date().toISOString());

      console.log('💾 [MeasurementAnnotationPersistence] Sync completed');
      return true;

    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Sync failed:', error);
      return false;
    }
  }

  /**
   * Helper methods for format conversion
   */
  private convertToCSV(data: any): string {
    const rows: string[] = [];
    
    // Add headers
    rows.push('Type,ID,ImageID,Creator,Timestamp,Value,Unit,Description');

    // Add measurement data
    for (const session of data.measurementSessions || []) {
      for (const measurement of session.measurements || []) {
        rows.push([
          'measurement',
          measurement.id,
          measurement.metadata.imageId,
          measurement.creator,
          measurement.timestamp,
          measurement.value,
          measurement.unit,
          measurement.description || ''
        ].map(cell => `"${cell}"`).join(','));
      }
    }

    // Add annotation data
    for (const session of data.annotationSessions || []) {
      for (const annotation of session.annotations || []) {
        const text = annotation.type === 'text' ? annotation.text : 
                    annotation.type === 'arrow' ? annotation.text || '' : '';
        
        rows.push([
          'annotation',
          annotation.id,
          annotation.metadata.imageId,
          annotation.creator,
          annotation.timestamp,
          '',
          '',
          text
        ].map(cell => `"${cell}"`).join(','));
      }
    }

    return rows.join('\n');
  }

  private convertToXML(data: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<MedicalViewerData>\n';
    
    // Add measurement sessions
    xml += '  <MeasurementSessions>\n';
    for (const session of data.measurementSessions || []) {
      xml += `    <Session id="${session.id}" imageId="${session.imageId}">\n`;
      for (const measurement of session.measurements || []) {
        xml += `      <Measurement id="${measurement.id}" type="${measurement.type}" value="${measurement.value}" unit="${measurement.unit}"/>\n`;
      }
      xml += '    </Session>\n';
    }
    xml += '  </MeasurementSessions>\n';

    // Add annotation sessions
    xml += '  <AnnotationSessions>\n';
    for (const session of data.annotationSessions || []) {
      xml += `    <Session id="${session.id}" imageId="${session.imageId}">\n`;
      for (const annotation of session.annotations || []) {
        xml += `      <Annotation id="${annotation.id}" type="${annotation.type}"/>\n`;
      }
      xml += '    </Session>\n';
    }
    xml += '  </AnnotationSessions>\n';

    xml += '</MedicalViewerData>';
    return xml;
  }

  private convertToDICOMSR(data: any): string {
    // Simplified DICOM SR generation - would use proper DICOM library in production
    const sr = {
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.88.11',
      StudyInstanceUID: `1.2.840.10008.${Date.now()}`,
      SeriesInstanceUID: `1.2.840.10008.${Date.now()}.1`,
      SOPInstanceUID: `1.2.840.10008.${Date.now()}.1.1`,
      ContentDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      ContentTime: new Date().toISOString().split('T')[1].replace(/[:.]/g, '').substring(0, 6),
      DocumentTitle: 'Medical Viewer Measurements and Annotations',
      Content: data
    };

    return JSON.stringify(sr, null, 2);
  }

  private async convertToPDF(data: any): Promise<Blob> {
    // Simplified PDF generation - would use proper PDF library in production
    const content = `Medical Viewer Export Report
Generated: ${new Date().toISOString()}

Measurement Sessions: ${data.measurementSessions?.length || 0}
Annotation Sessions: ${data.annotationSessions?.length || 0}

This is a simplified PDF export. In production, this would generate a proper PDF document.`;

    return new Blob([content], { type: 'application/pdf' });
  }

  private async convertToExcel(data: any): Promise<Blob> {
    // Simplified Excel generation - would use proper Excel library in production
    const csv = this.convertToCSV(data);
    return new Blob([csv], { type: 'application/vnd.ms-excel' });
  }

  /**
   * Utility methods
   */
  private compress(data: string): string {
    // Simplified compression - would use proper compression library
    return btoa(data);
  }

  private decompress(data: string): string {
    // Simplified decompression
    try {
      return atob(data);
    } catch {
      return data; // Return as-is if not compressed
    }
  }

  private async encrypt(data: string): Promise<string> {
    // Simplified encryption - would use proper encryption in production
    return btoa(data);
  }

  private async decrypt(data: string): Promise<string> {
    // Simplified decryption
    try {
      return atob(data);
    } catch {
      return data; // Return as-is if not encrypted
    }
  }

  private isCompressed(data: string): boolean {
    // Simple heuristic to detect compression
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }

  private isEncrypted(data: string): boolean {
    // Simple heuristic to detect encryption
    return this.isCompressed(data); // Same as compression for this simplified implementation
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private parseCSV(content: string): any {
    // Simplified CSV parsing
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = { measurementSessions: [], annotationSessions: [] };
    
    // This would be more sophisticated in a real implementation
    return data;
  }

  private parseXML(content: string): any {
    // Simplified XML parsing - would use proper XML parser
    const data = { measurementSessions: [], annotationSessions: [] };
    return data;
  }

  private async loadMeasurementSession(sessionId: string): Promise<MeasurementSession | null> {
    try {
      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          const sessions = await this.loadFromIndexedDB('sessions');
          return sessions.find((s: any) => s.id === sessionId) || null;
        case 'localStorage':
          const data = localStorage.getItem(`${this.STORAGE_KEYS.sessions}-${sessionId}`);
          return data ? JSON.parse(data) : null;
        case 'server':
          return await this.loadFromServer(`measurement-sessions/${sessionId}`) as unknown as MeasurementSession;
        default:
          return null;
      }
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to load measurement session:', error);
      return null;
    }
  }

  private async loadAnnotationSession(sessionId: string): Promise<AnnotationSession | null> {
    try {
      switch (this.config.storageType) {
        case 'indexedDB':
        case 'hybrid':
          const sessions = await this.loadFromIndexedDB('sessions');
          return sessions.find((s: any) => s.id === sessionId) || null;
        case 'localStorage':
          const data = localStorage.getItem(`${this.STORAGE_KEYS.sessions}-${sessionId}`);
          return data ? JSON.parse(data) : null;
        case 'server':
          return await this.loadFromServer(`annotation-sessions/${sessionId}`) as unknown as AnnotationSession;
        default:
          return null;
      }
    } catch (error) {
      console.error('💾 [MeasurementAnnotationPersistence] Failed to load annotation session:', error);
      return null;
    }
  }

  private async getChangesSince(timestamp: string | null): Promise<any[]> {
    // Simplified change tracking
    return [];
  }

  private async pushChangesToServer(changes: any[]): Promise<void> {
    // Push changes to server
  }

  private async pullChangesFromServer(timestamp: string | null): Promise<any[]> {
    // Pull changes from server
    return [];
  }

  private async applyServerChanges(changes: any[]): Promise<void> {
    // Apply server changes locally
  }

  private async clearAllData(): Promise<void> {
    if (this.db) {
      const stores = ['measurements', 'annotations', 'sessions'];
      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
        });
      }
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.stopAutoSave();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('💾 [MeasurementAnnotationPersistence] Disposed');
  }
}

export { MeasurementAnnotationPersistence };