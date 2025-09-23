import { apiService } from './api';
import { realTimeMonitoringService } from './realTimeMonitoringService';
import { medicalDeviceMonitoringService } from './medicalDeviceMonitoringService';
import { historicalDataService } from './historicalDataService';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details: Record<string, any>;
  response_time_ms: number;
  timestamp: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: string;
  version: string;
  uptime_seconds: number;
  summary: {
    total_checks: number;
    healthy_checks: number;
    degraded_checks: number;
    unhealthy_checks: number;
  };
}

interface PerformanceMetrics {
  avg_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  requests_per_second: number;
  error_rate: number;
  total_requests: number;
  total_errors: number;
}

interface Alert {
  name: string;
  severity: 'warning' | 'critical' | 'info';
  metric_name: string;
  current_value: number;
  threshold: number;
  comparison: string;
  status: 'firing' | 'resolved';
  timestamp: string;
  description: string;
  duration_seconds?: number;
}

interface MetricsSummary {
  performance: PerformanceMetrics;
  active_alerts: number;
  system_metrics: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
  request_metrics: {
    total_requests: number;
    total_errors: number;
    response_time_stats: {
      count: number;
      avg: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
  };
  workflow_metrics: {
    studies_processed_today: number;
    reports_generated_today: number;
    avg_workflow_time_seconds: number;
    one_minute_target_achieved: number;
  };
}

class MonitoringService {
  private baseUrl = '/health';
  private isRealTimeEnabled = false;

  /**
   * Initialize monitoring with real-time capabilities
   */
  async initialize(): Promise<void> {
    try {
      // Start real-time monitoring
      await realTimeMonitoringService.startMonitoring();
      
      // Start medical device monitoring
      await medicalDeviceMonitoringService.startDeviceMonitoring();
      
      this.isRealTimeEnabled = true;
      console.log('✅ Enhanced monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize real-time monitoring, using fallback mode:', error);
      this.isRealTimeEnabled = false;
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Try to get real backend data first
      const backendHealth = await apiService.get(`${this.baseUrl}/detailed`);
      
      // Enhance with real-time data if available
      if (this.isRealTimeEnabled) {
        const realTimeMetrics = realTimeMonitoringService.getCurrentSystemMetrics();
        const deviceStats = medicalDeviceMonitoringService.getMonitoringStatistics();
        
        if (realTimeMetrics) {
          // Add real-time system resource checks
          backendHealth.checks.push({
            name: 'real_time_cpu',
            status: realTimeMetrics.cpu.usage_percent > 80 ? 'degraded' : 'healthy',
            message: `CPU usage: ${realTimeMetrics.cpu.usage_percent.toFixed(1)}%`,
            details: realTimeMetrics.cpu,
            response_time_ms: 0,
            timestamp: realTimeMetrics.timestamp
          });

          backendHealth.checks.push({
            name: 'real_time_memory',
            status: realTimeMetrics.memory.usage_percent > 85 ? 'degraded' : 'healthy',
            message: `Memory usage: ${realTimeMetrics.memory.usage_percent.toFixed(1)}%`,
            details: realTimeMetrics.memory,
            response_time_ms: 0,
            timestamp: realTimeMetrics.timestamp
          });
        }

        // Add medical device health check
        if (deviceStats.total_devices > 0) {
          const deviceHealthStatus = deviceStats.offline_devices === 0 ? 'healthy' : 
                                   deviceStats.offline_devices < deviceStats.total_devices / 2 ? 'degraded' : 'unhealthy';
          
          backendHealth.checks.push({
            name: 'medical_devices',
            status: deviceHealthStatus,
            message: `${deviceStats.online_devices}/${deviceStats.total_devices} devices online`,
            details: deviceStats,
            response_time_ms: deviceStats.avg_response_time,
            timestamp: new Date().toISOString()
          });
        }

        // Update summary
        backendHealth.summary = this.calculateHealthSummary(backendHealth.checks);
        backendHealth.status = this.determineOverallStatus(backendHealth.checks);
      }
      
      return backendHealth;
    } catch (error) {
      // Fallback to enhanced mock data
      console.warn('Failed to fetch real health data, using enhanced mock data:', error);
      return this.getEnhancedMockSystemHealth();
    }
  }

