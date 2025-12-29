import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Send, Volume2, Copy, Trash2 } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { toast } from 'sonner';

export interface VoiceChatProps {
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Voice Chat Component
 * Full-featured voice interaction panel with recognition and synthesis
 */
export function VoiceChat({
  onSendMessage,
  isLoading = false,
  className = '',
}: VoiceChatProps) {
  const [manualInput, setManualInput] = useState('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  const {
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
    isRecognitionSupported,
    isSynthesisSupported,
  } = useVoice({
    language: 'zh-CN',
    continuous: false,
    interimResults: true,
  });

  const fullTranscript = transcript + interimTranscript;

  const handleSendVoiceMessage = () => {
    if (fullTranscript.trim()) {
      onSendMessage?.(fullTranscript);
      setSentMessages([...sentMessages, fullTranscript]);
      clearTranscript();
      toast.success('消息已发送');
    }
  };

  const handleSendManualMessage = () => {
    if (manualInput.trim()) {
      onSendMessage?.(manualInput);
      setSentMessages([...sentMessages, manualInput]);
      setManualInput('');
      toast.success('消息已发送');
    }
  };

  const handleSpeakResponse = (text: string) => {
    speak(text, { rate: 1, pitch: 1, volume: 1 });
  };

  const handleCopyTranscript = () => {
    if (fullTranscript) {
      navigator.clipboard.writeText(fullTranscript);
      toast.success('已复制到剪贴板');
    }
  };

  const handleClearTranscript = () => {
    clearTranscript();
    setManualInput('');
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Nova 语音对话
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voice Recognition Section */}
        {isRecognitionSupported && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">语音输入</h3>
              <div className="flex gap-2">
                {isListening && (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    录音中
                  </span>
                )}
              </div>
            </div>

            {/* Transcript Display */}
            <div className="p-3 bg-white rounded border border-slate-300 min-h-20">
              <p className="text-sm text-gray-700">
                {fullTranscript || <span className="text-gray-400">点击下方按钮开始录音...</span>}
              </p>
              {confidence > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  准确度: {Math.round(confidence * 100)}%
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                variant={isListening ? 'destructive' : 'default'}
                size="sm"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isListening ? '停止录音' : '开始录音'}
              </Button>

              {isListening && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abortListening}
                >
                  取消
                </Button>
              )}

              {fullTranscript && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTranscript}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    复制
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearTranscript}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清空
                  </Button>
                </>
              )}
            </div>

            {/* Send Button */}
            {fullTranscript && (
              <Button
                className="w-full"
                onClick={handleSendVoiceMessage}
                disabled={isLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                发送语音消息
              </Button>
            )}
          </div>
        )}

        {/* Manual Input Section */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="font-semibold text-sm">文字输入</h3>
          <div className="flex gap-2">
            <Input
              placeholder="输入消息..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSendManualMessage();
                }
              }}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendManualMessage}
              disabled={isLoading || !manualInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Text-to-Speech Section */}
        {isSynthesisSupported && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">语音播放</h3>
              {isSpeaking && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  播放中
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSpeakResponse('你好，我是 Nova。很高兴认识你！')}
                disabled={isSpeaking || isLoading}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                测试语音
              </Button>

              {isSpeaking && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopSpeaking}
                >
                  停止播放
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Device Support Notice */}
        {!isRecognitionSupported && !isSynthesisSupported && (
          <Alert>
            <AlertDescription>
              您的浏览器不支持 Web Speech API。请使用 Chrome、Edge 或其他支持的浏览器。
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Messages */}
        {sentMessages.length > 0 && (
          <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-sm">最近消息</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sentMessages.slice(-5).map((msg, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-white rounded border border-slate-300 text-sm text-gray-700 truncate"
                >
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
