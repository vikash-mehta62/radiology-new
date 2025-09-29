/**
 * Data Flow Integrity Service
 * Comprehensive validation of data flow from backend to frontend
 * Handles URL validation, strategy selection, and CORS configuration checks
 */

export interface DataFlowCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: any;
  timestamp: number;
  duration?: number;
}

export interface URLValidationResult {
  url: string;
  isValid: boolean;
  isAccessible: boolean;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  contentType?: string;
  contentLength?: number;
  error?: string;
  timing: {
    dns?: number;
    connect?: number;
    request?: number;
    response?: number;
    total: number;
  };
}

export interface StrategyValidationResult {
  strategy: string;
  priority: number;
  available: boolean;
  tested: boolean;
  success: boolean;
  error?: string;
  responseTime?: number;
  fallbackReason?: string;
}

export interface CORSValidationResult {
  origin: string;
  allowed: boolean;
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge?: number;
  error?: string;
}

export interface DataFlowIntegrityReport {
  timestamp: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checks: DataFlowCheck[];
  urlValidations: URLValidationResult[];
  strategyValidations: StrategyValidationResult[];
  corsValidation: CORSValidationResult;
  recommendations: string[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
}

class DataFlowIntegrityService {
  private baseUrls = {
    backend: 'http://localhost:8000',
    frontend: 'http://localhost:3000'
  };

  private loadingStrategies = [
    { name: 'wado_rs', priority: 1, endpoint: '/rs' },
    { name: 'backend_api', priority: 2, endpoint: '/dicom' },
    { name: 'cornerstone_wadouri', priority: 3, endpoint: '/wadouri' },
    { name: 'direct_http', priority: 4, endpoint: '/files' }
  ];

  private checksHistory: DataFlowIntegrityReport[] = [];
  private maxHistorySize = 50;

