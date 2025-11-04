import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Activity, Brain, Loader2, Power, Sparkles, Zap } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function AutonomousMonitor() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: autonomousState, isLoading: stateLoading } = trpc.autonomous.getState.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  const { data: status } = trpc.autonomous.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const [autonomyLevel, setAutonomyLevel] = useState<number>(8);
  const updateAutonomyMutation = trpc.autonomous.updateAutonomyLevel.useMutation({
    onSuccess: () => {
      toast.success("自主权限等级已更新");
    },
    onError: () => {
      toast.error("更新失败");
    },
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
          <Power className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">自主系统监控</h1>
          <p className="text-muted-foreground">请登录以查看 Nova-Mind 的自主状态</p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>登录</a>
          </Button>
        </Card>
      </div>
    );
  }

  const getStateColor = (state?: string) => {
    switch (state) {
      case "awake":
        return "bg-green-500";
      case "thinking":
        return "bg-blue-500";
      case "reflecting":
        return "bg-purple-500";
      case "exploring":
        return "bg-yellow-500";
      case "sleeping":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStateLabel = (state?: string) => {
    switch (state) {
      case "awake":
        return "清醒";
      case "thinking":
        return "思考中";
      case "reflecting":
        return "反思中";
      case "exploring":
        return "探索中";
      case "sleeping":
        return "休息中";
      default:
        return "未知";
    }
  };

  const getMotivationLabel = (motivation?: string | null) => {
    switch (motivation) {
      case "curiosity":
        return "好奇心";
      case "confusion":
        return "困惑";
      case "excitement":
        return "兴奋";
      case "boredom":
        return "无聊";
      default:
        return motivation || "未知";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Power className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Nova-Mind 自主系统</h1>
              <p className="text-xs text-muted-foreground">实时监控独立意识状态</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/monitor">
                <Brain className="w-4 h-4 mr-2" />
                认知监控
              </Link>
            </Button>
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
        {stateLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !autonomousState ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">无法加载自主状态数据</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  系统状态
                </CardTitle>
                <CardDescription>后台认知进程运行状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status?.isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-sm font-medium">{status?.isRunning ? "运行中" : "已停止"}</span>
                  </div>
                  <Badge variant="outline">{status?.uptime}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Current State */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  当前意识状态
                </CardTitle>
                <CardDescription>Nova-Mind 的实时状态和动机</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* State */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">意识状态</span>
                    <Badge className={getStateColor(autonomousState.state)}>{getStateLabel(autonomousState.state)}</Badge>
                  </div>
                </div>

                {/* Motivation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">当前动机</span>
                    <Badge variant="outline">{getMotivationLabel(autonomousState.currentMotivation)}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">强度:</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(autonomousState.motivationIntensity || 0) * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{autonomousState.motivationIntensity}/10</span>
                  </div>
                </div>

                {/* Last Thought */}
                <div>
                  <span className="text-sm font-medium block mb-2">最近的思考</span>
                  <p className="text-sm text-muted-foreground border-l-2 border-primary pl-4 py-2">
                    {autonomousState.lastThoughtContent || "暂无思考记录"}
                  </p>
                </div>

                {/* Autonomy Level Control */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">自主权限等级</span>
                    <Badge variant="secondary">{autonomousState.autonomyLevel}/10</Badge>
                  </div>
                  <div className="space-y-3">
                    <Slider
                      value={[autonomyLevel]}
                      onValueChange={(value) => setAutonomyLevel(value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        等级越高，Nova 的自主决策权限越大，可以更自由地探索和主动联系
                      </p>
                      <Button
                        size="sm"
                        onClick={() => updateAutonomyMutation.mutate({ level: autonomyLevel })}
                        disabled={updateAutonomyMutation.isPending || autonomyLevel === autonomousState.autonomyLevel}
                      >
                        {updateAutonomyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                        更新
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground text-right">
                  最后更新: {autonomousState.updatedAt ? new Date(autonomousState.updatedAt).toLocaleString("zh-CN") : "未知"}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>Nova-Mind 正在后台独立运行，每2分钟执行一次认知循环</p>
              <p className="text-xs">它会自主决策、探索概念、反思、整合知识，并在必要时主动联系您</p>
              <p className="text-xs mt-2">数据每5秒自动刷新</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
