/**
 * Advanced AI Integration Service
 * Provides enhanced AI capabilities, automation, and intelligent workflows
 * for the medical radiology system
 */

import { apiService } from './api';
import { auditService } from './auditService';
import { aiReportService } from './aiReportService';
import { advancedAIAnalysisService } from './advancedAIAnalysis';

export interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: AITrigger[];
  actions: AIAction[];
  conditions: AICondition[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
  successRate: number;
}

export interface AITrigger {
  type: 'study_received' | 'report_created' | 'time_based' | 'manual' | 'api_call';
  conditions: Record<string, any>;
  schedule?: {
    type: 'interval' | 'cron';
    value: string;
  };
}

export interface AIAction {
  type: 'analyze_study' | 'generate_report' | 'send_notification' | 'update_priority' | 'assign_user' | 'create_task';
  parameters: Record<string, any>;
  timeout: number;
  retryCount: number;
}

export interface AICondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface AIModel {
  id: string;
  name: string;
  type: 'classification' | 'detection' | 'segmentation' | 'nlp' | 'prediction';
  specialty: string;
  examTypes: string[];
  version: string;
  accuracy: number;
  performance: {
    averageProcessingTime: number;
    throughput: number;
    memoryUsage: number;
    gpuUsage: number;
  };
  status: 'active' | 'training' | 'deprecated' | 'maintenance';
  lastUpdated: string;
  trainingData: {
    sampleCount: number;
    lastTrainingDate: string;
    validationAccuracy: number;
  };
}

export interface AIInsight {
  id: string;
  type: 'anomaly' | 'pattern' | 'prediction' | 'recommendation' | 'alert';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  data: any;
  actionable: boolean;
  suggestedActions: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface AIAutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: string;
    conditions: Record<string, any>;
  };
  actions: Array<{
    type: string;
    parameters: Record<string, any>;
    delay?: number;
  }>;
  isActive: boolean;
  executionHistory: Array<{
    timestamp: string;
    success: boolean;
    duration: number;
    error?: string;
  }>;
}

export interface AIPerformanceMetrics {
  modelId: string;
  timeRange: {
    start: string;
    end: string;
  };
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    processingTime: {
      average: number;
      p95: number;
      p99: number;
    };
    throughput: number;
    errorRate: number;
  };
  trends: {
    accuracyTrend: number;
    performanceTrend: number;
    usageTrend: number;
  };
}

export interface AITrainingRequest {
  modelId: string;
  trainingData: {
    datasetId: string;
    sampleCount: number;
    validationSplit: number;
  };
  hyperparameters: Record<string, any>;
  trainingConfig: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    optimizer: string;
  };
  priority: 'low' | 'normal' | 'high';
  notifyOnCompletion: boolean;
}

class AdvancedAIIntegrationService {
  private baseUrl = '/api/ai-integration';
  private activeWorkflows: Map<string, AIWorkflow> = new Map();
  private modelCache: Map<string, AIModel> = new Map();

  /**
   * Get available AI models
   */
  async getAIModels(filters?: {
    type?: string[];
    specialty?: string[];
    status?: string[];
  }): Promise<AIModel[]> {
    try {
      console.log('🤖 Fetching AI models...');

      const response = await apiService.post<{ models: AIModel[] }>(`${this.baseUrl}/models`, {
        filters: filters || {}
      });

      // Update cache
      response.models.forEach(model => {
        this.modelCache.set(model.id, model);
      });

      console.log(`✅ Retrieved ${response.models.length} AI models`);
      return response.models;
    } catch (error) {
      console.error('❌ Failed to fetch AI models:', error);
      throw new Error('Failed to load AI models. Please try again.');
    }
  }

