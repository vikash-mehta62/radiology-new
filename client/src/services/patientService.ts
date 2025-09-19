import { apiService } from './api';

export interface Patient {
  id: number;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
  };
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policy_number: string;
    group_number?: string;
  };
  insurance_info?: string;
  medical_history?: string;
  study_count?: number;
  last_visit?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientFile {
  id: number;
  patient_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  description?: string;
  tags?: string;
}

export interface CreatePatientRequest {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  middle_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  medical_record_number?: string;
  insurance_info?: any;
  emergency_contact?: any;
  allergies?: string;
  medical_history?: string;
}

export interface UpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  insurance_info?: string;
  medical_history?: string;
}

export interface PaginatedPatientsResponse {
  patients: Patient[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface FileUploadResponse {
  message: string;
  file: PatientFile;
}

class PatientService {
  // Get all patients with pagination and search
  async getPatients(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<PaginatedPatientsResponse> {
    try {
      const queryParams = new URLSearchParams();

      // Convert frontend pagination params to backend format
      if (params?.page !== undefined && params?.per_page !== undefined) {
        const skip = (params.page - 1) * params.per_page;
        queryParams.append('skip', skip.toString());
        queryParams.append('limit', params.per_page.toString());
      } else if (params?.per_page !== undefined) {
        queryParams.append('limit', params.per_page.toString());
      }
      
      if (params?.search) queryParams.append('search', params.search);
      // Note: Backend doesn't support sort_by and sort_order yet

      const response = await apiService.get<PaginatedPatientsResponse>(
        `/patients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      );

      return response;
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      throw error;
    }
  }

  // Get a specific patient by ID
  async getPatient(patientId: number): Promise<Patient> {
    try {
      const response = await apiService.get<Patient>(`/patients/${patientId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch patient:', error);
      throw error;
    }
  }

  // Create a new patient
  async createPatient(patientData: CreatePatientRequest): Promise<Patient> {
    try {
      const response = await apiService.post<Patient>('/patients', patientData);
      return response;
    } catch (error) {
      console.error('Failed to create patient:', error);
      throw error;
    }
  }

  // Update an existing patient
  async updatePatient(patientId: number, patientData: UpdatePatientRequest): Promise<Patient> {
    try {
      const response = await apiService.put<Patient>(`/patients/${patientId}`, patientData);
      return response;
    } catch (error) {
      console.error('Failed to update patient:', error);
      throw error;
    }
  }

  // Delete a patient
  async deletePatient(patientId: number): Promise<{ message: string }> {
    try {
      const response = await apiService.delete<{ message: string }>(`/patients/${patientId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete patient:', error);
      throw error;
    }
  }

  // Search patients
  async searchPatients(query: string, limit: number = 20): Promise<Patient[]> {
    try {
      const response = await apiService.get<{ patients: Patient[] }>(
        `/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return response.patients;
    } catch (error) {
      console.error('Failed to search patients:', error);
      throw error;
    }
  }

  // Get patient statistics
  async getPatientStatistics(): Promise<any> {
    try {
      const response = await apiService.get('/patients/statistics');
      return response;
    } catch (error) {
      console.error('Failed to fetch patient statistics:', error);
      throw error;
    }
  }

  // ===== FILE UPLOAD METHODS =====

  /**
   * Upload multiple DICOM files as a series for a patient
   */
  async uploadDicomSeries(patientId: string, files: File[], description?: string): Promise<any> {
    try {
      console.log(`📤 Uploading DICOM series for patient ${patientId}:`, files.length, 'files');
      
      const formData = new FormData();
      
      // Append all files with the same 'files' field name for series upload
      files.forEach((file, index) => {
        formData.append('files', file);
        console.log(`📁 Added file ${index + 1}/${files.length}: ${file.name}`);
      });
      
      if (description) {
        formData.append('description', description);
      }

      const endpoint = `/patients/${patientId}/upload/dicom`;
      console.log(`🏥 Uploading ${files.length} files as DICOM series`);

      const response = await apiService.post(
        endpoint,
        formData,
        {
          timeout: 120000, // 2 minute timeout for multiple files
        }
      );

      console.log('✅ Series upload successful:', response);
      
      return {
        success: true,
        message: response.message,
        series_uid: response.series_uid,
        total_files: response.total_files,
        total_slices: response.total_slices,
        study: response.study || response,
        processing_results: response.processing_results
      };

    } catch (error: any) {
      console.error('❌ Series upload failed:', error);
      
      let errorMessage = 'Series upload failed';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload a single file for a patient
   */
  async uploadFile(patientId: string, file: File, description?: string): Promise<any> {
    try {
      console.log(`📤 Uploading file for patient ${patientId}:`, file.name);
      
      // Check if this is a DICOM file
      const isDicomFile = file.name.toLowerCase().includes('.dcm') || 
                         file.name.toLowerCase().includes('.dicom') || 
                         file.type === 'application/dicom' ||
                         file.name.toLowerCase().includes('dicom');

      const formData = new FormData();
      let endpoint: string;
      
      // Use consistent field naming based on endpoint
      if (isDicomFile) {
        // DICOM endpoint expects 'files' field (plural) - matches backend
        formData.append('files', file);
        endpoint = `/patients/${patientId}/upload/dicom`;
        console.log('🏥 Using DICOM upload endpoint for comprehensive processing');
      } else {
        // Standard endpoint expects 'files' field (plural) - matches backend
        formData.append('files', file);
        endpoint = `/patients/${patientId}/upload`;
        console.log('📄 Using standard upload endpoint');
      }
      
      if (description) {
        formData.append('description', description);
      }

      const response = await apiService.post(
        endpoint,
        formData,
        {
          // DO NOT set Content-Type - let browser set boundary automatically
          timeout: 60000, // 60 second timeout for large files
        }
      );

      console.log('✅ Upload successful:', response);
      
      if (isDicomFile && response.study && response.processing_log) {
        // Return enhanced DICOM response with comprehensive processing info
        return {
          message: response.message,
          study: response.study,
          uploaded_files: response.uploaded_files,
          processing_log: response.processing_log,
          workflow_summary: response.workflow_summary,
          success: response.success
        };
      } else {
        // Return standard file upload response
        return {
          message: response.message,
          file: {
            id: parseInt(response.file?.id) || 0,
            patient_id: parseInt(patientId),
            filename: response.file?.filename || file.name,
            original_filename: response.file?.originalFilename || response.file?.filename || file.name,
            file_path: response.fileUrl || '',
            file_type: response.file?.fileType || 'unknown',
            file_size: response.file?.fileSize || file.size,
            upload_date: response.file?.uploadDate || new Date().toISOString(),
            description: response.file?.description || description || '',
            tags: response.file?.fileType || 'uploaded'
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      
      // Enhanced error handling with specific error types
      let errorMessage = 'Upload failed';
      let errorType = 'unknown';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'Upload timed out. Please try again with a smaller file or check your connection.';
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        errorType = 'network';
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.response?.status === 413) {
        errorType = 'file_too_large';
        errorMessage = 'File is too large. Maximum file size is 100MB.';
      } else if (error.response?.status === 415) {
        errorType = 'unsupported_format';
        errorMessage = 'Unsupported file format. Please upload DICOM (.dcm) or supported image files.';
      } else if (error.response?.status >= 500) {
        errorType = 'server_error';
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).type = errorType;
      (enhancedError as any).originalError = error;
      
      throw enhancedError;
    }
  }

  /**
   * Upload multiple files for a patient
   */
  async uploadFiles(patientId: string, files: File[], description?: string): Promise<FileUploadResponse[]> {
    const results: FileUploadResponse[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(patientId, file, description);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Get uploaded files for a patient - Production implementation
   */
  async getPatientFiles(patientId: number | string): Promise<PatientFile[]> {
    try {
      console.log(`📁 Fetching files for patient ${patientId}`);

      const response = await apiService.get<PatientFile[]>(`/patients/${patientId}/files`);

      console.log(`✅ Found ${response.length} files for patient ${patientId}`);
      return response;

    } catch (error: any) {
      console.error('❌ Failed to fetch patient files:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: number): Promise<{ message: string }> {
    try {
      const response = await apiService.delete<{ message: string }>(`/files/${fileId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get studies for a patient
   */
  async getPatientStudies(patientId: string): Promise<{ studies: any[]; total_studies: number; patient_name?: string }> {
    try {
      console.log(`📊 Fetching studies for patient ${patientId}`);
      const response = await apiService.get<{
        patient_id: string;
        patient_name: string;
        studies: any[];
        total_studies: number;
      }>(`/patients/${patientId}/studies`);
      
      return {
        studies: response.studies || [],
        total_studies: response.total_studies || 0,
        patient_name: response.patient_name
      };
    } catch (error) {
      console.error('Failed to fetch patient studies:', error);
      return {
        studies: [],
        total_studies: 0
      };
    }
  }
}

export const patientService = new PatientService();