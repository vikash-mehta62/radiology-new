/**
 * Medical Device Discovery Service
 * Discovers and manages connections to medical devices on the network
 * Supports DICOM devices, PACS systems, and imaging equipment
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface DicomDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  aeTitle: string; // Application Entity Title
  deviceType: 'PACS' | 'MODALITY' | 'WORKSTATION' | 'ARCHIVE' | 'ROUTER';
  manufacturer: string;
  model?: string;
  version?: string;
  status: 'online' | 'offline' | 'unknown' | 'testing';
  lastSeen: string;
  capabilities: DeviceCapability[];
  connectionSettings: ConnectionSettings;
  discoveryMethod: 'NETWORK_SCAN' | 'DICOM_ECHO' | 'MANUAL' | 'MDNS' | 'DHCP';
  metadata: {
    supportedSOPClasses?: string[];
    maxAssociations?: number;
    implementationUID?: string;
    implementationVersion?: string;
    supportedTransferSyntaxes?: string[];
  };
}

export interface DeviceCapability {
  type: 'C_ECHO' | 'C_FIND' | 'C_MOVE' | 'C_GET' | 'C_STORE' | 'WADO' | 'WADO_RS' | 'QIDO_RS' | 'STOW_RS';
  supported: boolean;
  tested: boolean;
  lastTested?: string;
  responseTime?: number;
  errorRate?: number;
}

export interface ConnectionSettings {
  timeout: number;
  maxRetries: number;
  useCompression: boolean;
  preferredTransferSyntax: string;
  securityProfile?: 'NONE' | 'TLS' | 'BASIC_AUTH';
  credentials?: {
    username?: string;
    password?: string;
  };
}

export interface NetworkScanConfig {
  ipRanges: string[]; // e.g., ['192.168.1.0/24', '10.0.0.0/16']
  portRanges: number[]; // Common DICOM ports: 104, 11112, 8080, etc.
  timeout: number;
  maxConcurrentScans: number;
  skipKnownDevices: boolean;
  deepScan: boolean; // Test DICOM capabilities
}

export interface DiscoveryResult {
  devicesFound: DicomDevice[];
  scanDuration: number;
  ipRangesScanned: string[];
  portsScanned: number[];
  errors: string[];
}

class MedicalDeviceDiscoveryService {
  private discoveredDevices = new Map<string, DicomDevice>();
  private scanInProgress = false;
  private lastScanTime?: Date;

  private readonly defaultScanConfig: NetworkScanConfig = {
    ipRanges: ['192.168.1.0/24'], // Default to common local network
    portRanges: [104, 11112, 8080, 8042, 4242, 2762], // Common DICOM/PACS ports
    timeout: 5000,
    maxConcurrentScans: 10,
    skipKnownDevices: true,
    deepScan: false
  };

  /**
   * Discover medical devices on the network
   */
  async discoverDevices(config?: Partial<NetworkScanConfig>): Promise<DiscoveryResult> {
    if (this.scanInProgress) {
      throw new Error('Device discovery already in progress');
    }

    const scanConfig = { ...this.defaultScanConfig, ...config };
    this.scanInProgress = true;
    const startTime = performance.now();
    const errors: string[] = [];

    try {
      console.log('🔍 Starting medical device discovery...');
      
      // Log audit event
      await auditService.logNetworkScan(scanConfig);

      const discoveredDevices: DicomDevice[] = [];

      // Scan each IP range
      for (const ipRange of scanConfig.ipRanges) {
        try {
          const rangeDevices = await this.scanIpRange(ipRange, scanConfig);
          discoveredDevices.push(...rangeDevices);
        } catch (error) {
          const errorMsg = `Failed to scan IP range ${ipRange}: ${error}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        }
      }

      // Try mDNS discovery for modern devices
      try {
        const mdnsDevices = await this.discoverViaMdns();
        discoveredDevices.push(...mdnsDevices);
      } catch (error) {
        console.warn('⚠️ mDNS discovery failed:', error);
        errors.push(`mDNS discovery failed: ${error}`);
      }

      // Update device registry
      for (const device of discoveredDevices) {
        this.discoveredDevices.set(device.id, device);
      }

      const scanDuration = performance.now() - startTime;
      this.lastScanTime = new Date();

      console.log(`✅ Discovery completed: ${discoveredDevices.length} devices found in ${Math.round(scanDuration)}ms`);

      return {
        devicesFound: discoveredDevices,
        scanDuration,
        ipRangesScanned: scanConfig.ipRanges,
        portsScanned: scanConfig.portRanges,
        errors
      };

    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Scan a specific IP range for DICOM devices
   */
  private async scanIpRange(ipRange: string, config: NetworkScanConfig): Promise<DicomDevice[]> {
    const ips = this.expandIpRange(ipRange);
    const devices: DicomDevice[] = [];
    const semaphore = new Semaphore(config.maxConcurrentScans);

    console.log(`🔍 Scanning ${ips.length} IPs in range ${ipRange}`);

    const scanPromises = ips.map(async (ip) => {
      await semaphore.acquire();
      try {
        const ipDevices = await this.scanIpAddress(ip, config);
        devices.push(...ipDevices);
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(scanPromises);
    return devices;
  }

  /**
   * Scan a specific IP address for DICOM services
   */
  private async scanIpAddress(ip: string, config: NetworkScanConfig): Promise<DicomDevice[]> {
    const devices: DicomDevice[] = [];

    for (const port of config.portRanges) {
      try {
        // Skip if we already know about this device and skipKnownDevices is true
        const deviceId = `${ip}:${port}`;
        if (config.skipKnownDevices && this.discoveredDevices.has(deviceId)) {
          const existingDevice = this.discoveredDevices.get(deviceId)!;
          // Quick status check
          existingDevice.status = await this.quickStatusCheck(ip, port) ? 'online' : 'offline';
          existingDevice.lastSeen = new Date().toISOString();
          devices.push(existingDevice);
          continue;
        }

        // Test basic connectivity
        const isReachable = await this.testConnectivity(ip, port, config.timeout);
        if (!isReachable) {
          continue;
        }

        console.log(`📡 Found service at ${ip}:${port}`);

        // Try to identify the device type and capabilities
        const device = await this.identifyDevice(ip, port, config);
        if (device) {
          devices.push(device);
        }

      } catch (error) {
        // Silently continue - most IPs won't have DICOM services
        continue;
      }
    }

    return devices;
  }

  /**
   * Test basic network connectivity to a device
   */
  private async testConnectivity(ip: string, port: number, timeout: number): Promise<boolean> {
    try {
      // Use fetch with a HEAD request for HTTP-based services
      if ([8080, 8042, 4242].includes(port)) {
        const response = await fetch(`http://${ip}:${port}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(timeout)
        });
        return response.ok || response.status < 500; // Accept any non-server-error response
      }

      // For DICOM ports, try a simple TCP connection test
      return await this.testTcpConnection(ip, port, timeout);
    } catch (error) {
      return false;
    }
  }

  /**
   * Test TCP connection (simplified - in real implementation would use proper TCP socket)
   */
  private async testTcpConnection(ip: string, port: number, timeout: number): Promise<boolean> {
    try {
      // Simulate TCP connection test
      // In a real implementation, you'd use Node.js net module or similar
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Try to connect via WebSocket as a proxy for TCP connectivity
      const ws = new WebSocket(`ws://${ip}:${port}`);
      
      return new Promise((resolve) => {
        ws.onopen = () => {
          clearTimeout(timeoutId);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeoutId);
          resolve(false);
        };
        
        controller.signal.addEventListener('abort', () => {
          ws.close();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Identify device type and capabilities
   */
  private async identifyDevice(ip: string, port: number, config: NetworkScanConfig): Promise<DicomDevice | null> {
    const deviceId = `${ip}:${port}`;
    
    try {
      // Try different identification methods
      let device = await this.identifyViaHttp(ip, port);
      if (!device) {
        device = await this.identifyViaDicomEcho(ip, port);
      }
      if (!device) {
        device = this.createGenericDevice(ip, port);
      }

      // Test capabilities if deep scan is enabled
      if (config.deepScan && device) {
        device.capabilities = await this.testDeviceCapabilities(device);
      }

      return device;

    } catch (error) {
      console.warn(`⚠️ Failed to identify device at ${ip}:${port}:`, error);
      return null;
    }
  }

  /**
   * Try to identify device via HTTP endpoints (for web-based PACS)
   */
  private async identifyViaHttp(ip: string, port: number): Promise<DicomDevice | null> {
    try {
      // Try common PACS web endpoints
      const endpoints = ['/', '/app', '/api', '/dicom-web', '/studies', '/system'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://${ip}:${port}${endpoint}`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            const serverHeader = response.headers.get('server') || '';
            
            // Try to get response body for identification
            let responseText = '';
            try {
              responseText = await response.text();
            } catch (e) {
              // Ignore text parsing errors
            }

            return this.parseHttpResponseForDevice(ip, port, {
              contentType,
              serverHeader,
              responseText,
              endpoint
            });
          }
        } catch (error) {
          continue; // Try next endpoint
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse HTTP response to identify device
   */
  private parseHttpResponseForDevice(
    ip: string, 
    port: number, 
    response: { contentType: string; serverHeader: string; responseText: string; endpoint: string }
  ): DicomDevice {
    const deviceId = `${ip}:${port}`;
    let manufacturer = 'Unknown';
    let deviceType: DicomDevice['deviceType'] = 'PACS';
    let name = `Device at ${ip}:${port}`;
    const capabilities: DeviceCapability[] = [];

    // Identify based on server header and content
    if (response.serverHeader.toLowerCase().includes('orthanc')) {
      manufacturer = 'Orthanc';
      name = 'Orthanc DICOM Server';
      deviceType = 'PACS';
      capabilities.push(
        { type: 'WADO', supported: true, tested: false },
        { type: 'WADO_RS', supported: true, tested: false },
        { type: 'QIDO_RS', supported: true, tested: false },
        { type: 'C_ECHO', supported: true, tested: false }
      );
    } else if (response.responseText.toLowerCase().includes('dcm4che')) {
      manufacturer = 'dcm4che';
      name = 'dcm4che Archive';
      deviceType = 'ARCHIVE';
    } else if (response.responseText.toLowerCase().includes('conquest')) {
      manufacturer = 'Conquest';
      name = 'Conquest DICOM Server';
      deviceType = 'PACS';
    } else if (response.contentType.includes('application/dicom')) {
      name = 'DICOM Web Service';
      capabilities.push(
        { type: 'WADO_RS', supported: true, tested: false },
        { type: 'QIDO_RS', supported: true, tested: false }
      );
    }

    return {
      id: deviceId,
      name,
      ip,
      port,
      aeTitle: 'UNKNOWN', // Will be determined later
      deviceType,
      manufacturer,
      status: 'online',
      lastSeen: new Date().toISOString(),
      capabilities,
      connectionSettings: {
        timeout: 10000,
        maxRetries: 3,
        useCompression: false,
        preferredTransferSyntax: '1.2.840.10008.1.2' // Implicit VR Little Endian
      },
      discoveryMethod: 'NETWORK_SCAN',
      metadata: {}
    };
  }

  /**
   * Try DICOM C-ECHO to identify device
   */
  private async identifyViaDicomEcho(ip: string, port: number): Promise<DicomDevice | null> {
    try {
      // Simulate DICOM C-ECHO
      // In real implementation, use DICOM library like dcmjs
      const echoResult = await this.sendDicomEcho(ip, port, 'ECHOSCU', 'ANY-SCP');
      
      if (echoResult.success) {
        return {
          id: `${ip}:${port}`,
          name: `DICOM Device at ${ip}:${port}`,
          ip,
          port,
          aeTitle: echoResult.calledAET || 'UNKNOWN',
          deviceType: 'MODALITY',
          manufacturer: 'Unknown',
          status: 'online',
          lastSeen: new Date().toISOString(),
          capabilities: [
            { type: 'C_ECHO', supported: true, tested: true, responseTime: echoResult.responseTime }
          ],
          connectionSettings: {
            timeout: 10000,
            maxRetries: 3,
            useCompression: false,
            preferredTransferSyntax: '1.2.840.10008.1.2'
          },
          discoveryMethod: 'DICOM_ECHO',
          metadata: {
            implementationUID: echoResult.implementationUID,
            implementationVersion: echoResult.implementationVersion
          }
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a generic device entry for unidentified services
   */
  private createGenericDevice(ip: string, port: number): DicomDevice {
    return {
      id: `${ip}:${port}`,
      name: `Unknown Service at ${ip}:${port}`,
      ip,
      port,
      aeTitle: 'UNKNOWN',
      deviceType: 'WORKSTATION',
      manufacturer: 'Unknown',
      status: 'unknown',
      lastSeen: new Date().toISOString(),
      capabilities: [],
      connectionSettings: {
        timeout: 10000,
        maxRetries: 3,
        useCompression: false,
        preferredTransferSyntax: '1.2.840.10008.1.2'
      },
      discoveryMethod: 'NETWORK_SCAN',
      metadata: {}
    };
  }

  /**
   * Test device capabilities
   */
  private async testDeviceCapabilities(device: DicomDevice): Promise<DeviceCapability[]> {
    const capabilities: DeviceCapability[] = [];
    
    console.log(`🧪 Testing capabilities for ${device.name}`);

    // Test C-ECHO
    try {
      const echoResult = await this.sendDicomEcho(device.ip, device.port, 'ECHOSCU', device.aeTitle);
      capabilities.push({
        type: 'C_ECHO',
        supported: echoResult.success,
        tested: true,
        lastTested: new Date().toISOString(),
        responseTime: echoResult.responseTime
      });
    } catch (error) {
      capabilities.push({
        type: 'C_ECHO',
        supported: false,
        tested: true,
        lastTested: new Date().toISOString()
      });
    }

    // Test WADO-RS
    try {
      const wadoResponse = await fetch(`http://${device.ip}:${device.port}/wado-rs/studies`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      capabilities.push({
        type: 'WADO_RS',
        supported: wadoResponse.ok,
        tested: true,
        lastTested: new Date().toISOString()
      });
    } catch (error) {
      capabilities.push({
        type: 'WADO_RS',
        supported: false,
        tested: true,
        lastTested: new Date().toISOString()
      });
    }

    // Test QIDO-RS
    try {
      const qidoResponse = await fetch(`http://${device.ip}:${device.port}/qido-rs/studies`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      capabilities.push({
        type: 'QIDO_RS',
        supported: qidoResponse.ok,
        tested: true,
        lastTested: new Date().toISOString()
      });
    } catch (error) {
      capabilities.push({
        type: 'QIDO_RS',
        supported: false,
        tested: true,
        lastTested: new Date().toISOString()
      });
    }

    return capabilities;
  }

  /**
   * Discover devices via mDNS (Bonjour/Zeroconf)
   */
  private async discoverViaMdns(): Promise<DicomDevice[]> {
    // Simulate mDNS discovery
    // In real implementation, use mDNS library
    console.log('🔍 Attempting mDNS discovery...');
    
    try {
      // Look for common DICOM service types
      const serviceTypes = [
        '_dicom._tcp.local.',
        '_http._tcp.local.',
        '_pacs._tcp.local.'
      ];

      const devices: DicomDevice[] = [];
      
      // Simulate finding some devices via mDNS
      // In real implementation, this would use actual mDNS queries
      
      return devices;
    } catch (error) {
      console.warn('⚠️ mDNS discovery not available:', error);
      return [];
    }
  }

  /**
   * Get all discovered devices
   */
  getDiscoveredDevices(): DicomDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): DicomDevice | undefined {
    return this.discoveredDevices.get(deviceId);
  }

  /**
   * Add device manually
   */
  async addDevice(deviceConfig: {
    ip: string;
    port: number;
    aeTitle: string;
    name?: string;
    deviceType?: DicomDevice['deviceType'];
    manufacturer?: string;
  }): Promise<DicomDevice> {
    const deviceId = `${deviceConfig.ip}:${deviceConfig.port}`;
    
    const device: DicomDevice = {
      id: deviceId,
      name: deviceConfig.name || `Manual Device at ${deviceConfig.ip}:${deviceConfig.port}`,
      ip: deviceConfig.ip,
      port: deviceConfig.port,
      aeTitle: deviceConfig.aeTitle,
      deviceType: deviceConfig.deviceType || 'WORKSTATION',
      manufacturer: deviceConfig.manufacturer || 'Unknown',
      status: 'unknown',
      lastSeen: new Date().toISOString(),
      capabilities: [],
      connectionSettings: {
        timeout: 10000,
        maxRetries: 3,
        useCompression: false,
        preferredTransferSyntax: '1.2.840.10008.1.2'
      },
      discoveryMethod: 'MANUAL',
      metadata: {}
    };

    // Test the device
    try {
      const isOnline = await this.testConnectivity(device.ip, device.port, 5000);
      device.status = isOnline ? 'online' : 'offline';
      
      if (isOnline) {
        device.capabilities = await this.testDeviceCapabilities(device);
      }
    } catch (error) {
      device.status = 'offline';
    }

    this.discoveredDevices.set(deviceId, device);

    // Log audit event
    await auditService.logDeviceRegistered(deviceId, device);

    return device;
  }

  /**
   * Remove device
   */
  async removeDevice(deviceId: string): Promise<boolean> {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) {
      return false;
    }

    this.discoveredDevices.delete(deviceId);

    // Log audit event
    await auditService.logEvent({
      event_type: 'resource_deleted',
      event_description: 'Medical device removed',
      resource_type: 'Device',
      resource_id: deviceId,
      metadata: {
        action_details: {
          device_name: device.name,
          ip: device.ip,
          port: device.port
        }
      }
    });

    return true;
  }

  /**
   * Update device status for all known devices
   */
  async refreshDeviceStatuses(): Promise<void> {
    console.log('🔄 Refreshing device statuses...');
    
    const devices = Array.from(this.discoveredDevices.values());
    const statusPromises = devices.map(async (device) => {
      try {
        const isOnline = await this.quickStatusCheck(device.ip, device.port);
        device.status = isOnline ? 'online' : 'offline';
        device.lastSeen = new Date().toISOString();
      } catch (error) {
        device.status = 'offline';
      }
    });

    await Promise.all(statusPromises);
    console.log('✅ Device status refresh completed');
  }

  /**
   * Quick status check for a device
   */
  private async quickStatusCheck(ip: string, port: number): Promise<boolean> {
    return await this.testConnectivity(ip, port, 3000);
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    deviceTypes: Record<string, number>;
    lastScanTime?: Date;
    scanInProgress: boolean;
  } {
    const devices = Array.from(this.discoveredDevices.values());
    const deviceTypes: Record<string, number> = {};
    
    let onlineCount = 0;
    let offlineCount = 0;

    devices.forEach(device => {
      deviceTypes[device.deviceType] = (deviceTypes[device.deviceType] || 0) + 1;
      
      if (device.status === 'online') {
        onlineCount++;
      } else {
        offlineCount++;
      }
    });

    return {
      totalDevices: devices.length,
      onlineDevices: onlineCount,
      offlineDevices: offlineCount,
      deviceTypes,
      lastScanTime: this.lastScanTime,
      scanInProgress: this.scanInProgress
    };
  }

  // Helper methods
  private expandIpRange(ipRange: string): string[] {
    // Simple CIDR expansion - in real implementation use proper IP library
    if (ipRange.includes('/24')) {
      const baseIp = ipRange.split('/')[0];
      const baseOctets = baseIp.split('.');
      const ips: string[] = [];
      
      for (let i = 1; i < 255; i++) {
        ips.push(`${baseOctets[0]}.${baseOctets[1]}.${baseOctets[2]}.${i}`);
      }
      
      return ips;
    }
    
    // For other ranges, return as-is (would need proper CIDR parsing)
    return [ipRange];
  }

  private async sendDicomEcho(
    ip: string, 
    port: number, 
    callingAET: string, 
    calledAET: string
  ): Promise<{
    success: boolean;
    responseTime?: number;
    calledAET?: string;
    implementationUID?: string;
    implementationVersion?: string;
  }> {
    // Simulate DICOM C-ECHO
    // In real implementation, use DICOM library
    const startTime = performance.now();
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const responseTime = performance.now() - startTime;
      
      return {
        success: true,
        responseTime,
        calledAET,
        implementationUID: '1.2.840.10008.1.1',
        implementationVersion: 'SIMULATED_1.0'
      };
    } catch (error) {
      return { success: false };
    }
  }
}

/**
 * Simple semaphore for controlling concurrent operations
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

export const medicalDeviceDiscovery = new MedicalDeviceDiscoveryService();