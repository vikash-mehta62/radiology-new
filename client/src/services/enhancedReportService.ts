import { apiService } from './api';
import { auditService } from './auditService';
import { reportService, Report, CreateReportRequest, UpdateReportRequest } from './reportService';

export interface ReportPostCreationOptions {
  autoSave: boolean;
  sendToPhysician?: boolean;
  sendToPatient?: boolean;
  sendToReferringDoctor?: boolean;
  exportToPDF?: boolean;
  addToPatientRecord?: boolean;
  notifyStakeholders?: boolean;
  recipients?: string[];
}

export interface EnhancedCreateReportRequest extends CreateReportRequest {
  postCreationOptions?: ReportPostCreationOptions;
}

export interface ReportSendRequest {
  reportId: string;
  recipients: string[];
  message?: string;
  includeImages?: boolean;
  format?: 'pdf' | 'html' | 'both';
}

class EnhancedReportService {
  private autoSaveInterval: number = 30000; // 30 seconds
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a report with enhanced features including audit logging and auto-save
   */
  async createReportWithEnhancements(data: EnhancedCreateReportRequest): Promise<Report> {
    try {
      console.log('🏥 Creating enhanced medical report...');

      // Create the report using the base service
      const report = await reportService.createReport(data);

      // Log audit event
      await auditService.logReportCreated(
        report.report_id,
        report.study_uid,
        report.patient_id,
        {
          exam_type: data.exam_type || 'unknown',
          ai_generated: report.ai_generated,
          post_creation_options: data.postCreationOptions
        }
      );

      // Handle post-creation options
      if (data.postCreationOptions) {
        await this.handlePostCreationActions(report, data.postCreationOptions);
      }

      // Set up auto-save if enabled
      if (data.postCreationOptions?.autoSave) {
        this.setupAutoSave(report.report_id);
      }

      // Automatically add to patient record
      await this.addReportToPatientRecord(report);

      console.log('✅ Enhanced report created successfully');
      return report;

    } catch (error) {
      console.error('❌ Failed to create enhanced report:', error);
      throw error;
    }
  }

  /**
   * Update a report with audit logging and auto-save
   */
  async updateReportWithEnhancements(reportId: string, data: UpdateReportRequest, previousData?: Report): Promise<Report> {
    try {
      console.log('📝 Updating report with enhancements...');

      // Update the report using the base service
      const updatedReport = await reportService.updateReport(reportId, data);

      // Log audit event
      if (previousData) {
        await auditService.logReportUpdated(
          reportId,
          updatedReport.study_uid,
          updatedReport.patient_id,
          previousData,
          data
        );
      }

      // Auto-save to patient record
      await this.addReportToPatientRecord(updatedReport);

      console.log('✅ Report updated with enhancements');
      return updatedReport;

    } catch (error) {
      console.error('❌ Failed to update enhanced report:', error);
      throw error;
    }
  }

  /**
   * Finalize a report with audit logging and notifications
   */
  async finalizeReportWithEnhancements(reportId: string): Promise<Report> {
    try {
      console.log('🔒 Finalizing report with enhancements...');

      // Finalize the report using the base service
      const finalizedReport = await reportService.finalizeReport(reportId);

      // Log audit event
      await auditService.logReportFinalized(
        reportId,
        finalizedReport.study_uid,
        finalizedReport.patient_id
      );

      // Stop auto-save timer
      this.stopAutoSave(reportId);

      // Ensure final version is saved to patient record
      await this.addReportToPatientRecord(finalizedReport);

      // Send notifications to stakeholders
      await this.notifyStakeholders(finalizedReport);

      console.log('✅ Report finalized with enhancements');
      return finalizedReport;

    } catch (error) {
      console.error('❌ Failed to finalize enhanced report:', error);
      throw error;
    }
  }

  /**
   * Send report to specified recipients
   */
  async sendReport(request: ReportSendRequest): Promise<void> {
    try {
      console.log('📧 Sending report to recipients...');

      const response = await apiService.post('/api/reports/send', request);

      // Get report details for audit logging
      const report = await reportService.getReport(request.reportId);
      
      // Log audit event for each recipient
      for (const recipient of request.recipients) {
        await auditService.logReportSent(
          request.reportId,
          report.study_uid,
          report.patient_id,
          recipient
        );
      }

      console.log('✅ Report sent successfully');

    } catch (error) {
      console.error('❌ Failed to send report:', error);
      throw new Error('Failed to send report. Please try again.');
    }
  }

  /**
   * Export report with audit logging
   */
  async exportReportWithAudit(reportId: string, format: 'pdf' | 'html' | 'docx' = 'pdf'): Promise<Blob> {
    try {
      console.log(`📄 Exporting report as ${format}...`);

      const response = await apiService.get(`/api/reports/${reportId}/export?format=${format}`, {
        responseType: 'blob'
      });

      // Get report details for audit logging
      const report = await reportService.getReport(reportId);
      
      // Log audit event
      await auditService.logReportExported(
        reportId,
        report.study_uid,
        report.patient_id,
        format
      );

      console.log('✅ Report exported successfully');
      return response;

    } catch (error) {
      console.error('❌ Failed to export report:', error);
      throw new Error('Failed to export report. Please try again.');
    }
  }

