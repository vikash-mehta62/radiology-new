/**
 * Advanced Analytics Service
 * Provides comprehensive reporting, insights, and performance analytics
 * for the medical radiology system
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface AnalyticsTimeRange {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ReportMetrics {
  totalReports: number;
  completedReports: number;
  draftReports: number;
  aiGeneratedReports: number;
  averageCompletionTime: number;
  averageAIConfidence: number;
  reportsByExamType: Array<{
    examType: string;
    count: number;
    percentage: number;
  }>;
  reportsBySpecialty: Array<{
    specialty: string;
    count: number;
    percentage: number;
  }>;
  reportsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface UserProductivityMetrics {
  userId: string;
  userName: string;
  role: string;
  reportsCreated: number;
  averageReportTime: number;
  aiUsagePercentage: number;
  voiceInputUsage: number;
  collaborationSessions: number;
  qualityScore: number;
  efficiency: {
    reportsPerHour: number;
    wordsPerMinute: number;
    errorRate: number;
  };
  trends: {
    weekOverWeek: number;
    monthOverMonth: number;
  };
}

export interface SystemPerformanceMetrics {
  apiResponseTimes: {
    average: number;
    p95: number;
    p99: number;
  };
  aiProcessingTimes: {
    average: number;
    p95: number;
    p99: number;
  };
  emailDeliveryRates: {
    successRate: number;
    averageDeliveryTime: number;
    bounceRate: number;
  };
  collaborationMetrics: {
    activeUsers: number;
    averageSessionDuration: number;
    conflictResolutionRate: number;
  };
  voiceInputMetrics: {
    recognitionAccuracy: number;
    averageSessionDuration: number;
    medicalTermAccuracy: number;
  };
  systemUptime: number;
  errorRates: {
    total: number;
    byService: Array<{
      service: string;
      errorRate: number;
    }>;
  };
}

export interface QualityMetrics {
  reportAccuracy: number;
  aiPredictionAccuracy: number;
  userSatisfactionScore: number;
  reviewCycleTime: number;
  revisionRate: number;
  complianceScore: number;
  auditFindings: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    trend: number;
  }>;
}

export interface BusinessIntelligence {
  patientVolume: {
    total: number;
    trend: number;
    byDemographics: Array<{
      category: string;
      value: string;
      count: number;
      percentage: number;
    }>;
  };
  examTypeDistribution: Array<{
    examType: string;
    count: number;
    revenue: number;
    averageTurnaroundTime: number;
  }>;
  departmentPerformance: Array<{
    department: string;
    productivity: number;
    quality: number;
    efficiency: number;
    satisfaction: number;
  }>;
  costAnalysis: {
    totalCosts: number;
    costPerReport: number;
    aiSavings: number;
    efficiencyGains: number;
  };
  predictiveInsights: Array<{
    metric: string;
    prediction: number;
    confidence: number;
    timeframe: string;
    recommendations: string[];
  }>;
}

export interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  userId: string;
  isPublic: boolean;
  widgets: Array<{
    id: string;
    type: 'chart' | 'metric' | 'table' | 'gauge' | 'heatmap';
    title: string;
    position: { x: number; y: number; width: number; height: number };
    config: {
      dataSource: string;
      chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
      metrics: string[];
      filters: Record<string, any>;
      refreshInterval: number;
    };
  }>;
  filters: Array<{
    name: string;
    type: 'date' | 'select' | 'multiselect' | 'text';
    options?: string[];
    defaultValue?: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

class AnalyticsService {
  private baseUrl = '/api/analytics';
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive report metrics
   */
  async getReportMetrics(timeRange: AnalyticsTimeRange, filters?: {
    examType?: string[];
    specialty?: string[];
    userId?: string[];
    department?: string[];
  }): Promise<ReportMetrics> {
    try {
      console.log('📊 Fetching report metrics...');

      const cacheKey = `report-metrics-${JSON.stringify({ timeRange, filters })}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await apiService.post<ReportMetrics>(`${this.baseUrl}/reports`, {
        timeRange,
        filters: filters || {}
      });

      this.setCachedData(cacheKey, response);

      // Log analytics access
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'Report metrics accessed',
        resource_type: 'Report',
        resource_id: 'analytics-dashboard',
        metadata: {
          action_details: {
            metric_type: 'report_metrics',
            time_range: timeRange,
            filters: filters
          }
        }
      });

      console.log('✅ Report metrics retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch report metrics:', error);
      throw new Error('Failed to load report metrics. Please try again.');
    }
  }

  /**
   * Get user productivity metrics
   */
  async getUserProductivityMetrics(timeRange: AnalyticsTimeRange, userIds?: string[]): Promise<UserProductivityMetrics[]> {
    try {
      console.log('👥 Fetching user productivity metrics...');

      const cacheKey = `user-productivity-${JSON.stringify({ timeRange, userIds })}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await apiService.post<{ users: UserProductivityMetrics[] }>(`${this.baseUrl}/users/productivity`, {
        timeRange,
        userIds: userIds || []
      });

      this.setCachedData(cacheKey, response.users);

      console.log(`✅ Retrieved productivity metrics for ${response.users.length} users`);
      return response.users;
    } catch (error) {
      console.error('❌ Failed to fetch user productivity metrics:', error);
      throw new Error('Failed to load user productivity metrics. Please try again.');
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemPerformanceMetrics(timeRange: AnalyticsTimeRange): Promise<SystemPerformanceMetrics> {
    try {
      console.log('⚡ Fetching system performance metrics...');

      const cacheKey = `system-performance-${JSON.stringify(timeRange)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await apiService.post<SystemPerformanceMetrics>(`${this.baseUrl}/system/performance`, {
        timeRange
      });

      this.setCachedData(cacheKey, response);

      console.log('✅ System performance metrics retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch system performance metrics:', error);
      throw new Error('Failed to load system performance metrics. Please try again.');
    }
  }

  /**
   * Get quality metrics
   */
  async getQualityMetrics(timeRange: AnalyticsTimeRange, filters?: {
    examType?: string[];
    department?: string[];
  }): Promise<QualityMetrics> {
    try {
      console.log('🎯 Fetching quality metrics...');

      const cacheKey = `quality-metrics-${JSON.stringify({ timeRange, filters })}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await apiService.post<QualityMetrics>(`${this.baseUrl}/quality`, {
        timeRange,
        filters: filters || {}
      });

      this.setCachedData(cacheKey, response);

      console.log('✅ Quality metrics retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch quality metrics:', error);
      throw new Error('Failed to load quality metrics. Please try again.');
    }
  }

  /**
   * Get business intelligence insights
   */
  async getBusinessIntelligence(timeRange: AnalyticsTimeRange): Promise<BusinessIntelligence> {
    try {
      console.log('💼 Fetching business intelligence insights...');

      const cacheKey = `business-intelligence-${JSON.stringify(timeRange)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await apiService.post<BusinessIntelligence>(`${this.baseUrl}/business-intelligence`, {
        timeRange
      });

      this.setCachedData(cacheKey, response);

      console.log('✅ Business intelligence insights retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch business intelligence:', error);
      throw new Error('Failed to load business intelligence insights. Please try again.');
    }
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(config: {
    name: string;
    description: string;
    timeRange: AnalyticsTimeRange;
    metrics: string[];
    filters: Record<string, any>;
    groupBy?: string[];
    sortBy?: { field: string; direction: 'asc' | 'desc' };
    format: 'json' | 'csv' | 'pdf' | 'excel';
  }): Promise<{
    reportId: string;
    downloadUrl?: string;
    data?: any;
  }> {
    try {
      console.log('📋 Generating custom report:', config.name);

      const response = await apiService.post<{
        reportId: string;
        downloadUrl?: string;
        data?: any;
      }>(`${this.baseUrl}/reports/custom`, config);

      // Log report generation
      await auditService.logEvent({
        event_type: 'report_created',
        event_description: `Custom analytics report generated: ${config.name}`,
        resource_type: 'Report',
        resource_id: response.reportId,
        metadata: {
          action_details: {
            report_name: config.name,
            format: config.format,
            metrics: config.metrics,
            time_range: config.timeRange
          }
        }
      });

      console.log('✅ Custom report generated successfully:', response.reportId);
      return response;
    } catch (error) {
      console.error('❌ Failed to generate custom report:', error);
      throw new Error('Failed to generate custom report. Please try again.');
    }
  }

  /**
   * Create custom dashboard
   */
  async createCustomDashboard(dashboard: Omit<CustomDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomDashboard> {
    try {
      console.log('📊 Creating custom dashboard:', dashboard.name);

      const response = await apiService.post<CustomDashboard>(`${this.baseUrl}/dashboards`, dashboard);

      // Log dashboard creation
      await auditService.logEvent({
        event_type: 'report_created',
        event_description: `Custom dashboard created: ${dashboard.name}`,
        resource_type: 'Report',
        resource_id: response.id,
        metadata: {
          action_details: {
            dashboard_name: dashboard.name,
            widget_count: dashboard.widgets.length,
            is_public: dashboard.isPublic
          }
        }
      });

      console.log('✅ Custom dashboard created successfully:', response.id);
      return response;
    } catch (error) {
      console.error('❌ Failed to create custom dashboard:', error);
      throw new Error('Failed to create custom dashboard. Please try again.');
    }
  }

  /**
   * Get user dashboards
   */
  async getUserDashboards(userId?: string): Promise<CustomDashboard[]> {
    try {
      const queryParams = userId ? `?userId=${userId}` : '';
      const response = await apiService.get<{ dashboards: CustomDashboard[] }>(`${this.baseUrl}/dashboards${queryParams}`);
      
      return response.dashboards;
    } catch (error) {
      console.error('❌ Failed to fetch user dashboards:', error);
      throw new Error('Failed to load dashboards. Please try again.');
    }
  }

  /**
   * Update custom dashboard
   */
  async updateCustomDashboard(dashboardId: string, updates: Partial<CustomDashboard>): Promise<CustomDashboard> {
    try {
      console.log('📊 Updating custom dashboard:', dashboardId);

      const response = await apiService.put<CustomDashboard>(`${this.baseUrl}/dashboards/${dashboardId}`, updates);

      console.log('✅ Custom dashboard updated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to update custom dashboard:', error);
      throw new Error('Failed to update custom dashboard. Please try again.');
    }
  }

  /**
   * Delete custom dashboard
   */
  async deleteCustomDashboard(dashboardId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting custom dashboard:', dashboardId);

      await apiService.delete(`${this.baseUrl}/dashboards/${dashboardId}`);

      console.log('✅ Custom dashboard deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete custom dashboard:', error);
      throw new Error('Failed to delete custom dashboard. Please try again.');
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    reportsInProgress: number;
    aiProcessingQueue: number;
    systemLoad: number;
    errorRate: number;
    responseTime: number;
  }> {
    try {
      const response = await apiService.get<{
        activeUsers: number;
        reportsInProgress: number;
        aiProcessingQueue: number;
        systemLoad: number;
        errorRate: number;
        responseTime: number;
      }>(`${this.baseUrl}/realtime`);

      return response;
    } catch (error) {
      console.error('❌ Failed to fetch real-time metrics:', error);
      throw new Error('Failed to load real-time metrics. Please try again.');
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(timeRange: AnalyticsTimeRange, metrics: string[]): Promise<Array<{
    metric: string;
    predictions: Array<{
      date: string;
      predicted: number;
      confidence: number;
      upperBound: number;
      lowerBound: number;
    }>;
    accuracy: number;
    factors: Array<{
      factor: string;
      importance: number;
    }>;
  }>> {
    try {
      console.log('🔮 Fetching predictive analytics...');

      const response = await apiService.post<{
        predictions: Array<{
          metric: string;
          predictions: Array<{
            date: string;
            predicted: number;
            confidence: number;
            upperBound: number;
            lowerBound: number;
          }>;
          accuracy: number;
          factors: Array<{
            factor: string;
            importance: number;
          }>;
        }>;
      }>(`${this.baseUrl}/predictive`, {
        timeRange,
        metrics
      });

      console.log('✅ Predictive analytics retrieved successfully');
      return response.predictions;
    } catch (error) {
      console.error('❌ Failed to fetch predictive analytics:', error);
      throw new Error('Failed to load predictive analytics. Please try again.');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(config: {
    type: 'reports' | 'users' | 'system' | 'quality' | 'business';
    timeRange: AnalyticsTimeRange;
    format: 'csv' | 'excel' | 'json' | 'pdf';
    filters?: Record<string, any>;
  }): Promise<{
    downloadUrl: string;
    fileName: string;
    fileSize: number;
  }> {
    try {
      console.log('📤 Exporting analytics data...');

      const response = await apiService.post<{
        downloadUrl: string;
        fileName: string;
        fileSize: number;
      }>(`${this.baseUrl}/export`, config);

      // Log export
      await auditService.logEvent({
        event_type: 'report_exported',
        event_description: `Analytics data exported: ${config.type}`,
        resource_type: 'Report',
        resource_id: 'analytics-export',
        metadata: {
          action_details: {
            export_type: config.type,
            format: config.format,
            time_range: config.timeRange,
            file_size: response.fileSize
          }
        }
      });

      console.log('✅ Analytics data exported successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to export analytics data:', error);
      throw new Error('Failed to export analytics data. Please try again.');
    }
  }

  /**
   * Get analytics alerts
   */
  async getAnalyticsAlerts(): Promise<Array<{
    id: string;
    type: 'performance' | 'quality' | 'volume' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    metric: string;
    currentValue: number;
    threshold: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    timestamp: string;
    acknowledged: boolean;
  }>> {
    try {
      const response = await apiService.get<{
        alerts: Array<{
          id: string;
          type: 'performance' | 'quality' | 'volume' | 'error';
          severity: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          description: string;
          metric: string;
          currentValue: number;
          threshold: number;
          trend: 'increasing' | 'decreasing' | 'stable';
          timestamp: string;
          acknowledged: boolean;
        }>;
      }>(`${this.baseUrl}/alerts`);

      return response.alerts;
    } catch (error) {
      console.error('❌ Failed to fetch analytics alerts:', error);
      throw new Error('Failed to load analytics alerts. Please try again.');
    }
  }

  /**
   * Acknowledge analytics alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/alerts/${alertId}/acknowledge`);
      console.log('✅ Alert acknowledged successfully');
    } catch (error) {
      console.error('❌ Failed to acknowledge alert:', error);
      throw new Error('Failed to acknowledge alert. Please try again.');
    }
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.metricsCache.clear();
    console.log('🧹 Analytics cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
  } {
    const now = Date.now();
    let oldestEntry = now;
    let validEntries = 0;

    for (const [, cached] of this.metricsCache) {
      if (now - cached.timestamp < this.cacheTimeout) {
        validEntries++;
        oldestEntry = Math.min(oldestEntry, cached.timestamp);
      }
    }

    return {
      size: this.metricsCache.size,
      hitRate: validEntries / Math.max(this.metricsCache.size, 1),
      oldestEntry: now - oldestEntry
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;