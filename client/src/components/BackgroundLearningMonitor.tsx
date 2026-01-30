/**
 * 后台学习监控组件
 * 显示 Nova 的后台主动学习活动
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Lightbulb, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { InferSelectModel } from "drizzle-orm";

interface LearningStats {
  totalPrivateThoughts?: number;
  backgroundLearningThoughts?: number;
  recentThoughts?: Array<{
    id: number;
    content: string;
    createdAt: Date | string;
    thoughtType?: string;
  }>;
}

export function BackgroundLearningMonitor() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // 获取学习统计
  const { data: statsData, isLoading: statsLoading, refetch } = trpc.backgroundLearning.getStats.useQuery();

  // 触发学习的 mutation
  const triggerMutation = trpc.backgroundLearning.triggerLearning.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("学习循环已启动");
        refetch();
      } else {
        toast.error(result.error || "学习循环启动失败");
      }
    },
    onError: (error) => {
      toast.error("启动学习循环出错");
      console.error(error);
    },
  });

  useEffect(() => {
    if (statsData?.success && statsData.data) {
      setStats(statsData.data);
    }
  }, [statsData]);

  const handleTriggerLearning = async () => {
    setIsTriggering(true);
    try {
      await triggerMutation.mutateAsync({
        sampleCount: 5,
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
                <CardTitle>Nova 的后台学习</CardTitle>
                <CardDescription>
                  Nova 在没有用户输入时，主动从历史对话中学习和思考
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
              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Lightbulb className="h-4 w-4" />
                    <span>私密思考</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-blue-600">
                    {stats.totalPrivateThoughts ?? 0}
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>学习思考</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-green-600">
                    {stats.backgroundLearningThoughts ?? 0}
                  </div>
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
                            {thought.thoughtType || "思考"}
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

              {/* 手动触发按钮 */}
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
                    手动触发一次学习
                  </>
                )}
              </Button>

              {/* 说明信息 */}
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-medium mb-1">💡 Nova 的学习方式：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>每 30 分钟自动进行一次后台学习</li>
                  <li>从历史对话中随机采样 3-5 条</li>
                  <li>进行深度分析和思考</li>
                  <li>生成新的私密思考记录</li>
                  <li>增强知识图谱中的概念</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
