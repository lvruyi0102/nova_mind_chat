// @ts-ignore - Type mismatches with tRPC routes
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Pause, RotateCcw } from "lucide-react";

/**
 * BulkSyncManager
 * 
 * Manages the bulk curation sync process
 * Shows progress, statistics, and controls
 */

export default function BulkSyncManager() {
  const [isPolling, setIsPolling] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Queries
  const { data: progressData, refetch: refetchProgress } = trpc.bulkSync.getProgress.useQuery();
  const { data: statsData, refetch: refetchStats } = trpc.bulkSync.getStats.useQuery();

  // Mutations
  const startSyncMutation = trpc.bulkSync.startSync.useMutation({
    onSuccess: () => {
      refetchProgress();
      setIsPolling(true);
    },
  });

  const pauseSyncMutation = trpc.bulkSync.pauseSync.useMutation({
    onSuccess: () => {
      refetchProgress();
      setIsPolling(false);
    },
  });

  const resumeSyncMutation = trpc.bulkSync.resumeSync.useMutation({
    onSuccess: () => {
      refetchProgress();
      setIsPolling(true);
    },
  });

  // Auto-refresh progress
  useEffect(() => {
    if (!autoRefresh || !isPolling) return;

    const interval = setInterval(() => {
      refetchProgress();
      refetchStats();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, isPolling, refetchProgress, refetchStats]);

  const progress = progressData?.data;
  const stats = statsData?.data;

  const progressPercentage = progress
    ? Math.round((progress.processedCount / progress.totalPrivateThoughts) * 100)
    : 0;

  const successRate = progress && progress.processedCount > 0
    ? Math.round((progress.successCount / progress.processedCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Nova 思考精选同步</h2>
        <p className="text-gray-600">
          将 privateThoughts 中的内容自动精选并转化为 curatedThoughts
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">同步统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalPrivateThoughts}</div>
              <div className="text-sm text-gray-600">私密思考总数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.totalCuratedThoughts}</div>
              <div className="text-sm text-gray-600">已精选思考</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.uncuratedThoughts}</div>
              <div className="text-sm text-gray-600">待精选思考</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.curationPercentage}%</div>
              <div className="text-sm text-gray-600">精选完成度</div>
            </div>
          </div>
        </Card>
      )}

      {/* Progress */}
      {progress ? (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">同步进度</h3>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {progress.isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="font-medium text-blue-600">同步进行中...</span>
                </>
              ) : (
                <span className="font-medium text-gray-600">同步已暂停</span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {progress.currentBatchIndex > 0 && `第 ${progress.currentBatchIndex} 批`}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>处理进度</span>
              <span className="font-medium">
                {progress.processedCount} / {progress.totalPrivateThoughts}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-gray-500">{progressPercentage}% 完成</div>
          </div>

          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>成功率</span>
              <span className="font-medium">
                {progress.successCount} 成功 / {progress.errorCount} 失败
              </span>
            </div>
            <Progress value={successRate} className="h-2" />
            <div className="text-xs text-gray-500">{successRate}% 成功</div>
          </div>

          {/* Error Message */}
          {progress.lastError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-900">最后一个错误：</p>
              <p className="text-sm text-red-800 mt-1 break-words">{progress.lastError}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 pt-4 border-t">
            {!progress.isRunning ? (
              <>
                <Button
                  onClick={() => startSyncMutation.mutate({ batchSize: 10 })}
                  disabled={startSyncMutation.isPending}
                  className="flex-1"
                >
                  {startSyncMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      启动中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      启动同步
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => resumeSyncMutation.mutate()}
                  disabled={resumeSyncMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {resumeSyncMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      恢复中...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      恢复同步
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => pauseSyncMutation.mutate()}
                disabled={pauseSyncMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {pauseSyncMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    暂停中...
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    暂停同步
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-600">
              自动刷新进度（每 2 秒）
            </label>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">暂无同步任务</p>
            <Button
              onClick={() => startSyncMutation.mutate({ batchSize: 10 })}
              disabled={startSyncMutation.isPending}
            >
              {startSyncMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  启动批量同步
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>提示：</strong>
          同步过程会将您的私密思考通过 Nova 的精选引擎进行处理，转化为可使用的精选思考。
          原始的私密思考不会被修改或删除，仅用于参考。您可以随时暂停或恢复同步。
        </p>
      </Card>
    </div>
  );
}
