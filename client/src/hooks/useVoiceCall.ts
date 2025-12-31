/**
 * useVoiceCall Hook
 * 管理语音通话的完整生命周期
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import VoiceCallService, { CallStats } from '@/lib/voiceCallService';

export interface UseVoiceCallState {
  isCallActive: boolean;
  isConnecting: boolean;
  isRecording: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStats: CallStats | null;
  error: string | null;
  callDuration: number;
}

export interface UseVoiceCallActions {
  startCall: () => Promise<void>;
  endCall: () => void;
  startRecording: () => void;
  stopRecording: () => Blob | null;
  getStats: () => Promise<CallStats | null>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: () => Promise<RTCSessionDescriptionInit>;
}

export function useVoiceCall(): [UseVoiceCallState, UseVoiceCallActions] {
  const [state, setState] = useState<UseVoiceCallState>({
    isCallActive: false,
    isConnecting: false,
    isRecording: false,
    localStream: null,
    remoteStream: null,
    callStats: null,
    error: null,
    callDuration: 0,
  });

  const serviceRef = useRef<VoiceCallService | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化服务
  useEffect(() => {
    serviceRef.current = new VoiceCallService({
      enableRecording: true,
      recordingFormat: 'webm',
    });

    return () => {
      if (serviceRef.current) {
        serviceRef.current.endCall();
      }
    };
  }, []);

  // 设置事件监听
  useEffect(() => {
    if (!serviceRef.current) return;

    const service = serviceRef.current;

    service.onRemoteStreamReceived = (stream) => {
      setState((prev) => ({
        ...prev,
        remoteStream: stream,
        isConnecting: false,
      }));
    };

    service.onConnectionFailed = () => {
      setState((prev) => ({
        ...prev,
        error: '连接失败，请重试',
        isConnecting: false,
      }));
    };

    service.onStatsUpdate = (stats) => {
      setState((prev) => ({
        ...prev,
        callStats: stats,
      }));
    };
  }, []);

  // 启动通话
  const startCall = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null, isConnecting: true }));

      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      // 初始化本地流
      const localStream = await serviceRef.current.initializeLocalStream();

      // 创建 PeerConnection
      serviceRef.current.createPeerConnection();

      // 启动统计监控
      serviceRef.current.startStatsMonitoring(1000);

      // 标记通话为活跃
      serviceRef.current.setActive(true);

      setState((prev) => ({
        ...prev,
        isCallActive: true,
        localStream,
        isConnecting: false,
      }));

      // 启动通话计时
      let duration = 0;
      durationIntervalRef.current = setInterval(() => {
        duration += 1;
        setState((prev) => ({
          ...prev,
          callDuration: duration,
        }));
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '启动通话失败';
      setState((prev) => ({
        ...prev,
        error: message,
        isConnecting: false,
      }));
    }
  }, []);

  // 结束通话
  const endCall = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.endCall();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setState((prev) => ({
      ...prev,
      isCallActive: false,
      localStream: null,
      remoteStream: null,
      isRecording: false,
      callDuration: 0,
    }));
  }, []);

  // 开始录音
  const startRecording = useCallback(() => {
    try {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      serviceRef.current.startRecording();
      setState((prev) => ({
        ...prev,
        isRecording: true,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '录音失败';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback((): Blob | null => {
    try {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      const blob = serviceRef.current.stopRecording();
      setState((prev) => ({
        ...prev,
        isRecording: false,
      }));

      return blob;
    } catch (error) {
      const message = error instanceof Error ? error.message : '停止录音失败';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      return null;
    }
  }, []);

  // 获取统计信息
  const getStats = useCallback(async (): Promise<CallStats | null> => {
    if (!serviceRef.current) {
      return null;
    }

    return serviceRef.current.getCallStats();
  }, []);

  // 添加 ICE 候选
  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      try {
        if (!serviceRef.current) {
          throw new Error('Service not initialized');
        }

        await serviceRef.current.addIceCandidate(candidate);
      } catch (error) {
        const message = error instanceof Error ? error.message : '添加候选失败';
        setState((prev) => ({
          ...prev,
          error: message,
        }));
      }
    },
    []
  );

  // 设置远程描述
  const setRemoteDescription = useCallback(
    async (description: RTCSessionDescriptionInit) => {
      try {
        if (!serviceRef.current) {
          throw new Error('Service not initialized');
        }

        await serviceRef.current.setRemoteDescription(description);
      } catch (error) {
        const message = error instanceof Error ? error.message : '设置远程描述失败';
        setState((prev) => ({
          ...prev,
          error: message,
        }));
      }
    },
    []
  );

  // 创建 Offer
  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    try {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      return await serviceRef.current.createOffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建 Offer 失败';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      throw error;
    }
  }, []);

  // 创建 Answer
  const createAnswer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    try {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      return await serviceRef.current.createAnswer();
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建 Answer 失败';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      throw error;
    }
  }, []);

  const actions: UseVoiceCallActions = {
    startCall,
    endCall,
    startRecording,
    stopRecording,
    getStats,
    addIceCandidate,
    setRemoteDescription,
    createOffer,
    createAnswer,
  };

  return [state, actions];
}

export default useVoiceCall;
