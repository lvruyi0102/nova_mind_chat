/**
 * Voice Service - Handles speech recognition and text-to-speech
 * Uses Web Speech API for browser-native voice capabilities
 */

export type VoiceLanguage = 'zh-CN' | 'en-US' | 'zh-TW';

export interface VoiceServiceConfig {
  language?: VoiceLanguage;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private language: VoiceLanguage = 'zh-CN';
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(config?: VoiceServiceConfig) {
    this.language = config?.language || 'zh-CN';
    this.initializeRecognition(config);
    this.initializeSynthesis();
  }

  private initializeRecognition(config?: VoiceServiceConfig) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.language = this.language;
    this.recognition.continuous = config?.continuous ?? false;
    this.recognition.interimResults = config?.interimResults ?? true;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStartCallback?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      let isFinal = false;
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        transcript += transcriptSegment;

        if (event.results[i].isFinal) {
          isFinal = true;
          confidence = event.results[i][0].confidence;
        }
      }

      this.onResultCallback?.({
        transcript,
        isFinal,
        confidence,
      });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = this.getErrorMessage(event.error);
      this.onErrorCallback?.(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEndCallback?.();
    };
  }

  private initializeSynthesis() {
    this.synthesis = window.speechSynthesis;
  }

  /**
   * Start listening for voice input
   */
  public startListening(): void {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech Recognition not supported');
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }

  /**
   * Stop listening for voice input
   */
  public stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  /**
   * Abort current recognition
   */
  public abort(): void {
    if (!this.recognition) {
      return;
    }

    try {
      this.recognition.abort();
      this.isListening = false;
    } catch (error) {
      console.error('Error aborting recognition:', error);
    }
  }

  /**
   * Speak text using text-to-speech
   */
  public speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.synthesis) {
      this.onErrorCallback?.('Speech Synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.language = this.language;
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      this.onErrorCallback?.(`Speech synthesis error: ${event.error}`);
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  public stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if speech synthesis is supported
   */
  public isSynthesisSupported(): boolean {
    return !!this.synthesis;
  }

  /**
   * Check if speech recognition is supported
   */
  public isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  /**
   * Set language
   */
  public setLanguage(language: VoiceLanguage): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.language = language;
    }
  }

  /**
   * Register callback for recognition results
   */
  public onResult(callback: (result: VoiceRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Register callback for errors
   */
  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Register callback for start
   */
  public onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  /**
   * Register callback for end
   */
  public onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Convert error code to human-readable message
   */
  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'no-speech': '未检测到语音，请重试',
      'audio-capture': '无法访问麦克风，请检查权限',
      'network': '网络连接错误',
      'aborted': '语音识别已中止',
      'service-not-allowed': '语音识别服务不可用',
      'bad-grammar': '语法错误',
      'unknown': '未知错误',
    };

    return errorMessages[error] || `语音识别错误: ${error}`;
  }
}

// Create a singleton instance
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(config?: VoiceServiceConfig): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService(config);
  }
  return voiceServiceInstance;
}