  /**
   * Run comprehensive data flow integrity checks
   */
  async runIntegrityChecks(options?: {
    includeURLValidation?: boolean;
    includeStrategyValidation?: boolean;
    includeCORSValidation?: boolean;
    testImageId?: string;
    studyUid?: string;
    seriesUid?: string;
    instanceUid?: string;
  }): Promise<DataFlowIntegrityReport> {
    console.log('🔍 [DataFlowIntegrity] Starting comprehensive integrity checks...');
    
    const startTime = Date.now();
    const checks: DataFlowCheck[] = [];
    const urlValidations: URLValidationResult[] = [];
    const strategyValidations: StrategyValidationResult[] = [];
    let corsValidation: CORSValidationResult;

    try {
      // 1. Basic connectivity checks
      checks.push(await this.checkBackendConnectivity());
      checks.push(await this.checkFrontendConnectivity());

      // 2. URL validation checks
      if (options?.includeURLValidation !== false) {
        const urlChecks = await this.validateCriticalURLs(options);
        checks.push(...urlChecks.checks);
        urlValidations.push(...urlChecks.validations);
      }

      // 3. Strategy validation checks
      if (options?.includeStrategyValidation !== false) {
        const strategyChecks = await this.validateLoadingStrategies(options);
        checks.push(...strategyChecks.checks);
        strategyValidations.push(...strategyChecks.validations);
      }

      // 4. CORS validation
      if (options?.includeCORSValidation !== false) {
        const corsCheck = await this.validateCORSConfiguration();
        checks.push(corsCheck.check);
        corsValidation = corsCheck.validation;
      } else {
        corsValidation = {
          origin: this.baseUrls.frontend,
          allowed: true,
          methods: [],
          headers: [],
          credentials: false
        };
      }

      // 5. Container/VM mapping checks
      checks.push(await this.checkContainerMapping());

      // 6. Port accessibility checks
      checks.push(await this.checkPortAccessibility());

      // 7. Service health checks
      checks.push(await this.checkServiceHealth());

    } catch (error) {
      checks.push({
        id: 'integrity_check_error',
        name: 'Integrity Check Error',
        status: 'fail',
        message: `Failed to complete integrity checks: ${error}`,
        timestamp: Date.now()
      });
    }

    // Calculate summary
    const summary = {
      totalChecks: checks.length,
      passedChecks: checks.filter(c => c.status === 'pass').length,
      failedChecks: checks.filter(c => c.status === 'fail').length,
      warningChecks: checks.filter(c => c.status === 'warning').length
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (summary.failedChecks > 0) {
      overallStatus = summary.failedChecks > summary.passedChecks ? 'critical' : 'degraded';
    } else if (summary.warningChecks > 0) {
      overallStatus = 'degraded';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(checks, urlValidations, strategyValidations, corsValidation);

    const report: DataFlowIntegrityReport = {
      timestamp: startTime,
      overallStatus,
      checks,
      urlValidations,
      strategyValidations,
      corsValidation,
      recommendations,
      summary
    };

    // Add to history
    this.checksHistory.push(report);
    if (this.checksHistory.length > this.maxHistorySize) {
      this.checksHistory.shift();
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [DataFlowIntegrity] Integrity checks completed in ${duration}ms:`, {
      status: overallStatus,
      summary
    });

    return report;
  }

  /**
   * Check backend connectivity
   */
  private async checkBackendConnectivity(): Promise<DataFlowCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrls.backend}/health`, {
        method: 'GET',
        timeout: 5000
      } as any);

      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          id: 'backend_connectivity',
          name: 'Backend Connectivity',
          status: 'pass',
          message: `Backend is accessible at ${this.baseUrls.backend}`,
          details: { status: response.status, duration },
          timestamp: Date.now(),
          duration
        };
      } else {
        return {
          id: 'backend_connectivity',
          name: 'Backend Connectivity',
          status: 'fail',
          message: `Backend returned status ${response.status}`,
          details: { status: response.status, duration },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        id: 'backend_connectivity',
        name: 'Backend Connectivity',
        status: 'fail',
        message: `Cannot connect to backend: ${error}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error', duration },
        timestamp: Date.now(),
        duration
      };
    }
  }

  /**
   * Check frontend connectivity
   */
  private async checkFrontendConnectivity(): Promise<DataFlowCheck> {
    const startTime = Date.now();
    
    try {
      // Check if we're running in the frontend context
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin;
        const duration = Date.now() - startTime;
        
        return {
          id: 'frontend_connectivity',
          name: 'Frontend Connectivity',
          status: 'pass',
          message: `Frontend is running at ${currentOrigin}`,
          details: { origin: currentOrigin, duration },
          timestamp: Date.now(),
          duration
        };
      } else {
        const duration = Date.now() - startTime;
        return {
          id: 'frontend_connectivity',
          name: 'Frontend Connectivity',
          status: 'warning',
          message: 'Running outside browser context',
          details: { duration },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        id: 'frontend_connectivity',
        name: 'Frontend Connectivity',
        status: 'fail',
        message: `Frontend connectivity check failed: ${error}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error', duration },
        timestamp: Date.now(),
        duration
      };
    }
  }

