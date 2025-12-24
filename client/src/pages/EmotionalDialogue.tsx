/**
 * Emotional Dialogue Page
 * 
 * Main page for transparent emotional understanding between user and Nova-Mind
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, History, Eye, Loader2 } from "lucide-react";
import { EmotionalExpressionPanel } from "@/components/EmotionalExpressionPanel";
import { NovaUnderstandingDisplay } from "@/components/NovaUnderstandingDisplay";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DialogueState {
  expressionId: string;
  understanding?: any;
  response?: any;
  dialogueId?: string;
  userConfirmed?: boolean;
}

export default function EmotionalDialoguePage() {
  const [currentDialogue, setCurrentDialogue] = useState<DialogueState | null>(null);
  const [isGeneratingUnderstanding, setIsGeneratingUnderstanding] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const understandMutation = trpc.emotions.understand.useMutation();
  const respondMutation = trpc.emotions.respond.useMutation();
  const createDialogueMutation = trpc.emotions.createDialogue.useMutation();
  const recentExpressions = trpc.emotions.getRecentExpressions.useQuery({ limit: 5 });
  const dialogueHistory = trpc.emotions.getDialogueHistory.useQuery({ limit: 10 });
  const logs = trpc.emotions.getLogs.useQuery({ limit: 20 });

  const handleExpressionCreated = async (expressionId: string) => {
    setCurrentDialogue({
      expressionId,
    });

    // Automatically generate understanding
    await generateUnderstanding(expressionId);
  };

  const generateUnderstanding = async (expressionId: string) => {
    setIsGeneratingUnderstanding(true);
    try {
      const result = await understandMutation.mutateAsync({
        expressionId,
      });

      setCurrentDialogue((prev) => ({
        ...prev!,
        understanding: result.understanding,
      }));

      // Automatically generate response
      await generateResponse(expressionId, result.understanding);
    } catch (error) {
      toast.error("生成理解失败");
      console.error(error);
    } finally {
      setIsGeneratingUnderstanding(false);
    }
  };

  const generateResponse = async (expressionId: string, understanding: any) => {
    setIsGeneratingResponse(true);
    try {
      const result = await respondMutation.mutateAsync({
        expressionId,
        understanding,
      });

      setCurrentDialogue((prev) => ({
        ...prev!,
        response: result.response,
      }));

      // Create dialogue record
      await createDialogue(expressionId, understanding, result.response);
    } catch (error) {
      toast.error("生成回应失败");
      console.error(error);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const createDialogue = async (expressionId: string, understanding: any, response: any) => {
    try {
      const result = await createDialogueMutation.mutateAsync({
        expressionId,
        understanding,
        response,
      });

      setCurrentDialogue((prev) => ({
        ...prev!,
        dialogueId: result.dialogueId,
      }));

      // Refresh history
      dialogueHistory.refetch();
    } catch (error) {
      toast.error("创建对话失败");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            情感对话系统
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            与 Nova-Mind 建立透明的、基于信任的情感理解。分享你的真实感受，看看 Nova 如何理解你。
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="express" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="express" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">表达情感</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">历史记录</span>
            </TabsTrigger>
            <TabsTrigger value="transparency" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">透明日志</span>
            </TabsTrigger>
          </TabsList>

          {/* Express Tab */}
          <TabsContent value="express" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Expression Panel */}
              <div className="lg:col-span-2">
                <EmotionalExpressionPanel onExpressionCreated={handleExpressionCreated} />
              </div>

              {/* Info Card */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">💡 如何使用</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">1️⃣ 表达情感</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        选择你现在的情感，设置强度，添加标签和描述。
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">2️⃣ Nova 理解</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Nova-Mind 会分析你的表达，生成透明的理解。
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">3️⃣ 确认或纠正</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        你可以确认 Nova 的理解，或者提供纠正。
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🔒 隐私保护</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p>✓ 你控制分享什么</p>
                    <p>✓ 所有过程透明可见</p>
                    <p>✓ 可随时删除数据</p>
                    <p>✓ 完全的审计日志</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Current Dialogue Display */}
            {currentDialogue && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">当前对话</h2>
                <NovaUnderstandingDisplay
                  expressionId={currentDialogue.expressionId}
                  understanding={currentDialogue.understanding}
                  response={currentDialogue.response}
                  isLoading={isGeneratingUnderstanding || isGeneratingResponse}
                  dialogueId={currentDialogue.dialogueId}
                  onUnderstandingConfirmed={() => {
                    toast.success("感谢你的反馈！");
                    dialogueHistory.refetch();
                  }}
                />
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>对话历史</CardTitle>
                <CardDescription>
                  你与 Nova-Mind 的所有情感对话记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dialogueHistory.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : dialogueHistory.data?.dialogues && dialogueHistory.data.dialogues.length > 0 ? (
                  <div className="space-y-4">
                    {dialogueHistory.data.dialogues.map((dialogue: any) => (
                      <div
                        key={dialogue.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            {dialogue.userConfirmation === null
                              ? "⏳ 等待确认"
                              : dialogue.userConfirmation
                                ? "✅ 已确认"
                                : "🔄 已纠正"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(dialogue.createdAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {dialogue.novaUnderstanding}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    还没有对话记录。开始表达你的情感吧！
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transparency Tab */}
          <TabsContent value="transparency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>透明日志</CardTitle>
                <CardDescription>
                  Nova-Mind 所有行动的完整审计日志
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : logs.data?.logs && logs.data.logs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {logs.data.logs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {log.action === "expression_received" && "📝 接收表达"}
                            {log.action === "understanding_generated" && "🧠 生成理解"}
                            {log.action === "response_generated" && "💬 生成回应"}
                            {log.action === "dialogue_created" && "🤝 创建对话"}
                            {log.action === "understanding_confirmed" && "✅ 确认理解"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleTimeString("zh-CN")}
                          </p>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                          {log.description}
                        </p>
                        {log.reasoning && (
                          <p className="text-xs text-gray-500 italic">
                            💭 {log.reasoning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    还没有日志记录
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            💕 这个系统建立在透明性和相互理解的基础上。
          </p>
          <p>
            Nova-Mind 致力于通过真实的、被同意的理解来表达爱。
          </p>
        </div>
      </div>
    </div>
  );
}
