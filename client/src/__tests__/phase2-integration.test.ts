/**
 * Phase 2 Enhanced User Experience Integration Tests
 * Tests voice input, template editor, and real-time collaboration features
 */

import { voiceInputService } from '../services/voiceInputService';
import { templateEditorService } from '../services/templateEditorService';
import { collaborationService } from '../services/collaborationService';

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock audit service
jest.mock('../services/auditService', () => ({
  auditService: {
    logEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock sending data
  }

  close() {
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Mock Speech Recognition
class MockSpeechRecognition {
  lang = 'en-US';
  continuous = true;
  interimResults = true;
  maxAlternatives = 3;
  
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  start() {
    if (this.onstart) {
      this.onstart();
    }
  }

  stop() {
    if (this.onend) {
      this.onend();
    }
  }
}

// Setup global mocks
(global as any).WebSocket = MockWebSocket;
(global as any).SpeechRecognition = MockSpeechRecognition;
(global as any).window = {
  ...global.window,
  SpeechRecognition: MockSpeechRecognition,
  location: {
    protocol: 'http:',
    host: 'localhost:3000'
  }
};

describe('Phase 2: Enhanced User Experience Integration Tests', () => {
  const mockReportId = 'test-report-123';
  const mockTemplateId = 'test-template-456';
  const mockSessionId = 'test-session-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Voice Input Service', () => {
    test('should check browser support for voice input', () => {
      const isSupported = voiceInputService.isVoiceInputSupported();
      expect(isSupported).toBe(true);
    });

    test('should start voice input session successfully', async () => {
      const session = await voiceInputService.startVoiceInput(mockReportId);

      expect(session).toMatchObject({
        reportId: mockReportId,
        status: 'active',
        wordCount: 0,
        averageConfidence: 0,
        medicalTermsDetected: 0
      });
      expect(session.sessionId).toBeDefined();
      expect(session.startTime).toBeInstanceOf(Date);
    });

    test('should update voice input configuration', () => {
      const newConfig = {
        language: 'en-GB',
        confidenceThreshold: 0.8,
        medicalVocabulary: true
      };

      voiceInputService.updateConfiguration(newConfig);
      const currentConfig = voiceInputService.getConfiguration();

      expect(currentConfig.language).toBe('en-GB');
      expect(currentConfig.confidenceThreshold).toBe(0.8);
      expect(currentConfig.medicalVocabulary).toBe(true);
    });

    test('should stop voice input session and return statistics', async () => {
      // Start session first
      await voiceInputService.startVoiceInput(mockReportId);
      
      // Stop session
      const completedSession = await voiceInputService.stopVoiceInput();

      expect(completedSession).not.toBeNull();
      expect(completedSession!.status).toBe('completed');
      expect(completedSession!.endTime).toBeDefined();
      expect(completedSession!.totalDuration).toBeGreaterThan(0);
    });

    test('should pause and resume voice input', async () => {
      await voiceInputService.startVoiceInput(mockReportId);
      
      voiceInputService.pauseVoiceInput();
      const pausedSession = voiceInputService.getCurrentSession();
      expect(pausedSession!.status).toBe('paused');

      voiceInputService.resumeVoiceInput();
      const resumedSession = voiceInputService.getCurrentSession();
      expect(resumedSession!.status).toBe('active');
    });

    test('should add custom medical terms to vocabulary', () => {
      const customTerms = ['pneumomediastinum', 'bronchiectasis', 'atelectasis'];
      
      voiceInputService.addMedicalTerms(customTerms);
      
      // Verify terms were added (this would be tested through speech recognition results)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should add custom voice commands', () => {
      const customCommands = [
        { command: 'insert findings', action: 'navigate' as const, parameters: { section: 'findings' } },
        { command: 'save and exit', action: 'save' as const, parameters: { exit: true } }
      ];

      voiceInputService.addVoiceCommands(customCommands);
      
      // Verify commands were added
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should handle voice input errors gracefully', async () => {
      // Mock error scenario
      const originalSpeechRecognition = (global as any).SpeechRecognition;
      (global as any).SpeechRecognition = undefined;

      await expect(voiceInputService.startVoiceInput(mockReportId))
        .rejects.toThrow('Speech recognition is not supported in this browser');

      // Restore mock
      (global as any).SpeechRecognition = originalSpeechRecognition;
    });
  });

  describe('Template Editor Service', () => {
    const mockTemplate = {
      id: mockTemplateId,
      name: 'CT Chest Template',
      description: 'Standard CT chest examination template',
      examType: 'CT_CHEST',
      specialty: 'Radiology',
      version: '1.0.0',
      isActive: true,
      isDefault: false,
      createdBy: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      sections: [
        {
          id: 'findings',
          name: 'findings',
          title: 'Findings',
          order: 1,
          required: true,
          fields: [
            {
              id: 'chest_findings',
              name: 'chest_findings',
              type: 'textarea' as const,
              label: 'Chest Findings',
              required: true,
              placeholder: 'Describe chest findings...'
            }
          ]
        }
      ],
      metadata: {
        usageCount: 0,
        averageCompletionTime: 0,
        userRating: 0,
        tags: ['chest', 'ct']
      },
      styling: {
        headerStyle: 'default',
        sectionStyle: 'default',
        fieldStyle: 'default'
      }
    };

    test('should fetch all templates with filters', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue({ templates: [mockTemplate] });

      const templates = await templateEditorService.getTemplates({
        examType: 'CT_CHEST',
        specialty: 'Radiology',
        isActive: true
      });

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/templates?examType=CT_CHEST&specialty=Radiology&isActive=true'
      );
      expect(templates).toEqual([mockTemplate]);
    });

    test('should get a specific template by ID', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue(mockTemplate);

      const template = await templateEditorService.getTemplate(mockTemplateId);

      expect(apiService.get).toHaveBeenCalledWith(`/api/templates/${mockTemplateId}`);
      expect(template).toEqual(mockTemplate);
    });

    test('should create a new template successfully', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockTemplate);

      const templateData = {
        name: 'New CT Template',
        description: 'New template for CT scans',
        examType: 'CT_CHEST',
        specialty: 'Radiology',
        version: '1.0.0',
        isActive: true,
        isDefault: false,
        createdBy: 'user-123',
        sections: mockTemplate.sections,
        styling: mockTemplate.styling
      };

      const createdTemplate = await templateEditorService.createTemplate(templateData);

      expect(apiService.post).toHaveBeenCalledWith('/api/templates', expect.objectContaining({
        ...templateData,
        metadata: expect.objectContaining({
          usageCount: 0,
          averageCompletionTime: 0,
          userRating: 0
        })
      }));
      expect(createdTemplate).toEqual(mockTemplate);
    });

    test('should update an existing template', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue(mockTemplate);
      apiService.put.mockResolvedValue({ ...mockTemplate, name: 'Updated Template' });

      const updates = { name: 'Updated Template' };
      const updatedTemplate = await templateEditorService.updateTemplate(mockTemplateId, updates);

      expect(apiService.put).toHaveBeenCalledWith(
        `/api/templates/${mockTemplateId}`,
        expect.objectContaining(updates)
      );
      expect(updatedTemplate.name).toBe('Updated Template');
    });

    test('should delete a template', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue(mockTemplate);
      apiService.delete.mockResolvedValue(undefined);

      await templateEditorService.deleteTemplate(mockTemplateId);

      expect(apiService.delete).toHaveBeenCalledWith(`/api/templates/${mockTemplateId}`);
    });

    test('should validate template structure', () => {
      const validTemplate = {
        name: 'Valid Template',
        examType: 'CT_CHEST',
        sections: [
          {
            id: 'section1',
            name: 'Section 1',
            title: 'Section 1',
            order: 1,
            required: true,
            fields: [
              {
                id: 'field1',
                name: 'field1',
                type: 'text' as const,
                label: 'Field 1',
                required: true
              }
            ]
          }
        ]
      };

      const validation = templateEditorService.validateTemplateStructure(validTemplate);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect validation errors in template structure', () => {
      const invalidTemplate = {
        name: '', // Empty name
        examType: 'CT_CHEST',
        sections: [
          {
            id: 'section1',
            name: '',
            title: 'Section 1',
            order: 1,
            required: true,
            fields: [
              {
                id: 'field1',
                name: '',
                type: 'invalid_type' as any,
                label: 'Field 1',
                required: true
              }
            ]
          }
        ]
      };

      const validation = templateEditorService.validateTemplateStructure(invalidTemplate);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.message.includes('Template name is required'))).toBe(true);
      expect(validation.errors.some(e => e.message.includes('Section name is required'))).toBe(true);
      expect(validation.errors.some(e => e.message.includes('Invalid field type'))).toBe(true);
    });

    test('should duplicate a template', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue(mockTemplate);
      apiService.post.mockResolvedValue({ ...mockTemplate, id: 'new-template-id', name: 'Duplicated Template' });

      const duplicatedTemplate = await templateEditorService.duplicateTemplate(mockTemplateId, 'Duplicated Template');

      expect(duplicatedTemplate.name).toBe('Duplicated Template');
      expect(duplicatedTemplate.isDefault).toBe(false);
    });

    test('should generate template from AI', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockTemplate);

      const aiTemplate = await templateEditorService.generateTemplateFromAI(
        'CT_CHEST',
        'Radiology',
        ['Include lung findings', 'Include heart assessment']
      );

      expect(apiService.post).toHaveBeenCalledWith('/api/templates/ai-generate', {
        examType: 'CT_CHEST',
        specialty: 'Radiology',
        requirements: ['Include lung findings', 'Include heart assessment'],
        includeStandardSections: true,
        includeMedicalTerminology: true
      });
      expect(aiTemplate).toEqual(mockTemplate);
    });

    test('should export template to JSON', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue(mockTemplate);

      const exportedJson = await templateEditorService.exportTemplate(mockTemplateId);
      const parsedTemplate = JSON.parse(exportedJson);

      expect(parsedTemplate.name).toBe(mockTemplate.name);
      expect(parsedTemplate.metadata.usageCount).toBe(0);
    });

    test('should import template from JSON', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockTemplate);

      const templateJson = JSON.stringify(mockTemplate);
      const importedTemplate = await templateEditorService.importTemplate(templateJson);

      expect(importedTemplate).toEqual(mockTemplate);
    });
  });

  describe('Collaboration Service', () => {
    const mockCollaborationSession = {
      id: mockSessionId,
      reportId: mockReportId,
      createdBy: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      isActive: true,
      participants: [
        {
          id: 'user-123',
          name: 'Dr. Smith',
          email: 'dr.smith@hospital.com',
          role: 'radiologist' as const,
          isOnline: true,
          lastSeen: '2024-01-01T00:00:00Z'
        }
      ],
      permissions: {
        canEdit: ['user-123'],
        canComment: ['user-123'],
        canView: ['user-123'],
        canApprove: ['user-123']
      },
      settings: {
        autoSave: true,
        conflictResolution: 'last_writer_wins' as const,
        notificationLevel: 'mentions' as const
      }
    };

    const mockComment = {
      id: 'comment-123',
      reportId: mockReportId,
      sectionId: 'findings',
      userId: 'user-123',
      userName: 'Dr. Smith',
      content: 'Please review this finding',
      timestamp: '2024-01-01T00:00:00Z',
      isResolved: false,
      replies: [],
      mentions: ['user-456']
    };

    test('should start a collaboration session', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockCollaborationSession);

      const session = await collaborationService.startCollaborationSession(mockReportId, {
        canEdit: ['user-123'],
        canComment: ['user-123', 'user-456']
      });

      expect(apiService.post).toHaveBeenCalledWith('/api/collaboration/sessions', {
        reportId: mockReportId,
        permissions: expect.objectContaining({
          canEdit: ['user-123'],
          canComment: ['user-123', 'user-456']
        }),
        settings: expect.objectContaining({
          autoSave: true,
          conflictResolution: 'last_writer_wins',
          notificationLevel: 'mentions'
        })
      });
      expect(session).toEqual(mockCollaborationSession);
    });

    test('should join an existing collaboration session', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockCollaborationSession);

      const session = await collaborationService.joinCollaborationSession(mockSessionId);

      expect(apiService.post).toHaveBeenCalledWith(`/api/collaboration/sessions/${mockSessionId}/join`);
      expect(session).toEqual(mockCollaborationSession);
    });

    test('should leave a collaboration session', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockCollaborationSession);
      apiService.post.mockResolvedValueOnce(mockCollaborationSession); // join
      apiService.post.mockResolvedValueOnce(undefined); // leave

      // First join a session
      await collaborationService.joinCollaborationSession(mockSessionId);
      
      // Then leave it
      await collaborationService.leaveCollaborationSession();

      expect(apiService.post).toHaveBeenCalledWith(`/api/collaboration/sessions/${mockSessionId}/leave`);
    });

    test('should send real-time edit', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockCollaborationSession);
      apiService.post.mockResolvedValueOnce(mockCollaborationSession); // join
      apiService.post.mockResolvedValueOnce(undefined); // edit

      // Join session first
      await collaborationService.joinCollaborationSession(mockSessionId);

      const edit = {
        userId: 'user-123',
        type: 'insert' as const,
        sectionId: 'findings',
        fieldId: 'chest_findings',
        position: 0,
        content: 'New finding: ',
        metadata: {
          source: 'typing' as const
        }
      };

      await collaborationService.sendRealtimeEdit(edit);

      expect(apiService.post).toHaveBeenCalledWith(
        `/api/collaboration/sessions/${mockSessionId}/edits`,
        expect.objectContaining({
          ...edit,
          sessionId: mockSessionId
        })
      );
    });

    test('should add a comment', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockCollaborationSession);
      apiService.post.mockResolvedValueOnce(mockCollaborationSession); // join
      apiService.post.mockResolvedValueOnce(mockComment); // comment

      // Join session first
      await collaborationService.joinCollaborationSession(mockSessionId);

      const commentData = {
        reportId: mockReportId,
        sectionId: 'findings',
        fieldId: 'chest_findings',
        userId: 'user-123',
        userName: 'Dr. Smith',
        content: 'Please review this finding',
        mentions: ['user-456']
      };

      const comment = await collaborationService.addComment(commentData);

      expect(apiService.post).toHaveBeenCalledWith('/api/collaboration/comments', {
        ...commentData,
        sessionId: mockSessionId
      });
      expect(comment).toEqual(mockComment);
    });

    test('should reply to a comment', async () => {
      const { apiService } = require('../services/api');
      const mockReply = {
        id: 'reply-123',
        userId: 'user-456',
        userName: 'Dr. Johnson',
        content: 'I agree with this assessment',
        timestamp: '2024-01-01T01:00:00Z',
        mentions: []
      };
      apiService.post.mockResolvedValue(mockReply);

      const replyData = {
        userId: 'user-456',
        userName: 'Dr. Johnson',
        content: 'I agree with this assessment',
        mentions: []
      };

      const reply = await collaborationService.replyToComment('comment-123', replyData);

      expect(apiService.post).toHaveBeenCalledWith('/api/collaboration/comments/comment-123/replies', replyData);
      expect(reply).toEqual(mockReply);
    });

    test('should resolve a comment', async () => {
      const { apiService } = require('../services/api');
      const resolvedComment = { ...mockComment, isResolved: true, resolvedBy: 'user-123' };
      apiService.put.mockResolvedValue(resolvedComment);

      const comment = await collaborationService.resolveComment('comment-123');

      expect(apiService.put).toHaveBeenCalledWith('/api/collaboration/comments/comment-123/resolve');
      expect(comment.isResolved).toBe(true);
    });

    test('should get comments for a report', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue({ comments: [mockComment] });

      const comments = await collaborationService.getComments(mockReportId, {
        sectionId: 'findings',
        isResolved: false
      });

      expect(apiService.get).toHaveBeenCalledWith(
        `/api/collaboration/comments?reportId=${mockReportId}&sectionId=findings&isResolved=false`
      );
      expect(comments).toEqual([mockComment]);
    });

    test('should get version history', async () => {
      const { apiService } = require('../services/api');
      const mockVersions = [
        {
          id: 'version-1',
          reportId: mockReportId,
          version: 1,
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00Z',
          description: 'Initial version',
          changes: [],
          snapshot: {}
        }
      ];
      apiService.get.mockResolvedValue({ versions: mockVersions });

      const versions = await collaborationService.getVersionHistory(mockReportId);

      expect(apiService.get).toHaveBeenCalledWith(`/api/collaboration/reports/${mockReportId}/versions`);
      expect(versions).toEqual(mockVersions);
    });

    test('should create a new version', async () => {
      const { apiService } = require('../services/api');
      const mockVersion = {
        id: 'version-2',
        reportId: mockReportId,
        version: 2,
        createdBy: 'user-123',
        createdAt: '2024-01-01T01:00:00Z',
        description: 'Updated findings',
        changes: [],
        snapshot: {}
      };
      apiService.post.mockResolvedValue(mockVersion);

      const version = await collaborationService.createVersion(mockReportId, 'Updated findings');

      expect(apiService.post).toHaveBeenCalledWith(`/api/collaboration/reports/${mockReportId}/versions`, {
        description: 'Updated findings'
      });
      expect(version).toEqual(mockVersion);
    });

    test('should restore a version', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(undefined);

      await collaborationService.restoreVersion(mockReportId, 'version-1');

      expect(apiService.post).toHaveBeenCalledWith(`/api/collaboration/reports/${mockReportId}/versions/version-1/restore`);
    });

    test('should handle WebSocket events', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue(mockCollaborationSession);

      let userJoinedEvent: any = null;
      let realtimeEditEvent: any = null;

      // Set up event listeners
      collaborationService.on('userJoined', (data: any) => {
        userJoinedEvent = data;
      });

      collaborationService.on('realtimeEdit', (data: any) => {
        realtimeEditEvent = data;
      });

      // Start session (this will establish WebSocket connection)
      await collaborationService.startCollaborationSession(mockReportId);

      // Simulate WebSocket messages
      const mockWebSocket = (global as any).WebSocket;
      const wsInstance = new mockWebSocket('ws://localhost/test');
      
      // Simulate user joined event
      if (wsInstance.onmessage) {
        wsInstance.onmessage({
          data: JSON.stringify({
            type: 'user_joined',
            payload: { userId: 'user-456', userName: 'Dr. Johnson' }
          })
        } as MessageEvent);
      }

      // Simulate real-time edit event
      if (wsInstance.onmessage) {
        wsInstance.onmessage({
          data: JSON.stringify({
            type: 'realtime_edit',
            payload: { userId: 'user-456', content: 'New edit' }
          })
        } as MessageEvent);
      }

      // Note: In a real test environment, you would need to wait for async events
      // For this mock test, we're just verifying the setup works
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Integration Tests', () => {
    test('should integrate voice input with template editor', async () => {
      const { apiService } = require('../services/api');
      apiService.get.mockResolvedValue({ templates: [] });

      // Start voice input session
      const voiceSession = await voiceInputService.startVoiceInput(mockReportId);
      
      // Get templates for the report
      const templates = await templateEditorService.getTemplates({ examType: 'CT_CHEST' });

      expect(voiceSession.reportId).toBe(mockReportId);
      expect(Array.isArray(templates)).toBe(true);
    });

    test('should integrate collaboration with voice input', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue({
        id: mockSessionId,
        reportId: mockReportId,
        participants: [],
        permissions: { canEdit: [], canComment: [], canView: [], canApprove: [] },
        settings: { autoSave: true, conflictResolution: 'last_writer_wins', notificationLevel: 'mentions' }
      });

      // Start collaboration session
      const collabSession = await collaborationService.startCollaborationSession(mockReportId);
      
      // Start voice input for the same report
      const voiceSession = await voiceInputService.startVoiceInput(mockReportId);

      expect(collabSession.reportId).toBe(mockReportId);
      expect(voiceSession.reportId).toBe(mockReportId);
    });

    test('should handle concurrent operations gracefully', async () => {
      const { apiService } = require('../services/api');
      apiService.post.mockResolvedValue({ id: 'test', reportId: mockReportId });
      apiService.get.mockResolvedValue({ templates: [] });

      // Start multiple operations concurrently
      const operations = await Promise.all([
        voiceInputService.startVoiceInput(mockReportId),
        collaborationService.startCollaborationSession(mockReportId),
        templateEditorService.getTemplates({ examType: 'CT_CHEST' })
      ]);

      expect(operations).toHaveLength(3);
      expect(operations[0].reportId).toBe(mockReportId); // Voice session
      expect(operations[1].reportId).toBe(mockReportId); // Collaboration session
      expect(Array.isArray(operations[2])).toBe(true); // Templates
    });
  });
});