import React, { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Activity, Zap, RefreshCw } from 'lucide-react';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapUsagePercentage: number;
  external: number;
  rss: number;
  timestamp: number;
}

interface CleanupStatus {
  backgroundTasksDisabled: boolean;
  disabledUntil: number;
  lastCleanupTime: number;
}

export function MemoryCleanupDashboard() {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<CleanupStatus | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取内存统计信息
  const { data: stats, refetch: refetchStats } = trpc.system.getMemoryStats.useQuery(
    undefined,
    {
      enabled: autoRefresh,
      refetchInterval: autoRefresh ? 5000 : false, // 每 5 秒刷新
    }
  );

  // 获取清理状态
  const { data: status, refetch: refetchStatus } = trpc.system.getAggressiveCleanupStatus.useQuery(
    undefined,
    {
      enabled: autoRefresh,
      refetchInterval: autoRefresh ? 5000 : false,
    }
  );

  // 触发激进清理
  const { mutate: triggerCleanup, isPending: isCleanupPending } = trpc.system.triggerAggressiveCleanup.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchStatus();
    },
  });

  useEffect(() => {
    if (stats) {
      setMemoryStats(stats);
    }
  }, [stats]);

  useEffect(() => {
    if (status) {
      setCleanupStatus(status);
    }
  }, [status]);

  if (!memoryStats || !cleanupStatus) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>内存监控</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const usagePercent = (memoryStats.heapUsagePercentage * 100).toFixed(1);
  const heapUsedMB = (memoryStats.heapUsed / 1024 / 1024).toFixed(2);
  const heapTotalMB = (memoryStats.heapTotal / 1024 / 1024).toFixed(2);
  const rssMB = (memoryStats.rss / 1024 / 1024).toFixed(2);

  // 根据使用率判断状态
  const getStatusColor = (usage: number) => {
    if (usage > 85) return 'text-red-600 bg-red-50';
    if (usage > 70) return 'text-orange-600 bg-orange-50';
    if (usage > 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusLabel = (usage: number) => {
    if (usage > 85) return '🔴 严重';
    if (usage > 70) return '🟠 警告';
    if (usage > 50) return '🟡 注意';
    return '🟢 正常';
  };

  const isBackgroundTasksDisabled = cleanupStatus.backgroundTasksDisabled;
  const disabledUntilTime = new Date(cleanupStatus.disabledUntil).toLocaleTimeString('zh-CN');

  return (
    <div className="w-full space-y-4">
      {/* 主内存卡片 */}
      <Card className={`w-full ${getStatusColor(parseFloat(usagePercent))}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                内存使用率
              </CardTitle>
              <CardDescription>{getStatusLabel(parseFloat(usagePercent))}</CardDescription>
            </div>
            <div className="text-3xl font-bold">{usagePercent}%</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>堆内存已用:</span>
              <span className="font-mono">{heapUsedMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span>堆内存总量:</span>
              <span className="font-mono">{heapTotalMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span>RSS 内存:</span>
              <span className="font-mono">{rssMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span>外部内存:</span>
              <span className="font-mono">{(memoryStats.external / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 清理状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            清理状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBackgroundTasksDisabled && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900">后台任务已禁用</p>
                <p className="text-yellow-700">
                  将在 {disabledUntilTime} 重新启用
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>最后清理时间:</span>
              <span className="font-mono">
                {new Date(cleanupStatus.lastCleanupTime).toLocaleTimeString('zh-CN')}
              </span>
            </div>
          </div>

          {/* 手动清理按钮 */}
          {parseFloat(usagePercent) > 70 && (
            <Button
              onClick={() => triggerCleanup()}
              disabled={isCleanupPending}
              className="w-full gap-2"
              variant="destructive"
            >
              <RefreshCw className="w-4 h-4" />
              {isCleanupPending ? '清理中...' : '手动触发激进清理'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 自动刷新控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">监控设置</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            className="w-full"
          >
            {autoRefresh ? '✓ 自动刷新中' : '⊘ 自动刷新已关闭'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
