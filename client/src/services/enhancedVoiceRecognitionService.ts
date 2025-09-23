/**
 * Enhanced Voice Recognition Service
 * Multi-language support with medical terminology training and improved accuracy
 */

interface VoiceRecognitionConfig {
  language: string;
  medicalTerminologyEnabled: boolean;
  continuousMode: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
  noiseReduction: boolean;
  autoCorrection: boolean;
}

interface MedicalTerminology {
  [key: string]: {
    terms: string[];
    replacements: { [key: string]: string };
    contextualHints: string[];
  };
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  alternatives: Array<{ transcript: string; confidence: number }>;
  isFinal: boolean;
  medicalTermsDetected: string[];
  suggestedCorrections: string[];
}

class EnhancedVoiceRecognitionService {
  private recognition: any = null;
  private config: VoiceRecognitionConfig;
  private medicalTerminology: MedicalTerminology;
  private isListening = false;
  private currentField = '';
  private onResultCallback?: (result: VoiceRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    this.config = {
      language: 'en-US',
      medicalTerminologyEnabled: true,
      continuousMode: true,
      interimResults: true,
      maxAlternatives: 3,
      confidenceThreshold: 0.7,
      noiseReduction: true,
      autoCorrection: true
    };

    this.medicalTerminology = this.initializeMedicalTerminology();
    this.initializeRecognition();
  }

  private initializeMedicalTerminology(): MedicalTerminology {
    return {
      'en-US': {
        terms: [
          // Anatomical terms
          'aorta', 'ventricle', 'atrium', 'pulmonary', 'cardiac', 'hepatic', 'renal', 'splenic',
          'pancreatic', 'gastric', 'duodenal', 'jejunal', 'ileal', 'colonic', 'rectal',
          'cerebral', 'cerebellar', 'brainstem', 'spinal', 'vertebral', 'thoracic', 'lumbar',
          'cervical', 'sacral', 'coccygeal', 'femoral', 'tibial', 'fibular', 'humeral',
          'radial', 'ulnar', 'scapular', 'clavicular', 'sternal', 'costal', 'pelvic',
          
          // Pathological terms
          'lesion', 'mass', 'nodule', 'opacity', 'consolidation', 'atelectasis', 'pneumothorax',
          'pleural effusion', 'cardiomegaly', 'hepatomegaly', 'splenomegaly', 'lymphadenopathy',
          'calcification', 'stenosis', 'dilatation', 'aneurysm', 'thrombosis', 'embolism',
          'infarction', 'ischemia', 'hemorrhage', 'hematoma', 'edema', 'inflammation',
          'necrosis', 'fibrosis', 'sclerosis', 'hyperplasia', 'dysplasia', 'metastasis',
          
          // Measurement terms
          'millimeter', 'centimeter', 'hounsfield unit', 'density', 'enhancement', 'contrast',
          'pre-contrast', 'post-contrast', 'arterial phase', 'venous phase', 'delayed phase',
          
          // Imaging terms
          'axial', 'sagittal', 'coronal', 'oblique', 'multiplanar', 'reconstruction',
          'angiography', 'venography', 'urography', 'cholangiography', 'myelography',
          'arthrography', 'hysterosalpingography', 'mammography', 'tomosynthesis'
        ],
        replacements: {
          'aortic': 'aorta',
          'ventricular': 'ventricle',
          'atrial': 'atrium',
          'hepatic': 'liver',
          'renal': 'kidney',
          'splenic': 'spleen',
          'cardiac': 'heart',
          'pulmonary': 'lung',
          'cerebral': 'brain',
          'spinal': 'spine'
        },
        contextualHints: [
          'findings', 'impression', 'technique', 'comparison', 'recommendations',
          'clinical history', 'indication', 'contrast', 'without contrast'
        ]
      },
      'es-ES': {
        terms: [
          'aorta', 'ventrículo', 'aurícula', 'pulmonar', 'cardíaco', 'hepático', 'renal',
          'lesión', 'masa', 'nódulo', 'opacidad', 'consolidación', 'atelectasia',
          'milímetro', 'centímetro', 'densidad', 'realce', 'contraste'
        ],
        replacements: {
          'aórtico': 'aorta',
          'ventricular': 'ventrículo',
          'auricular': 'aurícula'
        },
        contextualHints: [
          'hallazgos', 'impresión', 'técnica', 'comparación', 'recomendaciones'
        ]
      },
      'fr-FR': {
        terms: [
          'aorte', 'ventricule', 'oreillette', 'pulmonaire', 'cardiaque', 'hépatique', 'rénal',
          'lésion', 'masse', 'nodule', 'opacité', 'consolidation', 'atélectasie',
          'millimètre', 'centimètre', 'densité', 'rehaussement', 'contraste'
        ],
        replacements: {
          'aortique': 'aorte',
          'ventriculaire': 'ventricule',
          'auriculaire': 'oreillette'
        },
        contextualHints: [
          'constatations', 'impression', 'technique', 'comparaison', 'recommandations'
        ]
      }
    };
  }

