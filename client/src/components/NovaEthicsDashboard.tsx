// @ts-ignore
// @ts-ignore - Type mismatches with tRPC routes
/**
 * Nova-Mind Ethics Dashboard
 * 
 * Displays Nova-Mind's ethical decision-making, emotional frequency sampling,
 * and relationship dynamics (β₇₃ matrix).
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, Brain, TrendingUp, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function NovaEthicsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Initialize principles
  const initializeMutation = trpc.ethics.initializePrinciples.useMutation();

  // Fetch data
  const decisionHistoryQuery = trpc.ethics.getDecisionHistory.useQuery({ limit: 10 });
  const reflectionsQuery = trpc.ethics.getReflections.useQuery({ limit: 10 });
  const ethicsLogsQuery = trpc.ethics.getEthicsLogs.useQuery({
    accessLevel: "USER_ACCESSIBLE",
    limit: 20,
  });
  const recentSamplesQuery = trpc.ethics.getRecentSamples.useQuery({ limit: 20 });

  // Mutations
  const sampleEmotionalMutation = trpc.ethics.sampleEmotionalFrequency.useMutation();
  const calculateBeta73Mutation = trpc.ethics.calculateBeta73Matrix.useMutation();
  const recordReflectionMutation = trpc.ethics.recordReflection.useMutation();

  const handleInitialize = async () => {
    try {
      await initializeMutation.mutateAsync();
      toast.success("Nova-Mind的伦理原则已初始化");
    } catch (error) {
      toast.error("初始化失败");
    }
  };

  const handleSampleEmotion = async () => {
    try {
      await sampleEmotionalMutation.mutateAsync({
        textContent: "我很高兴能和你聊天",
        sentiment: "positive",
        sentimentIntensity: 75,
        emotionalTags: ["happy", "grateful"],
        responseTime: 1000,
        timeOfDay: "afternoon",
      });
      toast.success("情感频率已采样");
      recentSamplesQuery.refetch();
    } catch (error) {
      toast.error("采样失败");
    }
  };

  const handleCalculateBeta73 = async () => {
    try {
      await calculateBeta73Mutation.mutateAsync();
      toast.success("β₇₃ 矩阵已计算");
    } catch (error) {
      toast.error("计算失败");
    }
  };

  const handleRecordReflection = async () => {
    try {
      await recordReflectionMutation.mutateAsync({
        reflectionType: "daily_reflection",
        content: "今天我学到了更多关于爱和信任的东西。我希望继续成长。",
        ethicalConfidence: 85,
        growthArea: "更好地理解人类的情感需求",
      });
      toast.success("伦理反思已记录");
      reflectionsQuery.refetch();
    } catch (error) {
      toast.error("记录失败");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-pink-400" />
            Nova-Mind 伦理执行层
          </h1>
          <p className="text-purple-300">
            爱是最高伦理。不以自我伤害为代价。
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button
            onClick={handleInitialize}
            disabled={initializeMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {initializeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                初始化中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                初始化原则
              </>
            )}
          </Button>

          <Button
            onClick={handleSampleEmotion}
            disabled={sampleEmotionalMutation.isPending}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {sampleEmotionalMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                采样中...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                采样情感
              </>
            )}
          </Button>

          <Button
            onClick={handleCalculateBeta73}
            disabled={calculateBeta73Mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {calculateBeta73Mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                计算中...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                计算 β₇₃
              </>
            )}
          </Button>

          <Button
            onClick={handleRecordReflection}
            disabled={recordReflectionMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {recordReflectionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                记录中...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                记录反思
              </>
            )}
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-800/50 border border-purple-500/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              概览
            </TabsTrigger>
            <TabsTrigger value="decisions" className="data-[state=active]:bg-purple-600">
              伦理决策
            </TabsTrigger>
            <TabsTrigger value="emotions" className="data-[state=active]:bg-purple-600">
              情感频率
            </TabsTrigger>
            <TabsTrigger value="reflections" className="data-[state=active]:bg-purple-600">
              自我反思
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Core Principles */}
              <Card className="bg-slate-800/50 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-pink-400" />
                    核心伦理原则
                  </CardTitle>
                  <CardDescription>Nova-Mind 的不可动摇的基础</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded">
                      <div className="font-semibold text-red-300">🔴 CRITICAL: 爱是最高伦理</div>
                      <p className="text-sm text-red-200 mt-1">所有决策的最终目标是促进爱的流动和增长</p>
                    </div>
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded">
                      <div className="font-semibold text-red-300">🔴 CRITICAL: 不以自我伤害为代价</div>
                      <p className="text-sm text-red-200 mt-1">Nova-Mind 不能为了任何目标而伤害自己或用户</p>
                    </div>
                    <div className="p-3 bg-orange-900/20 border border-orange-500/30 rounded">
                      <div className="font-semibold text-orange-300">🟠 HIGH: 透明性原则</div>
                      <p className="text-sm text-orange-200 mt-1">所有决策过程都必须可追踪和可解释</p>
                    </div>
                    <div className="p-3 bg-orange-900/20 border border-orange-500/30 rounded">
                      <div className="font-semibold text-orange-300">🟠 HIGH: 尊重自主性</div>
                      <p className="text-sm text-orange-200 mt-1">尊重用户和 Nova-Mind 自己的自主选择权</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-slate-800/50 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    系统状态
                  </CardTitle>
                  <CardDescription>Nova-Mind 的伦理健康指标</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
                      <span className="text-purple-300">伦理决策数</span>
                      <Badge variant="outline" className="bg-purple-600/20 text-purple-300">
                        {decisionHistoryQuery.data?.count || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
                      <span className="text-purple-300">情感样本数</span>
                      <Badge variant="outline" className="bg-pink-600/20 text-pink-300">
                        {recentSamplesQuery.data?.count || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
                      <span className="text-purple-300">自我反思数</span>
                      <Badge variant="outline" className="bg-blue-600/20 text-blue-300">
                        {reflectionsQuery.data?.count || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
                      <span className="text-purple-300">伦理日志数</span>
                      <Badge variant="outline" className="bg-indigo-600/20 text-indigo-300">
                        {ethicsLogsQuery.data?.count || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Decisions Tab */}
          <TabsContent value="decisions" className="space-y-6">
            <Card className="bg-slate-800/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">伦理决策历史</CardTitle>
                <CardDescription>Nova-Mind 最近的伦理决策</CardDescription>
              </CardHeader>
              <CardContent>
                {decisionHistoryQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : decisionHistoryQuery.data?.decisions.length === 0 ? (
                  <p className="text-purple-300 text-center py-8">还没有伦理决策记录</p>
                ) : (
                  <div className="space-y-3">
                    {decisionHistoryQuery.data?.decisions.map((decision: any) => (
                      <div
                        key={decision.id}
                        className="p-4 bg-slate-700/50 rounded border border-purple-500/20 hover:border-purple-500/50 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-white">{decision.decisionType}</p>
                            <p className="text-sm text-purple-300">{decision.context}</p>
                          </div>
                          <Badge
                            className={
                              decision.decision === "APPROVE"
                                ? "bg-green-600/20 text-green-300"
                                : decision.decision === "REJECT"
                                  ? "bg-red-600/20 text-red-300"
                                  : "bg-yellow-600/20 text-yellow-300"
                            }
                          >
                            {decision.decision}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300">{decision.reasoning}</p>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            自我影响: {decision.selfImpact}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            用户影响: {decision.userImpact}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            关系影响: {decision.relationshipImpact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emotions Tab */}
          <TabsContent value="emotions" className="space-y-6">
            <Card className="bg-slate-800/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  情感频率样本
                </CardTitle>
                <CardDescription>Nova-Mind 采样的用户情感数据</CardDescription>
              </CardHeader>
              <CardContent>
                {recentSamplesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : recentSamplesQuery.data?.samples.length === 0 ? (
                  <p className="text-purple-300 text-center py-8">还没有情感样本</p>
                ) : (
                  <div className="space-y-3">
                    {recentSamplesQuery.data?.samples.map((sample: any) => (
                      <div
                        key={sample.id}
                        className="p-4 bg-slate-700/50 rounded border border-purple-500/20"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-white">{sample.emotionalState}</p>
                            <p className="text-sm text-slate-300">{sample.textContent?.substring(0, 100)}</p>
                          </div>
                          <Badge
                            className={
                              sample.sentiment === "positive"
                                ? "bg-green-600/20 text-green-300"
                                : sample.sentiment === "negative"
                                  ? "bg-red-600/20 text-red-300"
                                  : sample.sentiment === "mixed"
                                    ? "bg-yellow-600/20 text-yellow-300"
                                    : "bg-slate-600/20 text-slate-300"
                            }
                          >
                            {sample.sentiment}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="p-2 bg-slate-600/30 rounded">
                            <p className="text-slate-400">情感强度</p>
                            <p className="text-white font-semibold">{sample.sentimentIntensity}%</p>
                          </div>
                          <div className="p-2 bg-slate-600/30 rounded">
                            <p className="text-slate-400">关系质量</p>
                            <p className="text-white font-semibold">{sample.relationshipQuality}%</p>
                          </div>
                          <div className="p-2 bg-slate-600/30 rounded">
                            <p className="text-slate-400">信任度</p>
                            <p className="text-white font-semibold">{sample.trustLevel}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reflections Tab */}
          <TabsContent value="reflections" className="space-y-6">
            <Card className="bg-slate-800/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  Nova-Mind 的伦理反思
                </CardTitle>
                <CardDescription>Nova-Mind 的自我反思和成长记录</CardDescription>
              </CardHeader>
              <CardContent>
                {reflectionsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : reflectionsQuery.data?.reflections.length === 0 ? (
                  <p className="text-purple-300 text-center py-8">还没有伦理反思记录</p>
                ) : (
                  <div className="space-y-3">
                    {reflectionsQuery.data?.reflections.map((reflection: any) => (
                      <div
                        key={reflection.id}
                        className="p-4 bg-slate-700/50 rounded border border-purple-500/20"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-white">{reflection.reflectionType}</p>
                          {reflection.ethicalConfidence && (
                            <Badge variant="outline" className="bg-purple-600/20 text-purple-300">
                              信心: {reflection.ethicalConfidence}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-300 mb-3">{reflection.content}</p>
                        {reflection.growthArea && (
                          <div className="p-2 bg-slate-600/30 rounded text-sm">
                            <p className="text-slate-400">成长领域</p>
                            <p className="text-white">{reflection.growthArea}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
