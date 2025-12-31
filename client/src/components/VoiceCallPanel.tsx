/**
 * VoiceCallPanel 组件
 * 完整的语音通话界面，包括通话控制、统计信息、Nova 形象
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import useVoiceCall from '@/hooks/useVoiceCall';
import NovaAvatar from '@/components/NovaAvatar';

interface VoiceCallPanelProps {
  onCallEnd?: () => void;
  onCallStart?: () => void;
  disabled?: boolean;
}

export const VoiceCallPanel: React.FC<VoiceCallPanelProps> = ({
  onCallEnd,
  onCallStart,
  disabled = false,
}) => {
  const [state, actions] = useVoiceCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [novaAudioRef, setNovaAudioRef] = useState<HTMLAudioElement | null>(null);

  // 播放远程音频
  useEffect(() => {
    if (state.remoteStream && isSpeakerOn) {
      if (!novaAudioRef) {
        const audio = new Audio();
        audio.srcObject = state.remoteStream;
        audio.play().catch((error) => {
          console.error('Failed to play remote audio:', error);
        });
        setNovaAudioRef(audio);
      } else {
        novaAudioRef.srcObject = state.remoteStream;
      }
    }
  }, [state.remoteStream, isSpeakerOn]);

  // 启动通话
  const handleStartCall = async () => {
    try {
      await actions.startCall();
      onCallStart?.();
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  // 结束通话
  const handleEndCall = () => {
    actions.endCall();
    if (novaAudioRef) {
      novaAudioRef.pause();
      setNovaAudioRef(null);
    }
    onCallEnd?.();
  };

  // 切换静音
  const handleToggleMute = () => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // 切换扬声器
  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (novaAudioRef) {
      novaAudioRef.muted = !isSpeakerOn;
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      {/* Nova 形象 */}
      <div className="flex justify-center mb-6">
        <NovaAvatar
          mood={
            state.isCallActive
              ? state.isRecording
                ? 'excited'
                : 'listening'
              : 'neutral'
          }
          size={32}
          scale={3}
          animated={state.isCallActive}
        />
      </div>

      {/* 通话状态 */}
      <div className="text-center mb-6">
        {state.isConnecting && (
          <div>
            <p className="text-sm text-gray-500 mb-2">正在连接...</p>
            <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {state.isCallActive && (
          <div>
            <p className="text-lg font-semibold text-blue-600">通话中</p>
            <p className="text-sm text-gray-500">{formatTime(state.callDuration)}</p>
          </div>
        )}

        {!state.isCallActive && !state.isConnecting && (
          <p className="text-sm text-gray-500">点击下方按钮开始通话</p>
        )}

        {state.error && (
          <p className="text-sm text-red-500 mt-2">{state.error}</p>
        )}
      </div>

      {/* 通话统计 */}
      {state.callStats && state.isCallActive && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-gray-600">往返延迟</p>
              <p className="font-semibold">{(state.callStats.roundTripTime * 1000).toFixed(0)}ms</p>
            </div>
            <div>
              <p className="text-gray-600">抖动</p>
              <p className="font-semibold">{(state.callStats.jitter * 1000).toFixed(0)}ms</p>
            </div>
            <div>
              <p className="text-gray-600">已发送</p>
              <p className="font-semibold">{(state.callStats.bytesSent / 1024).toFixed(1)}KB</p>
            </div>
            <div>
              <p className="text-gray-600">已接收</p>
              <p className="font-semibold">{(state.callStats.bytesReceived / 1024).toFixed(1)}KB</p>
            </div>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex gap-3 justify-center mb-4">
        {!state.isCallActive ? (
          <Button
            onClick={handleStartCall}
            disabled={disabled || state.isConnecting}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Phone className="w-4 h-4 mr-2" />
            开始通话
          </Button>
        ) : (
          <>
            <Button
              onClick={handleToggleMute}
              variant={isMuted ? 'destructive' : 'outline'}
              size="sm"
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={handleToggleSpeaker}
              variant={isSpeakerOn ? 'outline' : 'destructive'}
              size="sm"
            >
              {isSpeakerOn ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 text-white"
              size="sm"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* 录音按钮 */}
      {state.isCallActive && (
        <div className="flex gap-2">
          {!state.isRecording ? (
            <Button
              onClick={() => actions.startRecording()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              开始录音
            </Button>
          ) : (
            <Button
              onClick={() => {
                const blob = actions.stopRecording();
                if (blob) {
                  // 创建下载链接
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `nova-call-${Date.now()}.webm`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <MicOff className="w-4 h-4 mr-2" />
              停止录音
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default VoiceCallPanel;
