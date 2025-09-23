/**
 * Historical Data Storage Service
 * Provides persistent storage for metrics, trends analysis, and performance baselines
 */

import { auditService } from './auditService';

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface MetricSeries {
  metric_name: string;
  data_points: TimeSeriesDataPoint[];
  aggregation_type: 'avg' | 'sum' | 'min' | 'max' | 'count';
  retention_period_days: number;
  last_updated: string;
}

export interface PerformanceBaseline {
  metric_name: string;
  baseline_value: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  calculation_period: {
    start_date: string;
    end_date: string;
  };
  sample_size: number;
  standard_deviation: number;
  created_date: string;
  last_updated: string;
}

export interface TrendAnalysis {
  metric_name: string;
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trend_strength: number; // 0-1, where 1 is strongest trend
  slope: number;
  r_squared: number;
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  data_points_analyzed: number;
  forecast: {
    next_24h: number;
    next_7d: number;
    next_30d: number;
    confidence: number;
  };
  anomalies_detected: AnomalyDetection[];
  created_date: string;
}

export interface AnomalyDetection {
  timestamp: string;
  metric_name: string;
  actual_value: number;
  expected_value: number;
  deviation_score: number; // Standard deviations from expected
  anomaly_type: 'spike' | 'drop' | 'pattern_break' | 'seasonal_deviation';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface DataRetentionPolicy {
  metric_pattern: string; // Regex pattern for metric names
  retention_period_days: number;
  aggregation_rules: {
    raw_data_days: number;
    hourly_aggregation_days: number;
    daily_aggregation_days: number;
    weekly_aggregation_days: number;
  };
  compression_enabled: boolean;
}

export interface MetricQuery {
  metric_names: string[];
  start_time: string;
  end_time: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  group_by?: string[];
  filters?: Record<string, string>;
  limit?: number;
}

export interface QueryResult {
  metric_name: string;
  data_points: TimeSeriesDataPoint[];
  total_points: number;
  aggregation_applied: string;
  query_duration_ms: number;
}

class HistoricalDataService {
  private metricsStorage = new Map<string, MetricSeries>();
  private baselines = new Map<string, PerformanceBaseline>();
  private trendAnalyses = new Map<string, TrendAnalysis>();
  private anomalies: AnomalyDetection[] = [];
  private retentionPolicies: DataRetentionPolicy[] = [];
  
  private cleanupInterval?: NodeJS.Timeout;
  private baselineCalculationInterval?: NodeJS.Timeout;
  private trendAnalysisInterval?: NodeJS.Timeout;
  
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly BASELINE_CALCULATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly TREND_ANALYSIS_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

  constructor() {
    this.initializeDefaultRetentionPolicies();
    this.loadStoredData();
    this.startBackgroundTasks();
  }

  /**
   * Store a single metric data point
   */
  async storeMetricPoint(
    metricName: string, 
    value: number, 
    timestamp?: string, 
    labels?: Record<string, string>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const dataPoint: TimeSeriesDataPoint = {
      timestamp: timestamp || new Date().toISOString(),
      value,
      labels,
      metadata
    };

    if (!this.metricsStorage.has(metricName)) {
      this.metricsStorage.set(metricName, {
        metric_name: metricName,
        data_points: [],
        aggregation_type: 'avg',
        retention_period_days: this.getRetentionPeriod(metricName),
        last_updated: new Date().toISOString()
      });
    }

    const series = this.metricsStorage.get(metricName)!;
    series.data_points.push(dataPoint);
    series.last_updated = new Date().toISOString();

    // Sort by timestamp to maintain order
    series.data_points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Apply retention policy
    await this.applyRetentionPolicy(metricName);

    // Persist to storage
    await this.persistMetricSeries(metricName, series);
  }

