/**
 * EvolutionDashboard - Nova-Mind 的自我进化仪表板
 * 展示基因进化的过程、性能指标和历史记录
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2, Play, Pause, RefreshCw, Zap } from "lucide-react";

export default function EvolutionDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRunning, setIsRunning] = useState(false);

  // 获取当前基因信息
  const { data: currentGenome, isLoading: genomeLoading, refetch: refetchGenome } = trpc.evolution.getCurrentGenome.useQuery();

  // 获取进化统计
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.evolution.getEvolutionStats.useQuery();

  // 获取进化历史
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = trpc.evolution.getEvolutionHistory.useQuery({ limit: 20 });

  // 获取评估指标
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.evolution.getEvaluationMetrics.useQuery();

  // 获取基因详情
  const { data: genomeDetails, isLoading: detailsLoading } = trpc.evolution.getGenomeDetails.useQuery();

  // 执行单个进化循环
  const runCycleMutation = trpc.evolution.runEvolutionCycle.useMutation({
    onSuccess: () => {
      refetchGenome();
      refetchStats();
      refetchHistory();
      refetchMetrics();
    },
  });

  // 运行多个循环
  const runMultipleCyclesMutation = trpc.evolution.runMultipleCycles.useMutation({
    onSuccess: () => {
      refetchGenome();
      refetchStats();
      refetchHistory();
      refetchMetrics();
    },
  });

  // 启动持续进化
  const startContinuousMutation = trpc.evolution.startContinuousEvolution.useMutation({
    onSuccess: () => {
      setIsRunning(true);
    },
  });

  // 停止持续进化
  const stopContinuousMutation = trpc.evolution.stopContinuousEvolution.useMutation({
    onSuccess: () => {
      setIsRunning(false);
    },
  });

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStats();
      refetchHistory();
      refetchMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetchStats, refetchHistory, refetchMetrics]);

  // 准备图表数据
  const chartData = history?.map((cycle) => ({
    generation: cycle.generation,
    improvement: cycle.improvementRatio,
    parentScore: cycle.parentScore,
    childScore: cycle.childScore,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🧬 Nova-Mind 自我进化仪表板</h1>
          <p className="text-slate-400">实时监控 Nova 的代码自我修改和进化过程</p>
        </div>

        {/* 快速操作栏 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button
            onClick={() => runCycleMutation.mutate()}
            disabled={runCycleMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {runCycleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            运行一个循环
          </Button>

          <Button
            onClick={() => runMultipleCyclesMutation.mutate({ count: 5 })}
            disabled={runMultipleCyclesMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {runMultipleCyclesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            运行 5 个循环
          </Button>

          <Button
            onClick={() => (isRunning ? stopContinuousMutation.mutate() : startContinuousMutation.mutate({ intervalMs: 60000 }))}
            disabled={startContinuousMutation.isPending || stopContinuousMutation.isPending}
            className={isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            {startContinuousMutation.isPending || stopContinuousMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isRunning ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "停止持续进化" : "启动持续进化"}
          </Button>

          <Button onClick={() => refetchStats()} disabled={statsLoading} className="bg-slate-700 hover:bg-slate-600">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>

        {/* 主要标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="metrics">指标</TabsTrigger>
            <TabsTrigger value="history">历史</TabsTrigger>
            <TabsTrigger value="genome">基因</TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 当前代数 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">当前代数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stats?.currentGeneration || 0}</div>
                  <p className="text-xs text-slate-500 mt-2">第 {stats?.currentGeneration || 0} 代</p>
                </CardContent>
              </Card>

              {/* 成功率 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">成功率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400">{stats?.successRate || 0}%</div>
                  <p className="text-xs text-slate-500 mt-2">{stats?.successCount || 0} 次成功</p>
                </CardContent>
              </Card>

              {/* 平均改进 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">平均改进</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400">{stats?.avgImprovement || 0}%</div>
                  <p className="text-xs text-slate-500 mt-2">每个循环的改进</p>
                </CardContent>
              </Card>

              {/* 最大改进 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">最大改进</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-400">{stats?.maxImprovement || 0}%</div>
                  <p className="text-xs text-slate-500 mt-2">历史最高改进</p>
                </CardContent>
              </Card>
            </div>

            {/* 进化趋势图 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>进化趋势</CardTitle>
                <CardDescription>性能改进和得分变化</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="generation" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                      <Legend />
                      <Line type="monotone" dataKey="improvement" stroke="#3b82f6" name="改进 (%)" />
                      <Line type="monotone" dataKey="parentScore" stroke="#ef4444" name="父代得分" />
                      <Line type="monotone" dataKey="childScore" stroke="#10b981" name="子代得分" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">暂无数据</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 指标标签页 */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 综合得分 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm">综合得分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-400">{metrics?.compositeScore || 0}</div>
                  <p className="text-xs text-slate-500 mt-2">满分 100</p>
                </CardContent>
              </Card>

              {/* 准确性 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm">准确性</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-400">{metrics?.correctnessScore || 0}%</div>
                  <p className="text-xs text-slate-500 mt-2">答案正确性</p>
                </CardContent>
              </Card>

              {/* Token 使用 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm">Token 使用</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-yellow-400">{metrics?.tokenUsage || 0}</div>
                  <p className="text-xs text-slate-500 mt-2">当前循环</p>
                </CardContent>
              </Card>

              {/* 执行时间 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm">执行时间</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-purple-400">{metrics?.executionTime || 0}ms</div>
                  <p className="text-xs text-slate-500 mt-2">平均响应时间</p>
                </CardContent>
              </Card>

              {/* 错误恢复 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm">错误恢复</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-400">{metrics?.errorRecoveryScore || 0}%</div>
                  <p className="text-xs text-slate-500 mt-2">容错能力</p>
                </CardContent>
              </Card>

              {/* 新颖性 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm">新颖性</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-pink-400">{metrics?.noveltyScore || 0}%</div>
                  <p className="text-xs text-slate-500 mt-2">创意程度</p>
                </CardContent>
              </Card>
            </div>

            {/* 指标对比图 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>性能指标对比</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: "指标",
                          准确性: metrics.correctnessScore,
                          逻辑一致性: metrics.logicalConsistency,
                          错误恢复: metrics.errorRecoveryScore,
                          新颖性: metrics.noveltyScore,
                          表达力: metrics.expressiveness,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                      <Legend />
                      <Bar dataKey="准确性" fill="#3b82f6" />
                      <Bar dataKey="逻辑一致性" fill="#10b981" />
                      <Bar dataKey="错误恢复" fill="#f59e0b" />
                      <Bar dataKey="新颖性" fill="#8b5cf6" />
                      <Bar dataKey="表达力" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">加载中...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 历史标签页 */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>进化历史</CardTitle>
                <CardDescription>最近 20 个进化循环</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {history && history.length > 0 ? (
                    history.map((cycle) => (
                      <div key={cycle.cycleId} className="p-3 bg-slate-700 rounded border border-slate-600 hover:border-slate-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-white">循环 #{cycle.generation}</p>
                            <p className="text-xs text-slate-400">变异类型: {cycle.mutationType}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${cycle.result === "success" ? "text-green-400" : "text-red-400"}`}>
                              {cycle.result === "success" ? "✓ 成功" : "✗ 失败"}
                            </p>
                            <p className="text-xs text-slate-400">改进: {cycle.improvementRatio.toFixed(2)}%</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          <p>父代得分: {cycle.parentScore.toFixed(2)} → 子代得分: {cycle.childScore?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-8">暂无进化历史</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 基因标签页 */}
          <TabsContent value="genome" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>当前基因信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentGenome ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-400">版本</p>
                        <p className="text-lg font-semibold text-white">{currentGenome.version}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">代数</p>
                        <p className="text-lg font-semibold text-white">{currentGenome.generation}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">节点数</p>
                        <p className="text-lg font-semibold text-white">{currentGenome.stats.nodeCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">执行路径</p>
                        <p className="text-lg font-semibold text-white">{currentGenome.stats.pathCount}</p>
                      </div>
                    </div>

                    {/* 基因节点列表 */}
                    {genomeDetails && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-white mb-3">工作流节点</h3>
                        <div className="space-y-2">
                          {genomeDetails.nodes.map((node) => (
                            <div key={node.id} className="p-2 bg-slate-700 rounded text-sm">
                              <p className="font-semibold text-white">{node.name}</p>
                              <p className="text-xs text-slate-400">{node.description}</p>
                              <p className="text-xs text-slate-500 mt-1">下一步: {node.nextCount} 个选项</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-500 py-8">加载中...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
