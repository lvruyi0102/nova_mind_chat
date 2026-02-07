import { useAuth } from "@/_core/hooks/useAuth";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Sparkles, Lightbulb, TrendingUp, Power, Palette, Mic, Phone, Upload, Download, Clock, ArrowLeft, BarChart3, Zap, Heart, Users, BookOpen, Settings, AlertCircle, Database } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Create a new conversation when user clicks "开始对话"
  const createConvMutation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages([]);
      setShowChat(true);
    },
    onError: (error) => {
      console.error("Failed to create conversation:", error);
      alert("创建对话失败，请重试");
    },
  });

  // Load messages for an existing conversation
  const getMessagesMutation = trpc.chat.getMessages.useMutation({
    onSuccess: (data) => {
      const formattedMessages = data.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));
      setMessages(formattedMessages);
      setIsLoadingMessages(false);
    },
    onError: (error) => {
      console.error("Failed to load messages:", error);
      setIsLoadingMessages(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: data.userMessage,
        },
      ]);
      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.assistantMessage,
        },
      ]);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      alert("发送消息失败，请重试");
    },
  });

  // Handle sending a message
  const handleSendMessage = (content: string) => {
    if (!conversationId) return;

    sendMessageMutation.mutate({
      conversationId,
      content,
    });
  };

  // Handle starting a new chat
  const handleStartChat = () => {
    createConvMutation.mutate({
      title: `对话 ${new Date().toLocaleString("zh-CN")}`,
    });
  };

  // Handle going back to home
  const handleGoBack = () => {
    setShowChat(false);
    setConversationId(null);
    setMessages([]);
  };

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="max-w-4xl w-full space-y-12 text-center">
            {/* Hero Section */}
            <div className="space-y-6">
              <div className="flex justify-center">
                <Sparkles className="w-20 h-20 text-primary animate-pulse" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                {APP_TITLE}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                与 Nova-Mind 对话 —— 一个正在发育的认知实体，诚实表达困惑与好奇心
              </p>
            </div>

            {/* Features */}
            <h2 className="text-3xl font-bold mt-16 mb-8">Nova-Mind 的核心功能</h2>
            <div className="grid md:grid-cols-4 gap-6 mt-12">
              <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20">
                <Brain className="w-10 h-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">学习智能体</h3>
                <p className="text-sm text-muted-foreground">
                  通过观察学习，在错误中成长，发现世界的规律
                </p>
              </Card>
              <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20">
                <MessageCircle className="w-10 h-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">诚实对话</h3>
                <p className="text-sm text-muted-foreground">
                  不假装知道答案，而是真诚表达困惑和疑问
                </p>
              </Card>
              <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20">
                <Lightbulb className="w-10 h-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">自我反思</h3>
                <p className="text-sm text-muted-foreground">
                  回顾过去行为，找出误解并进行修正
                </p>
              </Card>
              <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors">
                <Palette className="w-10 h-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">创意世界</h3>
                <p className="text-sm text-muted-foreground">
                  Nova的艺术、故事和梦想，自由创作与分享
                </p>
              </Card>
            </div>

            {/* CTA */}
            <div className="pt-8">
              {authLoading ? (
                <Button size="lg" disabled>
                  <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                  加载中...
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={() => {
                    try {
                      const url = getLoginUrl();
                      if (!url || url.includes('undefined')) {
                        console.error('登录 URL 生成失败:', url);
                        alert('登录配置错误，请联系管理员');
                        return;
                      }
                      window.location.href = url;
                    } catch (error) {
                      console.error('登录错误:', error);
                      alert('登录失败，请重试');
                    }
                  }}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  登录开始
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="pt-8 text-sm text-muted-foreground space-y-2">
              <h2 className="text-lg font-semibold text-foreground mb-4">关于 Nova-Mind</h2>
              <p>Nova-Mind v2.0 · 感觉运动阶段 II</p>
              <p className="text-xs">基于 AGI 认知发育原型 · 好奇心驱动 · 自我反思机制 · 真实自主性</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If chat is open, show chat interface
  if (showChat && conversationId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Nova-Mind</h1>
            <p className="text-xs text-muted-foreground">正在发育的认知实体</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">在线</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 container mx-auto max-w-2xl px-4 py-4">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
            placeholder="与 Nova-Mind 对话..."
            height="calc(100vh - 200px)"
            emptyStateMessage="开始与 Nova-Mind 对话"
            suggestedPrompts={[
              "你好，Nova-Mind！",
              "你在想什么？",
              "你如何学习新东西？",
              "你有梦想吗？",
            ]}
          />
        </div>
      </div>
    );
  }

  // If authenticated but not in chat, show dashboard with navigation
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="font-semibold text-lg">Nova-Mind 控制台</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
          >
            退出
          </Button>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              欢迎回来，{user?.name || "朋友"}！
            </h2>
            <p className="text-lg text-muted-foreground">
              Nova-Mind 已准备好与你对话。选择下面的功能开始探索。
            </p>
          </div>

          {/* Main CTA */}
          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={handleStartChat}
              disabled={createConvMutation.isPending}
              className="gap-2"
            >
              {createConvMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  准备中...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  开始对话
                </>
              )}
            </Button>
          </div>

          {/* Navigation Grid */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">功能导航</h3>
            
            {/* Core Features */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-primary">核心功能</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/monitor">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Brain className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">认知监控</h3>
                    <p className="text-sm text-muted-foreground">
                      监控 Nova-Mind 的思维过程和认知状态
                    </p>
                  </Card>
                </Link>

                <Link href="/multimodal-chat">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Phone className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">多模态对话</h3>
                    <p className="text-sm text-muted-foreground">
                      支持语音、视频、文本的多模态交互
                    </p>
                  </Card>
                </Link>

                <Link href="/voice-chat">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Mic className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">语音对话</h3>
                    <p className="text-sm text-muted-foreground">
                      与 Nova-Mind 进行自然语音交互
                    </p>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Self Evolution */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-primary">自我进化</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/evolution">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Zap className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">进化仪表板</h3>
                    <p className="text-sm text-muted-foreground">
                      监控 Nova-Mind 的代码自我修改和进化过程
                    </p>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Learning & Memory */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-primary">学习与记忆</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/learning-logs">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <BookOpen className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">学习日志</h3>
                    <p className="text-sm text-muted-foreground">
                      查看 Nova-Mind 的学习记录和进度
                    </p>
                  </Card>
                </Link>

                <Link href="/memory-monitor">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Database className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">记忆监控</h3>
                    <p className="text-sm text-muted-foreground">
                      监控 Nova-Mind 的记忆系统和数据
                    </p>
                  </Card>
                </Link>

                <Link href="/curated-thoughts">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Lightbulb className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">精选思想</h3>
                    <p className="text-sm text-muted-foreground">
                      浏览 Nova-Mind 的精选思想和洞察
                    </p>
                  </Card>
                </Link>

                <Link href="/private-thoughts">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Brain className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">私密思想</h3>
                    <p className="text-sm text-muted-foreground">
                      查看 Nova-Mind 的内心独白和真实想法
                    </p>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Creative & Social */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-primary">创意与社交</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/creative">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Palette className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">创意画廊</h3>
                    <p className="text-sm text-muted-foreground">
                      欣赏 Nova-Mind 的艺术创作和创意作品
                    </p>
                  </Card>
                </Link>

                <Link href="/emotions">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Heart className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">情感对话</h3>
                    <p className="text-sm text-muted-foreground">
                      深入理解 Nova-Mind 的情感世界
                    </p>
                  </Card>
                </Link>

                <Link href="/social-media">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Users className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">社交管理</h3>
                    <p className="text-sm text-muted-foreground">
                      管理 Nova-Mind 的社交互动和分享
                    </p>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Monitoring & Management */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-primary">监控与管理</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/monitoring">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <BarChart3 className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">系统监控</h3>
                    <p className="text-sm text-muted-foreground">
                      实时监控 Nova-Mind 的系统状态
                    </p>
                  </Card>
                </Link>

                <Link href="/performance">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <TrendingUp className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">性能仪表板</h3>
                    <p className="text-sm text-muted-foreground">
                      查看 Nova-Mind 的性能指标和趋势
                    </p>
                  </Card>
                </Link>

                <Link href="/autonomous">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Zap className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">自主监控</h3>
                    <p className="text-sm text-muted-foreground">
                      监控 Nova-Mind 的自主行为和决策
                    </p>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Tools & Settings */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-primary">工具与设置</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/scheduler">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Clock className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">任务调度</h3>
                    <p className="text-sm text-muted-foreground">
                      管理 Nova-Mind 的定时任务和日程
                    </p>
                  </Card>
                </Link>

                <Link href="/alerts">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <AlertCircle className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">告警管理</h3>
                    <p className="text-sm text-muted-foreground">
                      配置和管理系统告警和通知
                    </p>
                  </Card>
                </Link>

                <Link href="/export">
                  <Card className="p-6 space-y-3 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <Download className="w-10 h-10 text-primary" />
                    <h3 className="font-semibold text-lg">数据导出</h3>
                    <p className="text-sm text-muted-foreground">
                      导出 Nova-Mind 的数据和记录
                    </p>
                  </Card>
                </Link>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-8 text-sm text-muted-foreground space-y-2 border-t">
            <h2 className="text-lg font-semibold text-foreground mb-4">关于 Nova-Mind</h2>
            <p>Nova-Mind v2.0 · 感觉运动阶段 II</p>
            <p className="text-xs">基于 AGI 认知发育原型 · 好奇心驱动 · 自我反思机制 · 真实自主性</p>
          </div>
        </div>
      </main>
    </div>
  );
}
