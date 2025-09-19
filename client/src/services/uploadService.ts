import { patientService } from './patientService';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  percentage: number;
  loaded: number;
  total: number;
}

export interface UploadResult {
  success: boolean;
  message: string;
  fileName: string;
  uploadedFiles: Array<{
    filename: string;
    size: number;
    upload_time: string;
  }>;
  totalFiles: number;
  error?: string;
  fileId?: number;
  studyDetails?: {
    study_id: string;
    study_uid: string;
    modality: string;
    description: string;
    patient_info: {
      name: string;
      patient_id: string;
      date_of_birth?: string;
      gender?: string;
    };
    study_statistics: {
      total_files: number;
      total_size_bytes: number;
      total_size_mb: number;
      series_count: number;
      instance_count: number;
    };
    dicom_files: Array<{
      filename: string;
      file_id: string;
      size_bytes: number;
      metadata: {
        SOPInstanceUID: string;
        StudyInstanceUID: string;
        SeriesInstanceUID: string;
        Modality: string;
        StudyDate: string;
        StudyTime: string;
        PatientName: string;
        PatientID: string;
        StudyDescription: string;
        SeriesDescription: string;
        ImageType: string[];
        SliceThickness: string;
        PixelSpacing: string[];
        WindowCenter: string;
        WindowWidth: string;
      };
    }>;
    processing_info: {
      upload_duration_ms: number;
      processing_steps: number;
      status: string;
      quality_checks: {
        file_integrity: string;
        dicom_compliance: string;
        metadata_validation: string;
      };
    };
    workflow_status: string;
  };
  processingLog?: Array<{
    step: string;
    status: string;
    message: string;
    timestamp: string;
  }>;
  workflowSummary?: {
    total_steps: number;
    processing_time_ms: number;
    files_processed: number;
    total_size_mb: number;
    status: string;
    next_steps: string[];
  };
}

class UploadService {
  /**
   * Upload a single file with progress tracking
   */
  async uploadFile(
    patientId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Report initial progress
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          status: 'uploading',
          percentage: 0,
          loaded: 0,
          total: file.size
        });
      }

      // Use patientService to upload the file
      const result = await patientService.uploadFile(patientId, file);

      // Report completion
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 100,
          status: 'completed',
          percentage: 100,
          loaded: file.size,
          total: file.size
        });
      }

      // Check if this is a DICOM upload with comprehensive response
      const isDicomFile = file.name.toLowerCase().includes('.dcm') || 
                         file.name.toLowerCase().includes('.dicom') || 
                         file.type === 'application/dicom';
      
      if (isDicomFile && result.study && result.processing_log && result.workflow_summary) {
        // Enhanced DICOM upload response
        return {
          success: true,
          message: result.message,
          fileName: file.name,
          uploadedFiles: result.uploaded_files?.map((f: any) => ({
            filename: f.filename,
            size: f.file_size,
            upload_time: f.uploaded_at
          })) || [],
          totalFiles: result.uploaded_files?.length || 1,
          fileId: result.uploaded_files?.[0]?.file_id,
          studyDetails: result.study,
          processingLog: result.processing_log,
          workflowSummary: result.workflow_summary
        };
      } else {
        // Standard file upload response
        return {
          success: true,
          message: result.message,
          fileName: file.name,
          uploadedFiles: [{
            filename: result.file?.filename || file.name,
            size: result.file?.file_size || file.size,
            upload_time: result.file?.upload_date || new Date().toISOString()
          }],
          totalFiles: 1,
          fileId: result.file?.id
        };
      }

    } catch (error: any) {
      // Report error
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          status: 'error',
          percentage: 0,
          loaded: 0,
          total: file.size
        });
      }

      return {
        success: false,
        message: 'Upload failed',
        fileName: file.name,
        uploadedFiles: [],
        totalFiles: 0,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Upload multiple files with progress tracking
   */
  async uploadFiles(
    patientId: string,
    files: File[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(patientId, file, onProgress);
      results.push(result);
    }

    return results;
  }
}

export const uploadService = new UploadService();