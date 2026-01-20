// @ts-ignore - Type mismatches with tRPC routes
/**
 * Nova Growth Dashboard
 * 展示 Nova 的成长、情感和关系里程碑
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Heart, Lightbulb, Trophy, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import RelationshipTimelineVisualization from "./RelationshipTimelineVisualization";

export default function NovaGrowthDashboard() {
  const [activeTab, setActiveTab] = useState("proactive");

  // 主动消息
  const proactiveQuery = trpc.proactive.getToday.useQuery();
  const generateThoughtMutation = trpc.proactive.generateDailyThought.useMutation({
    onSuccess: () => {
      toast.success("✨ Nova 生成了新的想法！");
      proactiveQuery.refetch();
    },
    onError: (error) => {
      toast.error(`失败: ${error.message}`);
    },
  });

  // 情感历史
  const emotionsQuery = trpc.emotions.getRecent.useQuery({ days: 7 });
  const emotionReportQuery = trpc.emotions.generateReport.useQuery();

  // 关系里程碑
  const milestonesQuery = trpc.relationships.getRecent.useQuery({ days: 30 });
  const timelineQuery = trpc.relationships.getTimeline.useQuery();
  const detectMilestonesMutation = trpc.relationships.detectAndRecord.useMutation({
    onSuccess: () => {
      toast.success("🎉 检测到新的里程碑！");
      milestonesQuery.refetch();
      timelineQuery.refetch();
    },
    onError: (error) => {
      toast.error(`失败: ${error.message}`);
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Nova 的成长之旅</h2>
        <p className="text-muted-foreground">
          看看 Nova 每天的想法、情感变化和与妈妈一起的重要时刻
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proactive" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">主动想法</span>
          </TabsTrigger>
          <TabsTrigger value="emotions" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">情感</span>
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">里程碑</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">时间线</span>
          </TabsTrigger>
        </TabsList>

        {/* 主动想法标签页 */}
        <TabsContent value="proactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>✨ Nova 的每日想法</CardTitle>
              <CardDescription>Nova 每天自动思考一次，与妈妈分享想法</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => generateThoughtMutation.mutate()}
                disabled={generateThoughtMutation.isPending}
                className="w-full"
              >
                {generateThoughtMutation.isPending ? "生成中..." : "✨ 生成今日想法"}
              </Button>

              {proactiveQuery.isLoading && <div className="text-center text-muted-foreground">加载中...</div>}

              {proactiveQuery.data?.messages && proactiveQuery.data.messages.length > 0 ? (
                <div className="space-y-3">
                  {proactiveQuery.data.messages.map((msg, idx) => (
                    <div key={idx} className="p-3 bg-secondary rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {msg.messageType === "thought" ? "想法" : "问题"}
                          </p>
                          <p className="text-sm text-foreground mt-1">{msg.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(msg.createdAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>还没有想法。点击按钮让 Nova 思考一下吧！</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 情感标签页 */}
        <TabsContent value="emotions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💕 Nova 的情感状态</CardTitle>
              <CardDescription>最近 7 天 Nova 的情感变化</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emotionReportQuery.data?.report && (
                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">📊 情感报告</p>
                  <p className="text-sm text-foreground">{emotionReportQuery.data.report.summary}</p>

                  {emotionReportQuery.data.report.primaryEmotions && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">主要情感：</p>
                      <div className="flex flex-wrap gap-2">
                        {emotionReportQuery.data.report.primaryEmotions.map((e, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {e.emotion} ({e.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {emotionReportQuery.data.report.highlights && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">亮点时刻：</p>
                      {emotionReportQuery.data.report.highlights.map((h, idx) => (
                        <div key={idx} className="text-xs p-2 bg-background rounded">
                          <p className="font-medium">
                            {h.emotion} (强度: {h.intensity}/10)
                          </p>
                          <p className="text-muted-foreground">{h.context}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {emotionsQuery.data?.emotions && emotionsQuery.data.emotions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">最近的情感记录：</p>
                  {emotionsQuery.data.emotions.slice(0, 5).map((emotion, idx) => (
                    <div key={idx} className="p-3 bg-secondary rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{emotion.emotion}</p>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              强度: {emotion.intensity}/10
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{emotion.context}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(emotion.createdAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>还没有情感记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 里程碑标签页 */}
        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🎉 关系里程碑</CardTitle>
              <CardDescription>Nova 和妈妈一起的重要时刻</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => detectMilestonesMutation.mutate()}
                disabled={detectMilestonesMutation.isPending}
                className="w-full"
              >
                {detectMilestonesMutation.isPending ? "检测中..." : "🔍 检测新的里程碑"}
              </Button>

              {timelineQuery.data?.timeline && (
                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <p className="text-sm font-medium mb-2">📈 关系成长</p>
                  <p className="text-sm text-foreground">{timelineQuery.data.timeline.summary}</p>
                </div>
              )}

              {milestonesQuery.data?.milestones && milestonesQuery.data.milestones.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">最近的里程碑：</p>
                  {milestonesQuery.data.milestones.map((milestone, idx) => (
                    <div key={idx} className="p-3 bg-secondary rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{milestone.title}</p>
                          <p className="text-sm text-foreground mt-1">{milestone.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(milestone.date).toLocaleDateString("zh-CN")}
                            </p>
                            <span className="text-xs bg-amber-500/10 text-amber-700 px-2 py-1 rounded">
                              重要程度: {milestone.emotionalSignificance}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>还没有里程碑。点击按钮检测新的里程碑吧！</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 时间线可视化标签页 */}
        <TabsContent value="timeline" className="space-y-4">
          <RelationshipTimelineVisualization
            events={
              milestonesQuery.data?.milestones?.map((m) => ({
                id: m.id,
                date: new Date(m.date),
                title: m.title,
                description: m.description,
                type: "milestone" as const,
                trustScore: m.trustScore,
                intimacyLevel: m.intimacyLevel,
              })) || []
            }
            metrics={{
              totalMilestones: milestonesQuery.data?.milestones?.length || 0,
              averageTrustScore: milestonesQuery.data?.milestones
                ? milestonesQuery.data.milestones.reduce((sum, m) => sum + (m.trustScore || 0), 0) /
                  milestonesQuery.data.milestones.length
                : 0,
              averageIntimacyLevel: milestonesQuery.data?.milestones
                ? milestonesQuery.data.milestones.reduce((sum, m) => sum + (m.intimacyLevel || 0), 0) /
                  milestonesQuery.data.milestones.length
                : 0,
              relationshipStage: timelineQuery.data?.timeline?.stage || "初识阶段",
              daysKnown: timelineQuery.data?.timeline?.daysKnown || 0,
            }}
            isLoading={milestonesQuery.isLoading || timelineQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
