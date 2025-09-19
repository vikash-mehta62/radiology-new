import { v4 as uuidv4 } from 'uuid';

export interface OfflineReport {
  id: string;
  studyUid: string;
  patientId: string;
  findings: string;
  impression: string;
  recommendations: string;
  timestamp: string;
  radiologistId: string;
  status: 'draft' | 'preliminary' | 'final';
}

export interface OfflineMeasurement {
  id: string;
  studyUid: string;
  imageId: string;
  type: 'length' | 'area' | 'angle' | 'annotation';
  coordinates: number[];
  value?: number;
  unit?: string;
  description?: string;
  timestamp: string;
}

export interface CachedStudy {
  studyUid: string;
  patientName: string;
  studyDate: string;
  modality: string;
  description: string;
  imageIds: string[];
  thumbnails: string[];
  lastAccessed: string;
  size: number;
}

export interface OfflineCapabilities {
  isOnline: boolean;
  hasOfflineData: boolean;
  pendingSyncItems: number;
  cacheSize: number;
  maxCacheSize: number;
}

class OfflineService {
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private maxCacheSize = 2 * 1024 * 1024 * 1024; // 2GB
  private onlineCallbacks: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.initializeDB();
    this.setupOnlineListeners();
    this.registerBackgroundSync();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KiroMiniOfflineDB', 1);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores with indexes
        if (!db.objectStoreNames.contains('offline_reports')) {
          const reportStore = db.createObjectStore('offline_reports', { keyPath: 'id' });
          reportStore.createIndex('studyUid', 'studyUid', { unique: false });
          reportStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('offline_measurements')) {
          const measurementStore = db.createObjectStore('offline_measurements', { keyPath: 'id' });
          measurementStore.createIndex('studyUid', 'studyUid', { unique: false });
          measurementStore.createIndex('imageId', 'imageId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('cached_studies')) {
          const studyStore = db.createObjectStore('cached_studies', { keyPath: 'studyUid' });
          studyStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          studyStore.createIndex('patientName', 'patientName', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('offline_settings')) {
          db.createObjectStore('offline_settings', { keyPath: 'key' });
        }
      };
    });
  }

  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Connection restored - triggering sync');
      this.triggerBackgroundSync();
      this.notifyOnlineStatus(true);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Connection lost - entering offline mode');
      this.notifyOnlineStatus(false);
    });
  }

  private notifyOnlineStatus(online: boolean): void {
    this.onlineCallbacks.forEach(callback => callback(online));
  }

  public onOnlineStatusChange(callback: (online: boolean) => void): () => void {
    this.onlineCallbacks.add(callback);
    return () => this.onlineCallbacks.delete(callback);
  }

  // Report Management
  public async saveOfflineReport(report: Omit<OfflineReport, 'id' | 'timestamp'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const offlineReport: OfflineReport = {
      ...report,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_reports'], 'readwrite');
      const store = transaction.objectStore('offline_reports');
      const request = store.add(offlineReport);
      
      request.onsuccess = () => {
        console.log('Report saved offline:', offlineReport.id);
        resolve(offlineReport.id);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  public async getOfflineReports(studyUid?: string): Promise<OfflineReport[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_reports'], 'readonly');
      const store = transaction.objectStore('offline_reports');
      
      if (studyUid) {
        const index = store.index('studyUid');
        const request = index.getAll(studyUid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Measurement Management
  public async saveOfflineMeasurement(measurement: Omit<OfflineMeasurement, 'id' | 'timestamp'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const offlineMeasurement: OfflineMeasurement = {
      ...measurement,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_measurements'], 'readwrite');
      const store = transaction.objectStore('offline_measurements');
      const request = store.add(offlineMeasurement);
      
      request.onsuccess = () => {
        console.log('Measurement saved offline:', offlineMeasurement.id);
        resolve(offlineMeasurement.id);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  public async getOfflineMeasurements(studyUid?: string, imageId?: string): Promise<OfflineMeasurement[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_measurements'], 'readonly');
      const store = transaction.objectStore('offline_measurements');
      
      if (imageId) {
        const index = store.index('imageId');
        const request = index.getAll(imageId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else if (studyUid) {
        const index = store.index('studyUid');
        const request = index.getAll(studyUid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Study Caching
  public async cacheStudy(study: CachedStudy): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Check cache size limits
    const currentSize = await this.getCacheSize();
    if (currentSize + study.size > this.maxCacheSize) {
      await this.cleanupOldestStudies(study.size);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_studies'], 'readwrite');
      const store = transaction.objectStore('cached_studies');
      const request = store.put({
        ...study,
        lastAccessed: new Date().toISOString()
      });
      
      request.onsuccess = () => {
        console.log('Study cached:', study.studyUid);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  public async getCachedStudy(studyUid: string): Promise<CachedStudy | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_studies'], 'readwrite');
      const store = transaction.objectStore('cached_studies');
      const request = store.get(studyUid);
      
      request.onsuccess = () => {
        const study = request.result;
        if (study) {
          // Update last accessed time
          study.lastAccessed = new Date().toISOString();
          store.put(study);
        }
        resolve(study || null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Cache Management
  private async getCacheSize(): Promise<number> {
    if (!this.db) return 0;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_studies'], 'readonly');
      const store = transaction.objectStore('cached_studies');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const totalSize = request.result.reduce((sum, study) => sum + (study.size || 0), 0);
        resolve(totalSize);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupOldestStudies(requiredSpace: number): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_studies'], 'readwrite');
      const store = transaction.objectStore('cached_studies');
      const index = store.index('lastAccessed');
      const request = index.openCursor();
      
      let freedSpace = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && freedSpace < requiredSpace) {
          const study = cursor.value;
          freedSpace += study.size || 0;
          cursor.delete();
          console.log('Removed cached study:', study.studyUid);
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Background Sync
  private registerBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('Background sync registered');
      });
    }
  }

  private async triggerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Type assertion for background sync API
        const syncManager = (registration as any).sync;
        if (syncManager) {
          await syncManager.register('background-sync-reports');
          await syncManager.register('background-sync-measurements');
          console.log('Background sync triggered');
        }
      } catch (error) {
        console.error('Background sync failed:', error);
        // Fallback to immediate sync
        this.syncNow();
      }
    } else {
      // Fallback for browsers without background sync
      this.syncNow();
    }
  }

  private async syncNow(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    
    try {
      await Promise.all([
        this.syncOfflineReports(),
        this.syncOfflineMeasurements()
      ]);
      console.log('Manual sync completed');
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOfflineReports(): Promise<void> {
    const reports = await this.getOfflineReports();
    
    for (const report of reports) {
      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        
        if (response.ok) {
          await this.deleteOfflineReport(report.id);
        }
      } catch (error) {
        console.error('Failed to sync report:', error);
      }
    }
  }

  private async syncOfflineMeasurements(): Promise<void> {
    const measurements = await this.getOfflineMeasurements();
    
    for (const measurement of measurements) {
      try {
        const response = await fetch('/api/measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(measurement)
        });
        
        if (response.ok) {
          await this.deleteOfflineMeasurement(measurement.id);
        }
      } catch (error) {
        console.error('Failed to sync measurement:', error);
      }
    }
  }

  private async deleteOfflineReport(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_reports'], 'readwrite');
      const store = transaction.objectStore('offline_reports');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteOfflineMeasurement(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_measurements'], 'readwrite');
      const store = transaction.objectStore('offline_measurements');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Status and Capabilities
  public async getOfflineCapabilities(): Promise<OfflineCapabilities> {
    const [reports, measurements] = await Promise.all([
      this.getOfflineReports(),
      this.getOfflineMeasurements()
    ]);
    
    const cacheSize = await this.getCacheSize();
    
    return {
      isOnline: this.isOnline,
      hasOfflineData: reports.length > 0 || measurements.length > 0,
      pendingSyncItems: reports.length + measurements.length,
      cacheSize,
      maxCacheSize: this.maxCacheSize
    };
  }

  public async clearOfflineData(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(
      ['offline_reports', 'offline_measurements', 'cached_studies'], 
      'readwrite'
    );
    
    await Promise.all([
      transaction.objectStore('offline_reports').clear(),
      transaction.objectStore('offline_measurements').clear(),
      transaction.objectStore('cached_studies').clear()
    ]);
    
    console.log('Offline data cleared');
  }
}

export const offlineService = new OfflineService();
export default offlineService;