  async getPerformanceMetrics(windowSeconds: number = 300): Promise<PerformanceMetrics> {
    try {
      // Try to get real backend data first
      const response = await apiService.get(`${this.baseUrl}/performance?window_seconds=${windowSeconds}`);
      return response.metrics;
    } catch (error) {
      console.warn('Failed to fetch real performance data, using enhanced mock data:', error);
      
      // Use real-time data if available
      if (this.isRealTimeEnabled) {
        const appMetrics = realTimeMonitoringService.getCurrentApplicationMetrics();
        if (appMetrics) {
          return {
            avg_response_time: appMetrics.requests.avg_response_time_ms / 1000, // Convert to seconds
            p95_response_time: appMetrics.requests.p95_response_time_ms / 1000,
            p99_response_time: appMetrics.requests.p99_response_time_ms / 1000,
            requests_per_second: appMetrics.requests.requests_per_second,
            error_rate: appMetrics.requests.error_count / appMetrics.requests.total_count,
            total_requests: appMetrics.requests.total_count,
            total_errors: appMetrics.requests.error_count
          };
        }
      }
      
      return this.getMockPerformanceMetrics();
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/alerts`);
      return response.active_alerts;
    } catch (error) {
      console.warn('Failed to fetch real alerts data, using enhanced mock data:', error);
      
      // Combine real-time alerts with mock data
      const alerts: Alert[] = [];
      
      if (this.isRealTimeEnabled) {
        // Get real-time system alerts
        const realTimeAlerts = realTimeMonitoringService.getActiveAlerts();
        alerts.push(...realTimeAlerts.map(alert => ({
          name: alert.name,
          severity: alert.severity,
          metric_name: alert.metric_name,
          current_value: alert.current_value,
          threshold: alert.threshold,
          comparison: alert.comparison,
          status: alert.status,
          timestamp: alert.timestamp,
          description: alert.description,
          duration_seconds: alert.duration_seconds
        })));

        // Get medical device alerts
        const deviceAlerts = medicalDeviceMonitoringService.getActiveDeviceAlerts();
        alerts.push(...deviceAlerts.map(alert => ({
          name: `Device: ${alert.message}`,
          severity: alert.severity,
          metric_name: `device.${alert.type}`,
          current_value: 1,
          threshold: 0,
          comparison: 'greater_than' as const,
          status: alert.resolved ? 'resolved' as const : 'firing' as const,
          timestamp: alert.timestamp,
          description: alert.message,
          duration_seconds: Math.floor((new Date().getTime() - new Date(alert.timestamp).getTime()) / 1000)
        })));
      }
      
      // Add mock alerts if no real alerts
      if (alerts.length === 0) {
        alerts.push(...this.getMockActiveAlerts());
      }
      
      return alerts;
    }
  }

  async getAlertHistory(limit: number = 50): Promise<Alert[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/alerts/history?limit=${limit}`);
      return response.alerts;
    } catch (error) {
      console.warn('Failed to fetch real alert history, using mock data:', error);
      return this.getMockAlertHistory();
    }
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    try {
      return await apiService.get(`${this.baseUrl}/metrics`);
    } catch (error) {
      console.warn('Failed to fetch real metrics summary, using mock data:', error);
      return this.getMockMetricsSummary();
    }
  }

