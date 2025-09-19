import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',  
      timeout: 60000, // Increased to 60 seconds for large file uploads
   
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('kiro_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('kiro_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.get('/health');
  }

  // Upload health check
  async uploadHealthCheck(): Promise<any> {
    return this.get('/upload/health');
  }

  // Connectivity test
  async testConnectivity(): Promise<{ connected: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.healthCheck();
      const latency = Date.now() - startTime;
      return { connected: true, latency };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return { 
        connected: false, 
        latency, 
        error: error.message || 'Connection failed' 
      };
    }
  }

  // Single file upload helper
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('files', file); // Fixed: use 'files' to match backend expectation

    const config: AxiosRequestConfig = {
      // DO NOT set Content-Type - let browser set boundary automatically
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return this.post(url, formData, config);
  }

  // Multi-file upload helper
  async uploadFiles<T = any>(url: string, files: File[], onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    
    // Append each file with the same 'files' field name
    for (const file of files) {
      formData.append('files', file);
    }

    const config: AxiosRequestConfig = {
      // DO NOT set Content-Type - let browser set boundary automatically
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return this.post(url, formData, config);
  }

  // Download helper
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Study Management
  async getStudies(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    patient_id?: string;
    exam_type?: string;
    modality?: string;
  }): Promise<{ studies: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.patient_id) queryParams.append('patient_id', params.patient_id);
    if (params?.exam_type) queryParams.append('exam_type', params.exam_type);
    if (params?.modality) queryParams.append('modality', params.modality);

    const url = `/studies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async getStudy(studyUid: string): Promise<any> {
    return this.get(`/studies/${studyUid}`);
  }

  async ingestStudy(studyUid: string, studyData: any): Promise<any> {
    return this.post(`/studies/${studyUid}/ingest`, studyData);
  }

  // Report Management
  async getReports(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    exam_type?: string;
    radiologist_id?: string;
    ai_generated?: boolean;
  }): Promise<{ reports: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.exam_type) queryParams.append('exam_type', params.exam_type);
    if (params?.radiologist_id) queryParams.append('radiologist_id', params.radiologist_id);
    if (params?.ai_generated !== undefined) queryParams.append('ai_generated', params.ai_generated.toString());

    const url = `/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async getReport(reportId: string): Promise<any> {
    console.log('ApiService: Getting report with ID:', reportId);
    const result = await this.get(`/reports/${reportId}`);
    console.log('ApiService: Received report data:', result);
    return result;
  }

  async createReport(reportData: any): Promise<any> {
    return this.post('/reports', reportData);
  }

  async updateReport(reportId: string, reportData: any): Promise<any> {
    return this.put(`/reports/${reportId}`, reportData);
  }

  async finalizeReport(reportId: string): Promise<any> {
    return this.post(`/reports/${reportId}/finalize`);
  }

  async getStudyReports(studyUid: string): Promise<{ study_uid: string; reports: any[] }> {
    return this.get(`/studies/${studyUid}/reports`);
  }

  // AI Assistance
  async generateAIReport(studyUid: string, examType: string): Promise<any> {
    return this.post('/ai/assist-report', { study_uid: studyUid, exam_type: examType });
  }

  async generateAIMeasurements(studyUid: string, examType: string): Promise<any> {
    return this.post('/ai/generate-measurements', { study_uid: studyUid, exam_type: examType });
  }

  async enhanceFindings(findings: string, examType: string): Promise<any> {
    return this.post('/ai/enhance-findings', { findings, exam_type: examType });
  }

  // Billing
  async generateSuperbill(reportId: string): Promise<any> {
    return this.post('/superbills', { report_id: reportId });
  }

  async suggestDiagnosisCodes(findings: string, examType: string): Promise<any> {
    return this.get(`/billing/codes/suggest?findings=${encodeURIComponent(findings)}&exam_type=${examType}`);
  }

  async validateBillingCodes(cptCodes: string[], icd10Codes: string[]): Promise<any> {
    return this.post('/billing/validate', { cpt_codes: cptCodes, icd10_codes: icd10Codes });
  }

  // Patient Management
  async getPatients(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const url = `/patients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get(url);
  }

  async getPatient(patientId: string): Promise<any> {
    return this.get(`/patients/${patientId}`);
  }

  async createPatient(patientData: any): Promise<any> {
    return this.post('/patients', patientData);
  }

  async updatePatient(patientId: string, patientData: any): Promise<any> {
    return this.put(`/patients/${patientId}`, patientData);
  }

  async getPatientStudies(patientId: string): Promise<any[]> {
    return this.get(`/patients/${patientId}/studies`);
  }

  // Real-time Billing
  async suggestCodesRealtime(findings: string, examType: string, measurements?: any, userId?: string): Promise<any> {
    const params = new URLSearchParams({
      findings,
      exam_type: examType,
    });
    
    if (measurements) params.append('measurements', JSON.stringify(measurements));
    if (userId) params.append('user_id', userId);

    return this.get(`/billing/codes/suggest/realtime?${params.toString()}`);
  }

  async validateCodesRealtime(cptCodes: string[], icd10Codes: string[], examType: string, patientContext?: any): Promise<any> {
    return this.post('/billing/validate/realtime', {
      cpt_codes: cptCodes,
      icd10_codes: icd10Codes,
      exam_type: examType,
      patient_context: patientContext,
    });
  }
}

export const apiService = new ApiService();