  /**
   * Get report with audit logging
   */
  async getReportWithAudit(reportId: string): Promise<Report> {
    try {
      const report = await reportService.getReport(reportId);

      // Log audit event
      await auditService.logReportViewed(
        reportId,
        report.study_uid,
        report.patient_id
      );

      return report;

    } catch (error) {
      console.error('❌ Failed to get report:', error);
      throw error;
    }
  }

  /**
   * Handle post-creation actions
   */
  private async handlePostCreationActions(report: Report, options: ReportPostCreationOptions): Promise<void> {
    try {
      console.log('⚙️ Processing post-creation actions...');

      // Send to physician
      if (options.sendToPhysician && options.recipients) {
        const physicians = options.recipients.filter(r => r.includes('physician') || r.includes('doctor'));
        if (physicians.length > 0) {
          await this.sendReport({
            reportId: report.report_id,
            recipients: physicians,
            message: 'New medical report available for review'
          });
        }
      }

      // Send to patient
      if (options.sendToPatient && report.patient_id) {
        // In a real implementation, this would get patient contact info
        console.log('📧 Scheduling patient notification...');
      }

      // Send to referring doctor
      if (options.sendToReferringDoctor && options.recipients) {
        const referringDocs = options.recipients.filter(r => r.includes('referring'));
        if (referringDocs.length > 0) {
          await this.sendReport({
            reportId: report.report_id,
            recipients: referringDocs,
            message: 'Report completed for your referred patient'
          });
        }
      }

      // Export to PDF
      if (options.exportToPDF) {
        await this.exportReportWithAudit(report.report_id, 'pdf');
      }

      // Notify stakeholders
      if (options.notifyStakeholders) {
        await this.notifyStakeholders(report);
      }

      console.log('✅ Post-creation actions completed');

    } catch (error) {
      console.error('❌ Error in post-creation actions:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Add report to patient record
   */
  private async addReportToPatientRecord(report: Report): Promise<void> {
    try {
      console.log('📋 Adding report to patient record...');

      await apiService.post(`/api/patients/${report.patient_id}/reports`, {
        report_id: report.report_id,
        study_uid: report.study_uid,
        exam_type: 'unknown',
        status: report.status,
        created_at: report.created_at,
        updated_at: report.updated_at
      });

      console.log('✅ Report added to patient record');

    } catch (error) {
      console.error('❌ Failed to add report to patient record:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Setup auto-save for a report
   */
  private setupAutoSave(reportId: string): void {
    console.log(`⏰ Setting up auto-save for report ${reportId}`);

    // Clear existing timer if any
    this.stopAutoSave(reportId);

    // Set up new timer
    const timer = setInterval(async () => {
      try {
        console.log(`💾 Auto-saving report ${reportId}...`);
        
        // Get current report data from the UI (this would need to be implemented)
        // For now, we'll just update the timestamp
        await apiService.post(`/api/reports/${reportId}/auto-save`, {
          last_auto_save: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, this.autoSaveInterval);

    this.autoSaveTimers.set(reportId, timer);
  }

  /**
   * Stop auto-save for a report
   */
  private stopAutoSave(reportId: string): void {
    const timer = this.autoSaveTimers.get(reportId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(reportId);
      console.log(`⏹️ Auto-save stopped for report ${reportId}`);
    }
  }

  /**
   * Notify stakeholders about report completion
   */
  private async notifyStakeholders(report: Report): Promise<void> {
    try {
      console.log('📢 Notifying stakeholders...');

      await apiService.post('/api/notifications/report-completed', {
        report_id: report.report_id,
        study_uid: report.study_uid,
        patient_id: report.patient_id,
        exam_type: 'unknown',
        status: report.status
      });

      console.log('✅ Stakeholders notified');

    } catch (error) {
      console.error('❌ Failed to notify stakeholders:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Get comprehensive report data including audit trail
   */
  async getComprehensiveReportData(reportId: string): Promise<{
    report: Report;
    auditTrail: any[];
    relatedReports: Report[];
  }> {
    try {
      const [report, auditTrail, relatedReports] = await Promise.all([
        this.getReportWithAudit(reportId),
        auditService.getReportAuditTrail(reportId),
        reportService.getStudyReports(reportId)
      ]);

      return {
        report,
        auditTrail,
        relatedReports: relatedReports || []
      };

    } catch (error) {
      console.error('❌ Failed to get comprehensive report data:', error);
      throw error;
    }
  }

  /**
   * Cleanup auto-save timers
   */
  cleanup(): void {
    this.autoSaveTimers.forEach((timer, reportId) => {
      this.stopAutoSave(reportId);
    });
  }
}

export const enhancedReportService = new EnhancedReportService();
export default enhancedReportService;