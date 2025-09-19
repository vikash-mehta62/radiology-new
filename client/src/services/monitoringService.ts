import { apiService } from './api';

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

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      return await apiService.get(`${this.baseUrl}/detailed`);
    } catch (error) {
      // Fallback to mock data for demo purposes
      console.warn('Failed to fetch real health data, using mock data:', error);
      return this.getMockSystemHealth();
    }
  }

  async getPerformanceMetrics(windowSeconds: number = 300): Promise<PerformanceMetrics> {
    try {
      const response = await apiService.get(`${this.baseUrl}/performance?window_seconds=${windowSeconds}`);
      return response.metrics;
    } catch (error) {
      console.warn('Failed to fetch real performance data, using mock data:', error);
      return this.getMockPerformanceMetrics();
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/alerts`);
      return response.active_alerts;
    } catch (error) {
      console.warn('Failed to fetch real alerts data, using mock data:', error);
      return this.getMockActiveAlerts();
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