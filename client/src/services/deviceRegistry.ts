/**
 * Device Registry Service
 * Manages discovered medical devices and their configurations
 * Provides persistent storage and device lifecycle management
 */

import { DicomDevice, DeviceCapability } from './medicalDeviceDiscovery';
import { DicomTestResult } from './dicomConnectivityTester';
import { auditService } from './auditService';
import { apiService } from './api';

export interface DeviceRegistryEntry extends DicomDevice {
  registrationDate: string;
  lastUpdated: string;
  testHistory: DeviceTestHistory[];
  configuration: DeviceConfiguration;
  tags: string[];
  notes: string;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceTestHistory {
  testDate: string;
  testResults: DicomTestResult[];
  testDuration: number;
  overallSuccess: boolean;
  notes?: string;
}

export interface DeviceConfiguration {
  autoDiscovery: boolean;
  monitoringEnabled: boolean;
  monitoringInterval: number; // minutes
  alertOnFailure: boolean;
  maxRetries: number;
  customSettings: Record<string, any>;
  integrationSettings: {
    enableDataAccess: boolean;
    preferredMethods: string[];
    cacheSettings: {
      enabled: boolean;
      ttl: number; // seconds
    };
  };
}

export interface DeviceFilter {
  status?: DicomDevice['status'][];
  deviceType?: DicomDevice['deviceType'][];
  manufacturer?: string[];
  capabilities?: DeviceCapability['type'][];
  tags?: string[];
  priority?: DeviceRegistryEntry['priority'][];
  lastSeenAfter?: Date;
  lastSeenBefore?: Date;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  byType: Record<string, number>;
  byManufacturer: Record<string, number>;
  byStatus: Record<string, number>;
  recentlyAdded: number; // Last 24 hours
  needsAttention: number; // Failed tests or offline
}

class DeviceRegistryService {
  private devices = new Map<string, DeviceRegistryEntry>();
  private initialized = false;

  private readonly defaultConfiguration: DeviceConfiguration = {
    autoDiscovery: true,
    monitoringEnabled: true,
    monitoringInterval: 30, // 30 minutes
    alertOnFailure: true,
    maxRetries: 3,
    customSettings: {},
    integrationSettings: {
      enableDataAccess: true,
      preferredMethods: ['WADO_RS', 'WADO', 'QIDO_RS'],
      cacheSettings: {
        enabled: true,
        ttl: 300 // 5 minutes
      }
    }
  };

  /**
   * Initialize the device registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing device registry...');
      
      // Load devices from storage
      await this.loadDevicesFromStorage();
      
      // Start monitoring if enabled
      this.startMonitoring();
      
      this.initialized = true;
      console.log(`✅ Device registry initialized with ${this.devices.size} devices`);

    } catch (error) {
      console.error('❌ Failed to initialize device registry:', error);
      throw error;
    }
  }

  /**
   * Register a new device
   */
  async registerDevice(device: DicomDevice, config?: Partial<DeviceConfiguration>): Promise<DeviceRegistryEntry> {
    const now = new Date().toISOString();
    
    const registryEntry: DeviceRegistryEntry = {
      ...device,
      registrationDate: now,
      lastUpdated: now,
      testHistory: [],
      configuration: { ...this.defaultConfiguration, ...config },
      tags: [],
      notes: '',
      isActive: true,
      priority: 'medium'
    };

    this.devices.set(device.id, registryEntry);
    
    // Save to persistent storage
    await this.saveDevicesToStorage();

    // Log audit event
    await auditService.logDeviceRegistered(device.id, device);

    console.log(`📝 Registered device: ${device.name} (${device.id})`);
    return registryEntry;
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId: string, updates: Partial<DicomDevice>): Promise<DeviceRegistryEntry | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }

    // Update device properties
    Object.assign(device, updates, {
      lastUpdated: new Date().toISOString()
    });

    // Save to storage
    await this.saveDevicesToStorage();

