import { apiService } from './api';

export interface Report {
  id: string;
  report_id: string;
  study_uid: string;
  patient_id: string;
  status: 'draft' | 'final' | 'billed';
  findings?: string;
  impressions?: string;
  recommendations?: string;
  ai_generated: boolean;
  ai_confidence?: number;
  created_at: string;
  updated_at?: string;
  finalized_at?: string;
}

export interface CreateReportRequest {
  study_uid: string;
  patient_id: string;
  exam_type?: string;
  ai_generated?: boolean;
}

export interface UpdateReportRequest {
  findings?: string;
  impressions?: string;
  recommendations?: string;
  status?: 'draft' | 'final' | 'billed';
}

class ReportService {
  private baseUrl = '/api/reports';

  /**
   * Create a new report for a study
   */
  async createReport(data: CreateReportRequest): Promise<Report> {
    try {
      console.log('🏥 Creating report for study:', data.study_uid);
      
      const response = await apiService.post<Report>(this.baseUrl, {
        ...data,
        ai_generated: data.ai_generated ?? false,
        status: 'draft'
      });

      console.log('✅ Report created successfully:', response.report_id);
      return response;
    } catch (error) {
      console.error('❌ Failed to create report:', error);
      throw new Error('Failed to create report. Please try again.');
    }
  }

  /**
   * Get a specific report by ID
   */
  async getReport(reportId: string): Promise<Report> {
    try {
      const response = await apiService.get<Report>(`${this.baseUrl}/${reportId}`);
      return response;
    } catch (error) {
      console.error('❌ Failed to get report:', error);
      throw new Error('Failed to load report. Please try again.');
    }
  }

  /**
   * Get all reports for a study
   */
  async getStudyReports(studyUid: string): Promise<Report[]> {
    try {
      const response = await apiService.get<{ reports: Report[] }>(`${this.baseUrl}/study/${studyUid}`);
      return response.reports || [];
    } catch (error) {
      console.error('❌ Failed to get study reports:', error);
      return [];
    }
  }

  /**
   * Update an existing report
   */
  async updateReport(reportId: string, data: UpdateReportRequest): Promise<Report> {
    try {
      const response = await apiService.put<Report>(`${this.baseUrl}/${reportId}`, data);
      console.log('✅ Report updated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to update report:', error);
      throw new Error('Failed to update report. Please try again.');
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      await apiService.delete(`${this.baseUrl}/${reportId}`);
      console.log('✅ Report deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete report:', error);
      throw new Error('Failed to delete report. Please try again.');
    }
  }

  /**
   * Finalize a report (mark as final)
   */
  async finalizeReport(reportId: string): Promise<Report> {
    try {
      const response = await apiService.post<Report>(`${this.baseUrl}/${reportId}/finalize`);
      console.log('✅ Report finalized successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to finalize report:', error);
      throw new Error('Failed to finalize report. Please try again.');
    }
  }

  /**
   * Generate AI report for a study
   */
  async generateAIReport(studyUid: string): Promise<Report> {
    try {
      console.log('🤖 Generating AI report for study:', studyUid);
      
      const response = await apiService.post<Report>(`${this.baseUrl}/ai-generate`, {
        study_uid: studyUid,
        ai_generated: true
      });

      console.log('✅ AI report generated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to generate AI report:', error);
      throw new Error('Failed to generate AI report. Please try again.');
    }
  }

  /**
   * Get report templates
   */
  async getReportTemplates(examType?: string): Promise<any[]> {
    try {
      const url = examType ? `${this.baseUrl}/templates?exam_type=${examType}` : `${this.baseUrl}/templates`;
      const response = await apiService.get<{ templates: any[] }>(url);
      return response.templates || [];
    } catch (error) {
      console.error('❌ Failed to get report templates:', error);
      return [];
    }
  }
}

export const reportService = new ReportService();
export default reportService;