// Core types for Kiro-mini frontend

export interface Study {
  id: string;
  study_uid: string;
  patient_id: string;
  patient_info?: PatientInfo;
  study_date?: string;
  modality: string;
  exam_type: string;
  study_description?: string;
  description?: string;
  series_description?: string;
  study_time?: string;
  workflow_status?: string;
  status: StudyStatus;
  orthanc_id?: string;
  created_at: string;
  dicom_files?: string;
  filename?: string;
  original_filename?: string;
  dicom_content_urls?: string;
  updated_at?: string;
  image_urls?: string[];
  thumbnail_url?: string;
  preview_url?: string;
  file_size?: number;
  reports?: ReportSummary[];
  report_count?: number;
  latest_report_status?: string;
  latest_report_date?: string;
  dicom_url?: string;
  study_statistics?: StudyStatistics;
  processing_info?: ProcessingInfo;
  processed_images?: Record<string, string>;
  processing_status?: string;
  dicom_metadata?: Record<string, any>;
}

export type StudyStatus = 'received' | 'processing' | 'completed' | 'billed' | 'error';

export interface StudyStatistics {
  total_files?: number;
  total_size_mb?: number;
  series_count?: number;
  instance_count?: number;
}

export interface ProcessingInfo {
  upload_duration_ms?: number;
  processing_steps?: string;
  status?: string;
}

export interface ReportSummary {
  report_id: string;
  status: ReportStatus;
  created_at: string;
  finalized_at?: string;
  ai_generated: boolean;
}

export interface Report {
  id: string;
  report_id: string;
  study_uid: string;
  radiologist_id?: string;
  exam_type: string;
  findings?: string;
  measurements?: Record<string, MeasurementValue>;
  impressions?: string;
  recommendations?: string;
  diagnosis_codes?: string[];
  cpt_codes?: string[];
  status: ReportStatus;
  ai_confidence?: number;
  ai_generated: boolean;
  created_at: string;
  updated_at?: string;
  finalized_at?: string;
}

export type ReportStatus = 'draft' | 'final' | 'billed';

export interface MeasurementValue {
  value: number;
  unit: string;
  normal_range?: string;
  abnormal?: boolean;
  severity?: string;
}

