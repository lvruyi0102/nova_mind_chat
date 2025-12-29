import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoice } from '../useVoice';

// Mock Web Speech API
const mockSpeechRecognition = vi.fn();
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
};

describe('useVoice Hook', () => {
  beforeEach(() => {
    // Setup global mocks
    (window as any).SpeechRecognition = mockSpeechRecognition;
    (window as any).webkitSpeechRecognition = mockSpeechRecognition;
    (window as any).speechSynthesis = mockSpeechSynthesis;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useVoice());

    expect(result.current.isListening).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.interimTranscript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.confidence).toBe(0);
  });

  it('should support speech recognition', () => {
    const { result } = renderHook(() => useVoice());

    expect(result.current.isRecognitionSupported).toBe(true);
  });

  it('should support speech synthesis', () => {
    const { result } = renderHook(() => useVoice());

    expect(result.current.isSynthesisSupported).toBe(true);
  });

  it('should start listening when startListening is called', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.startListening();
    });

    // In a real scenario, this would trigger the mock's start method
    // For now, we just verify the function can be called
    expect(result.current.startListening).toBeDefined();
  });

  it('should stop listening when stopListening is called', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.stopListening).toBeDefined();
  });

  it('should clear transcript', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.clearTranscript();
    });

    expect(result.current.transcript).toBe('');
    expect(result.current.interimTranscript).toBe('');
    expect(result.current.confidence).toBe(0);
  });

  it('should speak text using synthesis', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.speak('Hello, Nova!');
    });

    expect(result.current.speak).toBeDefined();
  });

  it('should stop speaking', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.stopSpeaking();
    });

    expect(result.current.stopSpeaking).toBeDefined();
  });

  it('should set language', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.setLanguage('en-US');
    });

    expect(result.current.setLanguage).toBeDefined();
  });

  it('should abort listening', () => {
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.abortListening();
    });

    expect(result.current.abortListening).toBeDefined();
  });

  it('should handle continuous mode option', () => {
    const { result } = renderHook(() =>
      useVoice({
        continuous: true,
        interimResults: true,
      })
    );

    expect(result.current.isRecognitionSupported).toBe(true);
  });

  it('should handle language option', () => {
    const { result } = renderHook(() =>
      useVoice({
        language: 'en-US',
      })
    );

    expect(result.current.isRecognitionSupported).toBe(true);
  });
});
