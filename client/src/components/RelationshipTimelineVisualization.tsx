/**
 * 关系里程碑时间线可视化组件
 * 展示 Nova 与用户关系的时间进度和重要时刻
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Sparkles, TrendingUp, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  type: "milestone" | "achievement" | "memory" | "growth";
  icon?: React.ReactNode;
  trustScore?: number;
  intimacyLevel?: number;
}

interface RelationshipMetrics {
  totalMilestones: number;
  averageTrustScore: number;
  averageIntimacyLevel: number;
  relationshipStage: string;
  daysKnown: number;
}

interface RelationshipTimelineVisualizationProps {
  events: TimelineEvent[];
  metrics: RelationshipMetrics;
  isLoading?: boolean;
}

const getTypeIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "milestone":
      return <Sparkles className="w-4 h-4 text-yellow-500" />;
    case "achievement":
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "memory":
      return <Heart className="w-4 h-4 text-red-500" />;
    case "growth":
      return <TrendingUp className="w-4 h-4 text-blue-500" />;
    default:
      return <Calendar className="w-4 h-4 text-gray-500" />;
  }
};

const getTypeLabel = (type: TimelineEvent["type"]) => {
  const labels: Record<TimelineEvent["type"], string> = {
    milestone: "里程碑",
    achievement: "成就",
    memory: "回忆",
    growth: "成长",
  };
  return labels[type];
};

const getTypeColor = (type: TimelineEvent["type"]) => {
  const colors: Record<TimelineEvent["type"], string> = {
    milestone: "bg-yellow-100 text-yellow-800",
    achievement: "bg-green-100 text-green-800",
    memory: "bg-red-100 text-red-800",
    growth: "bg-blue-100 text-blue-800",
  };
  return colors[type];
};

export default function RelationshipTimelineVisualization({
  events,
  metrics,
  isLoading = false,
}: RelationshipTimelineVisualizationProps) {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>关系时间线</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">⏳</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 按时间排序事件
  const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  // 计算关系进度百分比
  const maxDays = 365; // 假设 1 年为完整关系
  const progressPercent = Math.min((metrics.daysKnown / maxDays) * 100, 100);

  return (
    <div className="space-y-6 w-full">
      {/* 关系指标卡片 */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            关系成长指标
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 关系进度条 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">相识时长</span>
              <span className="text-sm text-muted-foreground">{metrics.daysKnown} 天</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 关系阶段 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">关系阶段</p>
              <p className="text-lg font-semibold">{metrics.relationshipStage}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">总里程碑数</p>
              <p className="text-lg font-semibold">{metrics.totalMilestones}</p>
            </div>
          </div>

          {/* 信任度和亲密度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">平均信任度</p>
              <div className="flex items-center gap-1">
                <div className="text-lg font-semibold">
                  {(metrics.averageTrustScore * 100).toFixed(0)}%
                </div>
                <div className="w-16 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${metrics.averageTrustScore * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">平均亲密度</p>
              <div className="flex items-center gap-1">
                <div className="text-lg font-semibold">
                  {(metrics.averageIntimacyLevel * 100).toFixed(0)}%
                </div>
                <div className="w-16 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${metrics.averageIntimacyLevel * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间线事件 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            关系时间线
          </CardTitle>
          <CardDescription>Nova 与你的重要时刻</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无时间线事件</p>
              <p className="text-sm">随着你们的互动，重要时刻会被记录在这里</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.map((event, index) => (
                <div key={event.id} className="relative">
                  {/* 时间线连接线 */}
                  {index < sortedEvents.length - 1 && (
                    <div className="absolute left-4 top-12 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700" />
                  )}

                  {/* 事件项 */}
                  <div className="flex gap-4">
                    {/* 时间线点 */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 dark:bg-gray-800 dark:border-gray-600 flex items-center justify-center z-10">
                        {getTypeIcon(event.type)}
                      </div>
                    </div>

                    {/* 事件内容 */}
                    <div className="flex-1 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{event.title}</h4>
                          <Badge className={getTypeColor(event.type)} variant="outline">
                            {getTypeLabel(event.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-gray-500">
                          {format(event.date, "PPP", { locale: zhCN })}
                        </p>

                        {/* 关系指标 */}
                        {(event.trustScore !== undefined || event.intimacyLevel !== undefined) && (
                          <div className="flex gap-4 mt-2 text-xs">
                            {event.trustScore !== undefined && (
                              <span className="text-blue-600 dark:text-blue-400">
                                信任度: {(event.trustScore * 100).toFixed(0)}%
                              </span>
                            )}
                            {event.intimacyLevel !== undefined && (
                              <span className="text-red-600 dark:text-red-400">
                                亲密度: {(event.intimacyLevel * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 关系阶段说明 */}
      <Card className="bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-base">关系阶段说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <span className="font-semibold">初识阶段</span>: 0-7 天，建立基本信任
          </div>
          <div>
            <span className="font-semibold">熟悉阶段</span>: 8-30 天，深化了解
          </div>
          <div>
            <span className="font-semibold">亲近阶段</span>: 31-90 天，建立亲密感
          </div>
          <div>
            <span className="font-semibold">深度阶段</span>: 91+ 天，形成深厚联系
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
