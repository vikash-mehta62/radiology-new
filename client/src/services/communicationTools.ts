/**
 * Integrated Communication Tools
 * WebRTC-based voice/video communication with screen sharing and recording capabilities
 */

import { CollaborationModule, User, ChatMessage } from './collaborationModule';

export interface MediaSettings {
  audio: {
    enabled: boolean;
    deviceId?: string;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    volume: number; // 0-1
    muted: boolean;
  };
  video: {
    enabled: boolean;
    deviceId?: string;
    width: number;
    height: number;
    frameRate: number;
    facingMode: 'user' | 'environment';
    quality: 'low' | 'medium' | 'high';
  };
  screen: {
    enabled: boolean;
    includeAudio: boolean;
    cursor: 'always' | 'motion' | 'never';
    quality: 'low' | 'medium' | 'high';
  };
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  groupId: string;
}

export interface ParticipantMedia {
  userId: string;
  user: User;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  screenStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenEnabled: boolean;
  speaking: boolean;
  audioLevel: number; // 0-1
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ChatSettings {
  enableEmojis: boolean;
  enableMentions: boolean;
  enableFileSharing: boolean;
  enableMessageHistory: boolean;
  maxMessageLength: number;
  allowedFileTypes: string[];
  maxFileSize: number; // bytes
}

export interface RecordingSettings {
  enabled: boolean;
  includeAudio: boolean;
  includeVideo: boolean;
  includeScreen: boolean;
  includeChat: boolean;
  quality: 'low' | 'medium' | 'high';
  format: 'webm' | 'mp4';
  maxDuration: number; // minutes
}

export interface RecordingSession {
  id: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration: number; // seconds
  size: number; // bytes
  participants: string[]; // user IDs
  settings: RecordingSettings;
  status: 'recording' | 'stopped' | 'processing' | 'ready' | 'error';
  url?: string;
  error?: string;
}

export interface PointerTool {
  enabled: boolean;
  position: { x: number; y: number };
  visible: boolean;
  color: string;
  size: number;
  userId: string;
  userName: string;
}

class CommunicationTools {
  private collaborationModule: CollaborationModule;
  private mediaSettings: MediaSettings;
  private chatSettings: ChatSettings;
  private recordingSettings: RecordingSettings;
  
  // Media streams and devices
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private availableDevices: MediaDevice[] = [];
  private participantMedia: Map<string, ParticipantMedia> = new Map();
  
  // WebRTC peer connections
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  
  // Chat functionality
  private chatHistory: ChatMessage[] = [];
  private typingUsers: Set<string> = new Set();
  
  // Recording functionality
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private currentRecording: RecordingSession | null = null;
  
  // Pointer tools
  private pointerTools: Map<string, PointerTool> = new Map();
  
  // Event callbacks
  private onMediaStreamCallback?: (userId: string, stream: MediaStream, type: 'audio' | 'video' | 'screen') => void;
  private onChatMessageCallback?: (message: ChatMessage) => void;
  private onTypingCallback?: (userIds: string[]) => void;
  private onRecordingStatusCallback?: (recording: RecordingSession) => void;
  private onPointerUpdateCallback?: (pointers: PointerTool[]) => void;

  constructor(collaborationModule: CollaborationModule) {
    this.collaborationModule = collaborationModule;
    
    // Default settings
    this.mediaSettings = {
      audio: {
        enabled: false,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        volume: 1.0,
        muted: false
      },
      video: {
        enabled: false,
        width: 640,
        height: 480,
        frameRate: 30,
        facingMode: 'user',
        quality: 'medium'
      },
      screen: {
        enabled: false,
        includeAudio: false,
        cursor: 'motion',
        quality: 'medium'
      }
    };

    this.chatSettings = {
      enableEmojis: true,
      enableMentions: true,
      enableFileSharing: true,
      enableMessageHistory: true,
      maxMessageLength: 1000,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };

    this.recordingSettings = {
      enabled: false,
      includeAudio: true,
      includeVideo: true,
      includeScreen: false,
      includeChat: true,
      quality: 'medium',
      format: 'webm',
      maxDuration: 120 // 2 hours
    };

    this.initialize();
  }

