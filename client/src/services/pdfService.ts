import { Report, Study } from '../types';

interface DigitalSignature {
  id: string;
  signer_id: string;
  signer_name: string;
  signed_at: string;
  signature_hash: string;
  certificate_info: {
    issuer: string;
    valid_from: string;
    valid_to: string;
  };
}

interface PDFOptions {
  includeImages?: boolean;
  includeSignatures?: boolean;
  watermark?: string;
  template?: 'standard' | 'detailed' | 'minimal';
  letterhead?: boolean;
}

export class PDFService {
  private static instance: PDFService;

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  /**
   * Generate a professional medical report PDF
   */
  async generateReportPDF(
    report: Report,
    study: Study,
    signatures: DigitalSignature[] = [],
    options: PDFOptions = {}
  ): Promise<Blob> {
    const {
      includeImages = false,
      includeSignatures = true,
      watermark,
      template = 'standard',
      letterhead = true
    } = options;

    // In a real implementation, this would use a PDF library like jsPDF or PDFKit
    // For now, we'll create a comprehensive HTML template and convert to PDF
    
    const htmlContent = this.generateHTMLTemplate(report, study, signatures, {
      includeImages,
      includeSignatures,
      watermark,
      template,
      letterhead
    });

    // Convert HTML to PDF (in real implementation, use html2pdf or similar)
    return this.htmlToPDF(htmlContent);
  }