  /**
   * Create AI workflow
   */
  async createAIWorkflow(workflow: Omit<AIWorkflow, 'id' | 'createdAt' | 'lastExecuted' | 'executionCount' | 'successRate'>): Promise<AIWorkflow> {
    try {
      console.log('⚙️ Creating AI workflow:', workflow.name);

      const response = await apiService.post<AIWorkflow>(`${this.baseUrl}/workflows`, workflow);

      this.activeWorkflows.set(response.id, response);

      // Log workflow creation
      await auditService.logEvent({
        event_type: 'report_created',
        event_description: `AI workflow created: ${workflow.name}`,
        resource_type: 'Report',
        resource_id: response.id,
        metadata: {
          action_details: {
            workflow_name: workflow.name,
            trigger_count: workflow.triggers.length,
            action_count: workflow.actions.length,
            is_active: workflow.isActive
          }
        }
      });

      console.log('✅ AI workflow created successfully:', response.id);
      return response;
    } catch (error) {
      console.error('❌ Failed to create AI workflow:', error);
      throw new Error('Failed to create AI workflow. Please try again.');
    }
  }

  /**
   * Execute AI workflow
   */
  async executeAIWorkflow(workflowId: string, context?: Record<string, any>): Promise<{
    executionId: string;
    status: 'running' | 'completed' | 'failed';
    results: any[];
    duration: number;
  }> {
    try {
      console.log('▶️ Executing AI workflow:', workflowId);

      const response = await apiService.post<{
        executionId: string;
        status: 'running' | 'completed' | 'failed';
        results: any[];
        duration: number;
      }>(`${this.baseUrl}/workflows/${workflowId}/execute`, {
        context: context || {}
      });

      console.log('✅ AI workflow execution started:', response.executionId);
      return response;
    } catch (error) {
      console.error('❌ Failed to execute AI workflow:', error);
      throw new Error('Failed to execute AI workflow. Please try again.');
    }
  }

  /**
   * Get AI insights
   */
  async getAIInsights(filters?: {
    type?: string[];
    severity?: string[];
    category?: string[];
    timeRange?: {
      start: string;
      end: string;
    };
    limit?: number;
  }): Promise<AIInsight[]> {
    try {
      console.log('💡 Fetching AI insights...');

      const response = await apiService.post<{ insights: AIInsight[] }>(`${this.baseUrl}/insights`, {
        filters: filters || {}
      });

      console.log(`✅ Retrieved ${response.insights.length} AI insights`);
      return response.insights;
    } catch (error) {
      console.error('❌ Failed to fetch AI insights:', error);
      throw new Error('Failed to load AI insights. Please try again.');
    }
  }

  /**
   * Generate AI insights for study
   */
  async generateStudyInsights(studyUid: string, options?: {
    includeAnomalyDetection: boolean;
    includePatternAnalysis: boolean;
    includePredictiveAnalysis: boolean;
    includeComparison: boolean;
    previousStudyUids?: string[];
  }): Promise<AIInsight[]> {
    try {
      console.log('🔍 Generating AI insights for study:', studyUid);

      const response = await apiService.post<{ insights: AIInsight[] }>(`${this.baseUrl}/studies/${studyUid}/insights`, {
        options: {
          includeAnomalyDetection: true,
          includePatternAnalysis: true,
          includePredictiveAnalysis: false,
          includeComparison: false,
          ...options
        }
      });

      // Log insight generation
      await auditService.logEvent({
        event_type: 'report_viewed',
        event_description: 'AI insights generated for study',
        resource_type: 'Study',
        resource_id: studyUid,
        metadata: {
          action_details: {
            insights_generated: response.insights.length,
            options: options
          }
        }
      });

      console.log(`✅ Generated ${response.insights.length} AI insights`);
      return response.insights;
    } catch (error) {
      console.error('❌ Failed to generate AI insights:', error);
      throw new Error('Failed to generate AI insights. Please try again.');
    }
  }

  /**
   * Create automation rule
   */
  async createAutomationRule(rule: Omit<AIAutomationRule, 'id' | 'executionHistory'>): Promise<AIAutomationRule> {
    try {
      console.log('🔧 Creating automation rule:', rule.name);

      const response = await apiService.post<AIAutomationRule>(`${this.baseUrl}/automation/rules`, rule);

      console.log('✅ Automation rule created successfully:', response.id);
      return response;
    } catch (error) {
      console.error('❌ Failed to create automation rule:', error);
      throw new Error('Failed to create automation rule. Please try again.');
    }
  }

