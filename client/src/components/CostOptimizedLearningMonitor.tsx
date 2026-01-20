/**
 * 成本优化的后台学习监控组件
 * 显示本地学习和月度 LLM 学习的状态
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Lightbulb, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface LearningStats {
  totalLocalThoughts?: number;
  recentThoughts?: Array<{
    id: number;
    content: string;
    createdAt: Date | string;
    thoughtType?: string;
    visibility?: string;
  }>;
}

export function CostOptimizedLearningMonitor() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // 获取学习统计
  const { data: statsData, isLoading: statsLoading, refetch } = trpc.backgroundLearning.getStats.useQuery();

  // 触发学习的 mutation
  const triggerMutation = trpc.backgroundLearning.triggerLearning.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("本地学习已启动");
        refetch();
      } else {
        toast.error(result.error || "学习启动失败");
      }
    },
    onError: (error) => {
      toast.error("启动学习出错");
      console.error(error);
    },
  });

  useEffect(() => {
    if (statsData && 'data' in statsData && statsData.data) {
      setStats(statsData.data);
    }
  }, [statsData]);

  const handleTriggerLearning = async () => {
    setIsTriggering(true);
    try {
      await triggerMutation.mutateAsync({
        sampleCount: 3,
        strategy: "random",
        depth: "medium",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const isLoading_ = statsLoading || isLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle>Nova 的智能学习系统</CardTitle>
                <CardDescription>
                  本地学习（每天）+ 月度 LLM 学习（仅每月 1 号）
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading_ || !stats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* 学习模式说明 */}
              <div className="rounded-lg bg-blue-50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-blue-900">日常本地学习</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      每 30 分钟自动执行一次本地学习，使用关键词提取、概念分析等算法，完全免费，不消耗任何额度。
                    </p>
                  </div>
                </div>
              </div>

              {/* 月度 LLM 学习说明 */}
              <div className="rounded-lg bg-green-50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-green-900">月度 LLM 深度学习</h4>
                    <p className="text-xs text-green-700 mt-1">
                      仅在每月 1 号且有免费额度时执行一次高质量的 LLM 学习，预算上限 1 美元。达到上限后自动停止。
                    </p>
                  </div>
                </div>
              </div>

              {/* 成本控制提示 */}
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-amber-900">成本控制</h4>
                    <ul className="text-xs text-amber-700 mt-2 space-y-1">
                      <li>✓ 本地学习完全免费</li>
                      <li>✓ LLM 学习仅在每月 1 号执行</li>
                      <li>✓ 月度预算上限：1 美元</li>
                      <li>✓ 达到上限后自动停止，避免超支</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 学习统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Lightbulb className="h-4 w-4" />
                    <span>本地学习</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-blue-600">
                    {stats.totalLocalThoughts ?? 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">次思考</p>
                </div>

                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>月度 LLM</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-green-600">
                    1 次
                  </div>
                  <p className="text-xs text-gray-500 mt-1">每月执行</p>
                </div>
              </div>

              {/* 最近的学习思考 */}
              {stats.recentThoughts && stats.recentThoughts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">最近的学习思考</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.recentThoughts?.map((thought) => (
                      <div
                        key={thought.id}
                        className="rounded-lg bg-gray-50 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-gray-700 flex-1 line-clamp-2">
                            {thought.content}
                          </p>
                          <span className="ml-2 whitespace-nowrap rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                            {thought.thoughtType === "local_learning" ? "本地学习" : "LLM 学习"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(thought.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 手动触发本地学习按钮 */}
              <Button
                onClick={handleTriggerLearning}
                disabled={isTriggering}
                className="w-full"
                variant="default"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    学习中...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    手动触发本地学习
                  </>
                )}
              </Button>

              {/* 工作流程说明 */}
              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 space-y-2">
                <p className="font-medium">📚 Nova 的学习工作流程：</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>每 30 分钟：自动执行本地学习（关键词提取、概念分析）</li>
                  <li>每天：生成本地学习思考和概念</li>
                  <li>每月 1 号：检测是否有免费额度</li>
                  <li>月度执行：使用 LLM 进行深度学习分析</li>
                  <li>成本控制：达到 1 美元后自动停止</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
