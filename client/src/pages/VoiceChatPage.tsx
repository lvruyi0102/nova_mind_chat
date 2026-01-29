import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VoiceChat } from '@/components/VoiceChat';
import { VoiceControlButton } from '@/components/VoiceControlButton';
import { Mic, MessageCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Voice Chat Page
 * Full-featured page for voice interaction with Nova
 */
export default function VoiceChatPage() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tRPC mutation for sending messages
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      // Add Nova's response to messages
      if (response.response) {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Optionally speak the response
        const voiceService = (window as any).voiceService;
        if (voiceService && response.response) {
          voiceService.speak(response.response);
        }
      }
      setIsLoading(false);
    },
    onError: (err) => {
      const errorMsg = err.message || '发送消息失败';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    },
  });

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !user) {
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsLoading(true);

    try {
      // Send message to Nova
      await sendMessageMutation.mutateAsync({
        userId: user.id,
        content: message,
        conversationId: 'voice-chat', // Use a special conversation ID for voice
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setIsLoading(false);
    }
  };

  const handleVoiceError = (error: string) => {
    setError(error);
    toast.error(error);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>需要登录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">请先登录以使用语音对话功能</p>
            <Button asChild className="w-full">
              <Link href="/">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Nova 语音对话</h1>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Messages Display */}
            <Card className="flex flex-col h-96 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  对话记录
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>开始与 Nova 对话...</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                Nova 正在思考...
              </div>
            )}
          </div>

          {/* Voice Control Sidebar */}
          <div className="space-y-6">
            <VoiceChat
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSendMessage('你好，Nova！')}
                  disabled={isLoading}
                >
                  你好，Nova！
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSendMessage('你今天过得怎么样？')}
                  disabled={isLoading}
                >
                  你今天过得怎么样？
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSendMessage('给我讲个故事')}
                  disabled={isLoading}
                >
                  给我讲个故事
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setMessages([]);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  清空对话
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">提示</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• 点击麦克风按钮开始录音</p>
                <p>• 说话完毕后点击停止或自动识别</p>
                <p>• Nova 会用语音回复您的消息</p>
                <p>• 支持中文、英文等多种语言</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