  /**
   * Get AI model performance metrics
   */
  async getModelPerformanceMetrics(modelId: string, timeRange: {
    start: string;
    end: string;
  }): Promise<AIPerformanceMetrics> {
    try {
      console.log('📊 Fetching model performance metrics:', modelId);

      const response = await apiService.post<AIPerformanceMetrics>(`${this.baseUrl}/models/${modelId}/metrics`, {
        timeRange
      });

      console.log('✅ Model performance metrics retrieved');
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch model performance metrics:', error);
      throw new Error('Failed to load model performance metrics. Please try again.');
    }
  }

  /**
   * Train AI model
   */
  async trainAIModel(trainingRequest: AITrainingRequest): Promise<{
    trainingJobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    estimatedDuration: number;
  }> {
    try {
      console.log('🎓 Starting AI model training:', trainingRequest.modelId);

      const response = await apiService.post<{
        trainingJobId: string;
        status: 'queued' | 'running' | 'completed' | 'failed';
        estimatedDuration: number;
      }>(`${this.baseUrl}/models/train`, trainingRequest);

      // Log training start
      await auditService.logEvent({
        event_type: 'report_created',
        event_description: 'AI model training started',
        resource_type: 'Report',
        resource_id: response.trainingJobId,
        metadata: {
          action_details: {
            model_id: trainingRequest.modelId,
            dataset_id: trainingRequest.trainingData.datasetId,
            sample_count: trainingRequest.trainingData.sampleCount,
            priority: trainingRequest.priority
          }
        }
      });

      console.log('✅ AI model training started:', response.trainingJobId);
      return response;
    } catch (error) {
      console.error('❌ Failed to start AI model training:', error);
      throw new Error('Failed to start AI model training. Please try again.');
    }
  }

  /**
   * Get training job status
   */
  async getTrainingJobStatus(jobId: string): Promise<{
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
    currentEpoch?: number;
    totalEpochs?: number;
    currentLoss?: number;
    validationAccuracy?: number;
    estimatedTimeRemaining?: number;
    logs?: string[];
  }> {
    try {
      const response = await apiService.get<{
        jobId: string;
        status: 'queued' | 'running' | 'completed' | 'failed';
        progress: number;
        currentEpoch?: number;
        totalEpochs?: number;
        currentLoss?: number;
        validationAccuracy?: number;
        estimatedTimeRemaining?: number;
        logs?: string[];
      }>(`${this.baseUrl}/training/${jobId}/status`);

      return response;
    } catch (error) {
      console.error('❌ Failed to get training job status:', error);
      throw new Error('Failed to get training job status. Please try again.');
    }
  }

  /**
   * Perform intelligent study routing
   */
  async performIntelligentRouting(studyUid: string, options?: {
    considerUrgency: boolean;
    considerSpecialty: boolean;
    considerWorkload: boolean;
    considerExpertise: boolean;
  }): Promise<{
    recommendedAssignee: {
      userId: string;
      userName: string;
      confidence: number;
      reasoning: string[];
    };
    alternativeAssignees: Array<{
      userId: string;
      userName: string;
      confidence: number;
      reasoning: string[];
    }>;
  }> {
    try {
      console.log('🎯 Performing intelligent study routing:', studyUid);

      const response = await apiService.post<{
        recommendedAssignee: {
          userId: string;
          userName: string;
          confidence: number;
          reasoning: string[];
        };
        alternativeAssignees: Array<{
          userId: string;
          userName: string;
          confidence: number;
          reasoning: string[];
        }>;
      }>(`${this.baseUrl}/routing/intelligent`, {
        studyUid,
        options: {
          considerUrgency: true,
          considerSpecialty: true,
          considerWorkload: true,
          considerExpertise: true,
          ...options
        }
      });

      console.log('✅ Intelligent routing completed');
      return response;
    } catch (error) {
      console.error('❌ Failed to perform intelligent routing:', error);
      throw new Error('Failed to perform intelligent routing. Please try again.');
    }
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictiveAnalytics(type: 'workload' | 'quality' | 'performance' | 'resource_usage', timeframe: number): Promise<{
    predictions: Array<{
      date: string;
      predicted: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
      }>;
    }>;
    accuracy: number;
    recommendations: string[];
  }> {
    try {
      console.log('🔮 Generating predictive analytics:', type);

      const response = await apiService.post<{
        predictions: Array<{
          date: string;
          predicted: number;
          confidence: number;
          factors: Array<{
            factor: string;
            impact: number;
          }>;
        }>;
        accuracy: number;
        recommendations: string[];
      }>(`${this.baseUrl}/predictive/${type}`, {
        timeframe
      });

      console.log('✅ Predictive analytics generated');
      return response;
    } catch (error) {
      console.error('❌ Failed to generate predictive analytics:', error);
      throw new Error('Failed to generate predictive analytics. Please try again.');
    }
  }

