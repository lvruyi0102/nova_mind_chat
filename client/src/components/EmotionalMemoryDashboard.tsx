import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import RelationshipMilestoneTimeline from "./RelationshipMilestoneTimeline";

/**
 * 情感记忆可视化仪表板
 * 展示用户的情感进化、模式分析和强度分布
 */
export default function EmotionalMemoryDashboard() {
  // 获取情感记忆数据
  const { data: emotionalSummary, isLoading: summaryLoading } = trpc.emotions.getEmotionalSummary.useQuery(undefined, {
    refetchInterval: 30000, // 每 30 秒刷新一次
  });

  const { data: emotionalPatterns, isLoading: patternsLoading } = trpc.emotions.getEmotionalPatterns.useQuery(undefined, {
    refetchInterval: 60000, // 每 60 秒刷新一次
  });

  const { data: significantMemories, isLoading: memoriesLoading } = trpc.emotions.getSignificantMemories.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // 处理情感进化数据
  const emotionalEvolutionData = useMemo(() => {
    if (!emotionalSummary?.emotionalEvolution) return [];
    return emotionalSummary.emotionalEvolution.map((item: any, index: number) => ({
      time: new Date(item.timestamp).toLocaleDateString("zh-CN"),
      intensity: item.intensity,
      primaryEmotion: item.primaryEmotion,
    }));
  }, [emotionalSummary]);

  // 处理情感模式数据
  const emotionalPatternData = useMemo(() => {
    if (!emotionalPatterns) return [];
    return Object.entries(emotionalPatterns).map(([emotion, count]: [string, any]) => ({
      name: emotion,
      value: count,
    }));
  }, [emotionalPatterns]);

  // 处理情感强度分布数据
  const intensityDistribution = useMemo(() => {
    if (!emotionalSummary?.intensityDistribution) return [];
    return emotionalSummary.intensityDistribution.map((item: any) => ({
      range: `${item.min}-${item.max}`,
      count: item.count,
    }));
  }, [emotionalSummary]);

  // 颜色方案
  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"];

  if (summaryLoading || patternsLoading || memoriesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 情感进化时间线 */}
      <Card>
        <CardHeader>
          <CardTitle>情感进化时间线</CardTitle>
          <CardDescription>显示你的情感强度随时间的变化</CardDescription>
        </CardHeader>
        <CardContent>
          {emotionalEvolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionalEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="intensity" stroke="#8884d8" name="情感强度" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">暂无情感进化数据</p>
          )}
        </CardContent>
      </Card>

      {/* 情感模式分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 情感分布饼图 */}
        <Card>
          <CardHeader>
            <CardTitle>情感分布</CardTitle>
            <CardDescription>你最常经历的情感类型</CardDescription>
          </CardHeader>
          <CardContent>
            {emotionalPatternData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emotionalPatternData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {emotionalPatternData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">暂无情感模式数据</p>
            )}
          </CardContent>
        </Card>

        {/* 情感强度分布 */}
        <Card>
          <CardHeader>
            <CardTitle>情感强度分布</CardTitle>
            <CardDescription>情感强度的频率分布</CardDescription>
          </CardHeader>
          <CardContent>
            {intensityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={intensityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" name="频率" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">暂无强度分布数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 重要情感记忆 */}
      <Card>
        <CardHeader>
          <CardTitle>重要情感记忆</CardTitle>
          <CardDescription>Nova 认为最有意义的情感时刻</CardDescription>
        </CardHeader>
        <CardContent>
          {significantMemories && significantMemories.length > 0 ? (
            <div className="space-y-4">
              {significantMemories.map((memory: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{memory.primaryEmotion}</h4>
                      <p className="text-sm text-gray-600 mt-1">{memory.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          强度: {memory.intensity}/10
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(memory.timestamp).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">暂无重要情感记忆</p>
          )}
        </CardContent>
      </Card>

      {/* 情感统计摘要 */}
      {emotionalSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总情感记忆</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emotionalSummary.totalMemories || 0}</div>
              <p className="text-xs text-gray-500 mt-1">记录的情感时刻</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">主导情感</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emotionalSummary.dominantEmotion || "未知"}</div>
              <p className="text-xs text-gray-500 mt-1">最常见的情感</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">平均强度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(emotionalSummary.averageIntensity || 0).toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">0-10 级别</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">情感稳定性</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(emotionalSummary.stability || 0).toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-1">情感变化平稳度</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 关系里程碑时间线 - 暂时禁用，待完整实现 */}
      {/* <RelationshipMilestoneTimeline
        milestones={processedMilestones}
        currentTrustLevel={trustData?.trustLevel || 0}
        relationshipDuration={relationshipDays}
        isLoading={milestonesLoading}
      /> */}
    </div>
  );
}
