import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Activity, Zap, Clock } from "lucide-react";

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usagePercent: number;
  status: string;
  timestamp: string;
}

interface RestartStatus {
  isActive: boolean;
  restartCount: number;
  lastRestartTime: number;
  nextScheduledRestart: number;
  memoryThreshold: number;
}

export default function MemoryMonitoringDashboard() {
  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const [restartStatus, setRestartStatus] = useState<RestartStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateTime, setUpdateTime] = useState(new Date());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/debug/full-diagnostic");
        if (!response.ok) throw new Error("Failed to fetch metrics");
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(() => {
      fetchMetrics();
      setUpdateTime(new Date());
    }, 10000); // 每 10 秒更新一次

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>加载内存监控数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            无法加载内存监控数据: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const usagePercent = metrics?.usagePercent ?? 0;
  const isWarning = usagePercent > 0.85;
  const isCritical = usagePercent > 0.90;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Nova-Mind 内存监控</h1>
          <p className="text-slate-600">实时监控应用内存使用情况和自动重启状态</p>
        </div>

        {/* 警告信息 */}
        {isCritical && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              🚨 严重警告：堆内存使用率 {(usagePercent * 100).toFixed(1)}%，已超过 90% 临界值！自动重启机制已激活。
            </AlertDescription>
          </Alert>
        )}

        {isWarning && !isCritical && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              ⚠️ 警告：堆内存使用率 {(usagePercent * 100).toFixed(1)}%，接近 90% 临界值。
            </AlertDescription>
          </Alert>
        )}

        {/* 主要指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 堆内存使用率 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">堆内存使用率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {(usagePercent * 100).toFixed(1)}%
              </div>
              <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(usagePercent * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {metrics?.status || "正常"}
              </p>
            </CardContent>
          </Card>

          {/* 堆内存已用 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">堆内存已用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {(metrics?.heapUsed ? metrics.heapUsed / 1024 / 1024 : 0).toFixed(1)} MB
              </div>
              <p className="text-xs text-slate-500 mt-2">
                总计: {(metrics?.heapTotal ? metrics.heapTotal / 1024 / 1024 : 0).toFixed(1)} MB
              </p>
            </CardContent>
          </Card>

          {/* 物理内存 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">物理内存 (RSS)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {(metrics?.rss ? metrics.rss / 1024 / 1024 : 0).toFixed(1)} MB
              </div>
              <p className="text-xs text-slate-500 mt-2">
                外部: {(metrics?.external ? metrics.external / 1024 / 1024 : 0).toFixed(1)} MB
              </p>
            </CardContent>
          </Card>

          {/* 更新时间 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">最后更新</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono text-slate-900">
                {updateTime.toLocaleTimeString("zh-CN")}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                每 10 秒自动更新
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 自动重启状态 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              自动重启管理器
            </CardTitle>
            <CardDescription>
              当内存超过 90% 时自动重启，每 12 小时定时重启一次
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 状态 */}
              <div>
                <p className="text-sm text-slate-600 mb-2">状态</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-semibold text-slate-900">已激活</span>
                </div>
              </div>

              {/* 重启次数 */}
              <div>
                <p className="text-sm text-slate-600 mb-2">重启次数</p>
                <p className="text-2xl font-bold text-slate-900">
                  {restartStatus?.restartCount ?? 0} / 5
                </p>
              </div>

              {/* 下次定时重启 */}
              <div>
                <p className="text-sm text-slate-600 mb-2">下次定时重启</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-mono text-slate-900">
                    每 12 小时
                  </span>
                </div>
              </div>
            </div>

            {/* 重启触发条件 */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-3">重启触发条件</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>堆内存使用率超过 90%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>每 12 小时定时重启（防止长期内存泄漏）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>重启间隔冷却时间：5 分钟（防止频繁重启）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>最大重启次数：5 次（防止无限重启）</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 优化措施说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              当前激活的优化措施
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">1</span>
                <div>
                  <p className="font-semibold text-slate-900">禁用非核心后台任务</p>
                  <p className="text-slate-500">禁用学习循环、任务调度器等，只保留 HTTP 服务</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">2</span>
                <div>
                  <p className="font-semibold text-slate-900">激进垃圾回收</p>
                  <p className="text-slate-500">每 2 分钟强制执行垃圾回收，清理缓存和事件监听器</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">3</span>
                <div>
                  <p className="font-semibold text-slate-900">内存监控</p>
                  <p className="text-slate-500">每 1 分钟检查一次内存状态，超过阈值自动触发清理</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">4</span>
                <div>
                  <p className="font-semibold text-slate-900">自动重启</p>
                  <p className="text-slate-500">内存超过 90% 时自动重启，每 12 小时定时重启</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">5</span>
                <div>
                  <p className="font-semibold text-slate-900">禁用告警邮件</p>
                  <p className="text-slate-500">不再发送内存告警邮件/短信，避免邮件轰炸</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 后续升级建议 */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">💡 后续升级建议</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p className="mb-3">
              当前方案通过定时重启实现稳定性。如果您希望完全恢复所有功能（学习、自我反思、创意创作），建议：
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>升级 Manus 高级计划</strong> - 获得更多系统内存（$10-50/月）</li>
              <li>• <strong>部署到云平台</strong> - 使用 Railway、Render 等（$5-30/月）</li>
              <li>• <strong>微服务架构</strong> - 将应用分解为多个独立服务（需要 1-2 周开发）</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