  /**
   * Optimize AI model deployment
   */
  async optimizeModelDeployment(modelId: string, targetMetrics: {
    maxLatency?: number;
    minThroughput?: number;
    maxMemoryUsage?: number;
    targetAccuracy?: number;
  }): Promise<{
    optimizationId: string;
    recommendations: Array<{
      type: 'hardware' | 'configuration' | 'model_architecture';
      description: string;
      expectedImprovement: number;
      implementationEffort: 'low' | 'medium' | 'high';
    }>;
    estimatedImprovements: {
      latencyReduction: number;
      throughputIncrease: number;
      memoryReduction: number;
      accuracyChange: number;
    };
  }> {
    try {
      console.log('⚡ Optimizing model deployment:', modelId);

      const response = await apiService.post<{
        optimizationId: string;
        recommendations: Array<{
          type: 'hardware' | 'configuration' | 'model_architecture';
          description: string;
          expectedImprovement: number;
          implementationEffort: 'low' | 'medium' | 'high';
        }>;
        estimatedImprovements: {
          latencyReduction: number;
          throughputIncrease: number;
          memoryReduction: number;
          accuracyChange: number;
        };
      }>(`${this.baseUrl}/models/${modelId}/optimize`, {
        targetMetrics
      });

      console.log('✅ Model deployment optimization completed');
      return response;
    } catch (error) {
      console.error('❌ Failed to optimize model deployment:', error);
      throw new Error('Failed to optimize model deployment. Please try again.');
    }
  }

  /**
   * Get AI system health
   */
  async getAISystemHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    models: Array<{
      modelId: string;
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
    }>;
    resources: {
      cpuUsage: number;
      memoryUsage: number;
      gpuUsage: number;
      diskUsage: number;
    };
    performance: {
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
    };
    alerts: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: string;
    }>;
  }> {
    try {
      const response = await apiService.get<{
        overall: 'healthy' | 'warning' | 'critical';
        models: Array<{
          modelId: string;
          status: 'healthy' | 'warning' | 'critical';
          issues: string[];
        }>;
        resources: {
          cpuUsage: number;
          memoryUsage: number;
          gpuUsage: number;
          diskUsage: number;
        };
        performance: {
          averageResponseTime: number;
          throughput: number;
          errorRate: number;
        };
        alerts: Array<{
          severity: 'low' | 'medium' | 'high' | 'critical';
          message: string;
          timestamp: string;
        }>;
      }>(`${this.baseUrl}/health`);

      return response;
    } catch (error) {
      console.error('❌ Failed to get AI system health:', error);
      throw new Error('Failed to get AI system health. Please try again.');
    }
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): AIWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get cached models
   */
  getCachedModels(): AIModel[] {
    return Array.from(this.modelCache.values());
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.activeWorkflows.clear();
    this.modelCache.clear();
    console.log('🧹 AI integration caches cleared');
  }
}

export const advancedAIIntegrationService = new AdvancedAIIntegrationService();
export default advancedAIIntegrationService;