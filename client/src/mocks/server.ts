/**
 * Mock Server Setup for Integration Tests
 * Uses MSW (Mock Service Worker) to mock API calls
 */

import { setupServer } from 'msw/node';
import { http } from 'msw';
import { MockDicomDataGenerator } from '../services/__tests__/testUtils';

// Mock API handlers
const handlers = [
  // DICOM processing endpoint
  http.get('/dicom/process/:patientId/:filename', (req, res, ctx) => {
    const { patientId, filename } = req.params;
    const frame = req.url.searchParams.get('frame') || '0';
    const outputFormat = req.url.searchParams.get('output_format') || 'PNG';
    
    console.log(`Mock DICOM processing: ${patientId}/${filename} frame ${frame}`);
    
    // Simulate processing delay
    return res(
      ctx.delay(100),
      ctx.json({
        success: true,
        image_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          PatientName: `Mock Patient ${patientId}`,
          StudyDate: '20231201',
          Modality: 'CT',
          Rows: 512,
          Columns: 512,
          NumberOfFrames: 10
        },
        processing_time: 150
      })
    );
  }),

  // Study list endpoint
  http.get('/api/studies', (req, res, ctx) => {
    const studies = Array.from({ length: 5 }, (_, i) => 
      MockDicomDataGenerator.generateMockStudy({
        studyId: `study-${i + 1}`,
        patientId: `patient-${i + 1}`,
        sliceCount: 10 + i * 5
      })
    );
    
    return res(
      ctx.delay(50),
      ctx.json({
        success: true,
        studies,
        total: studies.length
      })
    );
  }),

  // Individual study endpoint
  http.get('/api/studies/:studyId', (req, res, ctx) => {
    const { studyId } = req.params;
    const study = MockDicomDataGenerator.generateMockStudy({
      studyId: studyId as string,
      sliceCount: 20
    });
    
    return res(
      ctx.delay(30),
      ctx.json({
        success: true,
        study
      })
    );
  }),

  // Patient studies endpoint
  http.get('/api/patients/:patientId/studies', (req, res, ctx) => {
    const { patientId } = req.params;
    const studies = Array.from({ length: 3 }, (_, i) => 
      MockDicomDataGenerator.generateMockStudy({
        studyId: `${patientId}-study-${i + 1}`,
        patientId: patientId as string,
        sliceCount: 15
      })
    );
    
    return res(
      ctx.delay(40),
      ctx.json({
        success: true,
        studies,
        patient_id: patientId
      })
    );
  }),

  // AI analysis endpoint
  http.post('/api/ai/analyze', (req, res, ctx) => {
    return res(
      ctx.delay(2000), // Simulate AI processing time
      ctx.json({
        success: true,
        analysis: MockDicomDataGenerator.generateMockAIAnalysis(),
        processing_time: 1800
      })
    );
  }),

  // Collaboration session endpoints
  http.post('/api/collaboration/sessions', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.json({
        success: true,
        session: {
          id: `session-${Date.now()}`,
          host_id: 'user-1',
          created_at: new Date().toISOString(),
          participants: [],
          settings: {
            sync_viewport: true,
            sync_annotations: true,
            sync_measurements: true
          }
        }
      })
    );
  }),

  http.post('/api/collaboration/sessions/:sessionId/join', (req, res, ctx) => {
    const { sessionId } = req.params;
    return res(
      ctx.delay(50),
      ctx.json({
        success: true,
        session_id: sessionId,
        participant_id: `participant-${Date.now()}`
      })
    );
  }),

  // Measurement endpoints
  http.post('/api/measurements', (req, res, ctx) => {
    return res(
      ctx.delay(30),
      ctx.json({
        success: true,
        measurement: {
          id: `measurement-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...req.body
        }
      })
    );
  }),

  http.get('/api/measurements/:studyId', (req, res, ctx) => {
    const { studyId } = req.params;
    const measurements = Array.from({ length: 3 }, (_, i) => ({
      id: `measurement-${i + 1}`,
      study_id: studyId,
      type: ['distance', 'area', 'angle'][i],
      value: Math.random() * 100,
      unit: ['mm', 'mm²', '°'][i],
      created_at: new Date().toISOString()
    }));
    
    return res(
      ctx.delay(40),
      ctx.json({
        success: true,
        measurements
      })
    );
  }),

  // Annotation endpoints
  http.post('/api/annotations', (req, res, ctx) => {
    return res(
      ctx.delay(30),
      ctx.json({
        success: true,
        annotation: {
          id: `annotation-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...req.body
        }
      })
    );
  }),

  http.get('/api/annotations/:studyId', (req, res, ctx) => {
    const { studyId } = req.params;
    const annotations = Array.from({ length: 2 }, (_, i) => ({
      id: `annotation-${i + 1}`,
      study_id: studyId,
      type: 'text',
      content: `Test annotation ${i + 1}`,
      position: { x: 100 + i * 50, y: 200 + i * 30 },
      created_at: new Date().toISOString()
    }));
    
    return res(
      ctx.delay(40),
      ctx.json({
        success: true,
        annotations
      })
    );
  }),

  // Performance metrics endpoint
  http.get('/api/performance/metrics', (req, res, ctx) => {
    return res(
      ctx.delay(20),
      ctx.json({
        success: true,
        metrics: {
          average_load_time: 1200,
          average_render_time: 45,
          memory_usage: 256,
          cache_hit_rate: 0.85,
          error_rate: 0.02
        }
      })
    );
  }),

  // System health endpoint
  http.get('/api/system/health', (req, res, ctx) => {
    return res(
      ctx.delay(10),
      ctx.json({
        success: true,
        health: {
          status: 'healthy',
          uptime: 86400,
          memory_usage: 0.65,
          cpu_usage: 0.35,
          active_sessions: 12,
          processed_studies: 1543
        }
      })
    );
  }),

  // Error simulation endpoints
  http.get('/api/error/network', (req, res, ctx) => {
    return res(ctx.networkError('Network error'));
  }),

  http.get('/api/error/server', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      })
    );
  }),

  http.get('/api/error/timeout', (req, res, ctx) => {
    return res(
      ctx.delay(30000), // 30 second delay to simulate timeout
      ctx.json({ success: true })
    );
  }),

  // File upload endpoint
  http.post('/api/upload/dicom', (req, res, ctx) => {
    return res(
      ctx.delay(1000), // Simulate upload time
      ctx.json({
        success: true,
        file_id: `file-${Date.now()}`,
        processing_status: 'queued',
        estimated_time: 30
      })
    );
  }),

  // Configuration endpoints
  http.get('/api/config/viewer', (req, res, ctx) => {
    return res(
      ctx.delay(20),
      ctx.json({
        success: true,
        config: {
          default_mode: 'simple',
          enable_ai: true,
          enable_collaboration: true,
          max_cache_size: 512,
          performance_monitoring: true
        }
      })
    );
  }),

  http.put('/api/config/viewer', (req, res, ctx) => {
    return res(
      ctx.delay(50),
      ctx.json({
        success: true,
        message: 'Configuration updated successfully'
      })
    );
  }),

  // Fallback handler for unmatched requests
  http.all('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url.href}`);
    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Not found',
        code: 'NOT_FOUND'
      })
    );
  })
];

// Create and export the server
export const server = setupServer(...handlers);

// Error handler for the server
server.events.on('request:start', ({ request }) => {
  console.log(`Mock API: ${request.method} ${request.url}`);
});

server.events.on('request:match', ({ request }) => {
  console.log(`Mock API matched: ${request.method} ${request.url}`);
});

server.events.on('request:unhandled', ({ request }) => {
  console.warn(`Mock API unhandled: ${request.method} ${request.url}`);
});

export { handlers };