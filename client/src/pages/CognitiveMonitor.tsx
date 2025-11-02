import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Brain, Lightbulb, Loader2, Network, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function CognitiveMonitor() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: cognitiveState, isLoading } = trpc.chat.getCognitiveState.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

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
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

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
                  <TrendingUp className="w-5 h-5 text-primary" />
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
