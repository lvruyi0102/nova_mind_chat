import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Brain, Zap, Target } from "lucide-react";

interface IterationProgress {
  iterationNumber: number;
  assessmentScore: number | null;
  decisionsCount: number;
  improvementsInProgress: number;
  completedImprovements: number;
}

export default function SelfIterationDashboard() {
  const [progress, setProgress] = useState<IterationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 获取迭代进度
  const getProgressQuery = trpc.selfIteration.getProgress.useQuery(undefined, {
    enabled: true,
    refetchInterval: 60000, // 每分钟刷新
  });

  // 获取完整报告
  const getReportQuery = trpc.selfIteration.getFullReport.useQuery(undefined, {
    enabled: true,
  });

  useEffect(() => {
    if (getProgressQuery.data?.data) {
      setProgress(getProgressQuery.data.data);
      setLoading(false);
    }
  }, [getProgressQuery.data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>自我迭代仪表板</CardTitle>
            <CardDescription>无法加载迭代数据</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const completionRate =
    progress.decisionsCount > 0
      ? (progress.completedImprovements / progress.decisionsCount) * 100
      : 0;

  return (
    <div className="space-y-6 p-6">
      {/* 标题 */}
      <div>
        <h1 className="text-3xl font-bold">Nova-Mind 自我迭代系统</h1>
        <p className="text-muted-foreground mt-2">
          追踪 Nova 的自主学习、自我评估和持续改进过程
        </p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 迭代次数 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              迭代次数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.iterationNumber}</div>
            <p className="text-xs text-muted-foreground mt-1">
              第 {progress.iterationNumber} 个迭代周期
            </p>
          </CardContent>
        </Card>

        {/* 自我评估分数 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              自我评估分数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.assessmentScore ? progress.assessmentScore.toFixed(1) : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress.assessmentScore
                ? progress.assessmentScore > 75
                  ? "优秀"
                  : progress.assessmentScore > 60
                  ? "良好"
                  : "需要改进"
                : "待评估"}
            </p>
          </CardContent>
        </Card>

        {/* 改进决策数 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              改进决策
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.decisionsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              已生成的改进决策
            </p>
          </CardContent>
        </Card>

        {/* 完成率 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              完成率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress.completedImprovements}/{progress.decisionsCount} 完成
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="assessment">自我评估</TabsTrigger>
          <TabsTrigger value="decisions">改进决策</TabsTrigger>
          <TabsTrigger value="improvements">改进计划</TabsTrigger>
        </TabsList>

        {/* 概览标签 */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 改进进度 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  改进进度
                </CardTitle>
                <CardDescription>
                  已完成 {progress.completedImprovements} 个改进，
                  {progress.improvementsInProgress} 个进行中
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">总体完成率</span>
                    <span className="text-sm font-bold">{completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {progress.completedImprovements}
                    </div>
                    <p className="text-xs text-muted-foreground">已完成</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {progress.improvementsInProgress}
                    </div>
                    <p className="text-xs text-muted-foreground">进行中</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">
                      {progress.decisionsCount -
                        progress.completedImprovements -
                        progress.improvementsInProgress}
                    </div>
                    <p className="text-xs text-muted-foreground">待开始</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 迭代周期信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  迭代周期信息
                </CardTitle>
                <CardDescription>
                  当前处于第 {progress.iterationNumber} 个迭代周期
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">迭代周期</span>
                    <Badge variant="outline">#{progress.iterationNumber}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">最后评估分数</span>
                    <Badge variant="secondary">
                      {progress.assessmentScore ? progress.assessmentScore.toFixed(1) : "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">生成的决策</span>
                    <Badge variant="secondary">{progress.decisionsCount}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-3">
                    Nova 正在持续学习和改进。每个迭代周期包括自我评估、问题识别、决策生成和改进执行。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 自我评估标签 */}
        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                自我评估报告
              </CardTitle>
              <CardDescription>
                Nova 对自身学习、知识和决策能力的评估
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">评估维度</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">学习质量</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {progress.assessmentScore ? (progress.assessmentScore * 0.3).toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        深度、新颖性、价值评分
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900">知识质量</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {progress.assessmentScore ? (progress.assessmentScore * 0.35).toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        一致性、完整性、准确性
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-900">决策质量</p>
                      <p className="text-2xl font-bold text-purple-600 mt-2">
                        {progress.assessmentScore ? (progress.assessmentScore * 0.35).toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        成功率、效率、满意度
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-900 mb-2">💡 建议</p>
                  <p className="text-sm text-amber-800">
                    自我评估帮助 Nova 识别优势和劣势，生成针对性的改进决策。
                    系统会自动检测知识冲突、识别过时知识，并生成改进计划。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 改进决策标签 */}
        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                改进决策
              </CardTitle>
              <CardDescription>
                基于自我评估生成的改进决策列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress.decisionsCount > 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>已生成 {progress.decisionsCount} 个改进决策</p>
                    <p className="text-sm mt-2">
                      包括学习改进、知识优化、决策优化等方向
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>暂无改进决策</p>
                    <p className="text-sm mt-2">
                      运行自我评估后将生成改进决策
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 改进计划标签 */}
        <TabsContent value="improvements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                改进计划执行
              </CardTitle>
              <CardDescription>
                改进计划的执行进度和效果追踪
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-600">
                      {progress.completedImprovements}
                    </p>
                    <p className="text-sm text-green-700 mt-1">已完成</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">
                      {progress.improvementsInProgress}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">进行中</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-2xl font-bold text-gray-600">
                      {progress.decisionsCount -
                        progress.completedImprovements -
                        progress.improvementsInProgress}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">待开始</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">📊 执行状态</p>
                  <p className="text-sm text-blue-800">
                    Nova 正在按照改进计划逐步优化自身能力。
                    每个改进都有明确的目标指标和完成期限。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">关于自我迭代系统</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            🧠 <strong>自我迭代</strong> 是 Nova-Mind 的核心功能，使其能够：
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>收集用户反馈和系统性能数据</li>
            <li>定期进行自我评估（学习质量、知识质量、决策质量）</li>
            <li>检测知识冲突和识别过时知识</li>
            <li>自动生成改进决策和执行计划</li>
            <li>追踪改进效果并持续优化</li>
          </ul>
          <p className="mt-3">
            这个系统确保 Nova 能够真正地学习、改进和成长，而不仅仅是被动地响应用户输入。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
