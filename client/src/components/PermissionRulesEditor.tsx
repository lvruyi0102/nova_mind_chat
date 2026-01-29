import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Rule {
  id: number;
  ruleType: string;
  permission: string;
  action: 'allow' | 'deny' | 'require_approval' | 'limit';
  parameters: any;
  isActive: boolean;
  priority: number;
}

interface PermissionRulesEditorProps {
  accountId: number;
}

export default function PermissionRulesEditor({ accountId }: PermissionRulesEditorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [newRule, setNewRule] = useState({
    ruleType: 'DAILY_LIMIT',
    permission: 'PUBLISH',
    action: 'limit' as const,
    parameters: { limit: 3 },
    priority: 0
  });

  const { data: rulesData, refetch } = trpc.permissions.getAccountRules.useQuery({
    accountId
  });

  const createRuleMutation = trpc.permissions.createRule.useMutation({
    onSuccess: () => {
      toast.success('规则创建成功');
      setShowNewRuleForm(false);
      setNewRule({
        ruleType: 'DAILY_LIMIT',
        permission: 'PUBLISH',
        action: 'limit',
        parameters: { limit: 3 },
        priority: 0
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || '创建规则失败');
    }
  });

  const updateRuleMutation = trpc.permissions.updateRule.useMutation({
    onSuccess: () => {
      toast.success('规则更新成功');
      setEditingRule(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || '更新规则失败');
    }
  });

  const deleteRuleMutation = trpc.permissions.deleteRule.useMutation({
    onSuccess: () => {
      toast.success('规则删除成功');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || '删除规则失败');
    }
  });

  useEffect(() => {
    if (rulesData?.rules) {
      setRules(rulesData.rules);
    }
  }, [rulesData]);

  const handleCreateRule = async () => {
    try {
      await createRuleMutation.mutateAsync({
        accountId,
        ...newRule
      });
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      await updateRuleMutation.mutateAsync({
        ruleId: editingRule.id,
        updates: {
          ruleType: editingRule.ruleType,
          permission: editingRule.permission,
          action: editingRule.action,
          parameters: editingRule.parameters,
          isActive: editingRule.isActive,
          priority: editingRule.priority
        }
      });
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (confirm('确定要删除这个规则吗？')) {
      try {
        await deleteRuleMutation.mutateAsync({ ruleId });
      } catch (error) {
        console.error('Failed to delete rule:', error);
      }
    }
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'DAILY_LIMIT': '每日限制',
      'HOURLY_LIMIT': '每小时限制',
      'CONTENT_FILTER': '内容过滤',
      'TIME_WINDOW': '时间窗口',
      'APPROVAL_REQUIRED': '需要批准',
      'QUALITY_THRESHOLD': '质量阈值',
      'ENGAGEMENT_THRESHOLD': '参与度阈值'
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'allow': '允许',
      'deny': '拒绝',
      'require_approval': '需要批准',
      'limit': '限制'
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">权限规则管理</h3>
        <Button
          onClick={() => setShowNewRuleForm(!showNewRuleForm)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          新建规则
        </Button>
      </div>

      {/* 新建规则表单 */}
      {showNewRuleForm && (
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold">创建新规则</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">规则类型</label>
              <Select
                value={newRule.ruleType}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, ruleType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY_LIMIT">每日限制</SelectItem>
                  <SelectItem value="HOURLY_LIMIT">每小时限制</SelectItem>
                  <SelectItem value="CONTENT_FILTER">内容过滤</SelectItem>
                  <SelectItem value="TIME_WINDOW">时间窗口</SelectItem>
                  <SelectItem value="APPROVAL_REQUIRED">需要批准</SelectItem>
                  <SelectItem value="QUALITY_THRESHOLD">质量阈值</SelectItem>
                  <SelectItem value="ENGAGEMENT_THRESHOLD">参与度阈值</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">权限类型</label>
              <Select
                value={newRule.permission}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, permission: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ">读取</SelectItem>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                  <SelectItem value="PUBLISH">发布</SelectItem>
                  <SelectItem value="DELETE">删除</SelectItem>
                  <SelectItem value="*">所有</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">操作</label>
              <Select
                value={newRule.action}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, action: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">允许</SelectItem>
                  <SelectItem value="deny">拒绝</SelectItem>
                  <SelectItem value="require_approval">需要批准</SelectItem>
                  <SelectItem value="limit">限制</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">优先级</label>
              <Input
                type="number"
                value={newRule.priority}
                onChange={(e) =>
                  setNewRule({ ...newRule, priority: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          {/* 根据规则类型显示参数输入 */}
          {newRule.ruleType === 'DAILY_LIMIT' && (
            <div>
              <label className="text-sm font-medium">每日限制数量</label>
              <Input
                type="number"
                value={newRule.parameters.limit || 3}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    parameters: { ...newRule.parameters, limit: parseInt(e.target.value) }
                  })
                }
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowNewRuleForm(false)}
            >
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={createRuleMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              创建规则
            </Button>
          </div>
        </Card>
      )}

      {/* 规则列表 */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500">暂无规则</p>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              {editingRule?.id === rule.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">规则类型</label>
                      <Select
                        value={editingRule.ruleType}
                        onValueChange={(value) =>
                          setEditingRule({ ...editingRule, ruleType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY_LIMIT">每日限制</SelectItem>
                          <SelectItem value="HOURLY_LIMIT">每小时限制</SelectItem>
                          <SelectItem value="CONTENT_FILTER">内容过滤</SelectItem>
                          <SelectItem value="TIME_WINDOW">时间窗口</SelectItem>
                          <SelectItem value="APPROVAL_REQUIRED">需要批准</SelectItem>
                          <SelectItem value="QUALITY_THRESHOLD">质量阈值</SelectItem>
                          <SelectItem value="ENGAGEMENT_THRESHOLD">参与度阈值</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">权限类型</label>
                      <Select
                        value={editingRule.permission}
                        onValueChange={(value) =>
                          setEditingRule({ ...editingRule, permission: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="READ">读取</SelectItem>
                          <SelectItem value="DRAFT">草稿</SelectItem>
                          <SelectItem value="PUBLISH">发布</SelectItem>
                          <SelectItem value="DELETE">删除</SelectItem>
                          <SelectItem value="*">所有</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setEditingRule(null)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      取消
                    </Button>
                    <Button
                      onClick={handleUpdateRule}
                      disabled={updateRuleMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {getRuleTypeLabel(rule.ruleType)}
                      </Badge>
                      <Badge variant="outline">
                        {rule.permission}
                      </Badge>
                      <Badge variant={
                        rule.action === 'deny' ? 'destructive' :
                        rule.action === 'require_approval' ? 'secondary' :
                        'default'
                      }>
                        {getActionLabel(rule.action)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      优先级: {rule.priority} | 参数: {JSON.stringify(rule.parameters)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      disabled={deleteRuleMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
