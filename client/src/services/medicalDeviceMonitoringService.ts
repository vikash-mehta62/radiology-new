/**
 * Medical Device Monitoring Service
 * Integrates device discovery with system monitoring for comprehensive device health tracking
 */

import { deviceRegistry, DeviceRegistryEntry } from './deviceRegistry';
import { dicomConnectivityTester, DicomTestResult } from './dicomConnectivityTester';
import { auditService } from './auditService';
import { realTimeMonitoringService } from './realTimeMonitoringService';

export interface DeviceHealthMetrics {
  device_id: string;
  device_name: string;
  device_type: string;
  timestamp: string;
  status: 'online' | 'offline' | 'unknown' | 'testing';
  connectivity: {
    response_time_ms: number;
    packet_loss_percent: number;
    jitter_ms: number;
    bandwidth_mbps: number;
  };
  dicom_services: {
    c_echo_status: 'available' | 'unavailable' | 'slow';
    c_find_status: 'available' | 'unavailable' | 'slow';
    wado_status: 'available' | 'unavailable' | 'slow';
    qido_status: 'available' | 'unavailable' | 'slow';
  };
  performance: {
    studies_processed_per_hour: number;
    avg_study_retrieval_time_ms: number;
    error_rate_percent: number;
    queue_depth: number;
  };
  resources: {
    cpu_usage_percent?: number;
    memory_usage_percent?: number;
    disk_usage_percent?: number;
    temperature_celsius?: number;
  };
  alerts: DeviceAlert[];
}

export interface DeviceAlert {
  id: string;
  device_id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'connectivity' | 'performance' | 'resource' | 'service';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolution_timestamp?: string;
}

export interface NetworkTopology {
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  subnets: NetworkSubnet[];
  last_updated: string;
}

export interface NetworkDevice {
  id: string;
  ip: string;
  mac_address?: string;
  hostname?: string;
  device_type: 'medical_device' | 'network_switch' | 'router' | 'firewall' | 'server' | 'workstation';
  vendor?: string;
  model?: string;
  status: 'online' | 'offline' | 'unknown' | 'testing' | 'degraded';
  last_seen: string;
  ports: NetworkPort[];
}

export interface NetworkConnection {
  source_device_id: string;
  target_device_id: string;
  connection_type: 'ethernet' | 'wifi' | 'fiber' | 'unknown';
  bandwidth_mbps: number;
  latency_ms: number;
  status: 'active' | 'inactive' | 'degraded';
}

export interface NetworkSubnet {
  cidr: string;
  gateway: string;
  dns_servers: string[];
  device_count: number;
  medical_device_count: number;
}

export interface NetworkPort {
  port_number: number;
  protocol: 'TCP' | 'UDP';
  service_name?: string;
  status: 'open' | 'closed' | 'filtered';
  last_checked: string;
}

class MedicalDeviceMonitoringService {
  private deviceHealthHistory = new Map<string, DeviceHealthMetrics[]>();
  private activeDeviceAlerts = new Map<string, DeviceAlert[]>();
  private networkTopology: NetworkTopology | null = null;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private readonly MAX_HISTORY_SIZE = 288; // 24 hours at 5-minute intervals