export interface Superbill {
  id: string;
  superbill_id: string;
  report_id: string;
  patient_info: PatientInfo;
  services: ServiceLine[];
  diagnoses: DiagnosisCode[];
  total_charges: number;
  x12_837p_data?: Record<string, any>;
  provider_npi: string;
  facility_name: string;
  facility_address?: string;
  validated: boolean;
  validation_errors?: string[];
  submitted: boolean;
  submission_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface PatientInfo {
  patient_id: string;
  name: string;
  dob?: string;
  date_of_birth?: string;
  gender: string;
  address?: string;
  insurance?: Record<string, any>;
}

export interface Patient {
  patient_id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  medical_record_number?: string;
  active?: boolean;
  created_at?: string;
}

export interface ServiceLine {
  cpt_code: string;
  description: string;
  units: number;
  charge: number;
  modifiers?: string[];
}

export interface DiagnosisCode {
  icd10_code: string;
  description: string;
  primary: boolean;
}

export interface CodeSuggestion {
  icd10_code?: string;
  cpt_code?: string;
  description: string;
  confidence: number;
  category: string;
  primary_suitable?: boolean;
  reason?: string;
  clinical_indicators?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  compliance_score: number;
  reimbursement_risk: number;
  estimated_reimbursement?: {
    medicare: number;
    commercial_120: number;
    commercial_150: number;
  };
  validation_time_ms?: number;
  validated_at?: string;
}

export interface WorkflowStatus {
  workflow_id: string;
  study_uid: string;
  status: 'ready_for_review' | 'finalizing' | 'completed' | 'error';
  report_status: ReportStatus;
  elapsed_time: number;
  target_time: number;
  time_remaining: number;
  on_track: boolean;
}

export interface AIJobStatus {
  job_id: string;
  study_uid: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result_data?: any;
  confidence_score?: number;
  processing_time?: number;
  error_message?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface CodeSuggestionsMessage extends WebSocketMessage {
  type: 'code_suggestions';
  suggestions: CodeSuggestion[];
  exam_type: string;
  findings_length: number;
  generated_at: string;
}

export interface ValidationResultMessage extends WebSocketMessage {
  type: 'validation_result';
  validation: ValidationResult;
  request_id?: string;
}

// New DICOM WebSocket message types
export interface StudyProcessingMessage extends WebSocketMessage {
  type: 'study_processing';
  study_uid: string;
  status: 'received' | 'processing' | 'completed' | 'error';
  progress: number;
  stage: string;
  estimated_completion?: string;
  error_message?: string;
}

export interface ImageLoadingMessage extends WebSocketMessage {
  type: 'image_loading';
  study_uid: string;
  series_uid?: string;
  image_uid?: string;
  progress: number;
  loaded_images: number;
  total_images: number;
  cache_status: 'loading' | 'cached' | 'error';
}

export interface AIProcessingMessage extends WebSocketMessage {
  type: 'ai_processing';
  job_id: string;
  study_uid: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  confidence_score?: number;
  processing_time?: number;
  result_preview?: any;
}

export interface SystemNotificationMessage extends WebSocketMessage {
  type: 'system_notification';
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action_url?: string;
  auto_dismiss?: boolean;
  dismiss_after?: number;
}

export interface WorkflowUpdateMessage extends WebSocketMessage {
  type: 'workflow_update';
  workflow_id: string;
  study_uid: string;
  status: 'ready_for_review' | 'finalizing' | 'completed' | 'error';
  elapsed_time: number;
  target_time: number;
  on_track: boolean;
  next_action?: string;
}

export interface UserActivityMessage extends WebSocketMessage {
  type: 'user_activity';
  user_id: string;
  activity: 'study_opened' | 'report_started' | 'report_finalized' | 'user_joined' | 'user_left';
  study_uid?: string;
  report_id?: string;
  timestamp: string;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Form types
export interface ReportFormData {
  findings: string;
  measurements: Record<string, MeasurementValue>;
  impressions: string;
  recommendations: string;
  diagnosis_codes: string[];
  cpt_codes: string[];
}

export interface MeasurementFormData {
  [key: string]: {
    value: string;
    unit: string;
  };
}

// UI state types
export interface UIState {
  loading: boolean;
  error?: string;
  selectedStudy?: Study;
  selectedReport?: Report;
  workflowTimer?: WorkflowStatus;
}

// User and authentication types
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  full_name?: string;
  npi?: string;
  specialty?: string;
}

export type UserRole = 'radiologist' | 'technologist' | 'admin' | 'billing';

export interface AuthState {
  user?: User;
  token?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

// Configuration types
export interface AppConfig {
  apiBaseUrl: string;
  orthancUrl: string;
  wsUrl: string;
  features: {
    aiAssist: boolean;
    realtimeBilling: boolean;
    workflowTimer: boolean;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Statistics and metrics types
export interface DashboardStats {
  studies: {
    total: number;
    by_status: Record<StudyStatus, number>;
    recent: number;
  };
  reports: {
    total: number;
    ai_generated: number;
    manual: number;
    ai_percentage: number;
  };
  workflow: {
    average_completion_time: number;
    target_met_rate: number;
    efficiency_score: number;
  };
}

export interface PerformanceMetrics {
  response_times: {
    api_average: number;
    ai_processing: number;
    validation: number;
  };
  success_rates: {
    api_calls: number;
    ai_jobs: number;
    validations: number;
  };
  usage: {
    active_users: number;
    studies_processed: number;
    reports_generated: number;
  };
}

// Enhanced DICOM Error Types
export interface DicomError {
  type: 'network' | 'parsing' | 'memory' | 'timeout' | 'authentication' | 'not_found' | 'corrupted';
  code: string;
  message: string;
  imageId?: string;
  studyUid?: string;
  seriesUid?: string;
  instanceUid?: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  requestId?: string;
  details?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface LoadingAttempt {
  attempt: number;
  timestamp: number;
  error?: DicomError;
  duration?: number;
  success: boolean;
}

export interface DicomLoadingState {
  imageId: string;
  status: 'idle' | 'loading' | 'retrying' | 'failed' | 'success';
  attempts: LoadingAttempt[];
  lastError?: DicomError;
  retryConfig: RetryConfig;
  circuitBreakerOpen: boolean;
  fallbackUsed: boolean;
}