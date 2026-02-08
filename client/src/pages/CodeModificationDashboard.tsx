/**
 * Code Modification Dashboard
 * 
 * 展示和管理 Nova-Mind 的自动代码修改
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { AlertTriangle, CheckCircle, Clock, Zap, RotateCcw, FileText } from 'lucide-react';

export default function CodeModificationDashboard() {
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  // 获取最新建议
  const { data: latestProposal, isLoading: proposalLoading } = 
    trpc.codeModification.getLatestProposal.useQuery();

  // 获取修改历史
  const { data: history, refetch: refetchHistory } = 
    trpc.codeModification.getProposalHistory.useQuery({ limit: 20 });

  // 获取执行历史
  const { data: executionHistory } = 
    trpc.codeModification.getExecutionHistory.useQuery({ limit: 20 });

  // 获取备份列表
  const { data: backupList } = 
    trpc.codeModification.getBackupList.useQuery();

  // 获取统计信息
  const { data: statistics } = 
    trpc.codeModification.getStatistics.useQuery();

  // 执行修改
  const executeProposal = trpc.codeModification.executeProposal.useMutation({
    onSuccess: () => {
      refetchHistory();
    },
  });

  // 回滚修改
  const rollbackModification = trpc.codeModification.rollbackModification.useMutation({
    onSuccess: () => {
      refetchHistory();
    },
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe':
        return 'bg-green-100 text-green-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'proposed':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Zap className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">代码自我修改系统</h1>
          <p className="text-slate-400">Nova-Mind 的自动代码优化和进化</p>
        </div>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">总修改建议</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statistics.totalProposals}</div>
                <p className="text-xs text-slate-400 mt-1">
                  {statistics.proposedCount} 待审批 • {statistics.approvedCount} 已批准
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">执行成功</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{statistics.successfulExecutions}</div>
                <p className="text-xs text-slate-400 mt-1">
                  成功率 {statistics.totalExecutions > 0 
                    ? ((statistics.successfulExecutions / statistics.totalExecutions) * 100).toFixed(1) 
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">备份数量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{backupList?.length || 0}</div>
                <p className="text-xs text-slate-400 mt-1">可用于回滚</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">被拒绝</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{statistics.rejectedCount}</div>
                <p className="text-xs text-slate-400 mt-1">高风险修改</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 最新建议 */}
        {latestProposal && (
          <Card className="bg-slate-800 border-slate-700 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">最新修改建议</CardTitle>
                  <CardDescription className="text-slate-400">
                    {latestProposal.filePath}
                  </CardDescription>
                </div>
                <Badge className={getRiskColor(latestProposal.riskAssessment.level)}>
                  {latestProposal.riskAssessment.level.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">修改说明</h4>
                <p className="text-sm text-slate-300">{latestProposal.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-white mb-2">修改理由</h4>
                <p className="text-sm text-slate-300">{latestProposal.reasoning}</p>
              </div>

              {latestProposal.expectedBenefit.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">预期收益</h4>
                  <div className="space-y-2">
                    {latestProposal.expectedBenefit.map((benefit, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-300">{benefit.category}</span>
                        <span className="text-green-400">+{benefit.improvement}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestProposal.riskAssessment.issues.length > 0 && (
                <Alert className="bg-red-900/20 border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-200 ml-2">
                    <strong>风险问题：</strong>
                    <ul className="list-disc list-inside mt-2">
                      {latestProposal.riskAssessment.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => executeProposal.mutate({ proposalId: latestProposal.id })}
                  disabled={executeProposal.isPending || latestProposal.riskAssessment.level === 'critical'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {executeProposal.isPending ? '执行中...' : '执行修改'}
                </Button>
                <Button variant="outline" className="border-slate-600 text-slate-300">
                  查看代码差异
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 标签页 */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="history" className="text-slate-300">修改历史</TabsTrigger>
            <TabsTrigger value="executions" className="text-slate-300">执行记录</TabsTrigger>
            <TabsTrigger value="backups" className="text-slate-300">备份管理</TabsTrigger>
          </TabsList>

          {/* 修改历史 */}
          <TabsContent value="history" className="space-y-4">
            {history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((proposal) => (
                  <Card
                    key={proposal.id}
                    className="bg-slate-800 border-slate-700 cursor-pointer hover:border-slate-600 transition"
                    onClick={() => setSelectedProposal(proposal.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(proposal.status)}
                            <span className="font-medium text-white">{proposal.filePath}</span>
                            <Badge variant="outline" className="text-slate-300">
                              {proposal.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400">{proposal.description}</p>
                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>创建于 {new Date(proposal.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <Badge className={getRiskColor(proposal.riskAssessment.level)}>
                          {proposal.riskAssessment.level}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6 text-center text-slate-400">
                  暂无修改历史
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 执行记录 */}
          <TabsContent value="executions" className="space-y-4">
            {executionHistory && executionHistory.length > 0 ? (
              <div className="space-y-3">
                {executionHistory.map((execution) => (
                  <Card key={execution.proposalId} className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {execution.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium text-white">{execution.filePath}</span>
                          </div>
                          <p className="text-sm text-slate-400">
                            {execution.success ? '✅ 执行成功' : `❌ 执行失败: ${execution.error}`}
                          </p>
                          {execution.metrics && (
                            <div className="flex gap-4 mt-2 text-xs text-slate-500">
                              <span>耗时 {execution.metrics.executionTime}ms</span>
                              <span>文件大小 {execution.metrics.fileSize.before} → {execution.metrics.fileSize.after}</span>
                            </div>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(execution.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {execution.backupPath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rollbackModification.mutate({
                              proposalId: execution.proposalId,
                              filePath: execution.filePath,
                              backupPath: execution.backupPath || '',
                            })}
                            disabled={rollbackModification.isPending}
                            className="border-slate-600 text-slate-300"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            回滚
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6 text-center text-slate-400">
                  暂无执行记录
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 备份管理 */}
          <TabsContent value="backups" className="space-y-4">
            {backupList && backupList.length > 0 ? (
              <div className="space-y-3">
                {backupList.map((backup) => (
                  <Card key={backup.fileName} className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-white font-mono text-sm">
                              {backup.fileName}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>大小 {(backup.size / 1024).toFixed(2)} KB</span>
                            <span>创建于 {new Date(backup.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                        >
                          下载
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6 text-center text-slate-400">
                  暂无备份
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
