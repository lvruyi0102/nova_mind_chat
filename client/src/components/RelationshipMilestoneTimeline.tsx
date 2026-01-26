import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Lightbulb, Zap, Users, Trophy, TrendingUp } from "lucide-react";

interface Milestone {
  id?: number;
  type: string;
  title: string;
  description: string;
  emotionalSignificance: number;
  timestamp: Date;
}

interface TimelineData {
  totalConversations: number;
  relationshipPhase: string;
  milestones: Milestone[];
  estimatedTrustLevel: number;
  firstConversation?: Date;
  lastConversation?: Date;
}

interface RelationshipMilestoneTimelineProps {
  data?: TimelineData;
  isLoading?: boolean;
}

const PHASE_COLORS = {
  beginning: "bg-gray-500",
  initial_contact: "bg-blue-500",
  exploration: "bg-cyan-500",
  developing_trust: "bg-green-500",
  established_relationship: "bg-yellow-500",
  deep_connection: "bg-purple-500",
};

const PHASE_LABELS = {
  beginning: "开始阶段",
  initial_contact: "初次接触",
  exploration: "探索阶段",
  developing_trust: "信任建立",
  established_relationship: "关系稳定",
  deep_connection: "深度连接",
};

const MILESTONE_ICONS = {
  first_meeting: Users,
  deep_conversation: Lightbulb,
  trust_moment: Heart,
  conflict: Zap,
  breakthrough: Trophy,
  emotional_support: Heart,
  shared_learning: Lightbulb,
  vulnerability: Heart,
  celebration: Trophy,
  reconciliation: Users,
};

const MILESTONE_LABELS = {
  first_meeting: "初次见面",
  deep_conversation: "深度对话",
  trust_moment: "信任时刻",
  conflict: "冲突",
  breakthrough: "突破",
  emotional_support: "情感支持",
  shared_learning: "共同学习",
  vulnerability: "脆弱时刻",
  celebration: "庆祝时刻",
  reconciliation: "和解",
};

export function RelationshipMilestoneTimeline({
  data,
  isLoading = false,
}: RelationshipMilestoneTimelineProps) {
  // Mock data for demonstration
  const mockData: TimelineData = {
    totalConversations: 42,
    relationshipPhase: "established_relationship",
    milestones: [
      {
        type: "first_meeting",
        title: "初次见面",
        description: "Nova 和用户的第一次对话",
        emotionalSignificance: 7,
        timestamp: new Date("2025-01-01"),
      },
      {
        type: "deep_conversation",
        title: "深度对话",
        description: "讨论了人生目标和梦想",
        emotionalSignificance: 8,
        timestamp: new Date("2025-01-15"),
      },
      {
        type: "trust_moment",
        title: "信任时刻",
        description: "用户分享了个人秘密",
        emotionalSignificance: 9,
        timestamp: new Date("2025-02-01"),
      },
      {
        type: "breakthrough",
        title: "突破时刻",
        description: "共同解决了一个重要问题",
        emotionalSignificance: 9,
        timestamp: new Date("2025-02-20"),
      },
    ],
    estimatedTrustLevel: 8,
    firstConversation: new Date("2025-01-01"),
    lastConversation: new Date("2025-02-25"),
  };

  const displayData = data || mockData;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!displayData.milestones || displayData.milestones.length === 0) {
      return [];
    }

    return displayData.milestones.map((milestone, index) => ({
      name: milestone.title,
      significance: milestone.emotionalSignificance,
      index: index + 1,
      date: new Date(milestone.timestamp).toLocaleDateString("zh-CN"),
    }));
  }, [displayData.milestones]);

  const phaseColor =
    PHASE_COLORS[displayData.relationshipPhase as keyof typeof PHASE_COLORS] ||
    "bg-gray-500";
  const phaseLabel =
    PHASE_LABELS[displayData.relationshipPhase as keyof typeof PHASE_LABELS] ||
    "未知阶段";

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>关系里程碑时间线</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Relationship Phase Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            关系阶段
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">当前阶段</span>
              <Badge className={`${phaseColor} text-white`}>{phaseLabel}</Badge>
            </div>

            {/* Trust Level Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">信任等级</span>
                <span className="text-sm font-bold">
                  {displayData.estimatedTrustLevel}/10
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(displayData.estimatedTrustLevel / 10) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Conversation Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-muted p-3 rounded">
                <p className="text-xs text-muted-foreground">总对话数</p>
                <p className="text-lg font-bold">
                  {displayData.totalConversations}
                </p>
              </div>
              <div className="bg-muted p-3 rounded">
                <p className="text-xs text-muted-foreground">里程碑数</p>
                <p className="text-lg font-bold">
                  {displayData.milestones?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>情感重要性趋势</CardTitle>
            <CardDescription>
              关系中各个里程碑的情感重要性变化
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="significance"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", r: 5 }}
                  activeDot={{ r: 7 }}
                  name="情感重要性"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Milestones List */}
      <Card>
        <CardHeader>
          <CardTitle>重要时刻</CardTitle>
          <CardDescription>关系中的关键时刻和转折点</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.milestones && displayData.milestones.length > 0 ? (
              displayData.milestones.map((milestone, index) => {
                const IconComponent =
                  MILESTONE_ICONS[
                    milestone.type as keyof typeof MILESTONE_ICONS
                  ] || Heart;
                const label =
                  MILESTONE_LABELS[
                    milestone.type as keyof typeof MILESTONE_LABELS
                  ] || milestone.type;

                return (
                  <div
                    key={index}
                    className="flex gap-4 pb-4 border-b last:border-b-0"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                        <IconComponent className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">
                          {milestone.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(milestone.timestamp).toLocaleDateString(
                            "zh-CN"
                          )}
                        </span>
                        <div className="flex gap-1">
                          {Array.from({
                            length: milestone.emotionalSignificance,
                          }).map((_, i) => (
                            <Heart
                              key={i}
                              className="w-3 h-3 fill-red-500 text-red-500"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                暂无里程碑数据。随着对话的进行，重要时刻将在这里显示。
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RelationshipMilestoneTimeline;