  /**
   * Store multiple metric data points
   */
  async storeMetricPoints(points: Array<{
    metric_name: string;
    value: number;
    timestamp?: string;
    labels?: Record<string, string>;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    const storePromises = points.map(point => 
      this.storeMetricPoint(
        point.metric_name, 
        point.value, 
        point.timestamp, 
        point.labels, 
        point.metadata
      )
    );

    await Promise.all(storePromises);
  }

  /**
   * Query historical metrics
   */
  async queryMetrics(query: MetricQuery): Promise<QueryResult[]> {
    const startTime = performance.now();
    const results: QueryResult[] = [];

    for (const metricName of query.metric_names) {
      const series = this.metricsStorage.get(metricName);
      if (!series) {
        continue;
      }

      // Filter by time range
      let dataPoints = series.data_points.filter(point => {
        const pointTime = new Date(point.timestamp);
        const startTime = new Date(query.start_time);
        const endTime = new Date(query.end_time);
        return pointTime >= startTime && pointTime <= endTime;
      });

      // Apply filters
      if (query.filters) {
        dataPoints = dataPoints.filter(point => {
          if (!point.labels) return false;
          return Object.entries(query.filters!).every(([key, value]) => 
            point.labels![key] === value
          );
        });
      }

      // Apply aggregation if requested
      if (query.aggregation && query.group_by) {
        dataPoints = this.aggregateDataPoints(dataPoints, query.aggregation, query.group_by);
      }

      // Apply limit
      if (query.limit) {
        dataPoints = dataPoints.slice(-query.limit);
      }

      results.push({
        metric_name: metricName,
        data_points: dataPoints,
        total_points: dataPoints.length,
        aggregation_applied: query.aggregation || 'none',
        query_duration_ms: performance.now() - startTime
      });
    }

    return results;
  }

  /**
   * Calculate performance baseline for a metric
   */
  async calculateBaseline(
    metricName: string, 
    periodDays: number = 30
  ): Promise<PerformanceBaseline> {
    const series = this.metricsStorage.get(metricName);
    if (!series || series.data_points.length === 0) {
      throw new Error(`No data available for metric: ${metricName}`);
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter data points within the period
    const periodData = series.data_points.filter(point => {
      const pointTime = new Date(point.timestamp);
      return pointTime >= startDate && pointTime <= endDate;
    });

    if (periodData.length < 10) {
      throw new Error(`Insufficient data points for baseline calculation: ${periodData.length}`);
    }

    // Calculate statistics
    const values = periodData.map(point => point.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate confidence interval (95%)
    const confidenceLevel = 1.96; // 95% confidence
    const marginOfError = confidenceLevel * (standardDeviation / Math.sqrt(values.length));

    const baseline: PerformanceBaseline = {
      metric_name: metricName,
      baseline_value: mean,
      confidence_interval: {
        lower: mean - marginOfError,
        upper: mean + marginOfError
      },
      calculation_period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      sample_size: values.length,
      standard_deviation: standardDeviation,
      created_date: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    this.baselines.set(metricName, baseline);
    await this.persistBaseline(metricName, baseline);

    console.log(`📊 Calculated baseline for ${metricName}: ${mean.toFixed(2)} ±${marginOfError.toFixed(2)}`);
    return baseline;
  }

  /**
   * Perform trend analysis on a metric
   */
  async analyzeTrend(
    metricName: string, 
    periodDays: number = 7
  ): Promise<TrendAnalysis> {
    const series = this.metricsStorage.get(metricName);
    if (!series || series.data_points.length === 0) {
      throw new Error(`No data available for metric: ${metricName}`);
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter and prepare data
    const periodData = series.data_points.filter(point => {
      const pointTime = new Date(point.timestamp);
      return pointTime >= startDate && pointTime <= endDate;
    });

    if (periodData.length < 5) {
      throw new Error(`Insufficient data points for trend analysis: ${periodData.length}`);
    }

    // Perform linear regression
    const regression = this.calculateLinearRegression(periodData);
    
    // Determine trend direction and strength
    const trendDirection = this.determineTrendDirection(regression.slope);
    const trendStrength = Math.min(Math.abs(regression.rSquared), 1);

    // Generate forecast
    const forecast = this.generateForecast(periodData, regression);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(metricName, periodData);

    const analysis: TrendAnalysis = {
      metric_name: metricName,
      trend_direction: trendDirection,
      trend_strength: trendStrength,
      slope: regression.slope,
      r_squared: regression.rSquared,
      analysis_period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      data_points_analyzed: periodData.length,
      forecast,
      anomalies_detected: anomalies,
      created_date: new Date().toISOString()
    };

    this.trendAnalyses.set(metricName, analysis);
    await this.persistTrendAnalysis(metricName, analysis);

    console.log(`📈 Trend analysis for ${metricName}: ${trendDirection} (strength: ${(trendStrength * 100).toFixed(1)}%)`);
    return analysis;
  }

  /**
   * Detect anomalies in metric data
   */
  async detectAnomalies(
    metricName: string, 
    dataPoints: TimeSeriesDataPoint[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const baseline = this.baselines.get(metricName);

    if (!baseline || dataPoints.length < 10) {
      return anomalies;
    }

    // Calculate rolling statistics
    const windowSize = Math.min(10, Math.floor(dataPoints.length / 3));
    
    for (let i = windowSize; i < dataPoints.length; i++) {
      const window = dataPoints.slice(i - windowSize, i);
      const windowMean = window.reduce((sum, p) => sum + p.value, 0) / window.length;
      const windowStd = Math.sqrt(
        window.reduce((sum, p) => sum + Math.pow(p.value - windowMean, 2), 0) / window.length
      );

      const currentPoint = dataPoints[i];
      const deviationScore = Math.abs(currentPoint.value - baseline.baseline_value) / baseline.standard_deviation;

      // Detect different types of anomalies
      if (deviationScore > 3) { // 3 sigma rule
        const anomalyType = currentPoint.value > baseline.baseline_value ? 'spike' : 'drop';
        const severity = deviationScore > 5 ? 'high' : deviationScore > 4 ? 'medium' : 'low';

        anomalies.push({
          timestamp: currentPoint.timestamp,
          metric_name: metricName,
          actual_value: currentPoint.value,
          expected_value: baseline.baseline_value,
          deviation_score: deviationScore,
          anomaly_type: anomalyType,
          severity: severity,
          description: `${anomalyType} detected: ${currentPoint.value.toFixed(2)} vs expected ${baseline.baseline_value.toFixed(2)}`
        });
      }
    }

    // Store anomalies
    this.anomalies.push(...anomalies);
    await this.persistAnomalies(anomalies);

    return anomalies;
  }

  /**
   * Get performance baseline for a metric
   */
  getBaseline(metricName: string): PerformanceBaseline | null {
    return this.baselines.get(metricName) || null;
  }

  /**
   * Get trend analysis for a metric
   */
  getTrendAnalysis(metricName: string): TrendAnalysis | null {
    return this.trendAnalyses.get(metricName) || null;
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(hours: number = 24): AnomalyDetection[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.anomalies.filter(anomaly => 
      new Date(anomaly.timestamp) >= cutoffTime
    );
  }

  /**
   * Get storage statistics
   */
  getStorageStatistics(): {
    total_metrics: number;
    total_data_points: number;
    storage_size_mb: number;
    oldest_data_point: string;
    newest_data_point: string;
    baselines_calculated: number;
    trend_analyses: number;
    anomalies_detected: number;
  } {
    let totalDataPoints = 0;
    let oldestTimestamp = new Date();
    let newestTimestamp = new Date(0);

    for (const series of this.metricsStorage.values()) {
      totalDataPoints += series.data_points.length;
      
      if (series.data_points.length > 0) {
        const firstPoint = new Date(series.data_points[0].timestamp);
        const lastPoint = new Date(series.data_points[series.data_points.length - 1].timestamp);
        
        if (firstPoint < oldestTimestamp) oldestTimestamp = firstPoint;
        if (lastPoint > newestTimestamp) newestTimestamp = lastPoint;
      }
    }

    // Estimate storage size (rough calculation)
    const estimatedSizeMB = (totalDataPoints * 100) / (1024 * 1024); // ~100 bytes per data point

    return {
      total_metrics: this.metricsStorage.size,
      total_data_points: totalDataPoints,
      storage_size_mb: estimatedSizeMB,
      oldest_data_point: oldestTimestamp.toISOString(),
      newest_data_point: newestTimestamp.toISOString(),
      baselines_calculated: this.baselines.size,
      trend_analyses: this.trendAnalyses.size,
      anomalies_detected: this.anomalies.length
    };
  }

  /**
   * Export historical data
   */
  async exportData(
    metricNames?: string[], 
    startDate?: string, 
    endDate?: string
  ): Promise<{
    metrics: MetricSeries[];
    baselines: PerformanceBaseline[];
    trends: TrendAnalysis[];
    anomalies: AnomalyDetection[];
    export_timestamp: string;
  }> {
    const metricsToExport = metricNames 
      ? Array.from(this.metricsStorage.entries()).filter(([name]) => metricNames.includes(name))
      : Array.from(this.metricsStorage.entries());

    const exportData = {
      metrics: metricsToExport.map(([_, series]) => {
        if (startDate && endDate) {
          const filteredSeries = {
            ...series,
            data_points: series.data_points.filter(point => {
              const pointTime = new Date(point.timestamp);
              return pointTime >= new Date(startDate) && pointTime <= new Date(endDate);
            })
          };
          return filteredSeries;
        }
        return series;
      }),
      baselines: Array.from(this.baselines.values()),
      trends: Array.from(this.trendAnalyses.values()),
      anomalies: this.anomalies,
      export_timestamp: new Date().toISOString()
    };

    // Log export event
    await auditService.logEvent({
      event_type: 'data_accessed',
      event_description: 'Historical data exported',
      resource_type: 'System',
      resource_id: 'historical_data',
      metadata: {
        action_details: {
          metrics_exported: exportData.metrics.length,
          date_range: startDate && endDate ? `${startDate} to ${endDate}` : 'all',
          export_size_mb: JSON.stringify(exportData).length / (1024 * 1024)
        }
      }
    });

    return exportData;
  }

  // Private helper methods
  private initializeDefaultRetentionPolicies(): void {
    this.retentionPolicies = [
      {
        metric_pattern: 'system\\..*',
        retention_period_days: 90,
        aggregation_rules: {
          raw_data_days: 7,
          hourly_aggregation_days: 30,
          daily_aggregation_days: 90,
          weekly_aggregation_days: 365
        },
        compression_enabled: true
      },
      {
        metric_pattern: 'application\\..*',
        retention_period_days: 60,
        aggregation_rules: {
          raw_data_days: 3,
          hourly_aggregation_days: 14,
          daily_aggregation_days: 60,
          weekly_aggregation_days: 180
        },
        compression_enabled: true
      },
      {
        metric_pattern: 'device\\..*',
        retention_period_days: 180,
        aggregation_rules: {
          raw_data_days: 14,
          hourly_aggregation_days: 60,
          daily_aggregation_days: 180,
          weekly_aggregation_days: 730
        },
        compression_enabled: true
      }
    ];
  }

  private getRetentionPeriod(metricName: string): number {
    for (const policy of this.retentionPolicies) {
      if (new RegExp(policy.metric_pattern).test(metricName)) {
        return policy.retention_period_days;
      }
    }
    return 30; // Default retention period
  }

  private async applyRetentionPolicy(metricName: string): Promise<void> {
    const series = this.metricsStorage.get(metricName);
    if (!series) return;

    const retentionPeriod = this.getRetentionPeriod(metricName);
    const cutoffDate = new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000);

    const originalLength = series.data_points.length;
    series.data_points = series.data_points.filter(point => 
      new Date(point.timestamp) >= cutoffDate
    );

    if (series.data_points.length < originalLength) {
      console.log(`🗑️ Cleaned up ${originalLength - series.data_points.length} old data points for ${metricName}`);
    }
  }

  private calculateLinearRegression(dataPoints: TimeSeriesDataPoint[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(p => p.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared };
  }

  private determineTrendDirection(slope: number): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    const absSlope = Math.abs(slope);
    
    if (absSlope < 0.01) return 'stable';
    if (absSlope > 1) return 'volatile';
    
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  private generateForecast(
    dataPoints: TimeSeriesDataPoint[], 
    regression: { slope: number; intercept: number }
  ): TrendAnalysis['forecast'] {
    const lastIndex = dataPoints.length - 1;
    const confidence = Math.min(Math.abs(regression.rSquared), 0.95);

    return {
      next_24h: regression.slope * (lastIndex + 24) + regression.intercept,
      next_7d: regression.slope * (lastIndex + 168) + regression.intercept, // 7 * 24 hours
      next_30d: regression.slope * (lastIndex + 720) + regression.intercept, // 30 * 24 hours
      confidence
    };
  }

  private aggregateDataPoints(
    dataPoints: TimeSeriesDataPoint[], 
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count',
    groupBy: string[]
  ): TimeSeriesDataPoint[] {
    // Simple time-based aggregation for now
    const groups = new Map<string, TimeSeriesDataPoint[]>();
    
    for (const point of dataPoints) {
      const hour = new Date(point.timestamp).toISOString().slice(0, 13);
      if (!groups.has(hour)) {
        groups.set(hour, []);
      }
      groups.get(hour)!.push(point);
    }

    const aggregatedPoints: TimeSeriesDataPoint[] = [];
    
    for (const [hour, points] of groups) {
      let value: number;
      
      switch (aggregation) {
        case 'avg':
          value = points.reduce((sum, p) => sum + p.value, 0) / points.length;
          break;
        case 'sum':
          value = points.reduce((sum, p) => sum + p.value, 0);
          break;
        case 'min':
          value = Math.min(...points.map(p => p.value));
          break;
        case 'max':
          value = Math.max(...points.map(p => p.value));
          break;
        case 'count':
          value = points.length;
          break;
      }

      aggregatedPoints.push({
        timestamp: hour + ':00:00.000Z',
        value,
        labels: { aggregation },
        metadata: { original_points: points.length }
      });
    }

    return aggregatedPoints;
  }

  private startBackgroundTasks(): void {
    // Cleanup old data
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);

    // Calculate baselines
    this.baselineCalculationInterval = setInterval(() => {
      this.calculateAllBaselines();
    }, this.BASELINE_CALCULATION_INTERVAL);

    // Perform trend analysis
    this.trendAnalysisInterval = setInterval(() => {
      this.performAllTrendAnalyses();
    }, this.TREND_ANALYSIS_INTERVAL);
  }

  private async performCleanup(): Promise<void> {
    console.log('🧹 Performing historical data cleanup...');
    
    for (const metricName of this.metricsStorage.keys()) {
      await this.applyRetentionPolicy(metricName);
    }

    // Clean up old anomalies
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    this.anomalies = this.anomalies.filter(anomaly => 
      new Date(anomaly.timestamp) >= cutoffTime
    );
  }

  private async calculateAllBaselines(): Promise<void> {
    console.log('📊 Calculating performance baselines...');
    
    for (const metricName of this.metricsStorage.keys()) {
      try {
        await this.calculateBaseline(metricName);
      } catch (error) {
        console.warn(`Failed to calculate baseline for ${metricName}:`, error);
      }
    }
  }

  private async performAllTrendAnalyses(): Promise<void> {
    console.log('📈 Performing trend analyses...');
    
    for (const metricName of this.metricsStorage.keys()) {
      try {
        await this.analyzeTrend(metricName);
      } catch (error) {
        console.warn(`Failed to analyze trend for ${metricName}:`, error);
      }
    }
  }

  // Persistence methods (using localStorage for demo)
  private async loadStoredData(): Promise<void> {
    try {
      const storedMetrics = localStorage.getItem('historical_metrics');
      if (storedMetrics) {
        const data = JSON.parse(storedMetrics);
        this.metricsStorage = new Map(data.metrics || []);
        this.baselines = new Map(data.baselines || []);
        this.trendAnalyses = new Map(data.trends || []);
        this.anomalies = data.anomalies || [];
      }
    } catch (error) {
      console.warn('Failed to load stored historical data:', error);
    }
  }

  private async persistMetricSeries(metricName: string, series: MetricSeries): Promise<void> {
    // In a real implementation, this would persist to a time-series database
    this.persistAllData();
  }

  private async persistBaseline(metricName: string, baseline: PerformanceBaseline): Promise<void> {
    this.persistAllData();
  }

  private async persistTrendAnalysis(metricName: string, analysis: TrendAnalysis): Promise<void> {
    this.persistAllData();
  }

  private async persistAnomalies(anomalies: AnomalyDetection[]): Promise<void> {
    this.persistAllData();
  }

  private persistAllData(): void {
    try {
      const data = {
        metrics: Array.from(this.metricsStorage.entries()),
        baselines: Array.from(this.baselines.entries()),
        trends: Array.from(this.trendAnalyses.entries()),
        anomalies: this.anomalies,
        last_updated: new Date().toISOString()
      };
      
      localStorage.setItem('historical_metrics', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist historical data:', error);
    }
  }
}

export const historicalDataService = new HistoricalDataService();