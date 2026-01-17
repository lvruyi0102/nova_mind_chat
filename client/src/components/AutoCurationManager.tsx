import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Play, Pause, RotateCcw } from "lucide-react";

/**
 * AutoCurationManager
 * 
 * Manages the automatic daily curation scheduler
 * Shows status, configuration, and controls
 */

export default function AutoCurationManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [runTime, setRunTime] = useState("02:00");
  const [batchSize, setBatchSize] = useState(10);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [maxConcurrent, setMaxConcurrent] = useState(3);

  // Queries
  const { data: statusData, refetch: refetchStatus } = trpc.autoCuration.getStatus.useQuery();

  // Mutations
  const setEnabledMutation = trpc.autoCuration.setEnabled.useMutation({
    onSuccess: () => {
      refetchStatus();
    },
  });

  const updateConfigMutation = trpc.autoCuration.updateConfig.useMutation({
    onSuccess: () => {
      refetchStatus();
      setIsEditing(false);
    },
  });

  const runNowMutation = trpc.autoCuration.runNow.useMutation({
    onSuccess: () => {
      refetchStatus();
    },
  });

  // Auto-refresh status
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStatus();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [refetchStatus]);

  const status = statusData?.data;

  const handleToggleEnabled = () => {
    if (status) {
      setEnabledMutation.mutate({ enabled: !status.enabled });
    }
  };

  const handleUpdateConfig = () => {
    updateConfigMutation.mutate({
      runTime,
      batchSize,
      lookbackHours,
      maxConcurrent,
    });
  };

  const getStatusColor = (lastStatus: string) => {
    switch (lastStatus) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">自动精选调度器</h2>
        <p className="text-gray-600">每天自动精选新的 privateThoughts 并转化为 curatedThoughts</p>
      </div>

      {/* Status Card */}
      {status && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">调度器状态</h3>
            <Badge className={status.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {status.enabled ? "已启用" : "已禁用"}
            </Badge>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">上次运行</div>
              <div className="text-lg font-semibold text-blue-600">
                {status.lastRunTime
                  ? new Date(status.lastRunTime).toLocaleString("zh-CN")
                  : "从未运行"}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">下次运行</div>
              <div className="text-lg font-semibold text-purple-600">
                {status.nextRunTime
                  ? new Date(status.nextRunTime).toLocaleString("zh-CN")
                  : "待计算"}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">成功次数</div>
              <div className="text-lg font-semibold text-green-600">{status.successCount}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">失败次数</div>
              <div className="text-lg font-semibold text-red-600">{status.errorCount}</div>
            </div>
          </div>

          {/* Last Run Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">上次运行状态：</span>
              <Badge className={getStatusColor(status.lastRunStatus)}>
                {status.lastRunStatus === "success"
                  ? "成功"
                  : status.lastRunStatus === "failed"
                  ? "失败"
                  : "待运行"}
              </Badge>
            </div>
            {status.lastRunMessage && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{status.lastRunMessage}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleToggleEnabled}
              disabled={setEnabledMutation.isPending}
              variant={status.enabled ? "destructive" : "default"}
              className="flex-1"
            >
              {setEnabledMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {status.enabled ? "禁用中..." : "启用中..."}
                </>
              ) : status.enabled ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  禁用调度器
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  启用调度器
                </>
              )}
            </Button>
            <Button
              onClick={() => runNowMutation.mutate()}
              disabled={runNowMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              {runNowMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  运行中...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  立即运行
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Configuration Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">调度配置</h3>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              编辑
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {/* Run Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每天运行时间
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <input
                  type="time"
                  value={runTime}
                  onChange={(e) => setRunTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">格式：HH:MM（24小时制）</p>
            </div>

            {/* Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每次运行处理数量
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">最多处理多少条思考</p>
            </div>

            {/* Lookback Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                回溯时间（小时）
              </label>
              <input
                type="number"
                value={lookbackHours}
                onChange={(e) => setLookbackHours(parseInt(e.target.value))}
                min="1"
                max="720"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">只处理过去 N 小时内新增的思考</p>
            </div>

            {/* Max Concurrent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大并发数
              </label>
              <input
                type="number"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">同时处理多少条思考（LLM 调用）</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleUpdateConfig}
                disabled={updateConfigMutation.isPending}
                className="flex-1"
              >
                {updateConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存配置"
                )}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">每天运行时间：</span>
              <span className="text-sm font-medium">{runTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">每次处理数量：</span>
              <span className="text-sm font-medium">{batchSize} 条</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">回溯时间：</span>
              <span className="text-sm font-medium">{lookbackHours} 小时</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">最大并发数：</span>
              <span className="text-sm font-medium">{maxConcurrent}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>工作原理：</strong>
          调度器会在每天指定的时间自动运行，查找过去 24 小时内新增的 privateThoughts，
          使用 Nova 的精选引擎将其转化为 curatedThoughts。您可以随时启用/禁用调度器或手动运行。
        </p>
      </Card>
    </div>
  );
}
