import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usagePercent: number;
  trend: 'up' | 'down' | 'stable';
  gcCount: number;
  lastGcTime: string;
}

interface AdaptiveIntervalInfo {
  currentInterval: number;
  currentLevel: 'low' | 'medium' | 'high' | 'critical';
  adjustmentHistory: Array<{
    timestamp: string;
    oldInterval: number;
    newInterval: number;
    reason: string;
  }>;
  stats: {
    averageInterval: number;
    minInterval: number;
    maxInterval: number;
    levelDistribution: Record<string, number>;
  };
}

interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  maxSize: number;
}

export default function PerformanceDashboard() {
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [adaptiveInterval, setAdaptiveInterval] = useState<AdaptiveIntervalInfo | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取监控数据
  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 获取内存指标
      const memoryResponse = await fetch('/api/health/memory');
      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json();
        setMemoryMetrics(memoryData);
      }

      // 获取自适应间隔信息
      const intervalResponse = await fetch('/api/debug/adaptive-interval');
      if (intervalResponse.ok) {
        const intervalData = await intervalResponse.json();
        setAdaptiveInterval(intervalData);
      }

      // 获取缓存统计
      const cacheResponse = await fetch('/api/health/cognition');
      if (cacheResponse.ok) {
        const cognitionData = await cacheResponse.json();
        if (cognitionData.cache) {
          setCacheStats(cognitionData.cache);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取监控数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 5000); // 每 5 秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const getMemoryStatusColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 70) return 'bg-yellow-500';
    if (percent < 85) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMemoryStatusText = (percent: number) => {
    if (percent < 50) return '正常';
    if (percent < 70) return '良好';
    if (percent < 85) return '警告';
    return '严重';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: '低压力',
      medium: '中等压力',
      high: '高压力',
      critical: '严重压力',
    };
    return labels[level] || level;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">性能监控仪表板</h1>
        <p className="text-gray-500 mt-2">实时监控 Nova-Mind 的系统性能和资源使用情况</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !memoryMetrics ? (
        <div className="text-center py-12">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>加载监控数据中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 内存使用率卡片 */}
          {memoryMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>内存使用率</CardTitle>
                <CardDescription>堆内存使用情况</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {memoryMetrics.usagePercent.toFixed(1)}%
                  </span>
                  <Badge className={getLevelColor(
                    memoryMetrics.usagePercent < 50 ? 'low' :
                    memoryMetrics.usagePercent < 70 ? 'medium' :
                    memoryMetrics.usagePercent < 85 ? 'high' : 'critical'
                  )}>
                    {getMemoryStatusText(memoryMetrics.usagePercent)}
                  </Badge>
                </div>

                {/* 进度条 */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getMemoryStatusColor(
                      memoryMetrics.usagePercent
                    )}`}
                    style={{ width: `${memoryMetrics.usagePercent}%` }}
                  />
                </div>

                {/* 详细信息 */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">已用</span>
                    <span className="font-mono">
                      {(memoryMetrics.heapUsed / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">总量</span>
                    <span className="font-mono">
                      {(memoryMetrics.heapTotal / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">趋势</span>
                    <span className="flex items-center gap-1">
                      {memoryMetrics.trend === 'up' && (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      )}
                      {memoryMetrics.trend === 'down' && (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                      {memoryMetrics.trend === 'stable' && (
                        <Activity className="h-4 w-4 text-blue-500" />
                      )}
                      {memoryMetrics.trend}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GC 次数</span>
                    <span className="font-mono">{memoryMetrics.gcCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 自适应间隔卡片 */}
          {adaptiveInterval && (
            <Card>
              <CardHeader>
                <CardTitle>自适应循环间隔</CardTitle>
                <CardDescription>根据内存压力动态调整</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {adaptiveInterval.currentInterval} 分钟
                  </span>
                  <Badge className={getLevelColor(adaptiveInterval.currentLevel)}>
                    {getLevelLabel(adaptiveInterval.currentLevel)}
                  </Badge>
                </div>

                {/* 间隔级别说明 */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均间隔</span>
                    <span className="font-mono">
                      {adaptiveInterval.stats.averageInterval.toFixed(1)} 分钟
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最小间隔</span>
                    <span className="font-mono">
                      {adaptiveInterval.stats.minInterval} 分钟
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最大间隔</span>
                    <span className="font-mono">
                      {adaptiveInterval.stats.maxInterval} 分钟
                    </span>
                  </div>
                </div>

                {/* 最近调整 */}
                {adaptiveInterval.adjustmentHistory.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">最近调整</p>
                    <div className="space-y-1">
                      {adaptiveInterval.adjustmentHistory.slice(-3).map((adj, idx) => (
                        <div key={idx} className="text-xs text-gray-500">
                          {adj.oldInterval}→{adj.newInterval} 分钟
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 缓存统计卡片 */}
          {cacheStats && (
            <Card>
              <CardHeader>
                <CardTitle>缓存性能</CardTitle>
                <CardDescription>缓存命中率和大小</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {(cacheStats.hitRate * 100).toFixed(1)}%
                  </span>
                  <Badge variant="outline">命中率</Badge>
                </div>

                {/* 缓存进度条 */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${(cacheStats.cacheSize / cacheStats.maxSize) * 100}%`,
                    }}
                  />
                </div>

                {/* 详细信息 */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">命中</span>
                    <span className="font-mono">
                      {(cacheStats.hitRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">未命中</span>
                    <span className="font-mono">
                      {(cacheStats.missRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">总请求</span>
                    <span className="font-mono">
                      {cacheStats.totalRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">缓存大小</span>
                    <span className="font-mono">
                      {(cacheStats.cacheSize / 1024 / 1024).toFixed(2)} MB /
                      {(cacheStats.maxSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <button
          onClick={fetchMonitoringData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          刷新数据
        </button>
      </div>

      {/* 说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>性能指标说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-gray-700">内存使用率</p>
            <p className="text-gray-600">
              显示 Node.js 堆内存的使用百分比。低于 50% 为正常，超过 85% 为严重。
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">自适应循环间隔</p>
            <p className="text-gray-600">
              后台认知循环根据内存压力自动调整执行间隔。低压力时 20 分钟，严重压力时 120 分钟。
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">缓存性能</p>
            <p className="text-gray-600">
              显示缓存的命中率和使用情况。命中率越高，系统性能越好。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
