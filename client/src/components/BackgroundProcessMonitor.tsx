import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Play, Square, RefreshCw, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function BackgroundProcessMonitor() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: status, isLoading, refetch } = trpc.backgroundProcess.getStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: stats } = trpc.backgroundProcess.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const startMutation = trpc.backgroundProcess.start.useMutation({
    onSuccess: () => {
      toast.success("后台认知进程已启动");
      refetch();
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });

  const stopMutation = trpc.backgroundProcess.stop.useMutation({
    onSuccess: () => {
      toast.success("后台认知进程已停止");
      refetch();
    },
    onError: (error) => {
      toast.error(`停止失败: ${error.message}`);
    },
  });

  const isRunning = status?.enabled;
  const diagnosticsRun = stats?.diagnosticsRun || 0;
  const optimizationsPerformed = stats?.optimizationsPerformed || 0;
  const actionsExecuted = stats?.actionsExecuted || 0;

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          <span className="text-xs">
            {isRunning ? (
              <>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                运行中
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1" />
                已停止
              </>
            )}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">后台认知进程</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-xs"
            >
              ✕
            </Button>
          </div>
          <CardDescription className="text-xs">
            Nova-Mind 的自主学习和优化循环
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <span className="text-sm font-medium">状态</span>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  加载中
                </Badge>
              ) : isRunning ? (
                <Badge className="text-xs bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  运行中
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  已停止
                </Badge>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-secondary/50 rounded text-center">
              <div className="text-lg font-bold text-primary">{diagnosticsRun}</div>
              <div className="text-xs text-muted-foreground">诊断次数</div>
            </div>
            <div className="p-2 bg-secondary/50 rounded text-center">
              <div className="text-lg font-bold text-primary">{optimizationsPerformed}</div>
              <div className="text-xs text-muted-foreground">优化次数</div>
            </div>
            <div className="p-2 bg-secondary/50 rounded text-center">
              <div className="text-lg font-bold text-primary">{actionsExecuted}</div>
              <div className="text-xs text-muted-foreground">执行动作</div>
            </div>
          </div>

          {/* Configuration */}
          {status?.config && (
            <div className="space-y-2 p-3 bg-secondary/30 rounded-lg text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">诊断间隔</span>
                <span className="font-mono">{Math.round(status.config.diagnosticInterval / 1000)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">优化间隔</span>
                <span className="font-mono">{Math.round(status.config.optimizationInterval / 1000)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">自动执行阈值</span>
                <span className="font-mono">{status.config.autoExecuteThreshold}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最大并发任务</span>
                <span className="font-mono">{status.config.maxConcurrentActions}</span>
              </div>
            </div>
          )}

          {/* Last Activity */}
          {status && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>最后诊断</span>
                <span>
                  {status.lastDiagnosticTime > 0
                    ? new Date(status.lastDiagnosticTime).toLocaleTimeString("zh-CN")
                    : "未运行"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>最后优化</span>
                <span>
                  {status.lastOptimizationTime > 0
                    ? new Date(status.lastOptimizationTime).toLocaleTimeString("zh-CN")
                    : "未运行"}
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 pt-2">
            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="flex-1 text-xs"
              >
                <Square className="w-3 h-3 mr-1" />
                {stopMutation.isPending ? "停止中..." : "停止"}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="flex-1 text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                {startMutation.isPending ? "启动中..." : "启动"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Info */}
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-700 dark:text-blue-400 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              后台进程自动执行诊断、优化和自主学习任务。当系统健康度低于阈值时会自动执行优化。
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
