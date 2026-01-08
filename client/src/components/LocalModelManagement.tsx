import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Zap, TrendingDown, BarChart3 } from "lucide-react";
import { Streamdown } from "streamdown";

export default function LocalModelManagement() {
  const [activeTab, setActiveTab] = useState("overview");

  // 获取所有模型
  const { data: allModels, isLoading: modelsLoading } = trpc.localModels.getAllModels.useQuery();

  // 获取健康的模型
  const { data: healthyModels } = trpc.localModels.getHealthyModels.useQuery();

  // 获取所有指标
  const { data: allMetrics } = trpc.localModels.getAllMetrics.useQuery();

  // 获取成本节省统计
  const { data: costSavings } = trpc.localModels.getCostSavingsStats.useQuery();

  // 获取复杂度分布
  const { data: complexityDist } = trpc.localModels.getComplexityDistribution.useQuery();

  // 获取混合优化报告
  const { data: report } = trpc.localModels.generateReport.useQuery();

  // 获取模型推荐
  const { data: recommendations } = trpc.localModels.getModelRecommendations.useQuery();

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "bg-green-500";
    if (status === "degraded") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "degraded") return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">本地模型管理</h1>
        <p className="text-muted-foreground">管理和监控本地 LLM 模型，优化成本和性能</p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">总模型数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allModels?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {healthyModels?.length || 0} 个健康
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              成本节省
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costSavings?.savingsRate ? `${costSavings.savingsRate}%` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              ¥{costSavings?.savedCost || "0.00"} 已节省
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">总调用次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costSavings?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground">
              实际成本 ¥{costSavings?.actualCost || "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allMetrics
                ? Object.values(allMetrics).reduce(
                    (sum, m: any) => sum + (m.avgResponseTime || 0),
                    0
                  ) / Object.keys(allMetrics).length
                : "-"}
              ms
            </div>
            <p className="text-xs text-muted-foreground">跨所有模型</p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="models">模型状态</TabsTrigger>
          <TabsTrigger value="complexity">复杂度分析</TabsTrigger>
          <TabsTrigger value="report">详细报告</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>成本节省概览</CardTitle>
              <CardDescription>混合模型策略的成本效益分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">仅使用 Manus LLM</p>
                  <p className="text-2xl font-bold">¥{costSavings?.manusOnlyCost}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">实际成本（混合）</p>
                  <p className="text-2xl font-bold text-green-600">¥{costSavings?.actualCost}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900">
                  💰 节省成本: ¥{costSavings?.savedCost}
                </p>
                <p className="text-sm text-green-700">
                  通过智能模型选择，已节省 {costSavings?.savingsRate}% 的成本
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 模型推荐 */}
          {recommendations && Object.keys(recommendations).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>模型推荐</CardTitle>
                <CardDescription>基于性能和成本的最优模型选择</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(recommendations).map(([modelId, rec]: any) => (
                  <div key={modelId} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{rec.model.name}</p>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                    <Badge variant="secondary">{(rec.score * 100).toFixed(0)}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 模型状态标签页 */}
        <TabsContent value="models" className="space-y-4">
          {allModels && allModels.length > 0 ? (
            <div className="space-y-3">
              {allModels.map((model: any) => (
                <Card key={model.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(model.status)}
                            <h3 className="font-semibold">{model.name}</h3>
                            <Badge variant="outline">{model.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{model.endpoint}</p>
                        </div>
                        <Badge className={getStatusColor(model.status)}>
                          {model.status === "healthy"
                            ? "健康"
                            : model.status === "degraded"
                              ? "降级"
                              : "离线"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">成本/次</p>
                          <p className="font-semibold">¥{model.costPerCall.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">平均响应时间</p>
                          <p className="font-semibold">{model.avgResponseTime.toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">成功率</p>
                          <p className="font-semibold">{model.successRate.toFixed(1)}%</p>
                        </div>
                      </div>

                      {allMetrics && allMetrics[model.id] && (
                        <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                          <div>
                            <p className="text-muted-foreground">总调用</p>
                            <p className="font-semibold">{allMetrics[model.id].totalCalls}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">成功调用</p>
                            <p className="font-semibold">{allMetrics[model.id].successfulCalls}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {modelsLoading ? "加载中..." : "未配置任何本地模型"}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 复杂度分析标签页 */}
        <TabsContent value="complexity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>任务复杂度分布</CardTitle>
              <CardDescription>分析已处理任务的复杂度分布</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {complexityDist ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">简单任务</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {complexityDist.distribution.simple}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {complexityDist.percentages.simple}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">中等任务</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {complexityDist.distribution.medium}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {complexityDist.percentages.medium}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">复杂任务</p>
                      <p className="text-2xl font-bold text-red-600">
                        {complexityDist.distribution.complex}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {complexityDist.percentages.complex}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900">💡 优化建议</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {complexityDist.distribution.simple > complexityDist.distribution.complex
                        ? "大多数任务为简单任务，适合使用 DeepSeek 或 Ollama 进一步降低成本"
                        : "任务复杂度较高，建议保持 Manus LLM 以确保质量"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">暂无数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 详细报告标签页 */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>混合优化详细报告</CardTitle>
              <CardDescription>完整的性能和成本分析</CardDescription>
            </CardHeader>
            <CardContent>
              {report ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Streamdown>{report.report}</Streamdown>
                </div>
              ) : (
                <p className="text-muted-foreground">生成报告中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