  /**
   * Generate HTML template for the report
   */
  private generateHTMLTemplate(
    report: Report,
    study: Study,
    signatures: DigitalSignature[],
    options: PDFOptions
  ): string {
    const currentDate = new Date().toLocaleDateString();
    const studyDate = study.study_date ? new Date(study.study_date).toLocaleDateString() : 'N/A';
    
    return `
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
            border-bottom: 2px solid #000;
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
        
        .measurements-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .measurements-table th,
        .measurements-table td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
        }
        
        .measurements-table th {
            background-color: #f0f0f0;
            font-weight: bold;
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
        
        .digital-signature {
            background-color: #e8f5e8;
            border: 2px solid #4caf50;
            padding: 15px;
            margin: 10px 0;
        }
        
        .digital-signature .signature-hash {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            color: #666;
            word-break: break-all;
            margin-top: 10px;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72px;
            color: rgba(255, 0, 0, 0.1);
            z-index: -1;
            font-weight: bold;
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
        
        @media print {
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
    
    ${options.letterhead ? `
    <div class="letterhead">
        <h1>KIRO MEDICAL CENTER</h1>
        <div class="subtitle">Department of Radiology</div>
        <div class="subtitle">Advanced Medical Imaging Services</div>
        <div class="contact">
            123 Medical Drive, Healthcare City, HC 12345 | Phone: (555) 123-4567 | Fax: (555) 123-4568
        </div>
    </div>
    ` : ''}
    
    <div class="report-header">
        <div class="patient-info">
            <h3>PATIENT INFORMATION</h3>
            <div class="info-row">
                <div class="info-label">Patient ID:</div>
                <div class="info-value">${study.patient_id}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Study Date:</div>
                <div class="info-value">${studyDate}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Report Date:</div>
                <div class="info-value">${currentDate}</div>
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
                <div class="info-value">${study.exam_type}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Description:</div>
                <div class="info-value">${study.study_description || 'N/A'}</div>
            </div>
        </div>
    </div>
    
    ${report.findings ? `
    <div class="section">
        <div class="section-title">Clinical Findings</div>
        <div class="section-content">
            ${this.formatTextContent(report.findings)}
        </div>
    </div>
    ` : ''}
    
    ${report.measurements && Object.keys(report.measurements).length > 0 ? `
    <div class="section">
        <div class="section-title">Measurements</div>
        <div class="section-content">
            <table class="measurements-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Normal Range</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.measurements).map(([key, measurement]: [string, any]) => `
                        <tr>
                            <td>${key.replace(/_/g, ' ').toUpperCase()}</td>
                            <td>${measurement.value || 'N/A'}</td>
                            <td>${measurement.unit || ''}</td>
                            <td>${measurement.normal_range || 'N/A'}</td>
                            <td>${measurement.abnormal ? 'ABNORMAL' : 'NORMAL'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    ` : ''}
    
    ${report.impressions ? `
    <div class="section">
        <div class="section-title">Impressions</div>
        <div class="section-content">
            ${this.formatTextContent(report.impressions)}
        </div>
    </div>
    ` : ''}
    
    ${report.recommendations ? `
    <div class="section">
        <div class="section-title">Recommendations</div>
        <div class="section-content">
            ${this.formatTextContent(report.recommendations)}
        </div>
    </div>
    ` : ''}
    
    ${report.diagnosis_codes && report.diagnosis_codes.length > 0 ? `
    <div class="section">
        <div class="section-title">Diagnosis Codes (ICD-10)</div>
        <div class="section-content">
            <ul>
                ${report.diagnosis_codes.map(code => `<li>${code}</li>`).join('')}
            </ul>
        </div>
    </div>
    ` : ''}
    
    ${options.includeSignatures && signatures.length > 0 ? `
    <div class="signature-section">
        <div class="section-title">Digital Signatures</div>
        ${signatures.map(signature => `
            <div class="digital-signature">
                <div class="signature-info">
                    <div>
                        <strong>Signed by:</strong> ${signature.signer_name}<br>
                        <strong>Date:</strong> ${new Date(signature.signed_at).toLocaleString()}<br>
                        <strong>Certificate Issuer:</strong> ${signature.certificate_info.issuer}
                    </div>
                    <div>
                        <strong>Valid From:</strong> ${new Date(signature.certificate_info.valid_from).toLocaleDateString()}<br>
                        <strong>Valid To:</strong> ${new Date(signature.certificate_info.valid_to).toLocaleDateString()}
                    </div>
                </div>
                <div class="signature-hash">
                    <strong>Digital Signature Hash:</strong><br>
                    ${signature.signature_hash}
                </div>
            </div>
        `).join('')}
    </div>
    ` : `
    <div class="signature-section">
        <div class="section-title">Physician Signature</div>
        <div class="signature-line">
            <div class="signature-text">Radiologist Signature</div>
        </div>
        <div style="margin-top: 30px;">
            <div class="info-row">
                <div class="info-label">Print Name:</div>
                <div class="info-value">_________________________________</div>
            </div>
            <div class="info-row">
                <div class="info-label">Date:</div>
                <div class="info-value">_________________________________</div>
            </div>
            <div class="info-row">
                <div class="info-label">License #:</div>
                <div class="info-value">_________________________________</div>
            </div>
        </div>
    </div>
    `}
    
    <div class="disclaimer">
        <strong>DISCLAIMER:</strong> This report contains confidential medical information and is intended solely for the use of the patient and authorized healthcare providers. Any unauthorized review, use, disclosure, or distribution is prohibited. This report was generated using Kiro Medical Imaging System v1.0.
    </div>
    
    <div class="footer">
        <div>Report Generated: ${new Date().toLocaleString()}</div>
        <div>Report ID: ${report.id || 'N/A'}</div>
        <div>© ${new Date().getFullYear()} Kiro Medical Center. All rights reserved.</div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Format text content for HTML display
   */
  private formatTextContent(text: string): string {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${line}</p>`)
      .join('');
  }

  /**
   * Convert HTML to PDF blob
   */
  private async htmlToPDF(htmlContent: string): Promise<Blob> {
    // In a real implementation, this would use a library like:
    // - html2pdf.js
    // - jsPDF with html2canvas
    // - Puppeteer (server-side)
    // - PDFKit
    
    // For now, create a mock PDF blob
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Medical Report PDF) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000369 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
466
%%EOF`;

    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Generate a quick preview PDF
   */
  async generatePreviewPDF(report: Report, study: Study): Promise<Blob> {
    return this.generateReportPDF(report, study, [], {
      template: 'minimal',
      includeSignatures: false,
      watermark: 'PREVIEW'
    });
  }

  /**
   * Generate a final signed PDF
   */
  async generateFinalPDF(
    report: Report,
    study: Study,
    signatures: DigitalSignature[]
  ): Promise<Blob> {
    return this.generateReportPDF(report, study, signatures, {
      template: 'detailed',
      includeSignatures: true,
      letterhead: true
    });
  }
}

export const pdfService = PDFService.getInstance();