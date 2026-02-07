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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10 border border-white/10">
              <Brain className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Nova-Mind 认知监控</h1>
              <p className="text-xs text-slate-400">实时追踪成长轨迹与行动闭环</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="border-white/20 text-slate-100" asChild>
              <Link href="/chat">
                <Sparkles className="w-4 h-4 mr-2" />
                返回对话
              </Link>
            </Button>
            <div className="text-sm text-slate-400">{user?.name || user?.email}</div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-white/10 bg-slate-900/60 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    认知中枢总览
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    以更清晰的方式呈现 Nova-Mind 的核心学习与记忆状态
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-300 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">成长可见化</p>
                      <p className="text-slate-400">实时看到概念、关系与记忆的增长曲线。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">行动闭环</p>
                      <p className="text-slate-400">将反思转化为行动任务，形成可追踪的进化路径。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">长期记忆沉淀</p>
                      <p className="text-slate-400">持续积累的情境记忆，让系统更懂你。</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-gradient-to-br from-indigo-500/10 via-slate-900/60 to-purple-500/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-300" />
                    今日目标
                  </CardTitle>
                  <CardDescription className="text-slate-400">面向 AGI 进化的关键抓手</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                    <span>行动任务完成率</span>
                    <span className="text-emerald-300 font-semibold">持续提升</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                    <span>反思→行动转化</span>
                    <span className="text-indigo-300 font-semibold">已启动</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                    <span>学习稳定性</span>
                    <span className="text-purple-300 font-semibold">可追踪</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-white/10 bg-slate-900/70 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <Network className="w-4 h-4 text-blue-400" />
                    概念数量
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{cognitiveState.conceptCount}</div>
                  <p className="text-xs text-slate-400 mt-1">已学习的概念节点</p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-slate-900/70 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    关系网络
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{cognitiveState.relationCount}</div>
                  <p className="text-xs text-slate-400 mt-1">概念之间的连接</p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-slate-900/70 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <Brain className="w-4 h-4 text-purple-400" />
                    记忆库
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{cognitiveState.memoryCount}</div>
                  <p className="text-xs text-slate-400 mt-1">重要情境记忆</p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-slate-900/70 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    待探索问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{cognitiveState.pendingQuestionCount}</div>
                  <p className="text-xs text-slate-400 mt-1">好奇心驱动的问题</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Reflections */}
            <Card className="border-white/10 bg-slate-900/60 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                  近期反思
                </CardTitle>
                <CardDescription className="text-slate-400">Nova-Mind 的自我认知和信念更新</CardDescription>
              </CardHeader>
              <CardContent>
                {cognitiveState.recentReflections.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无反思记录</p>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {cognitiveState.recentReflections.map((reflection, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-indigo-400/60 pl-4 py-2 rounded-r-lg bg-slate-950/40"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-500/10 text-indigo-200">
                              {reflection.type}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(reflection.timestamp).toLocaleString("zh-CN")}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200">{reflection.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Recent Growth Events */}
            <Card className="border-white/10 bg-slate-900/60 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                  成长轨迹
                </CardTitle>
                <CardDescription className="text-slate-400">认知发育的重要事件和里程碑</CardDescription>
              </CardHeader>
              <CardContent>
                {cognitiveState.recentGrowth.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无成长记录</p>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {cognitiveState.recentGrowth.map((event, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-emerald-400/60 pl-4 py-2 rounded-r-lg bg-slate-950/40"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-200">
                              {event.stage}
                            </span>
                            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-200">
                              {event.event}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(event.timestamp).toLocaleString("zh-CN")}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200">{event.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <div className="text-center text-sm text-slate-400">
              <p>Nova-Mind 正在通过每次对话不断学习和成长</p>
              <p className="text-xs mt-1">数据每10秒自动刷新</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
