/**
 * Email Service for Medical Report Distribution
 * HIPAA-compliant email delivery with encryption and audit trails
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface EmailRecipient {
  email: string;
  name: string;
  type: 'patient' | 'doctor' | 'admin' | 'other';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'report_delivery' | 'notification' | 'reminder';
}

export interface EmailOptions {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  encrypted: boolean;
  requireDeliveryConfirmation: boolean;
  expirationDays?: number;
  attachments?: {
    filename: string;
    content: string | Blob;
    mimeType: string;
  }[];
}

export interface EmailDeliveryStatus {
  id: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  trackingId: string;
}

class EmailService {
  private baseUrl = '/api/email';

  /**
   * Send report to patient with HIPAA compliance
   */
  async sendReportToPatient(
    reportId: string,
    patientEmail: string,
    patientName: string,
    options: Partial<EmailOptions> = {}
  ): Promise<EmailDeliveryStatus> {
    try {
      console.log('📧 Sending report to patient:', patientEmail);

      const emailData = {
        reportId,
        recipient: {
          email: patientEmail,
          name: patientName,
          type: 'patient'
        },
        template: 'patient_report_delivery',
        options: {
          encrypted: true,
          requireDeliveryConfirmation: true,
          priority: 'normal',
          expirationDays: 30,
          ...options
        }
      };

      const response = await apiService.post<EmailDeliveryStatus>(
        `${this.baseUrl}/send-report`,
        emailData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_sent',
        event_description: 'Report emailed to patient',
        resource_type: 'Report',
        resource_id: reportId,
        metadata: {
          action_details: {
            recipient_email: patientEmail,
            tracking_id: response.trackingId,
            encrypted: emailData.options.encrypted
          }
        }
      });

      console.log('✅ Report sent to patient successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to send report to patient:', error);
      throw new Error('Failed to send report to patient. Please try again.');
    }
  }

  /**
   * Send report to referring doctor
   */
  async sendReportToDoctor(
    reportId: string,
    doctorEmail: string,
    doctorName: string,
    options: Partial<EmailOptions> = {}
  ): Promise<EmailDeliveryStatus> {
    try {
      console.log('📧 Sending report to doctor:', doctorEmail);

      const emailData = {
        reportId,
        recipient: {
          email: doctorEmail,
          name: doctorName,
          type: 'doctor'
        },
        template: 'doctor_report_delivery',
        options: {
          encrypted: true,
          requireDeliveryConfirmation: true,
          priority: 'high',
          expirationDays: 90,
          ...options
        }
      };

      const response = await apiService.post<EmailDeliveryStatus>(
        `${this.baseUrl}/send-report`,
        emailData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_sent',
        event_description: 'Report emailed to doctor',
        resource_type: 'Report',
        resource_id: reportId,
        metadata: {
          action_details: {
            recipient_email: doctorEmail,
            tracking_id: response.trackingId
          }
        }
      });

      console.log('✅ Report sent to doctor successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to send report to doctor:', error);
      throw new Error('Failed to send report to doctor. Please try again.');
    }
  }

  /**
   * Send bulk notifications to multiple recipients
   */
  async sendReportNotifications(
    reportId: string,
    recipients: EmailRecipient[],
    message: string,
    options: Partial<EmailOptions> = {}
  ): Promise<EmailDeliveryStatus[]> {
    try {
      console.log('📧 Sending notifications to', recipients.length, 'recipients');

      const emailData = {
        reportId,
        recipients,
        message,
        template: 'report_notification',
        options: {
          encrypted: true,
          priority: 'normal',
          ...options
        }
      };

      const response = await apiService.post<EmailDeliveryStatus[]>(
        `${this.baseUrl}/send-notifications`,
        emailData
      );

      // Log audit events for each recipient
      for (const recipient of recipients) {
        await auditService.logEvent({
          event_type: 'report_sent',
          event_description: 'Report notification sent',
          resource_type: 'Report',
          resource_id: reportId,
          metadata: {
            action_details: {
              recipient_email: recipient.email,
              recipient_type: recipient.type,
              message: message.substring(0, 100) + '...'
            }
          }
        });
      }

      console.log('✅ Notifications sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to send notifications:', error);
      throw new Error('Failed to send notifications. Please try again.');
    }
  }

  /**
   * Get email delivery status
   */
  async getDeliveryStatus(trackingId: string): Promise<EmailDeliveryStatus> {
    try {
      const response = await apiService.get<EmailDeliveryStatus>(
        `${this.baseUrl}/status/${trackingId}`
      );
      return response;
    } catch (error) {
      console.error('❌ Failed to get delivery status:', error);
      throw new Error('Failed to get delivery status.');
    }
  }

  /**
   * Get available email templates
   */
  async getEmailTemplates(type?: string): Promise<EmailTemplate[]> {
    try {
      const url = type ? `${this.baseUrl}/templates?type=${type}` : `${this.baseUrl}/templates`;
      const response = await apiService.get<{ templates: EmailTemplate[] }>(url);
      return response.templates || [];
    } catch (error) {
      console.error('❌ Failed to get email templates:', error);
      return [];
    }
  }

  /**
   * Send secure link for report access (alternative to direct email)
   */
  async sendSecureReportLink(
    reportId: string,
    recipientEmail: string,
    recipientName: string,
    expirationHours: number = 72
  ): Promise<EmailDeliveryStatus> {
    try {
      console.log('🔐 Sending secure report link to:', recipientEmail);

      const emailData = {
        reportId,
        recipient: {
          email: recipientEmail,
          name: recipientName,
          type: 'secure_link'
        },
        template: 'secure_report_link',
        options: {
          encrypted: true,
          requireDeliveryConfirmation: true,
          expirationHours
        }
      };

      const response = await apiService.post<EmailDeliveryStatus>(
        `${this.baseUrl}/send-secure-link`,
        emailData
      );

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_sent',
        event_description: 'Secure report link sent',
        resource_type: 'Report',
        resource_id: reportId,
        metadata: {
          action_details: {
            recipient_email: recipientEmail,
            expiration_hours: expirationHours,
            tracking_id: response.trackingId
          }
        }
      });

      console.log('✅ Secure link sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to send secure link:', error);
      throw new Error('Failed to send secure link. Please try again.');
    }
  }

  /**
   * Validate email configuration and connectivity
   */
  async validateEmailConfiguration(): Promise<{
    isConfigured: boolean;
    smtpConnected: boolean;
    encryptionEnabled: boolean;
    issues: string[];
  }> {
    try {
      const response = await apiService.get<{
        isConfigured: boolean;
        smtpConnected: boolean;
        encryptionEnabled: boolean;
        issues: string[];
      }>(`${this.baseUrl}/validate-config`);

      return response;
    } catch (error) {
      console.error('❌ Failed to validate email configuration:', error);
      return {
        isConfigured: false,
        smtpConnected: false,
        encryptionEnabled: false,
        issues: ['Failed to connect to email service']
      };
    }
  }
}

export const emailService = new EmailService();
export default emailService;