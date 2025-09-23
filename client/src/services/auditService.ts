import { apiService } from './api';

export interface AuditEvent {
  id: string;
  event_type: 'report_created' | 'report_updated' | 'report_finalized' | 'report_deleted' | 'report_viewed' | 'report_exported' | 'report_sent';
  event_description: string;
  user_id: string;
  user_role: string;
  resource_type: 'Report' | 'Study' | 'Patient';
  resource_id: string;
  study_uid?: string;
  report_id?: string;
  patient_id?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: {
    previous_values?: any;
    new_values?: any;
    export_format?: string;
    recipient?: string;
    action_details?: any;
  };
}

export interface CreateAuditEventRequest {
  event_type: AuditEvent['event_type'];
  event_description: string;
  resource_type: AuditEvent['resource_type'];
  resource_id: string;
  study_uid?: string;
  report_id?: string;
  patient_id?: string;
  metadata?: AuditEvent['metadata'];
}

class AuditService {
  private baseUrl = '/api/audit';

  /**
   * Log an audit event
   */
  async logEvent(data: CreateAuditEventRequest): Promise<AuditEvent> {
    try {
      const response = await apiService.post<AuditEvent>(this.baseUrl, {
        ...data,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP()
      });

      console.log('📝 Audit event logged:', data.event_type);
      return response;
    } catch (error) {
      console.error('❌ Failed to log audit event:', error);
      // Don't throw error to avoid breaking main functionality
      return {} as AuditEvent;
    }
  }

  /**
   * Log report creation event
   */
  async logReportCreated(reportId: string, studyUid: string, patientId: string, metadata?: any): Promise<void> {
    await this.logEvent({
      event_type: 'report_created',
      event_description: `Medical report created for study ${studyUid}`,
      resource_type: 'Report',
      resource_id: reportId,
      study_uid: studyUid,
      report_id: reportId,
      patient_id: patientId,
      metadata: {
        action_details: metadata
      }
    });
  }

  /**
   * Log report update event
   */
  async logReportUpdated(reportId: string, studyUid: string, patientId: string, previousValues: any, newValues: any): Promise<void> {
    await this.logEvent({
      event_type: 'report_updated',
      event_description: `Medical report ${reportId} updated`,
      resource_type: 'Report',
      resource_id: reportId,
      study_uid: studyUid,
      report_id: reportId,
      patient_id: patientId,
      metadata: {
        previous_values: previousValues,
        new_values: newValues
      }
    });
  }

  /**
   * Log report finalization event
   */
  async logReportFinalized(reportId: string, studyUid: string, patientId: string): Promise<void> {
    await this.logEvent({
      event_type: 'report_finalized',
      event_description: `Medical report ${reportId} finalized and signed`,
      resource_type: 'Report',
      resource_id: reportId,
      study_uid: studyUid,
      report_id: reportId,
      patient_id: patientId
    });
  }

  /**
   * Log report export event
   */
  async logReportExported(reportId: string, studyUid: string, patientId: string, format: string): Promise<void> {
    await this.logEvent({
      event_type: 'report_exported',
      event_description: `Medical report ${reportId} exported as ${format}`,
      resource_type: 'Report',
      resource_id: reportId,
      study_uid: studyUid,
      report_id: reportId,
      patient_id: patientId,
      metadata: {
        export_format: format
      }
    });
  }

  /**
   * Log report sent event
   */
  async logReportSent(reportId: string, studyUid: string, patientId: string, recipient: string): Promise<void> {
    await this.logEvent({
      event_type: 'report_sent',
      event_description: `Medical report ${reportId} sent to ${recipient}`,
      resource_type: 'Report',
      resource_id: reportId,
      study_uid: studyUid,
      report_id: reportId,
      patient_id: patientId,
      metadata: {
        recipient: recipient
      }
    });
  }

  /**
   * Log report viewed event
   */
  async logReportViewed(reportId: string, studyUid: string, patientId: string): Promise<void> {
    await this.logEvent({
      event_type: 'report_viewed',
      event_description: `Medical report ${reportId} viewed`,
      resource_type: 'Report',
      resource_id: reportId,
      study_uid: studyUid,
      report_id: reportId,
      patient_id: patientId
    });
  }

  /**
   * Get audit events for a specific report
   */
  async getReportAuditTrail(reportId: string): Promise<AuditEvent[]> {
    try {
      const response = await apiService.get<{ events: AuditEvent[] }>(`${this.baseUrl}/report/${reportId}`);
      return response.events || [];
    } catch (error) {
      console.error('❌ Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit events for a specific study
   */
  async getStudyAuditTrail(studyUid: string): Promise<AuditEvent[]> {
    try {
      const response = await apiService.get<{ events: AuditEvent[] }>(`${this.baseUrl}/study/${studyUid}`);
      return response.events || [];
    } catch (error) {
      console.error('❌ Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit events for a specific patient
   */
  async getPatientAuditTrail(patientId: string): Promise<AuditEvent[]> {
    try {
      const response = await apiService.get<{ events: AuditEvent[] }>(`${this.baseUrl}/patient/${patientId}`);
      return response.events || [];
    } catch (error) {
      console.error('❌ Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get all audit events with filtering
   */
  async getAuditEvents(filters?: {
    event_type?: string;
    resource_type?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await apiService.get<{ events: AuditEvent[]; total: number }>(
        `${this.baseUrl}?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('❌ Failed to get audit events:', error);
      return { events: [], total: 0 };
    }
  }

  /**
   * Get client IP address (simplified for demo)
   */
  private async getClientIP(): Promise<string> {
    try {
      // In a real implementation, this would get the actual client IP
      return 'localhost';
    } catch {
      return 'unknown';
    }
  }
}

export const auditService = new AuditService();
export default auditService;