  /**
   * Validate critical URLs
   */
  private async validateCriticalURLs(options?: any): Promise<{
    checks: DataFlowCheck[];
    validations: URLValidationResult[];
  }> {
    const checks: DataFlowCheck[] = [];
    const validations: URLValidationResult[] = [];

    const criticalUrls = [
      `${this.baseUrls.backend}/health`,
      `${this.baseUrls.backend}/api/studies`,
      `${this.baseUrls.backend}/rs/studies`,
      `${this.baseUrls.backend}/dicom/studies`
    ];

    // Add specific test URLs if provided
    if (options?.studyUid) {
      criticalUrls.push(
        `${this.baseUrls.backend}/rs/studies/${options.studyUid}`,
        `${this.baseUrls.backend}/dicom/studies/${options.studyUid}`
      );
      
      if (options.seriesUid) {
        criticalUrls.push(
          `${this.baseUrls.backend}/rs/studies/${options.studyUid}/series/${options.seriesUid}`,
          `${this.baseUrls.backend}/dicom/studies/${options.studyUid}/series/${options.seriesUid}`
        );
        
        if (options.instanceUid) {
          criticalUrls.push(
            `${this.baseUrls.backend}/rs/studies/${options.studyUid}/series/${options.seriesUid}/instances/${options.instanceUid}/frames/1`,
            `${this.baseUrls.backend}/dicom/studies/${options.studyUid}/series/${options.seriesUid}/instances/${options.instanceUid}.png`
          );
        }
      }
    }

    for (const url of criticalUrls) {
      const validation = await this.validateURL(url);
      validations.push(validation);

      checks.push({
        id: `url_validation_${url.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: `URL Validation: ${url}`,
        status: validation.isAccessible ? 'pass' : 'fail',
        message: validation.isAccessible 
          ? `URL is accessible (${validation.responseStatus})` 
          : `URL is not accessible: ${validation.error}`,
        details: validation,
        timestamp: Date.now(),
        duration: validation.timing.total
      });
    }

    return { checks, validations };
  }

  /**
   * Validate a single URL
   */
  private async validateURL(url: string): Promise<URLValidationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 10000
      } as any);

      const timing = {
        total: Date.now() - startTime
      };

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        url,
        isValid: true,
        isAccessible: response.ok,
        responseStatus: response.status,
        responseHeaders: headers,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: parseInt(response.headers.get('content-length') || '0') || undefined,
        timing
      };
    } catch (error) {
      const timing = {
        total: Date.now() - startTime
      };

      return {
        url,
        isValid: false,
        isAccessible: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing
      };
    }
  }

  /**
   * Validate loading strategies
   */
  private async validateLoadingStrategies(options?: any): Promise<{
    checks: DataFlowCheck[];
    validations: StrategyValidationResult[];
  }> {
    const checks: DataFlowCheck[] = [];
    const validations: StrategyValidationResult[] = [];

    for (const strategy of this.loadingStrategies) {
      const validation = await this.validateStrategy(strategy, options);
      validations.push(validation);

      checks.push({
        id: `strategy_validation_${strategy.name}`,
        name: `Strategy Validation: ${strategy.name}`,
        status: validation.success ? 'pass' : validation.available ? 'warning' : 'fail',
        message: validation.success 
          ? `Strategy is working (${validation.responseTime}ms)` 
          : validation.available 
            ? `Strategy is available but not tested` 
            : `Strategy failed: ${validation.error}`,
        details: validation,
        timestamp: Date.now(),
        duration: validation.responseTime
      });
    }

    return { checks, validations };
  }

  /**
   * Validate a single loading strategy
   */
  private async validateStrategy(
    strategy: { name: string; priority: number; endpoint: string },
    options?: any
  ): Promise<StrategyValidationResult> {
    const startTime = Date.now();
    
    try {
      const testUrl = `${this.baseUrls.backend}${strategy.endpoint}`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        timeout: 5000
      } as any);

      const responseTime = Date.now() - startTime;

      return {
        strategy: strategy.name,
        priority: strategy.priority,
        available: true,
        tested: true,
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        strategy: strategy.name,
        priority: strategy.priority,
        available: false,
        tested: true,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate CORS configuration
   */
  private async validateCORSConfiguration(): Promise<{
    check: DataFlowCheck;
    validation: CORSValidationResult;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrls.backend}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': this.baseUrls.frontend,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const duration = Date.now() - startTime;

      const corsHeaders = {
        origin: response.headers.get('Access-Control-Allow-Origin') || '',
        methods: response.headers.get('Access-Control-Allow-Methods') || '',
        headers: response.headers.get('Access-Control-Allow-Headers') || '',
        credentials: response.headers.get('Access-Control-Allow-Credentials') === 'true',
        maxAge: response.headers.get('Access-Control-Max-Age')
      };

      const allowed = corsHeaders.origin === '*' || corsHeaders.origin === this.baseUrls.frontend;

      const validation: CORSValidationResult = {
        origin: this.baseUrls.frontend,
        allowed,
        methods: corsHeaders.methods.split(',').map(m => m.trim()).filter(Boolean),
        headers: corsHeaders.headers.split(',').map(h => h.trim()).filter(Boolean),
        credentials: corsHeaders.credentials,
        maxAge: corsHeaders.maxAge ? parseInt(corsHeaders.maxAge) : undefined
      };

      const check: DataFlowCheck = {
        id: 'cors_validation',
        name: 'CORS Configuration',
        status: allowed ? 'pass' : 'fail',
        message: allowed 
          ? 'CORS is properly configured' 
          : `CORS not allowing origin ${this.baseUrls.frontend}`,
        details: validation,
        timestamp: Date.now(),
        duration
      };

      return { check, validation };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const validation: CORSValidationResult = {
        origin: this.baseUrls.frontend,
        allowed: false,
        methods: [],
        headers: [],
        credentials: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      const check: DataFlowCheck = {
        id: 'cors_validation',
        name: 'CORS Configuration',
        status: 'fail',
        message: `CORS validation failed: ${error}`,
        details: validation,
        timestamp: Date.now(),
        duration
      };

      return { check, validation };
    }
  }

  /**
   * Check container/VM mapping
   */
  private async checkContainerMapping(): Promise<DataFlowCheck> {
    const startTime = Date.now();
    
    try {
      // Check if localhost resolves correctly
      const localhostTest = await fetch(`${this.baseUrls.backend}/health`, {
        timeout: 3000
      } as any);

      const duration = Date.now() - startTime;

      if (localhostTest.ok) {
        return {
          id: 'container_mapping',
          name: 'Container/VM Mapping',
          status: 'pass',
          message: 'localhost mapping is working correctly',
          details: { status: localhostTest.status, duration },
          timestamp: Date.now(),
          duration
        };
      } else {
        return {
          id: 'container_mapping',
          name: 'Container/VM Mapping',
          status: 'warning',
          message: `localhost mapping may have issues (status: ${localhostTest.status})`,
          details: { status: localhostTest.status, duration },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        id: 'container_mapping',
        name: 'Container/VM Mapping',
        status: 'fail',
        message: `Container/VM mapping check failed: ${error}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error', duration },
        timestamp: Date.now(),
        duration
      };
    }
  }

  /**
   * Check port accessibility
   */
  private async checkPortAccessibility(): Promise<DataFlowCheck> {
    const startTime = Date.now();
    
    try {
      const ports = [8000, 3000]; // Backend and frontend ports
      const results = await Promise.all(
        ports.map(async (port) => {
          try {
            const response = await fetch(`http://localhost:${port}/health`, {
              timeout: 3000
            } as any);
            return { port, accessible: response.ok, status: response.status };
          } catch {
            return { port, accessible: false, status: null };
          }
        })
      );

      const duration = Date.now() - startTime;
      const accessiblePorts = results.filter(r => r.accessible);
      const inaccessiblePorts = results.filter(r => !r.accessible);

      let status: 'pass' | 'warning' | 'fail' = 'pass';
      let message = 'All ports are accessible';

      if (inaccessiblePorts.length > 0) {
        status = inaccessiblePorts.length === results.length ? 'fail' : 'warning';
        message = `${inaccessiblePorts.length} port(s) not accessible: ${inaccessiblePorts.map(p => p.port).join(', ')}`;
      }

      return {
        id: 'port_accessibility',
        name: 'Port Accessibility',
        status,
        message,
        details: { results, duration },
        timestamp: Date.now(),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        id: 'port_accessibility',
        name: 'Port Accessibility',
        status: 'fail',
        message: `Port accessibility check failed: ${error}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error', duration },
        timestamp: Date.now(),
        duration
      };
    }
  }

  /**
   * Check service health
   */
  private async checkServiceHealth(): Promise<DataFlowCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrls.backend}/health`, {
        timeout: 5000
      } as any);

      const duration = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json().catch(() => ({}));
        
        return {
          id: 'service_health',
          name: 'Service Health',
          status: 'pass',
          message: 'Backend service is healthy',
          details: { healthData, duration },
          timestamp: Date.now(),
          duration
        };
      } else {
        return {
          id: 'service_health',
          name: 'Service Health',
          status: 'fail',
          message: `Backend service health check failed (status: ${response.status})`,
          details: { status: response.status, duration },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        id: 'service_health',
        name: 'Service Health',
        status: 'fail',
        message: `Service health check failed: ${error}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error', duration },
        timestamp: Date.now(),
        duration
      };
    }
  }

  /**
   * Generate recommendations based on check results
   */
  private generateRecommendations(
    checks: DataFlowCheck[],
    urlValidations: URLValidationResult[],
    strategyValidations: StrategyValidationResult[],
    corsValidation: CORSValidationResult
  ): string[] {
    const recommendations: string[] = [];

    // Backend connectivity recommendations
    const backendCheck = checks.find(c => c.id === 'backend_connectivity');
    if (backendCheck?.status === 'fail') {
      recommendations.push('Start the backend server: cd server && node server.js');
      recommendations.push('Check if port 8000 is available and not blocked by firewall');
    }

    // CORS recommendations
    if (!corsValidation.allowed) {
      recommendations.push('Update CORS configuration in server.js to allow frontend origin');
      recommendations.push('Ensure Access-Control-Allow-Origin header includes http://localhost:3000');
    }

    // Strategy recommendations
    const failedStrategies = strategyValidations.filter(s => !s.success);
    if (failedStrategies.length > 0) {
      recommendations.push(`${failedStrategies.length} loading strategies are failing - check backend endpoints`);
      
      if (failedStrategies.some(s => s.strategy === 'wado_rs')) {
        recommendations.push('WADO-RS endpoint is not working - check /rs route configuration');
      }
      
      if (failedStrategies.some(s => s.strategy === 'backend_api')) {
        recommendations.push('Backend API endpoint is not working - check /dicom route configuration');
      }
    }

    // URL validation recommendations
    const failedUrls = urlValidations.filter(u => !u.isAccessible);
    if (failedUrls.length > 0) {
      recommendations.push(`${failedUrls.length} critical URLs are not accessible`);
      
      failedUrls.forEach(url => {
        if (url.url.includes('/rs/')) {
          recommendations.push('Check WADO-RS implementation and Python DICOM processing');
        }
        if (url.url.includes('/dicom/')) {
          recommendations.push('Check backend API routes and DICOM file serving');
        }
      });
    }

    // Port accessibility recommendations
    const portCheck = checks.find(c => c.id === 'port_accessibility');
    if (portCheck?.status !== 'pass') {
      recommendations.push('Check that both frontend (3000) and backend (8000) ports are accessible');
      recommendations.push('If running in Docker/VM, ensure port mapping is configured correctly');
    }

    // Container mapping recommendations
    const containerCheck = checks.find(c => c.id === 'container_mapping');
    if (containerCheck?.status !== 'pass') {
      recommendations.push('If running in Docker/VM, check localhost mapping and port forwarding');
      recommendations.push('Consider using host networking or proper port mapping configuration');
    }

    // Performance recommendations
    const slowChecks = checks.filter(c => c.duration && c.duration > 2000);
    if (slowChecks.length > 0) {
      recommendations.push('Some services are responding slowly - check system resources');
      recommendations.push('Consider optimizing backend performance or increasing timeout values');
    }

    return recommendations;
  }

  /**
   * Get checks history
   */
  getChecksHistory(): DataFlowIntegrityReport[] {
    return [...this.checksHistory];
  }

  /**
   * Get latest report
   */
  getLatestReport(): DataFlowIntegrityReport | null {
    return this.checksHistory.length > 0 ? this.checksHistory[this.checksHistory.length - 1] : null;
  }

  /**
   * Clear checks history
   */
  clearHistory(): void {
    this.checksHistory = [];
    console.log('🗑️ [DataFlowIntegrity] History cleared');
  }

  /**
   * Update base URLs
   */
  updateBaseUrls(backend?: string, frontend?: string): void {
    if (backend) {
      this.baseUrls.backend = backend;
    }
    if (frontend) {
      this.baseUrls.frontend = frontend;
    }
    console.log('🔧 [DataFlowIntegrity] Base URLs updated:', this.baseUrls);
  }

  /**
   * Quick health check
   */
  async quickHealthCheck(): Promise<{
    backend: boolean;
    frontend: boolean;
    cors: boolean;
    overall: boolean;
  }> {
    try {
      const [backendCheck, corsCheck] = await Promise.all([
        this.checkBackendConnectivity(),
        this.validateCORSConfiguration()
      ]);

      const backend = backendCheck.status === 'pass';
      const frontend = typeof window !== 'undefined';
      const cors = corsCheck.validation.allowed;
      const overall = backend && frontend && cors;

      return { backend, frontend, cors, overall };
    } catch (error) {
      console.error('❌ [DataFlowIntegrity] Quick health check failed:', error);
      return { backend: false, frontend: false, cors: false, overall: false };
    }
  }
}

export const dataFlowIntegrityService = new DataFlowIntegrityService();
export default dataFlowIntegrityService;