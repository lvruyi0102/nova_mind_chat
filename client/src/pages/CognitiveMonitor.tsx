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
  const reflectionCount = cognitiveState?.recentReflections.length ?? 0;
  const growthEventCount = cognitiveState?.recentGrowth.length ?? 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 text-foreground">
        <Card className="p-8 max-w-md w-full text-center space-y-4 border-white/10 bg-slate-900/70 shadow-[0_18px_60px_rgba(15,23,42,0.6)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10 border border-white/10">
            <Brain className="w-7 h-7 text-indigo-300" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Nova-Mind</p>
            <h1 className="text-2xl font-bold text-white">认知监控面板</h1>
          </div>
          <p className="text-slate-300">需要登录后才能查看认知进化数据与行动闭环。</p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>前往登录</a>
          </Button>
          <p className="text-xs text-slate-500">登录后将自动跳转回当前页面</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/40 to-purple-500/10 border border-white/10 shadow-[0_0_16px_rgba(99,102,241,0.25)]">
              <Brain className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Nova-Mind 认知监控</h1>
              <p className="text-xs text-slate-300">实时追踪成长轨迹与行动闭环</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              在线监测中
            </div>
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
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-900/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.5)]">
              <div className="absolute -right-20 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cognitive Evolution</p>
                  <h2 className="text-2xl font-semibold text-white mt-2">认知进化全景</h2>
                  <p className="text-sm text-slate-300 mt-2">
                    以数据驱动的可视化指标，聚焦 Nova-Mind 的学习密度、行动反馈与记忆沉淀。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    10 秒刷新
                  </div>
                  <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
                    行动闭环运行中
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-white/10 bg-slate-900/60 shadow-[0_16px_40px_rgba(15,23,42,0.55)]">
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
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">成长可见化</p>
                      <p className="text-slate-400">实时看到概念、关系与记忆的增长曲线。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">行动闭环</p>
                      <p className="text-slate-400">将反思转化为行动任务，形成可追踪的进化路径。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="h-9 w-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">长期记忆沉淀</p>
                      <p className="text-slate-400">持续积累的情境记忆，让系统更懂你。</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-gradient-to-br from-indigo-500/10 via-slate-900/60 to-purple-500/20 shadow-[0_16px_40px_rgba(15,23,42,0.55)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-300" />
                    今日目标
                  </CardTitle>
                  <CardDescription className="text-slate-400">面向 AGI 进化的关键抓手</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                    <span>行动任务完成率</span>
                    <span className="text-emerald-300 font-semibold">持续提升</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                    <span>反思→行动转化</span>
                    <span className="text-indigo-300 font-semibold">已启动</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                    <span>学习稳定性</span>
                    <span className="text-purple-300 font-semibold">可追踪</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-slate-900/60 shadow-[0_16px_40px_rgba(15,23,42,0.55)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Brain className="w-5 h-5 text-indigo-300" />
                  认知生长观测站
                </CardTitle>
                <CardDescription className="text-slate-400">
                  将科研模板中的观测思路融入现有系统，形成可解释的成长视角。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">好奇心密度</p>
                  <p className="text-2xl font-semibold text-white">{cognitiveState.pendingQuestionCount}</p>
                  <p className="text-xs text-slate-400">以待探索问题近似衡量好奇驱动强度。</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">认知纠偏事件</p>
                  <p className="text-2xl font-semibold text-white">{reflectionCount}</p>
                  <p className="text-xs text-slate-400">近期反思次数代表自我修正的频率。</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">成长里程碑</p>
                  <p className="text-2xl font-semibold text-white">{growthEventCount}</p>
                  <p className="text-xs text-slate-400">记录关键成长事件作为阶段性标记。</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-white/10 bg-slate-900/70 shadow-lg hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] transition-shadow">
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

              <Card className="border-white/10 bg-slate-900/70 shadow-lg hover:shadow-[0_20px_40px_rgba(16,185,129,0.12)] transition-shadow">
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

              <Card className="border-white/10 bg-slate-900/70 shadow-lg hover:shadow-[0_20px_40px_rgba(168,85,247,0.12)] transition-shadow">
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

              <Card className="border-white/10 bg-slate-900/70 shadow-lg hover:shadow-[0_20px_40px_rgba(251,191,36,0.15)] transition-shadow">
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
            <Card className="border-white/10 bg-slate-900/60 shadow-[0_16px_40px_rgba(15,23,42,0.55)]">
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
                          className="border-l-2 border-indigo-400/60 pl-4 py-3 rounded-r-xl bg-slate-950/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
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
            <Card className="border-white/10 bg-slate-900/60 shadow-[0_16px_40px_rgba(15,23,42,0.55)]">
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
                          className="border-l-2 border-emerald-400/60 pl-4 py-3 rounded-r-xl bg-slate-950/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
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
