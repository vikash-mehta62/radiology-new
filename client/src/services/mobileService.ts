/**
 * Mobile Application Support Service
 * Provides mobile-optimized APIs, offline capabilities, and responsive features
 * for the medical radiology system
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface MobileDeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  version: string;
  model: string;
  screenSize: {
    width: number;
    height: number;
    density: number;
  };
  capabilities: {
    camera: boolean;
    microphone: boolean;
    gps: boolean;
    biometric: boolean;
    nfc: boolean;
  };
  networkType: 'wifi' | '4g' | '5g' | 'offline';
  batteryLevel?: number;
}

export interface MobileSession {
  sessionId: string;
  deviceId: string;
  userId: string;
  startTime: string;
  lastActivity: string;
  isActive: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
  offlineActions: OfflineAction[];
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  resource: 'report' | 'comment' | 'template' | 'user_preference';
  resourceId: string;
  data: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface MobileReport {
  id: string;
  studyUid: string;
  patientId: string;
  examType: string;
  status: 'draft' | 'final' | 'billed';
  findings?: string;
  impressions?: string;
  recommendations?: string;
  images: MobileImage[];
  voiceNotes: VoiceNote[];
  lastModified: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  offlineChanges: boolean;
}

export interface MobileImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: 'dicom' | 'jpeg' | 'png';
  size: number;
  dimensions: { width: number; height: number };
  annotations: ImageAnnotation[];
  downloadStatus: 'not_downloaded' | 'downloading' | 'downloaded' | 'failed';
  cacheExpiry?: string;
}

export interface ImageAnnotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text' | 'measurement';
  coordinates: { x: number; y: number; width?: number; height?: number };
  text?: string;
  color: string;
  thickness: number;
  createdBy: string;
  createdAt: string;
}

export interface VoiceNote {
  id: string;
  reportId: string;
  sectionId: string;
  audioUrl: string;
  transcript?: string;
  duration: number;
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'uploading';
}

export interface MobileNotification {
  id: string;
  type: 'report_assigned' | 'comment_added' | 'urgent_study' | 'system_alert';
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface OfflineCapabilities {
  maxOfflineReports: number;
  maxImageCacheSize: number; // in MB
  maxVoiceNoteSize: number; // in MB
  syncInterval: number; // in seconds
  conflictResolution: 'server_wins' | 'client_wins' | 'manual';
  autoDownloadImages: boolean;
  compressImages: boolean;
}

class MobileService {
  private baseUrl = '/api/mobile';
  private currentSession: MobileSession | null = null;
  private offlineQueue: OfflineAction[] = [];
  private syncInProgress = false;
  private deviceInfo: MobileDeviceInfo | null = null;

  /**
   * Initialize mobile session
   */
  async initializeMobileSession(deviceInfo: MobileDeviceInfo): Promise<MobileSession> {
    try {
      console.log('📱 Initializing mobile session...');

      this.deviceInfo = deviceInfo;

      const response = await apiService.post<MobileSession>(`${this.baseUrl}/session/init`, {
        deviceInfo
      });

      this.currentSession = response;

      // Log mobile session start
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'Mobile session initialized',
        resource_type: 'Report',
        resource_id: response.sessionId,
        metadata: {
          action_details: {
            device_platform: deviceInfo.platform,
            device_model: deviceInfo.model,
            app_version: deviceInfo.version,
            network_type: deviceInfo.networkType
          }
        }
      });

      console.log('✅ Mobile session initialized:', response.sessionId);
      return response;
    } catch (error) {
      console.error('❌ Failed to initialize mobile session:', error);
      throw new Error('Failed to initialize mobile session. Please try again.');
    }
  }

  /**
   * Get mobile-optimized reports
   */
  async getMobileReports(filters?: {
    status?: string[];
    examType?: string[];
    assignedToMe?: boolean;
    urgent?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    reports: MobileReport[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      console.log('📋 Fetching mobile reports...');

      const response = await apiService.post<{
        reports: MobileReport[];
        totalCount: number;
        hasMore: boolean;
      }>(`${this.baseUrl}/reports`, {
        filters: filters || {},
        deviceInfo: this.deviceInfo
      });

      console.log(`✅ Retrieved ${response.reports.length} mobile reports`);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch mobile reports:', error);
      throw new Error('Failed to load mobile reports. Please try again.');
    }
  }

  /**
   * Get mobile-optimized report details
   */
  async getMobileReport(reportId: string, options?: {
    includeImages?: boolean;
    imageQuality?: 'thumbnail' | 'medium' | 'full';
    includeVoiceNotes?: boolean;
  }): Promise<MobileReport> {
    try {
      console.log('📄 Fetching mobile report details:', reportId);

      const response = await apiService.get<MobileReport>(`${this.baseUrl}/reports/${reportId}`, {
        params: {
          ...options,
          deviceInfo: this.deviceInfo
        }
      });

      console.log('✅ Mobile report details retrieved');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch mobile report:', error);
      throw new Error('Failed to load mobile report. Please try again.');
    }
  }

  /**
   * Create or update report offline
   */
  async saveReportOffline(reportData: Partial<MobileReport>): Promise<string> {
    try {
      console.log('💾 Saving report offline...');

      const actionId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const offlineAction: OfflineAction = {
        id: actionId,
        type: reportData.id ? 'update' : 'create',
        resource: 'report',
        resourceId: reportData.id || actionId,
        data: reportData,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending'
      };

      this.offlineQueue.push(offlineAction);
      
      // Store in local storage for persistence
      this.saveOfflineQueue();

      console.log('✅ Report saved offline:', actionId);
      return actionId;
    } catch (error) {
      console.error('❌ Failed to save report offline:', error);
      throw new Error('Failed to save report offline. Please try again.');
    }
  }

  /**
   * Add voice note to report
   */
  async addVoiceNote(reportId: string, sectionId: string, audioBlob: Blob): Promise<VoiceNote> {
    try {
      console.log('🎤 Adding voice note to report...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.wav');
      formData.append('reportId', reportId);
      formData.append('sectionId', sectionId);

      const response = await apiService.post<VoiceNote>(`${this.baseUrl}/voice-notes`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Voice note added successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to add voice note:', error);
      
      // Save offline if network fails
      const offlineVoiceNote: VoiceNote = {
        id: `offline-voice-${Date.now()}`,
        reportId,
        sectionId,
        audioUrl: URL.createObjectURL(audioBlob),
        duration: 0, // Would be calculated
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      // Add to offline queue
      this.offlineQueue.push({
        id: offlineVoiceNote.id,
        type: 'create',
        resource: 'report',
        resourceId: reportId,
        data: { voiceNote: offlineVoiceNote, audioBlob },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending'
      });

      this.saveOfflineQueue();
      return offlineVoiceNote;
    }
  }

  /**
   * Add image annotation
   */
  async addImageAnnotation(imageId: string, annotation: Omit<ImageAnnotation, 'id' | 'createdAt'>): Promise<ImageAnnotation> {
    try {
      console.log('✏️ Adding image annotation...');

      const response = await apiService.post<ImageAnnotation>(`${this.baseUrl}/images/${imageId}/annotations`, annotation);

      console.log('✅ Image annotation added successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to add image annotation:', error);
      
      // Save offline
      const offlineAnnotation: ImageAnnotation = {
        ...annotation,
        id: `offline-annotation-${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      this.offlineQueue.push({
        id: offlineAnnotation.id,
        type: 'create',
        resource: 'report',
        resourceId: imageId,
        data: { annotation: offlineAnnotation },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending'
      });

      this.saveOfflineQueue();
      return offlineAnnotation;
    }
  }

  /**
   * Download images for offline use
   */
  async downloadImagesForOffline(reportId: string, quality: 'thumbnail' | 'medium' | 'full' = 'medium'): Promise<void> {
    try {
      console.log('⬇️ Downloading images for offline use...');

      const response = await apiService.post(`${this.baseUrl}/reports/${reportId}/download-images`, {
        quality,
        deviceInfo: this.deviceInfo
      });

      console.log('✅ Images downloaded for offline use');
    } catch (error) {
      console.error('❌ Failed to download images:', error);
      throw new Error('Failed to download images for offline use. Please try again.');
    }
  }

  /**
   * Sync offline data
   */
  async syncOfflineData(): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
  }> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress...');
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    try {
      console.log('🔄 Syncing offline data...');
      this.syncInProgress = true;

      let synced = 0;
      let failed = 0;
      let conflicts = 0;

      const pendingActions = this.offlineQueue.filter(action => action.status === 'pending');

      for (const action of pendingActions) {
        try {
          action.status = 'syncing';
          
          const response = await apiService.post(`${this.baseUrl}/sync`, {
            action,
            deviceInfo: this.deviceInfo
          });

          if (response.status === 'conflict') {
            action.status = 'failed';
            conflicts++;
          } else {
            action.status = 'synced';
            synced++;
          }
        } catch (error) {
          action.status = 'failed';
          action.retryCount++;
          failed++;
          console.error(`❌ Failed to sync action ${action.id}:`, error);
        }
      }

      // Remove synced actions
      this.offlineQueue = this.offlineQueue.filter(action => action.status !== 'synced');
      this.saveOfflineQueue();

      console.log(`✅ Sync completed: ${synced} synced, ${failed} failed, ${conflicts} conflicts`);
      return { synced, failed, conflicts };
    } catch (error) {
      console.error('❌ Failed to sync offline data:', error);
      throw new Error('Failed to sync offline data. Please try again.');
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get mobile notifications
   */
  async getMobileNotifications(filters?: {
    unreadOnly?: boolean;
    priority?: string[];
    limit?: number;
  }): Promise<MobileNotification[]> {
    try {
      console.log('🔔 Fetching mobile notifications...');

      const response = await apiService.post<{ notifications: MobileNotification[] }>(`${this.baseUrl}/notifications`, {
        filters: filters || {},
        deviceInfo: this.deviceInfo
      });

      console.log(`✅ Retrieved ${response.notifications.length} notifications`);
      return response.notifications;
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      throw new Error('Failed to load notifications. Please try again.');
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/notifications/${notificationId}/read`);
      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      // Don't throw error for non-critical operation
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(token: string, preferences?: {
    reportAssignments: boolean;
    urgentStudies: boolean;
    comments: boolean;
    systemAlerts: boolean;
  }): Promise<void> {
    try {
      console.log('🔔 Registering for push notifications...');

      await apiService.post(`${this.baseUrl}/notifications/register`, {
        deviceId: this.deviceInfo?.deviceId,
        platform: this.deviceInfo?.platform,
        token,
        preferences: preferences || {
          reportAssignments: true,
          urgentStudies: true,
          comments: true,
          systemAlerts: false
        }
      });

      console.log('✅ Registered for push notifications');
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
      throw new Error('Failed to register for push notifications. Please try again.');
    }
  }

  /**
   * Get offline capabilities
   */
  async getOfflineCapabilities(): Promise<OfflineCapabilities> {
    try {
      const response = await apiService.get<OfflineCapabilities>(`${this.baseUrl}/offline/capabilities`);
      return response;
    } catch (error) {
      console.error('❌ Failed to get offline capabilities:', error);
      // Return default capabilities
      return {
        maxOfflineReports: 50,
        maxImageCacheSize: 500, // 500MB
        maxVoiceNoteSize: 10, // 10MB
        syncInterval: 300, // 5 minutes
        conflictResolution: 'manual',
        autoDownloadImages: false,
        compressImages: true
      };
    }
  }

  /**
   * Get mobile app configuration
   */
  async getMobileAppConfig(): Promise<{
    features: {
      voiceInput: boolean;
      imageAnnotation: boolean;
      offlineMode: boolean;
      biometricAuth: boolean;
      darkMode: boolean;
    };
    limits: {
      maxReportSize: number;
      maxImageSize: number;
      maxVoiceNoteLength: number;
    };
    ui: {
      theme: 'light' | 'dark' | 'auto';
      fontSize: 'small' | 'medium' | 'large';
      compactMode: boolean;
    };
  }> {
    try {
      const response = await apiService.get<{
        features: {
          voiceInput: boolean;
          imageAnnotation: boolean;
          offlineMode: boolean;
          biometricAuth: boolean;
          darkMode: boolean;
        };
        limits: {
          maxReportSize: number;
          maxImageSize: number;
          maxVoiceNoteLength: number;
        };
        ui: {
          theme: 'light' | 'dark' | 'auto';
          fontSize: 'small' | 'medium' | 'large';
          compactMode: boolean;
        };
      }>(`${this.baseUrl}/config`);

      return response;
    } catch (error) {
      console.error('❌ Failed to get mobile app config:', error);
      // Return default config
      return {
        features: {
          voiceInput: true,
          imageAnnotation: true,
          offlineMode: true,
          biometricAuth: false,
          darkMode: true
        },
        limits: {
          maxReportSize: 10 * 1024 * 1024, // 10MB
          maxImageSize: 50 * 1024 * 1024, // 50MB
          maxVoiceNoteLength: 300 // 5 minutes
        },
        ui: {
          theme: 'auto',
          fontSize: 'medium',
          compactMode: false
        }
      };
    }
  }

  /**
   * Update mobile app preferences
   */
  async updateMobilePreferences(preferences: {
    notifications?: {
      reportAssignments: boolean;
      urgentStudies: boolean;
      comments: boolean;
      systemAlerts: boolean;
    };
    ui?: {
      theme: 'light' | 'dark' | 'auto';
      fontSize: 'small' | 'medium' | 'large';
      compactMode: boolean;
    };
    offline?: {
      autoSync: boolean;
      syncInterval: number;
      autoDownloadImages: boolean;
      maxCacheSize: number;
    };
  }): Promise<void> {
    try {
      console.log('⚙️ Updating mobile preferences...');

      await apiService.put(`${this.baseUrl}/preferences`, {
        deviceId: this.deviceInfo?.deviceId,
        preferences
      });

      console.log('✅ Mobile preferences updated');
    } catch (error) {
      console.error('❌ Failed to update mobile preferences:', error);
      throw new Error('Failed to update mobile preferences. Please try again.');
    }
  }

  /**
   * Get network status and quality
   */
  getNetworkStatus(): {
    isOnline: boolean;
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  } {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0
      };
    }

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    };
  }

  /**
   * Get current mobile session
   */
  getCurrentSession(): MobileSession | null {
    return this.currentSession;
  }

  /**
   * Get offline queue status
   */
  getOfflineQueueStatus(): {
    totalActions: number;
    pendingActions: number;
    failedActions: number;
    lastSyncTime?: string;
  } {
    const pending = this.offlineQueue.filter(a => a.status === 'pending').length;
    const failed = this.offlineQueue.filter(a => a.status === 'failed').length;

    return {
      totalActions: this.offlineQueue.length,
      pendingActions: pending,
      failedActions: failed,
      lastSyncTime: localStorage.getItem('lastSyncTime') || undefined
    };
  }

  /**
   * Clear offline data
   */
  clearOfflineData(): void {
    this.offlineQueue = [];
    localStorage.removeItem('offlineQueue');
    localStorage.removeItem('lastSyncTime');
    console.log('🧹 Offline data cleared');
  }

  /**
   * Private methods for offline queue management
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('❌ Failed to save offline queue:', error);
    }
  }

  private loadOfflineQueue(): void {
    try {
      const saved = localStorage.getItem('offlineQueue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('❌ Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  /**
   * Initialize mobile service
   */
  initialize(): void {
    this.loadOfflineQueue();
    
    // Set up network status monitoring
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('📶 Network connection restored');
        this.syncOfflineData().catch(console.error);
      });

      window.addEventListener('offline', () => {
        console.log('📵 Network connection lost - switching to offline mode');
      });
    }
  }
}

export const mobileService = new MobileService();
export default mobileService;