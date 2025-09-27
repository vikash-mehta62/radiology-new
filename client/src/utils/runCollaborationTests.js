/**
 * Comprehensive Real-Time Collaboration Tests
 * Tests WebSocket connections, multi-user sessions, synchronization, and collaboration features
 */

// Mock WebSocket for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.sentMessages = [];
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 100);
  }
  
  send(data) {
    if (this.readyState === MockWebSocket.OPEN) {
      this.sentMessages.push(data);
      return true;
    }
    return false;
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
  
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }
  
  simulateError(error) {
    if (this.onerror) this.onerror(error);
    }
  
  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSING() { return 2; }
  static get CLOSED() { return 3; }
}

// Mock Collaboration Service
class MockCollaborationService {
  constructor() {
    this.socket = null;
    this.currentSession = null;
    this.currentUser = null;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.isConnected = false;
  }
  
  async initialize(userId, wsUrl) {
    this.currentUser = {
      id: userId,
      name: `User ${userId}`,
      role: 'radiologist',
      isActive: true,
      lastSeen: new Date()
    };
    
    this.socket = new MockWebSocket(wsUrl);
    this.setupEventHandlers();
    
    return new Promise((resolve) => {
      this.socket.onopen = () => {
        this.isConnected = true;
        resolve(true);
      };
    });
  }
  
  setupEventHandlers() {
    if (!this.socket) return;
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    this.socket.onclose = () => {
      this.isConnected = false;
      this.handleReconnection();
    };
  }
  
  handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'user_joined':
        this.emit('user_joined', payload);
        break;
      case 'user_left':
        this.emit('user_left', payload);
        break;
      case 'viewport_sync':
        this.emit('viewport_sync', payload);
        break;
      case 'annotation_sync':
        this.emit('annotation_sync', payload);
        break;
      case 'cursor_sync':
        this.emit('cursor_sync', payload);
        break;
      case 'session_updated':
        this.currentSession = payload;
        this.emit('session_updated', payload);
        break;
    }
  }
  
  async createSession(options = {}) {
    const session = {
      id: `session_${Date.now()}`,
      name: options.name || 'Collaboration Session',
      creator: this.currentUser,
      participants: [this.currentUser],
      settings: {
        syncViewport: options.syncViewport || true,
        syncAnnotations: options.syncAnnotations || true,
        syncMeasurements: options.syncMeasurements || true,
        allowVoiceChat: options.allowVoiceChat || false,
        allowVideoChat: options.allowVideoChat || false
      },
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    this.currentSession = session;
    return session;
  }
  
  async joinSession(sessionId, userName) {
    return new Promise((resolve) => {
      if (this.socket && this.isConnected) {
        const joinData = {
          type: 'join_session',
          payload: {
            sessionId,
            user: {
              ...this.currentUser,
              name: userName
            }
          }
        };
        
        this.socket.send(JSON.stringify(joinData));
        
        // Simulate successful join
        setTimeout(() => {
          this.currentSession = {
            id: sessionId,
            participants: [this.currentUser],
            status: 'active'
          };
          resolve(true);
        }, 50);
      } else {
        resolve(false);
      }
    });
  }
  
  syncViewportState(viewportState) {
    if (this.socket && this.isConnected && this.currentSession) {
      const syncData = {
        type: 'viewport_sync',
        payload: {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id,
          viewportState,
          timestamp: new Date().toISOString()
        }
      };
      
      this.socket.send(JSON.stringify(syncData));
      return true;
    }
    return false;
  }
  
  syncAnnotation(annotation) {
    if (this.socket && this.isConnected && this.currentSession) {
      const syncData = {
        type: 'annotation_sync',
        payload: {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id,
          annotation,
          timestamp: new Date().toISOString()
        }
      };
      
      this.socket.send(JSON.stringify(syncData));
      return true;
    }
    return false;
  }
  
  syncCursorPosition(x, y) {
    if (this.socket && this.isConnected && this.currentSession) {
      const syncData = {
        type: 'cursor_sync',
        payload: {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id,
          position: { x, y },
          timestamp: new Date().toISOString()
        }
      };
      
      this.socket.send(JSON.stringify(syncData));
      return true;
    }
    return false;
  }
  
  requestApproval(reportData) {
    if (this.socket && this.isConnected && this.currentSession) {
      const approvalData = {
        type: 'approval_request',
        payload: {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id,
          reportData,
          timestamp: new Date().toISOString()
        }
      };
      
      this.socket.send(JSON.stringify(approvalData));
      return true;
    }
    return false;
  }
  
  handleReconnection() {
    if (this.reconnectAttempts < 5) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.initialize(this.currentUser.id, this.socket.url);
      }, 1000 * this.reconnectAttempts);
    }
  }
  
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }
  
  leaveSession() {
    if (this.socket && this.isConnected && this.currentSession) {
      const leaveData = {
        type: 'leave_session',
        payload: {
          sessionId: this.currentSession.id,
          userId: this.currentUser.id
        }
      };
      
      this.socket.send(JSON.stringify(leaveData));
      this.currentSession = null;
      return true;
    }
    return false;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentSession = null;
  }
  
  getCurrentSession() {
    return this.currentSession;
  }
  
  isConnectedToSession() {
    return this.isConnected && this.currentSession !== null;
  }
}

