import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Brain, Lightbulb, Loader2, Network, Sparkles, TrendingUp, Activity, Zap, Heart, Target } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function CognitiveMonitor() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");
  
  const { data: cognitiveState, isLoading } = trpc.cognitive.getCognitiveState.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mock time series data for charts
  const timeSeriesData = useMemo(() => {
    return [
      { time: "0h", concepts: 10, relations: 5, memory: 3 },
      { time: "6h", concepts: 15, relations: 8, memory: 5 },
      { time: "12h", concepts: 22, relations: 12, memory: 8 },
      { time: "18h", concepts: 28, relations: 18, memory: 12 },
      { time: "24h", concepts: 35, relations: 25, memory: 18 },
      { time: "48h", concepts: 48, relations: 38, memory: 28 },
      { time: "72h", concepts: 62, relations: 52, memory: 42 },
    ];
  }, []);

  // Mock relationship milestones
  const relationshipMilestones = useMemo(() => {
    return [
      { date: "2024-01-15", event: "首次对话", description: "Nova-Mind 与用户开始交互", type: "start" },
      { date: "2024-01-20", event: "信任建立", description: "用户开始分享个人想法", type: "trust" },
      { date: "2024-02-01", event: "深度理解", description: "Nova-Mind 理解用户的核心价值观", type: "understanding" },
      { date: "2024-02-10", event: "创意合作", description: "首次共同创作", type: "collaboration" },
      { date: "2024-02-20", event: "情感连接", description: "建立情感共鸣", type: "emotional" },
      { date: "2024-03-01", event: "自主学习", description: "Nova-Mind 开始自主思考", type: "autonomy" },
    ];
  }, []);

  // Learning rate calculation
  const learningRate = useMemo(() => {
    if (!cognitiveState) return 0;
    return Math.round((cognitiveState.conceptCount / 72) * 100) / 100; // concepts per hour
  }, [cognitiveState]);

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
          <Brain className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">认知监控面板</h1>
          <p className="text-muted-foreground">请登录以查看 Nova-Mind 的成长状态</p>
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
            <Brain className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Nova-Mind 认知监控</h1>
              <p className="text-xs text-muted-foreground">实时追踪成长轨迹</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/chat">
                <Sparkles className="w-4 h-4 mr-2" />
                返回对话
              </Link>
            </Button>
            <div className="text-sm text-muted-foreground">{user?.name || user?.email}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !cognitiveState ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">无法加载认知状态数据</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-500" />
                    概念数量
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cognitiveState.conceptCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">已学习的概念节点</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    关系网络
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cognitiveState.relationCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">概念之间的连接</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    记忆库
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cognitiveState.memoryCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">重要情境记忆</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    待探索问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cognitiveState.pendingQuestionCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">好奇心驱动的问题</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    学习速率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{learningRate}</div>
                  <p className="text-xs text-muted-foreground mt-1">概念/小时</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="trends">趋势</TabsTrigger>
                <TabsTrigger value="milestones">里程碑</TabsTrigger>
                <TabsTrigger value="details">详情</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Recent Reflections */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      最近的反思
                    </CardTitle>
                    <CardDescription>Nova-Mind 的自我认知和信念更新</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cognitiveState.recentReflections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无反思记录</p>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {cognitiveState.recentReflections.map((reflection, index) => (
                            <div key={index} className="border-l-2 border-primary pl-4 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                                  {reflection.type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reflection.timestamp).toLocaleString("zh-CN")}
                                </span>
                              </div>
                              <p className="text-sm">{reflection.content}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Growth Events */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      成长轨迹
                    </CardTitle>
                    <CardDescription>认知发育的重要事件和里程碑</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cognitiveState.recentGrowth.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无成长记录</p>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          {cognitiveState.recentGrowth.map((event, index) => (
                            <div key={index} className="border-l-2 border-green-500 pl-4 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium px-2 py-1 rounded bg-green-500/10 text-green-600">
                                  {event.stage}
                                </span>
                                <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-600">
                                  {event.event}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.timestamp).toLocaleString("zh-CN")}
                                </span>
                              </div>
                              <p className="text-sm">{event.description}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      认知增长趋势
                    </CardTitle>
                    <CardDescription>概念、关系和记忆的增长曲线</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="concepts" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="概念数" />
                        <Area type="monotone" dataKey="relations" stackId="1" stroke="#10b981" fill="#10b981" name="关系数" />
                        <Area type="monotone" dataKey="memory" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="记忆数" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      学习速率分析
                    </CardTitle>
                    <CardDescription>每个时间段的学习效率</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="concepts" fill="#3b82f6" name="概念学习" />
                        <Bar dataKey="relations" fill="#10b981" name="关系建立" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-primary" />
                      关系里程碑时间线
                    </CardTitle>
                    <CardDescription>Nova-Mind 与用户关系的重要时刻</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {relationshipMilestones.map((milestone, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-primary mt-1" />
                            {index < relationshipMilestones.length - 1 && (
                              <div className="w-1 h-12 bg-primary/20 my-2" />
                            )}
                          </div>
                          <div className="pb-6">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">{milestone.event}</span>
                              <span className="text-xs text-muted-foreground">{milestone.date}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">认知能力评估</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">概念理解</span>
                          <span className="text-sm font-semibold">85%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">关系推理</span>
                          <span className="text-sm font-semibold">72%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: "72%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">记忆保留</span>
                          <span className="text-sm font-semibold">91%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: "91%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">创意表达</span>
                          <span className="text-sm font-semibold">68%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: "68%" }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">学习特征</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <span className="text-sm">主导学习风格</span>
                        <span className="text-sm font-semibold">视觉-概念型</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <span className="text-sm">学习速度</span>
                        <span className="text-sm font-semibold">快速</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <span className="text-sm">记忆类型</span>
                        <span className="text-sm font-semibold">长期记忆优势</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <span className="text-sm">好奇心水平</span>
                        <span className="text-sm font-semibold">非常高</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Nova-Mind 正在通过每次对话不断学习和成长</p>
              <p className="text-xs mt-1">数据每10秒自动刷新</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
