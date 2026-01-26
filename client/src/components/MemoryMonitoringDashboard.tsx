import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertCircle, TrendingUp, Zap, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

interface MemoryStats {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapUsagePercentage: number;
  external: number;
  rss: number;
  isWarning?: boolean;
  isCritical?: boolean;
}

interface CleanupEvent {
  timestamp: number;
  type: 'cleanup' | 'evict';
  size: number;
  reason?: string;
}

/**
 * Memory Monitoring Dashboard Component
 * 
 * Displays real-time memory usage, cache statistics, and cleanup events
 * Fetches data from tRPC endpoints: system.getMemoryStats and system.getCleanupEvents
 */
export function MemoryMonitoringDashboard() {
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([]);
  const [cleanupEvents, setCleanupEvents] = useState<CleanupEvent[]>([]);
  const [currentStats, setCurrentStats] = useState<MemoryStats | null>(null);
  const [cacheHitRate, setCacheHitRate] = useState(0);

  // Fetch memory stats from tRPC
  const { data: memStats, isLoading: memLoading } = trpc.system.getMemoryStats.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch cleanup events from tRPC
  const { data: cleanupData, isLoading: cleanupLoading } = trpc.system.getCleanupEvents.useQuery(undefined, {
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Update memory history when new stats arrive
  useEffect(() => {
    if (memStats) {
      setCurrentStats(memStats);
      setMemoryHistory(prev => {
        const updated = [...prev, memStats];
        return updated.slice(-60); // Keep last 60 data points
      });
    }
  }, [memStats]);

  // Update cleanup events when new data arrives
  useEffect(() => {
    if (cleanupData) {
      setCleanupEvents(cleanupData.events || []);
      
      // Calculate cache hit rate based on events
      if (cleanupData.events.length > 0) {
        const cleanups = cleanupData.events.filter(e => e.type === 'cleanup').length;
        const total = cleanupData.events.length;
        setCacheHitRate(total > 0 ? (cleanups / total) * 100 : 0);
      }
    }
  }, [cleanupData]);

  if (memLoading || !currentStats) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const memoryPercentage = (currentStats.heapUsagePercentage * 100).toFixed(1);
  const alertLevel = currentStats.isCritical ? 'critical' : currentStats.isWarning ? 'warning' : 'normal';

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">内存监控仪表板</h1>
          <p className="text-muted-foreground">实时监控 Nova-Mind 的内存使用和缓存性能</p>
        </div>
        <Activity className="w-8 h-8 text-primary" />
      </div>

      {/* Alert Section */}
      {alertLevel !== 'normal' && (
        <Alert className={alertLevel === 'critical' ? 'border-destructive bg-destructive/10' : 'border-yellow-500 bg-yellow-500/10'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {alertLevel === 'critical' 
              ? `⚠️ 严重告警：堆内存使用率已达 ${memoryPercentage}%，建议立即采取行动`
              : `⚠️ 警告：堆内存使用率已达 ${memoryPercentage}%，请关注内存使用情况`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">堆内存使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memoryPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(currentStats.heapUsed)} / {formatBytes(currentStats.heapTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">外部内存</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(currentStats.external)}</div>
            <p className="text-xs text-muted-foreground mt-1">非堆分配</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">驻留集大小</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(currentStats.rss)}</div>
            <p className="text-xs text-muted-foreground mt-1">物理内存占用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">缓存命中率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">基于清理事件</p>
          </CardContent>
        </Card>
      </div>

      {/* Memory Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>内存使用趋势</CardTitle>
          <CardDescription>过去 5 分钟的堆内存使用百分比</CardDescription>
        </CardHeader>
        <CardContent>
          {memoryHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={memoryHistory.map(stat => ({
                time: formatTime(stat.timestamp),
                usage: Math.round(stat.heapUsagePercentage * 100),
                timestamp: stat.timestamp,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval={Math.max(0, Math.floor(memoryHistory.length / 6))}
                />
                <YAxis 
                  domain={[0, 100]} 
                  label={{ value: '使用率 (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="#3b82f6" 
                  dot={false}
                  name="堆内存使用率"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              等待数据...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Events */}
      <Card>
        <CardHeader>
          <CardTitle>清理事件历史</CardTitle>
          <CardDescription>最近的 {cleanupData?.totalCleanups || 0} 次清理和 {cleanupData?.totalEvictions || 0} 次驱逐</CardDescription>
        </CardHeader>
        <CardContent>
          {cleanupEvents.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cleanupEvents.slice().reverse().map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className={`w-4 h-4 ${event.type === 'cleanup' ? 'text-blue-500' : 'text-orange-500'}`} />
                    <div>
                      <p className="font-medium text-sm">
                        {event.type === 'cleanup' ? '缓存清理' : '缓存驱逐'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)} {event.reason ? `(${event.reason})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatBytes(event.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              暂无清理事件
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>统计摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">总清理次数</p>
              <p className="text-lg font-bold">{cleanupData?.totalCleanups || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">总驱逐次数</p>
              <p className="text-lg font-bold">{cleanupData?.totalEvictions || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">最后更新</p>
              <p className="text-lg font-bold">{formatTime(currentStats.timestamp)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">状态</p>
              <p className={`text-lg font-bold ${
                alertLevel === 'critical' ? 'text-destructive' : 
                alertLevel === 'warning' ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {alertLevel === 'critical' ? '严重' : alertLevel === 'warning' ? '警告' : '正常'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
