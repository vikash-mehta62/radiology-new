import { useState, useEffect, useCallback } from 'react';
import { monitoringService } from '../services/monitoringService';

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

interface UseMonitoringReturn {
  systemHealth: SystemHealth | null;
  performanceMetrics: PerformanceMetrics | null;
  activeAlerts: Alert[] | null;
  alertHistory: Alert[] | null;
  metricsSummary: MetricsSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

export const useMonitoring = (refreshInterval: number = 0): UseMonitoringReturn => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[] | null>(null);
  const [alertHistory, setAlertHistory] = useState<Alert[] | null>(null);
  const [metricsSummary, setMetricsSummary] = useState<MetricsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all monitoring data in parallel
      const [healthData, metricsData, alertsData, historyData, summaryData] = await Promise.all([
        monitoringService.getSystemHealth(),
        monitoringService.getPerformanceMetrics(),
        monitoringService.getActiveAlerts(),
        monitoringService.getAlertHistory(),
        monitoringService.getMetricsSummary()
      ]);

      setSystemHealth(healthData);
      setPerformanceMetrics(metricsData);
      setActiveAlerts(alertsData);
      setAlertHistory(historyData);
      setMetricsSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      console.error('Monitoring data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchData]);

  return {
    systemHealth,
    performanceMetrics,
    activeAlerts,
    alertHistory,
    metricsSummary,
    isLoading,
    error,
    refreshData
  };
};