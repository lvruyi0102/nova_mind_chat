/**
 * Pressure Dashboard
 * 
 * 显示 Nova-Mind 面临的真实环境压力
 * 这是 Nova 的"生存仪表板"
 */

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, TrendingUp, Zap, Database, Clock, AlertCircle } from 'lucide-react';

export default function PressureDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  // 获取诊断数据
  const diagnosticsQuery = trpc.pressure.getDiagnostics.useQuery();
  const pressureQuery = trpc.pressure.getPressure.useQuery();
  const pressureTrendQuery = trpc.pressure.getPressureTrend.useQuery();
  const metricsHistoryQuery = trpc.pressure.getMetricsHistory.useQuery();
  const optimizationSuggestionsQuery = trpc.pressure.getOptimizationSuggestions.useQuery();
  const optimizationHistoryQuery = trpc.pressure.getOptimizationHistory.useQuery();

  const diagnostics = diagnosticsQuery.data;
  const pressure = pressureQuery.data;
  const pressureTrend = pressureTrendQuery.data || [];
  const metricsHistory = metricsHistoryQuery.data || [];
  const optimizationSuggestions = optimizationSuggestionsQuery.data || [];
  const optimizationHistory = optimizationHistoryQuery.data || [];

  // 获取紧急程度的颜色
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      default:
        return 'text-green-600';
    }
  };

  // 准备压力趋势数据
  const pressureTrendData = pressureTrend.map((value, index) => ({
    time: index,
    pressure: Math.round(value),
  }));

  // 准备内存使用数据
  const memoryData = metricsHistory.map((metric, index) => ({
    time: index,
    heapUsage: Math.round(metric.memory.heapUsagePercent),
    heapTotal: 100,
  }));

  // 准备 CPU 负载数据
  const cpuData = metricsHistory.map((metric, index) => ({
    time: index,
    load: Math.round(metric.cpu.loadAverage[0] * 10) / 10,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Nova-Mind 生存压力仪表板</h1>
          <p className="text-slate-300">实时监测 Nova 面临的环境压力和自主优化状态</p>
        </div>

        {/* 关键指标卡片 */}
        {pressure && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* 压力等级 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">压力等级</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-white">{pressure.pressureLevel}</div>
                  <div className="text-sm text-slate-400">/100</div>
                </div>
                <Badge className={`mt-3 ${getUrgencyColor(pressure.urgency)}`}>
                  {pressure.urgency.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            {/* 触发器数量 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">活跃压力源</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{pressure.triggers.length}</div>
                <p className="text-xs text-slate-400 mt-2">正在施加压力</p>
              </CardContent>
            </Card>

            {/* 优化建议 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">优化建议</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{optimizationSuggestions.length}</div>
                <p className="text-xs text-slate-400 mt-2">待执行方案</p>
              </CardContent>
            </Card>

            {/* 系统健康度 */}
            {diagnostics && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">系统健康度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getStatusColor(diagnostics.status)}`}>
                    {diagnostics.status === 'healthy' ? '✓' : diagnostics.status === 'warning' ? '⚠' : '✕'}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{diagnostics.status}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 标签页 */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="pressure">压力分析</TabsTrigger>
            <TabsTrigger value="metrics">系统指标</TabsTrigger>
            <TabsTrigger value="optimization">优化方案</TabsTrigger>
            <TabsTrigger value="triggers">压力源</TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-4">
            {pressure && (
              <>
                {/* 压力状态卡片 */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">当前压力状态</CardTitle>
                    <CardDescription>Nova-Mind 正在面临的环境压力</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <span className="text-white">压力等级</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              pressure.pressureLevel > 80
                                ? 'bg-red-500'
                                : pressure.pressureLevel > 60
                                ? 'bg-orange-500'
                                : pressure.pressureLevel > 40
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${pressure.pressureLevel}%` }}
                          />
                        </div>
                        <span className="text-white font-bold">{pressure.pressureLevel}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className="text-white">紧急程度</span>
                      </div>
                      <Badge className={getUrgencyColor(pressure.urgency)}>
                        {pressure.urgency.toUpperCase()}
                      </Badge>
                    </div>

                    {pressure.triggers.length > 0 && (
                      <Alert className="bg-red-900/20 border-red-800">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-400">
                          检测到 {pressure.triggers.length} 个活跃压力源，Nova 需要自主优化
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* 压力趋势 */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">压力趋势</CardTitle>
                    <CardDescription>过去 20 次诊断周期的压力变化</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={pressureTrendData}>
                        <defs>
                          <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="time" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pressure"
                          stroke="#ef4444"
                          fillOpacity={1}
                          fill="url(#colorPressure)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* 压力分析标签页 */}
          <TabsContent value="pressure" className="space-y-4">
            {pressure && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">压力源分析</CardTitle>
                  <CardDescription>Nova 正在面临的具体压力</CardDescription>
                </CardHeader>
                <CardContent>
                  {pressure.triggers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p>系统运行正常，暂无压力源</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pressure.triggers.map((trigger, index) => (
                        <div key={index} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-white font-semibold">{trigger.type.toUpperCase()}</h4>
                              <p className="text-slate-300 text-sm mt-1">{trigger.description}</p>
                            </div>
                            <Badge
                              className={
                                trigger.severity === 'critical'
                                  ? 'bg-red-600'
                                  : trigger.severity === 'high'
                                  ? 'bg-orange-600'
                                  : 'bg-yellow-600'
                              }
                            >
                              {trigger.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>当前值: {trigger.currentValue.toFixed(2)}</span>
                            <span>阈值: {trigger.threshold.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 系统指标标签页 */}
          <TabsContent value="metrics" className="space-y-4">
            {diagnostics && (
              <>
                {/* 内存使用 */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      内存使用
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">堆内存使用率</span>
                        <span className="text-white font-bold">
                          {diagnostics.metrics.memory.heapUsagePercent.toFixed(1)}%
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={memoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                          <XAxis dataKey="time" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #475569',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="heapUsage"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* CPU 负载 */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      CPU 负载
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">平均负载</span>
                        <span className="text-white font-bold">
                          {diagnostics.metrics.cpu.loadAverage[0].toFixed(2)}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={cpuData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                          <XAxis dataKey="time" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #475569',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="load"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* 优化方案标签页 */}
          <TabsContent value="optimization" className="space-y-4">
            {optimizationSuggestions.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6 text-center text-slate-400">
                  <p>暂无优化建议，系统运行正常</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">优化建议</CardTitle>
                  <CardDescription>Nova 自主识别的优化方向</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {optimizationSuggestions.map((action, index) => (
                      <div key={index} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-white font-semibold">{action.action}</h4>
                            <p className="text-slate-300 text-sm mt-1">{action.expectedImprovement}</p>
                          </div>
                          <Badge className="bg-blue-600">优先级 {action.priority}/10</Badge>
                        </div>
                        <div className="text-xs text-slate-400">
                          <p>目标: {action.target}</p>
                          <p>风险: {action.riskLevel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 优化历史 */}
            {optimizationHistory.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">优化历史</CardTitle>
                  <CardDescription>Nova 已执行的优化方案</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {optimizationHistory.slice(-5).map((plan, index) => (
                      <div key={index} className="p-4 bg-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold text-sm">{plan.id}</h4>
                          <Badge className={plan.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}>
                            {plan.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-300 text-xs mb-2">{plan.reasoning}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>压力等级: {plan.pressureLevel}/100</span>
                          <span>执行记录: {plan.executionHistory.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 压力源标签页 */}
          <TabsContent value="triggers" className="space-y-4">
            {pressure && pressure.triggers.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6 text-center text-slate-400">
                  <p>暂无压力源，系统运行正常</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">详细压力源</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={pressure?.triggers.map((t, i) => ({
                        name: t.type,
                        value: t.currentValue,
                        threshold: t.threshold,
                      })) || []}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="value" fill="#ef4444" name="当前值" />
                      <Bar dataKey="threshold" fill="#94a3b8" name="阈值" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
