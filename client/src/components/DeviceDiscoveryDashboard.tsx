/**
 * Device Discovery Dashboard
 * Main interface for medical device discovery and management
 */

import React, { useState, useEffect } from 'react';
import {
  medicalDeviceDiscovery,
  DicomDevice,
  NetworkScanConfig,
  DiscoveryResult
} from '../services/medicalDeviceDiscovery';
import { deviceRegistry, DeviceRegistryEntry, DeviceStats } from '../services/deviceRegistry';
import { dicomConnectivityTester, DicomTestResult } from '../services/dicomConnectivityTester';

interface DeviceDiscoveryDashboardProps {
  className?: string;
}

export const DeviceDiscoveryDashboard: React.FC<DeviceDiscoveryDashboardProps> = ({
  className = ''
}) => {
  const [devices, setDevices] = useState<DeviceRegistryEntry[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scanResults, setScanResults] = useState<DiscoveryResult | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceRegistryEntry | null>(null);
  const [testResults, setTestResults] = useState<DicomTestResult[]>([]);
  const [testInProgress, setTestInProgress] = useState(false);

  // Scan configuration
  const [scanConfig, setScanConfig] = useState<Partial<NetworkScanConfig>>({
    ipRanges: ['192.168.1.0/24'],
    portRanges: [104, 8080, 8042, 4242, 11112],
    timeout: 5000,
    maxConcurrentScans: 10,
    deepScan: false
  });

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      await deviceRegistry.initialize();
      refreshDevices();
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
    }
  };

  const refreshDevices = () => {
    const registeredDevices = deviceRegistry.getDevices();
    const deviceStats = deviceRegistry.getDeviceStats();

    setDevices(registeredDevices);
    setStats(deviceStats);
  };

  const handleStartScan = async () => {
    if (scanInProgress) return;

    setScanInProgress(true);
    setScanResults(null);

    try {
      console.log('🔍 Starting device discovery scan...');

      const results = await medicalDeviceDiscovery.discoverDevices(scanConfig);
      setScanResults(results);

      // Register discovered devices
      for (const device of results.devicesFound) {
        try {
          await deviceRegistry.registerDevice(device);
        } catch (error) {
          console.warn(`Failed to register device ${device.name}:`, error);
        }
      }

      refreshDevices();
      console.log(`✅ Scan completed: ${results.devicesFound.length} devices found`);

    } catch (error) {
      console.error('❌ Device scan failed:', error);
    } finally {
      setScanInProgress(false);
    }
  };

  const handleTestDevice = async (device: DeviceRegistryEntry) => {
    if (testInProgress) return;

    setTestInProgress(true);
    setSelectedDevice(device);
    setTestResults([]);

    try {
      console.log(`🧪 Testing device: ${device.name}`);

      const results = await dicomConnectivityTester.testDevice(device, {
        testDepth: 'standard',
        safeMode: true
      });

      setTestResults(results);

      // Add test results to device registry
      await deviceRegistry.addTestResults(
        device.id,
        results,
        results.reduce((sum, r) => sum + r.responseTime, 0),
        'Automated connectivity test'
      );

      refreshDevices();

    } catch (error) {
      console.error('❌ Device test failed:', error);
    } finally {
      setTestInProgress(false);
    }
  };

  const handleRefreshStatuses = async () => {
    try {
      await medicalDeviceDiscovery.refreshDeviceStatuses();
      refreshDevices();
    } catch (error) {
      console.error('Failed to refresh device statuses:', error);
    }
  };

  const getStatusColor = (status: DicomDevice['status']) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'testing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: DicomDevice['status']) => {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'testing': return '🟡';
      default: return '⚪';
    }
  };

  const getPriorityColor = (priority: DeviceRegistryEntry['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'medium': return 'text-blue-700 bg-blue-100';
      case 'low': return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className={`device-discovery-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Medical Device Discovery
        </h2>
        <p className="text-gray-600">
          Discover and manage medical devices on your network
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Devices</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{stats.online}</div>
            <div className="text-sm text-gray-600">Online</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
            <div className="text-sm text-gray-600">Offline</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-orange-600">{stats.needsAttention}</div>
            <div className="text-sm text-gray-600">Need Attention</div>
          </div>
        </div>
      )}

      {/* Scan Configuration */}
      <div className="bg-white p-6 rounded-lg shadow border mb-6">
        <h3 className="text-lg font-semibold mb-4">Network Scan Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IP Ranges (CIDR notation)
            </label>
            <input
              type="text"
              value={scanConfig.ipRanges?.join(', ') || ''}
              onChange={(e) => setScanConfig({
                ...scanConfig,
                ipRanges: e.target.value.split(',').map(s => s.trim())
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="192.168.1.0/24, 10.0.0.0/16"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ports to Scan
            </label>
            <input
              type="text"
              value={scanConfig.portRanges?.join(', ') || ''}
              onChange={(e) => setScanConfig({
                ...scanConfig,
                portRanges: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="104, 8080, 8042, 4242"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={scanConfig.deepScan || false}
              onChange={(e) => setScanConfig({
                ...scanConfig,
                deepScan: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Deep scan (test capabilities)</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleStartScan}
            disabled={scanInProgress}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanInProgress ? '🔍 Scanning...' : '🔍 Start Scan'}
          </button>

          <button
            onClick={handleRefreshStatuses}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            🔄 Refresh Status
          </button>
        </div>
      </div>

      {/* Scan Results */}
      {scanResults && (
        <div className="bg-white p-6 rounded-lg shadow border mb-6">
          <h3 className="text-lg font-semibold mb-4">Latest Scan Results</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-lg font-bold text-green-600">
                {scanResults.devicesFound.length}
              </div>
              <div className="text-sm text-gray-600">Devices Found</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {Math.round(scanResults.scanDuration)}ms
              </div>
              <div className="text-sm text-gray-600">Scan Duration</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {scanResults.ipRangesScanned.length}
              </div>
              <div className="text-sm text-gray-600">IP Ranges Scanned</div>
            </div>
          </div>

          {scanResults.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-red-600 mb-2">Scan Errors:</h4>
              <ul className="text-sm text-red-600 space-y-1">
                {scanResults.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Device List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Discovered Devices</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capabilities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {device.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {device.ip}:{device.port} ({device.aeTitle})
                      </div>
                      <div className="text-xs text-gray-400">
                        {device.manufacturer}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{getStatusIcon(device.status)}</span>
                      <span className={`text-sm font-medium ${getStatusColor(device.status)}`}>
                        {device.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Last seen: {new Date(device.lastSeen).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {device.deviceType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {device.capabilities
                        .filter(cap => cap.supported)
                        .map((cap, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {cap.type}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(device.priority)}`}>
                      {device.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleTestDevice(device)}
                      disabled={testInProgress}
                      className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                    >
                      {testInProgress && selectedDevice?.id === device.id ? '🧪 Testing...' : '🧪 Test'}
                    </button>
                    <button
                      onClick={() => setSelectedDevice(device)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      📋 Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {devices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No devices discovered yet. Start a network scan to find medical devices.
            </div>
          )}
        </div>
      </div>

      {/* Test Results Modal */}
      {selectedDevice && testResults.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Test Results: {selectedDevice.name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedDevice(null);
                    setTestResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">
                        {result.success ? '✅' : '❌'} {result.testType}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {Math.round(result.responseTime)}ms
                      </span>
                    </div>

                    {result.error && (
                      <div className="text-sm text-red-600 mb-2">
                        Error: {result.error}
                      </div>
                    )}

                    {Object.keys(result.details).length > 0 && (
                      <div className="text-sm text-gray-600">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};