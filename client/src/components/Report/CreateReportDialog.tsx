import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Grid,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Assignment as ReportIcon,
  AutoAwesome as AIIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  CloudOff as OfflineIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Edit as SignatureIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  History as HistoryIcon,
  CheckCircle as CheckIcon,
  Schedule as DraftIcon,
  Visibility as ReviewIcon,
  ExpandMore as ExpandMoreIcon,
  Description as TemplateIcon,
  VoiceChat as VoiceIcon,
  PictureAsPdf as PdfIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { reportService, CreateReportRequest } from '../../services/reportService';
import { enhancedReportService, ReportPostCreationOptions } from '../../services/enhancedReportService';
import { auditService } from '../../services/auditService';
import PostCreationOptionsPanel from './PostCreationOptionsPanel';
import type { Study } from '../../types';

interface CreateReportDialogProps {
  open: boolean;
  onClose: () => void;
  study: Study;
  onReportCreated?: (reportId: string) => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  modality: string;
  sections: {
    clinical_history: string;
    technique: string;
    findings: string;
    impression: string;
    recommendations: string;
  };
}

interface ReportData {
  id: string;
  study_uid: string;
  patient_id: string;
  patient_name: string;
  patient_dob: string;
  patient_gender: string;
  study_date: string;
  exam_type: string;
  status: 'draft' | 'under_review' | 'finalized' | 'signed';
  created_at: string;
  updated_at: string;
  doctor_name: string;
  doctor_signature?: string;
  doctor_license: string;
  doctor_credentials: string;
  office_name: string;
  office_address: string;
  office_phone: string;
  office_fax: string;
  clinical_history: string;
  technique: string;
  findings: string;
  detailed_findings: string;
  measurements: string;
  comparison: string;
  impression: string;
  recommendations: string;
  follow_up: string;
  critical_findings: string;
  ai_generated: boolean;
  report_priority: 'routine' | 'urgent' | 'stat';
  referring_physician: string;
  indication: string;
  version: number;
  offline_created: boolean;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'ct_chest',
    name: 'CT Chest',
    modality: 'CT',
    sections: {
      clinical_history: 'Clinical indication for chest CT examination.',
      technique: 'Axial CT images of the chest were obtained without contrast enhancement.',
      findings: 'The lungs are clear bilaterally. No focal consolidation, pleural effusion, or pneumothorax. Heart size is normal. Mediastinal structures are unremarkable.',
      impression: 'Normal chest CT examination.',
      recommendations: 'No immediate follow-up required unless clinically indicated.'
    }
  },
  {
    id: 'mri_brain',
    name: 'MRI Brain',
    modality: 'MR',
    sections: {
      clinical_history: 'Clinical indication for brain MRI examination.',
      technique: 'Multiplanar MRI of the brain was performed using T1, T2, and FLAIR sequences.',
      findings: 'Normal brain parenchyma. No evidence of acute infarction, hemorrhage, or mass lesion. Ventricular system is normal in size and configuration.',
      impression: 'Normal brain MRI examination.',
      recommendations: 'No immediate follow-up required unless clinically indicated.'
    }
  },
  {
    id: 'xray_chest',
    name: 'X-Ray Chest',
    modality: 'CR',
    sections: {
      clinical_history: 'Clinical indication for chest X-ray examination.',
      technique: 'Frontal and lateral chest radiographs were obtained.',
      findings: 'The lungs are clear. Heart size is normal. No acute cardiopulmonary abnormality.',
      impression: 'Normal chest radiograph.',
      recommendations: 'No immediate follow-up required unless clinically indicated.'
    }
  }
];

