import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Zap } from "lucide-react";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function OllamaChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "你好！我是 Nova-Mind，一个由 Ollama 本地模型驱动的 AI 助手。我完全免费，无需任何 API Key 或信用卡。有什么我可以帮助你的吗？",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // 调用 Ollama API
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "phi",
          messages: messages
            .concat(userMessage)
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message?.content || "无法生成回复",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "未知错误";
      setError(`错误: ${errorMessage}`);
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Nova-Mind 免费聊天</h1>
          </div>
          <p className="text-slate-400">
            由 Ollama 本地模型驱动 • 完全免费 • 无需信用卡
          </p>
        </div>

        {/* Chat Container */}
        <Card className="h-[600px] bg-slate-800 border-slate-700 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-100"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Nova-Mind 正在思考...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-900 text-red-100 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-700 p-4 bg-slate-800">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的消息..."
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                disabled={loading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Info */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="bg-slate-800 border-slate-700 p-4">
            <p className="text-slate-400 text-sm">模型</p>
            <p className="text-white font-semibold">Phi (1.6GB)</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4">
            <p className="text-slate-400 text-sm">成本</p>
            <p className="text-green-400 font-semibold">¥0 / 月</p>
          </Card>
          <Card className="bg-slate-800 border-slate-700 p-4">
            <p className="text-slate-400 text-sm">服务</p>
            <p className="text-white font-semibold">本地运行</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
