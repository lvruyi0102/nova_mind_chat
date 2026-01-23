import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MemoryStats {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapUsagePercentage: number;
  external: number;
  rss: number;
}

interface CacheEvent {
  timestamp: number;
  type: 'cleanup' | 'evict' | 'set' | 'get';
  size: number;
  reason?: string;
}

/**
 * Memory Monitoring Dashboard Component
 * 
 * Displays real-time memory usage, cache statistics, and cleanup events
 */
export function MemoryMonitoringDashboard() {
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([]);
  const [cacheEvents, setCacheEvents] = useState<CacheEvent[]>([]);
  const [currentStats, setCurrentStats] = useState<MemoryStats | null>(null);
  const [cacheHitRate, setCacheHitRate] = useState(0);
  const [cleanupCount, setCleanupCount] = useState(0);

  // Simulate fetching memory stats from backend
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would fetch from a tRPC endpoint
      const now = Date.now();
      const memUsage = {
        timestamp: now,
        heapUsed: Math.random() * 100 * 1024 * 1024, // 0-100MB
        heapTotal: 128 * 1024 * 1024, // 128MB
        heapUsagePercentage: Math.random() * 0.95,
        external: Math.random() * 10 * 1024 * 1024,
        rss: Math.random() * 150 * 1024 * 1024,
      };

      setCurrentStats(memUsage);
      setMemoryHistory(prev => {
        const updated = [...prev, memUsage];
        return updated.slice(-60); // Keep last 60 data points
      });

      // Simulate cache events
      if (Math.random() > 0.7) {
        const event: CacheEvent = {
          timestamp: now,
          type: Math.random() > 0.5 ? 'cleanup' : 'evict',
          size: Math.random() * 1024 * 1024,
          reason: Math.random() > 0.5 ? 'expired' : 'aggressive',
        };
        setCacheEvents(prev => [...prev.slice(-20), event]);
        setCleanupCount(prev => prev + 1);
      }

      // Update cache hit rate
      setCacheHitRate(Math.random() * 100);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  if (!currentStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading memory statistics...</p>
      </div>
    );
  }

  const heapUsagePercent = (currentStats.heapUsagePercentage * 100).toFixed(1);
  const isWarning = currentStats.heapUsagePercentage > 0.8;
  const isCritical = currentStats.heapUsagePercentage > 0.94;

  // Format bytes to MB
  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  // Chart data for memory history
  const chartData = memoryHistory.map(stat => ({
    timestamp: new Date(stat.timestamp).toLocaleTimeString(),
    usage: parseFloat(formatBytes(stat.heapUsed)),
    percentage: parseFloat((stat.heapUsagePercentage * 100).toFixed(1)),
  }));

  // Chart data for cache events
  const eventData = cacheEvents.map((event, index) => ({
    index,
    size: parseFloat(formatBytes(event.size)),
    type: event.type,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">内存监控仪表板</h2>
          <p className="text-muted-foreground">Memory Monitoring Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">实时监控</span>
        </div>
      </div>

      {/* Alert for high memory usage */}
      {isCritical && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ 严重警告：堆内存使用率达到 {heapUsagePercent}%，系统已触发激进清理机制
          </AlertDescription>
        </Alert>
      )}

      {isWarning && !isCritical && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ 警告：堆内存使用率达到 {heapUsagePercent}%，建议关注
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">堆内存使用率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{heapUsagePercent}%</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(currentStats.heapUsed)} / {formatBytes(currentStats.heapTotal)} MB
            </p>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${heapUsagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">缓存命中率</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">缓存效率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">清理事件</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cleanupCount}</div>
            <p className="text-xs text-muted-foreground">总清理次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">外部内存</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(currentStats.external)}</div>
            <p className="text-xs text-muted-foreground">MB</p>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>堆内存使用趋势</CardTitle>
          <CardDescription>过去 2 分钟的内存使用情况（每 2 秒更新一次）</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis yAxisId="left" label={{ value: '内存使用 (MB)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: '使用率 (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="usage"
                stroke="#3b82f6"
                dot={false}
                name="内存使用 (MB)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentage"
                stroke="#ef4444"
                dot={false}
                name="使用率 (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cache Events */}
      <Card>
        <CardHeader>
          <CardTitle>缓存清理事件</CardTitle>
          <CardDescription>最近的缓存清理和驱逐事件</CardDescription>
        </CardHeader>
        <CardContent>
          {cacheEvents.length > 0 ? (
            <div className="space-y-4">
              {cacheEvents.slice(-10).reverse().map((event, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">
                      {event.type === 'cleanup' ? '🧹 缓存清理' : '🗑️ 条目驱逐'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()} - {event.reason || '自动'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatBytes(event.size)} MB</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">暂无清理事件</p>
          )}
        </CardContent>
      </Card>

      {/* Memory Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>详细统计</CardTitle>
          <CardDescription>当前内存使用详情</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">堆内存已用</span>
                <span className="text-sm">{formatBytes(currentStats.heapUsed)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">堆内存总量</span>
                <span className="text-sm">{formatBytes(currentStats.heapTotal)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">外部内存</span>
                <span className="text-sm">{formatBytes(currentStats.external)} MB</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">RSS 内存</span>
                <span className="text-sm">{formatBytes(currentStats.rss)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">可用内存</span>
                <span className="text-sm">
                  {formatBytes(currentStats.heapTotal - currentStats.heapUsed)} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">使用率</span>
                <span className="text-sm font-bold">{heapUsagePercent}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>优化建议</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {isCritical && (
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">🔴</span>
                <span>堆内存使用率超过 94%，系统已启动激进清理机制。建议重启应用或增加堆内存限制。</span>
              </li>
            )}
            {isWarning && !isCritical && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 font-bold">🟡</span>
                <span>堆内存使用率超过 80%，建议检查是否有内存泄漏或优化缓存策略。</span>
              </li>
            )}
            {!isWarning && (
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">🟢</span>
                <span>内存使用率正常，系统运行良好。</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">ℹ️</span>
              <span>缓存命中率 {cacheHitRate.toFixed(1)}%，可考虑调整缓存大小以提高效率。</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default MemoryMonitoringDashboard;