const CreateReportDialog: React.FC<CreateReportDialogProps> = ({
  open,
  onClose,
  study,
  onReportCreated
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isListening, setIsListening] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  
  // Report data state
  const [reportData, setReportData] = useState<ReportData>({
    id: `report_${Date.now()}`,
    study_uid: study.study_uid,
    patient_id: study.patient_id,
    patient_name: study.patient_info?.name || 'Unknown Patient',
    patient_dob: study.patient_info?.dob || study.patient_info?.date_of_birth || 'Unknown',
    patient_gender: study.patient_info?.gender || 'Unknown',
    study_date: study.study_date || new Date().toISOString().split('T')[0],
    exam_type: study.modality || 'Unknown',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    doctor_name: 'Dr. John Smith',
    doctor_license: 'MD123456',
    doctor_credentials: 'MD, Board Certified Radiologist',
    office_name: 'KIRO Medical Center - Department of Radiology',
    office_address: '123 Medical Drive, Healthcare City, HC 12345',
    office_phone: '(555) 123-4567',
    office_fax: '(555) 123-4568',
    clinical_history: '',
    technique: '',
    findings: '',
    detailed_findings: '',
    measurements: '',
    comparison: '',
    impression: '',
    recommendations: '',
    follow_up: '',
    critical_findings: '',
    ai_generated: false,
    report_priority: 'routine',
    referring_physician: '',
    indication: '',
    version: 1,
    offline_created: false
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const signatureRef = useRef<SignatureCanvas>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Post-creation options state
  const [postCreationOptions, setPostCreationOptions] = useState<ReportPostCreationOptions>({
    autoSave: true,
    sendToPhysician: false,
    sendToPatient: false,
    sendToReferringDoctor: false,
    exportToPDF: false,
    addToPatientRecord: true,
    notifyStakeholders: false,
    recipients: []
  });

  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Voice recognition setup
  const [recognition, setRecognition] = useState<any>(null);
  const [currentField, setCurrentField] = useState<string>('');

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript && currentField) {
          setReportData(prev => ({
            ...prev,
            [currentField]: prev[currentField as keyof ReportData] + ' ' + finalTranscript,
            updated_at: new Date().toISOString()
          }));
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }

    // Monitor online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentField]);

  const handleFieldChange = (field: keyof ReportData, value: string | boolean) => {
    setReportData(prev => ({
      ...prev,
      [field]: value,
      updated_at: new Date().toISOString()
    }));
  };

  // Auto-save to localStorage
  useEffect(() => {
    if (reportData.id) {
      localStorage.setItem(`report_${reportData.id}`, JSON.stringify(reportData));
    }
  }, [reportData]);

  const handleTemplateSelect = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setReportData(prev => ({
        ...prev,
        exam_type: template.name,
        clinical_history: template.sections.clinical_history,
        technique: template.sections.technique,
        findings: template.sections.findings,
        impression: template.sections.impression,
        recommendations: template.sections.recommendations,
        updated_at: new Date().toISOString()
      }));
      setSelectedTemplate(templateId);
    }
  };

  const startVoiceRecognition = (field: string) => {
    if (recognition && !isListening) {
      setCurrentField(field);
      setIsListening(true);
      recognition.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      setCurrentField('');
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Medical Report - ${reportData.patient_name}</title>
          <style>
            @page { size: A4; margin: 1in; }
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .office-name { font-size: 18pt; font-weight: bold; margin-bottom: 5px; }
            .office-info { font-size: 10pt; margin-bottom: 3px; }
            .report-title { font-size: 16pt; font-weight: bold; margin: 15px 0; text-decoration: underline; }
            .patient-info { border: 1px solid #000; margin-bottom: 20px; }
            .patient-row { display: flex; }
            .patient-cell { padding: 8px; border-bottom: 1px solid #ccc; flex: 1; }
            .patient-label { font-weight: bold; background-color: #f5f5f5; }
            .section { margin-bottom: 15px; page-break-inside: avoid; }
            .section-title { font-size: 14pt; font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
            .section-content { margin-left: 10px; text-align: justify; }
            .critical-findings { border: 2px solid #ff0000; background-color: #fff5f5; padding: 10px; margin: 10px 0; }
            .critical-title { color: #ff0000; font-weight: bold; font-size: 14pt; margin-bottom: 5px; }
            .signature-section { margin-top: 30px; page-break-inside: avoid; }
            .signature-line { border-bottom: 1px solid #000; width: 300px; height: 50px; margin: 20px 0 5px 0; }
            .doctor-info { margin-top: 20px; font-size: 11pt; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="office-name">${reportData.office_name || 'RADIOLOGY ASSOCIATES'}</div>
            <div class="office-info">${reportData.office_address || '123 Medical Center Drive, Suite 100'}</div>
            <div class="office-info">Phone: ${reportData.office_phone || '(555) 123-4567'} | Fax: ${reportData.office_fax || '(555) 123-4568'}</div>
            <div class="report-title">RADIOLOGY REPORT</div>
          </div>
          
          <div class="patient-info">
            <div class="patient-row">
              <div class="patient-cell patient-label">Patient:</div>
              <div class="patient-cell">${reportData.patient_name || 'N/A'}</div>
              <div class="patient-cell patient-label">ID:</div>
              <div class="patient-cell">${reportData.patient_id || 'N/A'}</div>
            </div>
            <div class="patient-row">
              <div class="patient-cell patient-label">DOB:</div>
              <div class="patient-cell">${reportData.patient_dob || 'N/A'}</div>
              <div class="patient-cell patient-label">Gender:</div>
              <div class="patient-cell">${reportData.patient_gender || 'N/A'}</div>
            </div>
            <div class="patient-row">
              <div class="patient-cell patient-label">Study Date:</div>
              <div class="patient-cell">${reportData.study_date || new Date().toLocaleDateString()}</div>
              <div class="patient-cell patient-label">Report Date:</div>
              <div class="patient-cell">${new Date().toLocaleDateString()}</div>
            </div>
            <div class="patient-row">
              <div class="patient-cell patient-label">Exam:</div>
              <div class="patient-cell">${reportData.exam_type || 'N/A'}</div>
              <div class="patient-cell patient-label">Priority:</div>
              <div class="patient-cell">${reportData.report_priority?.toUpperCase() || 'ROUTINE'}</div>
            </div>
          </div>
          
          ${reportData.indication ? `<div class="section"><div class="section-title">CLINICAL INDICATION:</div><div class="section-content">${reportData.indication}</div></div>` : ''}
          ${reportData.clinical_history ? `<div class="section"><div class="section-title">CLINICAL HISTORY:</div><div class="section-content">${reportData.clinical_history}</div></div>` : ''}
          ${reportData.technique ? `<div class="section"><div class="section-title">TECHNIQUE:</div><div class="section-content">${reportData.technique}</div></div>` : ''}
          ${reportData.comparison ? `<div class="section"><div class="section-title">COMPARISON:</div><div class="section-content">${reportData.comparison}</div></div>` : ''}
          ${reportData.findings ? `<div class="section"><div class="section-title">FINDINGS:</div><div class="section-content">${reportData.findings}</div></div>` : ''}
          ${reportData.detailed_findings ? `<div class="section"><div class="section-title">DETAILED FINDINGS:</div><div class="section-content">${reportData.detailed_findings}</div></div>` : ''}
          ${reportData.measurements ? `<div class="section"><div class="section-title">MEASUREMENTS:</div><div class="section-content">${reportData.measurements}</div></div>` : ''}
          ${reportData.critical_findings ? `<div class="critical-findings"><div class="critical-title">*** CRITICAL FINDINGS ***</div><div>${reportData.critical_findings}</div></div>` : ''}
          ${reportData.impression ? `<div class="section"><div class="section-title">IMPRESSION:</div><div class="section-content">${reportData.impression}</div></div>` : ''}
          ${reportData.recommendations ? `<div class="section"><div class="section-title">RECOMMENDATIONS:</div><div class="section-content">${reportData.recommendations}</div></div>` : ''}
          ${reportData.follow_up ? `<div class="section"><div class="section-title">FOLLOW-UP:</div><div class="section-content">${reportData.follow_up}</div></div>` : ''}
          
          <div class="signature-section">
            <div class="section-title">ELECTRONICALLY SIGNED BY:</div>
            <div class="signature-line"></div>
            <div class="doctor-info">
              <strong>${reportData.doctor_name || 'Dr. [Name]'}</strong><br>
              ${reportData.doctor_credentials || 'MD, Board Certified Radiologist'}<br>
              License #: ${reportData.doctor_license || 'N/A'}<br>
              Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleStatusChange = (status: ReportData['status']) => {
    setReportData(prev => ({
      ...prev,
      status,
      updated_at: new Date().toISOString()
    }));
  };

  const saveSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setReportData(prev => ({
        ...prev,
        doctor_signature: signatureData,
        status: 'signed',
        updated_at: new Date().toISOString()
      }));
      setShowSignature(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  // Handler for post-creation option changes
  const handlePostCreationOptionChange = (option: keyof typeof postCreationOptions, value: boolean | string | string[]) => {
    setPostCreationOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // Auto-save functionality
  const setupAutoSave = () => {
    if (autoSaveEnabled) {
      const interval = setInterval(() => {
        // Save current report data to local storage
        localStorage.setItem(`report_draft_${study?.id || 'new'}`, JSON.stringify({
          ...reportData,
          lastSaved: new Date().toISOString()
        }));
        setLastSaved(new Date()); // Fix: Use Date object instead of string
      }, 30000); // Auto-save every 30 seconds

      return interval;
    }
    return null;
  };

  const stopAutoSave = (interval: NodeJS.Timeout | null) => {
    if (interval) {
      clearInterval(interval);
    }
  };

  // Set up auto-save when enabled
  useEffect(() => {
    let autoSaveInterval: NodeJS.Timeout | null = null;
    
    if (autoSaveEnabled) {
      autoSaveInterval = setupAutoSave();
    }

    return () => {
      if (autoSaveInterval) {
        stopAutoSave(autoSaveInterval);
      }
    };
  }, [autoSaveEnabled, reportData]);

  const generatePDF = async () => {
    if (reportContentRef.current) {
      // Create a comprehensive professional report HTML
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Medical Imaging Report</title>
          <style>
            @page {
              size: A4;
              margin: 1in;
              @top-center {
                content: "CONFIDENTIAL MEDICAL REPORT";
                font-size: 10px;
                color: #666;
              }
              @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #666;
              }
            }
            
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 0;
            }
            
            .letterhead {
              text-align: center;
              border-bottom: 2px solid #2c5aa0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .letterhead h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              color: #2c5aa0;
            }
            
            .letterhead .subtitle {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            
            .letterhead .contact {
              font-size: 10px;
              color: #666;
              margin-top: 10px;
            }
            
            .report-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              border: 1px solid #ccc;
              padding: 15px;
              background-color: #f9f9f9;
            }
            
            .patient-info, .study-info {
              flex: 1;
            }
            
            .patient-info h3, .study-info h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              font-weight: bold;
              color: #2c5aa0;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            
            .info-row {
              display: flex;
              margin-bottom: 5px;
            }
            
            .info-label {
              font-weight: bold;
              width: 120px;
              color: #333;
            }
            
            .info-value {
              flex: 1;
              color: #000;
            }
            
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #2c5aa0;
              border-bottom: 2px solid #2c5aa0;
              padding-bottom: 5px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            
            .section-content {
              text-align: justify;
              line-height: 1.6;
              margin-left: 10px;
            }
            
            .critical-alert {
              background-color: #ffebee;
              border: 2px solid #f44336;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            
            .critical-alert .alert-title {
              font-weight: bold;
              color: #f44336;
              font-size: 14px;
              margin-bottom: 10px;
            }
            
            .signature-section {
              margin-top: 40px;
              page-break-inside: avoid;
            }
            
            .signature-block {
              border: 1px solid #000;
              padding: 20px;
              margin: 20px 0;
              background-color: #f9f9f9;
            }
            
            .signature-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            
            .signature-line {
              border-bottom: 1px solid #000;
              width: 300px;
              height: 50px;
              margin: 20px 0;
              position: relative;
            }
            
            .signature-text {
              position: absolute;
              bottom: -20px;
              left: 0;
              font-size: 10px;
              color: #666;
            }
            
            .footer {
              margin-top: 50px;
              border-top: 1px solid #ccc;
              padding-top: 20px;
              font-size: 10px;
              color: #666;
              text-align: center;
            }
            
            .disclaimer {
              font-style: italic;
              margin-top: 20px;
              padding: 10px;
              background-color: #f5f5f5;
              border-left: 4px solid #2c5aa0;
            }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <h1>${reportData.office_name}</h1>
            <div class="subtitle">Advanced Medical Imaging Services</div>
            <div class="contact">
              ${reportData.office_address} | Phone: ${reportData.office_phone} | Fax: ${reportData.office_fax}
            </div>
          </div>
          
          <div class="report-header">
            <div class="patient-info">
              <h3>PATIENT INFORMATION</h3>
              <div class="info-row">
                <div class="info-label">Patient ID:</div>
                <div class="info-value">${study.patient_id}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Study Date:</div>
                <div class="info-value">${study.study_date ? new Date(study.study_date).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Report Date:</div>
                <div class="info-value">${new Date().toLocaleDateString()}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Priority:</div>
                <div class="info-value">${reportData.report_priority.toUpperCase()}</div>
              </div>
            </div>
            
            <div class="study-info">
              <h3>STUDY INFORMATION</h3>
              <div class="info-row">
                <div class="info-label">Study UID:</div>
                <div class="info-value">${study.study_uid}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Modality:</div>
                <div class="info-value">${study.modality}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Exam Type:</div>
                <div class="info-value">${reportData.exam_type}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Referring MD:</div>
                <div class="info-value">${reportData.referring_physician || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          ${reportData.indication ? `
          <div class="section">
            <div class="section-title">Clinical Indication</div>
            <div class="section-content">${reportData.indication}</div>
          </div>
          ` : ''}
          
          ${reportData.clinical_history ? `
          <div class="section">
            <div class="section-title">Clinical History</div>
            <div class="section-content">${reportData.clinical_history}</div>
          </div>
          ` : ''}
          
          ${reportData.technique ? `
          <div class="section">
            <div class="section-title">Technique</div>
            <div class="section-content">${reportData.technique}</div>
          </div>
          ` : ''}
          
          ${reportData.comparison ? `
          <div class="section">
            <div class="section-title">Comparison</div>
            <div class="section-content">${reportData.comparison}</div>
          </div>
          ` : ''}
          
          ${reportData.findings ? `
          <div class="section">
            <div class="section-title">Findings</div>
            <div class="section-content">${reportData.findings}</div>
          </div>
          ` : ''}
          
          ${reportData.detailed_findings ? `
          <div class="section">
            <div class="section-title">Detailed Findings</div>
            <div class="section-content">${reportData.detailed_findings}</div>
          </div>
          ` : ''}
          
          ${reportData.measurements ? `
          <div class="section">
            <div class="section-title">Measurements</div>
            <div class="section-content">${reportData.measurements}</div>
          </div>
          ` : ''}
          
          ${reportData.critical_findings ? `
          <div class="critical-alert">
            <div class="alert-title">CRITICAL FINDINGS</div>
            <div>${reportData.critical_findings}</div>
          </div>
          ` : ''}
          
          ${reportData.impression ? `
          <div class="section">
            <div class="section-title">Impression</div>
            <div class="section-content">${reportData.impression}</div>
          </div>
          ` : ''}
          
          ${reportData.recommendations ? `
          <div class="section">
            <div class="section-title">Recommendations</div>
            <div class="section-content">${reportData.recommendations}</div>
          </div>
          ` : ''}
          
          ${reportData.follow_up ? `
          <div class="section">
            <div class="section-title">Follow-up</div>
            <div class="section-content">${reportData.follow_up}</div>
          </div>
          ` : ''}
          
          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-info">
                <div><strong>Radiologist:</strong> ${reportData.doctor_name}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
              </div>
              <div class="signature-info">
                <div><strong>License:</strong> ${reportData.doctor_license}</div>
                <div><strong>Credentials:</strong> ${reportData.doctor_credentials}</div>
              </div>
              ${reportData.doctor_signature ? `
                <div style="margin: 20px 0;">
                  <img src="${reportData.doctor_signature}" alt="Doctor Signature" style="max-height: 60px;" />
                </div>
              ` : `
                <div class="signature-line">
                  <div class="signature-text">Radiologist Signature</div>
                </div>
              `}
            </div>
          </div>
          
          <div class="disclaimer">
            <strong>DISCLAIMER:</strong> This report is confidential and intended solely for the use of the referring physician and patient. 
            Any reproduction or distribution without written consent is prohibited. The findings and recommendations in this report 
            are based on the imaging study performed and clinical information provided.
          </div>
          
          <div class="footer">
            Report generated on ${new Date().toLocaleString()} | ${reportData.office_name}
            <br>
            This is an electronically generated report. No signature is required for validity.
          </div>
        </body>
        </html>
      `;
      
      // Create a temporary div to render the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportHTML;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '210mm';
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);
      
      try {
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`Medical_Report_${reportData.patient_id}_${new Date().toISOString().split('T')[0]}.pdf`);
      } finally {
        document.body.removeChild(tempDiv);
      }
    }
  };

  const handleCreateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOffline) {
        // Save offline
        const offlineReports = JSON.parse(localStorage.getItem('offline_reports') || '[]');
        const offlineReport = {
          ...reportData,
          offline_created: true,
          updated_at: new Date().toISOString()
        };
        offlineReports.push(offlineReport);
        localStorage.setItem('offline_reports', JSON.stringify(offlineReports));
        
        if (onReportCreated) {
          onReportCreated(reportData.id);
        }
        onClose();
        return;
      }

      // Online creation with enhanced features
      const reportRequest: CreateReportRequest = {
        study_uid: study.study_uid,
        patient_id: study.patient_id,
        exam_type: reportData.exam_type,
        ai_generated: reportData.ai_generated
      };

      let report;
      if (reportData.ai_generated) {
        // Use enhanced service for AI reports
        report = await enhancedReportService.createReportWithEnhancements({
          ...reportRequest,
          postCreationOptions
        });
      } else {
        // Use enhanced service for regular reports
        report = await enhancedReportService.createReportWithEnhancements({
          ...reportRequest,
          postCreationOptions
        });
      }

      console.log('✅ Enhanced report created:', report);
      
      // Set up auto-save if enabled
      if (autoSaveEnabled && report.report_id) {
        setupAutoSave(); // Fix: Remove the parameter
      }

      // Show success message with post-creation actions
      setError(null);
      
      // Download PDF if requested
      if (postCreationOptions.exportToPDF) {
        await generatePDF();
      }

      if (onReportCreated) {
        onReportCreated(report.report_id);
      }
      onClose();

    } catch (error) {
      console.error('❌ Failed to create report:', error);
      setError(error instanceof Error ? error.message : 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      stopVoiceRecognition();
      onClose();
    }
  };

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
          height: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportIcon color="primary" />
          <Typography variant="h6" component="div">
            Medical Report Creation
          </Typography>
          {isOffline && (
            <Chip 
              icon={<OfflineIcon />} 
              label="Offline Mode" 
              color="warning" 
              size="small" 
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={reportData.status.replace('_', ' ').toUpperCase()} 
            color={
              reportData.status === 'signed' ? 'success' :
              reportData.status === 'finalized' ? 'info' :
              reportData.status === 'under_review' ? 'warning' : 'default'
            }
            size="small"
          />
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Report Content" />
          <Tab label="Templates" />
          <Tab label="Signature" />
          <Tab label="Post-Creation" />
          <Tab label="Export" />
        </Tabs>

        <Box sx={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {/* Report Content Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 2 }}>
              {/* Study Information */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Study Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2"><strong>Patient ID:</strong> {study.patient_id}</Typography>
                      <Typography variant="body2"><strong>Study UID:</strong> {study.study_uid.substring(0, 30)}...</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2"><strong>Modality:</strong> {study.modality}</Typography>
                      <Typography variant="body2"><strong>Date:</strong> {study.study_date}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Report Status */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Report Status</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {(['draft', 'under_review', 'finalized', 'signed'] as const).map((status) => (
                      <Button
                        key={status}
                        variant={reportData.status === status ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleStatusChange(status)}
                        startIcon={
                          status === 'draft' ? <DraftIcon /> :
                          status === 'under_review' ? <ReviewIcon /> :
                          status === 'finalized' ? <CheckIcon /> : <SignatureIcon />
                        }
                      >
                        {status.replace('_', ' ').toUpperCase()}
                      </Button>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              {/* Report Sections */}
              <div ref={reportContentRef}>
                {/* Basic Information */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Basic Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Report Priority</InputLabel>
                          <Select
                            value={reportData.report_priority}
                            onChange={(e) => handleFieldChange('report_priority', e.target.value)}
                            label="Report Priority"
                          >
                            <MenuItem value="routine">Routine</MenuItem>
                            <MenuItem value="urgent">Urgent</MenuItem>
                            <MenuItem value="stat">STAT</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Referring Physician"
                          value={reportData.referring_physician}
                          onChange={(e) => handleFieldChange('referring_physician', e.target.value)}
                          placeholder="Dr. [Name]"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Clinical Information */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Clinical Indication</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'indication' ? stopVoiceRecognition() : startVoiceRecognition('indication')}
                      color={isListening && currentField === 'indication' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'indication' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={reportData.indication}
                      onChange={(e) => handleFieldChange('indication', e.target.value)}
                      placeholder="Clinical indication for the study..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Clinical History */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Clinical History</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'clinical_history' ? stopVoiceRecognition() : startVoiceRecognition('clinical_history')}
                      color={isListening && currentField === 'clinical_history' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'clinical_history' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={reportData.clinical_history}
                      onChange={(e) => handleFieldChange('clinical_history', e.target.value)}
                      placeholder="Relevant clinical history and symptoms..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Technique */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Technique</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'technique' ? stopVoiceRecognition() : startVoiceRecognition('technique')}
                      color={isListening && currentField === 'technique' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'technique' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={reportData.technique}
                      onChange={(e) => handleFieldChange('technique', e.target.value)}
                      placeholder="Imaging technique and parameters used..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Comparison */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Comparison</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'comparison' ? stopVoiceRecognition() : startVoiceRecognition('comparison')}
                      color={isListening && currentField === 'comparison' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'comparison' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={reportData.comparison}
                      onChange={(e) => handleFieldChange('comparison', e.target.value)}
                      placeholder="Comparison with prior studies..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Findings */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Findings</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'findings' ? stopVoiceRecognition() : startVoiceRecognition('findings')}
                      color={isListening && currentField === 'findings' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'findings' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={reportData.findings}
                      onChange={(e) => handleFieldChange('findings', e.target.value)}
                      placeholder="Describe the imaging findings..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Detailed Findings */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Detailed Findings</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'detailed_findings' ? stopVoiceRecognition() : startVoiceRecognition('detailed_findings')}
                      color={isListening && currentField === 'detailed_findings' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'detailed_findings' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={5}
                      value={reportData.detailed_findings}
                      onChange={(e) => handleFieldChange('detailed_findings', e.target.value)}
                      placeholder="Detailed anatomical findings and observations..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Measurements */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Measurements</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'measurements' ? stopVoiceRecognition() : startVoiceRecognition('measurements')}
                      color={isListening && currentField === 'measurements' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'measurements' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={reportData.measurements}
                      onChange={(e) => handleFieldChange('measurements', e.target.value)}
                      placeholder="Quantitative measurements and dimensions..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Critical Findings */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ color: 'error.main' }}>Critical Findings</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'critical_findings' ? stopVoiceRecognition() : startVoiceRecognition('critical_findings')}
                      color={isListening && currentField === 'critical_findings' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'critical_findings' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Use this section only for urgent findings that require immediate clinical attention.
                      </Typography>
                    </Alert>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={reportData.critical_findings}
                      onChange={(e) => handleFieldChange('critical_findings', e.target.value)}
                      placeholder="Critical findings requiring immediate attention..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Impression */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Impression</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'impression' ? stopVoiceRecognition() : startVoiceRecognition('impression')}
                      color={isListening && currentField === 'impression' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'impression' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={reportData.impression}
                      onChange={(e) => handleFieldChange('impression', e.target.value)}
                      placeholder="Provide clinical impression and diagnosis..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Recommendations */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Recommendations</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'recommendations' ? stopVoiceRecognition() : startVoiceRecognition('recommendations')}
                      color={isListening && currentField === 'recommendations' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'recommendations' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={reportData.recommendations}
                      onChange={(e) => handleFieldChange('recommendations', e.target.value)}
                      placeholder="Provide recommendations for follow-up..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Follow-up */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Follow-up</Typography>
                    <IconButton
                      size="small"
                      onClick={() => isListening && currentField === 'follow_up' ? stopVoiceRecognition() : startVoiceRecognition('follow_up')}
                      color={isListening && currentField === 'follow_up' ? 'error' : 'primary'}
                      sx={{ ml: 1 }}
                    >
                      {isListening && currentField === 'follow_up' ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={reportData.follow_up}
                      onChange={(e) => handleFieldChange('follow_up', e.target.value)}
                      placeholder="Specific follow-up instructions and timeline..."
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Doctor Information */}
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Radiologist Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Doctor Name"
                          value={reportData.doctor_name}
                          onChange={(e) => handleFieldChange('doctor_name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="License Number"
                          value={reportData.doctor_license}
                          onChange={(e) => handleFieldChange('doctor_license', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Credentials"
                          value={reportData.doctor_credentials}
                          onChange={(e) => handleFieldChange('doctor_credentials', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Office Information */}
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Office Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Office Name"
                          value={reportData.office_name}
                          onChange={(e) => handleFieldChange('office_name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Office Address"
                          value={reportData.office_address}
                          onChange={(e) => handleFieldChange('office_address', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          value={reportData.office_phone}
                          onChange={(e) => handleFieldChange('office_phone', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Fax Number"
                          value={reportData.office_fax}
                          onChange={(e) => handleFieldChange('office_fax', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* AI Generation Option */}
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={reportData.ai_generated}
                          onChange={(e) => handleFieldChange('ai_generated', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AIIcon color={reportData.ai_generated ? "primary" : "disabled"} />
                          <Typography variant="body2">
                            AI-Assisted Report Generation
                          </Typography>
                        </Box>
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </Box>
          </TabPanel>

          {/* Templates Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Report Templates</Typography>
              <Grid container spacing={2}>
                {REPORT_TEMPLATES.map((template) => (
                  <Grid item xs={12} md={4} key={template.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: selectedTemplate === template.id ? 2 : 1,
                        borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider'
                      }}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <TemplateIcon color="primary" />
                          <Typography variant="h6">{template.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Modality: {template.modality}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {template.sections.impression.substring(0, 100)}...
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>

          {/* Signature Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Doctor E-Signature</Typography>
              
              {reportData.doctor_signature ? (
                <Box>
                  <Typography variant="body2" gutterBottom>Current Signature:</Typography>
                  <img 
                    src={reportData.doctor_signature} 
                    alt="Doctor Signature" 
                    style={{ border: '1px solid #ccc', maxWidth: '300px', maxHeight: '150px' }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => setShowSignature(true)}
                      startIcon={<SignatureIcon />}
                    >
                      Update Signature
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Please provide your digital signature to finalize the report:
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => setShowSignature(true)}
                    startIcon={<SignatureIcon />}
                  >
                    Add Signature
                  </Button>
                </Box>
              )}

              {showSignature && (
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sign below:
                  </Typography>
                  <Box sx={{ border: '1px solid #ccc', borderRadius: 1 }}>
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        width: 500,
                        height: 200,
                        className: 'signature-canvas'
                      }}
                    />
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={saveSignature}>
                      Save Signature
                    </Button>
                    <Button variant="outlined" onClick={clearSignature}>
                      Clear
                    </Button>
                    <Button variant="text" onClick={() => setShowSignature(false)}>
                      Cancel
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>
          </TabPanel>

          {/* Post-Creation Options Tab */}
          <TabPanel value={activeTab} index={3}>
            <PostCreationOptionsPanel
              options={postCreationOptions}
              onOptionsChange={handlePostCreationOptionChange}
              lastSaved={lastSaved}
              autoSaveEnabled={autoSaveEnabled}
              onAutoSaveToggle={setAutoSaveEnabled}
            />
          </TabPanel>

          {/* Export Tab */}
          <TabPanel value={activeTab} index={4}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Export Options</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PdfIcon color="error" />
                        <Typography variant="h6">PDF Export</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Generate a PDF version of the complete report
                      </Typography>
                      <Button 
                        variant="contained" 
                        fullWidth 
                        onClick={generatePDF}
                        startIcon={<DownloadIcon />}
                      >
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PrintIcon color="primary" />
                        <Typography variant="h6">Print Report</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Print the report directly
                      </Typography>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        onClick={handlePrintReport}
                        startIcon={<PrintIcon />}
                      >
                        Print
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SaveIcon color="success" />
                        <Typography variant="h6">Save Draft</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Save current progress locally
                      </Typography>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        onClick={() => {
                          localStorage.setItem(`report_${reportData.id}`, JSON.stringify(reportData));
                          alert('Report saved locally!');
                        }}
                        startIcon={<SaveIcon />}
                      >
                        Save Draft
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateReport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <ReportIcon />}
          sx={{ minWidth: 140 }}
        >
          {loading 
            ? 'Creating...' 
            : isOffline 
              ? 'Save Offline' 
              : 'Create Report'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateReportDialog;