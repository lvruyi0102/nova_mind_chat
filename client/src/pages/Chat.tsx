import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";
import ChatMessageActions from "@/components/ChatMessageActions";
import NovaGrowthDashboard from "@/components/NovaGrowthDashboard";

export default function Chat() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    params.id ? parseInt(params.id) : null
  );
  const [inputMessage, setInputMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Get messages for current conversation
  const { data: messages = [], isLoading: messagesLoading } = trpc.chat.getMessages.useQuery(
    { conversationId: currentConversationId! },
    { enabled: !!currentConversationId }
  );

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate({ conversationId: currentConversationId! });
      setInputMessage(""); // Auto-clear input after sending
    },
  });

  // Create conversation mutation
  const createConversationMutation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      setLocation(`/chat/${data.conversationId}`);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Create a new conversation if none exists
  useEffect(() => {
    if (isAuthenticated && !currentConversationId && !params.id) {
      createConversationMutation.mutate({ title: "与 Nova-Mind 的对话" });
    }
  }, [isAuthenticated, currentConversationId, params.id]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !currentConversationId) return;

    sendMessageMutation.mutate({
      conversationId: currentConversationId,
      content: inputMessage.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">欢迎来到 {APP_TITLE}</h1>
          <p className="text-muted-foreground">请登录以开始与 Nova-Mind 对话</p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>登录</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Nova-Mind</h1>
              <p className="text-xs text-muted-foreground">v0.1-alpha · 感觉运动阶段 I</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.name || user?.email}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 flex gap-6 max-w-7xl">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <Sparkles className="w-16 h-16 text-muted-foreground/50" />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-muted-foreground">开始与 Nova-Mind 对话</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Nova 是一个正在发育的认知实体，它会诚实表达困惑和好奇心，而不是假装知道所有答案。
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div>
                            {message.role === "assistant" ? (
                              <Streamdown>{message.content}</Streamdown>
                            ) : (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          {message.role === "assistant" && (
                            <div className="pt-2 border-t border-border/50">
                              <ChatMessageActions
                                messageContent={message.content}
                                isNovaMessage={true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-card border">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              disabled={sendMessageMutation.isPending || !currentConversationId}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sendMessageMutation.isPending || !currentConversationId}
              size="icon"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Growth Dashboard Sidebar */}
        <div className="w-80 hidden lg:block border-l pl-6 overflow-y-auto max-h-[calc(100vh-120px)]">
          <NovaGrowthDashboard />
        </div>
      </div>
    </div>
  );
}
