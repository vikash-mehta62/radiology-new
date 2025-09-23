/**
 * Voice Input Service
 * Provides speech-to-text functionality for hands-free report dictation
 * Supports medical terminology and custom vocabulary
 */

import { auditService } from './auditService';
import { performanceMonitor } from './performanceMonitor';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export interface VoiceInputConfig {
  language: string;
  medicalVocabulary: boolean;
  continuousRecognition: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  medicalTerms?: Array<{
    term: string;
    confidence: number;
    position: { start: number; end: number };
  }>;
}

export interface VoiceInputSession {
  sessionId: string;
  reportId?: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  wordCount: number;
  averageConfidence: number;
  medicalTermsDetected: number;
  status: 'active' | 'paused' | 'completed' | 'error';
}

export interface VoiceCommand {
  command: string;
  action: 'insert' | 'replace' | 'delete' | 'navigate' | 'format' | 'save';
  parameters?: Record<string, any>;
  confidence: number;
}

class VoiceInputService {
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean = false;
  private currentSession: VoiceInputSession | null = null;
  private config: VoiceInputConfig;
  private medicalTerms: Set<string> = new Set();
  private voiceCommands: Map<string, VoiceCommand> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeMedicalVocabulary();
    this.initializeVoiceCommands();
    // Initialize support check after other setup
    this.isSupported = this.checkBrowserSupport();
  }

  /**
   * Check if browser supports speech recognition
   */
  private checkBrowserSupport(): boolean {
    // Check for global SpeechRecognition (including test environment)
    if (typeof global !== 'undefined' && (global as any).SpeechRecognition) {
      return true;
    }
    
    // Check for window-based speech recognition
    if (typeof window !== 'undefined') {
      return !!(
        window.SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition
      );
    }
    
    return false;
  }

  /**
   * Get default voice input configuration
   */
  private getDefaultConfig(): VoiceInputConfig {
    return {
      language: 'en-US',
      medicalVocabulary: true,
      continuousRecognition: true,
      interimResults: true,
      maxAlternatives: 3,
      confidenceThreshold: 0.7
    };
  }

  /**
   * Initialize medical vocabulary for better recognition
   */
  private initializeMedicalVocabulary(): void {
    const medicalTerms = [
      // Anatomy
      'aorta', 'ventricle', 'atrium', 'pulmonary', 'cardiac', 'hepatic', 'renal',
      'cerebral', 'thoracic', 'abdominal', 'pelvic', 'lumbar', 'cervical',
      
      // Pathology
      'pneumonia', 'pneumothorax', 'pleural', 'effusion', 'consolidation',
      'nodule', 'mass', 'lesion', 'tumor', 'carcinoma', 'adenocarcinoma',
      'metastasis', 'metastatic', 'neoplasm', 'malignant', 'benign',
      
      // Imaging terms
      'hypodense', 'hyperdense', 'isodense', 'enhancement', 'contrast',
      'attenuation', 'signal', 'intensity', 'artifact', 'motion',
      
      // Measurements
      'millimeter', 'centimeter', 'hounsfield', 'units', 'diameter',
      'anteroposterior', 'transverse', 'craniocaudal',
      
      // Common findings
      'normal', 'abnormal', 'unremarkable', 'significant', 'acute', 'chronic',
      'mild', 'moderate', 'severe', 'extensive', 'focal', 'diffuse'
    ];

    medicalTerms.forEach(term => this.medicalTerms.add(term.toLowerCase()));
  }

  /**
   * Initialize voice commands for report navigation and editing
   */
  private initializeVoiceCommands(): void {
    const commands = [
      { command: 'new paragraph', action: 'insert', parameters: { text: '\n\n' } },
      { command: 'period', action: 'insert', parameters: { text: '. ' } },
      { command: 'comma', action: 'insert', parameters: { text: ', ' } },
      { command: 'colon', action: 'insert', parameters: { text: ': ' } },
      { command: 'semicolon', action: 'insert', parameters: { text: '; ' } },
      { command: 'question mark', action: 'insert', parameters: { text: '? ' } },
      { command: 'exclamation point', action: 'insert', parameters: { text: '! ' } },
      { command: 'go to findings', action: 'navigate', parameters: { section: 'findings' } },
      { command: 'go to impression', action: 'navigate', parameters: { section: 'impression' } },
      { command: 'go to recommendations', action: 'navigate', parameters: { section: 'recommendations' } },
      { command: 'save report', action: 'save', parameters: {} },
      { command: 'undo', action: 'delete', parameters: { type: 'undo' } },
      { command: 'delete last sentence', action: 'delete', parameters: { type: 'sentence' } },
      { command: 'delete last word', action: 'delete', parameters: { type: 'word' } }
    ];

    commands.forEach(cmd => {
      this.voiceCommands.set(cmd.command.toLowerCase(), {
        ...cmd,
        confidence: 0.9
      } as VoiceCommand);
    });
  }

  /**
   * Check if voice input is supported in current browser
   */
  isVoiceInputSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current voice input configuration
   */
  getConfiguration(): VoiceInputConfig {
    return { ...this.config };
  }

  /**
   * Update voice input configuration
   */
  updateConfiguration(newConfig: Partial<VoiceInputConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.recognition) {
      this.applyConfigurationToRecognition();
    }
  }

  /**
   * Apply configuration to speech recognition instance
   */
  private applyConfigurationToRecognition(): void {
    if (!this.recognition) return;

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuousRecognition;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  /**
   * Start voice input session
   */
  async startVoiceInput(reportId?: string): Promise<VoiceInputSession> {
    try {
      if (!this.isSupported) {
        throw new Error('Speech recognition is not supported in this browser');
      }

      console.log('🎤 Starting voice input session...');

      // Create new session
      this.currentSession = {
        sessionId: `voice-${Date.now()}`,
        reportId,
        startTime: new Date(),
        totalDuration: 0,
        wordCount: 0,
        averageConfidence: 0,
        medicalTermsDetected: 0,
        status: 'active'
      };

      // Initialize speech recognition
      const SpeechRecognition = (typeof global !== 'undefined' && (global as any).SpeechRecognition) ||
                               (typeof window !== 'undefined' && window.SpeechRecognition) || 
                               (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) ||
                               (typeof window !== 'undefined' && (window as any).mozSpeechRecognition) ||
                               (typeof window !== 'undefined' && (window as any).msSpeechRecognition);

      this.recognition = new SpeechRecognition();
      this.applyConfigurationToRecognition();

      // Log audit event
      await auditService.logEvent({
        event_type: 'report_created', // Using existing event type
        event_description: `Voice input session started for report ${reportId || 'new'}`,
        resource_type: 'Report',
        resource_id: reportId || this.currentSession.sessionId,
        report_id: reportId,
        metadata: {
          action_details: {
            session_id: this.currentSession.sessionId,
            voice_config: this.config
          }
        }
      });

      console.log('✅ Voice input session started:', this.currentSession.sessionId);
      return this.currentSession;
    } catch (error) {
      console.error('❌ Failed to start voice input:', error);
      throw new Error('Failed to start voice input. Please check microphone permissions.');
    }
  }

  /**
   * Stop voice input session
   */
  async stopVoiceInput(): Promise<VoiceInputSession | null> {
    try {
      if (!this.currentSession || !this.recognition) {
        return null;
      }

      console.log('🛑 Stopping voice input session...');

      this.recognition.stop();
      
      const endTime = new Date();
      this.currentSession.endTime = endTime;
      this.currentSession.totalDuration = endTime.getTime() - this.currentSession.startTime.getTime();
      this.currentSession.status = 'completed';

      // Log completion audit event
      await auditService.logEvent({
        event_type: 'report_updated',
        event_description: `Voice input session completed`,
        resource_type: 'Report',
        resource_id: this.currentSession.reportId || this.currentSession.sessionId,
        report_id: this.currentSession.reportId,
        metadata: {
          action_details: {
            session_id: this.currentSession.sessionId,
            duration_ms: this.currentSession.totalDuration,
            word_count: this.currentSession.wordCount,
            average_confidence: this.currentSession.averageConfidence,
            medical_terms_detected: this.currentSession.medicalTermsDetected
          }
        }
      });

      const completedSession = { ...this.currentSession };
      this.currentSession = null;
      this.recognition = null;

      console.log('✅ Voice input session completed:', completedSession.sessionId);
      return completedSession;
    } catch (error) {
      console.error('❌ Failed to stop voice input:', error);
      throw new Error('Failed to stop voice input session.');
    }
  }

  /**
   * Pause voice input session
   */
  pauseVoiceInput(): void {
    if (this.recognition && this.currentSession) {
      this.recognition.stop();
      this.currentSession.status = 'paused';
      console.log('⏸️ Voice input paused');
    }
  }

  /**
   * Resume voice input session
   */
  resumeVoiceInput(): void {
    if (this.recognition && this.currentSession) {
      this.recognition.start();
      this.currentSession.status = 'active';
      console.log('▶️ Voice input resumed');
    }
  }

  /**
   * Process speech recognition result
   */
  private processSpeechResult(event: SpeechRecognitionEvent): VoiceRecognitionResult {
    const result = event.results[event.resultIndex];
    const transcript = result[0].transcript;
    const confidence = result[0].confidence;

    // Check for voice commands
    const lowerTranscript = transcript.toLowerCase().trim();
    const voiceCommand = this.voiceCommands.get(lowerTranscript);

    if (voiceCommand && confidence >= this.config.confidenceThreshold) {
      // Handle voice command
      this.handleVoiceCommand(voiceCommand);
      return {
        transcript: '',
        confidence,
        isFinal: result.isFinal,
        alternatives: []
      };
    }

    // Process medical terms
    const medicalTerms = this.detectMedicalTerms(transcript);
    
    // Update session statistics
    if (this.currentSession && result.isFinal) {
      const words = transcript.split(' ').filter(word => word.length > 0);
      this.currentSession.wordCount += words.length;
      this.currentSession.medicalTermsDetected += medicalTerms.length;
      
      // Update average confidence
      const totalConfidence = this.currentSession.averageConfidence * (this.currentSession.wordCount - words.length) + confidence * words.length;
      this.currentSession.averageConfidence = totalConfidence / this.currentSession.wordCount;
    }

    // Prepare alternatives
    const alternatives = [];
    for (let i = 1; i < result.length && i < this.config.maxAlternatives; i++) {
      alternatives.push({
        transcript: result[i].transcript,
        confidence: result[i].confidence
      });
    }

    return {
      transcript,
      confidence,
      isFinal: result.isFinal,
      alternatives,
      medicalTerms
    };
  }

  /**
   * Detect medical terms in transcript
   */
  private detectMedicalTerms(transcript: string): Array<{
    term: string;
    confidence: number;
    position: { start: number; end: number };
  }> {
    const words = transcript.toLowerCase().split(' ');
    const detectedTerms = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      if (this.medicalTerms.has(word)) {
        const start = transcript.toLowerCase().indexOf(word);
        detectedTerms.push({
          term: word,
          confidence: 0.9, // High confidence for known medical terms
          position: { start, end: start + word.length }
        });
      }
    }

    return detectedTerms;
  }

  /**
   * Handle voice command execution
   */
  private handleVoiceCommand(command: VoiceCommand): void {
    console.log('🎯 Executing voice command:', command.command);
    
    // Emit custom event for voice command
    const event = new CustomEvent('voiceCommand', {
      detail: command
    });
    window.dispatchEvent(event);
  }

  /**
   * Set up event listeners for speech recognition
   */
  setupEventListeners(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      try {
        const result = this.processSpeechResult(event);
        onResult(result);
      } catch (error) {
        console.error('❌ Error processing speech result:', error);
        if (onError) onError('Failed to process speech result');
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      if (this.currentSession) {
        this.currentSession.status = 'error';
      }
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      console.log('🔚 Speech recognition ended');
      if (onEnd) onEnd();
    };

    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
    };
  }

  /**
   * Get current session information
   */
  getCurrentSession(): VoiceInputSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Add custom medical terms to vocabulary
   */
  addMedicalTerms(terms: string[]): void {
    terms.forEach(term => {
      this.medicalTerms.add(term.toLowerCase());
    });
    console.log(`✅ Added ${terms.length} medical terms to vocabulary`);
  }

  /**
   * Add custom voice commands
   */
  addVoiceCommands(commands: Array<{ command: string; action: VoiceCommand['action']; parameters?: any }>): void {
    commands.forEach(cmd => {
      this.voiceCommands.set(cmd.command.toLowerCase(), {
        command: cmd.command,
        action: cmd.action,
        parameters: cmd.parameters || {},
        confidence: 0.8
      });
    });
    console.log(`✅ Added ${commands.length} voice commands`);
  }

  /**
   * Get voice input statistics
   */
  getStatistics(): {
    sessionsToday: number;
    totalWordsToday: number;
    averageConfidence: number;
    medicalTermsDetected: number;
  } {
    // In a real implementation, this would fetch from a database
    return {
      sessionsToday: 0,
      totalWordsToday: 0,
      averageConfidence: 0,
      medicalTermsDetected: 0
    };
  }
}

export const voiceInputService = new VoiceInputService();
export default voiceInputService;