    // Log audit event
    await auditService.logEvent({
      event_type: 'resource_updated',
      event_description: 'Medical device updated',
      resource_type: 'Device',
      resource_id: deviceId,
      metadata: {
        action_details: {
          updated_fields: Object.keys(updates),
          device_name: device.name
        }
      }
    });

    return device;
  }

  /**
   * Update device configuration
   */
  async updateDeviceConfiguration(
    deviceId: string, 
    configUpdates: Partial<DeviceConfiguration>
  ): Promise<DeviceRegistryEntry | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }

    // Merge configuration updates
    device.configuration = { ...device.configuration, ...configUpdates };
    device.lastUpdated = new Date().toISOString();

    await this.saveDevicesToStorage();

    console.log(`⚙️ Updated configuration for device: ${device.name}`);
    return device;
  }

  /**
   * Add test results to device history
   */
  async addTestResults(
    deviceId: string, 
    testResults: DicomTestResult[], 
    testDuration: number,
    notes?: string
  ): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const testHistory: DeviceTestHistory = {
      testDate: new Date().toISOString(),
      testResults,
      testDuration,
      overallSuccess: testResults.every(r => r.success),
      notes
    };

    device.testHistory.unshift(testHistory); // Add to beginning
    
    // Keep only last 50 test results
    if (device.testHistory.length > 50) {
      device.testHistory = device.testHistory.slice(0, 50);
    }

    // Update device status based on test results
    if (testHistory.overallSuccess) {
      device.status = 'online';
    } else {
      device.status = 'offline';
    }

    device.lastSeen = new Date().toISOString();
    device.lastUpdated = new Date().toISOString();

    await this.saveDevicesToStorage();

    console.log(`📊 Added test results for device: ${device.name} (${testHistory.overallSuccess ? 'PASS' : 'FAIL'})`);
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): DeviceRegistryEntry | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get all devices with optional filtering
   */
  getDevices(filter?: DeviceFilter): DeviceRegistryEntry[] {
    let devices = Array.from(this.devices.values());

    if (!filter) {
      return devices;
    }

    // Apply filters
    if (filter.status) {
      devices = devices.filter(d => filter.status!.includes(d.status));
    }

    if (filter.deviceType) {
      devices = devices.filter(d => filter.deviceType!.includes(d.deviceType));
    }

    if (filter.manufacturer) {
      devices = devices.filter(d => 
        filter.manufacturer!.some(m => 
          d.manufacturer.toLowerCase().includes(m.toLowerCase())
        )
      );
    }

    if (filter.capabilities) {
      devices = devices.filter(d => 
        filter.capabilities!.some(cap => 
          d.capabilities.some(c => c.type === cap && c.supported)
        )
      );
    }

    if (filter.tags) {
      devices = devices.filter(d => 
        filter.tags!.some(tag => d.tags.includes(tag))
      );
    }

    if (filter.priority) {
      devices = devices.filter(d => filter.priority!.includes(d.priority));
    }

    if (filter.lastSeenAfter) {
      devices = devices.filter(d => 
        new Date(d.lastSeen) >= filter.lastSeenAfter!
      );
    }

    if (filter.lastSeenBefore) {
      devices = devices.filter(d => 
        new Date(d.lastSeen) <= filter.lastSeenBefore!
      );
    }

    return devices;
  }

  /**
   * Remove device from registry
   */
  async removeDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    this.devices.delete(deviceId);
    await this.saveDevicesToStorage();

    // Log audit event
    await auditService.logEvent({
      event_type: 'resource_deleted',
      event_description: 'Medical device removed from registry',
      resource_type: 'Device',
      resource_id: deviceId,
      metadata: {
        action_details: {
          device_name: device.name,
          device_type: device.deviceType
        }
      }
    });

    console.log(`🗑️ Removed device from registry: ${device.name}`);
    return true;
  }

  /**
   * Add tags to device
   */
  async addDeviceTags(deviceId: string, tags: string[]): Promise<DeviceRegistryEntry | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }

    // Add unique tags
    const newTags = tags.filter(tag => !device.tags.includes(tag));
    device.tags.push(...newTags);
    device.lastUpdated = new Date().toISOString();

    await this.saveDevicesToStorage();
    return device;
  }

  /**
   * Remove tags from device
   */
  async removeDeviceTags(deviceId: string, tags: string[]): Promise<DeviceRegistryEntry | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }

    device.tags = device.tags.filter(tag => !tags.includes(tag));
    device.lastUpdated = new Date().toISOString();

    await this.saveDevicesToStorage();
    return device;
  }

  /**
   * Update device notes
   */
  async updateDeviceNotes(deviceId: string, notes: string): Promise<DeviceRegistryEntry | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }

    device.notes = notes;
    device.lastUpdated = new Date().toISOString();

    await this.saveDevicesToStorage();
    return device;
  }

  /**
   * Set device priority
   */
  async setDevicePriority(
    deviceId: string, 
    priority: DeviceRegistryEntry['priority']
  ): Promise<DeviceRegistryEntry | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }

    device.priority = priority;
    device.lastUpdated = new Date().toISOString();

    await this.saveDevicesToStorage();
    return device;
  }

  /**
   * Get device statistics
   */
  getDeviceStats(): DeviceStats {
    const devices = Array.from(this.devices.values());
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats: DeviceStats = {
      total: devices.length,
      online: 0,
      offline: 0,
      unknown: 0,
      byType: {},
      byManufacturer: {},
      byStatus: {},
      recentlyAdded: 0,
      needsAttention: 0
    };

    devices.forEach(device => {
      // Status counts
      switch (device.status) {
        case 'online':
          stats.online++;
          break;
        case 'offline':
          stats.offline++;
          break;
        default:
          stats.unknown++;
      }

      // By type
      stats.byType[device.deviceType] = (stats.byType[device.deviceType] || 0) + 1;

      // By manufacturer
      stats.byManufacturer[device.manufacturer] = (stats.byManufacturer[device.manufacturer] || 0) + 1;

      // By status
      stats.byStatus[device.status] = (stats.byStatus[device.status] || 0) + 1;

      // Recently added
      if (new Date(device.registrationDate) >= yesterday) {
        stats.recentlyAdded++;
      }

      // Needs attention
      if (device.status === 'offline' || 
          (device.testHistory.length > 0 && !device.testHistory[0].overallSuccess)) {
        stats.needsAttention++;
      }
    });

    return stats;
  }

  /**
   * Get devices that need attention
   */
  getDevicesNeedingAttention(): DeviceRegistryEntry[] {
    return this.getDevices().filter(device => {
      // Offline devices
      if (device.status === 'offline') return true;
      
      // Devices with recent test failures
      if (device.testHistory.length > 0 && !device.testHistory[0].overallSuccess) return true;
      
      // Devices not seen recently (based on monitoring interval)
      const lastSeenDate = new Date(device.lastSeen);
      const monitoringThreshold = new Date(Date.now() - device.configuration.monitoringInterval * 60 * 1000 * 2);
      if (lastSeenDate < monitoringThreshold) return true;

      return false;
    });
  }

  /**
   * Export device registry
   */
  exportRegistry(): {
    exportDate: string;
    deviceCount: number;
    devices: DeviceRegistryEntry[];
  } {
    return {
      exportDate: new Date().toISOString(),
      deviceCount: this.devices.size,
      devices: Array.from(this.devices.values())
    };
  }

  /**
   * Import device registry
   */
  async importRegistry(registryData: {
    devices: DeviceRegistryEntry[];
  }, options: {
    mergeMode: 'replace' | 'merge' | 'skip_existing';
  } = { mergeMode: 'merge' }): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const device of registryData.devices) {
      try {
        const existingDevice = this.devices.get(device.id);

        if (existingDevice && options.mergeMode === 'skip_existing') {
          result.skipped++;
          continue;
        }

        if (existingDevice && options.mergeMode === 'merge') {
          // Merge device data
          const mergedDevice = {
            ...existingDevice,
            ...device,
            testHistory: [...device.testHistory, ...existingDevice.testHistory].slice(0, 50),
            lastUpdated: new Date().toISOString()
          };
          this.devices.set(device.id, mergedDevice);
        } else {
          // Replace or add new
          this.devices.set(device.id, {
            ...device,
            lastUpdated: new Date().toISOString()
          });
        }

        result.imported++;

      } catch (error) {
        result.errors.push(`Failed to import device ${device.id}: ${error}`);
      }
    }

    await this.saveDevicesToStorage();
    
    console.log(`📥 Registry import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Start device monitoring
   */
  private startMonitoring(): void {
    // Check for devices that need monitoring every 5 minutes
    setInterval(() => {
      this.performMonitoringCheck();
    }, 5 * 60 * 1000);

    console.log('📡 Device monitoring started');
  }

  /**
   * Perform monitoring check
   */
  private async performMonitoringCheck(): Promise<void> {
    const devicesToMonitor = Array.from(this.devices.values()).filter(device => 
      device.isActive && 
      device.configuration.monitoringEnabled &&
      this.shouldMonitorDevice(device)
    );

    if (devicesToMonitor.length === 0) {
      return;
    }

    console.log(`🔍 Monitoring ${devicesToMonitor.length} devices...`);

    for (const device of devicesToMonitor) {
      try {
        // Simple connectivity check
        const isOnline = await this.quickConnectivityCheck(device);
        
        if (device.status !== (isOnline ? 'online' : 'offline')) {
          device.status = isOnline ? 'online' : 'offline';
          device.lastSeen = new Date().toISOString();
          device.lastUpdated = new Date().toISOString();

          // Alert on failure if configured
          if (!isOnline && device.configuration.alertOnFailure) {
            console.warn(`⚠️ Device ${device.name} is offline`);
            // Here you could send notifications, emails, etc.
          }
        }

      } catch (error) {
        console.error(`❌ Monitoring failed for device ${device.name}:`, error);
      }
    }

    await this.saveDevicesToStorage();
  }

  /**
   * Check if device should be monitored now
   */
  private shouldMonitorDevice(device: DeviceRegistryEntry): boolean {
    const lastSeen = new Date(device.lastSeen);
    const monitoringInterval = device.configuration.monitoringInterval * 60 * 1000; // Convert to ms
    const nextMonitoringTime = new Date(lastSeen.getTime() + monitoringInterval);
    
    return Date.now() >= nextMonitoringTime.getTime();
  }

  /**
   * Quick connectivity check
   */
  private async quickConnectivityCheck(device: DeviceRegistryEntry): Promise<boolean> {
    try {
      // Try HTTP first for web-based services
      if ([8080, 8042, 4242].includes(device.port)) {
        const response = await fetch(`http://${device.ip}:${device.port}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        return response.ok || response.status < 500;
      }

      // For DICOM ports, try WebSocket connection
      const ws = new WebSocket(`ws://${device.ip}:${device.port}`);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });

    } catch (error) {
      return false;
    }
  }

  /**
   * Load devices from persistent storage
   */
  private async loadDevicesFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('medflow_device_registry');
      if (stored) {
        const data = JSON.parse(stored);
        data.devices.forEach((device: DeviceRegistryEntry) => {
          this.devices.set(device.id, device);
        });
        console.log(`📂 Loaded ${data.devices.length} devices from storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load devices from storage:', error);
    }
  }

  /**
   * Save devices to persistent storage
   */
  private async saveDevicesToStorage(): Promise<void> {
    try {
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        devices: Array.from(this.devices.values())
      };
      localStorage.setItem('medflow_device_registry', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save devices to storage:', error);
    }
  }
}

export const deviceRegistry = new DeviceRegistryService();