import { Study, Report, ApiResponse, PaginatedResponse } from '../types';
import { apiService } from './api';

class StudyService {
  // Get all studies with optional filtering
  async getStudies(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    patient_id?: string;
    exam_type?: string;
    modality?: string;
  }): Promise<{ studies: Study[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.patient_id) queryParams.append('patient_id', params.patient_id);
      if (params?.exam_type) queryParams.append('exam_type', params.exam_type);
      if (params?.modality) queryParams.append('modality', params.modality);

      const response = await apiService.get<{ studies: Study[]; total: number }>(
        `/studies?${queryParams.toString()}`
      );

      return response;
    } catch (error) {
      console.error('Failed to fetch studies:', error);
      
      // Return mock data for prototype
      return {
        studies: this.getMockStudies(),
        total: this.getMockStudies().length,
      };
    }
  }

  // Get a specific study by UID
  async getStudy(studyUid: string): Promise<Study> {
    try {
      const response = await apiService.get<Study>(`/studies/${studyUid}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch study:', error);
      
      // Return mock data for prototype
      const mockStudies = this.getMockStudies();
      const study = mockStudies.find(s => s.study_uid === studyUid);
      
      if (!study) {
        throw new Error('Study not found');
      }
      
      return study;
    }
  }

  // Get reports for a specific study
  async getStudyReports(studyUid: string): Promise<Report[]> {
    try {
      const response = await apiService.get<{ study_uid: string; reports: Report[] }>(
        `/studies/${studyUid}/reports`
      );
      return response.reports;
    } catch (error) {
      console.error('Failed to fetch study reports:', error);
      return [];
    }
  }

  // Search studies
  async searchStudies(query: string, limit: number = 50): Promise<Study[]> {
    try {
      const response = await apiService.get<{ results: Study[] }>(
        `/studies/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return response.results;
    } catch (error) {
      console.error('Failed to search studies:', error);
      
      // Filter mock data for prototype
      const mockStudies = this.getMockStudies();
      const queryLower = query.toLowerCase();
      
      return mockStudies.filter(study =>
        study.patient_id.toLowerCase().includes(queryLower) ||
        study.study_description?.toLowerCase().includes(queryLower) ||
        study.study_uid.includes(query)
      );
    }
  }

  // Get studies for a specific patient (including uploaded DICOM files)
  async getPatientStudies(patientId: string): Promise<{ studies: Study[]; total: number; patient_name?: string }> {
    try {
      const response = await apiService.get<{
        patient_id: string;
        patient_name: string;
        studies: Study[];
        total_studies: number;
      }>(`/patients/${patientId}/studies`);
      
      return {
        studies: response.studies,
        total: response.total_studies,
        patient_name: response.patient_name
      };
    } catch (error) {
      console.error('Failed to fetch patient studies:', error);
      
      // Return empty studies for now
      return {
        studies: [],
        total: 0
      };
    }
  }

  // Get study statistics
  async getStudyStatistics(): Promise<any> {
    try {
      const response = await apiService.get('/studies/statistics');
      return response;
    } catch (error) {
      console.error('Failed to fetch study statistics:', error);
      
      // Return mock statistics
      return {
        total_studies: 156,
        status_counts: {
          received: 23,
          processing: 5,
          completed: 89,
          billed: 34,
          error: 5,
        },
        exam_type_counts: {
          echo_complete: 67,
          vascular_carotid: 34,
          ct_scan: 28,
          mri_scan: 15,
          xray: 12,
        },
        recent_studies: 23,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Start rapid reporting workflow
  async startRapidWorkflow(studyUid: string, userId?: string): Promise<any> {
    try {
      const response = await apiService.post('/workflow/rapid-report/start', {
        study_uid: studyUid,
        user_id: userId,
      });
      return response;
    } catch (error) {
      console.error('Failed to start rapid workflow:', error);
      throw error;
    }
  }

  // Get workflow status
  async getWorkflowStatus(workflowId: string): Promise<any> {
    try {
      const response = await apiService.get(`/workflow/rapid-report/status/${workflowId}`);
      return response;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      throw error;
    }
  }

  // Mock data for prototype
  private getMockStudies(): Study[] {
    return [
      {
        id: '1',
        study_uid: '1.2.826.0.1.3680043.8.498.12345678901234567890123456789012',
        patient_id: 'ECHO001',
        study_date: '2024-01-15',
        modality: 'US',
        exam_type: 'echo_complete',
        study_description: 'Echocardiogram Complete with Doppler',
        series_description: 'Echo 2D Complete Study',
        status: 'completed',
        orthanc_id: 'orthanc-study-1',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:35:00Z',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.12345678901234567890123456789012&seriesUID=1.2.826.0.1.3680043.8.498.12345678901234567890123456789012.1&objectUID=1.2.826.0.1.3680043.8.498.12345678901234567890123456789012.1.1&contentType=application/dicom',
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.12345678901234567890123456789012&seriesUID=1.2.826.0.1.3680043.8.498.12345678901234567890123456789012.1&objectUID=1.2.826.0.1.3680043.8.498.12345678901234567890123456789012.1.2&contentType=application/dicom',
        ],
        thumbnail_url: 'http://localhost:8042/instances/orthanc-instance-1/preview',
        reports: [
          {
            report_id: 'report-1',
            status: 'final',
            created_at: '2024-01-15T10:35:00Z',
            finalized_at: '2024-01-15T10:40:00Z',
            ai_generated: true,
          },
        ],
      },
      {
        id: '2',
        study_uid: '1.2.826.0.1.3680043.8.498.22345678901234567890123456789012',
        patient_id: 'CAROTID001',
        study_date: '2024-01-15',
        modality: 'US',
        exam_type: 'vascular_carotid',
        study_description: 'Carotid Duplex Ultrasound Bilateral',
        series_description: 'Carotid Artery Duplex',
        status: 'processing',
        orthanc_id: 'orthanc-study-2',
        created_at: '2024-01-15T11:00:00Z',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.22345678901234567890123456789012&seriesUID=1.2.826.0.1.3680043.8.498.22345678901234567890123456789012.1&objectUID=1.2.826.0.1.3680043.8.498.22345678901234567890123456789012.1.1&contentType=application/dicom',
        ],
        thumbnail_url: 'http://localhost:8042/instances/orthanc-instance-2/preview',
        reports: [],
      },
      {
        id: '3',
        study_uid: '1.2.826.0.1.3680043.8.498.32345678901234567890123456789012',
        patient_id: 'CT001',
        study_date: '2024-01-15',
        modality: 'CT',
        exam_type: 'ct_scan',
        study_description: 'CT Chest with IV Contrast',
        series_description: 'Chest CT Axial',
        status: 'billed',
        orthanc_id: 'orthanc-study-3',
        created_at: '2024-01-15T09:15:00Z',
        updated_at: '2024-01-15T09:30:00Z',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.32345678901234567890123456789012&seriesUID=1.2.826.0.1.3680043.8.498.32345678901234567890123456789012.1&objectUID=1.2.826.0.1.3680043.8.498.32345678901234567890123456789012.1.1&contentType=application/dicom',
        ],
        thumbnail_url: 'http://localhost:8042/instances/orthanc-instance-3/preview',
        reports: [
          {
            report_id: 'report-3',
            status: 'final',
            created_at: '2024-01-15T09:25:00Z',
            finalized_at: '2024-01-15T09:30:00Z',
            ai_generated: false,
          },
        ],
      },
      {
        id: '4',
        study_uid: '1.2.826.0.1.3680043.8.498.42345678901234567890123456789012',
        patient_id: 'MRI001',
        study_date: '2024-01-15',
        modality: 'MR',
        exam_type: 'mri_scan',
        study_description: 'MRI Brain without and with Contrast',
        series_description: 'Brain MRI T1 and T2',
        status: 'received',
        orthanc_id: 'orthanc-study-4',
        created_at: '2024-01-15T12:00:00Z',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.42345678901234567890123456789012&seriesUID=1.2.826.0.1.3680043.8.498.42345678901234567890123456789012.1&objectUID=1.2.826.0.1.3680043.8.498.42345678901234567890123456789012.1.1&contentType=application/dicom',
        ],
        thumbnail_url: 'http://localhost:8042/instances/orthanc-instance-4/preview',
        reports: [],
      },
      {
        id: '5',
        study_uid: '1.2.826.0.1.3680043.8.498.52345678901234567890123456789012',
        patient_id: 'XRAY001',
        study_date: '2024-01-15',
        modality: 'CR',
        exam_type: 'xray',
        study_description: 'Chest X-Ray PA and Lateral',
        series_description: 'Chest Radiograph',
        status: 'error',
        orthanc_id: 'orthanc-study-5',
        created_at: '2024-01-15T08:45:00Z',
        image_urls: [
          'wadouri:http://localhost:8042/wado?requestType=WADO&studyUID=1.2.826.0.1.3680043.8.498.52345678901234567890123456789012&seriesUID=1.2.826.0.1.3680043.8.498.52345678901234567890123456789012.1&objectUID=1.2.826.0.1.3680043.8.498.52345678901234567890123456789012.1.1&contentType=application/dicom',
        ],
        thumbnail_url: 'http://localhost:8042/instances/orthanc-instance-5/preview',
        reports: [],
      },
    ];
  }
}

export const studyService = new StudyService();