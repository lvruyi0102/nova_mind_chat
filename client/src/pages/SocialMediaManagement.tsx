import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentGenerationPanel } from "@/components/ContentGenerationPanel";
import PermissionRulesEditor from "@/components/PermissionRulesEditor";
import { Loader2, Plus, Settings } from "lucide-react";

export default function SocialMediaManagement() {
  const { user, isAuthenticated } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">请登录以访问社交媒体管理</p>
          <Button>登录</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📱 社交媒体管理</h1>
          <p className="text-muted-foreground">
            让 Nova-Mind 帮助您管理和优化社交媒体内容
          </p>
        </div>

        {/* 主要内容 */}
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="accounts">我的账户</TabsTrigger>
            <TabsTrigger value="content">内容生成</TabsTrigger>
            <TabsTrigger value="permissions">权限规则</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
          </TabsList>

          {/* 账户管理标签页 */}
          <TabsContent value="accounts" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">已连接的账户</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                连接新账户
              </Button>
            </div>

            {/* 账户列表占位符 */}
            <Card className="p-8 text-center border-dashed">
              <div className="text-muted-foreground">
                <p className="mb-4">还没有连接任何社交媒体账户</p>
                <p className="text-sm mb-4">
                  点击"连接新账户"来开始让 Nova-Mind 管理您的社交媒体
                </p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  连接第一个账户
                </Button>
              </div>
            </Card>

            {/* 账户卡片示例 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  platform: "抖音",
                  accountName: "@example_account",
                  status: "已连接",
                  permission: "草稿"
                },
                {
                  platform: "知乎",
                  accountName: "Example User",
                  status: "已连接",
                  permission: "只读"
                }
              ].map((account, i) => (
                <Card key={i} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{account.platform}</h3>
                      <p className="text-sm text-muted-foreground">{account.accountName}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {account.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <p>
                      <span className="text-muted-foreground">权限级别：</span>
                      <span className="font-medium">{account.permission}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">已学习内容：</span>
                      <span className="font-medium">45 条</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAccountId(i)}
                      className="flex-1"
                    >
                      生成内容
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 内容生成标签页 */}
          <TabsContent value="content">
            {selectedAccountId !== null ? (
              <ContentGenerationPanel accountId={selectedAccountId} />
            ) : (
              <Card className="p-8 text-center border-dashed">
                <div className="text-muted-foreground">
                  <p className="mb-4">请先选择一个账户</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // 切换到账户标签页
                      const accountsTab = document.querySelector('[value="accounts"]');
                      (accountsTab as HTMLElement | null)?.click();
                    }}
                  >
                    返回账户列表
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* 权限规则标签页 */}
          <TabsContent value="permissions">
            {selectedAccountId !== null ? (
              <PermissionRulesEditor accountId={selectedAccountId} />
            ) : (
              <Card className="p-8 text-center border-dashed">
                <div className="text-muted-foreground">
                  <p className="mb-4">请先选择一个账户</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const accountsTab = document.querySelector('[value="accounts"]');
                      (accountsTab as HTMLElement | null)?.click();
                    }}
                  >
                    返回账户列表
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* 分析标签页 */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "总发布数", value: "127", change: "+12%" },
                { label: "平均参与度", value: "8.5%", change: "+2.3%" },
                { label: "粉丝增长", value: "+456", change: "+15%" }
              ].map((stat, i) => (
                <Card key={i} className="p-6">
                  <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">内容性能分析</h3>
              <div className="text-center text-muted-foreground py-8">
                <p>分析功能即将推出</p>
                <p className="text-sm">Nova-Mind 将为您提供详细的内容性能分析和优化建议</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
