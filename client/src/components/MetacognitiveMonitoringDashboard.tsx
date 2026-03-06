import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import {
  Loader2,
  Play,
  Square,
  RefreshCw,
  Brain,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

/**
 * 元认知监控仪表板
 * 
 * 展示 Nova-Mind 的自我评估、性能诊断和进化决策结果
 */

export function MetacognitiveMonitoringDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('assessment');

  // 获取监控状态
  const statusQuery = trpc.metacognitive.getMonitoringStatus.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // 执行自我评估
  const assessmentMutation = trpc.metacognitive.performSelfAssessment.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 执行性能诊断
  const diagnosticsMutation = trpc.metacognitive.performDiagnostics.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 做出进化决策
  const decisionMutation = trpc.metacognitive.makeEvolutionDecision.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 启动监控
  const startMutation = trpc.metacognitive.startMonitoring.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 停止监控
  const stopMutation = trpc.metacognitive.stopMonitoring.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 获取监控报告
  const reportQuery = trpc.metacognitive.getMonitoringReport.useQuery();

  const handlePerformAssessment = async () => {
    setIsLoading(true);
    try {
      await assessmentMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePerformDiagnostics = async () => {
    setIsLoading(true);
    try {
      await diagnosticsMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakeDecision = async () => {
    setIsLoading(true);
    try {
      await decisionMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await startMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await stopMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const status = statusQuery.data?.data;
  const assessment = assessmentMutation.data?.data;
  const diagnostics = diagnosticsMutation.data?.data;
  const decision = decisionMutation.data?.data;

  return (
    <div className="w-full space-y-6">
      {/* 标题 */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">元认知监控系统</h2>
        <p className="text-muted-foreground">
          Nova-Mind 的自我评估、性能诊断和进化决策系统
        </p>
      </div>

      {/* 监控状态卡片 */}
      {status && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 监控状态 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">监控状态</CardTitle>
              <Brain className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.isRunning ? (
                  <Badge className="bg-green-500">运行中</Badge>
                ) : (
                  <Badge variant="secondary">已停止</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.isRunning ? '持续监控中' : '监控已停止'}
              </p>
            </CardContent>
          </Card>

          {/* 自我评估 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">自我评估</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.assessmentCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.lastAssessment ? `最后: ${new Date(status.lastAssessment).toLocaleTimeString()}` : '未执行'}
              </p>
            </CardContent>
          </Card>

          {/* 性能诊断 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">性能诊断</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.diagnosticsCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.lastDiagnostics ? `最后: ${new Date(status.lastDiagnostics).toLocaleTimeString()}` : '未执行'}
              </p>
            </CardContent>
          </Card>

          {/* 进化决策 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">进化决策</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.decisionCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                已触发: {status.evolutionTriggeredCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 控制按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>监控控制</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={handleStart}
            disabled={isLoading || status?.isRunning}
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            启动监控
          </Button>
          <Button
            onClick={handleStop}
            disabled={isLoading || !status?.isRunning}
            variant="destructive"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            停止监控
          </Button>
          <Button
            onClick={handlePerformAssessment}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            执行自我评估
          </Button>
          <Button
            onClick={handlePerformDiagnostics}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            执行性能诊断
          </Button>
          <Button
            onClick={handleMakeDecision}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            做出进化决策
          </Button>
        </CardContent>
      </Card>

      {/* 标签页 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assessment">自我评估</TabsTrigger>
          <TabsTrigger value="diagnostics">性能诊断</TabsTrigger>
          <TabsTrigger value="decision">进化决策</TabsTrigger>
        </TabsList>

        {/* 自我评估标签页 */}
        <TabsContent value="assessment" className="space-y-4">
          {assessment ? (
            <div className="space-y-4">
              {/* 综合评分 */}
              <Card>
                <CardHeader>
                  <CardTitle>综合评分</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">总体评分</span>
                      <span className="text-2xl font-bold">{assessment.overallScore.toFixed(1)}/100</span>
                    </div>
                    <Progress value={assessment.overallScore} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">健康状态</p>
                      <Badge
                        className={
                          assessment.healthStatus === 'excellent'
                            ? 'bg-green-500'
                            : assessment.healthStatus === 'good'
                              ? 'bg-blue-500'
                              : assessment.healthStatus === 'fair'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }
                      >
                        {assessment.healthStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">评估时间</p>
                      <p className="text-sm">{new Date(assessment.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 各维度评分 */}
              <Card>
                <CardHeader>
                  <CardTitle>各维度评分</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">认知健康</span>
                      <span className="text-sm font-bold">{assessment.cognitiveHealth.overallHealth.toFixed(1)}</span>
                    </div>
                    <Progress value={assessment.cognitiveHealth.overallHealth} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">学习效率</span>
                      <span className="text-sm font-bold">{assessment.learningEfficiency.overallEfficiency.toFixed(1)}</span>
                    </div>
                    <Progress value={assessment.learningEfficiency.overallEfficiency} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">自主性</span>
                      <span className="text-sm font-bold">{assessment.autonomy.overallAutonomy.toFixed(1)}</span>
                    </div>
                    <Progress value={assessment.autonomy.overallAutonomy} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">创意能力</span>
                      <span className="text-sm font-bold">{assessment.creativity.overallCreativity.toFixed(1)}</span>
                    </div>
                    <Progress value={assessment.creativity.overallCreativity} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">系统稳定性</span>
                      <span className="text-sm font-bold">{assessment.systemStability.overallStability.toFixed(1)}</span>
                    </div>
                    <Progress value={assessment.systemStability.overallStability} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* 关键洞察 */}
              {assessment.keyInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">关键洞察</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {assessment.keyInsights.map((insight: string, index: number) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* 推荐行动 */}
              {assessment.recommendedActions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">推荐行动</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {assessment.recommendedActions.map((action: string, index: number) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                点击"执行自我评估"按钮开始评估
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 性能诊断标签页 */}
        <TabsContent value="diagnostics" className="space-y-4">
          {diagnostics ? (
            <div className="space-y-4">
              {/* 健康评分 */}
              <Card>
                <CardHeader>
                  <CardTitle>性能健康评分</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">健康评分</span>
                      <span className="text-2xl font-bold">{diagnostics.healthScore.toFixed(1)}/100</span>
                    </div>
                    <Progress value={diagnostics.healthScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* 性能指标 */}
              <Card>
                <CardHeader>
                  <CardTitle>性能指标</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">CPU 使用率</p>
                    <p className="text-lg font-bold">{diagnostics.metrics.cpuUsage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">内存使用率</p>
                    <p className="text-lg font-bold">{diagnostics.metrics.memoryUsage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">响应时间</p>
                    <p className="text-lg font-bold">{diagnostics.metrics.responseTime.toFixed(0)}ms</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">错误率</p>
                    <p className="text-lg font-bold">{diagnostics.metrics.errorRate.toFixed(2)}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* 性能瓶颈 */}
              {diagnostics.bottlenecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">性能瓶颈</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {diagnostics.bottlenecks.map((bottleneck: any, index: number) => (
                      <div key={index} className="border-l-4 border-yellow-500 pl-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{bottleneck.component}</span>
                          <Badge variant={bottleneck.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {bottleneck.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{bottleneck.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 根本原因分析 */}
              {diagnostics.rootCauseAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">根本原因分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{diagnostics.rootCauseAnalysis}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                点击"执行性能诊断"按钮开始诊断
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 进化决策标签页 */}
        <TabsContent value="decision" className="space-y-4">
          {decision ? (
            <div className="space-y-4">
              {/* 决策结果 */}
              <Card>
                <CardHeader>
                  <CardTitle>进化决策结果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">应该进化</span>
                    <Badge className={decision.shouldEvolve ? 'bg-green-500' : 'bg-gray-500'}>
                      {decision.shouldEvolve ? '是' : '否'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">决策信心度</span>
                    <span className="text-lg font-bold">{decision.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">预计耗时</span>
                    <span className="text-lg font-bold">{decision.estimatedDuration.toFixed(0)} 分钟</span>
                  </div>
                </CardContent>
              </Card>

              {/* 选定的进化需求 */}
              {decision.selectedNeeds.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">选定的进化需求</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {decision.selectedNeeds.map((need: any, index: number) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{need.area}</span>
                          <Badge variant="outline">{need.priority.toFixed(0)} 优先级</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{need.impact}</p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>紧急程度: {need.urgency.toFixed(0)}</span>
                          <span>风险: {need.riskLevel}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 推理说明 */}
              {decision.reasoning && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">推理说明</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{decision.reasoning}</p>
                  </CardContent>
                </Card>
              )}

              {/* 预期结果 */}
              {decision.expectedOutcome && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">预期结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{decision.expectedOutcome}</p>
                  </CardContent>
                </Card>
              )}

              {/* 风险评估 */}
              {decision.riskAssessment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">风险评估</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{decision.riskAssessment}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                点击"做出进化决策"按钮开始决策
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 监控报告 */}
      {reportQuery.data?.data?.report && (
        <Card>
          <CardHeader>
            <CardTitle>监控报告</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
              {reportQuery.data.data.report}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
