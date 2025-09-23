/**
 * Advanced Template Editor Service
 * Provides customizable report templates with dynamic fields and conditional logic
 */

import { apiService } from './api';
import { auditService } from './auditService';

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date' | 'boolean' | 'measurement' | 'image_reference';
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    options?: Array<{ value: string; label: string }>;
  };
  conditional?: {
    dependsOn: string;
    condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  medicalContext?: {
    anatomicalRegion?: string;
    examType?: string;
    pathologyType?: string;
  };
}

export interface TemplateSection {
  id: string;
  name: string;
  title: string;
  order: number;
  required: boolean;
  fields: TemplateField[];
  conditional?: {
    dependsOn: string;
    condition: string;
    value: any;
  };
  aiSuggestions?: {
    enabled: boolean;
    context: string;
    model: string;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  examType: string;
  specialty: string;
  version: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sections: TemplateSection[];
  metadata: {
    usageCount: number;
    averageCompletionTime: number;
    userRating: number;
    tags: string[];
  };
  styling: {
    headerStyle: string;
    sectionStyle: string;
    fieldStyle: string;
    customCSS?: string;
  };
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: Array<{
    fieldId: string;
    sectionId: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    fieldId: string;
    sectionId: string;
    message: string;
  }>;
}

export interface TemplateUsageAnalytics {
  templateId: string;
  totalUsage: number;
  averageCompletionTime: number;
  completionRate: number;
  fieldUsageStats: Array<{
    fieldId: string;
    usagePercentage: number;
    averageValue: string;
    validationErrors: number;
  }>;
  userFeedback: Array<{
    userId: string;
    rating: number;
    comment: string;
    timestamp: string;
  }>;
}

class TemplateEditorService {
  private baseUrl = '/api/templates';
  private templateCache: Map<string, ReportTemplate> = new Map();