  /**
   * Start medical device monitoring
   */
  async startDeviceMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('🏥 Medical device monitoring already running');
      return;
    }

    console.log('🚀 Starting medical device monitoring...');
    this.isMonitoring = true;

    // Initial device discovery and health check
    await this.performInitialDeviceAssessment();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAllDevices();
    }, this.MONITORING_INTERVAL);

    // Integrate with real-time monitoring service
    realTimeMonitoringService.addAlertRule({
      name: 'Medical Device Offline',
      metric_name: 'device.offline_count',
      threshold: 1,
      comparison: 'greater_than',
      severity: 'critical',
      duration_seconds: 60,
      description: 'One or more medical devices are offline',
      enabled: true,
      notification_channels: ['email', 'dashboard', 'sms']
    });

    await auditService.logEvent({
      event_type: 'system_accessed',
      event_description: 'Medical device monitoring started',
      resource_type: 'System',
      resource_id: 'device_monitoring',
      metadata: {
        action_details: {
          monitoring_interval: this.MONITORING_INTERVAL,
          device_count: deviceRegistry.getDevices().length
        }
      }
    });

    console.log('✅ Medical device monitoring started');
  }

  /**
   * Stop medical device monitoring
   */
  async stopDeviceMonitoring(): Promise<void> {
    console.log('🛑 Stopping medical device monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    await auditService.logEvent({
      event_type: 'system_accessed',
      event_description: 'Medical device monitoring stopped',
      resource_type: 'System',
      resource_id: 'device_monitoring'
    });

    console.log('✅ Medical device monitoring stopped');
  }

  /**
   * Perform initial assessment of all registered devices
   */
  private async performInitialDeviceAssessment(): Promise<void> {
    const devices = deviceRegistry.getDevices();
    console.log(`🔍 Performing initial assessment of ${devices.length} devices...`);

    const assessmentPromises = devices.map(device => 
      this.assessDeviceHealth(device).catch(error => {
        console.error(`❌ Failed to assess device ${device.name}:`, error);
        return null;
      })
    );

    const results = await Promise.allSettled(assessmentPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Initial assessment completed: ${successful}/${devices.length} devices assessed`);
  }

  /**
   * Monitor all registered devices
   */
  private async monitorAllDevices(): Promise<void> {
    const devices = deviceRegistry.getDevices();
    
    for (const device of devices) {
      try {
        await this.monitorDevice(device);
      } catch (error) {
        console.error(`❌ Failed to monitor device ${device.name}:`, error);
      }
    }

    // Update network topology
    await this.updateNetworkTopology();
  }

  /**
   * Monitor a specific device
   */
  private async monitorDevice(device: DeviceRegistryEntry): Promise<void> {
    const healthMetrics = await this.collectDeviceHealthMetrics(device);
    
    // Store metrics history
    if (!this.deviceHealthHistory.has(device.id)) {
      this.deviceHealthHistory.set(device.id, []);
    }
    
    const history = this.deviceHealthHistory.get(device.id)!;
    history.push(healthMetrics);
    
    // Maintain history size
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }

    // Evaluate device alerts
    await this.evaluateDeviceAlerts(device, healthMetrics);

    // Update device status in registry
    await this.updateDeviceStatus(device, healthMetrics);
  }

  /**
   * Collect comprehensive health metrics for a device
   */
  private async collectDeviceHealthMetrics(device: DeviceRegistryEntry): Promise<DeviceHealthMetrics> {
    const timestamp = new Date().toISOString();
    
    // Test basic connectivity
    const connectivityTest = await this.testDeviceConnectivity(device);
    
    // Test DICOM services
    const dicomServicesTest = await this.testDicomServices(device);
    
    // Collect performance metrics
    const performanceMetrics = await this.collectDevicePerformanceMetrics(device);
    
    // Check for existing alerts
    const alerts = this.activeDeviceAlerts.get(device.id) || [];

    return {
      device_id: device.id,
      device_name: device.name,
      device_type: device.deviceType,
      timestamp,
      status: this.determineDeviceStatus(connectivityTest, dicomServicesTest, performanceMetrics),
      connectivity: connectivityTest,
      dicom_services: dicomServicesTest,
      performance: performanceMetrics,
      resources: await this.collectDeviceResourceMetrics(device),
      alerts: alerts.filter(alert => !alert.resolved)
    };
  }

  /**
   * Test device connectivity
   */
  private async testDeviceConnectivity(device: DeviceRegistryEntry): Promise<DeviceHealthMetrics['connectivity']> {
    const startTime = performance.now();
    
    try {
      // Test basic HTTP connectivity for web-based devices
      if ([8080, 8042, 4242].includes(device.port)) {
        const response = await fetch(`http://${device.ip}:${device.port}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        const responseTime = performance.now() - startTime;
        
        return {
          response_time_ms: responseTime,
          packet_loss_percent: response.ok ? 0 : 100,
          jitter_ms: Math.random() * 10, // Simulated jitter
          bandwidth_mbps: this.estimateBandwidth(device)
        };
      }
      
      // For DICOM ports, simulate connectivity test
      const responseTime = performance.now() - startTime + Math.random() * 100;
      
      return {
        response_time_ms: responseTime,
        packet_loss_percent: Math.random() * 5, // 0-5% packet loss
        jitter_ms: Math.random() * 20,
        bandwidth_mbps: this.estimateBandwidth(device)
      };
      
    } catch (error) {
      return {
        response_time_ms: 5000,
        packet_loss_percent: 100,
        jitter_ms: 0,
        bandwidth_mbps: 0
      };
    }
  }

  /**
   * Test DICOM services availability
   */
  private async testDicomServices(device: DeviceRegistryEntry): Promise<DeviceHealthMetrics['dicom_services']> {
    const services: DeviceHealthMetrics['dicom_services'] = {
      c_echo_status: 'unavailable',
      c_find_status: 'unavailable',
      wado_status: 'unavailable',
      qido_status: 'unavailable'
    };

    try {
      // Quick service availability check based on device capabilities
      for (const capability of device.capabilities) {
        if (capability.supported) {
          const status = capability.responseTime && capability.responseTime < 1000 ? 'available' : 
                        capability.responseTime && capability.responseTime < 5000 ? 'slow' : 'unavailable';
          
          switch (capability.type) {
            case 'C_ECHO':
              services.c_echo_status = status;
              break;
            case 'C_FIND':
              services.c_find_status = status;
              break;
            case 'WADO':
            case 'WADO_RS':
              services.wado_status = status;
              break;
            case 'QIDO_RS':
              services.qido_status = status;
              break;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to test DICOM services for ${device.name}:`, error);
    }

    return services;
  }

  /**
   * Collect device performance metrics
   */
  private async collectDevicePerformanceMetrics(device: DeviceRegistryEntry): Promise<DeviceHealthMetrics['performance']> {
    // Simulate performance metrics based on device type and status
    const basePerformance = {
      studies_processed_per_hour: 0,
      avg_study_retrieval_time_ms: 0,
      error_rate_percent: 0,
      queue_depth: 0
    };

    if (device.deviceType === 'PACS') {
      basePerformance.studies_processed_per_hour = Math.floor(Math.random() * 50) + 10;
      basePerformance.avg_study_retrieval_time_ms = Math.random() * 2000 + 500;
      basePerformance.error_rate_percent = Math.random() * 5;
      basePerformance.queue_depth = Math.floor(Math.random() * 20);
    } else if (device.deviceType === 'MODALITY') {
      basePerformance.studies_processed_per_hour = Math.floor(Math.random() * 20) + 5;
      basePerformance.avg_study_retrieval_time_ms = Math.random() * 1000 + 200;
      basePerformance.error_rate_percent = Math.random() * 2;
      basePerformance.queue_depth = Math.floor(Math.random() * 5);
    }

    return basePerformance;
  }

  /**
   * Collect device resource metrics (if available)
   */
  private async collectDeviceResourceMetrics(device: DeviceRegistryEntry): Promise<DeviceHealthMetrics['resources']> {
    // In a real implementation, this would query device-specific APIs
    // For now, simulate resource metrics for demonstration
    
    if (device.deviceType === 'PACS' || device.deviceType === 'WORKSTATION') {
      return {
        cpu_usage_percent: Math.random() * 60 + 20, // 20-80%
        memory_usage_percent: Math.random() * 40 + 40, // 40-80%
        disk_usage_percent: Math.random() * 30 + 30, // 30-60%
        temperature_celsius: Math.random() * 20 + 35 // 35-55°C
      };
    }

    return {};
  }

  /**
   * Assess device health and generate alerts
   */
  private async assessDeviceHealth(device: DeviceRegistryEntry): Promise<DeviceHealthMetrics> {
    console.log(`🔍 Assessing health of device: ${device.name}`);
    
    // Perform comprehensive connectivity test
    const testResults = await dicomConnectivityTester.testDevice(device, {
      testDepth: 'standard',
      safeMode: true
    });

    // Update device capabilities based on test results
    const updatedCapabilities = device.capabilities.map(cap => {
      const testResult = testResults.find(r => r.testType.includes(cap.type));
      if (testResult) {
        return {
          ...cap,
          supported: testResult.success,
          tested: true,
          lastTested: testResult.timestamp,
          responseTime: testResult.responseTime,
          errorRate: testResult.success ? 0 : 1
        };
      }
      return cap;
    });

    // Update device in registry
    await deviceRegistry.updateDevice(device.id, {
      capabilities: updatedCapabilities,
      status: testResults.every(r => r.success) ? 'online' : 'offline'
    });

    // Collect comprehensive health metrics
    return await this.collectDeviceHealthMetrics(device);
  }

  /**
   * Evaluate and generate device-specific alerts
   */
  private async evaluateDeviceAlerts(device: DeviceRegistryEntry, metrics: DeviceHealthMetrics): Promise<void> {
    const newAlerts: DeviceAlert[] = [];

    // Connectivity alerts
    if (metrics.connectivity.response_time_ms > 5000) {
      newAlerts.push({
        id: `${device.id}_high_latency_${Date.now()}`,
        device_id: device.id,
        severity: 'warning',
        type: 'connectivity',
        message: `High response time: ${metrics.connectivity.response_time_ms.toFixed(0)}ms`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    if (metrics.connectivity.packet_loss_percent > 10) {
      newAlerts.push({
        id: `${device.id}_packet_loss_${Date.now()}`,
        device_id: device.id,
        severity: 'critical',
        type: 'connectivity',
        message: `High packet loss: ${metrics.connectivity.packet_loss_percent.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Service availability alerts
    const unavailableServices = Object.entries(metrics.dicom_services)
      .filter(([_, status]) => status === 'unavailable')
      .map(([service, _]) => service);

    if (unavailableServices.length > 0) {
      newAlerts.push({
        id: `${device.id}_services_unavailable_${Date.now()}`,
        device_id: device.id,
        severity: 'critical',
        type: 'service',
        message: `DICOM services unavailable: ${unavailableServices.join(', ')}`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Performance alerts
    if (metrics.performance.error_rate_percent > 5) {
      newAlerts.push({
        id: `${device.id}_high_error_rate_${Date.now()}`,
        device_id: device.id,
        severity: 'warning',
        type: 'performance',
        message: `High error rate: ${metrics.performance.error_rate_percent.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Resource alerts
    if (metrics.resources.cpu_usage_percent && metrics.resources.cpu_usage_percent > 90) {
      newAlerts.push({
        id: `${device.id}_high_cpu_${Date.now()}`,
        device_id: device.id,
        severity: 'warning',
        type: 'resource',
        message: `High CPU usage: ${metrics.resources.cpu_usage_percent.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Store new alerts
    if (newAlerts.length > 0) {
      const existingAlerts = this.activeDeviceAlerts.get(device.id) || [];
      this.activeDeviceAlerts.set(device.id, [...existingAlerts, ...newAlerts]);

      // Log alerts
      for (const alert of newAlerts) {
        await auditService.logEvent({
          event_type: 'device_accessed',
          event_description: `Device alert: ${alert.message}`,
          resource_type: 'Device',
          resource_id: device.id,
          device_id: device.id,
          metadata: {
            action_details: {
              alert_type: alert.type,
              severity: alert.severity,
              message: alert.message
            }
          }
        });
      }
    }
  }

  /**
   * Update device status in registry based on health metrics
   */
  private async updateDeviceStatus(device: DeviceRegistryEntry, metrics: DeviceHealthMetrics): Promise<void> {
    if (device.status !== metrics.status) {
      await deviceRegistry.updateDevice(device.id, {
        status: metrics.status,
        lastSeen: metrics.timestamp
      });
    }
  }

  /**
   * Update network topology
   */
  private async updateNetworkTopology(): Promise<void> {
    const devices = deviceRegistry.getDevices();
    const networkDevices: NetworkDevice[] = devices.map(device => ({
      id: device.id,
      ip: device.ip,
      hostname: device.name,
      device_type: 'medical_device',
      vendor: device.manufacturer,
      model: device.model || 'Unknown',
      status: device.status,
      last_seen: device.lastSeen,
      ports: this.getDevicePorts(device)
    }));

    this.networkTopology = {
      devices: networkDevices,
      connections: this.generateNetworkConnections(networkDevices),
      subnets: this.identifyNetworkSubnets(devices),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Get device health metrics history
   */
  getDeviceHealthHistory(deviceId: string, hours: number = 24): DeviceHealthMetrics[] {
    const history = this.deviceHealthHistory.get(deviceId) || [];
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return history.filter(metrics => new Date(metrics.timestamp) >= cutoffTime);
  }

  /**
   * Get all device health metrics
   */
  getAllDeviceHealthMetrics(): Map<string, DeviceHealthMetrics[]> {
    return new Map(this.deviceHealthHistory);
  }

  /**
   * Get active device alerts
   */
  getActiveDeviceAlerts(): DeviceAlert[] {
    const allAlerts: DeviceAlert[] = [];
    for (const alerts of this.activeDeviceAlerts.values()) {
      allAlerts.push(...alerts.filter(alert => !alert.resolved));
    }
    return allAlerts;
  }

  /**
   * Get network topology
   */
  getNetworkTopology(): NetworkTopology | null {
    return this.networkTopology;
  }

  /**
   * Get device monitoring statistics
   */
  getMonitoringStatistics(): {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    degraded_devices: number;
    active_alerts: number;
    critical_alerts: number;
    avg_response_time: number;
  } {
    const devices = deviceRegistry.getDevices();
    const activeAlerts = this.getActiveDeviceAlerts();
    
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [deviceId, history] of this.deviceHealthHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        totalResponseTime += latest.connectivity.response_time_ms;
        responseTimeCount++;
      }
    }

    return {
      total_devices: devices.length,
      online_devices: devices.filter(d => d.status === 'online').length,
      offline_devices: devices.filter(d => d.status === 'offline').length,
      degraded_devices: devices.filter(d => d.status === 'unknown').length,
      active_alerts: activeAlerts.length,
      critical_alerts: activeAlerts.filter(a => a.severity === 'critical').length,
      avg_response_time: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0
    };
  }

  // Helper methods
  private determineDeviceStatus(
    connectivity: DeviceHealthMetrics['connectivity'],
    services: DeviceHealthMetrics['dicom_services'],
    performance: DeviceHealthMetrics['performance']
  ): 'online' | 'offline' | 'unknown' | 'testing' {
    if (connectivity.packet_loss_percent === 100) {
      return 'offline';
    }
    
    if (connectivity.response_time_ms > 5000 || 
        Object.values(services).some(status => status === 'unavailable') ||
        performance.error_rate_percent > 10) {
      return 'unknown'; // Changed from 'degraded' to 'unknown'
    }
    
    return 'online';
  }

  private estimateBandwidth(device: DeviceRegistryEntry): number {
    // Simulate bandwidth estimation based on device type
    switch (device.deviceType) {
      case 'PACS': return Math.random() * 500 + 100; // 100-600 Mbps
      case 'MODALITY': return Math.random() * 100 + 50; // 50-150 Mbps
      case 'WORKSTATION': return Math.random() * 200 + 100; // 100-300 Mbps
      default: return Math.random() * 100 + 10; // 10-110 Mbps
    }
  }

  private getDevicePorts(device: DeviceRegistryEntry): NetworkPort[] {
    const ports: NetworkPort[] = [{
      port_number: device.port,
      protocol: 'TCP',
      service_name: device.deviceType,
      status: device.status === 'online' ? 'open' : 'closed',
      last_checked: new Date().toISOString()
    }];

    // Add common DICOM ports
    if (device.capabilities.some(c => c.type === 'C_ECHO')) {
      ports.push({
        port_number: 104,
        protocol: 'TCP',
        service_name: 'DICOM',
        status: 'open',
        last_checked: new Date().toISOString()
      });
    }

    return ports;
  }

  private generateNetworkConnections(devices: NetworkDevice[]): NetworkConnection[] {
    // Simulate network connections between devices
    const connections: NetworkConnection[] = [];
    
    for (let i = 0; i < devices.length - 1; i++) {
      for (let j = i + 1; j < devices.length; j++) {
        if (Math.random() < 0.3) { // 30% chance of connection
          connections.push({
            source_device_id: devices[i].id,
            target_device_id: devices[j].id,
            connection_type: 'ethernet',
            bandwidth_mbps: Math.random() * 1000 + 100,
            latency_ms: Math.random() * 10 + 1,
            status: 'active'
          });
        }
      }
    }
    
    return connections;
  }

  private identifyNetworkSubnets(devices: DeviceRegistryEntry[]): NetworkSubnet[] {
    const subnets = new Map<string, NetworkSubnet>();
    
    for (const device of devices) {
      const subnet = this.getSubnetFromIP(device.ip);
      if (!subnets.has(subnet)) {
        subnets.set(subnet, {
          cidr: subnet,
          gateway: this.getGatewayFromSubnet(subnet),
          dns_servers: ['8.8.8.8', '8.8.4.4'],
          device_count: 0,
          medical_device_count: 0
        });
      }
      
      const subnetInfo = subnets.get(subnet)!;
      subnetInfo.device_count++;
      subnetInfo.medical_device_count++;
    }
    
    return Array.from(subnets.values());
  }

  private getSubnetFromIP(ip: string): string {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }

  private getGatewayFromSubnet(subnet: string): string {
    const parts = subnet.split('/')[0].split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.1`;
  }
}

export const medicalDeviceMonitoringService = new MedicalDeviceMonitoringService();