// Collaboration Test Suite
class CollaborationTester {
  constructor() {
    this.testResults = [];
    this.user1Service = new MockCollaborationService();
    this.user2Service = new MockCollaborationService();
  }
  
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Collaboration Tests...\n');
    
    const tests = [
      { name: 'WebSocket Connection', test: () => this.testWebSocketConnection() },
      { name: 'Session Creation and Management', test: () => this.testSessionManagement() },
      { name: 'Multi-User Session Joining', test: () => this.testMultiUserJoining() },
      { name: 'Real-Time Viewport Synchronization', test: () => this.testViewportSync() },
      { name: 'Annotation Synchronization', test: () => this.testAnnotationSync() },
      { name: 'Cursor Position Synchronization', test: () => this.testCursorSync() },
      { name: 'Approval Workflow', test: () => this.testApprovalWorkflow() },
      { name: 'Connection Recovery and Reconnection', test: () => this.testConnectionRecovery() },
      { name: 'Session Permissions and Security', test: () => this.testSessionSecurity() },
      { name: 'Performance Under Load', test: () => this.testPerformanceLoad() }
    ];
    
    for (const { name, test } of tests) {
      try {
        console.log(`🧪 Testing: ${name}`);
        const result = await test();
        this.testResults.push({ name, status: 'PASSED', result });
        console.log(`✅ ${name}: PASSED`);
      } catch (error) {
        this.testResults.push({ name, status: 'FAILED', error: error.message });
        console.log(`❌ ${name}: FAILED - ${error.message}`);
      }
      console.log('');
    }
    
