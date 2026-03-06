import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Loader2, Play, Square, RefreshCw, TrendingUp, Target, Zap, Rocket } from 'lucide-react';

/**
 * 自主进化仪表板
 * 
 * 展示和管理 Nova-Mind 的自主进化循环：
 * - 进化状态监控
 * - 进化历史查看
 * - 进化配置管理
 * - 进化报告生成
 */

export function AutonomousEvolutionDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // 获取进化状态
  const statusQuery = trpc.autonomousEvolution.getStatus.useQuery(undefined, {
    refetchInterval: 5000, // 每 5 秒刷新
  });

  // 获取进化历史
  const historyQuery = trpc.autonomousEvolution.getHistory.useQuery(
    { limit: 10, offset: 0 },
    { refetchInterval: 10000 }
  );

  // 获取进化报告
  const reportQuery = trpc.autonomousEvolution.getReport.useQuery();

  // 获取进化统计
  const statsQuery = trpc.autonomousEvolution.getStats.useQuery();

  // 启动进化循环
  const startMutation = trpc.autonomousEvolution.start.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 停止进化循环
  const stopMutation = trpc.autonomousEvolution.stop.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 运行单个周期
  const runCycleMutation = trpc.autonomousEvolution.runCycle.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      historyQuery.refetch();
    },
  });

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await startMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await stopMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCycle = async () => {
    setIsLoading(true);
    try {
      await runCycleMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const status = statusQuery.data;
  const history = historyQuery.data;
  const stats = statsQuery.data;
  const report = reportQuery.data;

  return (
    <div className="w-full space-y-6">
      {/* 标题 */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">自主进化系统</h2>
        <p className="text-muted-foreground">
          监控和管理 Nova-Mind 的自主进化循环
        </p>
      </div>

      {/* 状态卡片 */}
      {status && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 运行状态 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">运行状态</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.isRunning ? (
                  <Badge className="bg-green-500">运行中</Badge>
                ) : (
                  <Badge variant="secondary">已停止</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.isRunning ? '进化循环正在运行' : '进化循环已停止'}
              </p>
            </CardContent>
          </Card>

          {/* 进化周期 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">进化周期</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.cycleCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                成功: {status.completedCycles} / 失败: {status.failedCycles}
              </p>
            </CardContent>
          </Card>

          {/* 成功率 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                循环完成率
              </p>
            </CardContent>
          </Card>

          {/* 生成的目标 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">生成的目标</CardTitle>
              <Rocket className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.totalGoals}</div>
              <p className="text-xs text-muted-foreground mt-2">
                架构建议: {status.totalRecommendations}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 控制按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>进化控制</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={handleStart}
            disabled={isLoading || status?.isRunning}
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            启动进化循环
          </Button>
          <Button
            onClick={handleStop}
            disabled={isLoading || !status?.isRunning}
            variant="destructive"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            停止进化循环
          </Button>
          <Button
            onClick={handleRunCycle}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            运行单个周期
          </Button>
        </CardContent>
      </Card>

      {/* 标签页 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="history">历史</TabsTrigger>
          <TabsTrigger value="report">报告</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">进化统计</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">总周期数</span>
                    <span className="font-bold">{stats.totalCycles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">成功周期</span>
                    <span className="font-bold text-green-600">{stats.completedCycles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">失败周期</span>
                    <span className="font-bold text-red-600">{stats.failedCycles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">部分完成</span>
                    <span className="font-bold text-yellow-600">{stats.partialCycles}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">进化成果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">生成的目标</span>
                    <span className="font-bold">{stats.totalGoals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">架构建议</span>
                    <span className="font-bold">{stats.totalRecommendations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">成功训练</span>
                    <span className="font-bold text-blue-600">{stats.successfulTrainings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">成功部署</span>
                    <span className="font-bold text-purple-600">{stats.successfulDeployments}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 最近周期 */}
          {status?.lastCycle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">最近周期</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">周期 ID</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{status.lastCycle.cycleId}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">状态</span>
                  <Badge variant={status.lastCycle.status === 'completed' ? 'default' : 'destructive'}>
                    {status.lastCycle.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">时间</span>
                  <span className="text-sm">{new Date(status.lastCycle.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">生成的目标</span>
                  <span className="font-bold">{status.lastCycle.goals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">架构建议</span>
                  <span className="font-bold">{status.lastCycle.architectureRecommendations.length}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 历史标签页 */}
        <TabsContent value="history" className="space-y-4">
          {history?.items && history.items.length > 0 ? (
            <div className="space-y-2">
              {history.items.map((cycle: any) => (
                <Card key={cycle.cycleId}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">周期 ID</p>
                        <code className="text-xs">{cycle.cycleId}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">状态</p>
                        <Badge variant={cycle.status === 'completed' ? 'default' : 'destructive'}>
                          {cycle.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">时间</p>
                        <p className="text-sm">{new Date(cycle.timestamp).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">目标/建议</p>
                        <p className="text-sm">{cycle.goals.length} / {cycle.architectureRecommendations.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                暂无进化历史
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 报告标签页 */}
        <TabsContent value="report" className="space-y-4">
          {report?.report ? (
            <Card>
              <CardHeader>
                <CardTitle>进化报告</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
                  {report.report}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                报告加载中...
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