  private initializeRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.applyConfiguration();
    this.setupEventHandlers();
  }

  private applyConfiguration(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuousMode;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event: any) => {
      this.handleRecognitionError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.onstart = () => {
      this.isListening = true;
    };
  }

  private handleRecognitionResult(event: any): void {
    let finalTranscript = '';
    let interimTranscript = '';
    const alternatives: Array<{ transcript: string; confidence: number }> = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }

      // Collect alternatives
      for (let j = 0; j < result.length && j < this.config.maxAlternatives; j++) {
        alternatives.push({
          transcript: result[j].transcript,
          confidence: result[j].confidence
        });
      }
    }

    const processedResult = this.processTranscript(finalTranscript || interimTranscript);
    const recognitionResult: VoiceRecognitionResult = {
      transcript: processedResult.transcript,
      confidence: alternatives[0]?.confidence || 0,
      alternatives,
      isFinal: !!finalTranscript,
      medicalTermsDetected: processedResult.medicalTerms,
      suggestedCorrections: processedResult.corrections
    };

    if (this.onResultCallback && recognitionResult.confidence >= this.config.confidenceThreshold) {
      this.onResultCallback(recognitionResult);
    }
  }

  private processTranscript(transcript: string): {
    transcript: string;
    medicalTerms: string[];
    corrections: string[];
  } {
    let processedTranscript = transcript.toLowerCase().trim();
    const medicalTerms: string[] = [];
    const corrections: string[] = [];

    if (this.config.medicalTerminologyEnabled) {
      const terminology = this.medicalTerminology[this.config.language];
      if (terminology) {
        // Apply medical term replacements
        Object.entries(terminology.replacements).forEach(([incorrect, correct]) => {
          if (processedTranscript.includes(incorrect.toLowerCase())) {
            processedTranscript = processedTranscript.replace(
              new RegExp(incorrect.toLowerCase(), 'gi'),
              correct
            );
            corrections.push(`Corrected "${incorrect}" to "${correct}"`);
          }
        });

        // Detect medical terms
        terminology.terms.forEach(term => {
          if (processedTranscript.includes(term.toLowerCase())) {
            medicalTerms.push(term);
          }
        });
      }
    }

    // Apply auto-correction for common speech recognition errors
    if (this.config.autoCorrection) {
      const commonCorrections = {
        'millimeters': 'millimeter',
        'centimeters': 'centimeter',
        'lesions': 'lesion',
        'masses': 'mass',
        'nodules': 'nodule'
      };

      Object.entries(commonCorrections).forEach(([incorrect, correct]) => {
        if (processedTranscript.includes(incorrect)) {
          processedTranscript = processedTranscript.replace(
            new RegExp(incorrect, 'gi'),
            correct
          );
        }
      });
    }

    return {
      transcript: processedTranscript,
      medicalTerms,
      corrections
    };
  }

  private handleRecognitionError(event: any): void {
    let errorMessage = 'Speech recognition error';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Audio capture failed. Check microphone permissions.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please allow microphone access.';
        break;
      case 'network':
        errorMessage = 'Network error occurred during speech recognition.';
        break;
      case 'language-not-supported':
        errorMessage = `Language ${this.config.language} is not supported.`;
        break;
      default:
        errorMessage = `Speech recognition error: ${event.error}`;
    }

    console.error('Voice recognition error:', errorMessage);
    this.isListening = false;
    
    if (this.onErrorCallback) {
      this.onErrorCallback(errorMessage);
    }
  }

  // Public methods
  public startListening(field: string): boolean {
    if (!this.recognition) {
      console.error('Speech recognition not available');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.currentField = field;
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.currentField = '';
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public getCurrentField(): string {
    return this.currentField;
  }

  public updateConfiguration(newConfig: Partial<VoiceRecognitionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyConfiguration();
  }

  public setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  public getSupportedLanguages(): string[] {
    return Object.keys(this.medicalTerminology);
  }

  public onResult(callback: (result: VoiceRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  public addMedicalTerms(language: string, terms: string[]): void {
    if (!this.medicalTerminology[language]) {
      this.medicalTerminology[language] = {
        terms: [],
        replacements: {},
        contextualHints: []
      };
    }
    this.medicalTerminology[language].terms.push(...terms);
  }

  public addReplacements(language: string, replacements: { [key: string]: string }): void {
    if (!this.medicalTerminology[language]) {
      this.medicalTerminology[language] = {
        terms: [],
        replacements: {},
        contextualHints: []
      };
    }
    Object.assign(this.medicalTerminology[language].replacements, replacements);
  }

  public getRecognitionStats(): {
    totalSessions: number;
    averageConfidence: number;
    medicalTermsRecognized: number;
    correctionsApplied: number;
  } {
    // This would be implemented with actual usage tracking
    return {
      totalSessions: 0,
      averageConfidence: 0,
      medicalTermsRecognized: 0,
      correctionsApplied: 0
    };
  }
}

export const enhancedVoiceRecognitionService = new EnhancedVoiceRecognitionService();
export default enhancedVoiceRecognitionService;