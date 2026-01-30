import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function MonitoringDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取监控数据
  const dashboardQuery = trpc.monitoring.getDashboard.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 0,
  });

  const systemStatusQuery = trpc.monitoring.getSystemStatus.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 0,
  });

  const dashboard = dashboardQuery.data;
  const systemStatus = systemStatusQuery.data;

  // 获取趋势指示器
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Activity className="w-4 h-4 text-blue-500" />;
  };

  // 获取状态颜色
  const getStatusColor = (percent: number, threshold: number) => {
    if (percent > 85) return 'bg-red-100 text-red-900';
    if (percent > threshold) return 'bg-yellow-100 text-yellow-900';
    return 'bg-green-100 text-green-900';
  };

  if (!dashboard || !systemStatus) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>系统监控</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 系统状态告警 */}
      {systemStatus.status !== 'healthy' && (
        <Alert className={systemStatus.status === 'critical' ? 'border-red-500' : 'border-yellow-500'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">
              {systemStatus.status === 'critical' ? '🚨 系统严重告警' : '⚠️ 系统警告'}
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {systemStatus.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 内存监控 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">内存使用</CardTitle>
          {dashboard.memory.current && getTrendIcon(dashboard.memory.trend)}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {dashboard.memory.current?.usagePercent.toFixed(1)}%
              </span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(dashboard.memory.current?.usagePercent || 0, dashboard.config.memoryThreshold)}`}>
                {dashboard.memory.current?.usedMB}MB / {dashboard.memory.current?.totalMB}MB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (dashboard.memory.current?.usagePercent || 0) > 85
                    ? 'bg-red-500'
                    : (dashboard.memory.current?.usagePercent || 0) > dashboard.config.memoryThreshold
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(dashboard.memory.current?.usagePercent || 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>平均: {dashboard.memory.average.toFixed(1)}% | 峰值: {dashboard.memory.peak.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 成本监控 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">LLM 成本</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                ${dashboard.cost.current?.totalCost.toFixed(2)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(dashboard.cost.current?.costPercent || 0, dashboard.config.costThreshold)}`}>
                {dashboard.cost.current?.costPercent.toFixed(1)}% / ${dashboard.cost.current?.monthlyBudget.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (dashboard.cost.current?.costPercent || 0) > 100
                    ? 'bg-red-500'
                    : (dashboard.cost.current?.costPercent || 0) > dashboard.config.costThreshold
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(dashboard.cost.current?.costPercent || 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>调用: {dashboard.cost.current?.callCount} | 日均: ${dashboard.cost.dailyAverage.toFixed(3)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能监控 */}
      {dashboard.performance && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">性能指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">平均响应时间</p>
                <p className="text-lg font-semibold">
                  {dashboard.performance.avgResponseTime.toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">错误率</p>
                <p className={`text-lg font-semibold ${dashboard.performance.errorRate > dashboard.config.errorRateThreshold ? 'text-red-600' : 'text-green-600'}`}>
                  {dashboard.performance.errorRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">P95 响应时间</p>
                <p className="text-lg font-semibold">
                  {dashboard.performance.p95ResponseTime.toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">P99 响应时间</p>
                <p className="text-lg font-semibold">
                  {dashboard.performance.p99ResponseTime.toFixed(0)}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 控制面板 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">监控设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">自动刷新</span>
            </label>
            {autoRefresh && (
              <div>
                <label className="text-xs text-muted-foreground">刷新间隔</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value={5000}>5 秒</option>
                  <option value={10000}>10 秒</option>
                  <option value={30000}>30 秒</option>
                  <option value={60000}>1 分钟</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