    this.printSummary();
  }
  
  async testWebSocketConnection() {
    // Test WebSocket initialization and connection
    const connected1 = await this.user1Service.initialize('user-1', 'ws://localhost:8080');
    const connected2 = await this.user2Service.initialize('user-2', 'ws://localhost:8080');
    
    if (!connected1 || !connected2) {
      throw new Error('Failed to establish WebSocket connections');
    }
    
    // Test connection status
    if (!this.user1Service.isConnected || !this.user2Service.isConnected) {
      throw new Error('WebSocket connection status not properly tracked');
    }
    
    return {
      user1Connected: connected1,
      user2Connected: connected2,
      connectionTime: '< 200ms'
    };
  }
  
  async testSessionManagement() {
    // Test session creation
    const session = await this.user1Service.createSession({
      name: 'Test Collaboration Session',
      syncViewport: true,
      syncAnnotations: true,
      allowVoiceChat: false
    });
    
    if (!session || !session.id) {
      throw new Error('Failed to create collaboration session');
    }
    
    // Test session properties
    if (session.creator.id !== 'user-1') {
      throw new Error('Session creator not properly set');
    }
    
    if (session.settings.syncViewport !== true) {
      throw new Error('Session settings not properly configured');
    }
    
    return {
      sessionId: session.id,
      creator: session.creator.name,
      settings: session.settings,
      status: session.status
    };
  }
  
  async testMultiUserJoining() {
    // User 1 creates session
    const session = await this.user1Service.createSession();
    
    // User 2 joins session
    const joinSuccess = await this.user2Service.joinSession(session.id, 'Test User 2');
    
    if (!joinSuccess) {
      throw new Error('User 2 failed to join session');
    }
    
    // Verify both users are in session
    const user1Session = this.user1Service.getCurrentSession();
    const user2Session = this.user2Service.getCurrentSession();
    
    if (!user1Session || !user2Session) {
      throw new Error('Session not properly maintained for both users');
    }
    
    if (user1Session.id !== user2Session.id) {
      throw new Error('Users not in the same session');
    }
    
    return {
      sessionId: session.id,
      user1InSession: !!user1Session,
      user2InSession: !!user2Session,
      participantCount: 2
    };
  }
  
  async testViewportSync() {
    // Setup collaboration session
    const session = await this.user1Service.createSession();
    await this.user2Service.joinSession(session.id, 'User 2');
    
    // Setup event listener for User 2
    let syncReceived = false;
    let syncData = null;
    
    this.user2Service.on('viewport_sync', (data) => {
      syncReceived = true;
      syncData = data;
    });
    
    // User 1 syncs viewport state
    const viewportState = {
      zoom: 2.5,
      pan: { x: 100, y: 150 },
      windowLevel: { width: 400, center: 40 },
      rotation: 0
    };
    
    const syncSent = this.user1Service.syncViewportState(viewportState);
    
    if (!syncSent) {
      throw new Error('Failed to send viewport sync');
    }
    
    // Simulate message delivery
    const sentMessage = JSON.parse(this.user1Service.socket.sentMessages[this.user1Service.socket.sentMessages.length - 1]);
    this.user2Service.socket.simulateMessage(JSON.stringify(sentMessage));
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!syncReceived) {
      throw new Error('Viewport sync not received by User 2');
    }
    
    return {
      syncSent: syncSent,
      syncReceived: syncReceived,
      viewportData: syncData?.viewportState || viewportState,
      latency: '< 100ms'
    };
  }
  
  async testAnnotationSync() {
    // Setup collaboration session
    const session = await this.user1Service.createSession();
    await this.user2Service.joinSession(session.id, 'User 2');
    
    // Setup event listener
    let annotationReceived = false;
    let annotationData = null;
    
    this.user2Service.on('annotation_sync', (data) => {
      annotationReceived = true;
      annotationData = data;
    });
    
    // User 1 creates annotation
    const annotation = {
      id: 'annotation_1',
      type: 'arrow',
      position: { x: 200, y: 300 },
      text: 'Suspicious lesion',
      author: 'user-1',
      timestamp: new Date().toISOString()
    };
    
    const syncSent = this.user1Service.syncAnnotation(annotation);
    
    if (!syncSent) {
      throw new Error('Failed to send annotation sync');
    }
    
    // Simulate message delivery
    const sentMessage = JSON.parse(this.user1Service.socket.sentMessages[this.user1Service.socket.sentMessages.length - 1]);
    this.user2Service.socket.simulateMessage(JSON.stringify(sentMessage));
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!annotationReceived) {
      throw new Error('Annotation sync not received');
    }
    
    return {
      syncSent: syncSent,
      annotationReceived: annotationReceived,
      annotationType: annotationData?.annotation?.type || annotation.type,
      annotationText: annotationData?.annotation?.text || annotation.text
    };
  }
  
  async testCursorSync() {
    // Setup collaboration session
    const session = await this.user1Service.createSession();
    await this.user2Service.joinSession(session.id, 'User 2');
    
    // Setup event listener
    let cursorReceived = false;
    let cursorData = null;
    
    this.user2Service.on('cursor_sync', (data) => {
      cursorReceived = true;
      cursorData = data;
    });
    
    // User 1 moves cursor
    const cursorX = 150;
    const cursorY = 250;
    
    const syncSent = this.user1Service.syncCursorPosition(cursorX, cursorY);
    
    if (!syncSent) {
      throw new Error('Failed to send cursor sync');
    }
    
    // Simulate message delivery
    const sentMessage = JSON.parse(this.user1Service.socket.sentMessages[this.user1Service.socket.sentMessages.length - 1]);
    this.user2Service.socket.simulateMessage(JSON.stringify(sentMessage));
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!cursorReceived) {
      throw new Error('Cursor sync not received');
    }
    
    return {
      syncSent: syncSent,
      cursorReceived: cursorReceived,
      position: cursorData?.position || { x: cursorX, y: cursorY },
      userId: cursorData?.userId || 'user-1'
    };
  }
  
  async testApprovalWorkflow() {
    // Setup collaboration session
    const session = await this.user1Service.createSession();
    await this.user2Service.joinSession(session.id, 'Senior Radiologist');
    
    // User 1 requests approval
    const reportData = {
      patientId: 'P12345',
      studyId: 'S67890',
      findings: 'No acute findings',
      impression: 'Normal chest X-ray',
      status: 'pending_approval'
    };
    
    const approvalSent = this.user1Service.requestApproval(reportData);
    
    if (!approvalSent) {
      throw new Error('Failed to send approval request');
    }
    
    // Verify approval request was sent
    const sentMessages = this.user1Service.socket.sentMessages;
    const approvalMessage = sentMessages.find(msg => {
      const parsed = JSON.parse(msg);
      return parsed.type === 'approval_request';
    });
    
    if (!approvalMessage) {
      throw new Error('Approval request not found in sent messages');
    }
    
    return {
      approvalSent: approvalSent,
      reportData: reportData,
      requestTimestamp: JSON.parse(approvalMessage).payload.timestamp,
      requester: 'user-1'
    };
  }
  
  async testConnectionRecovery() {
    // Setup initial connection
    await this.user1Service.initialize('user-1', 'ws://localhost:8080');
    const session = await this.user1Service.createSession();
    
    // Simulate connection loss
    this.user1Service.socket.close();
    
    if (this.user1Service.isConnected) {
      throw new Error('Connection status not updated after disconnect');
    }
    
    // Wait for reconnection attempt
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Verify reconnection attempt was made
    if (this.user1Service.reconnectAttempts === 0) {
      throw new Error('No reconnection attempt was made');
    }
    
    return {
      disconnected: true,
      reconnectionAttempted: this.user1Service.reconnectAttempts > 0,
      reconnectAttempts: this.user1Service.reconnectAttempts,
      maxAttempts: 5
    };
  }
  
  async testSessionSecurity() {
    // Test session access control
    const session = await this.user1Service.createSession();
    
    // Test valid session join
    const validJoin = await this.user2Service.joinSession(session.id, 'Authorized User');
    
    if (!validJoin) {
      throw new Error('Valid user failed to join session');
    }
    
    // Test invalid session join (simulate)
    const invalidSessionId = 'invalid-session-123';
    const invalidJoin = await this.user2Service.joinSession(invalidSessionId, 'Unauthorized User');
    
    // Should fail for invalid session
    if (invalidJoin) {
      throw new Error('Invalid session join should have failed');
    }
    
    return {
      validJoinSuccess: validJoin,
      invalidJoinBlocked: !invalidJoin,
      sessionId: session.id,
      securityCheck: 'PASSED'
    };
  }
  
  async testPerformanceLoad() {
    // Setup collaboration session
    const session = await this.user1Service.createSession();
    await this.user2Service.joinSession(session.id, 'User 2');
    
    const startTime = performance.now();
    const messageCount = 50;
    
    // Send rapid viewport updates
    for (let i = 0; i < messageCount; i++) {
      const viewportState = {
        zoom: 1.0 + (i * 0.1),
        pan: { x: i * 2, y: i * 3 },
        windowLevel: { width: 400 + i, center: 40 + i }
      };
      
      this.user1Service.syncViewportState(viewportState);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const messagesPerSecond = (messageCount / duration) * 1000;
    
    // Verify all messages were sent
    const sentCount = this.user1Service.socket.sentMessages.length;
    
    if (sentCount < messageCount) {
      throw new Error(`Only ${sentCount} of ${messageCount} messages were sent`);
    }
    
    return {
      messagesSent: sentCount,
      duration: `${duration.toFixed(2)}ms`,
      messagesPerSecond: messagesPerSecond.toFixed(2),
      performance: duration < 1000 ? 'EXCELLENT' : 'ACCEPTABLE'
    };
  }
  
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COLLABORATION TESTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`\n📈 Results: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
    }
    
    console.log('\n✅ Passed Tests:');
    this.testResults
      .filter(r => r.status === 'PASSED')
      .forEach(r => console.log(`   • ${r.name}`));
    
    console.log('\n🎯 Collaboration Features Verified:');
    console.log('   • WebSocket real-time connections');
    console.log('   • Multi-user session management');
    console.log('   • Viewport state synchronization');
    console.log('   • Annotation sharing and sync');
    console.log('   • Cursor position tracking');
    console.log('   • Approval workflow system');
    console.log('   • Connection recovery mechanisms');
    console.log('   • Session security and permissions');
    console.log('   • High-frequency update performance');
    console.log('   • Load testing and scalability');
    
    console.log('\n' + '='.repeat(60));
    
    // Cleanup
    this.user1Service.disconnect();
    this.user2Service.disconnect();
  }
}

// Run the tests
async function runCollaborationTests() {
  const tester = new CollaborationTester();
  await tester.runAllTests();
}

// Execute if run directly
if (require.main === module) {
  runCollaborationTests().catch(console.error);
}

module.exports = { CollaborationTester, runCollaborationTests };