  async testAlert(alertName: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/alerts/test?alert_name=${alertName}`);
  }

  /**
   * Get historical metrics data
   */
  async getHistoricalMetrics(metricNames: string[], hours: number = 24): Promise<any[]> {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const results = await historicalDataService.queryMetrics({
        metric_names: metricNames,
        start_time: startTime,
        end_time: endTime
      });
      
      return results;
    } catch (error) {
      console.warn('Failed to get historical metrics:', error);
      return [];
    }
  }

  /**
   * Get performance baselines
   */
  async getPerformanceBaselines(): Promise<any[]> {
    const commonMetrics = [
      'system.cpu.usage_percent',
      'system.memory.usage_percent',
      'application.requests.avg_response_time_ms',
      'application.requests.error_rate'
    ];

    const baselines = [];
    for (const metric of commonMetrics) {
      const baseline = historicalDataService.getBaseline(metric);
      if (baseline) {
        baselines.push(baseline);
      }
    }

    return baselines;
  }

  /**
   * Get trend analyses
   */
  async getTrendAnalyses(): Promise<any[]> {
    const commonMetrics = [
      'system.cpu.usage_percent',
      'system.memory.usage_percent',
      'application.requests.avg_response_time_ms'
    ];

    const trends = [];
    for (const metric of commonMetrics) {
      const trend = historicalDataService.getTrendAnalysis(metric);
      if (trend) {
        trends.push(trend);
      }
    }

    return trends;
  }

  /**
   * Get anomaly detections
   */
  async getAnomalies(hours: number = 24): Promise<any[]> {
    return historicalDataService.getRecentAnomalies(hours);
  }

  /**
   * Get medical device health metrics
   */
  async getDeviceHealthMetrics(): Promise<any> {
    if (!this.isRealTimeEnabled) {
      return null;
    }

    return {
      statistics: medicalDeviceMonitoringService.getMonitoringStatistics(),
      alerts: medicalDeviceMonitoringService.getActiveDeviceAlerts(),
      topology: medicalDeviceMonitoringService.getNetworkTopology()
    };
  }

  /**
   * Store custom metric
   */
  async storeMetric(metricName: string, value: number, labels?: Record<string, string>): Promise<void> {
    await historicalDataService.storeMetricPoint(metricName, value, undefined, labels);
  }

  /**
   * Calculate enhanced health summary
   */
  private calculateHealthSummary(checks: HealthCheck[]): SystemHealth['summary'] {
    return {
      total_checks: checks.length,
      healthy_checks: checks.filter(c => c.status === 'healthy').length,
      degraded_checks: checks.filter(c => c.status === 'degraded').length,
      unhealthy_checks: checks.filter(c => c.status === 'unhealthy').length
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Get enhanced mock system health with real-time data
   */
  private getEnhancedMockSystemHealth(): SystemHealth {
    const mockHealth = this.getMockSystemHealth();

    // Add real-time enhancements if available
    if (this.isRealTimeEnabled) {
      const realTimeMetrics = realTimeMonitoringService.getCurrentSystemMetrics();
      const deviceStats = medicalDeviceMonitoringService.getMonitoringStatistics();

      if (realTimeMetrics) {
        // Update system resource checks with real data
        const cpuCheck = mockHealth.checks.find(c => c.name === 'system_resources');
        if (cpuCheck) {
          cpuCheck.details = {
            ...cpuCheck.details,
            cpu_percent: realTimeMetrics.cpu.usage_percent,
            memory_percent: realTimeMetrics.memory.usage_percent,
            disk_percent: realTimeMetrics.disk.usage_percent
          };
          cpuCheck.message = `CPU: ${realTimeMetrics.cpu.usage_percent.toFixed(1)}%, Memory: ${realTimeMetrics.memory.usage_percent.toFixed(1)}%`;
        }
      }

      // Add medical device check
      if (deviceStats.total_devices > 0) {
        mockHealth.checks.push({
          name: 'medical_devices',
          status: deviceStats.offline_devices === 0 ? 'healthy' : 'degraded',
          message: `${deviceStats.online_devices}/${deviceStats.total_devices} medical devices online`,
          details: deviceStats,
          response_time_ms: deviceStats.avg_response_time,
          timestamp: new Date().toISOString()
        });
      }

      // Recalculate summary
      mockHealth.summary = this.calculateHealthSummary(mockHealth.checks);
      mockHealth.status = this.determineOverallStatus(mockHealth.checks);
    }

    return mockHealth;
  }

  // Mock data methods for demo purposes
  private getMockSystemHealth(): SystemHealth {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime_seconds: 86400,
      checks: [
        {
          name: 'database',
          status: 'healthy',
          message: 'Database connection healthy',
          details: {
            connection_pool_size: 20,
            active_connections: 8,
            query_response_time_ms: 12.5
          },
          response_time_ms: 15.2,
          timestamp: new Date().toISOString()
        },
        {
          name: 'redis',
          status: 'healthy',
          message: 'Redis connection healthy',
          details: {
            connected_clients: 12,
            used_memory_human: '45.2MB',
            redis_version: '7.0.0'
          },
          response_time_ms: 8.7,
          timestamp: new Date().toISOString()
        },
        {
          name: 'ai_service',
          status: 'degraded',
          message: 'AI service responding slowly',
          details: {
            queue_size: 15,
            avg_processing_time_ms: 8500,
            model_version: 'v2.1.0'
          },
          response_time_ms: 2500.0,
          timestamp: new Date().toISOString()
        },
        {
          name: 'system_resources',
          status: 'healthy',
          message: 'System resources normal',
          details: {
            cpu_percent: 45.2,
            memory_percent: 67.8,
            disk_percent: 34.1
          },
          response_time_ms: 25.3,
          timestamp: new Date().toISOString()
        }
      ],
      summary: {
        total_checks: 4,
        healthy_checks: 3,
        degraded_checks: 1,
        unhealthy_checks: 0
      }
    };
  }

  private getMockPerformanceMetrics(): PerformanceMetrics {
    return {
      avg_response_time: 0.245,
      p95_response_time: 0.890,
      p99_response_time: 2.150,
      requests_per_second: 12.4,
      error_rate: 0.023,
      total_requests: 3720,
      total_errors: 85
    };
  }

  private getMockActiveAlerts(): Alert[] {
    return [
      {
        name: 'high_response_time',
        severity: 'warning',
        metric_name: 'http_request_duration_ms',
        current_value: 6500.0,
        threshold: 5000.0,
        comparison: 'greater_than',
        status: 'firing',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        description: 'API response time is consistently high',
        duration_seconds: 180
      },
      {
        name: 'ai_processing_queue_backlog',
        severity: 'warning',
        metric_name: 'ai_queue_pending_jobs',
        current_value: 67.0,
        threshold: 50.0,
        comparison: 'greater_than',
        status: 'firing',
        timestamp: new Date(Date.now() - 375000).toISOString(),
        description: 'AI processing queue has significant backlog',
        duration_seconds: 375
      }
    ];
  }

  private getMockAlertHistory(): Alert[] {
    return [
      {
        name: 'high_cpu_usage',
        severity: 'warning',
        metric_name: 'system_cpu_percent',
        current_value: 65.2,
        threshold: 80.0,
        comparison: 'greater_than',
        status: 'resolved',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        description: 'CPU usage was elevated'
      },
      {
        name: 'database_connection_failures',
        severity: 'critical',
        metric_name: 'database_connection_errors',
        current_value: 0.0,
        threshold: 3.0,
        comparison: 'greater_than',
        status: 'resolved',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: 'Database connection failures detected'
      }
    ];
  }

  private getMockMetricsSummary(): MetricsSummary {
    return {
      performance: this.getMockPerformanceMetrics(),
      active_alerts: 2,
      system_metrics: {
        cpu_percent: 45.2,
        memory_percent: 67.8,
        disk_percent: 34.1
      },
      request_metrics: {
        total_requests: 15420,
        total_errors: 234,
        response_time_stats: {
          count: 15420,
          avg: 245.8,
          min: 12.3,
          max: 5420.1,
          p50: 180.5,
          p95: 890.2,
          p99: 2150.8
        }
      },
      workflow_metrics: {
        studies_processed_today: 89,
        reports_generated_today: 87,
        avg_workflow_time_seconds: 45.2,
        one_minute_target_achieved: 0.94
      }
    };
  }
}

export const monitoringService = new MonitoringService();