  /**
   * Initialize communication tools
   */
  private async initialize(): Promise<void> {
    console.log('💬 [CommunicationTools] Initializing...');

    try {
      // Enumerate available media devices
      await this.enumerateDevices();

      // Setup collaboration module event listeners
      this.collaborationModule.on('chat-message', (message: ChatMessage) => {
        this.handleChatMessage(message);
      });

      this.collaborationModule.on('user-join', (user: User) => {
        this.handleUserJoin(user);
      });

      this.collaborationModule.on('user-leave', (data: any) => {
        this.handleUserLeave(data.userId);
      });

      console.log('💬 [CommunicationTools] Initialized successfully');
    } catch (error) {
      console.error('💬 [CommunicationTools] Initialization failed:', error);
    }
  }

  /**
   * Enumerate available media devices
   */
  public async enumerateDevices(): Promise<MediaDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
        kind: device.kind as 'audioinput' | 'audiooutput' | 'videoinput',
        groupId: device.groupId
      }));

      console.log('💬 [CommunicationTools] Found', this.availableDevices.length, 'media devices');
      return this.availableDevices;
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Start audio communication
   */
  public async startAudio(deviceId?: string): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: this.mediaSettings.audio.echoCancellation,
          noiseSuppression: this.mediaSettings.audio.noiseSuppression,
          autoGainControl: this.mediaSettings.audio.autoGainControl
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.localStream) {
        // Add audio tracks to existing stream
        stream.getAudioTracks().forEach(track => {
          this.localStream!.addTrack(track);
        });
      } else {
        this.localStream = stream;
      }

      this.mediaSettings.audio.enabled = true;
      this.mediaSettings.audio.deviceId = deviceId;

      // Setup audio level monitoring
      this.setupAudioLevelMonitoring(stream);

      // Add tracks to peer connections
      await this.addTracksToConnections(stream);

      console.log('💬 [CommunicationTools] Audio started');
      return true;
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to start audio:', error);
      return false;
    }
  }

  /**
   * Start video communication
   */
  public async startVideo(deviceId?: string): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: this.mediaSettings.video.width },
          height: { ideal: this.mediaSettings.video.height },
          frameRate: { ideal: this.mediaSettings.video.frameRate },
          facingMode: this.mediaSettings.video.facingMode
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.localStream) {
        // Add video tracks to existing stream
        stream.getVideoTracks().forEach(track => {
          this.localStream!.addTrack(track);
        });
      } else {
        this.localStream = stream;
      }

      this.mediaSettings.video.enabled = true;
      this.mediaSettings.video.deviceId = deviceId;

      // Add tracks to peer connections
      await this.addTracksToConnections(stream);

      console.log('💬 [CommunicationTools] Video started');
      return true;
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to start video:', error);
      return false;
    }
  }

  /**
   * Start screen sharing
   */
  public async startScreenShare(includeAudio: boolean = false): Promise<boolean> {
    try {
      const constraints: any = {
        video: {
          cursor: this.mediaSettings.screen.cursor,
          displaySurface: 'monitor'
        }
      };

      if (includeAudio) {
        constraints.audio = true;
      }

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      this.mediaSettings.screen.enabled = true;
      this.mediaSettings.screen.includeAudio = includeAudio;

      // Handle screen share end
      this.screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      // Add tracks to peer connections
      await this.addTracksToConnections(this.screenStream);

      console.log('💬 [CommunicationTools] Screen sharing started');
      return true;
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to start screen sharing:', error);
      return false;
    }
  }

  /**
   * Stop audio
   */
  public stopAudio(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.stop();
        this.localStream!.removeTrack(track);
      });
    }
    this.mediaSettings.audio.enabled = false;
    console.log('💬 [CommunicationTools] Audio stopped');
  }

  /**
   * Stop video
   */
  public stopVideo(): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.stop();
        this.localStream!.removeTrack(track);
      });
    }
    this.mediaSettings.video.enabled = false;
    console.log('💬 [CommunicationTools] Video stopped');
  }

  /**
   * Stop screen sharing
   */
  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.stop();
      });
      this.screenStream = null;
    }
    this.mediaSettings.screen.enabled = false;
    console.log('💬 [CommunicationTools] Screen sharing stopped');
  }

  /**
   * Mute/unmute audio
   */
  public toggleAudioMute(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      this.mediaSettings.audio.muted = !audioTracks[0]?.enabled;
    }
    return this.mediaSettings.audio.muted;
  }

  /**
   * Enable/disable video
   */
  public toggleVideo(): boolean {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      this.mediaSettings.video.enabled = videoTracks[0]?.enabled || false;
    }
    return this.mediaSettings.video.enabled;
  }

  /**
   * Send chat message
   */
  public async sendChatMessage(
    text: string,
    mentions?: string[],
    replyTo?: string,
    attachments?: File[]
  ): Promise<boolean> {
    try {
      // Process attachments if any
      let processedAttachments;
      if (attachments && attachments.length > 0) {
        processedAttachments = await this.processAttachments(attachments);
      }

      // Send message through collaboration module
      const success = await this.collaborationModule.sendChatMessage(text, mentions, replyTo);
      
      if (success) {
        console.log('💬 [CommunicationTools] Chat message sent');
      }
      
      return success;
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to send chat message:', error);
      return false;
    }
  }

  /**
   * Process file attachments
   */
  private async processAttachments(files: File[]): Promise<any[]> {
    const attachments = [];
    
    for (const file of files) {
      // Validate file type
      if (!this.chatSettings.allowedFileTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed`);
      }
      
      // Validate file size
      if (file.size > this.chatSettings.maxFileSize) {
        throw new Error(`File size exceeds limit of ${this.chatSettings.maxFileSize} bytes`);
      }
      
      // Upload file (simplified - would use proper file upload service)
      const url = await this.uploadFile(file);
      
      attachments.push({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url,
        name: file.name,
        size: file.size
      });
    }
    
    return attachments;
  }

  /**
   * Upload file (simplified implementation)
   */
  private async uploadFile(file: File): Promise<string> {
    // In a real implementation, this would upload to a file storage service
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Return data URL for now
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Start recording session
   */
  public async startRecording(): Promise<boolean> {
    try {
      if (!this.recordingSettings.enabled) {
        throw new Error('Recording not enabled');
      }

      // Create composite stream for recording
      const recordingStream = new MediaStream();
      
      if (this.recordingSettings.includeAudio && this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          recordingStream.addTrack(track);
        });
      }
      
      if (this.recordingSettings.includeVideo && this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          recordingStream.addTrack(track);
        });
      }
      
      if (this.recordingSettings.includeScreen && this.screenStream) {
        this.screenStream.getTracks().forEach(track => {
          recordingStream.addTrack(track);
        });
      }

      // Setup media recorder
      const options: MediaRecorderOptions = {
        mimeType: `video/${this.recordingSettings.format}`,
        videoBitsPerSecond: this.getVideoBitrate(this.recordingSettings.quality),
        audioBitsPerSecond: 128000
      };

      this.mediaRecorder = new MediaRecorder(recordingStream, options);
      this.recordingChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finalizeRecording();
      };

      // Create recording session
      this.currentRecording = {
        id: `recording-${Date.now()}`,
        sessionId: this.collaborationModule.getCurrentSession()?.id || '',
        startTime: new Date().toISOString(),
        duration: 0,
        size: 0,
        participants: this.collaborationModule.getParticipants().map(p => p.id),
        settings: { ...this.recordingSettings },
        status: 'recording'
      };

      this.mediaRecorder.start(1000); // Collect data every second

      console.log('💬 [CommunicationTools] Recording started');
      return true;
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Stop recording
   */
  public stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      console.log('💬 [CommunicationTools] Recording stopped');
    }
  }

  /**
   * Finalize recording
   */
  private async finalizeRecording(): Promise<void> {
    if (!this.currentRecording) return;

    try {
      // Create blob from chunks
      const blob = new Blob(this.recordingChunks, { 
        type: `video/${this.recordingSettings.format}` 
      });

      // Update recording info
      this.currentRecording.endTime = new Date().toISOString();
      this.currentRecording.duration = Math.floor(
        (new Date(this.currentRecording.endTime).getTime() - 
         new Date(this.currentRecording.startTime).getTime()) / 1000
      );
      this.currentRecording.size = blob.size;
      this.currentRecording.status = 'processing';

      // Create download URL
      this.currentRecording.url = URL.createObjectURL(blob);
      this.currentRecording.status = 'ready';

      // Notify callback
      if (this.onRecordingStatusCallback) {
        this.onRecordingStatusCallback(this.currentRecording);
      }

      console.log('💬 [CommunicationTools] Recording finalized:', this.currentRecording.duration, 'seconds');
    } catch (error) {
      console.error('💬 [CommunicationTools] Failed to finalize recording:', error);
      if (this.currentRecording) {
        this.currentRecording.status = 'error';
        this.currentRecording.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  /**
   * Update pointer tool
   */
  public updatePointer(position: { x: number; y: number }, visible: boolean = true): void {
    const currentUser = this.collaborationModule.getCurrentUser();
    if (!currentUser) return;

    const pointer: PointerTool = {
      enabled: true,
      position,
      visible,
      color: currentUser.color,
      size: 12,
      userId: currentUser.id,
      userName: currentUser.name
    };

    this.pointerTools.set(currentUser.id, pointer);

    // Send pointer update through data channel
    this.broadcastPointerUpdate(pointer);

    // Notify callback
    if (this.onPointerUpdateCallback) {
      this.onPointerUpdateCallback(Array.from(this.pointerTools.values()));
    }
  }  
/**
   * Handle incoming chat message
   */
  private handleChatMessage(message: ChatMessage): void {
    this.chatHistory.push(message);
    
    // Limit chat history
    if (this.chatHistory.length > 1000) {
      this.chatHistory = this.chatHistory.slice(-1000);
    }

    // Notify callback
    if (this.onChatMessageCallback) {
      this.onChatMessageCallback(message);
    }
  }

  /**
   * Handle user join
   */
  private async handleUserJoin(user: User): Promise<void> {
    console.log('💬 [CommunicationTools] User joined:', user.name);
    
    // Setup WebRTC connection for new user
    if (this.localStream || this.screenStream) {
      await this.setupPeerConnection(user.id);
    }
  }

  /**
   * Handle user leave
   */
  private handleUserLeave(userId: string): void {
    console.log('💬 [CommunicationTools] User left:', userId);
    
    // Clean up peer connection
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }

    // Clean up data channel
    this.dataChannels.delete(userId);

    // Remove participant media
    this.participantMedia.delete(userId);

    // Remove pointer
    this.pointerTools.delete(userId);
  }

  /**
   * Setup WebRTC peer connection
   */
  private async setupPeerConnection(userId: string): Promise<void> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    // Add local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        pc.addTrack(track, this.screenStream!);
      });
    }

    // Handle remote streams
    pc.ontrack = (event) => {
      this.handleRemoteStream(userId, event.streams[0]);
    };

    // Setup data channel for pointer and other data
    const dataChannel = pc.createDataChannel('communication', {
      ordered: true
    });
    
    dataChannel.onopen = () => {
      console.log('💬 [CommunicationTools] Data channel opened for user:', userId);
    };
    
    dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(userId, JSON.parse(event.data));
    };

    this.dataChannels.set(userId, dataChannel);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate through collaboration module
        // This would be handled by the signaling server
      }
    };

    this.peerConnections.set(userId, pc);
  }

  /**
   * Handle remote media stream
   */
  private handleRemoteStream(userId: string, stream: MediaStream): void {
    const user = this.collaborationModule.getParticipants().find(p => p.id === userId);
    if (!user) return;

    let participantMedia = this.participantMedia.get(userId);
    if (!participantMedia) {
      participantMedia = {
        userId,
        user,
        audioEnabled: false,
        videoEnabled: false,
        screenEnabled: false,
        speaking: false,
        audioLevel: 0,
        connectionQuality: 'good'
      };
      this.participantMedia.set(userId, participantMedia);
    }

    // Determine stream type and update participant media
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (audioTracks.length > 0) {
      participantMedia.audioStream = stream;
      participantMedia.audioEnabled = true;
      this.setupAudioLevelMonitoring(stream, userId);
    }

    if (videoTracks.length > 0) {
      // Determine if it's camera or screen share based on track settings
      const videoTrack = videoTracks[0];
      const settings = videoTrack.getSettings();
      
      if (settings.displaySurface) {
        participantMedia.screenStream = stream;
        participantMedia.screenEnabled = true;
      } else {
        participantMedia.videoStream = stream;
        participantMedia.videoEnabled = true;
      }
    }

    // Notify callback
    if (this.onMediaStreamCallback) {
      const streamType = audioTracks.length > 0 ? 'audio' : 
                        videoTracks.length > 0 && videoTracks[0].getSettings().displaySurface ? 'screen' : 'video';
      this.onMediaStreamCallback(userId, stream, streamType);
    }
  }

  /**
   * Setup audio level monitoring
   */
  private setupAudioLevelMonitoring(stream: MediaStream, userId?: string): void {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const level = average / 255;
      
      if (userId) {
        const participantMedia = this.participantMedia.get(userId);
        if (participantMedia) {
          participantMedia.audioLevel = level;
          participantMedia.speaking = level > 0.1;
        }
      }
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }

  /**
   * Add tracks to existing peer connections
   */
  private async addTracksToConnections(stream: MediaStream): Promise<void> {
    for (const pc of this.peerConnections.values()) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }
  }

  /**
   * Broadcast pointer update through data channels
   */
  private broadcastPointerUpdate(pointer: PointerTool): void {
    const message = {
      type: 'pointer-update',
      data: pointer
    };

    for (const dataChannel of this.dataChannels.values()) {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Handle data channel message
   */
  private handleDataChannelMessage(userId: string, message: any): void {
    switch (message.type) {
      case 'pointer-update':
        this.pointerTools.set(userId, message.data);
        if (this.onPointerUpdateCallback) {
          this.onPointerUpdateCallback(Array.from(this.pointerTools.values()));
        }
        break;
      case 'typing-indicator':
        if (message.data.typing) {
          this.typingUsers.add(userId);
        } else {
          this.typingUsers.delete(userId);
        }
        if (this.onTypingCallback) {
          this.onTypingCallback(Array.from(this.typingUsers));
        }
        break;
    }
  }

  /**
   * Send typing indicator
   */
  public sendTypingIndicator(typing: boolean): void {
    const message = {
      type: 'typing-indicator',
      data: { typing }
    };

    for (const dataChannel of this.dataChannels.values()) {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Get video bitrate based on quality
   */
  private getVideoBitrate(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'low': return 500000; // 500 kbps
      case 'medium': return 1000000; // 1 Mbps
      case 'high': return 2500000; // 2.5 Mbps
      default: return 1000000;
    }
  }

  /**
   * Set event callbacks
   */
  public setMediaStreamCallback(callback: (userId: string, stream: MediaStream, type: 'audio' | 'video' | 'screen') => void): void {
    this.onMediaStreamCallback = callback;
  }

  public setChatMessageCallback(callback: (message: ChatMessage) => void): void {
    this.onChatMessageCallback = callback;
  }

  public setTypingCallback(callback: (userIds: string[]) => void): void {
    this.onTypingCallback = callback;
  }

  public setRecordingStatusCallback(callback: (recording: RecordingSession) => void): void {
    this.onRecordingStatusCallback = callback;
  }

  public setPointerUpdateCallback(callback: (pointers: PointerTool[]) => void): void {
    this.onPointerUpdateCallback = callback;
  }

  /**
   * Get available devices
   */
  public getAvailableDevices(): MediaDevice[] {
    return [...this.availableDevices];
  }

  /**
   * Get participant media
   */
  public getParticipantMedia(): ParticipantMedia[] {
    return Array.from(this.participantMedia.values());
  }

  /**
   * Get chat history
   */
  public getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Get current recording
   */
  public getCurrentRecording(): RecordingSession | null {
    return this.currentRecording;
  }

  /**
   * Get pointer tools
   */
  public getPointerTools(): PointerTool[] {
    return Array.from(this.pointerTools.values());
  }

  /**
   * Update media settings
   */
  public updateMediaSettings(settings: Partial<MediaSettings>): void {
    this.mediaSettings = { ...this.mediaSettings, ...settings };
  }

  /**
   * Update chat settings
   */
  public updateChatSettings(settings: Partial<ChatSettings>): void {
    this.chatSettings = { ...this.chatSettings, ...settings };
  }

  /**
   * Update recording settings
   */
  public updateRecordingSettings(settings: Partial<RecordingSettings>): void {
    this.recordingSettings = { ...this.recordingSettings, ...settings };
  }

  /**
   * Get media settings
   */
  public getMediaSettings(): MediaSettings {
    return { ...this.mediaSettings };
  }

  /**
   * Get chat settings
   */
  public getChatSettings(): ChatSettings {
    return { ...this.chatSettings };
  }

  /**
   * Get recording settings
   */
  public getRecordingSettings(): RecordingSettings {
    return { ...this.recordingSettings };
  }

  /**
   * Check if media is supported
   */
  public isMediaSupported(): {
    audio: boolean;
    video: boolean;
    screen: boolean;
    recording: boolean;
  } {
    return {
      audio: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      video: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      screen: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      recording: !!(window.MediaRecorder)
    };
  }

  /**
   * Clear chat history
   */
  public clearChatHistory(): void {
    this.chatHistory = [];
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Stop all media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    // Close data channels
    this.dataChannels.clear();

    // Stop recording if active
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Clear state
    this.participantMedia.clear();
    this.pointerTools.clear();
    this.typingUsers.clear();

    console.log('💬 [CommunicationTools] Disposed');
  }
}

export { CommunicationTools };