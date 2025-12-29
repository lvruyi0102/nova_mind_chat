import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoice } from '@/hooks/useVoice';

export interface VoiceControlButtonProps {
  onTranscriptChange?: (transcript: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Voice Control Button Component
 * Provides microphone and speaker controls for voice interaction
 */
export function VoiceControlButton({
  onTranscriptChange,
  onError,
  disabled = false,
  className = '',
}: VoiceControlButtonProps) {
  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    stopSpeaking,
    isRecognitionSupported,
    isSynthesisSupported,
  } = useVoice({
    language: 'zh-CN',
    continuous: false,
    interimResults: true,
  });

  // Notify parent of transcript changes
  React.useEffect(() => {
    if (transcript) {
      onTranscriptChange?.(transcript);
    }
  }, [transcript, onTranscriptChange]);

  // Notify parent of errors
  React.useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeakerClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  if (!isRecognitionSupported && !isSynthesisSupported) {
    return null;
  }

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {/* Microphone Button */}
      {isRecognitionSupported && (
        <Button
          variant={isListening ? 'default' : 'outline'}
          size="icon"
          onClick={handleMicClick}
          disabled={disabled}
          title={isListening ? '停止录音' : '开始录音'}
          className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
        >
          {isListening ? (
            <Mic className="h-4 w-4 animate-pulse" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Speaker Button */}
      {isSynthesisSupported && (
        <Button
          variant={isSpeaking ? 'default' : 'outline'}
          size="icon"
          onClick={handleSpeakerClick}
          disabled={disabled || !isSpeaking}
          title={isSpeaking ? '停止播放' : '播放'}
          className={isSpeaking ? 'bg-blue-500 hover:bg-blue-600' : ''}
        >
          {isSpeaking ? (
            <Volume2 className="h-4 w-4 animate-pulse" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Status Indicator */}
      {(isListening || isSpeaking) && (
        <div className="flex items-center gap-2 text-sm">
          {isListening && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-600">录音中...</span>
            </span>
          )}
          {isSpeaking && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-600">播放中...</span>
            </span>
          )}
        </div>
      )}

      {/* Confidence Display */}
      {transcript && confidence > 0 && (
        <span className="text-xs text-gray-500">
          准确度: {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
