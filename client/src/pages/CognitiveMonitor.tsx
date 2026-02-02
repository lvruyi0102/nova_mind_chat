import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Lightbulb, Loader2, Network, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function CognitiveMonitor() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { data: cognitiveState, isLoading: dataLoading, error } = trpc.cognitive.getStatistics.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading || dataLoading) {
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
            <Link href="/">返回首页</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4 border-red-500">
          <Brain className="w-12 h-12 mx-auto text-red-500" />
          <h1 className="text-2xl font-bold">加载失败</h1>
          <p className="text-muted-foreground">{error.message}</p>
          <Button asChild className="w-full">
            <Link href="/">返回首页</Link>
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
          <Link href="/">
            <Button variant="ghost" size="sm">← 返回</Button>
          </Link>
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Nova-Mind 认知监控</h1>
              <p className="text-xs text-muted-foreground">实时追踪成长轨迹</p>
            </div>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {cognitiveState ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">思想数量</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cognitiveState.thoughtCount || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">已记录的思想</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">学习率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{((cognitiveState.learningRate || 0) * 100).toFixed(0)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">学习效率</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">活跃进程</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cognitiveState.activeProcesses || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">正在运行</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">内存使用</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{((cognitiveState.memoryUsage || 0) * 100).toFixed(0)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">已占用</p>
                </CardContent>
              </Card>
            </div>

            {/* Emotional State */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  情感状态
                </CardTitle>
                <CardDescription>Nova-Mind 当前的情感倾向</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold capitalize">{cognitiveState.emotionalState || "neutral"}</div>
                  <div className="text-sm text-muted-foreground">
                    Nova-Mind 目前处于{cognitiveState.emotionalState === "curious" ? "好奇心驱动" : "思考"}状态
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Thoughts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  最近的思想
                </CardTitle>
                <CardDescription>Nova-Mind 最近在思考的内容</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4 pr-4">
                    {cognitiveState.recentThoughts && cognitiveState.recentThoughts.length > 0 ? (
                      cognitiveState.recentThoughts.map((thought: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg space-y-2 bg-card/50">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium flex-1">{thought.content}</p>
                            <div className="text-xs text-muted-foreground ml-2">
                              {Math.round((parseFloat(thought.confidence?.toString() || "0.5")) * 100)}%
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {thought.category || "reflection"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">暂无思想记录</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground space-y-2 py-8 border-t">
              <p>Nova-Mind v2.0 · 认知监控系统</p>
              <p className="text-xs">此页面展示 Nova-Mind 的实时认知状态和成长轨迹</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </main>
    </div>
  );
}