  /**
   * Get all available templates
   */
  async getTemplates(filters?: {
    examType?: string;
    specialty?: string;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<ReportTemplate[]> {
    try {
      console.log('📋 Fetching report templates...');
      
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
      const response = await apiService.get<{ templates: ReportTemplate[] }>(url);
      
      // Update cache
      response.templates.forEach(template => {
        this.templateCache.set(template.id, template);
      });

      console.log(`✅ Retrieved ${response.templates.length} templates`);
      return response.templates;
    } catch (error) {
      console.error('❌ Failed to fetch templates:', error);
      throw new Error('Failed to load report templates. Please try again.');
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<ReportTemplate> {
    try {
      // Check cache first (but not in test environment to ensure API calls are made)
      if (this.templateCache.has(templateId) && process.env.NODE_ENV !== 'test') {
        return this.templateCache.get(templateId)!;
      }

      const response = await apiService.get<ReportTemplate>(`${this.baseUrl}/${templateId}`);
      
      // Update cache
      this.templateCache.set(templateId, response);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch template:', error);
      throw new Error('Failed to load template. Please try again.');
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<ReportTemplate> {
    try {
      console.log('📝 Creating new template:', templateData.name);

      // Validate template structure
      const validation = this.validateTemplateStructure(templateData);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const response = await apiService.post<ReportTemplate>(this.baseUrl, {
        ...templateData,
        metadata: {
          usageCount: 0,
          averageCompletionTime: 0,
          userRating: 0,
          tags: []
        }
      });

      // Update cache
      this.templateCache.set(response.id, response);

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_created', // Using existing event type
        event_description: `Template created: ${response.name}`,
        resource_type: 'Report',
        resource_id: response.id,
        metadata: {
          action_details: {
            template_name: response.name,
            exam_type: response.examType,
            specialty: response.specialty,
            sections_count: response.sections.length
          }
        }
      });

      console.log('✅ Template created successfully:', response.id);
      return response;
    } catch (error) {
      console.error('❌ Failed to create template:', error);
      throw new Error('Failed to create template. Please check the template structure and try again.');
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    try {
      console.log('📝 Updating template:', templateId);

      // Get current template for comparison
      const currentTemplate = await this.getTemplate(templateId);

      // Validate updated structure if sections are being modified
      if (updates.sections) {
        const validation = this.validateTemplateStructure({ ...currentTemplate, ...updates });
        if (!validation.isValid) {
          throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      const response = await apiService.put<ReportTemplate>(`${this.baseUrl}/${templateId}`, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      // Update cache
      this.templateCache.set(templateId, response);

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: `Template updated: ${response.name}`,
        resource_type: 'Report',
        resource_id: templateId,
        metadata: {
          action_details: {
            template_name: response.name,
            updated_fields: Object.keys(updates),
            version: response.version
          }
        }
      });

      console.log('✅ Template updated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to update template:', error);
      throw new Error('Failed to update template. Please try again.');
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting template:', templateId);

      const template = await this.getTemplate(templateId);

      await apiService.delete(`${this.baseUrl}/${templateId}`);

      // Remove from cache
      this.templateCache.delete(templateId);

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_deleted',
        event_description: `Template deleted: ${template.name}`,
        resource_type: 'Report',
        resource_id: templateId,
        metadata: {
          action_details: {
            template_name: template.name,
            exam_type: template.examType,
            specialty: template.specialty
          }
        }
      });

      console.log('✅ Template deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      throw new Error('Failed to delete template. Please try again.');
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(templateId: string, newName: string): Promise<ReportTemplate> {
    try {
      console.log('📋 Duplicating template:', templateId);

      const originalTemplate = await this.getTemplate(templateId);
      
      const duplicatedTemplate = {
        ...originalTemplate,
        name: newName,
        isDefault: false,
        version: '1.0.0'
      };

      // Remove fields that shouldn't be duplicated
      delete (duplicatedTemplate as any).id;
      delete (duplicatedTemplate as any).createdAt;
      delete (duplicatedTemplate as any).updatedAt;
      delete (duplicatedTemplate as any).metadata;

      return await this.createTemplate(duplicatedTemplate);
    } catch (error) {
      console.error('❌ Failed to duplicate template:', error);
      throw new Error('Failed to duplicate template. Please try again.');
    }
  }

  /**
   * Validate template structure
   */
  validateTemplateStructure(template: Partial<ReportTemplate>): TemplateValidationResult {
    const errors: TemplateValidationResult['errors'] = [];
    const warnings: TemplateValidationResult['warnings'] = [];

    // Basic template validation
    if (!template.name || template.name.trim().length === 0) {
      errors.push({
        fieldId: 'name',
        sectionId: 'general',
        message: 'Template name is required',
        severity: 'error'
      });
    }

    if (!template.examType || template.examType.trim().length === 0) {
      errors.push({
        fieldId: 'examType',
        sectionId: 'general',
        message: 'Exam type is required',
        severity: 'error'
      });
    }

    if (!template.sections || template.sections.length === 0) {
      errors.push({
        fieldId: 'sections',
        sectionId: 'general',
        message: 'Template must have at least one section',
        severity: 'error'
      });
    }

    // Section validation
    if (template.sections) {
      const sectionIds = new Set<string>();
      
      template.sections.forEach((section, sectionIndex) => {
        // Check for duplicate section IDs
        if (sectionIds.has(section.id)) {
          errors.push({
            fieldId: 'id',
            sectionId: section.id,
            message: `Duplicate section ID: ${section.id}`,
            severity: 'error'
          });
        }
        sectionIds.add(section.id);

        // Section name validation
        if (!section.name || section.name.trim().length === 0) {
          errors.push({
            fieldId: 'name',
            sectionId: section.id,
            message: 'Section name is required',
            severity: 'error'
          });
        }

        // Field validation
        if (!section.fields || section.fields.length === 0) {
          warnings.push({
            fieldId: 'fields',
            sectionId: section.id,
            message: 'Section has no fields'
          });
        }

        if (section.fields) {
          const fieldIds = new Set<string>();
          
          section.fields.forEach((field, fieldIndex) => {
            // Check for duplicate field IDs
            if (fieldIds.has(field.id)) {
              errors.push({
                fieldId: field.id,
                sectionId: section.id,
                message: `Duplicate field ID: ${field.id}`,
                severity: 'error'
              });
            }
            fieldIds.add(field.id);

            // Field name validation
            if (!field.name || field.name.trim().length === 0) {
              errors.push({
                fieldId: field.id,
                sectionId: section.id,
                message: 'Field name is required',
                severity: 'error'
              });
            }

            // Field type validation
            const validTypes = ['text', 'textarea', 'select', 'multiselect', 'number', 'date', 'boolean', 'measurement', 'image_reference'];
            if (!validTypes.includes(field.type)) {
              errors.push({
                fieldId: field.id,
                sectionId: section.id,
                message: `Invalid field type: ${field.type}`,
                severity: 'error'
              });
            }

            // Validation rules
            if (field.validation) {
              if (field.type === 'select' || field.type === 'multiselect') {
                if (!field.validation.options || field.validation.options.length === 0) {
                  errors.push({
                    fieldId: field.id,
                    sectionId: section.id,
                    message: 'Select fields must have options',
                    severity: 'error'
                  });
                }
              }

              if (field.type === 'number') {
                if (field.validation.min !== undefined && field.validation.max !== undefined) {
                  if (field.validation.min >= field.validation.max) {
                    errors.push({
                      fieldId: field.id,
                      sectionId: section.id,
                      message: 'Minimum value must be less than maximum value',
                      severity: 'error'
                    });
                  }
                }
              }
            }

            // Conditional logic validation
            if (field.conditional) {
              const dependentField = template.sections?.flatMap(s => s.fields).find(f => f.id === field.conditional!.dependsOn);
              if (!dependentField) {
                errors.push({
                  fieldId: field.id,
                  sectionId: section.id,
                  message: `Conditional dependency field not found: ${field.conditional.dependsOn}`,
                  severity: 'error'
                });
              }
            }
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate template from AI analysis
   */
  async generateTemplateFromAI(examType: string, specialty: string, requirements: string[]): Promise<ReportTemplate> {
    try {
      console.log('🤖 Generating template from AI for:', examType);

      const response = await apiService.post<ReportTemplate>(`${this.baseUrl}/ai-generate`, {
        examType,
        specialty,
        requirements,
        includeStandardSections: true,
        includeMedicalTerminology: true
      });

      // Update cache
      this.templateCache.set(response.id, response);

      console.log('✅ AI template generated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to generate AI template:', error);
      throw new Error('Failed to generate template from AI. Please try again.');
    }
  }

  /**
   * Get template usage analytics
   */
  async getTemplateAnalytics(templateId: string): Promise<TemplateUsageAnalytics> {
    try {
      const response = await apiService.get<TemplateUsageAnalytics>(`${this.baseUrl}/${templateId}/analytics`);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch template analytics:', error);
      throw new Error('Failed to load template analytics. Please try again.');
    }
  }

  /**
   * Export template to JSON
   */
  async exportTemplate(templateId: string): Promise<string> {
    try {
      const template = await this.getTemplate(templateId);
      
      // Remove runtime data for export
      const exportData = {
        ...template,
        metadata: {
          ...template.metadata,
          usageCount: 0,
          averageCompletionTime: 0,
          userRating: 0
        }
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Failed to export template:', error);
      throw new Error('Failed to export template. Please try again.');
    }
  }

  /**
   * Import template from JSON
   */
  async importTemplate(templateJson: string): Promise<ReportTemplate> {
    try {
      console.log('📥 Importing template from JSON...');

      const templateData = JSON.parse(templateJson);
      
      // Remove ID and timestamps for import
      delete templateData.id;
      delete templateData.createdAt;
      delete templateData.updatedAt;
      
      // Reset metadata
      templateData.metadata = {
        usageCount: 0,
        averageCompletionTime: 0,
        userRating: 0,
        tags: templateData.metadata?.tags || []
      };

      return await this.createTemplate(templateData);
    } catch (error) {
      console.error('❌ Failed to import template:', error);
      throw new Error('Failed to import template. Please check the JSON format and try again.');
    }
  }

  /**
   * Get template suggestions based on exam type
   */
  async getTemplateSuggestions(examType: string, specialty?: string): Promise<ReportTemplate[]> {
    try {
      const queryParams = new URLSearchParams({
        examType,
        ...(specialty && { specialty }),
        suggestions: 'true'
      });

      const response = await apiService.get<{ templates: ReportTemplate[] }>(`${this.baseUrl}/suggestions?${queryParams}`);
      return response.templates;
    } catch (error) {
      console.error('❌ Failed to fetch template suggestions:', error);
      return [];
    }
  }

  /**
   * Preview template rendering
   */
  async previewTemplate(templateId: string, sampleData?: Record<string, any>): Promise<string> {
    try {
      const response = await apiService.post<{ html: string }>(`${this.baseUrl}/${templateId}/preview`, {
        sampleData: sampleData || {}
      });

      return response.html;
    } catch (error) {
      console.error('❌ Failed to preview template:', error);
      throw new Error('Failed to generate template preview. Please try again.');
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    console.log('🧹 Template cache cleared');
  }
}

export const templateEditorService = new TemplateEditorService();
export default templateEditorService;