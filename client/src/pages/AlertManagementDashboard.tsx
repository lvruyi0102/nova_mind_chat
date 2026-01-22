import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Bell, Settings, History, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Alert {
  id: string;
  type: "memory" | "cache" | "cpu";
  severity: "warning" | "critical";
  message: string;
  timestamp: Date;
  value: number;
  threshold: number;
}

interface AlertConfig {
  memoryThreshold: number;
  cacheThreshold: number;
  cpuThreshold: number;
  enableNotifications: boolean;
  notificationChannels: ("slack" | "email" | "toast")[];
}

export default function AlertManagementDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [config, setConfig] = useState<AlertConfig>({
    memoryThreshold: 90,
    cacheThreshold: 60,
    cpuThreshold: 80,
    enableNotifications: true,
    notificationChannels: ["toast", "email"],
  });
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter] = useState<"all" | "memory" | "cache" | "cpu">("all");

  // 模拟获取告警历史
  useEffect(() => {
    const mockAlerts: Alert[] = [
      {
        id: "1",
        type: "memory",
        severity: "critical",
        message: "内存使用率超过 90%",
        timestamp: new Date(Date.now() - 5 * 60000),
        value: 93.2,
        threshold: 90,
      },
      {
        id: "2",
        type: "cache",
        severity: "warning",
        message: "缓存命中率低于 60%",
        timestamp: new Date(Date.now() - 15 * 60000),
        value: 58.5,
        threshold: 60,
      },
      {
        id: "3",
        type: "memory",
        severity: "warning",
        message: "内存使用率超过 85%",
        timestamp: new Date(Date.now() - 30 * 60000),
        value: 87.1,
        threshold: 85,
      },
    ];
    setAlerts(mockAlerts);
  }, []);

  const filteredAlerts = filter === "all" ? alerts : alerts.filter(a => a.type === filter);

  const getSeverityColor = (severity: string) => {
    return severity === "critical" ? "bg-red-500" : "bg-yellow-500";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "memory":
        return "🧠";
      case "cache":
        return "💾";
      case "cpu":
        return "⚙️";
      default:
        return "📊";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "memory":
        return "内存";
      case "cache":
        return "缓存";
      case "cpu":
        return "CPU";
      default:
        return "其他";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">告警管理</h1>
          <p className="text-gray-500 mt-1">监控系统性能告警和配置通知规则</p>
        </div>
        <Button
          onClick={() => setShowConfig(!showConfig)}
          variant="outline"
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          配置告警规则
        </Button>
      </div>

      {/* 配置面板 */}
      {showConfig && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">告警阈值配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">内存阈值 (%)</label>
                <input
                  type="number"
                  value={config.memoryThreshold}
                  onChange={(e) =>
                    setConfig({ ...config, memoryThreshold: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  min="50"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">缓存阈值 (%)</label>
                <input
                  type="number"
                  value={config.cacheThreshold}
                  onChange={(e) =>
                    setConfig({ ...config, cacheThreshold: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  min="30"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CPU 阈值 (%)</label>
                <input
                  type="number"
                  value={config.cpuThreshold}
                  onChange={(e) =>
                    setConfig({ ...config, cpuThreshold: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  min="50"
                  max="100"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={config.enableNotifications}
                  onChange={(e) =>
                    setConfig({ ...config, enableNotifications: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="font-medium">启用通知</span>
              </label>

              {config.enableNotifications && (
                <div className="flex gap-2 flex-wrap">
                  {["toast", "email", "slack"].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.notificationChannels.includes(channel as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig({
                              ...config,
                              notificationChannels: [
                                ...config.notificationChannels,
                                channel as any,
                              ],
                            });
                          } else {
                            setConfig({
                              ...config,
                              notificationChannels: config.notificationChannels.filter(
                                (c) => c !== channel
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t pt-4">
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  // 保存配置
                  setShowConfig(false);
                }}
              >
                保存配置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总告警数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-gray-500 mt-1">过去 24 小时</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">严重告警</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.severity === "critical").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">需要立即处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">警告告警</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.severity === "warning").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">需要关注</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">通知状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config.enableNotifications ? "✓ 启用" : "✗ 禁用"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {config.notificationChannels.join(", ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 过滤按钮 */}
      <div className="flex gap-2">
        {["all", "memory", "cache", "cpu"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f as any)}
            className="capitalize"
          >
            {f === "all" ? "全部" : getTypeLabel(f)}
          </Button>
        ))}
      </div>

      {/* 告警历史列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            告警历史
          </CardTitle>
          <CardDescription>最近的系统告警记录</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无告警</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(alert.type)}</span>
                        <span className="font-medium">{alert.message}</span>
                        <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                          {alert.severity === "critical" ? "严重" : "警告"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        当前值: {alert.value.toFixed(1)}% | 阈值: {alert.threshold}% | {formatTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 系统说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            系统说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            • <strong>内存告警</strong>：当堆内存使用率超过配置阈值时触发
          </p>
          <p>
            • <strong>缓存告警</strong>：当缓存命中率低于配置阈值时触发
          </p>
          <p>
            • <strong>CPU 告警</strong>：当 CPU 使用率超过配置阈值时触发
          </p>
          <p>
            • <strong>通知渠道</strong>：支持 Toast（应用内）、Email（邮件）、Slack（集成）
          </p>
          <p>
            • <strong>自动恢复</strong>：告警在指标恢复到正常范围后自动清除
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
