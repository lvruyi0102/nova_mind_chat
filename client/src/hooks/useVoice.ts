import { useState, useEffect, useCallback, useRef } from 'react';
import { getVoiceService, VoiceService, VoiceLanguage, VoiceRecognitionResult } from '@/lib/voiceService';

export interface UseVoiceOptions {
  language?: VoiceLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  autoStart?: boolean;
}

export interface UseVoiceReturn {
  // State
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;

  // Recognition controls
  startListening: () => void;
  stopListening: () => void;
  abortListening: () => void;
  clearTranscript: () => void;

  // Synthesis controls
  speak: (text: string, options?: { rate?: number; pitch?: number; volume?: number }) => void;
  stopSpeaking: () => void;

  // Settings
  setLanguage: (language: VoiceLanguage) => void;
  isRecognitionSupported: boolean;
  isSynthesisSupported: boolean;
}

export function useVoice(options?: UseVoiceOptions): UseVoiceReturn {
  const voiceServiceRef = useRef<VoiceService | null>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(true);
  const [isSynthesisSupported, setIsSynthesisSupported] = useState(true);

  // Initialize voice service
  useEffect(() => {
    try {
      voiceServiceRef.current = getVoiceService({
        language: options?.language || 'zh-CN',
        continuous: options?.continuous ?? false,
        interimResults: options?.interimResults ?? true,
      });

      setIsRecognitionSupported(voiceServiceRef.current.isRecognitionSupported());
      setIsSynthesisSupported(voiceServiceRef.current.isSynthesisSupported());

      // Setup callbacks
      voiceServiceRef.current.onResult((result: VoiceRecognitionResult) => {
        if (result.isFinal) {
          setTranscript((prev) => prev + (prev ? ' ' : '') + result.transcript);
          setInterimTranscript('');
          setConfidence(result.confidence);
        } else {
          setInterimTranscript(result.transcript);
        }
        setError(null);
      });

      voiceServiceRef.current.onError((errorMsg: string) => {
        setError(errorMsg);
        setIsListening(false);
      });

      voiceServiceRef.current.onStart(() => {
        setIsListening(true);
        setError(null);
      });

      voiceServiceRef.current.onEnd(() => {
        setIsListening(false);
      });

      if (options?.autoStart) {
        voiceServiceRef.current.startListening();
      }
    } catch (err) {
      console.error('Failed to initialize voice service:', err);
      setError('语音服务初始化失败');
    }

    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.abort();
        voiceServiceRef.current.stopSpeaking();
      }
    };
  }, [options?.language, options?.continuous, options?.interimResults, options?.autoStart]);

  const startListening = useCallback(() => {
    if (voiceServiceRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      voiceServiceRef.current.startListening();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (voiceServiceRef.current && isListening) {
      voiceServiceRef.current.stopListening();
    }
  }, [isListening]);

  const abortListening = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.abort();
      setIsListening(false);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  const speak = useCallback(
    (text: string, speakOptions?: { rate?: number; pitch?: number; volume?: number }) => {
      if (voiceServiceRef.current && isSynthesisSupported) {
        setIsSpeaking(true);
        voiceServiceRef.current.speak(text, speakOptions);
        
        // Estimate speaking duration (rough approximation)
        const estimatedDuration = (text.length / 10) * 1000;
        setTimeout(() => {
          setIsSpeaking(false);
        }, estimatedDuration);
      }
    },
    [isSynthesisSupported]
  );

  const stopSpeaking = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopSpeaking();
      setIsSpeaking(false);
    }
  }, []);

  const setLanguage = useCallback((language: VoiceLanguage) => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setLanguage(language);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    abortListening,
    clearTranscript,
    speak,
    stopSpeaking,
    setLanguage,
    isRecognitionSupported,
    isSynthesisSupported,
  };
}
