import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function CostMonitoringDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // 获取统计数据
  const statsQuery = trpc.costMonitoring.getStats.useQuery();
  const dailySummariesQuery = trpc.costMonitoring.getDailySummaries.useQuery({ days: 30 });
  const cacheEfficiencyQuery = trpc.costMonitoring.getCacheEfficiency.useQuery();
  const serviceBreakdownQuery = trpc.costMonitoring.getServiceCostBreakdown.useQuery();
  const llmMetricsQuery = trpc.costMonitoring.getLLMMetrics.useQuery();
  const queryMetricsQuery = trpc.costMonitoring.getQueryMetrics.useQuery();
  const recommendationsQuery = trpc.costMonitoring.getOptimizationRecommendations.useQuery();
  const predictQuery = trpc.costMonitoring.predictMonthlyCost.useQuery();

  const stats = statsQuery.data;
  const dailySummaries = dailySummariesQuery.data || [];
  const cacheEfficiency = cacheEfficiencyQuery.data;
  const serviceBreakdown = serviceBreakdownQuery.data || {};
  const llmMetrics = llmMetricsQuery.data;
  const queryMetrics = queryMetricsQuery.data;
  const recommendations = recommendationsQuery.data;
  const prediction = predictQuery.data;

  // 准备图表数据
  const chartData = dailySummaries.map((summary) => ({
    date: summary.date,
    llm: summary.llmCost,
    database: summary.databaseCost,
    total: summary.totalCost,
  }));

  const serviceData = Object.entries(serviceBreakdown).map(([name, cost]) => ({
    name,
    value: cost as number,
  }));

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 总成本卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats?.totalCost.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.costTrend === "increasing" && (
                <span className="flex items-center text-red-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  上升趋势
                </span>
              )}
              {stats?.costTrend === "decreasing" && (
                <span className="flex items-center text-green-600">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  下降趋势
                </span>
              )}
              {stats?.costTrend === "stable" && (
                <span className="flex items-center text-blue-600">稳定</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* LLM 成本卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">LLM 成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats?.llmCost.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-gray-500 mt-1">
              占比 {stats?.totalCost ? ((stats.llmCost / stats.totalCost) * 100).toFixed(1) : "0"}%
            </p>
          </CardContent>
        </Card>

        {/* 节省成本卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">节省成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">¥{stats?.savingsCost.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-gray-500 mt-1">
              通过缓存和优化
            </p>
          </CardContent>
        </Card>

        {/* 预测月成本卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">预测月成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{prediction?.predictedCost.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-gray-500 mt-1">
              基于当前平均日成本
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="trends">趋势</TabsTrigger>
          <TabsTrigger value="efficiency">效率</TabsTrigger>
          <TabsTrigger value="recommendations">建议</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 成本分布饼图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">成本分布</CardTitle>
                <CardDescription>按服务分类</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ¥${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `¥${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">暂无数据</p>
                )}
              </CardContent>
            </Card>

            {/* 缓存效率卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">缓存效率</CardTitle>
                <CardDescription>优化效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">缓存命中率</span>
                    <span className="text-sm font-bold">{cacheEfficiency?.hitRate.toFixed(1) || "0"}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${Math.min(cacheEfficiency?.hitRate || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">成本降低</span>
                    <span className="text-sm font-bold">{cacheEfficiency?.costReduction.toFixed(1) || "0"}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(cacheEfficiency?.costReduction || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    已节省: <span className="font-bold text-green-600">¥{cacheEfficiency?.savedCost.toFixed(2) || "0.00"}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 趋势标签页 */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">成本趋势（30天）</CardTitle>
              <CardDescription>LLM 和数据库成本变化</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `¥${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="llm" stroke="#3b82f6" name="LLM 成本" />
                    <Line type="monotone" dataKey="database" stroke="#10b981" name="数据库成本" />
                    <Line type="monotone" dataKey="total" stroke="#f59e0b" name="总成本" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500">暂无数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 效率标签页 */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LLM 优化指标 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LLM 优化</CardTitle>
                <CardDescription>调用优化效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">总调用次数</span>
                  <span className="font-bold">{llmMetrics?.totalCalls || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">缓存命中</span>
                  <span className="font-bold text-green-600">{llmMetrics?.cachedCalls || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">批量调用</span>
                  <span className="font-bold text-blue-600">{llmMetrics?.batchedCalls || 0}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-sm font-medium">缓存命中率</span>
                  <span className="font-bold">{llmMetrics?.cacheHitRate.toFixed(1) || "0"}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">成本节省</span>
                  <span className="font-bold text-green-600">{llmMetrics?.costSavingsRate.toFixed(1) || "0"}%</span>
                </div>
              </CardContent>
            </Card>

            {/* 数据库查询优化指标 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">数据库优化</CardTitle>
                <CardDescription>查询优化效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">总查询次数</span>
                  <span className="font-bold">{queryMetrics?.totalQueries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">缓存命中</span>
                  <span className="font-bold text-green-600">{queryMetrics?.cachedQueries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">批量查询</span>
                  <span className="font-bold text-blue-600">{queryMetrics?.batchedQueries || 0}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-sm font-medium">缓存命中率</span>
                  <span className="font-bold">{queryMetrics?.cacheHitRate.toFixed(1) || "0"}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">查询节省</span>
                  <span className="font-bold text-green-600">{queryMetrics?.querySavings || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 建议标签页 */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">优化建议</CardTitle>
              <CardDescription>
                {recommendations?.priority === "high" ? (
                  <span className="text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    需要立即关注
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    运行正常
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {recommendations.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">暂无优化建议，系统运行良好</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
